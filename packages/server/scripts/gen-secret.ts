// Утилита: вывести криптостойкий секрет для JWT_SECRET.
//   bun run packages/server/scripts/gen-secret.ts
import { randomBytes } from 'crypto';

console.log(randomBytes(48).toString('base64url'));
