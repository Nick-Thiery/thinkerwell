#!/usr/bin/env node
// How long a page takes on a slow connection and a slow device (phase 8).
//
//   npm run build && npm run perf
//
// Serves dist/ the way Vercel does (brotli for text files, index.html for
// page addresses), then opens the home page and Lesson 10's Read stage in a
// fresh browser with Chromium's network and CPU throttling, and reports:
//
// - first paint: first-contentful-paint, when the first picture or text
//   shows (the mascot in the header, before the app has started);
// - page ready: when the page's h1 is on screen (the app has started and
//   drawn the page, so it can be used);
// - largest paint: largest-contentful-paint;
// - load: the load event;
// - bytes: everything the page downloaded, as sent (compressed).
//
// Each is the median of RUNS cold loads (no HTTP cache, no service worker).
// The repeat visit is a page load after the service worker has stored the
// site, which is what every visit after the first one looks like.
//
// Uses Playwright's Chromium, or PW_CHROMIUM_PATH if set (as the e2e tests do).
import { chromium } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const DIST = path.resolve('dist');
const RUNS = Number(process.env.RUNS ?? 3);
const PAGES = [
  ['Home', '/'],
  ['Lesson 10 Read', '/lesson/towns-near-rivers/read'],
];
// Round-trip time added to every request, and throughput in bytes a second.
const PROFILES = [
  { name: 'Slow 3G (400 ms, 400 kbps), CPU 4x slower', latency: 400, down: 400_000 / 8, up: 400_000 / 8, cpu: 4 },
  { name: '3G (300 ms, 1.6 Mbps), CPU 4x slower', latency: 300, down: 1_600_000 / 8, up: 768_000 / 8, cpu: 4 },
  { name: 'Slow 4G (150 ms, 1.6 Mbps), CPU 4x slower', latency: 150, down: 1_600_000 / 8, up: 750_000 / 8, cpu: 4 },
];

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
const COMPRESS = /\.(html|js|css|svg|json|webmanifest)$/;
const brotliCache = new Map();

/** A small static server: files from dist/, index.html for page addresses, brotli where Vercel would use it. */
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
    const cache = file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
    if (COMPRESS.test(file) && /\bbr\b/.test(request.headers['accept-encoding'] ?? '')) {
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
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

/** Records when the first h1 appears, and the largest contentful paint, from the first script on. */
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

async function throttle(page, profile) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.down,
    uploadThroughput: profile.up,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
}

async function measure(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 180_000 });
  await page.waitForSelector('h1', { timeout: 180_000 });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? NaN;
    return {
      fcp,
      h1: window.__h1At ?? NaN,
      lcp: window.__lcp,
      load: nav.loadEventEnd,
      bytes: nav.transferSize + resources.reduce((sum, r) => sum + r.transferSize, 0),
    };
  });
}

async function coldLoad(browser, origin, url, profile) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 820, height: 1180 } });
  const page = await context.newPage();
  await page.addInitScript(installProbes);
  await throttle(page, profile);
  const result = await measure(page, origin + url);
  await context.close();
  return result;
}

async function repeatVisit(browser, origin, url, profile) {
  const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 820, height: 1180 } });
  const page = await context.newPage();
  await page.addInitScript(installProbes);
  await page.goto(origin + '/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  await throttle(page, profile);
  const result = await measure(page, origin + url);
  await context.close();
  return result;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const s = (ms) => `${(ms / 1000).toFixed(1)} s`.padStart(7);
const kB = (n) => `${Math.round(n / 1000)} kB`.padStart(7);

function report(label, runs) {
  const m = (key) => median(runs.map((run) => run[key]));
  console.log(`  ${label.padEnd(30)} first paint ${s(m('fcp'))}   page ready ${s(m('h1'))}   largest paint ${s(m('lcp'))}   load ${s(m('load'))}   ${kB(m('bytes'))}`);
}

const server = await serve();
const origin = `http://localhost:${server.address().port}`;
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
try {
  console.log(`Median of ${RUNS} runs, tablet size (820 x 1180), dist/ served with brotli as on Vercel.`);
  for (const profile of PROFILES) {
    console.log(`\n${profile.name}`);
    for (const [label, url] of PAGES) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await coldLoad(browser, origin, url, profile));
      report(`${label}, first visit`, runs);
    }
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await repeatVisit(browser, origin, PAGES[1][1], profile));
    report(`${PAGES[1][0]}, repeat visit`, runs);
  }
} finally {
  await browser.close();
  server.close();
}
