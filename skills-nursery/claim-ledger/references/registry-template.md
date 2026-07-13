# Claim-ledger registry (heavyweight mode)

One source-of-truth table. Filtered views (open questions, verified-only) are *generated* from this,
never hand-maintained in parallel. Free-form `scratchpad` and `bad-claims` (archive) live in separate
files. `citation` holds the **verbatim quote + `@<sha>`**; `rests-on` lists the IDs a composite or an
`INFERENCE` claim depends on. See `../SKILL.md` for the rules.

## Registry

| ID | type | statement | status | tier | verdict | asserted | verified | citation | rests-on |
|----|------|-----------|--------|------|---------|----------|----------|----------|----------|
| PCS-C-001 | C | git-bug stores each bug under `refs/<namespace>/<id>` | verified | T1 | TRUE | 2026-07-07 | 2026-07-08 | "made available as a git `Reference` under `refs/<namespace>/<id>`" @a1b2c3d | |
| PCS-C-002 | C | git-bug's GitHub bridge needs a PAT | unverified | T2 | | 2026-07-07 | | paraphrase only — fetch raw third-party.md | |
| PCS-Q-001 | Q | Does pmtools push with `--mirror`/`--prune`? | open | | | 2026-07-07 | | | |
| PCS-CC-001 | CC | git-bug replicates over plain git | PENDING | | | 2026-07-08 | | | PCS-C-001, PCS-C-002 |

## Notes
- **verdict** is only set when `status = verified` (and never on a `CC` — its verdict is derived).
- **citation** on a `verified` row MUST contain a verbatim quote AND an `@<sha>` (7–40 hex).
- **rests-on** is required for `type = CC` and for any `status = INFERENCE` row.
- A claim that isn't objective/atomic/anchored never enters this table — archive it in `bad-claims.md`.
