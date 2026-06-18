---
name: guide-human-decision
description: Walk the user through a human-required decision ticket — pull issue context (including pre-existing options analyses in comments), surface each discrete decision point with options, a recommendation, and evidence, receive user choices, then translate choices into concrete actions (post rulings on affected tickets, land trivial side-deps immediately, file implementation tickets, close parent when fully resolved). Use when a ticket is labeled humans-only or human-decision-required, when the user says "walk me through" or "address together" a decision issue, or when a ticket requires human sign-off before an agent can implement.
---

# Guide Human Decision

Structured walkthrough for any ticket that requires human sign-off before work can proceed.

## Note on two sub-cases

**Pre-existing analysis** (common): a prior research agent already posted an options analysis as a comment on a referenced issue. Your job is to fetch that analysis, reformat it into a scannable brief, add a top-level recommendation for each question, and present it — do not re-derive.

**No prior analysis**: surface the options yourself, one decision point at a time, with evidence and tradeoffs. This is the slower path; use it only when no prior analysis exists.

## Steps

### 1. Pull context
Read the issue body AND the comments of every referenced issue it links to. Prior options analyses almost always live in comments, not bodies.

State in one sentence what the ticket is asking the human to decide before surfacing any options.

### 2. Surface each decision point
For pre-existing analyses: reformat into a summary table with columns (Question | Recommended | Alternatives) plus a brief rationale for each recommendation. Don't re-research what is already documented.

For no-prior-analysis path, per decision point:
- **Options table** — enumerate every actionable choice
- **Recommendation** — pick one and say so explicitly
- **Evidence** — corpus counts, prior rulings, convention references, or "no evidence" if none
- **Tradeoff** — one line on what approving costs vs. what rejecting costs

Never bundle multiple decision points into one question.

### 3. Surface housekeeping questions last
Side bugs, companion tickets, and "file separately or bundle?" questions come after the primary decisions.

### 4. Receive decisions — handle all variants
| User says | Action |
|---|---|
| Approve / go with recommended | Post ruling on the affected ticket(s); file implementation ticket if needed |
| Reject | Note rejection with reason; no implementation ticket |
| Conditional | File pre-req ticket + implementation ticket with hard rejection clause if trial fails |
| Amend | Capture the amended spec; post amended ruling; file implementation ticket with amended scope |
| Defer | Note deferred; leave parent open; optionally file a research spike |

### 5. Side-dependency check — before writing ruling language
Before posting any ruling comment that references a future action ("once label X is created", "after ticket N closes"), ask: **is this action already decided and completable in ≤5 minutes?** If yes, land it first, then post the ruling without the conditional clause.

Common trivially-resolvable side-deps: creating a GitHub label, closing a clearly-resolved parent ticket, adding a label to a handful of open issues.

If a ruling creates a **new GitHub label**: immediately sweep open issues for candidates (`gh issue list` keyword scan of bodies/titles) and apply the label before moving on. A label has no value if it's never applied.

### 6. Execute — post rulings, then file tickets
Order matters:
1. Post the ruling comment(s) on the **affected tickets** (the tickets the decisions belong to, not always the coordination parent)
2. Land any trivial side-deps identified in Step 5
3. Post addendum comments if any side-deps changed the ruling wording
4. File implementation ticket(s), referencing any blockers explicitly
5. Close the coordination parent ticket if **all** decisions are resolved
6. Leave it open if any decision is still conditional or pending

### 7. Report
Tell the user what was posted, what was filed, and what (if anything) is still open.

## Ruling comment shape (for affected tickets)
```
## Ruling — <topic>

**Q1 — <question>:** <chosen option> [— <brief rationale if non-obvious>]

**Q2 — <question>:** <chosen option>

...

Implementer may [file the DEV ticket / proceed with implementation]. [Any dependency note.]
```

## Ratification comment shape (for coordination parent, when it summarises child rulings)
```
## Ratification — YYYY-MM-DD

Rulings posted on #N and #M (all Q1–Q7 confirmed). [Side-dep landed: label X created, applied to #A and #B.] Implementation tickets can now be filed.
```

## Anti-patterns
- Do not ask "approve or reject?" as a single yes/no for a multi-part ticket — split each decision.
- Do not file the implementation ticket before the user has confirmed the ruling.
- Do not close the parent ticket while any decision is still conditional.
- Do not re-describe what the issue already says — pull extra context, don't echo it.
- Do not write "once X happens" in a ruling comment when X is a trivial action within current scope — land X first.
- Do not create a GitHub label and move on — sweep open issues for candidates immediately.
