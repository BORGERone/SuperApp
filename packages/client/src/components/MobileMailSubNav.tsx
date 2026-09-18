import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Inbox, Send, Trash2, Edit } from 'lucide-react';
import { useMailStore } from '../features/mail/viewmodels/mailViewModel';

interface MailSubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  showBadge?: boolean;
}

export const MobileMailSubNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCompose, getUnreadCount, emails, clearSelectedEmail } = useMailStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [emails]);

  const subItems: MailSubItem[] = [
    {
      id: 'compose',
      label: 'Написать',
      icon: <Edit size={18} />,
      path: '/mail/compose',
    },
    {
      id: 'inbox',
      label: 'Входящие',
      icon: <Inbox size={18} />,
      path: '/mail/inbox',
      showBadge: true,
    },
    {
      id: 'sent',
      label: 'Отправленные',
      icon: <Send size={18} />,
      path: '/mail/sent',
    },
    {
      id: 'trash',
      label: 'Корзина',
      icon: <Trash2 size={18} />,
      path: '/mail/trash',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleClick = (path: string) => {
    if (path === '/mail/compose') {
      openCompose();
    } else {
      if (location.pathname === path) {
        clearSelectedEmail();
      } else {
        navigate(path);
      }
    }
  };

  return (
    <nav
      className="glass-mid flex items-center justify-around px-2 py-2 border-t"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: '64px',
        zIndex: 49,
        borderColor: 'var(--glass-border-soft)',
      }}
      role="navigation"
      aria-label="Подразделы почты"
    >
      {subItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.path)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[64px]"
            style={{
              background: active ? 'rgba(var(--color-primary-rgb), 0.14)' : 'transparent',
              color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
              transition: 'background 200ms ease, color 200ms ease',
            }}
            aria-current={active ? 'page' : undefined}
          >
            <span className="relative">
              {item.icon}
              {item.showBadge && unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-white/20 shadow"
                  style={{ background: 'rgba(51, 65, 85, 0.95)' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
