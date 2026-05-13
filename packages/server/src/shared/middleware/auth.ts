import { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  // Сохраняем payload в контексте для использования в routes
  c.set('user', payload);
  
  return next();
}

export function requireAdmin(c: Context, next: Next) {
  const user = c.get('user') as { role: 'admin' | 'user' } | undefined;
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  
  return next();
}
