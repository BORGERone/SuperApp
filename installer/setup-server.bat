@echo off
REM ===========================================================================
REM  SuperApp - установка/настройка СЕРВЕРА (Windows 10).
REM  Двойной клик запускает интерактивную настройку: порт, генерация ключей,
REM  создание packages\server\.env. При повторном запуске можно оставить
REM  значения по умолчанию (Enter).
REM
REM  Без вопросов (обновление): setup-server.bat /defaults
REM ===========================================================================
setlocal
set "PS_ARGS="
if /I "%~1"=="/defaults" set "PS_ARGS=-Defaults"
if /I "%~1"=="-defaults" set "PS_ARGS=-Defaults"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-server.ps1" %PS_ARGS%
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo Готово. Запуск сервера:  cd packages\server ^&^& bun run src\server.ts
) else (
  echo Установка завершилась с ошибкой (код %RC%).
)
echo.
pause
endlocal
