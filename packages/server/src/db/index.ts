import Database from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { eq } from 'drizzle-orm';

// Получаем путь к директории базы данных
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'superapp.db');

// Создаем соединение с базой данных
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Создаем таблицы базы данных
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS file_permissions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    cc TEXT,
    bcc TEXT,
    body TEXT NOT NULL,
    html_body TEXT,
    folder TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    is_important INTEGER NOT NULL DEFAULT 0,
    attachments TEXT,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_columns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    deadline INTEGER,
    position INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline INTEGER,
    is_completed INTEGER NOT NULL DEFAULT 0,
    assignees TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES task_columns(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_card_comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES task_cards(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Инициализация базы данных с начальными пользователями
async function initDatabase() {
  try {
    // Проверяем, есть ли пользователи admin и user
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin')).limit(1);
    const existingUser = await db.select().from(users).where(eq(users.email, 'user')).limit(1);
    
    if (existingAdmin.length === 0 && existingUser.length === 0) {
      console.log('Creating initial users...');
      
      const now = new Date();
      
      // Создаем admin пользователя
      const adminPassword = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: 'admin',
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      } as any);
      
      // Создаем обычного пользователя
      const userPassword = await bcrypt.hash('user123', 10);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: 'user',
        username: 'user',
        password: userPassword,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      } as any);
      
      console.log('Initial users created:');
      console.log('  - admin / admin123 (admin role)');
      console.log('  - user / user123 (user role)');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Запускаем инициализацию
initDatabase();

export { db, schema };
