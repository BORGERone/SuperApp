const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
});
