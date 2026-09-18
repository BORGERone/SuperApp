import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Таблица пользователей
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  avatarUrl: text('avatar_url'),
  pinCode: text('pin_code'),
  role: text('role').notNull().$type<'admin' | 'user'>(),
  // Должность сотрудника. Произвольный текст, может быть пустым.
  position: text('position'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица файлов
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().$type<'file' | 'directory'>(),
  path: text('path').notNull(),
  size: integer('size'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  // ID родительской записи в `files` (директория). NULL = корень.
  // Используется для наследования прав доступа при создании дочерних
  // папок и файлов.
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица прав доступа к файлам
export const filePermissions = sqliteTable('file_permissions', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Таблица писем
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  subject: text('subject').notNull(),
  from: text('from').notNull(),
  to: text('to').notNull(), // JSON array
  cc: text('cc'), // JSON array
  bcc: text('bcc'), // JSON array
  body: text('body').notNull(),
  htmlBody: text('html_body'), // HTML версия письма
  folder: text('folder').notNull().$type<'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'>(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  isStarred: integer('is_starred', { mode: 'boolean' }).notNull().default(false),
  isImportant: integer('is_important', { mode: 'boolean' }).notNull().default(false),
  attachments: text('attachments'), // JSON array вложений
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица вложений писем
export const emailAttachments = sqliteTable('email_attachments', {
  id: text('id').primaryKey(),
  emailId: text('email_id').notNull().references(() => emails.id),
  filename: text('filename').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  storageType: text('storage_type').notNull().$type<'local' | 'drive'>(), // local - загружен с компьютера, drive - с сетевого диска
  filePath: text('file_path').notNull(), // путь к файлу на сервере (для local: uploads/{id}-{filename}, для drive: uploads/{fileId}-{filename})
  driveFileId: text('drive_file_id'), // ссылка на файл в таблице files (если storageType = drive)
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Таблица колонок задач (создаются пользователями)
export const taskColumns = sqliteTable('task_columns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  deadline: integer('deadline', { mode: 'timestamp' }),
  position: integer('position').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица карточек задач
export const taskCards = sqliteTable('task_cards', {
  id: text('id').primaryKey(),
  columnId: text('column_id').notNull().references(() => taskColumns.id),
  title: text('title').notNull(),
  description: text('description'),
  deadline: integer('deadline', { mode: 'timestamp' }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  assignees: text('assignees'), // JSON массив идентификаторов пользователей
  position: integer('position').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица комментариев к карточкам
export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => taskCards.id),
  authorId: text('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Таблица подпунктов (чек-листа) карточки
export const taskCardSubtasks = sqliteTable('task_card_subtasks', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => taskCards.id),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Типы для TypeScript
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type FilePermission = typeof filePermissions.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type TaskColumn = typeof taskColumns.$inferSelect;
export type TaskCard = typeof taskCards.$inferSelect;
export type TaskComment = typeof taskComments.$inferSelect;
export type TaskCardSubtask = typeof taskCardSubtasks.$inferSelect;
