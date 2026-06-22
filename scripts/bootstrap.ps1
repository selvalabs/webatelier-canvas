[CmdletBinding()]
param(
    [switch]$SkipBrowserInstall,
    [switch]$SkipRuntimeBuild,
    [string]$PythonIndexUrl = "https://pypi.org/simple",
    [string]$NpmRegistry = "https://registry.npmjs.org/"
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
    foreach ($command in @("uv", "node", "npm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Required command not found: $command"
        }
    }

    foreach ($name in @(
        "PIP_INDEX_URL",
        "PIP_EXTRA_INDEX_URL",
        "UV_INDEX_URL",
        "UV_EXTRA_INDEX_URL",
        "UV_DEFAULT_INDEX"
    )) {
        Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    }

    $env:npm_config_registry = $NpmRegistry

    Write-Host "Installing Python application and development dependencies..."
    Invoke-NativeCommand "uv" @(
        "sync",
        "--all-extras",
        "--all-groups",
        "--default-index",
        $PythonIndexUrl
    )

    if ($env:OS -eq "Windows_NT") {
        try {
            Invoke-NativeCommand "uv" @("run", "python", "-m", "mypy", "--version")
        }
        catch {
            Write-Warning "The mypy wheel was blocked. Rebuilding mypy from source..."
            Invoke-NativeCommand "uv" @(
                "pip",
                "install",
                "--reinstall",
                "--no-binary",
                "mypy",
                "--index-url",
                $PythonIndexUrl,
                "mypy"
            )
        }
    }

    Write-Host "Installing editor runtime dependencies..."
    try {
        Invoke-NativeCommand "npm" @(
            "ci",
            "--prefix",
            "editor-runtime",
            "--no-audit",
            "--no-fund"
        )
    }
    catch {
        Write-Warning "npm ci failed. Cleaning node_modules and retrying with npm install..."
        Remove-Item -Recurse -Force "editor-runtime\node_modules" -ErrorAction SilentlyContinue
        Invoke-NativeCommand "npm" @(
            "install",
            "--prefix",
            "editor-runtime",
            "--no-audit",
            "--no-fund"
        )
    }

    Invoke-NativeCommand "npm" @("run", "--prefix", "editor-runtime", "typecheck")
    if (-not $SkipRuntimeBuild) {
        Invoke-NativeCommand "npm" @("run", "--prefix", "editor-runtime", "build")
    }

    if (-not $SkipBrowserInstall) {
        Write-Host "Installing Playwright Chromium..."
        Invoke-NativeCommand "uv" @(
            "run",
            "python",
            "-m",
            "playwright",
            "install",
            "chromium"
        )
    }

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example. Check WDA_OLLAMA_MODEL."
    }

    Write-Host "Bootstrap complete. Run: uv run python -m webdesign_ai_editor doctor"
    Write-Host "Start the bundled demo with: .\scripts\run-demo.ps1"
}
finally {
    Pop-Location
}
