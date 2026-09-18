import React, { useEffect, useState, useRef } from 'react';
import { Search, Trash2, Star, Filter, CheckCircle2, Circle } from 'lucide-react';
import { useMailStore } from '../viewmodels/mailViewModel';
import { MailFolder, Email } from '../models/mailModel';
import { MailList } from '../components/MailList';
import { MailItem } from '../components/MailItem';
import { ComposeModal } from '../components/ComposeModal';
import { useEmails, useUpdateEmail, useDeleteEmail, useMoveEmail } from '../api/mailApi';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { requestNotificationPermission } from '../../../utils/notifications';

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
    openComposeForForward,
    closeCompose,
    deleteEmail,
    moveToFolder,
    markAsRead,
    markAsUnread,
    toggleStar,
    toggleEmailSelection,
    setSelectedEmails,
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
    if (emailsData.length > 0) {
      previousEmailsCount.current = emailsData.length;
    }
  }, [emailsData]);

  
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

  const handleSelectAll = () => {
    if (selectedEmails.length > 0) {
      // Снимаем выделение со всех
      selectedEmails.forEach(id => toggleEmailSelection(id));
    } else {
      // Выделяем все
      filteredEmails.forEach(email => toggleEmailSelection(email.id));
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
    <div className="flex h-full">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col m-3 gap-3">
        {/* Toolbar - скрываем при открытом письме */}
        {!selectedEmail && (
          <div className="glass-deep p-3 slide-in-left">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-icon"
                title={selectedEmails.length > 0 ? 'Снять выделение' : 'Выделить все'}
              >
                {selectedEmails.length > 0 ? (
                  <CheckCircle2 size={18} className="text-primary" />
                ) : (
                  <Circle size={18} className="text-app" />
                )}
              </button>

              <div className="flex-1 relative no-drag">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-muted"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Поиск писем..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2"
                />
              </div>

              <button
                onClick={() => setFilters({ isUnreadOnly: !filters.isUnreadOnly })}
                className={`btn-icon ${filters.isUnreadOnly ? 'is-active' : ''}`}
                title="Только непрочитанные"
              >
                <Filter size={18} />
              </button>

              <button
                onClick={() => setFilters({ isStarredOnly: !filters.isStarredOnly })}
                className={`btn-icon ${filters.isStarredOnly ? 'is-active' : ''}`}
                title="Только избранные"
              >
                <Star size={18} />
              </button>

              {selectedEmails.length > 0 && (
                <button
                  onClick={handleDelete}
                  className="btn-icon text-red-500 hover:text-red-600"
                  title="Удалить выбранные"
                  style={{ background: 'rgba(239,68,68,0.08)' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email List and Detail */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedEmail ? (
            <div className="flex items-center gap-2 mb-3 slide-in-left no-drag">
              <button
                onClick={() => setSelectedEmail(null)}
                className="btn-glass-secondary px-3 py-1.5 flex items-center gap-2"
              >
                <span>←</span>
                <span className="font-medium">К списку</span>
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-hidden">
            {selectedEmail ? (
              <div
                key={selectedEmail.id}
                className="glass-mid p-6 overflow-hidden h-full slide-in-right"
              >
                <MailItem
                  email={selectedEmail}
                  onReply={() => openCompose(selectedEmail)}
                  onForward={() => openComposeForForward()}
                  onDelete={() => {
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
              <div key={currentFolder} className="glass-mid p-2 overflow-hidden flex flex-col h-full slide-in-left">
                <div className="flex-1 overflow-y-auto px-1">
                  {filteredEmails.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-app-muted text-center fade-in">
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
                      onSetSelectedEmails={setSelectedEmails}
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
