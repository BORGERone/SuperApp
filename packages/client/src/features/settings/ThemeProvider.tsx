import React, { useEffect } from 'react';
import { useThemeStore, getSchemeById } from './themeStore';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function hexToRgbString(hex: string, fallback = '99, 102, 241'): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

/**
 * Applies the active color scheme and background settings to the
 * document root as CSS custom properties. The rest of the application
 * reads these variables via Tailwind arbitrary values and the
 * `glass` / `glass-card` classes defined in index.css.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const schemeId = useThemeStore((s) => s.schemeId);
  const backgroundMode = useThemeStore((s) => s.backgroundMode);
  const backgroundImage = useThemeStore((s) => s.backgroundImage);
  const backgroundBlur = useThemeStore((s) => s.backgroundBlur);
  const backgroundOpacity = useThemeStore((s) => s.backgroundOpacity);
  const reduceTransparency = useThemeStore((s) => s.reduceTransparency);

  useEffect(() => {
    const root = document.documentElement;
    const scheme = getSchemeById(schemeId);

    root.style.setProperty('--accent', scheme.accent);
    root.style.setProperty('--accent-rgb', hexToRgbString(scheme.accent));
    root.style.setProperty('--accent-soft', scheme.accentSoft);
    root.style.setProperty('--accent-strong', scheme.accentStrong);
    root.style.setProperty('--accent-foreground', scheme.accentForeground);
    root.style.setProperty('--accent-gradient-from', scheme.gradientFrom);
    root.style.setProperty('--accent-gradient-via', scheme.gradientVia);
    root.style.setProperty('--accent-gradient-to', scheme.gradientTo);
    root.style.setProperty('--surface-base', scheme.surfaceBase);
    root.style.setProperty('--surface-subtle', scheme.surfaceSubtle);
    root.style.setProperty('--surface-border', scheme.border);
    root.style.setProperty('--surface-ring', scheme.ring);
    root.style.setProperty('--text-strong', scheme.text);
    root.style.setProperty('--text-muted', scheme.textMuted);
    root.style.setProperty('--bg-layer-1', scheme.bgLayers[0]);
    root.style.setProperty('--bg-layer-2', scheme.bgLayers[1]);
    root.style.setProperty('--bg-layer-3', scheme.bgLayers[2]);
    root.style.setProperty('--bg-layer-4', scheme.bgLayers[3]);
    root.style.setProperty('--bg-layer-5', scheme.bgLayers[4]);

    root.setAttribute('data-scheme', schemeId);
    root.setAttribute('data-bg-mode', backgroundMode);
    root.toggleAttribute('data-reduce-transparency', reduceTransparency);

    root.style.setProperty('--bg-blur', `${backgroundBlur}px`);
    root.style.setProperty('--bg-opacity', String(backgroundOpacity));

    if (backgroundMode === 'image' && backgroundImage) {
      root.style.setProperty('--bg-image', `url("${backgroundImage}")`);
    } else {
      root.style.setProperty('--bg-image', 'none');
    }
  }, [schemeId, backgroundMode, backgroundImage, backgroundBlur, backgroundOpacity, reduceTransparency]);

  return <>{children}</>;
};
