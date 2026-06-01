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
  const { viewMode, toggleFileSelection, selectFile, navigateToDirectory, selectedFiles } = useDriveStore();

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
    // Если файл уже выделен, снимаем выделение
    if (selectedFiles.has(file.name)) {
      toggleFileSelection(file.name);
      return;
    }

    // Если есть выделенные файлы, клик выделяет этот файл
    if (selectedFiles.size > 0) {
      selectFile(file.name);
      return;
    }

    // Если нет выделенных файлов, клик открывает папку или скачивает файл
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

  const CheckIcon = (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.2 L6.7 11.4 L12.5 4.8" />
    </svg>
  );

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
          className={`glass-mid select-shimmer relative group cursor-pointer ${
            viewMode === 'list' ? 'px-4 py-3 pl-12' : 'p-4'
          }`}
          data-selected={file.isSelected ? 'true' : 'false'}
          style={{
            // Никаких translateX/scale при выделении — это вызывало
            // обрезку справа и визуальное «размытие» текста плитки.
            // Подсветка идёт через класс .select-shimmer (см. index.css):
            // светлеющая подложка + бегущая радужная рамка, без блюра.
            transition: 'background 300ms ease-out, box-shadow 300ms ease-out, transform 300ms ease-out',
          }}
          onClick={() => handleFileClick(file)}
        >
          {viewMode === 'list' && (
            <div
              className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-10"
              style={{
                opacity: file.isSelected ? 1 : undefined,
                transition: 'opacity 200ms ease-out',
              }}
              onClick={(e) => handleCheckboxClick(e, file.name)}
            >
              <span
                className={`ui-checkbox ${file.isSelected ? '' : 'opacity-0 group-hover:opacity-100'}`}
                data-checked={file.isSelected ? 'true' : 'false'}
                style={{ transition: 'opacity 200ms ease-out' }}
              >
                <span className="ui-checkbox__box">{CheckIcon}</span>
              </span>
            </div>
          )}
          {viewMode !== 'list' && (
            <div
              className="absolute left-2 top-2 cursor-pointer z-10"
              onClick={(e) => handleCheckboxClick(e, file.name)}
            >
              <span
                className={`ui-checkbox ui-checkbox--sm ${file.isSelected ? '' : 'opacity-0 group-hover:opacity-100'}`}
                data-checked={file.isSelected ? 'true' : 'false'}
                style={{ transition: 'opacity 200ms ease-out' }}
              >
                <span className="ui-checkbox__box">{CheckIcon}</span>
              </span>
            </div>
          )}
          <div className={`flex items-center gap-2 ${viewMode === 'list' ? '' : 'mt-1'}`}>
            <span
              className="text-2xl filter drop-shadow-sm"
              style={{ transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1)' }}
            >
              {file.type === 'directory' ? '📁' : getFileIcon(file.name)}
            </span>
            <span className="text-sm font-medium text-app truncate flex-1">
              {file.name.replace(/\/$/, '')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
