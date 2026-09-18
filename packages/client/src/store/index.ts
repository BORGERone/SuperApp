import { create } from 'zustand';
import { stopBackgroundMailPoller } from '../utils/backgroundNotifications';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  isAdmin: boolean;
  login: (username: string, isAdmin: boolean) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('accessToken'),
  currentUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : null,
  isAdmin: false,
  login: (username, isAdmin) => set({ isAuthenticated: true, currentUser: username, isAdmin }),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Явный logout — останавливаем бакграунд-уведомления о почте.
    stopBackgroundMailPoller();
    set({ isAuthenticated: false, currentUser: null, isAdmin: false });
  },
  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (token && user) {
      set({ isAuthenticated: true, currentUser: user.username, isAdmin: user.role === 'admin' });
    } else {
      set({ isAuthenticated: false, currentUser: null, isAdmin: false });
    }
  },
}));
