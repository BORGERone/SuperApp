@echo off
REM ===========================================================================
REM  SuperApp - start everything with ONE double click.
REM
REM  Replaces the two clicks in SuperApp-Setup.bat:
REM      "Zapustit server (Bun)"  +  "Zapustit HTTPS (Caddy)"
REM
REM  What it does (details live in superapp-start.ps1):
REM     1) checks Bun, packages\server\.env (JWT_SECRET) and the built web client;
REM     2) starts the Bun backend on 127.0.0.1:3002;
REM     3) writes Caddyfile.local and starts Caddy (HTTPS, ports 8080/8443 -> 3002).
REM
REM  Everything runs in THIS window: the output of both processes is printed
REM  here, and Ctrl+C (or closing the window) stops both of them.
REM
REM  Stop    : Ctrl+C in this window (or just close it).
REM  Help    : SuperApp-Start.bat /help
REM  Examples: SuperApp-Start.bat /restart
REM            SuperApp-Start.bat /window          (two separate windows, as before)
REM            SuperApp-Start.bat /open            (also open the site in a browser)
REM            SuperApp-Start.bat /nocaddy         (only the Bun backend)
REM            SuperApp-Start.bat /domain example.com /port 3002 /https-port 8443
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"
title SuperApp

if not exist "%~dp0superapp-start.ps1" (echo [!] superapp-start.ps1 not found next to this .bat - the installer folder is incomplete. & echo. & pause & exit /b 1)

where powershell.exe >nul 2>&1
if errorlevel 1 (echo [!] Windows PowerShell not found. It is required (Windows 10/11). & echo. & pause & exit /b 1)

REM Want two separate windows (the old behaviour) on every double click?
REM Add  /window  after  %ARGS%  on the powershell.exe line below.
set "ARGS=%*"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0superapp-start.ps1" %ARGS%
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (echo. & echo [!] SuperApp start failed with code %RC%. See the messages above. & echo. & pause)

endlocal & exit /b %RC%
