import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, MessageSquare, Send, Trash2, User as UserIcon, X } from 'lucide-react';
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-xl w-full max-w-3xl max-h-[95vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleToggleCompleted}
              className={`p-1 rounded-full transition-colors ${
                completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              }`}
              title={completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
            >
              {completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
            </button>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Заголовок карточки"
              className="flex-1 min-w-0 text-xl font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none px-1 py-1"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Закрыть"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="bg-red-100/80 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Колонка</label>
              <select
                value={columnId}
                onChange={(event) => setColumnId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-200/60 rounded-lg bg-white/80 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дедлайн</label>
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(event) => setDeadlineInput(event.target.value)}
                className="w-full px-3 py-2 border border-gray-200/60 rounded-lg bg-white/80 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="text-xs text-gray-500 mt-1">{deadlineHint}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              placeholder="Опишите задачу подробнее..."
              className="w-full px-3 py-2 border border-gray-200/60 rounded-lg bg-white/80 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ответственные</label>
            <AssigneePicker selected={assignees} onChange={setAssignees} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-gray-600" />
              <h3 className="text-base font-semibold text-gray-800">Комментарии</h3>
              <span className="text-xs text-gray-500">({comments.length})</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {commentsLoading && <div className="text-sm text-gray-500">Загрузка комментариев...</div>}
              {!commentsLoading && comments.length === 0 && (
                <div className="text-sm text-gray-500">Комментариев пока нет — добавьте первый!</div>
              )}
              {comments.map((comment) => {
                const author = userMap.get(comment.authorId);
                const authorLabel = comment.authorName || author?.username || comment.authorEmail || 'Пользователь';
                const canDelete = comment.authorId === currentUserId;
                return (
                  <div
                    key={comment.id}
                    className="bg-white/70 border border-gray-200/60 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <UserIcon size={14} className="text-blue-600" />
                        <span className="truncate max-w-[200px]">{authorLabel}</span>
                        <span className="text-xs text-gray-500 font-normal">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 rounded-md hover:bg-red-100/60 text-red-500 transition-colors"
                          aria-label="Удалить комментарий"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {comment.body}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2 items-start">
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
                className="flex-1 px-3 py-2 border border-gray-200/60 rounded-lg bg-white/80 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              />
              <button
                onClick={handleAddComment}
                disabled={createComment.isPending || !commentText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={16} />
                Отправить
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200/50">
          <button
            onClick={handleDeleteCard}
            className="px-4 py-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Удалить карточку
          </button>
          <div className="flex items-center gap-3">
            {savingState === 'saving' && <span className="text-sm text-gray-500">Сохранение...</span>}
            {savingState === 'saved' && <span className="text-sm text-green-600">Сохранено</span>}
            {savingState === 'error' && (
              <span className="text-sm text-red-600">Ошибка сохранения</span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/80 border border-gray-200 text-gray-700 rounded-lg hover:bg-white"
            >
              Закрыть
            </button>
            <button
              onClick={handleSave}
              disabled={updateCard.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
