import React from 'react';
import { Email, MailFolder } from '../models/mailModel';
import { Reply, Forward, Trash2, Star, Mail, Paperclip, User, Download } from 'lucide-react';

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
  onMarkAsUnread,
}) => {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitial = (text: string) => (text || '?').trim().charAt(0).toUpperCase();

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      let response;
      let downloadUrl;
      if (attachment.storageType === 'drive' && attachment.driveFileId) {
        downloadUrl = `${apiUrl}/api/drive/files/${attachment.driveFileId}/download`;
        response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
      } else {
        downloadUrl = `${apiUrl}/api/mail/attachments/${attachment.id}/download`;
        response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to download attachment. Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Не удалось скачать файл');
    }
  };

  const handleDownloadAllAttachments = async () => {
    if (!email.attachments || email.attachments.length === 0) return;

    try {
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      const apiUrl = isElectron ? 'http://localhost:3002' : '';

      const response = await fetch(`${apiUrl}/api/mail/${email.id}?download-attachments=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download attachments. Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attachments-${email.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachments:', error);
      alert('Не удалось скачать файлы');
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-up">
      {/* Header */}
      <div className="pb-4 mb-4 border-b border-white/40">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-2xl font-semibold text-[color:var(--text-strong)] flex items-center gap-3 flex-wrap">
            <span>{email.subject || '(без темы)'}</span>
            {email.isImportant && (
              <span
                className="px-2.5 py-1 text-xs font-medium rounded-full"
                style={{
                  background: 'rgba(244, 63, 94, 0.16)',
                  color: '#be123c',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                }}
              >
                Важно
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggleStar}
              className="btn-icon-glass"
              title={email.isStarred ? 'Убрать из избранного' : 'В избранное'}
            >
              <Star
                size={18}
                className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-[color:var(--text-muted)]'}
              />
            </button>

            <button onClick={onReply} className="btn-icon-glass" title="Ответить">
              <Reply size={18} />
            </button>

            <button onClick={onForward} className="btn-icon-glass" title="Переслать">
              <Forward size={18} />
            </button>

            <button
              onClick={onDelete}
              className="btn-icon-glass hover:!bg-rose-100/70 hover:!text-rose-600"
              title="Удалить"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))',
            }}
          >
            {getInitial(email.from)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-[color:var(--text-strong)]">
              <Mail size={14} className="text-[color:var(--text-muted)]" />
              <span className="font-medium truncate">{email.from}</span>
              <span className="text-xs text-[color:var(--text-muted)] ml-auto">
                {formatDate(email.createdAt)}
              </span>
            </div>
            <div className="text-sm text-[color:var(--text-muted)] mt-1 flex items-start gap-2">
              <User size={14} className="mt-0.5" />
              <span className="truncate">
                Кому: {Array.isArray(email.to) ? email.to.join(', ') : email.to}
              </span>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div className="text-sm text-[color:var(--text-muted)] mt-1 flex items-start gap-2">
                <User size={14} className="mt-0.5" />
                <span className="truncate">
                  Копия: {Array.isArray(email.cc) ? email.cc.join(', ') : email.cc}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="prose prose-sm max-w-none text-[color:var(--text-strong)] leading-relaxed">
          {email.htmlBody ? (
            <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} />
          ) : (
            <div className="whitespace-pre-wrap">{email.body}</div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="border-t border-white/40 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[color:var(--text-strong)] flex items-center gap-2">
              <Paperclip size={16} />
              Вложения ({email.attachments.length})
            </h3>
            <button
              onClick={handleDownloadAllAttachments}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg btn-glass-secondary"
            >
              <Download size={14} />
              Скачать все
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {email.attachments.map((attachment) => (
              <button
                type="button"
                key={attachment.id}
                className="glass-panel flex items-center justify-between p-3 rounded-xl hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer text-left"
                onClick={() => handleDownloadAttachment(attachment)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                  >
                    <Paperclip size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[color:var(--text-strong)] truncate">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-[color:var(--text-muted)]">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <Download size={16} className="text-[color:var(--text-muted)] flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="border-t border-white/40 pt-4 mt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onReply}
              className="flex items-center gap-2 px-4 py-2 btn-glass rounded-xl"
            >
              <Reply size={16} />
              Ответить
            </button>
            <button
              onClick={onForward}
              className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl"
            >
              <Forward size={16} />
              Переслать
            </button>
          </div>

          <button
            onClick={onMarkAsUnread}
            className="px-3 py-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] rounded-lg hover:bg-white/60 transition-colors"
            title="Пометить как непрочитанное"
          >
            Отметить непрочитанным
          </button>
        </div>
      </div>
    </div>
  );
};
