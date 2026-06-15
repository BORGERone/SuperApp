import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_LEFT_MARGIN } from './Sidebar';
import { TitleBar } from './TitleBar';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMailStore } from '../features/mail/viewmodels/mailViewModel';
import { getApiBase } from '../lib/serverConfig';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { emails, setEmails } = useMailStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  // Ключ верхнего раздела (drive/mail/tasks/settings). Меняется только при
  // переходе между вкладками — тогда обёртка пересоздаётся и проигрывает
  // плавный переход. Внутри одного раздела (напр. папки почты) не дёргается.
  const sectionKey = location.pathname.split('/')[1] || 'home';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  // Подписываемся на изменения localStorage от Sidebar — Sidebar при
  // переключении сохраняет состояние в localStorage и шлёт CustomEvent,
  // чтобы TitleBar знал ширину brand-зоны.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      if (detail && typeof detail.collapsed === 'boolean') {
        setIsSidebarCollapsed(detail.collapsed);
      }
    };
    window.addEventListener('sidebar:collapsed-change', handler as EventListener);
    return () => window.removeEventListener('sidebar:collapsed-change', handler as EventListener);
  }, []);

  // Периодическая проверка новых писем в inbox для обновления счетчика
  useEffect(() => {
    const checkInboxEmails = async () => {
      try {
        // Базовый URL бэкенда (см. serverConfig.ts).
        const API_BASE = `${getApiBase()}/api/mail`;
        
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE}?folder=inbox`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const responseText = await response.text();
          
          let inboxEmails;
          try {
            const parsedResponse = JSON.parse(responseText);
            
            // API возвращает объект с полем emails
            if (parsedResponse && parsedResponse.emails && Array.isArray(parsedResponse.emails)) {
              inboxEmails = parsedResponse.emails;
            } else {
              return;
            }
          } catch (parseError) {
            return;
          }
          
          const currentInboxEmails = emails.filter(e => e.folder === 'inbox');
          
          // Проверяем, есть ли новые письма
          if (inboxEmails.length !== currentInboxEmails.length) {
            const otherEmails = emails.filter(e => e.folder !== 'inbox');
            setEmails([...otherEmails, ...inboxEmails]);
          }
        }
      } catch (error) {
        // Игнорируем ошибки, чтобы не ломать приложение
      }
    };

    // Запускаем проверку каждые 10 секунд
    const interval = setInterval(checkInboxEmails, 10000);
    
    // Также запускаем сразу
    checkInboxEmails();

    return () => clearInterval(interval);
  }, [emails, setEmails]);

  return (
    <>
      {/* Фоновые слои приложения (контролируются ThemeProvider через CSS-переменные) */}
      <div className="app-bg" aria-hidden="true">
        <div className="app-bg__base" />
        <div className="app-bg__gradient" />
        <div className="app-bg__image" />
        <div className="app-bg__veil" />
      </div>

      {/* Кастомный титлбар, визуально вкладывающийся в верх сайдбара.
          На телефонных разрешениях прячем его — навигация уходит вниз. */}
      {!isMobile && (
        <TitleBar
          collapsed={isSidebarCollapsed}
          sidebarWidthCollapsed={SIDEBAR_WIDTH_COLLAPSED}
          sidebarWidthExpanded={SIDEBAR_WIDTH_EXPANDED}
          sidebarLeftMargin={SIDEBAR_LEFT_MARGIN}
        />
      )}

      <div className={isMobile ? 'flex flex-col h-screen' : 'flex h-screen'}>
        {!isMobile && <Sidebar />}
        <main
          className="flex-1 overflow-hidden"
          style={isMobile ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' } : undefined}
        >
          <div key={sectionKey} className="h-full page-fade-in">
            {children}
          </div>
        </main>
        {isMobile && <MobileNav />}
      </div>
    </>
  );
};
