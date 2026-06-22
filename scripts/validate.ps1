[CmdletBinding()]
param(
    [switch]$Fix,
    [switch]$SkipRuntimeBuild
)

$ErrorActionPreference = "Stop"
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
    if ($Fix) {
        Invoke-NativeCommand "uv" @("run", "python", "-m", "ruff", "check", ".", "--fix")
    }

    Invoke-NativeCommand "uv" @("run", "python", "-m", "ruff", "check", ".")
    Invoke-NativeCommand "uv" @("run", "python", "-m", "pytest")
    Invoke-NativeCommand "uv" @("run", "python", "-m", "mypy", "src")
    Invoke-NativeCommand "npm" @("run", "--prefix", "editor-runtime", "typecheck")

    if (-not $SkipRuntimeBuild) {
        Invoke-NativeCommand "npm" @("run", "--prefix", "editor-runtime", "build")
    }

    if (Test-Path ".git") {
        git status --short
        git diff --stat
    }
}
finally {
    Pop-Location
}
