const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, safeStorage } = require('electron');
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
let tray = null;

// --- Конфигурация адреса сервера ------------------------------------------
// Десктоп-клиент не привязан к localhost: адрес бэкенда читается из config.json,
// который кладёт установщик клиента (installer/install-client). Порядок поиска:
//   1) переменная окружения SUPERAPP_API_URL (или SUPERAPP_CONFIG — путь к json);
//   2) config.json рядом с исполняемым файлом (каталог установки);
//   3) config.json в userData;
//   4) config.json в корне пакета клиента (для разработки).
// В config.json нет секретов — только адрес сервера, поэтому его безопасно
// читать и пробрасывать в renderer.
function readJsonFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error('config read failed:', filePath, error);
  }
  return null;
}

function loadClientConfig() {
  const candidates = [];
  if (process.env.SUPERAPP_CONFIG) candidates.push(process.env.SUPERAPP_CONFIG);
  try { candidates.push(path.join(path.dirname(app.getPath('exe')), 'config.json')); } catch {}
  try { candidates.push(path.join(app.getPath('userData'), 'config.json')); } catch {}
  candidates.push(path.join(__dirname, '..', 'config.json'));

  let cfg = {};
  for (const candidate of candidates) {
    const parsed = readJsonFile(candidate);
    if (parsed) { cfg = parsed; break; }
  }

  // Явная переменная окружения имеет наивысший приоритет (удобно для тестов).
  let apiBaseUrl = process.env.SUPERAPP_API_URL || cfg.apiBaseUrl || '';
  if (!apiBaseUrl && cfg.serverHost) {
    const protocol = cfg.protocol || 'http';
    const port = cfg.serverPort ? `:${cfg.serverPort}` : '';
    apiBaseUrl = `${protocol}://${cfg.serverHost}${port}`;
  }
  return { apiBaseUrl: String(apiBaseUrl || '').replace(/\/+$/, '') };
}

// Публичная (без секретов) конфигурация, пробрасываемая в renderer через preload.
const clientPublicConfig = loadClientConfig();

// preload запрашивает конфиг синхронно при старте страницы.
ipcMain.on('superapp:get-config', (event) => {
  event.returnValue = clientPublicConfig;
});
// Флаг настоящего выхода. По умолчанию закрытие окна не завершает
// приложение, а прячет его в трей (чтобы продолжали приходить фоновые
// уведомления). Реальный выход — только через пункт «Выход» в трее.
app.isQuitting = false;

// --- Безопасное хранилище токенов (Variant A) -----------------------------
// Долгоживущий refresh-токен фоновых уведомлений шифруется средствами ОС
// (Electron safeStorage: DPAPI на Windows, Keychain на macOS, libsecret на
// Linux) и кладётся на диск в userData. В localStorage (доступном для XSS)
// его больше не держим. Если шифрование ОС недоступно — деградируем до
// хранения в том же файле без шифрования (всё равно вне досягаемости JS
// рендерера), о чём честно сообщаем флагом enc:false.
const secureStorePath = () => path.join(app.getPath('userData'), 'secure-tokens.json');
function readSecureStore() {
  try {
    return JSON.parse(fs.readFileSync(secureStorePath(), 'utf8'));
  } catch {
    return {};
  }
}
function writeSecureStore(obj) {
  try {
    fs.writeFileSync(secureStorePath(), JSON.stringify(obj), { mode: 0o600 });
  } catch (error) {
    console.error('secure store write failed:', error);
  }
}

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

  // Закрытие окна (в т.ч. крестик кастомного титлбара) не завершает
  // приложение — прячем окно в трей. Реальный выход только при isQuitting.
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('SuperApp');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  // Клик по иконке — показать/скрыть окно.
  tray.on('click', () => toggleWindow());
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
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

// Свёрнуто ли окно (минимизировано ИЛИ спрятано в трей). Используется
// фоновым поллером, чтобы решать, показывать ли уведомление бакграундом.
ipcMain.handle('window:isMinimized', () => {
  if (!mainWindow) return true;
  return mainWindow.isMinimized() || !mainWindow.isVisible();
});

// --- IPC безопасного хранилища токенов ------------------------------------
ipcMain.handle('secure:set', (_e, key, value) => {
  if (typeof key !== 'string' || typeof value !== 'string') return false;
  const store = readSecureStore();
  if (safeStorage.isEncryptionAvailable()) {
    store[key] = { enc: true, data: safeStorage.encryptString(value).toString('base64') };
  } else {
    store[key] = { enc: false, data: Buffer.from(value, 'utf8').toString('base64') };
  }
  writeSecureStore(store);
  return true;
});

ipcMain.handle('secure:get', (_e, key) => {
  const store = readSecureStore();
  const rec = store[key];
  if (!rec) return null;
  try {
    const buf = Buffer.from(rec.data, 'base64');
    if (rec.enc) {
      if (!safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(buf);
    }
    return buf.toString('utf8');
  } catch (error) {
    console.error('secure store read failed:', error);
    return null;
  }
});

ipcMain.handle('secure:delete', (_e, key) => {
  const store = readSecureStore();
  delete store[key];
  writeSecureStore(store);
  return true;
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

  // Добавляем обработчик клика на уведомление
  notification.on('click', () => {
    console.log('Notification clicked in Electron main process');
    // Раскрываем окно
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
    // Отправляем сообщение в renderer процесс для навигации
    if (mainWindow) {
      mainWindow.webContents.send('notification-clicked', '/mail/inbox');
    }
  });

  notification.show();

  return { success: true };
});

app.on('ready', () => {
  createWindow();
  createTray();
});

// Любой путь выхода (меню трея, Cmd+Q, выключение ОС) помечаем как настоящий
// выход, чтобы обработчик 'close' не перехватывал его и окно реально закрылось.
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  // Не выходим автоматически: окно прячется в трей и приложение продолжает
  // работать ради фоновых уведомлений. Выходим только по явному «Выход».
  if (app.isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
