#!/usr/bin/env pwsh
# Установщик КЛИЕНТА SuperApp (Windows / PowerShell).
#
#   ./installer/install-client.ps1             # интерактивная настройка + сборка
#   ./installer/install-client.ps1 -Defaults   # без вопросов (обновление)
#   ./installer/install-client.ps1 -NoBuild    # только записать config.json
#   ./installer/install-client.ps1 -Package    # собрать установщик Electron (NSIS)
#
# Шаги: проверка Bun -> установка зависимостей -> интерактивная конфигурация
# (config.json с адресом сервера) -> сборка (vite / electron-builder).

[CmdletBinding()]
param(
  [switch]$Defaults,
  [switch]$NoBuild,
  [switch]$Package
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')
$ClientDir = Join-Path $RepoRoot 'packages/client'

Write-Host '=== SuperApp: установка клиента ===' -ForegroundColor Cyan

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host 'X Не найден Bun.' -ForegroundColor Red
  Write-Host '  Установите: powershell -c "irm bun.sh/install.ps1 | iex"'
  exit 1
}
Write-Host ("OK Bun: " + (bun --version))

$Runner = if (Get-Command node -ErrorAction SilentlyContinue) { 'node' } else { 'bun' }

Write-Host '-> Установка зависимостей (bun install)...'
Push-Location $RepoRoot
try { bun install } finally { Pop-Location }

Write-Host '-> Конфигурация клиента (адрес сервера)...'
$cfgArgs = @((Join-Path $ScriptDir 'configure-client.mjs'))
if ($Defaults) { $cfgArgs += '--defaults' }
& $Runner @cfgArgs
if ($LASTEXITCODE -ne 0) { throw "Конфигуратор завершился с ошибкой ($LASTEXITCODE)." }

if (-not $NoBuild) {
  Push-Location $ClientDir
  try {
    if ($Package) {
      Write-Host '-> Сборка установщика Electron (electron-builder, NSIS)...'
      bun run electron:build
      Write-Host ("OK Установщик готов: " + (Join-Path $ClientDir 'dist-electron'))
      Write-Host '   ВАЖНО: положите config.json рядом с установленным .exe'
      Write-Host '   (или задайте сервер через переменную окружения SUPERAPP_API_URL).'
    } else {
      Write-Host '-> Сборка веб-бандла (vite build)...'
      bun run build
      Write-Host ("OK Сборка готова: " + (Join-Path $ClientDir 'dist'))
    }
  } finally { Pop-Location }
}

Write-Host ''
Write-Host '=== Готово. Клиент настроен на подключение к серверу из config.json. ===' -ForegroundColor Green
