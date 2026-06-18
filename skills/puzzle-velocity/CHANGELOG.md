# puzzle-velocity changelog

## 0.6.0 — 2026-05-29

Retire the rebase-conflict dance. The closing protocol becomes a **single
commit** (marker deletion + CSV row together) and `closed_commit` is now logged
**empty** — the rebase rewrites the closing commit's SHA, so capturing it before
the push was always fragile (one close cycled `5c811f8 → 45f2654 → ab80bbc`).
Derive it from the commit message instead: `git log --grep "Closes #N" -1
--format=%h`. Pairs with a `merge=union` git-attribute on the velocity CSV
(`docs/puzzle-velocity.csv merge=union`) so parallel row-appends auto-union on
rebase with no manual conflict and no marker-guard for the CSV — `union` is
verified to fire under `rebase`, not just `merge`. The marker-guard now applies
only to genuine non-union conflicts (e.g. two agents editing `TODOS.md`).
Researched and applied in lccjs #186 (`docs/research/velocity-log-storage.md`).

## 0.5.0 — 2026-05-29

Add the `agent` column to the CSV row shape: every new row logs **who** did the
work (the worktree fruit identity, uppercased — e.g. `APPLE`), alongside role,
start/finish, estimates, and closing commit. Trailing column so positional CSV
readers keep their existing indices; never backfill historical rows whose agent
is unverifiable (empty is honest). Pairs with the agent-identity convention
introduced in lccjs #179 (self-assigned fruit names via `npm run claim`) and
landed in lccjs #180.

## 0.4.0 — 2026-05-28

Expand the rebase-conflict resolution step into a 5-substep checklist with an
explicit `grep -c '^<<<<<<<\|^=======\|^>>>>>>>'` guard between conflict
resolution and `git add`. The guard catches two real failure modes: (a) the
resolution edit applied to the wrong region (markers left behind), and (b) the
Edit tool erroring silently ("File has not been read yet") and the file
retaining raw conflict markers — `git add` + `git rebase --continue` will
otherwise happily ship a broken file. Surfaced on lccjs's #139 close, where
this exact sequence shipped a CSV with `<<<<<<<` markers in it; followup commit
`a19d115` cleaned it up but the protocol now blocks it from happening again.

Also updates `lccjs/docs/puzzle-velocity.md` to mirror the same checklist.

## 0.3.0 — 2026-05-28

Worktree-claim convention: introduce the `@inprogress` marker state for the
parallel-agent workflow. When a puzzle is checked into a worktree, flip its
source marker `@todo #N:…` → `@inprogress #N:…` so the claim is visible on
`main`. `pdd` matches only `@todo`, so `@inprogress` is invisible to the gem's
scan — no fork, no double-count. The `puzzle:status` reconciler
(`scripts/puzzle-status.js` in lccjs) joins markers × worktrees × issue state
into AVAILABLE / CLAIMED / IN-PROGRESS / BLOCKED / STALE; run it before grabbing
(skip CLAIMED/IN-PROGRESS) and after closing (delete STALE markers).

Picking-up and closing protocols updated accordingly. Also corrects the SKILL.md
frontmatter `version` (was stale at 0.1.0 while VERSION/CHANGELOG were at 0.2.0).

## 0.2.0 — 2026-05-28

Parallel-agent safety: insert `git pull --rebase` between the closing
commit and the SHA capture. Surfaced by two independent agents both
hitting orphan-SHA-from-rebase in the same hour on lccjs.

Before: `commit → capture SHA → append row → commit row → push`.
After: `commit → pull --rebase → capture SHA → append row → commit row → push`.

Also adds a note about CSV merge conflicts during the rebase and
how to recover the closed_commit field.

## 0.1.0 — 2026-05-28

Initial. Captures the two-estimate (H / C) workflow that lccjs adopted with
the dual `docs/puzzle-velocity.csv` (data) + `docs/puzzle-velocity.md`
(explainer) structure. Two-commit close pattern included to avoid orphan
SHAs from `git commit --amend` backfills.

Sibling to the yegor-* skill family (yegor-pdd, yegor-microtasks,
yegor-velocity, yegor-spikes).
