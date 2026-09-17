@echo off
REM ===========================================================================
REM  SuperApp - резервная копия живой базы данных и восстановление из копии.
REM
REM  База (packages\server\src\db\superapp.db) лежит рядом с кодом, но в git её
REM  хранить нельзя: иначе каждый pull подменяет её версией из репозитория и
REM  данные пропадают. Эти правила уже прописаны в .gitignore.
REM
REM  Запуск:
REM      db-backup.bat            сделать копию -> installer\backups\superapp-<дата>.db
REM      db-backup.bat /restore   вернуть базу из САМОЙ СВЕЖЕЙ копии
REM
REM  Так безопасно делать pull на сервере:
REM      1) остановить сервер (Ctrl+C в окне SuperApp-Start)
REM      2) db-backup.bat
REM      3) git pull
REM      4) проверить, что база на месте; если pull её удалил/подменил —
REM         db-backup.bat /restore
REM      5) запустить сервер (SuperApp-Start.bat)
REM
REM  Копии складываются локально (каталог installer\backups\ в .gitignore) и
REM  никогда не попадают в репозиторий.
REM ===========================================================================
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "DBDIR=%~dp0..\packages\server\src\db"
set "DB=%DBDIR%\superapp.db"
set "BKDIR=%~dp0backups"

if /I "%~1"=="/restore" goto Restore
if /I "%~1"=="-restore" goto Restore
if /I "%~1"=="/?" goto Help
goto Backup

REM ===========================================================================
:Backup
echo === SuperApp: копия базы данных ===
echo.
echo Если сервер сейчас работает - сначала остановите его (Ctrl+C в окне
echo SuperApp-Start), иначе копия может не содержать самых свежих записей.
echo.

if not exist "%DB%" (
  echo [!] База не найдена: %DB%
  echo     Копировать нечего: сервер создаст файл при первом запуске.
  goto End
)

set "STAMP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"`) do set "STAMP=%%i"
if not defined STAMP set "STAMP=%RANDOM%%RANDOM%"

if not exist "%BKDIR%" mkdir "%BKDIR%"
set "DST=%BKDIR%\superapp-%STAMP%.db"

copy /y "%DB%" "%DST%" >nul
if errorlevel 1 goto CopyFail

REM WAL/журнал (появляются, если SQLite переведён в режим WAL) - копируем рядом.
for %%e in (wal shm journal) do (
  if exist "%DB%-%%e" copy /y "%DB%-%%e" "%DST%-%%e" >nul
)

for %%f in ("%DB%") do echo Копия готова: %DST%   (размер базы: %%~zf байт)
echo В каталоге копий: %BKDIR%
echo.
echo Вернуть из копии, если данные испортятся:  db-backup.bat /restore
goto End

REM ===========================================================================
:Restore
echo === SuperApp: восстановление базы из копии ===
echo.

if not exist "%BKDIR%" goto NoBackups

set "LATEST="
for /f "delims=" %%f in ('dir /b /a-d /o-d "%BKDIR%\superapp-*.db" 2^>nul') do (
  if not defined LATEST set "LATEST=%BKDIR%\%%f"
)
if not defined LATEST goto NoBackups

echo Самая свежая копия: %LATEST%
echo Будет заменена база:  %DB%
echo.
set "ANS="
set /p "ANS=Продолжить? [y/N] "
if /I "%ANS%"=="y" goto DoRestore
echo Отменено - ничего не менялось.
goto End

:DoRestore
if not exist "%DBDIR%" mkdir "%DBDIR%"

if exist "%DB%" (
  copy /y "%DB%" "%DB%.before-restore" >nul
  echo Текущая база сохранена как: %DB%.before-restore
)

copy /y "%LATEST%" "%DB%" >nul
if errorlevel 1 goto CopyFail

for %%e in (wal shm journal) do (
  if exist "%LATEST%-%%e" (
    copy /y "%LATEST%-%%e" "%DB%-%%e" >nul
  ) else (
    if exist "%DB%-%%e" del /q "%DB%-%%e"
  )
)

echo.
echo Готово. Теперь запустите сервер: SuperApp-Start.bat
goto End

:NoBackups
echo [!] Копий не найдено в "%BKDIR%".
echo     Сначала сделайте копию:  db-backup.bat
goto End

:CopyFail
echo.
echo [!] Не удалось скопировать файл. Возможные причины: нет прав,
echo     база занята другой программой или диск недоступен.
goto End

:Help
echo SuperApp db-backup - резервная копия живой базы данных.
echo.
echo   db-backup.bat            сделать копию в installer\backups\
echo   db-backup.bat /restore   восстановить базу из самой свежей копии
echo.
echo Каталог базы: %DB%
goto End

:End
endlocal
