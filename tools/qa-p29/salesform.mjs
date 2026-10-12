/* Verifies the §8.3 split client form + the Client 360 contact-details card.
   Asserts the reference structure (two columns, details panel, icon rows) and
   that the live panel follows the form fields. Screenshots both.

   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node salesform.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/salesform';
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', async e => {
  let state = null;
  try { state = await page.evaluate(() => ({ hash: location.hash, c3ed: !!document.querySelector('#c3-ed'), modal: !document.querySelector('#modal').hidden, vh1: (document.querySelector('#view h1') || {}).textContent, vlen: (document.querySelector('#view') || { innerHTML: '' }).innerHTML.length })); } catch (_) {}
  errs.push({ msg: String(e.message).slice(0, 140), at: String(e.stack || '').split('\n')[1] || '', state });
});
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const report = {};
for (const mode of ['light', 'dark']) {
  await page.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);

  // ---- Client 360 contact-details card ----
  await page.goto(`${BASE}/admin/?theme=${mode}&t=${Date.now()}#/clients/1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  await page.waitForFunction(() => !document.querySelector('#view .empty'), { timeout: 20000 }).catch(() => {});
  await new Promise(x => setTimeout(x, 2000));
  report[mode] = {
    dark: await page.evaluate(() => document.documentElement.classList.contains('dark')),
    c360: await page.evaluate(() => {
      const card = document.querySelector('#view aside .wx-details');
      if (!card) return { found: false };
      const rows = [...card.querySelectorAll('.wx-drow')];
      const cs = getComputedStyle(card);
      return {
        found: true, title: (card.querySelector('h3') || {}).textContent,
        rows: rows.length,
        labels: rows.map(r => (r.querySelector('small') || {}).textContent),
        values: rows.map(r => (r.querySelector('.v') || r.querySelector('b') || {}).textContent),
        icons: card.querySelectorAll('.ic svg').length,
        bg: cs.backgroundColor, border: cs.borderColor, radius: cs.borderRadius,
      };
    }),
    c360Cards: await page.evaluate(() => [...document.querySelectorAll('#view aside > *')].map(e => e.className)),
  };
  await page.screenshot({ path: path.join(OUT, `${mode}-client360.png`), fullPage: false });

  // ---- split client form ----
  await page.goto(`${BASE}/admin/?theme=${mode}#/clients`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#cm-add', { timeout: 25000 });
  await new Promise(x => setTimeout(x, 1500));
  await page.click('#cm-add');
  await page.waitForSelector('#modal-card .wx-split', { timeout: 15000 });
  await new Promise(x => setTimeout(x, 700));
  const structure = await page.evaluate(() => {
    const card = document.querySelector('#modal-card');
    const split = card.querySelector('.wx-split');
    const s = getComputedStyle(split);
    const cols = s.gridTemplateColumns.split(' ').length;
    const details = card.querySelector('.wx-details');
    return {
      width: card.getBoundingClientRect().width,
      columns: cols,
      columnGap: s.columnGap,
      sections: [...card.querySelectorAll('.wx-fsection h3')].map(h => h.textContent),
      fields: card.querySelectorAll('.wx-field input, .wx-field select, .wx-field textarea').length,
      detailsTitle: details ? details.querySelector('h3').textContent : null,
      detailsRows: details ? details.querySelectorAll('.wx-drow').length : 0,
      detailsIcons: details ? details.querySelectorAll('.ic svg').length : 0,
      detailsRowsEmpty: details ? [...details.querySelectorAll('.wx-drow .v')].map(v => v.textContent) : [],
    };
  });
  // live panel: type and confirm it follows
  await page.evaluate(() => { for (const id of ['cf-n', 'cf-co', 'cf-p', 'cf-e', 'cf-c', 'cf-a']) { const e = document.getElementById(id); if (e) { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); } } });
  await page.type('#cf-n', 'Ayesha Khan');
  await page.type('#cf-co', 'Woodex Test Co');
  await page.type('#cf-p', '0300 1234567');
  await page.type('#cf-e', 'ayesha@example.com');
  await page.type('#cf-c', 'Karachi');
  await new Promise(x => setTimeout(x, 500));
  const liveInputs = await page.evaluate(() => ({ city: document.querySelector('#cf-c').value, addr: document.querySelector('#cf-a').value, locHTML: document.querySelector('#cf-pv-loc').innerHTML }));
  const live = await page.evaluate(() => ({
    person: (document.querySelector('#cf-pv-person') || {}).textContent,
    phone: (document.querySelector('#cf-pv-phone') || {}).textContent,
    mail: (document.querySelector('#cf-pv-mail') || {}).textContent,
    loc: (document.querySelector('#cf-pv-loc') || {}).textContent,
    name: (document.querySelector('#cf-pv-n') || {}).textContent,
    av: (document.querySelector('#cf-pv-av') || {}).textContent,
    phoneHref: (document.querySelector('#cf-pv-phone a') || {}).getAttribute ? document.querySelector('#cf-pv-phone a').getAttribute('href') : null,
  }));
  await page.screenshot({ path: path.join(OUT, `${mode}-clientform.png`) });
  report[mode].form = structure;
  report[mode].formLive = live;
  report[mode].formLiveInputs = liveInputs;
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.WXA && window.WXA.closeModal && window.WXA.closeModal());
  await new Promise(x => setTimeout(x, 400));
}
report.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'salesform.json'), JSON.stringify(report, null, 1));
for (const m of ['light', 'dark']) {
  const r = report[m];
  console.log(`\n== ${m.toUpperCase()}  dark=${r.dark}`);
  console.log('  Client360 card:', JSON.stringify(r.c360));
  console.log('  aside blocks  :', JSON.stringify(r.c360Cards));
  console.log('  form          :', JSON.stringify(r.form));
  console.log('  form live     :', JSON.stringify(r.formLive));
  console.log('  live inputs   :', JSON.stringify(r.formLiveInputs));
}
console.log('\npageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
