import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Send, MessageCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { TaskCard, TaskColumn } from '../models/tasksModel';
import { AssigneePicker } from './AssigneePicker';
import { useUsers } from '../../auth/api/usersApi';
import {
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  useCreateComment,
  useDeleteComment,
} from '../api/tasksApi';

interface CardEditModalProps {
  isOpen: boolean;
  card: TaskCard | null;
  column: TaskColumn | null;
  onClose: () => void;
}

function toDateInputValue(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CardEditModal: React.FC<CardEditModalProps> = ({ isOpen, card, column, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();
  const deleteCardMutation = useDeleteCard();
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  const { data: users = [] } = useUsers();
  const userMap = useMemo(() => {
    const map = new Map<string, { id: string; username: string }>();
    (users as any[]).forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
      setDeadline(toDateInputValue(card.deadline));
      setIsCompleted(card.isCompleted);
      setAssignees(card.assignees ?? []);
    } else {
      setTitle('');
      setDescription('');
      setDeadline('');
      setIsCompleted(false);
      setAssignees([]);
    }
    setCommentDraft('');
    setError(null);
  }, [isOpen, card]);

  if (!isOpen) return null;

  const isNew = !card;
  const isSubmitting =
    createCardMutation.isPending ||
    updateCardMutation.isPending ||
    deleteCardMutation.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Введите название карточки');
      return;
    }
    if (!column) {
      setError('Не выбрана колонка');
      return;
    }
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      assignees,
      isCompleted,
    };
    try {
      if (isNew) {
        await createCardMutation.mutateAsync({
          columnId: column.id,
          ...payload,
        });
      } else if (card) {
        await updateCardMutation.mutateAsync({
          id: card.id,
          input: payload,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!window.confirm('Удалить карточку?')) return;
    try {
      await deleteCardMutation.mutateAsync(card.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleAddComment = async () => {
    if (!card) return;
    const text = commentDraft.trim();
    if (!text) return;
    try {
      await createCommentMutation.mutateAsync({ cardId: card.id, body: text });
      setCommentDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить комментарий');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить комментарий');
    }
  };

  const handleToggleCompleted = async () => {
    const next = !isCompleted;
    setIsCompleted(next);
    if (card) {
      try {
        await updateCardMutation.mutateAsync({
          id: card.id,
          input: { isCompleted: next },
        });
      } catch (err) {
        setIsCompleted(!next);
        setError(err instanceof Error ? err.message : 'Не удалось обновить статус');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200/50">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {isNew ? 'Новая карточка' : 'Карточка задачи'}
            </h2>
            {column && (
              <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-white/60 border border-gray-200/50">
                {column.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="w-full px-3 py-2 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Добавьте подробности..."
              className="w-full px-3 py-2 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={14} className="inline mr-1" />
                Дедлайн
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900"
              />
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Очистить дедлайн
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <button
                type="button"
                onClick={handleToggleCompleted}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-green-100/80 border-green-300 text-green-700'
                    : 'bg-white/80 border-gray-200/60 text-gray-700 hover:bg-white'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle size={18} />
                )}
                <span className="text-sm font-medium">
                  {isCompleted ? 'Выполнено' : 'Не выполнено'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ответственные
            </label>
            <AssigneePicker value={assignees} onChange={setAssignees} />
          </div>

          {!isNew && card && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={16} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Комментарии ({card.comments?.length ?? 0})
                </h3>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {(card.comments ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Пока нет комментариев</p>
                ) : (
                  (card.comments ?? []).map((comment) => {
                    const author = userMap.get(comment.userId);
                    const canDelete = currentUser?.id === comment.userId;
                    return (
                      <div
                        key={comment.id}
                        className="bg-white/70 border border-gray-200/50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-gray-800">
                            {author?.username ?? 'Пользователь'}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDateTime(comment.createdAt)}
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                aria-label="Удалить комментарий"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {comment.body}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={2}
                  placeholder="Оставить комментарий..."
                  className="flex-1 px-3 py-2 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-sm text-gray-900 resize-y"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentDraft.trim() || createCommentMutation.isPending}
                  className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-1"
                  aria-label="Отправить комментарий"
                >
                  <Send size={14} />
                  <span className="text-sm">Отправить</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50/70 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-5 border-t border-gray-200/50">
          <div>
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50/70 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/60 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
