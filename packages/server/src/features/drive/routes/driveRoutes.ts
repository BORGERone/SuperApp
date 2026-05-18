import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db';
import { files, filePermissions } from '../../../db/schema';
import { authMiddleware } from '../../../shared/middleware/auth';
import { eq, and, inArray } from 'drizzle-orm';

const driveRouter = new Hono();

// Применяем auth middleware ко всем routes
driveRouter.use('*', authMiddleware);

// Schema для создания файла/папки
const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['file', 'directory']),
  path: z.string(),
});

// Schema для обновления прав доступа
const updatePermissionsSchema = z.object({
  allowedUsers: z.array(z.string()),
});

// Получить список пользователей
driveRouter.get('/users', async (c) => {
  try {
    const { users } = await import('../../../db/schema');
    const userList = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
    }).from(users);
    
    return c.json({ users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Получить список файлов в директории
driveRouter.get('/list', async (c) => {
  const user = c.get('user') as any;
  const path = c.req.query('path') || '/';

  try {
    console.log('List files request:', { userId: user.userId, role: user.role, path });

    // Получаем файлы, к которым у пользователя есть доступ
    let fileList;

    if (user.role === 'admin') {
      // Админ видит все файлы в текущей директории
      fileList = await db.select().from(files).where(eq(files.path, path));
      console.log('Admin files:', fileList.length);
    } else {
      // Обычный пользователь видит свои файлы и файлы с правами доступа
      const ownFiles = await db.select().from(files).where(
        and(eq(files.path, path), eq(files.ownerId, user.userId))
      );
      console.log('Own files:', ownFiles.length);

      // Получаем файлы с правами доступа
      const permissions = await db.select({ fileId: filePermissions.fileId })
        .from(filePermissions)
        .where(eq(filePermissions.userId, user.userId));

      console.log('Permissions for user:', permissions);

      const fileIdsWithAccess = permissions.map((p: any) => p.fileId);
      console.log('File IDs with access:', fileIdsWithAccess);

      let sharedFiles: any[] = [];
      if (fileIdsWithAccess.length > 0) {
        sharedFiles = await db.select().from(files).where(
          and(
            eq(files.path, path),
            inArray(files.id, fileIdsWithAccess)
          )
        );
        console.log('Shared files:', sharedFiles.length);
      }

      // Объединяем файлы, удаляя дубликаты
      const fileMap = new Map();
      ownFiles.forEach((file: any) => fileMap.set(file.id, file));
      sharedFiles.forEach((file: any) => fileMap.set(file.id, file));
      fileList = Array.from(fileMap.values());
      console.log('Total files for user:', fileList.length);
    }

    return c.json({ files: fileList });
  } catch (error) {
    console.error('List files error:', error);
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

// Создать папку
driveRouter.post('/create', zValidator('json', createItemSchema), async (c) => {
  const user = c.get('user') as any;
  const { name, type, path } = c.req.valid('json');

  if (type !== 'directory') {
    return c.json({ error: 'Only directories can be created with this endpoint' }, 400);
  }

  try {
    const fileId = crypto.randomUUID();
    const now = new Date();

    await db.insert(files).values({
      id: fileId,
      name,
      type,
      path, // Сохраняем путь к родительской директории
      ownerId: user.userId,
      createdAt: now,
      updatedAt: now,
    });

    return c.json({ message: 'Directory created successfully', id: fileId });
  } catch (error) {
    console.error('Create directory error:', error);
    return c.json({ error: 'Failed to create directory' }, 500);
  }
});

// Загрузить файл
driveRouter.post('/upload', async (c) => {
  const user = c.get('user') as any;
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  console.log('Upload request:', { fileName: file?.name, fileSize: file?.size, path });

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  try {
    const fileId = crypto.randomUUID();
    const now = new Date();

    // Сохраняем файл в файловую систему
    const uploadsDir = './uploads';
    const fs = require('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = `${uploadsDir}/${fileId}-${file.name}`;
    const buffer = await file.arrayBuffer();
    console.log('File buffer size:', buffer.byteLength);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // Создаем запись в базе данных
    await db.insert(files).values({
      id: fileId,
      name: file.name,
      type: 'file',
      path, // Сохраняем путь к родительской директории
      size: file.size,
      ownerId: user.userId,
      createdAt: now,
      updatedAt: now,
    });

    console.log('File uploaded successfully:', { fileId, fileName: file.name });
    return c.json({ message: 'File uploaded successfully', id: fileId });
  } catch (error) {
    console.error('Upload file error:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

// Удалить файл/папку
driveRouter.delete('/delete', async (c) => {
  const user = c.get('user') as any;
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  try {
    // Разделяем путь на родительскую директорию и имя файла
    const parts = filePath.split('/');
    const fileName = parts.pop();
    const parentPath = parts.join('/') || '/';

    if (!fileName) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // Ищем файл по имени и пути к родительской директории
    const file = await db.select().from(files).where(
      and(eq(files.name, fileName), eq(files.path, parentPath))
    ).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (user.role !== 'admin' && file[0].ownerId !== user.userId) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Удаляем файл из файловой системы если это файл
    if (file[0].type === 'file') {
      const fs = require('fs');
      const uploadsDir = './uploads';
      const filePathOnDisk = `${uploadsDir}/${file[0].id}-${file[0].name}`;
      if (fs.existsSync(filePathOnDisk)) {
        fs.unlinkSync(filePathOnDisk);
      }
    }

    await db.delete(files).where(eq(files.id, file[0].id));

    return c.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

// Скачать файл
driveRouter.get('/download', async (c) => {
  const user = c.get('user') as any;
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  try {
    // Разделяем путь на родительскую директорию и имя файла
    const parts = filePath.split('/');
    const fileName = parts.pop();
    const parentPath = parts.join('/') || '/';

    if (!fileName) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // Ищем файл по имени и пути к родительской директории
    const file = await db.select().from(files).where(
      and(eq(files.name, fileName), eq(files.path, parentPath))
    ).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Проверяем права доступа: админ или владелец или пользователь с правами доступа
    if (user.role !== 'admin' && file[0].ownerId !== user.userId) {
      // Проверяем, есть ли у пользователя права доступа к этому файлу
      const permission = await db.select()
        .from(filePermissions)
        .where(
          and(
            eq(filePermissions.fileId, file[0].id),
            eq(filePermissions.userId, user.userId)
          )
        )
        .limit(1);

      if (permission.length === 0) {
        return c.json({ error: 'Permission denied' }, 403);
      }
    }

    if (file[0].type === 'directory') {
      return c.json({ error: 'Directory download not implemented yet' }, 501);
    }

    // Читаем файл из файловой системы
    const fs = require('fs');
    const uploadsDir = './uploads';
    const filePathOnDisk = `${uploadsDir}/${file[0].id}-${file[0].name}`;

    if (!fs.existsSync(filePathOnDisk)) {
      return c.json({ error: 'File not found on disk' }, 404);
    }

    // Используем потоковую передачу для больших файлов
    const fileStream = fs.createReadStream(filePathOnDisk);

    return c.body(fileStream, 200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file[0].name)}"`,
    });
  } catch (error) {
    console.error('Download file error:', error);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

// Скачать файл по ID
driveRouter.get('/files/:id/download', async (c) => {
  const user = c.get('user') as any;
  const fileId = c.req.param('id');

  if (!fileId) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  try {
    // Ищем файл по ID
    const file = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Проверяем права доступа: админ или владелец или пользователь с правами доступа
    if (user.role !== 'admin' && file[0].ownerId !== user.userId) {
      // Проверяем, есть ли у пользователя права доступа к этому файлу
      const permission = await db.select()
        .from(filePermissions)
        .where(
          and(
            eq(filePermissions.fileId, file[0].id),
            eq(filePermissions.userId, user.userId)
          )
        )
        .limit(1);

      if (permission.length === 0) {
        return c.json({ error: 'Permission denied' }, 403);
      }
    }

    if (file[0].type === 'directory') {
      return c.json({ error: 'Directory download not implemented yet' }, 501);
    }

    // Читаем файл из файловой системы
    const fs = require('fs');
    const uploadsDir = './uploads';
    const filePathOnDisk = `${uploadsDir}/${file[0].id}-${file[0].name}`;

    if (!fs.existsSync(filePathOnDisk)) {
      return c.json({ error: 'File not found on disk' }, 404);
    }

    // Используем потоковую передачу для больших файлов
    const fileStream = fs.createReadStream(filePathOnDisk);

    return c.body(fileStream, 200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file[0].name)}"`,
    });
  } catch (error) {
    console.error('Download file by ID error:', error);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

// Получить права доступа к файлу по пути
driveRouter.get('/permissions', async (c) => {
  const filePath = c.req.query('path');

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  try {
    // Разделяем путь на родительскую директорию и имя файла
    const parts = filePath.split('/');
    const fileName = parts.pop();
    const parentPath = parts.join('/') || '/';

    if (!fileName) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // Ищем файл по имени и пути к родительской директории
    const file = await db.select().from(files).where(
      and(eq(files.name, fileName), eq(files.path, parentPath))
    ).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    const permissions = await db
      .select({ userId: filePermissions.userId })
      .from(filePermissions)
      .where(eq(filePermissions.fileId, file[0].id));

    const allowedUsers = permissions.map((p: any) => p.userId);

    return c.json({ allowedUsers });
  } catch (error) {
    console.error('Get permissions error:', error);
    return c.json({ error: 'Failed to get permissions' }, 500);
  }
});

// Получить права доступа к файлу по ID
driveRouter.get('/permissions-by-id', async (c) => {
  const fileId = c.req.query('fileId');

  if (!fileId) {
    return c.json({ error: 'File ID is required' }, 400);
  }

  try {
    // Ищем файл по ID
    const file = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    const permissions = await db
      .select({ userId: filePermissions.userId })
      .from(filePermissions)
      .where(eq(filePermissions.fileId, fileId));

    const allowedUsers = permissions.map((p: any) => p.userId);

    return c.json({ allowedUsers });
  } catch (error) {
    console.error('Get permissions by ID error:', error);
    return c.json({ error: 'Failed to get permissions' }, 500);
  }
});

// Выдать права доступа к файлу для пользователя
driveRouter.post('/grant-access', zValidator('json', z.object({
  fileId: z.string(),
  userId: z.string(),
})), async (c) => {
  const user = c.get('user') as any;
  const { fileId, userId } = c.req.valid('json');

  try {
    // Ищем файл
    const file = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Проверяем, что текущий пользователь имеет право выдавать доступ (владелец или админ)
    if (user.role !== 'admin' && file[0].ownerId !== user.userId) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Проверяем, нет ли уже прав доступа
    const existingPermission = await db.select()
      .from(filePermissions)
      .where(
        and(
          eq(filePermissions.fileId, fileId),
          eq(filePermissions.userId, userId)
        )
      )
      .limit(1);

    if (existingPermission.length > 0) {
      return c.json({ message: 'Permission already exists' });
    }

    // Выдаем права доступа
    await db.insert(filePermissions).values({
      id: crypto.randomUUID(),
      fileId,
      userId,
      createdAt: new Date(),
    });

    return c.json({ message: 'Permission granted successfully' });
  } catch (error) {
    console.error('Grant access error:', error);
    return c.json({ error: 'Failed to grant access' }, 500);
  }
});

// Выдать права доступа к файлам для списка пользователей
driveRouter.post('/grant-access-batch', zValidator('json', z.object({
  fileIds: z.array(z.string()),
  userIds: z.array(z.string()),
})), async (c) => {
  const user = c.get('user') as any;
  const { fileIds, userIds } = c.req.valid('json');

  try {
    console.log('Grant batch access:', { fileIds, userIds, requestingUser: user.userId });

    // Проверяем права для каждого файла
    const fileRecords = await db.select().from(files).where(inArray(files.id, fileIds));

    if (fileRecords.length === 0) {
      return c.json({ error: 'No files found' }, 404);
    }

    // Проверяем, что текущий пользователь имеет право выдавать доступ для каждого файла
    for (const file of fileRecords) {
      if (user.role !== 'admin' && file.ownerId !== user.userId) {
        return c.json({ error: `Permission denied for file: ${file.name}` }, 403);
      }
    }

    // Выдаем права доступа для каждого файла и каждого пользователя
    let grantedCount = 0;
    for (const fileId of fileIds) {
      for (const userId of userIds) {
        // Проверяем, нет ли уже прав доступа
        const existingPermission = await db.select()
          .from(filePermissions)
          .where(
            and(
              eq(filePermissions.fileId, fileId),
              eq(filePermissions.userId, userId)
            )
          )
          .limit(1);

        if (existingPermission.length === 0) {
          await db.insert(filePermissions).values({
            id: crypto.randomUUID(),
            fileId,
            userId,
            createdAt: new Date(),
          });
          grantedCount++;
        }
      }
    }

    console.log('Batch access granted:', grantedCount);
    return c.json({ message: `Permissions granted successfully`, count: grantedCount });
  } catch (error) {
    console.error('Grant batch access error:', error);
    return c.json({ error: 'Failed to grant batch access' }, 500);
  }
});

// Установить права доступа к файлу
driveRouter.put('/permissions', zValidator('json', updatePermissionsSchema), async (c) => {
  const user = c.get('user') as any;
  const filePath = c.req.query('path');
  const { allowedUsers } = c.req.valid('json');

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400);
  }

  try {
    // Разделяем путь на родительскую директорию и имя файла
    const parts = filePath.split('/');
    const fileName = parts.pop();
    const parentPath = parts.join('/') || '/';

    if (!fileName) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // Ищем файл по имени и пути к родительской директории
    const file = await db.select().from(files).where(
      and(eq(files.name, fileName), eq(files.path, parentPath))
    ).limit(1);

    if (file.length === 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    if (user.role !== 'admin' && file[0].ownerId !== user.userId) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    // Удаляем старые права
    await db.delete(filePermissions).where(eq(filePermissions.fileId, file[0].id));

    // Добавляем новые права
    for (const userId of allowedUsers) {
      await db.insert(filePermissions).values({
        id: crypto.randomUUID(),
        fileId: file[0].id,
        userId,
        createdAt: new Date(),
      });
    }

    return c.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Update permissions error:', error);
    return c.json({ error: 'Failed to update permissions' }, 500);
  }
});

export default driveRouter;
