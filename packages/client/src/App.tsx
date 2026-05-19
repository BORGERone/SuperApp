import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useEffect } from 'react';
import { Layout } from './components/Layout';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
