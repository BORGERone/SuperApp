@echo off
REM ===========================================================================
REM  SuperApp - установка/настройка КЛИЕНТА (Windows 10/11).
REM  Двойной клик запускает интерактивную настройку машины-клиента:
REM  bun install, адрес сервера (config.json) и сборка веб-бандла.
REM
REM  Без вопросов (обновление):       setup-client.bat /defaults
REM  Только config.json (без сборки): setup-client.bat /nobuild
REM
REM  Готовый .exe для раздачи на Win7/10/11 собирается отдельно через
REM  build-client.bat (в корне репозитория).
REM ===========================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul

set "PS_ARGS="
if /I "%~1"=="/defaults" set "PS_ARGS=-Defaults"
if /I "%~1"=="-defaults" set "PS_ARGS=-Defaults"
if /I "%~1"=="/nobuild" set "PS_ARGS=-NoBuild"
if /I "%~1"=="-nobuild" set "PS_ARGS=-NoBuild"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-client.ps1" %PS_ARGS%
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" goto :ok
echo Установка завершилась с ошибкой (код %RC%).
goto :fin
:ok
echo Готово. Клиент настроен (адрес сервера в config.json).
:fin
echo.
pause
endlocal
