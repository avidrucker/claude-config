# bin/migrate-existing-skills.ps1 --one-shot migration for a machine
# whose ~/.claude/skills/ contains REAL directories that overlap with
# this repo's `skills/`.
#
# Use case: you've been using Claude Code on a machine for a while,
# accumulated skills, and now want to consolidate them under this
# repo's symlink-based sync model. This script:
#
#   1. For each skill in <repo>/skills/, verifies ~/.claude/skills/<name>
#      matches the repo's copy byte-for-byte (via robocopy /L /MIR).
#   2. If they match: deletes the real dir, then creates a symlink
#      pointing into the repo.
#   3. If they differ: prints the diff and aborts (no destructive
#      action) so you can reconcile manually.
#
# Idempotent: a skill already correctly symlinked is reported and
# skipped. Symlink mode requires Windows Developer Mode OR running
# PowerShell as Administrator.
#
# Usage:
#   .\bin\migrate-existing-skills.ps1            # do it
#   .\bin\migrate-existing-skills.ps1 -DryRun    # show plan, no changes

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$RepoRoot     = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ClaudeRoot   = Join-Path $HOME '.claude'
$ClaudeSkills = Join-Path $ClaudeRoot 'skills'
$ClaudeCmds   = Join-Path $ClaudeRoot 'commands'

Write-Host ""
Write-Host "migrate-existing-skills" -ForegroundColor Cyan
Write-Host "  Repo:    $RepoRoot"
Write-Host "  Target:  $ClaudeSkills"
if ($DryRun) { Write-Host "  Mode:    DRY RUN" -ForegroundColor Yellow }
Write-Host ""

# Permission probe (same logic as install.ps1).
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

if (-not $DryRun -and -not (Test-CanSymlink)) {
    Write-Host "  [FAIL] Cannot create symlinks." -ForegroundColor Red
    Write-Host "  Enable Developer Mode (Settings -> Privacy & security ->" -ForegroundColor Red
    Write-Host "  For developers -> Developer Mode) and rerun." -ForegroundColor Red
    exit 2
}

# robocopy with /L (list-only) and /MIR shows files that DIFFER between
# two trees. We piggyback on its exit code: 0 = identical, anything
# else = differences exist.
function Compare-Tree {
    param([string]$Src, [string]$Dst)
    # /L = list, /MIR = mirror (catches deletions too), /NP = no
    # progress, /NJH /NJS = no job header / summary, /XX = exclude
    # extras in source (otherwise reports them as "would-delete-from-dest").
    # Wait --we want to know if src and dst are identical. Use
    # /L /MIR /NJH /NJS --anything in the output means a difference.
    $output = robocopy $Src $Dst /L /MIR /NP /NJH /NJS /NDL /NFL 2>&1
    # robocopy exit codes: 0 = identical, 1+ = differences. But the
    # output is more reliable for our purposes --count lines that look
    # like file ops.
    $diffs = $output | Where-Object { $_ -match 'New File|Newer|Older|\*EXTRA|\*MISMATCH' }
    return @{
        Identical = ($diffs.Count -eq 0)
        DiffLines = $diffs
    }
}

$migrated = 0
$skipped  = 0
$aborted  = 0
$problems = @()

Write-Host "Skills:" -ForegroundColor Cyan
foreach ($skillDir in Get-ChildItem (Join-Path $RepoRoot 'skills') -Directory) {
    $name   = $skillDir.Name
    $repoSrc = $skillDir.FullName
    $target  = Join-Path $ClaudeSkills $name

    if (-not (Test-Path $target)) {
        # No existing dir --straightforward link.
        if ($DryRun) {
            Write-Host "  [dry] would link (new): $name" -ForegroundColor DarkCyan
        } else {
            $null = New-Item -ItemType SymbolicLink -Path $target -Target $repoSrc
            Write-Host "  [link new] $name" -ForegroundColor Green
            $migrated++
        }
        continue
    }

    $existing = Get-Item -LiteralPath $target -Force
    if ($existing.LinkType -eq 'SymbolicLink') {
        if ($existing.Target -eq $repoSrc) {
            Write-Host "  [skip] $name (already linked)" -ForegroundColor DarkGray
            $skipped++
        } else {
            Write-Host "  [WARN] $name is a symlink to a different target: $($existing.Target)" -ForegroundColor Yellow
            $problems += $name
        }
        continue
    }

    # Real directory exists. Compare contents.
    $cmp = Compare-Tree -Src $target -Dst $repoSrc
    if (-not $cmp.Identical) {
        Write-Host "  [DIFF] $name --contents differ from repo. Aborting this skill." -ForegroundColor Red
        $cmp.DiffLines | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
        $problems += $name
        $aborted++
        continue
    }

    # Identical --safe to migrate.
    if ($DryRun) {
        Write-Host "  [dry] would migrate (identical): $name" -ForegroundColor DarkCyan
    } else {
        Remove-Item -Path $target -Recurse -Force
        $null = New-Item -ItemType SymbolicLink -Path $target -Target $repoSrc
        Write-Host "  [migrate] $name" -ForegroundColor Green
        $migrated++
    }
}

# Same migration for commands.
Write-Host ""
Write-Host "Commands:" -ForegroundColor Cyan
foreach ($cmdFile in Get-ChildItem (Join-Path $RepoRoot 'commands') -File) {
    $name    = $cmdFile.Name
    $repoSrc = $cmdFile.FullName
    $target  = Join-Path $ClaudeCmds $name

    if (-not (Test-Path $target)) {
        if ($DryRun) {
            Write-Host "  [dry] would link (new): $name" -ForegroundColor DarkCyan
        } else {
            $null = New-Item -ItemType SymbolicLink -Path $target -Target $repoSrc
            Write-Host "  [link new] $name" -ForegroundColor Green
            $migrated++
        }
        continue
    }

    $existing = Get-Item -LiteralPath $target -Force
    if ($existing.LinkType -eq 'SymbolicLink') {
        Write-Host "  [skip] $name (already linked)" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    # Hash compare for single files.
    $hashTarget = (Get-FileHash $target -Algorithm SHA256).Hash
    $hashRepo   = (Get-FileHash $repoSrc -Algorithm SHA256).Hash
    if ($hashTarget -ne $hashRepo) {
        Write-Host "  [DIFF] $name --content differs from repo. Aborting." -ForegroundColor Red
        $problems += $name
        $aborted++
        continue
    }

    if ($DryRun) {
        Write-Host "  [dry] would migrate (identical): $name" -ForegroundColor DarkCyan
    } else {
        Remove-Item -Path $target -Force
        $null = New-Item -ItemType SymbolicLink -Path $target -Target $repoSrc
        Write-Host "  [migrate] $name" -ForegroundColor Green
        $migrated++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Migrated:  $migrated"
Write-Host "  Skipped:   $skipped (already linked)"
Write-Host "  Aborted:   $aborted (content drift)"
if ($problems.Count -gt 0) {
    Write-Host ""
    Write-Host "  Items needing manual attention:" -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "  For each: decide whether to keep the local version (copy"
    Write-Host "  into the repo + commit) OR the repo version (delete the"
    Write-Host "  local dir + rerun this script)."
}
