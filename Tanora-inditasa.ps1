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

function PortFoglalok([int[]]$portok) {
  $talalatok = @()
  $latott = @{}

  # netstat: nem függ a NetTCPIP modultól
  # (ami néhány gépen betöltéskor elhasal).
  $sorok = @()
  try {
    $sorok = netstat -ano 2>$null
  } catch {
    $sorok = @()
  }

  foreach ($port in $portok) {
    foreach ($sor in $sorok) {
      if ($sor -notmatch 'LISTENING') { continue }
      if ($sor -notmatch "(?i)[:\]]${port}\s+\S+\s+LISTENING\s+(\d+)\s*$") {
        continue
      }

      $pidErtek = [int]$Matches[1]
      $kulcs = "$port/$pidErtek"
      if ($latott.ContainsKey($kulcs)) { continue }
      $latott[$kulcs] = $true

      $folyamat = $null
      try {
        $folyamat = Get-Process -Id $pidErtek -ErrorAction SilentlyContinue
      } catch {
        $folyamat = $null
      }

      $talalatok += [pscustomobject]@{
        Port = $port
        PID = $pidErtek
        Name = if ($folyamat) { $folyamat.ProcessName } else { "(ismeretlen)" }
        Path = if ($folyamat -and $folyamat.Path) { $folyamat.Path } else { "" }
      }
    }
  }

  return $talalatok
}

function PortFoglaltsagJelentese([int[]]$portok) {
  $foglalok = PortFoglalok $portok
  if ($foglalok.Count -lt 1) {
    return
  }

  Write-Host "[HIBA] Az alábbi port(ok) foglalt(ak). Idegen folyamatot nem állítok le."
  Write-Host ""
  foreach ($f in $foglalok) {
    $sor = "  Port $($f.Port): $($f.Name) (PID $($f.PID))"
    if ($f.Path) { $sor += " — $($f.Path)" }
    Write-Host $sor
  }
  Write-Host ""
  Write-Host "Zárd be a saját korábbi tanóraablakot (Tanóra leállítása / X),"
  Write-Host "vagy állítsd le a fenti folyamatot a Feladatkezelőben, majd próbáld újra."
  Write-Host ""
  if (-not $env:KEMIA_INDITO_TESZT) {
    Read-Host "Nyomj Entert a bezáráshoz"
  }
  exit 1
}

# Windows Job Object: a szülő bezárásakor
# (X, feladat vége) a gyerekek is leállnak.
if (-not ("KemiaIndito.JobObject" -as [type])) {
Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace KemiaIndito {
public class JobObject : IDisposable {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetInformationJobObject(
    IntPtr hJob,
    int JobObjectInfoClass,
    IntPtr lpJobObjectInfo,
    uint cbJobObjectInfoLength
  );

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CloseHandle(IntPtr hObject);

  const int JobObjectExtendedLimitInformation = 9;
  const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct IO_COUNTERS {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }

  IntPtr _handle;

  public JobObject() {
    _handle = CreateJobObject(IntPtr.Zero, null);
    if (_handle == IntPtr.Zero) {
      throw new InvalidOperationException(
        "CreateJobObject sikertelen. Hibakód: " + Marshal.GetLastWin32Error()
      );
    }

    var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
    IntPtr ptr = Marshal.AllocHGlobal(length);
    try {
      Marshal.StructureToPtr(info, ptr, false);
      if (!SetInformationJobObject(
        _handle,
        JobObjectExtendedLimitInformation,
        ptr,
        (uint)length
      )) {
        throw new InvalidOperationException(
          "SetInformationJobObject sikertelen. Hibakód: " +
          Marshal.GetLastWin32Error()
        );
      }
    } finally {
      Marshal.FreeHGlobal(ptr);
    }
  }

  public void AddProcess(Process process) {
    if (process == null || process.HasExited) {
      throw new InvalidOperationException("A folyamat nem adható a Job Objecthez.");
    }

    if (!AssignProcessToJobObject(_handle, process.Handle)) {
      throw new InvalidOperationException(
        "AssignProcessToJobObject sikertelen (PID " + process.Id +
        "). Hibakód: " + Marshal.GetLastWin32Error()
      );
    }
  }

  public void Dispose() {
    if (_handle != IntPtr.Zero) {
      CloseHandle(_handle);
      _handle = IntPtr.Zero;
    }
  }
}
}
"@
}

function Start-JobGyerek {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @(),
    [string]$WorkingDirectory = $PSScriptRoot,
    [hashtable]$Kornyezet = @{},
    [bool]$Rejtett = $true,
    [string]$StdoutLog = $null,
    [string]$StderrLog = $null
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ($ArgumentList | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }) -join " "
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $Rejtett

  foreach ($kulcs in $Kornyezet.Keys) {
    $psi.EnvironmentVariables[$kulcs] = [string]$Kornyezet[$kulcs]
  }

  if ($StdoutLog) {
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
  }

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $elindult = $proc.Start()
  if (-not $elindult) {
    throw "Nem indult el: $FilePath"
  }

  if ($StdoutLog) {
    # Aszinkron olvasás fájlba, hogy ne teljen be a cső.
    $stdoutWriter = [System.IO.StreamWriter]::new($StdoutLog, $false, [System.Text.Encoding]::UTF8)
    $stderrWriter = [System.IO.StreamWriter]::new(
      $(if ($StderrLog) { $StderrLog } else { $StdoutLog + ".err" }),
      $false,
      [System.Text.Encoding]::UTF8
    )
    $stdoutWriter.AutoFlush = $true
    $stderrWriter.AutoFlush = $true

    Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -MessageData $stdoutWriter -Action {
      if ($null -ne $EventArgs.Data) {
        $Event.MessageData.WriteLine($EventArgs.Data)
      }
    } | Out-Null

    Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -MessageData $stderrWriter -Action {
      if ($null -ne $EventArgs.Data) {
        $Event.MessageData.WriteLine($EventArgs.Data)
      }
    } | Out-Null

    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()
    $proc | Add-Member -NotePropertyName _StdoutWriter -NotePropertyValue $stdoutWriter -Force
    $proc | Add-Member -NotePropertyName _StderrWriter -NotePropertyValue $stderrWriter -Force
  }

  return $proc
}

$eszkozMappa = Join-Path $PSScriptRoot "eszkozok"
$csakCsomagEszkozok = $env:KEMIA_INDITO_CSAK_ESZKOZOK -eq "1"

function FajlLetoltese([string]$Url, [string]$Cel) {
  $mappa = Split-Path -Parent $Cel
  if (-not (Test-Path -LiteralPath $mappa)) {
    New-Item -ItemType Directory -Path $mappa -Force | Out-Null
  }

  $ideiglenes = "$Cel.reszben"
  Remove-Item -LiteralPath $ideiglenes -Force -ErrorAction SilentlyContinue

  try {
    $progressMentett = $ProgressPreference
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri $Url -OutFile $ideiglenes -UseBasicParsing
    $ProgressPreference = $progressMentett
  } catch {
    Remove-Item -LiteralPath $ideiglenes -Force -ErrorAction SilentlyContinue
    throw $_.Exception.Message
  }

  if (-not (Test-Path -LiteralPath $ideiglenes) -or (Get-Item -LiteralPath $ideiglenes).Length -lt 1000) {
    Remove-Item -LiteralPath $ideiglenes -Force -ErrorAction SilentlyContinue
    throw "A letöltött fájl hiányos vagy üres: $Url"
  }

  Move-Item -LiteralPath $ideiglenes -Destination $Cel -Force
}

function NodeBiztositasa {
  if (-not $csakCsomagEszkozok) {
    $rendszerNode = Get-Command node -ErrorAction SilentlyContinue
    if ($rendszerNode) {
      return $rendszerNode.Source
    }
  }

  $helyiNode = Get-ChildItem -LiteralPath $eszkozMappa -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($helyiNode) {
    return $helyiNode.FullName
  }

  Write-Host "Node.js nem található. Letöltés a tanári csomagba…"
  $nodeVerzio = "v22.14.0"
  $nodeZipNev = "node-$nodeVerzio-win-x64.zip"
  $nodeUrl = "https://nodejs.org/dist/$nodeVerzio/$nodeZipNev"
  $zipCel = Join-Path $eszkozMappa $nodeZipNev
  $kitomoritott = Join-Path $eszkozMappa ("node-$nodeVerzio-win-x64")

  try {
    FajlLetoltese $nodeUrl $zipCel
  } catch {
    Hiba @"
A Node.js automatikus letöltése nem sikerült.
Ellenőrizd az internetkapcsolatot, majd indítsd újra ezt a fájlt.
Részlet: $_
"@
  }

  try {
    if (Test-Path -LiteralPath $kitomoritott) {
      Remove-Item -LiteralPath $kitomoritott -Recurse -Force
    }
    Expand-Archive -LiteralPath $zipCel -DestinationPath $eszkozMappa -Force
    Remove-Item -LiteralPath $zipCel -Force -ErrorAction SilentlyContinue
  } catch {
    Hiba @"
A Node.js kicsomagolása nem sikerült.
Részlet: $_
"@
  }

  $helyiNode = Join-Path $kitomoritott "node.exe"
  if (-not (Test-Path -LiteralPath $helyiNode)) {
    Hiba "A Node.js letöltése után sem találom a node.exe fájlt az eszkozok mappában."
  }

  Write-Host "Node.js kész: $helyiNode"
  return $helyiNode
}

function CloudflaredBiztositasa {
  $jeloltek = @(
    (Join-Path $eszkozMappa "cloudflared-windows-amd64.exe"),
    (Join-Path $PSScriptRoot "cloudflared-windows-amd64.exe"),
    (Join-Path $PSScriptRoot "cloudflared.exe")
  )

  if (-not $csakCsomagEszkozok) {
    $jeloltek += @(
      (Join-Path $env:USERPROFILE "Downloads\cloudflared-windows-amd64.exe"),
      (Join-Path $env:USERPROFILE "Downloads\cloudflared.exe")
    )
  }

  $talalt = $jeloltek | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($talalt) {
    return $talalt
  }

  if (-not $csakCsomagEszkozok) {
    $pathCf = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($pathCf) {
      return $pathCf.Source
    }
  }

  Write-Host "cloudflared nem található. Letöltés a tanári csomagba…"
  $cfCel = Join-Path $eszkozMappa "cloudflared-windows-amd64.exe"
  $cfUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

  try {
    FajlLetoltese $cfUrl $cfCel
  } catch {
    Hiba @"
A cloudflared automatikus letöltése nem sikerült.
Ellenőrizd az internetkapcsolatot, majd indítsd újra ezt a fájlt.
Részlet: $_
"@
  }

  Write-Host "cloudflared kész: $cfCel"
  return $cfCel
}

function TanariBelepesOlvasasa([string]$fajl) {
  $mezok = @{}
  foreach ($sor in Get-Content -LiteralPath $fajl -Encoding UTF8) {
    $t = $sor.Trim()
    if (-not $t -or $t.StartsWith("#")) { continue }
    $i = $t.IndexOf("=")
    if ($i -lt 1) { continue }
    $mezok[$t.Substring(0, $i).Trim().ToUpperInvariant()] = $t.Substring($i + 1).Trim()
  }
  return $mezok
}

$nodeExe = NodeBiztositasa

$szerver = Join-Path $PSScriptRoot "kemia-szerver\szerver.mjs"
if (-not (Test-Path -LiteralPath $szerver)) {
  Hiba "Nem találom a kemia-szerver\szerver.mjs fájlt.`nAz indítót a kicsomagolt tanári mappában kell futtatni."
}

$adatbazis = Join-Path $PSScriptRoot "kemia-szerver\adatok\kemia.sqlite"
$telepites = Join-Path $PSScriptRoot "kemia-szerver\telepites.mjs"
$tanariBelepesFajl = if ($env:KEMIA_TANARI_BELEPES_FAJL) {
  $env:KEMIA_TANARI_BELEPES_FAJL
} else {
  Join-Path $PSScriptRoot "tanari-belepes.helyi"
}

if (-not (Test-Path -LiteralPath $adatbazis)) {
  if (-not (Test-Path -LiteralPath $telepites)) {
    Hiba "Hiányzik a kemia-szerver\telepites.mjs; az első beállítás nem futtatható."
  }

  $jatekAdat = Join-Path $PSScriptRoot "kemia-szerver\jatek-adatok-v1.json"
  if (-not (Test-Path -LiteralPath $jatekAdat)) {
    Hiba "Hiányzik a kemia-szerver\jatek-adatok-v1.json; abból készül az adatbázis."
  }

  Write-Host "Első indítás: helyi adatbázis és tanári fiók létrehozása…"
  $env:KEMIA_TELEPITES_MOD = "tanar"
  & $nodeExe $telepites
  if ($LASTEXITCODE -ne 0) {
    Hiba @"
Az első beállítás (adatbázis + tanári fiók) nem sikerült.
Ellenőrizd, hogy a csomag sértetlen-e, majd indítsd újra.
"@
  }
  Remove-Item Env:KEMIA_TELEPITES_MOD -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $adatbazis)) {
  Hiba "A telepítés után sem található a kemia-szerver\adatok\kemia.sqlite fájl."
}

if (-not (Test-Path -LiteralPath $tanariBelepesFajl)) {
  Hiba @"
Hiányzik a tanári belépési fájl:
$tanariBelepesFajl
Az első beállításnak ezt kellett volna létrehoznia.
"@
}

$tanarEmail = $env:KEMIA_TANAR_EMAIL
$tanarJelszo = $env:KEMIA_TANAR_JELSZO

if (-not $tanarEmail -or -not $tanarJelszo) {
  $mezok = TanariBelepesOlvasasa $tanariBelepesFajl
  if (-not $tanarEmail) { $tanarEmail = $mezok["EMAIL"] }
  if (-not $tanarJelszo) { $tanarJelszo = $mezok["JELSZO"] }
}

if (-not $tanarEmail -or -not $tanarJelszo) {
  Hiba "A tanari-belepes.helyi fájlból nem olvasható ki az EMAIL és a JELSZO."
}

$fiokBiztositas = Join-Path $PSScriptRoot "kemia-szerver\tanari-fiok-biztositas.mjs"
if (Test-Path -LiteralPath $fiokBiztositas) {
  Write-Host "Tanári fiók ellenőrzése az adatbázisban…"
  $env:KEMIA_TANARI_BELEPES_FAJL = $tanariBelepesFajl
  & $nodeExe $fiokBiztositas
  if ($LASTEXITCODE -ne 0) {
    Hiba "A tanári fiók ellenőrzése / frissítése sikertelen."
  }
}

$tesztOrigin = $env:KEMIA_INDITO_TESZT_ORIGIN
$cloudflared = $null
if (-not $tesztOrigin) {
  $cloudflared = CloudflaredBiztositasa
}

PortFoglaltsagJelentese @(3000, 3001)

$job = $null
$tunnelProc = $null
$nodeProc = $null
$tunnelLog = Join-Path $env:TEMP "kemia-tunnel.log"
$tunnelErr = Join-Path $env:TEMP "kemia-tunnel-err.log"
$szerverLog = Join-Path $env:TEMP "kemia-szerver.log"
$szerverErr = Join-Path $env:TEMP "kemia-szerver-err.log"

try {
  $job = New-Object KemiaIndito.JobObject

  $origin = $null

  if ($tesztOrigin) {
    $origin = $tesztOrigin.TrimEnd("/")
    Write-Host "Teszt mód: Cloudflare Tunnel kihagyva."
    Write-Host "Diák origin: $origin"
  } else {
    Remove-Item -LiteralPath $tunnelLog, $tunnelErr -Force -ErrorAction SilentlyContinue

    Write-Host "Cloudflare Quick Tunnel indítása a diákportra (3001)..."
    $tunnelProc = Start-JobGyerek `
      -FilePath $cloudflared `
      -ArgumentList @("tunnel", "--url", "http://127.0.0.1:3001") `
      -WorkingDirectory $PSScriptRoot `
      -Rejtett $true `
      -StdoutLog $tunnelLog `
      -StderrLog $tunnelErr

    $job.AddProcess($tunnelProc)

    Write-Host "Várakozás a nyilvános HTTPS-címre..."
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
      Hiba @"
Nem sikerült kiolvasni a Cloudflare HTTPS-címet.
Ellenőrizd az internetkapcsolatot, majd indítsd újra ezt a fájlt.
"@
    }

    Write-Host "Nyilvános diákcím: $origin"
  }

  Write-Host ""
  Write-Host "Helyi szerver indítása..."
  Remove-Item -LiteralPath $szerverLog, $szerverErr -Force -ErrorAction SilentlyContinue

  $nodeProc = Start-JobGyerek `
    -FilePath $nodeExe `
    -ArgumentList @($szerver) `
    -WorkingDirectory (Join-Path $PSScriptRoot "kemia-szerver") `
    -Kornyezet @{ KEMIA_DIAK_ORIGIN = $origin } `
    -Rejtett $true `
    -StdoutLog $szerverLog `
    -StderrLog $szerverErr

  $job.AddProcess($nodeProc)

  Write-Host "Várakozás a tanári oldalra..."
  $szerverOk = $false
  for ($i = 0; $i -lt 40; $i++) {
    if ($nodeProc.HasExited) { break }
    try {
      $valasz = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" `
        -Headers @{ Origin = "http://127.0.0.1:3000" } `
        -UseBasicParsing -TimeoutSec 2
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
Napló: $szerverLog
"@
  }

  if (-not $env:KEMIA_INDITO_TESZT) {
    Write-Host "Tanári oldal megnyitása..."
    Start-Process "http://127.0.0.1:3000/"
  }

  Write-Host ""
  Write-Host " Tanári belépés"
  Write-Host " --------------"
  Write-Host " E-mail: $tanarEmail"
  Write-Host " Jelszó: $tanarJelszo"
  Write-Host " Írd be ezeket a böngésző tanári belépési mezőibe."
  Write-Host ""
  Write-Host "Kész. A tanár teendői:"
  Write-Host "  1. Belépés a fenti adatokkal"
  Write-Host "  2. Tanóra létrehozása"
  Write-Host "  3. QR-kód kivetítése"
  Write-Host "  4. Játék indítása"
  Write-Host ""
  Write-Host "----------------------------------------------"
  Write-Host " Tanóra leállítása: nyomj Entert ebben az ablakban."
  Write-Host " Az ablak X-szel bezárása is leállítja"
  Write-Host " a Node-szervert és a Cloudflare Tunnelt."
  Write-Host "----------------------------------------------"
  Write-Host ""

  if ($env:KEMIA_INDITO_TESZT -eq "auto-exit") {
    Write-Host "Teszt: automatikus leállítás."
  } elseif ($env:KEMIA_INDITO_TESZT -eq "wait-kill") {
    Write-Host "Teszt: várok külső leállításra (X / taskkill)..."
    while ($true) { Start-Sleep -Seconds 1 }
  } else {
    Read-Host "Tanóra leállítása (Enter)"
  }
}
finally {
  Write-Host ""
  Write-Host "Tanóra leállítása..."

  # A Job Object handle bezárása KILL_ON_JOB_CLOSE
  # miatt leállítja a hozzárendelt folyamatokat.
  if ($null -ne $job) {
    try { $job.Dispose() } catch {}
    $job = $null
  }

  foreach ($p in @($nodeProc, $tunnelProc)) {
    if ($null -eq $p) { continue }
    try {
      if (-not $p.HasExited) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
      }
    } catch {}
    try {
      if ($p._StdoutWriter) { $p._StdoutWriter.Dispose() }
      if ($p._StderrWriter) { $p._StderrWriter.Dispose() }
    } catch {}
  }

  # Rövid várakozás a portok felszabadulására
  for ($i = 0; $i -lt 20; $i++) {
    $marad = PortFoglalok @(3000, 3001) | Where-Object {
      ($nodeProc -and $_.PID -eq $nodeProc.Id) -or
      ($tunnelProc -and $_.PID -eq $tunnelProc.Id)
    }
    if (-not $marad -or $marad.Count -eq 0) { break }
    Start-Sleep -Milliseconds 250
  }

  Write-Host "Leállítva."
  Write-Host ""
}

exit 0
