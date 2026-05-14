import React, { useState, useEffect } from 'react';
import { X, HardDrive, File, Folder, Check } from 'lucide-react';
import { FileItem } from '../../drive/models/driveModel';
import { useDriveStore } from '../../drive/viewmodels/driveViewModel';

interface DriveFileSelectorModalProps {
  onClose: () => void;
  onFilesSelected: (files: Array<{ id: string; name: string; size: number; type: string }>) => void;
}

export const DriveFileSelectorModal: React.FC<DriveFileSelectorModalProps> = ({ onClose, onFilesSelected }) => {
  const { files, currentPath, setCurrentPath, toggleFileSelection } = useDriveStore();
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    // Загружаем файлы при открытии модального окна
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
        const apiUrl = isElectron ? 'http://localhost:3002' : '';

        console.log('Loading drive files for path:', currentPath);
        const response = await fetch(`${apiUrl}/api/drive/list?path=${encodeURIComponent(currentPath || '/')}`, {
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
  }, [currentPath]);

  useEffect(() => {
    // Сбросить выбор при закрытии
    return () => {
      localFiles.forEach(f => {
        if (f.isSelected) {
          toggleFileSelection(f.id);
        }
      });
    };
  }, [localFiles]);

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      setSelectedFileIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file.id)) {
          newSet.delete(file.id);
        } else {
          newSet.add(file.id);
        }
        return newSet;
      });
    }
  };

  const handleBack = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const handleConfirm = () => {
    const selectedFiles = localFiles.filter(f => selectedFileIds.has(f.id) && f.type === 'file');
    const filesData = selectedFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size || 0,
      type: f.type,
    }));
    onFilesSelected(filesData);
    onClose();
  };

  const currentFiles = localFiles; // Временно показываем все файлы без фильтрации для отладки

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
              onClick={() => setCurrentPath('')}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Корень
            </button>
            {currentPath.split('/').filter(p => p).map((part, index, parts) => (
              <React.Fragment key={part}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => setCurrentPath(parts.slice(0, index + 1).join('/'))}
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
              Папка пуста
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {currentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedFileIds.has(file.id)
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
                      {file.type === 'file' && file.size && (
                        <div className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                    {selectedFileIds.has(file.id) && (
                      <Check className="text-blue-600" size={20} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/50">
          <button
            onClick={handleBack}
            disabled={currentPath === ''}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200/50 rounded-lg hover:bg-white/60 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedFileIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Прикрепить ({selectedFileIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
