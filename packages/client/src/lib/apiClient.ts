// API клиент для взаимодействия с сервером

import { refreshAccessToken, clearAuthAndRedirect } from './tokenRefresh';
import { playErrorSound } from '../utils/notifications';

// API базовый URL - в Electron используем абсолютный URL, в браузере - относительный (работает через proxy)
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE_URL = (import.meta.env as any).VITE_API_URL || (isElectron ? 'http://localhost:3002' : '');

async function doFetch(endpoint: string, options: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response = await doFetch(endpoint, options);

  // На 401 пробуем обменять refresh-токен на новый access — и только если
  // это не получилось, выкидываем пользователя на /login. Это и убирает
  // «вылет каждые 15 минут», и оставляет бакграунд-поллеру шанс продолжить.
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch(endpoint, options);
    }
    if (!response.ok && response.status === 401) {
      clearAuthAndRedirect();
      throw new Error('Token expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    playErrorSound();
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

  downloadFile: async (path: string): Promise<Blob> => {
    const url = `${API_BASE_URL}/api/drive/download?path=${encodeURIComponent(path)}`;
    const token = localStorage.getItem('accessToken');

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(url, { headers });

    // На 401 пробуем обменять refresh-токен на новый access
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newToken = localStorage.getItem('accessToken');
        if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { headers });
      }
      if (!response.ok && response.status === 401) {
        clearAuthAndRedirect();
        throw new Error('Token expired');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      playErrorSound();
      throw new Error(error.error || 'Request failed');
    }

    return response.blob();
  },
};
