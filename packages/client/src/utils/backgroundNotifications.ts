// Бакграунд-поллер уведомлений о новых письмах.
//
// Живёт независимо от React-роутера. Стартует один раз после логина и
// крутится, пока:
//   а) пользователь явно не нажмёт «Выйти» (stopBackgroundMailPoller)
//   б) refresh-токен окончательно не протухнет (сервер ответит 401 на
//      /auth/refresh — тогда поллер сам остановится и очистит свой ключ)
//
// Сценарий «выкинуло из программы из-за истёкшего хендшейка»:
//   — UI выкинуло на /login, accessToken почистили, но в localStorage
//     остался bgRefreshToken (мы кладём его сюда отдельно от штатного
//     refreshToken — чтобы apiClient/clearAuthAndRedirect его не трогали).
//   — На каждый тик поллер сам получает свежий accessToken через
//     /auth/refresh и проверяет инбокс.
//   — Если количество непрочитанных выросло — Electron-нотификация
//     «Пришло новое письмо» (без тела/темы/отправителя).
//
// Когда пользователь залогинен и активно работает в приложении, обычные
// in-app-уведомления MailView показывают полную карточку. Мы их не
// дублируем: эта функция шлёт нотификацию только если пользователь
// «выкинут» (pathname === '/login') либо окно скрыто (document.hidden).

import { playNotificationSound, showNotification } from './notifications';
import { getApiBase } from '../lib/serverConfig';

const API_BASE = getApiBase();
const POLL_INTERVAL_MS = 30 * 1000;
const BG_REFRESH_KEY = 'bgRefreshToken';
const LAST_UNREAD_KEY = 'bgLastUnreadCount';

// Долгоживущий refresh-токен фоновых уведомлений держим в зашифрованном
// средствами ОС хранилище Electron (safeStorage), а не в localStorage, чтобы
// его нельзя было вытащить XSS-ом. В браузере (web/dev) безопасного хранилища
// нет — прозрачный фолбэк на localStorage (поведение как раньше).
const secureStore =
  (typeof window !== 'undefined' && (window as any).electron?.secureStore) || null;
let bgRefreshToken: string | null = null;

async function persistBgRefreshToken(token: string): Promise<void> {
  bgRefreshToken = token;
  if (secureStore) {
    try { await secureStore.set(BG_REFRESH_KEY, token); } catch {}
    try { localStorage.removeItem(BG_REFRESH_KEY); } catch {}
  } else {
    try { localStorage.setItem(BG_REFRESH_KEY, token); } catch {}
  }
}

async function loadBgRefreshToken(): Promise<string | null> {
  if (bgRefreshToken) return bgRefreshToken;
  if (secureStore) {
    try {
      const v = await secureStore.get(BG_REFRESH_KEY);
      if (v) { bgRefreshToken = v; return v; }
    } catch {}
    // Миграция legacy-токена из localStorage в зашифрованное хранилище.
    try {
      const legacy = localStorage.getItem(BG_REFRESH_KEY);
      if (legacy) {
        await secureStore.set(BG_REFRESH_KEY, legacy);
        localStorage.removeItem(BG_REFRESH_KEY);
        bgRefreshToken = legacy;
        return legacy;
      }
    } catch {}
    return null;
  }
  try {
    const v = localStorage.getItem(BG_REFRESH_KEY);
    bgRefreshToken = v;
    return v;
  } catch {
    return null;
  }
}

async function clearBgRefreshToken(): Promise<void> {
  bgRefreshToken = null;
  if (secureStore) {
    try { await secureStore.delete(BG_REFRESH_KEY); } catch {}
  }
  try { localStorage.removeItem(BG_REFRESH_KEY); } catch {}
}

interface PollerState {
  timer: ReturnType<typeof setInterval> | null;
  refreshing: Promise<string | null> | null;
}

const state: PollerState = {
  timer: null,
  refreshing: null,
};

async function obtainAccessToken(): Promise<string | null> {
  // Сначала пробуем тот accessToken, что лежит у обычной сессии — если он
  // живой, экономим запрос к /refresh.
  const existing = localStorage.getItem('accessToken');
  if (existing) return existing;

  // Иначе меняем bgRefreshToken на свежий accessToken.
  if (state.refreshing) return state.refreshing;

  state.refreshing = (async () => {
    try {
      const refreshToken = await loadBgRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // refresh-токен мёртв — поллер бесполезен, останавливаемся.
        if (res.status === 401) {
          stopBackgroundMailPoller();
        }
        return null;
      }

      const data = (await res.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    } catch {
      return null;
    } finally {
      state.refreshing = null;
    }
  })();

  return state.refreshing;
}

async function fetchUnreadCount(): Promise<number | null> {
  const accessToken = await obtainAccessToken();
  if (!accessToken) {
    console.log('Background poller: no access token available');
    return null;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/mail?folder=inbox&isUnreadOnly=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (res.status === 401) {
      // accessToken протух — даём obtainAccessToken на следующем тике
      // принудительно сходить за новым, очистив localStorage.
      console.log('Background poller: access token expired, clearing');
      localStorage.removeItem('accessToken');
      return null;
    }
    if (!res.ok) {
      console.log('Background poller: fetch failed with status', res.status);
      return null;
    }

    const data = (await res.json()) as { emails?: unknown[] };
    const count = Array.isArray(data.emails) ? data.emails.length : 0;
    console.log('Background poller: fetched unread count', count);
    return count;
  } catch (error) {
    console.error('Background poller: fetch error', error);
    return null;
  }
}

async function shouldNotifyInBackground(): Promise<boolean> {
  // Сценарии, когда показываем «Пришло новое письмо» именно бакграундом:
  //   — UI на /login или /pin (пользователя выкинуто),
  //   — окно действительно свернуто (не просто переключилась вкладка).
  // В остальных случаях показываем уведомление с текстом письма.
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  console.log('Checking background notification condition. Path:', path);

  if (path === '/login' || path === '/pin') {
    console.log('User is on login/pin page, should show background notification');
    return true;
  }

  // Проверяем, что окно действительно свернуто (document.visibilityState === 'hidden')
  // а не просто переключилась вкладка
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    // Дополнительная проверка через Electron API если доступно
    const electron = (window as any).electron;
    if (electron?.isWindowMinimized) {
      try {
        return await electron.isWindowMinimized();
      } catch {
        return true;
      }
    }
    console.log('Window is hidden, should show background notification');
    return true;
  }

  console.log('Not showing background notification - user is active in app');
  return false;
}

function showBackgroundNotification(): void {
  // Воспроизводим звук нового письма
  playNotificationSound(70);

  // Берём Electron Notification API напрямую (без темы/отправителя)
  // — пользователь явно просил «без текста».
  const electron = (window as any).electron;
  if (electron?.showNotification) {
    console.log('Using Electron notification API');
    try {
      // Клик обрабатывается в Electron main process
      electron.showNotification({
        title: 'Пришло новое письмо',
        body: '',
        icon: '/icon.png',
      });
    } catch (error) {
      console.error('Failed to show Electron notification:', error);
      // Fallback на браузерное уведомление
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Пришло новое письмо', {
          icon: '/icon.png',
          tag: 'superapp-bg-mail',
        });

        notification.onclick = () => {
          console.log('Notification clicked, navigating to mail');
          window.focus();
          if (typeof window !== 'undefined' && (window as any).navigate) {
            (window as any).navigate('/mail/inbox');
          } else {
            window.location.href = '/mail/inbox';
          }
          notification.close();
        };
      }
    }
    return;
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    console.log('Using browser notification API');
    const notification = new Notification('Пришло новое письмо', {
      icon: '/icon.png',
      tag: 'superapp-bg-mail',
    });

    // При клике на уведомление - раскрываем окно и переходим в почту
    notification.onclick = () => {
      console.log('Notification clicked, navigating to mail');
      window.focus();
      // Используем React Router для навигации
      if (typeof window !== 'undefined' && (window as any).navigate) {
        (window as any).navigate('/mail/inbox');
      } else {
        window.location.href = '/mail/inbox';
      }
      notification.close();
    };
  }
}

async function tick(): Promise<void> {
  const count = await fetchUnreadCount();
  if (count == null) {
    console.log('Background poller tick: count is null, skipping');
    return;
  }

  const prevRaw = localStorage.getItem(LAST_UNREAD_KEY);
  const prev = prevRaw == null ? null : Number.parseInt(prevRaw, 10);
  localStorage.setItem(LAST_UNREAD_KEY, String(count));

  const isBackground = await shouldNotifyInBackground();
  console.log('Background poller tick:', { count, prev, isBackground, path: window.location.pathname });

  // На самом первом тике prev=null — просто запоминаем значение и не
  // нотифицируем (иначе на каждом старте всё новое будет «новым»).
  if (prev == null) {
    console.log('First tick, setting baseline');
    return;
  }

  if (count > prev) {
    console.log('Unread count increased, showing notification');
    if (isBackground) {
      console.log('Showing background notification');
      showBackgroundNotification();
    } else {
      // Если пользователь в приложении (не на /login и окно не скрыто),
      // показываем уведомление с текстом письма
      console.log('Showing in-app notification with text');
      showNotificationWithText();
    }
  }
}

async function showNotificationWithText(): Promise<void> {
  try {
    const accessToken = await obtainAccessToken();
    if (!accessToken) return;

    const res = await fetch(`${API_BASE}/api/mail?folder=inbox&isUnreadOnly=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return;

    const data = (await res.json()) as { emails?: any[] };
    if (!Array.isArray(data.emails) || data.emails.length === 0) return;

    // Берём последнее письмо
    const latestEmail = data.emails[0];

    console.log('Showing notification with text for:', latestEmail.subject);

    // Показываем уведомление с текстом без обработчика клика
    // Клик обрабатывается в Electron main process
    const notification = showNotification(
      'Новое письмо',
      `${latestEmail.from}: ${latestEmail.subject}`,
      'email'
    );

    console.log('Notification created:', notification);
  } catch (error) {
    console.error('Failed to show notification with text:', error);
  }
}

export function startBackgroundMailPoller(refreshToken: string): void {
  if (refreshToken) {
    void persistBgRefreshToken(refreshToken);
  }
  if (state.timer) return;

  // Первый тик — синхронизируем baseline без нотификации.
  void tick();
  state.timer = setInterval(tick, POLL_INTERVAL_MS);
}

export function stopBackgroundMailPoller(): void {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  void clearBgRefreshToken();
  localStorage.removeItem(LAST_UNREAD_KEY);
}

// Реанимирует поллер при старте приложения (например, после релоада
// страницы в Electron-сессии). Если bgRefreshToken есть — снова запускаем.
export function resumeBackgroundMailPollerIfPossible(): void {
  void (async () => {
    const token = await loadBgRefreshToken();
    if (token) startBackgroundMailPoller(token);
  })();
}
