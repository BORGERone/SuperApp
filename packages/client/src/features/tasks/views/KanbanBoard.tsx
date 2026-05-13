import React, { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { UserAutocomplete } from '../../auth/components/UserAutocomplete';
import { TaskCard } from '../components/TaskCard';
import { ColumnDraft, TaskBoard, TaskCard as TaskCardModel, TaskColumn, TaskDraft } from '../models/tasksModel';

interface KanbanBoardProps {
  board: TaskBoard;
  cards: TaskCardModel[];
  taskDraft: TaskDraft;
  columnDraft: ColumnDraft;
  activeComposerColumnId: string | null;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  onTaskDraftChange: (draft: TaskDraft) => void;
  onColumnDraftChange: (draft: ColumnDraft) => void;
  onOpenComposer: (columnId: string) => void;
  onCloseComposer: () => void;
  onCreateCard: (columnId: string) => void;
  onEditCard: (card: TaskCardModel, draft: TaskDraft) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onToggleCompleted: (card: TaskCardModel) => void;
  onAddComment: (cardId: string, body: string) => void;
  onCreateColumn: () => void;
  onUpdateColumn: (column: TaskColumn, draft: ColumnDraft) => void;
  onDeleteColumn: (columnId: string) => void;
}

const assigneeLabel = (value: string) => value || 'Пользователь';

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  cards,
  taskDraft,
  columnDraft,
  activeComposerColumnId,
  currentUserId,
  currentUserName,
  isAdmin,
  onTaskDraftChange,
  onColumnDraftChange,
  onOpenComposer,
  onCloseComposer,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onMoveCard,
  onToggleCompleted,
  onAddComment,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
}) => {
  const [assigneeInput, setAssigneeInput] = useState('');

  const removeAssignee = (assigneeId: string) => {
    onTaskDraftChange({
      ...taskDraft,
      assigneeIds: taskDraft.assigneeIds.filter(item => item !== assigneeId),
    });
  };

  const addAssignee = (user: { id?: string; username: string; email: string }) => {
    const assigneeId = user.username;

    if (!taskDraft.assigneeIds.includes(assigneeId)) {
      onTaskDraftChange({ ...taskDraft, assigneeIds: [...taskDraft.assigneeIds, assigneeId] });
    }

    setAssigneeInput('');
  };

  return (
    <div className="flex min-h-[560px] gap-4 overflow-x-auto pb-4">
      {board.columns.map(column => {
        const columnCards = cards.filter(card => card.columnId === column.id);

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
            className="glass-card flex min-h-[520px] w-[340px] flex-shrink-0 flex-col rounded-3xl p-4"
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={column.name}
                  onBlur={event => onUpdateColumn(column, { name: event.target.value, deadline: column.deadline })}
                  className="w-full rounded-xl border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-gray-900 hover:border-indigo-100 hover:bg-white/60 focus:border-indigo-200 focus:bg-white/80 focus:outline-none"
                  aria-label="Название колонки"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={13} />
                  <input
                    type="date"
                    value={column.deadline}
                    onChange={event => onUpdateColumn(column, { name: column.name, deadline: event.target.value })}
                    className="rounded-lg border border-transparent bg-white/45 px-2 py-1 text-xs hover:border-indigo-100 focus:border-indigo-200 focus:outline-none"
                    aria-label="Дедлайн колонки"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gray-500">{columnCards.length}</span>
                {board.columns.length > 1 && (isAdmin || column.ownerId === currentUserId || board.ownerId === currentUserId) && (
                  <button
                    type="button"
                    onClick={() => onDeleteColumn(column.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Удалить колонку"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {columnCards.map(card => {
                const canManage =
                  isAdmin ||
                  card.ownerId === currentUserId ||
                  card.assigneeIds.includes(currentUserName) ||
                  board.ownerId === currentUserId;

                return (
                  <TaskCard
                    key={card.id}
                    card={card}
                    canManage={canManage}
                    onEdit={onEditCard}
                    onDelete={onDeleteCard}
                    onToggleCompleted={onToggleCompleted}
                    onAddComment={onAddComment}
                  />
                );
              })}

              {columnCards.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/35 p-6 text-center text-sm text-gray-400">
                  Перетащите карточку сюда или создайте новую задачу.
                </div>
              )}
            </div>

            {activeComposerColumnId === column.id ? (
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
                  <div className="space-y-2">
                    <UserAutocomplete
                      value={assigneeInput}
                      onChange={setAssigneeInput}
                      onSelect={addAssignee}
                      placeholder="Выберите ответственных"
                    />
                    {taskDraft.assigneeIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {taskDraft.assigneeIds.map(assignee => (
                          <button
                            key={assignee}
                            type="button"
                            onClick={() => removeAssignee(assignee)}
                            className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                          >
                            {assigneeLabel(assignee)} ×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={taskDraft.priority}
                      onChange={event => onTaskDraftChange({ ...taskDraft, priority: event.target.value as TaskDraft['priority'] })}
                      className="glass-input rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                    <input
                      type="date"
                      value={taskDraft.dueDate}
                      onChange={event => onTaskDraftChange({ ...taskDraft, dueDate: event.target.value })}
                      className="glass-input rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    value={taskDraft.labels}
                    onChange={event => onTaskDraftChange({ ...taskDraft, labels: event.target.value })}
                    placeholder="Метки через запятую"
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
                    <button type="button" onClick={onCloseComposer} className="btn-glass-secondary rounded-xl px-4 py-2 text-sm font-semibold">
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

      <section className="glass-card flex h-fit w-[300px] flex-shrink-0 flex-col gap-3 rounded-3xl p-4">
        <h3 className="text-sm font-bold text-gray-800">Новая колонка</h3>
        <input
          value={columnDraft.name}
          onChange={event => onColumnDraftChange({ ...columnDraft, name: event.target.value })}
          placeholder="Например: Сделать в мае"
          className="glass-input rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={columnDraft.deadline}
          onChange={event => onColumnDraftChange({ ...columnDraft, deadline: event.target.value })}
          className="glass-input rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onCreateColumn}
          disabled={!columnDraft.name.trim()}
          className="btn-glass inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Создать колонку
        </button>
      </section>
    </div>
  );
};
