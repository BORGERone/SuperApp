import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useChangePin } from '../../../features/auth/api/authApi';
import { PinInput } from '../../../features/auth/components/PinInput';
import { useBodyModalOpen } from '../../../utils/useBodyModalOpen';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [currentPinCode, setCurrentPinCode] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [confirmPinCode, setConfirmPinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const changePinMutation = useChangePin();

  useBodyModalOpen(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPinCode !== confirmPinCode) {
      setError('Новые пин-коды не совпадают');
      return;
    }

    if (newPinCode === currentPinCode) {
      setError('Новый пин-код должен отличаться от текущего');
      return;
    }

    setLoading(true);

    try {
      await changePinMutation.mutateAsync({
        password,
        currentPinCode,
        newPinCode,
      });

      // Сбрасываем форму и закрываем модальное окно
      setPassword('');
      setCurrentPinCode('');
      setNewPinCode('');
      setConfirmPinCode('');
      onClose();
    } catch (err) {
      console.error('Change PIN error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при смене пин-кода');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-app mb-4 sm:mb-6">Смена PIN-кода</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              Пароль от аккаунта
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-app-border rounded-lg bg-surface-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Введите пароль"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              Текущий PIN-код
            </label>
            <div className="glass-card rounded-xl p-3 sm:p-4 overflow-x-auto">
              <PinInput
                value={currentPinCode}
                onChange={setCurrentPinCode}
              />
            </div>
          </div>

          <div className="glass-card rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-x-auto">
            <div>
              <label className="block text-sm font-medium text-app-secondary mb-2">
                Новый PIN-код
              </label>
              <PinInput
                value={newPinCode}
                onChange={setNewPinCode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-secondary mb-2">
                Подтвердите новый PIN-код
              </label>
              <PinInput
                value={confirmPinCode}
                onChange={setConfirmPinCode}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 border border-app-border text-app rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50 text-sm"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || currentPinCode.length !== 4 || newPinCode.length !== 4 || confirmPinCode.length !== 4}
              className="flex-1 px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Смена...' : 'Сменить PIN-код'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
