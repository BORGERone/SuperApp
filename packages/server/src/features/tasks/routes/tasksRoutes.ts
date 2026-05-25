import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db';
import { taskColumns, taskCards, taskComments, taskCardSubtasks, users } from '../../../db/schema';
import { eq, asc, inArray, sql } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../../../shared/middleware/auth';

const tasks = new Hono();

// Применяем авторизацию ко всем маршрутам модуля задач
tasks.use('*', authMiddleware);

// ===== Схемы валидации =====

const createColumnSchema = z.object({
  title: z.string().min(1).max(255),
  deadline: z.string().datetime().nullable().optional(),
  position: z.number().int().optional(),
});

const updateColumnSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  deadline: z.string().datetime().nullable().optional(),
  position: z.number().int().optional(),
  archived: z.boolean().optional(),
});

const createCardSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional().default(''),
  deadline: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional().default(false),
  assignees: z.array(z.string()).optional().default([]),
  position: z.number().int().optional(),
});

const updateCardSchema = z.object({
  columnId: z.string().min(1).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
  assignees: z.array(z.string()).optional(),
  position: z.number().int().optional(),
});

const createCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(255),
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().optional(),
});

const reorderCardsSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().min(1),
        columnId: z.string().min(1),
        position: z.number().int(),
      }),
    )
    .min(1)
    .max(500),
});

// ===== Утилиты =====

// Права на изменение колонки: владелец либо админ.
function canEditColumn(user: AuthUser, column: typeof taskColumns.$inferSelect): boolean {
  return user.role === 'admin' || column.ownerId === user.id;
}

// Права на изменение карточки: владелец карточки/колонки, в которой
// она лежит, ассайн либо админ.
function canEditCard(
  user: AuthUser,
  card: typeof taskCards.$inferSelect,
  column?: typeof taskColumns.$inferSelect | null,
): boolean {
  if (user.role === 'admin') return true;
  if (card.ownerId === user.id) return true;
  if (column && column.ownerId === user.id) return true;
  const assignees = parseAssignees(card.assignees);
  return assignees.includes(user.id);
}

// Удалять карточку может только владелец карточки/колонки либо админ
function canDeleteCard(
  user: AuthUser,
  card: typeof taskCards.$inferSelect,
  column?: typeof taskColumns.$inferSelect | null,
): boolean {
  if (user.role === 'admin') return true;
  if (card.ownerId === user.id) return true;
  if (column && column.ownerId === user.id) return true;
  return false;
}

async function loadColumn(columnId: string) {
  const rows = await db
    .select()
    .from(taskColumns)
    .where(eq(taskColumns.id, columnId))
    .execute();
  return rows[0] ?? null;
}

async function loadCard(cardId: string) {
  const rows = await db.select().from(taskCards).where(eq(taskCards.id, cardId)).execute();
  return rows[0] ?? null;
}

function parseAssignees(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

interface LastCommentPreview {
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  createdAt: string;
}

function serializeSubtask(subtask: typeof taskCardSubtasks.$inferSelect) {
  return {
    id: subtask.id,
    cardId: subtask.cardId,
    title: subtask.title,
    completed: !!subtask.completed,
    position: subtask.position,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

function serializeCard(
  card: typeof taskCards.$inferSelect,
  commentsCount = 0,
  lastComment: LastCommentPreview | null = null,
  subtasks: Array<typeof taskCardSubtasks.$inferSelect> = [],
) {
  return {
    id: card.id,
    columnId: card.columnId,
    title: card.title,
    description: card.description ?? '',
    deadline: card.deadline ? card.deadline.toISOString() : null,
    completed: !!card.completed,
    assignees: parseAssignees(card.assignees),
    position: card.position,
    ownerId: card.ownerId,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    commentsCount,
    lastComment,
    subtasks: subtasks.map(serializeSubtask),
  };
}

function serializeColumn(column: typeof taskColumns.$inferSelect) {
  return {
    id: column.id,
    title: column.title,
    deadline: column.deadline ? column.deadline.toISOString() : null,
    position: column.position,
    ownerId: column.ownerId,
    archived: !!column.archived,
    archivedAt: column.archivedAt ? column.archivedAt.toISOString() : null,
    createdAt: column.createdAt.toISOString(),
    updatedAt: column.updatedAt.toISOString(),
  };
}

function serializeComment(comment: typeof taskComments.$inferSelect, author?: { id: string; username: string; email: string } | null) {
  return {
    id: comment.id,
    cardId: comment.cardId,
    authorId: comment.authorId,
    authorName: author?.username ?? null,
    authorEmail: author?.email ?? null,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

// ===== Колонки =====

// Получение всех колонок (по умолчанию без архивных, ?archived=true — только архив, ?archived=all — все)
tasks.get('/columns', async (c) => {
  try {
    const archivedParam = c.req.query('archived');
    const list = await db
      .select()
      .from(taskColumns)
      .orderBy(asc(taskColumns.position), asc(taskColumns.createdAt))
      .execute();

    const filtered = list.filter((column) => {
      if (archivedParam === 'all') return true;
      if (archivedParam === 'true') return !!column.archived;
      return !column.archived;
    });

    return c.json({ columns: filtered.map(serializeColumn) });
  } catch (error) {
    console.error('Error fetching task columns:', error);
    return c.json({ error: 'Не удалось получить колонки' }, 500);
  }
});

// Создание колонки
tasks.post('/columns', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = createColumnSchema.parse(body);

    const now = new Date();
    const id = crypto.randomUUID();

    let position = data.position;
    if (position === undefined) {
      const existing = await db.select().from(taskColumns).execute();
      position = existing.length;
    }

    const newColumn = {
      id,
      title: data.title,
      deadline: data.deadline ? new Date(data.deadline) : null,
      position,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taskColumns).values(newColumn).execute();

    return c.json({ column: serializeColumn(newColumn as typeof taskColumns.$inferSelect) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error creating column:', error);
    return c.json({ error: 'Не удалось создать колонку' }, 500);
  }
});

// Обновление колонки
tasks.put('/columns/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const columnId = c.req.param('id');
    const body = await c.req.json();
    const data = updateColumnSchema.parse(body);

    const existing = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.id, columnId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    if (!canEditColumn(user, existing[0])) {
      return c.json({ error: 'Недостаточно прав для изменения колонки' }, 403);
    }

    const updateData: Partial<typeof taskColumns.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.position !== undefined) updateData.position = data.position;
    if (data.archived !== undefined) {
      updateData.archived = data.archived;
      updateData.archivedAt = data.archived ? new Date() : null;
    }

    await db
      .update(taskColumns)
      .set(updateData)
      .where(eq(taskColumns.id, columnId))
      .execute();

    const updated = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.id, columnId))
      .execute();

    return c.json({ column: serializeColumn(updated[0]) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error updating column:', error);
    return c.json({ error: 'Не удалось обновить колонку' }, 500);
  }
});

// Удаление колонки (и всех её карточек/комментариев)
tasks.delete('/columns/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const columnId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.id, columnId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    if (!canEditColumn(user, existing[0])) {
      return c.json({ error: 'Недостаточно прав для удаления колонки' }, 403);
    }

    // Получаем карточки и удаляем их комментарии
    const cards = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.columnId, columnId))
      .execute();

    if (cards.length > 0) {
      const cardIds = cards.map((card) => card.id);
      await db.delete(taskComments).where(inArray(taskComments.cardId, cardIds)).execute();
      await db.delete(taskCardSubtasks).where(inArray(taskCardSubtasks.cardId, cardIds)).execute();
      await db.delete(taskCards).where(eq(taskCards.columnId, columnId)).execute();
    }

    await db.delete(taskColumns).where(eq(taskColumns.id, columnId)).execute();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting column:', error);
    return c.json({ error: 'Не удалось удалить колонку' }, 500);
  }
});

// ===== Карточки =====

// Получение всех карточек (в выдаче — по умолчанию без архивных колонок, ?archived=all — все)
tasks.get('/cards', async (c) => {
  try {
    const archivedParam = c.req.query('archived');
    const list = await db
      .select()
      .from(taskCards)
      .orderBy(asc(taskCards.columnId), asc(taskCards.position), asc(taskCards.createdAt))
      .execute();

    let filtered = list;
    if (archivedParam !== 'all') {
      const columnsList = await db.select().from(taskColumns).execute();
      const archivedColumnIds = new Set(
        columnsList.filter((column) => !!column.archived).map((column) => column.id),
      );
      filtered = list.filter((card) => !archivedColumnIds.has(card.columnId));
    }

    // Подсчёт комментариев для карточек выводится вместе с карточками,
    // чтобы счётчик обновлялся динамически при инвалидации запроса карточек.
    let countByCard = new Map<string, number>();
    let lastByCard = new Map<string, LastCommentPreview>();
    let subtasksByCard = new Map<string, Array<typeof taskCardSubtasks.$inferSelect>>();
    if (filtered.length > 0) {
      const cardIds = filtered.map((card) => card.id);
      const counts = await db
        .select({ cardId: taskComments.cardId, count: sql<number>`COUNT(*)` })
        .from(taskComments)
        .where(inArray(taskComments.cardId, cardIds))
        .groupBy(taskComments.cardId)
        .execute();
      countByCard = new Map(counts.map((row) => [row.cardId, Number(row.count) || 0]));

      // Последний комментарий по каждой карточке — для превью на доске.
      const lastRows = await db
        .select({
          cardId: taskComments.cardId,
          body: taskComments.body,
          createdAt: taskComments.createdAt,
          authorId: taskComments.authorId,
          username: users.username,
          email: users.email,
        })
        .from(taskComments)
        .leftJoin(users, eq(users.id, taskComments.authorId))
        .where(inArray(taskComments.cardId, cardIds))
        .orderBy(asc(taskComments.cardId), sql`${taskComments.createdAt} DESC`)
        .execute();
      for (const row of lastRows) {
        if (lastByCard.has(row.cardId)) continue;
        lastByCard.set(row.cardId, {
          authorName: row.username ?? null,
          authorEmail: row.email ?? null,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
        });
      }

      const subtasksRows = await db
        .select()
        .from(taskCardSubtasks)
        .where(inArray(taskCardSubtasks.cardId, cardIds))
        .orderBy(asc(taskCardSubtasks.position), asc(taskCardSubtasks.createdAt))
        .execute();
      for (const subtask of subtasksRows) {
        const list = subtasksByCard.get(subtask.cardId) ?? [];
        list.push(subtask);
        subtasksByCard.set(subtask.cardId, list);
      }
    }

    return c.json({
      cards: filtered.map((card) =>
        serializeCard(
          card,
          countByCard.get(card.id) ?? 0,
          lastByCard.get(card.id) ?? null,
          subtasksByCard.get(card.id) ?? [],
        ),
      ),
    });
  } catch (error) {
    console.error('Error fetching task cards:', error);
    return c.json({ error: 'Не удалось получить карточки' }, 500);
  }
});

// Создание карточки
tasks.post('/cards', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const data = createCardSchema.parse(body);

    // Проверяем существование колонки
    const column = await db
      .select()
      .from(taskColumns)
      .where(eq(taskColumns.id, data.columnId))
      .execute();

    if (!column.length) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    let position = data.position;
    if (position === undefined) {
      const existing = await db
        .select()
        .from(taskCards)
        .where(eq(taskCards.columnId, data.columnId))
        .execute();
      position = existing.length;
    }

    const newCard = {
      id,
      columnId: data.columnId,
      title: data.title,
      description: data.description ?? '',
      deadline: data.deadline ? new Date(data.deadline) : null,
      completed: data.completed ?? false,
      assignees: JSON.stringify(data.assignees ?? []),
      position,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taskCards).values(newCard).execute();

    return c.json({ card: serializeCard(newCard as typeof taskCards.$inferSelect, 0, null, []) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error creating card:', error);
    return c.json({ error: 'Не удалось создать карточку' }, 500);
  }
});

// Обновление карточки
tasks.put('/cards/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const cardId = c.req.param('id');
    const body = await c.req.json();
    const data = updateCardSchema.parse(body);

    const existing = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.id, cardId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const sourceColumn = await loadColumn(existing[0].columnId);
    if (!canEditCard(user, existing[0], sourceColumn)) {
      return c.json({ error: 'Недостаточно прав для изменения карточки' }, 403);
    }

    // Дополнительные ограничения для ассайнов (не владельцев):
    // переносить карточку в другую колонку и менять список ассайнов может только
    // владелец карточки/колонки либо админ.
    const isOwnerOrAdmin =
      user.role === 'admin' ||
      existing[0].ownerId === user.id ||
      (sourceColumn && sourceColumn.ownerId === user.id);
    if (!isOwnerOrAdmin && (data.columnId !== undefined || data.assignees !== undefined)) {
      return c.json(
        { error: 'Перемещение карточки или изменение ассайнов доступны только владельцу и админу' },
        403,
      );
    }

    // Проверяем, что целевая колонка принадлежит тому же владельцу (или админу),
    // иначе можно было бы перекидывать свои карточки в чужую колонку.
    if (data.columnId !== undefined && data.columnId !== existing[0].columnId) {
      const targetColumn = await loadColumn(data.columnId);
      if (!targetColumn) {
        return c.json({ error: 'Целевая колонка не найдена' }, 404);
      }
      if (user.role !== 'admin' && targetColumn.ownerId !== user.id) {
        return c.json({ error: 'Нельзя перемещать карточку в чужую колонку' }, 403);
      }
    }

    const updateData: Partial<typeof taskCards.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.columnId !== undefined) updateData.columnId = data.columnId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.assignees !== undefined) updateData.assignees = JSON.stringify(data.assignees);
    if (data.position !== undefined) updateData.position = data.position;

    await db
      .update(taskCards)
      .set(updateData)
      .where(eq(taskCards.id, cardId))
      .execute();

    const updated = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.id, cardId))
      .execute();

    const commentCountRows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(taskComments)
      .where(eq(taskComments.cardId, cardId))
      .execute();
    const commentsCount = Number(commentCountRows[0]?.count ?? 0) || 0;

    const subtasksRows = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.cardId, cardId))
      .orderBy(asc(taskCardSubtasks.position), asc(taskCardSubtasks.createdAt))
      .execute();

    return c.json({ card: serializeCard(updated[0], commentsCount, null, subtasksRows) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error updating card:', error);
    return c.json({ error: 'Не удалось обновить карточку' }, 500);
  }
});

// Пакетное переупорядочивание карточек (drag-and-drop)
tasks.post('/cards/reorder', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const data = reorderCardsSchema.parse(body);

    // Предварительно выбираем все затрагиваемые карточки и колонки,
    // чтобы проверить права до любых изменений.
    const cardIds = data.updates.map((u) => u.id);
    const columnIds = Array.from(new Set(data.updates.map((u) => u.columnId)));

    const existingCards = await db
      .select()
      .from(taskCards)
      .where(inArray(taskCards.id, cardIds))
      .execute();
    const existingColumns = await db
      .select()
      .from(taskColumns)
      .where(inArray(taskColumns.id, columnIds))
      .execute();
    const cardMap = new Map(existingCards.map((c2) => [c2.id, c2]));
    const columnMap = new Map(existingColumns.map((c2) => [c2.id, c2]));

    for (const update of data.updates) {
      const card = cardMap.get(update.id);
      if (!card) {
        return c.json({ error: 'Карточка не найдена', id: update.id }, 404);
      }
      const sourceColumn = columnMap.get(card.columnId) ?? null;
      const targetColumn = columnMap.get(update.columnId) ?? null;
      if (!targetColumn) {
        return c.json({ error: 'Целевая колонка не найдена', columnId: update.columnId }, 404);
      }
      if (!canEditCard(user, card, sourceColumn)) {
        return c.json(
          { error: 'Недостаточно прав для изменения карточки', id: update.id },
          403,
        );
      }
      // Для переноса в другую колонку требуется владельец исходной/целевой колонки
      // (ассайн может реордерить внутри той же колонки, но не перекидывать в чужую).
      if (update.columnId !== card.columnId) {
        const ownsTarget = user.role === 'admin' || targetColumn.ownerId === user.id;
        if (!ownsTarget) {
          return c.json(
            { error: 'Нельзя перемещать карточку в чужую колонку', id: update.id },
            403,
          );
        }
      }
    }

    const now = new Date();
    for (const update of data.updates) {
      await db
        .update(taskCards)
        .set({
          columnId: update.columnId,
          position: update.position,
          updatedAt: now,
        })
        .where(eq(taskCards.id, update.id))
        .execute();
    }

    return c.json({ success: true, count: data.updates.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error reordering cards:', error);
    return c.json({ error: 'Не удалось обновить порядок карточек' }, 500);
  }
});

// Удаление карточки
tasks.delete('/cards/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const cardId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.id, cardId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const column = await loadColumn(existing[0].columnId);
    if (!canDeleteCard(user, existing[0], column)) {
      return c.json({ error: 'Недостаточно прав для удаления карточки' }, 403);
    }

    await db.delete(taskComments).where(eq(taskComments.cardId, cardId)).execute();
    await db.delete(taskCardSubtasks).where(eq(taskCardSubtasks.cardId, cardId)).execute();
    await db.delete(taskCards).where(eq(taskCards.id, cardId)).execute();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return c.json({ error: 'Не удалось удалить карточку' }, 500);
  }
});

// ===== Комментарии =====

// Получение комментариев карточки
tasks.get('/cards/:id/comments', async (c) => {
  try {
    const cardId = c.req.param('id');

    const comments = await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.cardId, cardId))
      .orderBy(asc(taskComments.createdAt))
      .execute();

    const authorIds = Array.from(new Set(comments.map((cmt) => cmt.authorId)));
    const authors = authorIds.length
      ? await db
          .select({ id: users.id, username: users.username, email: users.email })
          .from(users)
          .where(inArray(users.id, authorIds))
          .execute()
      : [];

    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return c.json({
      comments: comments.map((cmt) => serializeComment(cmt, authorMap.get(cmt.authorId) ?? null)),
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Не удалось получить комментарии' }, 500);
  }
});

// Добавление комментария
tasks.post('/cards/:id/comments', async (c) => {
  try {
    const user = c.get('user');
    const cardId = c.req.param('id');
    const body = await c.req.json();
    const data = createCommentSchema.parse(body);

    const card = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.id, cardId))
      .execute();

    if (!card.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const now = new Date();
    const newComment = {
      id: crypto.randomUUID(),
      cardId,
      authorId: user.id,
      body: data.body,
      createdAt: now,
    };

    await db.insert(taskComments).values(newComment).execute();

    return c.json({
      comment: serializeComment(newComment as typeof taskComments.$inferSelect, {
        id: user.id,
        username: user.username,
        email: user.email,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error creating comment:', error);
    return c.json({ error: 'Не удалось добавить комментарий' }, 500);
  }
});

// Удаление комментария (автор или администратор)
tasks.delete('/comments/:id', async (c) => {
  try {
    const user = c.get('user');
    const commentId = c.req.param('id');

    const existing = await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.id, commentId))
      .execute();

    if (!existing.length) {
      return c.json({ error: 'Комментарий не найден' }, 404);
    }

    if (existing[0].authorId !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Недостаточно прав для удаления комментария' }, 403);
    }

    await db.delete(taskComments).where(eq(taskComments.id, commentId)).execute();
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return c.json({ error: 'Не удалось удалить комментарий' }, 500);
  }
});

// ===== Подпункты (чек-лист) =====

// Получение подпунктов карточки
tasks.get('/cards/:id/subtasks', async (c) => {
  try {
    const cardId = c.req.param('id');
    const subtasks = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.cardId, cardId))
      .orderBy(asc(taskCardSubtasks.position), asc(taskCardSubtasks.createdAt))
      .execute();
    return c.json({ subtasks: subtasks.map(serializeSubtask) });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return c.json({ error: 'Не удалось получить подпункты' }, 500);
  }
});

// Создание подпункта
tasks.post('/cards/:id/subtasks', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const cardId = c.req.param('id');
    const body = await c.req.json();
    const data = createSubtaskSchema.parse(body);

    const card = await db
      .select()
      .from(taskCards)
      .where(eq(taskCards.id, cardId))
      .execute();
    if (!card.length) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const column = await loadColumn(card[0].columnId);
    if (!canEditCard(user, card[0], column)) {
      return c.json({ error: 'Недостаточно прав для изменения карточки' }, 403);
    }

    const existing = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.cardId, cardId))
      .execute();

    const now = new Date();
    const newSubtask = {
      id: crypto.randomUUID(),
      cardId,
      title: data.title,
      completed: false,
      position: existing.length,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(taskCardSubtasks).values(newSubtask).execute();

    // Если на карточке уже стоит «выполнено», а появляется новый невыполненный подпункт —
    // карточка должна перестать быть «выполнена», т.к. чек-лист более не полон.
    if (card[0].completed) {
      await db
        .update(taskCards)
        .set({ completed: false, updatedAt: now })
        .where(eq(taskCards.id, cardId))
        .execute();
    }

    return c.json({ subtask: serializeSubtask(newSubtask as typeof taskCardSubtasks.$inferSelect) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error creating subtask:', error);
    return c.json({ error: 'Не удалось добавить подпункт' }, 500);
  }
});

// Обновление подпункта (заголовок/выполнение/позиция). Каскад на родительскую карточку:
// если все подпункты выполнены — карточка completed=true; если есть невыполненные — completed=false.
tasks.put('/subtasks/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const subtaskId = c.req.param('id');
    const body = await c.req.json();
    const data = updateSubtaskSchema.parse(body);

    const existing = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.id, subtaskId))
      .execute();
    if (!existing.length) {
      return c.json({ error: 'Подпункт не найден' }, 404);
    }

    const card = await loadCard(existing[0].cardId);
    const column = card ? await loadColumn(card.columnId) : null;
    if (!card || !canEditCard(user, card, column)) {
      return c.json({ error: 'Недостаточно прав для изменения подпункта' }, 403);
    }

    const now = new Date();
    const updateData: Partial<typeof taskCardSubtasks.$inferInsert> = { updatedAt: now };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.position !== undefined) updateData.position = data.position;

    await db
      .update(taskCardSubtasks)
      .set(updateData)
      .where(eq(taskCardSubtasks.id, subtaskId))
      .execute();

    const cardId = existing[0].cardId;

    // Каскадно пересчитываем completed у родительской карточки, если изменился флаг выполнения.
    let parentCompleted: boolean | null = null;
    if (data.completed !== undefined) {
      const siblings = await db
        .select()
        .from(taskCardSubtasks)
        .where(eq(taskCardSubtasks.cardId, cardId))
        .execute();
      if (siblings.length > 0) {
        const allDone = siblings.every((s) => !!s.completed);
        parentCompleted = allDone;
        await db
          .update(taskCards)
          .set({ completed: allDone, updatedAt: now })
          .where(eq(taskCards.id, cardId))
          .execute();
      }
    }

    const updated = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.id, subtaskId))
      .execute();

    return c.json({
      subtask: serializeSubtask(updated[0]),
      parentCardCompleted: parentCompleted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Ошибка валидации', details: error.errors }, 400);
    }
    console.error('Error updating subtask:', error);
    return c.json({ error: 'Не удалось обновить подпункт' }, 500);
  }
});

// Удаление подпункта
tasks.delete('/subtasks/:id', async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const subtaskId = c.req.param('id');
    const existing = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.id, subtaskId))
      .execute();
    if (!existing.length) {
      return c.json({ error: 'Подпункт не найден' }, 404);
    }
    const cardId = existing[0].cardId;
    const card = await loadCard(cardId);
    const column = card ? await loadColumn(card.columnId) : null;
    if (!card || !canEditCard(user, card, column)) {
      return c.json({ error: 'Недостаточно прав для изменения подпункта' }, 403);
    }
    await db.delete(taskCardSubtasks).where(eq(taskCardSubtasks.id, subtaskId)).execute();

    // После удаления тоже пересчитываем completed карточки.
    const siblings = await db
      .select()
      .from(taskCardSubtasks)
      .where(eq(taskCardSubtasks.cardId, cardId))
      .execute();
    if (siblings.length > 0) {
      const allDone = siblings.every((s) => !!s.completed);
      await db
        .update(taskCards)
        .set({ completed: allDone, updatedAt: new Date() })
        .where(eq(taskCards.id, cardId))
        .execute();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return c.json({ error: 'Не удалось удалить подпункт' }, 500);
  }
});

export { tasks };
