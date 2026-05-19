import React, { useEffect, useMemo, useState } from 'react';
import { Archive, RefreshCw, Search, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import {
  cardsCacheKey,
  useArchivedTaskColumns,
  useReorderCards,
  useTaskCards,
  useTaskColumns,
} from '../api/tasksApi';
import { TaskCard, TaskColumn } from '../models/tasksModel';
import { TaskColumnView } from '../components/TaskColumnView';
import { AddColumnForm } from '../components/AddColumnForm';
import { ArchivePanel } from '../components/ArchivePanel';
import { AssigneeFilter } from '../components/AssigneeFilter';
import { CardModal } from '../components/CardModal';
import { CommentModal } from '../components/CommentModal';
import { CardDragProvider } from '../dnd/CardDragContext';
import { useUsers } from '../../auth/api/usersApi';
import { useAuthStore } from '../../../store';

function readCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
      return parsed.id;
    }
    return null;
  } catch {
    return null;
  }
}

function matchesCardSearch(
  card: TaskCard,
  searchQuery: string,
  assigneeFilters: string[],
): boolean {
  const trimmedSearch = searchQuery.trim().toLowerCase();
  if (trimmedSearch) {
    const haystack = `${card.title}\n${card.description}`.toLowerCase();
    if (!haystack.includes(trimmedSearch)) return false;
  }
  // При пустом массиве фильтров показываем всё; иначе карточка проходит, если в assignees
  // присутствует хотя бы один из выбранных пользователей (Мои задачи добавляет currentUserId в фильтр).
  if (assigneeFilters.length > 0) {
    const hit = card.assignees.some((id) => assigneeFilters.includes(id));
    if (!hit) return false;
  }
  return true;
}

export const TasksView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuthStore();
  const { data: columns = [], isLoading: columnsLoading, error: columnsError } = useTaskColumns();
  const { data: cards = [], isLoading: cardsLoading, error: cardsError } = useTaskCards();
  const { data: archivedColumns = [] } = useArchivedTaskColumns();
  const { data: users = [] } = useUsers();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCommentCardId, setSelectedCommentCardId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readCurrentUserId());
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const mutatingCount = useIsMutating();
  const isSyncing = mutatingCount > 0;

  useEffect(() => {
    setCurrentUserId(readCurrentUserId());
  }, []);

  const visibleCards = useMemo(
    () => cards.filter((card) => matchesCardSearch(card, searchQuery, assigneeFilters)),
    [cards, searchQuery, assigneeFilters],
  );

  const isFilterActive = searchQuery.trim().length > 0 || assigneeFilters.length > 0;

  const cardsByColumn = useMemo(() => {
    const grouped = new Map<string, TaskCard[]>();
    visibleCards.forEach((card) => {
      const list = grouped.get(card.columnId) ?? [];
      list.push(card);
      grouped.set(card.columnId, list);
    });
    grouped.forEach((list) => {
      list.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.createdAt.localeCompare(b.createdAt);
      });
    });
    return grouped;
  }, [visibleCards]);

  // Счётчики комментариев приходят прямо в карточках и обновляются динамически
  // при инвалидации запроса карточек после добавления/удаления комментариев.
  const commentsCountByCard = useMemo(() => {
    const result: Record<string, number> = {};
    cards.forEach((card) => {
      result[card.id] = card.commentsCount ?? 0;
    });
    return result;
  }, [cards]);



  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  const selectedCommentCard = useMemo(() => {
    if (!selectedCommentCardId) return null;
    return cards.find((card) => card.id === selectedCommentCardId) ?? null;
  }, [cards, selectedCommentCardId]);

  const handleOpenComments = (card: TaskCard) => {
    setSelectedCommentCardId(card.id);
  };

  const reorderCards = useReorderCards();

  const isLoading = columnsLoading || cardsLoading;
  const error = columnsError || cardsError;

  const handleDropCard = (
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
  ) => {
    const movingCard = cards.find((card) => card.id === cardId);
    if (!movingCard) return;

    const sortByPosition = (list: TaskCard[]) =>
      [...list].sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.createdAt.localeCompare(b.createdAt);
      });

    const sourceColumnId = movingCard.columnId;
    const sameColumn = sourceColumnId === targetColumnId;

    const sourceCards = sortByPosition(
      cards.filter((card) => card.columnId === sourceColumnId),
    );
    const targetCardsBase = sameColumn
      ? sourceCards
      : sortByPosition(cards.filter((card) => card.columnId === targetColumnId));

    const withoutMoving = targetCardsBase.filter((card) => card.id !== cardId);
    const clampedIndex = Math.max(0, Math.min(targetIndex, withoutMoving.length));
    const newTarget = [
      ...withoutMoving.slice(0, clampedIndex),
      movingCard,
      ...withoutMoving.slice(clampedIndex),
    ];

    const updates: Array<{ id: string; columnId: string; position: number }> = [];
    newTarget.forEach((card, index) => {
      // Сравниваем с фактическим текущим состоянием карточки (без переноса).
      const wasInTargetColumn = card.columnId === targetColumnId;
      if (!wasInTargetColumn || card.position !== index) {
        updates.push({ id: card.id, columnId: targetColumnId, position: index });
      }
    });

    let newSource: TaskCard[] | null = null;
    if (!sameColumn) {
      newSource = sourceCards.filter((card) => card.id !== cardId);
      newSource.forEach((card, index) => {
        if (card.position !== index) {
          updates.push({ id: card.id, columnId: sourceColumnId, position: index });
        }
      });
    }

    if (updates.length === 0) return;

    // Оптимистично обновляем кеш реакт-запроса до ответа сервера, чтобы перемещение
    // отображалось мгновенно. Серверный ответ потом перезапишет этот кеш.
    queryClient.setQueryData<TaskCard[]>(cardsCacheKey, (prev) => {
      if (!prev) return prev;
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      return prev.map((card) => {
        const update = updateMap.get(card.id);
        if (!update) return card;
        return { ...card, columnId: update.columnId, position: update.position };
      });
    });

    reorderCards.mutate(updates, {
      onError: (mutationError) => {
        console.error('Не удалось переместить карточку:', mutationError);
        queryClient.invalidateQueries({ queryKey: cardsCacheKey });
      },
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['task-columns'] });
    queryClient.invalidateQueries({ queryKey: ['task-cards'] });
  };

  const sortedColumns = useMemo(
    () =>
      columns
        .slice()
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          return a.createdAt.localeCompare(b.createdAt);
        }),
    [columns],
  );

  // При активном фильтре скрываем колонки, в которых нет подходящих карточек.
  const visibleColumns = useMemo(() => {
    if (!isFilterActive) return sortedColumns;
    return sortedColumns.filter((column) => (cardsByColumn.get(column.id)?.length ?? 0) > 0);
  }, [sortedColumns, cardsByColumn, isFilterActive]);

  return (
    <CardDragProvider>
    <div className="flex flex-col h-full overflow-hidden p-3 gap-3 page-fade-in">
      <div className="glass-deep px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gradient flex items-center gap-2">Задачи</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-app-secondary">{currentUser || 'Пользователь'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 btn-glass-secondary"
            >
              <LogOut size={16} />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск карточек"
                className="glass-input w-64 rounded-xl py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <AssigneeFilter
              users={users as Array<{ id: string; username: string; email: string }>}
              selected={assigneeFilters}
              onChange={setAssigneeFilters}
              currentUserId={currentUserId}
            />
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 btn-glass-secondary text-sm"
              aria-label="Обновить"
              title="Обновить"
            >
              <RefreshCw size={14} />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="flex items-center gap-2 px-3 py-2 btn-glass-secondary text-sm"
              aria-label="Открыть архив"
              title="Открыть архив колонок"
            >
              <Archive size={14} />
              Архив
              {archivedColumns.length > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={{
                    background: 'rgba(var(--color-primary-rgb), 0.18)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {archivedColumns.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-app-secondary">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            <Users size={13} />
            Колонок: {columns.length}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            Карточек: {cards.length}
          </span>
          {isSyncing && (
            <span
              className="rounded-full px-3 py-1 font-semibold"
              style={{
                background: 'rgba(var(--color-primary-rgb), 0.14)',
                color: 'var(--color-primary)',
              }}
            >
              Синхронизация...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100/80 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          Не удалось загрузить данные задач. Проверьте подключение к серверу.
        </div>
      )}

      <div className="tasks-scroll flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 items-stretch flex-nowrap h-full min-h-0">
          {isLoading && columns.length === 0 ? (
            <div className="glass-mid p-8 text-center text-app-secondary">
              Загрузка задач...
            </div>
          ) : (
            <>
              {visibleColumns.map((column: TaskColumn) => (
                <TaskColumnView
                  key={column.id}
                  column={column}
                  cards={cardsByColumn.get(column.id) ?? []}
                  commentsCountByCard={commentsCountByCard}
                  onOpenCard={(card) => setSelectedCardId(card.id)}
                  onOpenComments={handleOpenComments}
                  onDropCard={handleDropCard}
                />
              ))}
              {isFilterActive && visibleColumns.length === 0 && sortedColumns.length > 0 && (
                <div className="glass-mid flex w-[340px] flex-shrink-0 items-center justify-center p-8 text-center text-sm text-app-secondary">
                  Ни одна колонка не содержит карточек, подходящих под фильтр.
                </div>
              )}
            </>
          )}
          {!isFilterActive && <AddColumnForm />}
        </div>
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          columns={columns}
          onClose={() => setSelectedCardId(null)}
        />
      )}

      {selectedCommentCard && (
        <CommentModal
          card={selectedCommentCard}
          currentUserId={currentUserId}
          onClose={() => setSelectedCommentCardId(null)}
        />
      )}

      {isArchiveOpen && <ArchivePanel onClose={() => setIsArchiveOpen(false)} />}
    </div>
    </CardDragProvider>
  );
};
