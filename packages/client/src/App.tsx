import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ThemeProvider } from './components/ThemeProvider';
import { resumeBackgroundMailPollerIfPossible } from './utils/backgroundNotifications';

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
