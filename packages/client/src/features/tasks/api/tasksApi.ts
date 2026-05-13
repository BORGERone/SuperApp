import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient';
import { BoardDraft, ColumnDraft, TaskBoard, TaskDraft } from '../models/tasksModel';

const labelsFromDraft = (labels: string) =>
  labels
    .split(',')
    .map(label => label.trim())
    .filter(Boolean);

const tasksApi = {
  getBoards: async (): Promise<TaskBoard[]> => {
    const data = await apiRequest<{ boards: TaskBoard[] }>('/api/tasks/boards');
    return data.boards;
  },

  createBoard: async (draft: BoardDraft): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>('/api/tasks/boards', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return data.board;
  },

  deleteBoard: async (boardId: string) =>
    apiRequest(`/api/tasks/boards/${boardId}`, {
      method: 'DELETE',
    }),

  createColumn: async ({ boardId, draft }: { boardId: string; draft: ColumnDraft }): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return data.board;
  },

  updateColumn: async ({ columnId, draft }: { columnId: string; draft: Partial<ColumnDraft> }): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
    return data.board;
  },

  deleteColumn: async (columnId: string): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/columns/${columnId}`, {
      method: 'DELETE',
    });
    return data.board;
  },

  createCard: async ({ columnId, draft }: { columnId: string; draft: TaskDraft }): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/columns/${columnId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ ...draft, labels: labelsFromDraft(draft.labels) }),
    });
    return data.board;
  },

  updateCard: async ({
    cardId,
    draft,
  }: {
    cardId: string;
    draft: Partial<TaskDraft> & { columnId?: string; isCompleted?: boolean };
  }): Promise<TaskBoard> => {
    const payload = {
      ...draft,
      labels: draft.labels === undefined ? undefined : labelsFromDraft(draft.labels),
    };
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.board;
  },

  moveCard: async ({ cardId, columnId }: { cardId: string; columnId: string }): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/cards/${cardId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ columnId }),
    });
    return data.board;
  },

  deleteCard: async (cardId: string): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/cards/${cardId}`, {
      method: 'DELETE',
    });
    return data.board;
  },

  addComment: async ({ cardId, body }: { cardId: string; body: string }): Promise<TaskBoard> => {
    const data = await apiRequest<{ board: TaskBoard }>(`/api/tasks/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    return data.board;
  },
};

const updateBoardCache = (queryClient: ReturnType<typeof useQueryClient>, board: TaskBoard) => {
  queryClient.setQueryData<TaskBoard[]>(['tasks', 'boards'], current => {
    if (!current) {
      return [board];
    }

    const exists = current.some(item => item.id === board.id);
    return exists ? current.map(item => (item.id === board.id ? board : item)) : [...current, board];
  });
};

export const useTaskBoards = () =>
  useQuery({
    queryKey: ['tasks', 'boards'],
    queryFn: tasksApi.getBoards,
  });

export const useCreateTaskBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createBoard,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useDeleteTaskBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.deleteBoard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'boards'] }),
  });
};

export const useCreateTaskColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createColumn,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useUpdateTaskColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.updateColumn,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useDeleteTaskColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.deleteColumn,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useCreateTaskCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createCard,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useUpdateTaskCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.updateCard,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useMoveTaskCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.moveCard,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useDeleteTaskCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.deleteCard,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.addComment,
    onSuccess: board => updateBoardCache(queryClient, board),
  });
};
