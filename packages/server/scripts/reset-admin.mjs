// Сброс пароля и PIN-кода пользователя в базе SuperApp (superapp.db).
//
// Запуск (из каталога packages\server, чтобы подхватился bcryptjs):
//   bun scripts/reset-admin.mjs [логин] [новый_пароль] [новый_pin]
// По умолчанию: логин=admin, пароль=admin123, pin=1234
//
// Логин — это значение, которое вводится в поле «email» на странице входа
// (у стандартного админа это просто "admin"). Скрипт ищет пользователя по
// username ИЛИ email и обновляет ему password и pin_code (bcrypt, cost 10).

import bcrypt from 'bcryptjs';
import { Database } from 'bun:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'src', 'db', 'superapp.db');

if (!existsSync(dbPath)) {
  console.error(`[ОШИБКА] Файл базы не найден: ${dbPath}`);
  console.error('Запусти скрипт из каталога packages\\server (или поправь путь).');
  process.exit(1);
}

const login = process.argv[2] || 'admin';
const newPassword = process.argv[3] || 'admin123';
const newPin = process.argv[4] || '1234';

const db = new Database(dbPath);

const user = db
  .query('SELECT id, email, username, role FROM users WHERE username = ?1 OR email = ?1')
  .get(login);

if (!user) {
  console.error(`[ОШИБКА] Пользователь "${login}" не найден.`);
  const all = db.query('SELECT username, email, role FROM users ORDER BY role DESC').all();
  if (all.length) {
    console.error('Существующие учётки (логин = email при входе):');
    for (const u of all) console.error(`  - email="${u.email}"  username="${u.username}"  role=${u.role}`);
  } else {
    console.error('В базе вообще нет пользователей.');
  }
  process.exit(1);
}

const passwordHash = await bcrypt.hash(newPassword, 10);
const pinHash = await bcrypt.hash(newPin, 10);
const nowSec = Math.floor(Date.now() / 1000); // updated_at хранится в секундах (drizzle timestamp)

db.query('UPDATE users SET password = $p, pin_code = $pin, updated_at = $u WHERE id = $id').run({
  $p: passwordHash,
  $pin: pinHash,
  $u: nowSec,
  $id: user.id,
});

console.log('[OK] Пароль и PIN обновлены.');
console.log(`  Логин (поле email при входе): ${user.email}`);
console.log(`  Новый пароль: ${newPassword}`);
console.log(`  Новый PIN:    ${newPin}`);
console.log(`  Роль:         ${user.role}`);
console.log('Перезапускать сервер не нужно — изменения уже в базе.');
