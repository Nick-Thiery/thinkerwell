// Draws the link-sharing picture (Open Graph and Twitter card): what
// WhatsApp, Telegram, Facebook and others show under a pasted link to the
// site. 1200 x 630, the size they all ask for.
//
//     node scripts/make_social_card.mjs
//     python3 scripts/optimise_images.py
//
// The first writes the full-size original to
// docs/design-system/assets/social-card.png, drawn by Chromium with the
// site's own fonts and the transparent mascot, unchanged. The second makes
// the small copy the site serves, public/social-card.png. Run both again if
// the wording or the brand changes, and commit both files.
//
// The mascot, the name and "Explore your world." sit in the white panel in
// the middle: a small preview often shows only a square cut from the centre
// (x 285 to 915), and they still show there. Around it, a line-drawn world
// in the brand's colours: hills, a river, houses, a balloon, a paper plane.
//
// Redrawn 14 November 2026: the first card was a flat lemon page that named
// one course and wrote "social-studies" with a hyphen. It names no course
// and gives no counts, so it stays true as courses are added. Wording
// follows docs/content/PUBLIC_COPY.md and the video motto.
//
// Set PW_CHROMIUM_PATH to use an installed Chromium instead of Playwright's.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const dataUrl = (file, type) => `data:${type};base64,${readFileSync(path.join(root, file)).toString('base64')}`;
const font = (pkg, file) => dataUrl(`node_modules/@fontsource/${pkg}/files/${file}`, 'font/woff2');

const W = 1172; // the lemon card, inside a 14px ink frame
const H = 546;
const rays = Array.from({ length: 8 }, (_, k) => {
  const a = (k * Math.PI) / 4;
  const [x1, y1, x2, y2] = [44, 44, 58, 58].map((r, n) => (n % 2 ? Math.sin(a) : Math.cos(a)) * r);
  return `<path d="M${1050 + x1} ${92 + y1} L${1050 + x2} ${92 + y2}"/>`;
}).join('');
const sparkle = (x, y, r) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="#ffffff" stroke-width="2"/>`;
const tree = (x, y, r = 14) =>
  `<path d="M${x} ${y} L${x} ${y - r - 6}" stroke-width="2.5"/><circle cx="${x}" cy="${y - r - 14}" r="${r}" fill="#dcefd5"/>`;
const pine = (x, y) =>
  `<path d="M${x} ${y} L${x} ${y - 8}" stroke-width="2.5"/><path d="M${x - 14} ${y - 8} L${x} ${y - 44} L${x + 14} ${y - 8} Z" fill="#dcefd5"/>`;
const house = (x, y, w, h, roof) =>
  `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#ffffff"/>` +
  `<path d="M${x - 5} ${y - h + 1} L${x + w / 2} ${y - h - w * 0.55} L${x + w + 5} ${y - h + 1} Z" fill="${roof}"/>` +
  `<path d="M${x + w / 2 - 5} ${y} L${x + w / 2 - 5} ${y - 13} L${x + w / 2 + 5} ${y - 13} L${x + w / 2 + 5} ${y}" stroke-width="2"/>`;

const world = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="#0f0e0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <!-- sky: sun, clouds, balloon, paper plane, sparkles -->
  <circle cx="1050" cy="92" r="32" fill="#ffffff"/>${rays}
  <path d="M70 118 L196 118 A20 20 0 0 0 180 88 A30 30 0 0 0 124 76 A24 24 0 0 0 86 94 A17 17 0 0 0 70 118 Z" fill="#ffffff"/>
  <path d="M930 196 L1018 196 A14 14 0 0 0 1006 175 A21 21 0 0 0 967 167 A17 17 0 0 0 941 180 A12 12 0 0 0 930 196 Z" fill="#ffffff"/>
  <g transform="translate(176 156)">
    <path d="M0 0 C-44 0 -50 58 -14 92 L14 92 C50 58 44 0 0 0 Z" fill="#d2c0f9"/>
    <path d="M0 0 C-16 20 -18 64 -6 92 M0 0 C16 20 18 64 6 92" stroke-width="2.5"/>
    <path d="M0 0 C-4 30 -4 64 0 92" stroke-width="2.5"/>
    <path d="M-14 92 L-9 112 M14 92 L9 112" stroke-width="2"/>
    <rect x="-11" y="112" width="22" height="16" rx="3" fill="#ffe9c7"/>
  </g>
  <path d="M110 300 C 60 260, 120 230, 150 262" stroke-width="3" stroke-dasharray="0.5 10"/>
  <path d="M944 268 C 990 300, 1050 290, 1066 250" stroke-width="3" stroke-dasharray="0.5 10"/>
  <g transform="translate(1072 226) rotate(-28)">
    <path d="M-30 0 L30 -14 L-8 10 Z" fill="#ffffff"/>
    <path d="M-8 10 L30 -14 L0 22 Z" fill="#ece4fd"/>
  </g>
  ${sparkle(262, 68, 13)}${sparkle(1126, 176, 10)}${sparkle(48, 214, 9)}${sparkle(904, 108, 9)}
  <!-- land -->
  <path d="M0 372 L70 318 L132 352 L214 270 L302 352 L360 330 L360 546 L0 546 Z" fill="#ece4fd"/>
  <path d="M196 288 L214 270 L234 290 L224 286 L214 296 L204 286 Z" fill="#ffffff" stroke-width="2.5"/>
  <path d="M214 270 L214 246" stroke-width="2.5"/><path d="M214 246 L232 252 L214 258 Z" fill="#fde0e8" stroke-width="2.5"/>
  <path d="M812 340 L870 300 L936 262 L1000 318 L1060 286 L1172 360 L1172 546 L812 546 Z" fill="#ece4fd"/>
  <path d="M918 278 L936 262 L955 279 L945 275 L936 285 L927 275 Z" fill="#ffffff" stroke-width="2.5"/>
  <path d="M-4 430 C 120 392, 250 392, 380 414 C 520 438, 660 430, 790 410 C 920 390, 1050 384, 1176 404 L1176 550 L-4 550 Z" fill="#d2c0f9"/>
  <path d="M-4 482 C 180 462, 360 474, 560 476 C 760 478, 960 458, 1176 468 L1176 550 L-4 550 Z" fill="#fffbc4"/>
  <path d="M368 412 C 352 440, 326 456, 316 478 C 306 502, 300 524, 296 550 L336 550 C 338 528, 344 506, 352 488 C 362 466, 384 442, 390 418 Z" fill="#d7e7fb" stroke="none"/>
  <path d="M368 412 C 352 440, 326 456, 316 478 C 306 502, 300 524, 296 550"/>
  <path d="M390 418 C 384 442, 362 466, 352 488 C 344 506, 338 528, 336 550"/>
  <path d="M322 506 q 6 -4 12 0 M332 470 q 6 -4 12 0" stroke-width="2"/>
  <path d="M300 482 C 314 474, 352 472, 368 482 L364 488 C 350 480, 318 480, 304 488 Z" fill="#ffe9c7" stroke-width="2.5"/>
  ${tree(52, 418)}${pine(92, 412)}${tree(240, 404, 12)}
  ${house(150, 402, 34, 26, '#ffe9c7')}
  ${house(932, 398, 36, 28, '#d7e7fb')}${house(984, 394, 30, 24, '#fde0e8')}${house(1028, 396, 34, 26, '#ffe9c7')}
  ${tree(1094, 402)}${pine(1132, 404)}${tree(880, 400, 12)}${pine(700, 540)}${tree(960, 540, 11)}${pine(250, 540)}
  <path d="M440 516 C 560 500, 700 508, 820 504 C 930 500, 1010 490, 1100 494" stroke-width="3.5" stroke-dasharray="0.5 12"/>
  ${tree(160, 520, 12)}${tree(1120, 528, 12)}${sparkle(560, 524, 8)}
</svg>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Eczar; font-weight: 500; src: url(${font('eczar', 'eczar-latin-500-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Funnel Display'; font-weight: 600; src: url(${font('funnel-display', 'funnel-display-latin-600-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Atkinson Hyperlegible Next'; font-weight: 400; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Atkinson Hyperlegible Next'; font-weight: 600; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-600-normal.woff2')}) format('woff2'); }
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; background: #0f0e0e; color: #0f0e0e; font-family: 'Atkinson Hyperlegible Next'; position: relative; overflow: hidden; }
  .card { position: absolute; left: 14px; top: 14px; width: ${W}px; height: ${H}px; background: #ffff66; border-radius: 36px; overflow: hidden; }
  .card > svg { position: absolute; inset: 0; }
  .panel { position: absolute; left: 306px; top: 34px; width: 560px; height: 404px; box-sizing: border-box; background: #ffffff; border: 4px solid #0f0e0e; border-radius: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .panel img { width: 168px; height: auto; display: block; }
  .name { font-family: Eczar; font-weight: 500; font-size: 76px; line-height: 1; letter-spacing: -0.01em; margin-top: 4px; }
  .head { font-family: 'Funnel Display'; font-weight: 600; font-size: 52px; line-height: 1.08; letter-spacing: -0.02em; margin-top: 12px; }
  .sub { font-size: 26px; line-height: 1.3; margin-top: 8px; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; display: flex; align-items: center; justify-content: center; gap: 22px; color: #ffffff; font-weight: 600; font-size: 26px; }
  .bar i { width: 8px; height: 8px; border-radius: 50%; background: #ffff66; display: block; }
</style>
</head>
<body>
  <div class="card">
    ${world}
    <div class="panel">
      <img src="${dataUrl('docs/design-system/assets/thinkerwell-mascot-transparent.png', 'image/png')}" alt="">
      <div class="name">Thinkerwell</div>
      <div class="head">Explore your world.</div>
      <div class="sub">Social studies and beyond.</div>
    </div>
  </div>
  <div class="bar"><span>Free</span><i></i><span>Works offline</span><i></i><span>No accounts</span></div>
</body>
</html>`;

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, 'docs', 'design-system', 'assets', 'social-card.png');
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${path.relative(root, out)}`);
