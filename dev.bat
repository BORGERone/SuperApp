@echo off
cd /d "%~dp0"
echo Starting SuperApp in development mode...
echo Current directory: %CD%
echo.

echo Starting server...
echo Checking if port 3002 is in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill /PID %%~5 /F >nul 2>&1
)
echo Port 3002 cleared (if it was in use).
start "SuperApp Server" cmd /k "cd packages/server && bun run dev"

echo Starting client with Electron...
start "SuperApp Client" cmd /k "cd packages/client && bun run electron:dev"

echo.
echo Both processes started in separate windows.
echo Close those windows to stop the application.
pause
