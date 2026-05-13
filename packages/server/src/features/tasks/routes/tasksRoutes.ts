import { Context, Hono } from 'hono';
import { z } from 'zod';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db';
import { boards, taskColumns, taskComments, tasks, users } from '../../../db/schema';
import { authMiddleware } from '../../../shared/middleware/auth';

const tasksRouter = new Hono();

tasksRouter.use('*', authMiddleware);

const boardSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(''),
});

const columnSchema = z.object({
  name: z.string().min(1).max(120),
  deadline: z.string().optional().default(''),
});

const updateColumnSchema = columnSchema.partial();

const cardSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().default(''),
  assigneeIds: z.array(z.string()).optional().default([]),
  labels: z.array(z.string()).optional().default([]),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.string().optional().default(''),
});

const updateCardSchema = cardSchema.partial().extend({
  columnId: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

const moveCardSchema = z.object({
  columnId: z.string().min(1),
});

const commentSchema = z.object({
  body: z.string().min(1).max(1000),
});

type AuthUser = {
  userId: string;
  email: string;
  role: 'admin' | 'user';
};

const getAuthUser = (c: Context) => c.get('user' as never) as AuthUser;

const now = () => new Date();

const parseJsonArray = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializeJsonArray = (value: string[]) => JSON.stringify(Array.from(new Set(value.map(item => item.trim()).filter(Boolean))));

const getBoard = async (boardId: string) => {
  const result = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  return result[0] ?? null;
};

const getColumn = async (columnId: string) => {
  const result = await db.select().from(taskColumns).where(eq(taskColumns.id, columnId)).limit(1);
  const column = result[0];

  if (!column || typeof column.order === 'number') {
    return column ?? null;
  }

  return { ...column, order: Number(column.order) };
};

const getTask = async (taskId: string) => {
  const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return result[0] ?? null;
};

const ensureBoardAccess = async (boardId: string, user: AuthUser) => {
  const board = await getBoard(boardId);

  if (!board) {
    return null;
  }

  if (user.role !== 'admin' && board.ownerId !== user.userId) {
    return null;
  }

  return board;
};

const ensureColumnAccess = async (columnId: string, user: AuthUser) => {
  const column = await getColumn(columnId);

  if (!column) {
    return null;
  }

  const board = await ensureBoardAccess(column.boardId, user);
  return board ? column : null;
};

const ensureTaskAccess = async (taskId: string, user: AuthUser) => {
  const task = await getTask(taskId);

  if (!task) {
    return null;
  }

  const board = await ensureBoardAccess(task.boardId, user);
  return board ? task : null;
};

const boardMembers = (boardOwnerId: string, cards: Array<typeof tasks.$inferSelect>) =>
  Array.from(new Set([boardOwnerId, ...cards.flatMap(card => parseJsonArray(card.assigneeIds))]));

const formatComments = async (taskIds: string[]) => {
  if (taskIds.length === 0) {
    return new Map<string, unknown[]>();
  }

  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      updatedAt: taskComments.updatedAt,
      authorId: taskComments.authorId,
      authorName: users.username,
    })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.authorId, users.id))
    .where(inArray(taskComments.taskId, taskIds))
    .orderBy(asc(taskComments.createdAt));

  const grouped = new Map<string, unknown[]>();

  rows.forEach(comment => {
    const list = grouped.get(comment.taskId) ?? [];
    list.push({
      id: comment.id,
      taskId: comment.taskId,
      body: comment.body,
      authorId: comment.authorId,
      authorName: comment.authorName ?? comment.authorId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
    grouped.set(comment.taskId, list);
  });

  return grouped;
};

const formatBoard = async (board: typeof boards.$inferSelect) => {
  const columns = await db
    .select()
    .from(taskColumns)
    .where(eq(taskColumns.boardId, board.id))
    .orderBy(asc(taskColumns.order), asc(taskColumns.createdAt));

  const cards = await db
    .select()
    .from(tasks)
    .where(eq(tasks.boardId, board.id))
    .orderBy(asc(tasks.order), asc(tasks.createdAt));

  const commentMap = await formatComments(cards.map(card => card.id));

  const normalizedColumns = columns.map(column => ({
    ...column,
    order: typeof column.order === 'number' ? column.order : Number(column.order),
  }));
  const normalizedCards = cards.map(card => ({
    ...card,
    order: typeof card.order === 'number' ? card.order : Number(card.order),
  }));

  return {
    id: board.id,
    name: board.name,
    description: board.description ?? '',
    ownerId: board.ownerId,
    members: boardMembers(board.ownerId, normalizedCards),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    columns: normalizedColumns.map(column => ({
      id: column.id,
      boardId: column.boardId,
      name: column.name,
      deadline: column.deadline ?? '',
      order: column.order,
      ownerId: column.ownerId,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
    })),
    cards: normalizedCards.map(card => ({
      id: card.id,
      boardId: card.boardId,
      columnId: card.columnId ?? '',
      title: card.title,
      description: card.description ?? '',
      assigneeIds: parseJsonArray(card.assigneeIds),
      labels: parseJsonArray(card.labels),
      priority: card.priority,
      dueDate: card.dueDate ?? '',
      isCompleted: card.isCompleted,
      order: card.order,
      ownerId: card.ownerId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      comments: commentMap.get(card.id) ?? [],
    })),
  };
};

tasksRouter.get('/boards', async c => {
  try {
    const user = getAuthUser(c);
    const rows =
      user.role === 'admin'
        ? await db.select().from(boards).orderBy(asc(boards.createdAt))
        : await db.select().from(boards).where(eq(boards.ownerId, user.userId)).orderBy(asc(boards.createdAt));

    const payload = await Promise.all(rows.map(formatBoard));
    return c.json({ boards: payload });
  } catch (error) {
    console.error('Ошибка получения досок задач:', error);
    return c.json({ error: 'Не удалось получить доски задач' }, 500);
  }
});

tasksRouter.post('/boards', async c => {
  try {
    const user = getAuthUser(c);
    const draft = boardSchema.parse(await c.req.json());
    const id = crypto.randomUUID();
    const createdAt = now();

    await db.insert(boards).values({
      id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      ownerId: user.userId,
      createdAt,
      updatedAt: createdAt,
    });

    const board = await getBoard(id);
    return c.json({ board: await formatBoard(board!) }, 201);
  } catch (error) {
    console.error('Ошибка создания доски задач:', error);
    return c.json({ error: 'Не удалось создать доску задач' }, 500);
  }
});

tasksRouter.put('/boards/:boardId', async c => {
  try {
    const user = getAuthUser(c);
    const boardId = c.req.param('boardId');
    const board = await ensureBoardAccess(boardId, user);

    if (!board) {
      return c.json({ error: 'Доска не найдена' }, 404);
    }

    const draft = boardSchema.partial().parse(await c.req.json());
    await db
      .update(boards)
      .set({
        ...(draft.name !== undefined ? { name: draft.name.trim() } : {}),
        ...(draft.description !== undefined ? { description: draft.description.trim() } : {}),
        updatedAt: now(),
      })
      .where(eq(boards.id, boardId));

    return c.json({ board: await formatBoard((await getBoard(boardId))!) });
  } catch (error) {
    console.error('Ошибка обновления доски задач:', error);
    return c.json({ error: 'Не удалось обновить доску задач' }, 500);
  }
});

tasksRouter.delete('/boards/:boardId', async c => {
  try {
    const user = getAuthUser(c);
    const boardId = c.req.param('boardId');
    const board = await ensureBoardAccess(boardId, user);

    if (!board) {
      return c.json({ error: 'Доска не найдена' }, 404);
    }

    const boardTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.boardId, boardId));
    const taskIds = boardTasks.map(task => task.id);

    if (taskIds.length > 0) {
      await db.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
    }

    await db.delete(tasks).where(eq(tasks.boardId, boardId));
    await db.delete(taskColumns).where(eq(taskColumns.boardId, boardId));
    await db.delete(boards).where(eq(boards.id, boardId));

    return c.json({ message: 'Доска удалена' });
  } catch (error) {
    console.error('Ошибка удаления доски задач:', error);
    return c.json({ error: 'Не удалось удалить доску задач' }, 500);
  }
});

tasksRouter.post('/boards/:boardId/columns', async c => {
  try {
    const user = getAuthUser(c);
    const boardId = c.req.param('boardId');
    const board = await ensureBoardAccess(boardId, user);

    if (!board) {
      return c.json({ error: 'Доска не найдена' }, 404);
    }

    const draft = columnSchema.parse(await c.req.json());
    const existingColumns = await db.select().from(taskColumns).where(eq(taskColumns.boardId, boardId));
    const id = crypto.randomUUID();
    const createdAt = now();

    await db.insert(taskColumns).values({
      id,
      boardId,
      name: draft.name.trim(),
      deadline: draft.deadline || null,
      order: existingColumns.length,
      ownerId: user.userId,
      createdAt,
      updatedAt: createdAt,
    });

    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, boardId));
    return c.json({ board: await formatBoard((await getBoard(boardId))!) }, 201);
  } catch (error) {
    console.error('Ошибка создания колонки задач:', error);
    return c.json({ error: 'Не удалось создать колонку задач' }, 500);
  }
});

tasksRouter.put('/columns/:columnId', async c => {
  try {
    const user = getAuthUser(c);
    const columnId = c.req.param('columnId');
    const column = await ensureColumnAccess(columnId, user);

    if (!column) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const draft = updateColumnSchema.parse(await c.req.json());
    await db
      .update(taskColumns)
      .set({
        ...(draft.name !== undefined ? { name: draft.name.trim() } : {}),
        ...(draft.deadline !== undefined ? { deadline: draft.deadline || null } : {}),
        updatedAt: now(),
      })
      .where(eq(taskColumns.id, columnId));

    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, column.boardId));
    return c.json({ board: await formatBoard((await getBoard(column.boardId))!) });
  } catch (error) {
    console.error('Ошибка обновления колонки задач:', error);
    return c.json({ error: 'Не удалось обновить колонку задач' }, 500);
  }
});

tasksRouter.delete('/columns/:columnId', async c => {
  try {
    const user = getAuthUser(c);
    const columnId = c.req.param('columnId');
    const column = await ensureColumnAccess(columnId, user);

    if (!column) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const columnTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.columnId, columnId));
    const taskIds = columnTasks.map(task => task.id);

    if (taskIds.length > 0) {
      await db.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
    }

    await db.delete(tasks).where(eq(tasks.columnId, columnId));
    await db.delete(taskColumns).where(eq(taskColumns.id, columnId));
    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, column.boardId));

    return c.json({ board: await formatBoard((await getBoard(column.boardId))!) });
  } catch (error) {
    console.error('Ошибка удаления колонки задач:', error);
    return c.json({ error: 'Не удалось удалить колонку задач' }, 500);
  }
});

tasksRouter.post('/columns/:columnId/cards', async c => {
  try {
    const user = getAuthUser(c);
    const columnId = c.req.param('columnId');
    const column = await ensureColumnAccess(columnId, user);

    if (!column) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const draft = cardSchema.parse(await c.req.json());
    const existingCards = await db.select().from(tasks).where(and(eq(tasks.boardId, column.boardId), eq(tasks.columnId, columnId)));
    const id = crypto.randomUUID();
    const createdAt = now();

    await db.insert(tasks).values({
      id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      boardId: column.boardId,
      columnId,
      assigneeIds: serializeJsonArray(draft.assigneeIds),
      labels: serializeJsonArray(draft.labels),
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      isCompleted: false,
      order: existingCards.length,
      ownerId: user.userId,
      createdAt,
      updatedAt: createdAt,
    });

    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, column.boardId));
    return c.json({ board: await formatBoard((await getBoard(column.boardId))!) }, 201);
  } catch (error) {
    console.error('Ошибка создания карточки задачи:', error);
    return c.json({ error: 'Не удалось создать карточку задачи' }, 500);
  }
});

tasksRouter.put('/cards/:cardId', async c => {
  try {
    const user = getAuthUser(c);
    const cardId = c.req.param('cardId');
    const card = await ensureTaskAccess(cardId, user);

    if (!card) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const draft = updateCardSchema.parse(await c.req.json());

    if (draft.columnId && draft.columnId !== card.columnId) {
      const targetColumn = await ensureColumnAccess(draft.columnId, user);

      if (!targetColumn || targetColumn.boardId !== card.boardId) {
        return c.json({ error: 'Колонка не найдена' }, 404);
      }
    }

    await db
      .update(tasks)
      .set({
        ...(draft.title !== undefined ? { title: draft.title.trim() } : {}),
        ...(draft.description !== undefined ? { description: draft.description.trim() } : {}),
        ...(draft.columnId !== undefined ? { columnId: draft.columnId } : {}),
        ...(draft.assigneeIds !== undefined ? { assigneeIds: serializeJsonArray(draft.assigneeIds) } : {}),
        ...(draft.labels !== undefined ? { labels: serializeJsonArray(draft.labels) } : {}),
        ...(draft.priority !== undefined ? { priority: draft.priority } : {}),
        ...(draft.dueDate !== undefined ? { dueDate: draft.dueDate || null } : {}),
        ...(draft.isCompleted !== undefined ? { isCompleted: draft.isCompleted } : {}),
        updatedAt: now(),
      })
      .where(eq(tasks.id, cardId));

    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, card.boardId));
    return c.json({ board: await formatBoard((await getBoard(card.boardId))!) });
  } catch (error) {
    console.error('Ошибка обновления карточки задачи:', error);
    return c.json({ error: 'Не удалось обновить карточку задачи' }, 500);
  }
});

tasksRouter.put('/cards/:cardId/move', async c => {
  try {
    const user = getAuthUser(c);
    const cardId = c.req.param('cardId');
    const card = await ensureTaskAccess(cardId, user);

    if (!card) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const draft = moveCardSchema.parse(await c.req.json());
    const column = await ensureColumnAccess(draft.columnId, user);

    if (!column || column.boardId !== card.boardId) {
      return c.json({ error: 'Колонка не найдена' }, 404);
    }

    const targetCards = await db.select().from(tasks).where(and(eq(tasks.boardId, card.boardId), eq(tasks.columnId, draft.columnId)));

    await db
      .update(tasks)
      .set({ columnId: draft.columnId, order: targetCards.length, updatedAt: now() })
      .where(eq(tasks.id, cardId));
    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, card.boardId));

    return c.json({ board: await formatBoard((await getBoard(card.boardId))!) });
  } catch (error) {
    console.error('Ошибка перемещения карточки задачи:', error);
    return c.json({ error: 'Не удалось переместить карточку задачи' }, 500);
  }
});

tasksRouter.delete('/cards/:cardId', async c => {
  try {
    const user = getAuthUser(c);
    const cardId = c.req.param('cardId');
    const card = await ensureTaskAccess(cardId, user);

    if (!card) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    await db.delete(taskComments).where(eq(taskComments.taskId, cardId));
    await db.delete(tasks).where(eq(tasks.id, cardId));
    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, card.boardId));

    return c.json({ board: await formatBoard((await getBoard(card.boardId))!) });
  } catch (error) {
    console.error('Ошибка удаления карточки задачи:', error);
    return c.json({ error: 'Не удалось удалить карточку задачи' }, 500);
  }
});

tasksRouter.post('/cards/:cardId/comments', async c => {
  try {
    const user = getAuthUser(c);
    const cardId = c.req.param('cardId');
    const card = await ensureTaskAccess(cardId, user);

    if (!card) {
      return c.json({ error: 'Карточка не найдена' }, 404);
    }

    const draft = commentSchema.parse(await c.req.json());
    const createdAt = now();

    await db.insert(taskComments).values({
      id: crypto.randomUUID(),
      taskId: cardId,
      authorId: user.userId,
      body: draft.body.trim(),
      createdAt,
      updatedAt: createdAt,
    });

    await db.update(tasks).set({ updatedAt: now() }).where(eq(tasks.id, cardId));
    await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, card.boardId));

    return c.json({ board: await formatBoard((await getBoard(card.boardId))!) }, 201);
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    return c.json({ error: 'Не удалось добавить комментарий' }, 500);
  }
});

export default tasksRouter;
