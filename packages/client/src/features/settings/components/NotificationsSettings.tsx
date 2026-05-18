import React, { useRef } from 'react';
import { useNotificationsStore } from '../viewmodels/notificationsViewModel';
import { Bell, Mail, Volume2, Clock } from 'lucide-react';

export const NotificationsSettings: React.FC = () => {
  const {
    emailNotifications,
    emailSound,
    emailDesktop,
    soundVolume,
    quietHours,
    setEmailNotifications,
    setEmailSound,
    setEmailDesktop,
    setSoundVolume,
    setQuietHours,
  } = useNotificationsStore();

  const lastSoundPlayTime = useRef(0);
  const soundPlayCooldown = 300; // 300ms между воспроизведениями

  const playNotificationSound = (volume: number) => {
    try {
      const now = Date.now();
      if (now - lastSoundPlayTime.current < soundPlayCooldown) {
        return; // Пропускаем, если прошло мало времени
      }
      
      lastSoundPlayTime.current = now;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume / 100 * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const handleVolumeChange = (value: number) => {
    setSoundVolume(value);
    playNotificationSound(value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Уведомления</h2>
      
      <div className="space-y-4 sm:space-y-6">
        {/* Почтовые уведомления */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Mail className="text-blue-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Почтовые уведомления</h3>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 text-sm sm:text-base">Уведомления о новых письмах</p>
                <p className="text-xs sm:text-sm text-gray-500">Получать уведомления при поступлении новых писем</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 text-sm sm:text-base">Звуковые уведомления</p>
                <p className="text-xs sm:text-sm text-gray-500">Воспроизводить звук при получении писем</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={emailSound}
                  onChange={(e) => setEmailSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 text-sm sm:text-base">Desktop уведомления</p>
                <p className="text-xs sm:text-sm text-gray-500">Показывать всплывающие уведомления на рабочем столе</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={emailDesktop}
                  onChange={(e) => setEmailDesktop(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Общие настройки */}
        <div className="glass-card p-4 sm:p-6 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Bell className="text-purple-500 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">Общие настройки</h3>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Громкость звука */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <p className="font-medium text-gray-700 text-sm sm:text-base">Громкость уведомлений</p>
                <span className="text-xs sm:text-sm text-gray-500">{soundVolume}%</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <Volume2 className="text-gray-500 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            {/* Тихие часы */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 text-sm sm:text-base">Тихие часы</p>
                  <p className="text-xs sm:text-sm text-gray-500">Отключить уведомления в определенное время</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={quietHours.enabled}
                    onChange={(e) => setQuietHours(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {quietHours.enabled && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <Clock className="text-gray-500 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) => setQuietHours(true, e.target.value, quietHours.end)}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                    />
                    <span className="text-gray-500 text-center sm:text-left">—</span>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) => setQuietHours(true, quietHours.start, e.target.value)}
                      className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
