import React, { useState, useRef } from 'react';
import { useAppearanceStore } from '../viewmodels/appearanceViewModel';
import { Sun, Moon, Monitor, Image, Upload, X, Check, Type, Zap } from 'lucide-react';

export const AppearanceSettings: React.FC = () => {
  const {
    themeMode,
    colorScheme,
    backgroundImage,
    backgroundImageEnabled,
    fontSize,
    animationsEnabled,
    setThemeMode,
    setColorScheme,
    setBackgroundImage,
    setBackgroundImageEnabled,
    setFontSize,
    setAnimationsEnabled,
  } = useAppearanceStore();

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorSchemes = [
    { id: 'blue' as const, name: 'Синий', primary: '#3b82f6', colors: ['#3b82f6', '#60a5fa', '#93c5fd'] },
    { id: 'purple' as const, name: 'Фиолетовый', primary: '#8b5cf6', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] },
    { id: 'green' as const, name: 'Зеленый', primary: '#10b981', colors: ['#10b981', '#34d399', '#6ee7b7'] },
    { id: 'orange' as const, name: 'Оранжевый', primary: '#f97316', colors: ['#f97316', '#fb923c', '#fdba74'] },
    { id: 'pink' as const, name: 'Розовый', primary: '#ec4899', colors: ['#ec4899', '#f472b6', '#f9a8d4'] },
  ];

  const fontSizes = [
    { id: 'small' as const, name: 'Маленький' },
    { id: 'medium' as const, name: 'Средний' },
    { id: 'large' as const, name: 'Большой' },
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Для демо версии используем локальный URL вместо загрузки на сервер
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
        setBackgroundImageEnabled(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to load background:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundImage(null);
    setBackgroundImageEnabled(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Внешний вид</h2>
      
      <div className="space-y-4 sm:space-y-6">
        {/* Тема оформления */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Monitor className="text-blue-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Тема оформления</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setThemeMode('light')}
              className={`p-4 rounded-lg border-2 transition-all ${
                themeMode === 'light'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <span className="block text-sm font-medium text-center">Светлая</span>
            </button>
            
            <button
              onClick={() => setThemeMode('dark')}
              className={`p-4 rounded-lg border-2 transition-all ${
                themeMode === 'dark'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Moon className="w-6 h-6 mx-auto mb-2 text-gray-700" />
              <span className="block text-sm font-medium text-center">Темная</span>
            </button>
            
            <button
              onClick={() => setThemeMode('auto')}
              className={`p-4 rounded-lg border-2 transition-all ${
                themeMode === 'auto'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-700" />
              <span className="block text-sm font-medium text-center">Авто</span>
            </button>
          </div>
        </div>

        {/* Цветовая схема */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Type className="text-purple-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Цветовая схема</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => setColorScheme(scheme.id)}
                className={`relative p-3 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                  colorScheme === scheme.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="block text-xs font-medium text-center">{scheme.name}</span>
                {colorScheme === scheme.id && (
                  <svg className="absolute top-2 right-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: scheme.primary }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Фоновое изображение */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Image className="text-green-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Фоновое изображение</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700 text-sm sm:text-base">Использовать фоновое изображение</p>
                <p className="text-xs sm:text-sm text-gray-500">Установить собственный фон приложения</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={backgroundImageEnabled}
                  onChange={(e) => {
                    setBackgroundImageEnabled(e.target.checked);
                    if (e.target.checked && !backgroundImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {backgroundImageEnabled && (
              <div className="space-y-3">
                {backgroundImage && (
                  <div className="relative rounded-lg overflow-hidden h-32 sm:h-40">
                    <img
                      src={backgroundImage}
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
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
                
                <p className="text-xs text-gray-500 text-center">
                  Поддерживаемые форматы: JPG, PNG, GIF. Максимальный размер: 5 МБ
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Размер шрифта */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Type className="text-orange-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Размер шрифта</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fontSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setFontSize(size.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  fontSize === size.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className={`block text-sm font-medium text-center ${
                  size.id === 'small' ? 'text-sm' : size.id === 'medium' ? 'text-base' : 'text-lg'
                }`}>
                  {size.name}
                </span>
                {fontSize === size.id && (
                  <Check className="w-4 h-4 mx-auto mt-2 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Анимации */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Zap className="text-yellow-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Анимации</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700 text-sm sm:text-base">Включить анимации</p>
              <p className="text-xs sm:text-sm text-gray-500">Плавные переходы и эффекты</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
