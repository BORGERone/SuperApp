@echo off
cd /d "%~dp0"
echo Starting SuperApp Server...
echo Current directory: %CD%
echo.
cd packages/server
bun run src/server.ts
echo.
echo Process finished. Press any key to close...
pause
