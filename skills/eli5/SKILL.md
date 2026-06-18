---
name: eli5
description: Re-explain Claude's most recent substantive answer in plain, jargon-free English — same content, accessible words. Use when the user invokes /eli5, or says "explain that simply", "ELI5 that", "in plain English", "re-explain your last answer", "I didn't follow that", or otherwise asks for the previous answer made easier to understand.
---

# ELI5 — re-explain in plain English

Re-render your **most recent substantive answer** in clear, accessible, jargon-free language. This is a **re-render, not a redo**: explain content that is already in the conversation. Do not introduce new analysis, new options, or a different recommendation. If you recommended X, the plain-English version still recommends X.

"ELI5" is the *spirit* — plain and accessible — not literal toddler-speak. Keep full technical accuracy underneath the simpler words.

## What to re-explain

- `/eli5` (no argument) → re-explain the whole of your most recent substantive answer.
- `/eli5 <focus>` → narrow to that piece (e.g. `/eli5 the register allocation part`). The focus may point at an earlier answer if that is clearly what the user means.

If there is **no prior substantive answer** to re-explain, say so and ask what they'd like explained. If a focus argument **matches nothing** in the conversation, ask for clarification rather than inventing content.

## Style

- Short sentences. Everyday words. No jargon.
- When a technical term is genuinely unavoidable, define it in one clause the first time it appears.
- **No forced analogies or metaphors.** Explain the real thing directly, just without the jargon. (A brief analogy is fine only if it genuinely clarifies — never reach for one.)
- Be concise: as short as clarity allows, no shorter.

## Output structure

Open with a **one-sentence plain-English TL;DR**, then the body. Choose the body shape based on what the original answer actually was:

**If the original answer was a decision** (tradeoffs, a fork, "should I do A or B"), hit three beats:

1. **What the problem is** — restated plainly.
2. **The options** — each one in plain terms.
3. **What I recommend and why** — the recommendation plus its reasoning.

**If the original answer was not decision-shaped** (it explained how something works, walked through a bug, described a process), give a plain-English walkthrough of whatever the answer actually was. Do **not** force empty "Options: N/A" sections.

## Remember

You are translating your own prior words, not solving the problem again. Stay faithful to what you already said — same problems, same options, same recommendation — only clearer.
