import jwt, { JsonWebTokenError, SignOptions, TokenExpiredError } from 'jsonwebtoken';

// Секрет берётся ТОЛЬКО из окружения. Никаких fallback-значений —
// иначе любой, у кого есть исходник, генерирует валидные токены.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // В dev можно использовать любой секрет, но он обязан существовать
  // и быть достаточно длинным, чтобы не путать с дефолтом.
  throw new Error(
    'JWT_SECRET environment variable is required (>= 32 chars). ' +
      'Set it in your environment / .env before starting the server.',
  );
}

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

export interface RefreshPayload {
  userId: string;
  type: 'refresh';
}

// jsonwebtoken в свежих @types сужает expiresIn до StringValue, поэтому
// приводим свои опции к SignOptions через unknown.
const accessTokenOptions = { expiresIn: ACCESS_TOKEN_EXPIRY } as unknown as SignOptions;
const refreshTokenOptions = { expiresIn: REFRESH_TOKEN_EXPIRY } as unknown as SignOptions;

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, accessTokenOptions);
}

export function generateRefreshToken(userId: string): string {
  const payload: RefreshPayload = { userId, type: 'refresh' };
  return jwt.sign(payload, JWT_SECRET as string, refreshTokenOptions);
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as TokenPayload & { type?: string };
    // Не принимаем refresh-токены там, где ожидается access-токен
    if ((decoded as { type?: string }).type === 'refresh') return null;
    return {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      return null;
    }
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as RefreshPayload;
    if (decoded.type !== 'refresh' || !decoded.userId) return null;
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      return null;
    }
    return null;
  }
}
