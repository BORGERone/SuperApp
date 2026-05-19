import React, { useEffect, useState, useRef } from 'react';
import { Search, Trash2, Star, Filter } from 'lucide-react';
import { useMailStore } from '../viewmodels/mailViewModel';
import { MailFolder, Email } from '../models/mailModel';
import { MailList } from '../components/MailList';
import { MailItem } from '../components/MailItem';
import { ComposeModal } from '../components/ComposeModal';
import { useEmails, useUpdateEmail, useDeleteEmail, useMoveEmail } from '../api/mailApi';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { showNotification, requestNotificationPermission } from '../../../utils/notifications';

export const MailView: React.FC = () => {
  const location = useLocation();
  const previousEmailsCount = useRef(0);
  const hasRequestedPermission = useRef(false);
  
  // Определяем текущую папку из URL параметров
  const getFolderFromPath = (): MailFolder => {
    const pathParts = location.pathname.split('/');
    const folderPart = pathParts[pathParts.length - 1];
    return ['inbox', 'sent', 'trash'].includes(folderPart) ? folderPart as MailFolder : 'inbox';
  };

  const {
    emails,
    selectedEmails,
    selectedEmail,
    currentFolder,
    filters,
    isComposeOpen,
    replyEmail,
    setEmails,
    setCurrentFolder,
    setFilters,
    openCompose,
    closeCompose,
    deleteEmail,
    moveToFolder,
    markAsRead,
    markAsUnread,
    toggleStar,
    toggleEmailSelection,
    setSelectedEmail,
    clearSelectedEmail,
  } = useMailStore();

  const [searchQuery, setSearchQuery] = useState(filters.search);

  // Обновляем currentFolder при изменении URL
  useEffect(() => {
    const folder = getFolderFromPath();
    if (folder !== currentFolder) {
      setCurrentFolder(folder);
      clearSelectedEmail();
    }
  }, [location.pathname, currentFolder]);

  // API вызовы
  const { data: emailsData = [] } = useEmails({
    folder: currentFolder,
    search: filters.search,
    isUnreadOnly: filters.isUnreadOnly,
    isStarredOnly: filters.isStarredOnly,
  });

  // Запрос разрешения на уведомления при первом рендере
  useEffect(() => {
    if (!hasRequestedPermission.current) {
      requestNotificationPermission();
      hasRequestedPermission.current = true;
    }
  }, []);

  // Периодическое обновление для папки inbox
  const queryClient = useQueryClient();
  useEffect(() => {
    if (currentFolder === 'inbox' && !filters.search) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['emails'] });
      }, 5000); // Каждые 5 секунд

      return () => clearInterval(interval);
    }
    return undefined;
  }, [currentFolder, filters.search, queryClient]);

  // Отслеживание новых писем и показ уведомлений
  useEffect(() => {
    if (currentFolder === 'inbox' && emailsData.length > 0) {
      const currentCount = emailsData.length;
      
      // Если количество писем увеличилось, показываем уведомление
      if (currentCount > previousEmailsCount.current && previousEmailsCount.current > 0) {
        const newEmailsCount = currentCount - previousEmailsCount.current;
        const latestEmail = emailsData[0]; // Новые письма будут в начале массива
        
        showNotification(
          `Новое письмо${newEmailsCount > 1 ? 'я' : ''}`,
          `${latestEmail.from}: ${latestEmail.subject}`,
          'email'
        );
      }
      
      previousEmailsCount.current = currentCount;
    }
  }, [emailsData, currentFolder]);

  
  const updateEmailMutation = useUpdateEmail();
  const deleteEmailMutation = useDeleteEmail();
  const moveEmailMutation = useMoveEmail();

  // Безопасное обновление store при получении данных с API
  useEffect(() => {
    if (emailsData && emailsData.length > 0) {
      // Проверяем, что данные действительно изменились
      const currentEmailsIds = emails.map(e => e.id);
      const newEmailsIds = emailsData.map(e => e.id);
      
      const hasChanges = 
        currentEmailsIds.length !== newEmailsIds.length ||
        !currentEmailsIds.every(id => newEmailsIds.includes(id));
      
      if (hasChanges) {
        if (currentFolder === 'inbox') {
          setEmails(emailsData);
        } else {
          // Для других папок, добавляем письма без перезаписи существующих
          const existingEmails = emails;
          const newEmails = emailsData.filter(email => 
            !existingEmails.some(existing => existing.id === email.id)
          );
          if (newEmails.length > 0) {
            setEmails([...existingEmails, ...newEmails]);
          }
        }
      }
    }
  }, [emailsData, currentFolder]);

  
  
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ search: query });
  };

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      updateEmailMutation.mutate({
        id: email.id,
        updates: { isRead: true }
      });
      markAsRead(email.id);
    }
  };

  const handleDelete = () => {
    console.log('handleDelete called:', {
      selectedEmailsCount: selectedEmails.length,
      selectedEmail: selectedEmail ? selectedEmail.id : null
    });
    
    if (selectedEmails.length > 0) {
      console.log('Deleting multiple emails:', selectedEmails);
      console.log('Email details to delete:', selectedEmails.map(id => {
        const email = (emailsData || []).find(e => e.id === id);
        return email ? {
          id: email.id,
          subject: email.subject,
          from: email.from,
          to: email.to,
          folder: email.folder
        } : { id, found: false };
      }));
      
      selectedEmails.forEach(id => {
        deleteEmailMutation.mutate(id);
        deleteEmail(id);
      });
    } else if (selectedEmail) {
      console.log('Deleting single email:', selectedEmail.id);
      deleteEmailMutation.mutate(selectedEmail.id);
      deleteEmail(selectedEmail.id);
      setSelectedEmail(null);
    } else {
      console.log('No emails selected for deletion');
    }
  };

  const handleToggleStar = (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    console.log('handleToggleStar called:', {
      emailId,
      emailFound: !!email,
      emailDetails: email ? {
        id: email.id,
        subject: email.subject,
        from: email.from,
        to: email.to,
        folder: email.folder,
        isStarred: email.isStarred
      } : null
    });
    if (email) {
      // Сначала обновляем локально для мгновенной визуальной обратной связи
      toggleStar(emailId);
      
      // Если это выбранное письмо, обновляем его состояние
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail({
          ...selectedEmail,
          isStarred: !selectedEmail.isStarred
        });
      }
      
      // Затем отправляем на сервер
      updateEmailMutation.mutate({
        id: emailId,
        updates: { isStarred: !email.isStarred }
      });
    }
  };

  const handleMoveToFolder = (folder: MailFolder) => {
    if (selectedEmails.length > 0) {
      selectedEmails.forEach(id => {
        moveEmailMutation.mutate({ id, folder });
        moveToFolder([id], folder);
      });
    } else if (selectedEmail) {
      moveEmailMutation.mutate({ id: selectedEmail.id, folder });
      moveToFolder([selectedEmail.id], folder);
      setSelectedEmail(null);
    }
  };

  
  const filteredEmails = emails.filter(email => {
    if (email.folder !== currentFolder) return false;
    if (filters.search && !email.subject.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.isUnreadOnly && email.isRead) return false;
    if (filters.isStarredOnly && !email.isStarred) return false;
    return true;
  }).sort((a, b) => {
    // Для корзины сортируем по дате удаления (обновления) в обратном порядке
    if (currentFolder === 'trash') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    // Для остальных папок сортируем по дате создания в обратном порядке
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex h-full fade-in">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col m-4">
        {/* Toolbar - скрываем при открытом письме */}
        {!selectedEmail && (
          <div className="glass-card rounded-xl p-4 mb-4 transition-all duration-300 hover:bg-white/70">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors duration-200" size={20} />
                <input
                  type="text"
                  placeholder="Поиск писем..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2 rounded-lg"
                />
              </div>

              <button
                onClick={() => setFilters({ isUnreadOnly: !filters.isUnreadOnly })}
                className={`p-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                  filters.isUnreadOnly
                    ? 'bg-gradient-to-br from-blue-100/90 to-purple-100/90 text-blue-700 shadow-md'
                    : 'hover:bg-white/60 text-gray-600 hover:shadow-sm'
                }`}
                title="Только непрочитанные"
              >
                <Filter size={20} />
              </button>

              <button
                onClick={() => setFilters({ isStarredOnly: !filters.isStarredOnly })}
                className={`p-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                  filters.isStarredOnly
                    ? 'bg-gradient-to-br from-blue-100/90 to-purple-100/90 text-blue-700 shadow-md'
                    : 'hover:bg-white/60 text-gray-600 hover:shadow-sm'
                }`}
                title="Только избранные"
              >
                <Star size={20} />
              </button>

              {selectedEmails.length > 0 && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg hover:bg-gradient-to-br hover:from-red-100/80 hover:to-red-200/80 text-red-600 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                  title="Удалить выбранные"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email List and Detail */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedEmail ? (
            <div className="flex items-center gap-2 mb-4 fade-in">
              <button
                onClick={() => setSelectedEmail(null)}
                className="glass-card px-4 py-2 rounded-lg hover:bg-white/70 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                <span>←</span>
                <span className="font-medium">К списку</span>
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-hidden">
            {selectedEmail ? (
              <div className="glass-card rounded-xl p-6 overflow-hidden h-full transition-all duration-300 hover:bg-white/70 fade-in">
                <MailItem
                  email={selectedEmail}
                  onReply={() => openCompose(selectedEmail)}
                  onForward={() => openCompose(selectedEmail)}
                  onDelete={() => {
                    console.log('MailItem onDelete called:', selectedEmail.id);
                    deleteEmailMutation.mutate(selectedEmail.id);
                    setSelectedEmail(null);
                  }}
                  onToggleStar={() => handleToggleStar(selectedEmail.id)}
                  onMarkAsRead={() => markAsRead(selectedEmail.id)}
                  onMarkAsUnread={() => markAsUnread(selectedEmail.id)}
                  onMoveToFolder={handleMoveToFolder}
                />
              </div>
            ) : (
              <div className="glass-card rounded-xl p-4 overflow-hidden flex flex-col h-full transition-all duration-300 hover:bg-white/70">
                <div className="flex-1 overflow-y-auto">
                  {filteredEmails.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500 text-center fade-in">
                        <div className="text-4xl mb-2">📭</div>
                        <div>Писем не найдено</div>
                      </div>
                    </div>
                  ) : (
                    <MailList
                      emails={filteredEmails}
                      selectedEmails={selectedEmails}
                      selectedEmail={selectedEmail}
                      onEmailSelect={handleEmailSelect}
                      onToggleEmailSelection={toggleEmailSelection}
                      onToggleStar={handleToggleStar}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <ComposeModal
          onClose={closeCompose}
          replyTo={replyEmail || undefined}
        />
      )}
    </div>
  );
};
