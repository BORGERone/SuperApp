import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Таблица пользователей
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().$type<'admin' | 'user'>(),
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

// Таблица досок задач (устаревшее, оставлено для совместимости)
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица задач (устаревшее, оставлено для совместимости)
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().$type<'todo' | 'in_progress' | 'done'>(),
  boardId: text('board_id').notNull().references(() => boards.id),
  assigneeId: text('assignee_id').references(() => users.id),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица пользовательских колонок задач
export const taskColumns = sqliteTable('task_columns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  deadline: integer('deadline', { mode: 'timestamp' }),
  position: integer('position').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
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
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  assignees: text('assignees').notNull().default('[]'), // JSON массив user id
  position: integer('position').notNull().default(0),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Таблица комментариев к карточкам
export const taskCardComments = sqliteTable('task_card_comments', {
  id: text('id').primaryKey(),
  cardId: text('card_id').notNull().references(() => taskCards.id),
  userId: text('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Типы для TypeScript
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type FilePermission = typeof filePermissions.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskColumn = typeof taskColumns.$inferSelect;
export type TaskCard = typeof taskCards.$inferSelect;
export type TaskCardComment = typeof taskCardComments.$inferSelect;
