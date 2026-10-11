/**
 * Quotation/invoice templates probe — does the sales side actually have templates to work with?
 *
 * Checks, in a real browser, on the running preview:
 *   1. #/templates  — the "Quotation templates" grid renders real cards (not the "No templates yet" state)
 *   2. #/templates  — the "Import Woodex starter templates" button state (must hide when all starters exist)
 *   3. #/quotes     — "New quotation" opens with usable "1. Start from" template choices
 *   4. #/quote/new  — Create quotation from the first template and confirm it saves
 *
 * Usage:  PREVIEW_EMAIL=… PREVIEW_PASS=… node sales-tpl-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/sales-tpl';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const EMAIL = process.env.PREVIEW_EMAIL || '';
const PASS = process.env.PREVIEW_PASS || '';

const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e.message).slice(0, 300)));

const signIn = async () => {
  await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
  // The shell (#nav) is in the static markup, so its presence proves nothing: the only reliable
  // sign of a session is the sessionStorage token the app writes on a successful login.
  const tok = await page.evaluate(() => sessionStorage.getItem('wxaTok') || sessionStorage.getItem('wxTok') || '');
  if (tok) return 'already-signed-in';
  if (!EMAIL || !PASS) throw new Error('not signed in and PREVIEW_EMAIL/PREVIEW_PASS are unset');
  await page.type('#l-email', EMAIL);
  await page.type('#l-pass', PASS);
  await page.click('#l-btn');
  await page.waitForFunction(() => !document.querySelector('#login-form')
    || (document.querySelector('#login-form') || {}).hidden === true
    || !!document.querySelector('#nav'), { timeout: 25000 });
  const err = await page.evaluate(() => {
    const e = document.querySelector('#l-err');
    return e && e.offsetParent !== null ? e.textContent.trim() : '';
  });
  if (err) throw new Error('sign-in failed: ' + err);
  return 'signed-in';
};

const goto = async (hash, settle = 1800) => {
  await page.evaluate(h => { location.hash = h; }, hash);
  await new Promise(r => setTimeout(r, settle));
  const st = await page.evaluate(h => ({
    hash: location.hash, len: (document.querySelector('#view') || {}).innerHTML ? document.querySelector('#view').innerHTML.length : 0,
    want: h,
  }), hash);
  if (st.len === 0) console.log('  ! view still empty after ' + settle + 'ms on ' + hash + ' — waiting longer');
  return st;
};

const signInState = await signIn();
console.log('step: ' + signInState);
const report = { signInState };

// ---- 1 + 2: templates screen ------------------------------------------------------------
await goto('#/templates');
console.log('step: templates ->', JSON.stringify(await page.evaluate(() => ({ hash: location.hash, hasGrid: !!document.querySelector('#tp-g') }))));
await page.waitForFunction(() => {
  const g = document.querySelector('#tp-g');
  return g && !/Loading/.test(g.textContent || '');
}, { timeout: 20000 }).catch(() => {});
report.templates = await page.evaluate(() => {
  const g = document.querySelector('#tp-g');
  const cards = g ? g.querySelectorAll('.card.tp').length : 0;
  const empty = !!(g && g.querySelector('.soon-box'));
  const names = g ? [...g.querySelectorAll('.card.tp b')].map(b => b.textContent.trim()).slice(0, 6) : [];
  const imp = document.querySelector('#tp-st');
  return { cards, emptyState: empty, names, importButtonHidden: imp ? imp.hidden : null,
           text: (g ? g.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 160) };
});
await page.screenshot({ path: path.join(OUT, '01-templates.png') });

// ---- 3: New quotation picker ------------------------------------------------------------
await goto('#/quotes');
console.log('step: quotes ->', JSON.stringify(await page.evaluate(() => ({ hash: location.hash, hasNew: !!document.querySelector('#qt-new') }))));
await page.waitForSelector('#qt-new', { timeout: 20000 }).catch(async () => {
  const st = await page.evaluate(() => ({
    hash: location.hash,
    viewExists: !!document.querySelector('#view'),
    hasRows: !!document.querySelector('#qt-rows'),
    text: (document.querySelector('#view') || document.body).textContent.replace(/\s+/g, ' ').trim().slice(0, 200),
  }));
  throw new Error('Quotations view did not render the "New quotation" button. state=' + JSON.stringify(st));
});
await page.click('#qt-new');
await page.waitForSelector('#nq-tpl', { timeout: 15000 }).catch(() => {});
report.newQuote = await page.evaluate(() => {
  const pick = document.querySelector('#nq-tpl');
  const radios = pick ? pick.querySelectorAll('input[name=tpl]') : [];
  return { choices: radios.length,
           names: pick ? [...pick.querySelectorAll('.nq-c b')].map(b => b.textContent.trim()).slice(0, 6) : [],
           hasCreateBtn: !!document.querySelector('#nq-go') };
});
await page.screenshot({ path: path.join(OUT, '02-new-quotation.png') });

// ---- 4: create a quotation from the first template, then confirm it saved ---------------
if (report.newQuote.choices) {
  await page.evaluate(() => {
    const r = document.querySelector('#nq-tpl input[name=tpl]'); if (r) r.checked = true;
    const n = document.querySelector('#nq-n'); if (n) n.value = 'Preview Client';
    const p = document.querySelector('#nq-pr'); if (p) p.value = 'Probe project';
  });
  await page.click('#nq-go');
  await page.waitForFunction(() => /#\/quote\/\d+/.test(location.hash), { timeout: 25000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  report.created = await page.evaluate(() => {
    // #auth sits in the markup even when signed in, so only *visible* text counts.
    const vis = n => !!(n && n.offsetParent !== null && !n.hidden);
    const view = document.querySelector('#view');
    return {
      hash: location.hash,
      hasBuilder: !!document.querySelector('.qe-main, .qe-side, #q-save, #qe-print'),
      heading: (( view ? view.querySelector('h1') : null) || {}).textContent || '',
      viewText: (view ? view.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 140),
      authVisible: vis(document.querySelector('#auth')),
    };
  });
  await page.screenshot({ path: path.join(OUT, '03-quotation-created.png') });
}

console.log(JSON.stringify(report, null, 2));
console.log('pageErrors:', errs.length ? errs : 0);
await browser.close();
