import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export class AuthService {
  // Инициализация пользователей для тестирования
  static async initializeUsers() {
    try {
      // Проверяем есть ли уже пользователи
      const existingUsers = await db.select().from(users).execute();
      
      if (existingUsers.length === 0) {
        // Создаем admin пользователя
        const adminPassword = await bcrypt.hash('admin123', 10);
        await db.insert(users).values({
          id: 'admin',
          email: 'admin@superapp.com',
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
          email: 'user@superapp.com',
          username: 'user',
          password: userPassword,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).execute();

        console.log('✅ Test users created:');
        console.log('  Admin: admin@superapp.com / admin123');
        console.log('  User: user@superapp.com / user123');
      }
    } catch (error) {
      console.error('Error initializing users:', error);
    }
  }

  // Аутентификация пользователя
  static async authenticate(email: string, password: string) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute();

    if (!user.length) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user[0].password);
    if (!isValidPassword) {
      return null;
    }

    return user[0];
  }

  // Получение пользователя по ID
  static async getUserById(id: string) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .execute();

    return user[0] || null;
  }
}
