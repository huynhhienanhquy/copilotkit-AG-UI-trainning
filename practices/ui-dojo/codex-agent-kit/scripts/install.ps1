#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Install Codex Agent Kit into a target repository.
.DESCRIPTION
    Copy kit files, including scripts and generated IDE instructions.
    Existing files are preserved unless Sync is specified. No automatic rebuild runs.
.PARAMETER Target
    Path to the target repository root. Defaults to the current directory.
.PARAMETER Sync
    Overwrite matching existing files without prompting; do not delete extra files.
.EXAMPLE
    .\scripts\install.ps1 -Target C:\projects\my-repo
#>
param(
    [string]$Target = '.',
    [switch]$Sync
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$KitRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $Target)) {
    New-Item -ItemType Directory -Force -Path $Target | Out-Null
}
$TargetPath = (Resolve-Path -LiteralPath $Target).Path
if ($TargetPath -eq $KitRoot) {
    throw 'Target must differ from the kit source directory.'
}

Write-Host "Installing Codex Agent Kit into: $TargetPath" -ForegroundColor Cyan

function Install-KitFile {
    <# Copy a kit-relative file, preserving content unless -Sync was passed.
       Creates parent directories; copy errors stop installation. #>
    param([string]$RelativePath)
    $src = Join-Path $KitRoot $RelativePath
    $dst = Join-Path $TargetPath $RelativePath
    if ((Test-Path -LiteralPath $dst) -and -not $Sync) {
        Write-Host "  Skipped: $RelativePath (use -Sync to overwrite)" -ForegroundColor Yellow
        return
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

$dirs = @('.agents\skills', 'agents', 'rules', 'workflows', 'examples', 'templates', 'scripts', 'guides')
foreach ($d in $dirs) {
    $src = Join-Path $KitRoot $d
    New-Item -ItemType Directory -Force -Path (Join-Path $TargetPath $d) | Out-Null
    foreach ($file in Get-ChildItem -LiteralPath $src -Recurse -File -Force) {
        $relativePath = $file.FullName.Substring($KitRoot.Length + 1)
        if (($relativePath -split '[\\/]') -contains '__pycache__') { continue }
        Install-KitFile $relativePath
    }
    Write-Host "  Copied dir: $d" -ForegroundColor Green
}

$files = @('AGENTS.md', 'definition-of-done.md', '.cursorrules', '.clinerules', '.github/copilot-instructions.md')
foreach ($f in $files) { Install-KitFile $f }

# Regeneration is explicit because it would replace files preserved above.
Write-Host "Done. Codex Agent Kit installed into $TargetPath" -ForegroundColor Cyan
Write-Host 'After editing rules, run python scripts/build_agents_md.py from the target repository.'
