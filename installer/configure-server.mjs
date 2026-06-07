#!/usr/bin/env node
// Интерактивный конфигуратор СЕРВЕРА SuperApp.
//
// Пишет packages/server/.env: порт, адрес привязки, CORS, режим и
// криптостойкий JWT_SECRET (генерируется автоматически, если ещё не задан).
//
// Запуск:
//   node installer/configure-server.mjs            # интерактивно
//   node installer/configure-server.mjs --defaults # без вопросов (для обновлений)
//   node installer/configure-server.mjs --regenerate-secret
//
// Скрипт работает и под node, и под bun (без внешних зависимостей).

import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(__dirname, '..', 'packages', 'server');
const ENV_PATH = join(SERVER_DIR, '.env');

const args = new Set(process.argv.slice(2));
const NON_INTERACTIVE =
  args.has('--defaults') ||
  args.has('--non-interactive') ||
  args.has('--yes') ||
  args.has('-y') ||
  !process.stdin.isTTY;
const REGENERATE_SECRET = args.has('--regenerate-secret');

const DEFAULTS = {
  PORT: '3002',
  HOST: '0.0.0.0',
  NODE_ENV: 'production',
  CORS_ORIGINS: '',
  MAX_BODY_BYTES: '524288000',
};

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function generateSecret(bytes = 48) {
  return randomBytes(bytes).toString('base64url');
}

const rl = NON_INTERACTIVE
  ? null
  : createInterface({ input: process.stdin, output: process.stdout });

function ask(question, fallback) {
  if (NON_INTERACTIVE) return Promise.resolve(fallback);
  const suffix = fallback ? ` [${fallback}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const value = (answer || '').trim();
      resolve(value || fallback);
    });
  });
}

function validatePort(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && n < 65536;
}

async function main() {
  const existing = existsSync(ENV_PATH)
    ? parseEnv(readFileSync(ENV_PATH, 'utf8'))
    : {};
  const isUpdate = Object.keys(existing).length > 0;

  console.log('\n=== Настройка сервера SuperApp ===');
  console.log(
    isUpdate
      ? `Найден существующий ${ENV_PATH} — значения по умолчанию взяты из него.\n`
      : `Первая установка. Конфигурация будет записана в ${ENV_PATH}.\n`,
  );

  // PORT
  let port = existing.PORT || DEFAULTS.PORT;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const answer = await ask('Порт сервера (PORT)', port);
    if (validatePort(answer)) {
      port = String(parseInt(answer, 10));
      break;
    }
    if (NON_INTERACTIVE) {
      port = DEFAULTS.PORT;
      break;
    }
    console.log('  ! Введите число от 1 до 65535.');
  }

  // HOST
  const host = await ask(
    'Адрес привязки (HOST, 0.0.0.0 = все интерфейсы)',
    existing.HOST || DEFAULTS.HOST,
  );

  // CORS
  const corsOrigins = await ask(
    'Разрешённые CORS-источники через запятую (пусто = по умолчанию, для веб-клиента)',
    existing.CORS_ORIGINS || DEFAULTS.CORS_ORIGINS,
  );

  // NODE_ENV
  const nodeEnv = await ask(
    'Режим (NODE_ENV: production/development)',
    existing.NODE_ENV || DEFAULTS.NODE_ENV,
  );

  // JWT_SECRET — генерируем, если нет/слишком короткий, либо по флагу.
  let jwtSecret = existing.JWT_SECRET || '';
  const secretMissing = !jwtSecret || jwtSecret.length < 16 || jwtSecret === 'superapp-secret-key';
  if (REGENERATE_SECRET || secretMissing) {
    jwtSecret = generateSecret();
    console.log(
      REGENERATE_SECRET
        ? '  → JWT_SECRET перегенерирован (все ранее выданные токены станут недействительны).'
        : '  → Сгенерирован новый криптостойкий JWT_SECRET.',
    );
  } else {
    console.log('  → Существующий JWT_SECRET сохранён.');
  }

  const maxBody = existing.MAX_BODY_BYTES || DEFAULTS.MAX_BODY_BYTES;

  const lines = [
    '# Сгенерировано installer/configure-server.mjs. Не коммитить!',
    `# Обновлено: ${new Date().toISOString()}`,
    `PORT=${port}`,
    `HOST=${host}`,
    `JWT_SECRET=${jwtSecret}`,
    `NODE_ENV=${nodeEnv}`,
    `CORS_ORIGINS=${corsOrigins}`,
    `MAX_BODY_BYTES=${maxBody}`,
    '',
  ];

  mkdirSync(SERVER_DIR, { recursive: true });
  writeFileSync(ENV_PATH, lines.join('\n'), { encoding: 'utf8' });
  // Ограничиваем права (только владелец) на Unix. На Windows игнорируется.
  try {
    chmodSync(ENV_PATH, 0o600);
  } catch {
    /* not POSIX */
  }

  console.log(`\nКонфигурация записана: ${ENV_PATH}`);
  console.log(`  PORT=${port}  HOST=${host}  NODE_ENV=${nodeEnv}`);
  console.log(
    `  CORS_ORIGINS=${corsOrigins || '(по умолчанию localhost:8080,localhost:3000)'}`,
  );
  if (rl) rl.close();
}

main().catch((error) => {
  console.error('Ошибка конфигуратора сервера:', error);
  if (rl) rl.close();
  process.exit(1);
});
