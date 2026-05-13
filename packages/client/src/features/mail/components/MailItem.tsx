import React from 'react';
import { Email, MailFolder } from '../models/mailModel';
import { Reply, Forward, Trash2, Star, Archive, Mail, Paperclip, User } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200/50 pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {email.subject}
            {email.isImportant && (
              <span className="px-2 py-1 bg-red-100/80 text-red-600 text-xs rounded-full">
                Важно
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onReply}
              className="p-2 rounded-lg hover:bg-white/60 transition-colors"
              title="Ответить"
            >
              <Reply size={18} className="text-gray-600" />
            </button>
            
            <button
              onClick={onToggleStar}
              className="p-2 rounded-lg hover:bg-white/60 transition-colors"
              title={email.isStarred ? 'Убрать из избранных' : 'Добавить в избранные'}
            >
              <Star
                size={18}
                className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
              />
            </button>
            
            <button
              onClick={onForward}
              className="p-2 rounded-lg hover:bg-white/60 transition-colors"
              title="Переслать"
            >
              <Forward size={18} className="text-gray-600" />
            </button>
            
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-100/80 text-red-600 transition-colors"
              title="Удалить"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Mail size={16} />
            <span>От: {email.from}</span>
          </div>
          <span>{formatDate(email.createdAt)}</span>
        </div>

        <div className="text-sm text-gray-600">
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
        <div className="prose prose-sm max-w-none">
          {email.htmlBody ? (
            <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} />
          ) : (
            <div className="whitespace-pre-wrap text-gray-800">
              {email.body}
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="border-t border-gray-200/50 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Paperclip size={16} />
            Вложения ({email.attachments.length})
          </h3>
          <div className="space-y-2">
            {email.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg hover:bg-gray-100/80 transition-colors cursor-pointer"
                onClick={() => {
                  // TODO: Implement download attachment
                  console.log('Download attachment:', attachment);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100/60 rounded-lg flex items-center justify-center">
                    <Paperclip size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
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
      <div className="border-t border-gray-200/50 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onReply}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Reply size={16} />
              Ответить
            </button>
            
            <button
              onClick={onForward}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Forward size={16} />
              Переслать
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAsUnread}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
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
