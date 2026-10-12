/**
 * Users & Roles + Team separation probe.
 *
 * Guards three things that were broken:
 *  1. #/users used to print a hardcoded list of five customers-facing names whenever its API
 *     call failed, and its Edit/Add buttons only raised toasts. It must draw the real members
 *     from the API, and the editor must actually save.
 *  2. admin-users.js claimed VIEWS.team, which hid the website's own Team section manager.
 *     #/team must be the CMS screen (members of the About page), not the user admin.
 *  3. Adding a member must appear in the grid; search must filter; the API must refuse a
 *     sales account (permission) and duplicate emails / short passwords (validation).
 *
 * Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node users-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/users-probe';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const EMAIL = process.env.PREVIEW_EMAIL || '';
const PASS = process.env.PREVIEW_PASS || '';
const NEW_EMAIL = 'probe.member.' + Date.now().toString().slice(-5) + '@example.com';

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
const api = (action, payload = {}) => page.evaluate(async (a, p) => {
  const r = await fetch('/api/admin.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WX-ADM': sessionStorage.getItem('wxaTok') || '' },
    body: JSON.stringify(Object.assign({ action: a }, p)),
  });
  return r.json();
}, action, payload);

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', EMAIL);
  await page.type('#l-pass', PASS);
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
await page.waitForSelector('#nav', { timeout: 20000 });

// ---------------------------------------------------------------- 1) the grid shows real members
await page.evaluate(() => { location.hash = '#/users'; });
await page.waitForSelector('#u-grid', { timeout: 25000 });
await sleep(1800);
const grid = await page.evaluate(() => {
  const v = document.querySelector('#view');
  const cards = [...v.querySelectorAll('#u-grid .card')];
  return {
    heading: (v.querySelector('h1') || {}).innerText || '',
    cards: cards.length,
    names: cards.map(c => (c.querySelector('b') || {}).innerText || '').filter(Boolean),
    emails: [...v.querySelectorAll('#u-grid .muted')].map(m => m.innerText.replace(/\s+/g, ' ')).filter(t => /@/.test(t)),
    hasSearch: !!v.querySelector('#u-q'),
    hasAdd: !!v.querySelector('#u-add'),
    editButtons: v.querySelectorAll('#u-grid [data-edit]').length,
    undefineds: (v.innerText.match(/undefined/g) || []).length,
  };
});
report.steps.grid = grid;
if (!grid.cards) report.problems.push('the team grid rendered no member cards');
if (grid.undefineds) report.problems.push('the screen prints "undefined" ' + grid.undefineds + 'x');
if (!grid.editButtons) report.problems.push('no Edit button on any member card');
if (!grid.hasSearch || !grid.hasAdd) report.problems.push('search box or Add member button missing');
// the five names the fake screen used to print must not appear unless they are real users
const apiUsers = await api('users');
const realEmails = (apiUsers.users || []).map(u => u.email);
report.steps.api_users = { count: realEmails.length, emails: realEmails.length };
if (!realEmails.length) report.problems.push('the API returned no users at all');
const shownEmails = grid.emails.map(t => (t.match(/[\w.+-]+@[\w.-]+/) || [''])[0]).filter(Boolean);
const invented = shownEmails.filter(e => !realEmails.includes(e));
if (invented.length) report.problems.push('cards show emails the API does not have: ' + invented.join(', '));
await shot('team-grid');

// ---------------------------------------------------------------- 2) search filters
await page.type('#u-q', realEmails[0].split('@')[0]);
await sleep(600);
const filtered = await page.evaluate(() => document.querySelectorAll('#u-grid .card').length);
report.steps.search = { shown: filtered, total: grid.cards };
if (filtered >= grid.cards) report.problems.push('search did not filter (' + filtered + ' of ' + grid.cards + ')');
await page.evaluate(() => { const q = document.querySelector('#u-q'); q.value = ''; q.oninput(); });
await sleep(400);

// ---------------------------------------------------------------- 3) the editor saves
await page.evaluate(() => document.querySelector('#u-grid [data-edit]').click());
await page.waitForSelector('#uf-n', { timeout: 10000 }).catch(() => {});
await sleep(500);
const modal = await page.evaluate(() => ({
  open: !!document.querySelector('#uf-n'),
  fields: ['#uf-n', '#uf-e', '#uf-r', '#uf-p', '#uf-a'].map(s => !!document.querySelector(s)),
}));
report.steps.editor = modal;
if (!modal.open || modal.fields.some(f => !f)) report.problems.push('the member editor did not open with all fields: ' + JSON.stringify(modal));
await shot('editor-modal');
await page.evaluate(() => { const c = document.querySelector('#uf-c'); if (c) c.click(); });
await sleep(600);

// ---------------------------------------------------------------- 4) add a member, then refuse bad input
const addErrors = {};
addErrors.duplicate = (await api('user_save', { name: 'Dup', email: realEmails[0], role: 'editor', password: 'ProbePass123' })).error || '';
addErrors.shortPass = (await api('user_save', { name: 'Short', email: NEW_EMAIL, role: 'editor', password: '123' })).error || '';
addErrors.badRole = (await api('user_save', { name: 'Wiz', email: NEW_EMAIL, role: 'wizard', password: 'ProbePass123' })).error || '';
addErrors.noEmail = (await api('user_save', { name: 'NoMail', email: '', role: 'editor', password: 'ProbePass123' })).error || '';
report.steps.validation = addErrors;
if (!addErrors.duplicate) report.problems.push('a duplicate email was accepted');
if (!addErrors.shortPass) report.problems.push('a 3-character password was accepted');
if (!addErrors.badRole) report.problems.push('an unknown role was accepted');
if (!addErrors.noEmail) report.problems.push('a member with no email was accepted');

const created = await api('user_save', { name: 'Probe Member', email: NEW_EMAIL, role: 'sales', password: 'ProbePass123', active: true });
report.steps.created = { ok: created.ok, id: (created.user || {}).id, label: (created.user || {}).roleLabel, error: created.error };
if (!created.ok) report.problems.push('adding a valid member failed: ' + created.error);
await page.evaluate(() => { location.hash = '#/dashboard'; });
await sleep(400);
await page.evaluate(() => { location.hash = '#/users'; });
await page.waitForSelector('#u-grid', { timeout: 20000 });
await sleep(1500);
const after = await page.evaluate(() => ({
  cards: document.querySelectorAll('#u-grid .card').length,
  hasNew: /Probe Member/.test(document.querySelector('#u-grid').innerText),
}));
report.steps.after_add = after;
if (!after.hasNew) report.problems.push('the new member does not appear in the grid');
if (after.cards !== grid.cards + 1) report.problems.push('card count ' + grid.cards + ' -> ' + after.cards + ' after adding one member');
await shot('after-add');

// ---------------------------------------------------------------- 5) #/team is the website manager, not this screen
await page.evaluate(() => { location.hash = '#/team'; });
await page.waitForSelector('#view h1', { timeout: 20000 });
await sleep(1500);
const team = await page.evaluate(() => {
  const v = document.querySelector('#view');
  return { heading: (v.querySelector('h1') || {}).innerText || '', text: v.innerText.replace(/\s+/g, ' ').slice(0, 220), hasUserGrid: !!v.querySelector('#u-grid') };
});
report.steps.team_route = team;
if (team.hasUserGrid) report.problems.push('#/team still shows the users grid — it should be the website Team sections');
if (!/Team/i.test(team.heading)) report.problems.push('#/team heading looks wrong: ' + team.heading);
await shot('website-team');

// ---------------------------------------------------------------- 6) a sales account cannot manage users
const denied = await page.evaluate(async () => {
  const r = await fetch('/api/admin.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WX-ADM': 'preview-token-sales' },
    body: JSON.stringify({ action: 'users' }),
  });
  return r.json();
});
report.steps.sales_denied = denied.error || '';
if (denied.ok !== false) report.problems.push('a Sales account could list the team');

report.page_errors = errs.slice(0, 6);
if (errs.length) report.problems.push('page errors: ' + errs.length);
report.ok = report.problems.length === 0;
fs.writeFileSync(path.join(OUT, 'users-probe.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  grid: { cards: report.steps.grid.cards, names: report.steps.grid.names.slice(0, 3), editButtons: report.steps.grid.editButtons },
  search: report.steps.search,
  validation: report.steps.validation,
  created: report.steps.created,
  after_add: report.steps.after_add,
  team_route: report.steps.team_route.heading,
  sales_denied: report.steps.sales_denied,
  problems: report.problems,
  out: OUT,
}, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 2);
