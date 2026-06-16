import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  filesWithoutAccess: string[];
}

export const GrantAccessModal: React.FC<GrantAccessModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  filesWithoutAccess,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-modal-open');
      return () => {
        document.body.classList.remove('has-modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-lg font-semibold text-gray-900">
            Выдать доступ к файлам?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-700 mb-4">
            Следующие файлы не доступны для выбранных пользователей. Выдать им доступ к файлам?
          </p>
          <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
            {filesWithoutAccess.map((fileName) => (
              <div key={fileName} className="text-sm text-gray-700 py-1">
                • {fileName}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200/50 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-200/50 hover:bg-gray-300/70 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Да
          </button>
        </div>
      </div>
    </div>
  );
};
