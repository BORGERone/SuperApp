// API базовый URL
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002' : '';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken');

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  // Добавляем заголовки из options
  if (options.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  // Обработка 401 ошибки - токен истек или недействителен
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      // Если есть refreshToken, перенаправляем на страницу пин-кода
      if (window.location.pathname !== '/pin' && window.location.pathname !== '/login') {
        window.location.href = '/pin';
      }
    } else {
      // Если нет refreshToken, перенаправляем на страницу входа
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}
