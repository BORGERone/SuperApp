import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002/api/auth' : '/api/auth';

// API функции
const authApi = {
  // Вход пользователя
  async login(credentials: { email: string; password: string; pinCode: string }) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    return data;
  },

  // Регистрация пользователя
  async register(userData: { 
    email: string; 
    username: string; 
    password: string; 
    role?: string;
  }) {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    return data;
  },

  // Получение текущего пользователя
  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const data = await response.json();
    return data.user;
  },

  // Выход пользователя
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Сохранение токенов
  saveTokens(accessToken: string, refreshToken: string, user: any) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Получение сохраненного пользователя
  getSavedUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Проверка авторизации
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};

// React Query хуки
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      authApi.saveTokens(data.accessToken, data.refreshToken, data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      authApi.saveTokens(data.accessToken, data.refreshToken, data.user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: authApi.getCurrentUser,
    enabled: authApi.isAuthenticated(),
    staleTime: 1000 * 60 * 5, // 5 минут
  });
};

// Смена пин-кода
async function changePin(data: { password: string; currentPinCode: string; newPinCode: string }) {
  const response = await fetch(`${API_BASE}/change-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to change PIN';
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // Если JSON не удалось распарсить
      }
    } else {
      const text = await response.text();
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const useChangePin = () => {
  return useMutation({
    mutationFn: changePin,
  });
};

export { authApi };
