import React, { useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { useCreateColumn } from '../api/tasksApi';

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const AddColumnForm: React.FC = () => {
  const createColumn = useCreateColumn();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Укажите название колонки');
      return;
    }
    try {
      await createColumn.mutateAsync({
        title: trimmed,
        deadline: localInputToIso(deadline),
      });
      setTitle('');
      setDeadline('');
      setError(null);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать колонку');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-80 flex-shrink-0 self-start glass-card rounded-xl border border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-white/70 transition-colors py-4 flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        <span className="font-medium">Добавить колонку</span>
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 self-start glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Новая колонка</h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setTitle('');
            setDeadline('');
            setError(null);
          }}
          className="p-1 rounded-md hover:bg-white/70 text-gray-500"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      </div>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleSubmit();
        }}
        placeholder="Например: Сделать в мае"
        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600 flex items-center gap-1">
          <Calendar size={12} /> Дедлайн
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={() => {
            setIsOpen(false);
            setTitle('');
            setDeadline('');
            setError(null);
          }}
          className="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50"
        >
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={createColumn.isPending}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Создать
        </button>
      </div>
    </div>
  );
};
