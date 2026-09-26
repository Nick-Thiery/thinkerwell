#!/usr/bin/env node
// Dev tool (see README.md, "Dev tooling"). Takes full-page screenshots of one
// or more pages at one or more widths, and reports things a reviewer would
// otherwise have to check by hand: horizontal overflow, console/page errors,
// requests to other hosts, undersized tap targets and text under 14px.
//
// Usage:
//   PLAYWRIGHT_BROWSERS_PATH=0 node tools/shoot.mjs <url> [more urls] \
//     [--widths 390,820,1280] [--rtl] [--out .build-review/shots/<name>]
//
// Exit code is 0 unless a page fails to load (navigation error or timeout);
// everything else — overflow, small text, foreign requests — is reported,
// not treated as failure.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_WIDTHS = [390, 820, 1280];
const MIN_TARGET = 44;
const MIN_TEXT = 14;

function parseArgs(argv) {
  const urls = [];
  let widths = DEFAULT_WIDTHS;
  let rtl = false;
  let out = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--widths') {
      i += 1;
      const value = argv[i];
      if (!value) throw new Error('--widths needs a comma-separated list, e.g. --widths 390,820,1280');
      widths = value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (widths.length === 0) throw new Error(`--widths had no usable numbers: "${value}"`);
    } else if (arg === '--rtl') {
      rtl = true;
    } else if (arg === '--out') {
      i += 1;
      out = argv[i];
      if (!out) throw new Error('--out needs a directory');
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      urls.push(arg);
    }
  }

  return { urls, widths, rtl, out };
}

/** Every visible `button, a[href], input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])` under 44x44. */
function findSmallTargets(minTarget) {
  const selector = "button, a[href], input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])";
  const out = [];
  for (const el of document.querySelectorAll(selector)) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue; // not rendered at all
    if (rect.width < minTarget || rect.height < minTarget) {
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40);
      out.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${label}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    }
  }
  return out;
}

/** Every visible text node whose parent's computed font-size is under 14px. */
function findSmallText(minText) {
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    const size = parseFloat(getComputedStyle(parent).fontSize);
    if (Number.isFinite(size) && size < minText) {
      const text = node.textContent.trim().slice(0, 40);
      const key = `${parent.tagName}:${text}:${size}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(`"${text}" ${size}px (<${parent.tagName.toLowerCase()}>)`);
      }
    }
    node = walker.nextNode();
  }
  return out;
}

function slugFor(url, width, rtl) {
  const slug = (url.pathname.replace(/\//g, '_') || 'root') + (url.search ? `_${url.search.replace(/[^a-z0-9]+/gi, '-')}` : '');
  return `${slug}${rtl ? '-rtl' : ''}-${width}.png`;
}

async function shootOne(browser, rawUrl, width, rtl, outDir) {
  const url = new URL(rawUrl);
  if (rtl) url.searchParams.set('dir', 'rtl');

  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();

  const consoleIssues = [];
  const pageErrors = [];
  const foreignRequests = new Set();

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') consoleIssues.push(`[console.${type}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('request', (request) => {
    try {
      const host = new URL(request.url()).host;
      if (host && host !== url.host) foreignRequests.add(`${host} — ${request.url()}`);
    } catch {
      // data:/blob: and similar URLs have no host; nothing to flag.
    }
  });

  const report = { url: url.toString(), width, loaded: true };

  try {
    try {
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
    } catch (error) {
      report.loaded = false;
      report.loadError = error instanceof Error ? error.message : String(error);
    }

    if (report.loaded) {
      report.horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      report.smallTargets = await page.evaluate(findSmallTargets, MIN_TARGET);
      report.smallText = await page.evaluate(findSmallText, MIN_TEXT);

      // A dev page like /dev/screens/<Name> renders the screen it's showing
      // inside an <iframe> (its own isolated document, deliberately not the
      // top document — see README.md), so the tap-target and text-size scans
      // above see nothing about the screen itself unless every child frame
      // is scanned too.
      for (const frame of page.frames()) {
        if (frame === page.mainFrame() || frame.isDetached()) continue;
        const frameLabel = frame.url() || '(frame)';
        try {
          const frameTargets = await frame.evaluate(findSmallTargets, MIN_TARGET);
          const frameText = await frame.evaluate(findSmallText, MIN_TEXT);
          report.smallTargets.push(...frameTargets.map((entry) => `[${frameLabel}] ${entry}`));
          report.smallText.push(...frameText.map((entry) => `[${frameLabel}] ${entry}`));
        } catch {
          // The frame may not have finished loading its own document yet;
          // nothing useful to scan.
        }
      }

      const fileName = slugFor(url, width, rtl);
      report.screenshot = path.join(outDir, fileName);
      try {
        await page.screenshot({ path: report.screenshot, fullPage: true });
      } catch (error) {
        // A write failure (for example a filename that's too long) shouldn't
        // abort the rest of the run: report it and keep going.
        report.screenshot = null;
        report.screenshotError = error instanceof Error ? error.message : String(error);
      }
    }

    report.consoleIssues = consoleIssues;
    report.pageErrors = pageErrors;
    report.foreignRequests = [...foreignRequests];
  } finally {
    await context.close();
  }
  return report;
}

function printReport(report) {
  const heading = `${report.url} @ ${report.width}px`;
  console.log(`\n${heading}\n${'-'.repeat(heading.length)}`);
  if (!report.loaded) {
    console.log(`FAILED TO LOAD: ${report.loadError}`);
    return;
  }
  if (report.screenshotError) {
    console.log(`Screenshot FAILED: ${report.screenshotError}`);
  } else {
    console.log(`Screenshot: ${report.screenshot}`);
  }
  console.log(`Horizontal overflow: ${report.horizontalOverflow ? 'YES' : 'no'}`);
  console.log(`Foreign-host requests: ${report.foreignRequests.length}`);
  for (const req of report.foreignRequests) console.log(`  - ${req}`);
  console.log(`Console errors/warnings: ${report.consoleIssues.length}`);
  for (const msg of report.consoleIssues) console.log(`  - ${msg}`);
  console.log(`Uncaught page errors: ${report.pageErrors.length}`);
  for (const msg of report.pageErrors) console.log(`  - ${msg}`);
  console.log(`Tap targets under ${MIN_TARGET}x${MIN_TARGET}px: ${report.smallTargets.length}`);
  for (const el of report.smallTargets) console.log(`  - ${el}`);
  console.log(`Text under ${MIN_TEXT}px: ${report.smallText.length}`);
  for (const t of report.smallText) console.log(`  - ${t}`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(
      'Usage: node tools/shoot.mjs <url> [more urls] [--widths 390,820,1280] [--rtl] [--out .build-review/shots/<name>]',
    );
    process.exitCode = 1;
    return;
  }

  if (args.urls.length === 0) {
    console.error(
      'Usage: node tools/shoot.mjs <url> [more urls] [--widths 390,820,1280] [--rtl] [--out .build-review/shots/<name>]',
    );
    process.exitCode = 1;
    return;
  }

  const outDir = path.resolve(args.out ?? path.join('.build-review', 'shots', `shoot-${Date.now()}`));
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  let anyLoadFailed = false;

  try {
    for (const rawUrl of args.urls) {
      for (const width of args.widths) {
        // One page at a time, deliberately: keeps output ordered and readable.
        const report = await shootOne(browser, rawUrl, width, args.rtl, outDir);
        printReport(report);
        if (!report.loaded) anyLoadFailed = true;
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nScreenshots saved to ${outDir}`);
  process.exitCode = anyLoadFailed ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
