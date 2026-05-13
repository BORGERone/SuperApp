import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User as UserIcon, X } from 'lucide-react';
import { useUsers } from '../../auth/api/usersApi';

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

interface UserOption {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

interface AssigneePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  value,
  onChange,
  placeholder = 'Добавить ответственного...',
}) => {
  const { data: users = [] } = useUsers();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const userMap = useMemo(() => {
    const map = new Map<string, UserOption>();
    users.forEach((user: UserOption) => map.set(user.id, user));
    return map;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    const list = (users as UserOption[]).filter((user) => !value.includes(user.id));
    if (!queryLower) return list;
    return list.filter(
      (user) =>
        user.username.toLowerCase().includes(queryLower) ||
        (user.email || '').toLowerCase().includes(queryLower)
    );
  }, [users, value, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isElectron) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
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

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleSelect = (user: UserOption) => {
    if (!value.includes(user.id)) {
      onChange([...value, user.id]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  const renderDropdown = () => {
    if (!isOpen) return null;
    const items = (
      <div
        className="bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        style={
          isElectron
            ? undefined
            : {
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 99999,
                pointerEvents: 'auto',
              }
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        {filteredUsers.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">Пользователи не найдены</div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelect(user)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/70 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </div>
                {user.email && (
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );

    if (isElectron) {
      return (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">{items}</div>
      );
    }
    return createPortal(items, document.body);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((userId) => {
            const user = userMap.get(userId);
            return (
              <span
                key={userId}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs"
              >
                <UserIcon size={12} />
                <span>{user ? user.username : 'Неизвестный пользователь'}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(userId)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  aria-label="Удалить ответственного"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updatePosition();
            setIsOpen(true);
          }}
          onFocus={() => {
            updatePosition();
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-sm text-gray-900"
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {renderDropdown()}
    </div>
  );
};
