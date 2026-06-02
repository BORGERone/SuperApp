import { refreshAccessToken, clearAuthAndRedirect } from './tokenRefresh';

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002' : '';

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.headers) {
    const existing = new Headers(options.headers);
    existing.forEach((value, key) => headers.set(key, value));
  }
  const token = localStorage.getItem('accessToken');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: buildHeaders(options),
  });

  // Авто-рефреш на 401: пробуем поменять refresh-токен на новый access,
  // повторяем запрос. Только если и второй раз 401 — чистим сессию и
  // отправляем на /login.
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: buildHeaders(options),
      });
    }
    if (response.status === 401) {
      clearAuthAndRedirect();
    }
  }

  return response;
}
