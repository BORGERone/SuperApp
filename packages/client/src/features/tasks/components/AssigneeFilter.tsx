import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Filter, UserCircle, Check } from 'lucide-react';
import { resolveAssetUrl } from '../../../lib/serverConfig';

interface UserLite {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

interface AssigneeFilterProps {
  users: UserLite[];
  selected: string[];
  onChange: (next: string[]) => void;
  currentUserId: string | null;
}

// Множественный выбор ответственных для фильтрации задач: выпадающий список с чекбоксами.
// Первым пунктом «Мои задачи» — фильтрует по текущему пользователю; сам текущий пользователь
// исключён из общего списка, попадает только через «Мои задачи».
// Список рендерится через portal в body с position: fixed, чтобы не залезать под колонки
// (у `glass-card` создаётся свой stacking context из-за backdrop-blur).
export const AssigneeFilter: React.FC<AssigneeFilterProps> = ({
  users,
  selected,
  onChange,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 256 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUserId),
    [users, currentUserId],
  );

  const refreshPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 256;
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - dropdownWidth),
      width: dropdownWidth,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    refreshPosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const handleReposition = () => refreshPosition();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const isMineActive = !!currentUserId && selected.includes(currentUserId);

  const toggleMine = () => {
    if (!currentUserId) return;
    if (isMineActive) {
      onChange(selected.filter((id) => id !== currentUserId));
    } else {
      onChange([...selected, currentUserId]);
    }
  };

  const toggleUser = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  const clearAll = () => onChange([]);

  const activeCount = selected.length;
  const labelText =
    activeCount === 0
      ? 'Все ответственные'
      : isMineActive && activeCount === 1
        ? 'Мои задачи'
        : `Выбрано: ${activeCount}`;

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-2xl border border-app-border glass-top shadow-xl backdrop-blur-md dark:border-gray-700"
    >
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-app-muted">
        <span>Фильтр</span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Сбросить
          </button>
        )}
      </div>

      {currentUserId && (
        <button
          type="button"
          onClick={toggleMine}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
            isMineActive ? 'bg-surface-2' : ''
          }`}
        >
          <span
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
              isMineActive
                ? 'border-app-border bg-app-border text-white'
                : 'border-app-border bg-surface-1'
            }`}
            style={isMineActive ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
          >
            {isMineActive && <Check size={12} />}
          </span>
          <span className="flex-1 text-sm font-semibold text-app">Мои задачи</span>
        </button>
      )}

      <div className="max-h-64 overflow-y-auto">
        {otherUsers.length === 0 ? (
          <div className="px-3 py-3 text-sm text-app-muted">
            Других пользователей нет
          </div>
        ) : (
          otherUsers.map((user) => {
            const isSelected = selected.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user.id)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
                  isSelected ? 'bg-surface-2' : ''
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? 'border-app-border bg-app-border text-white'
                      : 'border-app-border bg-surface-1'
                  }`}
                  style={isSelected ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                >
                  {isSelected && <Check size={12} />}
                </span>
                {user.avatarUrl ? (
                  <img src={resolveAssetUrl(user.avatarUrl)} alt={user.username} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <UserCircle size={18} style={{ color: 'var(--color-primary)' }} />
                )}
                <span className="flex-1 text-sm text-app">
                  <span className="font-medium">{user.username}</span>
                  <span className="ml-1 text-xs text-app-muted">{user.email}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="glass-input flex w-56 items-center gap-2 rounded-xl py-2 pl-9 pr-3 text-left text-sm"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Filter
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
            size={16}
          />
          <span
            className={`flex-1 truncate ${
              activeCount > 0 ? 'font-semibold' : ''
            }`}
            style={activeCount > 0 ? { color: 'var(--color-primary)' } : {}}
          >
            {labelText}
          </span>
          <ChevronDown
            size={14}
            className={`text-app-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {dropdown && typeof document !== 'undefined'
        ? createPortal(dropdown, document.body)
        : null}
    </>
  );
};
