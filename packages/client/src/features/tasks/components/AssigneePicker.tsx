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
  avatarUrl?: string;
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
    <div className="glass-top backdrop-blur-sm border border-app-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
      <div className="text-xs text-app-muted p-2 border-b border-app-border">
        Доступно пользователей: {filteredUsers.length}
      </div>
      {filteredUsers.length === 0 ? (
        <div className="px-3 py-2 text-sm text-app-muted">Пользователи не найдены</div>
      ) : (
        filteredUsers.map((user) => (
          <div
            key={user.id}
            onClick={(event) => handleSelect(user, event)}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'rgba(var(--color-primary-rgb), 0.15)' }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={16} style={{ color: 'var(--color-primary)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-app truncate">{user.username}</div>
              <div className="text-xs text-app-muted truncate">{user.email}</div>
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
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ring-1"
                style={{
                  background: 'rgba(var(--color-primary-rgb), 0.15)',
                  color: 'var(--color-primary)',
                  borderColor: 'rgba(var(--color-primary-rgb), 0.4)'
                }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={label} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <UserIcon size={14} />
                )}
                <span className="max-w-[180px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(userId)}
                  className="ml-1 hover:opacity-70"
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
          className="glass-input w-full px-3 py-2 pr-10"
        />
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none"
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
