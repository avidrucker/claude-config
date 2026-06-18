# Design: `eli5` skill

_Filed against ticket #1 ("No one-step way to get Claude to re-explain its last answer in plain ELI5 English"). Repo-agnostic skill living in this skills source._

## Purpose

A one-step way to get Claude to re-explain its **most recent substantive answer** in plain, accessible, jargon-free English — without the user hand-crafting a "explain that more simply" follow-up each time.

It is a **re-render, not a redo**: it re-explains content already in the conversation. It does not introduce new analysis, new options, or a different recommendation.

## Form

- Prompt-only skill: `skills/eli5/SKILL.md`, no script.
- Auto-installs via the existing `skills/*/` symlink glob in `install.sh` — no registration needed.
- Frontmatter: `name: eli5`; `description` tuned to trigger on `/eli5`, "explain that simply", "ELI5 that", "in plain English", "re-explain your last answer".

## Invocation & targeting

- `/eli5` → re-explain the whole of Claude's most recent substantive answer.
- `/eli5 <focus>` → narrow to a piece of it (e.g. `/eli5 the register allocation part`). The focus may point at an earlier answer if that is clearly what's meant.

## Style

- Literal and plain. Short sentences, everyday words, no jargon.
- When a technical term is genuinely unavoidable, define it in one clause.
- **No forced analogies/metaphors** — explain the real thing directly.
- Keep full technical accuracy underneath the plain words. "ELI5" is the spirit, not literal toddler-speak.

## Output structure (adaptive)

Open with a **one-sentence plain-English TL;DR**, then the body.

- **Decision-shaped** original answer (tradeoffs / a fork / "should I do A or B") → hit the three beats:
  1. **What the problem is** — restated plainly.
  2. **The options** — each in plain terms.
  3. **What I recommend and why** — the recommendation plus its reasoning.
- **Not decision-shaped** original answer (explains how something works, walks through a bug, etc.) → fall back to a plain-English walkthrough of whatever the answer actually was. No empty "Options: N/A" sections.

## Edge cases (handled in the prose)

- No prior substantive answer yet → say so, ask what to explain.
- Focus arg matches nothing in the conversation → ask for clarification rather than inventing content.

## Out of scope (YAGNI)

- No script, no config, no per-project gating.
- Does not re-run analysis or change the recommendation.
- Not literal toddler-speak.
