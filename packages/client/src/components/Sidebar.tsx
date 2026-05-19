import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  HardDrive, 
  Mail, 
  CheckSquare, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Inbox,
  Send,
  Trash2,
  Edit
} from 'lucide-react';
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
  const { openCompose, getUnreadCount, addEmail, emails, clearSelectedEmail } = useMailStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: taskCards = [] } = useTaskCards();
  const currentUserId = readCurrentUserId();

  // Сохраняем состояние боковой панели в localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
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
        : 'bg-gray-700/90 text-white border-white/20 shadow-lg';
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
    // Для почты проверяем начало пути, для остальных точное совпадение
    const result = path === '/mail' 
      ? location.pathname.startsWith('/mail')
      : location.pathname === path;
    
    console.log('isActive check:', { path, pathname: location.pathname, result });
    return result;
  };

  const isSubItemActive = (subPath: string) => {
    const result = location.pathname === subPath;
    console.log('isSubItemActive check:', { subPath, pathname: location.pathname, result });
    return result;
  };

  // Определяем, активна ли вкладка почты
  const isMailActive = location.pathname.startsWith('/mail');
  
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Автоматически раскрываем почту, когда она активна, и скрываем когда не активна
  useEffect(() => {
    console.log('🔍 Mail state changed:', { isMailActive, animateSubItems, isHiding, showContainer });
    
    if (isMailActive) {
      if (!expandedItems.includes('mail')) {
        setExpandedItems(['mail']);
      }
      setIsHiding(false);
      setShowContainer(true);
      console.log('📧 Mail activated - starting show animation');
      // Запускаем анимацию подпунктов в свернутом состоянии с небольшой задержкой
      setTimeout(() => {
        console.log('✨ Setting animateSubItems to true');
        setAnimateSubItems(true);
      }, 100);
    } else {
      setExpandedItems(prev => prev.filter(id => id !== 'mail'));
      setIsHiding(true);
      console.log('📪 Mail deactivated - starting hide animation');
      // Добавляем задержку перед скрытием подпунктов для анимации исчезновения
      setTimeout(() => {
        console.log('👋 Setting animateSubItems to false, showContainer to false');
        setAnimateSubItems(false);
        setShowContainer(false);
        setIsHiding(false);
      }, 500);
    }
  }, [isMailActive]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div
      className={`glass-card h-screen flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Кнопка сворачивания/разворачивания */}
      <div className="p-4 flex justify-start">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
        >
          <div className="w-6 h-5 relative flex flex-col justify-center">
            <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 origin-center ${
              isCollapsed ? '-rotate-45 -translate-y-1' : ''
            }`} />
            <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 my-1 ${
              isCollapsed ? 'rotate-45 -translate-y-1' : ''
            }`} />
            <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 ${
              isCollapsed ? 'rotate-90 scale-75' : ''
            }`} />
          </div>
        </button>
      </div>

      {/* Основные кнопки навигации */}
      <div className="flex-1 px-2 space-y-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            {!isCollapsed ? (
              <>
                <button
                  onClick={() => handleItemClick(item.path)}
                  className={`relative glass-card rounded-xl p-3 w-full flex items-center gap-3 transition-all duration-200 z-10 ${
                    isActive(item.path)
                      ? 'bg-blue-200/90 text-blue-700 ring-2 ring-blue-400/30'
                      : 'hover:bg-white/60 text-gray-700'
                  }`}
                >
                    {item.icon}
                    <span className={`font-medium ${
                      isActive(item.path) ? 'text-blue-700 font-semibold' : 'text-gray-700'
                    }`}>{item.label}</span>
                    {/* Счетчик непрочитанных писем для почты */}
                    {item.id === 'mail' && unreadCount > 0 && (
                      <span className="ml-auto bg-gray-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow-lg">
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
                    <div className={`rounded-lg glass-card overflow-hidden transition-all duration-500 ease-in-out ${
                      expandedItems.includes(item.id) && isMailActive
                        ? 'max-h-96 opacity-100 pt-4 pb-2 -mt-2' 
                        : 'max-h-0 opacity-0 py-0'
                    }`}>
                      <div className="space-y-1">
                        {item.subItems.map((subItem, index) => (
                          <button
                            key={`expanded-${subItem.id}`}
                            onClick={() => handleItemClick(subItem.path)}
                            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                              subItem.path === '/mail/compose' 
                                ? 'btn-glass-secondary'
                                : isSubItemActive(subItem.path)
                                  ? 'bg-blue-200/90 text-blue-700'
                                  : 'hover:bg-white/60 text-gray-700'
                            }`}
                            style={{
                              transform: expandedItems.includes(item.id) && isMailActive
                                ? 'translateY(0)' 
                                : 'translateY(-30px)',
                              opacity: expandedItems.includes(item.id) && isMailActive ? 1 : 0,
                              transition: 'all 0.5s ease-in-out',
                              transitionDelay: expandedItems.includes(item.id) && isMailActive ? `${index * 80}ms` : `${(item.subItems!.length - 1 - index) * 100}ms`
                            }}
                          >
                            {subItem.icon}
                            <span className={`font-medium text-sm ${
                              isSubItemActive(subItem.path) ? 'text-blue-700 font-semibold' : 'text-gray-700'
                            }`}>{subItem.label}</span>
                            {subItem.showBadge && unreadCount > 0 && (
                              <span className="ml-auto bg-gray-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow-lg">
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
                      <div className={`absolute bg-gradient-to-b from-gray-200/30 to-gray-300/40 backdrop-blur-md rounded-md transition-all duration-500 ease-in-out ${
                        showContainer && (animateSubItems && !isHiding)
                          ? 'inset-x-0 top-0 bottom-0 m-1 opacity-100' 
                          : 'top-0 left-0 right-0 h-10 m-1 opacity-100'
                      }`} />
                      <div className="relative flex flex-col gap-1">
                        <div className="relative">
                          <button
                            onClick={() => handleItemClick(item.path)}
                            className={`w-full p-3 rounded-lg flex items-center justify-center transition-all duration-200 ${
                              isActive(item.path)
                                ? 'bg-blue-200/90 text-blue-700'
                                : 'bg-white/60 hover:bg-white/70 text-gray-700'
                            }`}
                            title={item.label}
                          >
                            {item.icon}
                            {/* Счетчик непрочитанных писем для почты в свернутом состоянии */}
                            {item.id === 'mail' && unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-gray-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white/20 shadow-lg">
                                {unreadCount > 99 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>
                        </div>
                        {(isMailActive || animateSubItems) && (
                          <div 
                            className="overflow-hidden transition-all duration-500 ease-in-out"
                            style={{
                              maxHeight: (animateSubItems && !isHiding) ? '240px' : '0px',
                              opacity: (animateSubItems && !isHiding) ? 1 : 0,
                              transform: (animateSubItems && !isHiding) ? 'translateY(0)' : 'translateY(-10px)'
                            }}
                          >
                            <div>
                              {item.subItems && item.subItems.map((subItem, index) => (
                                <div key={`collapsed-${subItem.id}`} className="relative">
                                  <button
                                    data-subitem={subItem.id}
                                    onClick={() => handleItemClick(subItem.path)}
                                    className={`w-full p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                      isSubItemActive(subItem.path)
                                        ? 'bg-white/70 text-blue-700'
                                        : 'hover:bg-white/60 text-gray-700'
                                    }`}
                                    style={{ 
                                      opacity: (animateSubItems && !isHiding) ? 1 : 0,
                                      transform: (animateSubItems && !isHiding) ? 'translateY(0)' : 'translateY(-15px)',
                                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                      transitionDelay: (animateSubItems && !isHiding) ? `${index * 60}ms` : isHiding ? `${(item.subItems!.length - 1 - index) * 40}ms` : '0ms'
                                    }}
                                    title={subItem.label}
                                  >
                                    {subItem.icon}
                                  </button>
                                  {subItem.showBadge && unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 bg-gray-700/90 backdrop-blur-md text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-[10px] border border-white/20 shadow-lg">
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
                      className={`w-full p-3 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-blue-200/90 text-blue-700'
                          : 'bg-white/60 hover:bg-white/70 text-gray-700'
                      }`}
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
          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
            isActive('/settings')
              ? 'bg-blue-200/90 text-blue-700'
              : 'bg-white/60 hover:bg-white/70 text-gray-700'
          }`}
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
