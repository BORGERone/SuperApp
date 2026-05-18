import React, { useState, useRef, useEffect } from 'react';

export const AvatarSettings: React.FC = () => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Загрузка текущего аватара
    const loadAvatar = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatarUrl || '');
        }
      } catch (error) {
        console.error('Failed to load avatar:', error);
      }
    };
    loadAvatar();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file: File) => {
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarUrl(data.avatarUrl);
        setMessage('Аватар успешно загружен!');
      } else {
        const error = await response.json();
        setMessage(error.message || 'Ошибка при загрузке аватара');
      }
    } catch (error) {
      setMessage('Ошибка при загрузке аватара');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setAvatarUrl('');
        setMessage('Аватар успешно удален!');
      } else {
        const error = await response.json();
        setMessage(error.message || 'Ошибка при удалении аватара');
      }
    } catch (error) {
      setMessage('Ошибка при удалении аватара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Настройка аватара</h2>
      
      <div className="space-y-6">
        {/* Текущий аватар */}
        <div className="flex flex-col items-center gap-4">
          <div 
            className="group relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer transition-colors"
            onClick={() => fileInputRef.current?.click()}
            title="Нажмите, чтобы загрузить новый аватар"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
            {/* Затемнение и текст при наведении */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium text-center px-2">сменить аватар</span>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {avatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Удаление...' : 'Удалить аватар'}
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600 text-center">
          <p>Нажмите на аватарку, чтобы загрузить новый</p>
          <p>Поддерживаемые форматы: JPG, PNG, GIF</p>
          <p>Максимальный размер: 5 МБ</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('успешно') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
