import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HardDrive, Mail, CheckSquare, Settings } from 'lucide-react';
import { useMailStore } from '../features/mail/viewmodels/mailViewModel';
import { useTaskCards } from '../features/tasks/api/tasksApi';
import { computeDeadlineState } from '../features/tasks/models/tasksModel';

function readCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
      return parsed.id;
    }
    return null;
  } catch {
    return null;
  }
}

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

// Нижняя панель навигации для телефонных разрешений. Дублирует основные
// разделы левого сайдбара (Почта, Диск, Задачи, Настройки) с теми же
// счётчиками непрочитанных писем и активных задач.
export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getUnreadCount, emails } = useMailStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: taskCards = [] } = useTaskCards();
  const currentUserId = readCurrentUserId();

  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [emails]);

  const taskBadge = React.useMemo(() => {
    if (!currentUserId) return { count: 0, tone: 'neutral' as const };
    let count = 0;
    let hasOverdue = false;
    let hasToday = false;
    for (const card of taskCards) {
      if (card.completed) continue;
      if (!card.assignees.includes(currentUserId)) continue;
      count += 1;
      const state = computeDeadlineState(card.deadline, card.completed);
      if (state === 'overdue') hasOverdue = true;
      else if (state === 'today') hasToday = true;
    }
    const tone = hasOverdue ? 'overdue' : hasToday ? 'today' : 'neutral';
    return { count, tone };
  }, [taskCards, currentUserId]);

  const taskBadgeBg =
    taskBadge.tone === 'overdue'
      ? 'rgba(239, 68, 68, 0.95)'
      : taskBadge.tone === 'today'
        ? 'rgba(245, 158, 11, 0.95)'
        : 'rgba(51, 65, 85, 0.95)';

  const tabs: NavTab[] = [
    { id: 'mail', label: 'Почта', icon: <Mail size={22} />, path: '/mail' },
    { id: 'drive', label: 'Диск', icon: <HardDrive size={22} />, path: '/drive' },
    { id: 'tasks', label: 'Задачи', icon: <CheckSquare size={22} />, path: '/tasks' },
    { id: 'settings', label: 'Настройки', icon: <Settings size={22} />, path: '/settings' },
  ];

  const isActive = (path: string) =>
    path === '/mail' ? location.pathname.startsWith('/mail') : location.pathname === path;

  const handleClick = (path: string) => {
    navigate(path === '/mail' ? '/mail/inbox' : path);
  };

  return (
    <nav className="mobile-nav glass-deep" role="navigation" aria-label="Основная навигация">
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleClick(tab.path)}
            className="mobile-nav__item"
            data-active={active ? 'true' : 'false'}
            style={{ color: active ? 'var(--color-primary)' : 'var(--text-primary)' }}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-nav__icon">
              {tab.icon}
              {tab.id === 'mail' && unreadCount > 0 && (
                <span className="mobile-nav__badge" style={{ background: 'rgba(51, 65, 85, 0.95)' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {tab.id === 'tasks' && taskBadge.count > 0 && (
                <span className="mobile-nav__badge" style={{ background: taskBadgeBg }}>
                  {taskBadge.count > 99 ? '99+' : taskBadge.count}
                </span>
              )}
            </span>
            <span className="mobile-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
