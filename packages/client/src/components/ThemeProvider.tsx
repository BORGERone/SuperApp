import React, { useEffect } from 'react';
import { useAppearanceStore } from '../features/settings/viewmodels/appearanceViewModel';

type SchemeDef = {
  primary: string;
  secondary: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
};

const colorSchemes: Record<string, SchemeDef> = {
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
  graphite: {
    primary: '#475569',
    secondary: '#64748b',
    accent: '#94a3b8',
    gradientFrom: '#334155',
    gradientTo: '#64748b',
  },
  teal: {
    primary: '#0d9488',
    secondary: '#14b8a6',
    accent: '#5eead4',
    gradientFrom: '#0d9488',
    gradientTo: '#3b82f6',
  },
  crimson: {
    primary: '#dc2626',
    secondary: '#ef4444',
    accent: '#fca5a5',
    gradientFrom: '#dc2626',
    gradientTo: '#f59e0b',
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const v = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const {
    themeMode,
    colorScheme,
    backgroundImage,
    backgroundImageEnabled,
    fontSize,
    animationsEnabled,
  } = useAppearanceStore();

  useEffect(() => {
    const root = document.documentElement;
    const scheme = colorSchemes[colorScheme] || colorSchemes.blue;

    // Цветовая схема
    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-accent', scheme.accent);
    root.style.setProperty('--gradient-from', scheme.gradientFrom);
    root.style.setProperty('--gradient-to', scheme.gradientTo);

    const rgb = hexToRgb(scheme.primary);
    root.style.setProperty('--color-primary-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
    root.style.setProperty('--color-primary-alpha', rgba(scheme.primary, 0.1));
    root.style.setProperty('--color-primary-alpha-15', rgba(scheme.primary, 0.15));
    root.style.setProperty('--ring', rgba(scheme.primary, 0.35));

    // Тема
    const isDark =
      themeMode === 'dark' ||
      (themeMode === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Фоновое изображение — управляем через CSS-переменные, фон рисует .app-bg
    if (backgroundImageEnabled && backgroundImage) {
      // Безопасно экранируем URL
      root.style.setProperty('--bg-image', `url("${backgroundImage}")`);
      root.style.setProperty('--bg-image-opacity', '1');
      // Гасим декоративный градиент, чтобы картинка читалась
      root.style.setProperty('--bg-gradient-opacity', '0.18');
    } else {
      root.style.setProperty('--bg-image', 'none');
      root.style.setProperty('--bg-image-opacity', '0');
      root.style.setProperty('--bg-gradient-opacity', isDark ? '0.8' : '0.7');
    }

    // Размер шрифта
    const fontSizes: Record<typeof fontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[fontSize]);
    document.body.style.fontSize = fontSizes[fontSize];

    // Анимации
    if (!animationsEnabled) {
      root.style.setProperty('--transition-duration', '0ms');
      document.body.classList.add('no-animations');
    } else {
      root.style.setProperty('--transition-duration', '200ms');
      document.body.classList.remove('no-animations');
    }
  }, [themeMode, colorScheme, backgroundImage, backgroundImageEnabled, fontSize, animationsEnabled]);

  // Реакция на смену системной темы при режиме «auto»
  useEffect(() => {
    if (themeMode !== 'auto' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  return <>{children}</>;
};
