<#
.SYNOPSIS
  Removes the MobileStatusSync scheduled task (files and logs are left in place).
#>
[CmdletBinding()]
param([string]$TaskName = "MobileStatusSync")

$ErrorActionPreference = "Stop"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) { Write-Host "Task '$TaskName' not found — nothing to do."; exit 0 }

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Task '$TaskName' removed." -ForegroundColor Green
