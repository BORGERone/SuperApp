import React, { useState } from 'react';
import { Calendar, CheckCircle2, GripVertical, MessageSquare, Pencil, Trash2, UserCircle } from 'lucide-react';
import { TaskCard as TaskCardModel, TaskDraft } from '../models/tasksModel';

const priorityClassNames = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-rose-100 text-rose-700 border-rose-200',
};

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const dateOnly = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCardClassName = (card: TaskCardModel) => {
  if (card.isCompleted) {
    return 'border-emerald-300 bg-emerald-50/95 shadow-emerald-100';
  }

  if (!card.dueDate) {
    return 'border-white/70 bg-white/75';
  }

  const today = dateOnly(new Date());

  if (card.dueDate < today) {
    return 'border-red-300 bg-red-50/95 shadow-red-100';
  }

  if (card.dueDate === today) {
    return 'border-yellow-300 bg-yellow-50/95 shadow-yellow-100';
  }

  return 'border-white/70 bg-white/75';
};

interface TaskCardProps {
  card: TaskCardModel;
  canManage: boolean;
  onEdit: (card: TaskCardModel, draft: TaskDraft) => void;
  onDelete: (cardId: string) => void;
  onToggleCompleted: (card: TaskCardModel) => void;
  onAddComment: (cardId: string, body: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  card,
  canManage,
  onEdit,
  onDelete,
  onToggleCompleted,
  onAddComment,
}) => {
  const [commentBody, setCommentBody] = useState('');

  const handleEdit = () => {
    const title = window.prompt('Название задачи', card.title);

    if (title === null || !title.trim()) {
      return;
    }

    const description = window.prompt('Описание задачи', card.description) ?? card.description;
    const labels = window.prompt('Метки через запятую', card.labels.join(', ')) ?? card.labels.join(', ');
    const dueDate = window.prompt('Срок в формате ГГГГ-ММ-ДД', card.dueDate) ?? card.dueDate;

    onEdit(card, {
      title,
      description,
      assigneeIds: card.assigneeIds,
      priority: card.priority,
      labels,
      dueDate,
    });
  };

  const handleAddComment = () => {
    if (!commentBody.trim()) {
      return;
    }

    onAddComment(card.id, commentBody.trim());
    setCommentBody('');
  };

  return (
    <article
      draggable={canManage}
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', card.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className={`group rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${getCardClassName(card)}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <GripVertical className="mt-1 flex-shrink-0 text-gray-300" size={18} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900">{card.title}</h3>
          {card.description && <p className="mt-1 line-clamp-3 text-xs leading-5 text-gray-500">{card.description}</p>}
        </div>
        {canManage && (
          <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onToggleCompleted(card)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              aria-label={card.isCompleted ? 'Отметить невыполненной' : 'Отметить выполненной'}
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Редактировать задачу"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              aria-label="Удалить задачу"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {card.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {card.labels.map(label => (
            <span key={label} className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <span className={`rounded-full border px-2 py-1 font-semibold ${priorityClassNames[card.priority]}`}>
          {priorityLabels[card.priority]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600">
          <UserCircle size={12} />
          {card.assigneeIds.length > 0 ? card.assigneeIds.join(', ') : 'Без ответственных'}
        </span>
        {card.dueDate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-600">
            <Calendar size={12} />
            {card.dueDate}
          </span>
        )}
        {card.isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">
            <CheckCircle2 size={12} />
            Выполнено
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-white/55 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-700">
          <MessageSquare size={14} />
          Комментарии
        </div>
        <div className="space-y-2">
          {card.comments.length === 0 ? (
            <p className="text-xs text-gray-400">Комментариев пока нет.</p>
          ) : (
            card.comments.map(comment => (
              <div key={comment.id} className="rounded-lg bg-white/75 px-3 py-2 text-xs text-gray-600">
                <div className="font-bold text-gray-800">{comment.authorName}</div>
                <div className="mt-1 whitespace-pre-wrap">{comment.body}</div>
              </div>
            ))
          )}
        </div>
        {canManage && (
          <div className="mt-3 flex gap-2">
            <input
              value={commentBody}
              onChange={event => setCommentBody(event.target.value)}
              placeholder="Добавить комментарий"
              className="glass-input min-w-0 flex-1 rounded-lg px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!commentBody.trim()}
              className="btn-glass rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отправить
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
