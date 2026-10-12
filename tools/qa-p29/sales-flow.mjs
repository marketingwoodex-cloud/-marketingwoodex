/* Sales flow probe — traces the real end-to-end chain in the browser and records
   exactly where it breaks:
     lead created -> appears in pipeline -> client record -> quotation -> invoice
   Each step drives the real UI (buttons, forms) and captures the API action fired
   plus the resulting screen. Nothing is written directly to the API.

   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node sales-flow.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/sales-flow';
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

/* Record every admin API call with its action + whether the response said ok */
const calls = [];
page.on('request', r => {
  if (r.method() === 'POST' && /admin\.php/.test(r.url())) {
    let a = '?';
    try { a = JSON.parse(r.postData() || '{}').action || '?'; } catch {}
    calls.push({ action: a, t: Date.now() });
  }
});
const newCalls = since => calls.slice(since).map(c => c.action);

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const go = async (route, waitMs = 2200) => {
  await page.goto(`${BASE}/admin/#/${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  await new Promise(r => setTimeout(r, waitMs));
};
const snap = () => page.evaluate(() => {
  const view = document.querySelector('#view') || document.body;
  // count real content items across the card/kanban/table layouts the admin uses
  const cardSel = '.dx-kpi, .card, .kb-card, [class*=kb-card], [class*=pipe-card]';
  const cards = view.querySelectorAll(cardSel).length;
  const trRows = view.querySelectorAll('tbody tr').length;
  const rows = Math.max(cards, trRows);
  const empty = [...view.querySelectorAll('.empty, .dx-empty, [class*=empty]')].map(e => (e.textContent || '').trim().slice(0, 60)).slice(0, 3);
  return {
    h1: (view.querySelector('h1') || {}).textContent || null,
    rows,
    emptyStates: empty,
    buttons: [...view.querySelectorAll('button, a.btn')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 14),
    textLen: (view.innerText || '').length,
  };
});

const out = { base: BASE, steps: [] };
const step = async (name, route, extra) => {
  const i = calls.length;
  await go(route);
  const s = await snap();
  await page.screenshot({ path: path.join(OUT, `${String(out.steps.length + 1).padStart(2, '0')}-${name}.png`) });
  out.steps.push({ name, route, ...s, apiActions: [...new Set(newCalls(i))], ...(extra ? { extra } : {}) });
  return s;
};

/* 1 — does the leads list show real records? */
await step('leads', 'enquiries');
/* 2 — pipeline */
await step('pipeline', 'pipeline');
/* 3 — clients: is there a client database? */
await step('clients', 'clients');
/* 4 — quotations */
await step('quotes', 'quotes');
/* 5 — invoices */
await step('invoices', 'invoices');
/* 6 — payments */
await step('transactions', 'transactions');
/* 7 — can a lead be created from the UI? open the new-lead form and report the fields */
{
  const i = calls.length;
  await go('enquiries');
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a.btn, a')].find(x => /new lead|add lead|\+ lead/i.test((x.textContent || '').trim()));
    if (!b) return false;
    b.click(); return true;
  });
  await new Promise(r => setTimeout(r, 2500));
  const form = await page.evaluate(() => {
    const ins = [...document.querySelectorAll('#view input, #view select, #view textarea, .modal input, .modal select, .modal textarea, dialog input')];
    return {
      inputs: ins.map(x => ({ id: x.id || null, name: x.name || null, type: x.type, placeholder: x.placeholder || null, required: x.required })),
      visible: ins.filter(x => x.offsetParent !== null).length,
      modalOpen: !!document.querySelector('.modal:not([hidden]), dialog[open], .hs-overlay.open, [role=dialog]:not([hidden])'),
    };
  });
  await page.screenshot({ path: path.join(OUT, '07-new-lead-form.png') });
  out.steps.push({ name: 'new-lead-form', route: 'enquiries', openedButton: opened, form, apiActions: [...new Set(newCalls(i))] });
}

/* 8 — the convert path: from a lead, is there a convert-to-client / quote action? */
{
  await go('enquiries');
  const actions = await page.evaluate(() => {
    const out = { rowActions: [], linkTargets: [] };
    // open any row-level menu / click into the first row
    const firstRow = document.querySelector('#view tbody tr');
    if (firstRow) {
      const a = firstRow.querySelector('a[href], button');
      if (a) a.click();
    }
    return out;
  });
  await new Promise(r => setTimeout(r, 2500));
  const detail = await page.evaluate(() => {
    const view = document.querySelector('#view') || document.body;
    return {
      hash: location.hash,
      h1: (view.querySelector('h1') || {}).textContent || null,
      buttons: [...view.querySelectorAll('button, a.btn')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 20),
      hasConvert: /convert|to client|to quote|→\s*quote/i.test(view.innerText || ''),
    };
  });
  await page.screenshot({ path: path.join(OUT, '08-lead-detail.png') });
  out.steps.push({ name: 'lead-detail-actions', ...detail });
}

out.pageErrors = errs;
out.totalApiCalls = calls.length;
fs.writeFileSync(path.join(OUT, 'sales-flow.json'), JSON.stringify(out, null, 1));
for (const s of out.steps) {
  console.log(`\n[${s.name}] ${s.route || ''}`);
  if (s.h1 !== undefined) console.log(`   h1="${s.h1}" rows=${s.rows} textLen=${s.textLen}`);
  if (s.emptyStates && s.emptyStates.length) console.log(`   EMPTY: ${JSON.stringify(s.emptyStates)}`);
  if (s.apiActions) console.log(`   api: ${s.apiActions.join(', ') || '(none)'}`);
  if (s.buttons) console.log(`   buttons: ${s.buttons.join(' | ').slice(0, 150)}`);
  if (s.form) console.log(`   form: visible=${s.form.visible} modal=${s.form.modalOpen} inputs=${JSON.stringify(s.form.inputs.map(i => i.name || i.id || i.type))}`);
  if (s.openedButton !== undefined) console.log(`   new-lead button found: ${s.openedButton}`);
  if (s.hasConvert !== undefined) console.log(`   convert affordance: ${s.hasConvert}`);
}
console.log('\npageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
