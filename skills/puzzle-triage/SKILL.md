---
name: puzzle-triage
description: Rank the open issues/puzzles by ICE score (Impact×Confidence×Ease) then severity, and render them with severity-color emoji, splitting out blocked and iceboxed work. Use ONLY when the user explicitly asks "what's next", "what should I work on", "triage the backlog", "rank the issues", or requests a prioritized view of open tickets. NEVER fire on an agent-readiness greeting ("you are agent X", "are you ready to work?") — respond with a short confirmation and wait. Read-only — it recommends, it does not file, label, or close anything. Pairs with puzzle-velocity and the puzzle:status reconciler.
version: 0.3.0
last_reviewed: 2026-06-15
---

# Puzzle Triage — ranked "what's next" view

Take the currently-open issues/tickets, rank them by **ICE score**
(Impact × Confidence × Ease, from `stats/ice-scores.csv`) then by **severity**,
and print them with color emoji so the top of the list is the thing to grab next.
Blocked and parked work is pulled out of the actionable queue into its own
sections so it never masquerades as "next."

This skill is **read-only**. It produces a view and a recommendation; it does
**not** create issues, add labels, flip markers, or close anything. Running it is
not itself a tracked puzzle — no `@todo`, no worktree, no velocity row.

## Triggers

Fire **only** when the human user's message explicitly asks for prioritization:

- User types a triage request: "what's next", "what should I work on", "what's the top priority"
- User asks for backlog ordering: "triage / rank / prioritize the backlog / the issues / the open tickets"
- User explicitly asks what to work on **after** a close: "ok, what's next?", "what should I pick up now?"
- User asks to see the shape of the backlog: "show me the open tickets by priority"

**NEVER fire on:**
- An agent-readiness or orientation greeting ("you are agent X", "are you ready to work?", "ready?")
- Any message where the user is not explicitly requesting a triage/priority view
- Inferred intent — if uncertain whether the user asked for triage, do not run it; wait for an explicit request

## The emoji legend

ICE is the ranking axis; the **dot shows severity** (still useful at a glance, and
already folded into ICE via the Impact term). The dot **is** the severity:

| Emoji | Meaning | Source |
|---|---|---|
| 🔴 | `severity:high` — data corruption, broken output, blocking misbehaviour | label |
| 🟠 | `severity:medium` — real defect, visible impact, not catastrophic | label |
| 🟡 | `severity:low` — latent, cosmetic, low-impact | label |
| ⚪ | **untriaged** — no `severity:*` label yet | absence of label |
| ⛔ | **blocked** — waiting on another issue / external input; skip in the queue | `blocked` label |
| 🔒 | **locked** — a *clustermate is in progress*, so this code-area is hands-off | derived by `puzzle:status` |
| 💤 | **icebox** — `proposal` / `wontfix`; not in the active queue | label |

`⛔`, `🔒` and `💤` are *overlays*: a blocked or locked high-severity bug is still
red underneath, but it lives in its own section, not the actionable queue (you
can't grab it). The difference: `⛔` waits on an *issue* (the `blocked` label),
whereas `🔒` is a transient **derived** lock — `puzzle:status` reports it because a
clustermate holds a live worktree, and it clears by itself the moment that worktree
closes (no label, nothing stored). See the cluster design in the reference project
(lccjs #222).

## How to gather the data

```bash
# 1. Open issues with their labels
gh issue list --state open --limit 100 \
  --json number,title,labels,createdAt \
  -q '.[] | "#\(.number)\t\([.labels[].name]|join(","))\t\(.title)"'

# 1b. ICE scores — the ranking spine (Impact × Confidence × Ease, from ice-score.js).
#     Committed, DB-derived export; read the CSV and join to issues by number.
#     Columns: issue,title,type,I,C,E,ice_score,ice_rank,tier,yegor_priority,actionable,...
grep -v '^#' stats/ice-scores.csv   # or read stats/ice-scores.md for the rendered table

# 2. (Optional, if the project uses pdd) per-issue estimates from @todo markers,
#    for the within-tier shortest-first ordering and to know which are pdd-tracked:
npm run puzzles >/dev/null 2>&1 && grep -oP '#\d+:\S+' puzzles.xml   # or:
grep -rEn '@(todo|inprogress) #[0-9]+:[0-9]+m' src demos plusdemos 2>/dev/null

# 3. (Optional, if the project has the reconciler) drop work another agent owns,
#    AND derived cluster soft-locks (a clustermate is mid-flight):
npm run puzzle:status -- --json 2>/dev/null   # skip CLAIMED / IN-PROGRESS; LOCKED → 🔒 section
#   rows[].status ∈ AVAILABLE | CLAIMED | IN-PROGRESS | LOCKED | BLOCKED | STALE
#   a LOCKED row carries detail "cluster `<name>` — clustermate #M in progress"
```

Estimates live on the `@todo #N:Est/ROLE` *marker*, not on the issue. Join by
issue number. A tracker issue with several markers: use the count / smallest, and
say so. No marker (markdown-only or untracked issue) → estimate unknown.

## Ranking algorithm (Yegor priority)

1. **Partition** by status overlay first:
   - **Icebox** = has `proposal` or `wontfix` → 💤 section, not ranked for action.
     A decision has parked it; it only re-enters the queue when someone schedules
     it (drops the `proposal` label, gives it a severity).
   - **Blocked** = has `blocked` → ⛔ section, ranked by severity but flagged
     not-grabbable (note the blocker if the issue body / a comment names one).
     Unlike icebox, a blocked issue re-enters the queue automatically the moment
     its blocker clears — no new decision needed.
   - **Actionable** = everything else.
   - If a `puzzle:status` reconciler is available, also lift CLAIMED / IN-PROGRESS
     issues out of Actionable (another agent owns them) into a small "🔵 in flight"
     note.
   - **Locked** = a `puzzle:status` row with status `LOCKED` → 🔒 section, ranked by
     severity but flagged not-grabbable (a clustermate is mid-flight). Like blocked,
     it re-enters Actionable automatically — here the instant the clustermate's
     worktree closes, no decision needed.
2. **Within Actionable, order by:**
   1. **Override tier first:** `priority:critical` then `priority:elevated` (the
      explicit "do before the normal queue" labels) top everything, regardless of ICE.
   2. **ICE score** (`ice_score` from `stats/ice-scores.csv`), highest first. ICE =
      Impact × Confidence × Ease, so it already folds severity in (Impact is derived
      from it) plus confidence and ease — it is the holistic priority number. An easy,
      high-confidence task can legitimately outrank a harder higher-severity one; that
      is the point of ICE. Truly urgent work uses an override tier (above), not severity.
   3. **Severity** as a secondary tiebreak when ICE is equal.
   4. **Provisional rows** (`provisional=1` in the CSV — auto-derived from labels by
      `npm run ice:score -- --auto`) rank normally but carry a "⚠ provisional — review
      I/C/E" marker: the score is a rough label guess, not a considered judgement.
   5. **Unscored last:** an issue with no `ice_scores` row sorts to the bottom of
      Actionable, flagged "needs ICE scoring" — never dropped (graceful degradation).
   5. Lowest issue number (FIFO) as the final stable tiebreak.
3. **Unscored (no ICE row) and untriaged (⚪ no severity) are findings, not resting
   places.** Surface a one-line nudge: unscored issues need `npm run ice:score`;
   unlabelled issues need a `severity:*` label — so the ranking stays honest.

## Output shape

Render three sections, Actionable first. One line per issue: `<emoji> #N ·
ICE <score> · <severity-or-untriaged> · <title>`. Keep it scannable.

```
## 🎯 Actionable — ICE priority order
🟠 #1180 ICE 4.0 · medium · triage claude-bugs-audit findings
🟡 #1050 ICE 3.5 · low    · clarify ad-hoc work still gets a velocity row
🔴 #40   ICE 1.5 · high   · [OB-008] Track upstream: cuh63 6.3 mov rejects negatives
⚪ #1296 ICE —   · untriaged · document assembleSource() config contract   ← needs ICE scoring

## ⛔ Blocked — waiting, skip for now
⛔ #116 (high?)  · tracker · Build Claude skill — blocked by #115
⛔ #117 (—)      · blocked · Validate Claude skill

## 🔒 Locked — clustermate in progress, re-opens on its own
🔒 #194 (low)    · cluster `identity` — clustermate #231 in progress
🔒 #227 (low)    · cluster `identity` — clustermate #231 in progress

## 💤 Icebox — proposal / wontfix
💤 #100 proposal · lcc -i: support .hex files in interactive mode
```

Close with a one-line recommendation ("Top of the queue: **#1180** — highest
ICE (4.0).") and, if any exist, the scoring/triage debt ("5 issues have no ICE
row — run `npm run ice:score`; 3 have no `severity:*` label — so the rank stays honest.").

## Boundaries
- Don't invent severities. An unlabeled issue is ⚪ untriaged, not "probably low."
- Don't recommend a ⛔ blocked, 🔒 locked, or 🔵 in-flight issue as "next."
- Don't mutate anything. If the user then says "ok, label these / start #40", that
  hands off to the normal yegor-pm + puzzle-velocity flow — a separate action.

## Project setup expected
- A GitHub issue tracker reachable via `gh`.
- `stats/ice-scores.csv` — the ICE ranking spine (`npm run ice:score` exports it
  from the `ice_scores` table). Absent or sparse → the skill degrades: unscored
  issues sort last and are flagged "needs ICE scoring", rather than being dropped.
- Severity labels `severity:high` / `severity:medium` / `severity:low`, plus
  `priority:critical` / `priority:elevated` (override tiers), `blocked`,
  `proposal`, `wontfix`. lccjs is the reference project — copy its label set if a
  project lacks one.
- Optional: a pdd setup (`@todo #N:Est/ROLE` markers) for estimates, and a
  `puzzle:status` reconciler to exclude claimed work. The skill degrades
  gracefully without them (estimates show `~`, no in-flight / 🔒 section).
- Optional: a derived-cluster manifest (`docs/puzzle-clusters.csv`) that
  `puzzle:status` reads to emit `LOCKED` rows. Absent → no 🔒 section, nothing else
  changes (lccjs #222 is the reference design).

## Relation to neighbours
- **ice-score.js** (`npm run ice:score`) produces the `ice_score` this skill ranks
  by, exporting `stats/ice-scores.csv`. Triage *consumes* ICE; it never scores —
  scoring/maintenance is its own job (it mutates the DB; triage is read-only).
- **puzzle:status** answers "what's *safe* to grab" (marker × worktree × issue
  state). **puzzle-triage** answers "what's *most important* to grab." Use status
  to filter, ICE (via triage) to order.
- **puzzle-velocity** takes over once you pick the top item (capture start time,
  set the C estimate).
- **yegor-pm** is the parent methodology; this skill is the concrete "priority
  queue" step from its epic pipeline, made visual.
