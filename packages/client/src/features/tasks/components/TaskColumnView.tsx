import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TaskCard, TaskColumn, computeDeadlineState } from '../models/tasksModel';
import {
  useCreateCard,
  useDeleteColumn,
  useUpdateColumn,
} from '../api/tasksApi';
import { CardItem } from './CardItem';

interface TaskColumnViewProps {
  column: TaskColumn;
  cards: TaskCard[];
  commentsCountByCard: Record<string, number>;
  onOpenCard: (card: TaskCard) => void;
}

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

function formatDeadline(value: string | null): string {
  if (!value) return '';
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

export const TaskColumnView: React.FC<TaskColumnViewProps> = ({
  column,
  cards,
  commentsCountByCard,
  onOpenCard,
}) => {
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const createCard = useCreateCard();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editDeadline, setEditDeadline] = useState(isoToLocalInput(column.deadline));
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTitle(column.title);
    setEditDeadline(isoToLocalInput(column.deadline));
  }, [column.id, column.title, column.deadline]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deadlineState = computeDeadlineState(column.deadline, false);
  const headerAccent =
    deadlineState === 'overdue'
      ? 'border-red-400 bg-red-50/80'
      : deadlineState === 'today'
        ? 'border-yellow-400 bg-yellow-50/80'
        : 'border-gray-200 bg-white/70';

  const handleSave = async () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle) return;
    try {
      await updateColumn.mutateAsync({
        id: column.id,
        input: {
          title: nextTitle,
          deadline: localInputToIso(editDeadline),
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Не удалось сохранить колонку:', error);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    const confirmText =
      cards.length > 0
        ? `Удалить колонку "${column.title}" вместе с ${cards.length} карточками?`
        : `Удалить колонку "${column.title}"?`;
    if (!window.confirm(confirmText)) return;
    try {
      await deleteColumn.mutateAsync(column.id);
    } catch (error) {
      console.error('Не удалось удалить колонку:', error);
    }
  };

  const handleAddCard = async () => {
    const title = newCardTitle.trim();
    if (!title) return;
    try {
      await createCard.mutateAsync({
        columnId: column.id,
        title,
        description: '',
        deadline: null,
        assignees: [],
      });
      setNewCardTitle('');
      setIsAddingCard(false);
    } catch (error) {
      console.error('Не удалось создать карточку:', error);
    }
  };

  return (
    <div className="w-80 flex-shrink-0 glass-card rounded-xl flex flex-col max-h-full">
      <div className={`rounded-t-xl border-b ${headerAccent} px-4 py-3`}> 
        {isEditing ? (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSave();
                if (event.key === 'Escape') setIsEditing(false);
              }}
              className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Название колонки"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 flex items-center gap-1">
                <Calendar size={12} /> Дедлайн
              </label>
              <input
                type="datetime-local"
                value={editDeadline}
                onChange={(event) => setEditDeadline(event.target.value)}
                className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {editDeadline && (
                <button
                  onClick={() => setEditDeadline('')}
                  className="p-1 rounded-md hover:bg-white text-gray-500"
                  title="Очистить дедлайн"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm rounded-md bg-white/80 border border-gray-200 hover:bg-white"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={updateColumn.isPending}
                className="px-3 py-1 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Check size={14} /> Сохранить
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800 truncate">{column.title}</h3>
                <span className="text-xs text-gray-500">({cards.length})</span>
              </div>
              {column.deadline ? (
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
                    deadlineState === 'overdue'
                      ? 'bg-red-200 text-red-800'
                      : deadlineState === 'today'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Calendar size={12} />
                  Срок: {formatDeadline(column.deadline)}
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-500">Дедлайн не задан</div>
              )}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-md hover:bg-white/70 text-gray-600"
                aria-label="Меню колонки"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white/95 border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={14} /> Редактировать
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Удалить колонку
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cards.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6">Пока нет карточек</div>
        )}
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            commentsCount={commentsCountByCard[card.id] ?? 0}
            onOpen={onOpenCard}
          />
        ))}
      </div>

      <div className="p-3 border-t border-gray-200/60">
        {isAddingCard ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(event) => setNewCardTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleAddCard();
                }
                if (event.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              rows={2}
              placeholder="Название карточки..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCard}
                disabled={createCard.isPending || !newCardTitle.trim()}
                className="px-3 py-1 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                Добавить
              </button>
              <button
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="px-3 py-1 text-sm rounded-md bg-white border border-gray-200 hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-white/70 border border-dashed border-gray-300"
          >
            <Plus size={16} /> Добавить карточку
          </button>
        )}
      </div>
    </div>
  );
};
