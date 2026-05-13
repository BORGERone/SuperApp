import React from 'react';
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/40 p-4 pt-16 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">Архив</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Архив колонок</h2>
            <p className="mt-1 text-sm text-gray-500">
              Колонки в архиве не отображаются на доске. Их можно восстановить или удалить безвозвратно.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/80 hover:text-gray-700"
            aria-label="Закрыть архив"
          >
            <X size={20} />
          </button>
        </header>

        <div className="tasks-scroll max-h-[60vh] space-y-2 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-gray-500">
              Загрузка архива...
            </div>
          ) : archived.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-gray-500">
              В архиве пока пусто.
            </div>
          ) : (
            archived.map((column) => (
              <div
                key={column.id}
                className="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-gray-900">{column.title}</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    Архивирована: {formatDate(column.archivedAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(column.id)}
                    disabled={unarchive.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArchiveRestore size={14} />
                    Восстановить
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurge(column.id, column.title)}
                    disabled={deleteColumn.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
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
