# verify-claims — maintainer notes

For agents **working on the verify-claims skill inside claude-config** — not for consumers. A consuming
project's agent reads `SKILL.md` and looks terms up in `glossary.md`; neither is routed here. This file
holds what you need to **change the skill without breaking it**, and nothing a consumer would read.

> This deliberately is **not** a domain glossary — term definitions live once, in
> [`glossary.md`](./glossary.md). If a future design session resolves a new term, put it there, not here.

## The two surfaces

| Surface | Files | Reached by |
|---|---|---|
| **Consumer** (ships / read when the skill runs) | `SKILL.md`, `lint_claims.py` (run by path), `glossary.md` (linked from `SKILL.md`) | an agent invoking the skill in pycats / lccjs / pmtools / statecharts-py |
| **Maintainer** (this repo only, never routed to a consumer) | `CONTEXT.md` (this file), `docs/adr/`, `test_lint_claims.py` | an agent editing the skill here |

The skill dir is symlinked into `~/.claude/skills/` by `install.sh`. Only the consumer surface should
grow a reader outside this repo.

## Anti-drift map — where each fact lives, once

Duplicating a fact is how it drifts. #24 was the rubric restated in a second file that fell out of sync.
The rule: **one home per fact**; every other place links, never restates.

| Fact | Single home | Do not restate in |
|---|---|---|
| admission rubric (11 criteria) | `SKILL.md` | `claims-data/`, any per-project file |
| linter codes + their fixes | `lint_claims.py` emits them; `glossary.md` glosses them | `SKILL.md` (name-list only, no glosses) |
| term glosses (Claim, `Bears-on`, evidence kinds, pins) | `glossary.md` | `CONTEXT.md` |
| config schema (the 7 keys) | `SKILL.md` | — |
| design rationale (the *why*) | `docs/adr/` | `SKILL.md`/`CONTEXT.md` (link instead) |

## Invariants any change must preserve

- **Verified = a human judged it** — never "a machine matched evidence." Pinned evidence is necessary,
  never sufficient.
- **A decision is not a claim.** Enforced at three points: rubric criterion 9 (Descriptive), the
  `statement` kind's weakness, and `WARN_SCREEN` (decision/opinion language). Keep all three.
- **MOVE, never COPY** — an id in two files is `DUPLICATE_FILE`. The file *is* the status; there is no
  `Status:` field.
- **Evidence is kind-matched and SHA + date pinned** — four kinds (`reference`/`test`/`query`/
  `statement`), no re-checkability tiers.
- The ledger is **git-excluded** and resolved at the **MAIN checkout**, never inside a worktree.

## Changing the skill

- **Lint changes are TDD.** Add the failing case to `test_lint_claims.py` first (stdlib only, run with
  `python3`), watch it fail, then implement. The suite is the acceptance gate.
- **Add or rename a linter code** → update `glossary.md`'s code tables **and** `SKILL.md`'s code
  name-list in the same change.
- **Add or change a term** → `glossary.md` only.
- **A hard-to-reverse design change with real trade-offs** → write an ADR in `docs/adr/` (see
  [`0001`](./docs/adr/0001-ledger-lifecycle-and-evidence-model.md) for the model's rationale).

## Pointers

- **Consumer guide / rubric / config schema:** [`SKILL.md`](./SKILL.md)
- **Term lookup + linter codes:** [`glossary.md`](./glossary.md)
- **Why the model is shaped this way:** [`docs/adr/`](./docs/adr/)
