import React from 'react';
import { useDriveStore } from '../viewmodels/driveViewModel';
import { FileItem } from '../models/driveModel';

interface FileListProps {
  files: FileItem[];
  currentPath: string;
  setDownloading: (downloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setDownloadFileName: (name: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ 
  files, 
  currentPath,
  setDownloading,
  setDownloadProgress,
  setDownloadFileName,
}) => {
  const { viewMode, toggleFileSelection, navigateToDirectory } = useDriveStore();

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      txt: '📄',
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      xls: '📗',
      xlsx: '📗',
      ppt: '📙',
      pptx: '📙',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp3: '🎵',
      mp4: '🎬',
      avi: '🎬',
      zip: '📦',
      rar: '📦',
      exe: '⚙️',
      js: '📜',
      html: '🌐',
      css: '🎨',
      json: '📋',
      md: '📝',
    };
    return icons[ext] || '📄';
  };

  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'directory') {
      navigateToDirectory(file.name);
    } else {
      // Скачиваем файл при клике с токеном авторизации
      const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

      setDownloading(true);
      setDownloadFileName(file.name);
      setDownloadProgress(0);

      try {
        // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
        const apiUrl = isElectron ? 'http://localhost:3002' : '';
        
        const response = await fetch(`${apiUrl}/api/drive/download?path=${encodeURIComponent(filePath)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to download file');
        }

        // Получаем размер файла из заголовка Content-Length
        const contentLength = response.headers.get('Content-Length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        let downloadedSize = 0;

        // Читаем поток данных
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            downloadedSize += value.length;

            if (totalSize > 0) {
              const progress = (downloadedSize / totalSize) * 100;
              setDownloadProgress(progress);
            }
          }
        }

        // Создаем blob из чанков
        const blob = new Blob(chunks as BlobPart[]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloadProgress(100);

        setTimeout(() => {
          setDownloading(false);
          setDownloadProgress(0);
        }, 500);
      } catch (error) {
        console.error('Failed to download file:', error);
        alert('Не удалось скачать файл');
        setDownloading(false);
        setDownloadProgress(0);
      }
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    toggleFileSelection(fileName);
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="text-6xl mb-4 opacity-50">📁</div>
        <div>Папка пуста</div>
      </div>
    );
  }

  const gridClassName = viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-4 gap-4';

  // Сортируем файлы: сначала папки, потом файлы
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={gridClassName}>
      {sortedFiles.map((file) => (
        <div
          key={file.id}
          className={`glass-card p-4 rounded-lg cursor-pointer transition-all duration-300 hover:bg-white/60 relative group ${
            viewMode === 'list' 
              ? (file.isSelected ? 'translate-x-1' : 'hover:translate-x-1')
              : (file.isSelected ? 'scale-105' : 'hover:scale-105')
          } ${
            file.isSelected 
              ? 'bg-gradient-to-br from-blue-100/80 to-purple-100/80 border-blue-300/50 shadow-lg shadow-blue-500/10' 
              : ''
          }`}
          onClick={() => handleFileClick(file)}
        >
          {viewMode === 'list' && (
            <div
              className={`absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-10 transition-opacity duration-200 ${
                file.isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => handleCheckboxClick(e, file.name)}
            >
              <div className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                file.isSelected 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 border-transparent' 
                  : 'border-gray-300 bg-white hover:border-blue-400'
              }`}>
                {file.isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          )}
          {viewMode !== 'list' && (
            <div
              className={`absolute left-0 top-0 cursor-pointer z-10 transition-opacity duration-200 ${
                file.isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => handleCheckboxClick(e, file.name)}
            >
              <div className={`relative w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                file.isSelected 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 border-transparent' 
                  : 'border-gray-300 bg-white hover:border-blue-400'
              }`}>
                {file.isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          )}
          <div className={`flex items-center gap-1 ${viewMode === 'list' ? 'pl-4' : ''}`}>
            <span className="text-2xl filter drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
              {file.type === 'directory' ? '📁' : getFileIcon(file.name)}
            </span>
            <span className="text-sm font-medium text-gray-700 truncate flex-1 transition-colors duration-200 group-hover:text-gray-900">
              {file.name.replace(/\/$/, '')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
