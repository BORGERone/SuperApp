import React, { useState } from 'react';
import { ProfileSettings, AvatarSettings, PasswordSettings, AppearanceSettings, NotificationsSettings, AdminPanel } from '../components';
import { useAuthStore } from '../../../store';

type TabType = 'profile' | 'security' | 'appearance' | 'notifications' | 'admin';

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const SettingsView: React.FC = () => {
  const { isAdmin, currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const tabs = [
    { id: 'profile' as TabType, label: 'Профиль', icon: <UserIcon /> },
    { id: 'security' as TabType, label: 'Безопасность', icon: <LockIcon /> },
    { id: 'appearance' as TabType, label: 'Внешний вид', icon: <PaletteIcon /> },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: <BellIcon /> },
  ];

  if (currentUser === 'admin') {
    tabs.push({ id: 'admin' as TabType, label: 'Панель управления', icon: <SettingsIcon /> });
  }

  return (
    <div className="p-4 sm:p-8 h-[calc(100vh-2rem)] flex flex-col">
      <h1 className="text-2xl sm:text-3xl font-bold text-app mb-4 sm:mb-6 flex-shrink-0">Настройки</h1>

      <div className="glass-card rounded-lg p-4 sm:p-6 flex flex-col flex-1 min-h-0">
        {/* Вкладки сверху */}
        <div className="flex gap-2 mb-4 sm:mb-6 border-b border-app-border pb-4 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-app hover:bg-surface-2'
              }`}
              style={{
                background: activeTab === tab.id ? 'var(--color-primary)' : undefined
              }}
            >
              {tab.icon}
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
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </div>
    </div>
  );
};
