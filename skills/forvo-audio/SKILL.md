---
name: forvo-audio
description: Download native-speaker pronunciation audio from a logged-in Forvo session for personal study. Use when the user asks for "forvo" audio, "pronunciation audio", "native audio for my cards", or as the audio step of anki-gen (GH #3).
---

# forvo-audio — native pronunciation audio for cards

Drives **your own logged-in Forvo session** in a real browser to download pronunciation mp3s. Not the paid Forvo API. The audio half of `anki-gen` ([GH #3](https://github.com/avidrucker/claude-config/issues/3)); this skill just lands mp3s + emits JSON — Anki insertion is #3 proper.

## Run it

```bash
node skills/forvo-audio/scripts/forvo-scrape.mjs --word hola [--lang es] [--out ~/Downloads]
node skills/forvo-audio/scripts/forvo-scrape.mjs --words-file list.txt [--lang es]
```

- `--lang` defaults to `es`; `--out` defaults to `~/Downloads`.
- Files land at `~/Downloads/<word>.mp3` (and `<word>-2.mp3` for the second pick).
- Each word prints one JSON line to stdout for `anki-gen`:
  `{ word, lang, files, picks: [{speaker, votes, accent, favorite}], note? }`.

If `playwright` is missing, run `npm install` once inside `skills/forvo-audio/`.

## One-time login

Auth is a **dedicated persistent profile** at `~/.config/forvo-scraper-profile/` — never your daily Chrome, no credentials in the repo. The **first** run opens a headed browser; **log in by hand**. The session cookie persists, so later runs are non-interactive. This survives 2FA/captcha. The user must do this first login themselves.

## Which pronunciation it picks

`favorites.json` holds your ranked Forvo usernames (best first). For each word:
- if any favorite pronounced it → the **highest-ranked favorite** (one file);
- otherwise → the **top 2 by upvotes** (two files).

Copy `favorites.example.json` → `favorites.json` and fill in your handles (public, not secret). Empty list = always top-2-by-votes.

## Note for maintainers

The Forvo-specific selectors and audio-URL match live in the `SEL` / `isAudioResponse` block at the top of `forvo-scrape.mjs` — the only part that needs recalibration if Forvo's markup changes. Download uses network-response capture (click play → save the audio response body), deliberately avoiding brittle HTML/base64 reverse-engineering.
