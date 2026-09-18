import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateColumn } from '../api/tasksApi';

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const AddColumnForm: React.FC = () => {
  const createColumn = useCreateColumn();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать колонку');
    }
  };

  return (
    <section className="glass-mid flex w-[300px] flex-shrink-0 flex-col gap-3 self-start p-4">
      <h3 className="text-sm font-semibold text-app">Новая колонка</h3>
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleSubmit();
        }}
        placeholder="Например: Сделать в мае"
        className="glass-input rounded-xl px-3 py-2 text-sm"
      />
      <input
        type="datetime-local"
        value={deadline}
        onChange={(event) => setDeadline(event.target.value)}
        className="glass-input rounded-xl px-3 py-2 text-sm"
        title="Дедлайн колонки"
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={createColumn.isPending || !title.trim()}
        className="btn-glass inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} />
        Создать колонку
      </button>
    </section>
  );
};
