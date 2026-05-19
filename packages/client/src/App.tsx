import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем авторизацию при загрузке приложения
    checkAuth();
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
