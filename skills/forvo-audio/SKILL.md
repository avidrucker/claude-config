---
name: forvo-audio
description: Download native-speaker pronunciation audio from Forvo for personal study. Use when the user asks for "forvo" audio, "pronunciation audio", "native audio for my cards", to grab a specific Forvo speaker's recordings, or as the audio step of anki-gen (GH #3).
---

# forvo-audio — native pronunciation audio for cards

Downloads pronunciation mp3s from Forvo. Not the paid Forvo API. The audio half of
`anki-gen` ([GH #3](https://github.com/avidrucker/claude-config/issues/3)); this skill
lands mp3s + emits JSON — Anki insertion is #3 proper.

## Run it

```bash
# Best pronunciation(s) for one or many words:
node skills/forvo-audio/scripts/forvo-scrape.mjs --word hola [--lang es] [--picks 2]
node skills/forvo-audio/scripts/forvo-scrape.mjs --words-file list.txt [--lang es]

# Every recording by one speaker (e.g. a trusted native voice):
node skills/forvo-audio/scripts/forvo-scrape.mjs --user Steve04 [--lang es] [--max-pages N]
```

- `--lang` defaults to `es`; `--out` defaults to `~/Downloads`.
- Files land as `forvo_<word>_<speaker>.mp3` (accent-stripped slug — matches the
  `[sound:...]` convention already used in the deck).
- Each unit prints one JSON line to stdout for `anki-gen`:
  - word mode: `{ word, lang, files, picks:[{speaker,votes,country,region,favorite,file}], note? }`
  - user mode: `{ user, lang, count, files, items:[{word,file}], note? }`

If `playwright` is missing, run `npm install` once inside `skills/forvo-audio/`.

## How it works (and why it's built this way)

Learned the hard way — these constraints are real:

1. **All forvo.com HTML pages are Cloudflare-walled.** `curl`/external `fetch` gets
   HTTP 403 "Just a moment". Only a real browser passes. So the script launches one
   persistent browser and navigates **once** to forvo.com for clearance.
2. **Never navigate page-by-page.** Loading hundreds of word/user pages as real
   navigations runs each page's ad/script bloat and can exhaust RAM (it froze the
   machine once). Instead, after clearance, every other page is read with an
   **in-page `fetch()`** — same-origin (inherits clearance), no ad execution.
3. **Audio paths are base64 in the play control:**
   `Play(id,'<b64 mp3 path>',...,'<word>','<language>')` → decode arg 2 to e.g.
   `9276802/41/9276802_41_540465.mp3`.
4. **The audio CDN is NOT walled.** Downloads are browser-free: Node `fetch` against
   `audio12.forvo.com/mp3/<path>` (with UA + Referer), with fallback hosts.

## One-time setup

Auth/clearance lives in a **dedicated persistent profile** at
`~/.config/forvo-scraper-profile/` — never your daily Chrome, no credentials in the
repo. The **first** run opens a headed browser; solve the Cloudflare challenge by
hand (and log in if you want gated features — not required for downloads). Clearance
persists, so later runs are non-interactive. Pass `--headless` only once you know
clearance is good.

## Which pronunciation it picks (word mode)

`favorites.json` holds your ranked Forvo usernames (best first). For each word:
- if any favorite pronounced it → the **highest-ranked favorite** (one file);
- otherwise → **Spain recordings are dropped**, the rest ranked **Colombian-first,
  then by upvotes**, taking `--picks` (default 2). If a word has *only* Spain
  recordings, it's skipped with a note.

Copy `favorites.example.json` → `favorites.json` and fill in your handles (public,
not secret). Empty list = the never-Spain / Colombian-first ranking above.

## Note for maintainers

The Forvo-specific bits — the `Play(...)` regex (`PLAY_RE_SRC`), the word-page DOM
extraction (`fetchWordEntries`), the user-page harvest (`fetchUserItems`), and the
CDN host list (`CDN_HOSTS`) — are the only parts that need recalibration if Forvo's
markup or hosting changes.
