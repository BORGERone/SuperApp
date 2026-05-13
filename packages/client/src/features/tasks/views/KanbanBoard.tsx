import React from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from '../components/TaskCard';
import { TaskBoard, TaskCard as TaskCardModel, TaskColumn, TaskDraft, TaskStatus } from '../models/tasksModel';

const columns: TaskColumn[] = [
  {
    id: 'todo',
    title: 'Todo',
    hint: 'Нужно сделать',
    accentClassName: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    hint: 'В работе',
    accentClassName: 'from-amber-400 to-orange-500',
  },
  {
    id: 'done',
    title: 'Done',
    hint: 'Готово',
    accentClassName: 'from-emerald-400 to-teal-500',
  },
];

interface KanbanBoardProps {
  board: TaskBoard;
  cards: TaskCardModel[];
  taskDraft: TaskDraft;
  activeComposerStatus: TaskStatus | null;
  currentUser: string;
  isAdmin: boolean;
  onTaskDraftChange: (draft: TaskDraft) => void;
  onOpenComposer: (status: TaskStatus) => void;
  onCloseComposer: () => void;
  onCreateCard: (status: TaskStatus) => void;
  onEditCard: (card: TaskCardModel, draft: TaskDraft) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (cardId: string, status: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  cards,
  taskDraft,
  activeComposerStatus,
  currentUser,
  isAdmin,
  onTaskDraftChange,
  onOpenComposer,
  onCloseComposer,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onMoveCard,
}) => (
  <div className="grid min-h-[560px] grid-cols-1 gap-4 xl:grid-cols-3">
    {columns.map(column => {
      const columnCards = cards.filter(card => card.status === column.id);

      return (
        <section
          key={column.id}
          onDragOver={event => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={event => {
            event.preventDefault();
            const cardId = event.dataTransfer.getData('text/plain');

            if (cardId) {
              onMoveCard(cardId, column.id);
            }
          }}
          className="glass-card flex min-h-[520px] flex-col rounded-3xl p-4"
        >
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-10 w-2 rounded-full bg-gradient-to-b ${column.accentClassName}`} />
              <div>
                <h2 className="text-lg font-bold text-gray-900">{column.title}</h2>
                <p className="text-xs text-gray-500">{column.hint}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gray-500">
              {columnCards.length}
            </span>
          </header>

          <div className="flex flex-1 flex-col gap-3">
            {columnCards.map(card => {
              const canManage =
                isAdmin || card.owner === currentUser || card.assignee === currentUser || board.owner === currentUser;

              return (
                <TaskCard
                  key={card.id}
                  card={card}
                  canManage={canManage}
                  onEdit={onEditCard}
                  onDelete={onDeleteCard}
                />
              );
            })}

            {columnCards.length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/35 p-6 text-center text-sm text-gray-400">
                Перетащите карточку сюда или создайте новую задачу.
              </div>
            )}
          </div>

          {activeComposerStatus === column.id ? (
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm">
              <div className="space-y-3">
                <input
                  value={taskDraft.title}
                  onChange={event => onTaskDraftChange({ ...taskDraft, title: event.target.value })}
                  placeholder="Название карточки"
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
                <textarea
                  value={taskDraft.description}
                  onChange={event => onTaskDraftChange({ ...taskDraft, description: event.target.value })}
                  placeholder="Описание"
                  rows={3}
                  className="glass-input w-full resize-none rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={taskDraft.assignee}
                    onChange={event => onTaskDraftChange({ ...taskDraft, assignee: event.target.value })}
                    placeholder="Исполнитель"
                    className="glass-input rounded-xl px-3 py-2 text-sm"
                  />
                  <select
                    value={taskDraft.priority}
                    onChange={event => onTaskDraftChange({ ...taskDraft, priority: event.target.value as TaskDraft['priority'] })}
                    className="glass-input rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <input
                  value={taskDraft.labels}
                  onChange={event => onTaskDraftChange({ ...taskDraft, labels: event.target.value })}
                  placeholder="Метки через запятую"
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={event => onTaskDraftChange({ ...taskDraft, dueDate: event.target.value })}
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCreateCard(column.id)}
                    disabled={!taskDraft.title.trim()}
                    className="btn-glass flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Добавить
                  </button>
                  <button
                    type="button"
                    onClick={onCloseComposer}
                    className="btn-glass-secondary rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenComposer(column.id)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-white/45 px-4 py-3 text-sm font-semibold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-white/80"
            >
              <Plus size={16} />
              Добавить карточку
            </button>
          )}
        </section>
      );
    })}
  </div>
);
