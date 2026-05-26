import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../../../shared/utils/jwt';
import bcrypt from 'bcryptjs';
import { or, eq, and, ne } from 'drizzle-orm';

const authRouter = new Hono();

// Schema для регистрации
const registerSchema = z.object({
  // email больше не требуется со стороны клиента — он автогенерируется на
  // сервере из username, чтобы оставаться валидным для маршрутизации почты.
  // Клиент при создании пользователя присылает только username/password/pin
  // и опциональную должность.
  email: z.string().email().optional(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
  role: z.enum(['admin', 'user']).optional().default('user'),
  // Должность работника. Произвольный текст, ничего не валидируем, пусто = ''.
  position: z.string().max(200).optional(),
});

// Schema для логина (принимаем email или username)
const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
});

// Schema для смены пин-кода
const changePinSchema = z.object({
  password: z.string().min(1),
  currentPinCode: z.string().regex(/^\d{4}$/, 'Текущий PIN-код должен состоять из 4 цифр'),
  newPinCode: z.string().regex(/^\d{4}$/, 'Новый PIN-код должен состоять из 4 цифр'),
});

// Регистрация
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, password, pinCode, role, position } = c.req.valid('json');

  // email больше не запрашиваем у клиента — синтезируем из username, чтобы
  // оставить совместимость с маршрутизацией писем (mail/sendEmail ищет
  // получателей по users.email).
  const email = c.req.valid('json').email ?? `${username}@example.com`;

  try {
    const existingUser = await db.select().from(users).where(
      or(
        eq(users.email, email),
        eq(users.username, username)
      )
    ).limit(1);

    if (existingUser.length > 0) {
      return c.json({ error: 'User already exists' }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPinCode = await bcrypt.hash(pinCode, 10);

    const userId = crypto.randomUUID();
    const now = new Date();

    await db.insert(users).values({
      id: userId,
      email,
      username,
      password: hashedPassword,
      pinCode: hashedPinCode,
      role,
      // Не autogenerate: если клиент ничего не прислал, оставляем пустую строку.
      position: position ?? '',
      createdAt: now,
      updatedAt: now,
    });

    const accessToken = generateAccessToken({ userId, email, role });
    const refreshToken = generateRefreshToken(userId);

    return c.json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: { id: userId, email, username, role, position: position ?? '' },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Логин
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, pinCode } = c.req.valid('json');

  console.log('Login attempt:', { email, hasPassword: !!password, hasPinCode: !!pinCode, pinCodeLength: pinCode?.length });

  try {
    // Ищем пользователя по email или username
    const user = await db.select().from(users).where(
      or(
        eq(users.email, email),
        eq(users.username, email)
      )
    ).limit(1);

    if (user.length === 0) {
      console.log('User not found:', email);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    console.log('User found:', { username: user[0].username, hasPinCode: !!user[0].pinCode });

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user[0].password);

    if (!isValidPassword) {
      console.log('Invalid password');
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Проверяем пин-код (если он установлен)
    if (user[0].pinCode) {
      if (!pinCode) {
        console.log('PIN code required but not provided');
        return c.json({ error: 'PIN code required' }, 400);
      }
      const isValidPinCode = await bcrypt.compare(pinCode, user[0].pinCode);
      if (!isValidPinCode) {
        console.log('Invalid PIN code');
        return c.json({ error: 'Invalid PIN code' }, 401);
      }
    }

    console.log('Login successful for:', user[0].username);

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
        role: user[0].role,
        avatarUrl: user[0].avatarUrl,
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
      position: users.position,
      createdAt: users.createdAt,
    }).from(users).execute();

    return c.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Удаление пользователя
authRouter.delete('/users/:userId', async (c) => {
  const { userId } = c.req.param();

  try {
    // Проверяем авторизацию
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Проверяем, что текущий пользователь - администратор
    const currentUser = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (currentUser.length === 0 || currentUser[0].role !== 'admin') {
      return c.json({ error: 'Only administrators can delete users' }, 403);
    }

    // Проверяем, что пользователь не удаляет самого себя
    if (userId === payload.userId) {
      return c.json({ error: 'Cannot delete yourself' }, 400);
    }

    // Удаляем пользователя
    await db.delete(users).where(eq(users.id, userId));

    console.log('[Auth DELETE /users/:userId] User deleted:', userId);

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Обновление роли пользователя
authRouter.put('/users/:userId/role', async (c) => {
  const { userId } = c.req.param();
  const { role } = await c.req.json();

  try {
    // Проверяем авторизацию
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Проверяем, что текущий пользователь - администратор
    const currentUser = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (currentUser.length === 0 || currentUser[0].role !== 'admin') {
      return c.json({ error: 'Only administrators can update user roles' }, 403);
    }

    // Проверяем, что администратор не меняет свою роль
    if (userId === payload.userId) {
      return c.json({ error: 'Cannot change your own role' }, 400);
    }

    // Обновляем роль пользователя
    await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));

    console.log('[Auth PUT /users/:userId/role] Success: role updated');
    return c.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('[Auth PUT /users/:userId/role] Error:', error);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

// Обновление данных пользователя (username, password, pinCode, position)
authRouter.patch('/users/:userId', async (c) => {
  const { userId } = c.req.param();
  const { username, password, pinCode, position } = await c.req.json();

  try {
    // Проверяем авторизацию
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    console.log('[Auth PATCH /users/:userId] Request:', { requestingUserId: payload.userId, targetUserId: userId, hasUsername: !!username, hasPassword: !!password, hasPinCode: !!pinCode });

    // Проверяем, что пользователь существует
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (targetUser.length === 0) {
      console.log('[Auth PATCH /users/:userId] Error: user not found');
      return c.json({ error: 'User not found' }, 404);
    }

    // Проверяем права: только администратор может редактировать других пользователей
    const currentUser = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (currentUser.length === 0 || (currentUser[0].role !== 'admin' && payload.userId !== userId)) {
      console.log('[Auth PATCH /users/:userId] Access denied: not admin and not own account');
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Формируем объект обновления
    const updates: any = { updatedAt: new Date() };

    if (username) {
      // Проверяем, не занято ли новое имя пользователя другим пользователем
      const existingUser = await db.select().from(users).where(
        and(
          eq(users.username, username),
          // @ts-ignore
          ne(users.id, userId)
        )
      ).limit(1);

      if (existingUser.length > 0) {
        console.log('[Auth PATCH /users/:userId] Error: username already exists');
        return c.json({ error: 'Username already exists' }, 400);
      }

      updates.username = username;
      // email больше не перезаписываем автоматически при смене username —
      // он остается прежним, чтобы не потерять привязку к существующей
      // переписке. При необходимости его можно отдельно обновить.
    }

    if (typeof position === 'string') {
      if (position.length > 200) {
        return c.json({ error: 'Position is too long (max 200)' }, 400);
      }
      updates.position = position;
    }

    if (password) {
      if (password.length < 8) {
        console.log('[Auth PATCH /users/:userId] Error: password too short');
        return c.json({ error: 'Password must be at least 8 characters' }, 400);
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    if (pinCode) {
      if (!/^\d{4}$/.test(pinCode)) {
        console.log('[Auth PATCH /users/:userId] Error: invalid pin code');
        return c.json({ error: 'PIN-code must be 4 digits' }, 400);
      }
      updates.pinCode = await bcrypt.hash(pinCode, 10);
    }

    // Обновляем пользователя
    await db.update(users)
      .set(updates)
      .where(eq(users.id, userId));

    console.log('[Auth PATCH /users/:userId] Success: user updated');
    return c.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('[Auth PATCH /users/:userId] Error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
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

// Проверка пин-кода
authRouter.post('/verify-pin', zValidator('json', z.object({
  pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
})), async (c) => {
  const { pinCode } = c.req.valid('json');

  try {
    // Получаем токен из заголовка
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);

    // Проверяем токен и получаем userId
    const payload = verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Ищем пользователя
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Проверяем пин-код
    if (!user[0].pinCode) {
      return c.json({ error: 'PIN-код не установлен' }, 400);
    }

    const isValidPinCode = await bcrypt.compare(pinCode, user[0].pinCode);

    if (!isValidPinCode) {
      return c.json({ error: 'Неверный пин-код' }, 401);
    }

    // Генерируем новые токены
    const accessToken = generateAccessToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role
    });
    const refreshToken = generateRefreshToken(user[0].id);

    return c.json({
      message: 'PIN verified successfully',
      accessToken,
      refreshToken,
      user: {
        id: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role,
        avatarUrl: user[0].avatarUrl,
      },
    });
  } catch (error) {
    console.error('PIN verification error:', error);
    return c.json({ error: 'PIN verification failed' }, 500);
  }
});

// Смена пин-кода
authRouter.post('/change-pin', zValidator('json', changePinSchema), async (c) => {
  const { password, currentPinCode, newPinCode } = c.req.valid('json');

  try {
    // Получаем токен из заголовка
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);

    // Проверяем токен и получаем userId
    const payload = verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Ищем пользователя
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

    if (user.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user[0].password);
    if (!isValidPassword) {
      return c.json({ error: 'Неверный пароль' }, 401);
    }

    // Проверяем текущий пин-код
    if (!user[0].pinCode) {
      return c.json({ error: 'PIN-код не установлен' }, 400);
    }

    const isValidPinCode = await bcrypt.compare(currentPinCode, user[0].pinCode);
    if (!isValidPinCode) {
      return c.json({ error: 'Неверный текущий пин-код' }, 401);
    }

    // Проверяем, что новый пин-код отличается от текущего
    const isSamePin = await bcrypt.compare(newPinCode, user[0].pinCode);
    if (isSamePin) {
      return c.json({ error: 'Новый пин-код должен отличаться от текущего' }, 400);
    }

    // Хешируем новый пин-код
    const hashedNewPinCode = await bcrypt.hash(newPinCode, 10);

    // Обновляем пин-код в базе данных
    await db.update(users)
      .set({ pinCode: hashedNewPinCode, updatedAt: new Date() })
      .where(eq(users.id, user[0].id));

    return c.json({
      message: 'PIN-код успешно изменен',
    });
  } catch (error) {
    console.error('PIN change error:', error);
    return c.json({ error: 'Ошибка при смене пин-кода' }, 500);
  }
});

// Инициализация тестовых пользователей
export const initializeTestUsers = async () => {
  try {
    const existingUsers = await db.select().from(users).execute();

    if (existingUsers.length === 0) {
      // Создаем admin пользователя
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminPinCode = await bcrypt.hash('1234', 10);
      await db.insert(users).values({
        id: 'admin',
        email: 'admin',
        username: 'admin',
        password: adminPassword,
        pinCode: adminPinCode,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).execute();

      // Создаем user пользователя
      const userPassword = await bcrypt.hash('user123', 10);
      const userPinCode = await bcrypt.hash('1234', 10);
      await db.insert(users).values({
        id: 'user',
        email: 'user',
        username: 'user',
        password: userPassword,
        pinCode: userPinCode,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).execute();

      console.log('✅ Test users created:');
      console.log('  Admin: admin / admin123 / PIN: 1234');
      console.log('  User: user / user123 / PIN: 1234');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
};

export default authRouter;
