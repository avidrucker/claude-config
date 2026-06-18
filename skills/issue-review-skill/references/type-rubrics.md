# Type-Specific Issue Rubrics

For each issue type, this file defines:
1. **Required checks** — things that must be present (FAIL if absent)
2. **Recommended checks** — things that should be present (WARN if absent)
3. **Diagnostic questions** — what an agent would ask if these are missing

Apply only the section matching the issue type identified in Step 1.

---

## `bug` — Bug Report / Fix

### Required checks
- [ ] **Reproduction steps** — exact commands or sequence to trigger the bug
- [ ] **Observed behavior** — what actually happens (error text, wrong output, etc.)
- [ ] **Expected behavior** — what should happen instead
- [ ] **Affected file(s)** — which file(s) contain the defective logic

### Recommended checks
- [ ] **Environment** — Node version, OS, relevant flags if behavior is environment-sensitive
- [ ] **Regression link** — does this reference the PR/commit that introduced it?
- [ ] **Minimal reproducer** — smallest input that triggers the bug
- [ ] **Fix constraint** — is there a known approach, or is the implementor free to choose?

### Diagnostic questions (what the agent can't answer without these)
- Without reproduction steps: "What sequence of actions triggers this?"
- Without observed behavior: "What does failure actually look like — error message? Wrong output? Silence?"
- Without expected behavior: "What is the correct output supposed to be?"
- Without affected file: "Where in the codebase is the defect?"

### Red flags
- Issue only describes symptoms without any reproduction path → BLOCK
- "Fix the bug" with no information about what the bug is → BLOCK
- Expected behavior is "it should work" → push for behavioral specificity

---

## `dev` — Feature / Implementation

### Required checks
- [ ] **Have/Should have framing** — current state vs. desired state clearly distinguished
- [ ] **Acceptance criteria** — verifiable condition(s) that close the issue
- [ ] **Affected files named** — which files will change, be created, or be deleted
- [ ] **Role tag** — `DEV`, `DEV+WRITER`, etc. makes the expected work type clear

### Recommended checks
- [ ] **Time estimate** — `H: Nm` gives the agent a scope signal
- [ ] **Dependency chain** — "Blocks #X", "Blocked by #Y" if applicable
- [ ] **Out-of-scope section** — explicitly excludes adjacent work to prevent scope creep
- [ ] **No architectural decisions left open** — implementor knows *how*, not just *what*

### Diagnostic questions
- Without acceptance criteria: "How do I know when this is done?"
- Without file names: "Which files should I modify?"
- Without scope boundary: "Does this include updating the docs too?"
- Without dependency links: "Is there anything I need to finish first?"

### Red flags
- Acceptance criteria is purely subjective ("looks right", "feels better") → require rewrite
- Issue bundles a code change + doc update + rename as one unit → flag as compound
- No stated file paths when the change touches > 1 file → require specificity

---

## `research` — Investigation / Scoping

### Required checks
- [ ] **Research questions listed** — numbered, distinct, individually answerable questions
- [ ] **Expected output format** — what artifact does this produce? (comment, new doc file at named path, updated table, etc.)
- [ ] **Termination condition** — how does the agent know when research is complete?

### Recommended checks
- [ ] **Known unknowns flagged** — what is the agent expected NOT to know going in?
- [ ] **Reference starting points** — URLs, file paths, or prior issue numbers to consult first
- [ ] **Follow-up ticket scope** — does this research feed a DEV ticket? Is that ticket filed or TBD?
- [ ] **Time box** — `H: Nm` keeps research from expanding indefinitely

### Diagnostic questions
- Without research questions: "What specifically am I trying to find out?"
- Without output format: "Where do I put my findings? What form should they take?"
- Without termination condition: "When is enough research enough?"
- Without starting points: "Where do I begin looking?"

### Red flags
- Research ticket contains implementation instructions (code diffs, file changes) → split into research + DEV
- "Figure out how to do X" with no scoping questions → too open-ended, requires decomposition
- Output is "a comment on this issue" but the question is architectural → should produce a doc file

---

## `architect` / `ARC` — Architecture / Design

### Required checks
- [ ] **Design questions listed** — distinct, answerable questions (not "think about X")
- [ ] **Constraints explicit** — what must the design work within? (existing interfaces, ISA limits, Node.js-only, etc.)
- [ ] **Deliverable type and path** — is the output a doc file? A table? A comment? Named explicitly.
- [ ] **"Design only" boundary** — clearly states no code changes in this issue

### Recommended checks
- [ ] **Evaluation criteria** — what makes a design proposal *good*? (e.g. "fun + educational", "minimizes operand complexity")
- [ ] **Candidate options seeded** — are there 2–3 starting directions, or is the agent starting from a blank slate?
- [ ] **Rejection format** — should the agent document rejected alternatives and why?
- [ ] **Follow-up linkage** — does the output of this design ticket feed one or more DEV tickets?

### Diagnostic questions
- Without evaluation criteria: "How do I judge which design is better?"
- Without constraints: "Are there any technical limits I need to design within?"
- Without deliverable path: "Where does my design document go?"
- Without "design only" marker: "Should I also implement this, or just spec it?"

### Red flags
- ARCHITECT ticket ends with "implement it" → split into ARCHITECT + DEV
- Evaluation criteria is missing → agent will optimize for whatever it finds easiest, not what you want
- Deliverable is undefined → agent will invent a format that may not fit your conventions

---

## `docs` — Documentation Writing / Update

### Required checks
- [ ] **Target file(s) named** — exact path(s) of docs to create or modify
- [ ] **Content description** — what specifically should the doc contain? (section names, topics, examples)
- [ ] **Audience** — who is this for? (agent, human dev, learner, etc.)
- [ ] **Insertion point** — for additions, where exactly in the file does the new content go?

### Recommended checks
- [ ] **Tone / style constraints** — any voice, format, or length requirements?
- [ ] **Example or template** — is there an existing doc to model after?
- [ ] **Accuracy source** — where does the agent get the correct information to write from?
- [ ] **Related docs** — are there cross-references to add or update?

### Diagnostic questions
- Without target file: "Which file am I writing to?"
- Without content description: "What does this section need to cover?"
- Without insertion point: "Where in the file does this go?"
- Without accuracy source: "Where do I get the ground-truth information to write from?"

### Red flags
- "Update the docs" with no file named → BLOCK
- "Write a section about X" with no indication of where it goes → requires insertion point
- Docs ticket also asks for code changes → split into docs + DEV

---

## `refactor` — Code Refactoring / Cleanup

### Required checks
- [ ] **Source location** — exact file(s) and optionally line numbers of code being refactored
- [ ] **Target location** — where does the code go after refactoring? (same file, new file, deleted)
- [ ] **Behavioral contract** — what must be true before and after? (tests that should still pass, grep check, etc.)
- [ ] **Motivation** — why is this refactor happening? (vestigial code, duplication, architectural reason)

### Recommended checks
- [ ] **Safety check** — how does the agent verify no behavior changed? (test run, grep, manual check)
- [ ] **Reference cleanup** — are there comments, docs, or other files that reference the old location?
- [ ] **Dependency chain** — does this unblock or depend on another issue?

### Diagnostic questions
- Without source location: "Which code am I refactoring?"
- Without target location: "Where does it go?"
- Without behavioral contract: "How do I know I didn't break anything?"
- Without reference cleanup scope: "Do I need to update any docs that reference the old name/path?"

### Red flags
- Refactor ticket also adds new behavior → split (refactors should be behavior-neutral)
- No safety check / verification step → require one before approving
- Motivation is missing → agent may not understand whether to preserve or change behavior

---

## `test` — Test Addition / Coverage

### Required checks
- [ ] **What to test** — specific function, module, or behavior under test
- [ ] **Test type** — unit, integration, oracle/e2e, research? (each has different setup)
- [ ] **Expected behavior to assert** — what should the output/state be for a given input?
- [ ] **Test file location** — where does the new test go? (`tests/new/X.spec.js`)

### Recommended checks
- [ ] **Edge cases listed** — specific boundary conditions or failure modes to cover
- [ ] **Fixtures / sample inputs** — what input data does the test need?
- [ ] **Coverage target** — is there a specific coverage gap this fills (traceable to a prior issue)?
- [ ] **Oracle dependency** — if oracle tests, is the oracle binary available and configured?

### Diagnostic questions
- Without "what to test": "Which function or behavior am I writing tests for?"
- Without expected behavior: "What should the output be for the given inputs?"
- Without test file location: "Where do the new test files go?"
- Without edge cases: "Are there specific failure modes I should cover?"

### Red flags
- "Add more tests" with no specified target → BLOCK, needs decomposition
- Test ticket also changes production code → split (tests should test existing behavior)
- Oracle test filed without confirming oracle binary is set up → flag as dependency risk

---

## Cross-type: Compound Issue Detection

Flag an issue as **compound** (regardless of type) when:

1. The title contains `+` between role tags (e.g. `DEV+WRITER`) AND the two roles have
   independent deliverables that could fail or succeed separately.
2. The body contains two or more distinct "Should have" sections with unrelated files.
3. The acceptance criteria has two independent verifiable conditions with no logical dependency.

**What to say when flagging compound:**
> "This issue bundles [X] and [Y]. These have independent deliverables and different failure
> modes — one could be done while the other isn't. Recommend splitting into #A ([X] only)
> and #B ([Y] only), with #B blocked-by #A if there's a dependency."

Exception: `DEV+WRITER` is acceptable as a single issue when the doc update is a
direct consequence of the code change (e.g. "rename this function AND update the one
reference to it in RULES.md") and both can be verified in one acceptance check.
