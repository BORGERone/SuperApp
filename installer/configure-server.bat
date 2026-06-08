@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo === SuperApp: nastroyka SERVERA (.env) ===
echo.

where node >nul 2>&1 && (
  node configure-server.mjs %*
  goto :done
)
where bun >nul 2>&1 && (
  bun configure-server.mjs %*
  goto :done
)
echo [OSHIBKA] Ne nayden ni node, ni bun. Ustanovite Bun:
echo   powershell -c "irm bun.sh/install.ps1 ^| iex"

:done
pause
endlocal
