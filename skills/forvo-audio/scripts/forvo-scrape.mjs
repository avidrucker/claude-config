#!/usr/bin/env node
// forvo-scrape.mjs — drive a logged-in Forvo session to download native-speaker
// pronunciation audio for personal study. Audio half of `anki-gen` (GH #3).
//
// Auth model: a DEDICATED persistent Playwright profile (NOT your daily Chrome,
// NOT the Forvo API). No credentials live anywhere — you log in by hand once in
// the headed window; the session cookie persists in the profile for later runs.
//
// Usage:
//   node forvo-scrape.mjs --word hola [--lang es] [--out ~/Downloads]
//   node forvo-scrape.mjs --words-file list.txt [--lang es] [--out ~/Downloads]
//
// Each word emits one JSON line on stdout for anki-gen to consume:
//   { word, lang, files: [...abs paths], picks: [{speaker, votes, accent, favorite}], note? }

import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const PROFILE_DIR = join(homedir(), '.config', 'forvo-scraper-profile');
const FAVORITES_PATH = join(SKILL_DIR, 'favorites.json');
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // headed manual-login window
const NAV_TIMEOUT_MS = 30 * 1000;
const AUDIO_TIMEOUT_MS = 15 * 1000;

// ── Selectors / URL shapes (CALIBRATE against live Forvo in build step 7) ─────
// Forvo markup shifts over time; these are the only Forvo-specific assumptions.
const SEL = {
  // A node present only when logged in (e.g. the account/logout menu).
  loggedIn: '#user-menu, a[href*="logout"]',
  // Per-language pronunciation list container. `{lang}` is substituted.
  // Forvo has historically used `#language-container-{lang}`.
  langContainer: '#language-container-{lang}',
  // Each pronunciation entry within the container.
  entry: '.pronunciations li, ul.show-all-pronunciations li',
  // Within an entry: speaker username, vote count, accent/country, play control.
  speaker: '.ofLink, .from a, a[href*="/user/"]',
  votes: '.num_votes, .more .num',
  accent: '.from, .accent',
  play: '.play, .pronunciation-play, [onclick*="Play"]',
};
const WORD_URL = (word, lang) =>
  `https://forvo.com/word/${encodeURIComponent(word)}/#${lang}`;
const LOGIN_URL = 'https://forvo.com/login/';
// Match the audio response that fires when a play control is clicked.
const isAudioResponse = (url) =>
  /\.mp3(\?|$)/i.test(url) || /audio\d*\.forvo\.com/i.test(url);

// ── CLI parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { lang: 'es', out: join(homedir(), 'Downloads') };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--word') a.word = argv[++i];
    else if (k === '--words-file') a.wordsFile = argv[++i];
    else if (k === '--lang') a.lang = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--help' || k === '-h') a.help = true;
  }
  if (a.out.startsWith('~')) a.out = join(homedir(), a.out.slice(1));
  return a;
}

function usage() {
  console.error(`forvo-scrape — download native-speaker pronunciation audio

  node forvo-scrape.mjs --word hola [--lang es] [--out ~/Downloads]
  node forvo-scrape.mjs --words-file list.txt [--lang es] [--out ~/Downloads]

  --lang   target language section (default: es)
  --out    output directory (default: ~/Downloads)`);
}

const sanitize = (w) =>
  w.trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'word';

async function loadFavorites(lang) {
  try {
    const raw = JSON.parse(await readFile(FAVORITES_PATH, 'utf8'));
    // favorites.json is language-scoped today; honor it regardless of `lang`.
    return Array.isArray(raw.favorites) ? raw.favorites : [];
  } catch {
    return [];
  }
}

// ── Per-word scrape ───────────────────────────────────────────────────────────
async function scrapeWord(page, word, lang, outDir, favorites) {
  const result = { word, lang, files: [], picks: [] };

  await page.goto(WORD_URL(word, lang), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

  const container = page.locator(SEL.langContainer.replace('{lang}', lang)).first();
  if ((await container.count()) === 0) {
    result.note = `no '${lang}' section for "${word}"`;
    return result;
  }

  const entries = container.locator(SEL.entry);
  const n = await entries.count();
  if (n === 0) {
    result.note = `no pronunciations in '${lang}' for "${word}"`;
    return result;
  }

  // Read metadata for every entry.
  const meta = [];
  for (let i = 0; i < n; i++) {
    const e = entries.nth(i);
    const speaker = (await e.locator(SEL.speaker).first().textContent().catch(() => null))?.trim() || null;
    const votesText = (await e.locator(SEL.votes).first().textContent().catch(() => null)) || '';
    const votes = parseInt(votesText.replace(/[^\d-]/g, ''), 10) || 0;
    const accent = (await e.locator(SEL.accent).first().textContent().catch(() => null))?.trim() || null;
    meta.push({ index: i, speaker, votes, accent });
  }

  // Selection rule: highest-ranked favorite present → 1 file; else top-2 by votes.
  let chosen;
  const favRanked = favorites
    .map((name, rank) => ({ name: name.toLowerCase(), rank }))
    .map(({ name, rank }) => ({ rank, hit: meta.find((m) => (m.speaker || '').toLowerCase() === name) }))
    .filter((x) => x.hit)
    .sort((a, b) => a.rank - b.rank);

  if (favRanked.length > 0) {
    chosen = [{ ...favRanked[0].hit, favorite: true }];
  } else {
    chosen = [...meta]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 2)
      .map((m) => ({ ...m, favorite: false }));
  }

  // Download each chosen entry via network-response capture (robust path).
  for (let pick = 0; pick < chosen.length; pick++) {
    const m = chosen[pick];
    const base = sanitize(word);
    const filename = pick === 0 ? `${base}.mp3` : `${base}-${pick + 1}.mp3`;
    const dest = join(outDir, filename);
    try {
      const waitAudio = page.waitForResponse((r) => isAudioResponse(r.url()), { timeout: AUDIO_TIMEOUT_MS });
      await entries.nth(m.index).locator(SEL.play).first().click();
      const resp = await waitAudio;
      await writeFile(dest, await resp.body());
      result.files.push(dest);
    } catch (err) {
      result.note = (result.note ? result.note + '; ' : '') + `audio capture failed for ${m.speaker || 'entry ' + m.index}: ${err.message}`;
    }
    result.picks.push({ speaker: m.speaker, votes: m.votes, accent: m.accent, favorite: m.favorite });
  }

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.word && !args.wordsFile)) {
    usage();
    process.exit(args.help ? 0 : 2);
  }

  let words = [];
  if (args.word) words.push(args.word);
  if (args.wordsFile) {
    const raw = await readFile(resolve(args.wordsFile), 'utf8');
    words.push(...raw.split('\n').map((s) => s.trim()).filter(Boolean));
  }

  await mkdir(args.out, { recursive: true });
  await mkdir(PROFILE_DIR, { recursive: true });
  const favorites = await loadFavorites(args.lang);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(NAV_TIMEOUT_MS);
  const page = context.pages()[0] || (await context.newPage());

  try {
    // Login gate — reuse persisted session, else wait for manual login.
    await page.goto('https://forvo.com/', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    if ((await page.locator(SEL.loggedIn).count()) === 0) {
      console.error('Not logged in. Opening login page — log in by hand in the browser window.');
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForSelector(SEL.loggedIn, { timeout: LOGIN_TIMEOUT_MS });
      console.error('Login detected. Continuing — session is saved for next time.');
    }

    for (const w of words) {
      let res;
      try {
        res = await scrapeWord(page, w, args.lang, args.out, favorites);
      } catch (err) {
        res = { word: w, lang: args.lang, files: [], picks: [], note: `error: ${err.message}` };
      }
      process.stdout.write(JSON.stringify(res) + '\n');
    }
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
