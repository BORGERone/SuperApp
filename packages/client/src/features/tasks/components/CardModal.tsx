import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Columns,
  FileText,
  MessageSquare,
  Send,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { TaskCard, TaskColumn, computeDeadlineState } from '../models/tasksModel';
import {
  useCreateComment,
  useDeleteCard,
  useDeleteComment,
  useTaskComments,
  useUpdateCard,
} from '../api/tasksApi';
import { useUsers } from '../../auth/api/usersApi';
import { AssigneePicker } from './AssigneePicker';

interface CardModalProps {
  card: TaskCard;
  columns: TaskColumn[];
  currentUserId: string | null;
  onClose: () => void;
}

// Преобразование ISO даты во формат для input[type=datetime-local]
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

function formatDateTime(value: string | null): string {
  if (!value) return 'Не задан';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Не задан';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CardModal: React.FC<CardModalProps> = ({ card, columns, currentUserId, onClose }) => {
  const { data: users = [] } = useUsers();
  const userMap = useMemo(() => {
    const map = new Map<string, { username: string; email: string }>();
    (users as Array<{ id: string; username: string; email: string }>).forEach((user) =>
      map.set(user.id, user)
    );
    return map;
  }, [users]);

  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(card.id);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [deadlineInput, setDeadlineInput] = useState(isoToLocalInput(card.deadline));
  const [completed, setCompleted] = useState(card.completed);
  const [columnId, setColumnId] = useState(card.columnId);
  const [assignees, setAssignees] = useState<string[]>(card.assignees);
  const [commentText, setCommentText] = useState('');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Синхронизируем локальные изменения если карточка обновилась с сервера
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
    setDeadlineInput(isoToLocalInput(card.deadline));
    setCompleted(card.completed);
    setColumnId(card.columnId);
    setAssignees(card.assignees);
  }, [card]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Заголовок не может быть пустым');
      return;
    }
    setSavingState('saving');
    setErrorMessage(null);
    try {
      await updateCard.mutateAsync({
        id: card.id,
        input: {
          title: title.trim(),
          description,
          deadline: localInputToIso(deadlineInput),
          completed,
          columnId,
          assignees,
        },
      });
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1500);
    } catch (error) {
      setSavingState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить карточку');
    }
  };

  const handleToggleCompleted = async () => {
    const next = !completed;
    setCompleted(next);
    try {
      await updateCard.mutateAsync({
        id: card.id,
        input: { completed: next },
      });
    } catch (error) {
      setCompleted(!next);
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось обновить статус');
    }
  };

  const handleDeleteCard = async () => {
    if (!window.confirm('Удалить карточку безвозвратно?')) return;
    try {
      await deleteCard.mutateAsync(card.id);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить карточку');
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      await createComment.mutateAsync({ cardId: card.id, body: text });
      setCommentText('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось добавить комментарий');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, cardId: card.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить комментарий');
    }
  };

  const deadlineState = computeDeadlineState(localInputToIso(deadlineInput), completed);
  const deadlineHint =
    deadlineState === 'overdue'
      ? 'Срок просрочен'
      : deadlineState === 'today'
        ? 'Срок истекает сегодня'
        : deadlineState === 'future'
          ? 'Срок ещё впереди'
          : 'Срок не задан';
  const deadlineHintTone =
    deadlineState === 'overdue'
      ? 'text-red-600'
      : deadlineState === 'today'
        ? 'text-amber-600'
        : deadlineState === 'future'
          ? 'text-indigo-600'
          : 'text-slate-500';
  const accentBarClasses = completed
    ? 'bg-emerald-400/80'
    : deadlineState === 'overdue'
      ? 'bg-red-400/80'
      : deadlineState === 'today'
        ? 'bg-amber-400/80'
        : 'bg-slate-300/60';

  const sectionClass =
    'rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-md shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_18px_-12px_rgba(15,23,42,0.18)]';
  const labelClass =
    'mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500';
  const fieldClass =
    'w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-indigo-300/70 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-200/60';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${accentBarClasses}`} />

        <div className="flex items-start gap-3 border-b border-white/40 px-6 py-5 pl-7">
          <button
            onClick={handleToggleCompleted}
            className={`mt-1 rounded-full p-1 transition-colors ${
              completed ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
            }`}
            title={completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
          >
            {completed ? <CheckCircle2 size={26} /> : <Circle size={26} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500/80">
              Карточка задачи
            </div>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Заголовок карточки"
              className="mt-1 w-full min-w-0 border-b border-transparent bg-transparent px-0.5 py-1 text-xl font-semibold tracking-tight text-slate-900 placeholder:text-slate-400 focus:border-indigo-300/70 focus:outline-none"
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tasks-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5 pl-7">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700 backdrop-blur-sm">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className={sectionClass}>
              <div className={labelClass}>
                <Columns size={12} /> Колонка
              </div>
              <select
                value={columnId}
                onChange={(event) => setColumnId(event.target.value)}
                className={fieldClass}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={sectionClass}>
              <div className={labelClass}>
                <Calendar size={12} /> Дедлайн
              </div>
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(event) => setDeadlineInput(event.target.value)}
                className={fieldClass}
              />
              <div className={`mt-1.5 text-[11.5px] font-medium ${deadlineHintTone}`}>{deadlineHint}</div>
            </div>
          </div>

          <div className={sectionClass}>
            <div className={labelClass}>
              <FileText size={12} /> Описание
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              placeholder="Опишите задачу подробнее..."
              className={`${fieldClass} resize-y`}
            />
          </div>

          <div className={sectionClass}>
            <div className={labelClass}>
              <Users size={12} /> Ответственные
            </div>
            <AssigneePicker selected={assignees} onChange={setAssignees} />
          </div>

          <div className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`${labelClass} !mb-0`}>
                <MessageSquare size={12} /> Комментарии
              </span>
              <span className="rounded-full bg-white/70 px-2 py-[1px] text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/60">
                {comments.length}
              </span>
            </div>

            <div className="tasks-scroll max-h-60 space-y-2 overflow-y-auto pr-1">
              {commentsLoading && <div className="text-sm text-slate-500">Загрузка комментариев...</div>}
              {!commentsLoading && comments.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200/70 bg-white/40 px-3 py-4 text-center text-[12.5px] text-slate-500">
                  Комментариев пока нет — добавьте первый.
                </div>
              )}
              {comments.map((comment) => {
                const author = userMap.get(comment.authorId);
                const authorLabel =
                  comment.authorName || author?.username || comment.authorEmail || 'Пользователь';
                const canDelete = comment.authorId === currentUserId;
                return (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 backdrop-blur-sm"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
                        <UserIcon size={13} className="text-indigo-500" />
                        <span className="max-w-[200px] truncate">{authorLabel}</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="rounded-md p-1 text-rose-500 transition-colors hover:bg-rose-100/60"
                          aria-label="Удалить комментарий"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-700">
                      {comment.body}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-start gap-2">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    handleAddComment();
                  }
                }}
                rows={2}
                placeholder="Написать комментарий... (Ctrl+Enter — отправить)"
                className={`${fieldClass} flex-1 resize-y`}
              />
              <button
                onClick={handleAddComment}
                disabled={createComment.isPending || !commentText.trim()}
                className="btn-glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                Отправить
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 px-6 py-4 pl-7">
          <button
            onClick={handleDeleteCard}
            className="btn-glass-danger inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Trash2 size={14} />
            Удалить карточку
          </button>
          <div className="flex items-center gap-3">
            {savingState === 'saving' && (
              <span className="text-[12.5px] font-medium text-slate-500">Сохранение...</span>
            )}
            {savingState === 'saved' && (
              <span className="text-[12.5px] font-semibold text-emerald-600">Сохранено</span>
            )}
            {savingState === 'error' && (
              <span className="text-[12.5px] font-semibold text-red-600">Ошибка сохранения</span>
            )}
            <button
              onClick={onClose}
              className="btn-glass-secondary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Закрыть
            </button>
            <button
              onClick={handleSave}
              disabled={updateCard.isPending}
              className="btn-glass rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
