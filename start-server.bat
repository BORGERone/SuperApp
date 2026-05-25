@echo off
cd /d "%~dp0"
echo Starting SuperApp Server...
echo Current directory: %CD%
echo.

echo Copying .env to server dist folder...
copy .env packages\server\dist\.env >nul
echo .env copied.
echo.

echo Checking if port 3002 is in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Port 3002 cleared (if it was in use).
timeout /t 2 /nobreak >nul
echo.

cd packages/server
set JWT_SECRET=super_secret_key_at_least_32_characters_long
set SEED_TEST_USERS=true
set SEED_ADMIN_PASSWORD=123123123
set SEED_ADMIN_PIN=1111
set SEED_USER_PASSWORD=user123
set SEED_USER_PIN=2222
bun run dist/server.js
