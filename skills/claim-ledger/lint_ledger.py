#!/usr/bin/env python3
"""Lint a claim-ledger registry markdown table (claude-config#14).

Checks the integrity invariants from the claim-ledger SKILL.md:
  1. no duplicate IDs
  2. no ID appearing in two rows
  3. every `verified` row carries a verbatim quote AND an `@<sha>` (7-40 hex)
  4. every `INFERENCE` row, and every composite (type CC), lists `rests-on`
  5. `verdict` is set iff status is `verified` (and never on a composite)
  6. no forbidden shadow-tracker columns (assignee/due/priority/work-status)
  7. IDs match PCS[-<AGENT>]-<C|Q|CC>-<NNN>

Usage:  python lint_ledger.py <registry.md>
Exit:   0 = clean, 1 = violations found, 2 = usage/parse error.
"""
from __future__ import annotations

import re
import sys

ID_RE = re.compile(r"^PCS-(?:[A-Z]+-)?(C|Q|CC)-\d+$")
SHA_RE = re.compile(r"@[0-9a-f]{7,40}\b")
FORBIDDEN_COLS = {"assignee", "owner", "due", "due-date", "work-priority", "work-status", "status-of-work"}
# investigative priority on a question (a bare `priority` col) is fine; only *work* fields are
# forbidden (SKILL.md §7).


def parse_table(lines):
    """Return (headers, rows) for the first markdown pipe-table found, else (None, [])."""
    header = None
    rows = []
    for ln in lines:
        s = ln.strip()
        if not s.startswith("|"):
            if header is not None:
                break  # table ended
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if header is None:
            header = [c.lower() for c in cells]
            continue
        if set("".join(cells)) <= {"-", ":", " "}:  # the |---|---| separator row
            continue
        rows.append(cells)
    return header, rows


def lint(path):
    errors = []
    with open(path, encoding="utf-8") as fh:
        header, rows = parse_table(fh.readlines())
    if header is None:
        return [f"{path}: no markdown table found"]

    bad_cols = FORBIDDEN_COLS & set(header)
    if bad_cols:
        errors.append(f"forbidden shadow-tracker column(s): {sorted(bad_cols)} (SKILL.md §7)")

    idx = {name: header.index(name) for name in header}
    required = ["id", "type", "status"]
    missing = [c for c in required if c not in idx]
    if missing:
        return [f"{path}: table missing required column(s): {missing}"]

    def cell(row, name):
        i = idx.get(name)
        return row[i].strip() if i is not None and i < len(row) else ""

    seen = {}
    for n, row in enumerate(rows, 1):
        cid = cell(row, "id")
        typ = cell(row, "type").upper()
        status = cell(row, "status").lower()
        verdict = cell(row, "verdict").upper()
        citation = cell(row, "citation")
        rests = cell(row, "rests-on")
        where = f"row {n} ({cid or '?'})"

        if not cid:
            errors.append(f"{where}: empty ID")
            continue
        if not ID_RE.match(cid):
            errors.append(f"{where}: ID does not match PCS[-AGENT]-<C|Q|CC>-<NNN>")
        if cid in seen:
            errors.append(f"{where}: duplicate ID (also row {seen[cid]})")
        seen[cid] = n

        if status == "verified":
            if verdict not in {"TRUE", "FALSE"}:
                errors.append(f"{where}: verified row needs verdict TRUE|FALSE (got '{verdict or ''}')")
            if typ == "CC":
                errors.append(f"{where}: composite (CC) must not be directly 'verified' — verdict is derived")
            if '"' not in citation and "'" not in citation:
                errors.append(f"{where}: verified row missing a verbatim quote in citation")
            if not SHA_RE.search(citation):
                errors.append(f"{where}: verified row citation missing an @<sha> (7-40 hex)")
        else:
            if verdict and typ != "CC":
                errors.append(f"{where}: verdict set but status is '{status}' (verdict only on verified)")

        if (status == "inference" or typ == "CC") and not rests:
            errors.append(f"{where}: {'INFERENCE' if status == 'inference' else 'composite'} row needs a non-empty rests-on")

    return errors


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    errors = lint(argv[1])
    if errors:
        print(f"✗ {len(errors)} violation(s) in {argv[1]}:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"✓ {argv[1]}: ledger clean")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
