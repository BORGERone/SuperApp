import { Context, Next } from 'hono';
import { AuthService } from '../../features/auth/services/authService';

// Простая JWT реализация для демонстрации
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

class SimpleJWT {
  private static SECRET = 'your-secret-key-change-in-production';

  static generate(payload: Partial<JWTPayload>): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JWTPayload = {
      userId: payload.userId || '',
      email: payload.email || '',
      role: payload.role || 'user',
      iat: now,
      exp: now + (60 * 60 * 24), // 24 часа
    };

    // Создаем настоящий JWT токен
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(tokenPayload));
    
    // Для простоты используем фиксированную подпись (в реальном приложении нужен секрет)
    const signature = btoa('signature');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  static verify(token: string): JWTPayload | null {
    try {
      // Разделяем JWT токен на части
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Декодируем payload (вторая часть)
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = SimpleJWT.verify(token);

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const user = await AuthService.getUserById(payload.userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Добавляем пользователя в контекст
  c.set('user', user);
  await next();
};

export { SimpleJWT };
