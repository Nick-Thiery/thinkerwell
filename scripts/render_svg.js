// Render an SVG to PNG next to it (1280px wide) and report simple problems.
// Usage: node render_svg.js path/to/L07.svg [more.svg ...]
//
// This project is ESM ("type": "module" in package.json), so plain `.js`
// files use import, not require.
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = await import(path.join(globalRoot, 'playwright')));
}

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('usage: node render_svg.js file.svg ...'); process.exit(2); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    const problems = [];
    if (Buffer.byteLength(svg) > 40 * 1024) problems.push(`file is ${Math.round(Buffer.byteLength(svg) / 1024)} KB (max 40)`);
    if (/<script|<foreignObject|<image|href="http|filter=|Gradient/i.test(svg)) problems.push('uses a forbidden element (script, foreignObject, image, external href, filter or gradient)');
    if (!/viewBox="0 0 960 540"/.test(svg)) problems.push('viewBox must be "0 0 960 540"');
    if (!/<title>/.test(svg) || !/<desc>/.test(svg)) problems.push('needs <title> and <desc>');
    const allowed = ['#0f0e0e','#4b4654','#d5d1dc','#ffffff','#fff','#6fb6d6','#bfe0e8','#dcefd5','#7a9b4e','#c9d9a8','#b5cb8e','#3f6b35','#f3e3c3','#a07850','#fde68a','#ffff66','#d2c0f9','#ece4fd','#4e32b5','#ffe9c7','#7a4300','#2d6326','#fde0e8','#8c2548','#d7e7fb','#1e4e94','#8d5524','#c68642','#e0ac69','#f1c27d'];
    const used = [...new Set((svg.match(/#[0-9a-fA-F]{3,6}\b/g) || []).map(c => c.toLowerCase()))].filter(c => !allowed.includes(c));
    if (used.length) problems.push('colours outside the palette: ' + used.join(', '));
    if (/\b(red|crimson)\b/i.test(svg.replace(/<desc>[\s\S]*?<\/desc>|<title>[\s\S]*?<\/title>|<text[\s\S]*?<\/text>/g, ''))) problems.push('named red colour found');
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg.replace('<svg', '<svg style="display:block;width:1280px;height:720px"')}</body></html>`);
    const report = await page.evaluate(() => {
      const out = [];
      const svg = document.querySelector('svg');
      const vb = svg.viewBox.baseVal;
      const texts = [...svg.querySelectorAll('text')];
      const boxes = texts.map(t => { const b = t.getBBox(); return { t: t.textContent.trim(), x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(getComputedStyle(t).fontSize) }; });
      boxes.forEach(b => {
        if (b.x < 24 || b.y < 24 || b.x + b.w > vb.width - 24 || b.y + b.h > vb.height - 24) out.push(`label near or past the edge: "${b.t}"`);
      });
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) out.push(`labels overlap: "${a.t}" and "${c.t}"`);
      }
      const small = boxes.filter(b => b.h > 0 && b.h < 18).map(b => b.t);
      if (small.length) out.push('text may be under 22 units: ' + small.slice(0, 5).join(' | '));
      return { labels: boxes.length, out };
    });
    const png = f.replace(/\.svg$/, '.png');
    await page.screenshot({ path: png });
    console.log(`${path.basename(f)}: ${report.labels} labels -> ${path.basename(png)}`);
    [...problems, ...report.out].forEach(p => console.log('   ' + p));
  }
  await browser.close();
})();
