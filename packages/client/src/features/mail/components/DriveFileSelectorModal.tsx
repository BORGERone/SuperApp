import React, { useState, useEffect } from 'react';
import { X, HardDrive, File, Folder, Check } from 'lucide-react';
import { FileItem } from '../../drive/models/driveModel';
import { useBodyModalOpen } from '../../../utils/useBodyModalOpen';

interface DriveFileSelectorModalProps {
  onClose: () => void;
  onFilesSelected: (files: Array<{ id: string; name: string; size: number; type: string }>) => void;
}

export const DriveFileSelectorModal: React.FC<DriveFileSelectorModalProps> = ({ onClose, onFilesSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ id: string; name: string; size: number; type: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [localCurrentPath, setLocalCurrentPath] = useState('');

  useBodyModalOpen(true);

  useEffect(() => {
    // Загружаем файлы для текущей папки
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
        const apiUrl = isElectron ? 'http://localhost:3002' : '';

        // Формируем путь для API: если localCurrentPath пустой, используем '/', иначе формируем путь
        const apiPath = localCurrentPath ? `/${localCurrentPath}` : '/';
        console.log('Loading drive files for path:', apiPath);

        const response = await fetch(`${apiUrl}/api/drive/list?path=${encodeURIComponent(apiPath)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded files:', data.files);
          setLocalFiles(data.files || []);
        } else {
          console.error('Failed to load files:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to load drive files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [localCurrentPath]); // Загружаем при изменении текущей папки

  useEffect(() => {
    // Сбросить выбор при закрытии
    return () => {
      setSelectedFiles([]);
    };
  }, []);

  const handleFileClick = (file: FileItem) => {
    console.log('File clicked:', file);
    if (file.type === 'directory') {
      // Навигация по папкам - добавляем имя папки к текущему пути
      const newPath = localCurrentPath ? `${localCurrentPath}/${file.name}` : file.name;
      console.log('Navigating to:', newPath);
      setLocalCurrentPath(newPath);
    } else {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.id === file.id);
        if (isSelected) {
          console.log('Removing file:', file.name);
          return prev.filter(f => f.id !== file.id);
        } else {
          console.log('Adding file:', file.name);
          return [
            ...prev,
            {
              id: file.id,
              name: file.name,
              size: file.size || 0,
              type: file.type,
            }
          ];
        }
      });
    }
  };

  const handleConfirm = () => {
    onFilesSelected(selectedFiles);
    onClose();
  };

  const currentFiles = localFiles; // Показываем файлы как они возвращаются из API

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[60] fade-in p-4">
      <div
        className="scale-in w-full max-w-3xl flex flex-col rounded-3xl compose-modal-solid"
        style={{
          maxHeight: 'calc(100vh - 64px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          backdropFilter: 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 relative">
          <div className="divider absolute bottom-0 left-0 right-0" />
          <div className="flex items-center gap-3">
            <HardDrive size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-base font-semibold text-app">Выбрать файлы с диска</h2>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-3 relative">
          <div className="divider absolute bottom-0 left-0 right-0" />
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setLocalCurrentPath('')}
              className="transition-colors hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              Корень
            </button>
            {localCurrentPath.split('/').filter(p => p).map((part, index, parts) => (
              <React.Fragment key={`${index}-${part}`}>
                <span className="text-app-muted">/</span>
                <button
                  onClick={() => setLocalCurrentPath(parts.slice(0, index + 1).join('/'))}
                  className="transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-app-muted py-12">
              Загрузка файлов...
            </div>
          ) : currentFiles.length === 0 ? (
            <div className="text-center text-app-muted py-12">
              На диске нет файлов
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {currentFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2' : ''
                    }`}
                    style={{
                      background: 'var(--surface-1)',
                      borderColor: isSelected
                        ? 'rgba(var(--color-primary-rgb), 0.5)'
                        : 'var(--glass-border-soft)',
                      ['--tw-ring-color' as string]: 'rgba(var(--color-primary-rgb), 0.5)',
                    } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        {file.type === 'directory' ? (
                          <Folder size={20} style={{ color: 'var(--color-warning, #d97706)' }} />
                        ) : (
                          <File size={20} style={{ color: 'var(--color-primary)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-app truncate">
                          {file.name}
                        </div>
                        {file.size && (
                          <div className="text-xs text-app-muted">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check size={20} style={{ color: 'var(--color-primary)' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 relative">
          <div className="divider absolute top-0 left-0 right-0" />
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-glass-secondary px-4 py-2">
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedFiles.length === 0}
              className="btn-glass px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Прикрепить ({selectedFiles.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
