import React, { useState, useRef } from 'react';
import { useAppearanceStore, ColorScheme } from '../viewmodels/appearanceViewModel';
import {
  Sun,
  Moon,
  Monitor,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Type,
  Zap,
  Palette,
  ZoomIn,
} from 'lucide-react';

type SchemeMeta = {
  id: ColorScheme;
  name: string;
  colors: [string, string, string];
};

const COLOR_SCHEMES: SchemeMeta[] = [
  { id: 'blue', name: 'Синий', colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
  { id: 'purple', name: 'Фиолетовый', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] },
  { id: 'green', name: 'Зелёный', colors: ['#10b981', '#34d399', '#6ee7b7'] },
  { id: 'orange', name: 'Оранжевый', colors: ['#f97316', '#fb923c', '#fdba74'] },
  { id: 'pink', name: 'Розовый', colors: ['#ec4899', '#f472b6', '#f9a8d4'] },
  { id: 'teal', name: 'Бирюза', colors: ['#0d9488', '#14b8a6', '#5eead4'] },
  { id: 'graphite', name: 'Графит', colors: ['#475569', '#64748b', '#94a3b8'] },
  { id: 'crimson', name: 'Багровый', colors: ['#dc2626', '#ef4444', '#fca5a5'] },
];

const FONT_SIZES = [
  { id: 'small' as const, name: 'Маленький' },
  { id: 'medium' as const, name: 'Средний' },
  { id: 'large' as const, name: 'Большой' },
];

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

const GlassToggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="relative inline-flex flex-shrink-0 items-center"
    style={{
      width: 44,
      height: 26,
      borderRadius: 999,
      background: checked
        ? 'linear-gradient(135deg, var(--gradient-from), var(--gradient-to))'
        : 'var(--surface-3)',
      border: '1px solid var(--glass-border-soft)',
      transition:
        'background 240ms var(--ease-spring), border-color 240ms var(--ease-spring), box-shadow 240ms var(--ease-spring)',
      boxShadow: checked
        ? '0 4px 12px rgba(var(--color-primary-rgb), 0.35)'
        : 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
    }}
    aria-pressed={checked}
  >
    <span
      style={{
        position: 'absolute',
        top: 2,
        left: checked ? 20 : 2,
        width: 20,
        height: 20,
        borderRadius: 999,
        background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
        transition: 'left 280ms var(--ease-spring)',
      }}
    />
  </button>
);

export const AppearanceSettings: React.FC = () => {
  const {
    themeMode,
    colorScheme,
    backgroundImage,
    backgroundImageEnabled,
    backgroundImageBlur,
    backgroundImageDarkness,
    fontSize,
    uiScale,
    animationsEnabled,
    setThemeMode,
    setColorScheme,
    setBackgroundImage,
    setBackgroundImageEnabled,
    setBackgroundImageBlur,
    setBackgroundImageDarkness,
    setFontSize,
    setUiScale,
    setAnimationsEnabled,
  } = useAppearanceStore();

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
        setBackgroundImageEnabled(true);
        setUploading(false);
      };
      reader.onerror = () => {
        console.error('Failed to load background');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to load background:', error);
      setUploading(false);
    } finally {
      // Reset input so re-uploading the same file works
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundImage(null);
    setBackgroundImageEnabled(false);
  };

  const themeOptions: Array<{
    id: 'light' | 'dark' | 'auto';
    name: string;
    icon: React.ReactNode;
  }> = [
    { id: 'light', name: 'Светлая', icon: <Sun className="w-5 h-5" /> },
    { id: 'dark', name: 'Тёмная', icon: <Moon className="w-5 h-5" /> },
    { id: 'auto', name: 'Авто', icon: <Monitor className="w-5 h-5" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 fade-in">
      <h2 className="text-xl sm:text-2xl font-bold text-app mb-4 sm:mb-6">
        Внешний вид
      </h2>

      <div className="space-y-4 sm:space-y-5">
        {/* Тема оформления */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <Monitor className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Тема оформления</h3>
              <p className="text-xs sm:text-sm text-app-muted">Выберите светлую, тёмную или системную тему</p>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const active = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemeMode(opt.id)}
                  className="glass-mid relative p-4 flex flex-col items-center gap-2"
                  style={{
                    background: active
                      ? 'rgba(var(--color-primary-rgb), 0.14)'
                      : undefined,
                    borderColor: active ? 'rgba(var(--color-primary-rgb), 0.45)' : undefined,
                    color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                    transform: active ? 'scale(1.02)' : undefined,
                    transition:
                      'background 240ms var(--ease-spring), border-color 240ms var(--ease-spring), color 200ms ease-out, transform 240ms var(--ease-spring)',
                  }}
                >
                  {opt.icon}
                  <span className="text-sm font-medium">{opt.name}</span>
                  {active && (
                    <span
                      className="absolute top-2 right-2"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Цветовая схема */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <Palette className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Цветовая схема</h3>
              <p className="text-xs sm:text-sm text-app-muted">Акцентный цвет и градиенты подложек</p>
            </div>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLOR_SCHEMES.map((scheme) => {
              const active = colorScheme === scheme.id;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => setColorScheme(scheme.id)}
                  className="glass-mid relative p-3 flex flex-col items-start gap-2"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${scheme.colors[0]}22, ${scheme.colors[1]}11)`
                      : undefined,
                    borderColor: active ? `${scheme.colors[0]}88` : undefined,
                    transform: active ? 'scale(1.02)' : undefined,
                    transition:
                      'background 240ms var(--ease-spring), border-color 240ms var(--ease-spring), transform 240ms var(--ease-spring)',
                  }}
                >
                  <div className="flex gap-1">
                    {scheme.colors.map((color, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full"
                        style={{
                          background: color,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-app-secondary">
                    {scheme.name}
                  </span>
                  {active && (
                    <span
                      className="absolute top-2 right-2"
                      style={{ color: scheme.colors[0] }}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Фоновое изображение */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Фоновое изображение</h3>
              <p className="text-xs sm:text-sm text-app-muted">Поставьте собственный фон приложения</p>
            </div>
          </header>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-app text-sm sm:text-base">
                  Использовать фоновое изображение
                </p>
                <p className="text-xs sm:text-sm text-app-muted">
                  Изображение применяется ко всему окну приложения
                </p>
              </div>
              <GlassToggle
                checked={backgroundImageEnabled}
                onChange={(next) => {
                  setBackgroundImageEnabled(next);
                  if (next && !backgroundImage) {
                    fileInputRef.current?.click();
                  }
                }}
              />
            </div>

            {backgroundImageEnabled && (
              <div className="space-y-3">
                {backgroundImage && (
                  <div
                    className="relative overflow-hidden h-32 sm:h-40 glass-mid"
                    style={{ padding: 0 }}
                  >
                    <img
                      src={backgroundImage}
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 btn-icon"
                      style={{
                        background: 'rgba(0, 0, 0, 0.55)',
                        color: '#fff',
                        borderRadius: 999,
                      }}
                      title="Удалить фон"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-glass flex items-center justify-center gap-2 w-full px-4 py-2.5"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{uploading ? 'Загрузка...' : 'Загрузить изображение'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <p className="text-xs text-app-muted text-center">
                  Поддерживаемые форматы: JPG, PNG, GIF. Рекомендуемый размер до 5 МБ.
                </p>

                {/* Ползунки управления фоновым изображением */}
                <div className="glass-mid p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app">
                        Размытие фонового изображения
                      </label>
                      <span className="text-xs text-app-muted tabular-nums">
                        {backgroundImageBlur}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={backgroundImageBlur}
                      onChange={(e) => setBackgroundImageBlur(Number(e.target.value))}
                      className="glass-range w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app">
                        Затемнение фонового изображения
                      </label>
                      <span className="text-xs text-app-muted tabular-nums">
                        {backgroundImageDarkness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={backgroundImageDarkness}
                      onChange={(e) => setBackgroundImageDarkness(Number(e.target.value))}
                      className="glass-range w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Размер шрифта */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <Type className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Размер шрифта</h3>
              <p className="text-xs sm:text-sm text-app-muted">Базовый размер интерфейса</p>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZES.map((size) => {
              const active = fontSize === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setFontSize(size.id)}
                  className="glass-mid relative p-4 flex flex-col items-center gap-2"
                  style={{
                    background: active
                      ? 'rgba(var(--color-primary-rgb), 0.14)'
                      : undefined,
                    borderColor: active ? 'rgba(var(--color-primary-rgb), 0.45)' : undefined,
                    color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                    transform: active ? 'scale(1.02)' : undefined,
                    transition:
                      'background 240ms var(--ease-spring), border-color 240ms var(--ease-spring), color 200ms ease-out, transform 240ms var(--ease-spring)',
                  }}
                >
                  <span
                    className={`font-medium ${
                      size.id === 'small'
                        ? 'text-xs'
                        : size.id === 'medium'
                          ? 'text-base'
                          : 'text-2xl'
                    }`}
                  >
                    Aa
                  </span>
                  <span className="text-xs">{size.name}</span>
                  {active && (
                    <span
                      className="absolute top-2 right-2"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Масштаб интерфейса */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <ZoomIn className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Масштаб интерфейса</h3>
              <p className="text-xs sm:text-sm text-app-muted">Общий масштаб всех элементов</p>
            </div>
          </header>

          <div className="glass-mid p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-app">
                Масштаб
              </label>
              <span className="text-xs text-app-muted tabular-nums">
                {uiScale}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={uiScale}
              onChange={(e) => setUiScale(Number(e.target.value))}
              className="glass-range w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-app-muted">
              <span>50%</span>
              <span>100%</span>
              <span>150%</span>
            </div>
          </div>
        </section>

        {/* Анимации */}
        <section className="glass-deep p-4 sm:p-6">
          <header className="flex items-center gap-2 sm:gap-3 mb-4">
            <span
              className="flex w-9 h-9 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(var(--color-primary-rgb), 0.15)', color: 'var(--color-primary)' }}
            >
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-app">Анимации</h3>
              <p className="text-xs sm:text-sm text-app-muted">Плавные переходы и эффекты по всему UI</p>
            </div>
          </header>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-app text-sm sm:text-base">Включить анимации</p>
              <p className="text-xs sm:text-sm text-app-muted">
                Отключите для снижения нагрузки на слабых устройствах
              </p>
            </div>
            <GlassToggle checked={animationsEnabled} onChange={setAnimationsEnabled} />
          </div>
        </section>
      </div>
    </div>
  );
};
