[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)]
    [string]$Repository,
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) não encontrado."
}

gh auth status | Out-Host
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$issueFiles = Get-ChildItem (Join-Path $repoRoot "docs\issues") -Filter "*.md" | Sort-Object Name

foreach ($file in $issueFiles) {
    $lines = Get-Content $file.FullName
    $titleLine = $lines | Where-Object { $_ -match '^# ' } | Select-Object -First 1
    if (-not $titleLine) {
        throw "Título ausente em $($file.FullName)"
    }
    $title = $titleLine.Substring(2).Trim()
    $body = ($lines | Select-Object -Skip 1) -join [Environment]::NewLine

    if (-not $Execute) {
        Write-Host "DRY-RUN: $title"
        continue
    }

    if ($PSCmdlet.ShouldProcess($Repository, "Criar issue '$title'")) {
        $temp = [System.IO.Path]::GetTempFileName()
        try {
            Set-Content -Path $temp -Value $body -Encoding UTF8
            gh issue create --repo $Repository --title $title --body-file $temp | Out-Host
        }
        finally {
            Remove-Item $temp -Force -ErrorAction SilentlyContinue
        }
    }
}

if (-not $Execute) {
    Write-Host "Nenhuma issue foi criada. Rode novamente com -Execute após revisar a lista."
}
