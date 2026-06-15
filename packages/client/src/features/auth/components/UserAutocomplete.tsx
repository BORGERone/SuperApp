import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUsers } from '../api/usersApi';
import { resolveAssetUrl } from '../../../lib/serverConfig';
import { ChevronDown, User } from 'lucide-react';

// Проверяем, запущено ли в Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

interface UserAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (user: { username: string; email: string; position?: string | null }) => void;
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
  const { data: users = [] } = useUsers();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setFilteredUsers([]);
      setIsOpen(false);
      return;
    }

    const q = value.toLowerCase();
    const filtered = users.filter((user: any) =>
      user.username.toLowerCase().includes(q) ||
      (user.position && user.position.toLowerCase().includes(q))
    );
    setFilteredUsers(filtered);
    setIsOpen(filtered.length > 0);
  }, [value, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!isOpen) updateDropdownPosition();
  };

  const handleUserSelect = (user: any, event?: React.MouseEvent) => {
    onSelect(user);
    onChange('');
    setIsOpen(false);
    if (!isElectron && event) event.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  const renderUserRow = (user: any, onClickHandler: (e: React.MouseEvent) => void) => (
    <div
      key={user.id}
      onClick={onClickHandler}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: 'var(--surface-2)' }}
      >
        {user.avatarUrl ? (
          <img src={resolveAssetUrl(user.avatarUrl)} alt={user.username} className="w-full h-full object-cover" />
        ) : (
          <User size={16} style={{ color: 'var(--color-primary)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-app truncate">{user.username}</div>
        <div className="text-xs text-app-muted truncate">
          {user.position || '—'}
        </div>
      </div>
    </div>
  );

  const dropdownClasses =
    'glass-top rounded-lg shadow-lg max-h-60 overflow-y-auto';

  const dropdownContent = (
    <>
      <div className="text-xs text-app-muted px-3 py-2 border-b" style={{ borderColor: 'var(--glass-border-soft)' }}>
        Найдено пользователей: {filteredUsers.length}
      </div>
      {filteredUsers.map((user) =>
        renderUserRow(user, (e) => handleUserSelect(user, e))
      )}
    </>
  );

  const notFoundContent = (
    <div className="text-sm text-app-muted px-3 py-2">
      Пользователи не найдены
    </div>
  );

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
            updateDropdownPosition();
            if (!value.trim()) {
              setFilteredUsers(users);
              setIsOpen(true);
            } else {
              setIsOpen(filteredUsers.length > 0);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 text-app"
          style={{
            borderColor: 'var(--glass-border-soft)',
            background: 'var(--surface-1)',
          }}
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-app-muted pointer-events-none z-10"
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredUsers.length > 0 && (isElectron ? (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 ${dropdownClasses}`}>
          {dropdownContent}
        </div>
      ) : (
        createPortal(
          <div
            className={`z-[99999] ${dropdownClasses}`}
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {dropdownContent}
          </div>,
          document.body
        )
      ))}

      {/* Not found */}
      {isOpen && value.trim() && filteredUsers.length === 0 && (isElectron ? (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 ${dropdownClasses}`}>
          {notFoundContent}
        </div>
      ) : (
        createPortal(
          <div
            className={`z-[9999] ${dropdownClasses}`}
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {notFoundContent}
          </div>,
          document.body
        )
      ))}
    </div>
  );
};
