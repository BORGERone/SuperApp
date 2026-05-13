// Утилита для логирования клиентской части
export class ClientLogger {
  private static logFile = 'client-debug.log';
  
  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      message,
      data
    };
    
    console.log(`[CLIENT] ${message}`, data);
    this.writeToFile(logEntry);
  }
  
  static error(message: string, error?: Error | any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack
    };
    
    console.error(`[CLIENT ERROR] ${message}`, error);
    this.writeToFile(logEntry);
  }
  
  static warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'WARN',
      message,
      data
    };
    
    console.warn(`[CLIENT WARN] ${message}`, data);
    this.writeToFile(logEntry);
  }
  
  private static writeToFile(logEntry: any) {
    try {
      // В браузере не можем писать в файлы, но можем отправлять на сервер
      // или использовать localStorage для временного хранения
      const existingLogs = localStorage.getItem(this.logFile) || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(logEntry);
      
      // Храним только последние 100 записей
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem(this.logFile, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  static getLogs(): string[] {
    try {
      const logs = localStorage.getItem(this.logFile) || '[]';
      return JSON.parse(logs);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }
  
  static clearLogs() {
    localStorage.removeItem(this.logFile);
  }
}

// Глобальная функция для удобного использования
window.clientLogger = ClientLogger;
