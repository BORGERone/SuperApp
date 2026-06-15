@echo off
REM ===========================================================================
REM  Сброс пароля и PIN-кода пользователя SuperApp.
REM  Использование:
REM     reset-admin.bat                       -> admin / admin123 / PIN 1234
REM     reset-admin.bat admin МойПароль 4321  -> задать свои пароль и PIN
REM     reset-admin.bat <логин> <пароль> <pin>
REM  Логин = значение поля "email" на странице входа (у админа это "admin").
REM ===========================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

where bun >nul 2>&1
if errorlevel 1 (
  echo X Не найден Bun. Установите: powershell -c "irm bun.sh/install.ps1 ^| iex"
  goto fin
)

pushd "%~dp0..\packages\server"
call bun scripts\reset-admin.mjs %*
set "RC=%ERRORLEVEL%"
popd

echo.
if "%RC%"=="0" goto ok
echo Сброс не выполнен (код %RC%). Смотри сообщение выше.
goto fin
:ok
echo Готово.
:fin
echo.
pause
endlocal
