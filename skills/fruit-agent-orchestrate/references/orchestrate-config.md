# `.claude/orchestrate.json` — config reference

`fruit-agent-orchestrate` bakes in **no** project-specific assumptions. Everything
that varies between repos lives in `.claude/orchestrate.json` at the repo root. The
file (and every key) is **optional**: a missing file or key falls back to the default
below, so a fresh repo works with zero setup — just in degraded (generic) form.

Labels are deliberately **not** here — `severity:high|medium|low`, `blocked`,
`proposal`, `wontfix`, `humans-only`, `decision`, `research` are a shared convention
identical across all projects; the skill references them directly and tolerates their
absence.

**Severity semantics (shared rule):** `severity:*` is for **defects (bugs) only** — it
describes the impact of a defect, and is the primary ranking key. **Features/enhancements
get `enhancement` and NO severity** (they rank below triaged bugs by design; pull a feature
forward by assigning it directly, not by faking severity). Use `blocked` for real
dependencies. This keeps the ranking honest and the taxonomy identical across repos.

## Full schema

```jsonc
{
  // --- identity / provider ---
  "host": "github",                 // "github" | "gitlab"  → selects the gh|glab adapter
  "repo": null,                      // "owner/name"; null => derive from `git remote`
  "languages": ["python"],          // drives pmtools port selection + @todo grep globs

  // --- workflow ---
  "mode": "solo",                    // "solo" | "fleet"
  "roster": ["APPLE","BANANA","CHERRY","DRAGONFRUIT",
             "ELDERBERRY","FIG","GRAPE","HONEYDEW"],
  "issueLimit": 50,                  // cap on `gh/glab issue list` (API-throttle safety)
  "worktreeBranchPattern": "^(?<agent>[a-z]+)/issue-(?<issue>\\d+)",  // fleet only
  "defaultBase": "origin/main",      // fleet only — claim's base branch

  // --- centralized PM tooling (pmtools) ---
  "pmtools": {
    "home": "~/code/pmtools",        // clone location; null => enrichment disabled
    "port": "py"                      // "py" | "js" | "bb"; null => derive from languages[0]
  },
  // explicit command overrides (escape hatch; WIN over pmtools{} derivation)
  "enrichment": {
    "statusCommand": null,           // e.g. "npm run puzzle:status"; null => skip + note
    "claimCommand": null,
    "preflightCommand": null
  },

  // --- tooling paths (defaults shown; override only if nonstandard) ---
  "paths": {
    "worktreeDir": ".claude/worktrees",
    "evidenceDirs": ["docs/logs", "docs/research"],
    "scratchDir": null               // null => ~/.pmtools/<repo>/
  },

  // --- optional integration ---
  "testCommand": null,               // reserved for the verify / yegor-unit-tests seam

  // --- advisory (non-blocking hints) ---
  "advisory": {
    "clusterFile": null,             // e.g. "puzzle-clusters.csv"; null => skip overlap hints
    "sequencingDocRef": null
  }
}
```

## Key reference

| Key | Type | Default | Meaning |
|---|---|---|---|
| `host` | `"github"\|"gitlab"` | `"github"` | Selects the provider adapter. GitLab is currently a stub (emits "gitlab adapter not yet implemented"). |
| `repo` | string\|null | `null` (derive) | `owner/name`; only set for unusual multi-remote setups. |
| `languages` | string[] | `["unknown"]` | First entry drives the default `pmtools` port and the `@todo` grep file globs. |
| `mode` | `"solo"\|"fleet"` | `"solo"` | `solo` = single ranked queue; `fleet` = parallel per-agent assignments + collision guards. |
| `roster` | string[] | 8 fruits | Agent names; fleet only. |
| `issueLimit` | int | `50` | Open-issue fetch cap. |
| `worktreeBranchPattern` | regex | `^(?<agent>[a-z]+)/issue-(?<issue>\d+)` | Parses busy agents from `git worktree list`; fleet only. |
| `defaultBase` | string | `"origin/main"` | Base ref for `claim`; fleet only. |
| `pmtools.home` | path\|null | `null` | Clone of the pmtools repo; `null` disables enrichment. |
| `pmtools.port` | `"py"\|"js"\|"bb"`\|null | derive from `languages[0]` | Which port to invoke. |
| `enrichment.*Command` | string\|null | `null` | Explicit command override; wins over `pmtools` derivation. |
| `paths.*` | — | shown above | Worktree/evidence/scratch locations for the tooling. |
| `testCommand` | string\|null | `null` | Reserved; not yet consumed. |
| `advisory.*` | string\|null | `null` | Non-blocking cluster/sequencing hints. |

## Enrichment-command resolution order

Applied **per command** (`status`, `claim`, `preflight`):

1. If the matching `enrichment.<x>Command` is non-null → **use it verbatim**.
2. Else if `pmtools.home` is non-null → **derive** `<home>/<port>/<tool>` (port defaults
   to `languages[0]`'s port).
3. Else → the command is **unavailable**: skip that step and note it in the output
   (e.g. `(puzzle-status enrichment unavailable for this project)`).

## Examples

**lccjs** (Node, parallel agents) — re-enables its npm tooling and fleet mode:
```json
{
  "host": "github", "languages": ["javascript"], "mode": "fleet", "issueLimit": 50,
  "pmtools": { "home": "~/code/pmtools", "port": "js" },
  "enrichment": {
    "statusCommand": "npm run puzzle:status",
    "claimCommand": "npm run claim",
    "preflightCommand": "npm run preflight"
  },
  "advisory": {
    "clusterFile": "puzzle-clusters.csv",
    "sequencingDocRef": "docs/learnings/today-i-learned-2026-06-05-dragonfruit.md"
  }
}
```

**pycats** (Python, solo today) — minimal; enrichment off until PDD markers exist:
```json
{
  "host": "github", "languages": ["python"], "mode": "solo", "issueLimit": 50,
  "pmtools": { "home": "~/code/pmtools", "port": "py" },
  "enrichment": { "statusCommand": null, "claimCommand": null, "preflightCommand": null }
}
```
