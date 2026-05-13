import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Filter, RefreshCw, Search, Users } from 'lucide-react';
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
import { CardModal } from '../components/CardModal';
import { CardDragProvider } from '../dnd/CardDragContext';
import { useUsers } from '../../auth/api/usersApi';

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
  assigneeFilter: string,
): boolean {
  const trimmedSearch = searchQuery.trim().toLowerCase();
  if (trimmedSearch) {
    const haystack = `${card.title}\n${card.description}`.toLowerCase();
    if (!haystack.includes(trimmedSearch)) return false;
  }
  if (assigneeFilter && !card.assignees.includes(assigneeFilter)) return false;
  return true;
}

export const TasksView: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: columns = [], isLoading: columnsLoading, error: columnsError } = useTaskColumns();
  const { data: cards = [], isLoading: cardsLoading, error: cardsError } = useTaskCards();
  const { data: archivedColumns = [] } = useArchivedTaskColumns();
  const { data: users = [] } = useUsers();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readCurrentUserId());
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const mutatingCount = useIsMutating();
  const isSyncing = mutatingCount > 0;

  useEffect(() => {
    setCurrentUserId(readCurrentUserId());
  }, []);

  const userMap = useMemo(() => {
    const map = new Map<string, { username: string; email: string }>();
    (users as Array<{ id: string; username: string; email: string }>).forEach((user) =>
      map.set(user.id, user),
    );
    return map;
  }, [users]);

  const visibleCards = useMemo(
    () => cards.filter((card) => matchesCardSearch(card, searchQuery, assigneeFilter)),
    [cards, searchQuery, assigneeFilter],
  );

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

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((card) => card.assignees.forEach((assignee) => set.add(assignee)));
    return Array.from(set);
  }, [cards]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

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

  return (
    <CardDragProvider>
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-indigo-500">Задачи</p>
            <h1 className="mt-2 text-4xl font-black text-gray-900">Задачи</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Серверные доски с произвольными колонками, дедлайнами, ответственными и комментариями. Все изменения мгновенно синхронизируются с сервером.
            </p>
          </div>

          <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
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
            <div className="relative">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="glass-input w-56 rounded-xl py-2 pl-9 pr-3 text-sm"
              >
                <option value="">Все ответственные</option>
                {assigneeOptions.map((assigneeId) => {
                  const user = userMap.get(assigneeId);
                  const label = user?.username || user?.email || assigneeId;
                  return (
                    <option key={assigneeId} value={assigneeId}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
              aria-label="Обновить"
              title="Обновить"
            >
              <RefreshCw size={14} />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              aria-label="Открыть архив"
              title="Открыть архив колонок"
            >
              <Archive size={14} />
              Архив
              {archivedColumns.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-200 px-1.5 text-[10px] font-bold text-amber-800">
                  {archivedColumns.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 font-bold text-gray-600">
            <Users size={13} />
            Колонок: {columns.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 font-bold text-gray-600">
            Карточек: {cards.length}
          </span>
          {isSyncing && (
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600">
              Синхронизация...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 lg:mx-8 mb-3 bg-red-100/80 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          Не удалось загрузить данные задач. Проверьте подключение к серверу.
        </div>
      )}

      <div className="tasks-scroll flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 px-6 lg:px-8 pb-6 min-h-full items-start">
          {isLoading && columns.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center text-gray-600">
              Загрузка задач...
            </div>
          ) : (
            sortedColumns.map((column: TaskColumn) => (
              <TaskColumnView
                key={column.id}
                column={column}
                cards={cardsByColumn.get(column.id) ?? []}
                commentsCountByCard={commentsCountByCard}
                onOpenCard={(card) => setSelectedCardId(card.id)}
                onDropCard={handleDropCard}
              />
            ))
          )}
          <AddColumnForm />
        </div>
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          columns={columns}
          currentUserId={currentUserId}
          onClose={() => setSelectedCardId(null)}
        />
      )}

      {isArchiveOpen && <ArchivePanel onClose={() => setIsArchiveOpen(false)} />}
    </div>
    </CardDragProvider>
  );
};
