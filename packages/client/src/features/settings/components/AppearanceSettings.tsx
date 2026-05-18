import React, { useRef, useState } from 'react';
import { Palette, Image as ImageIcon, Sliders, RotateCcw, Upload, Check, Eye, EyeOff } from 'lucide-react';
import { useThemeStore, COLOR_SCHEMES, BackgroundMode } from '../themeStore';

const PRESET_BACKGROUNDS: Array<{ id: string; name: string; url: string }> = [
  {
    id: 'aurora',
    name: 'Северное сияние',
    url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1920&q=70',
  },
  {
    id: 'mountains',
    name: 'Горы на рассвете',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=70',
  },
  {
    id: 'ocean',
    name: 'Океан',
    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=1920&q=70',
  },
  {
    id: 'forest',
    name: 'Лес в тумане',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=70',
  },
];

export const AppearanceSettings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schemeId = useThemeStore((s) => s.schemeId);
  const backgroundMode = useThemeStore((s) => s.backgroundMode);
  const backgroundImage = useThemeStore((s) => s.backgroundImage);
  const backgroundBlur = useThemeStore((s) => s.backgroundBlur);
  const backgroundOpacity = useThemeStore((s) => s.backgroundOpacity);
  const reduceTransparency = useThemeStore((s) => s.reduceTransparency);
  const setSchemeId = useThemeStore((s) => s.setSchemeId);
  const setBackgroundMode = useThemeStore((s) => s.setBackgroundMode);
  const setBackgroundImage = useThemeStore((s) => s.setBackgroundImage);
  const setBackgroundBlur = useThemeStore((s) => s.setBackgroundBlur);
  const setBackgroundOpacity = useThemeStore((s) => s.setBackgroundOpacity);
  const setReduceTransparency = useThemeStore((s) => s.setReduceTransparency);
  const resetTheme = useThemeStore((s) => s.resetTheme);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Пожалуйста, выберите файл изображения');
      return;
    }

    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('Файл должен быть меньше 8 МБ');
      return;
    }

    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBackgroundImage(dataUrl);
        setBackgroundMode('image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (url: string) => {
    setBackgroundImage(url);
    setBackgroundMode('image');
    setUploadError(null);
  };

  const handleClearBackground = () => {
    setBackgroundImage(null);
    setBackgroundMode('gradient');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Color schemes */}
      <div className="glass-card rounded-2xl p-6">
        <SectionHeader
          icon={<Palette size={18} />}
          title="Цветовая схема"
          description="Выберите акцентный цвет интерфейса"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COLOR_SCHEMES.map((scheme) => {
            const isActive = scheme.id === schemeId;
            return (
              <button
                key={scheme.id}
                type="button"
                onClick={() => setSchemeId(scheme.id)}
                className={`relative selectable-card glass-card rounded-xl p-3 text-left transition-transform duration-200 ${
                  isActive ? 'is-selected' : 'hover:-translate-y-0.5'
                }`}
              >
                <div
                  className="h-16 rounded-lg mb-3 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.gradientFrom} 0%, ${scheme.gradientVia} 50%, ${scheme.gradientTo} 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                  }}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow">
                      <Check size={14} style={{ color: scheme.accentStrong }} />
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[color:var(--text-strong)]">{scheme.name}</div>
                <div className="text-xs text-[color:var(--text-muted)] truncate">{scheme.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background mode */}
      <div className="glass-card rounded-2xl p-6">
        <SectionHeader
          icon={<ImageIcon size={18} />}
          title="Фон приложения"
          description="Выберите режим фона: градиент, изображение или сплошной цвет"
        />

        <div className="grid grid-cols-3 gap-2 mb-5">
          <BackgroundModeOption
            id="gradient"
            label="Градиент"
            active={backgroundMode === 'gradient'}
            onSelect={setBackgroundMode}
          />
          <BackgroundModeOption
            id="image"
            label="Изображение"
            active={backgroundMode === 'image'}
            onSelect={setBackgroundMode}
          />
          <BackgroundModeOption
            id="solid"
            label="Сплошной"
            active={backgroundMode === 'solid'}
            onSelect={setBackgroundMode}
          />
        </div>

        {backgroundMode === 'image' && (
          <div className="space-y-4 animate-fade-up">
            <div>
              <div className="text-sm font-medium text-[color:var(--text-strong)] mb-2">
                Готовые фоны
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_BACKGROUNDS.map((preset) => {
                  const isActive = backgroundImage === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.url)}
                      className={`relative selectable-card glass-panel rounded-xl overflow-hidden h-24 group ${
                        isActive ? 'is-selected' : ''
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-1.5 left-2 right-2 text-xs font-medium text-white drop-shadow truncate">
                        {preset.name}
                      </div>
                      {isActive && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 flex items-center justify-center">
                          <Check size={14} style={{ color: 'var(--accent-strong)' }} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-[color:var(--text-strong)] mb-2">
                Своё изображение
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 btn-glass rounded-xl"
                >
                  <Upload size={16} />
                  Загрузить изображение
                </button>
                {backgroundImage && (
                  <button
                    type="button"
                    onClick={handleClearBackground}
                    className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl"
                  >
                    Убрать фон
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {uploadError && (
                <div className="mt-2 text-xs text-rose-600">{uploadError}</div>
              )}
              {backgroundImage && (
                <div className="mt-3 glass-panel rounded-xl p-2 inline-flex items-center gap-2 max-w-full">
                  <img
                    src={backgroundImage}
                    alt="preview"
                    className="w-16 h-10 object-cover rounded-md"
                  />
                  <span className="text-xs text-[color:var(--text-muted)] truncate max-w-[200px]">
                    Активный фон
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual tuning */}
      <div className="glass-card rounded-2xl p-6">
        <SectionHeader
          icon={<Sliders size={18} />}
          title="Визуальные эффекты"
          description="Настройте размытие, прозрачность и доступность"
        />

        <div className="space-y-5">
          <SliderRow
            label="Размытие фона"
            value={backgroundBlur}
            min={0}
            max={48}
            step={1}
            unit="px"
            onChange={setBackgroundBlur}
          />
          <SliderRow
            label="Насыщенность фона"
            value={backgroundOpacity}
            min={0.1}
            max={1}
            step={0.05}
            unit=""
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={setBackgroundOpacity}
          />

          <label className="flex items-start gap-3 p-3 glass-panel rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={reduceTransparency}
              onChange={(e) => setReduceTransparency(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-[color:var(--text-strong)] flex items-center gap-2">
                {reduceTransparency ? <EyeOff size={14} /> : <Eye size={14} />}
                Уменьшить прозрачность
              </div>
              <div className="text-xs text-[color:var(--text-muted)] mt-0.5">
                Делает интерфейс непрозрачным — полезно при слабом контрасте или нагрузке на видеокарту
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={resetTheme}
            className="flex items-center gap-2 px-4 py-2 btn-glass-secondary rounded-xl"
          >
            <RotateCcw size={16} />
            Сбросить настройки
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3 mb-5">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
    >
      {icon}
    </div>
    <div>
      <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">{title}</h2>
      {description && (
        <p className="text-xs text-[color:var(--text-muted)] mt-0.5">{description}</p>
      )}
    </div>
  </div>
);

const BackgroundModeOption: React.FC<{
  id: BackgroundMode;
  label: string;
  active: boolean;
  onSelect: (mode: BackgroundMode) => void;
}> = ({ id, label, active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    className={`selectable-card glass-panel rounded-xl px-3 py-3 text-sm font-medium transition-transform duration-200 ${
      active ? 'is-selected' : 'hover:-translate-y-0.5'
    }`}
    style={
      active
        ? {
            color: 'var(--accent-strong)',
          }
        : { color: 'var(--text-muted)' }
    }
  >
    {label}
  </button>
);

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}> = ({ label, value, min, max, step, unit, onChange, formatValue }) => {
  const display = formatValue ? formatValue(value) : `${value}${unit}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[color:var(--text-strong)]">{label}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${
            ((value - min) / (max - min)) * 100
          }%, rgba(15,23,42,0.12) ${((value - min) / (max - min)) * 100}%, rgba(15,23,42,0.12) 100%)`,
        }}
      />
    </div>
  );
};
