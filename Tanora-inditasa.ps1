$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location -LiteralPath $PSScriptRoot

Write-Host ""
Write-Host " Kémiai játék – tanóra indítása"
Write-Host " =============================="
Write-Host ""

function Hiba($uzenet) {
  Write-Host "[HIBA] $uzenet"
  Write-Host ""
  if (-not $env:KEMIA_INDITO_TESZT) {
    Read-Host "Nyomj Entert a bezáráshoz"
  }
  exit 1
}

function PortFoglalt([int]$port) {
  $minta = ":$port "
  $sorok = netstat -ano 2>$null
  foreach ($sor in $sorok) {
    if ($sor -like "*$minta*" -and $sor -like "*LISTENING*") { return $true }
  }
  return $false
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Hiba @"
A Node.js nincs telepítve, vagy nincs a PATH-ban.
Telepítsd a Node.js-t, majd indítsd újra ezt a fájlt.
https://nodejs.org/
"@
}

$szerver = Join-Path $PSScriptRoot "kemia-szerver\szerver.mjs"
if (-not (Test-Path -LiteralPath $szerver)) {
  Hiba "Nem találom a kemia-szerver\szerver.mjs fájlt.`nAz indítót a KemiaiJatekok mappában kell tartani."
}

$cloudflaredJeloltek = @(
  (Join-Path $PSScriptRoot "cloudflared-windows-amd64.exe"),
  (Join-Path $PSScriptRoot "cloudflared.exe"),
  (Join-Path $env:USERPROFILE "Downloads\cloudflared-windows-amd64.exe"),
  (Join-Path $env:USERPROFILE "Downloads\cloudflared.exe")
)

$cloudflared = $cloudflaredJeloltek | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $cloudflared) {
  $pathCf = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($pathCf) { $cloudflared = $pathCf.Source }
}

if (-not $cloudflared) {
  Hiba @"
Nem találom a cloudflared programot.
Másold a cloudflared-windows-amd64.exe fájlt:
- ebbe a mappába, vagy
- a Letöltések mappába
"@
}

$foglalt = @()
foreach ($port in 3000, 3001) {
  if (PortFoglalt $port) { $foglalt += $port }
}
if ($foglalt.Count -gt 0) {
  Hiba @"
A $($foglalt -join ', ')-es port foglalt.
Zárd be a korábbi tanóra-/tunnelablakokat, majd próbáld újra.
Feladatkezelőben keresheted: node.exe, cloudflared.
"@
}

$tunnelLog = Join-Path $env:TEMP "kemia-tunnel.log"
$tunnelErr = Join-Path $env:TEMP "kemia-tunnel-err.log"
Remove-Item -LiteralPath $tunnelLog, $tunnelErr -Force -ErrorAction SilentlyContinue

Write-Host "Cloudflare Quick Tunnel indítása a diákportra (3001)..."
$tunnelProc = Start-Process -FilePath $cloudflared `
  -ArgumentList @("tunnel", "--url", "http://127.0.0.1:3001") `
  -RedirectStandardOutput $tunnelLog `
  -RedirectStandardError $tunnelErr `
  -WindowStyle Hidden `
  -PassThru

Write-Host "Várakozás a nyilvános HTTPS-címre..."
$origin = $null
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 1
  $txt = ""
  foreach ($f in @($tunnelLog, $tunnelErr)) {
    if (Test-Path -LiteralPath $f) {
      $resz = Get-Content -LiteralPath $f -Raw -ErrorAction SilentlyContinue
      if ($resz) { $txt += $resz }
    }
  }
  if ($txt -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
    $origin = $Matches[0]
    break
  }
  if ($tunnelProc.HasExited) { break }
}

if (-not $origin) {
  try { if (-not $tunnelProc.HasExited) { Stop-Process -Id $tunnelProc.Id -Force } } catch {}
  Hiba @"
Nem sikerült kiolvasni a Cloudflare HTTPS-címet.
Ellenőrizd az internetkapcsolatot, majd indítsd újra ezt a fájlt.
"@
}

Write-Host "Nyilvános diákcím: $origin"
Write-Host ""
Write-Host "Helyi szerver indítása..."

$szerverCmd = "set KEMIA_DIAK_ORIGIN=$origin&& title Kemiai jatek - helyi szerver&& node kemia-szerver\szerver.mjs"
Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $szerverCmd) -WorkingDirectory $PSScriptRoot | Out-Null

Write-Host "Várakozás a tanári oldalra..."
$szerverOk = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $valasz = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -Headers @{ Origin = "http://127.0.0.1:3000" } -UseBasicParsing -TimeoutSec 2
    if ($valasz.StatusCode -ge 200) {
      $szerverOk = $true
      break
    }
  } catch {
    # még indul
  }
  Start-Sleep -Seconds 1
}

if (-not $szerverOk) {
  Hiba @"
A helyi szerver nem válaszol a http://127.0.0.1:3000/ címen.
Nézd meg a „helyi szerver” ablak hibáit, majd próbáld újra.
"@
}

Write-Host "Tanári oldal megnyitása..."
Start-Process "http://127.0.0.1:3000/"

Write-Host ""
Write-Host "Kész. A tanár teendői:"
Write-Host "  1. Belépés"
Write-Host "  2. Tanóra létrehozása"
Write-Host "  3. QR-kód kivetítése"
Write-Host "  4. Játék indítása"
Write-Host ""
Write-Host "Ne zárd be a Cloudflare Tunnel és a helyi szerver ablakokat"
Write-Host "a tanóra végéig."
Write-Host ""
if (-not $env:KEMIA_INDITO_TESZT) {
  Read-Host "Nyomj Entert a bezáráshoz"
}
exit 0
