import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useMailStore } from '../features/mail/viewmodels/mailViewModel';

export const Layout: React.FC = () => {
  const { emails, setEmails } = useMailStore();

  // Периодическая проверка новых писем в inbox для обновления счетчика
  useEffect(() => {
    const checkInboxEmails = async () => {
      try {
        // Определяем базовый URL как в mailApi
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
        const API_BASE = isElectron ? 'http://localhost:3002/api/mail' : '/api/mail';
        
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
