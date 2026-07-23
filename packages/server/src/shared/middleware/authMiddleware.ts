import { Context, Next } from 'hono';
import { AuthService } from '../../features/auth/services/authService';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Аутентификация для маршрутов mail/tasks/user.
 *
 * Раньше здесь была самописная «SimpleJWT», у которой было две проблемы:
 *   1) она вообще не проверяла подпись токена — payload можно было
 *      подделать (дыра в безопасности);
 *   2) payload декодировался через atob(), который не понимает base64url
 *      (символы «-» и «_») настоящих JWT. Из-за этого часть валидных
 *      токенов периодически не парсилась → 401 → пользователя выкидывало
 *      из сессии «на ровном месте».
 *
 * Теперь используем ту же настоящую проверку, что и drive
 * (verifyAccessToken на базе jsonwebtoken). В контекст по-прежнему кладём
 * полную запись пользователя (с полем `id`), т.к. маршруты mail/tasks/user
 * обращаются к `user.id`.
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

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
