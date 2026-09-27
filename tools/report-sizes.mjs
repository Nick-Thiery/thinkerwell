#!/usr/bin/env node
// How much a device downloads (phase 6; see docs/notes/phase-6.md).
//
//   npm run build && npm run size
//
// Serves dist/ with `vite preview`, opens two pages in a fresh browser with
// no service worker and records every file each one fetches from the site:
// the home page ("first load": what a new visitor waits for) and Lesson 10's
// Read stage. Then reads the service worker's precache list from dist/sw.js
// (what is downloaded in the background after the first page, so that
// everything works offline). Each file is counted as it is on disk, and
// gzipped and brotli-compressed as a server such as Vercel sends text files
// (fonts and images are already compressed and are counted as they are).
//
// Uses Playwright's Chromium, or PW_CHROMIUM_PATH if set (as the e2e tests do).
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { preview } from 'vite';

const DIST = path.resolve('dist');
const COMPRESSED = /\.(html|js|css|svg|json|webmanifest)$/;

async function sizes(file) {
  const bytes = await readFile(path.join(DIST, file));
  if (!COMPRESSED.test(file)) return { raw: bytes.length, gzip: bytes.length, brotli: bytes.length };
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

async function total(files) {
  const sum = { raw: 0, gzip: 0, brotli: 0, count: 0 };
  const rows = [];
  for (const file of files) {
    const s = await sizes(file);
    rows.push({ file, ...s });
    sum.raw += s.raw;
    sum.gzip += s.gzip;
    sum.brotli += s.brotli;
    sum.count += 1;
  }
  return { sum, rows };
}

const kB = (n) => `${(n / 1000).toFixed(1)} kB`;

function print(title, { sum, rows }, details) {
  console.log(`\n${title}: ${sum.count} files, ${kB(sum.raw)} on disk, ${kB(sum.gzip)} gzipped, ${kB(sum.brotli)} brotli`);
  if (!details) return;
  const groups = new Map();
  for (const row of rows) {
    const kind = /\.woff2$/.test(row.file)
      ? 'fonts'
      : /\/L\d\d-.*\.svg$/.test(row.file)
        ? 'lesson pictures'
        : /\.(png|jpg)$/.test(row.file)
          ? 'images'
          : /content-.*\.js$/.test(row.file)
            ? 'lessons and checks (content chunk)'
            : /vendor-.*\.js$/.test(row.file)
              ? 'libraries (vendor chunk)'
              : /\.js$/.test(row.file)
                ? 'app code'
                : /\.css$/.test(row.file)
                  ? 'styles'
                  : 'other';
    const group = groups.get(kind) ?? { raw: 0, gzip: 0, brotli: 0, count: 0 };
    group.raw += row.raw;
    group.gzip += row.gzip;
    group.brotli += row.brotli;
    group.count += 1;
    groups.set(kind, group);
  }
  for (const [kind, group] of [...groups].sort((a, b) => b[1].brotli - a[1].brotli)) {
    console.log(`  ${kind.padEnd(36)} ${String(group.count).padStart(3)} files  ${kB(group.raw).padStart(10)}  ${kB(group.gzip).padStart(10)} gz  ${kB(group.brotli).padStart(10)} br`);
  }
}

async function pageFiles(browser, origin, url) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const files = new Set();
  page.on('requestfinished', (request) => {
    const u = new URL(request.url());
    if (u.origin !== origin) return;
    const file = u.pathname === '/' || !path.extname(u.pathname) ? 'index.html' : u.pathname.slice(1);
    files.add(file);
  });
  await page.goto(new URL(url, origin).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await context.close();
  return [...files].sort();
}

const server = await preview({ preview: { port: 0, strictPort: false }, logLevel: 'silent' });
const origin = new URL(server.resolvedUrls.local[0]).origin;
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
try {
  print('First load, home page', await total(await pageFiles(browser, origin, '/')), true);
  print('First load, Lesson 10 Read', await total(await pageFiles(browser, origin, '/lesson/towns-near-rivers/read')), true);

  const sw = await readFile(path.join(DIST, 'sw.js'), 'utf8').catch(() => null);
  if (sw === null) {
    console.log('\nNo dist/sw.js: this build has no service worker, so nothing is precached.');
  } else {
    await reportPrecache(sw);
  }
} finally {
  await browser.close();
  await server.close();
}

async function reportPrecache(sw) {
  const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);
  const workbox = [...sw.matchAll(/"\.\/(workbox-[\w-]+)"/g)].map((match) => `${match[1]}.js`);
  print('Precache (the whole site, for offline use)', await total(precached), true);
  print('Service worker itself (sw.js and the Workbox runtime)', await total(['sw.js', ...workbox]), false);
}
