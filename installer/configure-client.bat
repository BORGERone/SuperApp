@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo === SuperApp: nastroyka KLIENTA (config.json) ===
echo.

where node >nul 2>&1 && (
  node configure-client.mjs %*
  goto :done
)
where bun >nul 2>&1 && (
  bun configure-client.mjs %*
  goto :done
)
echo [OSHIBKA] Ne nayden ni node, ni bun. Ustanovite Bun:
echo   powershell -c "irm bun.sh/install.ps1 ^| iex"

:done
pause
endlocal
