import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Filter, UserCircle, Check } from 'lucide-react';

interface UserLite {
  id: string;
  username: string;
  email: string;
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
      className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span>Фильтр</span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Сбросить
          </button>
        )}
      </div>

      {currentUserId && (
        <button
          type="button"
          onClick={toggleMine}
          className={`flex w-full items-center gap-3 border-t border-white/50 px-3 py-2 text-left transition-colors hover:bg-indigo-50/70 ${
            isMineActive ? 'bg-indigo-50/60' : ''
          }`}
        >
          <span
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
              isMineActive
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : 'border-slate-300 bg-white'
            }`}
          >
            {isMineActive && <Check size={12} />}
          </span>
          <span className="flex-1 text-sm font-semibold text-indigo-700">Мои задачи</span>
        </button>
      )}

      <div className="max-h-64 overflow-y-auto">
        {otherUsers.length === 0 ? (
          <div className="border-t border-white/50 px-3 py-3 text-sm text-slate-500">
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
                className={`flex w-full items-center gap-3 border-t border-white/50 px-3 py-2 text-left transition-colors hover:bg-indigo-50/70 ${
                  isSelected ? 'bg-indigo-50/40' : ''
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                </span>
                <UserCircle size={18} className="text-indigo-500/80" />
                <span className="flex-1 text-sm text-slate-700">
                  <span className="font-medium">{user.username}</span>
                  <span className="ml-1 text-xs text-slate-400">{user.email}</span>
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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <span
            className={`flex-1 truncate ${
              activeCount > 0 ? 'font-semibold text-indigo-700' : 'text-gray-600'
            }`}
          >
            {labelText}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {dropdown && typeof document !== 'undefined'
        ? createPortal(dropdown, document.body)
        : null}
    </>
  );
};
