#!/usr/bin/env python3
"""lint_claims.py — integrity linter for a verify-claims four-file ledger.

Usage:  lint_claims.py <claims-data-dir> [--write-index] [--strict]
Exit:   0 clean · 1 errors found · 2 usage/parse failure

The four-file model's headline failure -- an ID living in two files -- is invisible to
the eye. That is what this script exists to catch. Green lint is the precondition for
citing the ledger anywhere.
"""

import re
import sys
import subprocess
from pathlib import Path
from collections import defaultdict

# ---------------------------------------------------------------------------
# ID grammar.
#
# Accepts BOTH orderings so the planned migration is a config change, not a rewrite:
#   agent-first (current):  PCS-FIG-C-001   /  PCS-C-001 (solo)
#   agent-last  (planned):  PCS-C-001-FIG
# ---------------------------------------------------------------------------
ID_RE = re.compile(
    r"^(?P<prefix>[A-Z]{2,5})-"
    r"(?:(?P<agent_first>[A-Z]{2,12})-)?"
    r"(?P<type>C|Q|CC)-"
    r"(?P<num>\d{1,4})"
    r"(?:-(?P<agent_last>[A-Z]{2,12}))?$"
)
SHA_RE = re.compile(r"@([0-9a-f]{7,40})\b")
SHA256_RE = re.compile(r"sha256:\s*([0-9a-f]{16,64})", re.I)

ENTRY_FILES = {
    "unverified": "unverified-claims.md",
    "verified": "verified-claims.md",
    "open": "open-questions.md",
    "answered": "answered-questions.md",
    "bad": "bad-claims.md",
}
# Which types may live in which file.
ALLOWED = {
    "unverified": {"C"},
    "verified": {"C"},
    "bad": {"C"},
    "open": {"Q"},
    "answered": {"Q"},
}
# CC lives ONLY in the generated index -- its verdict is derived, so it has no stable home.

DISPOSITIONS = {"unverified", "INFERENCE", "REPORTED", "re-verify"}
SHADOW_FIELDS = {"assignee", "owner", "due", "due-date", "work-status", "estimate", "sprint"}

# Reject-patterns from the admission screen. Warnings only -- human judgment overrides.
SCREEN_PATTERNS = [
    (r"\b(clean|mature|robust|simple|elegant|good|bad|nice|solid|proper)\b", "value-judgment adjective"),
    (r"(?<![\w>=<])~\s*\d|\b(about|roughly|approximately|around)\s+\d", "approximate quantity -- use an exact value or a bound"),
    (r"\b(latest|current|newest|now|recently|today|these days)\b", "time-relative term -- needs an as-of"),
    (r"\b(simpler|faster|better|worse|cleaner|slower)\s+than\b", "comparative without a measured baseline"),
    (r"\b(probably|seems|appears to|tends to|might be|likely)\b", "hedge -- not objective"),
]
# Verbs that describe RUNTIME BEHAVIOR. A claim using one of these needs a `test`;
# a quote of the source is inference, not evidence. Matches inflections (no-op/no-ops/
# no-opped), so anchor only at the start of the word.
BEHAVIOR_RE = re.compile(
    r"\b(wedges?|raises?|throws?|returns?|crashe?s?|drops?|retri(?:es|ed)|handles?|"
    r"parses?|rejects?|blocks?|fails?|no-?ops?(?:ed)?|skips?|hangs?|deadlocks?|"
    r"overwrites?|truncates?|silently\s+\w+)\b", re.I)
DECISION_RE = re.compile(
    r"\b(decided|ruled|ruling|policy|convention|we will|the project|the team|agreed)\b", re.I)

# A statement carrying an explicit as-of anchor has already satisfied criterion 5. Words like
# "latest" / "current" are then descriptive, not time-relative, so the screen must not fire.
AS_OF_RE = re.compile(r"\b(as of\s+\d{4}-\d{2}-\d{2}|at\s+[0-9a-f]{7,40}\b|@[0-9a-f]{7,40}\b)", re.I)

# A claim explicitly ABOUT a source's text is verified by a quote, not a test -- even when the text
# it quotes happens to contain a behavior verb ("...contains an early return", "the docstring says
# it no-ops"). Without this, every source-text claim trips the kind-matching heuristic.
TEXT_CLAIM_RE = re.compile(
    r"\b(contains?|declares?|defines?|documents?|states?|says?|the docstring|the comment|"
    r"the source|is written|spells?)\b", re.I)

# Criterion 6 (Situated). These words name different things in different systems on one machine --
# pmtools' `claim` stakes a ticket; ours asserts a fact. A headline using one BARE is ambiguous the
# moment it is read outside the session that wrote it. Override via claims.overloadedTerms.
DEFAULT_OVERLOADED = ["claim", "close", "status", "release", "velocity", "error", "ice",
                      "preflight", "sweep", "file"]


# A statement is SITUATED when it names an owner ANYWHERE in the headline: a system
# ("pmtools", "lccjs"), a possessive ("pmtools' close"), or a concrete artifact in backticks
# that carries a path or an underscore-symbol (`py/close.py`, `check_velocity_guard`,
# `storage.velocity.enabled`). Checking the whole statement rather than a window around the
# term: the question is "does this headline say whose thing it is", not "is the owner within
# N characters".
OWNER_RE = re.compile(
    r"(\b(?:pmtools|lccjs|pycats|lccplus|npm|gh|git|sqlite|github)\b"   # a named system
    r"|\w+['’]s\s"                                                      # a possessive: "pmtools' "
    r"|`[^`]*[/._][^`]*`)",                                             # `py/close.py`, `a_b`, `x.y`
    re.I)


def unsituated_terms(statement, overloaded):
    """Overloaded terms used in a statement that never names an owner.

    Returns [] when the statement is situated, regardless of which terms it uses.
    """
    if OWNER_RE.search(statement):
        return []
    return [t for t in overloaded if re.search(rf"\b{re.escape(t)}\b", statement, re.I)]


class Entry:
    def __init__(self, eid, statement, body, file_key, lineno):
        self.id, self.statement, self.body = eid, statement, body
        self.file_key, self.lineno = file_key, lineno
        m = ID_RE.match(eid)
        self.type = m.group("type") if m else None
        self.prefix = m.group("prefix") if m else None
        self.num = int(m.group("num")) if m else None
        self.agent = (m.group("agent_first") or m.group("agent_last")) if m else None

    def field(self, name):
        """Value of a **Name.** field, or None."""
        m = re.search(rf"^\*\*{re.escape(name)}\.?\*\*\s*(.*)$", self.body, re.M | re.I)
        if not m:
            return None
        v = m.group(1).strip()
        return v if v and not v.startswith("<") else None

    def has_field(self, name):
        return re.search(rf"^\*\*{re.escape(name)}\.?\*\*", self.body, re.M | re.I) is not None

    def evidence_items(self):
        """Every '[E1·query]'-style evidence line, as (tier, kind, text)."""
        out = []
        for m in re.finditer(r"\[\s*(E[123])\s*[·.\-|]\s*(\w+)\s*\]\s*(.*)", self.body):
            out.append((m.group(1), m.group(2).lower(), m.group(3)))
        return out


HEADING_RE = re.compile(r"^##\s+(\S+)\s*(?:—|--|-)\s*(.*)$")


def parse(path, file_key):
    entries, problems = [], []
    if not path.exists():
        return entries, problems
    lines = path.read_text(encoding="utf-8").splitlines()
    cur = None
    for i, line in enumerate(lines, 1):
        m = HEADING_RE.match(line)
        if m:
            if cur:
                entries.append(cur)
            eid, statement = m.group(1).strip(), m.group(2).strip()
            if not ID_RE.match(eid):
                problems.append(("BAD_ID", path.name, i, f"'{eid}' does not match the ID grammar"))
                cur = None
                continue
            cur = Entry(eid, statement, "", file_key, i)
        elif cur is not None:
            cur.body += line + "\n"
    if cur:
        entries.append(cur)
    return entries, problems


def git_sha_reachable(sha, repo_root):
    """True = on the current line of history · False = drifted · None = cannot tell.

    'Cannot tell' is a distinct answer and must not be reported as drift. A non-git
    directory and an object we simply don't have locally both return None -- reporting
    those as 'drifted' would flag every claim in a non-repo ledger.
    """
    def _git(*a):
        try:
            return subprocess.run(["git", "-C", str(repo_root), *a],
                                  capture_output=True, timeout=10)
        except Exception:
            return None

    r = _git("rev-parse", "--is-inside-work-tree")
    if r is None or r.returncode != 0:
        return None                      # not a git repo -- no opinion
    if _git("cat-file", "-e", f"{sha}^{{commit}}").returncode != 0:
        return None                      # object absent locally -- no opinion
    return _git("merge-base", "--is-ancestor", sha, "HEAD").returncode == 0


def build_index(entries):
    lines = [
        "<!-- GENERATED by lint_claims.py — DO NOT EDIT. Source of truth = the entry files. -->",
        "# Index",
        "",
        "| ID | type | file | verdict/disposition | ev | flags | statement | bears-on |",
        "|----|------|------|---------------------|----|-------|-----------|----------|",
    ]
    for e in sorted(entries, key=lambda e: (e.prefix or "", e.agent or "", e.type or "", e.num or 0)):
        state = e.field("Verdict") or e.field("Disposition") or e.field("Priority") or "—"
        ev = len(e.evidence_items()) or "—"
        flags = " ".join(getattr(e, "flags", []))
        stmt = e.statement[:70]
        bears = (e.field("Bears-on") or "—")[:40]
        lines.append(f"| {e.id} | {e.type} | {e.file_key} | {state} | {ev} | {flags} | {stmt} | {bears} |")
    counts = defaultdict(int)
    for e in entries:
        counts[e.file_key] += 1
    lines += ["", "## Integrity", "",
              "counts · " + " · ".join(f"{k}: {counts[k]}" for k in ENTRY_FILES if counts[k])]
    return "\n".join(lines) + "\n"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 1:
        print(__doc__)
        return 2
    root = Path(args[0]).expanduser().resolve()
    if not root.is_dir():
        print(f"error: {root} is not a directory")
        return 2
    strict = "--strict" in flags

    # claims.overloadedTerms from the repo's orchestrate.json, if there is one. Configless is fine.
    overloaded = DEFAULT_OVERLOADED
    try:
        import json
        cfg_path = root.parent / ".claude" / "orchestrate.json"
        if cfg_path.exists():
            blk = json.loads(cfg_path.read_text()).get("claims") or {}
            if isinstance(blk.get("overloadedTerms"), list):
                overloaded = blk["overloadedTerms"]
    except Exception:
        pass  # a malformed config must never block the lint

    errors, warns = [], []
    all_entries, by_id = [], defaultdict(list)

    for key, fname in ENTRY_FILES.items():
        entries, probs = parse(root / fname, key)
        for code, f, ln, msg in probs:
            errors.append((code, f, ln, msg))
        for e in entries:
            all_entries.append(e)
            by_id[e.id].append(e)

    # ---- cross-file integrity -------------------------------------------------
    for eid, occurrences in by_id.items():
        if len(occurrences) > 1:
            where = ", ".join(f"{o.file_key}:{o.lineno}" for o in occurrences)
            errors.append(("DUPLICATE_FILE", "-", 0,
                           f"{eid} appears in {len(occurrences)} files ({where}). MOVE, never COPY."))

    seen_num = defaultdict(list)
    for e in all_entries:
        seen_num[(e.prefix, e.agent, e.type)].append(e)
    for ns, es in seen_num.items():
        nums = defaultdict(list)
        for e in es:
            nums[e.num].append(e)
        for n, dupes in nums.items():
            if len(dupes) > 1 and len({d.id for d in dupes}) > 1:
                errors.append(("DUP_NUMBER", "-", 0, f"namespace {ns} has number {n} twice"))

    for e in all_entries:
        f = e.file_key
        if e.type == "CC":
            errors.append(("WRONG_FILE", ENTRY_FILES[f], e.lineno,
                           f"{e.id}: a CC (composite) has a DERIVED verdict and may live only in INDEX.md"))
        elif e.type not in ALLOWED[f]:
            errors.append(("WRONG_FILE", ENTRY_FILES[f], e.lineno,
                           f"{e.id}: type {e.type} may not live in {ENTRY_FILES[f]}"))

    known = set(by_id)
    for e in all_entries:
        for fld in ("Rests-on", "Gates", "Blocked-by", "Split-from", "Supersedes", "Unblocks"):
            v = e.field(fld)
            if not v:
                continue
            for ref in re.findall(r"\b[A-Z]{2,5}(?:-[A-Z]{2,12})?-(?:C|Q|CC)-\d{1,4}(?:-[A-Z]{2,12})?\b", v):
                if ref not in known and ref.split("-")[0] == e.prefix:
                    errors.append(("DANGLING_REF", ENTRY_FILES[e.file_key], e.lineno,
                                   f"{e.id}: {fld} points at {ref}, which does not exist"))

    # ---- per-entry gates ------------------------------------------------------
    for e in all_entries:
        fname = ENTRY_FILES[e.file_key]
        e.flags = []

        for sf in SHADOW_FIELDS:
            if e.has_field(sf.title()) or e.has_field(sf):
                errors.append(("SHADOW_TRACKER", fname, e.lineno,
                               f"{e.id}: forbidden field '{sf}' — the ledger is epistemic-only; "
                               f"graduate work to an issue"))
        if e.type == "C" and e.field("Priority"):
            errors.append(("SHADOW_TRACKER", fname, e.lineno,
                           f"{e.id}: Priority is allowed on a question, never on a claim"))

        # -- criterion 7 (Relevant). A claim that informs nothing is trivia, however well cited.
        #    Questions and rejected claims are exempt: a question exists precisely to find its bearing,
        #    and a bad claim never got in.
        if e.type == "C" and e.file_key in ("unverified", "verified"):
            bears = e.field("Bears-on")
            if not bears:
                errors.append(("NO_BEARING", fname, e.lineno,
                               f"{e.id}: empty 'Bears-on' — name the fix / bug / feature / decision / "
                               f"concern this informs, or it is trivia. Drop it, or file it as a question."))
            elif re.fullmatch(r"[A-Z]{2,5}(?:-[A-Z]{2,12})?-(?:C|Q|CC)-\d{1,4}(?:-[A-Z]{2,12})?", bears.strip()):
                warns.append(("WARN_BEARING_CHAIN", fname, e.lineno,
                              f"{e.id}: 'Bears-on' points only at another ledger entry ({bears.strip()}). "
                              f"Chase it up — the chain must end at a fix, bug, feature, decision, or concern."))

        # -- criterion 6 (Situated). The headline must say WHOSE thing this is.
        if e.type == "C" and e.file_key in ("unverified", "verified"):
            bare = unsituated_terms(e.statement, overloaded)
            if bare:
                warns.append(("WARN_UNSITUATED", fname, e.lineno,
                              f"{e.id}: headline uses {'/'.join(bare)} with no owner — whose {bare[0]}? "
                              f"Spend 1-4 words naming the system (e.g. \"pmtools' `close`\")."))

        if e.file_key == "unverified":
            if not e.field("Falsified-by"):
                errors.append(("NO_FALSIFIER", fname, e.lineno,
                               f"{e.id}: empty 'Falsified-by' — if you can't say what would make it "
                               f"FALSE, it is not a claim"))
            disp = e.field("Disposition")
            if disp and disp not in DISPOSITIONS:
                errors.append(("BAD_DISPOSITION", fname, e.lineno, f"{e.id}: unknown disposition '{disp}'"))
            if disp == "INFERENCE" and not e.field("Rests-on"):
                errors.append(("EMPTY_RESTS_ON", fname, e.lineno,
                               f"{e.id}: Disposition INFERENCE requires a non-empty 'Rests-on'"))
            if disp == "re-verify" and not e.field("Demoted"):
                errors.append(("EMPTY_RESTS_ON", fname, e.lineno,
                               f"{e.id}: Disposition re-verify requires a 'Demoted' note"))

        if e.file_key == "verified":
            verdict = e.field("Verdict")
            if verdict not in ("TRUE", "FALSE"):
                errors.append(("UNGROUNDED_VERIFIED", fname, e.lineno,
                               f"{e.id}: Verdict must be TRUE or FALSE (got {verdict!r})"))
            if not e.field("Entails"):
                errors.append(("UNGROUNDED_VERIFIED", fname, e.lineno,
                               f"{e.id}: empty 'Entails' — state in one sentence HOW the evidence "
                               f"entails this claim"))
            items = e.evidence_items()
            e1 = [i for i in items if i[0] == "E1"]
            if not e1:
                errors.append(("UNGROUNDED_VERIFIED", fname, e.lineno,
                               f"{e.id}: no E1 (reproducible, pinned) evidence item"))

            asserted, verified = e.field("Asserted"), e.field("Verified")
            if asserted and verified:
                a = re.sub(r"^\S+\s+by\s+", "", asserted, flags=re.I).strip().upper()
                v = re.sub(r"^\S+\s+by\s+", "", verified, flags=re.I).strip().upper()
                if a and a == v:
                    warns.append(("WARN_SELF_VERIFIED", fname, e.lineno,
                                  f"{e.id}: asserter == verifier ({a}) — not allowed for a "
                                  f"load-bearing claim"))

            # pins, per kind
            for tier, kind, text in items:
                if tier != "E1":
                    continue
                if kind == "quote" and not SHA_RE.search(text):
                    errors.append(("MISSING_PIN", fname, e.lineno,
                                   f"{e.id}: E1 quote has no @<sha> pin"))
                if kind == "test" and not SHA_RE.search(text):
                    errors.append(("MISSING_PIN", fname, e.lineno,
                                   f"{e.id}: E1 test has no red-on/green-on @<sha> pin"))
                if kind == "query":
                    has_repin = "repin:" in text and "expect" in text
                    has_frozen = SHA256_RE.search(text) or "evidence/" in text
                    if not (has_repin or has_frozen):
                        errors.append(("MISSING_PIN", fname, e.lineno,
                                       f"{e.id}: E1 query needs either 'repin:'+'expect' or a frozen "
                                       f"artifact + sha256 — an unpinned query is a memory of a number"))
                    elif not has_repin and has_frozen:
                        warns.append(("WARN_UNPINNED_QUERY", fname, e.lineno,
                                      f"{e.id}: query pinned only by a frozen artifact; prefer an "
                                      f"as-of 'repin' predicate that re-derives forever"))
                if kind == "observation":
                    warns.append(("WARN_UNPINNED_QUERY", fname, e.lineno,
                                  f"{e.id}: an observation is E2 and cannot promote a claim"))

            # Behavior must be EXECUTED, never merely READ. A `test` and a `query` both run the
            # system and show its output; a `quote` only reads the source, which is inference.
            kinds = {k for _, k, _ in items}
            executed = kinds & {"test", "query"}
            if (BEHAVIOR_RE.search(e.statement)
                    and not executed
                    and not TEXT_CLAIM_RE.search(e.statement)):
                warns.append(("WARN_KIND_MISMATCH", fname, e.lineno,
                              f"{e.id}: statement describes BEHAVIOR but carries no EXECUTED evidence "
                              f"(test or query) — only a quote. Reading the source and concluding what "
                              f"it does is inference, not evidence."))
            if kinds == {"attestation"} and not DECISION_RE.search(e.statement):
                warns.append(("WARN_ATTESTATION_ABUSE", fname, e.lineno,
                              f"{e.id}: verified only by attestation, but the statement is not about a "
                              f"DECISION. An attestation cannot make an opinion into a fact."))

            for m in SHA_RE.finditer(e.body):
                reach = git_sha_reachable(m.group(1), root.parent)
                if reach is False:
                    e.flags.append("drifted")
                    warns.append(("WARN_DRIFTED", fname, e.lineno,
                                  f"{e.id}: pinned sha {m.group(1)[:8]} is not an ancestor of HEAD — "
                                  f"the claim is still TRUE, but it describes a superseded state"))
                    break

        anchored = bool(AS_OF_RE.search(e.statement))
        for pat, why in SCREEN_PATTERNS:
            if anchored and "time-relative" in why:
                continue  # an explicit as-of already satisfies criterion 5
            if re.search(pat, e.statement, re.I):
                warns.append(("WARN_SCREEN", fname, e.lineno, f"{e.id}: {why} — “{e.statement[:60]}”"))

    # ---- index ----------------------------------------------------------------
    idx_path = root / "INDEX.md"
    fresh = build_index(all_entries)
    if "--write-index" in flags:
        idx_path.write_text(fresh, encoding="utf-8")
        print(f"wrote {idx_path}")
    else:
        existing = idx_path.read_text(encoding="utf-8") if idx_path.exists() else ""
        if existing.strip() != fresh.strip():
            errors.append(("STALE_INDEX", "INDEX.md", 0,
                           "INDEX.md disagrees with the entry files — run with --write-index"))

    # ---- report ---------------------------------------------------------------
    for code, f, ln, msg in errors:
        print(f"ERROR  {code:<20} {f}:{ln}  {msg}")
    for code, f, ln, msg in warns:
        print(f"warn   {code:<20} {f}:{ln}  {msg}")

    n_c = sum(1 for e in all_entries if e.type == "C")
    n_q = sum(1 for e in all_entries if e.type == "Q")
    print(f"\n{len(all_entries)} entries ({n_c} claims, {n_q} questions) · "
          f"{len(errors)} errors · {len(warns)} warnings")

    if errors:
        return 1
    if warns and strict:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
