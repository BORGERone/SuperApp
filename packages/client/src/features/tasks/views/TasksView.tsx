import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Search, Users } from 'lucide-react';
import { useAuthStore } from '../../../store';
import {
  useAddTaskComment,
  useCreateTaskBoard,
  useCreateTaskCard,
  useCreateTaskColumn,
  useDeleteTaskBoard,
  useDeleteTaskCard,
  useDeleteTaskColumn,
  useMoveTaskCard,
  useTaskBoards,
  useUpdateTaskCard,
  useUpdateTaskColumn,
} from '../api/tasksApi';
import { ColumnDraft, TaskCard, TaskColumn, TaskDraft } from '../models/tasksModel';
import { matchesCard, useTasksStore } from '../viewmodels/tasksViewModel';
import { BoardList } from './BoardList';
import { KanbanBoard } from './KanbanBoard';

const emptyTaskDraft: TaskDraft = {
  title: '',
  description: '',
  assigneeIds: [],
  priority: 'medium',
  labels: '',
  dueDate: '',
};

const emptyColumnDraft: ColumnDraft = {
  name: '',
  deadline: '',
};

const getCurrentUserId = () => {
  const userText = localStorage.getItem('user');

  if (!userText) {
    return '';
  }

  try {
    const user = JSON.parse(userText) as { id?: string; username?: string };
    return user.id || user.username || '';
  } catch {
    return '';
  }
};

export const TasksView: React.FC = () => {
  const { activeBoardId, searchQuery, assigneeFilter, setActiveBoard, setSearchQuery, setAssigneeFilter } = useTasksStore();
  const { currentUser, isAdmin } = useAuthStore();
  const currentUserId = getCurrentUserId();
  const userName = currentUser ?? 'Пользователь';

  const { data: boards = [], isLoading, isError } = useTaskBoards();
  const createBoardMutation = useCreateTaskBoard();
  const deleteBoardMutation = useDeleteTaskBoard();
  const createColumnMutation = useCreateTaskColumn();
  const updateColumnMutation = useUpdateTaskColumn();
  const deleteColumnMutation = useDeleteTaskColumn();
  const createCardMutation = useCreateTaskCard();
  const updateCardMutation = useUpdateTaskCard();
  const moveCardMutation = useMoveTaskCard();
  const deleteCardMutation = useDeleteTaskCard();
  const addCommentMutation = useAddTaskComment();

  const activeBoard = boards.find(board => board.id === activeBoardId) ?? boards[0];
  const visibleCards = activeBoard
    ? activeBoard.cards
        .filter(card => matchesCard(card, searchQuery, assigneeFilter))
        .sort((left, right) => left.order - right.order)
    : [];

  const [boardDraft, setBoardDraft] = useState({ name: '', description: '' });
  const [columnDraft, setColumnDraft] = useState<ColumnDraft>(emptyColumnDraft);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [activeComposerColumnId, setActiveComposerColumnId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBoardId && boards[0]) {
      setActiveBoard(boards[0].id);
    }
  }, [activeBoardId, boards, setActiveBoard]);

  const assignees = useMemo(
    () =>
      activeBoard
        ? Array.from(new Set(activeBoard.cards.flatMap(card => card.assigneeIds).filter(Boolean)))
        : [],
    [activeBoard]
  );

  const isMutating =
    createBoardMutation.isPending ||
    deleteBoardMutation.isPending ||
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    deleteColumnMutation.isPending ||
    createCardMutation.isPending ||
    updateCardMutation.isPending ||
    moveCardMutation.isPending ||
    deleteCardMutation.isPending ||
    addCommentMutation.isPending;

  const handleCreateBoard = async () => {
    if (!boardDraft.name.trim()) {
      return;
    }

    const board = await createBoardMutation.mutateAsync(boardDraft);
    setActiveBoard(board.id);
    setBoardDraft({ name: '', description: '' });
  };

  const handleDeleteBoard = async (boardId: string) => {
    const board = boards.find(item => item.id === boardId);

    if (!board || !window.confirm(`Удалить доску «${board.name}» вместе с колонками и карточками?`)) {
      return;
    }

    await deleteBoardMutation.mutateAsync(boardId);
    const nextBoard = boards.find(item => item.id !== boardId);
    setActiveBoard(nextBoard?.id ?? '');
  };

  const handleCreateColumn = async () => {
    if (!activeBoard || !columnDraft.name.trim()) {
      return;
    }

    await createColumnMutation.mutateAsync({ boardId: activeBoard.id, draft: columnDraft });
    setColumnDraft(emptyColumnDraft);
  };

  const handleUpdateColumn = (column: TaskColumn, draft: ColumnDraft) => {
    if (!draft.name.trim() || (draft.name === column.name && draft.deadline === column.deadline)) {
      return;
    }

    updateColumnMutation.mutate({ columnId: column.id, draft });
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (window.confirm('Удалить колонку вместе с карточками?')) {
      await deleteColumnMutation.mutateAsync(columnId);
    }
  };

  const handleOpenComposer = (columnId: string) => {
    setTaskDraft({ ...emptyTaskDraft, assigneeIds: currentUser ? [currentUser] : [] });
    setActiveComposerColumnId(columnId);
  };

  const handleCreateCard = async (columnId: string) => {
    if (!taskDraft.title.trim()) {
      return;
    }

    await createCardMutation.mutateAsync({ columnId, draft: taskDraft });
    setTaskDraft(emptyTaskDraft);
    setActiveComposerColumnId(null);
  };

  const handleEditCard = (card: TaskCard, draft: TaskDraft) => {
    updateCardMutation.mutate({ cardId: card.id, draft });
  };

  const handleDeleteCard = (cardId: string) => {
    if (window.confirm('Удалить эту карточку?')) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const handleMoveCard = (cardId: string, columnId: string) => {
    moveCardMutation.mutate({ cardId, columnId });
  };

  const handleToggleCompleted = (card: TaskCard) => {
    updateCardMutation.mutate({ cardId: card.id, draft: { isCompleted: !card.isCompleted } });
  };

  const handleAddComment = (cardId: string, body: string) => {
    addCommentMutation.mutate({ cardId, body });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="glass-card rounded-3xl p-8 text-center text-gray-600">Загрузка задач...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="glass-card rounded-3xl p-8 text-center text-red-600">Не удалось загрузить задачи с сервера.</div>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="p-8">
        <div className="glass-card rounded-3xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Задачи</h1>
          <p className="mt-2 text-gray-500">Создайте первую доску для работы с задачами.</p>
          <div className="mx-auto mt-6 max-w-md space-y-3">
            <input
              value={boardDraft.name}
              onChange={event => setBoardDraft({ ...boardDraft, name: event.target.value })}
              placeholder="Название доски"
              className="glass-input w-full rounded-xl px-4 py-3"
            />
            <textarea
              value={boardDraft.description}
              onChange={event => setBoardDraft({ ...boardDraft, description: event.target.value })}
              placeholder="Описание"
              className="glass-input w-full resize-none rounded-xl px-4 py-3"
              rows={3}
            />
            <button
              type="button"
              onClick={handleCreateBoard}
              disabled={!boardDraft.name.trim() || isMutating}
              className="btn-glass w-full rounded-xl px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Создать доску
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-indigo-500">Задачи</p>
          <h1 className="mt-2 text-4xl font-black text-gray-900">Задачи</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Серверные доски с произвольными колонками, дедлайнами, ответственными, комментариями и перемещением карточек.
          </p>
        </div>

        <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Поиск карточек"
              className="glass-input w-64 rounded-xl py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={assigneeFilter}
              onChange={event => setAssigneeFilter(event.target.value)}
              className="glass-input w-56 rounded-xl py-2 pl-9 pr-3 text-sm"
            >
              <option value="">Все ответственные</option>
              {assignees.map(assignee => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <BoardList
          boards={boards}
          activeBoardId={activeBoard.id}
          boardDraft={boardDraft}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onBoardDraftChange={setBoardDraft}
          onCreateBoard={handleCreateBoard}
          onSelectBoard={setActiveBoard}
          onDeleteBoard={handleDeleteBoard}
        />

        <section className="min-w-0">
          <div className="glass-card mb-4 rounded-3xl p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{activeBoard.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{activeBoard.description || 'Описание доски не задано.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold text-gray-600">
                  <Users size={13} />
                  Владелец: {activeBoard.ownerId === currentUserId ? userName : activeBoard.ownerId}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold text-gray-600">
                  Участников: {activeBoard.members.length}
                </span>
                {isMutating && <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">Синхронизация...</span>}
              </div>
            </div>
          </div>

          <KanbanBoard
            board={activeBoard}
            cards={visibleCards}
            taskDraft={taskDraft}
            columnDraft={columnDraft}
            activeComposerColumnId={activeComposerColumnId}
            currentUserId={currentUserId}
            currentUserName={userName}
            isAdmin={isAdmin}
            onTaskDraftChange={setTaskDraft}
            onColumnDraftChange={setColumnDraft}
            onOpenComposer={handleOpenComposer}
            onCloseComposer={() => setActiveComposerColumnId(null)}
            onCreateCard={handleCreateCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
            onToggleCompleted={handleToggleCompleted}
            onAddComment={handleAddComment}
            onCreateColumn={handleCreateColumn}
            onUpdateColumn={handleUpdateColumn}
            onDeleteColumn={handleDeleteColumn}
          />
        </section>
      </div>
    </div>
  );
};
