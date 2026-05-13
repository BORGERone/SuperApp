// Общие константы для всех приложений

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  DRIVE: {
    LIST: '/api/drive/list',
    UPLOAD: '/api/drive/upload',
    DOWNLOAD: '/api/drive/download',
    DELETE: '/api/drive/delete',
    UPDATE: '/api/drive/update',
    SHARE: '/api/drive/share',
  },
  MAIL: {
    LIST: '/api/mail/list',
    GET: '/api/mail/:id',
    CREATE: '/api/mail/create',
    UPDATE: '/api/mail/:id',
    DELETE: '/api/mail/:id',
    SEND: '/api/mail/send',
  },
  TASKS: {
    BOARDS: '/api/tasks/boards',
    BOARD: '/api/tasks/boards/:id',
    TASKS: '/api/tasks/boards/:boardId/tasks',
    TASK: '/api/tasks/boards/:boardId/tasks/:id',
  },
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 минут
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 дней
} as const;

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const FILE_TYPES = {
  FILE: 'file',
  FOLDER: 'folder',
} as const;

export const MAIL_FOLDERS = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFTS: 'drafts',
  TRASH: 'trash',
} as const;

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;
