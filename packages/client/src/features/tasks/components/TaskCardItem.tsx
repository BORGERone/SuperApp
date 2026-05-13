import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  MessageCircle,
  Users,
} from 'lucide-react';
import { TaskCard, getCardDeadlineState } from '../models/tasksModel';
import { useUsers } from '../../auth/api/usersApi';

interface TaskCardItemProps {
  card: TaskCard;
  onClick: () => void;
  onToggleCompleted: (next: boolean) => void;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TaskCardItem: React.FC<TaskCardItemProps> = ({
  card,
  onClick,
  onToggleCompleted,
}) => {
  const { data: users = [] } = useUsers();
  const userMap = useMemo(() => {
    const map = new Map<string, { id: string; username: string }>();
    (users as any[]).forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const state = getCardDeadlineState(card);

  const stateClasses: Record<string, string> = {
    none: 'bg-white/80 border-gray-200/60',
    normal: 'bg-white/80 border-gray-200/60',
    today: 'bg-yellow-50/90 border-yellow-300',
    overdue: 'bg-red-50/90 border-red-300',
    completed: 'bg-green-50/90 border-green-300',
  };

  const deadlineLabel = formatDeadline(card.deadline);

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg p-3 border shadow-sm cursor-pointer hover:shadow-md transition-all ${
        stateClasses[state]
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted(!card.isCompleted);
          }}
          className={`mt-0.5 flex-shrink-0 transition-colors ${
            card.isCompleted ? 'text-green-600' : 'text-gray-400 hover:text-green-600'
          }`}
          aria-label={card.isCompleted ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
        >
          {card.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium text-gray-900 break-words ${
              card.isCompleted ? 'line-through text-gray-500' : ''
            }`}
          >
            {card.title}
          </div>

          {card.description && (
            <p className="mt-1 text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap break-words">
              {card.description}
            </p>
          )}

          {(deadlineLabel || card.assignees.length > 0 || (card.comments?.length ?? 0) > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              {deadlineLabel && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    state === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : state === 'today'
                      ? 'bg-yellow-100 text-yellow-800'
                      : state === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white/70 border border-gray-200/50'
                  }`}
                >
                  <Clock size={12} />
                  {deadlineLabel}
                </span>
              )}

              {card.assignees.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-gray-200/50">
                  <Users size={12} />
                  {card.assignees
                    .slice(0, 3)
                    .map((id) => userMap.get(id)?.username || '...')
                    .join(', ')}
                  {card.assignees.length > 3 && ` +${card.assignees.length - 3}`}
                </span>
              )}

              {(card.comments?.length ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 border border-gray-200/50">
                  <MessageCircle size={12} />
                  {card.comments.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
