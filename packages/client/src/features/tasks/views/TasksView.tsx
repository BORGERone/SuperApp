import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  useTaskCards,
  useTaskColumns,
} from '../api/tasksApi';
import { TaskCard, TaskColumn } from '../models/tasksModel';
import { TaskColumnView } from '../components/TaskColumnView';
import { AddColumnForm } from '../components/AddColumnForm';
import { CardModal } from '../components/CardModal';
import { useQueryClient } from '@tanstack/react-query';

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

export const TasksView: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: columns = [], isLoading: columnsLoading, error: columnsError } = useTaskColumns();
  const { data: cards = [], isLoading: cardsLoading, error: cardsError } = useTaskCards();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readCurrentUserId());

  useEffect(() => {
    setCurrentUserId(readCurrentUserId());
  }, []);

  const cardsByColumn = useMemo(() => {
    const grouped = new Map<string, TaskCard[]>();
    cards.forEach((card) => {
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
  }, [cards]);

  // Подсчёт количества комментариев для отображения на карточках (по кешу запросов)
  const commentsCountByCard = useMemo(() => {
    const result: Record<string, number> = {};
    const cache = queryClient.getQueryCache().findAll({ queryKey: ['task-comments'] });
    cache.forEach((entry) => {
      const key = entry.queryKey;
      if (key.length >= 2 && typeof key[1] === 'string') {
        const data = entry.state.data;
        if (Array.isArray(data)) {
          result[key[1] as string] = data.length;
        }
      }
    });
    return result;
  }, [queryClient, cards]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  const isLoading = columnsLoading || cardsLoading;
  const error = columnsError || cardsError;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['task-columns'] });
    queryClient.invalidateQueries({ queryKey: ['task-cards'] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 pb-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Задачи</h1>
          <p className="text-sm text-gray-600 mt-1">
            Создавайте колонки, ставьте дедлайны и обсуждайте задачи с командой
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 border border-gray-200 text-gray-700 hover:bg-white"
          aria-label="Обновить"
        >
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="mx-6 mb-3 bg-red-100/80 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          Не удалось загрузить данные задач. Проверьте подключение к серверу.
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 px-6 pb-6 min-h-full items-start">
          {isLoading && columns.length === 0 ? (
            <div className="text-gray-600 py-10">Загрузка колонок...</div>
          ) : (
            columns
              .slice()
              .sort((a, b) => {
                if (a.position !== b.position) return a.position - b.position;
                return a.createdAt.localeCompare(b.createdAt);
              })
              .map((column: TaskColumn) => (
                <TaskColumnView
                  key={column.id}
                  column={column}
                  cards={cardsByColumn.get(column.id) ?? []}
                  commentsCountByCard={commentsCountByCard}
                  onOpenCard={(card) => setSelectedCardId(card.id)}
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
    </div>
  );
};
