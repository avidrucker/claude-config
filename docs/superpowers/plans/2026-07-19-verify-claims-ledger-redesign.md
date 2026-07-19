# verify-claims ledger redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the verify-claims skill to the ratified model — new file-set, two-transition lifecycle, four-kind tier-less evidence, `topics` layout, conditional `INDEX.md`, single-sourced rubric.

**Architecture:** Three artifacts change: `lint_claims.py` (the enforcement engine — TDD, real test harness in `test_lint_claims.py`), `SKILL.md` and `references/claims-data-README.md` (prose — verified by grep gates + a clean lint on a sample ledger). Config and glossary (`CONTEXT.md`, `ADR-0001`) are already done. Lint tasks land first so the doc tasks can be validated against a working linter.

**Tech Stack:** Python 3 stdlib only (no pytest — tests are `test_*` functions run via `python test_lint_claims.py`). Markdown.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-19-verify-claims-ledger-redesign-design.md` is authoritative. `ADR-0001` records why; `CONTEXT.md` fixes vocabulary.
- **Config keys (identical across repos):** `enabled`, `dir`, `prefix`, `agentScoped`, `topics` (bool, default false), `testDir` (str|null, default null), `overloadedTerms`. **No** `evidenceDir`. **No** `claims-data/rubric.md`.
- **File-set (per Ledger):** `draft-claims.md`, `unverified-claims.md`, `verified-claims.md`, `bad-claims.md`, `open-questions.md`, `answered-questions.md`, `cancelled-questions.md`, `scratchpad.md`; `INDEX.md` **only** when topics/custom files present. No `evidence/` dir.
- **Lifecycle:** DRAFT (placeholder ids `d1`,`d2`…) —admission (human + 11-rubric, real id minted)→ UNVERIFIED (dispositions: only `unverified`, `TREATED-AS-VERIFIED`) —verification (human)→ VERIFIED (TRUE/FALSE). CANCELLED→`bad-claims.md` once an id exists.
- **Evidence:** no `E1/E2/E3` tiers. Kinds: `reference` (text), `test` (behavior), `query` (data), `statement` (WHO/WHAT/WHEN signal). Line format: `[<kind>] …`.
- **Lint exit:** 0 clean · 1 errors · 2 usage. Defunct/unknown config keys are **WARN, never FAIL**.
- **Commits:** end message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Work on branch `kiwi/issue-25`. Do **not** stage `skills/fruit-agent-orchestrate/*`.

---

## File Structure

- `skills/verify-claims/lint_claims.py` — MODIFY. The linter. All Task 1–7 changes.
- `skills/verify-claims/test_lint_claims.py` — MODIFY. Add a `_lint(dir)` subprocess harness + new `test_*` cases.
- `skills/verify-claims/SKILL.md` — REWRITE (Task 8).
- `skills/verify-claims/references/claims-data-README.md` — REWRITE (Task 9).

Each lint task = failing test → run-fails → implement → run-passes → commit. Doc tasks = rewrite → grep gate → sample-ledger lint → commit.

---

## Task 0: Test harness for full-lint cases

**Files:** Modify `skills/verify-claims/test_lint_claims.py`

**Interfaces produced:** `_lint(dir) -> (rc:int, out:str)` and `_ledger(tmp, **files) -> Path` used by every later lint test.

- [ ] **Step 1: Add the harness helpers** near the top of `test_lint_claims.py`, after `import lint_claims as L`:

```python
import subprocess, sys
LINT = Path(__file__).with_name("lint_claims.py")

def _lint(claims_dir):
    """Run lint_claims.py on a dir; return (returncode, combined_output)."""
    p = subprocess.run([sys.executable, str(LINT), str(claims_dir)],
                       capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr

def _ledger(tmp, **files):
    """Build a claims-data/ dir under a fake repo; files={basename_without_ext: text}."""
    root = _repo(tmp)                     # existing helper: makes .git + .claude
    claims = root / "claims-data"
    claims.mkdir()
    for name, text in files.items():
        (claims / f"{name.replace('_','-')}.md").write_text(text, encoding="utf-8")
    return claims
```

- [ ] **Step 2: Verify existing suite still passes**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: `8/8 passed` (harness helpers are unused so far — no regressions).

- [ ] **Step 3: Commit**

```bash
git add skills/verify-claims/test_lint_claims.py
git commit -m "test(verify-claims): add full-lint subprocess harness for ledger-level cases

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 1: Config schema — WARN on defunct/unknown keys

**Files:** Modify `lint_claims.py` (`main`, near the `cfg = load_config(root)` block ~line 274); Test `test_lint_claims.py`

**Interfaces produced:** `KNOWN_KEYS` set; `WARN_DEFUNCT_KEY` warning code.

- [ ] **Step 1: Write the failing test**

```python
def test_defunct_evidencedir_key_warns_not_fails():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims="")   # empty ledger
        (Path(tmp) / ".claude" / "ledger.json").write_text(
            json.dumps({"enabled": True, "evidenceDir": "claims-data/evidence"}))
        rc, out = _lint(claims)
        assert "WARN_DEFUNCT_KEY" in out and "evidenceDir" in out, out
        assert rc == 0, "a defunct key must WARN, never fail"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: `FAIL test_defunct_evidencedir_key_warns_not_fails` (code not present).

- [ ] **Step 3: Implement**

Add near the top of `lint_claims.py` (by the config constants):

```python
KNOWN_KEYS = {"enabled", "dir", "prefix", "agentScoped", "topics", "testDir", "overloadedTerms"}
```

In `main()`, right after `cfg = load_config(root)`:

```python
    for k in sorted(set(cfg) - KNOWN_KEYS):
        warns.append(("WARN_DEFUNCT_KEY", ".claude/ledger.json", 0,
                      f"unknown/defunct config key '{k}' — remove it (migration tracked in #27)"))
```

(Move the `errors, warns = [], []` initialization above this line if needed so `warns` exists.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): lint WARNs on defunct/unknown ledger.json keys

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: New file-set + draft placeholder IDs

**Files:** Modify `lint_claims.py` (`ENTRY_FILES` ~79, `ALLOWED` ~87, `parse` ~191, `Entry.__init__` ~160); Test `test_lint_claims.py`

**Interfaces produced:** `ENTRY_FILES` gains `draft`,`cancelled`; `DRAFT_ID_RE = re.compile(r"^d\d{1,4}$")`; draft entries carry `is_draft=True`.

- [ ] **Step 1: Write the failing tests**

```python
def test_draft_placeholder_ids_parse_and_dedupe():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, draft_claims=(
            "## d1 — pmtools' `close` returns 0 on an empty store\nbody\n"
            "## d1 — a duplicate placeholder\nbody\n"))
        rc, out = _lint(claims)
        assert "DUP_DRAFT_ID" in out and rc == 1, out

def test_real_id_forbidden_in_drafts():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, draft_claims="## PYC-C-001 — real id in drafts\nbody\n")
        rc, out = _lint(claims)
        assert "DRAFT_ID_ONLY" in out and rc == 1, out

def test_placeholder_id_forbidden_outside_drafts():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims="## d1 — placeholder in unverified\nbody\n")
        rc, out = _lint(claims)
        assert "REAL_ID_REQUIRED" in out and rc == 1, out
```

- [ ] **Step 2: Run to verify they fail**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: FAIL on the three new tests (`draft` file unknown; placeholder ids rejected as BAD_ID).

- [ ] **Step 3: Implement**

`ENTRY_FILES` → add `"draft": "draft-claims.md"` (first) and `"cancelled": "cancelled-questions.md"`.
`ALLOWED` → add `"draft": {"C"}`, `"cancelled": {"Q"}`.
Add near `ID_RE`:

```python
DRAFT_ID_RE = re.compile(r"^d\d{1,4}$")
```

In `parse()`, replace the `if not ID_RE.match(eid)` block so draft files accept only `DRAFT_ID_RE`, others accept only `ID_RE`:

```python
            ok = DRAFT_ID_RE.match(eid) if file_key == "draft" else ID_RE.match(eid)
            if not ok:
                problems.append(("BAD_ID", path.name, i, f"'{eid}' does not match the ID grammar"))
                cur = None
                continue
            cur = Entry(eid, statement, "", file_key, i)
```

In `Entry.__init__`, tolerate a placeholder id (no ID_RE groups):

```python
        self.is_draft = bool(DRAFT_ID_RE.match(eid))
```

In `main()` cross-file section, add: within-drafts duplicate placeholder → `DUP_DRAFT_ID`; a real id in `draft` → `DRAFT_ID_ONLY`; a placeholder id outside `draft` → `REAL_ID_REQUIRED`. (The existing `by_id` dup logic already covers real-id duplication across files.)

```python
    draft_ids = defaultdict(list)
    for e in all_entries:
        if e.file_key == "draft" and e.is_draft:
            draft_ids[e.id].append(e)
        elif e.file_key == "draft" and not e.is_draft:
            errors.append(("DRAFT_ID_ONLY", "draft-claims.md", e.lineno,
                           f"{e.id}: draft-claims.md holds placeholder ids (d1,d2…); real id minted on promotion"))
        elif e.is_draft:
            errors.append(("REAL_ID_REQUIRED", ENTRY_FILES[e.file_key], e.lineno,
                           f"{e.id}: placeholder ids live only in draft-claims.md"))
    for did, occ in draft_ids.items():
        if len(occ) > 1:
            errors.append(("DUP_DRAFT_ID", "draft-claims.md", occ[0].lineno,
                           f"{did}: placeholder id used {len(occ)}× — unique within drafts"))
```

Guard the real-ID cross-file/namespace loops so draft placeholders are skipped (they have no `.prefix`): filter `real = [e for e in all_entries if not e.is_draft]` and iterate that in the DUPLICATE_FILE / DUP_NUMBER / WRONG_FILE / DANGLING_REF / per-entry-gate loops. Draft entries get no admission-gate checks.

- [ ] **Step 4: Run to verify pass**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): lint the new file-set + draft placeholder ids

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Dispositions — only unverified + TREATED-AS-VERIFIED

**Files:** Modify `lint_claims.py` (`DISPOSITIONS` ~97, unverified block ~360-373); Test

- [ ] **Step 1: Write the failing tests**

```python
def test_treated_as_verified_is_valid_disposition():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims=(
            "## PYC-C-001 — pmtools' `close` returns 0 on empty store\n"
            "**Disposition.** TREATED-AS-VERIFIED\n**Bears-on.** pmtools#96\n"
            "**Falsified-by.** close returns nonzero\n"))
        rc, out = _lint(claims)
        assert "BAD_DISPOSITION" not in out, out

def test_inference_disposition_now_rejected():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims=(
            "## PYC-C-002 — pmtools' `close` returns 0 on empty store\n"
            "**Disposition.** INFERENCE\n**Bears-on.** pmtools#96\n"
            "**Falsified-by.** x\n"))
        rc, out = _lint(claims)
        assert "BAD_DISPOSITION" in out and rc == 1, out
```

- [ ] **Step 2: Run — expect FAIL** (`INFERENCE` still accepted; `TREATED-AS-VERIFIED` unknown).

Run: `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 3: Implement**

```python
DISPOSITIONS = {"unverified", "TREATED-AS-VERIFIED"}
```

In the `if e.file_key == "unverified":` block, delete the `INFERENCE`/`re-verify` special cases (the two `EMPTY_RESTS_ON` appends at ~368-373). Keep `NO_FALSIFIER` and the `BAD_DISPOSITION` membership check.

- [ ] **Step 4: Run — expect PASS**

Run: `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): dispositions reduced to unverified + treated-as-verified

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Evidence — drop tiers, four kinds, verified-gate rewrite

**Files:** Modify `lint_claims.py` (`Entry.evidence_items` ~180, verified block ~375-438); Test

**Interfaces produced:** `evidence_items()` returns `(kind, text)` pairs (no tier). Error codes `MISSING_VERDICT`, `MISSING_ENTAILS`, `NO_EVIDENCE`, `MISSING_PIN`; warn `WARN_SAME_AUTHOR`, `WARN_KIND_MISMATCH`.

- [ ] **Step 1: Write the failing tests**

```python
VERIFIED_TMPL = (
    "## PYC-C-001 — pmtools' `close` returns 0 on an empty store\n"
    "**Verdict.** TRUE\n**Bears-on.** pmtools#96\n"
    "**Asserted.** 2026-07-19 by KIWI\n**Verified.** 2026-07-19 by AVI\n"
    "**Entails.** the test runs close on an empty store and asserts exit 0\n"
    "**Evidence.**\n  1. {ev}\n")

def test_verified_ok_with_reference():
    with tempfile.TemporaryDirectory() as tmp:
        ev = "[reference] `py/close.py:close` @a1b2c3d 2026-07-19"
        claims = _ledger(tmp, verified_claims=VERIFIED_TMPL.format(ev=ev))
        rc, out = _lint(claims)
        assert rc == 0 and "MISSING" not in out and "NO_EVIDENCE" not in out, out

def test_verified_no_evidence_errors():
    with tempfile.TemporaryDirectory() as tmp:
        body = VERIFIED_TMPL.format(ev="").replace("  1. \n", "")
        claims = _ledger(tmp, verified_claims=body)
        rc, out = _lint(claims)
        assert "NO_EVIDENCE" in out and rc == 1, out

def test_verified_reference_without_pin_errors():
    with tempfile.TemporaryDirectory() as tmp:
        ev = "[reference] `py/close.py:close`"      # no @sha + date
        claims = _ledger(tmp, verified_claims=VERIFIED_TMPL.format(ev=ev))
        rc, out = _lint(claims)
        assert "MISSING_PIN" in out and rc == 1, out

def test_statement_only_on_factual_claim_warns_kind_mismatch():
    with tempfile.TemporaryDirectory() as tmp:
        ev = "[statement] AVI on 2026-07-19: the store looked empty"
        claims = _ledger(tmp, verified_claims=VERIFIED_TMPL.format(ev=ev))
        rc, out = _lint(claims)
        assert "WARN_KIND_MISMATCH" in out and "NO_EVIDENCE" in out, out
```

- [ ] **Step 2: Run — expect FAIL** (old tier-based `evidence_items` finds nothing in `[reference]` lines).

Run: `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 3: Implement**

Replace `Entry.evidence_items`:

```python
    def evidence_items(self):
        """Every '[reference]/[test]/[query]/[statement]' evidence line, as (kind, text)."""
        out = []
        for m in re.finditer(r"\[\s*(reference|test|query|statement)\s*\]\s*(.*)", self.body, re.I):
            out.append((m.group(1).lower(), m.group(2)))
        return out
```

Rewrite the `if e.file_key == "verified":` block:

```python
            verdict = e.field("Verdict")
            if verdict not in ("TRUE", "FALSE"):
                errors.append(("MISSING_VERDICT", fname, e.lineno,
                               f"{e.id}: Verdict must be TRUE or FALSE (got {verdict!r})"))
            if not e.field("Entails"):
                errors.append(("MISSING_ENTAILS", fname, e.lineno,
                               f"{e.id}: empty 'Entails' — one sentence: HOW the evidence entails this claim"))

            items = e.evidence_items()
            kinds = {k for k, _ in items}
            reproducible = kinds & {"reference", "test", "query"}
            if not reproducible:
                errors.append(("NO_EVIDENCE", fname, e.lineno,
                               f"{e.id}: no reproducible evidence (reference/test/query). "
                               f"A lone statement never verifies a factual claim."))

            for kind, text in items:
                if kind == "reference" and not (SHA_RE.search(text) or "@" in text):
                    errors.append(("MISSING_PIN", fname, e.lineno,
                                   f"{e.id}: reference has no @<sha> pin (SHA + date, no line numbers)"))
                if kind == "test" and not SHA_RE.search(text):
                    errors.append(("MISSING_PIN", fname, e.lineno,
                                   f"{e.id}: test has no red-on/green-on @<sha> pin"))
                if kind == "query" and not ("repin:" in text and "expect" in text):
                    errors.append(("MISSING_PIN", fname, e.lineno,
                                   f"{e.id}: query needs an as-of 'repin:'+'expect' predicate"))

            asserted, verified = e.field("Asserted"), e.field("Verified")
            if asserted and verified:
                a = re.sub(r"^\S+\s+by\s+", "", asserted, flags=re.I).strip().upper()
                v = re.sub(r"^\S+\s+by\s+", "", verified, flags=re.I).strip().upper()
                if a and a == v:
                    warns.append(("WARN_SAME_AUTHOR", fname, e.lineno,
                                  f"{e.id}: asserter == verifier ({a}) — Claude drafts, a human verifies"))

            executed = kinds & {"test", "query"}
            if (BEHAVIOR_RE.search(e.statement) and not executed
                    and not TEXT_CLAIM_RE.search(e.statement)):
                warns.append(("WARN_KIND_MISMATCH", fname, e.lineno,
                              f"{e.id}: behavior claim with no EXECUTED evidence (test/query)"))
            if not reproducible and not DECISION_RE.search(e.statement):
                warns.append(("WARN_KIND_MISMATCH", fname, e.lineno,
                              f"{e.id}: a factual claim needs a reproducible item; a statement alone is signal"))

            for m in SHA_RE.finditer(e.body):
                reach = git_sha_reachable(m.group(1), repo_root)
                if reach is False:
                    e.flags.append("drifted")
                    warns.append(("WARN_DRIFTED", fname, e.lineno,
                                  f"{e.id}: pinned sha {m.group(1)[:8]} is not an ancestor of HEAD"))
                    break
```

Delete the old `e1 = [...]`/`UNGROUNDED_VERIFIED`, `observation`, `WARN_ATTESTATION_ABUSE`, and `evidence/`-frozen branches. Update `build_index` `state`/`ev` to use `(kind, text)` (drop `i[0]` tier references — `len(e.evidence_items())` still works).

- [ ] **Step 4: Run — expect PASS**

Run: `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): tier-less four-kind evidence + human-judged verified gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Decisions-are-not-claims screen

**Files:** Modify `lint_claims.py` (`SCREEN_PATTERNS` ~101); Test

- [ ] **Step 1: Write the failing test**

```python
def test_decision_language_in_claim_file_warns():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims=(
            "## PYC-C-003 — we should refactor pmtools' `close`\n"
            "**Bears-on.** pmtools#96\n**Falsified-by.** n/a\n"))
        rc, out = _lint(claims)
        assert "WARN_SCREEN" in out and "decision" in out.lower(), out
```

- [ ] **Step 2: Run — expect FAIL.** `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 3: Implement** — append to `SCREEN_PATTERNS`:

```python
    (r"\b(we should|should be|let'?s|need to|decided to|prefer|ought to|must be made)\b",
     "decision/opinion language — a decision is not a claim; move it to an issue or ADR"),
```

- [ ] **Step 4: Run — expect PASS.** `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): screen flags decision/opinion language in claim files

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: PARITY_MISMATCH — test docstring ↔ ledger headline

**Files:** Modify `lint_claims.py` (new `parity_check` fn + call in verified block; read `testDir` from `cfg`); Test

**Interfaces produced:** error `PARITY_MISMATCH`. A `test` evidence line names a file as `` `path::symbol` ``; the linter opens `<repo_root>/<testDir or ''>/path`, extracts the `symbol` function's docstring, and errors if the ledger's Claim ID is absent from it.

- [ ] **Step 1: Write the failing tests**

```python
def test_parity_ok_when_docstring_carries_id():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        (root / "scratch").mkdir()
        (root / "scratch" / "t_close.py").write_text(
            'def test_close_empty():\n'
            '    """PYC-C-001 — pmtools\' close returns 0 on an empty store."""\n'
            '    assert True\n')
        (root / ".claude" / "ledger.json").write_text(json.dumps({"testDir": "scratch"}))
        claims = root / "claims-data"; claims.mkdir()
        (claims / "verified-claims.md").write_text(VERIFIED_TMPL.format(
            ev="[test] `t_close.py::test_close_empty` red-on @aaaaaaa green-on @bbbbbbb"))
        rc, out = _lint(claims)
        assert "PARITY_MISMATCH" not in out, out

def test_parity_mismatch_when_id_absent():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        (root / "scratch").mkdir()
        (root / "scratch" / "t_close.py").write_text(
            'def test_close_empty():\n    """some unrelated docstring."""\n    assert True\n')
        (root / ".claude" / "ledger.json").write_text(json.dumps({"testDir": "scratch"}))
        claims = root / "claims-data"; claims.mkdir()
        (claims / "verified-claims.md").write_text(VERIFIED_TMPL.format(
            ev="[test] `t_close.py::test_close_empty` red-on @aaaaaaa green-on @bbbbbbb"))
        rc, out = _lint(claims)
        assert "PARITY_MISMATCH" in out and rc == 1, out
```

- [ ] **Step 2: Run — expect FAIL.** `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 3: Implement** — add a helper and call it once per `test` evidence item in the verified block:

```python
import ast

def test_docstring(repo_root, test_dir, ref):
    """Docstring of `path::symbol` under <repo_root>/<test_dir>, or None if unresolvable."""
    m = re.search(r"`([^`]+?)::([A-Za-z_]\w*)`", ref)
    if not m:
        return None
    base = Path(repo_root) / (test_dir or "")
    fpath = base / m.group(1)
    if not fpath.exists():
        return None
    try:
        tree = ast.parse(fpath.read_text(encoding="utf-8"))
    except Exception:
        return None
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == m.group(2):
            return ast.get_docstring(node) or ""
    return None
```

In the verified block, after computing `items`:

```python
            test_dir = cfg.get("testDir") if isinstance(cfg.get("testDir"), str) else ""
            for kind, text in items:
                if kind != "test":
                    continue
                doc = test_docstring(repo_root, test_dir, text)
                if doc is not None and e.id not in doc:
                    errors.append(("PARITY_MISMATCH", fname, e.lineno,
                                   f"{e.id}: Claim test docstring does not carry the Claim ID — "
                                   f"the docstring must restate the claim (ledger is source of truth)"))
```

(`cfg` is already in scope in `main`; pass `cfg` down or inline the block within `main`. An unresolvable test file → `None` → no error, so lint stays green when tests live outside the checkout.)

- [ ] **Step 4: Run — expect PASS.** `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): PARITY_MISMATCH — Claim test docstring must carry the Claim ID

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: topics traversal + conditional INDEX

**Files:** Modify `lint_claims.py` (`main` traversal + index block ~456-466); Test

**Behavior:** A root ledger with only standard files → **no** `INDEX.md`, and `STALE_INDEX` never fires. When topic subdirs exist under the root (or a stray non-standard file), an `INDEX.md` is expected and checked. `--write-index` writes it only in that case.

- [ ] **Step 1: Write the failing tests**

```python
STD = {"draft-claims","unverified-claims","verified-claims","bad-claims",
       "open-questions","answered-questions","cancelled-questions","scratchpad"}

def test_no_index_expected_for_plain_root_ledger():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims="")
        rc, out = _lint(claims)
        assert "STALE_INDEX" not in out and rc == 0, out

def test_index_expected_when_topics_present():
    with tempfile.TemporaryDirectory() as tmp:
        claims = _ledger(tmp, unverified_claims="")
        (claims / "tooling").mkdir()      # a topic subdir = custom content
        rc, out = _lint(claims)
        assert "STALE_INDEX" in out and rc == 1, out
```

- [ ] **Step 2: Run — expect FAIL** (current code always compares INDEX).

Run: `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 3: Implement** — replace the index block in `main`:

```python
    std = {f[:-3] for f in ENTRY_FILES.values()} | {"scratchpad", "INDEX"}
    present = {p.stem for p in root.iterdir()}
    has_topic_dirs = any(p.is_dir() for p in root.iterdir())
    custom = has_topic_dirs or bool(present - std)
    idx_path = root / "INDEX.md"
    if custom:
        fresh = build_index(all_entries)
        if "--write-index" in flags:
            idx_path.write_text(fresh, encoding="utf-8"); print(f"wrote {idx_path}")
        else:
            existing = idx_path.read_text(encoding="utf-8") if idx_path.exists() else ""
            if existing.strip() != fresh.strip():
                errors.append(("STALE_INDEX", "INDEX.md", 0,
                               "INDEX.md disagrees with the entry files — run with --write-index"))
    elif idx_path.exists():
        warns.append(("WARN_STRAY_INDEX", "INDEX.md", 0,
                      "INDEX.md present but ledger has no topics/custom files — it is not needed"))
```

- [ ] **Step 4: Run — expect PASS.** `python skills/verify-claims/test_lint_claims.py`

- [ ] **Step 5: Commit**

```bash
git add skills/verify-claims/lint_claims.py skills/verify-claims/test_lint_claims.py
git commit -m "feat(verify-claims): conditional INDEX.md — only with topics/custom files

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Rewrite SKILL.md

**Files:** Rewrite `skills/verify-claims/SKILL.md`

The lint is now the executable spec of the model; SKILL.md is the prose. Rewrite section-by-section against the design spec. Keep the frontmatter `name`/`description`/`version` (bump `version` to `0.2.0`, `last_reviewed: 2026-07-19`).

Sections to (re)write, matching spec §1–§7:
1. **Project config** — the 7-key `ledger.json` (drop `evidenceDir`; add `topics`, `testDir`); note no `rubric.md`.
2. **Layout** — root always; `topics:true` adds `claims-data/<topic>/`; user files each claim.
3. **The admission rubric** — the 11 criteria (single source; this is the only copy). Keep criterion 9 (Descriptive) prominent for the decisions guardrail.
4. **The two transitions** — admission (human + rubric, real id minted) and verification (human judgment). No "gate N".
5. **Evidence** — four kinds (`reference`/`test`/`query`/`statement`), no tiers; kind-matching; SHA+date pins, no line numbers; `Entails.`; Claim test docstring carries the Claim ID; parity is lint-enforced.
6. **The files** — the standard set + conditional INDEX; no `evidence/`. Update the tree diagram and entry templates (remove `[E1·…]` tier syntax → `[reference]…`; dispositions = `unverified`/`TREATED-AS-VERIFIED`; add `draft-claims.md` with `d1` placeholders and `cancelled-questions.md`).
7. **IDs** — placeholder `d1` in drafts; real id minted at admission.
8. **The linter** — the current error/warn code list from Tasks 1–7.
9. **Skip when / Anti-patterns** — keep, but purge tier/`evidence/`/attestation-firewall references; add "a decision filed as a claim".

- [ ] **Step 1: Rewrite the file** per the outline above (use the current `SKILL.md` structure as the skeleton; replace retired content).

- [ ] **Step 2: Grep gates — the retired model must be gone**

Run:
```bash
cd skills/verify-claims
grep -nE "E1|E2|E3|evidence/|attestation firewall|Gate [12]|evidenceDir|rubric\.md" SKILL.md
```
Expected: no hits (empty output). If `rubric.md` appears, it must be only in a "there is no per-project rubric" sentence — otherwise remove.

Run: `grep -nE "draft-claims|cancelled-questions|TREATED-AS-VERIFIED|reference|statement|topics|testDir" SKILL.md`
Expected: each term present (non-empty).

- [ ] **Step 3: Commit**

```bash
git add skills/verify-claims/SKILL.md
git commit -m "docs(verify-claims): rewrite SKILL.md to the redesigned ledger model

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Rewrite claims-data-README.md (folds #24)

**Files:** Rewrite `skills/verify-claims/references/claims-data-README.md`

This is the per-Ledger README scaffolded into `claims-data/`. It must match SKILL.md and **single-source** by *not* duplicating the full rubric — reference the skill, don't restate the 11 criteria (this closes #24, which flagged the stale 7-criterion copy).

Rewrite to: the file-set (new list), the two transitions, the four evidence kinds + pin discipline, the MOVE-never-COPY rule, the lint invocation, and "not a tracker". Remove: the 7/7 rubric table, the Atomic criterion, the `evidence/` row, the `[E1·query]` tier examples, the `observation`/`attestation` evidence rows.

- [ ] **Step 1: Rewrite the file** per the above.

- [ ] **Step 2: Grep gates**

Run:
```bash
cd skills/verify-claims/references
grep -nE "7/7|Atomic|E1·|evidence/|<ID>-e|observation|attestation" claims-data-README.md
```
Expected: no hits.

Run: `grep -ncE "Falsifiable|Objective|Unambiguous" claims-data-README.md`
Expected: `0` — the rubric criteria are NOT restated here (single-sourced in SKILL.md). A one-line pointer to SKILL.md's rubric is fine.

Run: `grep -nE "draft-claims|cancelled-questions|reference|statement" claims-data-README.md`
Expected: present.

- [ ] **Step 3: Commit**

```bash
git add skills/verify-claims/references/claims-data-README.md
git commit -m "docs(verify-claims): rewrite claims-data README to new model; single-source rubric (closes #24)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Integration — full suite + sample ledgers lint clean

**Files:** none (verification only); optionally add a fixture under the scratchpad dir.

- [ ] **Step 1: Full unit suite green**

Run: `python skills/verify-claims/test_lint_claims.py`
Expected: all tests pass (original 8 + new cases from Tasks 0–7).

- [ ] **Step 2: A hand-built valid ledger lints clean (rc 0)**

Build a temp `claims-data/` with one valid entry per file (a `reference`-backed verified claim, an unverified claim with `Falsified-by`, an open + answered question, a `d1` draft), then:
Run: `python skills/verify-claims/lint_claims.py /tmp/sample-claims`
Expected: `0 errors`, exit 0.

- [ ] **Step 3: A topics ledger writes + re-lints clean**

Build `claims-data/` with a `tooling/` topic subdir holding entries; then:
Run: `python skills/verify-claims/lint_claims.py /tmp/sample-claims --write-index && python skills/verify-claims/lint_claims.py /tmp/sample-claims`
Expected: first writes `INDEX.md`; second exits 0 (no `STALE_INDEX`).

- [ ] **Step 4: Cross-doc consistency check**

Run:
```bash
grep -rnE "E1|E2|E3|evidence/|Gate [12]|evidenceDir" skills/verify-claims/SKILL.md skills/verify-claims/references/claims-data-README.md
```
Expected: no hits — SKILL.md, README, lint, CONTEXT, ADR all agree on the model.

- [ ] **Step 5: Final commit (if any fixture added)**

```bash
git add -A skills/verify-claims
git commit -m "test(verify-claims): integration fixtures for the redesigned ledger

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:** §1 config→T1/T8; §2 layout→T7/T8; §3 files→T2/T7/T8/T9; §4 lifecycle→T2/T3/T8; §5 evidence→T4/T6/T8/T9; §6 guardrail→T5/T8; §7 lint→T1–T7; §8 docs→T8/T9. ✅ all sections mapped.
- **Placeholder scan:** every code step carries real code; doc tasks carry grep gates with expected output. No TBD/TODO.
- **Type consistency:** `evidence_items()` returns `(kind, text)` from Task 4 on — Tasks 6 iterate `for kind, text in items`, consistent. `DRAFT_ID_RE`, `is_draft`, `KNOWN_KEYS`, `test_docstring` all defined before use.

## Execution Handoff — see chat.
