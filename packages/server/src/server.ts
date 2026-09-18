import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { config } from './config';
import authRouter, { initializeTestUsers } from './features/auth/routes/authRoutes';
import driveRouter from './features/drive/routes/driveRoutes';
import { mail } from './features/mail/routes/mailRoutes';
import { tasks } from './features/tasks/routes/tasksRoutes';
import { userRouter } from './features/user';

const app = new Hono();

// CORS middleware. Список источников и режим credentials берутся из конфигурации
// (CORS_ORIGINS). По умолчанию поведение прежнее: localhost:8080 / localhost:3000.
app.use('*', cors({
  origin: config.corsOrigins,
  credentials: config.corsCredentials,
}));

// Увеличиваем лимит размера тела запроса для загрузки больших файлов
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'SuperApp Server is running',
    version: '0.1.0'
  });
});

// API Routes
app.get('/api/health', (c) => {
  return c.json({ status: 'healthy' });
});

// Auth routes
app.route('/api/auth', authRouter);

// Drive routes
app.route('/api/drive', driveRouter);

// Mail routes
app.route('/api/mail', mail);

// Tasks routes
app.route('/api/tasks', tasks);

// User routes
app.route('/api/user', userRouter);

// Static files for avatars
app.use('/uploads/*', serveStatic({ root: './' }));

// Log endpoint for debugging
app.post('/api/log', async (c) => {
  const { message } = await c.req.json();
  console.log('[Client Log]', message);
  return c.json({ success: true });
});

// Initialize test users
initializeTestUsers();

// Start server
console.log(`Server starting on ${config.host}:${config.port} (NODE_ENV=${process.env.NODE_ENV || 'development'})...`);

export default {
  port: config.port,
  hostname: config.host,
  fetch: app.fetch,
  // Лимит размера тела запроса (по умолчанию 500MB) для загрузки больших файлов
  maxRequestBodySize: config.maxBodyBytes,
  // Лимит размера ответа (по умолчанию 500MB) для скачивания больших файлов
  maxResponseBodySize: config.maxBodyBytes,
};
