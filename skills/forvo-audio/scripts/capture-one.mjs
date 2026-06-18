// One-shot: capture a single Forvo recording's REAL audio URL by clicking its
// play button in your actual Chrome profile (passes Cloudflare via existing
// clearance; AdBlock Plus stays on so the page stays light). Chrome must be quit.
//
//   node capture-one.mjs <playId> <outfile>
// e.g. node capture-one.mjs 5606812 /tmp/forvo/hola_cesardavidmor1.mp3

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const playId = process.argv[2];
const outfile = process.argv[3];
if (!playId || !outfile) { console.error('usage: capture-one.mjs <playId> <outfile>'); process.exit(2); }

const USER_DATA = join(homedir(), '.config', 'google-chrome');
const WORD_URL = 'https://forvo.com/word/hola/#es_latam';
const playSel = `[onclick*="Play(${playId},"]`;
const isAudio = (u) => /audio\d*\.forvo\.com\/.*\.mp3/i.test(u) || /\.mp3(\?|$)/i.test(u);

const ctx = await chromium.launchPersistentContext(USER_DATA, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--profile-directory=Default'],
  // keep AdBlock Plus & co. enabled
  ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
});

try {
  const page = ctx.pages()[0] || await ctx.newPage();
  console.error('navigating…');
  await page.goto(WORD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait until the target play control is present — i.e. Cloudflare passed & page rendered.
  // Generous timeout in case Cloudflare shows an interactive challenge to solve by hand.
  console.error('waiting for the page/pronunciation to appear (solve Cloudflare if prompted)…');
  await page.waitForSelector(playSel, { timeout: 120000 });

  // Arm the network listener, then click only this one play button.
  const waitAudio = page.waitForResponse((r) => isAudio(r.url()), { timeout: 20000 });
  const el = page.locator(playSel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  console.error('clicking play…');
  await el.click();

  const resp = await waitAudio;
  const url = resp.url();
  const body = await resp.body();
  await writeFile(outfile, body);
  console.error(`captured: ${url}`);
  console.log(JSON.stringify({ playId, url, bytes: body.length, outfile }));
} finally {
  await ctx.close();
}
