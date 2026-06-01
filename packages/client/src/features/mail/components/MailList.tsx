import React from 'react';
import { Email } from '../models/mailModel';
import { Star, Paperclip } from 'lucide-react';

interface MailListProps {
  emails: Email[];
  selectedEmails: string[];
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  onToggleEmailSelection: (emailId: string) => void;
  onToggleStar: (emailId: string) => void;
}

export const MailList: React.FC<MailListProps> = ({
  emails,
  selectedEmails,
  selectedEmail,
  onEmailSelect,
  onToggleEmailSelection,
  onToggleStar,
}) => {
  // Функция для очистки и усечения текста письма
  const getPreviewText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    
    // Удаляем HTML теги если они есть
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Удаляем HTML теги
      .replace(/\n+/g, ' ') // Заменяем переносы строк на пробелы
      .replace(/\s+/g, ' ') // Удаляем лишние пробелы
      .trim();
    
    // Обрезаем до нужной длины
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    return cleanText.substring(0, maxLength) + '...';
  };

  const formatDate = (date: string | Date) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
      return dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const isPicked = (id: string) => selectedEmails.includes(id);

  return (
    <div className="space-y-2">
      {emails.map((email) => {
        const picked = isPicked(email.id);
        const isOpen = selectedEmail?.id === email.id;
        return (
          <div
            key={email.id}
            onClick={() => {
              if (selectedEmails.length > 0) {
                onToggleEmailSelection(email.id);
              } else {
                onEmailSelect(email);
              }
            }}
            className="glass-mid select-shimmer group relative p-4 cursor-pointer max-h-32 overflow-hidden"
            data-selected={picked || isOpen ? 'true' : 'false'}
            style={{
              // Непрочитанное сообщение слегка ярче на нейтральной подложке.
              // Выделение/открытие управляются классом .select-shimmer (см. index.css):
              // подложка не темнеет, а радужный обвод прокатывается один раз
              // и замирает тонкой рамкой. Никакого translateX, чтобы правый
              // край больше не обрезался родителем.
              background:
                !picked && !isOpen && !email.isRead
                  ? 'rgba(var(--glass-bg-mid), calc(var(--glass-tint-mid) + 0.14))'
                  : undefined,
              transition: 'background 300ms ease-out, box-shadow 300ms ease-out, transform 300ms ease-out',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <span
                className="ui-checkbox mt-0.5"
                data-checked={picked ? 'true' : 'false'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEmailSelection(email.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={picked}
                  onChange={() => onToggleEmailSelection(email.id)}
                />
                <span className="ui-checkbox__box">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.2 L6.7 11.4 L12.5 4.8" />
                  </svg>
                </span>
              </span>

              {/* Star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(email.id);
                }}
                className="mt-0.5 flex-shrink-0"
                style={{ transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Star
                  size={16}
                  className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-app-muted'}
                />
              </button>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm truncate ${
                      email.isRead ? 'font-normal text-app-secondary' : 'font-semibold text-app'
                    }`}
                  >
                    {email.from}
                  </span>
                  <span className="text-xs text-app-muted ml-2 flex-shrink-0">
                    {formatDate(email.createdAt)}
                  </span>
                </div>

                <div
                  className={`text-sm mb-1 truncate ${
                    email.isRead ? 'text-app-secondary' : 'text-app font-medium'
                  }`}
                >
                  {email.subject}
                </div>

                <div className="text-xs text-app-muted line-clamp-2 overflow-hidden">
                  {getPreviewText(email.body || email.htmlBody || '', 120)}
                </div>

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Paperclip size={12} className="text-app-muted" />
                    <span className="text-xs text-app-muted">
                      {email.attachments.length} вложение{email.attachments.length > 1 ? 'я' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
