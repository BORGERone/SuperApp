import React, { useState } from 'react';
import { useAuthStore } from '../../../store';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../api/authApi';
import { PinInput } from '../components/PinInput';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [rememberPassword, setRememberPassword] = useState(() => {
    const saved = localStorage.getItem('rememberPassword');
    return saved === 'true';
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
      console.log('Attempting login with:', { username, password, pinCode });

      const result = await loginMutation.mutateAsync({ email: username, password, pinCode });

      // Обновляем состояние авторизации
      if (result.user) {
        setError('');
        login(result.user.username, result.user.role);

        // Перенаправляем на drive после успешного входа
        navigate('/drive');

        if (rememberPassword) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('savedPassword', password);
          // Пин-код НЕ сохраняем
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
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
    localStorage.setItem('rememberPassword', rememberPassword.toString());
  }, [rememberPassword]);

  // Загружаем сохраненные данные при монтировании
  React.useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedUsername) setUsername(savedUsername);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gradient">SuperApp</h1>
          <h2 className="text-sm text-gray-600">Сетевой диск</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
              id="remember-password"
              checked={rememberPassword}
              onChange={(e) => setRememberPassword(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            <label htmlFor="remember-password" className="ml-2 text-sm text-gray-700">
              Запомнить пароль
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN-код
            </label>
            <div className="glass-card rounded-xl p-6">
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
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 error-message">
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
