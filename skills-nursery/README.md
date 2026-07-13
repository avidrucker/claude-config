# skills-nursery

Skills that are **version-controlled but deliberately not installed.**

`install.sh` only walks `skills/*/`, so nothing in here is symlinked into `~/.claude/skills/`
and nothing in here can trigger. To promote a skill, `git mv` it into `skills/` and re-run
`./install.sh`. To retire one, move it back.

This exists because "committed" and "installed" are separate states, and conflating them has
already bitten us in both directions:

- **`claim-ledger`** was committed for weeks and never symlinked, so it never triggered — the
  work existed but was invisible to every session.
- **`muda-analyze`** and **`verify-claims`** were the mirror image: written straight into
  `~/.claude/skills/` as real directories, so they worked immediately but were untracked,
  unbacked-up, and one `~/.claude` wipe from gone.

The nursery makes "not live, on purpose" an explicit, visible state rather than an accident.

## Current residents

### `claim-ledger`

The **rival arm of a deliberate A/B**, not abandoned work. It and `verify-claims` disagree on
exactly one thing, on purpose:

|  | `claim-ledger` | `verify-claims` (live) |
|---|---|---|
| Source of truth | **one registry table**, status as a column | **four lifecycle files**; the index is generated |
| Evidence | tiered textual sources (T1/T2/T3) | multi-kind: quote · **test** · **query** · observation · attestation |
| Verifies *behavior* | not modeled | requires **executed** evidence |
| Verifies *data* | not modeled | a `query` + an as-of pin |

Everything else — the falsifiability screen, stable IDs, SHA pins, the no-shadow-tracker rule —
is held constant so a comparison isolates the real variable.

**It is parked here rather than installed because both skills' trigger descriptions overlap
heavily.** With both live, the model picks one unpredictably, which would make `verify-claims`
fire unreliably during the muda analysis that depends on it. Promote `claim-ledger` when you
actually want to run the A/B — and when you do, narrow one of the two descriptions first so
the choice is deterministic rather than a coin flip.

Ratified in `pycats#712` (`docs/research/pcs-claim-ledger-formalization-findings.md`).
