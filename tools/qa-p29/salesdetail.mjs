/* Sales detail pages — the invoice page and the quotation editor must carry the
   reference block's contact-details card, in both themes, without errors.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node salesdetail.mjs [base] [outdir] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/salesdetail'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1050 } });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push({ msg: String(e.message).slice(0, 90), at: String(e.stack || '').split('\n')[1] || '', when: page.url().split('#')[1] || '' }));
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });
const ids = await page.evaluate(async () => {
  const inv = await window.WXA.api('invs_list'); const q = await window.WXA.api('quotes_list');
  return { inv: (inv.invoices || [])[0]?.id || (inv.items || [])[0]?.id, quote: (q.quotes || [])[0]?.id || (q.items || [])[0]?.id };
});
console.log('ids:', JSON.stringify(ids));
const out = {};
for (const mode of ['light', 'dark']) {
  await page.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  out[mode] = {};
  for (const [name, hash] of [['invoice', '#/invoice/' + ids.inv], ['quote', '#/quote/' + ids.quote]]) {
    await page.goto(`${BASE}/admin/?theme=${mode}&t=${Date.now()}${hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nav', { timeout: 25000 });
    await new Promise(r => setTimeout(r, 2800));
    out[mode][name] = await page.evaluate(() => {
      const v = document.querySelector('#view');
      const card = v.querySelector('.wx-details');
      const rows = card ? [...card.querySelectorAll('.wx-drow')] : [];
      const cs = card ? getComputedStyle(card) : null;
      return {
        dark: document.documentElement.classList.contains('dark'),
        h1: (v.querySelector('h1') || {}).textContent?.slice(0, 40),
        card: !!card, title: card ? card.querySelector('h3').textContent : null,
        rows: rows.length,
        labels: rows.map(r => r.querySelector('small').textContent),
        values: rows.map(r => (r.querySelector('.v') || {}).textContent),
        iconsRendered: card ? card.querySelectorAll('.ic svg').length : 0,
        bg: cs && cs.backgroundColor, cols: cs ? getComputedStyle(card.parentElement).gridTemplateColumns.split(' ').length : 0,
        toolbar: v.querySelectorAll('.toolbar .btn, .toolbar button').length,
      };
    });
    await page.screenshot({ path: path.join(OUT, `${mode}-${name}.png`) });
  }
}
out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'salesdetail.json'), JSON.stringify(out, null, 1));
for (const m of ['light', 'dark']) { console.log('\n== ' + m.toUpperCase()); for (const k of ['invoice', 'quote']) console.log('  ' + k + ':', JSON.stringify(out[m][k])); }
console.log('\npageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
