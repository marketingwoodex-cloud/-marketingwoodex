/**
 * Invoice chain & end-to-end probe — proves the whole money path on a running admin:
 *
 *   1. tracker renders rows + status chips (Paid / Partial / After delivery / Unpaid / Late delivery)
 *   2. "New invoice" opens the creator and it renders a real form (client, items, totals)
 *   3. creating an invoice persists it → toast, redirect to the detail, +1 row on the tracker
 *   4. row tracking (PO, business line, delivery date, payment-after-delivery) saves via inv_track
 *   5. recording a payment flips the status chip to Partial / Paid and clears the balance
 *
 * UI contract it drives (admin/admin-p18.js createInvoice + admin/admin-sales17.js tracker):
 *   #it-new → #/invoices/new → #ci-c/#ci-cn/#ci-cp, item row [data-k], #ci-go → #/invoice/<id>
 *   row [data-ed] → #tf-po/#tf-l/#tf-dd/#tf-dl/#tf-m → #tf-go
 *   row [data-pay] → #py-a/#py-d/#py-m/#py-r → #py-go
 *
 * Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node invoice-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/invoice-probe';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const EMAIL = process.env.PREVIEW_EMAIL || '';
const PASS = process.env.PREVIEW_PASS || '';
const CLIENT = 'Probe Client ' + Date.now().toString().slice(-5);

const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 1000 },
});
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
const errs = [], calls = [];
page.on('pageerror', e => errs.push(String(e.stack || e.message).slice(0, 280)));
page.on('response', async r => {
  if (!r.url().endsWith('/api/admin.php')) return;
  let a = '?';
  try { a = JSON.parse(r.request().postData() || '{}').action || '?'; } catch { /* keep ? */ }
  let verdict = 'http ' + r.status();
  try { const j = await r.json(); verdict = j.ok === false ? 'FAIL: ' + String(j.error || '').slice(0, 90) : 'ok'; } catch { /* non-json */ }
  calls.push({ action: a, verdict });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;
async function shot(name) {
  step += 1;
  await page.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + name + '.png') });
}

/** What the tracker currently shows: chip labels with counts, row count, first rows' numbers. */
const trackerState = () => page.evaluate(() => {
  const chips = (document.querySelector('#it-st') || {}).innerText || '';
  const rows = [...document.querySelectorAll('#it-rows tr[data-id]')];
  return {
    chips: chips.replace(/\s+/g, ' ').trim(),
    rows: rows.length,
    nums: rows.slice(0, 4).map(tr => (tr.querySelectorAll('td')[2] || {}).innerText || '').map(s => s.trim()),
    empty: !!document.querySelector('#it-rows .empty'),
    text: (document.querySelector('#view') || {}).innerText ? document.querySelector('#view').innerText.replace(/\s+/g, ' ').slice(0, 160) : '',
  };
});

async function login() {
  await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
  if (await page.$('#l-email')) {
    await page.type('#l-email', EMAIL);
    await page.type('#l-pass', PASS);
    await page.click('#l-btn');
  }
  await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
  await page.waitForSelector('#nav', { timeout: 20000 });
}

async function gotoInvoices() {
  await page.evaluate(() => { location.hash = '#/invoices'; });
  await page.waitForSelector('#it-new', { timeout: 25000 });
  await sleep(1200);
}

// ---------------------------------------------------------------- run
const report = { base: BASE, email: EMAIL, client: CLIENT, steps: {}, problems: [] };
await login();
await gotoInvoices();
await shot('tracker-before');
const before = await trackerState();
report.steps.tracker_before = before;
if (!before.rows) report.problems.push('invoice tracker rendered no rows');
if (/All 0\b/.test(before.chips)) report.problems.push('tracker chips all zero: ' + before.chips);

// 1) New invoice → full-page creator
await page.click('#it-new');
await sleep(1600);
const creator = await page.evaluate(() => {
  const view = document.querySelector('#view');
  return {
    hash: location.hash,
    hasForm: !!document.querySelector('#ci-go') && !!document.querySelector('#ci-c'),
    heading: view ? (view.querySelector('h1,h2') || {}).innerText || '' : '',
    rows: document.querySelectorAll('#ci-rows tr').length,
    text: view ? view.innerText.replace(/\s+/g, ' ').slice(0, 200) : '',
  };
});
report.steps.creator = creator;
if (!creator.hasForm) {
  report.problems.push('New invoice did not open the creator (hash ' + creator.hash + ')');
  console.log(JSON.stringify(report, null, 2));
  await shot('creator-missing');
  await browser.close();
  process.exit(1);
}
await shot('creator-open');

// 2) Fill it like a person: new client, one item line
await page.type('#ci-c', CLIENT);
await sleep(400);
await page.evaluate(() => {
  const set = (sel, v) => { const n = document.querySelector(sel); if (n && !n.hidden) { n.value = v; if (n.oninput) n.oninput(); } };
  set('#ci-cn', 'Probe Contact');
  set('#ci-cp', '0300 0000000');
  set('#ci-po', 'PO-PROBE-1');
  set('#ci-sc', '50% advance, 50% on delivery');
});
const filled = await page.evaluate(() => {
  const tr = document.querySelector('#ci-rows tr');
  const set = (f, v) => { f.value = v; if (f.oninput) f.oninput(); if (f.onchange) f.onchange(); };
  const d = tr.querySelector("[data-k='desc']"), q = tr.querySelector("[data-k='qty']"), rt = tr.querySelector("[data-k='rate']");
  set(d, 'Probe line — 10 workstations'); set(q, '10'); set(rt, '42000');
  return { desc: d.value, qty: q.value, rate: rt.value };
});
await sleep(500);
const totals = await page.evaluate(() => ({
  sub: (document.querySelector('#ci-sub') || {}).textContent,
  grand: (document.querySelector('#ci-gt') || {}).textContent,
  words: (document.querySelector('#ci-w') || {}).textContent,
}));
report.steps.filled = { ...filled, ...totals };
// expected 10 × 42000 = 420,000
if (String(totals.grand).replace(/[^\d]/g, '') !== '420000') {
  report.problems.push('creator totals wrong: subtotal ' + totals.sub + ' / grand ' + totals.grand + ' (expected 420,000)');
}
await shot('creator-filled');

// 3) Create
await page.click('#ci-go');
await page.waitForFunction(() => location.hash.startsWith('#/invoice/'), { timeout: 25000 }).catch(() => {});
await sleep(1800);
const created = await page.evaluate(() => ({
  hash: location.hash,
  err: (document.querySelector('#ci-e') || {}).textContent || '',
  toast: [...document.querySelectorAll('#toasts, .toast')].map(t => t.innerText.trim()).filter(Boolean).join(' | ').slice(0, 160),
  view: (document.querySelector('#view') || {}).innerText ? document.querySelector('#view').innerText.replace(/\s+/g, ' ').slice(0, 180) : '',
}));
report.steps.created = created;
const invCall = calls.filter(c => c.action === 'inv_new').pop();
report.verdicts = { inv_new: invCall ? invCall.verdict : 'not called' };
if (!created.hash.startsWith('#/invoice/')) report.problems.push('create did not open the new invoice (' + created.hash + ') ' + created.err);
if (invCall && invCall.verdict !== 'ok') report.problems.push('inv_new ' + invCall.verdict);
await shot('invoice-created');

// 4) Back to the tracker: the new invoice must be there
await gotoInvoices();
const after = await trackerState();
report.steps.tracker_after_create = after;
if (after.rows !== before.rows + 1) report.problems.push('tracker rows ' + before.rows + ' → ' + after.rows + ' after creating one invoice');
const newRow = await page.evaluate(cl => {
  const tr = [...document.querySelectorAll('#it-rows tr[data-id]')].find(t => t.innerText.includes(cl));
  return tr ? { id: tr.dataset.id, text: tr.innerText.replace(/\s+/g, ' ').slice(0, 220) } : null;
}, CLIENT);
report.steps.new_row = newRow;
if (!newRow) report.problems.push('the new invoice is not on the tracker: ' + CLIENT);

// 5) Row tracking: PO + after-delivery terms + delivery date
if (newRow) {
  await page.evaluate(id => {
    const b = document.querySelector("#it-rows tr[data-id='" + id + "'] [data-ed]");
    if (b) b.click();
  }, newRow.id);
  await page.waitForSelector('#tf-go', { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => {
    const set = (sel, v) => { const n = document.querySelector(sel); if (n) { n.value = v; if (n.oninput) n.oninput(); } };
    set('#tf-po', 'PO-PROBE-1'); set('#tf-l', 'interior'); set('#tf-dd', '2026-11-20'); set('#tf-m', 'after_delivery'); set('#tf-n', 'probe: tracked from the row');
  });
  await shot('track-modal');
  await page.click('#tf-go');
  await sleep(1800);
  const tracked = await trackerState();
  report.steps.tracker_after_track = tracked;
  const trackCall = calls.filter(c => c.action === 'inv_track').pop();
  report.verdicts.inv_track = trackCall ? trackCall.verdict : 'not called';
  const rowAfterTrack = await page.evaluate(id => {
    const tr = document.querySelector("#it-rows tr[data-id='" + id + "']");
    return tr ? tr.innerText.replace(/\s+/g, ' ').slice(0, 220) : '';
  }, newRow.id);
  report.steps.row_after_track = rowAfterTrack;
  if (!/PO-PROBE-1/.test(rowAfterTrack)) report.problems.push('PO did not stick on the row: ' + rowAfterTrack);
  if (!/After delivery/i.test(rowAfterTrack)) report.problems.push('after-delivery tracking did not stick: ' + rowAfterTrack);
  if (!/20 Nov/.test(rowAfterTrack)) report.problems.push('delivery date did not stick: ' + rowAfterTrack);
  await shot('tracker-after-track');

  // 6) Record a partial payment → chip should stop being Unpaid
  await page.evaluate(id => {
    const b = document.querySelector("#it-rows tr[data-id='" + id + "'] [data-pay]");
    if (b) b.click();
  }, newRow.id);
  await page.waitForSelector('#py-go', { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => {
    const set = (sel, v) => { const n = document.querySelector(sel); if (n) { n.value = v; if (n.oninput) n.oninput(); } };
    set('#py-a', '200000'); set('#py-m', 'bank'); set('#py-r', 'PROBE-TRX-1');
  });
  await shot('payment-modal');
  await page.click('#py-go');
  await sleep(2000);
  const paid = await trackerState();
  report.steps.tracker_after_payment = paid;
  const payCall = calls.filter(c => c.action === 'pay_add').pop();
  report.verdicts.pay_add = payCall ? payCall.verdict : 'not called';
  const rowAfterPay = await page.evaluate(id => {
    const tr = document.querySelector("#it-rows tr[data-id='" + id + "']");
    return tr ? tr.innerText.replace(/\s+/g, ' ').slice(0, 220) : '';
  }, newRow.id);
  report.steps.row_after_payment = rowAfterPay;
  if (!/200,?000/.test(rowAfterPay)) report.problems.push('payment not reflected on the row: ' + rowAfterPay);
  if (/Unpaid/.test(rowAfterPay)) report.problems.push('row still reads Unpaid after a payment: ' + rowAfterPay);
  await shot('tracker-after-payment');

  // the paid invoice must show the payment on its detail page too
  await page.evaluate(id => { location.hash = '#/invoice/' + id; }, newRow.id);
  await sleep(1800);
  const detail = await page.evaluate(() => ({
    hash: location.hash,
    text: (document.querySelector('#view') || {}).innerText ? document.querySelector('#view').innerText.replace(/\s+/g, ' ').slice(0, 1400) : '',
    printBtn: !!document.querySelector('a[href*="print"], [data-print], #iv-print, .btn[href*="print"]'),
  }));
  report.steps.invoice_detail = detail;
  if (!/Bill to/i.test(detail.text)) report.problems.push('invoice detail has no Bill to block: ' + detail.text.slice(0, 160));
  else if (!new RegExp(CLIENT).test(detail.text)) report.problems.push('invoice detail Bill-to does not name the probe client: ' + detail.text.slice(0, 400));
  if (!/420,?000/.test(detail.text)) report.problems.push('invoice detail does not show the amount: ' + detail.text.slice(0, 400));
  if (!/200,?000/.test(detail.text)) report.problems.push('invoice detail does not show the received payment: ' + detail.text.slice(0, 400));
  await shot('invoice-detail');
}

report.page_errors = errs.slice(0, 6);
report.api_calls = calls.filter(c => /inv|pay|tpl/.test(c.action));
if (errs.length) report.problems.push('page errors: ' + errs.length);
report.ok = report.problems.length === 0;

fs.writeFileSync(path.join(OUT, 'invoice-probe.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  verdicts: report.verdicts,
  tracker_before: report.steps.tracker_before.chips,
  tracker_after_payment: (report.steps.tracker_after_payment || {}).chips,
  grand_total_at_create: report.steps.filled.grand,
  new_row: (report.steps.new_row || {}).text,
  row_after_track: report.steps.row_after_track,
  row_after_payment: report.steps.row_after_payment,
  problems: report.problems,
  out: OUT,
}, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 2);
