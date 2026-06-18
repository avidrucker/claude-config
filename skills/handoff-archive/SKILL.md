---
name: handoff-archive
description: Relocate a handoff document into the project's orphan `handoffs` branch so it persists in version control rather than living only in /tmp. Use after `/handoff` has written the doc, when you want a durable archive that survives reboot and is shareable via the remote.
argument-hint: "[path/to/handoff-doc.md] (defaults to newest /tmp/handoff-*.md)"
---

Move a handoff document from a temp location into a dedicated `handoffs` branch on the project's git repo. The branch is **orphan** — no shared history with `main` — so handoff docs stay out of the main codebase's git log while still being version-controlled and pushable.

## Preconditions

- Current working directory is a git repo (`git rev-parse --git-dir`).
- Working tree is clean on the current branch (`git status --porcelain` empty).
- A handoff document exists either at the path passed as an argument, or as a `/tmp/handoff-*.md` file (typically produced by the `handoff` skill).
- If `origin` exists, the push step runs; if not, the commit lands locally and the agent reports that.

If any precondition fails, **stop and tell the user** what's blocking. Don't try to fix uncommitted state automatically.

## Workflow

1. **Resolve the source doc.**
   - If the user passed a path argument, use it.
   - Otherwise: `ls -t /tmp/handoff-*.md | head -1`. If multiple exist, pick the newest and tell the user which.
   - If none exist, ask the user to run `/handoff` first.

2. **Capture current branch** so the skill can switch back:
   ```bash
   ORIGINAL=$(git branch --show-current)
   ```

3. **Determine if `handoffs` branch already exists** locally or on origin:
   ```bash
   git show-ref --verify --quiet refs/heads/handoffs    # local
   git ls-remote --exit-code --heads origin handoffs    # remote
   ```

4. **Switch to the branch** based on what exists:
   - **Local exists:** `git switch handoffs`
   - **Only remote exists:** `git switch -c handoffs --track origin/handoffs`
   - **Neither (first time):** `git switch --orphan handoffs`

5. **Important note about the first-time orphan switch.** `git switch --orphan` **clears the working tree of tracked files** — they vanish from disk on the orphan branch. They will be restored on switch-back. This is normal and not a data-loss event; the files are still committed on the original branch. Do not panic, do not try to restore them, do not delete the gitignored leftovers (e.g. `local.edn`, `reports/`).

6. **Stage the doc:**
   ```bash
   mkdir -p handoffs
   cp "$SOURCE" handoffs/
   git add handoffs/
   ```

7. **Commit** with a concise message that names the doc and the date. Example: `Add 2026-05-27 handoff doc`.

8. **Push** to remote:
   - First time: `git push -u origin handoffs` (sets upstream).
   - Subsequent: `git push`.
   - If no `origin`: skip and report. The commit is still on the local branch.

9. **Switch back** to the original branch: `git switch "$ORIGINAL"`. Git will restore the original branch's files cleanly.

10. **Verify final state:**
    - Original branch checked out, working tree clean.
    - Report the GitHub branch URL if origin is a GitHub remote (parse from `git remote get-url origin`).

## Re-run behavior

Subsequent invocations land on the existing `handoffs` branch — **no orphan dance needed after the first time**. Each new handoff doc adds a new file under `handoffs/` and a new commit. The branch becomes an append-only log of session-end snapshots.

This is by design. The branch is intentionally not squashed or rebased; each handoff is a discrete point-in-time artifact.

## When NOT to use this skill

- The project has no git remote AND the user is fine with `/tmp` durability — skip the archive.
- The handoff contains sensitive information AND the only available remote is public — either redact first or use a private repo.
- The user wants the handoff doc to live on `main` (e.g. as part of project docs) — that's a different workflow; just `git add` it on `main` normally.

## Failure modes to handle gracefully

- **Push rejected because of branch protection on `handoffs`.** Unlikely (branch protection usually targets `main`), but if so, tell the user. Don't force-push.
- **`origin` is misconfigured** (no remote, auth failure). Commit landed locally; report and let the user push manually after fixing auth.
- **Working tree had uncommitted changes** on the source branch. Stop before doing anything — don't stash, don't reset. Tell the user.

## Why orphan, not a regular feature branch

A regular branch off `main` would carry all of `main`'s history. Every handoff commit would appear linked to the codebase. The orphan pattern keeps the two concerns cleanly separated:

- `main` is for the code and its docs.
- `handoffs` is for session-end snapshots.

`git log main..handoffs` and `git log handoffs..main` each return the entire other branch — confirming they share zero commits. That's the intended invariant.
