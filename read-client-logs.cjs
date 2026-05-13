// Утилита для чтения клиентских логов из localStorage
const fs = require('fs');
const path = require('path');
const os = require('os');

// Путь к localStorage браузера (Chrome/Edge)
const getLocalStoragePath = () => {
  const homeDir = os.homedir();  
  
  // Windows
  if (process.platform === 'win32') {
    const localAppData = path.join(homeDir, 'AppData', 'Local');
    const possiblePaths = [
      path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'),
      path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb'),
      path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Profile 1', 'Local Storage', 'leveldb'),
      path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Profile 1', 'Local Storage', 'leveldb'),
    ];
    return possiblePaths;
  }
  
  // macOS
  if (process.platform === 'darwin') {
    return [
      path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Local Storage'),
      path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge', 'Local Storage'),
    ];
  }
  
  // Linux
  return [
    path.join(homeDir, '.config', 'google-chrome', 'Local Storage'),
    path.join(homeDir, '.config', 'microsoft-edge', 'Local Storage'),
  ];
};

// Чтение логов из localStorage
const readLogs = () => {
  console.log('🔍 Поиск клиентских логов...');  
  const possiblePaths = getLocalStoragePath();
  let logsFound = false;  
  
  possiblePaths.forEach((storagePath, index) => {
    try {
      if (fs.existsSync(storagePath)) {
        console.log(`📁 Проверка пути ${index + 1}: ${storagePath}`);
        
        const files = fs.readdirSync(storagePath);
        
        files.forEach(file => {
          if (file.includes('client-debug.log') || file.includes('chrome')) {
            try {
              const filePath = path.join(storagePath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              
              if (content.includes('client-debug.log')) {
                console.log('✅ Найдены логи в файле:', filePath);
                console.log('📋 Содержимое логов:');
                console.log(content);
                logsFound = true;
              }
            } catch (error) {
              console.log(`❌ Ошибка чтения файла ${file}:`, error.message);
            }
          }
        });
      }
    } catch (error) {
      console.log(`❌ Путь недоступен: ${storagePath}`);
    }
  });
  
  if (!logsFound) {
    console.log('❌ Логи не найдены. Попробуйте:');
    console.log('1. Откройте приложение в браузере');
    console.log('2. Нажмите F12 для открытия консоли');
    console.log('3. Выполните: JSON.parse(localStorage.getItem("client-debug.log") || "[]")');
  }
};

// Мониторинг логов в реальном времени
const monitorLogs = () => {
  console.log('🔄 Начало мониторинга логов...');
  console.log('💡 Используйте Ctrl+C для остановки');
  
  // Проверяем каждые 2 секунды
  const interval = setInterval(() => {
    console.clear();
    console.log('🕒', new Date().toLocaleString('ru-RU'));
    console.log('─'.repeat(50));
    readLogs();
  }, 2000);
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n🛑 Мониторинг остановлен');
    process.exit(0);
  });
};

// Запуск
if (process.argv.includes('--monitor')) {
  monitorLogs();
} else {
  readLogs();
}
