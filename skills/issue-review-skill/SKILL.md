---
name: issue-review
description: >
  Review a GitHub issue for quality and clarity before work begins. Use this skill whenever
  a user asks to review, improve, critique, score, or quality-check a GitHub issue or ticket.
  Also triggers on: "is this issue ready?", "review my ticket", "improve this issue",
  "does this issue have enough detail?", "critique this spec", "make this ticket agent-ready",
  or any request to evaluate whether an issue is well-defined before implementation starts.
  Applies to all issue types: bug, feat/dev, research, architecture, docs, refactor, testing.
---

# Issue Review Skill

Reviews a GitHub issue for quality, clarity, and agent-readiness before work begins.
Produces a structured verdict: **READY**, **NEEDS WORK**, or **BLOCK** — with specific,
actionable feedback keyed to the issue's type.

---

## Workflow

### Step 1 — Identify the issue type

Read the issue title, labels, and body. Determine the primary type:

| Type        | Signals                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `bug`       | Label `bug`, words "broken", "fails", "error", "regression"            |
| `dev`       | Label `enhancement`, role tag `DEV`, verb "add", "implement", "build"  |
| `research`  | Label `research`, role tag `RESEARCH`, verb "investigate", "determine" |
| `architect` | Role tag `ARCHITECT` or `ARC`, verb "design", "brainstorm", "map"      |
| `docs`      | Label `documentation`, role tag `WRITER`, verb "draft", "write", "add" |
| `refactor`  | Label `refactor`, verb "fold", "move", "rename", "clean up", "extract" |
| `test`      | Label `test`, verb "add tests", "cover", "assert", "verify"            |

If the issue has multiple role tags (e.g. `DEV+WRITER`), apply the rubric for each role
and flag any cross-role scope concerns.

### Step 2 — Apply the universal rubric

Score every issue on these 5 universal dimensions (1 = absent, 2 = partial, 3 = strong):

| Dimension            | Score 1 (absent)                           | Score 2 (partial)                                 | Score 3 (strong)                                              |
| -------------------- | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| **Scope clarity**    | Unclear what is in/out of scope            | Scope implied but not stated                      | Scope explicit; "out of scope" section present if needed      |
| **Success criteria** | No definition of done                      | Vague criteria ("looks good", "works correctly")  | Machine-verifiable OR behaviorally unambiguous criteria       |
| **File/path specificity** | No files named                        | Some files named, paths incomplete                | All affected files named with paths; line numbers where relevant |
| **Single deliverable** | Multiple independent deliverables bundled | Two tightly coupled deliverables                 | Exactly one deliverable; cross-refs used for related work     |
| **Context sufficiency** | Agent cannot start without asking questions | Agent would need 1–2 clarifications             | Agent has everything needed to begin immediately              |

**Total score: 5–15**
- 13–15: READY
- 9–12: NEEDS WORK
- 5–8: BLOCK

### Step 3 — Apply the type-specific rubric

After the universal rubric, apply the checks from `references/type-rubrics.md` for the
identified issue type. Type checks add nuance but do not override the universal score —
they generate targeted improvement questions.

→ Read `references/type-rubrics.md` now.

### Step 4 — Generate the review

Produce this exact structure:

```
## Issue Review: #<number> — <title>

**Type:** <type>
**Verdict:** READY | NEEDS WORK | BLOCK

### Universal Rubric
| Dimension            | Score | Notes |
| -------------------- | ----- | ----- |
| Scope clarity        | N/3   | ...   |
| Success criteria     | N/3   | ...   |
| File/path specificity| N/3   | ...   |
| Single deliverable   | N/3   | ...   |
| Context sufficiency  | N/3   | ...   |
| **Total**            | N/15  |       |

### Type-Specific Checks
<results from type rubric — pass/warn/fail per check>

### What's Working
<1–3 specific strengths, with evidence from the issue text>

### Required Changes (blocks work starting)
<numbered list — only present if verdict is NEEDS WORK or BLOCK>
<each item: what is missing + the specific question the agent cannot answer without it>

### Suggested Improvements (non-blocking)
<bulleted list of enhancements that would further reduce ambiguity>

### Rewrite Hints
<if verdict is NEEDS WORK or BLOCK: 1–3 concrete example rewrites of the weakest
 sections, showing before → after>
```

### Step 5 — Offer to rewrite

After delivering the review, ask:
> "Would you like me to produce a full rewrite of this issue incorporating all required changes?"

If yes, rewrite the complete issue body (title + all sections) and present it in a code block
ready to paste into GitHub.

---

## Key Principles

**Specificity over vagueness.** "Name the file" beats "mention the area." A review that says
"the acceptance criteria needs to be more specific" without showing what specific looks like
is not useful. Always model the improvement.

**Agent-first lens.** Ask: could a capable agent open this issue and begin work with zero
follow-up questions? If not, what would it ask? Those questions are the required changes.

**One deliverable per issue.** The most common structural flaw is bundling. A refactor +
a docs update + a script rename is three issues. Flag this clearly and suggest the split.

**Research ≠ Implementation.** If a research ticket contains implementation instructions
(code diffs, file changes), flag it. Research produces findings; a follow-up DEV ticket
implements them. Blurring this is a scope violation.

**Acceptance criteria must be machine-verifiable or behaviorally unambiguous.**
- Weak: "the feature works as expected"
- Weak: "output is human-readable"
- Strong: "`npm test` passes with no new failures"
- Strong: "`grep -r close.sh scripts/ docs/` returns no hits"
- Strong: "running `node scripts/X.js` prints a grouped list of paths, one per line"

---

## Reference files

- `references/type-rubrics.md` — Detailed per-type checks and questions for all 7 issue types.
  Read this in Step 3 for the relevant type section only.
