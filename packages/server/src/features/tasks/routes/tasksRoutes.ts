import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db';
import { taskColumns, taskCards, taskCardComments, users } from '../../../db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { authMiddleware } from '../../../shared/middleware/auth';

const tasksRouter = new Hono();

// Применяем auth ко всем маршрутам
tasksRouter.use('*', authMiddleware);

// Схемы валидации
const createColumnSchema = z.object({
  name: z.string().min(1).max(255),
  deadline: z.union([z.string(), z.number(), z.null()]).optional(),
  position: z.number().int().optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  deadline: z.union([z.string(), z.number(), z.null()]).optional(),
  position: z.number().int().optional(),
});

const createCardSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  deadline: z.union([z.string(), z.number(), z.null()]).optional(),
  isCompleted: z.boolean().optional(),
  assignees: z.array(z.string()).optional(),
  position: z.number().int().optional(),
});

const updateCardSchema = z.object({
  columnId: z.string().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  deadline: z.union([z.string(), z.number(), z.null()]).optional(),
  isCompleted: z.boolean().optional(),
  assignees: z.array(z.string()).optional(),
  position: z.number().int().optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

function parseDeadline(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }
  return null;
}

function getUserId(c: any): string {
  const user = c.get('user') as any;
  return user?.userId || user?.id || '';
}

// === Колонки ===

// Список всех колонок пользователя со вложенными карточками
tasksRouter.get('/columns', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const columns = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.ownerId, userId))
      .orderBy(asc(taskColumns.position), asc(taskColumns.createdAt))
      .execute();

    const columnIds = columns.map((col) => col.id);

    let cards: typeof taskCards.$inferSelect[] = [];
    if (columnIds.length > 0) {
      cards = await db
        .select()
        .from(taskCards)
        .where(inArray(taskCards.columnId, columnIds))
        .orderBy(asc(taskCards.position), asc(taskCards.createdAt))
        .execute();
    }

    const cardIds = cards.map((card) => card.id);

    let comments: typeof taskCardComments.$inferSelect[] = [];
    if (cardIds.length > 0) {
      comments = await db
        .select()
        .from(taskCardComments)
        .where(inArray(taskCardComments.cardId, cardIds))
        .orderBy(asc(taskCardComments.createdAt))
        .execute();
    }

    const result = columns.map((col) => ({
      ...col,
      cards: cards
        .filter((card) => card.columnId === col.id)
        .map((card) => ({
          ...card,
          assignees: safeParseAssignees(card.assignees),
          comments: comments
            .filter((comment) => comment.cardId === card.id)
            .map((comment) => ({ ...comment })),
        })),
    }));

    return c.json({ columns: result });
  } catch (error) {
    console.error('Ошибка при получении колонок:', error);
    return c.json({ error: 'Не удалось получить список колонок' }, 500);
  }
});

// Создание колонки
tasksRouter.post('/columns', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const body = await c.req.json();
    const data = createColumnSchema.parse(body);

    let position = data.position;
    if (position === undefined) {
      const existing = await db
        .select()
        .from(taskColumns)
        .where(eq(taskColumns.ownerId, userId))
        .execute();
      position = existing.length;
    }

    const now = new Date();
    const newColumn = {
      id: crypto.randomUUID(),
      name: data.name,
      deadline: parseDeadline(data.deadline) ?? null,
      position,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taskColumns).values(newColumn).execute();

    return c.json({ column: { ...newColumn, cards: [] } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Ошибка при создании колонки:', error);
    return c.json({ error: 'Не удалось создать колонку' }, 500);
  }
});

// Обновление колонки
tasksRouter.put('/columns/:id', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const columnId = c.req.param('id');
    const body = await c.req.json();
    const data = updateColumnSchema.parse(body);

    const existing = await db
      .select()
      .from(taskColumns)
      .where(and(eq(taskColumns.id, columnId), eq(taskColumns.ownerId, userId)))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.deadline !== undefined) updates.deadline = parseDeadline(data.deadline);
    if (data.position !== undefined) updates.position = data.position;

    await db.update(taskColumns).set(updates).where(eq(taskColumns.id, columnId)).execute();

    const updated = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.id, columnId))
      .execute();

    return c.json({ column: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Ошибка при обновлении колонки:', error);
    return c.json({ error: 'Не удалось обновить колонку' }, 500);
  }
});

// Удаление колонки (вместе с карточками и комментариями)
tasksRouter.delete('/columns/:id', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const columnId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskColumns)
      .where(and(eq(taskColumns.id, columnId), eq(taskColumns.ownerId, userId)))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const columnCards = await db
      .select({ id: taskCards.id })
      .from(taskCards)
      .where(eq(taskCards.columnId, columnId))
      .execute();

    const cardIds = columnCards.map((card) => card.id);

    if (cardIds.length > 0) {
      await db
        .delete(taskCardComments)
        .where(inArray(taskCardComments.cardId, cardIds))
        .execute();
      await db.delete(taskCards).where(eq(taskCards.columnId, columnId)).execute();
    }

    await db.delete(taskColumns).where(eq(taskColumns.id, columnId)).execute();

    return c.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении колонки:', error);
    return c.json({ error: 'Не удалось удалить колонку' }, 500);
  }
});

// === Карточки ===

// Создание карточки
tasksRouter.post('/cards', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const body = await c.req.json();
    const data = createCardSchema.parse(body);

    // Проверяем доступ к колонке
    const column = await db
      .select()
      .from(taskColumns)
      .where(and(eq(taskColumns.id, data.columnId), eq(taskColumns.ownerId, userId)))
      .execute();

    if (!column.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    let position = data.position;
    if (position === undefined) {
      const existing = await db
        .select()
        .from(taskCards)
        .where(eq(taskCards.columnId, data.columnId))
        .execute();
      position = existing.length;
    }

    const now = new Date();
    const newCard = {
      id: crypto.randomUUID(),
      columnId: data.columnId,
      title: data.title,
      description: data.description ?? null,
      deadline: parseDeadline(data.deadline) ?? null,
      isCompleted: data.isCompleted ?? false,
      assignees: JSON.stringify(data.assignees ?? []),
      position,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taskCards).values(newCard).execute();

    return c.json({
      card: {
        ...newCard,
        assignees: data.assignees ?? [],
        comments: [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Ошибка при создании карточки:', error);
    return c.json({ error: 'Не удалось создать карточку' }, 500);
  }
});

// Обновление карточки
tasksRouter.put('/cards/:id', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const cardId = c.req.param('id');
    const body = await c.req.json();
    const data = updateCardSchema.parse(body);

    const existing = await db
      .select()
      .from(taskCards)
      .where(and(eq(taskCards.id, cardId), eq(taskCards.ownerId, userId)))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    if (data.columnId) {
      const column = await db
        .select()
        .from(taskColumns)
        .where(and(eq(taskColumns.id, data.columnId), eq(taskColumns.ownerId, userId)))
        .execute();
      if (!column.length) {
        return c.json({ error: 'Целевая колонка не найдена' }, 404);
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.columnId !== undefined) updates.columnId = data.columnId;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.deadline !== undefined) updates.deadline = parseDeadline(data.deadline);
    if (data.isCompleted !== undefined) updates.isCompleted = data.isCompleted;
    if (data.assignees !== undefined) updates.assignees = JSON.stringify(data.assignees);
    if (data.position !== undefined) updates.position = data.position;

    await db.update(taskCards).set(updates).where(eq(taskCards.id, cardId)).execute();

    const updated = await db.select().from(taskCards).where(eq(taskCards.id, cardId)).execute();
    const comments = await db
      .select()
      .from(taskCardComments)
      .where(eq(taskCardComments.cardId, cardId))
      .orderBy(asc(taskCardComments.createdAt))
      .execute();

    return c.json({
      card: {
        ...updated[0],
        assignees: safeParseAssignees(updated[0].assignees),
        comments,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Ошибка при обновлении карточки:', error);
    return c.json({ error: 'Не удалось обновить карточку' }, 500);
  }
});

// Удаление карточки
tasksRouter.delete('/cards/:id', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const cardId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskCards)
      .where(and(eq(taskCards.id, cardId), eq(taskCards.ownerId, userId)))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    await db.delete(taskCardComments).where(eq(taskCardComments.cardId, cardId)).execute();
    await db.delete(taskCards).where(eq(taskCards.id, cardId)).execute();

    return c.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении карточки:', error);
    return c.json({ error: 'Не удалось удалить карточку' }, 500);
  }
});

// === Комментарии ===

// Создание комментария
tasksRouter.post('/cards/:cardId/comments', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const cardId = c.req.param('cardId');
    const body = await c.req.json();
    const data = createCommentSchema.parse(body);

    const card = await db
      .select()
      .from(taskCards)
      .where(and(eq(taskCards.id, cardId), eq(taskCards.ownerId, userId)))
      .execute();

    if (!card.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const now = new Date();
    const newComment = {
      id: crypto.randomUUID(),
      cardId,
      userId,
      body: data.body,
      createdAt: now,
    };

    await db.insert(taskCardComments).values(newComment).execute();

    return c.json({ comment: newComment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Ошибка при создании комментария:', error);
    return c.json({ error: 'Не удалось создать комментарий' }, 500);
  }
});

// Удаление комментария
tasksRouter.delete('/comments/:id', async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Не авторизован' }, 401);

    const commentId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskCardComments)
      .where(eq(taskCardComments.id, commentId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Комментарий не найден' }, 404);
    }

    // Удалить может только автор комментария
    if (existing[0].userId !== userId) {
      return c.json({ error: 'Недостаточно прав' }, 403);
    }

    await db.delete(taskCardComments).where(eq(taskCardComments.id, commentId)).execute();
    return c.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении комментария:', error);
    return c.json({ error: 'Не удалось удалить комментарий' }, 500);
  }
});

function safeParseAssignees(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

export default tasksRouter;
