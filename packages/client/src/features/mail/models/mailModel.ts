export interface Email {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  folder: MailFolder;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url?: string;
  storageType?: 'local' | 'drive';
  driveFileId?: string;
}

export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';

export interface MailFilters {
  folder: MailFolder;
  search: string;
  isUnreadOnly: boolean;
  isStarredOnly: boolean;
}

export interface ComposeEmail {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachmentIds?: string[]; // ID загруженных вложений
}

// Интерфейс для отображения вложений в UI (до загрузки на сервер)
export interface PendingAttachment {
  id: string;
  file: File;
  storageType: 'local' | 'drive';
  driveFileId?: string;
}

export interface MailSettings {
  signature: string;
  autoReply: boolean;
  autoReplyText: string;
  notifications: boolean;
}
