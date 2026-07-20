# verify-claims glossary

The one place to look up a term you met in a ledger entry, in `SKILL.md`, or in linter output.
Entries are one-liners; `SKILL.md` is the operational guide and holds the *how*. The linter codes at
the bottom are the highest-value part — the linter is where you meet this vocabulary first.

## Two traps — read these first

**`claim` is overloaded across this machine.**
- **Here:** an epistemic **assertion with a truth value** — a validatable statement about code, a
  library, or data. This is the only meaning inside verify-claims.
- **In pmtools' code:** staking a ticket via a git ref (`pmtools claim <issue>`, `refs/claims/issue-N`).
  Unrelated. Never let the two blur.

**`bad` ≠ `FALSE`.**
- `bad-claims.md` = the claim was **never askable** (failed admission) or was **cancelled** — a hygiene
  archive.
- A claim in `verified-claims.md` with **`Verdict: FALSE`** = we asked, and the answer was no.
- **A refuted claim is a VERIFIED claim.** Getting this backwards corrupts the ledger's central
  distinction.

## Lifecycle & structure

| Term | One-liner |
|---|---|
| **Ledger** | one complete epistemic record — the lifecycle files + `scratchpad.md` (+ `INDEX.md` when it has topics/custom files), rooted at one git-excluded dir. Not a tracker. |
| **Topic** | a bounded investigation held as its **own** Ledger under `claims-data/<topic>/`. A whole Ledger, not a tag. |
| **Layout** | whether a repo carries Topic Ledgers in addition to the root one, set by the `topics` config key. |
| **Claim** | a single falsifiable, objective assertion tracked through the lifecycle. |
| **Draft** | a proposed Claim Claude adds freely, ungated, under a **placeholder id** (`d1`, `d2`… unique within `draft-claims.md`). |
| **Unverified** | a Draft a human **admitted** into the work queue; real id minted here; accumulating evidence. |
| **Verified** | a Claim a human **ratified** as `TRUE` or `FALSE`. Pinned evidence is necessary, never sufficient. |
| **Cancelled** | a Claim withdrawn once it has a real id — terminal, in `bad-claims.md`. (An abandoned pre-id Draft is a silent discard.) |
| **Admission** | the human-approved transition Draft → Unverified; the 11-criterion rubric applies; real id minted. |
| **Verification** | the human judgment that ratifies Unverified → Verified as TRUE/FALSE. |
| **Question** | something we don't know: `open-questions.md` → `answered-questions.md`, or `cancelled-questions.md`. |
| **Claim test** | a red-green, non-vacuous test written to support a Claim, living in the code tree at `testDir`; its docstring restates the Claim and carries the id. |

## Ledger fields

| Field | Where | Means |
|---|---|---|
| **Bears-on** | claims | what the claim informs — a fix / bug / feature / decision / concern. Empty ⇒ `NO_BEARING`. |
| **Falsified-by** | unverified | what observation would make the claim FALSE. Empty ⇒ `NO_FALSIFIER`. |
| **Disposition** | unverified | `unverified` (evidence not yet sufficient) or `TREATED-AS-VERIFIED` (has evidence + provisional verdict, still awaits ratification). |
| **Verdict** | verified | `TRUE` or `FALSE` — the human's judgment. |
| **Entails** | verified | one sentence: how the evidence entails the claim. |
| **Evidence** | verified | the pinned items (see kinds below). |
| **Asserted / Verified** | claims | WHO + WHEN. Verifier should differ from asserter (else `WARN_SAME_AUTHOR`). |
| **Rests-on** | any | ids this entry depends on. A ref to a missing id ⇒ `DANGLING_REF`. |
| **Gates · Blocked-by · Split-from · Supersedes · Unblocks** | relational | id references, same `DANGLING_REF` discipline. |
| **Priority** | questions only | epistemic sequencing, never work priority. On a claim ⇒ `SHADOW_TRACKER`. |

## Evidence kinds

Evidence is pinned by **SHA + date, without line numbers**, and its **kind must match the claim**:

| Kind | For a claim about… | The pin |
|---|---|---|
| **reference** | a source's **text** | a named file / function / heading `@<sha>` + date |
| **test** | our code's **behavior** | a red-green non-vacuous Claim test — `red-on:<sha>` + `green-on:<sha>` |
| **query** | **data** (incl. a universal / negative) | a command + output + an as-of `repin:` + `expect` predicate |
| **statement** | WHO said/saw WHAT, WHEN | who + when — **signal only**, weighted by the WHO; never verifies a factual claim alone |

**Kind-matching gate:** behavior must be **executed** (`test`/`query`), never merely **read** (`reference`)
— reading source and concluding what it does is inference. A factual claim needs ≥1 reproducible
(`reference`/`test`/`query`) item.

## Pinning — every data claim is a historical claim

| Term | Means |
|---|---|
| **pin** | the SHA + date that freezes a reference to a point in time — "true as of when?". |
| **repin** | a query's as-of anchor — the point its output was captured. |
| **expect** | the predicate a query's output must satisfy. |
| **as-of predicate** | the slice (e.g. `id <= 1520`) that makes a data claim true forever, not just today. |
| **drifted** | a `WARN` flag: a pinned SHA differs from HEAD. A flag, **not** a demotion — repin only if the content changed. |

## Linter codes — errors (fail the lint)

| Code | Means → fix |
|---|---|
| `BAD_ID` | a heading isn't a valid id `<PREFIX>-<TYPE>-<NNN>[-<AGENT>]` or draft placeholder `dN` → use the grammar. |
| `DUP_DRAFT_ID` | a placeholder id reused within `draft-claims.md` → make it unique. |
| `DRAFT_ID_ONLY` | a real id in `draft-claims.md` → drafts carry placeholders; mint the real id on promotion. |
| `REAL_ID_REQUIRED` | a placeholder id outside `draft-claims.md` → mint a real id on admission. |
| `DUPLICATE_FILE` | the same id in two files → **MOVE, never COPY**. |
| `DUP_NUMBER` | two entries share one (prefix, agent, type, number) → renumber. |
| `WRONG_FILE` | a type in a file that can't hold it (e.g. a `Q` in `verified-claims.md`) → move it. |
| `DANGLING_REF` | a relational field points at an id that doesn't exist → fix or remove the ref. |
| `NO_BEARING` | a claim's `Bears-on` is empty → name what it informs, or drop it. |
| `NO_FALSIFIER` | an unverified claim's `Falsified-by` is empty → say what would make it FALSE. |
| `BAD_DISPOSITION` | `Disposition` isn't `unverified`/`TREATED-AS-VERIFIED` → use one. |
| `MISSING_VERDICT` | a verified claim's `Verdict` isn't `TRUE`/`FALSE` → record the judgment. |
| `MISSING_ENTAILS` | a verified claim lacks `Entails` → one sentence on how the evidence entails it. |
| `NO_EVIDENCE` | a verified claim has no reproducible (reference/test/query) evidence → add a kind-matched item (a lone `statement` never verifies). |
| `MISSING_PIN` | an evidence item isn't pinned (reference/test need `@sha`+date; query needs `repin`+`expect`) → pin it. |
| `PARITY_MISMATCH` | a Claim test's docstring doesn't carry the Claim id → restate the claim + id in the docstring. |
| `SHADOW_TRACKER` | a forbidden work-tracking field (assignee/due/status, or `Priority` on a claim) → graduate to an issue. |
| `BAD_CONFIG_TYPE` | a known `ledger.json` key has the wrong value type (e.g. `topics: "true"`) → fix the type. |
| `STALE_INDEX` | `INDEX.md` is missing/out of date where one is expected → run `--write-index`. |

## Linter codes — warnings (don't fail; heed them)

| Code | Means → fix |
|---|---|
| `WARN_UNSITUATED` | a headline uses a bare overloaded term with no owner → name the system (criterion 5). |
| `WARN_BEARING_CHAIN` | `Bears-on` points only at another ledger entry → chase it to a fix/bug/feature/decision. |
| `WARN_KIND_MISMATCH` | evidence kind doesn't fit the claim (behavior with no executed test; factual with only a statement) → add the right kind. |
| `WARN_SAME_AUTHOR` | the verifier is the asserter → a different human should verify. |
| `WARN_SCREEN` | a headline hits a reject pattern (incl. decision/opinion language) → rewrite as a descriptive claim, or move it to an issue/ADR. |
| `WARN_DRIFTED` | a pinned reference's SHA differs from HEAD → repin only if the content actually changed. |
| `WARN_DEFUNCT_KEY` | an unknown/defunct `ledger.json` key (e.g. `evidenceDir`) → remove it. |
| `WARN_STRAY_INDEX` | an `INDEX.md` exists where none is expected (no topics/custom files) → delete it. |
