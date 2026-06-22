[CmdletBinding()]
param(
    [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$demoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\examples\demo")).Path
Write-Host "Demo: http://127.0.0.1:$Port"
Push-Location $demoRoot
try {
    python -m http.server $Port --bind 127.0.0.1
}
finally {
    Pop-Location
}
