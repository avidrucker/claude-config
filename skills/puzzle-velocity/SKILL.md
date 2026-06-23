---
name: puzzle-velocity
description: Track wall-clock time per puzzle/ticket with dual H/C estimates and a logged row so forecasts can be calibrated over time. Use when picking up or closing a puzzle, starting work on a ticket, or logging velocity. Pairs with the yegor-* family.
version: 0.7.0
last_reviewed: 2026-06-23
---

# Puzzle Velocity Tracking

Two estimates per puzzle, two timestamps per session, one logged row. The goal: separate the Yegor 60m human-effort cap (which governs decomposition) from forward-looking estimates of *your own* wall-clock (which improves with calibration).

## Project config

This skill resolves its mechanics from `.claude/orchestrate.json` (full schema:
`fruit-agent-orchestrate/references/orchestrate-config.md` → "Storage block"). Read these keys:

- **`storage.velocity.enabled`** — if `false` (e.g. pycats), state **"velocity tracking is disabled for this project — nothing to log"** and no-op. Skip every logging step below.
- **`storage.velocity.logCommand`** — the log command. `null` ⇒ derive `pmtools velocity log '<json>'`; an explicit string overrides (lccjs: `npm run velocity:log -- '<json>'`). Below, **`<velocity-log-cmd>`** means this resolved command; the row JSON schema is identical regardless.
- **`storage.dbPath`** — the SQLite source of truth. `null` ⇒ `~/.pmtools/<repo>/pmtools.db` (lccjs: `~/.lccjs/lccjs.db`).
- **`storage.velocity.csvMirror`** — a derived, **read-only** export of the velocity table (for pandas/Jupyter). Never edit it directly; it is regenerated after writes. `null` ⇒ DB only.

The H/C dual-estimate methodology, row skeleton, delta convention, and calibration notes below are project-agnostic.

## Triggers
- About to pick up or start work on a ticket / puzzle
- About to close a ticket (`Closes #N`, `Resolves #N`)
- User mentions "log velocity", "time tracking", "track time", "puzzle time", "estimate vs actual"
- Reviewing estimate accuracy or asking how forecasts compare to reality

## Two estimates per puzzle

- **H (human)** — drives Yegor's ≤60m hard cap. Governs decomposition. **For discipline, not forecasting.**
- **C (Claude)** — your forward-looking wall-clock prediction. **For forecasting.** Set *before* doing the work, not retroactively.

The H cap structurally over-budgets AI work; tracking C separately lets us see whether *AI* self-predictions improve over time.

## Project setup expected

This skill assumes the project has:
- the configured `storage.dbPath` — SQLite canonical store (default `~/.pmtools/<repo>/pmtools.db`; lccjs `~/.lccjs/lccjs.db`)
- the configured `storage.velocity.csvMirror` — a **read-only** derived export of the velocity table (never edited directly), regenerated after each write; lccjs's is `docs/puzzle-velocity.csv`
- `docs/puzzle-velocity.md` — column reference, role codes, protocol, calibration history *(lccjs convention)*
- `docs/velocity-schema.md` — full SQLite schema reference *(lccjs convention)*

If `storage.velocity.enabled` is `false`, none of this applies — say so and stop. Otherwise, if the docs files don't exist, scaffold them before logging the first row. lccjs is the reference project — copy its shape.

## Protocol — picking up a ticket

```bash
date '+%Y-%m-%dT%H:%M:%S%z'      # capture start time BEFORE reading the issue
gh issue view <N>                 # now read for context
```

If the ticket has no `c_min` set, set one now — before starting the work. Make it your honest forward-looking prediction.

**If the project uses worktree claims** (parallel agents + a status reconciler — lccjs has both): run the reconciler first (the resolved `enrichment.statusCommand` — `pmtools status`; lccjs `npm run puzzle:status`) and **skip anything already `CLAIMED` / `IN-PROGRESS`**. The moment you check the puzzle into a worktree, flip its source marker `@todo #N:…` → `@inprogress #N:…` so the claim is visible on `main`. `pdd` matches only `@todo`, so `@inprogress` stays out of the gem's scan while signalling other agents to keep off.

## Protocol — closing a ticket

```bash
date '+%Y-%m-%dT%H:%M:%S%z'      # capture finish time BEFORE the closing commit
```

Delete the puzzle's source marker as part of the closing commit — whether it reads `@todo` or (if you claimed it in a worktree) `@inprogress`. A marker left behind after the issue closes goes STALE; `puzzle:status` will flag it.

Then log the row and close in **one commit**:

```bash
# Log row into SQLite (the configured csvMirror, if any, is re-exported automatically)
# <velocity-log-cmd> = resolved storage.velocity.logCommand
#   (pmtools: `pmtools velocity log '<json>'`; lccjs: `npm run velocity:log -- '<json>'`)
<velocity-log-cmd> '{"ticket":N,"role":"DEV","agent":"BANANA","h_min":30,...}'

# One commit: marker deletion + (if present) the re-exported CSV mirror; closed_commit left EMPTY
git commit -m "... Closes #N"
git pull --rebase                 # parallel agents may have pushed
git push
```

**Leave `closed_commit` empty** in the velocity row — the rebase rewrites the closing
commit's SHA, so any SHA captured before the push orphans. Recover on demand:

```bash
git log --grep "Closes #N" -1 --format=%h
```

**Do NOT `git commit --amend`** to backfill a SHA — amend orphans the original.

**If a file conflicts** on the rebase (e.g. two agents edited the same
region of `TODOS.md` or a source file):

1. Resolve manually, keeping both sides' intended content.
2. **Verify markers are gone before `git add`:**
   ```bash
   grep -c '^<<<<<<<\|^=======\|^>>>>>>>' <file>   # MUST print 0
   ```
   Catches a resolution applied to the wrong region, or the Edit tool erroring
   silently and leaving raw markers that `git add` + `rebase --continue` + `push`
   would happily ship. Any non-zero count is a hard block.
3. `git add <file>` only after step 2 prints 0; then `git rebase --continue`.

## What "actual" measures

- **started_iso** = the moment you began reading the issue for context (capture *before* `gh issue view`)
- **finished_iso** = the moment just before the closing commit (capture *before* `git commit`)
- `actual_min = (finished_iso − started_iso)` in minutes
- For AI agents this is wall-clock and typically a small fraction of H

## Row shape (JSON arg to the velocity-log command)

Pass a JSON object to the resolved `<velocity-log-cmd>`. Required: `role`, `agent`. (`ticket` is nullable — omit for issueless PM/triage rows; see #299.)
Full field reference in `docs/velocity-schema.md`. Common shape:

```json
{
  "ticket": 276,
  "title": "short title",
  "role": "DEV",
  "h_min": 30, "c_min": 20,
  "actual_min": 18, "delta_h_min": 12, "delta_c_min": 2,
  "started_iso": "2026-05-31T09:00:00-1000",
  "finished_iso": "2026-05-31T09:18:00-1000",
  "notes": "free text",
  "agent": "BANANA",
  "model": "sonnet-4.6"
}
```

Delta sign convention: `delta_h_min = h_min − actual_min`, `delta_c_min = c_min − actual_min`. Positive = finished early (over-estimated). **Negative values are valid and accepted** — they mean you ran over the estimate. Do NOT floor negative deltas to 0; that discards calibration signal.

Time fields use ISO 8601 with timezone offset. Empty/omitted fields → NULL in SQLite.

**Always log `agent`** — the terminal/worktree name the work ran under (e.g. `BANANA`).
Never backfill historical rows whose agent you can't verify — NULL is the honest value.
Capture per ticket: **who** (agent), **role**, **start/finish** timestamps, estimates.

## Calibration takeaways

Update `docs/puzzle-velocity.md`'s calibration-takeaways section whenever a new pattern emerges (e.g., systematic over-padding on a particular role, warm-up costs at the start of a puzzle streak, role-specific velocity differences). One short paragraph per pattern.

## Skip when

- `storage.velocity.enabled` is `false` — velocity tracking is disabled for this project; state so and log nothing.
- No project-level velocity docs (`docs/puzzle-velocity.*`, lccjs convention) exist *and* the user hasn't asked to set them up.
- The issue is a **pure tracker/epic** (umbrella that only collects child issues; does no distinct work of its own). The children log all the work — a row here double-counts. **Deciding test:** "does this issue represent distinct work, or is it just an umbrella over rows that already exist?" Scope-decomposition spikes (inventory + child breakdown deliverable) _do_ earn one row for that scoping act; `actual_min` must reflect the decomposition only, never a sum of child work. See `docs/research/velocity-row-eligibility.md` (#225).

## Related

- [`yegor-pdd`](../yegor-pdd) — the `@todo #N:Est/ROLE description` format these puzzles use
- [`yegor-microtasks`](../yegor-microtasks) — the ≤60m cap that produces the H estimate
- [`yegor-velocity`](../yegor-velocity) — counts closed tickets per week (complementary to this skill's per-ticket time)
- [`yegor-spikes`](../yegor-spikes) — research/scope puzzles, which are common rows in the velocity log
