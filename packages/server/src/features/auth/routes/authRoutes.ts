import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../../shared/utils/jwt';
import { authMiddleware, requireAdmin, AuthUser } from '../../../shared/middleware/auth';
import { rateLimit } from '../../../shared/middleware/rateLimit';
import bcrypt from 'bcryptjs';
import { or, eq, and, ne } from 'drizzle-orm';

const authRouter = new Hono();

// ===== Схемы валидации =====

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
});

const changePinSchema = z.object({
  password: z.string().min(1),
  currentPinCode: z.string().regex(/^\d{4}$/, 'Текущий PIN-код должен состоять из 4 цифр'),
  newPinCode: z.string().regex(/^\d{4}$/, 'Новый PIN-код должен состоять из 4 цифр'),
});

const updateUserSchema = z
  .object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр').optional(),
    currentPassword: z.string().min(1).optional(),
  })
  .refine((data) => data.username || data.email || data.password || data.pinCode, {
    message: 'Не указано ни одно поле для обновления',
  });

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ===== Регистрация =====
//
// Самостоятельная регистрация всегда создаёт пользователя с ролью 'user'.
// Назначить роль 'admin' можно только через PUT /users/:userId/role
// действующим администратором.
authRouter.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'register' }),
  zValidator('json', registerSchema),
  async (c) => {
    const { email, username, password, pinCode } = c.req.valid('json');

    try {
      const existingUser = await db
        .select()
        .from(users)
        .where(or(eq(users.email, email), eq(users.username, username)))
        .limit(1);

      if (existingUser.length > 0) {
        return c.json({ error: 'User already exists' }, 400);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedPinCode = await bcrypt.hash(pinCode, 10);
      const userId = crypto.randomUUID();
      const now = new Date();
      const role: 'user' = 'user';

      await db.insert(users).values({
        id: userId,
        email,
        username,
        password: hashedPassword,
        pinCode: hashedPinCode,
        role,
        createdAt: now,
        updatedAt: now,
      });

      const accessToken = generateAccessToken({ userId, email, username, role });
      const refreshToken = generateRefreshToken(userId);

      return c.json({
        message: 'User registered successfully',
        accessToken,
        refreshToken,
        user: { id: userId, email, username, role },
      });
    } catch (error) {
      console.error('[Auth /register] Error');
      return c.json({ error: 'Registration failed' }, 500);
    }
  },
);

// ===== Логин =====
authRouter.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'login' }),
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password, pinCode } = c.req.valid('json');

    try {
      const user = await db
        .select()
        .from(users)
        .where(or(eq(users.email, email), eq(users.username, email)))
        .limit(1);

      if (user.length === 0) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      const isValidPassword = await bcrypt.compare(password, user[0].password);
      if (!isValidPassword) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      if (user[0].pinCode) {
        if (!pinCode) {
          return c.json({ error: 'PIN code required' }, 400);
        }
        const isValidPinCode = await bcrypt.compare(pinCode, user[0].pinCode);
        if (!isValidPinCode) {
          return c.json({ error: 'Invalid credentials' }, 401);
        }
      }

      const accessToken = generateAccessToken({
        userId: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role,
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
      console.error('[Auth /login] Error');
      return c.json({ error: 'Login failed' }, 500);
    }
  },
);

// ===== Список пользователей (для автокомплита получателей и админ-панели) =====
//
// Эндпоинт закрыт авторизацией. Чувствительные поля (email, createdAt) выдаются
// только администраторам; обычным пользователям возвращаются только публичные
// поля, необходимые для UI (id, username, avatarUrl, role).
authRouter.get('/users', authMiddleware, async (c) => {
  try {
    const currentUser = c.get('user') as AuthUser;
    const isAdmin = currentUser.role === 'admin';

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .execute();

    const publicRows = isAdmin
      ? rows
      : rows.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email, // email нужен модулю mail для поиска получателя
          role: u.role,
          avatarUrl: u.avatarUrl,
        }));

    return c.json({ users: publicRows });
  } catch (error) {
    console.error('[Auth /users] Error');
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// ===== Удаление пользователя (admin only) =====
authRouter.delete('/users/:userId', authMiddleware, requireAdmin, async (c) => {
  const { userId } = c.req.param();
  const currentUser = c.get('user') as AuthUser;

  try {
    if (userId === currentUser.id) {
      return c.json({ error: 'Cannot delete yourself' }, 400);
    }

    await db.delete(users).where(eq(users.id, userId));

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Auth DELETE /users/:userId] Error');
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ===== Изменение роли (admin only) =====
authRouter.put(
  '/users/:userId/role',
  authMiddleware,
  requireAdmin,
  zValidator('json', updateRoleSchema),
  async (c) => {
    const { userId } = c.req.param();
    const { role } = c.req.valid('json');
    const currentUser = c.get('user') as AuthUser;

    try {
      if (userId === currentUser.id) {
        return c.json({ error: 'Cannot change your own role' }, 400);
      }

      await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));

      return c.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('[Auth PUT /users/:userId/role] Error');
      return c.json({ error: 'Failed to update user role' }, 500);
    }
  },
);

// ===== Обновление данных пользователя =====
//
// Изменения собственных полей (username/email/password/pinCode) разрешены
// владельцу аккаунта только при подтверждении текущим паролем
// (currentPassword). Администраторы могут изменять данные любых пользователей
// без подтверждения текущим паролем.
authRouter.patch(
  '/users/:userId',
  authMiddleware,
  zValidator('json', updateUserSchema),
  async (c) => {
    const { userId } = c.req.param();
    const { username, email, password, pinCode, currentPassword } = c.req.valid('json');
    const currentUser = c.get('user') as AuthUser;

    try {
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (targetUser.length === 0) {
        return c.json({ error: 'User not found' }, 404);
      }

      const isAdmin = currentUser.role === 'admin';
      const isSelf = currentUser.id === userId;

      if (!isAdmin && !isSelf) {
        return c.json({ error: 'Permission denied' }, 403);
      }

      // Для смены пароля/PIN самим себе нужен текущий пароль.
      if (isSelf && (password || pinCode)) {
        if (!currentPassword) {
          return c.json({ error: 'Current password is required' }, 400);
        }
        const ok = await bcrypt.compare(currentPassword, targetUser[0].password);
        if (!ok) {
          return c.json({ error: 'Current password is incorrect' }, 401);
        }
      }

      const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

      if (username) {
        const existingUser = await db
          .select()
          .from(users)
          .where(and(eq(users.username, username), ne(users.id, userId)))
          .limit(1);
        if (existingUser.length > 0) {
          return c.json({ error: 'Username already exists' }, 400);
        }
        updates.username = username;
      }

      if (email) {
        const existingEmail = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, userId)))
          .limit(1);
        if (existingEmail.length > 0) {
          return c.json({ error: 'Email already exists' }, 400);
        }
        updates.email = email;
      }

      if (password) {
        updates.password = await bcrypt.hash(password, 10);
      }

      if (pinCode) {
        updates.pinCode = await bcrypt.hash(pinCode, 10);
      }

      await db.update(users).set(updates).where(eq(users.id, userId));

      return c.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('[Auth PATCH /users/:userId] Error');
      return c.json({ error: 'Failed to update user' }, 500);
    }
  },
);

// ===== Обновление токена =====
authRouter.post(
  '/refresh',
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'refresh' }),
  zValidator('json', refreshSchema),
  async (c) => {
    const { refreshToken } = c.req.valid('json');

    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return c.json({ error: 'Invalid or expired refresh token' }, 401);
      }

      const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      if (user.length === 0) {
        return c.json({ error: 'User not found' }, 401);
      }

      const accessToken = generateAccessToken({
        userId: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role,
      });
      const newRefreshToken = generateRefreshToken(user[0].id);

      return c.json({
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user[0].id,
          email: user[0].email,
          username: user[0].username,
          role: user[0].role,
          avatarUrl: user[0].avatarUrl,
        },
      });
    } catch (error) {
      console.error('[Auth /refresh] Error');
      return c.json({ error: 'Failed to refresh token' }, 500);
    }
  },
);

// ===== Проверка пин-кода =====
authRouter.post(
  '/verify-pin',
  authMiddleware,
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'verify-pin' }),
  zValidator(
    'json',
    z.object({
      pinCode: z.string().regex(/^\d{4}$/, 'PIN-код должен состоять из 4 цифр'),
    }),
  ),
  async (c) => {
    const { pinCode } = c.req.valid('json');
    const currentUser = c.get('user') as AuthUser;

    try {
      const user = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
      if (user.length === 0) {
        return c.json({ error: 'User not found' }, 404);
      }

      if (!user[0].pinCode) {
        return c.json({ error: 'PIN-код не установлен' }, 400);
      }

      const isValidPinCode = await bcrypt.compare(pinCode, user[0].pinCode);
      if (!isValidPinCode) {
        return c.json({ error: 'Неверный пин-код' }, 401);
      }

      const accessToken = generateAccessToken({
        userId: user[0].id,
        email: user[0].email,
        username: user[0].username,
        role: user[0].role,
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
      console.error('[Auth /verify-pin] Error');
      return c.json({ error: 'PIN verification failed' }, 500);
    }
  },
);

// ===== Смена пин-кода =====
authRouter.post(
  '/change-pin',
  authMiddleware,
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'change-pin' }),
  zValidator('json', changePinSchema),
  async (c) => {
    const { password, currentPinCode, newPinCode } = c.req.valid('json');
    const currentUser = c.get('user') as AuthUser;

    try {
      const user = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
      if (user.length === 0) {
        return c.json({ error: 'User not found' }, 404);
      }

      const isValidPassword = await bcrypt.compare(password, user[0].password);
      if (!isValidPassword) {
        return c.json({ error: 'Неверный пароль' }, 401);
      }

      if (!user[0].pinCode) {
        return c.json({ error: 'PIN-код не установлен' }, 400);
      }

      const isValidPinCode = await bcrypt.compare(currentPinCode, user[0].pinCode);
      if (!isValidPinCode) {
        return c.json({ error: 'Неверный текущий пин-код' }, 401);
      }

      const isSamePin = await bcrypt.compare(newPinCode, user[0].pinCode);
      if (isSamePin) {
        return c.json({ error: 'Новый пин-код должен отличаться от текущего' }, 400);
      }

      const hashedNewPinCode = await bcrypt.hash(newPinCode, 10);
      await db
        .update(users)
        .set({ pinCode: hashedNewPinCode, updatedAt: new Date() })
        .where(eq(users.id, user[0].id));

      return c.json({ message: 'PIN-код успешно изменен' });
    } catch (error) {
      console.error('[Auth /change-pin] Error');
      return c.json({ error: 'Ошибка при смене пин-кода' }, 500);
    }
  },
);

// ===== Инициализация тестовых пользователей =====
//
// Создаёт `admin` и `user` ТОЛЬКО при первом запуске с пустой БД и только
// в режиме разработки (NODE_ENV !== 'production') или если явно разрешено
// флагом SEED_TEST_USERS=true. В продакшене дефолтные креденшалы не создаются.
export const initializeTestUsers = async () => {
  const allowSeed =
    process.env.SEED_TEST_USERS === 'true' || process.env.NODE_ENV !== 'production';
  if (!allowSeed) return;

  try {
    const existingUsers = await db.select().from(users).execute();
    if (existingUsers.length > 0) return;

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const userPassword = process.env.SEED_USER_PASSWORD;
    const adminPin = process.env.SEED_ADMIN_PIN;
    const userPin = process.env.SEED_USER_PIN;

    if (!adminPassword || !userPassword || !adminPin || !userPin) {
      console.log(
        '[Auth init] Skipping seed: set SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD / SEED_ADMIN_PIN / SEED_USER_PIN to seed initial users.',
      );
      return;
    }

    const now = new Date();
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: 'admin',
      username: 'admin',
      password: await bcrypt.hash(adminPassword, 10),
      pinCode: await bcrypt.hash(adminPin, 10),
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: 'user',
      username: 'user',
      password: await bcrypt.hash(userPassword, 10),
      pinCode: await bcrypt.hash(userPin, 10),
      role: 'user',
      createdAt: now,
      updatedAt: now,
    });

    console.log('[Auth init] Seeded admin and user accounts from environment variables.');
  } catch (error) {
    console.error('[Auth init] Error seeding users');
  }
};

export default authRouter;
