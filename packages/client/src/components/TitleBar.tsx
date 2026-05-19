import React, { useEffect, useState } from 'react';

interface ElectronWindowAPI {
  minimize: () => Promise<void> | void;
  toggleMaximize: () => Promise<boolean> | boolean;
  close: () => Promise<void> | void;
  isMaximized: () => Promise<boolean> | boolean;
  onMaximizeChange?: (cb: (isMax: boolean) => void) => () => void;
}

interface ElectronAPI {
  platform?: string;
  window?: ElectronWindowAPI;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

interface TitleBarProps {
  collapsed: boolean;
  sidebarWidthCollapsed: number;
  sidebarWidthExpanded: number;
  sidebarLeftMargin: number;
}

// Кастомный титлбар.
// Слева — «brand-зона», визуально продолжающая верх боковой панели
// (тот же glass-deep, та же ширина и тот же левый отступ). Снизу
// brand-зоны нет радиуса, чтобы переход в сайдбар выглядел монолитно.
// Справа — стандартные элементы управления окном (свернуть/развернуть/закрыть).
export const TitleBar: React.FC<TitleBarProps> = ({
  collapsed,
  sidebarWidthCollapsed,
  sidebarWidthExpanded,
  sidebarLeftMargin,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron =
    typeof window !== 'undefined' && Boolean(window.electron?.window);

  useEffect(() => {
    if (!isElectron) return;
    const api = window.electron!.window!;
    let cancelled = false;
    Promise.resolve(api.isMaximized()).then((value) => {
      if (!cancelled) setIsMaximized(Boolean(value));
    });
    const off = api.onMaximizeChange?.((value) => setIsMaximized(Boolean(value)));
    return () => {
      cancelled = true;
      if (off) off();
    };
  }, [isElectron]);

  const brandZoneWidth = collapsed ? sidebarWidthCollapsed : sidebarWidthExpanded;

  const handleMinimize = () => {
    window.electron?.window?.minimize();
  };
  const handleToggleMaximize = () => {
    window.electron?.window?.toggleMaximize();
  };
  const handleClose = () => {
    window.electron?.window?.close();
  };

  return (
    <div className="titlebar" role="presentation">
      {/* Brand zone — визуально вкладывается в верх сайдбара */}
      <div
        className="titlebar__brand-zone"
        style={{
          marginLeft: sidebarLeftMargin,
          width: brandZoneWidth,
          transition: 'width 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {!collapsed && (
          <span className="titlebar__brand" aria-hidden="true">
            SuperApp
          </span>
        )}
      </div>

      {/* Bridge — тонкий стеклянный мост поверх верхней границы экрана,
          соединяющий brand-зону слева с зоной системных кнопок справа. */}
      <div className="titlebar__bridge" aria-hidden="true" />

      {isElectron && (
        <div className="titlebar__controls">
          <button
            type="button"
            className="titlebar__btn"
            onClick={handleMinimize}
            aria-label="Свернуть окно"
            title="Свернуть"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar__btn"
            onClick={handleToggleMaximize}
            aria-label={isMaximized ? 'Свернуть в окно' : 'Развернуть на весь экран'}
            title={isMaximized ? 'Свернуть в окно' : 'Развернуть'}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect
                  x="2.5"
                  y="3.5"
                  width="6"
                  height="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <rect
                  x="4"
                  y="2"
                  width="6"
                  height="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect
                  x="2.5"
                  y="2.5"
                  width="7"
                  height="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="titlebar__btn titlebar__btn--close"
            onClick={handleClose}
            aria-label="Закрыть окно"
            title="Закрыть"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
