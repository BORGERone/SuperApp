import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'auto';
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

interface AppearanceSettings {
  // Тема
  themeMode: ThemeMode;
  
  // Цветовая схема
  colorScheme: ColorScheme;
  
  // Фоновое изображение
  backgroundImage: string | null;
  backgroundImageEnabled: boolean;
  
  // Размер шрифта
  fontSize: 'small' | 'medium' | 'large';
  
  // Анимации
  animationsEnabled: boolean;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setBackgroundImage: (url: string | null) => void;
  setBackgroundImageEnabled: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export const useAppearanceStore = create<AppearanceSettings>()(
  persist(
    (set) => ({
      // Initial state
      themeMode: 'light',
      colorScheme: 'blue',
      backgroundImage: null,
      backgroundImageEnabled: false,
      fontSize: 'medium',
      animationsEnabled: true,
      
      // Actions
      setThemeMode: (mode) => set({ themeMode: mode }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setBackgroundImage: (url) => set({ backgroundImage: url }),
      setBackgroundImageEnabled: (enabled) => set({ backgroundImageEnabled: enabled }),
      setFontSize: (size) => set({ fontSize: size }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
    }),
    {
      name: 'appearance-storage',
    }
  )
);
