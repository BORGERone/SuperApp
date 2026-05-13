import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { TaskColumn, TaskCard } from '../models/tasksModel';
import { TaskColumnView } from '../components/TaskColumnView';
import { ColumnEditModal } from '../components/ColumnEditModal';
import { CardEditModal } from '../components/CardEditModal';
import {
  useColumns,
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useUpdateCard,
} from '../api/tasksApi';

export const TasksView: React.FC = () => {
  const {
    data: columns = [],
    isLoading,
    isFetching,
    refetch,
    error,
  } = useColumns();

  const createColumnMutation = useCreateColumn();
  const updateColumnMutation = useUpdateColumn();
  const deleteColumnMutation = useDeleteColumn();
  const updateCardMutation = useUpdateCard();

  const [editingColumn, setEditingColumn] = useState<TaskColumn | null>(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TaskCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskColumn | null>(null);

  const totals = useMemo(() => {
    const allCards = columns.flatMap((c) => c.cards);
    return {
      columns: columns.length,
      cards: allCards.length,
      completed: allCards.filter((c) => c.isCompleted).length,
    };
  }, [columns]);

  const openNewColumnModal = () => {
    setEditingColumn(null);
    setIsColumnModalOpen(true);
  };

  const openEditColumnModal = (column: TaskColumn) => {
    setEditingColumn(column);
    setIsColumnModalOpen(true);
  };

  const handleColumnSubmit = async (input: { name: string; deadline: string | null }) => {
    if (editingColumn) {
      await updateColumnMutation.mutateAsync({
        id: editingColumn.id,
        input,
      });
    } else {
      await createColumnMutation.mutateAsync(input);
    }
  };

  const handleDeleteColumn = async (column: TaskColumn) => {
    const text =
      column.cards.length > 0
        ? `Удалить колонку «${column.name}» вместе с ${column.cards.length} карточками?`
        : `Удалить колонку «${column.name}»?`;
    if (!window.confirm(text)) return;
    try {
      await deleteColumnMutation.mutateAsync(column.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить колонку');
    }
  };

  const openNewCardModal = (column: TaskColumn) => {
    setActiveColumn(column);
    setEditingCard(null);
    setCardModalOpen(true);
  };

  const openEditCardModal = (column: TaskColumn, card: TaskCard) => {
    setActiveColumn(column);
    setEditingCard(card);
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    setCardModalOpen(false);
    setActiveColumn(null);
    setEditingCard(null);
  };

  const handleToggleCardCompleted = async (card: TaskCard, next: boolean) => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        input: { isCompleted: next },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить карточку');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Задачи</h1>
            <p className="text-sm text-gray-500 mt-1">
              Колонок: {totals.columns} · Карточек: {totals.cards} · Выполнено:{' '}
              {totals.completed}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/60 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Обновить
            </button>
            <button
              type="button"
              onClick={openNewColumnModal}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Добавить колонку
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 mb-3">
          <div className="text-sm text-red-600 bg-red-50/70 px-3 py-2 rounded-lg">
            Не удалось получить данные: {error instanceof Error ? error.message : 'ошибка'}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Загрузка...</div>
        ) : columns.length === 0 ? (
          <div className="p-6">
            <div className="glass-card rounded-xl p-8 max-w-lg mx-auto text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Пока нет ни одной колонки
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Создайте свою первую колонку. Назовите её как вам удобно — например,
                «Сделать в мае» или «Разработка в июне». Вы можете создавать любое
                количество колонок и выставлять им дедлайны.
              </p>
              <button
                type="button"
                onClick={openNewColumnModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Создать колонку
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full px-6 pb-6 overflow-x-auto">
            <div className="flex items-stretch gap-4 h-full">
              {columns.map((column) => (
                <TaskColumnView
                  key={column.id}
                  column={column}
                  onAddCard={() => openNewCardModal(column)}
                  onCardClick={(card) => openEditCardModal(column, card)}
                  onToggleCardCompleted={handleToggleCardCompleted}
                  onEditColumn={() => openEditColumnModal(column)}
                  onDeleteColumn={() => handleDeleteColumn(column)}
                />
              ))}
              <button
                type="button"
                onClick={openNewColumnModal}
                className="flex-shrink-0 w-80 h-32 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-white/40 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Добавить колонку
              </button>
            </div>
          </div>
        )}
      </div>

      <ColumnEditModal
        isOpen={isColumnModalOpen}
        column={editingColumn}
        onClose={() => setIsColumnModalOpen(false)}
        onSubmit={handleColumnSubmit}
      />

      <CardEditModal
        isOpen={cardModalOpen}
        card={
          editingCard
            ? columns
                .flatMap((c) => c.cards)
                .find((c) => c.id === editingCard.id) ?? editingCard
            : null
        }
        column={
          activeColumn
            ? columns.find((c) => c.id === activeColumn.id) ?? activeColumn
            : null
        }
        onClose={closeCardModal}
      />
    </div>
  );
};
