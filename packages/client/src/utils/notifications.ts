import { useNotificationsStore } from '../features/settings/viewmodels/notificationsViewModel';

export const showNotification = (
  title: string,
  body: string,
  type: 'email' | 'task' = 'email'
): Notification | null => {
  const settings = useNotificationsStore.getState();

  // Проверяем тихие часы
  if (settings.quietHours.enabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHours, startMinutes] = settings.quietHours.start.split(':').map(Number);
    const [endHours, endMinutes] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;

    // Проверяем, находимся ли в тихих часах
    if (startTime <= endTime) {
      // Простой случай (например, 22:00 - 09:00 не пересекает полночь)
      if (currentTime >= startTime && currentTime <= endTime) {
        console.log('Quiet hours active - notification skipped');
        return null;
      }
    } else {
      // Случай с пересечением полуночи (например, 22:00 - 09:00)
      if (currentTime >= startTime || currentTime <= endTime) {
        console.log('Quiet hours active - notification skipped');
        return null;
      }
    }
  }

  // Проверяем настройки для конкретного типа уведомления
  if (type === 'email') {
    if (!settings.emailNotifications) return null;

    // Desktop уведомление
    let notification: Notification | null = null;
    if (settings.emailDesktop) {
      notification = showDesktopNotification(title, body);
    }

    // Звуковое уведомление
    if (settings.emailSound) {
      playNotificationSound(settings.soundVolume);
    }

    return notification;
  } else if (type === 'task') {
    if (!settings.taskNotifications) return null;

    // Desktop уведомление
    let notification: Notification | null = null;
    if (settings.taskDesktop) {
      notification = showDesktopNotification(title, body);
    }

    // Звуковое уведомление
    if (settings.taskSound) {
      playNotificationSound(settings.soundVolume);
    }

    return notification;
  }

  return null;
};

const showDesktopNotification = (title: string, body: string): Notification | null => {
  // Проверяем, запущено ли приложение в Electron
  const isElectron = !!(window as any).electron;

  if (isElectron && (window as any).electron.showNotification) {
    console.log('Using Electron notification API');
    // Используем Electron Notification API для правильного отображения имени
    // Клик обрабатывается в Electron main process
    (window as any).electron.showNotification({
      title,
      body,
      icon: '/icon.png',
    });
    return null;
  }

  // Fallback для браузерной версии
  if (!('Notification' in window)) {
    console.log('Browser does not support desktop notification');
    return null;
  }

  console.log('Using browser notification API');
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        createNotification(title, body);
      }
    });
    return null;
  } else if (Notification.permission === 'granted') {
    return createNotification(title, body);
  }

  return null;
};

const createNotification = (title: string, body: string): Notification | null => {
  const notification = new Notification(title, {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'superapp-notification',
    requireInteraction: false,
  });

  // Автоматически закрываем уведомление через 5 секунд
  setTimeout(() => {
    notification.close();
  }, 5000);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
};

export const playNotificationSound = (volume: number) => {
  try {
    const audio = new Audio('/Message.wav');
    audio.volume = volume / 100;
    audio.play().catch(error => console.error('Failed to play notification sound:', error));
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export const playErrorSound = (volume: number = 100) => {
  try {
    const audio = new Audio('/Error.wav');
    audio.volume = volume / 100;
    audio.play().catch(error => console.error('Failed to play error sound:', error));
  } catch (error) {
    console.error('Failed to play error sound:', error);
  }
};

export const playTapSound = (volume: number = 100) => {
  try {
    const audio = new Audio('/tap2.wav');
    audio.volume = volume / 100;
    audio.play().catch(error => console.error('Failed to play tap sound:', error));
  } catch (error) {
    console.error('Failed to play tap sound:', error);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Browser does not support desktop notification');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};
