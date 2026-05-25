import { Context, Next } from 'hono';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  if (typeof (cleanupTimer as unknown as { unref?: () => void }).unref === 'function') {
    (cleanupTimer as unknown as { unref?: () => void }).unref!();
  }
}

function getClientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const real = c.req.header('x-real-ip');
  if (real) return real;
  return 'unknown';
}

/**
 * Простой in-memory rate-limiter. Не подходит для распределённого деплоя,
 * но эффективен на одном инстансе (Electron + локальный сервер).
 * Ключ = `prefix:ip` либо `prefix:userId`, если пользователь авторизован.
 */
export function rateLimit(options: RateLimitOptions) {
  ensureCleanup();

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const userObj = c.get('user') as { id?: string } | undefined;
    const id = userObj?.id || ip;
    const key = `${options.keyPrefix || 'rl'}:${id}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header('Retry-After', retryAfterSec.toString());
      return c.json(
        { error: 'Too many requests. Please try again later.' },
        429,
      );
    }

    return next();
  };
}
