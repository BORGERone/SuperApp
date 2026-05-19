const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  // API для drag and drop в Electron
  startDrag: (options) => ipcRenderer.invoke('drag:start', options),
  // API для показа уведомлений через Electron
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
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
});
