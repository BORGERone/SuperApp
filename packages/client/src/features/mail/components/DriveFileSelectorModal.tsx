import React, { useState, useEffect } from 'react';
import { X, HardDrive, File, Folder, Check } from 'lucide-react';
import { FileItem } from '../../drive/models/driveModel';

interface DriveFileSelectorModalProps {
  onClose: () => void;
  onFilesSelected: (files: Array<{ id: string; name: string; size: number; type: string }>) => void;
}

export const DriveFileSelectorModal: React.FC<DriveFileSelectorModalProps> = ({ onClose, onFilesSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ id: string; name: string; size: number; type: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [localCurrentPath, setLocalCurrentPath] = useState('');

  useEffect(() => {
    document.body.classList.add('has-modal-open');
    return () => {
      document.body.classList.remove('has-modal-open');
    };
  }, []);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <HardDrive className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Выбрать файлы с диска</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b border-gray-200/50 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setLocalCurrentPath('')}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Корень
            </button>
            {localCurrentPath.split('/').filter(p => p).map((part, index, parts) => (
              <React.Fragment key={part}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => setLocalCurrentPath(parts.slice(0, index + 1).join('/'))}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-12">
              Загрузка файлов...
            </div>
          ) : currentFiles.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              На диске нет файлов
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {currentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedFiles.some(f => f.id === file.id)
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200/50 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100/60">
                      {file.type === 'directory' ? (
                        <Folder className="text-yellow-600" size={20} />
                      ) : (
                        <File className="text-blue-600" size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {file.name}
                      </div>
                      {file.size && (
                        <div className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                    {selectedFiles.some(f => f.id === file.id) && (
                      <Check className="text-blue-600" size={20} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200/50 bg-gray-50/50">
          <button
            onClick={handleConfirm}
            disabled={selectedFiles.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Прикрепить ({selectedFiles.length})
          </button>
        </div>
      </div>
    </div>
  );
};
