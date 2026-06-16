import React, { useState, useEffect } from 'react';

export const ProfileSettings: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Загрузка текущих данных пользователя
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username || '');
        } else {
          console.error('Failed to load user data:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    loadUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        setMessage('Профиль успешно обновлен!');
      } else {
        const error = await response.json();
        setMessage(error.message || 'Ошибка при обновлении профиля');
      }
    } catch (error) {
      setMessage('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-app mb-6">Редактирование профиля</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-app-secondary mb-2">
            Имя пользователя
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-app-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ backgroundColor: 'var(--surface-3)' }}
            placeholder="Введите имя пользователя"
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('успешно') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
};
