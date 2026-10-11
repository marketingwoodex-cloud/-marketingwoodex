/**
 * Site health + Speed probe — the two screens the owner reported as dead.
 *
 *   health: the scan must actually run (real page files, real counts) instead of the
 *           "Site health could not run" dead end, and it must not flag error pages or
 *           search-engine verification files as content problems.
 *   speed:  every number on the screen must be a real value — the Key pages table used
 *           to print "undefined" — and the PageSpeed cards must render scores, metrics
 *           and suggestions once a page has been tested.
 *
 * Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node health-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/health-probe';
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
  defaultViewport: { width: 1440, height: 1000 },
});
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e.message).slice(0, 260)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;
const shot = async n => { step += 1; await page.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + n + '.png') }); };

const report = { base: BASE, steps: {}, problems: [] };

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', EMAIL);
  await page.type('#l-pass', PASS);
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
await page.waitForSelector('#nav', { timeout: 20000 });

// ---------------------------------------------------------------- 1) Site health
await page.evaluate(() => { location.hash = '#/health'; });
await page.waitForSelector('#hl-b', { timeout: 25000 });
await sleep(4000);
const health = await page.evaluate(() => {
  const v = document.querySelector('#view');
  const txt = v ? v.innerText.replace(/\s+/g, ' ') : '';
  const kpi = [...v.querySelectorAll('.hl-top .card, .card-b')].map(c => c.innerText.replace(/\s+/g, ' ').trim().slice(0, 60));
  return {
    text: txt.slice(0, 320),
    couldNotRun: /could not run/i.test(txt),
    score: (v.querySelector('.ring text') || {}).textContent ? v.querySelector('.ring text').textContent.trim() : '',
    pages: (txt.match(/(\d+) pages checked/) || [])[1] || '',
    issueRows: v.querySelectorAll('.tbl tbody tr').length,
    cards: v.querySelectorAll('.card').length,
    undefineds: (txt.match(/undefined/g) || []).length,
    kpi,
  };
});
report.steps.health = health;
if (health.couldNotRun) report.problems.push('Site health still shows the "could not run" dead end');
if (!health.score) report.problems.push('no health score rendered');
if (!health.issueRows) report.problems.push('the issues table rendered no rows');
if (health.undefineds) report.problems.push('the health screen prints "undefined" ' + health.undefineds + 'x');
await shot('site-health');

// error/verification pages must not be reported as content problems
const scan = await page.evaluate(async () => {
  const r = await fetch('/api/admin.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WX-ADM': sessionStorage.getItem('wxaTok') || '' },
    body: JSON.stringify({ action: 'health_scan' }),
  });
  return r.json();
});
const flagged = (scan.scan && scan.scan.issues ? scan.scan.issues : [])
  .filter(i => /^(404|500|503)\.html$/i.test(i.rel) || /(^|\/)google[0-9a-f]+\.html$/i.test(i.rel));
report.steps.scan_summary = {
  score: scan.scan && scan.scan.score, pages: scan.scan && scan.scan.pages,
  counts: scan.scan && scan.scan.counts, issues: (scan.scan && scan.scan.issues || []).length,
  falsePositives: flagged.length, critical: (scan.scan && scan.scan.issues || []).filter(i => i.sev === 3).length,
};
if (flagged.length) report.problems.push('error/verification pages are still flagged: ' + flagged.slice(0, 3).map(i => i.rel).join(', '));

// ---------------------------------------------------------------- 2) Speed
await page.evaluate(() => { location.hash = '#/speed'; });
await page.waitForSelector('#sp-one', { timeout: 25000 });
await sleep(3000);
const speed = await page.evaluate(() => {
  const v = document.querySelector('#view');
  const txt = v ? v.innerText.replace(/\s+/g, ' ') : '';
  const rowText = [...v.querySelectorAll('.tbl tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim());
  const rings = [...v.querySelectorAll('.sp-ring text')].map(t => t.textContent.trim()); // the score lives inside the ring's SVG
  const tips = v.querySelectorAll('.sp-tip').length;
  return { text: txt.slice(0, 260), rings, tips, rows: rowText.length, homeRow: rowText[0] || '',
           cards: v.querySelectorAll('.sp-2 .card').length, hasMobile: /Mobile/.test(txt), hasDesktop: /Desktop/.test(txt),
           undefineds: (txt.match(/undefined/g) || []).length };
});
report.steps.speed = speed;
if (/undefined/.test(speed.homeRow)) report.problems.push('Key pages still prints undefined: ' + speed.homeRow);
if (speed.undefineds) report.problems.push('the speed screen prints "undefined" ' + speed.undefineds + 'x');
if (!speed.rings.length || speed.rings.some(r => r === '–' || r === '')) report.problems.push('PageSpeed cards show no scores: ' + JSON.stringify(speed.rings));
if (!speed.hasMobile || !speed.hasDesktop || speed.cards < 2) report.problems.push('speed screen is missing its Mobile/Desktop cards');
await shot('speed');

report.page_errors = errs.slice(0, 6);
if (errs.length) report.problems.push('page errors: ' + errs.length);
report.ok = report.problems.length === 0;
fs.writeFileSync(path.join(OUT, 'health-probe.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  health: { score: report.steps.health.score, pages: report.steps.health.pages, rows: report.steps.health.issueRows, couldNotRun: report.steps.health.couldNotRun },
  scan: report.steps.scan_summary,
  speed: { rings: speed.rings, tips: speed.tips, homeRow: speed.homeRow },
  problems: report.problems,
  out: OUT,
}, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 2);
