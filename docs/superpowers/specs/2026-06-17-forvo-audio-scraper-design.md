# Design + Plan: `forvo-audio` scraper skill

_Status: **approved design, not yet built.** Written so a fresh session can build it cold._
_Feeds GitHub issue [#3 `anki-gen`](https://github.com/avidrucker/claude-config/issues/3) — this is the native-audio half of that skill._

## Context

`anki-gen` (#3) turns learned material into Anki cards; for language cards it wants native-speaker pronunciation audio (Forvo-style). Rather than the paid Forvo API, the user chose to drive **their own logged-in Forvo session** in a browser and download audio for personal study use. This doc specifies that scraper plus a thin skill wrapper that calls it.

Related open proposals (one GitHub issue each): #2 `skill-promote`, #3 `anki-gen`, #4 `quiz-me`, #5 `a11y-review`. The already-shipped `eli5` skill (#1, closed) is the model for skill layout/commit style.

## Environment (already verified — don't re-probe)

- Node `v24.16.0`; Playwright `1.61.0` resolvable via `npx`.
- Real Chrome at `/usr/bin/google-chrome` (use Playwright `channel: 'chrome'`).
- Playwright chromium also cached under `~/.cache/ms-playwright/` (fallback).
- `~/Downloads` exists. User's normal Chrome profile is `~/.config/google-chrome` (do NOT touch it).

## Decisions locked (with the user)

1. **Auth = dedicated persistent Playwright profile**, NOT the user's daily Chrome, NOT the API.
   - Profile dir: `~/.config/forvo-scraper-profile/` (script-owned, lives outside the repo).
   - **No credentials anywhere.** No `.env`, no password in code. The user logs in by hand once in the headed window; Forvo's session cookie persists in the profile and is reused on later runs. This survives 2FA/captcha/SSO and keeps secrets out of the repo.
2. **Selection rule:** maintain a ranked `favorites.json` of favorite Forvo usernames. For a word — if any favorite speaker pronounced it, take the **highest-ranked favorite present** (one file). Otherwise take the **top 2 by upvotes** (two files).
3. **Output:** save to `~/Downloads/<word>.mp3` (primary) and `~/Downloads/<word>-2.mp3` (the second file in the 2-pick fallback). Also print a JSON result line per word to stdout for `anki-gen` to consume.
4. **Robust audio grab:** click the play button and **capture the resulting audio network response**, then save its body — do NOT reverse-engineer Forvo's HTML/base64 (that's the brittle part of typical Forvo scrapers).

## File layout

```
skills/forvo-audio/
├── SKILL.md                 # thin: when/how to call the scraper; links to #3
├── favorites.example.json   # template: ranked usernames + default lang
├── favorites.json           # the user's real list (plain usernames, not secret → OK to commit)
└── scripts/
    └── forvo-scrape.mjs      # the Playwright scraper (Node ESM)
```

The session profile (`~/.config/forvo-scraper-profile/`) is never in the repo. Add a `.gitignore` guard anyway (defense in depth) in case it ever moves.

## `forvo-scrape.mjs` behavior

**CLI:**
```bash
node skills/forvo-audio/scripts/forvo-scrape.mjs --word hola [--lang es] [--out ~/Downloads]
node skills/forvo-audio/scripts/forvo-scrape.mjs --words-file list.txt [--lang es]
```
- `--lang` default `es`. `--out` default `~/Downloads`. `--words-file` = newline-separated words.

**Flow:**
1. `chromium.launchPersistentContext('~/.config/forvo-scraper-profile', { channel: 'chrome', headless: false })`.
2. **Login gate:** navigate to Forvo; check for a logged-in indicator. If absent, open the login page and `waitForSelector(<logged-in indicator>, { timeout: ~5min })` so the user can log in by hand. (Persisted thereafter.)
3. For each word: navigate to the word page, scope to the `--lang` section. Read each pronunciation entry's **username**, **vote count**, **country/accent**.
4. **Select** per the rule above (ranked favorite, else top-2 by votes).
5. **Download** each selected pronunciation: set up `page.waitForResponse(<audio cdn / .mp3>)`, click that entry's play control, capture the response, write `await response.body()` to the target file. (Use the browser context so the session cookie applies.)
6. Print `{ word, lang, files: [...], picks: [{speaker, votes, accent, favorite: bool}] }` as a JSON line to stdout.
7. Close context.

**Naming:** primary `<word>.mp3`; second fallback file `<word>-2.mp3`. Sanitize `<word>` for filesystem safety.

**Error handling:** word not found / no pronunciations in that language → print a JSON line with `files: []` and a `note`, continue to next word (don't crash the batch).

## SKILL.md (thin wrapper)

Frontmatter `name: forvo-audio`; description triggers on "forvo", "pronunciation audio", "native audio for my cards", and as the audio step of `anki-gen`. Body: the CLI above, the one-time login note, where files land, and a pointer to #3. Keep under ~40 lines.

## Implementation plan (ordered)

1. `mkdir skills/forvo-audio/{,scripts}`.
2. Write `favorites.example.json` (template: `{ "language": "es", "favorites": ["user1","user2"] }`) and seed `favorites.json` once the user supplies their ranked usernames (until then, copy the template).
3. Write `scripts/forvo-scrape.mjs` per the behavior above. Confirm `playwright` import resolves from this dir (global is present; if not, add a minimal `package.json` with the `playwright` dep, or import from the cached install).
4. Write `SKILL.md`.
5. Add `.gitignore` guard for any stray profile dir.
6. Symlink `~/.claude/skills/forvo-audio → repo` (match the per-item symlink pattern used by the other skills).
7. **First headed run together:** `--word hola` → user logs in once → verify `~/Downloads/hola.mp3` plays and the stdout JSON looks right. Calibrate selectors against live Forvo markup (the one step that needs a real page).
8. Commit (`skills(forvo-audio): ...`, reference #3) and push. Drop a note on #3 linking the commit.

## Open items / needs from user

- **Ranked favorite Forvo usernames** to seed `favorites.json` (else ship the template).
- **First login run** must be done interactively by the user (headed window).
- Selector calibration in step 7 is the only part that can't be finalized without hitting live Forvo.

## Out of scope (for now)

- Anki insertion (AnkiConnect / `[sound:]`) — that's `anki-gen` (#3) proper; this scraper just lands mp3s + emits JSON.
- The official Forvo API path (not chosen).
- Languages beyond what `--lang` covers generically (no per-language special-casing yet).
