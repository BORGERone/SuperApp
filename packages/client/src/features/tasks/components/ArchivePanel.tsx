import React, { useEffect } from 'react';
import { ArchiveRestore, Calendar, Trash2, X } from 'lucide-react';
import {
  useArchivedTaskColumns,
  useDeleteColumn,
  useUnarchiveColumn,
} from '../api/tasksApi';

interface ArchivePanelProps {
  onClose: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ArchivePanel: React.FC<ArchivePanelProps> = ({ onClose }) => {
  const { data: archived = [], isLoading } = useArchivedTaskColumns(true);
  const unarchive = useUnarchiveColumn();
  const deleteColumn = useDeleteColumn();

  useEffect(() => {
    document.body.classList.add('has-modal-open');
    return () => {
      document.body.classList.remove('has-modal-open');
    };
  }, []);

  const handleRestore = async (id: string) => {
    try {
      await unarchive.mutateAsync(id);
    } catch (error) {
      console.error('Не удалось восстановить колонку:', error);
    }
  };

  const handlePurge = async (id: string, title: string) => {
    if (!window.confirm(`Удалить колонку «${title}» из архива безвозвратно вместе со всеми карточками и комментариями?`)) return;
    try {
      await deleteColumn.mutateAsync(id);
    } catch (error) {
      console.error('Не удалось удалить колонку:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-start justify-center p-4 pt-16 fade-in">
      <div className="glass-top scale-in w-full max-w-2xl rounded-3xl p-6">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--color-primary)' }}
            >Архив</p>
            <h2 className="mt-1 text-2xl font-black text-app">Архив колонок</h2>
            <p className="mt-1 text-sm text-app-muted">
              Колонки в архиве не отображаются на доске. Их можно восстановить или удалить безвозвратно.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Закрыть архив"
          >
            <X size={20} />
          </button>
        </header>

        <div className="tasks-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-2">
          {isLoading ? (
            <div
              className="flex items-center justify-center rounded-2xl p-6 text-sm text-app-muted"
              style={{ border: '1px dashed var(--border-app)', background: 'var(--surface-1)' }}
            >
              Загрузка архива...
            </div>
          ) : archived.length === 0 ? (
            <div
              className="flex items-center justify-center rounded-2xl p-6 text-sm text-app-muted"
              style={{ border: '1px dashed var(--border-app)', background: 'var(--surface-1)' }}
            >
              В архиве пока пусто.
            </div>
          ) : (
            archived.map((column) => (
              <div
                key={column.id}
                className="glass-mid flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-app">{column.title}</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-app-muted">
                    <Calendar size={12} />
                    Архивирована: {formatDate(column.archivedAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(column.id)}
                    disabled={unarchive.isPending}
                    className="btn-glass-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: 'rgb(52, 211, 153)' }}
                  >
                    <ArchiveRestore size={14} />
                    Восстановить
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurge(column.id, column.title)}
                    disabled={deleteColumn.isPending}
                    className="btn-glass-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: 'rgb(248, 113, 113)' }}
                  >
                    <Trash2 size={14} />
                    Удалить навсегда
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
