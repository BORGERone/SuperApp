#!/usr/bin/env pwsh
# Установщик/сборщик КЛИЕНТА SuperApp (Windows / PowerShell).
#
# Два режима:
#   1) Настройка машины-клиента (config.json + сборка веб-бандла):
#        ./installer/install-client.ps1            # интерактивно
#        ./installer/install-client.ps1 -Defaults  # без вопросов (обновление)
#        ./installer/install-client.ps1 -NoBuild   # только записать config.json
#   2) Сборка распространяемого установщика .exe (electron-builder, NSIS):
#        ./installer/install-client.ps1 -Package
#        ./installer/install-client.ps1 -Package -ApiUrl http://192.168.1.10:3002
#      -ApiUrl «запекает» адрес сервера в сборку (VITE_API_URL) — удобно для
#      массовой раздачи на Win7/10/11 без правки config.json на каждой машине.

[CmdletBinding()]
param(
  [switch]$Defaults,
  [switch]$NoBuild,
  [switch]$Package,
  [string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')
$ClientDir = Join-Path $RepoRoot 'packages/client'

Write-Host '=== SuperApp: клиент ===' -ForegroundColor Cyan

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

if ($Package) {
  # Сборка распространяемого установщика .exe.

  # electron-builder обязателен для сборки .exe. На «перенесённых» node_modules
  # обычный `bun install` иногда считает дерево готовым и не доустанавливает его —
  # тогда сборка молча падает и .exe не появляется. Проверяем и при отсутствии
  # чиним node_modules (`bun install --force`).
  $bunDir = Join-Path $RepoRoot 'node_modules\.bun'
  $ebPresent = $false
  if (Test-Path $bunDir) {
    $ebPresent = @(Get-ChildItem -Path $bunDir -Filter 'electron-builder@*' -Directory -ErrorAction SilentlyContinue).Count -gt 0
  }
  if (-not $ebPresent) {
    Write-Host '-> electron-builder не найден в node_modules. Восстанавливаю зависимости (bun install --force)...' -ForegroundColor Yellow
    Push-Location $RepoRoot
    try { bun install --force } finally { Pop-Location }
  }

  if ($ApiUrl) {
    $env:VITE_API_URL = $ApiUrl
    Write-Host ("-> Адрес сервера запекается в сборку: " + $ApiUrl)
  } else {
    Write-Host '-> Адрес сервера НЕ запекается; задайте его на клиенте через'
    Write-Host '   config.json рядом с .exe или переменную SUPERAPP_API_URL.'
  }
  $OutDir = Join-Path $ClientDir 'dist-electron'

  # Запущенный SuperApp.exe держит файлы в win-unpacked (напр. d3dcompiler_47.dll),
  # из-за чего electron-builder не может очистить каталог и падает с
  # "Access is denied". Перед сборкой закрываем приложение и чистим dist-electron.
  $running = Get-Process -Name 'SuperApp' -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host '-> Закрываю запущенный SuperApp перед сборкой...' -ForegroundColor Yellow
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  }
  if (Test-Path $OutDir) {
    Write-Host '-> Очищаю предыдущую сборку (dist-electron)...'
    for ($i = 0; $i -lt 3; $i++) {
      try { Remove-Item -Recurse -Force $OutDir -ErrorAction Stop; break }
      catch { Start-Sleep -Milliseconds 700 }
    }
  }

  Push-Location $ClientDir
  try {
    Write-Host '-> Сборка установщика Electron (NSIS)...'
    bun run electron:build
    if ($LASTEXITCODE -ne 0) { throw "electron-builder завершился с ошибкой ($LASTEXITCODE)." }
  } finally {
    Pop-Location
    if ($ApiUrl) { Remove-Item Env:\VITE_API_URL -ErrorAction SilentlyContinue }
  }

  $exe = Get-ChildItem -Path $OutDir -Filter '*.exe' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $exe) { throw "Сборка завершилась, но .exe не найден в $OutDir." }
  Write-Host ''
  Write-Host ("=== Готово. Установщик: " + $exe.FullName + " ===") -ForegroundColor Green
  return
}

# Режим настройки машины-клиента.
Write-Host '-> Конфигурация клиента (адрес сервера)...'
$cfgArgs = @((Join-Path $ScriptDir 'configure-client.mjs'))
if ($Defaults) { $cfgArgs += '--defaults' }
& $Runner @cfgArgs
if ($LASTEXITCODE -ne 0) { throw "Конфигуратор завершился с ошибкой ($LASTEXITCODE)." }

if (-not $NoBuild) {
  Push-Location $ClientDir
  try {
    Write-Host '-> Сборка веб-бандла (vite build)...'
    bun run build
    Write-Host ("OK Сборка готова: " + (Join-Path $ClientDir 'dist'))
  } finally { Pop-Location }
}

Write-Host ''
Write-Host '=== Готово. Клиент настроен на подключение к серверу из config.json. ===' -ForegroundColor Green
