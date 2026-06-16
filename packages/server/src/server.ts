import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import authRouter, { initializeTestUsers } from './features/auth/routes/authRoutes';
import driveRouter from './features/drive/routes/driveRoutes';
import { mail } from './features/mail/routes/mailRoutes';
import { tasks } from './features/tasks/routes/tasksRoutes';
import { userRouter } from './features/user';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
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
const port = parseInt(process.env.PORT || '3002');
console.log(`Server starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
  // Увеличиваем лимит размера тела запроса до 500MB для загрузки больших файлов
  maxRequestBodySize: 500 * 1024 * 1024,
  // Увеличиваем лимит размера ответа до 500MB для скачивания больших файлов
  maxResponseBodySize: 500 * 1024 * 1024,
};
