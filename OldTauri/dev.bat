@echo off
cd /d "%~dp0"
echo Starting SuperApp in development mode...
echo Current directory: %CD%
echo.
npm run tauri dev
echo.
echo Process finished. Press any key to close...
pause
