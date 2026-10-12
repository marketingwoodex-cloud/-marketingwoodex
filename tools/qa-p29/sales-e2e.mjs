/* Sales chain end-to-end, driven entirely through the real UI:
     Add lead -> appears in list -> open lead -> convert to client
     -> client record -> new quotation -> invoice from quotation -> payment
   Reports the exact step where the chain breaks, with the API action that did or
   did not fire. Nothing is written through the API directly.

   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node sales-e2e.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/sales-e2e';
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
page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));

const calls = [];
page.on('request', r => {
  if (r.method() === 'POST' && /admin\.php/.test(r.url())) {
    let a = '?'; let ok = null;
    try { a = JSON.parse(r.postData() || '{}').action || '?'; } catch {}
    calls.push({ action: a, ok });
  }
});
page.on('response', async r => {
  if (r.request().method() === 'POST' && /admin\.php/.test(r.url())) {
    try {
      const j = await r.json();
      const last = calls[calls.length - 1];
      if (last) last.ok = j && j.ok !== undefined ? j.ok : null;
      if (last && j && j.error) last.error = String(j.error).slice(0, 120);
    } catch {}
  }
});
const since = i => calls.slice(i).map(c => c.action + (c.ok === false ? '(FAILED' + (c.error ? ': ' + c.error : '') + ')' : ''));

const TAG = 'QAE2E-' + Date.now().toString().slice(-6);
const out = { base: BASE, tag: TAG, steps: [] };

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const go = async (route, ms = 2400) => {
  await page.goto(`${BASE}/admin/#/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  await new Promise(r => setTimeout(r, ms));
};
const record = async (name, extra = {}) => {
  const s = await page.evaluate(() => {
    const v = document.querySelector('#view') || document.body;
    return {
      h1: (v.querySelector('h1') || {}).textContent || null,
      text: (v.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
      buttons: [...v.querySelectorAll('button, a.btn')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 18),
    };
  });
  await page.screenshot({ path: path.join(OUT, `${String(out.steps.length + 1).padStart(2, '0')}-${name}.png`) });
  out.steps.push({ name, ...s, ...extra });
  return s;
};

/* ---------- STEP 1: create a lead through the UI ---------- */
{
  const i = calls.length;
  await go('enquiries');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a.btn, a')].find(x => /add lead|new lead/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  // fill the visible lead form fields
  const filled = await page.evaluate(tag => {
    const set = (el, val) => {
      if (!el || el.offsetParent === null) return false;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const ins = [...document.querySelectorAll('input, select, textarea')].filter(x => x.offsetParent !== null);
    const byName = n => document.querySelector(`[name="${n}"], #${n}`);
    let n = 0;
    if (set(byName('al-n'), tag + ' Client')) n++;
    if (set(byName('al-p'), '0300' + Math.floor(1000000 + Math.random() * 8999999))) n++;
    if (set(byName('al-co'), 'QA Test Co')) n++;
    if (set(byName('al-lo'), 'Lahore')) n++;
    if (set(byName('al-src'), 'Website')) n++;
    // fall back: fill the first text inputs when the named ones are absent
    if (n === 0) ins.filter(x => ['text', 'tel', 'email'].includes(x.type)).slice(0, 3).forEach((x, k) => { if (set(x, tag + ' f' + k)) n++; });
    return { filled: n, names: ins.map(x => x.name || x.id).slice(0, 12) };
  }, TAG);
  // submit
  await page.evaluate(() => {
    const f = [...document.querySelectorAll('form')].find(x => x.offsetParent !== null && x.querySelector('input'));
    if (f) { if (f.requestSubmit) f.requestSubmit(); else f.submit(); return; }
    const b = [...document.querySelectorAll('button')].find(x => /^save|^add|^create/i.test((x.textContent || '').trim()) && x.offsetParent !== null);
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await record('lead-created', { filled, api: [...new Set(since(i))] });
}

/* ---------- STEP 2: is the new lead in the list? ---------- */
{
  const i = calls.length;
  await go('enquiries');
  const found = await page.evaluate(tag => (document.body.innerText || '').includes(tag), TAG);
  await record('lead-in-list', { foundTag: found, api: [...new Set(since(i))] });
}

/* ---------- STEP 3: open the lead, look for the convert path ---------- */
{
  const i = calls.length;
  await go('enquiries');
  // click through to the most recent lead
  await page.evaluate(() => {
    const r = document.querySelector('#view tbody tr');
    const a = r ? r.querySelector('a[href], button') : null;
    if (a) a.click();
  });
  await new Promise(r => setTimeout(r, 2600));
  const detail = await page.evaluate(() => {
    const v = document.querySelector('#view') || document.body;
    const txt = v.innerText || '';
    return {
      hash: location.hash,
      hasConvertToClient: /convert.{0,12}client|to client|make client/i.test(txt),
      hasCreateQuote: /new quote|create quote|add quote|quotation/i.test(txt),
      buttons: [...v.querySelectorAll('button, a.btn, a')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 22),
    };
  });
  await record('lead-detail', { detail, api: [...new Set(since(i))] });
}

/* ---------- STEP 4: clients module — is there a real database? ---------- */
{
  const i = calls.length;
  await go('clients');
  const c = await page.evaluate(() => {
    const v = document.querySelector('#view') || document.body;
    return {
      text: (v.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
      rows: v.querySelectorAll('tbody tr, .card, li').length,
    };
  });
  await record('clients', { c, api: [...new Set(since(i))] });
}

/* ---------- STEP 5: quotation -> invoice conversion ---------- */
{
  const i = calls.length;
  await go('quotes');
  await page.evaluate(() => {
    const r = document.querySelector('#view tbody tr');
    const a = r ? r.querySelector('a[href], button') : null;
    if (a) a.click();
  });
  await new Promise(r => setTimeout(r, 2600));
  const q = await page.evaluate(() => {
    const v = document.querySelector('#view') || document.body;
    const txt = v.innerText || '';
    return {
      hash: location.hash,
      hasConvertToInvoice: /convert.{0,12}invoice|to invoice|make invoice/i.test(txt),
      hasSend: /send|email|share/i.test(txt),
      hasPrint: /print|pdf/i.test(txt),
      buttons: [...v.querySelectorAll('button, a.btn, a')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 22),
    };
  });
  await record('quote-detail', { q, api: [...new Set(since(i))] });
}

/* ---------- STEP 6: invoice -> payment ---------- */
{
  const i = calls.length;
  await go('invoices');
  await page.evaluate(() => {
    const r = document.querySelector('#view tbody tr');
    const a = r ? r.querySelector('a[href], button') : null;
    if (a) a.click();
  });
  await new Promise(r => setTimeout(r, 2600));
  const inv = await page.evaluate(() => {
    const v = document.querySelector('#view') || document.body;
    const txt = v.innerText || '';
    return {
      hash: location.hash,
      hasRecordPayment: /record payment|add payment|mark paid|receive payment/i.test(txt),
      buttons: [...v.querySelectorAll('button, a.btn, a')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 22),
    };
  });
  await record('invoice-detail', { inv, api: [...new Set(since(i))] });
}

out.pageErrors = errs;
out.failedCalls = calls.filter(c => c.ok === false).map(c => c.action + ': ' + (c.error || ''));
fs.writeFileSync(path.join(OUT, 'sales-e2e.json'), JSON.stringify(out, null, 1));
for (const s of out.steps) {
  console.log(`\n[${s.name}] h1=${s.h1}`);
  if (s.api) console.log(`   api: ${s.api.join(', ') || '(none)'}`);
  if (s.filled) console.log(`   filled ${s.filled.filled} fields: ${s.filled.names.join(',')}`);
  if (s.foundTag !== undefined) console.log(`   new lead visible in list: ${s.foundTag}`);
  if (s.detail) console.log(`   convert->client:${s.detail.hasConvertToClient} createQuote:${s.detail.hasCreateQuote}`);
  if (s.detail) console.log(`   buttons: ${s.detail.buttons.join(' | ').slice(0, 160)}`);
  if (s.q) console.log(`   convert->invoice:${s.q.hasConvertToInvoice} send:${s.q.hasSend} print:${s.q.hasPrint}`);
  if (s.inv) console.log(`   record payment: ${s.inv.hasRecordPayment}`);
  if (s.c) console.log(`   clients text: ${s.c.text.slice(0, 160)}`);
}
console.log('\nFAILED API CALLS:', out.failedCalls.length, out.failedCalls.slice(0, 5));
console.log('pageErrors:', errs.length);
await browser.close();
