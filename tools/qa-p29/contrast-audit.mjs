/* Contrast audit — walks every visible text node in the real admin, computes
   its actual rendered contrast against its effective background, and reports
   failures with the element's class list so they can be fixed by selector.
   Runs light and dark. Also reports elements using hardcoded colour literals.

   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node contrast-audit.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/contrast';
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

/* Installed in the page: resolve the real painted colour of any element by
   walking up until a non-transparent background is found. */
const AUDIT = () => {
  const parse = c => {
    const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = p => 0.2126 * lin(p.r / 255) + 0.7152 * lin(p.g / 255) + 0.0722 * lin(p.b / 255);
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const bgOf = el => {
    let n = el, acc = null;
    while (n && n !== document.documentElement) {
      const p = parse(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0) acc = acc ? over(acc, p) : p;
      if (acc && acc.a >= 0.999) return acc;
      n = n.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    const body = parse(getComputedStyle(document.body).backgroundColor);
    let base = root && root.a > 0 ? root : body;
    if (!base) base = { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, base) : base;
  };
  const vis = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const sel = el => {
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  };

  const failures = [], bySelector = {};
  const walk = document.querySelectorAll('*');
  for (const el of walk) {
    // only elements that render their own text
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own.length) continue;
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg || fg.a === 0) continue;
    const bg = bgOf(el);
    const eff = fg.a < 1 ? over(fg, bg) : fg;
    const cr = ratio(eff, bg);
    const txt = own.map(n => n.textContent.trim()).join(' ').slice(0, 48);
    const size = parseFloat(s.fontSize);
    const weight = +s.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (cr < need) {
      const key = sel(el);
      failures.push({ text: txt, selector: key, ratio: +cr.toFixed(2), need, color: s.color, fontSize: s.fontSize, fontWeight: weight });
      bySelector[key] = bySelector[key] || { count: 0, ratio: +cr.toFixed(2), sample: txt, color: s.color };
      bySelector[key].count++;
    }
  }

  // hardcoded colours in inline styles (DESIGN.md §4 violation)
  const hard = [];
  for (const el of document.querySelectorAll('[style]')) {
    const st = el.getAttribute('style') || '';
    const hits = st.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g);
    if (hits) hard.push({ selector: sel(el), hits: [...new Set(hits)].slice(0, 3) });
  }

  return {
    dark: document.documentElement.classList.contains('dark'),
    checked: walk.length,
    failureCount: failures.length,
    distinctSelectors: Object.keys(bySelector).length,
    bySelector: Object.entries(bySelector).sort((a, b) => b[1].count - a[1].count).slice(0, 30),
    worst: failures.sort((a, b) => a.ratio - b.ratio).slice(0, 25),
    hardcodedInline: hard.slice(0, 25),
    hardcodedInlineCount: hard.length,
  };
};

const out = { base: BASE };
for (const mode of ['light', 'dark']) {
  await page.evaluate(m => localStorage.setItem('hs_theme', m), mode);
  await page.goto(BASE + '/admin/#/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  await page.waitForSelector('.dx-kpi', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  out[mode] = await page.evaluate(AUDIT);
  await page.screenshot({ path: path.join(OUT, `${mode}-dashboard.png`) });
}

out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'contrast-audit.json'), JSON.stringify(out, null, 1));
for (const mode of ['light', 'dark']) {
  const r = out[mode];
  console.log(`\n===== ${mode.toUpperCase()} =====  elements=${r.checked}  failures=${r.failureCount}  distinct selectors=${r.distinctSelectors}`);
  console.log('--- worst offenders ---');
  r.worst.slice(0, 12).forEach(f => console.log(`  ${String(f.ratio).padStart(6)}:1  (need ${f.need})  ${f.fontSize.padStart(7)} w${f.fontWeight}  ${f.selector.slice(0, 46).padEnd(46)} "${f.text.slice(0, 26)}"`));
  console.log(`--- hardcoded inline colours: ${r.hardcodedInlineCount} ---`);
}
console.log('\npageErrors:', errs.length);
await browser.close();
