// API клиент для взаимодействия с сервером

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE_URL = (import.meta.env as any).VITE_API_URL || (isElectron ? 'http://localhost:3002' : '');

interface RefreshResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as RefreshResponse;
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  return true;
}

const clearAuthAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('API Request:', { url, endpoint, API_BASE_URL });
  
  const token = localStorage.getItem('accessToken');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
  });
  
  console.log('API Response status:', response.status);
  
  if (response.status === 401 && endpoint !== '/api/auth/refresh') {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const updatedToken = localStorage.getItem('accessToken');
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(updatedToken ? { Authorization: `Bearer ${updatedToken}` } : {}),
        },
      });
      console.log('API Response status after refresh:', response.status);
    }
  }

  if (!response.ok) {
    // Обработка 401 ошибки (истекший токен)
    if (response.status === 401) {
      console.log('Token expired, redirecting to login');
      clearAuthAndRedirect();
      throw new Error('Token expired');
    }
    
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error('API Error:', error);
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: username, password }),
    }),
  
  register: (email: string, username: string, password: string) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),
  
  // Drive
  listFiles: (path: string) =>
    apiRequest(`/api/drive/list?path=${encodeURIComponent(path)}`),
  
  createFolder: (name: string, path: string) =>
    apiRequest(`/api/drive/create`, {
      method: 'POST',
      body: JSON.stringify({ name, type: 'directory', path }),
    }),
  
  deleteFile: (path: string) =>
    apiRequest(`/api/drive/delete?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    }),
  
  getFilePermissions: (path: string) =>
    apiRequest(`/api/drive/permissions?path=${encodeURIComponent(path)}`),
  
  updateFilePermissions: (path: string, allowedUsers: string[]) =>
    apiRequest(`/api/drive/permissions?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ allowedUsers }),
    }),
};
