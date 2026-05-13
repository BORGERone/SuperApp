import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Clock, MessageSquare, User as UserIcon } from 'lucide-react';
import { TaskCard, computeDeadlineState } from '../models/tasksModel';
import { useUpdateCard } from '../api/tasksApi';
import { useUsers } from '../../auth/api/usersApi';

interface CardItemProps {
  card: TaskCard;
  commentsCount: number;
  onOpen: (card: TaskCard) => void;
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

export const CardItem: React.FC<CardItemProps> = ({ card, commentsCount, onOpen }) => {
  const { data: users = [] } = useUsers();
  const updateCard = useUpdateCard();

  const userMap = useMemo(() => {
    const map = new Map<string, { username: string; email: string }>();
    (users as Array<{ id: string; username: string; email: string }>).forEach((user) =>
      map.set(user.id, user)
    );
    return map;
  }, [users]);

  const deadlineState = computeDeadlineState(card.deadline, card.completed);

  const cardClasses = card.completed
    ? 'bg-green-100/80 border-green-300 ring-1 ring-green-200'
    : deadlineState === 'overdue'
      ? 'bg-red-100/80 border-red-300 ring-1 ring-red-200'
      : deadlineState === 'today'
        ? 'bg-yellow-100/80 border-yellow-300 ring-1 ring-yellow-200'
        : 'bg-white/80 border-gray-200 hover:bg-white';

  const deadlineLabel = formatDeadline(card.deadline);
  const deadlineBadgeClasses = card.completed
    ? 'bg-green-200 text-green-800'
    : deadlineState === 'overdue'
      ? 'bg-red-200 text-red-800'
      : deadlineState === 'today'
        ? 'bg-yellow-200 text-yellow-800'
        : 'bg-gray-100 text-gray-700';

  const handleToggleCompleted = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updateCard.mutateAsync({
        id: card.id,
        input: { completed: !card.completed },
      });
    } catch (error) {
      console.error('Не удалось обновить статус карточки:', error);
    }
  };

  return (
    <div
      onClick={() => onOpen(card)}
      className={`group relative rounded-lg border ${cardClasses} p-3 shadow-sm cursor-pointer transition-colors`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggleCompleted}
          className={`mt-0.5 flex-shrink-0 ${
            card.completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label={card.completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
          title={card.completed ? 'Снять отметку выполнения' : 'Отметить выполненной'}
        >
          {card.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium text-gray-900 break-words ${
              card.completed ? 'line-through text-gray-500' : ''
            }`}
          >
            {card.title}
          </div>
          {card.description && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap break-words">
              {card.description}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {deadlineLabel && (
              <div
                className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${deadlineBadgeClasses}`}
              >
                <Clock size={12} />
                {deadlineLabel}
              </div>
            )}
            {commentsCount > 0 && (
              <div className="inline-flex items-center gap-1 text-xs text-gray-600">
                <MessageSquare size={12} />
                {commentsCount}
              </div>
            )}
            {card.assignees.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {card.assignees.slice(0, 3).map((userId) => {
                  const user = userMap.get(userId);
                  const label = user?.username || user?.email || userId;
                  return (
                    <div
                      key={userId}
                      className="inline-flex items-center gap-1 text-xs bg-blue-100/70 text-blue-700 rounded-full px-2 py-0.5 max-w-[140px]"
                      title={user?.email || label}
                    >
                      <UserIcon size={10} />
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
                {card.assignees.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{card.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
