import { useQuery } from '@tanstack/react-query';

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002/api' : '/api';

// API функции
const usersApi = {
  // Получение списка пользователей
  async getUsers() {
    const response = await fetch(`${API_BASE}/auth/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get users');
    }

    const data = await response.json();
    return data.users || [];
  },
};

// React Query хук
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
    enabled: !!localStorage.getItem('accessToken'),
    staleTime: 0, // Сразу устаревает, чтобы всегда получать свежие данные
    refetchOnWindowFocus: true, // Перезагружать при фокусе окна
  });
};

export { usersApi };
