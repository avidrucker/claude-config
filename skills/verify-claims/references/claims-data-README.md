# claims-data — the ledger

A **verify-claims** ledger. It is git-excluded: it is a working epistemic record, not a
deliverable. What graduates out of here is a committed findings doc or a GitHub issue.

**The rule:** a number you did not pin is a number you have already lost.

**The boundary:** a claim is a validatable statement about **code, a library, or data**. A
**decision** — a "should", a policy, a preference — has no truth value you can test, so it is **not a
claim**. It belongs in an issue or an ADR, never in these files.

## Admission is single-sourced in the skill

Every claim must pass the **11-criterion admission rubric**, which lives in the skill (`SKILL.md`) and
is **not duplicated here** — one source, so the two can never drift. A claim that fails the rubric on
admission is filed to `bad-claims.md` with the failed criteria named. A draft that never reaches
admission is simply discarded.

## Two human-approved transitions

Nothing self-promotes. Both promotions are a human act:

- **Admission** (`draft → unverified`): a human approves a draft into `unverified-claims.md`; the
  rubric applies and the real ID is minted here.
- **Verification** (`unverified → verified`): a human judges the claim TRUE or FALSE. Pinned evidence
  is **necessary but never sufficient** — the human ratifies. Because Claude drafts and a human
  judges, verifier ≠ asserter holds automatically.

**`bad` ≠ `FALSE`.** `bad-claims.md` = never askable, or cancelled (hygiene). `verified-claims.md`
with `Verdict: FALSE` = we asked, and the answer was no. **A refuted claim is a VERIFIED claim.**

## Evidence: the kind must match the claim

Evidence is a reference **pinned by SHA + date**, without line numbers. There are no re-checkability
tiers and no frozen evidence store — just four kinds:

| Claim is about… | Kind | The pin |
|---|---|---|
| a source's **text** | `reference` | a named file / function / heading `@<sha>` + date |
| our code's **behavior** | `test` | a **red-green, non-vacuous Claim test** — `red-on:<sha>` + `green-on:<sha>` |
| **data** (incl. a universal / negative) | `query` | a command + output + an as-of `repin:` + `expect` predicate |
| WHO said/saw WHAT, WHEN | `statement` | who + when — **signal only** |

**Behavior must be EXECUTED, never merely READ.** Reading the source and concluding what it does is
inference — a behavior claim needs a `test` or a `query`. A **factual claim always needs at least one
reproducible item**; a lone `statement` never verifies it (its weight depends on the WHO, and a
decider's statement is authoritative only for a *decision* — i.e. for answering a question).

**Verification requires** a `Verdict`, ≥1 reproducible kind-matched pinned item, a written `Entails.`
line, and the human's judgment.

## Claim tests carry the claim

A `test` lives in the project's code tree (at `testDir`). Its **docstring restates the claim in full
and carries the Claim ID**, so it reads standalone. The ledger is the single source of truth; the
docstring mirrors it, and the parity is **lint-enforced**.

## Pinning a query — every data claim is a historical claim

`select count(*) from velocity` → `1493` is not reproducible tomorrow. Don't claim the present tense;
claim the slice:

> ✗ "The velocity table has 1493 rows"  — fails admission (unanchored)
> ✓ "As of 2026-07-13, the velocity table held 1493 rows with `id <= 1520`"  — true forever

Record the discovery command, the as-of `repin` (the evidence), and its `expect`. If rows can be
**deleted**, `count(*)` ≠ `max(id)` — anchor on `id <= <max_id>` and expect the *count*.

## Files

| File | What |
|---|---|
| `draft-claims.md` | proposed claims Claude adds freely, under placeholder ids (`d1`, `d2`…) |
| `unverified-claims.md` | admitted, not yet verified. `Disposition: unverified` or `TREATED-AS-VERIFIED`; carries `Falsified-by` + `How to verify` — your work queue |
| `verified-claims.md` | human-ratified, `Verdict: TRUE` or `FALSE`, with pinned evidence and an `Entails.` line |
| `bad-claims.md` | failed admission, or cancelled. Terminal archive — read it to learn which shapes to reject on sight |
| `open-questions.md` | things we don't know. `Priority` here is *epistemic sequencing*, never work priority |
| `answered-questions.md` | answered, with `Unblocks` — go revisit every claim it unblocks |
| `cancelled-questions.md` | withdrawn / won't-answer |
| `scratchpad.md` | free-form notes that fit nowhere else |
| `INDEX.md` | **GENERATED**, and only when this ledger has topics or other custom files. Never hand-edit |

When `topics: true`, each `claims-data/<topic>/` is its own ledger with this same file-set. There is
**no** frozen evidence directory and **no** per-project rubric file.

**There is no `Status:` field. The FILE is the status.** **MOVE, never COPY** — an ID living in two
files is this model's cardinal sin.

## Lint before you cite

```
python ~/.claude/skills/verify-claims/lint_claims.py claims-data/ --write-index
```

Green lint is the precondition for citing this ledger in a findings doc, a PR, or a close comment.

## Not a tracker

No assignees. No due dates. No work-status. The moment an entry sprouts one, it's a shadow tracker —
graduate it to a GitHub issue. This ledger records **what is true**, not **what to do**.
