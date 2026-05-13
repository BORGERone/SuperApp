import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TaskColumn } from '../models/tasksModel';

interface ColumnEditModalProps {
  column?: TaskColumn | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; deadline: string | null }) => Promise<void> | void;
}

function toDateInputValue(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  // Local datetime in format YYYY-MM-DDTHH:mm
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const ColumnEditModal: React.FC<ColumnEditModalProps> = ({
  column,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(column?.name ?? '');
      setDeadline(toDateInputValue(column?.deadline ?? null));
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, column]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название колонки');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="glass-card rounded-xl w-full max-w-md m-4 flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200/50">
          <h2 className="text-lg font-semibold text-gray-800">
            {column ? 'Редактирование колонки' : 'Новая колонка'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название колонки
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Сделать в мае"
              className="w-full px-3 py-2 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дедлайн колонки (необязательно)
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

          {error && (
            <div className="text-sm text-red-600 bg-red-50/70 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-200/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/60 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Сохранение...' : column ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
};
