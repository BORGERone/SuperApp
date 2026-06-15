import React, { useState } from 'react';
import { useAuthStore } from '../../../store';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { PinInput } from '../components/PinInput';
import { startBackgroundMailPoller } from '../../../utils/backgroundNotifications';

export const PinView: React.FC = () => {
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  // Получаем информацию о пользователе из localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ pinCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Неверный пин-код');
      }

      const result = await response.json();

      // Обновляем токены
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      // Поднимаем бакграунд-поллер уведомлений: после успешного PIN
      // refresh-токен у нас гарантированно валиден.
      startBackgroundMailPoller(result.refreshToken);

      // Перенаправляем на предыдущую страницу или на drive
      navigate('/drive');
    } catch (err) {
      console.error('PIN verification error:', err);
      setError('Неверный пин-код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    // Если нет информации о пользователе, перенаправляем на логин
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-base, #f7f8fc)' }}>
      <div className="glass rounded-2xl p-12 w-full max-w-md border border-white/10 shadow-2xl relative z-10 scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gradient">SuperApp</h1>
          <h2 className="text-sm text-gray-600">Подтверждение входа</h2>
        </div>

        {/* Информация о пользователе */}
        <div className="flex items-center gap-4 mb-8 p-4 glass-card rounded-xl">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'var(--color-accent)' }}>
            {user.username ? user.username[0].toUpperCase() : <User size={32} />}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{user.username || 'Пользователь'}</div>
            <div className="text-sm text-gray-600">{user.email || ''}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Введите PIN-код
            </label>
            <div className="glass-card rounded-xl p-6">
              <PinInput
                value={pinCode}
                onChange={setPinCode}
                onComplete={(value) => {
                  // Автосабмит при заполнении всех 4 цифр
                  if (value.length === 4) {
                    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                    if (submitBtn) {
                      submitBtn.click();
                    }
                  }
                }}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || pinCode.length !== 4}
            className="w-full py-3 px-4 btn-glass rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Проверка...' : 'Подтвердить'}
          </button>
        </form>

        {/* Кнопка выхода */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 py-3 px-4 flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  );
};
