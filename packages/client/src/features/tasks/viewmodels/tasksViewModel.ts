import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardDraft, TaskBoard, TaskCard, TaskDraft, TaskStatus } from '../models/tasksModel';

const now = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const demoBoards: TaskBoard[] = [
  {
    id: 'board-product',
    name: 'Запуск SuperApp',
    description: 'Демо-доска для планирования функций приложения',
    owner: 'admin',
    members: ['admin', 'designer', 'developer'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'board-personal',
    name: 'Личные задачи',
    description: 'Быстрые заметки и небольшие задачи',
    owner: 'admin',
    members: ['admin'],
    createdAt: now(),
    updatedAt: now(),
  },
];

const demoCards: TaskCard[] = [
  {
    id: 'task-wireframes',
    boardId: 'board-product',
    title: 'Подготовить макет доски задач',
    description: 'Собрать структуру колонок, карточек и фильтров в стиле Trello.',
    status: 'todo',
    assignee: 'designer',
    priority: 'high',
    labels: ['UI', 'Trello'],
    dueDate: '',
    order: 0,
    owner: 'admin',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'task-dnd',
    boardId: 'board-product',
    title: 'Добавить drag & drop',
    description: 'Перемещение карточек между Todo, In Progress и Done.',
    status: 'in_progress',
    assignee: 'developer',
    priority: 'medium',
    labels: ['Frontend'],
    dueDate: '',
    order: 0,
    owner: 'admin',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'task-auth',
    boardId: 'board-product',
    title: 'Учесть роли пользователей',
    description: 'Показывать управление карточками владельцу, назначенному пользователю и администратору.',
    status: 'done',
    assignee: 'admin',
    priority: 'low',
    labels: ['Access'],
    dueDate: '',
    order: 0,
    owner: 'admin',
    createdAt: now(),
    updatedAt: now(),
  },
];

interface TasksState {
  boards: TaskBoard[];
  cards: TaskCard[];
  activeBoardId: string;
  searchQuery: string;
  assigneeFilter: string;
  setActiveBoard: (boardId: string) => void;
  setSearchQuery: (query: string) => void;
  setAssigneeFilter: (assignee: string) => void;
  createBoard: (draft: BoardDraft, owner: string) => void;
  updateBoard: (boardId: string, draft: BoardDraft) => void;
  deleteBoard: (boardId: string) => void;
  createCard: (boardId: string, status: TaskStatus, draft: TaskDraft, owner: string) => void;
  updateCard: (cardId: string, draft: TaskDraft) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (cardId: string, status: TaskStatus) => void;
  getBoardCards: (boardId: string) => TaskCard[];
}

const parseLabels = (labels: string) =>
  labels
    .split(',')
    .map(label => label.trim())
    .filter(Boolean);

const matchesCard = (card: TaskCard, searchQuery: string, assigneeFilter: string) => {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch =
    !normalizedQuery ||
    card.title.toLowerCase().includes(normalizedQuery) ||
    card.description.toLowerCase().includes(normalizedQuery) ||
    card.labels.some(label => label.toLowerCase().includes(normalizedQuery));

  const matchesAssignee = !assigneeFilter || card.assignee === assigneeFilter;

  return matchesSearch && matchesAssignee;
};

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      boards: demoBoards,
      cards: demoCards,
      activeBoardId: demoBoards[0]?.id ?? '',
      searchQuery: '',
      assigneeFilter: '',

      setActiveBoard: boardId => set({ activeBoardId: boardId }),
      setSearchQuery: query => set({ searchQuery: query }),
      setAssigneeFilter: assignee => set({ assigneeFilter: assignee }),

      createBoard: (draft, owner) =>
        set(state => {
          const board: TaskBoard = {
            id: createId('board'),
            name: draft.name.trim(),
            description: draft.description.trim(),
            owner,
            members: [owner],
            createdAt: now(),
            updatedAt: now(),
          };

          return {
            boards: [...state.boards, board],
            activeBoardId: board.id,
          };
        }),

      updateBoard: (boardId, draft) =>
        set(state => ({
          boards: state.boards.map(board =>
            board.id === boardId
              ? {
                  ...board,
                  name: draft.name.trim(),
                  description: draft.description.trim(),
                  updatedAt: now(),
                }
              : board
          ),
        })),

      deleteBoard: boardId =>
        set(state => {
          const boards = state.boards.filter(board => board.id !== boardId);
          const nextActiveBoardId =
            state.activeBoardId === boardId ? boards[0]?.id ?? '' : state.activeBoardId;

          return {
            boards,
            cards: state.cards.filter(card => card.boardId !== boardId),
            activeBoardId: nextActiveBoardId,
          };
        }),

      createCard: (boardId, status, draft, owner) =>
        set(state => {
          const order =
            Math.max(-1, ...state.cards.filter(card => card.boardId === boardId && card.status === status).map(card => card.order)) + 1;
          const assignee = draft.assignee.trim() || owner;
          const card: TaskCard = {
            id: createId('task'),
            boardId,
            title: draft.title.trim(),
            description: draft.description.trim(),
            status,
            assignee,
            priority: draft.priority,
            labels: parseLabels(draft.labels),
            dueDate: draft.dueDate,
            order,
            owner,
            createdAt: now(),
            updatedAt: now(),
          };

          return {
            cards: [...state.cards, card],
            boards: state.boards.map(board =>
              board.id === boardId
                ? {
                    ...board,
                    members: Array.from(new Set([...board.members, assignee, owner])),
                    updatedAt: now(),
                  }
                : board
            ),
          };
        }),

      updateCard: (cardId, draft) =>
        set(state => ({
          cards: state.cards.map(card =>
            card.id === cardId
              ? {
                  ...card,
                  title: draft.title.trim(),
                  description: draft.description.trim(),
                  assignee: draft.assignee.trim(),
                  priority: draft.priority,
                  labels: parseLabels(draft.labels),
                  dueDate: draft.dueDate,
                  updatedAt: now(),
                }
              : card
          ),
        })),

      deleteCard: cardId =>
        set(state => ({
          cards: state.cards.filter(card => card.id !== cardId),
        })),

      moveCard: (cardId, status) =>
        set(state => {
          const card = state.cards.find(item => item.id === cardId);

          if (!card || card.status === status) {
            return state;
          }

          const order =
            Math.max(-1, ...state.cards.filter(item => item.boardId === card.boardId && item.status === status).map(item => item.order)) + 1;

          return {
            cards: state.cards.map(item =>
              item.id === cardId
                ? {
                    ...item,
                    status,
                    order,
                    updatedAt: now(),
                  }
                : item
            ),
          };
        }),

      getBoardCards: boardId => {
        const state = get();

        return state.cards
          .filter(card => card.boardId === boardId)
          .filter(card => matchesCard(card, state.searchQuery, state.assigneeFilter))
          .sort((left, right) => left.order - right.order);
      },
    }),
    {
      name: 'superapp-tasks',
    }
  )
);
