import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { generateAccessToken, generateRefreshToken } from '../../../shared/utils/jwt';
import bcrypt from 'bcryptjs';
import { or, eq } from 'drizzle-orm';

const authRouter = new Hono();

// Schema для регистрации
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).optional().default('user'),
});

// Schema для логина (принимаем email или username)
const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

// Регистрация
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, username, password, role } = c.req.valid('json');
  
  try {
    // Проверяем, существует ли пользователь
    const existingUser = await db.select().from(users).where(
      // @ts-ignore
      users.email === email || users.username === username
    ).limit(1);
    
    if (existingUser.length > 0) {
      return c.json({ error: 'User already exists' }, 400);
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const userId = crypto.randomUUID();
    const now = new Date();
    
    await db.insert(users).values({
      id: userId,
      email,
      username,
      password: hashedPassword,
      role,
      createdAt: now,
      updatedAt: now,
    });
    
    // Генерируем токены
    const accessToken = generateAccessToken({ userId, email, role });
    const refreshToken = generateRefreshToken(userId);
    
    return c.json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: { id: userId, email, username, role },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Логин
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  
  try {
    // Ищем пользователя по email или username
    const user = await db.select().from(users).where(
      or(
        eq(users.email, email),
        eq(users.username, email)
      )
    ).limit(1);
    
    if (user.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user[0].password);
    
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Генерируем токены
    const accessToken = generateAccessToken({ 
      userId: user[0].id, 
      email: user[0].email, 
      role: user[0].role 
    });
    const refreshToken = generateRefreshToken(user[0].id);
    
    return c.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { 
        id: user[0].id, 
        email: user[0].email, 
        username: user[0].username, 
        role: user[0].role 
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Получение списка пользователей
authRouter.get('/users', async (c) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    }).from(users).execute();
    
    console.log('[Auth /users] Returning users:', JSON.stringify(allUsers, null, 2));
    
    return c.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Обновление токена
authRouter.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();
  
  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }
  
  // TODO: Реализовать проверку refresh token и генерацию нового access token
  return c.json({ error: 'Not implemented' }, 501);
});

// Инициализация тестовых пользователей
export const initializeTestUsers = async () => {
  try {
    const existingUsers = await db.select().from(users).execute();
    
    if (existingUsers.length === 0) {
      // Создаем admin пользователя
      const adminPassword = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        id: 'admin',
        email: 'admin',
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).execute();

      // Создаем user пользователя
      const userPassword = await bcrypt.hash('user123', 10);
      await db.insert(users).values({
        id: 'user',
        email: 'user',
        username: 'user',
        password: userPassword,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).execute();

      console.log('✅ Test users created:');
      console.log('  Admin: admin / admin123');
      console.log('  User: user / user123');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
};

export default authRouter;
