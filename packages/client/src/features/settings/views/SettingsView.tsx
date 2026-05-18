import React, { useState } from 'react';
import { ProfileSettings, AvatarSettings, PasswordSettings, AppearanceSettings, NotificationsSettings } from '../components';

type TabType = 'profile' | 'security' | 'appearance' | 'notifications';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const tabs = [
    { id: 'profile' as TabType, label: 'Профиль', icon: '👤' },
    { id: 'security' as TabType, label: 'Безопасность', icon: '🔒' },
    { id: 'appearance' as TabType, label: 'Внешний вид', icon: '🎨' },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: '🔔' },
  ];

  return (
    <div className="p-4 sm:p-8 h-[calc(100vh-2rem)] flex flex-col">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 flex-shrink-0">Настройки</h1>
      
      <div className="glass-card rounded-lg p-4 sm:p-6 flex flex-col flex-1 min-h-0">
        {/* Вкладки сверху */}
        <div className="flex gap-2 mb-4 sm:mb-6 border-b border-gray-200 pb-4 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium text-sm sm:text-base">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Контент вкладки с прокруткой */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'profile' && (
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="flex-shrink-0">
                <AvatarSettings />
              </div>
              <div className="flex-1 min-w-0">
                <ProfileSettings />
              </div>
            </div>
          )}
          {activeTab === 'security' && <PasswordSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
        </div>
      </div>
    </div>
  );
};
