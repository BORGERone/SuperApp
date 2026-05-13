// Общие TypeScript типы для всех приложений

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  permissions: FilePermissions;
}

export interface FilePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  share: boolean;
}

export interface Mail {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  isRead: boolean;
  createdAt: Date;
  ownerId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  boardId: string;
  assigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}
