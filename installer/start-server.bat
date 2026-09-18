@echo off
REM ===========================================================================
REM  Запуск Bun-бэкенда SuperApp для работы за Caddy/HTTPS.
REM  Слушает ТОЛЬКО localhost (127.0.0.1:3002) — наружу торчит лишь Caddy,
REM  который проксирует /api и /uploads на этот порт.
REM  Порт 3002 совпадает с reverse_proxy в installer\Caddyfile.
REM  Окно держать открытым (это и есть работающий сервер). Остановка — Ctrl+C.
REM ===========================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

REM Эти значения имеют приоритет над packages\server\.env (Bun не перезаписывает
REM уже заданные переменные окружения), поэтому порт гарантированно = 3002.
set "HOST=127.0.0.1"
set "PORT=3002"

where bun >nul 2>&1
if errorlevel 1 (
  echo X Не найден Bun. Установите: powershell -c "irm bun.sh/install.ps1 ^| iex"
  goto fin
)

pushd "%~dp0..\packages\server"
echo Запуск Bun-сервера на %HOST%:%PORT% ...
echo (для остановки нажмите Ctrl+C; окно не закрывайте, пока нужен сервер)
echo.
call bun run src\server.ts
set "RC=%ERRORLEVEL%"
popd

echo.
echo Сервер остановлен (код %RC%).
:fin
echo.
pause
endlocal
