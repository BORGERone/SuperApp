@echo off
REM ===========================================================================
REM  SuperApp - запуск HTTPS-доступа из браузера (Caddy) одним кликом.
REM  Запускать НА СЕРВЕРЕ, где открыты порты 80 и 443.
REM
REM  Что делает:
REM    1) собирает веб-клиент с абсолютным base (packages\client\dist);
REM    2) скачивает caddy.exe рядом с собой, если его нет;
REM    3) генерирует Caddyfile.local с правильным путём к dist;
REM    4) запускает Caddy (авто-сертификат Let's Encrypt для prostroykrym.ru).
REM
REM  Предварительно: DNS A-запись на этот сервер, открытые 80/443, и Bun-сервер
REM  запущен на 127.0.0.1:3002 (см. installer\README.md и Caddyfile).
REM ===========================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

set "CLIENT_DIR=%~dp0..\packages\client"
set "DIST_DIR=%~dp0..\packages\client\dist"

echo === SuperApp: настройка HTTPS (Caddy) ===
echo.

REM 1) Проверяем Bun (нужен для сборки клиента).
where bun >nul 2>&1
if errorlevel 1 (
  echo X Не найден Bun. Установите: powershell -c "irm bun.sh/install.ps1 ^| iex"
  goto err
)

REM 2) Сборка веб-клиента с абсолютным base (для /assets/* и SPA-маршрутов).
echo -^> Сборка веб-клиента ^(bun install + build --base=/^)...
pushd "%CLIENT_DIR%"
call bun install
if errorlevel 1 ( popd & goto err )
call bun run build -- --base=/
if errorlevel 1 ( popd & goto err )
popd

REM 3) Гарантируем наличие Caddy.
set "CADDY=caddy"
where caddy >nul 2>&1 && goto have_caddy
if exist "%~dp0caddy.exe" set "CADDY=%~dp0caddy.exe" & goto have_caddy
echo -^> Caddy не найден, скачиваю caddy.exe...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile '%~dp0caddy.exe'"
if errorlevel 1 goto err
set "CADDY=%~dp0caddy.exe"
:have_caddy

REM 4) Генерируем Caddyfile.local с реальным путём к dist.
if not exist "%DIST_DIR%" ( echo X Каталог dist не найден: "%DIST_DIR%" & goto err )
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=(Resolve-Path '%DIST_DIR%').Path -replace '\\','/'; (Get-Content -Raw -Encoding UTF8 '%~dp0Caddyfile') -replace 'root \* .*', ('root * \"' + $d + '\"') | Set-Content -NoNewline -Encoding UTF8 '%~dp0Caddyfile.local'"
if errorlevel 1 goto err

REM 5) Запуск Caddy (foreground; сертификат выпустится автоматически).
echo.
echo -^> Запуск Caddy. Логи ниже. Остановка: Ctrl+C.
echo.
"%CADDY%" run --config "%~dp0Caddyfile.local"
set "RC=%ERRORLEVEL%"
echo.
echo Caddy завершился (код %RC%).
goto fin

:err
echo.
echo Установка HTTPS прервана из-за ошибки.
:fin
echo.
pause
endlocal
