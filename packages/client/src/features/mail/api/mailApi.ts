import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Email, ComposeEmail, MailFolder } from '../models/mailModel';
import { apiFetch } from '../../../lib/api';

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
// apiFetch уже добавляет правильный base + Authorization, поэтому здесь только path.
const API_BASE = '/api/mail';

// API функции
const mailApi = {
  // Получение списка писем
  async getEmails(params?: {
    folder?: MailFolder;
    search?: string;
    isUnreadOnly?: boolean;
    isStarredOnly?: boolean;
  }): Promise<Email[]> {
    const searchParams = new URLSearchParams();
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.isUnreadOnly) searchParams.set('isUnreadOnly', 'true');
    if (params?.isStarredOnly) searchParams.set('isStarredOnly', 'true');

    const response = await apiFetch(`${API_BASE}?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch emails');
    }

    const data = await response.json();
    return data.emails;
  },

  // Получение одного письма
  async getEmail(id: string): Promise<Email> {
    const response = await apiFetch(`${API_BASE}/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch email');
    }

    const data = await response.json();
    return data.email;
  },

  // Отправка письма
  async sendEmail(email: ComposeEmail): Promise<Email> {
    const response = await apiFetch(`${API_BASE}/send`, {
      method: 'POST',
      body: JSON.stringify(email),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const data = await response.json();
    return data.email;
  },

  // Обновление письма
  async updateEmail(id: string, updates: {
    folder?: MailFolder;
    isRead?: boolean;
    isStarred?: boolean;
  }): Promise<void> {
    const response = await apiFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update email');
    }
  },

  // Удаление письма
  async deleteEmail(id: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete email');
    }
  },

  // Перемещение письма в папку
  async moveEmail(id: string, folder: MailFolder): Promise<void> {
    const response = await apiFetch(`${API_BASE}/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ id, folder }),
    });

    if (!response.ok) {
      throw new Error('Failed to move email');
    }
  },
};

// React Query хуки
export const useEmails = (params?: {
  folder?: MailFolder;
  search?: string;
  isUnreadOnly?: boolean;
  isStarredOnly?: boolean;
}) => {
  return useQuery({
    queryKey: ['emails', params],
    queryFn: () => mailApi.getEmails(params),
    staleTime: 1000 * 2, // 2 секунды для более частого обновления
    refetchOnWindowFocus: true, // Обновлять при фокусе окна
  });
};

export const useEmail = (id: string) => {
  return useQuery({
    queryKey: ['email', id],
    queryFn: () => mailApi.getEmail(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 минута
  });
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.sendEmail,
    onSuccess: () => {
      // Инвалидируем кеш для всех папок чтобы обновить и отправителя, и получателя
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['emails', { folder: 'sent' }] });
      queryClient.invalidateQueries({ queryKey: ['emails', { folder: 'inbox' }] });
    },
  });
};

export const useUpdateEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      mailApi.updateEmail(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
};

export const useDeleteEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.deleteEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
};

export const useMoveEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: MailFolder }) => 
      mailApi.moveEmail(id, folder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
};
