---
name: claim-ledger
description: >
  Use when grounding a BODY of claims over time — a multi-claim research investigation, a
  spike, or any effort where you accumulate assertions and questions and must track which are
  proven. The durable companion to `grounded-claim` (which is the single-assertion reflex):
  this skill is the persistent ledger those assertions live in. Triggers on: "track these
  claims/questions", "which of these is verified?", "build a claim ledger", "research spike with
  many findings", "prove/falsify these one by one", or accumulating >~10 governed claims that
  feed a decision or findings doc. Reuses grounded-claim's authority model + `.claude/evidence.json`.
---

# Claim-Ledger — a durable, falsifiable ledger of claims & questions

`grounded-claim` fires **once per assertion**: cite before you assert, or hit the consent gate.
This skill is its durable other half — the **persistent substrate** where the claims and questions
of a whole investigation accumulate, get stable IDs, and are discharged from *unverified* to
*verified* over time. The ledger's `unverified` bucket **is** grounded-claim's grounding-debt made
first-class.

**Do not restate grounding rules here** — the authority model (what counts as evidence, the consent
gate) belongs to `grounded-claim`; this skill governs how many such claims are *tracked*.
Decision of record: `avidrucker/pycats#712` (findings doc `docs/research/pcs-claim-ledger-formalization-findings.md`).

## When to use (and when not)
- **Use** for a multi-claim investigation: a research spike, a parity audit, a "is X true?" sweep —
  anything where you'll assert/question more than a handful of governed facts and need to know which
  are proven.
- **One-off assertion** → just use `grounded-claim`; a ledger is overkill.
- **Ungoverned** (opinion, transient reasoning about a file open in front of you) → neither applies.

## 0. Load config
Read `.claude/evidence.json` (same file grounded-claim uses): `canon`, `evidence_map`,
`value_registry`, `governed_domains`. No file → the repo is ungoverned; a ledger is optional and
purely local. The ledger itself is **gitignored / throwaway** by default; its one durable graduation
artifact is a committed **findings doc**.

## 1. Pick a mode (scale ceremony to stakes)
- **Lightweight** (default for small spikes): a single `claims.md`, one line per claim —
  `- [T1✓] <claim> — "<verbatim quote>" @<sha>` or `- [unverified] <claim> — <how to verify>`.
  No IDs table, no composites, no dating beyond a header date.
- **Heavyweight** (escalate when **>~10 live claims**, **spans >1 session**, or **feeds a ratified
  decision**): the full registry table below + composites + dating + staleness + the lint.

## 2. The registry (heavyweight) — ONE table, status column
A single source-of-truth table keyed by ID. Do **not** shuffle entries between separate
verified/unverified files (that loses the all-IDs view and invites an ID living twice). Filtered
views (e.g. "open questions") are *generated* from this table, never hand-kept in parallel.

Columns (see `references/registry-template.md`):

`ID | type | statement | status | tier | verdict | asserted | verified | citation | rests-on`

### IDs
`PCS-<TYPE>-<NNN>` — `TYPE` ∈ `C` (claim), `Q` (question), `CC` (composite). **Per-agent-namespace
when a ledger is shared across fleet agents** (`PCS-FIG-C-001`) to avoid the ID-race. (`PCS` = the
project tag; rename per project.)

### Statuses
`unverified` · `verified` (with `verdict` ∈ `TRUE|FALSE`) · `bad` (archived — failed the
falsifiability screen; keep for study) · `INFERENCE` (sound, but its premises aren't yet verified —
must fill `rests-on`) · `REPORTED` (objective + falsifiable *in principle* but not reproducible by
you, e.g. a second-hand incident — distinct from TRUE/FALSE so it can't masquerade as checkable).

### Tiers
`T1` primary-verbatim · `T2` official-secondary (a paraphrase/summary) · `T3` memory/inference.
**Only T1 promotes a claim to `verified`.** (This *is* grounded-claim's two authorities — a verbatim
primary quote, or a provenance record + deciding issue — graded.)

## 3. The falsifiability screen (before a claim is admitted)
Every claim must be **objective** (no value judgment), **atomic** (exactly one truth value), and
**anchored** (no time-relative or approximate term without an as-of/threshold). Reject-patterns:
- value-judgment adjectives ("actively maintained", "clean", "mature") → define a metric + threshold or reject;
- bare superlatives / time words ("latest", "current") → require an as-of date;
- approximate quantities (`~`, "about") → require an exact value or a falsifiable **bound** (`≥ N`);
- comparatives without a baseline ("simpler than") → name the baseline + dimension.
A claim that can't be made objective/atomic/anchored goes to a **`bad-claims`** archive, not the registry.

## 4. Composite claims (a readable rollup — derived only)
A `PCS-CC-###` lists atomic child IDs and carries **no independent verdict**. Its verdict is
**computed**: `TRUE` iff every child is `verified`+`TRUE`; `FALSE` if any child is `verified`+`FALSE`;
else `PENDING`. **Verify only at the atomic child.** A composite is sugar, never a thing you prove directly.

## 5. Dating & staleness
- Per claim: `asserted:` (first recorded), `verified:` / `refuted:` (verdict reached).
- Per question: `opened:` / `answered:`.
- **Per citation: `as-of:` a commit SHA (or immutable permalink), never a moving ref like `master`.**
  This is what makes a stale citation *detectable*.
- **Staleness horizon (default 90d):** a `verified` claim whose citation is pinned to a moving ref, or
  is older than the horizon without re-check, auto-demotes to `re-verify`.

## 6. Promoting to `verified` (the hard gate)
A claim may be marked `verified` only when **all** hold:
1. a **verbatim quote** is pasted inline (a source name/URL is not enough — hold the sentence);
2. **the quote entails the claim** (a reviewer confirms the sentence actually supports it);
3. the **citation is pinned to a commit SHA**;
4. **author ≠ verifier** for a load-bearing claim (the asserter doesn't stamp their own).
Can't meet these → it stays `unverified` / `INFERENCE` / `REPORTED`. (grounded-claim's after-the-fact
detective backstop is the complement.)

## 7. Epistemic-only scope (no shadow tracker)
The ledger holds **claims, questions, evidence** — *what is true and how we know it*. It must NOT
carry **assignee**, **due-date**, **work-priority**, or **work-status** (todo/doing/done) fields —
those belong on GitHub issues (the single source of truth for *work*). Investigative priority on a
*question* (P1/P2/P3 = which to answer next) is fine; that's epistemic sequencing, not work.

## 8. Lint (heavyweight)
Run `python skills/claim-ledger/lint_ledger.py <registry.md>` — it flags: duplicate IDs; an ID in two
rows; a `verified` row missing a quote or SHA; an `INFERENCE` (or composite) row with an empty
`rests-on`; a forbidden shadow-tracker column. Green lint is a precondition for citing the ledger in a
decision.

## Files
- `references/registry-template.md` — the heavyweight registry table + a filled example.
- `lint_ledger.py` — the integrity checker (§8).

## Reconciles with
`grounded-claim` (the per-assertion reflex — this skill reuses its authority model, doesn't restate
it), RULES "Read the source before asserting" / cite-primary (pycats#562: `INFERENCE` = label
inference as inference; "only T1 → verified" = never issue a refuted/confirmed verdict from reasoning
over secondary facts), and `.claude/evidence.json` (shared config).
