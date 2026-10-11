/**
 * Telegram probe — proves the Telegram screen and its whole wiring on a running admin.
 *
 *   1. the screen renders every step (connect bot, QR link, team group, settings, commands)
 *   2. a junk token is refused with the BotFather message instead of a network call
 *   3. a well-formed token connects and the header flips to "Connected: @…"
 *   4. "Scan QR to connect" opens the QR modal and the test text works once linked
 *   5. settings (username, switches) save through tg_save
 *   6. "Send a test message" reports the team-group rule when no group is connected yet
 *   7. Disconnect returns the screen to "Not connected"
 *
 * It leaves the preview disconnected, so the screen never claims a live bot.
 *
 * Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node telegram-probe.mjs [baseUrl] [outDir]
 */
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/telegram-probe';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const EMAIL = process.env.PREVIEW_EMAIL || '';
const PASS = process.env.PREVIEW_PASS || '';
const GOOD_TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw'; // shape-valid only; the preview never calls Telegram

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
page.on('dialog', d => d.accept());
page.on('response', async r => {
  if (!r.url().endsWith('/api/admin.php')) return;
  let a = '?';
  try { a = JSON.parse(r.request().postData() || '{}').action || '?'; } catch { /* keep ? */ }
  if (!a.startsWith('tg_')) return;
  let verdict = 'http ' + r.status();
  try { const j = await r.json(); verdict = j.ok === false ? 'FAIL: ' + String(j.error || '').slice(0, 110) : 'ok'; } catch { /* non-json */ }
  calls.push({ action: a, verdict });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = 0;
const shot = async name => { step += 1; await page.screenshot({ path: path.join(OUT, String(step).padStart(2, '0') + '-' + name + '.png') }); };

const toast = () => page.evaluate(() => { const t = document.querySelector('#toast'); return t ? t.textContent.trim() : ''; });
const clearToast = () => page.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.className = 'toast'; });
const screen = () => page.evaluate(() => {
  const v = document.querySelector('#tg-b') || document.querySelector('#view') || document.body;
  return {
    headings: [...(v.querySelectorAll('h3') || [])].map(h => h.innerText.trim()),
    text: (v.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
    connected: /Connected: @/.test(v.innerText || ''),
    notConnected: /Not connected/.test(v.innerText || ''),
    hasToken: !!document.querySelector('#tg-tok'),
    hasQrBtn: !!document.querySelector('#tg-me'),
    hasTestMsg: !!document.querySelector('#tg-test'),
    hasTestTop: !!document.querySelector('#tg-test-top'),
    hasDmToggle: !!document.querySelector('#tg-dm'),
    hasSendTestMine: !!document.querySelector('#tg-tme'),
    hasUserSave: !!document.querySelector('#tg-user-sv'),
    hasDisconnect: !!document.querySelector('#tg-off'),
  };
});
/** Direct API call with the page's own token — used for resets and to read the saved cfg. */
const api = (action, payload = {}) => page.evaluate(async (a, p) => {
  const r = await fetch('/api/admin.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WX-ADM': sessionStorage.getItem('wxaTok') || '' },
    body: JSON.stringify(Object.assign({ action: a }, p)),
  });
  return r.json();
}, action, payload);

const report = { base: BASE, email: EMAIL, steps: {}, verdicts: {}, problems: [] };

// ---------------------------------------------------------------- login + clean slate
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 20000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', EMAIL);
  await page.type('#l-pass', PASS);
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 25000 });
await page.waitForSelector('#nav', { timeout: 20000 });
await api('tg_disconnect');
await page.evaluate(() => { location.hash = '#/telegram'; });
await page.waitForSelector('#tg-b #tg-tok', { timeout: 25000 });
await sleep(900);

const first = await screen();
report.steps.render = first;
if (first.headings.length < 6) report.problems.push('only ' + first.headings.length + ' sections rendered: ' + first.headings.join(' / '));
if (!first.notConnected) report.problems.push('fresh screen does not say "Not connected": ' + first.text);
if (!first.hasUserSave || !first.hasQrBtn) report.problems.push('contact-button card is missing its controls');
await shot('not-connected');

// ---------------------------------------------------------------- 1) junk token refused
await clearToast();
await page.evaluate(() => { document.querySelector('#tg-tok').value = 'not-a-token'; });
await page.click('#tg-con');
await sleep(1400);
const junk = { toast: await toast(), screen: await screen() };
report.steps.junk_token = junk;
if (!/bot token/i.test(junk.toast)) report.problems.push('junk token was not refused with the BotFather message, toast: "' + junk.toast + '"');
if (junk.screen.connected) report.problems.push('screen claims connected after a junk token');
await shot('junk-token-refused');

// ---------------------------------------------------------------- 2) real-shaped token connects
await clearToast();
await page.evaluate(t => { document.querySelector('#tg-tok').value = t; }, GOOD_TOKEN);
await page.click('#tg-con');
await sleep(2000);
const connected = { toast: await toast(), screen: await screen() };
report.steps.connected = connected;
report.verdicts.tg_connect = (calls.filter(c => c.action === 'tg_connect').pop() || {}).verdict || 'not called';
if (!/Connected to @/i.test(connected.toast)) report.problems.push('connect toast missing, got: "' + connected.toast + '"');
if (!connected.screen.connected) report.problems.push('header still not connected after a good token: ' + connected.screen.text);
if (!connected.screen.hasTestMsg || !connected.screen.hasQrBtn) report.problems.push('connected screen is missing step controls');
await shot('connected');

// ---------------------------------------------------------------- 3) settings save
await clearToast();
await page.evaluate(() => { const n = document.querySelector('#tg-user'); n.value = 'WXProbe'; });
await page.click('#tg-user-sv');
await sleep(1200);
const saveToast = await toast();
const cfg1 = await api('tg_get');
report.steps.username_saved = { toast: saveToast, tgUser: (cfg1.cfg || {}).tgUser };
report.verdicts.tg_save = (calls.filter(c => c.action === 'tg_save').pop() || {}).verdict || 'not called';
if (!/saved/i.test(saveToast)) report.problems.push('username save gave no confirmation: "' + saveToast + '"');
if ((cfg1.cfg || {}).tgUser !== 'WXProbe') report.problems.push('username did not persist, cfg has "' + (cfg1.cfg || {}).tgUser + '"');

await clearToast();
await page.click('#tg-cus');
await sleep(1200);
const cfg2 = await api('tg_get');
report.steps.switch_saved = { toast: await toast(), customers: (cfg2.cfg || {}).customers };
if ((cfg2.cfg || {}).customers === (cfg1.cfg || {}).customers) report.problems.push('the settings switch did not change anything');

// ---------------------------------------------------------------- 4) QR link + test text
await clearToast();
await page.click('#tg-me');
await page.waitForSelector('#tg-qs', { timeout: 10000 }).catch(() => {});
await sleep(900);
const qr = await page.evaluate(() => ({
  open: !!document.querySelector('#tg-qs'),
  status: (document.querySelector('#tg-qs') || {}).innerText || '',
  hasQr: !!document.querySelector('#tg-qr svg'),
  sendTest: !!document.querySelector('#tg-qt'),
}));
report.steps.qr_modal = qr;
if (!qr.open) report.problems.push('Scan QR did not open the link modal');
if (!qr.hasQr) report.problems.push('the QR code did not render inside the modal');
await shot('qr-modal');
if (qr.sendTest) {
  await clearToast();
  await page.click('#tg-qt');
  await sleep(1400);
  const t = await toast();
  report.steps.qr_test_text = { toast: t };
  report.verdicts.tg_test_me = (calls.filter(c => c.action === 'tg_test_me').pop() || {}).verdict || 'not called';
  if (!/test text sent/i.test(t)) report.problems.push('test text to my Telegram failed: "' + t + '"');
}
await page.evaluate(() => { const d = document.querySelector('#tg-qd'); if (d) d.click(); });
await sleep(1500);

// ---------------------------------------------------------------- 5) DM toggle + group test rule
const afterLink = await screen();
report.steps.after_link = afterLink;
if (!afterLink.hasDmToggle || !afterLink.hasSendTestMine) report.problems.push('linked state did not reveal the DM toggle / send-test button');
if (afterLink.hasDmToggle) {
  await clearToast();
  await page.click('#tg-dm');
  await sleep(1400);
  const d = await api('tg_get');
  report.steps.dm_toggle = { toast: await toast(), dmCount: (d.cfg || {}).dmCount };
  report.verdicts.tg_dm_set = (calls.filter(c => c.action === 'tg_dm_set').pop() || {}).verdict || 'not called';
}

await clearToast();
await page.click('#tg-test');
await sleep(1400);
const groupTest = { toast: await toast() };
report.steps.group_test = groupTest;
report.verdicts.tg_test = (calls.filter(c => c.action === 'tg_test').pop() || {}).verdict || 'not called';
if (!/team group/i.test(groupTest.toast)) report.problems.push('group test did not report the team-group rule: "' + groupTest.toast + '"');
await shot('group-test-rule');

// ---------------------------------------------------------------- 6) disconnect
await clearToast();
await page.click('#tg-off');
await sleep(2000);
const off = await screen();
report.steps.disconnected = { toast: await toast(), screen: off };
report.verdicts.tg_disconnect = (calls.filter(c => c.action === 'tg_disconnect').pop() || {}).verdict || 'not called';
if (!off.notConnected) report.problems.push('disconnect did not return the screen to "Not connected"');
await shot('disconnected');

const left = await api('tg_get');
if ((left.cfg || {}).tokenSet) report.problems.push('a token is still stored after disconnecting');

report.page_errors = errs.slice(0, 6);
report.calls = calls;
if (errs.length) report.problems.push('page errors: ' + errs.length);
report.ok = report.problems.length === 0;
fs.writeFileSync(path.join(OUT, 'telegram-probe.json'), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  ok: report.ok,
  verdicts: report.verdicts,
  sections: (report.steps.render.headings || []).length,
  connected_toast: report.steps.connected.toast,
  junk_refused: report.steps.junk_token.toast,
  username_saved: report.steps.username_saved,
  qr: report.steps.qr_modal,
  group_test: report.steps.group_test.toast,
  final: report.steps.disconnected.screen.text.slice(0, 90),
  problems: report.problems,
  out: OUT,
}, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 2);
