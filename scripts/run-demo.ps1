[CmdletBinding()]
param(
    [ValidateRange(0, 65535)]
    [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
    if (-not (Get-Command "uv" -ErrorAction SilentlyContinue)) {
        throw "Required command not found: uv"
    }

    Write-Host "Starting local demo and visual editor..."
    & uv run python -m webdesign_ai_editor demo --port $Port
    if ($LASTEXITCODE -ne 0) {
        throw "Demo launcher failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
