# TIL Doc — Content Spec & Templates

## Document structure

```
# TIL YYYY-MM-DD — AGENT [session label if >1 this day]

**Context:** 1–3 sentences: what was this session about? Name the tickets.

---

## 1. Lesson title (concrete, specific)

**What happened:** What you did or tried. Name the issue number, the exact
command that failed, the moment the assumption broke.

**What I learned:** The non-obvious insight. Why was this surprising?

**The rule:** One bolded sentence distilling the actionable take-away.

---

## 2. Another lesson title
...

---

## What landed  ← optional; include when ≥3 tickets shipped

| Artifact | Change |
|---|---|
| `scripts/claim.js` | Extended readIssue to fetch comment count (#661) |

## Open threads  ← optional; deferred follow-ups without tickets yet

- ...

## Related artifacts  ← optional; cross-links

- [Sibling TIL](./today-i-learned-2026-06-01-fig.md)
- Issue #N
```

## Content guidance

| Dimension | Guidance |
|---|---|
| Lesson count | ≥1, ≤~7 per session |
| Length | 400–1200 words; enough to be useful on a cold read ~1 week later |
| Voice | First-person, retrospective — write as the agent who did the work |
| Specificity | Name issue numbers, exact commands, the moment the rule crystallised |
| Not | A feature doc, a bug report, a transcript dump, or a design doc |

**Jargon rule:** define project-specific terms on first use, or link to `docs/claude_workflow.md#concept-glossary`. If the term isn't in the glossary, add it there first (see #479).

**Authority path:** for each rule stated in the TIL, either (a) add it to `RULES.md` in the same commit, or (b) file a ticket to do so and reference the ticket number in the TIL. A lesson that lives only in `docs/learnings/` expires when the session ends. (From #548.)

## Filename convention

```
today-i-learned-YYYY-MM-DD-<agent>.md           # first or only session that day
today-i-learned-YYYY-MM-DD-<agent>-2.md         # second session same day
today-i-learned-YYYY-MM-DD-<agent>-<topic>.md   # topic-tagged variant
```

Agent token is lowercase fruit name: `fig`, `cherry`, `banana`, etc.

## README index row

The `docs/learnings/README.md` index table has this header:

```
| Doc | Date | Agent | Themes |
|---|---|---|---|
```

New row format:
```
| [TIL YYYY-MM-DD AGENT](./today-i-learned-YYYY-MM-DD-agent.md) | YYYY-MM-DD | AGENT | One-sentence theme list. |
```

Always append at the **bottom** of the table (chronological order).

## GitHub issue body template

```markdown
**Role:** WRITER · H: 15m

Session retrospective for YYYY-MM-DD (AGENT). Topics: <comma-separated one-liners>.
```

H is typically 15m for a standard single-session TIL. Adjust upward for a synthesis
or multi-session retrospective.

## Pitfalls

| Gap | Symptom | Fix |
|---|---|---|
| Skipped README row | Index table missing the new file | Always add the row — it's mandatory, not optional |
| BDD structure attempted | Wrote Have/Should have/Repro | TIL is BDD-exempt (RULES.md rule 16) — diary format only |
| Colon in issue title | `TIL 2026-06-03 FIG: theme` | Use em-dash: `TIL 2026-06-03 FIG — theme` |
| CSV in separate commit | `npm run close` fails Guard 1 | Stage CSV + TIL file + README together with `Closes #N` |
| Worked on main | Commit rejected or workflow miss | Always claim a worktree (RULES.md rule 4, no exceptions) |
| No start timestamp | `started_iso` blank in velocity row | Capture `date` before reading the issue — reconstructed t₀ is an honesty tax |
| Lessons without authority path | Rules live only in narrative | Add to `RULES.md` or file a ticket; reference it in the TIL |
