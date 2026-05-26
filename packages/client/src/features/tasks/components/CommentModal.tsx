import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { TaskCard } from '../models/tasksModel';
import {
  useCreateComment,
  useDeleteComment,
  useTaskComments,
} from '../api/tasksApi';
import { useUsers } from '../../auth/api/usersApi';
import { useBodyModalOpen } from '../../../utils/useBodyModalOpen';

// Функция для отправки логов на сервер
const logToServer = async (message: string) => {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (error) {
    console.error('Failed to send log to server:', error);
  }
};

interface CommentModalProps {
  card: TaskCard;
  currentUserId: string | null;
  onClose: () => void;
}

function formatDateTime(value: string): string {
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

export const CommentModal: React.FC<CommentModalProps> = ({ card, currentUserId, onClose }) => {
  const { data: users = [], refetch } = useUsers();

  useBodyModalOpen(true);
  
  // Принудительный сброс кэша при открытии модального окна
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  const userMap = useMemo(() => {
    const map = new Map<string, { username: string; email: string; avatarUrl?: string }>();
    (users as Array<{ id: string; username: string; email: string; avatarUrl?: string }>).forEach((user) =>
      map.set(user.id, user)
    );
    logToServer(`CommentModal - users: ${JSON.stringify(users.map(u => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl })))}`);
    return map;
  }, [users]);

  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(card.id);

  const [commentText, setCommentText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

  const sectionClass = 'glass-mid p-4';
  const labelClass =
    'mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-muted';
  const fieldClass = 'glass-input w-full rounded-xl px-3 py-2 text-sm';

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div
        className="glass-top scale-in relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-5 relative">
          <div className="divider absolute bottom-0 left-0 right-0" />
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-primary)' }}
            >
              Комментарии к задаче
            </div>
            <div className="mt-1 truncate text-lg font-semibold tracking-tight text-app">
              {card.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tasks-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {errorMessage && (
            <div
              className="rounded-2xl px-4 py-2.5 text-sm"
              style={{
                color: 'rgb(248, 113, 113)',
                background: 'rgba(239, 68, 68, 0.10)',
                border: '1px solid rgba(239, 68, 68, 0.30)',
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`${labelClass} !mb-0`}>
                <MessageSquare size={12} /> Комментарии
              </span>
              <span
                className="rounded-full px-2 py-[1px] text-[11px] font-semibold text-app-muted"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-app)',
                }}
              >
                {comments.length}
              </span>
            </div>

            <div className="tasks-scroll max-h-80 space-y-2 overflow-y-auto pr-1">
              {commentsLoading && <div className="text-sm text-app-muted">Загрузка комментариев...</div>}
              {!commentsLoading && comments.length === 0 && (
                <div
                  className="rounded-xl px-3 py-4 text-center text-[12.5px] text-app-muted"
                  style={{ border: '1px dashed var(--border-app)', background: 'var(--surface-1)' }}
                >
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
                    className="glass-mid rounded-xl px-3 py-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-app">
                        {author?.avatarUrl ? (
                          <img src={author.avatarUrl} alt={authorLabel} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <UserIcon size={13} style={{ color: 'var(--color-primary)' }} />
                        )}
                        <span className="max-w-[200px] truncate">{authorLabel}</span>
                        <span className="text-[11px] font-normal text-app-muted">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="rounded-md p-1 text-app-muted transition-colors hover:text-red-500"
                          aria-label="Удалить комментарий"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[13px] leading-snug text-app">
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
      </div>
    </div>
  );
};
