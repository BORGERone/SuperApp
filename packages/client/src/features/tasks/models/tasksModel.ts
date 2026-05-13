// Модели данных модуля задач

export interface TaskColumn {
  id: string;
  title: string;
  deadline: string | null;
  position: number;
  ownerId: string;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCardLastComment {
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: string;
}

export interface TaskCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  deadline: string | null;
  completed: boolean;
  assignees: string[];
  position: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  lastComment: TaskCardLastComment | null;
}

export interface TaskComment {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: string;
}

export interface CreateColumnInput {
  title: string;
  deadline?: string | null;
}

export interface UpdateColumnInput {
  title?: string;
  deadline?: string | null;
  archived?: boolean;
}

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string;
  deadline?: string | null;
  assignees?: string[];
}

export interface UpdateCardInput {
  columnId?: string;
  title?: string;
  description?: string;
  deadline?: string | null;
  completed?: boolean;
  assignees?: string[];
  position?: number;
}

export type DeadlineState = 'none' | 'today' | 'overdue' | 'future';

export function computeDeadlineState(deadline: string | null, completed: boolean): DeadlineState {
  if (completed) return 'none';
  if (!deadline) return 'none';
  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return 'none';
  const now = new Date();
  // Просрочка имеет приоритет: если момент дедлайна уже прошёл — карточка красная,
  // даже если это сегодня (например, дедлайн был в 12:00, сейчас 14:00).
  if (due.getTime() < now.getTime()) return 'overdue';
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  if (due < startOfTomorrow) return 'today';
  return 'future';
}
