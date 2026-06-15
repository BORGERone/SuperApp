#requires -version 5.1
<#
  SuperApp - единый графический настройщик (Windows).
  Объединяет всё, что раньше было в отдельных батниках:
    - configure-server.bat / .mjs   (packages\server\.env)
    - configure-client.bat / .mjs   (packages\client\config.json)
    - setup-client.bat              (bun install + сборка веб-клиента)
    - start-server.bat              (запуск Bun на 127.0.0.1:3002)
    - setup-https.bat               (Caddy: HTTPS для prostroykrym.ru)
    - reset-admin.bat / .mjs        (сброс пароля и PIN админа)

  Все поля предзаполнены значениями, которые сейчас работают на сервере.
  Запуск: двойной клик по SuperApp-Setup.bat (он зовёт этот скрипт в STA-режиме).
#>

Set-StrictMode -Off
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# --- Пути -------------------------------------------------------------------
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = (Resolve-Path (Join-Path $ScriptDir '..')).Path
$ServerDir  = Join-Path $RepoRoot 'packages\server'
$ClientDir  = Join-Path $RepoRoot 'packages\client'
$EnvPath    = Join-Path $ServerDir '.env'
$ConfigPath = Join-Path $ClientDir 'config.json'
$DistDir    = Join-Path $ClientDir 'dist'

# --- Значения по умолчанию (рабочая конфигурация сервера) -------------------
$DEF_SRV_HOST = '127.0.0.1'
$DEF_SRV_PORT = '3002'
$DEF_NODE_ENV = 'production'

$DEF_CLI_PROTO = 'https'
$DEF_CLI_HOST  = 'prostroykrym.ru'
$DEF_CLI_PORT  = '443'

$DEF_DOMAIN     = 'prostroykrym.ru'
$DEF_HTTP_PORT  = '8080'
$DEF_HTTPS_PORT = '8443'
$DEF_BACKEND    = '3002'

$DEF_ADMIN_LOGIN = 'admin'
$DEF_ADMIN_PASS  = 'admin123'
$DEF_ADMIN_PIN   = '1234'

# --- Утилиты ----------------------------------------------------------------
function Get-BunDir {
  $cmd = Get-Command bun -ErrorAction SilentlyContinue
  if ($cmd) { return (Split-Path -Parent $cmd.Source) }
  $local = Join-Path $env:USERPROFILE '.bun\bin'
  if (Test-Path (Join-Path $local 'bun.exe')) { return $local }
  return $null
}

function Test-Bun {
  if (Get-BunDir) { return $true }
  [System.Windows.Forms.MessageBox]::Show(
    "Не найден Bun. Установите его в PowerShell:`r`n`r`n  irm bun.sh/install.ps1 | iex",
    'Bun не найден', 'OK', 'Warning') | Out-Null
  return $false
}

function New-JwtSecret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ([Convert]::ToBase64String($bytes)) -replace '\+','-' -replace '/','_' -replace '=',''
}

function Read-ExistingEnv {
  $map = @{}
  if (Test-Path $EnvPath) {
    foreach ($line in (Get-Content -LiteralPath $EnvPath -Encoding UTF8)) {
      $t = $line.Trim()
      if (-not $t -or $t.StartsWith('#')) { continue }
      $i = $t.IndexOf('=')
      if ($i -lt 1) { continue }
      $map[$t.Substring(0,$i).Trim()] = $t.Substring($i+1).Trim()
    }
  }
  return $map
}

# Запустить долгую команду в отдельном окне cmd (как раньше батники).
function Start-Console {
  param([string]$Title, [string]$Command, [string]$WorkDir)
  $bun = Get-BunDir
  $parts = @()
  $parts += "title $Title"
  if ($bun) { $parts += "set `"PATH=$bun;%PATH%`"" }
  $parts += "chcp 65001 >nul"
  $parts += "cd /d `"$WorkDir`""
  $parts += $Command
  $full = ($parts -join ' && ')
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $full) | Out-Null
}

# --- Действия ---------------------------------------------------------------
function Save-ServerEnv {
  $existing = Read-ExistingEnv
  $jwt = $existing['JWT_SECRET']
  if ($cbRegenJwt.Checked -or [string]::IsNullOrWhiteSpace($jwt) -or $jwt.Length -lt 16 -or $jwt -eq 'superapp-secret-key') {
    $jwt = New-JwtSecret
  }
  $maxBody = $existing['MAX_BODY_BYTES']; if ([string]::IsNullOrWhiteSpace($maxBody)) { $maxBody = '524288000' }
  $cors    = $existing['CORS_ORIGINS'];   if ($null -eq $cors) { $cors = '' }

  $lines = @(
    '# Сгенерировано SuperApp-Setup. Не коммитить!',
    ('# Обновлено: ' + (Get-Date).ToString('o')),
    ('PORT=' + $tbSrvPort.Text.Trim()),
    ('HOST=' + $tbSrvHost.Text.Trim()),
    ('JWT_SECRET=' + $jwt),
    ('NODE_ENV=' + $tbNodeEnv.Text.Trim()),
    ('CORS_ORIGINS=' + $cors),
    ('MAX_BODY_BYTES=' + $maxBody),
    ''
  )
  [System.IO.File]::WriteAllText($EnvPath, ($lines -join "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  $cbRegenJwt.Checked = $false
  Write-Log ("Записан .env -> " + $EnvPath + "  (PORT=" + $tbSrvPort.Text.Trim() + ", HOST=" + $tbSrvHost.Text.Trim() + ")")
}

function Get-ClientApiBase {
  $proto = $cbProto.Text.Trim().ToLower()
  if ($proto -ne 'http' -and $proto -ne 'https') { $proto = 'https' }
  $h = $tbCliHost.Text.Trim()
  $p = [int]$tbCliPort.Text.Trim()
  if (($proto -eq 'https' -and $p -eq 443) -or ($proto -eq 'http' -and $p -eq 80)) {
    return "$proto`://$h"
  }
  return "$proto`://$h`:$p"
}

function Save-ClientConfig {
  $proto = $cbProto.Text.Trim().ToLower()
  if ($proto -ne 'http' -and $proto -ne 'https') { $proto = 'https' }
  $h = $tbCliHost.Text.Trim()
  $p = [int]$tbCliPort.Text.Trim()
  $apiBase = Get-ClientApiBase
  $obj = [ordered]@{
    apiBaseUrl = $apiBase
    protocol   = $proto
    serverHost = $h
    serverPort = $p
    updatedAt  = (Get-Date).ToString('o')
  }
  $json = ($obj | ConvertTo-Json) + "`r`n"
  [System.IO.File]::WriteAllText($ConfigPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  Write-Log ("Записан config.json -> " + $ConfigPath + "  (Сервер: " + $apiBase + ")")
}

function Invoke-InstallBuild {
  if (-not (Test-Bun)) { return }
  $cmd = 'bun install && cd packages\client && bun run build -- --base=/ && echo. && echo === Сборка завершена. Это окно можно закрыть. ==='
  Start-Console -Title 'SuperApp: установка и сборка' -Command $cmd -WorkDir $RepoRoot
  Write-Log 'Запущена установка зависимостей и сборка веб-клиента (отдельное окно).'
}

function Start-ServerProc {
  if (-not (Test-Bun)) { return }
  $h = $tbSrvHost.Text.Trim(); $p = $tbSrvPort.Text.Trim()
  $cmd = "set `"HOST=$h`" && set `"PORT=$p`" && echo Запуск Bun на $h`:$p ... && echo (окно не закрывать; остановка Ctrl+C) && echo. && bun run src\server.ts"
  Start-Console -Title "SuperApp server $h`:$p" -Command $cmd -WorkDir $ServerDir
  Write-Log ("Запущен Bun-сервер на " + $h + ":" + $p + " (отдельное окно — не закрывать).")
}

function Build-DesktopExe {
  if (-not (Test-Bun)) { return }
  $ps1 = Join-Path $ScriptDir 'install-client.ps1'
  if (-not (Test-Path $ps1)) {
    [System.Windows.Forms.MessageBox]::Show(
      "Не найден скрипт сборки:`r`n$ps1",
      'Нет install-client.ps1', 'OK', 'Warning') | Out-Null
    return
  }
  $api = Get-ClientApiBase
  $cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$ps1`" -Package -ApiUrl `"$api`""
  Start-Console -Title 'SuperApp: сборка desktop .exe' -Command $cmd -WorkDir $RepoRoot
  Write-Log ("Запущена сборка desktop-приложения (.exe). Адрес сервера запекается: " + $api + ". Готовый файл — в packages\client\dist-electron\ (первый запуск долгий: скачивает Electron ~97 МБ).")
}

function Build-Caddyfile {
  $dist = $tbDist.Text.Trim()
  if (-not (Test-Path $dist)) {
    [System.Windows.Forms.MessageBox]::Show(
      "Каталог dist не найден:`r`n$dist`r`n`r`nСначала соберите веб-клиент (кнопка «Установить зависимости и собрать клиент»).",
      'Нет каталога dist', 'OK', 'Warning') | Out-Null
    return $null
  }
  $distFwd = (Resolve-Path -LiteralPath $dist).Path -replace '\\','/'
  $domain  = $tbDomain.Text.Trim()
  $hp      = $tbHttpPort.Text.Trim()
  $hsp     = $tbHttpsPort.Text.Trim()
  $be      = $tbBackend.Text.Trim()
  $nl = "`r`n"
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('# Сгенерировано SuperApp-Setup.' + $nl)
  [void]$sb.Append('{' + $nl)
  [void]$sb.Append('    http_port ' + $hp + $nl)
  [void]$sb.Append('    https_port ' + $hsp + $nl)
  [void]$sb.Append('    auto_https disable_redirects' + $nl)
  [void]$sb.Append('}' + $nl + $nl)
  [void]$sb.Append($domain + ' {' + $nl)
  [void]$sb.Append('    encode zstd gzip' + $nl)
  [void]$sb.Append('    handle /api/* {' + $nl)
  [void]$sb.Append('        reverse_proxy 127.0.0.1:' + $be + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('    handle /uploads/* {' + $nl)
  [void]$sb.Append('        reverse_proxy 127.0.0.1:' + $be + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('    handle {' + $nl)
  [void]$sb.Append('        root * "' + $distFwd + '"' + $nl)
  [void]$sb.Append('        try_files {path} /index.html' + $nl)
  [void]$sb.Append('        file_server' + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('}' + $nl)
  $out = Join-Path $ScriptDir 'Caddyfile.local'
  [System.IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  return $out
}

function Ensure-Caddy {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd) { return 'caddy' }
  $local = Join-Path $ScriptDir 'caddy.exe'
  if (Test-Path $local) { return $local }
  Write-Log 'Caddy не найден, скачиваю caddy.exe ...'
  try {
    Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile $local
    Write-Log 'caddy.exe загружен.'
    return $local
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Не удалось скачать Caddy:`r`n$($_.Exception.Message)", 'Ошибка', 'OK', 'Error') | Out-Null
    return $null
  }
}

function Start-Https {
  $caddyfile = Build-Caddyfile
  if (-not $caddyfile) { return }
  $caddy = Ensure-Caddy
  if (-not $caddy) { return }
  $cmd = "`"$caddy`" run --config `"$caddyfile`""
  Start-Console -Title "SuperApp HTTPS (Caddy)" -Command $cmd -WorkDir $ScriptDir
  Write-Log ("Запущен Caddy (домен " + $tbDomain.Text.Trim() + ", порты " + $tbHttpPort.Text.Trim() + "/" + $tbHttpsPort.Text.Trim() + " -> backend 127.0.0.1:" + $tbBackend.Text.Trim() + ").")
}

function Reset-Admin {
  if (-not (Test-Bun)) { return }
  $login = $tbAdmLogin.Text.Trim()
  $pass  = $tbAdmPass.Text
  $pin   = $tbAdmPin.Text.Trim()
  if (-not $login -or -not $pass -or -not $pin) {
    [System.Windows.Forms.MessageBox]::Show('Заполните логин, пароль и PIN.', 'Сброс админа', 'OK', 'Warning') | Out-Null
    return
  }
  $cmd = "bun scripts\reset-admin.mjs `"$login`" `"$pass`" `"$pin`" && echo. && echo === Готово. Это окно можно закрыть. ==="
  Start-Console -Title 'SuperApp: сброс админа' -Command $cmd -WorkDir $ServerDir
  Write-Log ("Запущен сброс пароля/PIN для логина '" + $login + "' (отдельное окно).")
}

function Invoke-FullInstall {
  Save-ServerEnv
  Save-ClientConfig
  Invoke-InstallBuild
  Write-Log 'Полная установка: .env и config.json записаны, запущена сборка. После сборки нажмите «Запустить сервер» и «Запустить HTTPS».'
}

# --- Построение формы -------------------------------------------------------
$font = New-Object System.Drawing.Font('Segoe UI', 9)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'SuperApp — настройка и установка'
$form.Size = New-Object System.Drawing.Size(660, 748)
$form.StartPosition = 'CenterScreen'
$form.Font = $font
$form.AutoScroll = $true

function New-Label([string]$text, [int]$x, [int]$y, [int]$w = 150) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text; $l.Location = New-Object System.Drawing.Point($x, $y)
  $l.Size = New-Object System.Drawing.Size($w, 22)
  return $l
}
function New-Text([string]$val, [int]$x, [int]$y, [int]$w = 220) {
  $t = New-Object System.Windows.Forms.TextBox
  $t.Text = $val; $t.Location = New-Object System.Drawing.Point($x, $y)
  $t.Size = New-Object System.Drawing.Size($w, 22)
  return $t
}
function New-Button([string]$text, [int]$x, [int]$y, [int]$w, [scriptblock]$onClick) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $text; $b.Location = New-Object System.Drawing.Point($x, $y)
  $b.Size = New-Object System.Drawing.Size($w, 30)
  $b.Add_Click($onClick)
  return $b
}

# Группа: Сервер (.env)
$gbSrv = New-Object System.Windows.Forms.GroupBox
$gbSrv.Text = '1. Сервер (.env)'
$gbSrv.Location = New-Object System.Drawing.Point(12, 8)
$gbSrv.Size = New-Object System.Drawing.Size(620, 122)
$gbSrv.Controls.Add((New-Label 'Адрес привязки (HOST):' 15 28))
$tbSrvHost = New-Text $DEF_SRV_HOST 200 26 160; $gbSrv.Controls.Add($tbSrvHost)
$gbSrv.Controls.Add((New-Label 'Порт (PORT):' 15 56))
$tbSrvPort = New-Text $DEF_SRV_PORT 200 54 160; $gbSrv.Controls.Add($tbSrvPort)
$gbSrv.Controls.Add((New-Label 'Режим (NODE_ENV):' 15 84))
$tbNodeEnv = New-Text $DEF_NODE_ENV 200 82 160; $gbSrv.Controls.Add($tbNodeEnv)
$cbRegenJwt = New-Object System.Windows.Forms.CheckBox
$cbRegenJwt.Text = 'Перегенерировать JWT_SECRET'
$cbRegenJwt.Location = New-Object System.Drawing.Point(380, 28)
$cbRegenJwt.Size = New-Object System.Drawing.Size(230, 24)
$gbSrv.Controls.Add($cbRegenJwt)
$gbSrv.Controls.Add((New-Button 'Записать .env' 380 78 220 { Save-ServerEnv }))
$form.Controls.Add($gbSrv)

# Группа: Клиент (config.json)
$gbCli = New-Object System.Windows.Forms.GroupBox
$gbCli.Text = '2. Клиент (config.json) — адрес сервера для Electron-клиента'
$gbCli.Location = New-Object System.Drawing.Point(12, 134)
$gbCli.Size = New-Object System.Drawing.Size(620, 122)
$gbCli.Controls.Add((New-Label 'Протокол:' 15 28))
$cbProto = New-Object System.Windows.Forms.ComboBox
$cbProto.Location = New-Object System.Drawing.Point(200, 26)
$cbProto.Size = New-Object System.Drawing.Size(160, 22)
$cbProto.DropDownStyle = 'DropDownList'
[void]$cbProto.Items.Add('https'); [void]$cbProto.Items.Add('http')
$cbProto.SelectedItem = $DEF_CLI_PROTO
$gbCli.Controls.Add($cbProto)
$gbCli.Controls.Add((New-Label 'Хост / домен:' 15 56))
$tbCliHost = New-Text $DEF_CLI_HOST 200 54 160; $gbCli.Controls.Add($tbCliHost)
$gbCli.Controls.Add((New-Label 'Порт:' 15 84))
$tbCliPort = New-Text $DEF_CLI_PORT 200 82 160; $gbCli.Controls.Add($tbCliPort)
$gbCli.Controls.Add((New-Button 'Записать config.json' 380 78 220 { Save-ClientConfig }))
$form.Controls.Add($gbCli)

# Группа: Установка/сборка + запуск сервера
$gbBuild = New-Object System.Windows.Forms.GroupBox
$gbBuild.Text = '3. Установка, сборка и запуск'
$gbBuild.Location = New-Object System.Drawing.Point(12, 260)
$gbBuild.Size = New-Object System.Drawing.Size(620, 100)
$gbBuild.Controls.Add((New-Button 'Установить зависимости и собрать веб-клиент' 15 26 300 { Invoke-InstallBuild }))
$gbBuild.Controls.Add((New-Button 'Запустить сервер (Bun)' 330 26 270 { Start-ServerProc }))
$gbBuild.Controls.Add((New-Button 'Собрать desktop-приложение (.exe, NSIS)' 15 62 585 { Build-DesktopExe }))
$form.Controls.Add($gbBuild)

# Группа: HTTPS (Caddy)
$gbHttps = New-Object System.Windows.Forms.GroupBox
$gbHttps.Text = '4. HTTPS (Caddy)'
$gbHttps.Location = New-Object System.Drawing.Point(12, 364)
$gbHttps.Size = New-Object System.Drawing.Size(620, 168)
$gbHttps.Controls.Add((New-Label 'Домен:' 15 28))
$tbDomain = New-Text $DEF_DOMAIN 200 26 160; $gbHttps.Controls.Add($tbDomain)
$gbHttps.Controls.Add((New-Label 'HTTP-порт Caddy:' 15 56))
$tbHttpPort = New-Text $DEF_HTTP_PORT 200 54 160; $gbHttps.Controls.Add($tbHttpPort)
$gbHttps.Controls.Add((New-Label 'HTTPS-порт Caddy:' 15 84))
$tbHttpsPort = New-Text $DEF_HTTPS_PORT 200 82 160; $gbHttps.Controls.Add($tbHttpsPort)
$gbHttps.Controls.Add((New-Label 'Порт бэкенда (Bun):' 15 112))
$tbBackend = New-Text $DEF_BACKEND 200 110 160; $gbHttps.Controls.Add($tbBackend)
$gbHttps.Controls.Add((New-Label 'Каталог dist:' 380 28 210))
$tbDist = New-Text $DistDir 380 50 210; $gbHttps.Controls.Add($tbDist)
$gbHttps.Controls.Add((New-Button 'Запустить HTTPS (Caddy)' 380 108 210 { Start-Https }))
$form.Controls.Add($gbHttps)

# Группа: Сброс админа
$gbAdm = New-Object System.Windows.Forms.GroupBox
$gbAdm.Text = '5. Сброс пароля и PIN админа'
$gbAdm.Location = New-Object System.Drawing.Point(12, 536)
$gbAdm.Size = New-Object System.Drawing.Size(620, 66)
$gbAdm.Controls.Add((New-Label 'Логин:' 15 28 60))
$tbAdmLogin = New-Text $DEF_ADMIN_LOGIN 75 26 110; $gbAdm.Controls.Add($tbAdmLogin)
$gbAdm.Controls.Add((New-Label 'Пароль:' 200 28 55))
$tbAdmPass = New-Text $DEF_ADMIN_PASS 255 26 110; $gbAdm.Controls.Add($tbAdmPass)
$gbAdm.Controls.Add((New-Label 'PIN:' 380 28 35))
$tbAdmPin = New-Text $DEF_ADMIN_PIN 415 26 70; $gbAdm.Controls.Add($tbAdmPin)
$gbAdm.Controls.Add((New-Button 'Сбросить' 500 26 100 { Reset-Admin }))
$form.Controls.Add($gbAdm)

# Полная установка
$btnFull = New-Button 'Полная установка (.env + config.json + сборка)' 12 608 400 { Invoke-FullInstall }
$btnFull.Height = 32
$btnFull.BackColor = [System.Drawing.Color]::FromArgb(46, 125, 50)
$btnFull.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($btnFull)

# Лог
$tbLog = New-Object System.Windows.Forms.TextBox
$tbLog.Multiline = $true
$tbLog.ReadOnly = $true
$tbLog.ScrollBars = 'Vertical'
$tbLog.Location = New-Object System.Drawing.Point(12, 646)
$tbLog.Size = New-Object System.Drawing.Size(620, 60)
$tbLog.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($tbLog)

function Write-Log([string]$msg) {
  $line = ('[' + (Get-Date).ToString('HH:mm:ss') + '] ' + $msg)
  $tbLog.AppendText($line + "`r`n")
}

Write-Log 'Готово. Поля предзаполнены рабочими значениями. Для первой установки нажмите «Полная установка», затем «Запустить сервер» и «Запустить HTTPS».'

[void]$form.ShowDialog()
