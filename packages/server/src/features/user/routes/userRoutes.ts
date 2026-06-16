import { Hono } from 'hono';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

const user = new Hono();

// Получение профиля пользователя
user.get('/profile', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as { id: string };
    
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
    console.error('Error getting user profile:', error);
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

// Обновление профиля пользователя
user.put('/profile', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as { id: string };
    const { username, email } = await c.req.json();

    // Проверка на существование email у другого пользователя
    if (email) {
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail.length && existingEmail[0].id !== userObj.id) {
        return c.json({ error: 'Email already in use' }, 400);
      }
    }

    // Проверка на существование username у другого пользователя
    if (username) {
      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername.length && existingUsername[0].id !== userObj.id) {
        return c.json({ error: 'Username already in use' }, 400);
      }
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    updateData.updatedAt = new Date();

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userObj.id));

    // Возвращаем обновленный профиль
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
    console.error('Error updating user profile:', error);
    return c.json({ error: 'Failed to update user profile' }, 500);
  }
});

// Загрузка аватарки
user.post('/avatar', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as { id: string };
    const formData = await c.req.formData();
    const avatar = formData.get('avatar') as File;

    console.log('[Avatar Upload] User ID:', userObj.id);
    console.log('[Avatar Upload] Avatar file:', avatar);
    console.log('[Avatar Upload] Avatar name:', avatar?.name);
    console.log('[Avatar Upload] Avatar type:', avatar?.type);
    console.log('[Avatar Upload] Avatar size:', avatar?.size);

    if (!avatar) {
      console.log('[Avatar Upload] ERROR: No avatar file provided');
      return c.json({ error: 'No avatar file provided' }, 400);
    }

    // Проверка типа файла
    if (!avatar.type.startsWith('image/')) {
      console.log('[Avatar Upload] ERROR: File must be an image, got:', avatar.type);
      return c.json({ error: 'File must be an image' }, 400);
    }

    // Проверка размера файла (5 МБ)
    if (avatar.size > 5 * 1024 * 1024) {
      console.log('[Avatar Upload] ERROR: File size too large:', avatar.size);
      return c.json({ error: 'File size must be less than 5 MB' }, 400);
    }

    // Сохранение файла
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../../../uploads/avatars');
    
    console.log('[Avatar Upload] Uploads directory:', uploadsDir);
    
    // Создание папки для аватарок, если не существует
    if (!fs.existsSync(uploadsDir)) {
      console.log('[Avatar Upload] Creating uploads directory');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExtension = avatar.name.split('.').pop();
    const fileName = `${userObj.id}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    console.log('[Avatar Upload] File extension:', fileExtension);
    console.log('[Avatar Upload] File name:', fileName);
    console.log('[Avatar Upload] File path:', filePath);

    const arrayBuffer = await avatar.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('[Avatar Upload] Buffer size:', buffer.length);
    fs.writeFileSync(filePath, buffer);
    
    console.log('[Avatar Upload] File written successfully');

    const avatarUrl = `/uploads/avatars/${fileName}`;
    console.log('[Avatar Upload] Avatar URL:', avatarUrl);

    // Обновление пользователя
    await db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    console.log('[Avatar Upload] Database updated');

    // Возвращаем обновленный профиль
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

    console.log('[Avatar Upload] Returning updated profile');
    return c.json(updatedProfile[0]);
  } catch (error) {
    console.error('[Avatar Upload] Error:', error);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

// Удаление аватарки
user.delete('/avatar', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as { id: string };
    const fs = require('fs');
    const path = require('path');

    // Получение текущего аватара
    const currentUser = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (currentUser.length && currentUser[0].avatarUrl) {
      // Удаление файла
      const filePath = path.join(__dirname, '../../../../', currentUser[0].avatarUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Обновление пользователя
    await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    return c.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return c.json({ error: 'Failed to delete avatar' }, 500);
  }
});

// Изменение пароля
user.put('/password', authMiddleware, async (c) => {
  try {
    const userObj = c.get('user') as { id: string };
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters' }, 400);
    }

    // Получение текущего пароля пользователя
    const currentUser = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (!currentUser.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Проверка текущего пароля
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser[0].password);

    if (!isPasswordValid) {
      return c.json({ error: 'Current password is incorrect' }, 400);
    }

    // Хеширование нового пароля
    const hashedPassword = await hash(newPassword, 10);

    // Обновление пароля
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userObj.id));

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

export default user;
