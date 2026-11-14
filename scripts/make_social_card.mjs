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
// The mascot, the name and "Explore your world." sit in the middle panel: a
// small preview often shows only a square cut from the centre (x 285 to
// 915), and they still show there. The four courses sit on the sides.
//
// Redrawn 14 November 2026: the first card was a flat lemon page that named
// one course and wrote "social-studies" with a hyphen. Wording follows
// docs/content/PUBLIC_COPY.md and the video motto (src/seo, the LinkedIn
// banner). The lesson counts are the courses' own: change them with the
// courses.
//
// Set PW_CHROMIUM_PATH to use an installed Chromium instead of Playwright's.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Compass, Cpu, Globe, Palette } from 'lucide-react';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const dataUrl = (file, type) => `data:${type};base64,${readFileSync(path.join(root, file)).toString('base64')}`;
const font = (pkg, file) => dataUrl(`node_modules/@fontsource/${pkg}/files/${file}`, 'font/woff2');

const icon = (Icon) => renderToStaticMarkup(createElement(Icon, { size: 30, strokeWidth: 2, 'aria-hidden': true }));
const courses = [
  { name: 'Exploring Our World', lessons: 24, Icon: Globe },
  { name: 'Digital World', lessons: 17, Icon: Cpu },
  { name: 'Southeast Asia Through Time', lessons: 12, Icon: Compass },
  { name: 'Art, Architecture and Society', lessons: 20, Icon: Palette },
];
const card = ({ name, lessons, Icon }) => `
  <div class="course">
    <span class="chip">${icon(Icon)}</span>
    <span class="cname">${name}</span>
    <span class="cn">${lessons} lessons</span>
  </div>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: Eczar; font-weight: 500; src: url(${font('eczar', 'eczar-latin-500-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Funnel Display'; font-weight: 500; src: url(${font('funnel-display', 'funnel-display-latin-500-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Funnel Display'; font-weight: 600; src: url(${font('funnel-display', 'funnel-display-latin-600-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Atkinson Hyperlegible Next'; font-weight: 400; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Atkinson Hyperlegible Next'; font-weight: 600; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-600-normal.woff2')}) format('woff2'); }
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; box-sizing: border-box; background: #0f0e0e; color: #0f0e0e; font-family: 'Atkinson Hyperlegible Next'; position: relative; overflow: hidden; }
  .ground { position: absolute; inset: 14px 14px 84px 14px; background: #ffff66; border-radius: 36px; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 84px; display: flex; align-items: center; justify-content: center; gap: 22px; color: #ffffff; font-weight: 600; font-size: 28px; letter-spacing: 0.005em; }
  .bar i { width: 8px; height: 8px; border-radius: 50%; background: #ffff66; display: block; }
  .panel { position: absolute; left: 316px; top: 44px; width: 568px; height: 466px; box-sizing: border-box; background: #d2c0f9; border: 4px solid #0f0e0e; border-radius: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .panel img { width: 196px; height: auto; display: block; }
  .name { font-family: Eczar; font-weight: 500; font-size: 84px; line-height: 1; letter-spacing: -0.01em; margin-top: 6px; }
  .head { font-family: 'Funnel Display'; font-weight: 600; font-size: 50px; line-height: 1.1; letter-spacing: -0.02em; margin-top: 12px; }
  .sub { font-size: 26px; line-height: 1.3; margin-top: 10px; color: #0f0e0e; }
  .side { position: absolute; top: 44px; width: 262px; height: 466px; display: flex; flex-direction: column; gap: 22px; }
  .left { left: 34px; } .right { right: 34px; }
  .course { flex: 1; box-sizing: border-box; background: #ffffff; border: 3px solid #0f0e0e; border-radius: 26px; padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; }
  .chip { width: 52px; height: 52px; border-radius: 14px; background: #ece4fd; border: 2px solid #0f0e0e; display: flex; align-items: center; justify-content: center; }
  .chip svg { display: block; }
  .cname { font-family: 'Funnel Display'; font-weight: 600; font-size: 28px; line-height: 1.12; letter-spacing: -0.015em; }
  .cn { font-size: 22px; color: #4b4654; }
</style>
</head>
<body>
  <div class="ground"></div>
  <div class="side left">${courses.slice(0, 2).map(card).join('')}</div>
  <div class="panel">
    <img src="${dataUrl('docs/design-system/assets/thinkerwell-mascot-transparent.png', 'image/png')}" alt="">
    <div class="name">Thinkerwell</div>
    <div class="head">Explore your world.</div>
    <div class="sub">Social studies and beyond.</div>
  </div>
  <div class="side right">${courses.slice(2).map(card).join('')}</div>
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
