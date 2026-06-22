---
name: fruit-agent-orchestrate
description: Triage all open issues for the current project and produce a prioritized work plan. Config-driven (.claude/orchestrate.json) — in fleet mode it emits copy-pasteable plain-paragraph assignments per agent (APPLE, BANANA, CHERRY, DRAGONFRUIT, ELDERBERRY, FIG, GRAPE, HONEYDEW); in solo mode a ranked queue + next-up pick. Use ONLY when the user types the exact text "/fruit-agent-orchestrate" — never trigger autonomously or from description alone.
---

# fruit-agent-orchestrate

Triage the open issue queue and produce a prioritized work plan for the current project. The shape adapts to `.claude/orchestrate.json` (Step 0): a ranked queue in `mode: "solo"`, or per-agent assignment paragraphs in `mode: "fleet"`. Read-only — no claims, no labels, no mutations.

## Trigger rule

**Only run when the user types `/fruit-agent-orchestrate` verbatim.** Never self-trigger.

## Step 0 — load project config

This skill bakes in **zero** project-specific assumptions. Read `.claude/orchestrate.json`
at the repo root and apply it. Full schema: `references/orchestrate-config.md`. If the file
(or any key) is missing, fall back to defaults; if the whole file is absent, note
`(no orchestrate config — generic defaults)` in the output.

Defaults: `mode: "solo"`, the 8-fruit roster, `issueLimit: 50`, `host: "github"`, all
`enrichment`/`advisory` commands `null`.

Resolve three things from config before collecting data:
- **Provider adapter** from `host`: `github` → the `gh` CLI; `gitlab` → the `glab` CLI.
  GitLab is not yet implemented — if `host: "gitlab"`, emit `gitlab adapter not yet implemented`
  and stop.
- **Mode** from `mode`: `"solo"` (single ranked queue) vs `"fleet"` (parallel per-agent
  assignments + collision guards). Most of Steps 4–5 are gated on this.
- **Enrichment commands** (`status`, `claim`, `preflight`) — resolved **per command**:
  1. explicit `enrichment.<x>Command` if non-null → use verbatim;
  2. else if `pmtools.home` non-null → derive `<home>/<port>/<tool>` (port defaults to
     `languages[0]`'s port);
  3. else → unavailable: skip that step and note it.

## Step 1 — collect data

Always run these in a single parallel tool-use call (no ordering dependency). Use the
**provider adapter** (Step 0) and `issueLimit` (default 50) — never hardcode `gh`/100.
Read all outputs before Step 2.

```bash
# provider "list open issues" — GitHub form shown; glab form differs (see adapter)
gh issue list --state open --limit <issueLimit> \
  --json number,title,labels,createdAt \
  -q '.[] | "#\(.number)\t\([.labels[].name]|join(","))\t\(.title)"'

git worktree list

date '+%Y-%m-%dT%H:%M:%S%z'   # triage timestamp — stamp it on the output (freshness contract)
```

Then, **only if the `status` enrichment command resolved** (Step 0), run it for the
stale-marker/claim signal — e.g. `npm run puzzle:status` (lccjs) or `<pmtools>/<port>/status`.
If it did not resolve, skip it and note `(puzzle-status enrichment unavailable for this project)`
in the pre-flight section. Likewise `preflightCommand` is used only where resolvable.

**Freshness contract.** This skill takes a snapshot of *open* issue state at triage time and freezes it into prose that is consumed asynchronously — often one agent at a time, over a long session — while those same agents are rapidly closing tickets. So the snapshot decays: a later assignment can name a `#N` that closed hours earlier. To bound that staleness, capture the `date` above and stamp it on the output (see Output shape), and treat the output as **single-round / short-lived** — re-run the skill each round (or after several closes) rather than reusing one assignment list across a multi-hour session. (#1159)

## Step 2 — pre-flight cleanup

Before ranking, scan for and surface:
- **Stale markers** *(only when the `status` enrichment resolved — Step 0)*: `puzzle:status` rows flagged `[STALE]` — issue is CLOSED but marker still exists. Note the file + line. If the enrichment is unavailable, skip this bullet and rely on the noted `(puzzle-status enrichment unavailable)` line.
- **Stale worktrees**: `git worktree list` entries whose branch issue number resolves to a CLOSED issue (`gh issue view N --json state -q .state`). Note the path and branch.
- **Sequencing constraints**: tickets whose body carries a `Sequenced after: #N` line must not be assigned ahead of their dependency (#824). Cheap pre-filter: only inspect bodies of tickets carrying the `sequenced` label; without the label, checking every body is too expensive at 50+ issues. For each constrained ticket, resolve #N's state and decide:
  - **#N CLOSED** → constraint satisfied; ticket is freely assignable.
  - **#N OPEN and claimed/in-flight** → hold the dependent ticket; annotate it `⏳ waiting on #N (in-flight)`.
  - **#N OPEN and unclaimed** → assign #N first (to the most available agent); hold the dependent ticket for a later round.

  Report held tickets under a `## ⏳ Sequenced — waiting on dependency` section, and never assign a dependent ticket and its open predecessor to two agents in the same round. (Advisory `puzzle-clusters.csv` cluster overlaps may also be surfaced as `⚠ #A and #B share cluster X — consider sequencing`, but that is non-blocking.) Full protocol: `docs/learnings/today-i-learned-2026-06-05-dragonfruit.md` §3.
- **Dependency-coupled grooming** (#1243): a PM/grooming/hygiene ticket whose body *is* dependency metadata about another ticket X — i.e. it grooms the open/closed **state** of X's blockers — must not be co-scheduled in the same wave that assigns or expects closure of X's blockers. Detect by scanning the grooming ticket's body for the `#N`s it references; if any referenced `#N` is itself actionable and assigned this wave, **defer the grooming ticket to a later, quieter wave** (list it under the held section). Otherwise its groomed facts rot mid-execution *while the assigned ticket itself stays OPEN* — the failure #1159's claim-time OPEN check cannot catch. When deferral is genuinely unavoidable, the assignment paragraph MUST carry the execution-time freshness stamp (Step 5b). Full dependency-graph lanes are deferred to the post-#1046 (`puzzle:status --json`) seam; this is the interim heuristic.

Report stale markers and stale worktrees at the top of the output under `## ⚠ Pre-flight cleanup` — they belong to the agent whose fruit name appears in the branch/file and must be resolved before that agent claims new work.

## Step 3 — triage (embedded puzzle-triage logic)

Rank actionable issues using the full puzzle-triage algorithm:

**Partition first:**
- 🧑 **Requires human routing** — has `humans-only`, `decision`, or `human-decision-required` label → separate section, not assigned to any agent. List these tickets under `## 🧑 Requires human routing` so the human is aware. The `guide-human-decision` skill handles them when a human explicitly directs an agent at one.
- 💤 **Icebox** — has `proposal` or `wontfix` label → separate section, not ranked for action
- ⛔ **Blocked** — has `blocked` label → separate section, note blocker, not grabbable
- 🔵 **In-flight** — has a live worktree (from `git worktree list`) → separate section, skip for assignment

**Within Actionable, order by:**
1. Severity: 🔴 `severity:high` → 🟠 `severity:medium` → 🟡 `severity:low` → ⚪ untriaged
2. Shortest estimate first (from `@todo #N:Est` marker if present; `~` if absent)
3. Lowest issue number as tiebreak

**Tolerate missing labels.** The labels above are a shared convention but are **not**
required. A repo that hasn't applied them yet (e.g. freshly migrated) simply has every
issue sort as ⚪ untriaged, ordered by estimate then number; the `humans-only`/`proposal`/
`wontfix`/`blocked` partitions just come up empty. Never error on an absent label.

Render the actionable queue as a compact table. Keep it scannable — one line per issue.

## Mode fork (from `config.mode`)

- **`mode: "solo"`** → **skip Step 4 and Steps 5/5a/5a-bis entirely.** There are no parallel
  agents, so there is no roster, no area bin-packing, and no same-file collision risk. Emit the
  **solo output** (ranked queue + "Next up" pick) — see Output shape › Solo. Step 2's
  stale-marker scan and Step 3 ranking still apply; Step 2's worktree/sequencing/grooming
  sub-points are fleet concerns and are skipped.
- **`mode: "fleet"`** → run Steps 4–5 as written below.

## Step 4 — agent roster (fleet only; dynamic in-flight detection)

The roster is **`config.roster`** (default the 8 fruits APPLE … HONEYDEW). Derive who is busy
from the `git worktree list` output (Step 1): parse each non-main entry's branch with
**`config.worktreeBranchPattern`** (default `^(?<agent>[a-z]+)/issue-(?<issue>\d+)`) — the
`agent` capture is a **busy agent**, in-flight on the `issue` capture. Mark those busy and the
rest available:

| Agent | State |
|-------|-------|
| each roster member + any other active agent | **available**, OR **busy — in-flight on #N** (derived from `git worktree list` via `worktreeBranchPattern`) |

- Do **not** assign new work to a busy agent this cycle.
- **Surface, don't hide:** list each busy agent in the broadcast as `🔵 <FRUIT> — in-flight on #N, skip this cycle`, so the human can see *why* an agent was skipped and override if needed.

> #630 ruling: Q1 = parse `git worktree list` inline (the data is already in Step 1; no extra tool call); Q2 = surface, don't silently skip. The cleaner long-term home is the `puzzle:status --json` redesign (#1046), which reports `CLAIMED`/`IN-PROGRESS` directly. **Cross-clone caveat:** `git worktree list` only sees *this* checkout's worktrees — an agent working in a different clone won't appear here; the `claim` guard (#1010) is the backstop for that residual case. Origin repro: #1335.

## Step 5 — produce assignments (fleet only)

> Skipped entirely in `mode: "solo"` (see Mode fork). Solo emits a ranked queue instead.

### 5a — group issues by area

Before writing paragraphs, partition the actionable issue queue by `area:*` label:

1. Extract the `area:*` label(s) from each actionable issue (captured in Step 1). An issue with multiple `area:*` labels belongs to its first-listed `area:*` label.
2. Build a cluster map: `area → [issue list]`, sorted within each cluster by Yegor priority (severity → estimate → number).
3. Issues with **no `area:*` label** go into a **wildcard pool** — assignable to any agent.
4. Sort clusters by size (largest first). Assign each cluster to the agent with the fewest issues so far (greedy bin-packing). Never assign overlapping area clusters to the same agent.
5. Distribute wildcard issues to the lightest-loaded agents after cluster assignment.

Goal: each agent touches **at most one `area:*` cluster** per session. If there are more agents than clusters, some agents receive only wildcard issues — that is acceptable.

### 5a-bis — same-file collision guard (hard refusal) (#1438)

The `area:*` lane gate is **necessary but not sufficient**: two tickets can share neither area-subtheme yet still edit the same file (e.g. #1111 fixes `scripts/claim.js` behavior and #1196 adds tests for `claim.js` main() — different sub-themes, same file). Before finalizing assignments, run a file-overlap check:

1. For each candidate assignment, infer its likely file target(s) from the ticket's type/scope, title, and any file paths named in the body (e.g. `scripts/claim.js`, `src/core/interpreter.js`). When in doubt, bias toward *assuming* overlap.
2. If two candidate assignments plausibly touch the **same file**, you MUST NOT co-schedule them this round. **Refuse** — assign the higher-priority ticket (Yegor order) to one agent and **hold** the other.
3. List every held ticket under the `## ⏸ Held — same-file collision` output section with the reason, e.g. `⏸ #1196 held — would collide with #1111 on scripts/claim.js this round`.

This is a hard refusal, not a softenable heuristic. **Never** resolve a same-file overlap by telling the two agents to coordinate — that delegates a concurrency-safety decision to runtime agents and defeats the worktree-per-task isolation model. Each emitted assignment must be executable in isolation with **zero** cross-agent negotiation. (Full file-target precision wants the `puzzle:status --json` seam #1046; until then, the refuse-on-plausible-overlap heuristic above is the contract.)

### 5b — write one paragraph per agent

For each agent, write one plain paragraph. Rules:
- No blockquote `>` prefix, no code fences
- Name the ticket number and title
- State the agent's assigned area lane: "Your area lane: `area:X`" (or "area unlabelled" for wildcard-only agents)
- One sentence of rationale (why this agent, why this ticket now)
- If the agent has pre-flight cleanup (from Step 2), lead with that before the ticket assignment
- Format must be directly copy-pasteable as a human instruction to that agent
- **NEVER emit a coordination instruction between agents** (#1438). Assignment paragraphs must not contain the words "coordinate", "land his/her fix first", "if you both end up in", or any phrasing that makes one agent's safety or correctness depend on another agent's actions or timing. If you find yourself about to write such a sentence, the two tickets collide on a file and one of them should have been **held** by the 5a-bis guard, not assigned — go back and hold it.
- **Do NOT append a per-paragraph "verify the issue is OPEN / run the preflight command `<N>`" instruction** (e.g. the resolved `preflightCommand`, or `npm run preflight <N>` on lccjs). The freshness re-check is surfaced **once**, globally, in the `## ⏱ Triaged as of …` banner (see Output shape) — repeating it per agent is boilerplate that bloats each assignment and undercuts its self-contained legibility. (#1159 freshness contract, kept boilerplate-free per the #1200/#1201 assignment-legibility rubric.)
- **Exception — execution-time referent stamp for dependency-coupled grooming** (#1243): the global OPEN banner above covers the *assigned* ticket's state; it does **not** cover the `#N`s a grooming/PM ticket *references*. So when a PM/grooming/hygiene ticket whose content is another ticket's dependency metadata could not be deferred (Step 2), append exactly **one** targeted line: "Before you edit or close this, re-verify the live state of every `#N` it references (`gh issue view N --json state`) — those deps may be closing in this same wave." This is the *only* sanctioned per-paragraph freshness stamp; it does not violate the no-boilerplate rule because it targets *referents* (uncovered by the banner), not the assigned ticket, and appears only on dependency-coupled grooming assignments — never on ordinary tickets.

Good fit heuristics:
- Match ticket role (WRITER / RESEARCHER / ARCHITECT / DEV) to the agent's recent work domain if known from context the user provided
- Prefer unblocking tickets (e.g. a RESEARCH that unblocks a WRITER) when an agent is free and the pair exists
- Medium-severity tickets before low when an agent is fresh
- Never assign two agents to the same `area:*` cluster (enforced by 5a; flag it explicitly if unavoidable due to too few clusters)
- Never assign two agents tickets that touch the same **file** — the 5a-bis guard holds one of them; the held ticket never appears as an assignment this round

## Output shape

Two shapes, picked by `config.mode`. Both **must** open with the freshness banner (the `date`
from Step 1).

**Freshness banner wording** depends on the resolved `claimCommand` (Step 0): if set, name it
("`<claimCommand>` gates on CLOSED state…"); if unavailable, use the generic line ("verify the
issue is still OPEN before starting — there is no claim guard in this project").

### Fleet (`mode: "fleet"`)

```
## ⏱ Triaged as of <ISO triage timestamp> — re-validate before claiming
This snapshot decays as agents close tickets. <claimCommand, if set,> gates on CLOSED state (it
refuses a closed issue), but that guard skips when the host CLI is offline — so verify OPEN if in
doubt. Re-run this skill each round (or after several closes); do not reuse this list across a long
multi-hour session.

## ⚠ Pre-flight cleanup
[stale markers and worktrees, attributed to owning agent]

## 🎯 Actionable — Yegor priority order
[compact ranked table]

## 🧑 Requires human routing
[tickets with humans-only / decision / human-decision-required labels — not assigned to any agent]

## ⛔ Blocked  /  💤 Icebox  /  🔵 In-flight
[brief lists]

## ⏸ Held — same-file collision
[tickets deferred to a later round because they would touch a file another assigned ticket touches; one line each with the colliding #N and file, e.g. `⏸ #1196 held — collides with #1111 on scripts/claim.js`. Omit this section if empty.]

## 👥 Assignments

APPLE: [plain paragraph]

BANANA: [plain paragraph]

CHERRY: [plain paragraph]

DRAGONFRUIT: [plain paragraph]

ELDERBERRY: [plain paragraph]

FIG: [plain paragraph]

GRAPE: [plain paragraph]

HONEYDEW: [plain paragraph]
```

### Solo (`mode: "solo"`)

No roster, no per-agent paragraphs, no collision-held section. Just the ranked queue and the
single next thing to do.

```
## ⏱ Triaged as of <ISO triage timestamp> — re-validate before starting
Verify the issue is still OPEN before starting. <If claimCommand set, name it; else: this project
has no claim guard.> Re-run this skill after closing a few issues rather than reusing a stale list.
(puzzle-status enrichment unavailable for this project)   ← include only when it did not resolve

## ⚠ Pre-flight cleanup
[stale markers only, if the status enrichment resolved; else omit]

## 🎯 Actionable — Yegor priority order
[compact ranked table: #N · severity · est · title]

## ▶ Next up
#N — <title>. <one sentence: why this is the top pick now.>
[optionally list the next 2–3 after it]

## 🧑 Requires human routing
[humans-only / decision / human-decision-required — omit if empty]

## ⛔ Blocked  /  💤 Icebox
[brief lists — omit if empty]
```

---

## ~~STUB~~ RESOLVED (#630) — agent state detection from worktrees

Implemented in **Step 4** above: branch names from `git worktree list` are parsed for fruit identities, busy agents are marked in-flight on their issue, excluded from new assignment, and surfaced as `🔵 <FRUIT> — in-flight on #N`. The `puzzle:status --json` upgrade path (richer than `git worktree list`, cross-clone aware) is tracked in #1046.

## STUB — agent context from pasted messages

Future: after collecting data, prompt the user to paste the most recent output message from each active agent. Use that to detect: which tickets are already claimed, what decisions are pending (blocking the agent from closing), and whether an agent has cleanup debt. For now, rely on the user to volunteer this context in their message before or alongside `/fruit-agent-orchestrate`.

## ~~STUB~~ RESOLVED — dynamic agent registration

The roster is now **`config.roster`** in `.claude/orchestrate.json` (default the 8 standard
fruits). To run with a different or larger set, edit that key — no skill change. Busy agents
are still derived live from worktree branches via `config.worktreeBranchPattern`.
