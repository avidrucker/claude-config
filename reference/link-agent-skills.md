# Linking `skills` CLI installs into Claude Code

The `skills` CLI (e.g. `npx skills@latest add mattpocock/skills`) installs
skills to `~/.agents/skills/` so they work across many AI agents.

Claude Code, however, **only reads from `~/.claude/skills/`** (global) or
`<project>/.claude/skills/` (project-local). There is no setting to add
extra discovery paths.

To bridge the two, we junction each skill folder from `~/.agents/skills/`
into `~/.claude/skills/`. Junctions are Windows directory aliases:

- Claude sees the skill as if it lived in `~/.claude/skills/`.
- The actual files remain at `~/.agents/skills/`, so re-running the
  `skills` CLI to update flows through automatically — **no re-copy
  needed**.
- No admin rights required (unlike symlinks).
- `rmdir ~/.claude/skills/<name>` removes only the junction, leaving
  the real files untouched.

## The script

Lives at `~/.claude/scripts/link-agent-skills.ps1`. Safe to re-run —
existing junctions are skipped, only new skills are linked.

## When to run it

1. **After installing new skills** via `npx skills@latest add <pkg>`
   (or any other `skills` CLI invocation that adds new top-level
   folders under `~/.agents/skills/`).
2. **After updates that introduce new skills.** If an update only
   modifies files inside an already-junctioned skill, the junction
   already covers it — re-running just prints `SKIP` for everything.

```powershell
& "$HOME\.claude\scripts\link-agent-skills.ps1"
```

## How to remove a skill from Claude (but keep it on disk)

```powershell
Remove-Item "$HOME\.claude\skills\<skill-name>" -Force
```

This deletes only the junction. The underlying skill stays at
`~/.agents/skills/<skill-name>` and can be re-linked later by running
the script again.

## How to fully uninstall a skill

Use the `skills` CLI to remove it from `~/.agents/skills/`, then run
the cleanup above to drop the dead junction. (A junction pointing at
a deleted target is harmless but clutters the skills list.)
