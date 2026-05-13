import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import { Email, ComposeEmail } from '../models/mailModel';
import { useMailStore } from '../viewmodels/mailViewModel';
import { useSendEmail } from '../api/mailApi';
import { UserAutocomplete } from '../../auth/components/UserAutocomplete';

interface ComposeModalProps {
  onClose: () => void;
  replyTo?: Email;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, replyTo }) => {
  const sendEmailMutation = useSendEmail();
  const { closeCompose } = useMailStore();
  
  const [email, setEmail] = useState<ComposeEmail>({
    to: replyTo ? [replyTo.from] : [],
    cc: [],
    bcc: [],
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: replyTo ? `\n\n---\n${replyTo.from} написал:\n${replyTo.body}` : '',
    attachments: [],
  });

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Состояния для полей автодополнения
  const [toInputValue, setToInputValue] = useState('');
  const [ccInputValue, setCcInputValue] = useState('');
  const [bccInputValue, setBccInputValue] = useState('');

  const handleUserSelect = (type: 'to' | 'cc' | 'bcc', user: { username: string; email: string }) => {
    if (!email[type].includes(user.email)) {
      setEmail(prev => ({
        ...prev,
        [type]: [...prev[type], user.email]
      }));
    }
    // Очищаем соответствующее поле ввода
    if (type === 'to') setToInputValue('');
    if (type === 'cc') setCcInputValue('');
    if (type === 'bcc') setBccInputValue('');
  };

  const handleRemoveRecipient = (type: 'to' | 'cc' | 'bcc', recipient: string) => {
    setEmail(prev => ({
      ...prev,
      [type]: prev[type].filter(r => r !== recipient)
    }));
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEmail(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleRemoveAttachment = (index: number) => {
    setEmail(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
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

    if (!email.subject.trim() && !email.body.trim()) {
      showValidationAlert('Пожалуйста, укажите тему или текст письма');
      return;
    }

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="glass-card rounded-xl w-full max-w-4xl max-h-[95vh] m-4 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-xl font-semibold text-gray-800">
            {replyTo ? 'Ответ на письмо' : 'Новое письмо'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Recipients */}
        <div className="p-6 space-y-3 flex-shrink-0">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Кому:</label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {email.to.map((recipient, index) => (
                  <div
                    key={recipient}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/60 text-blue-700 rounded-full text-sm"
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('to', recipient)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
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
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/60 text-blue-700 rounded-full text-sm"
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('cc', recipient)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
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
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/60 text-blue-700 rounded-full text-sm"
                  >
                    <span>{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient('bcc', recipient)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
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
        <div className="px-6 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Тема:</label>
          <input
            type="text"
            value={email.subject}
            onChange={(e) => setEmail(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Введите тему письма..."
            className="w-full px-3 py-2 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80"
          />
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Текст письма:</label>
          <textarea
            value={email.body}
            onChange={(e) => setEmail(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Введите текст письма..."
            className="flex-1 w-full min-h-[150px] px-3 py-2 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 resize-none"
          />
        </div>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="text-sm font-medium text-gray-700 mb-2">Вложения:</div>
            <div className="space-y-2">
              {email.attachments.map((attachment) => (
                <div
                  key={`attachment-${attachment.name}`}
                  className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Paperclip size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{attachment.name}</span>
                    <span className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              <input
                type="file"
                multiple
                onChange={handleFileAttach}
                className="hidden"
              />
              <Paperclip size={18} />
              Прикрепить файлы
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200/50 rounded-lg hover:bg-white/60 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {sendEmailMutation.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
