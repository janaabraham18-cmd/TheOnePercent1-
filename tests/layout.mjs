// Layout and smoke checks for the built site, phone to TV.
//
//   npm test             builds the site, then runs these checks
//   npm run test:layout  runs the checks against the existing dist/
//
// Needs Playwright's Chromium once per machine: npx playwright install chromium
//
// For every page at every width it checks: no sideways scroll, no script
// errors, no "[ink]" warnings (the pen line reporting a renamed section), and
// that the header shows the full nav or the menu button at the right widths.
// On the home page it also checks the brand film draws, the "Is your site in
// the 99%?" quiz gives a result, and the enquiry form flags empty fields.

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const WIDTHS = [375, 768, 1024, 1280, 1440, 1920, 2560];
const NAV_BREAKPOINT = 960; // Header.astro switches from the menu button to the full nav here.

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

// A tiny static server for dist/, so the checks need nothing else running.
function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(DIST, url));
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    if (url.endsWith('/')) file = join(file, 'index.html');
    else if (!(await exists(file)) && (await exists(join(file, 'index.html')))) file = join(file, 'index.html');
    let status = 200;
    if (!(await exists(file))) {
      file = join(DIST, '404.html');
      status = 404;
    }
    res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function pages() {
  const work = await readdir(join(DIST, 'work'));
  return ['/', ...work.map((slug) => `/work/${slug}/`), '/404.html'];
}

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

async function checkPage(browser, base, path, width) {
  const where = `${path} @ ${width}px`;
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (err) => fail(where, `script error: ${err.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !/status of 404/.test(text)) fail(where, `console error: ${text}`);
    if (text.startsWith('[ink]')) fail(where, text);
  });

  await page.goto(base + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Scroll through so anything that lays out on scroll has done so.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(200);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow !== 0) fail(where, `page scrolls sideways by ${overflow}px`);

  const header = await page.evaluate(() => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    };
    return { nav: shown('.site-header__nav'), toggle: shown('.site-header__toggle') };
  });
  const wantNav = width >= NAV_BREAKPOINT;
  if (header.nav !== wantNav) fail(where, `header nav should be ${wantNav ? 'shown' : 'hidden'}`);
  if (header.toggle === wantNav) fail(where, `menu button should be ${wantNav ? 'hidden' : 'shown'}`);

  if (path === '/') await checkHome(page, where);
  await page.close();
}

async function checkHome(page, where) {
  // The brand film draws into its SVG.
  await page.locator('[data-film-svg]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const filmShapes = await page.locator('[data-film-svg] *').count();
  if (filmShapes < 10) fail(where, `brand film drew only ${filmShapes} elements`);

  // The quiz gives a result once all six are answered.
  const radios = page.locator('[data-check] input[value="yes"]');
  const n = await radios.count();
  for (let i = 0; i < n; i++) await radios.nth(i).check({ force: true });
  const score = (await page.locator('[data-score]').textContent())?.trim();
  if (!score?.startsWith(`${n} of ${n}`)) fail(where, `quiz score reads "${score}" after answering all ${n}`);
  if (await page.locator('[data-cta]').isHidden()) fail(where, 'quiz result button stays hidden');

  // The enquiry form flags empty required fields instead of sending.
  await page.locator('[data-enquiry-submit]').click();
  const invalid = await page.locator('#enq-name[aria-invalid], #enq-email[aria-invalid]').count();
  if (invalid !== 2) fail(where, `empty form marked ${invalid} of 2 required fields invalid`);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const list = await pages();
try {
  for (const path of list) {
    for (const width of WIDTHS) await checkPage(browser, base, path, width);
  }
} finally {
  await browser.close();
  server.close();
}

const total = list.length * WIDTHS.length;
if (failures.length) {
  console.error(`\n${failures.length} problem(s) across ${total} page/width checks:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ ${list.length} pages × ${WIDTHS.length} widths (${WIDTHS.join(', ')}px): no sideways scroll, no errors, header correct, home interactions work.`);
