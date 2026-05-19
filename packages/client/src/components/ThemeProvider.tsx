import React, { useEffect } from 'react';
import { useAppearanceStore } from '../features/settings/viewmodels/appearanceViewModel';

const colorSchemes = {
  blue: {
    primary: '#3b82f6',
    secondary: '#60a5fa',
    accent: '#93c5fd',
    gradientFrom: '#3b82f6',
    gradientTo: '#8b5cf6',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    gradientFrom: '#8b5cf6',
    gradientTo: '#ec4899',
  },
  green: {
    primary: '#10b981',
    secondary: '#34d399',
    accent: '#6ee7b7',
    gradientFrom: '#10b981',
    gradientTo: '#3b82f6',
  },
  orange: {
    primary: '#f97316',
    secondary: '#fb923c',
    accent: '#fdba74',
    gradientFrom: '#f97316',
    gradientTo: '#ef4444',
  },
  pink: {
    primary: '#ec4899',
    secondary: '#f472b6',
    accent: '#f9a8d4',
    gradientFrom: '#ec4899',
    gradientTo: '#8b5cf6',
  },
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { themeMode, colorScheme, backgroundImage, backgroundImageEnabled, fontSize, animationsEnabled } = useAppearanceStore();

  useEffect(() => {
    const root = document.documentElement;
    const scheme = colorSchemes[colorScheme];

    // Применяем CSS переменные для цветовой схемы
    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-accent', scheme.accent);
    root.style.setProperty('--gradient-from', scheme.gradientFrom);
    root.style.setProperty('--gradient-to', scheme.gradientTo);
    
    // Конвертируем hex в rgba для alpha версии
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const primaryRgba = hexToRgba(scheme.primary, 0.1);
    root.style.setProperty('--color-primary-alpha', primaryRgba);
    root.style.setProperty('--color-primary-alpha-15', hexToRgba(scheme.primary, 0.15));
    
    // Для темной темы используем более светлые alpha значения
    const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.style.setProperty('--color-primary-alpha', hexToRgba(scheme.primary, 0.2));
    }

    // Применяем тему
    if (themeMode === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1a1a2e';
      document.body.style.color = '#ffffff';
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#1a1a2e';
    } else {
      // Auto - определяем по системным настройкам
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#1a1a2e';
        document.body.style.color = '#ffffff';
      } else {
        root.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#1a1a2e';
      }
    }

    // Применяем фоновое изображение
    if (backgroundImageEnabled && backgroundImage) {
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
    } else {
      document.body.style.backgroundImage = '';
    }

    // Применяем размер шрифта
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[fontSize]);
    document.body.style.fontSize = fontSizes[fontSize];

    // Включаем/выключаем анимации
    if (!animationsEnabled) {
      root.style.setProperty('--transition-duration', '0ms');
      document.body.classList.add('no-animations');
    } else {
      root.style.setProperty('--transition-duration', '');
      document.body.classList.remove('no-animations');
    }
    
    // Лог для отладки
    console.log('Theme updated:', { themeMode, colorScheme, backgroundImageEnabled, fontSize, animationsEnabled });
  }, [themeMode, colorScheme, backgroundImage, backgroundImageEnabled, fontSize, animationsEnabled]);

  return <>{children}</>;
};
