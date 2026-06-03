import { create } from 'zustand';
import { DriveState, ViewMode, FileItem } from '../models/driveModel';

interface DriveViewModel extends DriveState {
  // Actions
  setCurrentPath: (path: string) => void;
  setFiles: (files: FileItem[]) => void;
  toggleFileSelection: (fileName: string) => void;
  selectFile: (fileName: string) => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrentUser: (user: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  navigateToDirectory: (dirName: string) => void;
  navigateBack: () => void;
}

export const useDriveStore = create<DriveViewModel>((set, get) => ({
  // Initial state
  currentPath: '/',
  files: [],
  selectedFiles: new Set(),
  viewMode: (() => {
    const saved = localStorage.getItem('driveViewMode');
    console.log('Loading view mode from localStorage:', saved);
    const mode = (saved === 'list' || saved === 'grid') ? saved : 'list';
    console.log('Set initial view mode:', mode);
    return mode;
  })(),
  currentUser: null,
  isAdmin: false,

  // Actions
  setCurrentPath: (path) => set({ currentPath: path }),

  setFiles: (files) => set({ files }),

  toggleFileSelection: (fileName) => {
    const selectedFiles = new Set(get().selectedFiles);
    if (selectedFiles.has(fileName)) {
      selectedFiles.delete(fileName);
    } else {
      selectedFiles.add(fileName);
    }
    set({ selectedFiles });
  },

  selectFile: (fileName) => {
    const selectedFiles = new Set(get().selectedFiles);
    selectedFiles.add(fileName);
    set({ selectedFiles });
  },

  clearSelection: () => set({ selectedFiles: new Set() }),

  setViewMode: (mode) => {
    console.log('Setting view mode:', mode);
    localStorage.setItem('driveViewMode', mode);
    console.log('Saved to localStorage:', localStorage.getItem('driveViewMode'));
    set({ viewMode: mode });
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  setIsAdmin: (isAdmin) => set({ isAdmin }),

  navigateToDirectory: (dirName) => {
    const currentPath = get().currentPath;
    const cleanDirName = dirName.replace(/\/$/, '');
    const newPath = currentPath === '/' ? `/${cleanDirName}` : `${currentPath}/${cleanDirName}`;
    set({
      currentPath: newPath,
      selectedFiles: new Set()
    });
  },

  navigateBack: () => {
    const currentPath = get().currentPath;
    if (currentPath !== '/') {
      const parts = currentPath.split('/').filter(p => p);
      parts.pop();
      const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
      set({
        currentPath: newPath,
        selectedFiles: new Set()
      });
    }
  },
}));
