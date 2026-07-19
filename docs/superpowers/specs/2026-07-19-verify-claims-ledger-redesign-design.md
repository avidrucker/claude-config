# verify-claims ledger redesign — design spec

- **Date:** 2026-07-19
- **Implements:** #25 · **Decision record:** [`ADR-0001`](../../../skills/verify-claims/docs/adr/0001-ledger-lifecycle-and-evidence-model.md) · **Glossary:** [`CONTEXT.md`](../../../skills/verify-claims/CONTEXT.md)
- **Blocks:** #22 (parity) · **Folds in:** #24 (rubric single-source) · **Migration:** #27 (separate)

## Purpose

Rewrite the verify-claims skill to the model ratified in #23 and refined in the #25 implementation
grill (2026-07-19). This spec is the authoritative build target for #25. ADR-0001 records *why*;
`CONTEXT.md` fixes the vocabulary; this document says *what to build*.

## 1. Config — `.claude/ledger.json`

Keys are identical across all four repos (values may differ):

| Key | Type | Default | Note |
|---|---|---|---|
| `enabled` | bool | `true` | `false` → no-op, and say so |
| `dir` | str | `"claims-data"` | ledgers root, relative to the MAIN checkout |
| `prefix` | str\|null | `null` | `null` → first 3 letters of the repo dir, uppercase |
| `agentScoped` | bool\|null | `null` | `null` → derive from fleet mode |
| **`topics`** | bool | `false` | **NEW** — see §2 |
| **`testDir`** | str\|null | `null` | **NEW** — `null` = colocate Claim tests with the project's own tests; a path (e.g. `"scratch/"`) puts them there |
| `overloadedTerms` | str[] | pmtools set | headline-situating check |

- **REMOVED:** `evidenceDir` (defunct — no frozen store).
- **No `claims-data/rubric.md`.** The admission rubric is single-sourced in the skill; there is **no**
  per-project override. (This is the full resolution of #24.)

## 2. Layout

- The **root Ledger always exists** at `<dir>/`.
- `topics: false` (default) → root Ledger only.
- `topics: true` → root Ledger (**general** claims) **plus** `<dir>/<topic>/` Ledgers (**specific**
  claims).
- The **user** files each new claim; Claude may suggest, the user always decides.

## 3. Files (per Ledger)

**Standard flat set:** `draft-claims.md`, `unverified-claims.md`, `verified-claims.md`,
`bad-claims.md`, `open-questions.md`, `answered-questions.md`, `cancelled-questions.md`,
`scratchpad.md`.

**Conditional:** `INDEX.md` — generated **only** when the Ledger carries topics or other custom
files. A plain root-only standard Ledger has none.

**Removed:** the `evidence/` directory; `rubric.md`.

## 4. Claim lifecycle

`DRAFT → UNVERIFIED → VERIFIED`, with `CANCELLED` terminal.

- **DRAFT** (`draft-claims.md`) — Claude adds **freely, ungated**; each carries a **draft-local
  placeholder ID** (`d1`, `d2`, … unique within `draft-claims.md` only).
- **Admission** (`DRAFT → UNVERIFIED`) — **human approval**; the **11-criterion rubric** applies; the
  real ID `<PREFIX>-<TYPE>-<NNN>[-<AGENT>]` is **minted here**. Rubric failure → `bad-claims.md` (real
  ID minted, failed criteria named).
- **UNVERIFIED** (`unverified-claims.md`) — accumulating pinned evidence. May carry the disposition
  **`TREATED-AS-VERIFIED`** (pinned evidence + a provisional TRUE/FALSE), still awaiting verification.
- **Verification** (`UNVERIFIED → VERIFIED`) — **human judgment**; verdict TRUE/FALSE. Evidence is
  necessary, never sufficient.
- **CANCELLED → `bad-claims.md`** from any stage **once a real ID exists**. An abandoned **pre-ID
  draft** is a silent discard (it never entered the Ledger proper).

**Dispositions** inside `unverified-claims.md`: `unverified` (default), `TREATED-AS-VERIFIED`,
`re-verify` (a demoted claim whose evidence was invalidated). *(Proposal — see Open items: drop the
legacy `INFERENCE` and `REPORTED` dispositions.)*

## 5. Evidence

**No `E1/E2/E3` tiers.** Four kinds:

| Kind | For a claim about… | Pin |
|---|---|---|
| `reference` | a source's **text** | named file / function / heading @ **SHA + date, no line numbers** |
| `test` | **behavior** | a **red-green, non-vacuous Claim test** in the code tree at `testDir` |
| `query` | **data** | command + output + an **as-of predicate**, pinned |
| `statement` | WHO said/saw WHAT, WHEN | who + when (+ issue/source) |

- **Kind-matching** is required: a behavior claim needs a `test`, a data claim a `query`, etc.
- **`statement`** is non-reproducible signal, weighted by the WHO: it **corroborates** a factual claim
  (never verifies it alone), **may answer a Question**, and is **never itself a Claim**.
- A **Claim test's docstring restates the claim in full and carries the Claim ID**, so it reads
  standalone. The ledger is the single source of truth; **docstring↔ledger headline parity is
  lint-enforced**.
- A **verified** entry requires: a verdict; **≥1 reproducible, kind-matched, pinned** item; every item
  pinned; and an **`Entails.`** line (one sentence: how the evidence entails this exact claim).

## 6. Decisions-are-not-claims guardrail

Claim files hold **only validatable statements about code / libraries / data**. Decisions, plans, and
preferences are **not claims** → an issue or ADR. Enforced at three points:

1. **Admission rubric criterion 9 (Descriptive)** — "states what IS, not what should be" (human screen).
2. **The `statement` kind** — explicitly weak; no backdoor to admit a decision as a claim.
3. **Lint `WARN_SCREEN`** — flags decision/opinion language ("we should", "let's", "decided to",
   "prefer") appearing in claim files.

## 7. Lint — `lint_claims.py`

Aware of the new file-set and the `topics` layout; no `evidence/` dir; no `rubric.md`.

- **Errors:** `MISSING_VERDICT`, `NO_EVIDENCE`, `MISSING_PIN`, `MISSING_ENTAILS`, `PARITY_MISMATCH`,
  `DUPLICATE_FILE`, `DUP_NUMBER`, `WRONG_FILE`, `DANGLING_REF`, `STALE_INDEX` (only when an INDEX is
  expected — i.e. topics/custom files present).
- **Warns:** `WARN_KIND_MISMATCH`, `WARN_SAME_AUTHOR`, `WARN_DEFUNCT_KEY` (names the key, points at
  #27), `WARN_SCREEN`, `WARN_DRIFTED`, `WARN_UNPINNED_QUERY`.
- **WARN, never FAIL, on defunct/unknown `ledger.json` keys** (e.g. legacy `evidenceDir`) — preserves
  green lint through the #25→#27 window.

## 8. Docs to rewrite

- **`SKILL.md`** — the whole model above; single-source the admission rubric here.
- **`references/claims-data-README.md`** — the per-Ledger README: new file-set + lifecycle; no
  duplicated/stale rubric (folds #24).
- **`CONTEXT.md`** — DONE.
- **`ADR-0001`** — DONE.

## 9. Out of scope

- Migrating the four repos' on-disk ledgers/configs → **#27**.
- ID-format configurability + `--fix-ids` → **#17** (shares `lint_claims.py`).

## Open items (for spec review)

1. **Dispositions.** Proposal: keep only `{unverified, TREATED-AS-VERIFIED, re-verify}` and drop the
   legacy `INFERENCE` and `REPORTED` dispositions — `REPORTED` ("not reproducible by you") overlaps
   the new `statement` signal, and `INFERENCE` is rarely used. Confirm, or keep them?
