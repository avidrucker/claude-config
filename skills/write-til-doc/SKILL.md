---
name: write-til-doc
description: Guide an agent through writing, filing, and closing a TIL (Today I Learned) entry in docs/learnings/ for the lccjs project. Use when the user says "write a TIL", "write up what you learned", "add to learnings", or requests a session retrospective.
---

# Write TIL Doc

## Triggers
- "write a TIL", "write up what you learned today", "add to learnings"
- End-of-session retrospective request or lesson capture
- **Not triggered by:** research findings on a single ticket (use an issue comment instead — see `docs/claude_workflow.md`)

## Pre-flight

```bash
date '+%Y-%m-%dT%H:%M:%S%z'   # capture NOW, before reading anything
```

Confirm from conversation context (or ask briefly):
1. **Date** — today in `YYYY-MM-DD`
2. **Agent** — the terminal's fruit identity (FIG, CHERRY, BANANA, …)
3. **Themes** — 3–5 bullet phrases summarising tickets / lessons from the session

## Step 1 — Draft the TIL doc

Write the doc per the content spec in [REFERENCE.md](REFERENCE.md). Proceed directly to Step 2 — no approval pause. The draft is committed as-is; corrections can be filed as a follow-up after the human reads the summary.

## Step 2 — File the GitHub issue

TIL issues are BDD-exempt (RULES.md rule 16) — no Have/Should have/Repro required:

```bash
gh issue create \
  --title "TIL YYYY-MM-DD AGENT — one-line theme" \
  --label "severity:low" \
  --body "**Role:** WRITER · H: 15m

Session retrospective for YYYY-MM-DD (AGENT). Topics: <comma-separated themes>."
```

- Title uses an **em-dash** (`—`), not a colon or hyphen.
- No `ROLE:` prefix — `TIL` is its own identifier.

## Step 3 — Claim worktree

```bash
git status                        # verify main is clean first
npm run claim -- <N> --as <fruit>
cd <worktree-path>
```

If the CLAIMED banner shows `comments  N`, read them before proceeding:
```bash
gh issue view <N> --comments
```

## Step 4 — Write file + README index row

1. Write `docs/learnings/today-i-learned-YYYY-MM-DD-<agent>[-<session>].md` with the draft.
2. Add one row to the index table in `docs/learnings/README.md` — **mandatory, not optional**.

README row format (see REFERENCE.md for the full table header):
```
| [TIL YYYY-MM-DD AGENT](./today-i-learned-YYYY-MM-DD-<agent>.md) | YYYY-MM-DD | AGENT | One-sentence theme summary. |
```

## Step 5 — Log velocity + commit

```bash
date '+%Y-%m-%dT%H:%M:%S%z'   # capture finish time
npm run velocity:log -- '{
  "ticket": N, "title": "TIL YYYY-MM-DD AGENT — theme",
  "role": "WRITER", "agent": "FIG", "h_min": 15, "c_min": 10,
  "actual_min": X, "delta_h_min": Y, "delta_c_min": Z,
  "started_iso": "...", "finished_iso": "...", "model": "sonnet-4.6"
}'
```

Stage and commit everything in **one commit** — velocity CSV must share the `Closes #N` commit (RULES.md rule 15):

```bash
git add docs/learnings/today-i-learned-*.md \
        docs/learnings/README.md \
        docs/puzzle-velocity.csv
git commit -m "docs(learnings): TIL YYYY-MM-DD AGENT — theme (#N)

data(velocity): log #N (AGENT, WRITER, Xm)

Closes #N"
```

## Step 6 — Close

```bash
npm run close <N>
```

## Close checklist

- [ ] Start timestamp captured before reading the issue
- [ ] Draft written (no approval gate — proceeds directly to git)
- [ ] GitHub issue filed: em-dash title, `severity:low`, no BDD structure
- [ ] Worktree claimed for the TIL issue number
- [ ] `today-i-learned-YYYY-MM-DD-<agent>[...].md` written to `docs/learnings/`
- [ ] README index row added (mandatory)
- [ ] Velocity logged (`WRITER` role)
- [ ] CSV + `Closes #N` in **one** commit (rule 15)
- [ ] `npm run close <N>` completed
