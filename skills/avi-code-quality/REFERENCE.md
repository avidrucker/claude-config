# avi-code-quality — Reference

## EDN config keys

| Key | Required | Notes |
|---|---|---|
| `:project/name` | yes | used in report headers |
| `:project/path` | yes | `~`-prefixed OK; CWD for shell checks |
| `:project/profile` | no | informational: `:cli-tool :library :web-app :teaching-demo` |
| `:reports/dir` | no | defaults to `reports/<project-name>` |
| `:claude/cmd` | no | binary name; default `"claude"` |
| `:claude/max-budget-usd` | no | per-AI-check cap; default `1` |
| `:claude/model` | no | overrides claude's default |
| `:checks` | yes | vector of check maps |

## Check keys (all runners)

| Key | Required | Notes |
|---|---|---|
| `:check/id` | yes | unique keyword |
| `:check/concern` | yes | see catalog below |
| `:check/level` | yes | `:first-order :second-order :cross-cutting` |
| `:check/severity` | yes | `:required :recommended :advisory` |
| `:check/runner` | yes | `:deterministic :ai-assisted :human-rated` |
| `:check/description` | yes | one line |
| `:check/rationale` | no | multi-line why/when/for-whom; rendered as blockquote on failure |

### `:deterministic` runner keys

| Key | Required | Notes |
|---|---|---|
| `:check/command` | yes | runs via `sh -c`; CWD = `:project/path` |
| `:check/pass-when` | yes | predicate map (see DSL below) |
| `:check/cwd` | no | override project root |

### `:ai-assisted` runner keys

| Key | Required | Notes |
|---|---|---|
| `:check/prompt-file` | yes | path to `.md` template; `{{inputs}}` replaced with file contents |
| `:check/pass-when` | yes | e.g. `{:rating {:>= 4}}` |
| `:check/inputs` | no | paths relative to `:project/path` |
| `:check/timeout-ms` | no | default 180000 |

Claude is invoked with `--output-format json --json-schema` expecting `{rating 1-5, reasoning, evidence[], confidence}`.

### `:human-rated` runner keys

| Key | Required | Notes |
|---|---|---|
| `:check/sign-off-path` | yes | relative to `:project/path` |
| `:check/max-age-days` | no | omit for "ever exists" |

## pass-when DSL

All keys AND-combined:

```edn
{:exit-code 0}                   ; exit code equals 0
{:exit-code {:in [0 1]}}         ; exit code in set
{:stdout-matches "regex"}        ; stdout contains match
{:stdout-not-matches "FAIL|ERR"} ; stdout has no match
{:rating {:>= 4}}                ; AI rating >= 4 (1–5 scale)
```

## Result statuses

- `:pass` — threshold met
- `:fail` — threshold not met
- `:unknown` — no signal (AI unavailable, missing file, etc.) — never coerced
- `:n/a` — check doesn't apply

## Severity policy

- `:required` — failure exits runner non-zero (gates CI)
- `:recommended` — failure is a warning in the report
- `:advisory` — failure is logged only

## Concern catalog

### First-order (externally meaningful outcomes)

| Concern | Example checks |
|---|---|
| `:correctness` | tests pass, no FIXME in core, golden fixtures exist |
| `:performance` | test suite under N seconds, no quadratic hotpath |
| `:reliability` | all async paths handle failure, no uncaught exceptions |
| `:security` | no committed secrets, no critical CVEs, inputs sanitized |
| `:data-integrity` | schema validation, migrations reversible |
| `:delivery-safety` | CI passes, runtime version pinned, lockfile present |

### Second-order (internal code qualities)

| Concern | Example checks |
|---|---|
| `:readability` | complexity under N, no deep nesting, no vague names |
| `:maintainability` | file size bounds, no circular deps, few runtime deps |
| `:testability` | no skipped tests, no `.only`, tests deterministic |
| `:debuggability` | no empty except, errors include context |
| `:simplicity` | cyclomatic complexity, state count, param count |

### Cross-cutting

| Concern | Example checks |
|---|---|
| `:logging` | no secrets in logs, correct log levels |
| `:configuration` | config validated at startup, no secrets in repo |
| `:dependencies` | no critical CVEs, lockfile current, dep count bounded |
| `:documentation` | README setup works, public APIs have examples |
| `:error-handling` | no empty catches, async failures handled |

## Concern selection heuristic

Start with 6–10 checks. A good v1 config for a Python library covers:

1. `:correctness` / `:required` — pytest passes
2. `:delivery-safety` / `:recommended` — Python version pinned
3. `:testability` / `:recommended` — no skipped tests
4. `:correctness` / `:advisory` — no FIXME in core src
5. `:performance` / `:advisory` — test suite under N seconds
6. `:readability` / `:advisory` — no deep nesting
7. `:maintainability` / `:advisory` — core modules under N lines

Add AI-assisted checks only when a concern can't be answered by a shell command (e.g., hotpath complexity, architecture coherence). Each AI check costs ~$1 and takes ~3 minutes.
