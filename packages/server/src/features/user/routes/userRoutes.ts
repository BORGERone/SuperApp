import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../../../shared/middleware/auth';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const user = new Hono();

// ===== Схемы =====

const updateProfileSchema = z
  .object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.username || d.email, { message: 'Не указано ни одно поле для обновления' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

// ===== Профиль =====
user.get('/profile', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as AuthUser;
    const userProfile = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (!userProfile.length) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(userProfile[0]);
  } catch (error) {
    console.error('[User /profile GET] Error');
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

user.put('/profile', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
  try {
    const userObj = c.get('user') as AuthUser;
    const { username, email } = c.req.valid('json');

    if (email) {
      const existing = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userObj.id)))
        .limit(1);
      if (existing.length) return c.json({ error: 'Email already in use' }, 400);
    }
    if (username) {
      const existing = await db
        .select()
        .from(users)
        .where(and(eq(users.username, username), ne(users.id, userObj.id)))
        .limit(1);
      if (existing.length) return c.json({ error: 'Username already in use' }, 400);
    }

    const updateData: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    await db.update(users).set(updateData).where(eq(users.id, userObj.id));

    const updatedProfile = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    return c.json(updatedProfile[0]);
  } catch (error) {
    console.error('[User /profile PUT] Error');
    return c.json({ error: 'Failed to update user profile' }, 500);
  }
});

// ===== Аватары =====

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

// Магические байты для проверки реального типа файла (а не client-supplied
// MIME). Защищает от загрузки .html/.svg/.exe под видом изображения.
function detectImageMimeFromMagic(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) {
    return 'image/gif';
  }
  return null;
}

function mimeToExt(mime: string): string | null {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return null;
  }
}

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const avatarsDir = path.join(uploadsRoot, 'avatars');

user.post('/avatar', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as AuthUser;
    const formData = await c.req.formData();
    const avatar = formData.get('avatar');

    if (!avatar || !(avatar instanceof File)) {
      return c.json({ error: 'No avatar file provided' }, 400);
    }
    if (avatar.size > AVATAR_MAX_BYTES) {
      return c.json({ error: 'File size must be less than 5 MB' }, 400);
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(avatar.type)) {
      return c.json({ error: 'Allowed image types: png, jpeg, webp, gif' }, 400);
    }

    const buffer = Buffer.from(await avatar.arrayBuffer());
    const detected = detectImageMimeFromMagic(buffer);
    if (!detected) {
      return c.json({ error: 'File content is not a supported image' }, 400);
    }
    const ext = mimeToExt(detected)!;
    if (!ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
      return c.json({ error: 'Allowed image types: png, jpeg, webp, gif' }, 400);
    }

    if (!existsSync(avatarsDir)) {
      mkdirSync(avatarsDir, { recursive: true });
    }
    const fileName = `${userObj.id}.${ext}`;
    const filePath = path.join(avatarsDir, fileName);
    // path.join + детерминированное имя по userId исключают traversal —
    // userId это UUID/значение из БД, без слешей; для надёжности убедимся,
    // что итоговый путь лежит внутри avatarsDir.
    if (!filePath.startsWith(avatarsDir + path.sep)) {
      return c.json({ error: 'Invalid file path' }, 400);
    }

    // Удаляем прежние аватары других расширений, чтобы не оставлять "мусор"
    // от старых форматов.
    for (const oldExt of ALLOWED_AVATAR_EXTENSIONS) {
      if (oldExt === ext) continue;
      const old = path.join(avatarsDir, `${userObj.id}.${oldExt}`);
      if (existsSync(old)) {
        try {
          await fs.unlink(old);
        } catch {
          // ignore
        }
      }
    }

    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;
    await db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    const updatedProfile = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    return c.json(updatedProfile[0]);
  } catch (error) {
    console.error('[User /avatar POST] Error');
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

user.delete('/avatar', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as AuthUser;
    const currentUser = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (currentUser.length && currentUser[0].avatarUrl) {
      // Аватар URL имеет вид "/uploads/avatars/<userId>.<ext>"; имя файла
      // берём из БД и проверяем, что итоговый путь лежит в avatarsDir.
      const rel = currentUser[0].avatarUrl.replace(/^\/+/, '');
      const candidate = path.resolve(process.cwd(), rel);
      if (candidate.startsWith(avatarsDir + path.sep) && existsSync(candidate)) {
        try {
          await fs.unlink(candidate);
        } catch {
          // ignore filesystem races
        }
      }
    }

    await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    return c.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('[User /avatar DELETE] Error');
    return c.json({ error: 'Failed to delete avatar' }, 500);
  }
});

// ===== Пароль =====
user.put('/password', authMiddleware, zValidator('json', changePasswordSchema), async (c) => {
  try {
    const userObj = c.get('user') as AuthUser;
    const { currentPassword, newPassword } = c.req.valid('json');

    const currentUser = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (!currentUser.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    const ok = await bcrypt.compare(currentPassword, currentUser[0].password);
    if (!ok) {
      return c.json({ error: 'Current password is incorrect' }, 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[User /password PUT] Error');
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

export default user;
