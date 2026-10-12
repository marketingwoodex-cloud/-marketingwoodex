/* Browser proof of workflow gaps found by the static audit (master QA).
   Runs against the REAL PHP preview. Logs in, then for each probe:
   loads the route, drives the real UI, and records what actually happens.
   Usage: node workflow-probe.mjs [base] [outdir]
   Env: PREVIEW_EMAIL / PREVIEW_PASS
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/workflow-probe';
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const EMAIL = process.env.PREVIEW_EMAIL || 'master@woodex.pk';
const PASS = process.env.PREVIEW_PASS || '';
const report = { base: BASE, probes: [], netLog: [] };

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
// record EVERY admin API call the UI makes, with the action name
page.on('request', r => {
  const u = r.url();
  if (/admin\.php|\/api\//.test(u) && r.method() === 'POST') {
    let a = '(unparsed)';
    try { const b = r.postData(); if (b) { const j = JSON.parse(b); a = j.action || a; } } catch {}
    report.netLog.push({ url: u.replace(BASE, ''), action: a });
  }
});
// toasts are the UI's user-visible feedback channel — hook the app's own toast() instead of scraping DOM
await page.evaluateOnNewDocument(() => {
  window.__toasts = [];
  let hooked = false;
  const iv = setInterval(() => {
    const t = (window.W && window.W.toast) || window.toast;
    if (t && !hooked && !t.__hooked) {
      const orig = t;
      const wrap = function (...a) { try { window.__toasts.push(String(a[0])); } catch {} return orig.apply(this, a); };
      wrap.__hooked = true;
      if (window.W && window.W.toast === t) window.W.toast = wrap; else window.toast = wrap;
      hooked = true; clearInterval(iv);
    }
  }, 20);
});

const go = async (route, waitSel) => {
  await page.goto(`${BASE}/admin/#/${route}`, { waitUntil: 'domcontentloaded' });
  if (waitSel) await page.waitForSelector(waitSel, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
};
const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n + '.png') }); };
const toasts = () => page.evaluate(() => (window.__toasts || []).slice(-6));

/* ---------- login ---------- */
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', EMAIL);
  await page.type('#l-pass', PASS);
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });
report.login = true;

/* ---------- PROBE 1: Integrations connect is browser-local, not persisted ---------- */
{
  const p = { id: 'integrations-connect-persistence', route: 'settings', claim: 'Integrations "connect" writes to the backend and survives reload' };
  const before = report.netLog.length;
  await go('settings', '#st-tab-content');
  await page.screenshot({ path: path.join(OUT, '01-integrations-tab.png') });
  // count connector cards and find a Connect control
  p.cards = await page.evaluate(() => document.querySelectorAll('#conn-grid [data-app]').length);
  p.statusBarText = await page.evaluate(() => (document.querySelector('#conn-stat-txt') || {}).innerText || null);
  const clicked = await page.evaluate(() => {
    const b = document.querySelector('#conn-grid [data-app]');
    if (!b) return false; b.click(); return b.dataset.app || true;
  });
  p.connectButtonFound = clicked;
  if (clicked) {
    await page.waitForSelector('#conn-modal-form', { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(OUT, '02-connect-modal.png') });
    p.modalOpened = !!(await page.$('#conn-modal-form'));
    // fill any credential fields then submit, exactly as an operator would
    const filled = await page.evaluate(() => {
      const f = document.querySelector('#conn-modal-form'); if (!f) return 0;
      const ins = [...f.querySelectorAll('input')]; ins.forEach((i, k) => { i.value = 'QA-PROBE-VALUE-' + k; i.dispatchEvent(new Event('input', { bubbles: true })); });
      return ins.length;
    });
    p.credentialFields = filled;
    await page.evaluate(() => { const f = document.querySelector('#conn-modal-form'); if (f) f.requestSubmit(); });
    await new Promise(r => setTimeout(r, 1200));
    p.toastsAfterConnect = await toasts();
    await page.screenshot({ path: path.join(OUT, '03-after-connect.png') });
    // the acid test: reload the whole page and see whether the "connection" survived
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nav', { timeout: 25000 });
    await go('settings', '#st-tab-content');
    p.toastsAfterReload = await toasts();
    p.callsDuringProbe = report.netLog.slice(before).map(x => x.action);
    p.persistedCallsPersistActions = p.callsDuringProbe.filter(a => /^conn_(save|test|push)$/.test(a));
    await page.screenshot({ path: path.join(OUT, '04-after-reload.png') });
  }
  report.probes.push(p);
}

/* ---------- PROBE 2: chat "Assign"/"Close"/"Tag" controls absent ---------- */
{
  const p = { id: 'chat-agent-controls', route: 'chat', claim: 'Live-chat agent workflow (assign / close / tag / internal note) is reachable from the Inbox UI' };
  await go('chat', '#nav');
  await new Promise(r => setTimeout(r, 2500));
  p.bodyTextSample = (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\s+/g, ' ');
  // open the first conversation if a list exists, then look for the controls
  await page.evaluate(() => { const r = document.querySelector('[data-conv],[data-chat],.chat-row,.ci-row'); if (r) r.click(); });
  await new Promise(r => setTimeout(r, 1500));
  p.controls = await page.evaluate(() => {
    const txt = document.body.innerText.toLowerCase();
    return {
      assign: /assign/.test(txt), close: /close (chat|conversation)/.test(txt),
      tag: /\btag/.test(txt), note: /internal note/.test(txt),
      rows: document.querySelectorAll('[data-conv],[data-chat],.chat-row,.ci-row').length,
    };
  });
  p.chatActionsCalled = [...new Set(report.netLog.filter(x => x.action.startsWith('chat_')).map(x => x.action))];
  await page.screenshot({ path: path.join(OUT, '05-inbox.png') });
  report.probes.push(p);
}

/* ---------- PROBE 3: media usage / delete surface ---------- */
{
  const p = { id: 'media-ops', route: 'media', claim: 'Media library exposes usage-tracking and delete operations' };
  await go('media', '#nav');
  await new Promise(r => setTimeout(r, 2500));
  p.visibleControls = await page.evaluate(() => {
    const txt = document.body.innerText.toLowerCase();
    return { delete: /delete/.test(txt), usage: /used|usage|where used/.test(txt), restore: /restore|trash/.test(txt) };
  });
  p.mediaActionsCalled = [...new Set(report.netLog.filter(x => x.action.startsWith('media_')).map(x => x.action))];
  await page.screenshot({ path: path.join(OUT, '06-media.png') });
  report.probes.push(p);
}

/* ---------- PROBE 4: notifications live poll ---------- */
{
  const p = { id: 'notif-poll', route: 'updates', claim: 'Client updates screen polls for new notifications in real time' };
  const before = report.netLog.length;
  await go('updates', '#nav');
  await new Promise(r => setTimeout(r, 6000)); // well past a normal poll interval
  p.actionsDuringWait = [...new Set(report.netLog.slice(before).map(x => x.action))];
  p.polled = p.actionsDuringWait.includes('notif_poll');
  await page.screenshot({ path: path.join(OUT, '07-updates.png') });
  report.probes.push(p);
}

report.pageErrors = errs;
report.totalApiCalls = report.netLog.length;
report.distinctActions = [...new Set(report.netLog.map(x => x.action))].sort();
fs.writeFileSync(path.join(OUT, 'workflow-probe.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({
  login: report.login, pageErrors: errs.length,
  probes: report.probes.map(p => ({ id: p.id, ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'id' && k !== 'claim' && k !== 'bodyTextSample')) })),
  distinctActions: report.distinctActions,
}, null, 1));
await browser.close();
