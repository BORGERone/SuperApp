import { useEffect, useState } from 'react';
import { useEmails } from '../api/mailApi';
import { MailFolder } from '../models/mailModel';

export const useUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Получаем только непрочитанные письма из входящих
  const { data: inboxEmails = [] } = useEmails({
    folder: 'inbox',
    isUnreadOnly: false, // Получаем все письма, включая прочитанные
  });

  useEffect(() => {
    if (inboxEmails.length > 0) {
      const unread = inboxEmails.filter(email => !email.isRead).length;
      setUnreadCount(unread);
    }
  }, [inboxEmails]);

  return unreadCount;
};
