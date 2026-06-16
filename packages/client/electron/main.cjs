const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Устанавливаем имя приложения для уведомлений
app.setName('SuperApp');

// Устанавливаем AppUserModelID для Windows
// Используем простое имя вместо доменного формата для правильного отображения
if (process.platform === 'win32') {
  app.setAppUserModelId('SuperApp');
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'SuperApp',
    // Кастомный титлбар: убираем нативную рамку и используем свою.
    // На Windows 7+ работает frame:false (titleBarStyle поддерживается
    // только на Windows 10+, поэтому используем безопасный вариант).
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // В режиме разработки загружаем Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // В продакшене загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('maximize', broadcastMaximizeState);
  mainWindow.on('unmaximize', broadcastMaximizeState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers для управления окном (кастомный титлбар)
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Подписка на события maximize/unmaximize — renderer обновляет иконку.
function broadcastMaximizeState() {
  if (!mainWindow) return;
  const isMax = mainWindow.isMaximized();
  mainWindow.webContents.send('window:maximize-state', isMax);
}

// IPC handler для диалога сохранения файла
ipcMain.handle('dialog:saveFile', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  
  return null;
});

// IPC handler для показа уведомлений через Electron (для правильного отображения имени)
ipcMain.handle('show-notification', async (event, options) => {
  const { Notification } = require('electron');
  
  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon || undefined,
    appName: 'SuperApp',
  });
  
  notification.show();
  
  return { success: true };
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
