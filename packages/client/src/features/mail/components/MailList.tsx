import React from 'react';
import { Email } from '../models/mailModel';
import { Star, Mail, Paperclip } from 'lucide-react';

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

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => {
            console.log('MailList onClick called:', email.id);
            // Если есть выделенные письма, то выделяем по клику на область
            if (selectedEmails.length > 0) {
              onToggleEmailSelection(email.id);
            } else {
              // Если выделенных нет, просто открываем письмо
              onEmailSelect(email);
            }
          }}
          className={`p-4 rounded-lg cursor-pointer transition-all duration-200 max-h-32 overflow-hidden ${
            selectedEmail?.id === email.id
              ? 'bg-blue-200/90 border border-blue-400'
              : selectedEmails.includes(email.id)
              ? 'bg-blue-100/60 border border-blue-300'
              : email.isRead
              ? 'bg-white/40 hover:bg-white/60'
              : 'bg-white/80 hover:bg-white/90'
          } border border-gray-200/50`}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedEmails.includes(email.id)}
              onChange={() => onToggleEmailSelection(email.id)}
              className="mt-1 w-4 h-4 rounded accent-blue-500"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Star */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(email.id);
              }}
              className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
            >
              <Star
                size={16}
                className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
              />
            </button>

            {/* Email Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${email.isRead ? 'font-normal text-gray-600' : 'font-semibold text-gray-900'}`}>
                  {email.from}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(email.createdAt)}
                </span>
              </div>
              
              <div className={`text-sm mb-1 ${email.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {email.subject}
              </div>
              
              <div className="text-xs text-gray-500 line-clamp-2 overflow-hidden">
                {getPreviewText(email.body || email.htmlBody || '', 120)}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <Paperclip size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {email.attachments.length} вложение{email.attachments.length > 1 ? 'я' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
