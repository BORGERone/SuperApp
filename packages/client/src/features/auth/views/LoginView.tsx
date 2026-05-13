import React, { useState } from 'react';
import { useAuthStore } from '../../../store';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../api/authApi';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { username, password });
      
      const result = await loginMutation.mutateAsync({ email: username, password });
      
      // Обновляем состояние авторизации
      if (result.user) {
        login(result.user.username, result.user.role);
        
        // Перенаправляем на drive после успешного входа
        navigate('/drive');
        
        if (rememberPassword) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('savedPassword', password);
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

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

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">
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
