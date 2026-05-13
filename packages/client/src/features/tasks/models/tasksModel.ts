export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskBoard {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
  columns: TaskColumn[];
  cards: TaskCard[];
}

export interface TaskColumn {
  id: string;
  boardId: string;
  name: string;
  deadline: string;
  order: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  assigneeIds: string[];
  priority: TaskPriority;
  labels: string[];
  dueDate: string;
  isCompleted: boolean;
  order: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  assigneeIds: string[];
  priority: TaskPriority;
  labels: string;
  dueDate: string;
}

export interface BoardDraft {
  name: string;
  description: string;
}

export interface ColumnDraft {
  name: string;
  deadline: string;
}
