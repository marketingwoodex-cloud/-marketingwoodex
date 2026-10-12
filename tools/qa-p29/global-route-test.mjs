/* Isolates the `global` (Header & footer) page error.
   Runs the route repeatedly and reports which run throws, plus a stack trace,
   so a race can be told apart from a real defect.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node global-route-test.mjs [base] [runs]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const RUNS = +(process.argv[3] || 6);
const NO_PRELINE = process.env.NO_PRELINE === '1';

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();

if (NO_PRELINE) {
  // block the Preline runtime to isolate whether it is the cause
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().includes('preline.js') ? r.abort() : r.continue()));
}

const errs = [];
page.on('pageerror', e => errs.push({ msg: String(e.message).slice(0, 200), stack: String(e.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400) }));

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const results = [];
for (let i = 1; i <= RUNS; i++) {
  errs.length = 0;
  await page.goto(`${BASE}/admin/#/global`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  const state = await page.evaluate(() => ({
    route: location.hash,
    h1: (document.querySelector('main h1, #view h1') || {}).textContent || null,
    rows: document.querySelectorAll('#view table tbody tr, #view .card').length,
    // is the element the handler expects actually present?
    hasGlobalEl: !!document.querySelector('#gp-form, #global-form, [data-global], .global-wrap'),
  }));
  results.push({ run: i, errors: errs.map(e => e.msg), stack: errs[0] ? errs[0].stack : null, state });
}

console.log(JSON.stringify({
  prelineBlocked: NO_PRELINE, runs: RUNS,
  failCount: results.filter(r => r.errors.length).length,
  results,
}, null, 1));
await browser.close();
