import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateCardInput,
  CreateColumnInput,
  TaskCard,
  TaskCardSubtask,
  TaskColumn,
  TaskComment,
  UpdateCardInput,
  UpdateColumnInput,
} from '../models/tasksModel';

// В Electron используем абсолютный URL, в браузере — относительный (через Vite proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002/api/tasks' : '/api/tasks';

function buildHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const text = await response.text();
    let message = 'Ошибка запроса';
    try {
      const data = JSON.parse(text);
      if (data?.error) message = data.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

// ===== API запросы =====

export const tasksApi = {
  async getColumns(): Promise<TaskColumn[]> {
    const response = await fetch(`${API_BASE}/columns`, { headers: buildHeaders() });
    const data = await handleResponse<{ columns: TaskColumn[] }>(response);
    return data.columns;
  },

  async getArchivedColumns(): Promise<TaskColumn[]> {
    const response = await fetch(`${API_BASE}/columns?archived=true`, { headers: buildHeaders() });
    const data = await handleResponse<{ columns: TaskColumn[] }>(response);
    return data.columns;
  },

  async createColumn(input: CreateColumnInput): Promise<TaskColumn> {
    const response = await fetch(`${API_BASE}/columns`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse<{ column: TaskColumn }>(response);
    return data.column;
  },

  async updateColumn(id: string, input: UpdateColumnInput): Promise<TaskColumn> {
    const response = await fetch(`${API_BASE}/columns/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse<{ column: TaskColumn }>(response);
    return data.column;
  },

  async deleteColumn(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/columns/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    await handleResponse<{ success: true }>(response);
  },

  async getCards(): Promise<TaskCard[]> {
    const response = await fetch(`${API_BASE}/cards`, { headers: buildHeaders() });
    const data = await handleResponse<{ cards: TaskCard[] }>(response);
    return data.cards;
  },

  async createCard(input: CreateCardInput): Promise<TaskCard> {
    const response = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse<{ card: TaskCard }>(response);
    return data.card;
  },

  async updateCard(id: string, input: UpdateCardInput): Promise<TaskCard> {
    const response = await fetch(`${API_BASE}/cards/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse<{ card: TaskCard }>(response);
    return data.card;
  },

  async deleteCard(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/cards/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    await handleResponse<{ success: true }>(response);
  },

  async reorderCards(
    updates: Array<{ id: string; columnId: string; position: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const response = await fetch(`${API_BASE}/cards/reorder`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ updates }),
    });
    await handleResponse<{ success: true; count: number }>(response);
  },

  async getComments(cardId: string): Promise<TaskComment[]> {
    const response = await fetch(`${API_BASE}/cards/${cardId}/comments`, {
      headers: buildHeaders(),
    });
    const data = await handleResponse<{ comments: TaskComment[] }>(response);
    return data.comments;
  },

  async createComment(cardId: string, body: string): Promise<TaskComment> {
    const response = await fetch(`${API_BASE}/cards/${cardId}/comments`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ body }),
    });
    const data = await handleResponse<{ comment: TaskComment }>(response);
    return data.comment;
  },

  async deleteComment(commentId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    await handleResponse<{ success: true }>(response);
  },

  async createSubtask(cardId: string, title: string): Promise<TaskCardSubtask> {
    const response = await fetch(`${API_BASE}/cards/${cardId}/subtasks`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ title }),
    });
    const data = await handleResponse<{ subtask: TaskCardSubtask }>(response);
    return data.subtask;
  },

  async updateSubtask(
    subtaskId: string,
    input: { title?: string; completed?: boolean; position?: number },
  ): Promise<{ subtask: TaskCardSubtask; parentCardCompleted: boolean | null }> {
    const response = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<{ subtask: TaskCardSubtask; parentCardCompleted: boolean | null }>(
      response,
    );
  },

  async deleteSubtask(subtaskId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    await handleResponse<{ success: true }>(response);
  },
};

// ===== React Query хуки =====

const COLUMNS_KEY = ['task-columns'] as const;
const CARDS_KEY = ['task-cards'] as const;
const commentsKey = (cardId: string) => ['task-comments', cardId] as const;

export const useTaskColumns = () => {
  return useQuery({
    queryKey: COLUMNS_KEY,
    queryFn: tasksApi.getColumns,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 15,
    enabled: !!localStorage.getItem('accessToken'),
  });
};

export const useTaskCards = () => {
  return useQuery({
    queryKey: CARDS_KEY,
    queryFn: tasksApi.getCards,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 15,
    enabled: !!localStorage.getItem('accessToken'),
  });
};

export const useTaskComments = (cardId: string | null) => {
  return useQuery({
    queryKey: commentsKey(cardId ?? ''),
    queryFn: () => (cardId ? tasksApi.getComments(cardId) : Promise.resolve([])),
    enabled: !!cardId && !!localStorage.getItem('accessToken'),
    refetchInterval: 1000 * 15,
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateColumnInput) => tasksApi.createColumn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateColumnInput }) =>
      tasksApi.updateColumn(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteColumn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => tasksApi.createCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) =>
      tasksApi.updateCard(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteCard(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      queryClient.invalidateQueries({ queryKey: commentsKey(id) });
    },
  });
};

export const useReorderCards = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; columnId: string; position: number }>) =>
      tasksApi.reorderCards(updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const cardsCacheKey = CARDS_KEY;

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, body }: { cardId: string; body: string }) =>
      tasksApi.createComment(cardId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentsKey(variables.cardId) });
      // Обновляем все карточки, чтобы счётчик комментариев пересчитался динамически.
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; cardId: string }) =>
      tasksApi.deleteComment(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentsKey(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, title }: { cardId: string; title: string }) =>
      tasksApi.createSubtask(cardId, title),
    onSuccess: () => {
      // Подпункты выводятся в составе карточек, поэтому инвалидируем весь список карточек.
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subtaskId,
      input,
    }: {
      subtaskId: string;
      input: { title?: string; completed?: boolean; position?: number };
    }) => tasksApi.updateSubtask(subtaskId, input),
    onSuccess: () => {
      // Обновление completed у подпункта может каскадно влиять на completed карточки.
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useDeleteSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: string) => tasksApi.deleteSubtask(subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

const ARCHIVED_COLUMNS_KEY = ['task-columns', 'archived'] as const;

export const useArchivedTaskColumns = (enabled = true) => {
  return useQuery({
    queryKey: ARCHIVED_COLUMNS_KEY,
    queryFn: tasksApi.getArchivedColumns,
    enabled: enabled && !!localStorage.getItem('accessToken'),
  });
};

export const useArchiveColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.updateColumn(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
      queryClient.invalidateQueries({ queryKey: ARCHIVED_COLUMNS_KEY });
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};

export const useUnarchiveColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.updateColumn(id, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
      queryClient.invalidateQueries({ queryKey: ARCHIVED_COLUMNS_KEY });
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
};
