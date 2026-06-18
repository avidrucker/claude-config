# claude-config

Personal Claude Code configuration: skills, slash commands, user-
scope agents, and reference docs. Cloned into `~/Documents/` (or
wherever) on each machine; symlinks individual items into
`~/.claude/` so the user-installed customisations travel across
computers without disturbing per-machine state.

## What's here, what's not

| Lives in this repo | Lives elsewhere |
|---|---|
| `skills/` — 13 personally-authored skills | Work/stack skills → sibling repo `claude-config-work` (Fulcro/Clojure/Datomic) |
| `commands/` — user-scope slash commands | Anthropic-bundled skills (docx, pdf, pptx, etc.) → `~/Documents/anthropic-skills/` |
| `agents/` — user-scope agents (empty for now) | Matt Pocock's 16 skills (installed separately; see below) |
| `reference/` — overview docs that explain the skill ecosystem | Anthropic's marketplace plugins (auto-managed by Claude Code) |
|  | Project-scoped agents (live in each project's `.claude/agents/`) |
|  | `~/.claude/settings.json` — per-machine, not synced |

> **Repo split (2026-06-17):** this repo originally carried 42 skills. The
> Fulcro/Clojure/Datomic stack skills + a work-specific issue-tracker workflow
> moved to a private sibling repo `claude-config-work`, and the Anthropic-bundled skills
> (proprietary-licensed, also available from the marketplace) moved to a plain
> `~/Documents/anthropic-skills/` folder. Both are symlinked into
> `~/.claude/skills/` alongside this repo's skills, so all of them still work
> on each machine — they're just version-controlled separately.

### Why not include Pocock's skills?

His skill ecosystem is maintained upstream at
`mattpocock/skills`. Cloning his skills into THIS repo would create
a fork that drifts from his updates. Strategy: run his installer
(`npx skills@latest add mattpocock/skills`) once per fresh machine
to pull his current 16 from upstream into `~/.claude/skills/`.

### Why per-item symlinks rather than whole-dir symlinks?

If `~/.claude/skills/` were a single symlink to `<repo>/skills/`,
Pocock's installer would write into the symlinked dir (which is THIS
repo), polluting the repo with his skills. Per-item symlinks
(`~/.claude/skills/X` → `<repo>/skills/X` for each of our skills)
let Pocock's skills coexist as real dirs in `~/.claude/skills/`.

## Bootstrap (fresh machine)

Use this path when `~/.claude/skills/` does NOT yet contain real
directories that overlap with this repo. If it does (e.g. you've been
using Claude Code on the machine for a while), see **"Existing
machine (migration)"** below instead.

### Prerequisites — all machines

- **Git** (any recent version)
- **GitHub access** — either an SSH key configured for `github.com`
  (recommended; matches the `git@github.com:...` URLs below) OR a
  PAT via `gh auth login` if you'd rather use HTTPS
- **Node.js** (for the `npx skills@latest add mattpocock/skills`
  step — only needed if you want Pocock's skills)

### Prerequisites — Windows-specific

**Enable Developer Mode** before running `install.ps1`:

1. Open Settings (`Win + I`)
2. Privacy & security → For developers
3. Toggle **Developer Mode** ON

No restart required. This grants the
`SeCreateSymbolicLinkPrivilege` to your user account, which the
install script needs to create symlinks without elevation.

Alternative: skip Dev Mode and run `install.ps1` from a PowerShell
window opened **as Administrator** instead. Symlinks created by an
admin session remain readable by non-admin sessions, so this is a
one-time cost.

If neither is available, `install.ps1` detects the failure and
offers to switch to `-CopyMode` (copies files instead of
symlinking). Copy mode works but breaks the auto-sync property —
edits made on the machine no longer flow back to the repo
automatically; you'd have to manually copy them back and `git pull`
on every refresh.

### Windows

```powershell
# 1. Clone this repo
cd ~\Documents
git clone git@github.com:avidrucker/claude-config.git
cd claude-config

# 2. Install Pocock's 16 skills upstream (optional but recommended)
#    Lives in ~/.claude/skills/ as real dirs, NOT inside this repo
npx skills@latest add mattpocock/skills

# 3. Symlink this repo's content into ~/.claude/
.\install.ps1
```

Expected output: per-skill `[link]` lines (13 of them), then a
`[link]` line for the one command, then "Done." A "Next steps"
block at the bottom reminds you about Pocock's installer if you
skipped step 2.

### macOS / Linux

```bash
# 1. Clone
cd ~/Documents       # or wherever you keep repos
git clone git@github.com:avidrucker/claude-config.git
cd claude-config

# 2. Install Pocock's skills
npx skills@latest add mattpocock/skills

# 3. Symlink into ~/.claude/
./install.sh
```

POSIX symlinks need no special privileges.

### Verify

After the install script finishes, confirm the symlinks landed:

```powershell
# Windows
Get-ChildItem ~/.claude/skills -Directory `
  | Where-Object { $_.LinkType -eq 'SymbolicLink' } `
  | Measure-Object | Select-Object -ExpandProperty Count
# Should print 13 (this repo's skills) — more if the work repo /
# anthropic-skills / Pocock are also linked into ~/.claude/skills

Get-Item ~/.claude/commands/font-change.md | Select-Object LinkType,Target
# Should show LinkType=SymbolicLink, Target pointing into this repo
```

```bash
# macOS / Linux
ls -la ~/.claude/skills/ | grep -c '^l'   # symlink count
readlink ~/.claude/commands/font-change.md
```

Then open Claude Code in any project and invoke a slash command
(`/fulcro`, `/grill-me`, etc.) — should work transparently.

## Existing machine (migration)

If `~/.claude/skills/` already has real directories that overlap
with `<repo>/skills/` (typical after using Claude Code for a while
on a machine BEFORE adopting this repo), use the migration utility
instead of running `install.ps1` directly. The migration script
checks that each existing real dir is byte-identical to its repo
counterpart before deleting + symlinking, so you can't accidentally
lose local edits.

```powershell
# Windows — run from this repo's root
cd ~\Documents\claude-config
.\bin\migrate-existing-skills.ps1 -DryRun    # preview, no changes
.\bin\migrate-existing-skills.ps1            # do it
```

Per-skill outcomes:
- **`[migrate]`** — existing real dir was identical to repo, replaced with symlink
- **`[link new]`** — no existing dir, plain symlink created
- **`[skip]`** — already a correct symlink, no-op
- **`[DIFF]`** — content differs from repo, **aborted for that one item** (no destructive action); reconcile manually before re-running

The migration is idempotent and re-runnable — you can run it again
after a `git pull` to pick up new skills the repo gained.

POSIX equivalent script isn't shipped yet; if you need it on macOS/
Linux, file an issue or write one along the same shape (drop a real
dir if `diff -r src dst` is silent; create a symlink either way).

## Troubleshooting

**`install.ps1` aborts with "Cannot create symlinks."**
Developer Mode isn't on AND you're not in an admin PowerShell. See
Prerequisites — Windows-specific above.

**Skill content didn't refresh after `git pull`.**
You're probably in `-CopyMode` (or symlinks were silently
overwritten by a copy at some point). Re-run `install.ps1` — it
prints `[skip]` for already-correct symlinks and re-links anything
that drifted.

**A skill is missing after install.**
Check the corresponding `skills/<name>/` exists in this repo's
working tree. If `git status` is clean and the dir exists, run the
install script with `-Verbose` (or look at the script output for a
`[WARN]` on that specific item). Most common cause: an existing
non-symlink at the target that the script refused to clobber.

**Pocock's installer (`npx skills@latest add mattpocock/skills`)
fails or the package moves.**
Check `mattpocock/skills` upstream for the current install recipe —
the package name or invocation may have changed.

**Symlinks broke after a Windows backup-restore or filesystem
operation.**
Run `.\bin\migrate-existing-skills.ps1` — its symlink-vs-real-dir
detection re-establishes the right shape. Or just re-run
`install.ps1` if the targets are missing entirely.

## What's NOT included (deliberately)

- **`settings.json` / `settings.local.json`** — per-machine. May
  contain local paths, API keys, allow-lists, default model
  preferences. Set up these manually per machine; reference what
  you usually have via a `settings.example.json` you can add later.
- **`cache/` / `sessions/` / `history.jsonl` / `tasks/` /
  `telemetry/` / `paste-cache/` / `shell-snapshots/`** — runtime
  state. The `.gitignore` here is defensive against accidentally
  committing any of these if you ever copy this repo into
  `~/.claude/` directly.
- **`projects/`** — per-machine session data Claude Code writes
  for each project you've opened. Not portable.

## Updating a skill

1. Edit the skill in `~/.claude/skills/<name>/SKILL.md` (or wherever
   the symlink points — same place from your shell's POV).
2. Edits are visible in this repo as pending git changes:
   `git status`.
3. Commit + push as normal. Other machines pick up the change via
   `git pull` (no re-install needed; the symlinks already point
   here).

## Adding a new skill

1. `cd skills/` in this repo, create the new skill dir +
   `SKILL.md`.
2. `git add` + commit + push.
3. On THIS machine, re-run `install.ps1` / `install.sh` — the
   installer is idempotent and adds new symlinks for new items.
4. On OTHER machines, `git pull` + re-run the install script.

## Adding a new user-scope agent

Same flow as a skill — put the file in `agents/` (project root),
commit, push, re-run installer. Future user-scope agents live in
`agents/`; project-scoped agents continue to live in each project's
own `.claude/agents/`.

## Reference

The `reference/` dir has two docs that explain the broader ecosystem:

- `link-agent-skills.md` — how agents and skills compose.
- `matt-pocock-skills-overview.md` — annotated index of Pocock's 16
  skills, what each assumes about the project structure.

These travel with the repo for cross-machine reference. They're not
installed into `~/.claude/` directly by the bootstrap script.

## License

[MIT](LICENSE) © 2026 Avi Drucker.
