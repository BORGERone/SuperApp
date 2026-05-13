export interface TaskComment {
  id: string;
  cardId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface TaskCard {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  deadline: string | null;
  isCompleted: boolean;
  assignees: string[];
  position: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
}

export interface TaskColumn {
  id: string;
  name: string;
  deadline: string | null;
  position: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  cards: TaskCard[];
}

export interface CreateColumnInput {
  name: string;
  deadline?: string | null;
  position?: number;
}

export interface UpdateColumnInput {
  name?: string;
  deadline?: string | null;
  position?: number;
}

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  assignees?: string[];
  position?: number;
  isCompleted?: boolean;
}

export interface UpdateCardInput {
  columnId?: string;
  title?: string;
  description?: string | null;
  deadline?: string | null;
  assignees?: string[];
  position?: number;
  isCompleted?: boolean;
}

export type CardDeadlineState = 'none' | 'normal' | 'today' | 'overdue' | 'completed';

export function getCardDeadlineState(card: TaskCard): CardDeadlineState {
  if (card.isCompleted) return 'completed';
  if (!card.deadline) return 'none';

  const deadline = new Date(card.deadline);
  if (isNaN(deadline.getTime())) return 'none';

  const now = new Date();

  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (deadline.getTime() < now.getTime() && deadlineDay.getTime() < today.getTime()) {
    return 'overdue';
  }
  if (deadlineDay.getTime() === today.getTime()) {
    return 'today';
  }
  if (deadline.getTime() < now.getTime()) {
    return 'overdue';
  }
  return 'normal';
}
