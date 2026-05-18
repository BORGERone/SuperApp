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

  const sectionClass =
    'rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-md shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_18px_-12px_rgba(15,23,42,0.18)]';
  const labelClass =
    'mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500';
  const fieldClass =
    'w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-indigo-300/70 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-200/60';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/40 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500/80">
              Комментарии к задаче
            </div>
            <div className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">
              {card.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tasks-scroll flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700 backdrop-blur-sm">
              {errorMessage}
            </div>
          )}

          <div className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`${labelClass} !mb-0`}>
                <MessageSquare size={12} /> Комментарии
              </span>
              <span className="rounded-full bg-white/70 px-2 py-[1px] text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/60">
                {comments.length}
              </span>
            </div>

            <div className="tasks-scroll max-h-80 space-y-2 overflow-y-auto pr-1">
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
                        {author?.avatarUrl ? (
                          <img src={author.avatarUrl} alt={authorLabel} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <UserIcon size={13} className="text-indigo-500" />
                        )}
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
      </div>
    </div>
  );
};
