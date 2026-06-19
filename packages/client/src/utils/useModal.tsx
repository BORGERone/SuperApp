import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalOptions {
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType>({
  showModal: () => Promise.resolve(false),
});

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<{
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    resolve: ((value: boolean) => void) | null;
  } | null>(null);

  const showModal = useCallback((options: ModalOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setModal({
        type: options.type,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (modal?.resolve) {
      modal.resolve(true);
    }
    setModal(null);
  }, [modal]);

  const handleCancel = useCallback(() => {
    if (modal?.resolve) {
      modal.resolve(false);
    }
    setModal(null);
  }, [modal]);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {modal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-[100000]"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div
            className="glass-top rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{ minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {modal.title && (
              <h3 className="text-lg font-semibold text-app mb-3">{modal.title}</h3>
            )}
            <p className="text-app-secondary mb-6 whitespace-pre-wrap">{modal.message}</p>
            <div className="flex gap-3 justify-end">
              {modal.type === 'confirm' && (
                <button
                  onClick={() => handleCancel()}
                  className="px-4 py-2 rounded-lg glass-mid text-app hover:bg-surface-hover transition-colors"
                >
                  {modal.cancelText || 'Отмена'}
                </button>
              )}
              <button
                onClick={() => handleConfirm()}
                className="px-4 py-2 rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors font-medium"
              >
                {modal.confirmText || (modal.type === 'confirm' ? 'Удалить' : 'OK')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
