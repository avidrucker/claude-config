---
name: verify-claims
description: >
  Track a body of claims and questions through a human-gated lifecycle — DRAFT → UNVERIFIED →
  VERIFIED (or CANCELLED), open → answered — where a claim is a validatable statement about
  code, libraries, or data, and "verified" means a HUMAN judged it, never that a machine matched
  evidence. Evidence is kind-matched and pinned by SHA + date: a named source reference, a
  red-green non-vacuous Claim test, or a snapshotted query. Use when an investigation, audit,
  review, or data analysis accumulates assertions that must be proven rather than asserted — a
  research spike, a "which of these is actually true?" sweep, a findings doc built on unproven
  numbers, or any claim about DATA ("there are 1493 rows") that silently rots unless pinned in
  time. Triggers on: "track these claims", "verify these", "which of these is proven?", "build a
  claims ledger", "prove that with a test", "back that claim with a query", "is that number still
  true?", "what's the evidence for X?". Config: `.claude/ledger.json`; data lives in the repo's
  gitignored `claims-data/` (optionally `claims-data/<topic>/`).
version: 0.2.0
last_reviewed: 2026-07-19
---

# verify-claims

**The lifecycle files are the truth. Any index is generated.**

That inversion is the whole skill. It lets a claim be a rich, multi-evidence *section* rather than a
table row — which is what makes multi-kind evidence (a reference + a test + a query) possible at all.

The rule everything else serves:

> **A number you did not pin is a number you have already lost.**

And the boundary that keeps the ledger honest:

> **A claim is a validatable statement about code, a library, or data. A decision is not a claim.**

## Project config

Reads **`.claude/ledger.json`** — the dedicated config home, kept separate from
`.claude/orchestrate.json` (which stays fleet/work config). **Works fully configless** — a missing
file is not an error. A repo still carrying the old `claims` block inside `orchestrate.json` is read
as a legacy fallback; `ledger.json` wins where both exist.

```jsonc
// .claude/ledger.json  — the key SET is identical across repos; values may differ
{
  "enabled": true,              // false => no-op, and say so
  "dir": "claims-data",         // ledgers root, relative to the MAIN checkout
  "prefix": "PYC",              // null => first 3 letters of the repo dir name, uppercase
  "agentScoped": null,          // null => derive from mode == "fleet"
  "topics": false,              // false => root ledger only · true => also claims-data/<topic>/
  "testDir": null,              // where Claim tests live. null => the project's own tests; or "scratch/"
  // Words that mean different things in different systems here. A headline using one
  // BARE (unqualified) trips criterion 5. Defaults cover the pmtools vocabulary.
  "overloadedTerms": ["claim", "close", "status", "release", "velocity", "error", "ice", "preflight"]
}
```

These **seven keys are the canonical schema** every repo shares — the key set and value types are
identical across repos, only the values differ. The linter **WARNs (never fails) on any unknown key**
— a defunct `evidenceDir` from the old model is named and ignored, not treated as an error — and
**ERRORs (`BAD_CONFIG_TYPE`) on a known key with the wrong value type** (e.g. `topics: "true"` as a
string). Nullable keys accept `null`, meaning "use the default".

There is **no per-project rubric**. The admission rubric below lives in this skill and nowhere else;
`claims-data/` carries no `rubric.md`.

**Resolve the ledger at the MAIN checkout, never inside a worktree:**
`git rev-parse --path-format=absolute --git-common-dir` → its parent. A ledger inside a worktree is
**deleted when the worktree is torn down**, taking the evidence trail with it.

**Step 0 every time:** confirm `claims-data/` is git-excluded. If not, add it and say so.

## Layout: root, optionally topics

The **root ledger always exists** at `claims-data/`. The `topics` key decides whether Topic ledgers
live alongside it:

- `topics: false` (default) — the root ledger only.
- `topics: true` — the root ledger (holding **general** claims) **plus** `claims-data/<topic>/`
  ledgers (each holding **specific** claims, e.g. `battle-graphics`, `tooling`, `user-interface`).

A Topic is a whole, self-contained sub-ledger — its own lifecycle files — not a tag on a claim. The
**filing location of each new claim is the user's decision**; Claude may suggest, the user always
decides. The topic is the *folder*, never part of the ID — a claim keeps its ID if re-filed.

## The admission rubric — a binary 11/11 screen

Eleven criteria. **All eleven, or it does not enter the ledger.** Criteria **4–6** are the ones
people skip, and they map to **when · where · why**. This rubric is the skill's single source — a
project never overrides it.

| # | Criterion | The test — apply literally | On fail |
|---|---|---|---|
| 1 | **Falsifiable** | Is this provable true/false? If you can't say what would make it wrong, it isn't a claim. *(Not-yet-known ≠ not-falsifiable.)* | Convert to a **question** (`Q`), or to a decision (→ an issue). |
| 2 | **Objective** | No vague adjectives or hedges — *clean, better, probably, quiet* are subjective/relative. | Replace with a **metric + threshold**. Unsalvageable → `bad-claims.md`. |
| 3 | **Unambiguous** | Point at real things — name the specific file / function / table / identifier. If it could refer to more than one thing, it's ambiguous. | Name the exact referent. |
| 4 | **Anchored OR Evergreen** | If it can change over time/version, timestamp it **DATE + SHA**; otherwise it must be **permanently** true/false. | Add the anchor, or mark it **evergreen** (and name the version via #5). |
| 5 | **Situated — WHERE / WHICH** | From the headline **alone** a reader knows precisely **which** sub-system / file / component the claim is about. | Spend 1–4 words on the owner. See below. |
| 6 | **Relevant — SO WHAT** | Carries a **`Bears-on:`** naming the decision / bug / feature it would change. If it affects nothing, it isn't a valuable claim. | Name what it informs, or drop it / file it as a question. |
| 7 | **Non-obvious** | If it's easily queried or grep'd, it isn't worth a claim. Valuable claims are non-intuitive, easy to get wrong, or need cross-cutting knowledge. | Drop the trivial lookup; keep only what is worth pinning. |
| 8 | **Full-sentence** | A complete sentence, not a fragment — plain, accessible language preferred. | Rewrite as a full sentence. |
| 9 | **Descriptive — not a decision** | States what **IS**, not what **should** be. A "should", a plan, or a preference is a **decision or an opinion, not a claim**. | Move it to an issue / ADR; keep only the factual half. |
| 10 | **Scope-honest** | No over-generalization — don't say *all* or *never* unless you actually observed the whole set. | Bound it to what you measured (`>= N`, "in the N sampled…"). |
| 11 | **Assessable** | How would you get the evidence? If you can't **reference, test, or query** the hard evidence, it isn't useful. | Name the method, or drop it. |

**Compound claims are allowed — there is no atomicity gate.** A claim may carry more than one truth
condition; verify **one evidence item per conjunct** (see the kind-matching gate). A *genuinely*
oversized claim may still be split into fresh sibling IDs with `Split-from:` lineage — case-by-case.

**Procedure:** apply all eleven → **one** rewrite attempt → re-apply. Still failing? On admission it
is filed to `bad-claims.md` with the failed criteria named (and a real ID minted). A draft that never
reaches admission is simply discarded — no ID, no `bad-claims.md` entry.

### 5 — Situated: the headline must carry its own context

A statement is read on its own, in an index, months later, by someone who does not have your session
in their head. **The most important noun in the headline must be qualified.** Spend the four words.

> ✗ "close completes without a velocity row when the store is off"
> — *Whose* close? lccjs's `npm run close`? `gh issue close`? pmtools' `py/close.py`? Three different
>   things, three different fixes. The headline picks none.
>
> ✓ "**pmtools'** `close` (`py/close.py`) completes without requiring a velocity row when
>    `storage.velocity.enabled` is false"

The trap is **overloaded terms** — words that mean different things in different systems on the same
machine. Configure the list per project via `overloadedTerms`. If your headline uses one bare, situate it.

### 6 — Relevant: name what it bears on, or it's trivia

Every claim declares the work it would inform via a **`Bears-on.`** line — a concrete referent (a fix,
bug, feature, decision, or named concern), not another ledger entry. A ledger that fills with true,
pinned, beautifully-cited facts that change nothing **is itself waste**.

### 9 — Descriptive: keep decisions out

This is the load-bearing guardrail. The claim files hold **only validatable statements about code,
libraries, or data**. A decision, a policy, a plan, a preference — "we should refactor X", "the team
agreed to Y" — has **no truth value you can test**, so it is **not a claim**. It belongs in an issue
or an ADR. The linter flags decision/opinion language in claim files (`WARN_SCREEN`); the `statement`
evidence kind (below) is deliberately too weak to launder one in.

**`bad` ≠ `FALSE`. Say this out loud.**
- `bad-claims.md` = the claim was never *askable* (an admission-hygiene failure), or it was cancelled.
- `verified-claims.md` with `Verdict: FALSE` = we asked, and the answer was no (a *truth* failure).
- **A refuted claim is a VERIFIED claim.** It does not go to bad-claims.

## Two human-approved transitions

The ledger is human-gated at both promotions. This is deliberate: it stops an agent from silently
inflating the ledger with unreviewed claims, or self-certifying a claim as proven. There is no
"gate N" jargon — each transition is named for what it does.

1. **Admission** (`draft → unverified`). A **human approves** a draft into `unverified-claims.md`.
   The 11-criterion rubric applies here, and the **real ID is minted here**. Nothing is ever written
   straight into `verified-claims.md`.
2. **Verification** (`unverified → verified`). A **human judges** the claim TRUE or FALSE. Pinned
   evidence is *necessary but never sufficient* — the human ratifies. The same shape governs
   questions: `open → answered` needs explicit approval.

Because Claude drafts and a human always judges, **verifier ≠ asserter holds automatically**.

## Evidence: kinds, pins, matching

Evidence is a **reference pinned by SHA + date** to a **named** project entity — **without line
numbers**. The SHA+date is the as-of anchor; the name is the drift-tolerant locator. There are **no
`E1/E2/E3` tiers** and **no frozen `evidence/` directory**.

Four kinds, in two families:

| Family | Kind | For a claim about… | Required pin |
|---|---|---|---|
| **Reproducible** | `reference` | a source's **text** ("the config sets X", "the docstring says Y") | a named file / function / heading `@<sha>` + date |
| | `test` | **behavior** ("`tick()` wedges on a corrupt row") | a **red-green, non-vacuous Claim test** — `red-on:<sha>` + `green-on:<sha>` |
| | `query` | **data** ("there are 1493 rows") | a command + output + an **as-of predicate** (`repin:` + `expect`) |
| **Signal** | `statement` | WHO said/saw WHAT, WHEN — a decision-of-record, a report, a one-off observation | who + when (+ issue/source) |

### The kind-matching gate

**The kind of evidence must match the kind of claim.** The organizing principle: **behavior must be
EXECUTED, never merely READ.** Reading a function and concluding what it does is *inference*; a `test`
and a `query` both **run** the thing and show its output.

- A **behavior** claim needs a `test` (or a `query`) — a `reference` to the source is not enough
  (`WARN_KIND_MISMATCH`).
- A **negative / universal** ("nothing calls `foo`") needs a `query` — an exhaustive search with its
  output. A reference can never establish a universal.
- A **factual** claim always needs at least one **reproducible** item. A lone `statement` never
  verifies a factual claim (`NO_EVIDENCE` + `WARN_KIND_MISMATCH`).

### The `statement` kind — signal, weighted by the WHO

A `statement` is non-reproducible. Its weight depends on the WHO: a **decider's** statement is
authoritative **for that decision** (this is how a Question becomes Answered), but a statement about
the **world** is only minor signal and **never** verifies a factual claim on its own. This replaces
the old "attestation firewall": there is no mechanical laundering channel because a human, not a
statement, does the verifying.

### Claim tests: the docstring restates the claim

A **Claim test** lives in the project's code tree — at `testDir` (a dedicated `scratch/`, or alongside
the project's own tests; the user's choice). Its **docstring restates the claim in full and carries
the Claim ID**, so it reads standalone without returning to `claims-data/`. The **ledger is the single
source of truth**; the docstring mirrors it, and **docstring↔ledger parity is lint-enforced**
(`PARITY_MISMATCH` if the test's docstring omits the Claim ID).

### Verification requires

A claim moves to `verified-claims.md` only with all of:

1. a **`Verdict`** — TRUE or FALSE;
2. **≥1 reproducible, kind-matched, pinned** evidence item;
3. an explicit **`Entails.`** line — one sentence saying *how this evidence entails this exact claim*;
4. the human's judgment (evidence is necessary, never sufficient).

## Pinning a `query`: every data claim is a historical claim

`sqlite3 db "select count(*) from velocity"` → `1493`. Tomorrow it is 1494. The **command** is
reproducible; the **data** is not. So don't claim the present tense — claim the slice:

- *"The velocity table has 1493 rows"* — **fails admission** (criterion 4, unanchored).
- *"As of 2026-07-13, the velocity table held 1493 rows with `id <= 1520`"* — **admissible, and
  permanently true.**

Record the discovery command, the **as-of `repin`** (the evidence — stable forever), and its
`expect`:

```
[query] `sqlite3 $SNAP/db.sqlite "select count(*) from velocity"` → 1493
        · repin: `… where id <= 1520` → expect 1493
```

`repin` + `expect` is the pin. **Careful:** if rows can be *deleted*, `count(*)` ≠ `max(id)` — anchor
on `id <= <max_id_at_T0>` and expect the **count**.

## Staleness: a flag, not a demotion

A SHA-pinned claim **does not become false** when upstream moves. Its *relevance* decays; its truth is
intact. `WARN_DRIFTED` fires when a pinned `@<sha>` is no longer an ancestor of HEAD — **flag it,
never demote it.** Demote only on evidence *invalidation* — a pin that no longer resolves, or a
`repin` that now returns a different `expect`. That moves the entry back to `unverified-claims.md` as
plain `unverified` (with an inline `Demoted:` note). The ID never changes.

## IDs

```
<PREFIX>-<TYPE>-<NNN>[-<AGENT>]
```

`PYC-C-001-FIG` · `PYC-C-001` (solo — the agent segment is omitted) · `PYC-Q-003-FIG`

- **Drafts carry a placeholder ID** — `d1`, `d2`, … — unique within `draft-claims.md` only. The real
  ID is minted **on promotion** (to `unverified-claims.md` on admission, or to `bad-claims.md` on
  rejection), never on the mere attempt.
- **Prefix** from `ledger.json` `prefix` (default: first 3 letters of the repo dir, uppercase). The
  agent is a trailing **collision-breaker**, present on every ID in a fleet ledger.
- `TYPE` ∈ `C` (claim) · `Q` (question). *(The composite `CC` type was removed — compound claims are
  written as one claim; oversized ones use `Split-from:` lineage.)* The linter still accepts the
  legacy agent-first form (`PYC-FIG-C-001`) so existing ledgers keep linting during migration.
- `NNN` is monotonic **within its own (prefix, agent, type) namespace** — race-free, no counter file.
- **Mint once.** A real ID is never rewritten — not on split, not on refutation, not on demotion.

## The files

A ledger's standard file-set (per root or per topic):

```
<main-repo>/claims-data/              # git-excluded
├── draft-claims.md                   # DRAFT — Claude adds freely (placeholder ids d1, d2…)
├── unverified-claims.md              # LIFECYCLE — admitted, gathering evidence
├── verified-claims.md                # LIFECYCLE — human-ratified, Verdict TRUE|FALSE
├── bad-claims.md                     # ARCHIVE — failed admission or cancelled; terminal
├── open-questions.md                 # LIFECYCLE
├── answered-questions.md             # LIFECYCLE
├── cancelled-questions.md            # LIFECYCLE — withdrawn / won't-answer
├── scratchpad.md                     # FREE-FORM — notes that fit nowhere else
└── <topic>/                          # only when topics: true — each its own ledger
```

`INDEX.md` is **generated only when the ledger carries topics or other custom files** — a plain
root-only ledger has none (`WARN_STRAY_INDEX` if one lingers). There is **no `evidence/` directory**
and **no `rubric.md`**.

**There is no `Status:` field. The FILE is the status.** The only sub-state is a **`Disposition:`**
inside `unverified-claims.md`, and there are exactly two:

| Disposition | Meaning |
|---|---|
| `unverified` | default — evidence not yet sufficient |
| `TREATED-AS-VERIFIED` | pinned evidence + a provisional TRUE/FALSE verdict, still awaiting the human's verification |

### Entry templates

**`draft-claims.md`**
```markdown
## d1 — <one-line statement: objective · anchored · SITUATED (whose thing is this?)>
**Bears-on.** <what this would inform>
**How to verify.** <the reference to read, the test to write, or the query to run>
```

**`unverified-claims.md`**
```markdown
## <ID> — <one-line statement: objective · anchored · SITUATED>
**Disposition.** unverified | TREATED-AS-VERIFIED
**Bears-on.** <the fix / bug / feature / decision / concern this would inform — REQUIRED>
**Asserted.** <YYYY-MM-DD> by <AGENT|human>
**Falsified-by.** <the observation that would make this FALSE>
**How to verify.** <the exact next action — the source to read, the test to write, the query to run>
**Evidence so far.** <items gathered, or "none">
```

**`verified-claims.md`**
```markdown
## <ID> — <one-line statement: anchored (when) · situated (which/whose)>
**Verdict.** TRUE | FALSE
**Bears-on.** <the fix / bug / feature / decision / concern this informs — REQUIRED>
**Asserted.** <date> by <AGENT|human>
**Verified.** <date> by <human>     <!-- Claude drafts; a human verifies -->
**Entails.** <ONE sentence: how the evidence below entails this exact claim>
**Evidence.**
  1. [reference] `<path>:<symbol>` @<sha> <date>
  2. [test]      `<path>::<nodeid>` — red-on @<sha>, green-on @<sha>   <!-- docstring carries this Claim ID -->
  3. [query]     `<cmd>` → `<out>` · repin: `<repin>` → expect `<expect>`
  4. [statement] <WHO> on <date>: <what they said/saw>   <!-- signal only -->
```

**`open-questions.md`** → **`answered-questions.md`** (with `Answer`, evidence, `Unblocks`) or
**`cancelled-questions.md`**. **`bad-claims.md`** records the original, the failed criteria, and any
`Superseded by`.

## Lifecycle

1. **Draft.** Write the assertion into `draft-claims.md` under a placeholder id (`d1`…). Free, ungated.
2. **Admit.** A human approves it. Apply the rubric; one rewrite attempt. Pass → mint the real ID and
   move it to `unverified-claims.md` with `Falsified-by` + `How to verify`. Fail → mint the ID and file
   to `bad-claims.md`. "I can't say how I'd verify this" → it's a **question**.
3. **Gather.** Execute the `How to verify`. **Record each evidence item with its pin as you run it.**
4. **Verify.** Evidence gathered *and* the human judges → **MOVE** (cut, not copy) to
   `verified-claims.md`; add `Verdict`, `Entails`, `Verified by/date`. Lint.
5. **Refute.** Same move, `Verdict: FALSE`.
6. **Demote.** Evidence invalidated → move back to `unverified-claims.md` with a `Demoted:` note. ID unchanged.
7. **Answer a question.** open → answered, with the answer, its evidence, and `Unblocks`. Then revisit
   every unblocked claim.
8. **Cancel.** A claim (once it has a real ID) → `bad-claims.md`; a question → `cancelled-questions.md`.
9. **Close.** `lint_claims.py --write-index` to green. Graduate anything durable into a committed
   findings doc or an issue. The ledger itself stays git-excluded.

## The linter

`python <skill>/lint_claims.py <claims-data/> [--write-index] [--strict]` → 0 clean · 1 errors · 2 usage.

**Green lint is the precondition for citing the ledger in a findings doc, a PR, or a close comment.**

Cross-file checks are the load-bearing ones — *"this ID lives in two files"* is invisible to the eye:
`DUPLICATE_FILE` · `DUP_NUMBER` · `WRONG_FILE` · `DANGLING_REF` · `STALE_INDEX` (only when an index is
expected). Draft placeholders: `DUP_DRAFT_ID` · `DRAFT_ID_ONLY` (a real ID in drafts) ·
`REAL_ID_REQUIRED` (a placeholder outside drafts). Config: `BAD_CONFIG_TYPE` (a known key with the
wrong value type).

Per-entry: `NO_BEARING` · `NO_FALSIFIER` · `BAD_DISPOSITION` · `SHADOW_TRACKER`. Verified entries:
`MISSING_VERDICT` · `MISSING_ENTAILS` · `NO_EVIDENCE` · `MISSING_PIN` · `PARITY_MISMATCH`.

Warnings: `WARN_KIND_MISMATCH` · `WARN_SAME_AUTHOR` · `WARN_SCREEN` (reject-patterns, incl.
decision/opinion language) · `WARN_UNSITUATED` · `WARN_BEARING_CHAIN` · `WARN_DRIFTED` ·
`WARN_DEFUNCT_KEY` · `WARN_STRAY_INDEX`.

Each code is glossed with its fix — and every term above (`Bears-on`, the evidence kinds, pins, `bad`
vs `FALSE`) — in [`glossary.md`](./glossary.md). Look there first when a code or term is unfamiliar.

## Skip when

- **Fewer than ~3 governed claims.** Cite inline and move on. A ledger is overkill.
- **Transient reasoning about a file open in front of you.** Ungoverned.
- **It's a decision or a preference.** It has no truth value → an issue or an ADR, not a claim.
- **It's work to be done.** → an issue. **The ledger is epistemic-only.**
- **`enabled: false`.** No-op, and say so.
- **A one-off number you'll state once and never reuse.** Pin it inline in the message and move on.

## Anti-patterns

| Anti-pattern | Why it's fatal |
|---|---|
| **Copy instead of cut** | Two files, one ID — the model's cardinal sin. The lint catches it; don't rely on the lint. |
| **A source reference verifying a behavior claim** | Reading a function and concluding what it does is **inference**. Behavior → test. |
| **An unpinned query** | "I ran it and got 1493" is a *memory of a number*. |
| **A present-tense data claim** | "The table has 1493 rows" fails admission. Every data claim is a historical claim. |
| **A decision filed as a claim** | A "should" / policy / preference has no truth value. → an issue or ADR. |
| **Laundering an opinion through a `statement`** | A statement is signal, weighted by the WHO; it never verifies a factual claim. |
| **A Claim test whose docstring omits the Claim ID** | The docstring must restate the claim — parity is lint-enforced. |
| **Hand-editing a generated `INDEX.md`** | If it's wrong, *the files are wrong*. |
| **A `Status:` field in a lifecycle file** | The file **is** the status. |
| **Verifying your own load-bearing claim** | Claude drafts; a human verifies. |
| **An assignee or due-date in the ledger** | Shadow tracker. Graduate it to an issue. |
| **The ledger inside a worktree** | It vanishes at teardown, taking the evidence with it. |
| **Marking a refuted claim `bad`** | `bad` = never askable / cancelled. `FALSE` = we asked; the answer was no. |
| **A true, pinned claim that changes nothing** | A ledger of immaculately-cited trivia is waste wearing a lab coat. `Bears-on` or drop it. |

## Related

- [`grounded-claim`](../grounded-claim) — the **per-assertion reflex** (cite-or-gate at the moment of
  writing). Complementary and upstream: it says *"a source name is not enough — hold the sentence."*
  This skill generalizes that: **hold the artifact** — the reference, the test id, or the output.
- `claim-ledger` (in `claude-config`, uninstalled) — the **rival arm**. Same falsifiability screen,
  same SHA pins, same no-shadow-tracker rule — but **one registry table** and no vocabulary for `test`
  or `query` evidence. Kept separate on purpose. **Do not install both in the same repo.** Reach for
  `claim-ledger` when every claim is *textual*; reach for this one when claims are about **behavior**
  or **data**.
- [`muda-analyze`](../muda-analyze) — the usual customer. Every waste finding is a claim.
