import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../src/db/superapp.db');
const db = new Database(dbPath);

console.log('Fixing emails: removing @example.com suffix...');

const result = db.run(`
  UPDATE users 
  SET email = REPLACE(email, '@example.com', '')
  WHERE email LIKE '%@example.com'
`);

console.log(`Updated ${result.changes} users`);
console.log('Done!');

db.close();
