import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import authRouter, { initializeTestUsers } from './features/auth/routes/authRoutes';
import driveRouter from './features/drive/routes/driveRoutes';
import { mail } from './features/mail/routes/mailRoutes';
import { tasks } from './features/tasks/routes/tasksRoutes';
import { userRouter } from './features/user';

const app = new Hono();

// ===== CORS =====
//
// По умолчанию разрешён только локальный клиент (Electron-окно ходит на
// http://localhost:8080/3000). Список origin'ов можно расширить переменной
// окружения CORS_ORIGINS (запятая-разделённый список).
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

// ===== Security headers =====
//
// Базовый набор защитных заголовков. Для Electron-клиента жёсткая CSP допустима,
// так как все запросы идут на собственный сервер по фиксированному origin.
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Cross-Origin-Resource-Policy', 'same-site');
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  );
  await next();
});

// Аттачменты и аватары отдаём как attachment + nosniff, чтобы браузер не
// рендерил их в исходном origin'е сервера (защита от stored XSS через
// загрузки HTML/SVG).
app.use('/uploads/*', async (c, next) => {
  await next();
  c.header('Content-Disposition', 'attachment');
  c.header('X-Content-Type-Options', 'nosniff');
});

// ===== Health check =====
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'SuperApp Server is running',
    version: '0.1.0',
  });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'healthy' });
});

// ===== Routes =====
app.route('/api/auth', authRouter);
app.route('/api/drive', driveRouter);
app.route('/api/mail', mail);
app.route('/api/tasks', tasks);
app.route('/api/user', userRouter);

// Static files for avatars/attachments
app.use('/uploads/*', serveStatic({ root: './' }));

// Initialize test users (только при наличии переменных SEED_*)
initializeTestUsers();

// ===== Server bootstrap =====
const port = parseInt(process.env.PORT || '3002');

// Лимиты на размер запроса/ответа. По умолчанию 50 МБ — достаточно для
// почтовых вложений; можно переопределить через окружение, например для
// больших файлов в Drive.
const MAX_REQUEST_BODY_SIZE = parseInt(
  process.env.MAX_REQUEST_BODY_SIZE || `${50 * 1024 * 1024}`,
);
const MAX_RESPONSE_BODY_SIZE = parseInt(
  process.env.MAX_RESPONSE_BODY_SIZE || `${100 * 1024 * 1024}`,
);

console.log(`Server starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
  maxRequestBodySize: MAX_REQUEST_BODY_SIZE,
  maxResponseBodySize: MAX_RESPONSE_BODY_SIZE,
};
