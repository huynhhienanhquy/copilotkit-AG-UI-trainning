# Install codex-agent-kit git hooks into the current repository (Windows PowerShell).
# Run from the repository root: .\scripts\hooks\install_hooks.ps1

param([string]$RepoRoot = '.')

$ErrorActionPreference = 'Stop'
$gitDir = git rev-parse --git-dir 2>$null
if (-not $gitDir) { Write-Error 'Not inside a git repository.'; exit 1 }

$hookSrc  = Join-Path $PSScriptRoot 'pre-commit'
$hookDest = Join-Path $gitDir 'hooks\pre-commit'
New-Item -ItemType Directory -Force -Path (Split-Path $hookDest) | Out-Null
Copy-Item -Path $hookSrc -Destination $hookDest -Force
Write-Host "Installed pre-commit hook into $hookDest" -ForegroundColor Green
