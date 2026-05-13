import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User as UserIcon, X } from 'lucide-react';
import { useUsers } from '../../auth/api/usersApi';

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

interface AssigneePickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

interface UserLite {
  id: string;
  username: string;
  email: string;
  role?: string;
}

// Множественный выбор ответственных пользователей с выпадающим списком
export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  selected,
  onChange,
  placeholder = 'Добавить ответственного...',
}) => {
  const { data: users = [] } = useUsers();
  const allUsers = users as UserLite[];

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userById = useMemo(() => {
    const map = new Map<string, UserLite>();
    allUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return allUsers.filter((user) => {
      if (selected.includes(user.id)) return false;
      if (!trimmed) return true;
      return (
        (user.username || '').toLowerCase().includes(trimmed) ||
        (user.email || '').toLowerCase().includes(trimmed)
      );
    });
  }, [allUsers, query, selected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isElectron) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      } else if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  const handleSelect = (user: UserLite, event?: React.MouseEvent) => {
    if (!selected.includes(user.id)) {
      onChange([...selected, user.id]);
    }
    setQuery('');
    setIsOpen(false);
    event?.stopPropagation();
  };

  const handleRemove = (userId: string) => {
    onChange(selected.filter((id) => id !== userId));
  };

  const dropdownContent = (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <div className="text-xs text-gray-400 p-2 border-b border-gray-200/60">
        Доступно пользователей: {filteredUsers.length}
      </div>
      {filteredUsers.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">Пользователи не найдены</div>
      ) : (
        filteredUsers.map((user) => (
          <div
            key={user.id}
            onClick={(event) => handleSelect(user, event)}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/70 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.username}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((userId) => {
            const user = userById.get(userId);
            const label = user?.username || user?.email || userId;
            return (
              <div
                key={userId}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/70 text-blue-700 rounded-full text-sm"
              >
                <UserIcon size={14} />
                <span className="max-w-[180px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(userId)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  aria-label="Убрать ответственного"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            refreshDropdownPosition();
            setIsOpen(true);
          }}
          onFocus={() => {
            refreshDropdownPosition();
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80 text-gray-900"
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {isOpen && (isElectron ? (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          {dropdownContent}
        </div>
      ) : (
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 99999,
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {dropdownContent}
          </div>,
          document.body
        )
      ))}
    </div>
  );
};
