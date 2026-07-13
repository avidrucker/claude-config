# claims-data — the ledger

A **verify-claims** ledger. It is git-excluded: it is a working epistemic record, not a
deliverable. What graduates out of here is a committed findings doc or a GitHub issue.

**The rule:** a number you did not pin is a number you have already lost.

## The admission rubric — 7/7 or it does not enter

| # | Criterion | The test |
|---|---|---|
| 1 | **Falsifiable** | Write the observation that would make it FALSE. Can't? It isn't a claim — it's a question. |
| 2 | **Objective** | Two competent people with the same evidence reach the same verdict. No value adjectives, no hedges. |
| 3 | **Unambiguous** | Every noun resolves to one referent. Name the exact file, function, table, command. |
| 4 | **Atomic** | Exactly one truth value. An ` and ` usually means: split it. |
| 5 | **Anchored — WHEN** | It names its as-of — a commit SHA, a date, a data-pin — or is a standing external fact. |
| 6 | **Situated — WHICH** | The **headline alone** says whose thing this is. Spend the 1–4 words. |
| 7 | **Relevant — SO WHAT** | A **`Bears-on:`** naming the fix / bug / feature / decision / concern it informs. |

One rewrite attempt. Still failing → `bad-claims.md`, with the failed criteria named. Terminal.

### 6 — Situated

The index is where claims get read — months later, by someone without your session in their head.

> ✗ "close completes without a velocity row when the store is off"
> — *Whose* close? lccjs's `npm run close`? `gh issue close`? pmtools' `py/close.py`? Three
>   different things, three different owners, three different fixes.
>
> ✓ "**pmtools'** `close` (`py/close.py`) completes without requiring a velocity row when
>    `storage.velocity.enabled` is false"

Watch the **overloaded terms** — words meaning different things in different systems here:
`claim` (pmtools = staking a ticket via a git ref; *here* = an epistemic assertion), `close`,
`status`, `release`, `velocity`, `error`, `ice`, `preflight`.

### 7 — Relevant

> **Bears-on.** pmtools#96 — whether the close path should surface a disabled velocity store

A declaration, not a judgment: name the work it would inform. But the discipline is real — **a
ledger of true, pinned, immaculately-cited facts that change nothing is waste wearing a lab coat.**
If you can't say what a claim would change, you have found a fact, not a finding. A `Bears-on` that
points only at another ledger entry is a smell: chase the chain up until it lands on real work.

**`bad` ≠ `FALSE`.** `bad` = never askable (hygiene). `FALSE` = we asked, and the answer was no.
**A refuted claim is a VERIFIED claim.**

## Evidence: the kind must match the claim

| Claim is about… | Minimum evidence |
|---|---|
| a source's **text** | a `quote` — verbatim sentence, pinned `@<sha>` |
| our code's **behavior** | a **`test`** — quoting the source is *inference*, not evidence |
| **data** | a **`query`** — the command, its verbatim output, and a pin |
| a **universal/negative** ("nothing calls X") | a `query` — an exhaustive search with its output pasted. A quote can never establish a universal. |
| a **decision** | an `attestation` — and *only* a decision. An attestation cannot make an opinion into a fact. |

**Promotion gate:** ≥1 pinned E1 item of the matching kind · a written `Entails.` line · and
**verifier ≠ asserter** for anything load-bearing.

## Pinning a query — every data claim is a historical claim

`select count(*) from velocity` → `1493` is not reproducible tomorrow. So don't claim the
present tense. Claim the slice:

> ✗ "The velocity table has 1493 rows"  — fails criterion 5
> ✓ "As of 2026-07-13, the velocity table held 1493 rows with `id <= 1520`"  — true forever

```
[E1·query] `<the discovery command>` → `<verbatim output>`
           · repin: `<time-scoped rewrite that returns the same answer forever>` → expect `<value>`
           · data-pin: sha256:<hash of the source>   (or file+mtime+size)
```

If rows can be **deleted**, `count(*)` ≠ `max(id)` — anchor on `id <= <max_id>` and expect the *count*.

## Files

| File | What |
|---|---|
| `unverified-claims.md` | admitted, not yet proven. Carries `Falsified-by` and `How to verify` — your work queue. |
| `verified-claims.md` | proven, `Verdict: TRUE` or `FALSE`, with pinned evidence and an `Entails.` line |
| `open-questions.md` | things we don't know. `Priority` here is *epistemic sequencing*, never work priority. |
| `answered-questions.md` | answered, with `Unblocks` — go revisit every claim it unblocks |
| `bad-claims.md` | failed admission. Terminal archive. Read it to learn which shapes to reject on sight. |
| `INDEX.md` | **GENERATED.** Never hand-edit. If it's wrong, the entry files are wrong. |
| `evidence/` | frozen raw outputs, `<ID>-e<N>.txt`, sha256'd |

**There is no `Status:` field. The FILE is the status.** Sub-states (`INFERENCE`, `REPORTED`,
`re-verify`) are a `Disposition:` inside `unverified-claims.md`.

**MOVE, never COPY.** An ID living in two files is this model's cardinal sin.

## Lint before you cite

```
python ~/.claude/skills/verify-claims/lint_claims.py claims-data/ --write-index
```

Green lint is the precondition for citing this ledger in a findings doc, a PR, or a close comment.

## Not a tracker

No assignees. No due dates. No work-status. The moment an entry sprouts one, it's a shadow
tracker — graduate it to a GitHub issue. This ledger records **what is true**, not **what to do**.
