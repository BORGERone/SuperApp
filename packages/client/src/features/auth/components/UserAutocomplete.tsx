import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUsers } from '../api/usersApi';
import { ChevronDown, User } from 'lucide-react';

// Проверяем, запущено ли в Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

interface UserAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (user: { username: string; email: string }) => void;
  placeholder?: string;
}

export const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Введите имя...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const { data: users = [], isLoading, error } = useUsers();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Отладочные логи
  console.log('UserAutocomplete - users:', users, 'isLoading:', isLoading, 'error:', error);

  // Фильтруем пользователей при вводе
  useEffect(() => {
    console.log('UserAutocomplete - value changed:', value);
    if (!value.trim()) {
      setFilteredUsers([]);
      setIsOpen(false);
      return;
    }

    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(value.toLowerCase()) ||
      user.email.toLowerCase().includes(value.toLowerCase())
    );
    
    console.log('UserAutocomplete - filtered users:', filtered);
    setFilteredUsers(filtered);
    setIsOpen(filtered.length > 0);
  }, [value, users]);

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // В Electron проверяем только input и dropdown
      if (isElectron) {
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && 
          !inputRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      } else {
        // В браузере с Portal закрываем при клике вне input
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('UserAutocomplete - input changed:', newValue);
    onChange(newValue);

    // Обновляем позицию dropdown при открытии
    if (inputRef.current && !isOpen) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleUserSelect = (user: any, event?: React.MouseEvent) => {
    console.log('UserAutocomplete - user selected:', user);
    console.log('UserAutocomplete - isElectron:', isElectron);
    console.log('UserAutocomplete - onSelect function:', typeof onSelect);
    
    onSelect(user);
    onChange(''); // Очищаем поле ввода, не устанавливаем email
    setIsOpen(false);
    
    // В браузере с Portal нужно предотвратить bubbling
    if (!isElectron && event) {
      event.stopPropagation();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            console.log('UserAutocomplete - input focused');
            // Обновляем позицию dropdown при фокусе
            if (inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
              });
            }
            // При фокусе показываем всех пользователей, если поле пустое
            if (!value.trim()) {
              setFilteredUsers(users);
              setIsOpen(true);
            } else {
              setIsOpen(filteredUsers.length > 0);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900"
        />
        <ChevronDown 
          size={16} 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" 
        />
      </div>

      {/* Выпадающий список пользователей */}
      {isOpen && filteredUsers.length > 0 && (isElectron ? (
        // В Electron используем абсолютное позиционирование внутри компонента
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="text-xs text-gray-400 p-2 border-b">
            Найдено пользователей: {filteredUsers.length}
          </div>
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={(e) => handleUserSelect(user, e)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/60 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500">
                  {user.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // В браузере используем Portal для избежания обрезания
        createPortal(
          <div
            className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg z-[99999] max-h-60 overflow-y-auto"
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-gray-400 p-2 border-b">
              Найдено пользователей: {filteredUsers.length}
            </div>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={(e) => {
                  console.log('Portal dropdown item clicked:', user);
                  handleUserSelect(user, e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/60 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )
      ))}

      {/* Сообщение если ничего не найдено */}
      {isOpen && value.trim() && filteredUsers.length === 0 && (isElectron ? (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg z-50 px-3 py-2">
          <div className="text-sm text-gray-500">
            Пользователи не найдены
          </div>
        </div>
      ) : (
        createPortal(
          <div
            className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg z-[9999] px-3 py-2"
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width
            }}
          >
            <div className="text-sm text-gray-500">
              Пользователи не найдены
            </div>
          </div>,
          document.body
        )
      ))}
    </div>
  );
};
