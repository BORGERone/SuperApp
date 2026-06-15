@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

echo ============================================================
echo   SuperApp - sborka ustanovshchika klienta (.exe, NSIS)
echo ============================================================
echo.
echo Adres servera "zapekaetsya" v ustanovshchik, chtoby na
echo kazhdoy mashine (vkl. Win7) ne pravit config.json vruchnuyu.
echo.
echo Po umolchaniyu: https://prostroykrym.ru (Enter = ostavit).
echo Vvedite drugoy adres, libo "none" chtoby NE zapekat (adres
echo budet zadavatsya cherez config.json na kazhdoy mashine).
echo.
set "APIURL=https://prostroykrym.ru"
set /p "APIURL=Adres servera [%APIURL%]: "

if /I "%APIURL%"=="none" goto :nobake

echo.
echo Adres servera: %APIURL%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install-client.ps1" -Package -ApiUrl "%APIURL%"
set "RC=%ERRORLEVEL%"
goto :done

:nobake
echo.
echo Adres NE zapekaetsya (config.json na klientah).
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install-client.ps1" -Package
set "RC=%ERRORLEVEL%"
goto :done

:done
echo.
if not "%RC%"=="0" goto :failed
echo Gotovo! Ustanovshchik lezhit v: packages\client\dist-electron\
echo.
pause
endlocal
exit /b 0

:failed
echo [OSHIBKA] Sborka ustanovshchika ne udalas (kod %RC%). Smotrite soobshcheniya vyshe.
echo.
pause
endlocal
exit /b 1
