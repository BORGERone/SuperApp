import React, { useEffect, useMemo, useRef, useState } from 'react';
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
export const AssigneeFilter: React.FC<AssigneeFilterProps> = ({
  users,
  selected,
  onChange,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUserId),
    [users, currentUserId],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Подсчёт активных фильтров (без дубля currentUserId)
  const activeCount = selected.length;
  const labelText =
    activeCount === 0
      ? 'Все ответственные'
      : isMineActive && activeCount === 1
        ? 'Мои задачи'
        : `Выбрано: ${activeCount}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
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
        <span className={`flex-1 truncate ${activeCount > 0 ? 'font-semibold text-indigo-700' : 'text-gray-600'}`}>
          {labelText}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur-md">
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
                    className={`flex w-full items-center gap-3 border-t border-white/50 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${
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
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <UserCircle size={16} className="text-indigo-600" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {user.username}
                      </div>
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
