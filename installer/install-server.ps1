#!/usr/bin/env pwsh
# Установщик СЕРВЕРА SuperApp (Windows / PowerShell).
#
#   ./installer/install-server.ps1            # интерактивная настройка
#   ./installer/install-server.ps1 -Defaults  # без вопросов (обновление)
#
# Шаги: проверка Bun -> установка зависимостей -> интерактивная конфигурация
# (.env + генерация JWT_SECRET) -> подсказки по запуску.

[CmdletBinding()]
param(
  [switch]$Defaults,
  [switch]$RegenerateSecret
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')
$ServerDir = Join-Path $RepoRoot 'packages/server'

Write-Host '=== SuperApp: установка сервера ===' -ForegroundColor Cyan

# 1) Проверяем рантайм Bun.
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host 'X Не найден Bun (рантайм сервера).' -ForegroundColor Red
  Write-Host '  Установите: powershell -c "irm bun.sh/install.ps1 | iex"'
  exit 1
}
Write-Host ("OK Bun: " + (bun --version))

# Чем запускать конфигуратор (.mjs): node, иначе bun.
$Runner = if (Get-Command node -ErrorAction SilentlyContinue) { 'node' } else { 'bun' }

# 2) Устанавливаем зависимости.
Write-Host '-> Установка зависимостей (bun install)...'
Push-Location $RepoRoot
try { bun install } finally { Pop-Location }

# 3) Интерактивная конфигурация (.env).
Write-Host '-> Конфигурация сервера...'
$cfgArgs = @((Join-Path $ScriptDir 'configure-server.mjs'))
if ($Defaults) { $cfgArgs += '--defaults' }
if ($RegenerateSecret) { $cfgArgs += '--regenerate-secret' }
& $Runner @cfgArgs
if ($LASTEXITCODE -ne 0) { throw "Конфигуратор завершился с ошибкой ($LASTEXITCODE)." }

Write-Host ''
Write-Host '=== Готово. Сервер настроен. ===' -ForegroundColor Green
Write-Host 'Запуск вручную:'
Write-Host ("    cd `"$ServerDir`"; bun run src/server.ts")
Write-Host ''
Write-Host 'Запуск как службы Windows (рекомендуется NSSM):'
Write-Host '    nssm install SuperAppServer "<путь к bun.exe>" "run src/server.ts"'
Write-Host ("    nssm set SuperAppServer AppDirectory `"$ServerDir`"")
Write-Host '    nssm start SuperAppServer'
Write-Host 'Безопасность: публикуйте сервер за reverse-proxy (IIS/nginx) с TLS,'
Write-Host 'ограничьте порт в брандмауэре, ограничьте доступ к .env через NTFS-ACL.'
