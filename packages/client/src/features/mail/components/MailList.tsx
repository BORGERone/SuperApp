import React from 'react';
import { Email } from '../models/mailModel';
import { Star, Paperclip } from 'lucide-react';
import { GlassCheckbox } from '../../../components/GlassCheckbox';

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
  const getPreviewText = (text: string, maxLength = 100) => {
    if (!text) return '';
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '…';
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
    }
    return dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitial = (text: string) => {
    if (!text) return '?';
    return text.trim().charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-2.5">
      {emails.map((email, index) => {
        const isSelectedInList = selectedEmails.includes(email.id);
        const isOpened = selectedEmail?.id === email.id;
        const isUnread = !email.isRead;

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
            className={`group selectable-card glass-card rounded-xl px-4 py-3 cursor-pointer ${
              isOpened || isSelectedInList ? 'is-selected' : ''
            }`}
            style={{ animation: `fadeInUp ${260 + index * 20}ms var(--motion-ease) both` }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 transition-opacity duration-200 ${
                  isSelectedInList ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEmailSelection(email.id);
                }}
              >
                <GlassCheckbox
                  checked={isSelectedInList}
                  size="sm"
                  aria-label={`Выбрать письмо от ${email.from}`}
                />
              </div>

              <div
                className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))',
                }}
              >
                {getInitial(email.from)}
                {isUnread && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(email.id);
                }}
                className="mt-1 flex-shrink-0 transition-transform duration-150 hover:scale-125"
                title={email.isStarred ? 'Убрать из избранного' : 'В избранное'}
              >
                <Star
                  size={16}
                  className={
                    email.isStarred
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                      : 'text-gray-400 group-hover:text-yellow-400/70'
                  }
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span
                    className={`text-sm truncate ${
                      isUnread ? 'font-semibold text-[color:var(--text-strong)]' : 'font-normal text-[color:var(--text-muted)]'
                    }`}
                  >
                    {email.from}
                  </span>
                  <span className="text-xs text-[color:var(--text-muted)] flex-shrink-0 tabular-nums">
                    {formatDate(email.createdAt)}
                  </span>
                </div>

                <div
                  className={`text-sm mb-1 truncate ${
                    isUnread ? 'text-[color:var(--text-strong)] font-medium' : 'text-[color:var(--text-muted)]'
                  }`}
                >
                  {email.subject || '(без темы)'}
                </div>

                <div className="text-xs text-[color:var(--text-muted)]/80 line-clamp-2">
                  {getPreviewText(email.body || email.htmlBody || '', 140)}
                </div>

                {email.attachments && email.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Paperclip size={12} className="text-[color:var(--text-muted)]" />
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {email.attachments.length} {email.attachments.length === 1 ? 'вложение' : 'вложения'}
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
