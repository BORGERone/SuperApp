import React from 'react';
import { UserManagement } from './UserManagement';

export const AdminPanel: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Панель управления</h2>
      <div className="space-y-6">
        <UserManagement />
        <div className="glass-card rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Статистика системы</h3>
          <p className="text-gray-600">Здесь будет статистика использования системы.</p>
        </div>
      </div>
    </div>
  );
};
