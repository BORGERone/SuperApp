import { useNotificationsStore } from '../features/settings/viewmodels/notificationsViewModel';

export const showNotification = (
  title: string,
  body: string,
  type: 'email' | 'task' = 'email'
) => {
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
        return;
      }
    } else {
      // Случай с пересечением полуночи (например, 22:00 - 09:00)
      if (currentTime >= startTime || currentTime <= endTime) {
        console.log('Quiet hours active - notification skipped');
        return;
      }
    }
  }
  
  // Проверяем настройки для конкретного типа уведомления
  if (type === 'email') {
    if (!settings.emailNotifications) return;
    
    // Desktop уведомление
    if (settings.emailDesktop) {
      showDesktopNotification(title, body);
    }
    
    // Звуковое уведомление
    if (settings.emailSound) {
      playNotificationSound(settings.soundVolume);
    }
  } else if (type === 'task') {
    if (!settings.taskNotifications) return;
    
    // Desktop уведомление
    if (settings.taskDesktop) {
      showDesktopNotification(title, body);
    }
    
    // Звуковое уведомление
    if (settings.taskSound) {
      playNotificationSound(settings.soundVolume);
    }
  }
};

const showDesktopNotification = (title: string, body: string) => {
  // Проверяем, запущено ли приложение в Electron
  const isElectron = !!(window as any).electron;
  
  if (isElectron && (window as any).electron.showNotification) {
    // Используем Electron Notification API для правильного отображения имени
    (window as any).electron.showNotification({
      title,
      body,
      icon: '/icon.png',
    });
    return;
  }
  
  // Fallback для браузерной версии
  if (!('Notification' in window)) {
    console.log('Browser does not support desktop notification');
    return;
  }
  
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        createNotification(title, body);
      }
    });
  } else if (Notification.permission === 'granted') {
    createNotification(title, body);
  }
};

const createNotification = (title: string, body: string) => {
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
};

const playNotificationSound = (volume: number) => {
  try {
    // Используем Web Audio API для генерации звука уведомления
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Настройка звука (приятный "динь")
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    // Настройка громкости
    gainNode.gain.setValueAtTime(volume / 100 * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
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
