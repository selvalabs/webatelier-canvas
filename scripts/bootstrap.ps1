[CmdletBinding()]
param(
    [switch]$SkipBrowserInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot
try {
    foreach ($command in @("uv", "node", "npm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Comando obrigatório não encontrado: $command"
        }
    }

    uv sync --extra dev
    npm ci --prefix editor-runtime
    npm run --prefix editor-runtime typecheck
    npm run --prefix editor-runtime build

    if (-not $SkipBrowserInstall) {
        uv run playwright install chromium
    }

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Criado .env a partir de .env.example. Confira WDA_OLLAMA_MODEL."
    }

    Write-Host "Bootstrap concluído. Execute: uv run wda doctor"
}
finally {
    Pop-Location
}
