@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================================
echo   SuperApp - sborka ustanovshchika klienta (.exe, NSIS)
echo ============================================================
echo.
echo Mozhno "zapech" adres servera v ustanovshchik, chtoby na
echo kazhdoy mashine (vkl. Win7) ne pravit config.json vruchnuyu.
echo Ostavte pustym, chtoby adres zadavalsya cherez config.json.
echo.
set "APIURL="
set /p APIURL=Adres servera (naprimer http://192.168.1.10:3002), Enter = propustit: 

if "%APIURL%"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install-client.ps1" -Package
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install-client.ps1" -Package -ApiUrl "%APIURL%"
)

if errorlevel 1 (
  echo.
  echo [OSHIBKA] Sborka ustanovshchika ne udalas. Smotrite soobshcheniya vyshe.
  pause
  exit /b 1
)

echo.
echo Gotovo! Ustanovshchik lezhit v: packages\client\dist-electron\
pause
endlocal
