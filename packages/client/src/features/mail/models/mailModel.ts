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
  attachments: File[];
}

export interface MailSettings {
  signature: string;
  autoReply: boolean;
  autoReplyText: string;
  notifications: boolean;
}
