@echo off
REM ===========================================================================
REM  SuperApp - start everything with ONE double click.
REM
REM  Replaces the two clicks in SuperApp-Setup.bat:
REM      "Zapustit server (Bun)"  +  "Zapustit HTTPS (Caddy)"
REM
REM  The real work lives in superapp-start.ps1 (same folder). This launcher
REM  only calls it, shows the exit code, keeps the window open at the end
REM  (so an error can never flash by) and writes a trace to
REM  installer\SuperApp-Start.log
REM
REM  Stop    : Ctrl+C in this window (or just close it)
REM  Help    : SuperApp-Start.bat /help
REM  Diag    : SuperApp-Start.bat /diag        (check environment, start nothing)
REM  Examples: SuperApp-Start.bat /restart
REM            SuperApp-Start.bat /window      (two separate windows, as before)
REM            SuperApp-Start.bat /open        (also open the site in a browser)
REM            SuperApp-Start.bat /nocaddy     (only the Bun backend)
REM ===========================================================================
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title SuperApp

set "LOG=%~dp0SuperApp-Start.log"
set "PS1=%~dp0superapp-start.ps1"
set "RC=0"

echo ==========================================================================
echo    SuperApp - start server (Bun) + HTTPS (Caddy)
echo    Folder : %~dp0
echo    Log    : %LOG%
echo ==========================================================================
echo.
>>"%LOG%" echo.
>>"%LOG%" echo ==== %DATE% %TIME%  SuperApp-Start.bat  args: %*

if not exist "%PS1%" goto NoPs1

REM --- which PowerShell to use -------------------------------------------
set "PSEXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%PSEXE%" goto HavePs
set "PSEXE=powershell.exe"
where powershell.exe >nul 2>&1
if not errorlevel 1 goto HavePs
set "PSEXE=pwsh.exe"
where pwsh.exe >nul 2>&1
if not errorlevel 1 goto HavePs
goto NoPs

:HavePs
echo Starting: %PSEXE% -File superapp-start.ps1 %*
echo.
>>"%LOG%" echo Starting: "%PSEXE%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*

"%PSEXE%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
set "RC=%ERRORLEVEL%"
>>"%LOG%" echo PowerShell exit code: %RC%

echo.
echo --------------------------------------------------------------------------
echo  PowerShell exit code: %RC%
echo  Log: %LOG%
echo --------------------------------------------------------------------------
goto Pause_

:NoPs1
set "RC=1"
echo [!] Not found: %PS1%
echo     This .bat must sit in the SAME folder as superapp-start.ps1
echo     (the installer\ folder inside the SuperApp repo). Run there:  git pull
>>"%LOG%" echo ERROR: not found: %PS1%
goto Pause_

:NoPs
set "RC=1"
echo [!] Neither Windows PowerShell nor PowerShell 7 was found on this computer.
echo     It is required to start SuperApp (Windows 10/11 ships with PowerShell 5.1).
>>"%LOG%" echo ERROR: PowerShell not found

:Pause_
echo.
echo Press any key to close this window ...
pause >nul
exit /b %RC%
