[CmdletBinding()]
param(
    [switch]$Fix,
    [switch]$SkipRuntimeBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
    if ($Fix) {
        uv run ruff check . --fix
    }

    uv run ruff check .
    uv run pytest
    uv run mypy src
    npm run --prefix editor-runtime typecheck

    if (-not $SkipRuntimeBuild) {
        npm run --prefix editor-runtime build
    }

    if (Test-Path ".git") {
        git status --short
        git diff --stat
    }
}
finally {
    Pop-Location
}
