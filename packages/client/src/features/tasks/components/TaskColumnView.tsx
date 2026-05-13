import React, { useState } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, Clock } from 'lucide-react';
import { TaskColumn, TaskCard, getCardDeadlineState } from '../models/tasksModel';
import { TaskCardItem } from './TaskCardItem';

interface TaskColumnViewProps {
  column: TaskColumn;
  onAddCard: () => void;
  onCardClick: (card: TaskCard) => void;
  onToggleCardCompleted: (card: TaskCard, next: boolean) => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getColumnDeadlineState(deadline: string | null): 'none' | 'normal' | 'today' | 'overdue' {
  if (!deadline) return 'none';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return 'none';
  const now = new Date();
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dDay.getTime() < today.getTime()) return 'overdue';
  if (dDay.getTime() === today.getTime()) return 'today';
  return 'normal';
}

export const TaskColumnView: React.FC<TaskColumnViewProps> = ({
  column,
  onAddCard,
  onCardClick,
  onToggleCardCompleted,
  onEditColumn,
  onDeleteColumn,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const deadlineLabel = formatDeadline(column.deadline);
  const deadlineState = getColumnDeadlineState(column.deadline);

  const total = column.cards.length;
  const completed = column.cards.filter((c) => c.isCompleted).length;
  const overdue = column.cards.filter(
    (c) => getCardDeadlineState(c) === 'overdue'
  ).length;

  return (
    <div className="glass-card rounded-xl p-4 w-80 flex-shrink-0 flex flex-col max-h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {column.name}
            </h3>
            <span className="text-xs text-gray-500 bg-white/70 border border-gray-200/50 rounded-full px-2 py-0.5">
              {completed}/{total}
            </span>
          </div>
          {deadlineLabel && (
            <div
              className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                deadlineState === 'overdue'
                  ? 'bg-red-100 text-red-700'
                  : deadlineState === 'today'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-white/70 border border-gray-200/50 text-gray-600'
              }`}
            >
              <Clock size={12} />
              До {deadlineLabel}
            </div>
          )}
          {overdue > 0 && (
            <div className="mt-1 text-xs text-red-600">
              Просроченных карточек: {overdue}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-gray-500"
            aria-label="Меню колонки"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMenuOpen(false);
                  onEditColumn();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50/70"
              >
                <Pencil size={14} />
                Редактировать колонку
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteColumn();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50/70"
              >
                <Trash2 size={14} />
                Удалить колонку
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {column.cards.length === 0 ? (
          <div className="text-sm text-gray-500 italic py-4 text-center">
            Пока нет карточек
          </div>
        ) : (
          column.cards.map((card) => (
            <TaskCardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onToggleCompleted={(next) => onToggleCardCompleted(card, next)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onAddCard}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-white/60 rounded-lg border border-dashed border-blue-200 transition-colors"
      >
        <Plus size={16} />
        Добавить карточку
      </button>
    </div>
  );
};
