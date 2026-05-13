import React, { useMemo, useState } from 'react';
import { Filter, Search, Users } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { TaskCard, TaskDraft, TaskStatus } from '../models/tasksModel';
import { useTasksStore } from '../viewmodels/tasksViewModel';
import { BoardList } from './BoardList';
import { KanbanBoard } from './KanbanBoard';

const emptyTaskDraft: TaskDraft = {
  title: '',
  description: '',
  assignee: '',
  priority: 'medium',
  labels: '',
  dueDate: '',
};

export const TasksView: React.FC = () => {
  const {
    boards,
    cards: allCards,
    activeBoardId,
    searchQuery,
    assigneeFilter,
    setActiveBoard,
    setSearchQuery,
    setAssigneeFilter,
    createBoard,
    deleteBoard,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    getBoardCards,
  } = useTasksStore();
  const { currentUser, isAdmin } = useAuthStore();
  const userName = currentUser ?? 'user';
  const activeBoard = boards.find(board => board.id === activeBoardId) ?? boards[0];
  const visibleCards = activeBoard ? getBoardCards(activeBoard.id) : [];
  const [boardDraft, setBoardDraft] = useState({ name: '', description: '' });
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [activeComposerStatus, setActiveComposerStatus] = useState<TaskStatus | null>(null);

  const assignees = useMemo(
    () =>
      Array.from(
        new Set(
          allCards
            .filter(card => !activeBoard || card.boardId === activeBoard.id)
            .map(card => card.assignee)
            .filter(Boolean)
        )
      ),
    [activeBoard?.id, allCards]
  );

  const handleCreateBoard = () => {
    if (!boardDraft.name.trim()) {
      return;
    }

    createBoard(boardDraft, userName);
    setBoardDraft({ name: '', description: '' });
  };

  const handleDeleteBoard = (boardId: string) => {
    const board = boards.find(item => item.id === boardId);

    if (!board || !window.confirm(`Удалить доску «${board.name}» вместе с карточками?`)) {
      return;
    }

    deleteBoard(boardId);
  };

  const handleOpenComposer = (status: TaskStatus) => {
    setTaskDraft({ ...emptyTaskDraft, assignee: userName });
    setActiveComposerStatus(status);
  };

  const handleCreateCard = (status: TaskStatus) => {
    if (!activeBoard || !taskDraft.title.trim()) {
      return;
    }

    createCard(activeBoard.id, status, taskDraft, userName);
    setTaskDraft(emptyTaskDraft);
    setActiveComposerStatus(null);
  };

  const handleEditCard = (card: TaskCard, draft: TaskDraft) => {
    updateCard(card.id, draft);
  };

  const handleDeleteCard = (cardId: string) => {
    if (window.confirm('Удалить эту карточку?')) {
      deleteCard(cardId);
    }
  };

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
            <button
              type="button"
              onClick={handleCreateBoard}
              disabled={!boardDraft.name.trim()}
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
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-indigo-500">SuperApp Tasks</p>
          <h1 className="mt-2 text-4xl font-black text-gray-900">Задачи</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Kanban-доски с карточками, исполнителями, приоритетами, поиском и drag & drop между колонками.
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
              <option value="">Все исполнители</option>
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
          currentUser={userName}
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
                {activeBoard.members.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold text-gray-600"
                  >
                    <Users size={13} />
                    {member}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <KanbanBoard
            board={activeBoard}
            cards={visibleCards}
            taskDraft={taskDraft}
            activeComposerStatus={activeComposerStatus}
            currentUser={userName}
            isAdmin={isAdmin}
            onTaskDraftChange={setTaskDraft}
            onOpenComposer={handleOpenComposer}
            onCloseComposer={() => setActiveComposerStatus(null)}
            onCreateCard={handleCreateCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onMoveCard={moveCard}
          />
        </section>
      </div>
    </div>
  );
};
