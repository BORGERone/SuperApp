@echo off
echo Поиск клиентских логов...
echo.

:: Проверяем различные пути к localStorage
set "paths[0]=%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb"
set "paths[1]=%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb"
set "paths[2]=%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb"
set "paths[3]=%USERPROFILE%\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb"

for /L %%i in (0,1,2,3) do (
    if exist "!paths[%%i]!" (
        echo Найден путь: !paths[%%i]!
        echo.
        echo Ищем файлы с логами...
        dir "!paths[%%i]!\*client-debug*" /b /s 2>nul
        if !errorlevel! equ 0 (
            echo Найдены файлы логов:
            dir "!paths[%%i]!\*client-debug*" /b /s
            echo.
            echo Попытка извлечь логи...
            echo Если логи зашифрованы, используйте консоль браузера F12
            echo.
        )
    )
)

echo.
echo Логи не найдены в файловой системе.
echo.
echo Альтернативные способы просмотра логов:
echo 1. Откройте приложение в браузере
echo 2. Нажмите F12 для открытия консоли разработчика
echo 3. Выполните команду: JSON.parse(localStorage.getItem('client-debug.log') ^|^| '[]'^)
echo.
pause
