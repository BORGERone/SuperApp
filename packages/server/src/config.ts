// Централизованная конфигурация сервера. Все настройки берутся из окружения
// (которое в проде задаётся файлом packages/server/.env, генерируемым
// установщиком installer/install-server). Здесь же — единственное место, где
// решается судьба JWT-секрета: в production сервер обязан получить заданный
// секрет, иначе токены можно подделать общеизвестным ключом по умолчанию.

const DEV_JWT_SECRET = 'superapp-secret-key';
const MIN_SECRET_LENGTH = 16;

const isProduction = process.env.NODE_ENV === 'production';

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= MIN_SECRET_LENGTH && fromEnv !== DEV_JWT_SECRET) {
    return fromEnv;
  }

  if (isProduction) {
    console.error(
      '[FATAL] JWT_SECRET не задан или слишком короткий (нужно ≥ ' +
        MIN_SECRET_LENGTH +
        ' символов и не значение по умолчанию). В production это обязательно — ' +
        'иначе JWT-токены можно подделать. Запустите installer/install-server, ' +
        'чтобы сгенерировать секрет, или задайте переменную окружения JWT_SECRET.',
    );
    process.exit(1);
  }

  console.warn(
    '[auth] JWT_SECRET не задан в окружении — используется небезопасное значение ' +
      'по умолчанию. Обязательно задайте JWT_SECRET в production (NODE_ENV=production).',
  );
  return fromEnv || DEV_JWT_SECRET;
}

function parseCorsOrigins(raw: string | undefined): string[] | '*' {
  if (!raw || !raw.trim()) {
    // Прежнее поведение по умолчанию (локальная разработка / Electron).
    return ['http://localhost:8080', 'http://localhost:3000'];
  }
  const trimmed = raw.trim();
  if (trimmed === '*') return '*';
  return trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseIntEnv(raw: string | undefined, fallback: number): number {
  const value = parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

export const config = {
  port: parseIntEnv(process.env.PORT, 3002),
  // Интерфейс привязки. 0.0.0.0 — слушать на всех интерфейсах (нужно для
  // развёртывания на отдельном сервере, а не только на localhost).
  host: process.env.HOST || '0.0.0.0',
  isProduction,
  jwtSecret: resolveJwtSecret(),
  corsOrigins,
  // Нельзя одновременно разрешать любой источник (*) и credentials — это
  // уязвимость, поэтому при '*' принудительно выключаем credentials.
  corsCredentials: corsOrigins !== '*',
  maxBodyBytes: parseIntEnv(process.env.MAX_BODY_BYTES, 500 * 1024 * 1024),
};
