import { createHashRouter, Navigate } from 'react-router-dom';
import App from './App';
import { LoginView, PinView } from './features/auth';
import { DriveView } from './features/drive';
import { MailView } from './features/mail';
import { TasksView } from './features/tasks';
import { SettingsView } from './features/settings';

export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/pin',
    element: <PinView />,
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/drive" replace />,
      },
      {
        path: 'drive',
        element: <DriveView />,
      },
      {
        path: 'mail',
        element: <MailView />,
      },
      {
        path: 'mail/inbox',
        element: <MailView />,
      },
      {
        path: 'mail/sent',
        element: <MailView />,
      },
      {
        path: 'mail/trash',
        element: <MailView />,
      },
      {
        path: 'tasks',
        element: <TasksView />,
      },
      {
        path: 'settings',
        element: <SettingsView />,
      },
    ],
  },
]);
