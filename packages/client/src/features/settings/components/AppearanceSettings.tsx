import React from 'react';

export const AppearanceSettings: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Внешний вид</h2>
      
      <div className="glass-card p-6 rounded-lg">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-2xl">🚧</span>
          <div>
            <p className="text-lg font-medium text-gray-800">В разработке</p>
            <p className="text-gray-600">Эта функция будет доступна в будущих обновлениях</p>
          </div>
        </div>
        
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Тема оформления</h3>
            <p className="text-sm text-gray-600">Светлая/Темная тема</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Размер шрифта</h3>
            <p className="text-sm text-gray-600">Настройка размера текста</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Цветовая схема</h3>
            <p className="text-sm text-gray-600">Выбор цветовой палитры</p>
          </div>
        </div>
      </div>
    </div>
  );
};
