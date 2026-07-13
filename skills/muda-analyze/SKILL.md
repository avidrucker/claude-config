---
name: muda-analyze
description: >
  Audit a software project for WASTE using Sedano, Ralph & Péraire's empirical nine-waste taxonomy
  (ICSE 2017) — building the wrong feature, mismanaging the backlog, rework, unnecessarily complex
  solutions, extraneous cognitive load, psychological distress, waiting/multitasking, knowledge loss,
  ineffective communication. Each waste ships with the authors' OBSERVED CAUSES, which double as
  detection checklists, plus computable detection recipes over git history, the issue tracker, and
  any velocity/errors telemetry. Use when the user asks for a waste audit, a muda review, a Lean or
  "9 wastes" analysis, a process retrospective, a flow-efficiency or bottleneck review, or asks
  "where is my time going?", "what's slowing this project down?", "where's the waste here?",
  "why does this project feel unproductive?". Also fires on a health check of an agent-driven
  workflow. Findings are CLAIMS — pair with `verify-claims`; a waste asserted without a cited
  artifact is an opinion.
version: 0.1.0
last_reviewed: 2026-07-13
---

# muda-analyze

**A waste is not a vibe. It is a named category, an observed cause, an artifact in this repo, and
where possible a number.** This skill refuses the pattern "you have waiting waste" and forces
`waste → cause → evidence → metric`.

The taxonomy is **empirical, not borrowed from a car factory.**

## Why this taxonomy, and not DOWNTIME/TIMWOOD

The Toyota/Lean-Software wastes (partially done work, extra features, relearning, handoffs, delays,
task switching, defects) were derived **top-down** by mapping manufacturing onto software. Sedano
et al. state the problem plainly (ICSE 2017, §VII):

> "the Lean Software Development's taxonomy of wastes was developed top-down, by mapping
> manufacturing wastes onto software development concepts. It was not empirically tested and
> therefore does not have the same epistemic status as our taxonomy, which was developed bottom-up
> from rigorous primary data collection and analysis."

Their study: **Constructivist Grounded Theory** — 2 years 5 months of participant observation across
**8 projects** at Pivotal, **33 intensive interviews**, and **91 retrospective meetings over 59 weeks**
(663 coded items). It is the *first evidence-based taxonomy of software engineering waste*.

Its most load-bearing negative result, which you must honor:

> **"We did not observe Lean Software Development's *handoff* waste type… our data does not support
> *handoffs* as a *type* of waste."**

Handoffs are real, and they *contribute to* knowledge loss, ineffective communication, and waiting —
but "handoff waste" is not a bucket. If you find yourself filing a finding under "handoffs,"
"transportation," "inventory," "motion," or "non-utilized talent," **you are using the wrong
taxonomy.** Re-bucket via the crosswalk below.

## The nine wastes (Table III, verbatim)

| # | Waste | The authors' definition |
|---|---|---|
| 1 | **Building the wrong feature or product** | "The cost of building a feature or product that does not address user or business needs." |
| 2 | **Mismanaging the backlog** | "The cost of duplicating work, expediting lower value user features, or delaying necessary bug fixes." |
| 3 | **Rework** | "The cost of altering delivered work that should have been done correctly but was not." |
| 4 | **Unnecessarily complex solutions** | "The cost of creating a more complicated solution than necessary, a missed opportunity to simplify the user interface, or code." |
| 5 | **Extraneous cognitive load** | "The costs of unneeded expenditure of mental energy." |
| 6 | **Psychological distress** | "The costs of burdening the team with unhelpful stress." |
| 7 | **Waiting/multitasking** | "The cost of idle time, often hidden by multi-tasking." |
| 8 | **Knowledge loss** | "The cost of re-acquiring information that the team once knew." |
| 9 | **Ineffective communication** | "The cost of incomplete, incorrect, misleading, inefficient, or absent communication." |

## Observed causes = your detection checklist

**These are the authors' observed causes, verbatim from Table III. Do not improvise causes, and do
not move a cause between wastes.** (Secondary summaries of this table circulate on the web with
causes misfiled across four of the nine wastes. This table is from the paper.)

| Waste | Observed causes |
|---|---|
| **1. Building the wrong feature or product** | User desiderata (not doing user research, validation, or testing; ignoring user feedback; working on low user value features) · Business desiderata (not involving a business stakeholder; slow stakeholder feedback; unclear product priorities) |
| **2. Mismanaging the backlog** | Backlog inversion · Working on too many features simultaneously · Duplicated work · Not enough ready stories · Imbalance of feature work and bug fixing · Delaying testing or critical bug fixing · Capricious thrashing |
| **3. Rework** | Technical debt · Rejected stories · No clear definition of done (ambiguous stories; second guessing design mocks) · Defects (poor testing strategy; no root-cause analysis on bugs) |
| **4. Unnecessarily complex solutions** | Unnecessary feature complexity from the user's perspective · Unnecessary technical complexity (duplicating code, lack of interaction design reuse, overly complex technical design created up-front) |
| **5. Extraneous cognitive load** | Suffering from technical debt · Complex or large stories · Inefficient tools and problematic APIs, libraries, and frameworks · Unnecessary context switching · Inefficient development flow · Poorly organized code |
| **6. Psychological distress** | Low team morale · Rush mode · Interpersonal or team conflict |
| **7. Waiting/multitasking** | Slow tests or unreliable tests · Unreliable acceptance environment · Missing information, people, or equipment · Context switching from delayed feedback |
| **8. Knowledge loss** | Team churn · Knowledge silos |
| **9. Ineffective communication** | Team size is too large · Asynchronous communication (distributed teams; distributed stakeholders; dependency on another team; opaque processes outside team) · Imbalance (dominating the conversation; not listening) · Inefficient meetings (lack of focus; skipping retros; not discussing blockers each day; meetings running over) |

**A finding must name one of these causes.** If your finding maps to no cause in this table, either
you have mis-bucketed it, or you have found something the taxonomy doesn't cover — say the latter
out loud rather than forcing it into a bucket.

## Waste 6 is off-limits to telemetry

> **Never infer *psychological distress* from data.** Its causes are low team morale, rush mode, and
> interpersonal conflict. There is no commit, no ticket, and no velocity row that licenses a claim
> about a person's stress. Sedano's evidence for it came from *retrospectives where humans said so*.

If the user raises it, ask them. Otherwise report it as **not assessed**, and say why. An agent
diagnosing a human's morale from a git log is the single worst thing this skill could do.

## Detection recipes

The rule: **a waste claim cites an artifact.** Prefer a computable metric; when none exists, say so
rather than substituting a vibe.

| Waste | Computable signal | Where from |
|---|---|---|
| 1. Wrong feature | Composition of the scored/closed backlog: share of work that serves the product vs. serves the process. Features closed with no consumer. | issue tracker + labels |
| 2. Mismanaging the backlog | Open-issue count and **age distribution**; WIP (simultaneously in-progress items); duplicate-issue rate; ratio of feature to bug work; ready-vs-unready share; **backlog inversion** = low-priority items closed while higher-priority ones sit | tracker, `createdAt`/`closedAt` |
| 3. Rework | **Churn rate** — code rewritten or deleted within N weeks of commit (a pre-AI baseline of ~3.3% is reported to have risen to 5.7–7.1% in the AI era); reopened-issue rate; revert commits; defect density | `git log`, revert/reopen events |
| 4. Unnecessarily complex solutions | Code duplication; parallel implementations of one capability (two tools doing one job); stale duplicate clones/forks | `git`, filesystem, dependency graph |
| 5. Extraneous cognitive load | Context-switch rate (distinct tickets touched per session); unused/empty schema columns every reader must step over; number of manual steps in a routine loop; tool/config sprawl | velocity logs, schema, scripts |
| 6. Psychological distress | **NONE. Do not compute. Ask a human or report not-assessed.** | — |
| 7. Waiting/multitasking | **Flow efficiency** = active work time ÷ total elapsed time (typical teams 15–40%; 40–60% is excellent). Lead time (created→closed) minus logged active time = wait time. Blocked/decision-pending ticket counts and their age. | tracker + any time log |
| 8. Knowledge loss | Staleness of docs/learnings vs. the code they describe; **repeat-error rate after a lesson was already written** (does the same failure class recur after its TIL exists?); knowledge concentrated in one agent/person | docs, errors corpus |
| 9. Ineffective communication | Decisions made outside the tracker; issues closed with no rationale; rulings that live only in chat; docs contradicting each other | tracker, docs, commit messages |

**Flow efficiency is the sharpest single detector you have**, and it is the honest one: if you cannot
compute active time, you cannot compute flow efficiency, and you must say the waiting waste is
**unmeasurable with current instrumentation** — not guess at it.

## Instrumentation gaps are a finding, not a gap in the report

If the data cannot support a waste, the output for that waste is:

> **Waste N — NOT ASSESSED.** The instrumentation cannot answer this. To answer it next time, log
> `<the exact missing field>`.

That is a *more* useful finding than a proxy, and it is the correction to how these audits usually
fail. A proxy silently launders a guess into a number.

## Workflow

1. **Scope.** Name the repos, the time window, and the data sources. Freeze/snapshot mutable data
   before you query it — a number you can't re-derive is not evidence.
2. **Inventory the evidence available**, and — before analyzing — write down which of the nine wastes
   the available data *cannot* speak to. Do this first, so the gaps can't be quietly filled later.
3. **Per waste**: walk its cause list. For each cause, ask "is there an artifact in this project that
   shows this?" Compute the metric where one exists.
4. **File each finding as a claim** (see `verify-claims`): objective, atomic, anchored, falsifiable,
   with a pinned command + output. A waste finding with no artifact is an opinion; either downgrade
   it to an open question or drop it.
5. **Name the tension, not just the waste.** The paper documents tensions the wastes sit inside —
   *big design up-front vs. incremental*, *intransigence vs. capricious adjustment*, *finishing
   features vs. working on too many at once*, *wait, block, or guess*. A finding that ignores its
   tension will recommend a fix that creates the opposite waste.
6. **Rank by cost, not by count.** Nine wastes with one finding each is not a report. Say which one
   is costing the most and why.
7. **Report.** Verified findings only. Unassessed wastes get an explicit not-assessed line.

## Output template

```markdown
## Waste N — <name>
**Cause (from the taxonomy).** <one of the authors' observed causes — verbatim>
**Evidence.** <artifact: file/commit/ticket/query + its verbatim output>
**Metric.** <the computed number, with its denominator named> | none available
**Tension.** <the tradeoff a naive fix would break>
**Cost.** <what this actually costs, in time / rework / decisions delayed>
```

and for a waste the data cannot reach:

```markdown
## Waste N — <name> — NOT ASSESSED
**Why.** <the instrumentation gap, precisely>
**To assess next time, log.** <the exact field/event>
```

## Crosswalk (Table IV — for translating a Lean-vocabulary finding)

| Sedano waste | Lean Software Development waste |
|---|---|
| Building the wrong feature or product | Extra features |
| Mismanaging the backlog | Partially done work |
| Rework | Defects |
| Unnecessarily complex solutions | *Not described* |
| Extraneous cognitive load | *Not described* |
| Psychological distress | *Not described* |
| Waiting/multitasking | Delays · Task switching |
| Knowledge loss | Relearning |
| Ineffective communication | *Not described* |
| **Not observed** | **Handoffs** |

Use this to *translate in*, never to *report out*. Report in Sedano's vocabulary.

## The honest caveat (put it in every report)

> Grounded Theory does not support statistical generalization. The authors: *"organizations with
> different development cultures may experience different waste types."* This taxonomy is **a lens
> for structured noticing, not a scoring rubric.** Do not total the wastes, do not average them, and
> do not produce a "waste score."

Two more, specific to this skill's usual subject:

- **The audit is itself a candidate waste.** A waste review of a small project, run by five agents,
  is *building the wrong feature*. Every finding must name a decision whose outcome it would change.
  Findings that can't are dropped, not reported.
- **Survivorship bias.** An errors/incident corpus contains only what someone chose to log. No claim
  of the form "X is our most common failure" is licensed — only "X is our most commonly *logged*
  failure."

## Skip when

- The user wants a **code** review (→ `decomplect`, `code-review`) or a **bug** diagnosed
  (→ `systematic-debugging`). Waste is a *process* lens.
- The project has no history to audit — no tracker, no git depth. There is nothing to detect.
- The user wants a prioritized work queue → `puzzle-triage`. This skill explains *why* work is being
  wasted; it does not rank the backlog.
- A single specific inefficiency is already known and the user just wants it fixed. Don't run a
  nine-category audit to justify a fix they've already decided on.

## Anti-patterns

| Anti-pattern | Why it's wrong |
|---|---|
| **Filing a finding under "handoffs," "transportation," "inventory," "motion," or "non-utilized talent"** | Not wastes in this taxonomy. The first is an explicit negative result; the rest are manufacturing categories with no empirical support in software. |
| **Inferring psychological distress from telemetry** | There is no such evidence. Ask a human. |
| **A waste asserted with no artifact** | That's an opinion with a citation-shaped hole. Make it a claim or drop it. |
| **A proxy where the metric is unavailable** | This is how waste audits produce confident wrong numbers. Report NOT ASSESSED. |
| **A percentage with no denominator** | Inadmissible. |
| **Inventing a cause** | The cause lists are empirical. If your finding fits none of them, say so — that's interesting, not a licence to improvise. |
| **Producing a "waste score"** | The taxonomy explicitly does not support it. |
| **Reporting all nine wastes at equal weight** | Rank by cost, or you've written a checklist, not an analysis. |

## Related

- [`verify-claims`](../verify-claims) — **the required companion.** Every waste finding is a claim; it
  needs a pinned, kind-matched piece of evidence. A `query`-kind evidence item is what most waste
  metrics are.
- [`puzzle-triage`](../puzzle-triage) — ranks the backlog. This skill diagnoses *why the backlog is
  shaped the way it is*.
- [`decomplect`](../decomplect) — the code-level view of waste 4 (unnecessarily complex solutions).
- [`write-til-doc`](../write-til-doc) — the countermeasure to waste 8 (knowledge loss); a TIL is only
  a cure if it's findable at decision time.

## Sources

- **Primary.** Todd Sedano, Paul Ralph, Cécile Péraire, *"Software Development Waste,"*
  ICSE 2017 (IEEE/ACM 39th International Conference on Software Engineering), pp. 130–139.
  DOI `10.1109/ICSE.2017.20`. The nine wastes, the definitions, the cause table, and the Lean
  crosswalk here are quoted from Tables III and IV of that paper.
- **Secondary, for reframing.** Power & Conboy, *"Impediments to Flow"* (XP 2014) — reframes waste as
  impediments to flow, on the grounds that software development is a creative design activity rather
  than a production activity.
- **Secondary, for the agentic era.** DORA's *"Balancing AI Tensions"* reports time saved in creation
  being re-allocated to auditing and verification, with higher AI adoption associated with increases
  in *both* throughput and instability. GitClear's churn research (via LeadDev) reports code
  duplication up sharply and churn rising from a ~3.3% pre-AI baseline. **These are secondary sources
  and are not verified to primary here — cite them as reported, not as established.**

**Warning:** widely-circulated web summaries of Table III misfile causes across wastes. If you
consult a secondary summary, check it against the table above.
