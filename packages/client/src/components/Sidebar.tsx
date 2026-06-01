import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HardDrive,
  Mail,
  CheckSquare,
  Settings,
  Inbox,
  Send,
  Trash2,
  Edit,
  ChevronsUp
} from 'lucide-react';
import { useMailStore } from '../features/mail/viewmodels/mailViewModel';
import { useTaskCards } from '../features/tasks/api/tasksApi';
import { computeDeadlineState } from '../features/tasks/models/tasksModel';

// Константы размеров боковой панели и титлбара. Экспортируются, чтобы
// Layout/TitleBar могли выровнять brand-зону строго по верху сайдбара.
export const SIDEBAR_WIDTH_COLLAPSED = 64; // tailwind w-16
export const SIDEBAR_WIDTH_EXPANDED = 256; // tailwind w-64
export const SIDEBAR_LEFT_MARGIN = 0; // Прижата к левой грани экрана
export const TITLEBAR_HEIGHT = 36;

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

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  subItems?: SidebarItem[];
  showBadge?: boolean;
}

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { openCompose, getUnreadCount, emails, clearSelectedEmail } = useMailStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: taskCards = [] } = useTaskCards();
  const currentUserId = readCurrentUserId();

  // Сохраняем состояние боковой панели в localStorage и уведомляем
  // Layout/TitleBar, чтобы выровнять brand-зону по текущей ширине.
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sidebar:collapsed-change', { detail: { collapsed: isCollapsed } }),
      );
    }
  }, [isCollapsed]);

  // Счётчик задач: только карточки, где я в ответственных и которые ещё не выполнены.
  // Цвет: красный если есть просрочка, жёлтый если есть срок сегодня, иначе нейтральный.
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

  const taskBadgeClasses =
    taskBadge.tone === 'overdue'
      ? 'bg-red-500/95 text-white border-red-200/40 shadow-[0_0_10px_rgba(239,68,68,0.45)]'
      : taskBadge.tone === 'today'
        ? 'bg-amber-400/95 text-white border-amber-200/40 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
        : 'bg-slate-700/90 text-white border-white/20 shadow';
  const [animateSubItems, setAnimateSubItems] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showContainer, setShowContainer] = useState(false);

  // Обновляем счетчик при изменении писем в store
  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [emails]);

    
  const menuItems: SidebarItem[] = [
    {
      id: 'mail',
      label: 'Почта',
      icon: <Mail size={20} />,
      path: '/mail',
      subItems: [
        {
          id: 'compose',
          label: 'Написать письмо',
          icon: <Edit size={16} />,
          path: '/mail/compose',
        },
        {
          id: 'inbox',
          label: 'Входящие',
          icon: <Inbox size={16} />,
          path: '/mail/inbox',
          showBadge: true,
        },
        {
          id: 'sent',
          label: 'Отправленные',
          icon: <Send size={16} />,
          path: '/mail/sent',
        },
        {
          id: 'trash',
          label: 'Корзина',
          icon: <Trash2 size={16} />,
          path: '/mail/trash',
        },
      ],
    },
    {
      id: 'drive',
      label: 'Диск',
      icon: <HardDrive size={20} />,
      path: '/drive',
    },
    {
      id: 'tasks',
      label: 'Задачи',
      icon: <CheckSquare size={20} />,
      path: '/tasks',
    },
  ];

  const handleItemClick = (path: string) => {
    // Если это кнопка "Написать письмо", открываем модальное окно
    if (path === '/mail/compose') {
      openCompose();
    } else if (path === '/mail') {
      navigate('/mail/inbox');
    } else {
      // Если кликаем на тот же подпункт папки (inbox, sent, trash), закрываем письмо
      if (location.pathname === path && (path === '/mail/inbox' || path === '/mail/sent' || path === '/mail/trash')) {
        clearSelectedEmail();
      } else {
        navigate(path);
      }
    }
  };

  const isActive = (path: string) => {
    return path === '/mail'
      ? location.pathname.startsWith('/mail')
      : location.pathname === path;
  };

  const isSubItemActive = (subPath: string) => location.pathname === subPath;

  // Определяем, активна ли вкладка почты
  const isMailActive = location.pathname.startsWith('/mail');
  
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Автоматически раскрываем почту, когда она активна, и скрываем когда не активна
  useEffect(() => {
    if (isMailActive) {
      if (!expandedItems.includes('mail')) {
        setExpandedItems(['mail']);
      }
      setIsHiding(false);
      setShowContainer(true);
      const t = setTimeout(() => setAnimateSubItems(true), 80);
      return () => clearTimeout(t);
    } else {
      setExpandedItems((prev) => prev.filter((id) => id !== 'mail'));
      setIsHiding(true);
      const t = setTimeout(() => {
        setAnimateSubItems(false);
        setShowContainer(false);
        setIsHiding(false);
      }, 420);
      return () => clearTimeout(t);
    }
  }, [isMailActive]);



  return (
    <div
      className={`glass-deep sidebar-anim flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        // Сайдбар занимает всю высоту экрана
        height: '100vh',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Кнопка сворачивания/разворачивания */}
      <div className="p-3 flex justify-start" style={{ paddingTop: `${TITLEBAR_HEIGHT + 12}px` }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn-icon"
          aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          <div className="w-6 h-5 relative flex items-center justify-center">
            {/* Бургер (три полоски) — в развёрнутом состоянии */}
            <div
              className="absolute inset-0 flex flex-col justify-center"
              style={{
                opacity: isCollapsed ? 0 : 1,
                transform: isCollapsed ? 'scale(0.6)' : 'none',
                transition:
                  'opacity 360ms cubic-bezier(0.16, 1, 0.3, 1), transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div className="w-6 h-0.5 bg-current rounded-full" />
              <div className="w-6 h-0.5 bg-current rounded-full my-1" />
              <div className="w-6 h-0.5 bg-current rounded-full" />
            </div>
            {/* Двойная стрелка вверх — в свёрнутом состоянии */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity: isCollapsed ? 1 : 0,
                transform: isCollapsed ? 'none' : 'scale(0.6)',
                transition:
                  'opacity 360ms cubic-bezier(0.16, 1, 0.3, 1), transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <ChevronsUp size={24} strokeWidth={2.75} />
            </div>
          </div>
        </button>
      </div>

      {/* Основные кнопки навигации */}
      <div className="flex-1 px-2 space-y-2 overflow-visible">
        {menuItems.map((item) => (
          <div key={item.id}>
            {!isCollapsed ? (
              <>
                <button
                  onClick={() => handleItemClick(item.path)}
                  className={`relative glass-mid blur-smooth sidebar-anim w-full flex items-center gap-3 px-3 py-2.5 z-10`}
                  style={{
                    transition:
                      'background 220ms cubic-bezier(0.16, 1, 0.3, 1), color 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isActive(item.path)
                      ? 'rgba(var(--color-primary-rgb), 0.18)'
                      : undefined,
                    color: isActive(item.path) ? 'var(--color-primary)' : 'var(--text-primary)',
                  }}
                >
                    {item.icon}
                    <span className={`font-medium ${isActive(item.path) ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                    {/* Счетчик непрочитанных писем для почты */}
                    {item.id === 'mail' && unreadCount > 0 && (
                      <span className="ml-auto bg-slate-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {/* Счётчик моих активных задач с цветом по самой срочной из них */}
                    {item.id === 'tasks' && taskBadge.count > 0 && (
                      <span className={`ml-auto ${taskBadgeClasses} backdrop-blur-md text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border`}>
                        {taskBadge.count > 99 ? '99+' : taskBadge.count}
                      </span>
                    )}
                  </button>
                  
                  {item.subItems && (
                    <div
                      className="glass-top blur-smooth-top applied overflow-hidden"
                      style={{
                        // Островок подпунктов теперь стоит отдельным блоком
                        // под островком почты, не наезжая на него (как titlebar↔sidebar).
                        maxHeight: expandedItems.includes(item.id) && isMailActive ? '320px' : '0px',
                        opacity: expandedItems.includes(item.id) && isMailActive ? 1 : 0,
                        paddingTop: expandedItems.includes(item.id) && isMailActive ? '8px' : '0px',
                        paddingBottom: expandedItems.includes(item.id) && isMailActive ? '8px' : '0px',
                        marginTop: expandedItems.includes(item.id) && isMailActive ? '6px' : '0px',
                        transition:
                          'max-height 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), padding 380ms cubic-bezier(0.16, 1, 0.3, 1), margin 380ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div className="space-y-1 px-2">
                        {item.subItems.map((subItem, index) => (
                          <button
                            key={`expanded-${subItem.id}`}
                            onClick={() => handleItemClick(subItem.path)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-[10px] ${
                              subItem.path === '/mail/compose'
                                ? 'btn-glass-secondary'
                                : ''
                            }`}
                            style={{
                              background:
                                subItem.path !== '/mail/compose' && isSubItemActive(subItem.path)
                                  ? 'rgba(var(--color-primary-rgb), 0.16)'
                                  : undefined,
                              color:
                                subItem.path !== '/mail/compose' && isSubItemActive(subItem.path)
                                  ? 'var(--color-primary)'
                                  : 'var(--text-primary)',
                              transform:
                                expandedItems.includes(item.id) && isMailActive
                                  ? 'translateY(0)'
                                  : 'translateY(-12px)',
                              opacity: expandedItems.includes(item.id) && isMailActive ? 1 : 0,
                              transition:
                                'transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms cubic-bezier(0.16, 1, 0.3, 1), background 200ms ease-out, color 200ms ease-out',
                              transitionDelay:
                                expandedItems.includes(item.id) && isMailActive
                                  ? `${index * 50}ms`
                                  : `${(item.subItems!.length - 1 - index) * 40}ms`,
                            }}
                          >
                            {subItem.icon}
                            <span
                              className={`font-medium text-sm ${
                                isSubItemActive(subItem.path) ? 'font-semibold' : ''
                              }`}
                            >
                              {subItem.label}
                            </span>
                            {subItem.showBadge && unreadCount > 0 && (
                              <span className="ml-auto bg-slate-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <>
                {item.id === 'mail' && (
                  <>
                  <div className="relative">
                      <div
                        className="absolute glass-mid pointer-events-none"
                        style={{
                          inset: showContainer && (animateSubItems && !isHiding) ? '0 4px' : 'auto 4px auto 4px',
                          top: 0,
                          height: showContainer && (animateSubItems && !isHiding) ? 'auto' : '44px',
                          bottom: showContainer && (animateSubItems && !isHiding) ? '0px' : 'auto',
                          opacity: 1,
                          transition:
                            'inset 380ms cubic-bezier(0.16, 1, 0.3, 1), height 380ms cubic-bezier(0.16, 1, 0.3, 1), bottom 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                      <div className="relative flex flex-col gap-1">
                        <div className="relative">
                          <button
                            onClick={() => handleItemClick(item.path)}
                            className={`w-full p-3 rounded-[10px] flex items-center justify-center`}
                            style={{
                              background: isActive(item.path)
                                ? 'rgba(var(--color-primary-rgb), 0.18)'
                                : 'transparent',
                              color: isActive(item.path) ? 'var(--color-primary)' : 'var(--text-primary)',
                              transition:
                                'background 220ms cubic-bezier(0.16, 1, 0.3, 1), color 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                            title={item.label}
                          >
                            {item.icon}
                            {item.id === 'mail' && unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-slate-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow">
                                {unreadCount > 99 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>
                        </div>
                        {(isMailActive || animateSubItems) && (
                          <div
                            className="overflow-hidden"
                            style={{
                              maxHeight: (animateSubItems && !isHiding) ? '240px' : '0px',
                              opacity: (animateSubItems && !isHiding) ? 1 : 0,
                              transform: (animateSubItems && !isHiding) ? 'translateY(0)' : 'translateY(-10px)',
                              transition:
                                'max-height 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          >
                            <div>
                              {item.subItems && item.subItems.map((subItem, index) => (
                                <div key={`collapsed-${subItem.id}`} className="relative">
                                  <button
                                    data-subitem={subItem.id}
                                    onClick={() => handleItemClick(subItem.path)}
                                    className="w-full p-2 rounded-[8px] flex items-center justify-center"
                                    style={{
                                      background: isSubItemActive(subItem.path)
                                        ? 'rgba(var(--color-primary-rgb), 0.16)'
                                        : 'transparent',
                                      color: isSubItemActive(subItem.path)
                                        ? 'var(--color-primary)'
                                        : 'var(--text-primary)',
                                      opacity: (animateSubItems && !isHiding) ? 1 : 0,
                                      transform: (animateSubItems && !isHiding) ? 'translateY(0)' : 'translateY(-10px)',
                                      transition:
                                        'background 200ms ease-out, color 200ms ease-out, transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                                      transitionDelay: (animateSubItems && !isHiding)
                                        ? `${index * 50}ms`
                                        : isHiding
                                          ? `${(item.subItems!.length - 1 - index) * 35}ms`
                                          : '0ms',
                                    }}
                                    title={subItem.label}
                                  >
                                    {subItem.icon}
                                  </button>
                                  {subItem.showBadge && unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 bg-slate-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-[10px] border border-white/20 shadow">
                                      {unreadCount > 99 ? '9+' : unreadCount}
                                    </span>
                                  )}
                                </div>
                              ))}
                              <div className="h-1" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {item.id !== 'mail' && (
                  <div className="relative">
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className="w-full p-3 rounded-[10px] flex items-center justify-center"
                      style={{
                        background: isActive(item.path)
                          ? 'rgba(var(--color-primary-rgb), 0.18)'
                          : 'transparent',
                        color: isActive(item.path) ? 'var(--color-primary)' : 'var(--text-primary)',
                        transition:
                          'background 220ms cubic-bezier(0.16, 1, 0.3, 1), color 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      title={item.label}
                    >
                      {item.icon}
                    </button>
                    {item.id === 'tasks' && taskBadge.count > 0 && (
                      <span className={`absolute -top-1 -right-1 ${taskBadgeClasses} backdrop-blur-md text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border`}>
                        {taskBadge.count > 99 ? '9+' : taskBadge.count}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Кнопка настроек внизу */}
      <div className="p-2">
        <button
          onClick={() => handleItemClick('/settings')}
          className={`w-full ${isCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5'} rounded-[10px] flex items-center gap-3`}
          style={{
            background: isActive('/settings')
              ? 'rgba(var(--color-primary-rgb), 0.18)'
              : 'transparent',
            color: isActive('/settings') ? 'var(--color-primary)' : 'var(--text-primary)',
            transition:
              'background 220ms cubic-bezier(0.16, 1, 0.3, 1), color 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title={isCollapsed ? 'Настройки' : undefined}
        >
          <Settings size={20} />
          {!isCollapsed && (
            <span className="font-medium">Настройки</span>
          )}
        </button>
      </div>
    </div>
  );
};
