export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskBoard {
  id: string;
  name: string;
  description: string;
  owner: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskCard {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  priority: TaskPriority;
  labels: string[];
  dueDate: string;
  order: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskColumn {
  id: TaskStatus;
  title: string;
  hint: string;
  accentClassName: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  labels: string;
  dueDate: string;
}

export interface BoardDraft {
  name: string;
  description: string;
}
