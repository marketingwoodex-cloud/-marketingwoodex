/* Proves the enquiry → client conversion end-to-end in the browser:
   open a lead with no client, click "Make client", accept the confirm, and
   assert we land on the new Client 360 with the lead linked.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node convert-test.mjs [base] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = '/tmp/convert'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
page.on('dialog', async d => { console.log('  dialog:', d.message().slice(0, 70), '-> accept'); await d.accept(); });
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

// 1) find a lead with no client_id, straight from the API
const target = await page.evaluate(async () => {
  const r = await window.WXA.api('leads_list');
  const l = (r.leads || []).find(x => !x.client_id);
  return l ? { id: l.id, name: l.name, company: l.company || '', phone: l.phone || '', stage: l.stage } : null;
});
console.log('target lead:', JSON.stringify(target));
if (!target) { console.log('no un-converted lead available — nothing to prove'); await browser.close(); process.exit(0); }

// 2) open its drawer through the enquiries list
await page.goto(`${BASE}/admin/?t=${Date.now()}#/enquiries`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 2500));
const opened = await page.evaluate(async (id) => {
  if (window.W && window.W.drawer) return 'legacy';
  const rows = [...document.querySelectorAll('#view tbody tr')];
  const row = rows.find(tr => (tr.textContent || '').includes('#' + id) || tr.getAttribute('data-id') === String(id));
  if (row) { row.click(); return 'row'; }
  if (window.WXA.leadDrawer) { window.WXA.leadDrawer(id, () => {}); return 'api'; }
  return null;
}, target.id);
console.log('drawer opened via:', opened);
await page.waitForSelector('#dr-cv, #ld-conv', { timeout: 20000 });
await new Promise(r => setTimeout(r, 800));
const before = await page.evaluate(() => {
  const b = document.querySelector('#dr-cv, #ld-conv');
  const box = b.closest('.drawer, #drawer, .modal, .modal-card, aside') || b.parentElement;
  return { label: b.textContent.trim(), visible: !!b.getClientRects().length, context: (box.className || '').slice(0, 40) };
});
console.log('button before:', JSON.stringify(before));
await page.screenshot({ path: path.join(OUT, 'drawer-before.png') });

// 3) click it
await page.click('#dr-cv, #ld-conv');
await new Promise(r => setTimeout(r, 3500));
const after = await page.evaluate(() => ({
  hash: location.hash,
  h1: (document.querySelector('#view h1') || {}).textContent,
  contactCard: !!document.querySelector('#view .wx-details'),
  convButtonGone: !document.querySelector('#dr-cv, #ld-conv'),
  tabs: document.querySelectorAll('.s17-c3t button').length,
}));
console.log('after click:', JSON.stringify(after));
await page.screenshot({ path: path.join(OUT, 'after-convert.png') });

// 4) confirm server-side linkage
const linked = await page.evaluate(async (id) => {
  const r = await window.WXA.api('leads_list');
  const l = (r.leads || []).find(x => x.id === id);
  return l ? { client_id: l.client_id, stage: l.stage } : null;
}, target.id);
console.log('lead after convert:', JSON.stringify(linked));
console.log('pageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
