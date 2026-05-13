import React, { useEffect, useState } from 'react';
import { Archive, Calendar, Plus, X } from 'lucide-react';
import { TaskCard, TaskColumn, computeDeadlineState } from '../models/tasksModel';
import {
  useArchiveColumn,
  useCreateCard,
  useUpdateColumn,
} from '../api/tasksApi';
import { CardItem } from './CardItem';

interface TaskColumnViewProps {
  column: TaskColumn;
  cards: TaskCard[];
  commentsCountByCard: Record<string, number>;
  onOpenCard: (card: TaskCard) => void;
}

function isoToLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDeadlineShort(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TaskColumnView: React.FC<TaskColumnViewProps> = ({
  column,
  cards,
  commentsCountByCard,
  onOpenCard,
}) => {
  const updateColumn = useUpdateColumn();
  const archiveColumn = useArchiveColumn();
  const createCard = useCreateCard();

  const [editingDeadline, setEditingDeadline] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const [draftDeadline, setDraftDeadline] = useState(isoToLocalInput(column.deadline));
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  useEffect(() => {
    setDraftTitle(column.title);
    setDraftDeadline(isoToLocalInput(column.deadline));
  }, [column.id, column.title, column.deadline]);

  const deadlineState = computeDeadlineState(column.deadline, false);
  const deadlineBadgeClasses =
    deadlineState === 'overdue'
      ? 'bg-red-100 text-red-700'
      : deadlineState === 'today'
        ? 'bg-yellow-100 text-yellow-700'
        : column.deadline
          ? 'bg-blue-50 text-blue-700'
          : 'bg-white/70 text-gray-500';

  const saveTitle = async (nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === column.title) {
      setDraftTitle(column.title);
      return;
    }
    try {
      await updateColumn.mutateAsync({ id: column.id, input: { title: trimmed } });
    } catch (error) {
      console.error('Не удалось переименовать колонку:', error);
      setDraftTitle(column.title);
    }
  };

  const saveDeadline = async (nextDeadline: string) => {
    const nextIso = localInputToIso(nextDeadline);
    if (nextIso === column.deadline) {
      setEditingDeadline(false);
      return;
    }
    try {
      await updateColumn.mutateAsync({ id: column.id, input: { deadline: nextIso } });
      setEditingDeadline(false);
    } catch (error) {
      console.error('Не удалось обновить дедлайн:', error);
      setDraftDeadline(isoToLocalInput(column.deadline));
    }
  };

  const handleArchive = async () => {
    const confirmText =
      cards.length > 0
        ? `Перенести колонку «${column.title}» в архив вместе с ${cards.length} карточками?`
        : `Перенести колонку «${column.title}» в архив?`;
    if (!window.confirm(confirmText)) return;
    try {
      await archiveColumn.mutateAsync(column.id);
    } catch (error) {
      console.error('Не удалось архивировать колонку:', error);
    }
  };

  const handleAddCard = async () => {
    const title = newCardTitle.trim();
    if (!title) return;
    try {
      await createCard.mutateAsync({
        columnId: column.id,
        title,
        description: '',
        deadline: null,
        assignees: [],
      });
      setNewCardTitle('');
      setIsAddingCard(false);
    } catch (error) {
      console.error('Не удалось создать карточку:', error);
    }
  };

  return (
    <section className="glass-card flex w-[340px] flex-shrink-0 flex-col self-start rounded-3xl p-4 max-h-[calc(100vh-220px)]">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={(event) => saveTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'Escape') {
                setDraftTitle(column.title);
                (event.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-gray-900 hover:border-indigo-100 hover:bg-white/60 focus:border-indigo-200 focus:bg-white/80 focus:outline-none"
            aria-label="Название колонки"
            placeholder="Название колонки"
          />
          <div className="mt-1 flex items-center gap-2 text-xs">
            <Calendar size={13} className="text-gray-400" />
            {editingDeadline ? (
              <>
                <input
                  type="datetime-local"
                  autoFocus
                  value={draftDeadline}
                  onChange={(event) => setDraftDeadline(event.target.value)}
                  onBlur={(event) => saveDeadline(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                    if (event.key === 'Escape') {
                      setDraftDeadline(isoToLocalInput(column.deadline));
                      setEditingDeadline(false);
                    }
                  }}
                  className="rounded-lg border border-indigo-200 bg-white/80 px-2 py-1 text-xs focus:outline-none"
                />
                {draftDeadline && (
                  <button
                    type="button"
                    onClick={() => saveDeadline('')}
                    className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                    title="Очистить дедлайн"
                  >
                    <X size={12} />
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftDeadline(isoToLocalInput(column.deadline));
                  setEditingDeadline(true);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${deadlineBadgeClasses}`}
              >
                {column.deadline ? formatDeadlineShort(column.deadline) : 'Без дедлайна'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gray-500">
            {cards.length}
          </span>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiveColumn.isPending}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Перенести колонку в архив"
            title="Перенести в архив"
          >
            <Archive size={16} />
          </button>
        </div>
      </header>

      <div className="tasks-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {cards.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/35 p-6 text-center text-sm text-gray-400">
              Карточек пока нет. Создайте задачу ниже.
            </div>
          ) : (
            cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                commentsCount={commentsCountByCard[card.id] ?? 0}
                onOpen={onOpenCard}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-4">
        {isAddingCard ? (
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(event) => setNewCardTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleAddCard();
                }
                if (event.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              rows={2}
              placeholder="Название карточки..."
              className="glass-input w-full resize-none rounded-xl px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleAddCard}
                disabled={createCard.isPending || !newCardTitle.trim()}
                className="btn-glass flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Добавить
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="btn-glass-secondary rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-white/45 px-4 py-3 text-sm font-semibold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-white/80"
          >
            <Plus size={16} />
            Добавить карточку
          </button>
        )}
      </div>
    </section>
  );
};
