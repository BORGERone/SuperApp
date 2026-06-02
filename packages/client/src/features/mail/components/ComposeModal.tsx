import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, HardDrive } from 'lucide-react';
import { Email, ComposeEmail, PendingAttachment } from '../models/mailModel';
import { useMailStore } from '../viewmodels/mailViewModel';
import { useSendEmail } from '../api/mailApi';
import { UserAutocomplete } from '../../auth/components/UserAutocomplete';
import { DriveFileSelectorModal } from './DriveFileSelectorModal';
import { GrantAccessModal } from './GrantAccessModal';
import { useBodyModalOpen } from '../../../utils/useBodyModalOpen';

interface ComposeModalProps {
  onClose: () => void;
  replyTo?: Email;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, replyTo }) => {
  const sendEmailMutation = useSendEmail();
  const { closeCompose } = useMailStore();

  // Скрываем глобальный тайтлбар, пока ComposeModal открыт. Используем
  // счетчик ссылок, чтобы дочерние модалки (например, выбор файла с диска)
  // не снимали класс по своему unmount, пока ComposeModal все еще открыт.
  useBodyModalOpen(true);

  const [email, setEmail] = useState<ComposeEmail>({
    to: replyTo ? [replyTo.from] : [],
    cc: [],
    bcc: [],
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: replyTo ? `\n\n---\n${replyTo.from} написал:\n${replyTo.body}` : '',
    attachmentIds: [],
  });

  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [filesWithoutAccess, setFilesWithoutAccess] = useState<string[]>([]);
  const [fileIdsWithoutAccess, setFileIdsWithoutAccess] = useState<string[]>([]);

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Состояния для полей автодополнения
  const [toInputValue, setToInputValue] = useState('');
  const [ccInputValue, setCcInputValue] = useState('');
  const [bccInputValue, setBccInputValue] = useState('');

  const handleUserSelect = (
    type: 'to' | 'cc' | 'bcc',
    user: { username: string; email: string; position?: string | null }
  ) => {
    // В список получателей кладём username, а не email — пользователю
    // понятнее видеть «user2», а не «2222@example.com». Сервер при
    // отправке умеет резолвить и username, и email (см. mailRoutes).
    const list = email[type] || [];
    if (!list.includes(user.username)) {
      setEmail(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), user.username]
      }));
    }
    if (type === 'to') setToInputValue('');
    if (type === 'cc') setCcInputValue('');
    if (type === 'bcc') setBccInputValue('');
  };

  const handleRemoveRecipient = (type: 'to' | 'cc' | 'bcc', recipient: string) => {
    setEmail(prev => ({
      ...prev,
      [type]: prev[type]?.filter(r => r !== recipient) || []
    }));
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      const newAttachments: PendingAttachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('storageType', 'local');

        const response = await fetch(`${apiUrl}/api/mail/attachments/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload file: ${file.name}`);
        }

        const data = await response.json();
        newAttachments.push({
          id: data.id,
          file: file,
          storageType: 'local',
        });
      }

      setPendingAttachments(prev => [...prev, ...newAttachments]);
      setEmail(prev => ({
        ...prev,
        attachmentIds: [...(prev.attachmentIds || []), ...newAttachments.map(a => a.id)],
      }));
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Не удалось загрузить файлы');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    setEmail(prev => ({
      ...prev,
      attachmentIds: prev.attachmentIds?.filter(id => id !== attachmentId) || [],
    }));
  };

  const handleDriveFilesSelected = async (files: Array<{ id: string; name: string; size: number; type: string }>) => {
    setIsUploading(true);

    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      console.log('Attaching files from drive:', files);
      const newAttachments: PendingAttachment[] = [];

      for (const file of files) {
        console.log('Attaching file:', file);
        // Просто создаем запись о вложении ссылающуюся на файл диска
        const requestBody = {
          filename: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          storageType: 'drive',
          driveFileId: file.id,
        };
        console.log('Request body:', requestBody);

        const response = await fetch(`${apiUrl}/api/mail/attachments/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to attach file from drive. Status:', response.status, 'Error:', errorText);
          throw new Error(`Failed to attach file from drive: ${file.name}. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Attachment created:', data);
        newAttachments.push({
          id: data.id,
          file: new File([], file.name, { type: file.type || 'application/octet-stream' }),
          storageType: 'drive',
          driveFileId: file.id,
        });
      }

      setPendingAttachments(prev => [...prev, ...newAttachments]);
      setEmail(prev => ({
        ...prev,
        attachmentIds: [...(prev.attachmentIds || []), ...newAttachments.map(a => a.id)],
      }));
    } catch (error) {
      console.error('Failed to attach files from drive:', error);
      alert('Не удалось прикрепить файлы с диска');
    } finally {
      setIsUploading(false);
    }
  };

  // Сбрасываем состояния полей только при реальном открытии модального окна (не при ответе на письмо)
  useEffect(() => {
    if (!replyTo) { // Только для нового письма, не для ответа
      setToInputValue('');
      setCcInputValue('');
      setBccInputValue('');
      
      // Автофокус на первое поле ввода через небольшую задержку
      setTimeout(() => {
        const firstInput = document.querySelector('input[placeholder="Введите имя..."]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
          // Эмулируем клик для открытия выпадающего списка
          firstInput.click();
        }
      }, 100);
    }
  }, [replyTo]);

  const handleSend = async () => {
    // Проверяем обязательные поля
    if (email.to.length === 0) {
      showValidationAlert('Пожалуйста, укажите хотя бы одного получателя');
      return;
    }

    // Проверяем права доступа к файлам с диска
    const driveAttachments = pendingAttachments.filter(a => a.storageType === 'drive');
    console.log('Drive attachments:', driveAttachments);
    console.log('All pending attachments:', pendingAttachments);

    if (driveAttachments.length > 0) {
      try {
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
        const apiUrl = isElectron ? 'http://localhost:3002' : '';

        // Получаем список пользователей-получателей
        const recipientEmails = [...email.to, ...(email.cc || []), ...(email.bcc || [])];
        console.log('Recipient emails:', recipientEmails);

        // Для каждого файла проверяем, есть ли доступ у получателей
        const filesWithoutAccessList: string[] = [];
        const fileIdsWithoutAccessList: string[] = [];

        for (const attachment of driveAttachments) {
          console.log('Checking attachment:', attachment);
          if (!attachment.driveFileId) {
            console.log('Attachment has no driveFileId:', attachment);
            continue;
          }

          // Получаем права доступа к файлу
          const response = await fetch(`${apiUrl}/api/drive/permissions-by-id?fileId=${attachment.driveFileId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          console.log('Permissions response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            const allowedUsers = data.allowedUsers || [];
            console.log('Allowed users for file:', attachment.file.name, allowedUsers);

            // Проверяем, есть ли доступ у всех получателей
            const hasAllAccess = recipientEmails.every(email =>
              allowedUsers.includes(email)
            );

            console.log('Has all access:', hasAllAccess, 'for recipients:', recipientEmails);

            if (!hasAllAccess) {
              filesWithoutAccessList.push(attachment.file.name);
              fileIdsWithoutAccessList.push(attachment.driveFileId);
            }
          } else {
            console.error('Failed to get permissions:', response.status, response.statusText);
          }
        }

        console.log('Files without access:', filesWithoutAccessList);

        if (filesWithoutAccessList.length > 0) {
          setFilesWithoutAccess(filesWithoutAccessList);
          setFileIdsWithoutAccess(fileIdsWithoutAccessList);
          setShowGrantAccessModal(true);
          return; // Не отправляем письмо, пока пользователь не подтвердит
        }
      } catch (error) {
        console.error('Failed to check file permissions:', error);
        // Продолжаем отправку даже если не удалось проверить права
      }
    } else {
      console.log('No drive attachments found');
    }

    if (!email.subject.trim() && !email.body.trim()) {
      showValidationAlert('Пожалуйста, укажите тему или текст письма');
      return;
    }

    await sendEmail();
  };

  const handleGrantAccessConfirm = async () => {
    try {
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      // Получаем список пользователей-получателей
      const recipientEmails = [...email.to, ...(email.cc || []), ...(email.bcc || [])];

      // Выдаем права доступа к файлам для получателей
      const response = await fetch(`${apiUrl}/api/drive/grant-access-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: fileIdsWithoutAccess,
          userIds: recipientEmails,
        }),
      });

      if (response.ok) {
        console.log('Access granted successfully');
        setShowGrantAccessModal(false);
        // Отправляем письмо после выдачи прав
        await sendEmail();
      } else {
        console.error('Failed to grant access:', response.statusText);
        alert('Не удалось выдать доступ к файлам');
      }
    } catch (error) {
      console.error('Failed to grant access:', error);
      alert('Не удалось выдать доступ к файлам');
    }
  };

  const sendEmail = async () => {
    // Если тема пустая, но есть текст - используем первые слова текста как тему
    let finalSubject = email.subject.trim();
    if (!finalSubject && email.body.trim()) {
      const words = email.body.trim().split(' ').slice(0, 5); // Первые 5 слов
      finalSubject = words.join(' ');
      if (finalSubject.length > 50) {
        finalSubject = finalSubject.substring(0, 47) + '...'; // Ограничиваем длину
      }
    }

    if (!email.body.trim()) {
      showValidationAlert('Пожалуйста, укажите текст письма');
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        ...email,
        subject: finalSubject
      });
      closeCompose();
      onClose();
    } catch (error) {
      showValidationAlert('Ошибка при отправке письма');
    }
  };

  const showValidationAlert = (message: string) => {
    // Создаем кастомное всплывающее окно
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          ⚠️
        </div>
        <div>${message}</div>
        <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">×</button>
      </div>
    `;
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(alertDiv);
    
    // Автоматически закрываем через 5 секунд
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
      if (style.parentElement) {
        style.remove();
      }
    }, 5000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !e.shiftKey) {
      onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.shiftKey) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 fade-in p-4">
      <div
        className="scale-in w-full max-w-3xl flex flex-col rounded-3xl compose-modal-solid"
        style={{
          maxHeight: 'calc(100vh - 64px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          backdropFilter: 'none'
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 relative">
          <div className="divider absolute bottom-0 left-0 right-0" />
          <h2 className="text-base font-semibold text-app">
            {replyTo ? 'Ответ на письмо' : 'Новое письмо'}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Recipients */}
        <div className="px-4 py-3 space-y-2 flex-shrink-0">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">Кому:</label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {email.to.map((recipient, index) => (
                  <div
                    key={recipient}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ring-1"
                    style={{
                      background: `linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.25) 0%, rgba(var(--color-primary-rgb), 0.15) 100%)`,
                      color: 'var(--color-primary)',
                      borderColor: 'rgba(var(--color-primary-rgb), 0.4)',
                    }}
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('to', recipient)}
                      className="ml-1 hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <UserAutocomplete
                value={toInputValue}
                onChange={(value) => {
                  setToInputValue(value);
                  // Если введен email напрямую, добавляем его
                  if (value.includes('@')) {
                    if (!email.to.includes(value)) {
                      setEmail(prev => ({
                        ...prev,
                        to: [...prev.to, value]
                      }));
                    }
                  }
                }}
                onSelect={(user) => handleUserSelect('to', user)}
                placeholder="Введите имя..."
              />
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-2 mt-2">
              <div className="flex flex-wrap gap-2">
                {email.cc?.map((recipient) => (
                  <div
                    key={`cc-${recipient}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ring-1"
                    style={{
                      background: `linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.25) 0%, rgba(var(--color-primary-rgb), 0.15) 100%)`,
                      color: 'var(--color-primary)',
                      borderColor: 'rgba(var(--color-primary-rgb), 0.4)',
                    }}
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('cc', recipient)}
                      className="ml-1 hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <UserAutocomplete
                value={ccInputValue}
                onChange={(value) => {
                  setCcInputValue(value);
                  if (value.includes('@')) {
                    if (!email.cc.includes(value)) {
                      setEmail(prev => ({
                        ...prev,
                        cc: [...prev.cc, value]
                      }));
                    }
                  }
                }}
                onSelect={(user) => handleUserSelect('cc', user)}
                placeholder="Введите имя..."
              />
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="space-y-2 mt-2">
              <div className="flex flex-wrap gap-2">
                {email.bcc?.map((recipient) => (
                  <div
                    key={`bcc-${recipient}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ring-1"
                    style={{
                      background: `linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.25) 0%, rgba(var(--color-primary-rgb), 0.15) 100%)`,
                      color: 'var(--color-primary)',
                      borderColor: 'rgba(var(--color-primary-rgb), 0.4)',
                    }}
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('bcc', recipient)}
                      className="ml-1 hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <UserAutocomplete
                value={bccInputValue}
                onChange={(value) => {
                  setBccInputValue(value);
                  if (value.includes('@')) {
                    if (!email.bcc.includes(value)) {
                      setEmail(prev => ({
                        ...prev,
                        bcc: [...prev.bcc, value]
                      }));
                    }
                  }
                }}
                onSelect={(user) => handleUserSelect('bcc', user)}
                placeholder="Введите имя..."
              />
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="px-4 pb-3 flex-shrink-0">
          <label className="block text-sm font-medium text-app-secondary mb-1.5">Тема:</label>
          <input
            type="text"
            value={email.subject}
            onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Введите тему письма..."
            className="glass-input w-full px-3 py-2"
          />
        </div>

        {/* Body */}
        <div className="flex-1 px-4 pt-2 pb-4 flex flex-col min-h-0">
          <label className="block text-sm font-medium text-app-secondary mb-1.5">Текст письма:</label>
          <textarea
            value={email.body}
            onChange={(e) => setEmail(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Введите текст письма..."
            className="glass-input flex-1 w-full min-h-[200px] max-h-[400px] px-3 py-3 resize-y text-sm leading-relaxed"
          />
        </div>

        {/* Attachments */}
        {pendingAttachments.length > 0 && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="text-sm font-medium text-app-secondary mb-2">Вложения:</div>
            <div className="space-y-2">
              {pendingAttachments.map((attachment) => (
                <div
                  key={`attachment-${attachment.id}`}
                  className="glass-top flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <Paperclip size={16} className="text-app-muted" />
                    <span className="text-sm text-app">{attachment.file.name}</span>
                    <span className="text-xs text-app-muted">
                      {(attachment.file.size / 1024).toFixed(1)} KB
                    </span>
                    {attachment.storageType === 'drive' && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(var(--color-primary-rgb), 0.15)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        Диск
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 flex-shrink-0 relative">
          <div className="divider absolute top-0 left-0 right-0" />
          <div className="flex items-center gap-3">
            <label className="btn-glass-secondary flex items-center gap-2 cursor-pointer px-3 py-1.5 text-sm">
              <input
                type="file"
                multiple
                onChange={handleFileAttach}
                disabled={isUploading}
                className="hidden"
              />
              <Paperclip size={16} />
              {isUploading ? 'Загрузка...' : 'Прикрепить'}
            </label>
            <button
              onClick={() => setShowDriveSelector(true)}
              disabled={isUploading}
              className="btn-glass-secondary flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HardDrive size={16} />
              С диска
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-glass-secondary px-4 py-2">
              Отмена
            </button>
            <button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending}
              className="btn-glass flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-component-name="ComposeModal"
            >
              <Send size={16} />
              {sendEmailMutation.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>

      {showDriveSelector && (
        <DriveFileSelectorModal
          onClose={() => setShowDriveSelector(false)}
          onFilesSelected={handleDriveFilesSelected}
        />
      )}

      {showGrantAccessModal && (
        <GrantAccessModal
          isOpen={showGrantAccessModal}
          onClose={() => setShowGrantAccessModal(false)}
          onConfirm={handleGrantAccessConfirm}
          filesWithoutAccess={filesWithoutAccess}
        />
      )}
    </div>
  );
};
