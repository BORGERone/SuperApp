import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TaskColumn,
  TaskCard,
  TaskComment,
  CreateColumnInput,
  UpdateColumnInput,
  CreateCardInput,
  UpdateCardInput,
} from '../models/tasksModel';

// Базовый URL такой же как в drive/mail: абсолютный для Electron, относительный для браузера
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002/api/tasks' : '/api/tasks';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw new Error('Не авторизован');
    }
    let message = 'Ошибка запроса';
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

const tasksApi = {
  async getColumns(): Promise<TaskColumn[]> {
    const response = await fetch(`${API_BASE}/columns`, {
      headers: authHeaders(),
    });
    const data = await handleResponse(response);
    return data.columns || [];
  },

  async createColumn(input: CreateColumnInput): Promise<TaskColumn> {
    const response = await fetch(`${API_BASE}/columns`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse(response);
    return data.column;
  },

  async updateColumn(id: string, input: UpdateColumnInput): Promise<TaskColumn> {
    const response = await fetch(`${API_BASE}/columns/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse(response);
    return data.column;
  },

  async deleteColumn(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/columns/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse(response);
  },

  async createCard(input: CreateCardInput): Promise<TaskCard> {
    const response = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse(response);
    return data.card;
  },

  async updateCard(id: string, input: UpdateCardInput): Promise<TaskCard> {
    const response = await fetch(`${API_BASE}/cards/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const data = await handleResponse(response);
    return data.card;
  },

  async deleteCard(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/cards/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse(response);
  },

  async createComment(cardId: string, body: string): Promise<TaskComment> {
    const response = await fetch(`${API_BASE}/cards/${cardId}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body }),
    });
    const data = await handleResponse(response);
    return data.comment;
  },

  async deleteComment(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await handleResponse(response);
  },
};

// React Query хуки

export const TASKS_QUERY_KEY = ['tasks', 'columns'];

export const useColumns = () => {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: tasksApi.getColumns,
    staleTime: 1000 * 2,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 10, // Периодическая синхронизация с сервером
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.createColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateColumnInput }) =>
      tasksApi.updateColumn(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) =>
      tasksApi.updateCard(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, body }: { cardId: string; body: string }) =>
      tasksApi.createComment(cardId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

export { tasksApi };
