#!/usr/bin/env node
// forvo-scrape.mjs — download native-speaker pronunciation audio from Forvo for
// personal study. Audio half of `anki-gen` (GH #3).
//
// HOW IT WORKS (the method that actually survives Forvo's defenses):
//   1. ALL forvo.com HTML pages are Cloudflare-walled — curl/fetch from outside
//      gets HTTP 403 "Just a moment". Only a REAL browser passes the challenge.
//   2. So we launch ONE persistent browser, navigate ONCE to forvo.com to obtain
//      Cloudflare clearance (the cookie persists in the profile), then read every
//      other page with an IN-PAGE fetch() — same-origin, so it inherits clearance
//      and, crucially, does NOT execute the target page's ads/scripts. (Loading
//      ~hundreds of word pages as real navigations is what exhausted RAM and
//      froze the machine; in-page fetch avoids that entirely.)
//   3. Each pronunciation's audio path is base64-encoded inside its play control's
//      onclick:  Play(id,'<b64 mp3 path>','<b64 ogg>',...,'<word>','<language>').
//      We decode the 2nd arg to e.g. "9276802/41/9276802_41_540465.mp3".
//   4. The audio CDN (audioNN.forvo.com) is NOT Cloudflare-walled, so the actual
//      download is browser-free: plain Node fetch with a UA + Referer.
//
// Auth model: a DEDICATED persistent Playwright profile (NOT your daily Chrome).
// No credentials in the repo. Public audio needs only Cloudflare clearance, which
// you clear by hand once in the headed window; it persists for later runs. (Log in
// there too if you want gated features — not required for downloads.)
//
// Usage:
//   node forvo-scrape.mjs --word hola [--lang es] [--picks 2] [--out ~/Downloads]
//   node forvo-scrape.mjs --words-file list.txt [--lang es] [--out ~/Downloads]
//   node forvo-scrape.mjs --user Steve04 [--lang es] [--max-pages N] [--out DIR]
//   node forvo-scrape.mjs --word hola --images          # audio + a Wikipedia image
//   node forvo-scrape.mjs --words-file list.txt --images-only   # images, no browser
//
// Images (--images / --images-only): pull the top Wikipedia lead image for each
// word — key-free AND browser-free (Wikimedia isn't Cloudflare-walled). The image
// is sized under 100KB via the API's width parameter (no local recompression, so
// no extra deps). Good for concrete nouns/places/people; abstract/grammatical words
// usually have none. --images-only skips the browser entirely. See fetchWordImage().
//
// Output: files land in --out; each unit emits one JSON line on stdout for anki-gen.
//   word mode: { word, lang, files:[abs], picks:[{speaker,votes,country,region,favorite,file}], image?, note? }
//   user mode: { user, lang, count, files:[abs], items:[{word,file}], note? }
//   images-only: { word, lang, image }   where image = {file,source,title,weak,bytes} | {note}

import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const PROFILE_DIR = join(homedir(), '.config', 'forvo-scraper-profile');
const FAVORITES_PATH = join(SKILL_DIR, 'favorites.json');
const NAV_TIMEOUT_MS = 30 * 1000;
const CLEARANCE_TIMEOUT_MS = 5 * 60 * 1000; // headed manual Cloudflare/login window
// Audio CDN hosts to try, in order. audio12 has served every path we've tested;
// the others are fallbacks in case Forvo shards a file elsewhere.
const CDN_HOSTS = [
  'https://audio12.forvo.com/mp3',
  'https://audio.forvo.com/mp3',
  'https://audio00.forvo.com/mp3',
];
// Wikipedia/Wikimedia image flow (key-free, browser-free). Wikimedia REQUIRES a
// descriptive User-Agent. Widths step down until the file is under the size cap.
const WIKI_UA = 'forvo-audio-skill/1.0 (personal Anki study; https://github.com/avidrucker/claude-config)';
const IMG_MAX_BYTES = 100 * 1024;
const IMG_WIDTHS = [320, 256, 220, 180, 150, 120];

// ── CLI parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { lang: 'es', out: join(homedir(), 'Downloads'), picks: 2 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--word') a.word = argv[++i];
    else if (k === '--words-file') a.wordsFile = argv[++i];
    else if (k === '--user') a.user = argv[++i];
    else if (k === '--lang') a.lang = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--picks') a.picks = Math.max(1, parseInt(argv[++i], 10) || 2);
    else if (k === '--max-pages') a.maxPages = parseInt(argv[++i], 10) || undefined;
    else if (k === '--headless') a.headless = true;
    else if (k === '--images') a.images = true;
    else if (k === '--images-only') a.imagesOnly = true;
    else if (k === '--help' || k === '-h') a.help = true;
  }
  if (a.out.startsWith('~')) a.out = join(homedir(), a.out.slice(1));
  return a;
}

function usage() {
  console.error(`forvo-scrape — download native-speaker pronunciation audio

  node forvo-scrape.mjs --word hola [--lang es] [--picks 2] [--out ~/Downloads]
  node forvo-scrape.mjs --words-file list.txt [--lang es] [--out ~/Downloads]
  node forvo-scrape.mjs --user Steve04 [--lang es] [--max-pages N] [--out DIR]

  --lang         target language section (default: es; also the Wikipedia subdomain)
  --picks        word mode: how many recordings per word (default: 2)
  --max-pages    user mode: cap pages harvested (default: all)
  --out          output directory (default: ~/Downloads)
  --headless     skip the headed window (only safe once clearance is established)
  --images       also fetch a top Wikipedia image per word (audio + image)
  --images-only  fetch only Wikipedia images (no browser, no audio)

Selection rule (word mode): a ranked favorite (favorites.json) wins outright;
otherwise Spain recordings are dropped, then ranked Colombian-first, then by votes.`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Filename slug: strip accents, lowercase, non-alphanumerics → "_".
const slug = (w) =>
  w.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'word';

async function loadFavorites() {
  try {
    const raw = JSON.parse(await readFile(FAVORITES_PATH, 'utf8'));
    return Array.isArray(raw.favorites) ? raw.favorites : [];
  } catch {
    return [];
  }
}

// Download one recording from the CDN (browser-free). b64 → decoded path → host.
async function downloadAudio(b64, dest) {
  const path = Buffer.from(b64, 'base64').toString('utf8');
  let lastErr;
  for (const host of CDN_HOSTS) {
    const url = `${host}/${path}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://forvo.com/' },
      });
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status} from ${host}`); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      // Forvo's "missing audio" placeholder is ~48.9KB; real clips vary. Guard
      // against truncated/HTML bodies only — the placeholder check is best-effort.
      if (buf.length < 1500) { lastErr = new Error(`too small (${buf.length}B) from ${host}`); continue; }
      await writeFile(dest, buf);
      return { url, bytes: buf.length, path };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('no CDN host returned audio');
}

// ── Wikipedia image flow (key-free, browser-free) ──────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch bytes, retrying with backoff on HTTP 429 (Wikimedia rate-limits bursts).
async function fetchBytes(url) {
  let delay = 1000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': WIKI_UA } });
    if (r.status === 429 && attempt < 3) { await sleep(delay); delay *= 2; continue; }
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }
  return null;
}

// Top Wikipedia image for a term via the REST summary (resolves redirects).
// Returns { title, source, weak } or null. `weak` flags flags/svg/diagram images.
async function wikiSummary(word, lang) {
  const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`,
    { headers: { 'User-Agent': WIKI_UA } });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  const source = d?.thumbnail?.source;
  if (!source) return null;
  const weak = /\.svg\.png$|\/langes-|\.png$/i.test(source);
  return { title: d.title, source, weak };
}

// Action-API thumbnail at an exact width (reliable resize, unlike URL-hacking).
async function wikiThumbAtWidth(lang, title, width) {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=${width}&titles=${encodeURIComponent(title)}`;
  const r = await fetch(u, { headers: { 'User-Agent': WIKI_UA } });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const pages = j?.query?.pages || {};
  return Object.values(pages)[0]?.thumbnail?.source || null;
}

// Discover → download → guarantee < 100KB. Returns {file,source,title,weak,bytes,note?}
// or {note} when there's no usable image.
async function fetchWordImage(word, lang, outDir) {
  const meta = await wikiSummary(word, lang);
  if (!meta) return { note: `no Wikipedia image for "${word}"` };

  let buf = await fetchBytes(meta.source);
  let usedUrl = meta.source;
  if (!buf || buf.length >= IMG_MAX_BYTES) {
    for (const w of IMG_WIDTHS) {
      const src = await wikiThumbAtWidth(lang, meta.title, w);
      if (!src) continue;
      const b = await fetchBytes(src);
      if (!b) continue;
      buf = b; usedUrl = src;
      if (b.length < IMG_MAX_BYTES) break;
    }
  }
  if (!buf) return { note: `image download failed for "${word}"` };

  const ext = (usedUrl.match(/\.(jpe?g|png|gif)(?=$|\?)/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const file = join(outDir, `wiki_${slug(word)}.${ext}`);
  await writeFile(file, buf);
  const out = { file, source: meta.source, title: meta.title, weak: meta.weak, bytes: buf.length };
  if (buf.length >= IMG_MAX_BYTES) out.note = `still ${(buf.length / 1024) | 0}KB (>100KB)`;
  return out;
}

// Establish Cloudflare clearance once. After this, in-page fetch() works.
async function ensureClearance(page) {
  await page.goto('https://forvo.com/', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  const challenged = async () =>
    /just a moment|attention required|cf-/i.test((await page.title()) + ' ' + page.url());
  if (await challenged()) {
    console.error('Cloudflare challenge shown — solve it (and log in if you like) in the browser window…');
    await page.waitForFunction(
      () => !/just a moment|attention required/i.test(document.title),
      { timeout: CLEARANCE_TIMEOUT_MS }
    );
    console.error('Clearance obtained — session saved for next time.');
  }
}

// ── In-page extractors (run in the browser, inherit Cloudflare clearance) ──────
// Regex pulling {b64,word,lang} from every Play(...) in an HTML string.
// Shared as a string so it can be injected into page.evaluate.
const PLAY_RE_SRC = String.raw`Play\(\d+,'([^']*)','[^']*'(?:,[^,]*){4},'([^']*)','([^']*)'`;

// Word page → pronunciation entries with metadata, for the selection rule.
async function fetchWordEntries(page, word, lang) {
  return page.evaluate(async ({ word, lang, playReSrc }) => {
    const url = `https://forvo.com/word/${encodeURIComponent(word)}/`;
    const res = await fetch(url, { credentials: 'include' });
    const html = await res.text();
    if (/just a moment|attention required/i.test(html))
      return { challenge: true, entries: [] };
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.querySelector(`#language-container-${lang}`);
    if (!container) return { challenge: false, entries: [] };

    const playRe = new RegExp(playReSrc);
    const regionOf = (el) => {
      let n = el;
      while (n && n !== container) {
        const m = (n.className || '').toString().match(/\b([a-z]{2}_(?:es|latam|other))\b/);
        if (m) return m[1];
        n = n.parentElement;
      }
      return null;
    };
    const entries = [];
    for (const li of container.querySelectorAll('li')) {
      const playEl = li.querySelector('[onclick*="Play("]');
      if (!playEl) continue;
      const m = (playEl.getAttribute('onclick') || '').match(playRe);
      if (!m) continue;
      const speaker = (li.querySelector('a[href*="/user/"]')?.textContent || '').trim() || null;
      const votesText = li.querySelector('.num_votes, .more .num, .vote-count')?.textContent || '';
      const votes = parseInt(votesText.replace(/[^\d-]/g, ''), 10) || 0;
      const cm = li.textContent.replace(/\s+/g, ' ').match(/from ([A-Za-zÁÉÍÓÚÑáéíóúñ .'-]+?)\s*\)/);
      entries.push({
        b64: m[1], word: m[2], speaker, votes,
        country: cm ? cm[1].trim() : null, region: regionOf(li),
      });
    }
    return { challenge: false, entries };
  }, { word, lang, playReSrc: PLAY_RE_SRC });
}

// User page → every recording across all pages (deduped). One navigation's worth
// of clearance covers all pages via in-page fetch.
async function fetchUserItems(page, user, maxPages) {
  return page.evaluate(async ({ user, maxPages, playReSrc }) => {
    const base = `https://forvo.com/user/${encodeURIComponent(user)}/`;
    const playRe = new RegExp(playReSrc, 'g');
    const parse = (html) => {
      const out = []; let m;
      while ((m = playRe.exec(html)) !== null) out.push({ b64: m[1], word: m[2], lang: m[3] });
      return out;
    };
    const r0 = await fetch(base, { credentials: 'include' });
    const h0 = await r0.text();
    if (/just a moment|attention required/i.test(h0)) return { challenge: true, items: [] };

    const doc = new DOMParser().parseFromString(h0, 'text/html');
    const urls = new Set([base]);
    for (const a of doc.querySelectorAll('.pagination a')) {
      const href = a.getAttribute('href');
      if (href && /\/user\//.test(href)) urls.add(new URL(href, base).toString().split('#')[0]);
    }
    let list = [...urls];
    if (maxPages) list = list.slice(0, maxPages);

    const seen = new Set(); const items = [];
    const add = (arr) => { for (const it of arr) { const k = it.word + '|' + it.b64; if (!seen.has(k)) { seen.add(k); items.push(it); } } };
    add(parse(h0));
    await Promise.allSettled(
      list.filter((u) => u !== base).map(async (u) => {
        const r = await fetch(u, { credentials: 'include' });
        add(parse(await r.text()));
      })
    );
    return { challenge: false, items, pages: list.length };
  }, { user, maxPages, playReSrc: PLAY_RE_SRC });
}

// ── Selection (word mode) ──────────────────────────────────────────────────────
function choosePicks(entries, favorites, picks) {
  const favLc = favorites.map((f) => f.toLowerCase());
  for (let r = 0; r < favLc.length; r++) {
    const hit = entries.find((e) => (e.speaker || '').toLowerCase() === favLc[r]);
    if (hit) return [{ ...hit, favorite: true }];
  }
  const isSpain = (e) => e.country === 'Spain' || e.region === 'es_es';
  const isColombia = (e) => e.country === 'Colombia';
  return entries
    .filter((e) => !isSpain(e))
    .sort((a, b) => (isColombia(b) - isColombia(a)) || (b.votes - a.votes))
    .slice(0, picks)
    .map((e) => ({ ...e, favorite: false }));
}

// ── Per-unit drivers ───────────────────────────────────────────────────────────
async function doWord(page, word, lang, outDir, favorites, picks) {
  const result = { word, lang, files: [], picks: [] };
  const { challenge, entries } = await fetchWordEntries(page, word, lang);
  if (challenge) { result.note = 'cloudflare challenge — clearance lost'; return result; }
  if (entries.length === 0) { result.note = `no '${lang}' pronunciations for "${word}"`; return result; }

  const chosen = choosePicks(entries, favorites, picks);
  if (chosen.length === 0) { result.note = `only Spain recordings for "${word}" (rejected)`; return result; }

  for (let i = 0; i < chosen.length; i++) {
    const m = chosen[i];
    const sp = m.speaker ? '_' + slug(m.speaker) : '';
    const dest = join(outDir, `forvo_${slug(word)}${sp}.mp3`);
    try {
      await downloadAudio(m.b64, dest);
      result.files.push(dest);
      result.picks.push({ speaker: m.speaker, votes: m.votes, country: m.country, region: m.region, favorite: m.favorite, file: dest });
    } catch (e) {
      result.note = (result.note ? result.note + '; ' : '') + `download failed for ${m.speaker || 'entry'}: ${e.message}`;
    }
  }
  return result;
}

async function doUser(page, user, lang, outDir, maxPages) {
  const result = { user, lang, count: 0, files: [], items: [] };
  const { challenge, items, pages } = await fetchUserItems(page, user, maxPages);
  if (challenge) { result.note = 'cloudflare challenge — clearance lost'; return result; }
  const wanted = lang ? items.filter((it) => (it.lang || '').toLowerCase().startsWith(lang === 'es' ? 'spanish' : lang)) : items;
  result.note = `harvested ${pages} page(s), ${wanted.length} recording(s)`;

  for (const it of wanted) {
    const dest = join(outDir, `forvo_${slug(it.word)}_${slug(user)}.mp3`);
    try {
      await downloadAudio(it.b64, dest);
      result.files.push(dest);
      result.items.push({ word: it.word, file: dest });
    } catch (e) {
      result.note += `; failed "${it.word}": ${e.message}`;
    }
  }
  result.count = result.items.length;
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.word && !args.wordsFile && !args.user)) {
    usage();
    process.exit(args.help ? 0 : 2);
  }

  const words = [];
  if (args.word) words.push(args.word);
  if (args.wordsFile) {
    const raw = await readFile(resolve(args.wordsFile), 'utf8');
    words.push(...raw.split('\n').map((s) => s.trim()).filter(Boolean));
  }

  await mkdir(args.out, { recursive: true });

  // ── Images-only: browser-free, no Forvo at all ──
  if (args.imagesOnly) {
    for (const w of words) {
      const image = await fetchWordImage(w, args.lang, args.out);
      process.stdout.write(JSON.stringify({ word: w, lang: args.lang, image }) + '\n');
      await sleep(250); // be gentle on Wikimedia
    }
    return;
  }

  // ── Audio (optionally + images) — needs the browser for Cloudflare clearance ──
  await mkdir(PROFILE_DIR, { recursive: true });
  const favorites = await loadFavorites();

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: !!args.headless,
    acceptDownloads: false,
  });
  context.setDefaultTimeout(NAV_TIMEOUT_MS);
  const page = context.pages()[0] || (await context.newPage());

  try {
    await ensureClearance(page);

    if (args.user) {
      const res = await doUser(page, args.user, args.lang, args.out, args.maxPages);
      process.stdout.write(JSON.stringify(res) + '\n');
    }
    for (const w of words) {
      let res;
      try {
        res = await doWord(page, w, args.lang, args.out, favorites, args.picks);
      } catch (err) {
        res = { word: w, lang: args.lang, files: [], picks: [], note: `error: ${err.message}` };
      }
      if (args.images) {
        res.image = await fetchWordImage(w, args.lang, args.out);
        await sleep(250); // be gentle on Wikimedia
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
