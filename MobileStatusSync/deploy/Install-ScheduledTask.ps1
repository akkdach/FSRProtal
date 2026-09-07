<#
.SYNOPSIS
  Registers (or re-registers) the Windows Task Scheduler job that runs MobileStatusSync every N minutes.

.DESCRIPTION
  Run ON THE VM as Administrator after copying the publish output to $InstallDir.
  - Prefers MobileStatusSync.exe (apphost). Falls back to "dotnet MobileStatusSync.dll" if the exe is missing.
  - MultipleInstances = IgnoreNew  -> a slow run is never overlapped by the next trigger.
  - Runs as SYSTEM (no password to rotate). Use -RunAsUser/-Credential for a domain account with SQL rights instead.

.EXAMPLE
  .\Install-ScheduledTask.ps1                                   # C:\Services\MobileStatusSync, every 60 min (default)
  .\Install-ScheduledTask.ps1 -IntervalMinutes 5                # ทุก 5 นาที
  .\Install-ScheduledTask.ps1 -RunAsUser "BEVPRO\svc_fsr" -Credential (Get-Credential)
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "C:\Services\MobileStatusSync",
    [string]$TaskName = "MobileStatusSync",
    [int]$IntervalMinutes = 60,
    [int]$ExecutionTimeLimitMinutes = 20,
    [string]$RunAsUser = "SYSTEM",
    [System.Management.Automation.PSCredential]$Credential
)

$ErrorActionPreference = "Stop"

$exe = Join-Path $InstallDir "MobileStatusSync.exe"
$dll = Join-Path $InstallDir "MobileStatusSync.dll"

if (Test-Path $exe) {
    $action = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $InstallDir
    Write-Host "Action: $exe"
} elseif (Test-Path $dll) {
    $dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
    if (-not $dotnet) { throw "MobileStatusSync.exe not found and 'dotnet' is not on PATH. Install the .NET 8 Runtime or publish with -r win-x64." }
    $action = New-ScheduledTaskAction -Execute $dotnet -Argument "`"$dll`"" -WorkingDirectory $InstallDir
    Write-Host "Action: $dotnet $dll"
} else {
    throw "Neither $exe nor $dll exists. Copy the publish output to $InstallDir first."
}

if (-not (Test-Path (Join-Path $InstallDir "appsettings.json"))) { throw "appsettings.json missing in $InstallDir" }
if (-not (Test-Path (Join-Path $InstallDir "appsettings.Production.json"))) {
    Write-Warning "appsettings.Production.json not found in $InstallDir — the job will fail with CONFIG ERROR until secrets are provided (file or MSS_* env vars)."
}

# Start now-ish, repeat forever every N minutes.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes $ExecutionTimeLimitMinutes) `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 0

if ($RunAsUser -eq "SYSTEM") {
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
    if (-not $Credential) { $Credential = Get-Credential -UserName $RunAsUser -Message "Password for $RunAsUser (task runs whether user is logged on or not)" }
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
        -User $Credential.UserName -Password $Credential.GetNetworkCredential().Password -RunLevel Highest -Force | Out-Null
}

Write-Host ""
Write-Host "Registered task '$TaskName': every $IntervalMinutes min, working dir $InstallDir, runs as $RunAsUser" -ForegroundColor Green
Write-Host "Check:   Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
Write-Host "Run now: Start-ScheduledTask -TaskName $TaskName"
Write-Host "Logs:    $InstallDir\logs\mobile-status-sync-<yyyyMMdd>.log"
