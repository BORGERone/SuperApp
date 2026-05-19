import { useQuery, useMutation } from '@tanstack/react-query';

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

  // Удаление пользователя
  async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    return response.json();
  },

  // Обновление роли пользователя
  async updateUserRole(userId: string, role: string) {
    const response = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user role');
    }

    return response.json();
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

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: usersApi.deleteUser,
  });
};

export const useUpdateUserRole = () => {
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      usersApi.updateUserRole(userId, role),
  });
};

export { usersApi };
