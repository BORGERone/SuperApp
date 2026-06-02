import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ThemeProvider } from './components/ThemeProvider';
import { resumeBackgroundMailPollerIfPossible } from './utils/backgroundNotifications';
import { playTapSound } from './utils/notifications';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем авторизацию при загрузке приложения
    checkAuth();
    // Если в localStorage остался bgRefreshToken (Electron перезапустили,
    // вкладку перезагрузили, access-токен помер) — снова поднимаем
    // бакграунд-поллер уведомлений «Пришло новое письмо».
    resumeBackgroundMailPollerIfPossible();
  }, [checkAuth]);

  useEffect(() => {
    // Глобальный обработчик для звука нажатия на кнопки
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Проверяем, является ли элемент кнопкой или находится внутри кнопки
      const button = target.closest('button, .btn-glass, .btn-glass-secondary, .btn-glass-danger, .btn-icon, a');
      if (button) {
        // Проверяем, что это не чекбокс или радио
        const isCheckbox = target.closest('input[type="checkbox"], input[type="radio"]');
        if (!isCheckbox) {
          // Проверяем, что это кнопка бургера или кнопка отправки письма
          const componentName = button.getAttribute('data-component-name');
          const buttonText = button.textContent;
          const isBurgerButton = componentName === 'Sidebar';
          const isSendButton = componentName === 'ComposeModal' && buttonText?.includes('Отправить');
          if (isBurgerButton || isSendButton) {
            playTapSound();
          }
        }
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => document.removeEventListener('click', handleButtonClick);
  }, []);

  // Обработчик клика на уведомление в Electron
  useEffect(() => {
    const electron = (window as any).electron;
    if (electron?.onNotificationClick) {
      const cleanup = electron.onNotificationClick((path: string) => {
        console.log('Notification click received, navigating to:', path);
        navigate(path);
      });
      return cleanup;
    }
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <ThemeProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
