import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useUsers, useDeleteUser, useUpdateUserRole } from '../../auth/api/usersApi';
import { useAuthStore } from '../../../store';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const { data: users = [], isLoading, refetch } = useUsers();
  const deleteUserMutation = useDeleteUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPinCode, setEditPinCode] = useState('');

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      await deleteUserMutation.mutateAsync(userId);
      refetch();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Не удалось удалить пользователя');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      await updateUserRoleMutation.mutateAsync({ userId, role: newRole });
      refetch();

      // Если изменили роль текущего пользователя, обновляем его состояние
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Проверяем, изменилась ли роль текущего пользователя
        // (нужно получить данные о текущем пользователе из списка)
        const updatedUser = users.find((u: User) => u.username === user.username);
        if (updatedUser && updatedUser.role !== user.role) {
          // Обновляем роль в localStorage
          localStorage.setItem('user', JSON.stringify({
            ...user,
            role: updatedUser.role
          }));

          // Обновляем состояние в store
          checkAuth();

          alert(`Ваша роль изменена на ${updatedUser.role === 'admin' ? 'администратор' : 'пользователь'}. Страница будет перезагружена.`);
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Не удалось изменить роль пользователя');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditPinCode('');
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const payload: any = {};
      if (editUsername && editUsername !== selectedUser.username) {
        payload.username = editUsername;
        payload.email = `${editUsername}@example.com`;
      }
      if (editPassword) {
        payload.password = editPassword;
      }
      if (editPinCode) {
        payload.pinCode = editPinCode;
      }

      if (Object.keys(payload).length === 0) {
        alert('Нет изменений для сохранения');
        return;
      }

      const response = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Не удалось обновить пользователя';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setShowEditUserModal(false);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error instanceof Error ? error.message : 'Не удалось обновить пользователя');
    }
  };

  const handleSaveAll = async () => {
    if (!selectedUser) return;

    try {
      const payload: any = {};
      if (editUsername && editUsername !== selectedUser.username) {
        payload.username = editUsername;
        payload.email = `${editUsername}@example.com`;
      }
      if (editPassword) {
        if (editPassword.length < 8) {
          alert('Пароль должен содержать минимум 8 символов');
          return;
        }
        payload.password = editPassword;
      }
      if (editPinCode) {
        if (!/^\d{4}$/.test(editPinCode)) {
          alert('PIN-код должен состоять из 4 цифр');
          return;
        }
        payload.pinCode = editPinCode;
      }

      if (Object.keys(payload).length > 0) {
        const response = await fetch(`/api/auth/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Не удалось обновить пользователя';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
      }

      setShowEditUserModal(false);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error instanceof Error ? error.message : 'Не удалось обновить пользователя');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPinCode.length !== 4) {
      alert('PIN-код должен состоять из 4 цифр');
      return;
    }

    if (newPassword.length < 8) {
      alert('Пароль должен содержать минимум 8 символов');
      return;
    }

    try {
      const payload = {
        username: newUsername,
        email: `${newUsername}@example.com`,
        password: newPassword,
        pinCode: newPinCode,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = 'Не удалось создать пользователя';
        try {
          const errorJson = JSON.parse(responseText);
          // Обработка ZodError
          if (errorJson.error && errorJson.error.issues) {
            errorMessage = errorJson.error.issues.map((issue: any) => issue.message).join(', ');
          } else {
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          }
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Сбрасываем форму
      setNewUsername('');
      setNewPassword('');
      setNewPinCode('');
      setShowAddUserModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert(error instanceof Error ? error.message : 'Не удалось создать пользователя');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-app">Управление пользователями</h3>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 border border-app-border text-app rounded-lg hover:bg-surface-2 transition-colors"
          >
            Обновить
          </button>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Добавить пользователя
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-app-muted">Загрузка пользователей...</div>
      ) : (
        <div className="glass-card rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Имя пользователя
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Дата создания
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-app-muted uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-app-border">
              {users.map((user: User) => (
                <tr
                  key={user.id}
                  onClick={() => handleEditUser(user)}
                  className="hover:bg-surface-2 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-app">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-surface-2 text-app'
                      }`}
                    >
                      {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-app-muted">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className="text-app-muted">Нажмите для редактирования</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddUserModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-app mb-6">Добавить пользователя</h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Введите имя пользователя"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Введите пароль"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">
                  PIN-код
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinCode}
                  onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Введите 4-значный PIN-код"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-2 border border-app-border text-app rounded-lg hover:bg-surface-2 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showEditUserModal && selectedUser && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-3xl">
            <h2 className="text-2xl font-bold text-app mb-6">Редактировать пользователя</h2>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-secondary mb-2">
                      Имя пользователя
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Введите новое имя пользователя"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-secondary mb-2">
                      Новый пароль (оставьте пустым, чтобы не менять)
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Введите новый пароль"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-secondary mb-2">
                      Новый PIN-код (оставьте пустым, чтобы не менять)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={editPinCode}
                      onChange={(e) => setEditPinCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Введите новый 4-значный PIN-код"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Вы уверены, что хотите удалить пользователя ${selectedUser.username}?`)) {
                        handleDeleteUser(selectedUser.id);
                        setShowEditUserModal(false);
                        setSelectedUser(null);
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Удалить пользователя
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-app-secondary">
                      Администратор
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newRole = selectedUser.role === 'admin' ? 'user' : 'admin';
                        if (confirm(`Вы уверены, что хотите изменить роль пользователя на ${newRole}?`)) {
                          handleToggleRole(selectedUser.id, selectedUser.role);
                          setSelectedUser({ ...selectedUser, role: newRole });
                        }
                      }}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        selectedUser.role === 'admin' ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                          selectedUser.role === 'admin' ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-app-muted">
                    {selectedUser.role === 'admin' ? 'Да' : 'Нет'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end items-center pt-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 border border-app-border text-app rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
