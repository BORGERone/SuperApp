import { Hono } from 'hono';
import { z } from 'zod';
import archiver from 'archiver';
import { db } from '../../../db';
import { emails, users, emailAttachments, files } from '../../../db/schema';
import { eq, and, desc, like, inArray, or } from 'drizzle-orm';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

// @ts-ignore
const Archiver = archiver;

const mail = new Hono();

// Middleware для логирования всех запросов к mail routes
mail.use('*', async (c, next) => {
  console.log('[Mail Routes] Request:', c.req.method, c.req.path);
  console.log('[Mail Routes] URL:', c.req.url);
  await next();
});

// Схемы валидации
const sendEmailSchema = z.object({
  to: z.array(z.string().min(1)),
  cc: z.array(z.string().min(1)).optional(),
  bcc: z.array(z.string().min(1)).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachmentIds: z.array(z.string()).optional(), // ID загруженных вложений
});

const updateEmailSchema = z.object({
  folder: z.enum(['inbox', 'sent', 'drafts', 'trash', 'spam']).optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
});

// Получение списка писем
mail.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const folder = c.req.query('folder') as string || 'inbox';
    const search = c.req.query('search') as string || '';
    const isUnreadOnly = c.req.query('isUnreadOnly') === 'true';
    const isStarredOnly = c.req.query('isStarredOnly') === 'true';

    // Логируем запрос в файл
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'GET_EMAILS',
      userId: user.id,
      params: { folder, search, isUnreadOnly, isStarredOnly }
    };
    console.log('MAIL_LOG:', JSON.stringify(logEntry));

    // Формируем условия фильтрации — and() объединяет их через AND
    const conditions = [eq(emails.ownerId, user.id)];

    // Фильтрация по папке
    if (folder !== 'all') {
      conditions.push(eq(emails.folder, folder));
    }

    // Поиск по теме
    if (search) {
      conditions.push(like(emails.subject, `%${search}%`));
    }

    // Фильтры
    if (isUnreadOnly) {
      conditions.push(eq(emails.isRead, false));
    }

    if (isStarredOnly) {
      conditions.push(eq(emails.isStarred, true));
    }

    let query = db.select().from(emails).where(and(...conditions));

    // Логируем SQL для диагностики
    const sqlDebug = query.toSQL();
    console.log('Generated SQL:', sqlDebug.sql);
    console.log('SQL Params:', sqlDebug.params);

    const emailList = await query
      .orderBy(desc(emails.createdAt))
      .limit(50)
      .execute();

    // Получаем вложения для каждого письма. Если писем нет, не дергаем БД:
    // inArray с пустым массивом генерирует невалидный SQL `IN ()` и роняет
    // запрос (500) — например, для пустой папки.
    const emailIds = emailList.map(e => e.id);
    const attachments = emailIds.length > 0
      ? await db
          .select()
          .from(emailAttachments)
          .where(inArray(emailAttachments.emailId, emailIds))
          .execute()
      : [];

    // Группируем вложения по emailId
    const attachmentsByEmail = attachments.reduce((acc, att) => {
      if (!acc[att.emailId]) {
        acc[att.emailId] = [];
      }
      acc[att.emailId].push({
        id: att.id,
        filename: att.filename,
        size: att.size,
        mimeType: att.mimeType,
        storageType: att.storageType,
        driveFileId: att.driveFileId,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Добавляем вложения к письмам
    const emailsWithAttachments = emailList.map(email => ({
      ...email,
      attachments: attachmentsByEmail[email.id] || [],
    }));

    const resultLog = {
      timestamp: new Date().toISOString(),
      action: 'GET_EMAILS_SUCCESS',
      userId: user.id,
      params: { folder, search, isUnreadOnly, isStarredOnly },
      result: {
        totalEmails: emailList.length,
        sql: sqlDebug.sql,
        sqlParams: sqlDebug.params
      }
    };
    console.log('MAIL_LOG:', JSON.stringify(resultLog));

    console.log('Mail API - Returning emails:', {
      userId: user.id,
      folder: folder,
      search: search,
      isUnreadOnly: isUnreadOnly,
      isStarredOnly: isStarredOnly,
      totalEmails: emailsWithAttachments.length,
      emails: emailsWithAttachments.map(e => ({
        id: e.id,
        folder: e.folder,
        subject: e.subject,
        from: e.from,
        to: e.to
      }))
    });

    return c.json({ emails: emailsWithAttachments });
  } catch (error) {
    const user = c.get('user');
    const errorLog = {
      timestamp: new Date().toISOString(),
      action: 'GET_EMAILS_ERROR',
      userId: user?.id || 'unknown',
      params: { 
        folder: c.req.query('folder') || 'inbox',
        search: c.req.query('search') || '',
        isUnreadOnly: c.req.query('isUnreadOnly') === 'true',
        isStarredOnly: c.req.query('isStarredOnly') === 'true'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
    console.log('MAIL_LOG:', JSON.stringify(errorLog));
    
    console.error('Error fetching emails:', error);
    return c.json({ error: 'Failed to fetch emails' }, 500);
  }
});

// Скачивание всех вложений письма в архиве
mail.get('/:id', authMiddleware, async (c) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, 'download-attachments.log');
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
  };
  
  log('[Mail Route /:id] Called');
  log('[Mail Route /:id] Full URL: ' + c.req.url);
  log('[Mail Route /:id] Query params: ' + JSON.stringify(c.req.query()));
  
  const downloadAll = c.req.query('download-attachments');
  log('[Mail Route /:id] download-attachments param: ' + downloadAll);
  
  if (downloadAll === 'true') {
    log('[Download All] ROUTE CALLED!');
    log('[Download All] Request path: ' + c.req.path);
    log('[Download All] Request URL: ' + c.req.url);
    
    try {
      const user = c.get('user');
      const emailId = c.req.param('id');

      log('[Download All] Starting download for email: ' + emailId);
      log('[Download All] User: ' + JSON.stringify(user));

      // Проверяем, что письмо принадлежит пользователю
      const email = await db
        .select()
        .from(emails)
        .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
        .limit(1);

      log('[Download All] Email found: ' + email.length);

      if (!email.length) {
        log('[Download All] Email not found');
        return c.json({ error: 'Email not found' }, 404);
      }

      // Получаем вложения письма
      const attachments = await db
        .select()
        .from(emailAttachments)
        .where(eq(emailAttachments.emailId, emailId));

      log('[Download All] Found attachments: ' + attachments.length);
      log('[Download All] Attachments: ' + JSON.stringify(attachments, null, 2));

      if (!attachments.length) {
        return c.json({ error: 'No attachments found' }, 404);
      }

      // Создаем архив в памяти
      const archiver = await import('archiver');
      const fs = require('fs');

      log('[Download All] Creating archive...');

      // Создаем поток для архива
      const archive = archiver.default('zip', { zlib: { level: 9 } });

      // Создаем массив для хранения данных архива
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        log('[Download All] Chunk received, size: ' + chunk.length + ', total chunks: ' + chunks.length);
      });

      archive.on('warning', (err: any) => {
        log('[Download All] Archive warning: ' + err);
      });

      archive.on('error', (err: Error) => {
        log('[Download All] Archive error: ' + err);
      });

      // Добавляем файлы в архив
      let filesAdded = 0;
      for (const attachment of attachments) {
        log('[Download All] Processing attachment: ' + attachment.filename + ', type: ' + attachment.storageType);

        if (attachment.storageType === 'drive' && attachment.driveFileId) {
          // Файл с диска - скачиваем напрямую из файловой системы диска
          try {
            // Ищем файл в таблице files
            const driveFiles = await db
              .select()
              .from(files)
              .where(eq(files.id, attachment.driveFileId))
              .limit(1);

            log('[Download All] Drive file found: ' + driveFiles.length);
            if (driveFiles.length) {
              log('[Download All] Drive file path from DB: ' + driveFiles[0].path);
              log('[Download All] Drive file name: ' + driveFiles[0].name);
              log('[Download All] Drive file type: ' + driveFiles[0].type);
              
              // Формируем путь к файлу: uploads/{fileId}-{attachmentFilename}
              const filePath = 'e:\\Project\\SuperApp\\packages\\server\\uploads\\' + attachment.driveFileId + '-' + attachment.filename;
              
              log('[Download All] Constructed file path: ' + filePath);
              log('[Download All] File exists: ' + fs.existsSync(filePath));
              
              if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: attachment.filename });
                filesAdded++;
                log('[Download All] Added drive file to archive: ' + attachment.filename + ' from ' + filePath);
              } else {
                log('[Download All] Drive file not found at constructed path');
              }
            } else {
              log('[Download All] Drive file not found in DB');
            }
          } catch (error) {
            log('[Download All] Failed to get drive file ' + attachment.filename + ': ' + error);
          }
        } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
          // Локальный файл
          archive.file(attachment.filePath, { name: attachment.filename });
          filesAdded++;
          log('[Download All] Added local file to archive: ' + attachment.filename);
        } else {
          log('[Download All] File path missing or does not exist: ' + attachment.filePath);
        }
      }

      log('[Download All] Total files added to archive: ' + filesAdded);

      // Ждем завершения архивации
      await new Promise<void>((resolve, reject) => {
        archive.on('end', () => {
          log('[Download All] Archive ended, total bytes: ' + archive.pointer());
          resolve();
        });
        archive.on('error', reject);
        archive.finalize();
      });

      // Объединяем все чанки в один буфер
      const archiveBuffer = Buffer.concat(chunks);

      log('[Download All] Archive buffer size: ' + archiveBuffer.length);
      log('[Download All] Chunks count: ' + chunks.length);

      if (archiveBuffer.length === 0) {
        log('[Download All] ERROR: Archive buffer is empty!');
        return c.json({ error: 'Archive is empty' }, 500);
      }

      // Устанавливаем заголовки для скачивания
      c.header('Content-Type', 'application/zip');
      c.header('Content-Disposition', `attachment; filename="attachments-${emailId}.zip"; filename*=UTF-8''attachments-${emailId}.zip`);
      c.header('Content-Length', String(archiveBuffer.length));
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');

      log('[Download All] Sending archive to client, size: ' + archiveBuffer.length);
      return c.body(archiveBuffer);
    } catch (error) {
      log('[Download All] Download all attachments error: ' + error);
      return c.json({ error: 'Failed to download attachments' }, 500);
    }
  }
  
  // Обычный запрос на получение письма
  try {
    const user = c.get('user');
    const emailId = c.req.param('id');

    const email = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
      .execute();

    if (!email.length) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Получаем вложения для письма
    const attachments = await db
      .select()
      .from(emailAttachments)
      .where(eq(emailAttachments.emailId, emailId))
      .execute();

    // Формируем массив вложений
    const attachmentsArray = attachments.map(att => ({
      id: att.id,
      filename: att.filename,
      size: att.size,
      mimeType: att.mimeType,
      storageType: att.storageType,
      driveFileId: att.driveFileId,
    }));

    // Отмечаем как прочитанное
    await db
      .update(emails)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(emails.id, emailId))
      .execute();

    return c.json({ email: { ...email[0], attachments: attachmentsArray } });
  } catch (error) {
    console.error('Error fetching email:', error);
    return c.json({ error: 'Failed to fetch email' }, 500);
  }
});

// Отправка письма
mail.post('/send', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    console.log('Send email request body:', JSON.stringify(body, null, 2));

    const validatedData = sendEmailSchema.parse(body);

    // Доставляем письмо получателям
    const recipients = [
      ...validatedData.to,
      ...(validatedData.cc || []),
      ...(validatedData.bcc || [])
    ];

    // Создаем письмо в отправленных
    console.log('Creating sent email for user:', user.email);
    const sentEmailId = crypto.randomUUID();
    const sentEmail = {
      id: sentEmailId,
      from: user.email,
      to: validatedData.to.join(', '),
      cc: validatedData.cc?.join(', ') || null,
      bcc: validatedData.bcc?.join(', ') || null,
      subject: validatedData.subject,
      body: validatedData.body,
      folder: 'sent',
      isRead: true,
      isStarred: false,
      isImportant: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: user.id,
    };

    console.log('Inserting sent email:', sentEmail);
    await db.insert(emails).values(sentEmail).execute();
    console.log('Sent email inserted successfully');

    // Связываем вложения с письмом отправителя
    if (validatedData.attachmentIds && validatedData.attachmentIds.length > 0) {
      console.log('Linking attachments to sent email:', validatedData.attachmentIds);
      for (const attachmentId of validatedData.attachmentIds) {
        await db
          .update(emailAttachments)
          .set({ emailId: sentEmailId })
          .where(eq(emailAttachments.id, attachmentId))
          .execute();
      }
    }

    console.log('Starting email delivery to recipients:', recipients);

    for (const recipientIdentifier of recipients) {
      try {
        // Клиент может прислать username или email (например, пользователь
        // ввёл руками строку с @). Ищем сначала по username, затем по email
        // — это позволяет не ломать совместимость со старыми письмами,
        // где в `to` лежит email.
        const recipientUser = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.username, recipientIdentifier),
              eq(users.email, recipientIdentifier),
            ),
          )
          .execute();

        if (recipientUser.length === 0) {
          console.log(`Recipient "${recipientIdentifier}" not found, skipping`);
          continue;
        }
        // Письмо у адресата будет показывать ту же строку, которую он
        // получил (username для новых писем; email — для legacy).
        const recipientEmail = recipientIdentifier;

        // Создаем письмо для получателя
        const inboxEmailId = crypto.randomUUID();
        const inboxEmail = {
          id: inboxEmailId,
          from: user.email,
          to: recipientEmail,
          subject: validatedData.subject,
          body: validatedData.body,
          folder: 'inbox',
          isRead: false,
          isStarred: false,
          isImportant: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId: recipientUser[0].id, // Письмо принадлежит получателю
        };

        await db.insert(emails).values(inboxEmail).execute();
        console.log(`Email delivered to ${recipientEmail}:`, inboxEmail);

        // Копируем вложения для получателя
        if (validatedData.attachmentIds && validatedData.attachmentIds.length > 0) {
          console.log('Copying attachments for recipient:', validatedData.attachmentIds);
          for (const attachmentId of validatedData.attachmentIds) {
            const originalAttachment = await db
              .select()
              .from(emailAttachments)
              .where(eq(emailAttachments.id, attachmentId))
              .limit(1);

            if (originalAttachment.length > 0) {
              const newAttachmentId = crypto.randomUUID();
              await db.insert(emailAttachments).values({
                id: newAttachmentId,
                emailId: inboxEmailId,
                filename: originalAttachment[0].filename,
                size: originalAttachment[0].size,
                mimeType: originalAttachment[0].mimeType,
                storageType: originalAttachment[0].storageType,
                filePath: originalAttachment[0].filePath,
                driveFileId: originalAttachment[0].driveFileId,
                ownerId: recipientUser[0].id,
                createdAt: new Date(),
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error delivering email to ${recipientEmail}:`, error);
      }
    }

    // TODO: Отправка через SMTP сервер для внешних email адресов
    console.log('Email sent from', user.email, 'to:', recipients);

    // Возвращаем sentEmail только если он существует (не отправляли себе)
    const response: any = { success: true };
    if (sentEmail) {
      response.email = sentEmail;
    }

    return c.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('Error sending email:', error);
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

// Обновление письма
mail.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const emailId = c.req.param('id');
    const body = await c.req.json();

    console.log('PUT email request:', {
      emailId,
      userId: user.id,
      requestBody: body
    });

    const validatedData = updateEmailSchema.parse(body);

    // Проверяем, что письмо принадлежит пользователю
    const existingEmail = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
      .execute();

    if (!existingEmail.length) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Обновляем письмо
    const updateData: any = {};
    
    // Добавляем только разрешенные поля
    if (validatedData.folder !== undefined) {
      updateData.folder = validatedData.folder;
    }
    if (validatedData.isRead !== undefined) {
      updateData.isRead = validatedData.isRead;
    }
    if (validatedData.isStarred !== undefined) {
      updateData.isStarred = validatedData.isStarred;
    }
    
    console.log('Email update data:', {
      emailId,
      updateData,
      existingEmailFound: existingEmail.length > 0
    });
    
    await db
      .update(emails)
      .set(updateData)
      .where(eq(emails.id, emailId))
      .execute();

    console.log('Email updated successfully');
    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('Error updating email:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ 
      error: 'Failed to update email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Удаление письма
mail.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const emailId = c.req.param('id');

    const logData = {
      timestamp: new Date().toISOString(),
      emailId,
      userId: user.id,
      action: 'DELETE_REQUEST'
    };
    
    console.log('DELETE email request:', logData);
    
    // Записываем в файл
    const fs = require('fs');
    fs.appendFileSync('debug.log', JSON.stringify(logData) + '\n');

    // Проверяем, что письмо принадлежит пользователю
    const existingEmail = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
      .execute();

    const foundLogData = {
      timestamp: new Date().toISOString(),
      emailId,
      userId: user.id,
      existingEmailFound: existingEmail.length > 0,
      emailDetails: existingEmail.length > 0 ? {
        id: existingEmail[0].id,
        folder: existingEmail[0].folder,
        subject: existingEmail[0].subject,
        from: existingEmail[0].from,
        to: existingEmail[0].to
      } : null,
      action: 'EMAIL_SEARCH_RESULT'
    };
    
    console.log('Email found for deletion:', foundLogData);
    
    // Записываем результат поиска в файл
    fs.appendFileSync('debug.log', JSON.stringify(foundLogData) + '\n');

    if (!existingEmail.length) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Перемещаем в корзину вместо удаления
    await db
      .update(emails)
      .set({
        folder: 'trash',
        updatedAt: new Date(),
      })
      .where(eq(emails.id, emailId))
      .execute();

    console.log('Email moved to trash successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ 
      error: 'Failed to delete email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Перемещение в папку
mail.put('/:id/move', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const emailId = c.req.param('id');
    const body = await c.req.json();

    const { folder } = updateEmailSchema.parse(body);

    // Проверяем, что письмо принадлежит пользователю
    const existingEmail = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
      .execute();

    if (!existingEmail.length) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Перемещаем письмо
    await db
      .update(emails)
      .set({
        folder,
        updatedAt: new Date(),
      })
      .where(eq(emails.id, emailId))
      .execute();

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('Error moving email:', error);
    return c.json({ error: 'Failed to move email' }, 500);
  }
});

// Загрузка вложения
mail.post('/attachments/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const contentType = c.req.header('content-type');

    let filename: string;
    let size: number;
    let mimeType: string;
    let storageType: 'local' | 'drive' = 'local';
    let driveFileId: string | null = null;
    let filePath: string;
    let file: File | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // FormData запрос (для локальных файлов)
      const body = await c.req.parseBody();
      file = body.file as File;
      storageType = (body.storageType as string) || 'local';
      driveFileId = (body.driveFileId as string) || null;

      console.log('Upload attachment request (FormData):', { fileName: file?.name, fileSize: file?.size, storageType, driveFileId });

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      filename = file.name;
      size = file.size;
      mimeType = file.type || 'application/octet-stream';
    } else {
      // JSON запрос (для файлов с диска)
      const body = await c.req.json();
      filename = body.filename;
      size = body.size;
      mimeType = body.mimeType;
      storageType = body.storageType;
      driveFileId = body.driveFileId;

      console.log('Upload attachment request (JSON):', { filename, size, mimeType, storageType, driveFileId });

      if (!filename || storageType !== 'drive' || !driveFileId) {
        return c.json({ error: 'Invalid request for drive attachment' }, 400);
      }
    }

    const attachmentId = crypto.randomUUID();
    const now = new Date();

    if (storageType === 'drive' && driveFileId) {
      // Файл с сетевого диска - не сохраняем, используем ссылку на файл диска
      filePath = ''; // Путь не нужен, файл уже на диске
    } else if (file) {
      // Файл с локального компьютера - сохраняем с уникальным именем
      const uploadsDir = './uploads';
      const fs = require('fs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      filePath = `${uploadsDir}/${attachmentId}-${filename}`;
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
    } else {
      return c.json({ error: 'Invalid request' }, 400);
    }

    // Создаем запись в таблице email_attachments
    await db.insert(emailAttachments).values({
      id: attachmentId,
      emailId: '', // Будет заполнено при отправке письма
      filename: filename,
      size: size,
      mimeType: mimeType,
      storageType: storageType,
      filePath: filePath,
      driveFileId: driveFileId,
      ownerId: user.id,
      createdAt: now,
    });

    console.log('Attachment uploaded successfully:', { attachmentId, fileName: filename });
    return c.json({ message: 'Attachment uploaded successfully', id: attachmentId });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return c.json({ error: 'Failed to upload attachment' }, 500);
  }
});

// Скачивание вложения
mail.get('/attachments/:id/download', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const attachmentId = c.req.param('id');

    // Получаем информацию о вложении
    const attachment = await db
      .select()
      .from(emailAttachments)
      .where(eq(emailAttachments.id, attachmentId))
      .limit(1);

    if (!attachment.length) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    // Проверяем права доступа
    if (attachment[0].ownerId !== user.id) {
      // Также проверяем, есть ли у пользователя доступ к письму с этим вложением
      const email = await db
        .select()
        .from(emails)
        .where(eq(emails.id, attachment[0].emailId))
        .limit(1);

      if (!email.length || email[0].ownerId !== user.id) {
        return c.json({ error: 'Permission denied' }, 403);
      }
    }

    // Читаем файл из файловой системы
    const fs = require('fs');
    if (!fs.existsSync(attachment[0].filePath)) {
      return c.json({ error: 'File not found on disk' }, 404);
    }

    // Используем потоковую передачу для больших файлов
    const fileStream = fs.createReadStream(attachment[0].filePath);

    return c.body(fileStream, 200, {
      'Content-Type': attachment[0].mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment[0].filename)}"`,
    });
  } catch (error) {
    console.error('Download attachment error:', error);
    return c.json({ error: 'Failed to download attachment' }, 500);
  }
});

// Получение вложений письма
mail.get('/:id/attachments', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const emailId = c.req.param('id');

    // Проверяем, что письмо принадлежит пользователю
    const email = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, emailId), eq(emails.ownerId, user.id)))
      .limit(1);

    if (!email.length) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Получаем вложения письма
    const attachments = await db
      .select()
      .from(emailAttachments)
      .where(eq(emailAttachments.emailId, emailId));

    return c.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    return c.json({ error: 'Failed to get attachments' }, 500);
  }
});

export { mail };
