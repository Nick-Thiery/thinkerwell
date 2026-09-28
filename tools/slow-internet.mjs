#!/usr/bin/env node
// What a learner on bad internet downloads, and how long it takes
// (docs/notes/slow-internet.md).
//
//   npm run build && npm run slow-internet            # bytes and timings
//   npm run build && npm run slow-internet -- --bytes # bytes only (seconds, not minutes)
//   ... -- --runs 5 --json out.json                   # more runs; keep the numbers
//
// Serves dist/ the way Vercel does (brotli for text files, index.html for
// page addresses, the caching headers in vercel.json) and reports:
//
// 1. Bytes, from a fresh browser with no service worker: every request a
//    first visit to the home page and to Lesson 10's Read stage makes, by
//    kind, split into what is asked for before the page's h1 is on screen
//    (what the learner waits for) and what follows. Then the precache: the
//    whole course the service worker downloads after the first visit, by
//    kind, with its largest files. Each file is counted as it is on disk,
//    gzipped (-9) and brotli-compressed (quality 11), as Vercel sends text
//    files; fonts and images are already compressed and count as they are.
//    Byte counts don't depend on the machine: they are the reliable number.
//
// 2. Timings, with Chromium's own network throttling
//    (Network.emulateNetworkConditions, over the Chrome DevTools Protocol),
//    on the page and on the service worker, so its precache download is
//    throttled too. No CPU throttling: other work on the machine makes CPU
//    timings noisy, so each figure is the median of --runs cold visits (no
//    cache). For each visit:
//    - first paint: first-contentful-paint (the header's lemon bar and mascot
//      from index.html, before the app has started);
//    - page ready: the first meaningful paint, when the page's h1 (its real
//      content) is on screen;
//    - offline ready: when the service worker is active, which it only
//      becomes once the whole course is stored ("All 24 lessons work
//      offline"), measured from the start of the visit.
//
// Uses Playwright's Chromium, or PW_CHROMIUM_PATH if set (as the e2e tests do).
import { chromium } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const DIST = path.resolve(process.env.DIST ?? 'dist');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const RUNS = Number(option('--runs', 3));
const JSON_OUT = option('--json', null);
const BYTES_ONLY = flag('--bytes');

const PAGES = [
  { key: 'home', label: 'Home page', url: '/' },
  { key: 'lesson', label: 'Lesson 10 Read, from a link', url: '/lesson/towns-near-rivers/read' },
];
// Round-trip time added to every request; throughput in bytes a second.
const PROFILES = [
  { key: 'slow3g', label: 'Slow 3G (400 kbit/s, 400 ms)', latency: 400, down: 400_000 / 8, up: 400_000 / 8 },
  { key: 'poor', label: 'Very poor (150 kbit/s, 600 ms)', latency: 600, down: 150_000 / 8, up: 150_000 / 8 },
];

// ---------------------------------------------------------------- sizes

const COMPRESSED = /\.(html|js|css|svg|json|webmanifest|txt|xml)$/;
const sizeCache = new Map();

async function sizes(file) {
  if (sizeCache.has(file)) return sizeCache.get(file);
  const bytes = await readFile(path.join(DIST, file));
  const result = COMPRESSED.test(file)
    ? {
        raw: bytes.length,
        gzip: gzipSync(bytes, { level: 9 }).length,
        brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
      }
    : { raw: bytes.length, gzip: bytes.length, brotli: bytes.length };
  sizeCache.set(file, result);
  return result;
}

function kind(file) {
  if (/\.html$/.test(file)) return 'HTML';
  if (/\.m?js$/.test(file)) return 'JS';
  if (/\.css$/.test(file)) return 'CSS';
  if (/\.(woff2?|ttf|otf)$/.test(file)) return 'fonts';
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(file)) return 'images';
  return 'other';
}
const KINDS = ['HTML', 'JS', 'CSS', 'fonts', 'images', 'other'];

async function tally(files) {
  const rows = [];
  for (const file of files) rows.push({ file, kind: kind(file), ...(await sizes(file)) });
  const sum = (list) => list.reduce((t, r) => ({ count: t.count + 1, raw: t.raw + r.raw, gzip: t.gzip + r.gzip, brotli: t.brotli + r.brotli }), { count: 0, raw: 0, gzip: 0, brotli: 0 });
  const byKind = Object.fromEntries(KINDS.map((k) => [k, sum(rows.filter((r) => r.kind === k))]));
  return { total: sum(rows), byKind, rows };
}

const kB = (n) => `${(n / 1000).toFixed(1)} kB`;
const line = (label, t) =>
  `  ${label.padEnd(26)} ${String(t.count).padStart(3)} files ${kB(t.raw).padStart(10)} raw ${kB(t.gzip).padStart(10)} gz ${kB(t.brotli).padStart(10)} br`;

function printTally(title, t) {
  console.log(`\n${title}`);
  for (const k of KINDS) if (t.byKind[k].count) console.log(line(k, t.byKind[k]));
  console.log(line('total', t.total));
}

// ---------------------------------------------------------------- server

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};
const brotliCache = new Map();

/** dist/ as Vercel serves it: files first, index.html for page addresses, 404 for missing files, brotli for text. */
function serve() {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let file = path.join(DIST, decodeURIComponent(url.pathname));
    const info = await stat(file).catch(() => null);
    if (!info || info.isDirectory()) {
      if (path.extname(url.pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = path.join(DIST, 'index.html');
    }
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const immutable = file.includes(`${path.sep}assets${path.sep}`) || /workbox-[\w-]+\.js$/.test(file);
    const cache = immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
    if (COMPRESSED.test(file) && /\bbr\b/.test(request.headers['accept-encoding'] ?? '')) {
      if (!brotliCache.has(file)) {
        brotliCache.set(file, brotliCompressSync(await readFile(file), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
      }
      response.writeHead(200, { 'Content-Type': type, 'Content-Encoding': 'br', 'Cache-Control': cache });
      response.end(brotliCache.get(file));
      return;
    }
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const fileOf = (pathname) => (pathname === '/' || !path.extname(pathname) ? 'index.html' : pathname.slice(1));

// ---------------------------------------------------------------- probes

/** Records when the page's first h1 appears, and the largest contentful paint. Runs before any page script. */
function installProbes() {
  window.__h1At = null;
  window.__lcp = 0;
  new MutationObserver((_records, observer) => {
    if (document.querySelector('h1')) {
      window.__h1At = performance.now();
      observer.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
}

// ---------------------------------------------------------------- bytes

/** Every file a first visit asks this site for, and whether it was asked for before the h1 was on screen. */
async function firstVisitFiles(browser, origin, url) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 820, height: 1180 } });
  const page = await context.newPage();
  await page.addInitScript(installProbes);
  const requests = [];
  page.on('request', (request) => {
    const u = new URL(request.url());
    if (u.origin === origin) requests.push({ file: fileOf(u.pathname), at: Date.now() });
  });
  const start = Date.now();
  await page.goto(origin + url, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  // Everything the page does after load (registering the worker needs workbox-window).
  await page.waitForTimeout(1500);
  const h1At = start + (await page.evaluate(() => window.__h1At));
  await context.close();
  const seen = new Map();
  for (const r of requests) if (!seen.has(r.file)) seen.set(r.file, r.at);
  const before = [...seen].filter(([, at]) => at <= h1At).map(([file]) => file);
  const after = [...seen].filter(([, at]) => at > h1At).map(([file]) => file);
  return { before, after };
}

async function bytesReport(browser, origin) {
  const out = { pages: {}, precache: null };
  for (const { key, label, url } of PAGES) {
    const { before, after } = await firstVisitFiles(browser, origin, url);
    const all = await tally([...before, ...after]);
    const b = await tally(before);
    const a = await tally(after);
    printTally(`First visit, ${label} (${url}): every request`, all);
    console.log(`  before the first screen (asked for before the h1 is on screen): ${b.total.count} files, ${kB(b.total.brotli)} br, ${kB(b.total.gzip)} gz`);
    for (const r of b.rows) console.log(`    ${r.file.padEnd(62)} ${kB(r.brotli).padStart(9)} br`);
    console.log(`  what follows: ${a.total.count} files, ${kB(a.total.brotli)} br, ${kB(a.total.gzip)} gz`);
    for (const r of a.rows) console.log(`    ${r.file.padEnd(62)} ${kB(r.brotli).padStart(9)} br`);
    out.pages[key] = { url, all: strip(all), before: strip(b), after: strip(a), beforeFiles: b.rows, afterFiles: a.rows };
  }

  const sw = await readFile(path.join(DIST, 'sw.js'), 'utf8').catch(() => null);
  if (sw) {
    const precached = [...sw.matchAll(/"?url"?:"([^"]+)"/g)].map((m) => m[1]);
    const workbox = [...sw.matchAll(/"\.\/(workbox-[\w-]+)"/g)].map((m) => `${m[1]}.js`);
    const p = await tally(precached);
    printTally('Precache: the whole course, downloaded by the service worker after the first visit', p);
    const worker = await tally(['sw.js', ...workbox]);
    console.log(line('(sw.js and Workbox)', worker.total));
    console.log('  15 largest (by brotli size):');
    const top = [...p.rows].sort((x, y) => y.brotli - x.brotli || y.raw - x.raw).slice(0, 15);
    for (const r of top) console.log(`    ${r.file.padEnd(62)} ${kB(r.raw).padStart(9)} raw ${kB(r.gzip).padStart(9)} gz ${kB(r.brotli).padStart(9)} br`);
    out.precache = { ...strip(p), worker: worker.total, top, files: p.rows.map((r) => r.file) };
  }
  return out;
}

const strip = (t) => ({ total: t.total, byKind: t.byKind });

// ---------------------------------------------------------------- timings

/**
 * Throttles every service worker the browser starts, as DevTools does, over
 * a second DevTools connection: Playwright's CDP sessions reach pages only,
 * and a page's throttling doesn't cover its service worker's downloads.
 */
async function throttleServiceWorkers(port) {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const state = { profile: null, bytes: 0 };
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo } = msg.params;
      try {
        if (targetInfo.type === 'service_worker' && state.profile) {
          const p = state.profile;
          await send('Network.enable', {}, sessionId);
          await send('Network.setCacheDisabled', { cacheDisabled: false }, sessionId);
          await send('Network.emulateNetworkConditions', { offline: false, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up }, sessionId);
        }
      } finally {
        await send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => undefined);
      }
    }
    if (msg.method === 'Network.loadingFinished' && msg.sessionId) state.bytes += msg.params.encodedDataLength;
  };
  await send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
    filter: [{ type: 'service_worker', exclude: false }],
  });
  return { state, close: () => ws.close() };
}

async function throttlePage(page, profile) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.down, uploadThroughput: profile.up });
}

/** One cold first visit (no cache): paints, and when the whole course is stored for offline use. */
async function coldVisit(browser, sw, origin, url, profile) {
  const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 820, height: 1180 } });
  const page = await context.newPage();
  await page.addInitScript(installProbes);
  await throttlePage(page, profile);
  sw.state.profile = profile;
  sw.state.bytes = 0;
  await page.goto(origin + url, { waitUntil: 'commit', timeout: 300_000 });
  await page.waitForSelector('h1', { timeout: 300_000 });
  const offlineReady = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    if (worker.state !== 'activated') {
      await new Promise((resolve) => worker.addEventListener('statechange', () => worker.state === 'activated' && resolve()));
    }
    return performance.now();
  });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    return {
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? NaN,
      h1: window.__h1At ?? NaN,
      lcp: window.__lcp,
      load: nav.loadEventEnd,
      pageBytes: nav.transferSize + resources.reduce((sum, r) => sum + r.transferSize, 0),
    };
  });
  await context.close();
  return { ...result, offlineReady, swBytes: sw.state.bytes };
}

const median = (values) => {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
};
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;

async function timingReport(port, origin) {
  const browser = await chromium.launch({
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: [`--remote-debugging-port=${port}`],
  });
  const sw = await throttleServiceWorkers(port);
  const out = {};
  try {
    console.log(`\nTimings: median of ${RUNS} cold first visits, tablet size (820 x 1180), network throttled (page and service worker), CPU not throttled.`);
    for (const profile of PROFILES) {
      console.log(`\n${profile.label}`);
      out[profile.key] = {};
      for (const { key, label, url } of PAGES) {
        const runs = [];
        for (let i = 0; i < RUNS; i++) runs.push(await coldVisit(browser, sw, origin, url, profile));
        const m = (k) => median(runs.map((r) => r[k]));
        out[profile.key][key] = { runs, median: { fcp: m('fcp'), h1: m('h1'), lcp: m('lcp'), load: m('load'), offlineReady: m('offlineReady'), pageBytes: m('pageBytes'), swBytes: m('swBytes') } };
        const md = out[profile.key][key].median;
        console.log(
          `  ${label.padEnd(30)} first paint ${sec(md.fcp).padStart(7)}   page ready ${sec(md.h1).padStart(7)}   largest paint ${sec(md.lcp).padStart(7)}   offline ready ${sec(md.offlineReady).padStart(7)}   (${kB(md.pageBytes)} page + ${kB(md.swBytes)} service worker)`,
        );
        console.log(`    runs: page ready ${runs.map((r) => sec(r.h1)).join(', ')}; offline ready ${runs.map((r) => sec(r.offlineReady)).join(', ')}`);
      }
    }
  } finally {
    sw.close();
    await browser.close();
  }
  return out;
}

// ---------------------------------------------------------------- main

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;
const results = { date: new Date().toISOString(), runs: RUNS };
try {
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  try {
    results.bytes = await bytesReport(browser, origin);
  } finally {
    await browser.close();
  }
  if (!BYTES_ONLY) results.timings = await timingReport(9200 + Math.floor(Math.random() * 700), origin);
} finally {
  server.close();
}
if (JSON_OUT) await writeFile(JSON_OUT, JSON.stringify(results, null, 2));
