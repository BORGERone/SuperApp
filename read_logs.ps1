# Скрипт для чтения логов в реальном времени
Write-Host "Наблюдение за логами почтового API..." -ForegroundColor Green

# Читаем debug.log
Get-Content "e:\Project\SuperApp\packages\server\debug.log" -Wait -Tail 5 | ForEach-Object {
    Write-Host "SERVER: $_" -ForegroundColor Cyan
}

# В отдельном окне читаем консоль браузера (если есть)
# Write-Host "Откройте консоль разработчика в браузере (F12) для просмотра клиентских логов" -ForegroundColor Yellow
