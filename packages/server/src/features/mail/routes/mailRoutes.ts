import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db';
import { emails, users } from '../../../db/schema';
import { eq, and, desc, like, or } from 'drizzle-orm';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const mail = new Hono();

// Схемы валидации
const sendEmailSchema = z.object({
  to: z.array(z.string().min(1)),
  cc: z.array(z.string().min(1)).optional(),
  bcc: z.array(z.string().min(1)).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
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
      totalEmails: emailList.length,
      emails: emailList.map(e => ({
        id: e.id,
        folder: e.folder,
        subject: e.subject,
        from: e.from,
        to: e.to
      }))
    });

    return c.json({ emails: emailList });
  } catch (error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      action: 'GET_EMAILS_ERROR',
      userId: user?.id || 'unknown',
      params: { folder, search, isUnreadOnly, isStarredOnly },
      error: error.message,
      stack: error.stack
    };
    console.log('MAIL_LOG:', JSON.stringify(errorLog));
    
    console.error('Error fetching emails:', error);
    return c.json({ error: 'Failed to fetch emails' }, 500);
  }
});

// Получение одного письма
mail.get('/:id', authMiddleware, async (c) => {
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

    // Отмечаем как прочитанное
    await db
      .update(emails)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(emails.id, emailId))
      .execute();

    return c.json({ email: email[0] });
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
    const sentEmail = {
      id: crypto.randomUUID(),
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

    console.log('Starting email delivery to recipients:', recipients);

    for (const recipientEmail of recipients) {
      try {
        console.log('Processing recipient:', recipientEmail);
        
        // Ищем пользователя-получателя
        const recipientUser = await db
          .select()
          .from(users)
          .where(eq(users.email, recipientEmail))
          .execute();
        
        console.log('Found recipient user:', recipientUser.length > 0 ? 'yes' : 'no');

        if (recipientUser.length === 0) {
          console.log(`User ${recipientEmail} not found, skipping delivery`);
          continue;
        }

        // Создаем письмо для получателя
        const inboxEmail = {
          id: crypto.randomUUID(),
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

export { mail };
