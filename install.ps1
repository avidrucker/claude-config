# install.ps1 — bootstrap claude-config on a Windows machine.
#
# Idempotent. Per-item symlinks (skill / command / agent) rather than
# whole-dir symlinks, so other skills (Pocock's, the work repo's,
# anthropic-skills, marketplace) coexist in ~/.claude/skills/ without
# either side clobbering the other.
#
# Usage (PowerShell):
#   .\install.ps1                # default: symlink mode
#   .\install.ps1 -CopyMode      # fallback for machines without dev-mode/admin
#   .\install.ps1 -DryRun        # show what would be done; no changes
#
# Requirements for symlink mode:
#   - Windows Developer Mode ON  (Settings → Privacy & security → For developers → Developer Mode)
#   OR
#   - PowerShell running as Administrator
#
# Without one of those, New-Item -ItemType SymbolicLink fails with an
# access-denied error on Windows. The script detects this case and
# offers to switch to -CopyMode.

param(
    [switch]$CopyMode,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Resolve repo root (the directory this script lives in).
$RepoRoot      = $PSScriptRoot
$ClaudeRoot    = Join-Path $HOME '.claude'
$ClaudeSkills  = Join-Path $ClaudeRoot 'skills'
$ClaudeCmds    = Join-Path $ClaudeRoot 'commands'
$ClaudeAgents  = Join-Path $ClaudeRoot 'agents'

Write-Host ""
Write-Host "claude-config installer" -ForegroundColor Cyan
Write-Host "  Repo:           $RepoRoot"
Write-Host "  Target root:    $ClaudeRoot"
if ($DryRun)   { Write-Host "  Mode:           DRY RUN (no changes)" -ForegroundColor Yellow }
elseif ($CopyMode) { Write-Host "  Mode:           COPY (no symlinks)" -ForegroundColor Yellow }
else           { Write-Host "  Mode:           SYMLINK" -ForegroundColor Green }
Write-Host ""

# Quick symlink-permission probe. Tries to create a symlink in $env:TEMP;
# if it fails the user almost certainly lacks dev-mode / admin.
function Test-CanSymlink {
    $probeSrc = Join-Path $env:TEMP "claude-config-symlink-probe-target.txt"
    $probeDst = Join-Path $env:TEMP "claude-config-symlink-probe-link.txt"
    Set-Content -Path $probeSrc -Value 'probe' -NoNewline -Force
    try {
        Remove-Item $probeDst -Force -ErrorAction SilentlyContinue
        $null = New-Item -ItemType SymbolicLink -Path $probeDst -Target $probeSrc -ErrorAction Stop
        Remove-Item $probeDst -Force -ErrorAction SilentlyContinue
        Remove-Item $probeSrc -Force -ErrorAction SilentlyContinue
        return $true
    } catch {
        Remove-Item $probeSrc -Force -ErrorAction SilentlyContinue
        return $false
    }
}

if (-not $CopyMode -and -not $DryRun) {
    if (-not (Test-CanSymlink)) {
        Write-Host "  [WARN] Cannot create symlinks." -ForegroundColor Yellow
        Write-Host "  Enable Developer Mode (Settings -> Privacy & security ->"
        Write-Host "  For developers -> Developer Mode) and rerun, OR pass"
        Write-Host "  -CopyMode to copy files instead." -ForegroundColor Yellow
        Write-Host ""
        $answer = Read-Host "Switch to COPY mode for this run? [y/N]"
        if ($answer -notmatch '^(y|yes)$') { exit 1 }
        $CopyMode = $true
    }
}

# Ensure target dirs exist.
if (-not $DryRun) {
    foreach ($dir in @($ClaudeRoot, $ClaudeSkills, $ClaudeCmds, $ClaudeAgents)) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir"
        }
    }
}

function Install-Item {
    param(
        [string]$Source,   # path inside this repo
        [string]$Target    # path under ~/.claude
    )
    $name = Split-Path $Source -Leaf

    if (Test-Path $Target) {
        # Check whether $Target is already a symlink pointing at our source.
        $existing = Get-Item -LiteralPath $Target -Force -ErrorAction SilentlyContinue
        if ($existing -and $existing.LinkType -eq 'SymbolicLink' -and $existing.Target -eq $Source) {
            Write-Host "  [skip] $name (already linked)" -ForegroundColor DarkGray
            return
        }
        Write-Host "  [WARN] $Target exists and is NOT a symlink to our source." -ForegroundColor Yellow
        Write-Host "         Move it aside before rerunning, OR pass -CopyMode to overwrite."
        if (-not $CopyMode) { return }
    }

    if ($DryRun) {
        Write-Host "  [dry] would $(if ($CopyMode) {'copy'} else {'symlink'}): $name"
        return
    }

    if ($CopyMode) {
        if (Test-Path $Target) { Remove-Item $Target -Recurse -Force }
        if ((Get-Item $Source).PSIsContainer) {
            Copy-Item -Path $Source -Destination $Target -Recurse -Force
        } else {
            Copy-Item -Path $Source -Destination $Target -Force
        }
        Write-Host "  [copy] $name" -ForegroundColor Green
    } else {
        New-Item -ItemType SymbolicLink -Path $Target -Target $Source | Out-Null
        Write-Host "  [link] $name" -ForegroundColor Green
    }
}

# Install each skill.
Write-Host ""
Write-Host "Skills ($((Get-ChildItem (Join-Path $RepoRoot 'skills') -Directory).Count)):" -ForegroundColor Cyan
foreach ($skill in Get-ChildItem (Join-Path $RepoRoot 'skills') -Directory) {
    Install-Item -Source $skill.FullName -Target (Join-Path $ClaudeSkills $skill.Name)
}

# Install each command.
Write-Host ""
Write-Host "Commands:" -ForegroundColor Cyan
foreach ($cmd in Get-ChildItem (Join-Path $RepoRoot 'commands') -File) {
    Install-Item -Source $cmd.FullName -Target (Join-Path $ClaudeCmds $cmd.Name)
}

# Install each user-scope agent (currently empty, but future-proof).
Write-Host ""
Write-Host "Agents:" -ForegroundColor Cyan
$agentsDir = Join-Path $RepoRoot 'agents'
$agentFiles = Get-ChildItem $agentsDir -File -ErrorAction SilentlyContinue
if ($agentFiles) {
    foreach ($agent in $agentFiles) {
        Install-Item -Source $agent.FullName -Target (Join-Path $ClaudeAgents $agent.Name)
    }
} else {
    Write-Host "  (none in repo yet)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. If this is a fresh machine, install Pocock's 16 skills via:"
Write-Host "       npx skills@latest add mattpocock/skills"
Write-Host "  2. Reference docs are in $RepoRoot\reference\ — symlink or copy"
Write-Host "     as you prefer."
Write-Host "  3. settings.json is per-machine; not synced. See"
Write-Host "     $RepoRoot\README.md for the conventions."
