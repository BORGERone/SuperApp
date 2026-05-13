// Drive Model - типы данных и бизнес-логика для сетевого диска

export type ViewMode = 'list' | 'grid';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  path: string;
  ownerId: string;
  isSelected: boolean;
}

export interface DriveState {
  currentPath: string;
  files: FileItem[];
  selectedFiles: Set<string>;
  viewMode: ViewMode;
  currentUser: string | null;
  isAdmin: boolean;
}

export interface FilePermissions {
  allowedUsers: string[];
}
