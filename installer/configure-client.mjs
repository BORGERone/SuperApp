#!/usr/bin/env node
// Интерактивный конфигуратор КЛИЕНТА SuperApp.
//
// Пишет packages/client/config.json с адресом сервера, к которому будет
// подключаться десктоп-клиент (Electron). Файл не содержит секретов — только
// протокол/host/port. Главный процесс Electron читает его при старте.
//
// Запуск:
//   node installer/configure-client.mjs            # интерактивно
//   node installer/configure-client.mjs --defaults # без вопросов (для обновлений)
//   node installer/configure-client.mjs --out /path/to/config.json
//
// Скрипт работает и под node, и под bun (без внешних зависимостей).

import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, '..', 'packages', 'client');

const argv = process.argv.slice(2);
const args = new Set(argv);
const NON_INTERACTIVE =
  args.has('--defaults') ||
  args.has('--non-interactive') ||
  args.has('--yes') ||
  args.has('-y') ||
  !process.stdin.isTTY;

// Куда писать config.json (по умолчанию — корень пакета клиента; установщик
// для собранного приложения может указать каталог установки через --out).
let outPath = join(CLIENT_DIR, 'config.json');
const outIdx = argv.indexOf('--out');
if (outIdx !== -1 && argv[outIdx + 1]) {
  outPath = argv[outIdx + 1];
}

const DEFAULTS = { protocol: 'http', serverHost: 'localhost', serverPort: '3002' };

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

function readExisting() {
  try {
    if (existsSync(outPath)) return JSON.parse(readFileSync(outPath, 'utf8'));
  } catch (error) {
    console.warn('Не удалось прочитать существующий config.json:', error.message);
  }
  return {};
}

function validatePort(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && n < 65536;
}

async function main() {
  const existing = readExisting();
  const isUpdate = Object.keys(existing).length > 0;

  console.log('\n=== Настройка клиента SuperApp ===');
  console.log(
    isUpdate
      ? `Найден существующий ${outPath} — значения по умолчанию взяты из него.\n`
      : `Первая установка. Конфигурация будет записана в ${outPath}.\n`,
  );

  let protocol = (existing.protocol || DEFAULTS.protocol).toLowerCase();
  protocol = (await ask('Протокол подключения к серверу (http/https)', protocol)).toLowerCase();
  if (protocol !== 'http' && protocol !== 'https') {
    console.log(`  ! Неизвестный протокол "${protocol}", использую http.`);
    protocol = 'http';
  }

  const serverHost = await ask(
    'IP или доменное имя сервера',
    existing.serverHost || DEFAULTS.serverHost,
  );

  let serverPort = existing.serverPort ? String(existing.serverPort) : DEFAULTS.serverPort;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const answer = await ask('Порт сервера', serverPort);
    if (validatePort(answer)) {
      serverPort = String(parseInt(answer, 10));
      break;
    }
    if (NON_INTERACTIVE) {
      serverPort = DEFAULTS.serverPort;
      break;
    }
    console.log('  ! Введите число от 1 до 65535.');
  }

  const apiBaseUrl = `${protocol}://${serverHost}:${serverPort}`;
  const config = {
    apiBaseUrl,
    protocol,
    serverHost,
    serverPort: parseInt(serverPort, 10),
    updatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

  console.log(`\nКонфигурация записана: ${outPath}`);
  console.log(`  Сервер: ${apiBaseUrl}`);
  if (protocol === 'http' && serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
    console.log(
      '  ⚠ Внимание: для доступа через сеть/интернет рекомендуется HTTPS ' +
        '(reverse-proxy с TLS), иначе трафик и токены передаются открыто.',
    );
  }
  if (rl) rl.close();
}

main().catch((error) => {
  console.error('Ошибка конфигуратора клиента:', error);
  if (rl) rl.close();
  process.exit(1);
});
