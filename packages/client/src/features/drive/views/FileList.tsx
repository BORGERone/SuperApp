import React from 'react';
import { useDriveStore } from '../viewmodels/driveViewModel';
import { FileItem } from '../models/driveModel';
import { GlassCheckbox } from '../../../components/GlassCheckbox';

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
      const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

      setDownloading(true);
      setDownloadFileName(file.name);
      setDownloadProgress(0);

      try {
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

        const contentLength = response.headers.get('Content-Length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        let downloadedSize = 0;

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
      <div className="flex flex-col items-center justify-center py-20 text-[color:var(--text-muted)]">
        <div className="text-6xl mb-4 opacity-50">📁</div>
        <div>Папка пуста</div>
      </div>
    );
  }

  const gridClassName =
    viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4';

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={gridClassName}>
      {sortedFiles.map((file, index) => {
        const isList = viewMode === 'list';
        const cardClasses = [
          'glass-card selectable-card rounded-xl cursor-pointer group',
          isList ? 'p-3' : 'p-4 flex flex-col items-center text-center',
          file.isSelected ? 'is-selected' : '',
        ].join(' ');

        return (
          <div
            key={file.id}
            className={cardClasses}
            onClick={() => handleFileClick(file)}
            style={{ animation: `fadeInUp ${300 + index * 18}ms var(--motion-ease) both` }}
          >
            {isList ? (
              <div className="flex items-center gap-3">
                <div
                  className={`transition-all duration-200 ${
                    file.isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleCheckboxClick(e, file.name)}
                >
                  <GlassCheckbox
                    checked={file.isSelected}
                    size="md"
                    aria-label={`Выбрать ${file.name}`}
                  />
                </div>
                <span className="text-2xl drop-shadow-sm flex-shrink-0">
                  {file.type === 'directory' ? '📁' : getFileIcon(file.name)}
                </span>
                <span className="text-sm font-medium text-[color:var(--text-strong)] truncate flex-1">
                  {file.name.replace(/\/$/, '')}
                </span>
              </div>
            ) : (
              <>
                <div
                  className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
                    file.isSelected
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                  }`}
                  onClick={(e) => handleCheckboxClick(e, file.name)}
                >
                  <GlassCheckbox
                    checked={file.isSelected}
                    size="sm"
                    aria-label={`Выбрать ${file.name}`}
                  />
                </div>
                <div className="text-5xl mb-2 drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                  {file.type === 'directory' ? '📁' : getFileIcon(file.name)}
                </div>
                <div className="text-sm font-medium text-[color:var(--text-strong)] truncate w-full">
                  {file.name.replace(/\/$/, '')}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
