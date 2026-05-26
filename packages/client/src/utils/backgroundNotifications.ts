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

const isElectron =
  typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3002' : '';
const POLL_INTERVAL_MS = 30 * 1000;
const BG_REFRESH_KEY = 'bgRefreshToken';
const LAST_UNREAD_KEY = 'bgLastUnreadCount';

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
      const refreshToken = localStorage.getItem(BG_REFRESH_KEY);
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // refresh-токен мёртв — поллер бесполезен, останавливаемся.
        if (res.status === 401) {
          localStorage.removeItem(BG_REFRESH_KEY);
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
  if (!accessToken) return null;

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
      localStorage.removeItem('accessToken');
      return null;
    }
    if (!res.ok) return null;

    const data = (await res.json()) as { emails?: unknown[] };
    return Array.isArray(data.emails) ? data.emails.length : 0;
  } catch {
    return null;
  }
}

function shouldNotifyInBackground(): boolean {
  // Сценарии, когда показываем «Пришло новое письмо» именно бакграундом:
  //   — UI на /login или /pin (пользователя выкинуло),
  //   — окно свёрнуто/неактивно.
  // В остальных случаях MailView сам покажет обычное in-app-уведомление
  // с темой/отправителем — дублировать не нужно.
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  if (path === '/login' || path === '/pin') return true;
  if (typeof document !== 'undefined' && document.hidden) return true;
  return false;
}

function showBackgroundNotification(): void {
  // Берём Electron Notification API напрямую (без темы/отправителя)
  // — пользователь явно просил «без текста».
  const electron = (window as any).electron;
  if (electron?.showNotification) {
    electron.showNotification({
      title: 'Пришло новое письмо',
      body: '',
      icon: '/icon.png',
    });
    return;
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Пришло новое письмо', {
      icon: '/icon.png',
      tag: 'superapp-bg-mail',
    });
  }
}

async function tick(): Promise<void> {
  const count = await fetchUnreadCount();
  if (count == null) return;

  const prevRaw = localStorage.getItem(LAST_UNREAD_KEY);
  const prev = prevRaw == null ? null : Number.parseInt(prevRaw, 10);
  localStorage.setItem(LAST_UNREAD_KEY, String(count));

  // На самом первом тике prev=null — просто запоминаем значение и не
  // нотифицируем (иначе на каждом старте всё новое будет «новым»).
  if (prev == null) return;
  if (count > prev && shouldNotifyInBackground()) {
    showBackgroundNotification();
  }
}

export function startBackgroundMailPoller(refreshToken: string): void {
  if (refreshToken) {
    localStorage.setItem(BG_REFRESH_KEY, refreshToken);
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
  localStorage.removeItem(BG_REFRESH_KEY);
  localStorage.removeItem(LAST_UNREAD_KEY);
}

// Реанимирует поллер при старте приложения (например, после релоада
// страницы в Electron-сессии). Если bgRefreshToken есть — снова запускаем.
export function resumeBackgroundMailPollerIfPossible(): void {
  const bgRefresh = localStorage.getItem(BG_REFRESH_KEY);
  if (bgRefresh) startBackgroundMailPoller(bgRefresh);
}
