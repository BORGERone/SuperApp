@echo off
echo Building SuperApp Client installer...
cd packages\client
call bun run electron:build
cd ..
echo Build complete! Installer is in packages\client\dist-electron\
pause
