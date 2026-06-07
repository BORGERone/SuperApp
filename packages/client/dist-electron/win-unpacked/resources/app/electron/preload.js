const { contextBridge, ipcRenderer } = require('electron');

const api = {
  platform: process.platform,
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  // API для drag and drop в Electron
  startDrag: (options) => ipcRenderer.invoke('drag:start', options),
  // API для показа уведомлений через Electron
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  // Свёрнуто ли окно (минимизировано или спрятано в трей) — для фоновых уведомлений
  isWindowMinimized: () => ipcRenderer.invoke('window:isMinimized'),
  // API для подписки на клик по уведомлению
  onNotificationClick: (cb) => {
    const handler = (_e, path) => cb(path);
    ipcRenderer.on('notification-clicked', handler);
    return () => ipcRenderer.removeListener('notification-clicked', handler);
  },
  // API кастомного титлбара
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb) => {
      const handler = (_e, isMax) => cb(isMax);
      ipcRenderer.on('window:maximize-state', handler);
      return () => ipcRenderer.removeListener('window:maximize-state', handler);
    },
  },
  // Зашифрованное средствами ОС хранилище для долгоживущих токенов (Variant A).
  secureStore: {
    set: (key, value) => ipcRenderer.invoke('secure:set', key, value),
    get: (key) => ipcRenderer.invoke('secure:get', key),
    delete: (key) => ipcRenderer.invoke('secure:delete', key),
  },
};

// Исторически часть кода детектит Electron по window.electron, а часть — по
// window.electronAPI. Раньше был выставлен только window.electron, из-за чего
// проверки window.electronAPI всегда были false (и в собранном приложении
// ломался выбор базового URL API). Выставляем под обоими именами.
contextBridge.exposeInMainWorld('electron', api);
contextBridge.exposeInMainWorld('electronAPI', api);
