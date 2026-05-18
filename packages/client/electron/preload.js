const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  // API для drag and drop в Electron
  startDrag: (options) => ipcRenderer.invoke('drag:start', options),
  // API для показа уведомлений через Electron
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
});
