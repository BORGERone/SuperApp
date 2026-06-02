import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'pink'
  | 'graphite'
  | 'teal'
  | 'crimson';

interface AppearanceSettings {
  // Тема
  themeMode: ThemeMode;
  
  // Цветовая схема
  colorScheme: ColorScheme;
  
  // Фоновое изображение
  backgroundImage: string | null;
  backgroundImageEnabled: boolean;
  // Размытие и затемнение фонового изображения (0…100, % UI -> px/альфа)
  backgroundImageBlur: number;
  backgroundImageDarkness: number;
  
  // Размер шрифта
  fontSize: 'small' | 'medium' | 'large';
  
  // Анимации
  animationsEnabled: boolean;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setBackgroundImage: (url: string | null) => void;
  setBackgroundImageEnabled: (enabled: boolean) => void;
  setBackgroundImageBlur: (value: number) => void;
  setBackgroundImageDarkness: (value: number) => void;
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
      backgroundImageBlur: 0,
      backgroundImageDarkness: 0,
      fontSize: 'medium',
      animationsEnabled: true,
      
      // Actions
      setThemeMode: (mode) => set({ themeMode: mode }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setBackgroundImage: (url) => set({ backgroundImage: url }),
      setBackgroundImageEnabled: (enabled) => set({ backgroundImageEnabled: enabled }),
      setBackgroundImageBlur: (value) => set({ backgroundImageBlur: Math.max(0, Math.min(100, value)) }),
      setBackgroundImageDarkness: (value) => set({ backgroundImageDarkness: Math.max(0, Math.min(100, value)) }),
      setFontSize: (size) => set({ fontSize: size }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
    }),
    {
      name: 'appearance-storage',
    }
  )
);
