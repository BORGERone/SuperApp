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

  // В собранном Electron окно безрамочное: на экране входа нет титлбара,
  // поэтому добавляем невидимую зону сверху для перетаскивания окна и
  // кнопку закрытия в углу. В вебе ничего не показываем.
  const isElectron =
    typeof window !== 'undefined' && Boolean((window as any).electron?.window);
  const handleCloseWindow = () => {
    (window as any).electron?.window?.close();
  };

  const handleSubmit = async (e?: React.FormEvent, overridePinCode?: string) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);

    const pinToUse = overridePinCode || pinCode;

    try {
      console.log('Attempting login with:', { username, password, pinCode: pinToUse });

      const result = await loginMutation.mutateAsync({ email: username, password, pinCode: pinToUse });

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-base, #f7f8fc)' }}>
      {isElectron && (
        <>
          {/* Невидимая зона для перетаскивания окна (под карточкой входа) */}
          <div
            className="win-drag"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44, zIndex: 5 }}
          />
          {/* Кнопка закрытия программы */}
          <button
            type="button"
            onClick={handleCloseWindow}
            aria-label="Закрыть окно"
            title="Закрыть"
            className="no-drag login-winbtn"
            style={{ position: 'fixed', top: 8, right: 8, zIndex: 30 }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </>
      )}
      <div className="glass-deep rounded-2xl p-12 w-full max-w-md border border-white/10 shadow-2xl relative z-10 scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gradient">SuperApp</h1>
          <h2 className="text-sm text-app-secondary">Авторизация</h2>
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
              id="remember-password"
              checked={rememberPassword}
              onChange={(e) => setRememberPassword(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            <label htmlFor="remember-password" className="ml-2 text-sm text-app-secondary">
              Запомнить пароль
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
                onComplete={(value) => {
                  // Автосабмит при заполнении всех 4 цифр если введены логин и пароль
                  if (username && password && value.length === 4) {
                    handleSubmit(undefined, value);
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
