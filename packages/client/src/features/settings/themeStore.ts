import { create } from 'zustand';

export type ColorSchemeId =
  | 'indigo'
  | 'azure'
  | 'violet'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'graphite';

export type BackgroundMode = 'gradient' | 'image' | 'solid';

export interface ColorScheme {
  id: ColorSchemeId;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentForeground: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  surfaceBase: string;
  surfaceSubtle: string;
  border: string;
  ring: string;
  text: string;
  textMuted: string;
  // Bg radial gradient colors (5 layers)
  bgLayers: [string, string, string, string, string];
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'indigo',
    name: 'Индиго',
    description: 'Классическая корпоративная палитра',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.18)',
    accentStrong: '#4f46e5',
    accentForeground: '#ffffff',
    gradientFrom: '#6366f1',
    gradientVia: '#8b5cf6',
    gradientTo: '#a855f7',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(99, 102, 241, 0.45)',
    text: '#1e1b4b',
    textMuted: '#4f4f6e',
    bgLayers: ['#d8e0ff', '#e8f0ff', '#eef1ff', '#dde6ff', '#f5f6ff'],
  },
  {
    id: 'azure',
    name: 'Лазурь',
    description: 'Свежий деловой синий',
    accent: '#0ea5e9',
    accentSoft: 'rgba(14, 165, 233, 0.18)',
    accentStrong: '#0284c7',
    accentForeground: '#ffffff',
    gradientFrom: '#0ea5e9',
    gradientVia: '#38bdf8',
    gradientTo: '#22d3ee',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(14, 165, 233, 0.45)',
    text: '#0c4a6e',
    textMuted: '#475569',
    bgLayers: ['#cfeaff', '#dff1ff', '#ebf6ff', '#d4ebff', '#f1f9ff'],
  },
  {
    id: 'violet',
    name: 'Аметист',
    description: 'Премиальный фиолетовый',
    accent: '#a855f7',
    accentSoft: 'rgba(168, 85, 247, 0.18)',
    accentStrong: '#9333ea',
    accentForeground: '#ffffff',
    gradientFrom: '#a855f7',
    gradientVia: '#c084fc',
    gradientTo: '#f0abfc',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(168, 85, 247, 0.45)',
    text: '#581c87',
    textMuted: '#5b5468',
    bgLayers: ['#ecd9ff', '#f0e1ff', '#f5e9ff', '#e7d5ff', '#faf3ff'],
  },
  {
    id: 'emerald',
    name: 'Изумруд',
    description: 'Лаконичный зелёный',
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.18)',
    accentStrong: '#059669',
    accentForeground: '#ffffff',
    gradientFrom: '#10b981',
    gradientVia: '#34d399',
    gradientTo: '#6ee7b7',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(16, 185, 129, 0.45)',
    text: '#064e3b',
    textMuted: '#475569',
    bgLayers: ['#d1f1e2', '#e1f6ec', '#ecfaf2', '#d5f0e2', '#f1fbf6'],
  },
  {
    id: 'rose',
    name: 'Розa',
    description: 'Мягкий тёплый акцент',
    accent: '#f43f5e',
    accentSoft: 'rgba(244, 63, 94, 0.18)',
    accentStrong: '#e11d48',
    accentForeground: '#ffffff',
    gradientFrom: '#f43f5e',
    gradientVia: '#fb7185',
    gradientTo: '#fda4af',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(244, 63, 94, 0.45)',
    text: '#881337',
    textMuted: '#5a4651',
    bgLayers: ['#ffd9e2', '#ffe4eb', '#ffeef2', '#ffdce5', '#fff4f7'],
  },
  {
    id: 'amber',
    name: 'Янтарь',
    description: 'Золотистый акцент',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.18)',
    accentStrong: '#d97706',
    accentForeground: '#ffffff',
    gradientFrom: '#f59e0b',
    gradientVia: '#fbbf24',
    gradientTo: '#fcd34d',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(245, 158, 11, 0.45)',
    text: '#78350f',
    textMuted: '#5a4a3a',
    bgLayers: ['#fde6c0', '#feedce', '#fff4dd', '#fde2b9', '#fff8e8'],
  },
  {
    id: 'graphite',
    name: 'Графит',
    description: 'Сдержанный нейтральный',
    accent: '#475569',
    accentSoft: 'rgba(71, 85, 105, 0.18)',
    accentStrong: '#334155',
    accentForeground: '#ffffff',
    gradientFrom: '#475569',
    gradientVia: '#64748b',
    gradientTo: '#94a3b8',
    surfaceBase: 'rgba(255, 255, 255, 0.55)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.35)',
    border: 'rgba(255, 255, 255, 0.55)',
    ring: 'rgba(71, 85, 105, 0.45)',
    text: '#0f172a',
    textMuted: '#475569',
    bgLayers: ['#dfe5ee', '#e7ecf3', '#eef2f7', '#dde3ec', '#f3f5f9'],
  },
];

export const DEFAULT_SCHEME_ID: ColorSchemeId = 'indigo';

interface ThemeState {
  schemeId: ColorSchemeId;
  backgroundMode: BackgroundMode;
  backgroundImage: string | null;
  backgroundBlur: number;
  backgroundOpacity: number;
  reduceTransparency: boolean;
  setSchemeId: (id: ColorSchemeId) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setBackgroundImage: (image: string | null) => void;
  setBackgroundBlur: (value: number) => void;
  setBackgroundOpacity: (value: number) => void;
  setReduceTransparency: (value: boolean) => void;
  resetTheme: () => void;
}

const STORAGE_KEY = 'superapp:theme';

interface PersistedTheme {
  schemeId: ColorSchemeId;
  backgroundMode: BackgroundMode;
  backgroundImage: string | null;
  backgroundBlur: number;
  backgroundOpacity: number;
  reduceTransparency: boolean;
}

const DEFAULT_THEME: PersistedTheme = {
  schemeId: DEFAULT_SCHEME_ID,
  backgroundMode: 'gradient',
  backgroundImage: null,
  backgroundBlur: 18,
  backgroundOpacity: 0.6,
  reduceTransparency: false,
};

function loadTheme(): PersistedTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    return {
      ...DEFAULT_THEME,
      ...parsed,
    };
  } catch (err) {
    console.warn('Failed to load theme:', err);
    return DEFAULT_THEME;
  }
}

function persistTheme(state: PersistedTheme) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist theme:', err);
  }
}

const initial = loadTheme();

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...initial,
  setSchemeId: (id) => {
    set({ schemeId: id });
    persistTheme({ ...get(), schemeId: id });
  },
  setBackgroundMode: (mode) => {
    set({ backgroundMode: mode });
    persistTheme({ ...get(), backgroundMode: mode });
  },
  setBackgroundImage: (image) => {
    set({ backgroundImage: image });
    persistTheme({ ...get(), backgroundImage: image });
  },
  setBackgroundBlur: (value) => {
    set({ backgroundBlur: value });
    persistTheme({ ...get(), backgroundBlur: value });
  },
  setBackgroundOpacity: (value) => {
    set({ backgroundOpacity: value });
    persistTheme({ ...get(), backgroundOpacity: value });
  },
  setReduceTransparency: (value) => {
    set({ reduceTransparency: value });
    persistTheme({ ...get(), reduceTransparency: value });
  },
  resetTheme: () => {
    set(DEFAULT_THEME);
    persistTheme(DEFAULT_THEME);
  },
}));

export function getSchemeById(id: ColorSchemeId): ColorScheme {
  return COLOR_SCHEMES.find((s) => s.id === id) ?? COLOR_SCHEMES[0];
}
