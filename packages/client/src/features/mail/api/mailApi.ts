import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Email, ComposeEmail, MailFolder } from '../models/mailModel';

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002/api/mail' : '/api/mail';

// API функции
const mailApi = {
  // Получение списка писем
  async getEmails(params?: {
    folder?: MailFolder;
    search?: string;
    isUnreadOnly?: boolean;
    isStarredOnly?: boolean;
  }): Promise<Email[]> {
    console.log('Mail API - getEmails called');
    const token = localStorage.getItem('accessToken');
    console.log('Mail API - Token from localStorage:', token ? 'exists' : 'missing');
    console.log('Mail API - Token value:', token ? token.substring(0, 50) + '...' : 'none');
    
    const searchParams = new URLSearchParams();
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.isUnreadOnly) searchParams.set('isUnreadOnly', 'true');
    if (params?.isStarredOnly) searchParams.set('isStarredOnly', 'true');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Mail API - Request URL:', `${API_BASE}?${searchParams.toString()}`);
    console.log('Mail API - Request params:', {
      folder: params?.folder,
      search: params?.search,
      isUnreadOnly: params?.isUnreadOnly,
      isStarredOnly: params?.isStarredOnly
    });
    
    // Логируем в файл для детального анализа
    const clientLog = {
      timestamp: new Date().toISOString(),
      action: 'GET_EMAILS_REQUEST',
      params: params,
      url: `${API_BASE}?${searchParams.toString()}`
    };
    console.log('CLIENT_MAIL_LOG:', JSON.stringify(clientLog));

    const response = await fetch(`${API_BASE}?${searchParams.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch emails');
    }

    const data = await response.json();
    console.log('Mail API - Response data:', data);
    console.log('Mail API - Response emails count:', data.emails?.length || 0);
    return data.emails;
  },

  // Получение одного письма
  async getEmail(id: string): Promise<Email> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/${id}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch email');
    }

    const data = await response.json();
    return data.email;
  },

  // Отправка письма
  async sendEmail(email: ComposeEmail): Promise<Email> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(email),
    });

    if (!response.ok) {
      // Если ошибка авторизации, перенаправляем на страницу входа
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return;
      }
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
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('PUT email request:', {
      url: `${API_BASE}/${id}`,
      headers,
      body: updates
    });

    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PUT email failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      // Если ошибка авторизации, перенаправляем на страницу входа
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return;
      }
      
      throw new Error('Failed to update email');
    }
  },

  // Удаление письма
  async deleteEmail(id: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('DELETE email request:', {
      url: `${API_BASE}/${id}`,
      headers
    });

    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DELETE email failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      // Если ошибка авторизации, перенаправляем на страницу входа
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return;
      }
      
      throw new Error('Failed to delete email');
    }
  },

  // Перемещение письма в папку
  async moveEmail(id: string, folder: MailFolder): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/${id}/move`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, folder }),
    });

    if (!response.ok) {
      // Если ошибка авторизации, перенаправляем на страницу входа
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return;
      }
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
