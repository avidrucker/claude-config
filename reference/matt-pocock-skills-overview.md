# Matt Pocock skills — what each one assumes

Reference notes on the 16 skills installed via
`npx skills@latest add mattpocock/skills`. Captures the **durable
"what does this skill assume / require"** knowledge that applies in
any project. Project-specific fit verdicts live in each project's
memory.

Matt's own usage guidance (from the skills repo README): invoke them
as slash commands in your main agent (`/diagnose`, `/handoff`,
`/grill-me`, etc.). He doesn't address subagent isolation patterns
directly.

## Workflow / discipline skills

### `tdd`
Red-green-refactor with **vertical-slice / tracer-bullet** discipline.
Hard rule: one test → one impl → repeat. Explicitly anti-horizontal
(don't write all tests then all impls). Compatible with most TDD-first
projects; mostly redundant if the project already has a TDD-first hard
rule documented.

### `diagnose`
Six-phase bug discipline: build feedback loop → reproduce →
3-5 ranked falsifiable hypotheses → instrument with tagged
`[DEBUG-xxxx]` logs → fix + regression test → cleanup. Heavy emphasis
on "feedback loop is the skill, everything else is mechanical."
Zero project-structure assumptions. Pairs with any bug log.

### `prototype`
Throwaway exploration. Routes between two branches: **logic** (tiny
interactive terminal app for state/business-logic questions) or **UI**
(several radically different UI variants on one route, switchable via
URL search param). Strict throwaway-from-day-one rules. Useful when a
design decision feels speculative.

## Conversation / planning skills

### `grill-me`
Pure interview mode. Walks decision tree, asks one question at a time,
provides recommended answer for each. **Zero project-structure
assumptions** — works in any repo. Good for stress-testing a plan
before locking it in.

### `grill-with-docs`
Same as `grill-me` PLUS inline doc updates. **Assumes a
`CONTEXT.md` glossary at root + `docs/adr/` directory** (or a
`CONTEXT-MAP.md` for multi-context monorepos). Will create those files
lazily if missing. Update side effects:
- Resolved domain terms → written to `CONTEXT.md` inline.
- Architecturally hard-to-reverse decisions → offered as ADRs.

Projects with different doc conventions (e.g. `SCHEMA.md`, learning
journals) will get fragmented docs unless adapted.

### `zoom-out`
Six-line skill. Just instructs the agent to back up a layer and map
modules/callers in domain vocabulary. Cheap, no setup. Good for
re-entering an unfamiliar area.

## Cross-session / context-management skills

### `handoff`
Compacts current conversation into a handoff doc written to OS temp
dir. Includes a "suggested skills" section for the next session.
Designed for **slash-command invocation in the main session** — its
input IS the current conversation context. Testing it inside a
subagent is degenerate (the subagent only has its prompt to compact).

## Issue-tracker / planning skills (require setup)

### `setup-matt-pocock-skills`
Hidden from auto-invocation (`disable-model-invocation: true`). Run
manually once per project. Configures:
- **Issue tracker** — GitHub (`gh` CLI), GitLab (`glab`), local
  markdown under `.scratch/`, or freeform "other".
- **Triage label vocabulary** — five canonical roles
  (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
  `wontfix`) with optional remapping to project's existing labels.
- **Domain doc layout** — single-context vs multi-context.

Writes `docs/agents/{issue-tracker,triage-labels,domain}.md` and adds
an `## Agent skills` block to `CLAUDE.md` / `AGENTS.md`.

### `to-issues`
Breaks a plan/PRD into independently-grabbable issues using
tracer-bullet vertical slices. **Requires `setup-matt-pocock-skills`
to have run** — needs to know which issue tracker to write to and what
labels to apply.

### `to-prd`
Turns current conversation into a Product Requirements Doc and
publishes to the configured issue tracker. **Requires
`setup-matt-pocock-skills` to have run.**

### `triage`
State-machine-driven triage of incoming issues through the five
canonical roles. **Requires `setup-matt-pocock-skills` to have run.**

## Architecture skill

### `improve-codebase-architecture`
Finds "deepening opportunities" (shallow modules → deep modules).
Uses the **deletion test** — imagine deleting the module: if
complexity vanishes, it was a pass-through; if it reappears across
callers, it was earning its keep. **Assumes `CONTEXT.md` glossary +
`docs/adr/` ADRs** — same convention as `grill-with-docs`. Output is a
self-contained HTML report (Tailwind + Mermaid via CDN) written to OS
temp dir.

## Meta skills

### `caveman`
Ultra-compressed communication mode. Cuts token usage ~75% by
dropping filler, articles, pleasantries. Style preference; not
project-specific.

### `find-skills`
Discovery: helps users find/install skills for tasks not yet covered
by their installed set.

### `write-a-skill`
Authoring: create new skills with proper structure, progressive
disclosure, bundled resources.

### `clojure-eval`
Clojure-specific. Wraps `clj-nrepl-eval`. **Often overlaps with a
project's own Clojure REPL skill** — if a project has a dedicated
`clojure-repl` skill (especially one marked MANDATORY), defer to that
one; `clojure-eval` is shorter and more generic.

## Cross-cutting observations

- **CONTEXT.md+ADR convention is load-bearing for 3 skills**:
  `grill-with-docs`, `improve-codebase-architecture`, and the
  doc-side of `setup-matt-pocock-skills`. Projects that already have
  different doc conventions (schema docs, learning journals,
  architecture sketches) face a decision: adopt the CONTEXT.md+ADR
  pattern, OR don't use these three skills.
- **Issue-tracker assumption is load-bearing for 4 skills**:
  `to-issues`, `to-prd`, `triage`, `setup-matt-pocock-skills`. Solo
  projects without an issue tracker (just a phase doc or task list)
  get no value from these.
- **Most useful skills with zero setup cost**: `diagnose`,
  `handoff`, `zoom-out`, `grill-me`, `prototype`, `tdd`. These work
  in any project on day one.
- **Recommended invocation pattern**: slash commands in main agent.
  Subagent-isolation is fine for skills that operate on a concrete
  artifact (`/diagnose` on a specific bug), less suitable for those
  that operate on the conversation itself (`/handoff`).
