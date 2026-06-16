import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationSettings {
  // Почтовые уведомления
  emailNotifications: boolean;
  emailSound: boolean;
  emailDesktop: boolean;
  
  // Общие настройки
  soundVolume: number; // 0-100
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  
  // Actions
  setEmailNotifications: (enabled: boolean) => void;
  setEmailSound: (enabled: boolean) => void;
  setEmailDesktop: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setQuietHours: (enabled: boolean, start?: string, end?: string) => void;
}

export const useNotificationsStore = create<NotificationSettings>()(
  persist(
    (set) => ({
      // Initial state
      emailNotifications: true,
      emailSound: true,
      emailDesktop: true,
      soundVolume: 70,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '09:00',
      },
      
      // Actions
      setEmailNotifications: (enabled) => set({ emailNotifications: enabled }),
      setEmailSound: (enabled) => set({ emailSound: enabled }),
      setEmailDesktop: (enabled) => set({ emailDesktop: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(100, volume)) }),
      setQuietHours: (enabled, start, end) => set((state) => ({
        quietHours: {
          enabled,
          start: start || state.quietHours.start,
          end: end || state.quietHours.end,
        }
      })),
    }),
    {
      name: 'notifications-storage',
    }
  )
);
