# 0001 — Ledger lifecycle & evidence model for verify-claims

- **Status:** accepted (2026-07-19)
- **Decided in:** #23 (grill-with-docs + guide-human-decision session) · **Implemented by:** #25 · **Glossary:** [`../../CONTEXT.md`](../../CONTEXT.md)

## Context

The verify-claims skill tracks epistemic claims through a lifecycle backed by files under a
git-excluded `claims-data/` Ledger. Four repos (pycats, lccjs, pmtools, statecharts-py) will share
the skill, so the file-set, the meaning of "verified", and the evidence discipline had to be settled
once rather than drift per repo. Two live contradictions forced the decision: the docs disagreed on
whether a Ledger lives flat at `claims-data/` or under `claims-data/<topic>/`, and on where evidence
is stored (`ledger.json` pointed `evidenceDir` at a root `claims-data/evidence/` that some repos
never created).

## Decision

**Layout.** Ledger layout is selected by a boolean `topics` key in `.claude/ledger.json` (default
`false`). A **root Ledger always exists**; `topics: true` additionally permits
`claims-data/<topic>/` Ledgers, where the root holds *general* claims and each Topic holds *specific*
ones. The filing location of each new Claim is the **user's** decision (Claude may suggest).

**Two human gates.** A Claim moves DRAFT → UNVERIFIED via **Gate 1 (human approval)** and → VERIFIED
via **Gate 2 (human judgment)**. Pinned evidence is *necessary but never sufficient* — a human
ratifies. Because Claude drafts and a human always judges, verifier ≠ asserter holds automatically.

**Lifecycle & files.** `draft-claims.md` (Claude adds freely) → `unverified-claims.md` (carrying a
`TREATED-AS-VERIFIED` disposition: pinned evidence + a provisional TRUE/FALSE verdict) →
`verified-claims.md` (TRUE/FALSE). CANCELLED → `bad-claims.md` from any stage. Questions:
`open-questions.md` → `answered-questions.md` or `cancelled-questions.md`. Plus `scratchpad.md`, a
generated `INDEX.md`, and a shared `rubric.md` at the `claims-data/` root.

**Evidence as code-tree tests.** There is **no `evidence/` directory**. Evidence is always a named
reference pinned by **SHA + date, without line numbers**. A claim about source *text* points at a
file/function/heading; a *behavior* claim points at a **red-green, non-vacuous Claim test**; a *data*
claim points at a pinned query/test. Claim tests live in the code tree at `testDir` (`null` =
colocate with the project's own tests, or e.g. `scratch/`) — the user's choice. Every Claim test's
docstring restates the Claim in full and carries its ID; the ledger is the single source of truth and
docstring↔ledger headline parity is lint-enforced.

## Considered options (and why rejected)

- **Frozen `evidence/` store** (`<ID>-e<N>.txt`, sha256'd). Preserves verbatim output fidelity, but
  the artifacts aren't runnable, drift silently, and duplicate what a test already proves. Rejected
  in favor of runnable, self-documenting Claim tests whose SHA+date pin *is* the freeze.
- **Enum `layout: "root" | "topic"`.** Reads as either/or, but the root Ledger always exists, so the
  real question is only "are topics *also* allowed?" — a boolean. Rejected as mismodeling.
- **True hybrid "both" as a distinct third mode.** Its only real cost was the
  `claims-data/evidence/`-vs-topic name collision; removing the `evidence/` dir dissolved that, so
  "root + optional topics" needs no third mode.
- **Docstring as source of truth** (ledger generated from tests). Rejected: the ledger is the
  lifecycle home; a Claim exists before any test does, and drafts/questions have no test. Ledger is
  source; the docstring mirrors it under a parity lint.

## Consequences

- `ledger.json` schema delta: `+topics`, `+testDir`, **`−evidenceDir`** (defunct). Existing
  `evidenceDir` values (e.g. pycats' `claims-data/evidence`, which never existed on disk) become dead
  config.
- The conformance check (#22) must validate the `topics` layout, the new file-set, and
  docstring↔ledger parity — not just tree shape.
- "Verified" now means *a human judged it*, not *a machine found matching evidence*.
  `verified-claims.md` is a record of ratified judgments.
- Claim text is deliberately duplicated (ledger entry + test docstring); the parity lint is what
  keeps this from becoming the drift bug filed as #24.
