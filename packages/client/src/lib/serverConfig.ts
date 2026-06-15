// Единый источник правды для базового URL бэкенда.
//
// В браузере / dev (Vite) используем относительный базовый адрес (''), чтобы
// запросы шли через прокси Vite. В собранном Electron-приложении прокси нет,
// поэтому нужен абсолютный URL до развёрнутого сервера. Этот URL во время
// запуска подставляет главный процесс Electron (читая его из config.json,
// который пишет установщик клиента) и отдаёт в renderer через preload как
// `window.electronAPI.config.apiBaseUrl`.
//
// Историческое поведение по умолчанию (http://localhost:3002 в Electron)
// сохраняется как фолбэк, если конфигурация не задана — это важно для
// локальной разработки.

const DEFAULT_ELECTRON_API = 'http://localhost:3002';

function isElectron(): boolean {
  return (
    typeof window !== 'undefined' &&
    ((window as any).electronAPI !== undefined || (window as any).electron !== undefined)
  );
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function readInjectedBase(): string | null {
  if (typeof window === 'undefined') return null;

  // 1) Конфиг, проброшенный главным процессом Electron через preload.
  const cfg =
    (window as any).electronAPI?.config ?? (window as any).electron?.config ?? null;
  const fromCfg = cfg?.apiBaseUrl;
  if (typeof fromCfg === 'string' && fromCfg.trim()) {
    return stripTrailingSlashes(fromCfg.trim());
  }

  // 2) Переменная сборки Vite (для веб-сборок против удалённого сервера).
  const fromEnv = (import.meta as any).env?.VITE_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return stripTrailingSlashes(fromEnv.trim());
  }

  return null;
}

/**
 * Базовый origin сервера: `http://host:port` для Electron/удалённого сервера
 * либо '' (относительный) для веб-версии через прокси Vite.
 */
export function getApiBase(): string {
  const injected = readInjectedBase();
  if (injected !== null) return injected;
  return isElectron() ? DEFAULT_ELECTRON_API : '';
}

/** Удобный помощник: `apiUrl('/api/auth/login')` → полный URL запроса. */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}

/**
 * Абсолютная ссылка на статику сервера (аватары в `/uploads/...`).
 *
 * В вебе базовый адрес пустой и относительный путь работает (тот же origin
 * через Caddy/прокси). В собранном Electron origin — `file://`, поэтому такой
 * путь превращается в `file:///uploads/...` и картинка не грузится. Здесь
 * подставляем абсолютный адрес сервера. Уже абсолютные (`http(s)://`,
 * `data:`, `blob:`) ссылки возвращаем без изменений.
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getApiBase();
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
