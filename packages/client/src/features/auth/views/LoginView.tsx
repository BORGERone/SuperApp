import React, { useState } from 'react';
import { useAuthStore } from '../../../store';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../api/authApi';
import { PinInput } from '../components/PinInput';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  // Чекбокс «Запомнить» сохраняет ТОЛЬКО логин, но НЕ пароль и НЕ PIN.
  // Прежнее поведение (savedPassword в localStorage) являлось серьёзной
  // утечкой: Electron-профиль с паролями в открытом виде.
  const [rememberUsername, setRememberUsername] = useState(() => {
    return localStorage.getItem('rememberUsername') === 'true';
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({ email: username, password, pinCode });

      // Обновляем состояние авторизации
      if (result.user) {
        setError('');
        login(result.user.username, result.user.role);

        // Перенаправляем на drive после успешного входа
        navigate('/drive');

        if (rememberUsername) {
          localStorage.setItem('savedUsername', username);
        } else {
          localStorage.removeItem('savedUsername');
        }
        // Никогда не сохраняем пароль и PIN в открытом виде.
        localStorage.removeItem('savedPassword');
      }
    } catch (err) {
      setError('Неверный логин, пароль или пин-код');
      setIsShaking(true);
      setTimeout(() => {
        setPinCode('');
        setIsShaking(false);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Сохраняем состояние чекбокса в localStorage
  React.useEffect(() => {
    localStorage.setItem('rememberUsername', rememberUsername.toString());
  }, [rememberUsername]);

  // Загружаем сохранённый логин при монтировании.
  // Старый ключ savedPassword принудительно удаляем — он могбы остаться
  // от предыдущих сборок, где пароль сохранялся в открытом виде.
  React.useEffect(() => {
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('rememberPassword');
    const savedUsername = localStorage.getItem('savedUsername');
    if (savedUsername) setUsername(savedUsername);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-deep rounded-2xl p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gradient">SuperApp</h1>
          <h2 className="text-sm text-app-secondary">Сетевой диск</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-app-secondary mb-2">
              Логин
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg glass-input"
              placeholder="Введите логин"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-app-secondary mb-2">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg glass-input"
              placeholder="Введите пароль"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember-username"
              checked={rememberUsername}
              onChange={(e) => setRememberUsername(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            <label htmlFor="remember-username" className="ml-2 text-sm text-app-secondary">
              Запомнить логин
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              PIN-код
            </label>
            <div className="glass-mid rounded-xl p-6">
              <PinInput
                value={pinCode}
                onChange={setPinCode}
                isShaking={isShaking}
                onComplete={() => {
                  // Автосабмит при заполнении всех 4 цифр
                  const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                  if (submitBtn && pinCode.length === 4) {
                    submitBtn.click();
                  }
                }}
              />
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-center p-3 rounded-lg error-message"
              style={{
                color: 'rgb(248, 113, 113)',
                background: 'rgba(239, 68, 68, 0.10)',
                border: '1px solid rgba(239, 68, 68, 0.30)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || loginMutation.isPending}
            className="w-full py-3 px-4 btn-glass rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || loginMutation.isPending ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};
