import React, { useMemo, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
  ListChecks,
  MessageSquare,
  Pencil,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { TaskCard, computeDeadlineState } from '../models/tasksModel';
import { useDeleteCard, useUpdateCard } from '../api/tasksApi';
import { useUsers } from '../../auth/api/usersApi';
import { CARD_DRAG_MIME, useCardDrag } from '../dnd/CardDragContext';

interface CardItemProps {
  card: TaskCard;
  commentsCount: number;
  onOpen: (card: TaskCard) => void;
  index: number;
  columnId: string;
}

function formatDeadline(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  commentsCount,
  onOpen,
  index,
  columnId,
}) => {
  const { data: users = [] } = useUsers();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const drag = useCardDrag();
  const cardRef = useRef<HTMLElement>(null);

  const isDragging = drag.draggingCardId === card.id;
  const isHoverTopHere =
    drag.hoverColumnId === columnId && drag.hoverIndex === index && !isDragging;
  const isHoverBottomLast =
    drag.hoverColumnId === columnId &&
    drag.hoverIndex === index + 1 &&
    !isDragging;

  const handleDragStart = (event: React.DragEvent<HTMLElement>) => {
    try {
      event.dataTransfer.effectAllowed = 'move';
      // В Electron drop не срабатывает без setData('text', ...) — известный воркараунд из Chromium.
      event.dataTransfer.setData('text', card.id);
      event.dataTransfer.setData('text/plain', card.id);
      event.dataTransfer.setData(CARD_DRAG_MIME, card.id);
    } catch {
      // Некоторые браузеры ограничивают setData по MIME-типу — игнорируем.
    }
    drag.beginDrag(card.id, columnId);
  };

  const handleDragEnd = () => {
    drag.endDrag();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    const live = drag.readState();
    if (!live.draggingCardId || live.draggingCardId === card.id) return;
    // preventDefault на dragenter обязателен в некоторых версиях Chromium/Electron,
    // иначе drop не сработает.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    const live = drag.readState();
    if (!live.draggingCardId || live.draggingCardId === card.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const midpoint = rect.top + rect.height / 2;
    const targetIndex = event.clientY < midpoint ? index : index + 1;
    drag.setHover(columnId, targetIndex);
  };

  const userMap = useMemo(() => {
    const map = new Map<string, { username: string; email: string }>();
    (users as Array<{ id: string; username: string; email: string }>).forEach((user) =>
      map.set(user.id, user),
    );
    return map;
  }, [users]);

  const deadlineState = computeDeadlineState(card.deadline, card.completed);

  const cardSurfaceClasses = card.completed
    ? 'border-emerald-200/70 bg-emerald-50/65 hover:bg-emerald-50/80'
    : deadlineState === 'overdue'
      ? 'border-red-200/70 bg-red-50/65 hover:bg-red-50/80'
      : deadlineState === 'today'
        ? 'border-amber-200/70 bg-amber-50/65 hover:bg-amber-50/80'
        : 'border-white/60 bg-white/55 hover:bg-white/75';

  const deadlineLabel = formatDeadline(card.deadline);
  const deadlineBadgeClasses = card.completed
    ? 'bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/60'
    : deadlineState === 'overdue'
      ? 'bg-red-100/80 text-red-700 ring-1 ring-red-200/60'
      : deadlineState === 'today'
        ? 'bg-amber-100/80 text-amber-700 ring-1 ring-amber-200/60'
        : 'bg-slate-100/80 text-slate-600 ring-1 ring-slate-200/60';

  const handleToggleCompleted = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updateCard.mutateAsync({
        id: card.id,
        input: { completed: !card.completed },
      });
    } catch (error) {
      console.error('Не удалось обновить статус карточки:', error);
    }
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onOpen(card);
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('Удалить карточку безвозвратно?')) return;
    try {
      await deleteCard.mutateAsync(card.id);
    } catch (error) {
      console.error('Не удалось удалить карточку:', error);
    }
  };

  return (
    <article
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onClick={() => onOpen(card)}
      className={`group relative cursor-pointer rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_18px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200 hover:border-indigo-300/70 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_10px_28px_-12px_rgba(79,70,229,0.35)] ${cardSurfaceClasses} ${
        isDragging ? 'pointer-events-none scale-[0.98] opacity-40' : ''
      }`}
    >
      {isHoverTopHere && (
        <div className="pointer-events-none absolute -top-1.5 left-2 right-2 h-1 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.55)]" />
      )}
      {isHoverBottomLast && (
        <div className="pointer-events-none absolute -bottom-1.5 left-2 right-2 h-1 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.55)]" />
      )}
      <div className="flex items-start gap-2">
        <GripVertical
          className="mt-0.5 flex-shrink-0 cursor-grab text-slate-300 transition-colors group-hover:text-indigo-400"
          size={16}
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-[13px] font-semibold leading-snug tracking-tight text-slate-900 break-words ${
              card.completed ? 'text-slate-400 line-through' : ''
            }`}
          >
            {card.title}
          </h3>
          {card.description && (
            <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.45] text-slate-500 break-words whitespace-pre-wrap">
              {card.description}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={handleToggleCompleted}
            className={`rounded-md p-1.5 transition-colors ${
              card.completed
                ? 'text-emerald-600 hover:bg-emerald-100/60'
                : 'text-slate-400 hover:bg-emerald-100/60 hover:text-emerald-600'
            }`}
            aria-label={card.completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
            title={card.completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
          >
            {card.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-100/60 hover:text-indigo-600"
            aria-label="Редактировать карточку"
            title="Открыть карточку"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100/60 hover:text-rose-600"
            aria-label="Удалить карточку"
            title="Удалить карточку"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[10.5px] text-slate-500">
        {deadlineLabel && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] font-semibold ${deadlineBadgeClasses}`}
          >
            <Calendar size={11} />
            {deadlineLabel}
          </span>
        )}
        {card.completed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-[2px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
            <CheckCircle2 size={11} />
            Выполнено
          </span>
        )}
        {card.assignees.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {card.assignees.slice(0, 3).map((userId) => {
              const user = userMap.get(userId);
              const label = user?.username || user?.email || userId;
              return (
                <span
                  key={userId}
                  className="inline-flex max-w-[120px] items-center gap-1 rounded-full bg-indigo-50/80 px-2 py-[2px] font-semibold text-indigo-600 ring-1 ring-indigo-200/60"
                  title={user?.email || label}
                >
                  <UserCircle size={11} />
                  <span className="truncate">{label}</span>
                </span>
              );
            })}
            {card.assignees.length > 3 && (
              <span className="text-[10.5px] font-semibold text-slate-400">
                +{card.assignees.length - 3}
              </span>
            )}
          </div>
        )}
        {(card.subtasks?.length ?? 0) > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-[2px] font-semibold text-slate-500 ring-1 ring-slate-200/60"
            title="Подпункты"
          >
            <ListChecks size={11} />
            {card.subtasks.filter((s) => s.completed).length}/{card.subtasks.length}
          </span>
        )}
        {commentsCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-[2px] font-semibold text-slate-500 ring-1 ring-slate-200/60">
            <MessageSquare size={11} />
            {commentsCount}
          </span>
        )}
      </div>

      {card.lastComment && (
        <div className="mt-2 rounded-xl border border-white/60 bg-white/55 px-2.5 py-1.5 text-[11px] backdrop-blur-sm">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <MessageSquare size={10} />
            <span className="truncate">
              {card.lastComment.authorName || card.lastComment.authorEmail || 'Комментарий'}
            </span>
          </div>
          <p className="line-clamp-2 text-[11.5px] leading-[1.45] text-slate-600 break-words whitespace-pre-wrap">
            {card.lastComment.body}
          </p>
        </div>
      )}
    </article>
  );
};
