import { z } from 'zod';

// User schemas
export const userRoleSchema = z.enum(['admin', 'user']);

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: userRoleSchema,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// File schemas
export const filePermissionsSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
  delete: z.boolean(),
  share: z.boolean(),
});

export const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['file', 'folder']),
  path: z.string(),
  ownerId: z.string(),
  permissions: filePermissionsSchema.optional(),
});

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: filePermissionsSchema.optional(),
});

// Mail schemas
export const mailFolderSchema = z.enum(['inbox', 'sent', 'drafts', 'trash']);

export const createMailSchema = z.object({
  subject: z.string().min(1).max(255),
  from: z.string().email(),
  to: z.array(z.string().email()),
  body: z.string(),
  folder: mailFolderSchema,
  ownerId: z.string(),
});

export const updateMailSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  body: z.string().optional(),
  folder: mailFolderSchema.optional(),
  isRead: z.boolean().optional(),
});

// Task schemas
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: taskStatusSchema,
  boardId: z.string(),
  assigneeId: z.string().optional(),
  ownerId: z.string(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
  assigneeId: z.string().optional(),
});

// Board schemas
export const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerId: z.string(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// JWT schemas
export const accessTokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  exp: z.number(),
});

export const refreshTokenPayloadSchema = z.object({
  userId: z.string(),
  exp: z.number(),
});
