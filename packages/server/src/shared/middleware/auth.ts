import { Context, Next } from 'hono';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

// Унифицированный объект текущего пользователя, доступный через c.get('user').
// Поля выбраны так, чтобы быть совместимыми со всем прежним кодом, который
// обращался либо к .userId (старая форма JWT-пейлоада), либо к .id (форма
// загруженного пользователя из БД).
export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

// Расширяем глобальный тип Hono ContextVariableMap, чтобы c.get('user')
// возвращал AuthUser, а не never. Без этого Hono v4 ругается:
// "Argument of type '\"user\"' is not assignable to parameter of type 'never'".
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const payload: TokenPayload | null = verifyAccessToken(token);

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const user: AuthUser = {
    id: payload.userId,
    userId: payload.userId,
    email: payload.email,
    username: payload.username,
    role: payload.role,
  };

  c.set('user', user);
  return next();
}

export function requireAdmin(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;

  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  return next();
}
