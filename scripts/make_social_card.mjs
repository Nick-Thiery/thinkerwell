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
// Everything sits in the middle: a small preview often shows only a square
// cut from the centre, and the mascot and the name still show there.
//
// Set PW_CHROMIUM_PATH to use an installed Chromium instead of Playwright's.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const dataUrl = (file, type) => `data:${type};base64,${readFileSync(path.join(root, file)).toString('base64')}`;
const font = (pkg, file) => dataUrl(`node_modules/@fontsource/${pkg}/files/${file}`, 'font/woff2');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Eczar; font-weight: 500; src: url(${font('eczar', 'eczar-latin-500-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Funnel Display'; font-weight: 500; src: url(${font('funnel-display', 'funnel-display-latin-500-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Atkinson Hyperlegible Next'; font-weight: 400; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff2')}) format('woff2'); }
  html, body { margin: 0; }
  body {
    width: 1200px; height: 630px; box-sizing: border-box;
    background: #ffff66; color: #0f0e0e;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    text-align: center;
  }
  img { width: 290px; height: auto; display: block; margin-bottom: 10px; }
  .name { font-family: Eczar; font-weight: 500; font-size: 92px; line-height: 1; letter-spacing: -0.01em; }
  .course { font-family: 'Funnel Display'; font-weight: 500; font-size: 44px; line-height: 1.15; letter-spacing: -0.015em; }
  .line { font-family: 'Atkinson Hyperlegible Next'; font-size: 30px; line-height: 1.3; margin-top: 10px; }
</style>
</head>
<body>
  <img src="${dataUrl('docs/design-system/assets/thinkerwell-mascot-transparent.png', 'image/png')}" alt="">
  <div class="name">Thinkerwell</div>
  <div class="course">Exploring Our World</div>
  <div class="line">A free social-studies course. Works offline, with no accounts.</div>
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
