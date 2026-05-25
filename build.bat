@echo off
cd /d "%~dp0"
echo Building SuperApp...
echo Current directory: %CD%
echo.

echo Step 1: Building client...
bun run build
if errorlevel 1 (
    echo Client build failed!
    pause
    exit /b 1
)
echo Client build completed.
echo.

echo Step 2: Building Electron application...
cd packages/client
bun run electron:build
if errorlevel 1 (
    echo Electron build failed!
    pause
    exit /b 1
)
cd ../..
echo Electron build completed.
echo.

echo Step 3: Building server...
cd packages/server
bun run build
if errorlevel 1 (
    echo Server build failed!
    pause
    exit /b 1
)
cd ../..
echo Server build completed.
echo.

echo ========================================
echo Build completed successfully!
echo Client: packages/client/dist-electron/
echo Server: packages/server/dist/
echo ========================================
pause
