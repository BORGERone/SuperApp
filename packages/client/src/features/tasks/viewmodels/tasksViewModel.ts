import { create } from 'zustand';
import { TaskCard } from '../models/tasksModel';

interface TasksState {
  activeBoardId: string;
  searchQuery: string;
  assigneeFilter: string;
  setActiveBoard: (boardId: string) => void;
  setSearchQuery: (query: string) => void;
  setAssigneeFilter: (assignee: string) => void;
}

export const matchesCard = (card: TaskCard, searchQuery: string, assigneeFilter: string) => {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch =
    !normalizedQuery ||
    card.title.toLowerCase().includes(normalizedQuery) ||
    card.description.toLowerCase().includes(normalizedQuery) ||
    card.labels.some(label => label.toLowerCase().includes(normalizedQuery)) ||
    card.assigneeIds.some(assignee => assignee.toLowerCase().includes(normalizedQuery)) ||
    card.comments.some(comment => comment.body.toLowerCase().includes(normalizedQuery));

  const matchesAssignee = !assigneeFilter || card.assigneeIds.includes(assigneeFilter);

  return matchesSearch && matchesAssignee;
};

export const useTasksStore = create<TasksState>(set => ({
  activeBoardId: '',
  searchQuery: '',
  assigneeFilter: '',
  setActiveBoard: boardId => set({ activeBoardId: boardId }),
  setSearchQuery: query => set({ searchQuery: query }),
  setAssigneeFilter: assignee => set({ assigneeFilter: assignee }),
}));
