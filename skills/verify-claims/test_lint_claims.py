#!/usr/bin/env python3
"""Stdlib-only tests for lint_claims.py config resolution (no pytest dependency).

Run: python skills/verify-claims/test_lint_claims.py  →  exits 0 all-pass, 1 on failure.

Covers the #19 change: config moves to `.claude/ledger.json`, and the repo root must be
found by walking up — so a per-topic ledger at `claims-data/<topic>/` still resolves the
config that lives at the repo root, not at `claims-data/`.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import lint_claims as L

LINT = Path(__file__).with_name("lint_claims.py")


def _lint(claims_dir):
    """Run lint_claims.py on a dir; return (returncode, combined_output)."""
    p = subprocess.run([sys.executable, str(LINT), str(claims_dir)],
                       capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def _ledger(tmp, **files):
    """Build a claims-data/ dir under a fake repo; files={name: text}, '_'→'-' in name."""
    root = _repo(tmp)
    claims = root / "claims-data"
    claims.mkdir()
    for name, text in files.items():
        (claims / f"{name.replace('_', '-')}.md").write_text(text, encoding="utf-8")
    return claims


def _repo(tmp):
    """A fake repo root with a .git marker. Returns its Path."""
    root = Path(tmp)
    (root / ".git").mkdir()
    (root / ".claude").mkdir()
    return root


def test_find_repo_root_from_flat_ledger():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        claims = root / "claims-data"
        claims.mkdir()
        assert L.find_repo_root(claims) == root, "flat claims-data/ should resolve to repo root"


def test_find_repo_root_from_per_topic_ledger():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        topic = root / "claims-data" / "tooling"
        topic.mkdir(parents=True)
        assert L.find_repo_root(topic) == root, "per-topic claims-data/<topic>/ should resolve to repo root"


def test_load_config_reads_ledger_json():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        (root / ".claude" / "ledger.json").write_text(
            json.dumps({"overloadedTerms": ["widget", "gadget"]})
        )
        topic = root / "claims-data" / "tooling"
        topic.mkdir(parents=True)
        cfg = L.load_config(topic)
        assert cfg.get("overloadedTerms") == ["widget", "gadget"], cfg


def test_ledger_json_wins_over_orchestrate_claims():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        (root / ".claude" / "orchestrate.json").write_text(
            json.dumps({"claims": {"overloadedTerms": ["legacy"]}})
        )
        (root / ".claude" / "ledger.json").write_text(
            json.dumps({"overloadedTerms": ["fresh"]})
        )
        claims = root / "claims-data"
        claims.mkdir()
        cfg = L.load_config(claims)
        assert cfg.get("overloadedTerms") == ["fresh"], "ledger.json must win over orchestrate.json claims block"


def test_load_config_falls_back_to_orchestrate_claims():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        (root / ".claude" / "orchestrate.json").write_text(
            json.dumps({"claims": {"overloadedTerms": ["legacy"]}})
        )
        claims = root / "claims-data"
        claims.mkdir()
        cfg = L.load_config(claims)
        assert cfg.get("overloadedTerms") == ["legacy"], "with no ledger.json, fall back to orchestrate.json claims"


def test_load_config_configless_is_empty_not_error():
    with tempfile.TemporaryDirectory() as tmp:
        root = _repo(tmp)
        claims = root / "claims-data"
        claims.mkdir()
        cfg = L.load_config(claims)
        assert isinstance(cfg, dict) and not cfg.get("overloadedTerms"), "no config → empty, never an error"


def test_cc_type_is_rejected():
    # #20: the composite CC type is removed. A CC id must no longer parse.
    assert L.ID_RE.match("PYC-CC-001") is None, "CC composite type must be rejected"
    assert L.ID_RE.match("PYC-CC-001-FIG") is None, "agent-suffixed CC must be rejected too"


def test_c_and_q_types_still_parse():
    assert L.ID_RE.match("PYC-C-001-FIG"), "agent-suffix claim must parse"
    assert L.ID_RE.match("PYC-Q-003"), "solo question must parse"
    assert L.ID_RE.match("PYC-FIG-C-001"), "legacy agent-first must still parse during migration"


def _run_all():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"ok   {t.__name__}")
        except Exception as e:  # noqa: BLE001 — a test harness reports every failure
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    import sys
    sys.exit(_run_all())
