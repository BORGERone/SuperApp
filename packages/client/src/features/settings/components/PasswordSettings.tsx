import React, { useState } from 'react';
import { ChangePinModal } from './ChangePinModal';

export const PasswordSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setMessage('Пароль успешно изменен!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        setMessage(error.message || 'Ошибка при изменении пароля');
      }
    } catch (error) {
      setMessage('Ошибка при изменении пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Безопасность</h2>

      <div className="space-y-8">
        {/* Изменение пароля */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Изменение пароля</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текущий пароль
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите текущий пароль"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите новый пароль"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подтвердите новый пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Подтвердите новый пароль"
                required
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>Требования к паролю:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Минимум 6 символов</li>
                <li>Рекомендуется использовать буквы и цифры</li>
              </ul>
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
              {loading ? 'Изменение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>

        {/* Смена PIN-кода */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PIN-код</h3>
          <p className="text-gray-600 mb-4">
            PIN-код используется для быстрого входа в приложение. Он должен состоять из 4 цифр.
          </p>
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Сменить PIN-код
          </button>
        </div>
      </div>

      {/* Модальное окно смены PIN-кода */}
      <ChangePinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />
    </div>
  );
};
