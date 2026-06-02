import jwt from 'jsonwebtoken';

// Секрет берём строго из окружения. Дефолт оставлен только для локальной
// разработки, чтобы приложение запускалось «из коробки», но при его
// использовании печатаем явное предупреждение — в проде JWT_SECRET обязан
// быть задан, иначе токены можно подделать общеизвестным ключом.
const JWT_SECRET = process.env.JWT_SECRET || 'superapp-secret-key';
if (!process.env.JWT_SECRET) {
  console.warn(
    '[auth] JWT_SECRET не задан в окружении — используется небезопасное значение по умолчанию. ' +
    'Обязательно задайте переменную окружения JWT_SECRET в production.',
  );
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
}
