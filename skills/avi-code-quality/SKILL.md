---
name: avi-code-quality
description: Run Avi's code-quality-analysis tool against a project. Reads or authors an EDN config of checks (deterministic shell commands, AI-assisted prompts, human sign-offs), runs assess.bb, and prints a per-concern scorecard. Use when the user says "run code quality", "assess this project", "run the quality checks", or invokes /avi-code-quality. Also use when the user asks to author or update a project's EDN quality config.
---

# avi-code-quality

## Tool location

The tool lives outside this repo; its path is machine-specific. Read it from
the `.env` file in this skill's directory (the `CODE_QUALITY_DIR` variable):

```bash
# from this skill's directory
set -a; . ./.env; set +a   # exports CODE_QUALITY_DIR
```

If `.env` doesn't exist, copy `.env.example` to `.env` and set
`CODE_QUALITY_DIR` to the absolute path of your local
`code-quality-analysis` project, then re-run. If `CODE_QUALITY_DIR` is empty
or unset, stop and ask the user for the path.

The directory it points at contains:

```
$CODE_QUALITY_DIR/
  assess.bb               # Babashka runner
  examples/<project>.edn  # Per-project configs (version-controlled)
  prompts/                # AI-assisted prompt templates
  schema/SCHEMA.edn       # Full config schema
  local.edn               # Per-machine Claude knobs (gitignored)
```

Run from that directory: `./assess.bb examples/<project>.edn`

## Workflow

### 1. Resolve the config

- If the user passes a path ending in `.edn`, use it directly.
- Otherwise treat the arg as a project name and look for `examples/<name>.edn`.
- If the file doesn't exist, proceed to **Author** before running.

### 2. Author (if no config exists)

Explore the target project:
- Language, test command, test directories, source structure
- CI files (`.github/`, `pyproject.toml`, `package.json`, etc.)
- Existing linting/formatting tools

Pick 6–15 checks from the concern catalog (see REFERENCE.md). Prefer:
- `:required` only for things that truly gate the project (tests pass, no committed secrets)
- `:recommended` for strong defaults (no skipped tests, lockfile present)
- `:advisory` for aspirational checks

Write the config to `examples/<project-name>.edn`. Follow the lccjs.edn style exactly — keyword namespaces, comment separators per concern group.

### 3. Run

```bash
set -a; . "$(dirname "$0")/.env" 2>/dev/null || . ./.env; set +a
cd "$CODE_QUALITY_DIR"
./assess.bb examples/<project>.edn
```

Show the user: the summary table, any failures/warnings, and the evidence paths.

## EDN check skeleton

```edn
{:project/name    "my-project"
 :project/path    "~/path/to/project"
 :project/profile :library        ; :cli-tool :library :web-app :teaching-demo
 :reports/dir     "reports/my-project"
 :checks
 [{:check/id          :unit-tests-pass
   :check/concern     :correctness
   :check/level       :first-order
   :check/severity    :required
   :check/runner      :deterministic
   :check/description "All tests pass."
   :check/command     "pytest -q"
   :check/pass-when   {:exit-code 0}}]}
```

See REFERENCE.md for all supported keys, concerns, and Python-specific check patterns.

## Python-specific check patterns

| Goal | Command |
|---|---|
| Tests pass | `pytest -q` |
| Tests timed | `timeout 60 pytest -q` |
| No FIXME in src | `! grep -rn 'FIXME' src/` |
| No skipped tests | `! grep -rEn '@pytest.mark.skip\|pytest.mark.xfail\|@unittest.skip' tests/` |
| Python pinned | `grep -q 'requires-python' pyproject.toml` |
| File size bound | `awk 'END { exit (NR <= 500 ? 0 : 1) }' src/pkg/module.py` |
| No deep nesting | `! grep -rE '^( {20,})[^ ]' src/` |
| No vague fn names | `! grep -rEn 'def (data\|info\|thing\|stuff\|handle\|process)\(' src/` |
| Working tree clean | `git diff --quiet HEAD` |
