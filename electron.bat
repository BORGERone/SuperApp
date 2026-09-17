@echo off
cd /d "%~dp0"
echo Starting SuperApp Electron in development mode...
echo Current directory: %CD%
echo.
cd packages/client
bun run electron:dev
echo.
echo Process finished. Press any key to close...
pause
