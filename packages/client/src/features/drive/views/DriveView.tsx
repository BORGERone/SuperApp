import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriveStore } from '../viewmodels/driveViewModel';
import { useAuthStore } from '../../../store';
import { FileList } from './FileList';
import { useFilesList } from '../api/driveHooks';
import { FolderOpen, RefreshCw, Upload, Plus, Grid, List, LogOut, X } from 'lucide-react';
import { FileItem } from '../models/driveModel';
import { api } from '../../../lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCheckbox } from '../../../components/GlassCheckbox';

export const DriveView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    currentPath,
    selectedFiles,
    viewMode,
    setViewMode,
    navigateBack,
  } = useDriveStore();

  const { currentUser, isAdmin, logout } = useAuthStore();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{id: string, username: string, role: string}>>([]);
  const [allowedUsers, setAllowedUsers] = useState<Set<string>>(new Set());

  const handleLogout = () => {
    logout();
    queryClient.clear();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    setIsCreating(true);
    try {
      await api.createFolder(folderName, currentPath);
      setFolderName('');
      setShowCreateFolderModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Не удалось создать папку');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const totalFiles = files.length;
    let uploadedFiles = 0;

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      for (const file of files) {
        setUploadFileName(file.name);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        const progressInterval = setInterval(() => {
          const progress = Math.min((uploadedFiles / totalFiles) * 100 + 10, 100);
          setUploadProgress(progress);
        }, 100);

        await fetch(`${apiUrl}/api/drive/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        });

        clearInterval(progressInterval);
        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      refetch();
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadFileName('');
      }, 500);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Не удалось загрузить файлы');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Удалить ${selectedFiles.size} элементов?`)) return;
    
    try {
      for (const fileName of selectedFiles) {
        await api.deleteFile(currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`);
      }
      useDriveStore.getState().clearSelection();
      refetch();
    } catch (error) {
      console.error('Failed to delete files:', error);
      alert('Не удалось удалить файлы');
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0) return;

    const filesArray = Array.from(selectedFiles);
    const totalFiles = filesArray.length;
    let downloadedCount = 0;

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      setIsDownloading(true);
      setDownloadFileName(`${totalFiles} файлов`);
      setDownloadProgress(0);

      for (const file of filesArray) {
        const filePath = currentPath === '/' ? `/${file}` : `${currentPath}/${file}`;
        const response = await fetch(`${apiUrl}/api/drive/download?path=${encodeURIComponent(filePath)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          console.error(`Failed to download file: ${file}`);
          continue;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        downloadedCount++;
        setDownloadProgress((downloadedCount / totalFiles) * 100);
      }

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadFileName('');
        useDriveStore.getState().clearSelection();
      }, 500);
    } catch (error) {
      console.error('Failed to download files:', error);
      alert('Не удалось скачать файлы');
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadFileName('');
    }
  };

  const handlePermissions = async () => {
    if (selectedFiles.size === 0) return;

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      const usersResponse = await fetch(`${apiUrl}/api/drive/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAllUsers(usersData.users || []);
      }
      
      const filesArray = Array.from(selectedFiles);
      const file = filesArray[0];
      const filePath = currentPath === '/' ? `/${file}` : `${currentPath}/${file}`;

      const response = await fetch(`${apiUrl}/api/drive/permissions?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllowedUsers(new Set(data.allowedUsers || []));
      }
      
      setShowPermissionsModal(true);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      alert('Не удалось загрузить права доступа');
    }
  };

  const handleSavePermissions = async () => {
    if (selectedFiles.size === 0) return;

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      const filesArray = Array.from(selectedFiles);

      for (const file of filesArray) {
        const filePath = currentPath === '/' ? `/${file}` : `${currentPath}/${file}`;

        await fetch(`${apiUrl}/api/drive/permissions?path=${encodeURIComponent(filePath)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            allowedUsers: Array.from(allowedUsers),
          }),
        });
      }
      
      setShowPermissionsModal(false);
      useDriveStore.getState().clearSelection();
      refetch();
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('Не удалось сохранить права доступа');
    }
  };

  const { data: filesData, refetch } = useFilesList(currentPath);
  
  console.log('DriveView - filesData:', filesData);
  console.log('DriveView - currentPath:', currentPath);
  console.log('DriveView - selectedFiles:', selectedFiles);
  
  const files: FileItem[] = (filesData?.files || []).map(file => ({
    ...file,
    isSelected: selectedFiles.has(file.name),
  }));
  
  console.log('DriveView - processed files:', files);

  const handleViewModeToggle = () => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  const canNavigateBack = currentPath !== '/';

  React.useEffect(() => {
    refetch();
  }, [currentPath, refetch]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-card px-6 md:px-10 py-5 m-4 rounded-2xl animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gradient">☁️ Сетевой диск</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[color:var(--text-strong)]">{currentUser}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl"
            >
              <LogOut size={16} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 md:px-10 pb-2">
        <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap animate-fade-up">
          <label className="flex items-center gap-2 px-4 py-2 btn-glass rounded-xl cursor-pointer">
            <Upload size={16} />
            <span>{isUploading ? 'Загрузка...' : 'Загрузить файл'}</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl"
          >
            <Plus size={16} />
            <span>Создать папку</span>
          </button>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl">
            <RefreshCw size={16} />
            <span>Обновить</span>
          </button>
          <button
            onClick={handleViewModeToggle}
            className="flex items-center gap-2 px-3 py-2 btn-glass-secondary rounded-xl ml-auto"
            title={viewMode === 'list' ? 'Сетка' : 'Список'}
          >
            {viewMode === 'list' ? <Grid size={16} /> : <List size={16} />}
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 md:px-10 pb-2">
        <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <button
            onClick={navigateBack}
            disabled={!canNavigateBack}
            className="flex items-center gap-2 px-3 py-1.5 btn-glass-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen size={16} />
            <span>Назад</span>
          </button>
          <span className="text-sm font-medium text-[color:var(--text-muted)] truncate">{currentPath}</span>
        </div>
      </div>

      {/* File List */}
      <div className="px-4 md:px-10 pb-10">
        <FileList 
          files={files} 
          currentPath={currentPath}
          setDownloading={setIsDownloading}
          setDownloadProgress={setDownloadProgress}
          setDownloadFileName={setDownloadFileName}
        />
      </div>

      {/* Action Island */}
      {selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-card rounded-2xl px-5 py-3 animate-fade-up shadow-xl">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
            >
              Выбрано: {selectedFiles.size}
            </div>
            <button
              onClick={handleDownloadSelected}
              className="px-3 py-1.5 btn-glass-secondary rounded-lg text-sm"
            >
              Скачать
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 btn-glass-danger rounded-lg text-sm"
            >
              Удалить
            </button>
            {isAdmin && (
              <button
                onClick={handlePermissions}
                className="px-3 py-1.5 btn-glass-secondary rounded-lg text-sm"
              >
                Права доступа
              </button>
            )}
            <button
              onClick={() => useDriveStore.getState().clearSelection()}
              className="btn-icon-glass !w-8 !h-8"
              title="Снять выделение"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="fixed bottom-6 right-6 glass-card rounded-2xl px-5 py-4 min-w-80 animate-fade-up shadow-xl">
          <div className="text-sm font-medium text-[color:var(--text-strong)] mb-2 truncate">
            Загрузка: {uploadFileName}
          </div>
          <div className="w-full rounded-full h-2 mb-2" style={{ background: 'rgba(15,23,42,0.08)' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background:
                  'linear-gradient(90deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))',
              }}
            />
          </div>
          <div className="text-xs text-[color:var(--text-muted)] text-right tabular-nums">
            {Math.round(uploadProgress)}%
          </div>
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && (
        <div className="fixed bottom-6 right-6 glass-card rounded-2xl px-5 py-4 min-w-80 animate-fade-up shadow-xl">
          <div className="text-sm font-medium text-[color:var(--text-strong)] mb-2 truncate">
            Скачивание: {downloadFileName}
          </div>
          <div className="w-full rounded-full h-2 mb-2" style={{ background: 'rgba(15,23,42,0.08)' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${downloadProgress}%`,
                background:
                  'linear-gradient(90deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))',
              }}
            />
          </div>
          <div className="text-xs text-[color:var(--text-muted)] text-right tabular-nums">
            {Math.round(downloadProgress)}%
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-up">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gradient">Права доступа</h3>
              <button onClick={() => setShowPermissionsModal(false)} className="btn-icon-glass">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {allUsers.map((user) => {
                const checked = allowedUsers.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(allowedUsers);
                      if (checked) next.delete(user.id);
                      else next.add(user.id);
                      setAllowedUsers(next);
                    }}
                    className={`selectable-card glass-panel flex items-center justify-between p-3 rounded-xl w-full text-left ${
                      checked ? 'is-selected' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-[color:var(--text-strong)]">
                      {user.username}{' '}
                      <span className="text-[color:var(--text-muted)] text-xs">({user.role})</span>
                    </span>
                    <GlassCheckbox checked={checked} size="sm" aria-label={user.username} />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 btn-glass-secondary rounded-xl"
              >
                Отмена
              </button>
              <button onClick={handleSavePermissions} className="px-4 py-2 btn-glass rounded-xl">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-up">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gradient">Создать папку</h3>
              <button onClick={() => setShowCreateFolderModal(false)} className="btn-icon-glass">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Название папки"
              className="w-full px-4 py-2.5 glass-input rounded-xl mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="flex-1 px-4 py-2 btn-glass-secondary rounded-xl"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isCreating || !folderName.trim()}
                className="flex-1 px-4 py-2 btn-glass rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
