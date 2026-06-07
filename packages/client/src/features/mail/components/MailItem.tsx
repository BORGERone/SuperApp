import React from 'react';
import { Email, MailFolder } from '../models/mailModel';
import { Reply, Forward, Trash2, Star, Mail, Paperclip, User, Download } from 'lucide-react';
import { getApiBase } from '../../../lib/serverConfig';

interface MailItemProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onMoveToFolder?: (folder: MailFolder) => void;
}

export const MailItem: React.FC<MailItemProps> = ({
  email,
  onReply,
  onForward,
  onDelete,
  onToggleStar,
  onMarkAsRead,
  onMarkAsUnread,
  onMoveToFolder,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      // В Electron используем абсолютный URL, в браузере - относительный (через proxy)
      const apiUrl = getApiBase();

      console.log('Downloading attachment:', attachment);

      let response;
      let downloadUrl;
      // Если файл с диска, используем API диска
      if (attachment.storageType === 'drive' && attachment.driveFileId) {
        downloadUrl = `${apiUrl}/api/drive/files/${attachment.driveFileId}/download`;
        console.log('Downloading from drive API:', downloadUrl);
        response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
      } else {
        // Иначе используем API почты
        downloadUrl = `${apiUrl}/api/mail/attachments/${attachment.id}/download`;
        console.log('Downloading from mail API:', downloadUrl);
        response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
      }

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to download attachment. Status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to download attachment. Status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'type:', blob.type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Не удалось скачать файл');
    }
  };

  const handleDownloadAllAttachments = async () => {
    if (!email.attachments || email.attachments.length === 0) return;

    try {
      // Используем абсолютный URL напрямую к бэкенду для тестирования
      const apiUrl = getApiBase();

      console.log('Downloading all attachments for email:', email.id);
      console.log('apiUrl:', apiUrl);
      console.log('Full URL:', `${apiUrl}/api/mail/${email.id}?download-attachments=true`);

      const response = await fetch(`${apiUrl}/api/mail/${email.id}?download-attachments=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to download attachments. Status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to download attachments. Status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'type:', blob.type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attachments-${email.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Failed to download attachments:', error);
      alert('Не удалось скачать файлы');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-4 mb-4 relative">
        <div className="divider absolute bottom-0 left-0 right-0" />
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-app flex items-center gap-2">
            {email.subject}
            {email.isImportant && (
              <span className="px-2 py-0.5 bg-red-100/80 text-red-600 text-xs rounded-full">
                Важно
              </span>
            )}
          </h2>

          <div className="flex items-center gap-1">
            <button onClick={onReply} className="btn-icon" title="Ответить">
              <Reply size={18} />
            </button>

            <button
              onClick={onToggleStar}
              className={`btn-icon ${email.isStarred ? 'is-active' : ''}`}
              title={email.isStarred ? 'Убрать из избранных' : 'Добавить в избранные'}
            >
              <Star
                size={18}
                className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}
              />
            </button>

            <button onClick={onForward} className="btn-icon" title="Переслать">
              <Forward size={18} />
            </button>

            <button
              onClick={onDelete}
              className="btn-icon text-red-500 hover:text-red-600"
              title="Удалить"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-app-secondary">
          <div className="flex items-center gap-2">
            <Mail size={16} />
            <span>От: {email.from}</span>
          </div>
          <span>{formatDate(email.createdAt)}</span>
        </div>

        <div className="text-sm text-app-secondary">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} />
            <span>Кому: {Array.isArray(email.to) ? email.to.join(', ') : email.to}</span>
          </div>
          {email.cc && email.cc.length > 0 && (
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>Копия: {Array.isArray(email.cc) ? email.cc.join(', ') : email.cc}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="prose prose-sm max-w-none text-app">
          {email.htmlBody ? (
            <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} />
          ) : (
            <div className="whitespace-pre-wrap text-app">{email.body}</div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="pt-4 mt-4 relative">
          <div className="divider absolute top-0 left-0 right-0" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-app-secondary flex items-center gap-2">
              <Paperclip size={16} />
              Вложения ({email.attachments.length})
            </h3>
            <button
              onClick={handleDownloadAllAttachments}
              className="btn-glass-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
            >
              <Download size={14} />
              Скачать все
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {email.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="glass-top p-3 cursor-pointer"
                onClick={() => handleDownloadAttachment(attachment)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(var(--color-primary-rgb), 0.15)' }}
                  >
                    <Paperclip size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-app truncate">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-app-muted">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="pt-4 mt-4 relative">
        <div className="divider absolute top-0 left-0 right-0" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onReply}
              className="btn-glass flex items-center gap-2 px-4 py-2"
            >
              <Reply size={16} />
              Ответить
            </button>

            <button
              onClick={onForward}
              className="btn-glass-secondary flex items-center gap-2 px-4 py-2"
            >
              <Forward size={16} />
              Переслать
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAsUnread}
              className="btn-icon px-3 py-2 text-sm"
              title="Пометить как непрочитанное"
            >
              Отметить непрочитанным
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
