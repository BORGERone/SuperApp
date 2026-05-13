import React, { useEffect, useState } from 'react';
import { Archive, Calendar, Plus, X } from 'lucide-react';
import { TaskCard, TaskColumn, computeDeadlineState } from '../models/tasksModel';
import {
  useArchiveColumn,
  useCreateCard,
  useUpdateColumn,
} from '../api/tasksApi';
import { CardItem } from './CardItem';
import { useCardDrag } from '../dnd/CardDragContext';

interface TaskColumnViewProps {
  column: TaskColumn;
  cards: TaskCard[];
  commentsCountByCard: Record<string, number>;
  onOpenCard: (card: TaskCard) => void;
  onDropCard: (cardId: string, targetColumnId: string, targetIndex: number) => void;
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
  onDropCard,
}) => {
  const updateColumn = useUpdateColumn();
  const archiveColumn = useArchiveColumn();
  const createCard = useCreateCard();
  const drag = useCardDrag();

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
      ? 'bg-red-100/80 text-red-700 ring-1 ring-red-200/60'
      : deadlineState === 'today'
        ? 'bg-amber-100/80 text-amber-700 ring-1 ring-amber-200/60'
        : column.deadline
          ? 'bg-indigo-100/70 text-indigo-700 ring-1 ring-indigo-200/60'
          : 'bg-white/70 text-slate-500 ring-1 ring-slate-200/60';

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
    <section className="glass-card flex w-[340px] flex-shrink-0 flex-col self-start rounded-3xl p-3.5 max-h-[calc(100vh-220px)]">
      <header className="mb-2 flex items-start justify-between gap-2">
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
            className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold tracking-tight text-slate-900 hover:border-indigo-100 hover:bg-white/60 focus:border-indigo-200 focus:bg-white/80 focus:outline-none"
            aria-label="Название колонки"
            placeholder="Название колонки"
          />
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <Calendar size={12} className="text-slate-400" />
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
                className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] font-semibold ${deadlineBadgeClasses}`}
              >
                {column.deadline ? formatDeadlineShort(column.deadline) : 'Без дедлайна'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/70 px-2.5 py-[3px] text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/60">
            {cards.length}
          </span>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiveColumn.isPending}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100/60 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Перенести колонку в архив"
            title="Перенести в архив"
          >
            <Archive size={15} />
          </button>
        </div>
      </header>

      <div
        className="tasks-scroll flex-1 min-h-0 overflow-y-auto px-0.5 py-1.5 pr-1"
        onDragEnter={(event) => {
          const live = drag.readState();
          if (!live.draggingCardId) return;
          // Обязательный preventDefault на dragenter для Electron/Chromium.
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDragOver={(event) => {
          const live = drag.readState();
          if (!live.draggingCardId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          // Если курсор не над карточкой, ставим в конец списка.
          if (live.hoverColumnId !== column.id) {
            drag.setHover(column.id, cards.length);
          }
        }}
        onDragLeave={(event) => {
          // Уходим из колонки только если курсор реально вышел за её пределы.
          const related = event.relatedTarget as Node | null;
          if (!related || !(event.currentTarget as HTMLElement).contains(related)) {
            drag.clearHover(column.id);
          }
        }}
        onDrop={(event) => {
          const live = drag.readState();
          if (!live.draggingCardId) return;
          event.preventDefault();
          const cardId = live.draggingCardId;
          const targetIndex = live.hoverIndex ?? cards.length;
          onDropCard(cardId, column.id, targetIndex);
          drag.endDrag();
        }}
      >
        <div className="flex flex-col gap-2.5">
          {cards.length === 0 ? (
            <div
              className={`flex items-center justify-center rounded-2xl border border-dashed p-6 text-center text-[12.5px] transition-colors ${
                drag.hoverColumnId === column.id && drag.draggingCardId
                  ? 'border-indigo-300 bg-indigo-50/70 text-indigo-600'
                  : 'border-slate-200/70 bg-white/35 text-slate-400'
              }`}
            >
              {drag.hoverColumnId === column.id && drag.draggingCardId
                ? 'Перенести карточку сюда'
                : 'Карточек пока нет. Создайте задачу ниже.'}
            </div>
          ) : (
            <>
              {cards.map((card, index) => (
                <CardItem
                  key={card.id}
                  card={card}
                  commentsCount={commentsCountByCard[card.id] ?? 0}
                  onOpen={onOpenCard}
                  index={index}
                  columnId={column.id}
                />
              ))}
              {/* Зона ниже последней карточки — позволяет дропнуть в конец колонки. */}
              <div
                className={`-mt-1 h-3 rounded-full transition-all ${
                  drag.hoverColumnId === column.id && drag.hoverIndex === cards.length
                    ? 'bg-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.55)]'
                    : 'bg-transparent'
                }`}
                onDragEnter={(event) => {
                  const live = drag.readState();
                  if (!live.draggingCardId) return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDragOver={(event) => {
                  const live = drag.readState();
                  if (!live.draggingCardId) return;
                  event.preventDefault();
                  event.stopPropagation();
                  drag.setHover(column.id, cards.length);
                }}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        {isAddingCard ? (
          <div className="rounded-2xl border border-indigo-100/70 bg-white/65 p-3 shadow-sm backdrop-blur-md">
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200/70 bg-white/40 px-4 py-2.5 text-[12.5px] font-semibold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-white/70"
          >
            <Plus size={14} />
            Добавить карточку
          </button>
        )}
      </div>
    </section>
  );
};
