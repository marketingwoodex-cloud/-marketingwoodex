/* Does "Make client" actually convert an enquiry from the UI?
   Opens a lead drawer, clicks #dr-cv, and verifies the client page + the link.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node sales-convert.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/convert';
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const page = await browser.newPage();
const errs = []; const apis = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
page.on('dialog', async d => { apis.push('dialog:' + d.type() + ':' + d.message().slice(0, 60)); await d.accept(); });
page.on('response', async r => {
  if (r.url().includes('api') || r.url().endsWith('/admin/api.php')) {
    try { const j = await r.json(); apis.push(`${j.action || '?'} ok=${j.ok} ${j.ok ? '' : j.error || ''}`); } catch (_) {}
  }
});

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

await page.goto(`${BASE}/admin/?t=${Date.now()}#/enquiries`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 3000));

const rows = await page.evaluate(() => document.querySelectorAll('#view tbody tr[data-id], #view tbody tr[data-lead]').length);
console.log('enquiry rows:', rows);
if (!rows) { console.log('no lead rows rendered'); await browser.close(); process.exit(1); }

let result = null;
for (let i = 0; i < Math.min(rows, 12) && !result; i++) {
  await page.evaluate(n => {
    const tr = document.querySelectorAll('#view tbody tr[data-id], #view tbody tr[data-lead]')[n];
    tr.click();
  }, i);
  await new Promise(r => setTimeout(r, 1800));
  const state = await page.evaluate(() => {
    const d = document.querySelector('#s17-dr');
    if (!d) return { open: false };
    const det = [...d.querySelectorAll('.s17-tabsb button')].find(b => b.dataset.p === 'det');
    if (det) det.click();
    return { open: true, hasCv: !!d.querySelector('#dr-cv'), name: (d.querySelector('h2') || {}).textContent, already: !!d.querySelector("a[href^='#/clients/']") };
  });
  if (!state.open) continue;
  if (!state.hasCv) { await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 700)); continue; }
  console.log(`row ${i}: drawer open, name="${state.name}", Make-client button present`);
  const before = await page.evaluate(() => location.hash);
  await page.evaluate(() => document.querySelector('#dr-cv').click());
  await new Promise(r => setTimeout(r, 4000));
  const after = await page.evaluate(() => ({
    hash: location.hash,
    h1: (document.querySelector('#view h1') || {}).textContent || null,
    card: !!document.querySelector('#view aside .wx-details'),
    err: (document.querySelector('#dr-err') || {}).textContent || null,
    toast: (document.querySelector('.toast.on, #toast') || {}).textContent || null,
  }));
  result = { row: i, name: state.name, before, after };
  await page.screenshot({ path: path.join(OUT, 'after-convert.png') });
  break;
}

console.log(JSON.stringify({ result, apiCalls: apis.filter(a => !a.startsWith('dialog')).slice(-8), dialogs: apis.filter(a => a.startsWith('dialog')).slice(-3), pageErrors: errs }, null, 1));
fs.writeFileSync(path.join(OUT, 'convert.json'), JSON.stringify({ result, apiCalls: apis, pageErrors: errs }, null, 1));
await browser.close();
