---
name: next-best-action
description: Pre-close checklist that catches findings that should be filed as tickets before the close commit. Surface it at every close on a substantive puzzle, but run it only with explicit user go-ahead — it is a token-heavy pass, not an auto-run step.
---

# /next-best-action — pre-close finding checklist

Invoke this skill **before** writing the close commit and before running the resolved close command (see **Project config**). It takes 2–3 minutes and catches the most common oversight: findings that should become tickets, but won't if you close now.

**Run only with explicit user go-ahead.** This is a token-heavy pass, so don't auto-run it on every close and don't auto-skip it by how long the turn took. At close, *surface* that it applies ("next-best-action would apply here — run it?") and run it only once the user approves. The cost control is the approval gate, not a duration heuristic (#1279).

## Project config

This skill resolves its mechanics from `.claude/orchestrate.json` (full schema:
`fruit-agent-orchestrate/references/orchestrate-config.md` → "Storage block"). Read:

- **close command** — the resolved close command from the `enrichment` block (pmtools: `pmtools close N`; lccjs: `npm run close N`). Below, **`<close-cmd> N`** means this resolved command.
- **`storage.errors.enabled` / `storage.errors.logCommand` / `storage.dbPath`** — for the Q6 error self-audit. If `storage.errors.enabled` is `false`, **skip Q6** (error logging disabled). Otherwise `<db>` = resolved `storage.dbPath` (default `~/.pmtools/<repo>/pmtools.db`; lccjs `~/.lccjs/lccjs.db`) and `<error-log-cmd>` = resolved `storage.errors.logCommand` (`null` ⇒ `pmtools error log`; lccjs `npm run error:log`).
- **`storage.velocity.enabled`** — if `false`, ignore any velocity mention below (velocity tracking is disabled for this project).

The checklist content and intent are project-agnostic.

## Trigger

Every substantive puzzle close — any ticket whose work produced code changes, doc changes, research findings, or process observations.

## Skip when

- Pure velocity-log-only commits (no scope change, just a velocity row / CSV mirror update — and only where `storage.velocity.enabled`)
- Pure PM/triage sessions with no code or doc output

(Duration is **not** a skip reason — a sub-minute close can still hide a fileable finding. The gate is user approval, not turn length; see the approval note above.)

## Input (read before answering)

1. `git diff origin/main` — what actually changed vs. the ticket's "Should have"
2. `gh issue view N` — the ticket title and scope boundary
3. Your closing summary — what you observed, decided, and deferred during this session

## The checklist — answer each question

For every YES: name the finding and the ticket shape. **Filing is mandatory** — a wrong ticket can be closed immediately after filing.

---

**Q1 — Bug or regression**
Did you encounter a bug, parity deviation, or regression that is NOT in this ticket's stated scope?

- Yes → file a bug ticket now: `gh issue create --title "bug: ..." --label "bug,severity:medium"`
- No → clear.

---

**Q2 — Process recurrence**
Did a known failure mode recur this session? Did you state any intent — "I'll file a ticket", "I'll post a comment", "I'll update the doc" — and then not follow through?

- Yes → file a process-improvement ticket. Reference the failure mode by name if it appears in `docs/research/orchestration-failure-modes.md`.
- No → clear.

---

**Q3a — Doc contradiction**
Does your output contradict or extend an existing doc, TIL, glossary entry, or open ticket?

- Yes → file a WRITER ticket to update the doc, or post a correction comment on the open ticket.
- No → clear.

---

**Q3b — Closing loop**
Did you post a closing comment on the issue? If you filed a child ticket, does it include `**Parent:** #N` in its body?

- Closing comment missing → post it now: `gh issue comment N --body "Closed in <sha>. <summary>"`
- Child ticket missing parent link → edit now: `gh issue edit <child-N> --body "**Parent:** #N\n\n<rest of body>"`
- Both present → clear.

---

**Q4 — Deferred decision**
Did you defer a technical or process decision with no tracking ticket?

If this is a **research or spike close**: did you file a child DEV/SPIKE ticket for each concrete proposal? A research close with N proposals and zero children is half-finished; the findings exist but have no path to implementation. (Rule source: `claude_workflow.md` step 4, #621.)

- Yes → file a decision or DEV ticket now.
- No → clear.

---

**Q5 — External routing**
Is there a follow-up question for a human, Charlie, or Prof. Dos Reis that has no `waiting-on-external` ticket?

- Yes → file a ticket labeled `waiting-on-external`. Include the handle of who needs to respond.
- No → clear.

---

**Q6 — Error self-audit** (RULES.md 16 / R021) — *skip entirely if `storage.errors.enabled` is `false`.*
Re-read your session from claim to now. Did any tool/Bash/git/`gh`/claim call fail, any hook block, any permission get denied, or any schema/validation check fail this session — *including* ones you retried and resolved?

- Yes → confirm each has an `errors` row (`sqlite3 <db> "SELECT id,error_type FROM errors WHERE ticket=N"`) or log it now via the resolved `<error-log-cmd>`.
- Either way → state the outcome in the closing comment: `error self-audit: N row(s) logged` or `error self-audit: no loggable errors this session`. (Silence is not a pass — that is the #1108/#1117 failure mode.)

---

## Output format

All questions answered → emit one of:

```
✅ GREEN — all clear. Proceed with <close-cmd> N.
```

or

```
⚠ AMBER — file before closing:
  • Q1: <finding> → bug: <title stub> (label: bug,severity:medium)
  • Q3b: no closing comment posted on #N
  (filing is not optional — a wrong ticket can be closed immediately)
```

Only proceed to `<close-cmd> N` after reaching GREEN, or after filing tickets for every AMBER item and re-confirming.

## Real-world examples (from lccjs session history)

| Human follow-up that this skill should have prevented | Caught by |
|---|---|
| "pls file a ticket, this process isn't being followed consistently" | Q2 — process recurrence unfiled |
| "why didn't you follow through?" | Q2 — stated intent not acted on |
| "did you leave a closing comment on the ticket?" | Q3b — no closing comment |
| "child ticket missing parent link / no comment on #634" | Q3b — cross-reference omitted |
| "is there a follow-up ticket to decide what to do about orchestration failure modes?" | Q4 — research closed with zero children |
| "pls file a tracker with the 13 mitigations" | Q4 — N proposals, zero children |
| "pls create a decision ticket for the #611 audit results" | Q4 — audit closed with no decision ticket |
| "file a ticket for the blocked closing comment process-improvement" | Q2 + Q5 — blocker not filed, routing skipped |

## Related

- `docs/claude_workflow.md` step 5 — where this skill is wired into the close sequence
- M3 (#627) — prose checklist companion (teaches the same questions; this skill enforces them)
- `docs/research/orchestration-failure-modes.md` — failure mode catalogue for Q2 naming
