#requires -version 5.1
<#
  SuperApp — «запуск в один клик»: Bun-бэкенд + HTTPS-прокси (Caddy).

  Заменяет два нажатия в окне SuperApp-Setup.bat:
      «Запустить сервер (Bun)»  +  «Запустить HTTPS (Caddy)»

  Обычный запуск — двойной клик по installer\SuperApp-Start.bat.
  Вручную:
      powershell -NoProfile -ExecutionPolicy Bypass -File installer\superapp-start.ps1

  По умолчанию всё стартует В ОДНОМ ОКНЕ (это окно = супервизор): логи обоих
  процессов видны здесь же, Ctrl+C (или закрытие окна) останавливает всё.

  Ключи (пишутся и как /key, и как -key; список — /help):
      /window            два отдельных окна (как кнопки в SuperApp-Setup.bat),
                         это окно сразу закрывается
      /restart           перед запуском остановить уже работающие сервер и Caddy
      /open              открыть https://<домен> в браузере, когда всё поднимется
      /nocaddy           только Bun-сервер, без Caddy
      /domain <домен>    домен для HTTPS             (по умолчанию prostroykrym.ru)
      /port <n>          порт Bun-сервера            (по умолчанию PORT из .env)
      /host <адрес>      адрес привязки Bun          (по умолчанию 127.0.0.1)
      /http-port <n>     внутренний HTTP-порт Caddy  (по умолчанию 8080)
      /https-port <n>    внутренний HTTPS-порт Caddy (по умолчанию 8443)
      /backend <n>       порт бэкенда для Caddy      (по умолчанию = порт Bun)
      /dist <путь>       каталог собранного веб-клиента
                         (по умолчанию packages\client\dist)

  Почему внутренние порты Caddy 8080/8443: порты 80/443 на этом сервере заняты
  другим ПО (1С / http.sys / IIS), а роутер MikroTik пробрасывает на 8080/8443
  внешние 80/443 — снаружи адрес остаётся обычным https://prostroykrym.ru.
  Ровно те же значения использует кнопка «Запустить HTTPS (Caddy)» в
  SuperApp-Setup.bat, поэтому оба способа запуска взаимозаменяемы.
#>

Set-StrictMode -Off
$ErrorActionPreference = 'Stop'

# ===========================================================================
#  Вывод в консоль
# ===========================================================================

# Внутри окна cmd кодировка консоли должна быть UTF-8, иначе русские сообщения
# (свои и Bun/Caddy) превратятся в кракозябры.
try { & chcp.com 65001 | Out-Null } catch { }
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch { }
try { $Host.UI.RawUI.WindowTitle = 'SuperApp — сервер (Bun + Caddy)' } catch { }

function Write-Rule {
  Write-Host ('=' * 74) -ForegroundColor DarkGray
}

function Write-Step {
  param([string]$Message)
  Write-Host ('[' + (Get-Date).ToString('HH:mm:ss') + '] ') -ForegroundColor DarkGray -NoNewline
  Write-Host $Message
}

function Write-Ok {
  param([string]$Message)
  Write-Host ('[' + (Get-Date).ToString('HH:mm:ss') + '] OK  ') -ForegroundColor Green -NoNewline
  Write-Host $Message -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host ('[' + (Get-Date).ToString('HH:mm:ss') + '] !   ') -ForegroundColor Yellow -NoNewline
  Write-Host $Message -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  Write-Host ('[' + (Get-Date).ToString('HH:mm:ss') + '] X   ') -ForegroundColor Red -NoNewline
  Write-Host $Message -ForegroundColor Red
}

function Show-Usage {
  Write-Rule
  Write-Host ' SuperApp — запуск сервера:  SuperApp-Start.bat [ключи]' -ForegroundColor White
  Write-Rule
  @(
    '  без ключей         запустить Bun-сервер и Caddy в одном окне (Ctrl+C — стоп)',
    '  /window            как раньше: два отдельных окна, это окно закрывается',
    '  /restart           сначала остановить уже работающие сервер и Caddy',
    '  /open              открыть сайт в браузере, когда всё поднимется',
    '  /nocaddy           только Bun-сервер, без Caddy',
    '  /domain <домен>    домен для HTTPS              (prostroykrym.ru)',
    '  /port <n>          порт Bun-сервера             (из packages\server\.env)',
    '  /host <адрес>      адрес привязки Bun           (127.0.0.1)',
    '  /http-port <n>     внутренний HTTP-порт Caddy   (8080)',
    '  /https-port <n>    внутренний HTTPS-порт Caddy  (8443)',
    '  /backend <n>       порт бэкенда для Caddy       (= порт Bun)',
    '  /dist <путь>       каталог веб-клиента          (packages\client\dist)',
    '  /help              эта справка'
  ) | ForEach-Object { Write-Host $_ }
  Write-Rule
}

# ===========================================================================
#  Разбор ключей командной строки
#  ($args, а не param(): так работают и cmd-стиль «/window», и «-Window»)
# ===========================================================================
$sw  = @{ Window = $false; Restart = $false; Open = $false; NoCaddy = $false; Help = $false }
$cli = @{}

$switchMap = @{
  'window' = 'Window'; 'restart' = 'Restart'; 'reload' = 'Restart'; 'open' = 'Open'
  'nocaddy' = 'NoCaddy'; 'no-caddy' = 'NoCaddy'; 'help' = 'Help'; 'h' = 'Help'; '?' = 'Help'
}
$valueMap = @{
  'domain' = 'Domain'; 'port' = 'Port'; 'host' = 'BindHost'; 'http-port' = 'HttpPort'
  'https-port' = 'HttpsPort'; 'backend' = 'Backend'; 'dist' = 'Dist'
}

try {
  $rawArgs = @($args)
  $i = 0
  while ($i -lt $rawArgs.Count) {
    $token = [string]$rawArgs[$i]
    $i++
    if ([string]::IsNullOrWhiteSpace($token)) { continue }
    $key = $token.Trim()
    # допускаем «/window», «-window», «--window», «-/window» и т.п.
    while ($key.Length -gt 0 -and ($key.StartsWith('-') -or $key.StartsWith('/'))) {
      $key = $key.Substring(1)
    }
    $inline = $null
    $eq = $key.IndexOf('=')
    if ($eq -ge 0) { $inline = $key.Substring($eq + 1); $key = $key.Substring(0, $eq) }
    $key = $key.Trim().ToLowerInvariant()

    if ($switchMap.ContainsKey($key)) { $sw[$switchMap[$key]] = $true; continue }
    if ($valueMap.ContainsKey($key)) {
      if ($null -eq $inline) {
        if ($i -ge $rawArgs.Count) { throw ("Ключ '" + $token + "' требует значение.") }
        $inline = [string]$rawArgs[$i]
        $i++
      }
      $cli[$valueMap[$key]] = $inline
      continue
    }
    throw ("Неизвестный ключ: '" + $token + "'. Список ключей: /help")
  }
} catch {
  Write-Rule
  Write-Fail $_.Exception.Message
  Show-Usage
  exit 2
}

if ($sw.Help) { Show-Usage; exit 0 }

# ===========================================================================
#  Пути и вспомогательные функции
# ===========================================================================
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$ScriptDir = (Resolve-Path -LiteralPath $ScriptDir).Path

$RepoRoot       = (Resolve-Path -LiteralPath (Join-Path $ScriptDir '..')).Path
$ServerDir      = Join-Path $RepoRoot 'packages\server'
$ClientDir      = Join-Path $RepoRoot 'packages\client'
$EnvFile        = Join-Path $ServerDir '.env'
$DefaultDist    = Join-Path $ClientDir 'dist'
$CaddyfileLocal = Join-Path $ScriptDir 'Caddyfile.local'
$BundledCaddy   = Join-Path $ScriptDir 'caddy.exe'

# Найденные процессы, запущенные ИМЕННО этим скриптом (их и останавливаем).
$script:Started = New-Object System.Collections.ArrayList
$script:StopRequested = $false

function ConvertTo-PortNumber {
  param([string]$Value, [string]$Name)
  $n = 0
  if ((-not [int]::TryParse($Value, [ref]$n)) -or $n -lt 1 -or $n -gt 65535) {
    throw ("Значение /" + $Name + " должно быть числом 1..65535 (получено '" + $Value + "').")
  }
  return $n
}

function Read-DotEnvFile {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith('#')) { continue }
    $eq = $t.IndexOf('=')
    if ($eq -lt 1) { continue }
    $k = $t.Substring(0, $eq).Trim()
    $v = $t.Substring($eq + 1).Trim()
    if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $map[$k] = $v
  }
  return $map
}

function Get-BunExe {
  $cmd = Get-Command bun -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  if ($env:BUN_INSTALL) {
    $p = Join-Path $env:BUN_INSTALL 'bin\bun.exe'
    if (Test-Path -LiteralPath $p) { return $p }
  }
  if ($env:USERPROFILE) {
    $p = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Resolve-CaddyExe {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  if (Test-Path -LiteralPath $BundledCaddy) { return $BundledCaddy }
  Write-Step 'Caddy не найден — скачиваю caddy.exe (один раз, ~15 МБ)...'
  try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' `
      -OutFile $BundledCaddy -UseBasicParsing -TimeoutSec 600
  } catch {
    Write-Fail ('Не удалось скачать Caddy: ' + $_.Exception.Message)
    return $null
  }
  if (Test-Path -LiteralPath $BundledCaddy) { return $BundledCaddy }
  Write-Fail 'После загрузки файл caddy.exe не появился.'
  return $null
}

# Кто слушает порт: объект { Port, Pid, Name } или $null.
# Важно: не полагаемся на слово «LISTENING» в выводе netstat — на русской
# Windows оно локализовано. Слушающий сокет узнаём по «нулевому» удалённому
# адресу (0.0.0.0:0 / [::]:0), это одинаково на любом языке системы.
function Get-PortOwner {
  param([int]$Port)

  $out = @()
  try { $out = & netstat.exe -ano -p tcp 2>$null } catch { $out = @() }
  foreach ($line in @($out)) {
    if ($line -match '^\s*TCP\s+\S+:(\d+)\s+(0\.0\.0\.0|\[::\]):0\s+\S+\s+(\d+)\s*$') {
      if ([int]$Matches[1] -eq $Port) {
        $ownerPid = [int]$Matches[3]
        $name = '?'
        $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($proc) { $name = $proc.ProcessName }
        return [pscustomobject]@{ Port = $Port; Pid = $ownerPid; Name = $name }
      }
    }
  }
  return $null
}

function Wait-PortListen {
  param([int]$Port, [int]$TimeoutSeconds = 45)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Get-PortOwner -Port $Port) { return $true }
    if ($script:StopRequested) { return $false }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function Test-Health {
  param([string]$Address, [int]$Port)
  try {
    $url = 'http://' + $Address + ':' + $Port + '/api/health'
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    $code = [int]$resp.StatusCode
    return (($code -ge 200) -and ($code -lt 300) -and ([string]$resp.Content -match 'healthy'))
  } catch {
    return $false
  }
}

function Test-ProcessAlive {
  param([int]$ProcessId)
  return ($null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue))
}

function Add-Started {
  param([string]$Name, [int]$ProcessId)
  [void]$script:Started.Add([pscustomobject]@{ Name = $Name; Pid = $ProcessId })
}

function Stop-StartedProcesses {
  $alive = @($script:Started | Where-Object { Test-ProcessAlive $_.Pid })
  if ($alive.Count -eq 0) { return }
  # Ctrl+C уже доставлен всем процессам в этой консоли — даём им выйти самим.
  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-Date) -lt $deadline) {
    if (@($script:Started | Where-Object { Test-ProcessAlive $_.Pid }).Count -eq 0) { break }
    Start-Sleep -Milliseconds 200
  }
  foreach ($item in @($script:Started)) {
    if (Test-ProcessAlive $item.Pid) {
      Write-Step ('Останавливаю ' + $item.Name + ' (PID ' + $item.Pid + ')...')
      try { Stop-Process -Id $item.Pid -Force -ErrorAction Stop } catch { }
    }
  }
  Start-Sleep -Milliseconds 300
}

# Остановить процесс, который слушает порт. $ExpectNames — какие имена процессов
# допустимо снимать (чтобы случайно не убить чужую программу).
function Stop-PortOwner {
  param([int]$Port, [string[]]$ExpectNames, [string]$Title)
  $owner = Get-PortOwner -Port $Port
  if (-not $owner) { return $true }
  $name = ([string]$owner.Name).ToLowerInvariant()
  $allowed = $false
  foreach ($e in $ExpectNames) { if ($name -eq $e.ToLowerInvariant()) { $allowed = $true } }
  if (-not $allowed) {
    Write-Fail ($Title + ': порт ' + $Port + ' занят процессом ' + $owner.Name + ' (PID ' + $owner.Pid + '). Не трогаю его — освободите порт вручную.')
    return $false
  }
  Write-Step ('Останавливаю ' + $Title + ' (PID ' + $owner.Pid + ')...')
  try { Stop-Process -Id $owner.Pid -Force -ErrorAction Stop } catch {
    Write-Fail ('Не удалось остановить PID ' + $owner.Pid + ': ' + $_.Exception.Message)
    return $false
  }
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    if (-not (Get-PortOwner -Port $Port)) { break }
    Start-Sleep -Milliseconds 300
  }
  return ($null -eq (Get-PortOwner -Port $Port))
}

# Caddyfile.local — тот же формат, что генерирует кнопка «Запустить HTTPS (Caddy)».
function New-CaddyfileLocal {
  param([string]$Domain, [int]$HttpPort, [int]$HttpsPort, [int]$BackendPort, [string]$DistDir)
  $distFwd = ($DistDir -replace '\\', '/')
  $nl = "`r`n"
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('# Сгенерировано SuperApp-Start (installer\superapp-start.ps1).' + $nl)
  [void]$sb.Append('# Домен: ' + $Domain + '; внутренние порты ' + $HttpPort + '/' + $HttpsPort + '; бэкенд 127.0.0.1:' + $BackendPort + $nl)
  [void]$sb.Append('{' + $nl)
  [void]$sb.Append('    http_port ' + $HttpPort + $nl)
  [void]$sb.Append('    https_port ' + $HttpsPort + $nl)
  [void]$sb.Append('    auto_https disable_redirects' + $nl)
  [void]$sb.Append('}' + $nl + $nl)
  [void]$sb.Append($Domain + ' {' + $nl)
  [void]$sb.Append('    encode zstd gzip' + $nl)
  [void]$sb.Append('    handle /api/* {' + $nl)
  [void]$sb.Append('        reverse_proxy 127.0.0.1:' + $BackendPort + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('    handle /uploads/* {' + $nl)
  [void]$sb.Append('        reverse_proxy 127.0.0.1:' + $BackendPort + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('    handle {' + $nl)
  [void]$sb.Append('        root * "' + $distFwd + '"' + $nl)
  [void]$sb.Append('        try_files {path} /index.html' + $nl)
  [void]$sb.Append('        file_server' + $nl)
  [void]$sb.Append('    }' + $nl)
  [void]$sb.Append('}' + $nl)
  [System.IO.File]::WriteAllText($CaddyfileLocal, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  return $CaddyfileLocal
}

# Небольшой .cmd-файл для запуска сервиса в ОТДЕЛЬНОМ окне (/window).
function New-WindowCommandFile {
  param([string]$FileName, [string[]]$Lines)
  $base = $env:TEMP
  if (-not $base) { $base = $ScriptDir }
  $dir = Join-Path $base 'SuperApp-start'
  if (-not (Test-Path -LiteralPath $dir)) { [void](New-Item -ItemType Directory -Path $dir -Force) }
  $path = Join-Path $dir $FileName
  # Содержимое — только ASCII: так cmd не путается с кодировкой (chcp ставится
  # первой же строкой, дальше окно печатает уже русский текст программ).
  [System.IO.File]::WriteAllText($path, (($Lines -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  return $path
}

function Start-ServiceWindow {
  param([string]$WrapperPath)
  $cmdLine = '/k "' + $WrapperPath + '"'
  Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdLine | Out-Null
}

# ===========================================================================
#  Настройки: ключи -> .env -> значения по умолчанию
# ===========================================================================
$envMap = @{}
try { $envMap = Read-DotEnvFile $EnvFile } catch { }

$bunPort = 3002
if ($envMap.ContainsKey('PORT')) {
  $envPort = 0
  if ([int]::TryParse([string]$envMap['PORT'], [ref]$envPort)) { $bunPort = $envPort }
}
$domain     = 'prostroykrym.ru'
$bindHost   = '127.0.0.1'
$httpPort   = 8080
$httpsPort  = 8443
$backendPort = $bunPort
$distDir    = $DefaultDist

try {
  if ($cli.ContainsKey('Port'))      { $bunPort = ConvertTo-PortNumber $cli['Port'] 'port' }
  if ($cli.ContainsKey('BindHost'))  { $bindHost = $cli['BindHost'].Trim() }
  if ($cli.ContainsKey('Domain'))    { $domain = $cli['Domain'].Trim() }
  if ($cli.ContainsKey('HttpPort'))  { $httpPort = ConvertTo-PortNumber $cli['HttpPort'] 'http-port' }
  if ($cli.ContainsKey('HttpsPort')) { $httpsPort = ConvertTo-PortNumber $cli['HttpsPort'] 'https-port' }
  if ($cli.ContainsKey('Dist'))      { $distDir = $cli['Dist'].Trim() }
  if ($cli.ContainsKey('Backend'))   { $backendPort = ConvertTo-PortNumber $cli['Backend'] 'backend' } else { $backendPort = $bunPort }
} catch {
  Write-Rule
  Write-Fail $_.Exception.Message
  exit 2
}

if (-not $bindHost) { $bindHost = '127.0.0.1' }
if (-not $domain)   { $domain = 'prostroykrym.ru' }

# ===========================================================================
#  Проверки перед запуском
# ===========================================================================
Write-Rule
Write-Host ' SuperApp — запуск сервера' -ForegroundColor White -NoNewline
Write-Host '  (Bun + Caddy одним кликом)' -ForegroundColor DarkGray
Write-Host (' Проект: ' + $RepoRoot) -ForegroundColor DarkGray
Write-Rule

$fatal = $false

# 1) Bun
$bunExe = Get-BunExe
if ($bunExe) {
  Write-Ok ('Bun: ' + $bunExe)
} else {
  Write-Fail 'Не найден Bun (рантайм сервера).'
  Write-Host '      Установите:  powershell -c "irm bun.sh/install.ps1 | iex"' -ForegroundColor Yellow
  $fatal = $true
}

# 2) .env сервера и JWT_SECRET
$nodeEnv = 'development'
if ($envMap.ContainsKey('NODE_ENV')) { $nodeEnv = [string]$envMap['NODE_ENV'] }
$jwt = ''
if ($envMap.ContainsKey('JWT_SECRET')) { $jwt = [string]$envMap['JWT_SECRET'] }

if (-not (Test-Path -LiteralPath $EnvFile)) {
  Write-Fail ('Нет файла ' + $EnvFile + ' — сервер не настроен.')
  Write-Host '      Запустите installer\SuperApp-Setup.bat и нажмите «Полная установка».' -ForegroundColor Yellow
  $fatal = $true
} else {
  Write-Ok ('.env: ' + $EnvFile + '  (PORT=' + $bunPort + ', NODE_ENV=' + $nodeEnv + ')')
  if ($envMap.ContainsKey('HOST') -and ([string]$envMap['HOST'] -ne $bindHost)) {
    Write-Warn ('В .env HOST=' + $envMap['HOST'] + ', а запускаю на ' + $bindHost + ' (как кнопка «Запустить сервер»). Изменить: /host 0.0.0.0')
  }
  if ($nodeEnv -eq 'production' -and ($jwt.Length -lt 16 -or $jwt -eq 'superapp-secret-key')) {
    Write-Fail 'JWT_SECRET не задан (или слишком короткий) — в production сервер не стартует.'
    Write-Host '      Запустите installer\SuperApp-Setup.bat и нажмите «Записать .env» (секрет сгенерируется сам).' -ForegroundColor Yellow
    $fatal = $true
  }
}

# 3) Зависимости сервера
if (-not (Test-Path -LiteralPath (Join-Path $ServerDir 'node_modules'))) {
  if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'node_modules'))) {
    Write-Warn 'Не вижу node_modules — возможно, не выполнялся bun install (кнопка «Установить зависимости» в SuperApp-Setup.bat).'
  }
}

# 4) Собранный веб-клиент (нужен Caddy)
$haveDist = $false
if (Test-Path -LiteralPath (Join-Path $distDir 'index.html')) {
  $haveDist = $true
  Write-Ok ('Веб-клиент: ' + $distDir)
} else {
  Write-Warn ('Не найден собранный веб-клиент (' + $distDir + '\index.html).')
  Write-Host '      Соберите его в SuperApp-Setup.bat: «Установить зависимости и собрать веб-клиент».' -ForegroundColor Yellow
}

# 5) Caddy и его порты
$caddyExe = $null
if (-not $sw.NoCaddy) {
  if ($haveDist) {
    $caddyExe = Resolve-CaddyExe
    if ($caddyExe) {
      Write-Ok ('Caddy: ' + $caddyExe)
    } else {
      Write-Warn 'Caddy недоступен — запущу только Bun-сервер (без HTTPS).'
    }
  } else {
    Write-Warn 'HTTPS (Caddy) не запускаю: нет собранного веб-клиента.'
  }
}

if ($fatal) {
  Write-Rule
  Write-Fail 'Запуск отменён — сначала устраните ошибки выше.'
  exit 1
}

# ===========================================================================
#  Порт Bun: уже занят? занят чужим?
# ===========================================================================
$startBun = $true
$bunOwner = Get-PortOwner -Port $bunPort
if ($bunOwner) {
  $ownerName = ([string]$bunOwner.Name).ToLowerInvariant()
  if ($sw.Restart -and ($ownerName -eq 'bun' -or $ownerName -eq 'bun.exe')) {
    if (-not (Stop-PortOwner -Port $bunPort -ExpectNames @('bun') -Title 'Bun-сервер')) {
      Write-Fail 'Запуск отменён.'
      exit 1
    }
    $bunOwner = Get-PortOwner -Port $bunPort
  }
  if ($bunOwner) {
    if ($ownerName -ne 'bun') {
      Write-Fail ('Порт ' + $bunPort + ' занят процессом ' + $bunOwner.Name + ' (PID ' + $bunOwner.Pid + ').')
      Write-Host ('      Освободите порт или укажите другой:  /port 3003   (тогда и /backend 3003)') -ForegroundColor Yellow
      exit 1
    }
    if (Test-Health -Address '127.0.0.1' -Port $bunPort) {
      Write-Ok ('Bun-сервер уже запущен (PID ' + $bunOwner.Pid + '), /api/health отвечает — второй экземпляр не нужен.')
    } else {
      Write-Warn ('Порт ' + $bunPort + ' уже слушает bun (PID ' + $bunOwner.Pid + '), но /api/health не отвечает. Использую его. Перезапустить: /restart')
    }
    $startBun = $false
  }
}

# ===========================================================================
#  Порт HTTPS Caddy: уже занят?
# ===========================================================================
$startCaddy = ($null -ne $caddyExe)
$caddyAlreadyRunning = $false
$caddyfile = $null
if ($startCaddy) {
  $httpsOwner = Get-PortOwner -Port $httpsPort
  if ($httpsOwner) {
    $ownerName = ([string]$httpsOwner.Name).ToLowerInvariant()
    if ($sw.Restart -and $ownerName -eq 'caddy') {
      if (-not (Stop-PortOwner -Port $httpsPort -ExpectNames @('caddy') -Title 'Caddy')) {
        Write-Warn 'Caddy не остановился — запускаю новый экземпляр всё равно.'
      }
      $httpsOwner = Get-PortOwner -Port $httpsPort
    }
    if ($httpsOwner) {
      if ($ownerName -eq 'caddy') {
        Write-Ok ('Caddy уже слушает порт ' + $httpsPort + ' (PID ' + $httpsOwner.Pid + ') — второй экземпляр не нужен.')
        $caddyAlreadyRunning = $true
      } else {
        Write-Fail ('Порт ' + $httpsPort + ' занят процессом ' + $httpsOwner.Name + ' (PID ' + $httpsOwner.Pid + ') — Caddy не сможет запуститься.')
        Write-Host '      Освободите порт или укажите другие: /https-port 8444 /http-port 8081' -ForegroundColor Yellow
      }
      $startCaddy = $false
    }
  }
}

# ===========================================================================
#  Подготовка Caddyfile.local
# ===========================================================================
if ($startCaddy) {
  try {
    $caddyfile = New-CaddyfileLocal -Domain $domain -HttpPort $httpPort -HttpsPort $httpsPort -BackendPort $backendPort -DistDir $distDir
    Write-Step ('Caddyfile.local: домен ' + $domain + ', порты ' + $httpPort + '/' + $httpsPort + ' -> 127.0.0.1:' + $backendPort)
  } catch {
    Write-Fail ('Не удалось записать Caddyfile.local: ' + $_.Exception.Message)
    $startCaddy = $false
    $caddyfile = $null
  }
}

# ===========================================================================
#  Запуск
# ===========================================================================
$exitCode = 0
$modeWindow = [bool]$sw.Window
$startedNames = @()
$waitSeconds = 45
if ($modeWindow) { $waitSeconds = 20 }

# Ctrl+C не должен рвать скрипт на полуслове: выставляем флаг, а всё, что мы
# успели запустить, аккуратно останавливает Stop-StartedProcesses.
try {
  $cancelHandler = [System.ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    $script:StopRequested = $true
  }
  [void][Console]::add_CancelKeyPress($cancelHandler)
} catch { }

try {
  if ($script:StopRequested) { throw 'cancelled' }

  # --- 1) Bun-бэкенд -------------------------------------------------------
  if ($startBun) {
    Write-Step ('Запускаю Bun-сервер на ' + $bindHost + ':' + $bunPort + '...')
    $env:HOST = $bindHost
    $env:PORT = [string]$bunPort
    # Bun мог быть установлен не в PATH — добавим его каталог (как это делают
    # start-server.bat и кнопка «Запустить сервер»), чтобы дочерние процессы
    # тоже находили bun.
    $bunDirPath = Split-Path -Parent $bunExe
    if ($bunDirPath) {
      if (-not $env:PATH) {
        $env:PATH = $bunDirPath
      } elseif ($env:PATH.IndexOf($bunDirPath, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        $env:PATH = $bunDirPath + ';' + $env:PATH
      }
    }
    if ($modeWindow) {
      $wrapper = New-WindowCommandFile -FileName 'server.cmd' -Lines @(
        '@echo off',
        'chcp 65001 >nul',
        ('title SuperApp server ' + $bindHost + ':' + $bunPort),
        'set "PATH=%USERPROFILE%\.bun\bin;%PATH%"',
        ('set "HOST=' + $bindHost + '"'),
        ('set "PORT=' + $bunPort + '"'),
        ('cd /d "' + $ServerDir + '"'),
        ('echo [SuperApp] Bun server on ' + $bindHost + ':' + $bunPort + '  (Ctrl+C stops it; keep this window open)'),
        'echo.',
        ('"' + $bunExe + '" run src\server.ts'),
        'echo.',
        'echo [SuperApp] Bun server stopped.'
      )
      Start-ServiceWindow -WrapperPath $wrapper
    } else {
      $proc = Start-Process -FilePath $bunExe -ArgumentList @('run', 'src\server.ts') `
        -WorkingDirectory $ServerDir -NoNewWindow -PassThru
      Add-Started -Name 'Bun-сервер' -ProcessId $proc.Id
      $startedNames += 'Bun-сервер'
    }
  }

  if ($startBun) {
    if (-not (Wait-PortListen -Port $bunPort -TimeoutSeconds $waitSeconds)) {
      if ($script:StopRequested) { throw 'cancelled' }
      Write-Fail ('Bun-сервер не начал слушать порт ' + $bunPort + ' за ' + $waitSeconds + ' секунд — смотрите его лог.')
      $exitCode = 1
      throw 'bun-not-listening'
    }
    if ($modeWindow) {
      Write-Ok ('Bun-сервер слушает ' + $bindHost + ':' + $bunPort + ' (окно сервера открыто).')
    } elseif (Test-Health -Address $bindHost -Port $bunPort) {
      Write-Ok ('Bun-сервер слушает ' + $bindHost + ':' + $bunPort + ', /api/health: healthy')
    } else {
      Write-Warn ('Bun слушает ' + $bindHost + ':' + $bunPort + ', но /api/health не ответил (проверьте лог выше).')
    }
  }

  # --- 2) Caddy (HTTPS) ----------------------------------------------------
  if ($startCaddy) {
    Write-Step 'Запускаю Caddy (HTTPS)...'
    if ($modeWindow) {
      $wrapper = New-WindowCommandFile -FileName 'caddy.cmd' -Lines @(
        '@echo off',
        'chcp 65001 >nul',
        ('title SuperApp HTTPS (Caddy) ' + $domain),
        ('cd /d "' + $ScriptDir + '"'),
        ('echo [SuperApp] Caddy: https://' + $domain + '  (ports ' + $httpPort + '/' + $httpsPort + ' -> 127.0.0.1:' + $backendPort + ')'),
        'echo.',
        ('"' + $caddyExe + '" run --config "' + $caddyfile + '"'),
        'echo.',
        'echo [SuperApp] Caddy stopped.'
      )
      Start-ServiceWindow -WrapperPath $wrapper
    } else {
      $caddyArgs = 'run --config "' + $caddyfile + '"'
      $caddyProc = Start-Process -FilePath $caddyExe -ArgumentList $caddyArgs `
        -WorkingDirectory $ScriptDir -NoNewWindow -PassThru
      Add-Started -Name 'Caddy (HTTPS)' -ProcessId $caddyProc.Id
      $startedNames += 'Caddy (HTTPS)'
    }

    if (-not (Wait-PortListen -Port $httpsPort -TimeoutSeconds $waitSeconds)) {
      if ($script:StopRequested) { throw 'cancelled' }
      Write-Fail ('Caddy не начал слушать порт ' + $httpsPort + ' за ' + $waitSeconds + ' секунд — смотрите его лог.')
      $exitCode = 1
      throw 'caddy-not-listening'
    }
    Write-Ok ('Caddy слушает порт ' + $httpsPort + ' — сайт поднят.')
  }
} catch {
  $cancelled = ($script:StopRequested -or ([string]$_.Exception.Message -eq 'cancelled'))
  if ($cancelled) {
    Write-Step 'Остановлено пользователем (Ctrl+C) — выключаю то, что успело запуститься.'
    Stop-StartedProcesses
    exit 0
  }
  if ($exitCode -eq 0) {
    Write-Fail ('Ошибка: ' + $_.Exception.Message)
    $exitCode = 1
  }
  Stop-StartedProcesses
  Write-Rule
  exit $exitCode
}

# ===========================================================================
#  Итог
# ===========================================================================
$pidOf = @{}
foreach ($item in @($script:Started)) { $pidOf[$item.Name] = $item.Pid }
$nothingStarted = ((-not $startBun) -and (-not $startCaddy))

Write-Rule
if ($nothingStarted) {
  Write-Host ' SuperApp уже работает (новых процессов не запускалось).' -ForegroundColor Yellow
} else {
  Write-Host ' SuperApp запущен.' -ForegroundColor Green
}

if ($startBun) {
  if ($modeWindow) {
    Write-Host ('   Bun-сервер  : http://' + $bindHost + ':' + $bunPort + '   (отдельное окно)')
  } else {
    Write-Host ('   Bun-сервер  : http://' + $bindHost + ':' + $bunPort + '   (PID ' + $pidOf['Bun-сервер'] + ')')
  }
} else {
  Write-Host ('   Bun-сервер  : http://' + $bindHost + ':' + $bunPort + '   (уже был запущен ранее)')
}

if ($startCaddy) {
  if ($modeWindow) {
    Write-Host ('   HTTPS       : https://' + $domain + '   (отдельное окно, порты ' + $httpPort + '/' + $httpsPort + ' -> 127.0.0.1:' + $backendPort + ')')
  } else {
    Write-Host ('   HTTPS       : https://' + $domain + '   (PID ' + $pidOf['Caddy (HTTPS)'] + ', порты ' + $httpPort + '/' + $httpsPort + ' -> 127.0.0.1:' + $backendPort + ')')
  }
  Write-Host ('   Caddyfile   : ' + $caddyfile)
} elseif ($caddyAlreadyRunning) {
  Write-Host ('   HTTPS       : https://' + $domain + '   (Caddy уже был запущен ранее, порт ' + $httpsPort + ')')
} elseif ($sw.NoCaddy) {
  Write-Host  '   HTTPS       : не запускался (/nocaddy)'
} elseif (-not $haveDist) {
  Write-Host  '   HTTPS       : не запускался — нет собранного веб-клиента (см. выше)'
} else {
  Write-Host  '   HTTPS       : не запускался — Caddy недоступен или порт занят (см. выше)'
}

if ($modeWindow) {
  Write-Host '   Режим       : два отдельных окна (сервер и Caddy). Это окно можно закрыть.' -ForegroundColor DarkGray
  Write-Rule
  if ($sw.Open) { Start-Process ('https://' + $domain) | Out-Null }
  exit 0
}

if ($nothingStarted) {
  Write-Host '   Перезапустить принудительно: SuperApp-Start.bat /restart' -ForegroundColor DarkGray
} else {
  Write-Host '   Остановить  : Ctrl+C в этом окне (или просто закройте окно)' -ForegroundColor White
}
Write-Rule

if ($sw.Open) {
  Write-Step ('Открываю https://' + $domain + ' в браузере...')
  try { Start-Process ('https://' + $domain) | Out-Null } catch { }
}

if ($startedNames.Count -eq 0) {
  # Ничего не запускали — присматривать не за чем.
  Write-Step 'Завершаю (запускать было нечего).'
  exit 0
}

# ===========================================================================
#  Присмотр: Ctrl+C = аккуратно остановить всё, что запустили мы
#  (обработчик Ctrl+C зарегистрирован выше, до старта сервисов)
# ===========================================================================
$heartbeatSeconds = 60
$nextHeartbeat = (Get-Date).AddSeconds($heartbeatSeconds)

while ($true) {
  if ($script:StopRequested) {
    Write-Step 'Нажато Ctrl+C — останавливаю SuperApp...'
    break
  }
  foreach ($item in @($script:Started)) {
    if (-not (Test-ProcessAlive $item.Pid)) {
      Write-Fail ($item.Name + ' неожиданно остановился (PID ' + $item.Pid + '). Причина — в его логе выше.')
      $exitCode = 1
      break
    }
  }
  if ($exitCode -ne 0) { break }
  if ((Get-Date) -ge $nextHeartbeat) {
    $status = @()
    foreach ($item in @($script:Started)) { $status += ($item.Name + ' PID ' + $item.Pid) }
    Write-Step ('SuperApp работает: ' + ($status -join ', '))
    $nextHeartbeat = (Get-Date).AddSeconds($heartbeatSeconds)
  }
  Start-Sleep -Milliseconds 500
}

Stop-StartedProcesses
Write-Rule
if ($exitCode -eq 0) {
  Write-Ok 'SuperApp остановлен. Окно можно закрыть.'
} else {
  Write-Fail 'SuperApp остановлен из-за ошибки (см. сообщения выше).'
}
Write-Rule
exit $exitCode
