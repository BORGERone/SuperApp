// Общий хелпер для рефреша access-токена. Используется обоими API-клиентами
// (apiClient.ts, api.ts) и бакграунд-поллером уведомлений.
//
// Идея:
// — на 401 пытаемся обменять refreshToken на новый accessToken через
//   POST /api/auth/refresh
// — если refresh-токена нет или сервер ответил 4xx — refresh не удался,
//   вызывающий код должен выкинуть пользователя в /login и почистить токены.
// — если рефреш успешен — сохраняем новый accessToken в localStorage и
//   возвращаем true, чтобы вызывающий код мог повторить исходный запрос.
//
// Параллельные обращения схлопываем в один in-flight-промис, чтобы при
// шквале 401 не плодить 10 одновременных POST /auth/refresh.

import { getApiBase } from './serverConfig';

const API_BASE = getApiBase();

let inFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as {
        accessToken?: string;
        user?: { id: string; email: string; username: string; role: string };
      };
      if (!data.accessToken) return false;

      localStorage.setItem('accessToken', data.accessToken);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function clearAuthAndRedirect(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Бакграунд-поллер живёт на отдельном ключе bgRefreshToken и здесь не
  // трогается — он остановится сам, когда сервер ответит 401 на рефреш.
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
