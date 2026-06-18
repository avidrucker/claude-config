# puzzle-triage changelog

## 0.3.1 — 2026-06-15

Surface **provisional** ICE rows (lccjs #1322). Rows auto-derived from labels by
`npm run ice:score -- --auto` (the maintenance sweep that keeps the table from going
stale) carry `provisional=1` in `stats/ice-scores.csv`; triage now ranks them normally
but marks them "⚠ provisional — review I/C/E" so a rough label-based guess is not
mistaken for a considered judgement.

## 0.3.0 — 2026-06-15

Rank by **ICE score** (Impact × Confidence × Ease, from `stats/ice-scores.csv`)
instead of severity-first (lccjs #1323). Within Actionable: override tiers
(`priority:critical`/`elevated`) first, then ICE desc, then severity as a secondary
tiebreak; issues with no ICE row sort last, flagged "needs ICE scoring" (graceful
degradation). ICE is the holistic priority number — Impact already folds severity
in — so an easy, high-confidence task can legitimately outrank a harder
higher-severity one; truly urgent work uses an override tier. Output now shows each
row's ICE score. Pairs with the ICE re-adoption work (lccjs #1320 / `ice-score.js`,
formula fixed to `I×C×E` in #1327).

## 0.2.1 — 2026-06-01

Add explicit "NEVER fire on greetings" gate (#377). The Triggers section now lists
forbidden contexts — agent-readiness greetings ("you are agent X", "are you ready to
work?") and any message where the user is not explicitly requesting a priority view.
Frontmatter description updated to include the gate so the harness exposes it as part
of the skill's trigger contract. Accompanies a companion "Session orientation" section
added to `docs/claude_workflow.md` in the lccjs project.

## 0.2.0 — 2026-05-30

Add the 🔒 **Locked** overlay (lccjs #238, design #222). A `puzzle:status` row with
status `LOCKED` — a *derived cluster soft-lock*, meaning a clustermate holds a live
worktree, so the code-area is hands-off — is lifted out of the actionable queue into
its own 🔒 section, ranked by severity but flagged not-grabbable. Unlike ⛔ blocked
(a `blocked` *label*, waiting on an issue), 🔒 is transient and **derived**: it clears
by itself when the clustermate's worktree closes (nothing stored). Gather step now
reads `puzzle:status -- --json` (`rows[].status` ∈ AVAILABLE/CLAIMED/IN-PROGRESS/
LOCKED/BLOCKED/STALE). Degrades silently when there's no cluster manifest.

## 0.1.1 — 2026-05-28

Rename the 💤 section "Parked" → "Icebox" (legend, algorithm, output sample,
frontmatter description). Clarify the icebox-vs-blocked distinction: an iceboxed
issue (`proposal`/`wontfix`) only re-enters the queue when someone schedules it,
whereas a blocked issue re-enters automatically once its blocker clears. Note
that a blocker may be named in a comment, not just the body (e.g. "needs input
from <person>").

## 0.1.0 — 2026-05-28

Initial release. Read-only "what's next" view: ranks open GH issues by severity
(🔴 high / 🟠 medium / 🟡 low / ⚪ untriaged) then by Yegor priority (shortest
`@todo` estimate first, then FIFO by issue number), and splits ⛔ blocked and 💤
parked (proposal/wontfix) work into their own non-actionable sections.

Gathers data via `gh issue list`; optionally joins pdd `@todo #N:Est` markers for
estimates and the `puzzle:status` reconciler to drop claimed/in-flight work.
Degrades gracefully without pdd. Recommends a top pick and surfaces triage debt
(issues missing a `severity:*` label) but mutates nothing — labeling/starting
hands off to yegor-pm + puzzle-velocity.

Companion to puzzle-velocity and the lccjs `puzzle:status` script; concretizes the
"priority queue" step of the yegor-pm epic pipeline.
