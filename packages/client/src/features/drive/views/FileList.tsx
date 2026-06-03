import React, { useState, useRef } from 'react';
import { useDriveStore } from '../viewmodels/driveViewModel';
import { FileItem } from '../models/driveModel';
import { api } from '../../../lib/apiClient';

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
  
  // Swipe selection state
  const [isSwipeSelecting, setIsSwipeSelecting] = useState(false);
  const startIndexRef = useRef<number>(-1); // Индекс начального элемента
  const endIndexRef = useRef<number>(-1); // Индекс текущего элемента
  const previousEndIndexRef = useRef<number>(-1); // Индекс предыдущего элемента
  const initialSelectionRef = useRef<Set<string>>(new Set()); // Выделение до начала swipe-selection
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const isMouseDownRef = useRef(false);

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

  const handleFileMouseDown = (e: React.MouseEvent) => {
    // Сохраняем позицию мыши и отмечаем что кнопка нажата
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    isMouseDownRef.current = true;
  };

  const handleFileMouseMove = (e: React.MouseEvent) => {
    if (mouseDownPosRef.current) {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      // Если мышь сдвинулась более чем на 5 пикселей, считаем что это движение
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedRef.current = true;
      }
    }
  };

  const handleFileMouseLeave = (file: FileItem) => {
    // Активируем swipe-selection только если ЛКМ зажата
    if (isMouseDownRef.current) {
      const fileIndex = sortedFiles.findIndex(f => f.name === file.name);
      
      // Сохраняем текущее выделение перед началом swipe-selection
      initialSelectionRef.current = new Set(selectedFiles);
      
      // Если нет выделенных файлов, начинаем с этого элемента
      if (selectedFiles.size === 0) {
        startIndexRef.current = fileIndex;
        endIndexRef.current = fileIndex;
        selectFile(file.name);
        setIsSwipeSelecting(true);
      } else if (!isSwipeSelecting) {
        // Если есть выделенные файлы, начинаем с этого элемента
        startIndexRef.current = fileIndex;
        endIndexRef.current = fileIndex;
        setIsSwipeSelecting(true);
      }
    }
  };

  const handleFileClick = async (file: FileItem) => {
    // Если это было движение мыши (swipe-selection), не обрабатываем клик
    if (hasMovedRef.current) {
      return;
    }

    // Если файл уже выделен, снимаем выделение
    if (selectedFiles.has(file.name)) {
      toggleFileSelection(file.name);
      return;
    }

    // Если есть выделенные файлы, клик добавляет этот файл к выделению
    if (selectedFiles.size > 0) {
      selectFile(file.name);
      return;
    }

    // Если нет выделенных файлов и не в режиме swipe-selection, открываем папку или скачиваем файл
    if (!isSwipeSelecting) {
      if (file.type === 'directory') {
        navigateToDirectory(file.name);
      } else {
        // Скачиваем файл при клике с токеном авторизации
        const filePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

        setDownloading(true);
        setDownloadFileName(file.name);
        setDownloadProgress(0);

        try {
          const blob = await api.downloadFile(filePath);

          // Создаем URL для скачивания
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
    }
  };

  const handleFileMouseEnter = (file: FileItem) => {
    if (isSwipeSelecting) {
      const fileIndex = sortedFiles.findIndex(f => f.name === file.name);
      
      // Сохраняем предыдущий индекс
      const prevEndIndex = previousEndIndexRef.current;
      previousEndIndexRef.current = fileIndex;
      
      // Обновляем конечный индекс
      endIndexRef.current = fileIndex;
      
      // Вычисляем диапазон от start до end
      const start = Math.min(startIndexRef.current, endIndexRef.current);
      const end = Math.max(startIndexRef.current, endIndexRef.current);
      
      if (prevEndIndex !== -1) {
        const oldStart = Math.min(startIndexRef.current, prevEndIndex);
        const oldEnd = Math.max(startIndexRef.current, prevEndIndex);
        
        // Если движемся назад (уменьшаем диапазон)
        if (Math.abs(fileIndex - startIndexRef.current) < Math.abs(prevEndIndex - startIndexRef.current)) {
          // Для файлов которые вышли за пределы нового диапазона - инвертируем состояние
          for (let i = oldStart; i <= oldEnd; i++) {
            if (i < start || i > end) {
              const fileName = sortedFiles[i].name;
              // Инвертируем состояние (toggle)
              toggleFileSelection(fileName);
            }
          }
        } else {
          // Если движемся вперед (увеличиваем диапазон)
          // Добавляем или вычитаем файлы в зависимости от начального выделения
          for (let i = start; i <= end; i++) {
            const fileName = sortedFiles[i].name;
            // Если файл был в старом диапазоне, пропускаем
            if (i >= oldStart && i <= oldEnd) continue;
            
            if (initialSelectionRef.current.has(fileName)) {
              // Если файл был в начальном выделении - вычитаем (снимаем)
              if (selectedFiles.has(fileName)) {
                toggleFileSelection(fileName);
              }
            } else {
              // Если файл не был в начальном выделении - добавляем
              if (!selectedFiles.has(fileName)) {
                selectFile(fileName);
              }
            }
          }
        }
      } else {
        // Первый заход - применяем XOR к диапазону
        for (let i = start; i <= end; i++) {
          const fileName = sortedFiles[i].name;
          if (initialSelectionRef.current.has(fileName)) {
            // Если файл был в начальном выделении - вычитаем
            if (selectedFiles.has(fileName)) {
              toggleFileSelection(fileName);
            }
          } else {
            // Если файл не был в начальном выделении - добавляем
            if (!selectedFiles.has(fileName)) {
              selectFile(fileName);
            }
          }
        }
      }
    }
  };

  const handleGlobalMouseUp = () => {
    if (isSwipeSelecting) {
      setIsSwipeSelecting(false);
      startIndexRef.current = -1;
      endIndexRef.current = -1;
      previousEndIndexRef.current = -1;
      mouseDownPosRef.current = null;
      hasMovedRef.current = false;
      initialSelectionRef.current.clear();
    }
    isMouseDownRef.current = false;
  };

  React.useEffect(() => {
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSwipeSelecting]);

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
          data-file-name={file.name}
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
            userSelect: 'none',
          }}
          onMouseDown={handleFileMouseDown}
          onMouseEnter={() => handleFileMouseEnter(file)}
          onMouseMove={handleFileMouseMove}
          onMouseLeave={() => handleFileMouseLeave(file)}
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
