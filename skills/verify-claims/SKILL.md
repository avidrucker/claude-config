---
name: verify-claims
description: >
  Track a BODY of claims and questions through a four-file lifecycle — unverified → verified,
  open → answered — where a claim is promoted ONLY by pinned, KIND-MATCHED evidence: a SHA-anchored
  verbatim quote, a reproducing red/green test, or a snapshotted QUERY (a SQL/shell/git command whose
  output entails the claim). Use when an investigation, audit, review, or data analysis accumulates
  assertions that must be proven rather than asserted — a research spike, a "which of these is
  actually true?" sweep, a findings doc built on a pile of unproven numbers, or any claim about DATA
  ("there are 1493 rows") that silently rots unless pinned in time. Triggers on: "track these claims",
  "verify these", "which of these is proven?", "build a claims ledger", "prove that with a test",
  "back that claim with a query", "is that number still true?", "what's the evidence for X?".
  Config: `.claude/ledger.json`; data lives in the repo's gitignored `claims-data/<topic>/`.
version: 0.1.0
last_reviewed: 2026-07-13
---

# verify-claims

**Four lifecycle files are the truth. The registry is generated.**

That inversion is the whole skill. It lets a claim be a rich, multi-evidence *section* rather than a
table row — which is what makes multi-kind evidence (quote + test + query) possible at all. A table
row cannot hold three evidence blocks with inline command output.

The rule everything else serves:

> **A number you did not pin is a number you have already lost.**

## Project config

Reads **`.claude/ledger.json`** — the dedicated config home, kept separate from
`.claude/orchestrate.json` (which stays fleet/work config). **Works fully configless** — a missing
file is not an error. A repo still carrying the old `claims` block inside `orchestrate.json` is read
as a legacy fallback; `ledger.json` wins where both exist.

```jsonc
// .claude/ledger.json
{
  "enabled": true,              // false => no-op, and say so
  "dir": "claims-data",         // ledgers root, relative to the MAIN checkout
  "prefix": "PYC",              // null => first 3 letters of the repo dir name, uppercase
  "agentScoped": null,          // null => derive from mode == "fleet"
  "evidenceDir": "claims-data/evidence",
  // Words that mean different things in different systems here. A headline using one
  // BARE (unqualified) trips criterion 5. Defaults cover the pmtools vocabulary.
  "overloadedTerms": ["claim", "close", "status", "release", "velocity", "error", "ice", "preflight"]
}
```

**Resolve the ledger at the MAIN checkout, never inside a worktree:**
`git rev-parse --path-format=absolute --git-common-dir` → its parent. A ledger inside a worktree is
**deleted when the worktree is torn down**, taking the evidence trail with it.

**Step 0 every time:** confirm `claims-data/` is git-excluded. If not, add it and say so.

## The admission rubric — a binary 6/6 screen

Six criteria. **All six, or it does not enter the ledger.** The last three are the ones people
skip, and they map to **when · where · why**.

| # | Criterion | The test — apply literally | On fail |
|---|---|---|---|
| 1 | **Falsifiable** | *Write the sentence describing the observation that would make this FALSE.* If you can't write it, it isn't a claim. | Convert to a **question** (`Q`), or to a decision (→ an issue). |
| 2 | **Objective** | Two competent people with the same evidence must reach the same verdict. Scan for: value adjectives (*clean, mature, robust, fast, simple*), bare comparatives (*simpler than*), hedges (*probably, seems*). | Replace with a **metric + threshold**. Unsalvageable → `bad-claims.md`. |
| 3 | **Unambiguous** | Every noun resolves to exactly one referent. Scan for vague scope verbs: *supports, handles, works with, integrates*. | Name the exact function / file / table / command. |
| 4 | **Anchored — WHEN** | The statement names its as-of: a commit SHA, a date, a data-pin — or is a standing fact about an external technology. Scan for *latest, current, now, recently, `~`, about, roughly*. | Add the anchor. Convert an approximate quantity to a falsifiable **bound** (`>= N`). |
| 5 | **Situated — WHERE / WHICH** | **The headline alone names whose thing this is.** A reader who sees only the one-line statement must know which system, repo, or component it is about — without opening the body. | Spend 1–4 words on the owner. See below. |
| 6 | **Relevant — SO WHAT** | The entry carries a **`Bears-on:`** naming the concrete fix, bug, feature, decision, or concern this claim would inform. | Can't name one? It's **trivia**. Drop it, or file it as a question. |

**Compound claims are allowed — there is no atomicity gate.** A claim may carry more than one truth
condition; verify **one evidence item per conjunct** (see the kind-matching gate). A *genuinely*
oversized claim may still be split into fresh sibling IDs with `Split-from:` lineage — case-by-case,
never forced.

**Procedure:** apply all six → **one** rewrite attempt → re-apply. Still failing? Mint the ID anyway
and file it to `bad-claims.md` with the failed criteria named. Terminal.

### 5 — Situated: the headline must carry its own context

A statement is read on its own, in an index, months later, by someone who does not have your session
in their head. **The most important noun in the headline must be qualified.** Spend the four words.

> ✗ "close completes without a velocity row when the store is off"
> — *Whose* close? lccjs's `npm run close`? `gh issue close`? pmtools' `py/close.py`? Three different
>   things, three different fixes, three different owners. The headline picks none.
>
> ✓ "**pmtools'** `close` (`py/close.py`) completes without requiring a velocity row when
>    `storage.velocity.enabled` is false"

The trap is **overloaded terms** — words that mean different things in different systems on the same
machine. In this workspace: `claim` (pmtools = staking a ticket via a git ref; here = an epistemic
assertion), `close`, `status`, `release`, `error`, `velocity`, `ice`, `preflight`. Configure the list
per project via `claims.overloadedTerms`. If your headline uses one bare, situate it.

Same rule for a **fact you're citing**: "the docs say X" must say *which* docs, at *which* commit.
Criterion 4 gives you the *when*; criterion 5 gives you the *which*. A citation missing either one
sends the next reader hunting.

### 6 — Relevant: name what it bears on, or it's trivia

Every claim declares the work it would inform:

```
**Bears-on.** pmtools#96 — whether the close path should surface a disabled velocity store
**Bears-on.** the pycats measurement gap — decides whether it's a defect or a recorded decision
**Bears-on.** LCC-CLAUDE-Q-001 — whether the weekly analysis pipeline has been silently wrong
```

This is a **declaration**, not a judgment — the linter checks the field is filled with a concrete
referent, not whether you're right that it matters. But the discipline is real: a ledger that fills
with true, pinned, beautifully-cited facts that change nothing **is itself waste**. If you cannot
say what a claim would change, you have found a fact, not a finding.

**A `Bears-on` pointing only at another claim is a smell** — chase it up: what does *that* one bear
on? The chain must terminate in a fix, a bug, a feature, a decision, or a named concern.

**Why binary and not a score:** the criteria are not commensurable. A claim that passes every
criterion but one — say it isn't anchored — is not "almost good" — its truth value *does not exist*.
Averaging non-tradeable criteria is meaningless, and a score invites a squishy "high enough →
verified" rule, which is the exact judgment call the ledger exists to eliminate. (You may record the
raw pass-count as **telemetry** — "how often am I drafting near-miss claims?" — but never as a gate.)

**`bad` ≠ `FALSE`. Say this out loud.**
- `bad-claims.md` = the claim was never *askable* (an admission-hygiene failure).
- `verified-claims.md` with `Verdict: FALSE` = we asked, and the answer was no (a *truth* failure).
- **A refuted claim is a VERIFIED claim.** It does not go to bad-claims.

## Approval: two gates, no exceptions

The ledger is human-gated at both transitions. This is deliberate: it stops an agent from silently
inflating the ledger with unreviewed claims, or self-certifying a claim as proven.

1. **Admission gate.** **Every claim requires explicit approval before it is filed** into
   `unverified-claims.md` — no exceptions. An un-approved draft stays a draft (scratchpad, or the
   message), not a ledger entry.
2. **No direct-to-verified.** A claim may **never** be written straight into `verified-claims.md`. It
   enters `unverified-claims.md` first, always.
3. **Graduation gate.** Moving a claim `unverified → verified` requires a **second, explicit
   approval** — on top of the evidence gate below. The same shape governs questions:
   `open → answered` needs explicit approval.

Approval is a human act. The evidence gate (an E1 item, a valid pin, an `Entails.` line, verifier ≠
asserter) is *necessary but not sufficient*; the graduation approval is the final, separate step.

## Evidence: kinds, pins, tiers

Each evidence item has a **kind**, a **tier**, and a **pin**.

**Tiers** measure re-checkability, not source proximity:

| Tier | Meaning | Promotes? |
|---|---|---|
| **E1** | **Reproducible & pinned** — a later reader can re-run or re-read the pinned thing and get the same answer. | **Yes** |
| **E2** | **Corroborating** — real, but not independently reproducible. Strengthens; never crosses the gate alone. | No |
| **E3** | **Assertion** — memory, inference, an unpinned source. Not evidence. | No |

**Kinds:**

| Kind | What it is | Required fields | The pin | Tier |
|---|---|---|---|---|
| `quote` | Verbatim sentence from a primary source | `source`, `quote` (the sentence, inline) | `@<sha>` — a commit SHA or immutable permalink. **Never a moving ref like `main`.** | E1 |
| `test` | A reproducing test | `test` (path::nodeid), `runner` (exact command) | `red-on:<sha>` + `green-on:<sha>` | E1 |
| `query` | A SQL/shell/git command whose **output entails the claim** | `cmd`, `out` (verbatim output, inline) | the **data-pin block** — see below | E1 |
| `observation` | A one-off run, a manual behavior, a crash you saw | `what`, `how`, `when`, `env` | a saved artifact at `evidence/<ID>-e<N>.<ext>` + its `sha256`. **An observation with no artifact is memory, not evidence.** | E2 |
| `attestation` | A human ruling / decision-of-record | `decider`, `date`, `issue` | issue # + date | special — see the firewall |

## THE KIND-MATCHING GATE

**The kind of evidence must match the kind of claim.** This is the rule that catches the errors that
otherwise ship.

The organizing principle: **behavior must be EXECUTED, never merely READ.**

| Claim shape | Minimum evidence | Why |
|---|---|---|
| A fact about a **source's text** ("the config sets X", "the docstring says Y") | 1× `quote` | |
| A fact about **behavior** ("`tick()` wedges on a corrupt row", "`date()` returns NULL on this input") | **1× EXECUTED item — a `test` or a `query`** | **Quoting the source is NOT sufficient.** Reading code and concluding what it does is *inference*. A `test` and a `query` both **run** the thing and show its output; that is the property that matters. Prefer a `test` for our own code (it stays green); a `query` is fine for a one-shot fact about a tool's behavior. |
| A fact about **data** ("there are 1493 velocity rows") | **1× `query`** | |
| A **negative / universal** ("nothing calls `foo`", "no test asserts X") | **1× `query`** — an exhaustive search **with its output pasted** | A quote can never establish a universal. Only an exhaustive search can. |
| A fact about a **decision** ("the project ruled X") | 1× `attestation` | |
| A claim spanning two of the above | one item per conjunct — **or split the claim** (usually the right answer) | |

**Beware the mixed claim.** "275 of 403 rows are NULL **because** SQLite can't parse the offset" is
two claims: a *count* (data → `query` over the corpus) and a *mechanism* (behavior → an executed
check of SQLite itself). Carry one evidence item for each, or split the claim. The mechanism half is
the one people assert from memory.

**The promotion gate.** A claim moves to `verified-claims.md` **iff all four hold**:

1. ≥1 **E1** item **whose kind matches the claim shape**;
2. every E1 item carries a **valid pin**;
3. an explicit **`Entails.`** line — one sentence saying *how this evidence entails this exact claim*.
   Not optional. You may not leave it blank.
4. **verifier ≠ asserter** for a load-bearing claim (one feeding a decision, a merge, or a findings doc).

### The attestation firewall

> **An `attestation` may verify only a claim whose SUBJECT IS the decision.**

"The project has ruled that store errors are infra, not poison" — attestable.
"The code is fast" — **not attestable**, no matter who says it. A human asserting a fact about the
world does not make it evidence. Without this rule, attestation becomes a laundering channel that
turns any opinion into a verified fact.

## Pinning a `query`: the mutable-data problem

`sqlite3 db "select count(*) from velocity"` → `1493`. Tomorrow it is 1494. The **command** is
reproducible; the **data** is not. "I ran this and got 1493" is not re-checkable, so it is not evidence.

**The insight: every data claim is a historical claim.**

- *"The velocity table has 1493 rows"* — **fails admission** (criterion 4, unanchored).
- *"As of 2026-07-13, the velocity table held 1493 rows with `id <= 1520`"* — **admissible, and
  permanently true.**

A SHA doesn't stop `main` from moving; it names the state `main` had. An **as-of predicate** doesn't
stop a table from growing; it names the rows the claim was about. So record three things:

```
- kind: query                                    [E1]
  cmd:      sqlite3 $SNAP/db/lccjs.db "select count(*) from velocity"
  out:      1493
  repin:    sqlite3 $SNAP/db/lccjs.db "select count(*) from velocity where id <= 1520"
  expect:   1493
  data-pin: sha256:c549050128e7a1d4… (or file=… mtime=… size=…)
```

`cmd` = the discovery (drifts; kept for provenance). `repin` = **the evidence** (stable forever).
`data-pin` = the drift detector.

**Careful:** if rows have been *deleted*, `count(*)` ≠ `max(id)`. Anchor on `id <= <max_id_at_T0>` and
expect the **count**.

**Fallback ladder** — use the highest rung that applies:

| Rung | Pin | Re-derivable later? | Tier |
|---|---|---|---|
| 1 | **As-of predicate** (`repin` + `expect`) | Yes, forever | **E1** |
| 2 | **Frozen output** — raw output saved to `evidence/<ID>-eN.txt` + `sha256` | Against the artifact only | **E1** for the historical claim |
| 3 | **Source digest** — `sha256` of an immutable source file | Yes, if immutable | E1 if immutable |
| 4 | **File-state only** — mtime + size | No — *detects* drift, doesn't preserve the answer | **E2** |
| 5 | Nothing | — | Not a `query`. It's an `observation`. |

## Staleness: a flag, not a demotion

A SHA-pinned claim **does not become false** when upstream moves. Its *relevance* decays; its truth
is intact. So:

- **`drifted`** — a computed flag. For each `@<sha>` in a verified entry, if
  `git merge-base --is-ancestor <sha> HEAD` fails, the pinned state is off the current line of
  history. **Flag it. Never demote it.**
- **Demote only on evidence *invalidation*** — a pin that no longer resolves, a `repin` that now
  returns a different `expect`, or an `Entails.` step shown to be wrong. *That* is a real loss of
  grounding, and it moves the entry back to `unverified-claims.md` with `Disposition: re-verify`.

## IDs

```
<PREFIX>-<TYPE>-<NNN>[-<AGENT>]
```

`PYC-C-001-FIG` · `PYC-C-001` (solo — the agent segment is simply **omitted**) · `PYC-Q-003-FIG`

- **Prefix** from `ledger.json` `prefix` (default: first 3 letters of the repo dir name, uppercase —
  `pycats` → `PYC`). The semantic part (`PYC-C-001`) reads first; the **agent is a trailing
  collision-breaker**, present on every ID in a fleet ledger.
- The linter still accepts the **legacy agent-first** form (`PYC-FIG-C-001`) so existing ledgers keep
  linting during migration — but **mint the agent-last form**.
- `TYPE` ∈ `C` (claim) · `Q` (question). *(The composite `CC` type was removed — compound claims
  are written as one claim; oversized ones use `Split-from:` lineage.)*
- `NNN` is monotonic **within its own (prefix, agent, type) namespace**.
- **Race-free by construction:** each agent increments only its own namespace and is its only writer.
  No counter file. No lock. This is the entire point of agent-scoping.
- **Mint once.** An ID is assigned at admission *attempt* and never rewritten — not on failure, not
  on split, not on refutation, not on demotion.
- **Splits get fresh IDs**, not letter suffixes (`C-005a/b`), with `Split-from:` for lineage.

## The files

A ledger is organized **by topic** — one self-contained sub-ledger per investigation under
`claims-data/<topic>/`. Point the linter at a topic dir.

```
<main-repo>/claims-data/              # git-excluded
├── README.md                         # self-describing rules (scaffolded from references/)
├── rubric.md                         # PROJECT rubric override — empty by default → the skill's
│                                     #   global rubric is used; fill it to override per project
└── <topic>/                          # e.g. battle-graphics, battle-mechanics, user-interface, tooling
    ├── unverified-claims.md          # LIFECYCLE
    ├── verified-claims.md            # LIFECYCLE
    ├── open-questions.md             # LIFECYCLE
    ├── answered-questions.md         # LIFECYCLE
    ├── bad-claims.md                 # ARCHIVE — terminal; entries enter, never leave
    ├── scratchpad.md                 # FREE-FORM — notes / anything that fits nowhere else
    ├── INDEX.md                      # GENERATED — never hand-edit
    └── evidence/                     # raw pinned outputs: <ID>-e<N>.txt, sha256'd
```

The **project rubric** (`claims-data/rubric.md`) sits at the ledger root, not per topic: empty by
default → the skill falls back to its built-in global rubric; a non-empty file overrides it for the
whole project. **`scratchpad.md`** is the per-topic catch-all — notes, half-formed observations,
anything that does not yet fit an entry file. The topic is the *folder*, **never part of the ID** (a
claim keeps its ID if re-filed under a better topic).

**There is no `Status:` field. The FILE is the status.** A status column *plus* status-named files is
two sources of truth waiting to disagree. The sub-states are a **`Disposition:`** field that exists
only inside `unverified-claims.md`:

| Disposition | Meaning |
|---|---|
| `unverified` | default — evidence not yet gathered |
| `INFERENCE` | sound reasoning, premises unverified. **`Rests-on:` required.** |
| `REPORTED` | objective and falsifiable in principle, but **not reproducible by you** |
| `re-verify` | was verified; evidence invalidated; moved back. `Demoted:` note required. |

### Entry templates

**`unverified-claims.md`**
```markdown
## <ID> — <one-line statement: objective · anchored · SITUATED (whose thing is this?)>
**Disposition.** unverified | INFERENCE | REPORTED | re-verify
**Bears-on.** <the fix / bug / feature / decision / concern this would inform — REQUIRED>
**Asserted.** <YYYY-MM-DD> by <AGENT|human>
**Anchor.** <file:symbol @sha> | <data-pin> | perma-true
**Falsified-by.** <the observation that would make this FALSE>
**How to verify.** <the exact next action — the command to run, the source to read, the test to write>
**Evidence so far.** <E2/E3 items, or "none">
**Rests-on.** <IDs>          <!-- required iff Disposition = INFERENCE -->
**Blocked-by.** <Q-IDs>      <!-- optional -->
```
`Falsified-by` is the cheapest possible enforcement of criterion 1 — **you cannot fill the entry in
without passing the screen.** `How to verify` is your ready work queue.

**`verified-claims.md`**
```markdown
## <ID> — <one-line statement: anchored (when) · situated (which/whose)>
**Verdict.** TRUE | FALSE
**Bears-on.** <the fix / bug / feature / decision / concern this informs — REQUIRED>
**Asserted.** <date> by <AGENT|human>
**Verified.** <date> by <AGENT|human>     <!-- must differ, for a load-bearing claim -->
**Entails.** <ONE sentence: how the evidence below entails this exact claim>
**Evidence.**
  1. [E1·quote] "<verbatim sentence>" — `<path>` @<sha>
  2. [E1·query] `<cmd>` → `<out>` · repin: `<repin>` → expect `<expect>` · data-pin: <sha256|file+mtime+size>
  3. [E1·test]  `<path::nodeid>` — red on <sha>, green on <sha> · runner: `<cmd>`
  4. [E2·observation] <what> — artifact `evidence/<ID>-e4.txt` sha256:<16hex>
**Supersedes / Split-from.** <optional lineage>
```

**`open-questions.md`**
```markdown
## <ID> — <the question>
**Priority.** P1 | P2 | P3      <!-- epistemic sequencing ONLY — never work priority -->
**Opened.** <date> by <AGENT|human>
**Why it matters.** <what it gates>
**Gates.** <C-IDs that cannot resolve until this is answered>
**Options.** A. <…> → <consequence>   B. <…> → <consequence>
**Where to look.** <the source or command that would answer it>
```

**`answered-questions.md`**
```markdown
## <ID> — <the question>
**Answer.** <the answer>
**Evidence.** [E1·attestation] decider: <human> · <date> · issue: #<N>
**Answered.** <date>
**Unblocks.** <C-IDs>   <!-- revisit every one of these -->
```

**`bad-claims.md`** (terminal)
```markdown
## <ID> — REJECTED (criteria failed: <2 objective, 5 anchored>)
**Original.** "<verbatim, as first written>"
**Why it fails.** <one bullet per failed criterion>
**Superseded by.** <new IDs> | none — dropped
```
A bad claim is never resurrected under its own ID — it is *superseded* by new ones. Keep the archive:
it is the corpus for learning which claim-shapes to reject on sight.

## Lifecycle

1. **Capture.** Write the raw assertion. No ID yet.
2. **Screen.** Apply the admission rubric; one rewrite attempt. Pass → mint the ID. Fail → mint the
   ID anyway, file to `bad-claims.md`. "I can't say how I'd verify this" → it's a **question**.
3. **Admit — GATE 1.** A claim enters `unverified-claims.md` **only after explicit approval** (no
   exceptions). On approval, append it with `Falsified-by` and `How to verify` filled in. **Nothing
   is ever written straight to `verified-claims.md`.**
4. **Gather.** Execute the `How to verify`. **Record each evidence item with its pin at the moment you
   run it.**
5. **Promote — GATE 2.** Gate met *and* graduation **explicitly approved** → **MOVE** (cut, not copy)
   to `verified-claims.md`; add `Verdict`, `Entails`, `Verified by/date`. Lint.
6. **Refute.** Same move, `Verdict: FALSE`.
7. **Demote.** Evidence invalidated → move back with `Disposition: re-verify` + a `Demoted:` note. The
   ID never changes.
8. **Answer a question.** open → answered, with the answer, its evidence, and `Unblocks`. Then
   **revisit every unblocked claim** — a promoted premise may promote its dependents.
9. **Close.** `lint_claims.py --write-index` to green. Graduate anything durable into a committed
   findings doc or an issue. The ledger itself stays git-excluded.

## The linter

`python <skill>/lint_claims.py <claims-data/> [--write-index] [--strict]` → 0 clean · 1 errors · 2 usage.

**Green lint is the precondition for citing the ledger in a findings doc, a PR, or a close comment.**

Cross-file checks are the load-bearing ones — *"this ID lives in two files"* is **invisible to the
eye**, and shipping the four-file model without the script would be shipping its failure mode:

`DUPLICATE_FILE` (an ID in two of the five entry files) · `DUP_NUMBER` · `WRONG_FILE` (C only in
unverified/verified/bad; Q only in open/answered) · `DANGLING_REF` · `STALE_INDEX`.

Per-entry: `UNGROUNDED_VERIFIED` (no E1, no `Entails`, no verdict) · `MISSING_PIN` (kind-specific) ·
`EMPTY_RESTS_ON` · `SHADOW_TRACKER` (no `Assignee`/`Owner`/`Due`/`Work-status` — `Priority` is allowed
on a `Q`, forbidden on a `C`) · `NO_FALSIFIER`.

Warnings: `WARN_KIND_MISMATCH` (a behavior-shaped statement verified with no `test`) · `WARN_SCREEN`
(reject-pattern regexes) · `WARN_DRIFTED` · `WARN_ATTESTATION_ABUSE` · `WARN_UNPINNED_QUERY`.

## Skip when

- **Fewer than ~3 governed claims.** Cite inline and move on. A ledger is overkill.
- **Transient reasoning about a file open in front of you.** Ungoverned.
- **It's a decision or a preference.** It has no truth value → an issue or an ADR, not a claim.
- **It's work to be done.** → an issue. **The ledger is epistemic-only.** The moment an entry sprouts
  an assignee, it's a shadow tracker.
- **`claims.enabled: false`.** No-op, and say so.
- **A one-off number you'll state once and never reuse.** Pin it inline in the message and move on.

## Anti-patterns

| Anti-pattern | Why it's fatal |
|---|---|
| **Copy instead of cut** | Two files, one ID — the model's cardinal sin. The lint catches it; don't rely on the lint. |
| **A code quote verifying a behavior claim** | Reading a function and concluding what it does is **inference**. Behavior → test. |
| **An unpinned query** | "I ran it and got 1493" is a *memory of a number*. |
| **A present-tense data claim** | "The table has 1493 rows" fails admission. Every data claim is a historical claim. |
| **Laundering an opinion through an attestation** | Attestations verify *decisions*, not the world. |
| **Hand-editing `INDEX.md`** | It's generated. If it's wrong, *the files are wrong*. |
| **A `Status:` field in a lifecycle file** | The file **is** the status. |
| **Verifying your own load-bearing claim** | Author ≠ verifier. |
| **An assignee or due-date in the ledger** | Shadow tracker. Graduate it to an issue. |
| **The ledger inside a worktree** | It vanishes at teardown, taking the evidence with it. |
| **Marking a refuted claim `bad`** | `bad` = never askable. `FALSE` = we asked; the answer was no. |
| **Wrapping a timestamp column in `date()` without checking the offset format** | `date()` returns NULL on a non-ISO offset (`-1000` vs `-10:00`), and `min`/`max`/`avg` skip NULLs **silently**. This has produced real, confident, wrong claims. |
| **Reading a truncated result as a domain** | `LIMIT 8` then concluding "type X doesn't exist" is how a false absence gets verified. Drop the LIMIT. |
| **A headline with a bare overloaded noun** | "`close` skips the guard" — *whose* close? The index is where claims are read. A statement that needs the body to be understood will be misread, or skipped. |
| **A true, pinned claim that changes nothing** | A ledger of immaculately-cited trivia is waste wearing a lab coat. `Bears-on` or drop it. |

## Related

- [`grounded-claim`](../grounded-claim) — the **per-assertion reflex** (cite-or-gate at the moment of
  writing). Complementary and upstream. It says *"a source name is not enough — hold the sentence."*
  This skill generalizes that: **hold the artifact** — the sentence, the test id, or the output.
- `claim-ledger` (in `claude-config`, uninstalled) — the **rival arm**. Same falsifiability screen,
  same SHA pins, same no-shadow-tracker rule — but **one registry table** where this skill has four
  files, and no vocabulary for `test` or `query` evidence. Kept separate on purpose so the two can be
  A/B compared. **Do not install both in the same repo.** Reach for `claim-ledger` when every claim is
  *textual*; reach for this one when claims are about **behavior** or **data**.
- [`muda-analyze`](../muda-analyze) — the usual customer. Every waste finding is a claim.
