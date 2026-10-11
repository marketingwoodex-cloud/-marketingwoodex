// UI regression checks run against a copy of the admin in jsdom (no network, no production).
// Usage: node ui-regression.js <variantDir> <settings|editor-dash> [role]
//  settings    : T-16 — open Connections, click Test Ping in the first connector modal, click Save; report text and forbidden claims.
//  editor-dash : T-18 — base dashboard (editor role) with an incomplete payload; report error card vs stuck "Loading".
const fs = require('fs'), path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const variant = process.argv[2], check = process.argv[3] || 'settings', role = process.argv[4] || (check === 'editor-dash' ? 'editor' : 'owner');
const adminDir = path.join(variant, 'admin');
const html = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf8').replace(/<base[^>]*>/i, '');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e.message || e).split('\n')[0]));
class Loader extends ResourceLoader {
  fetch(url) {
    const u = new URL(url); if (u.host !== 'localhost') return null;
    let file = path.join(adminDir, u.pathname.replace(/^\/admin\//, ''));
    if (!fs.existsSync(file)) file = path.join(variant, u.pathname.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return Promise.reject(new Error('404'));
    return Promise.resolve(fs.readFileSync(file));
  }
}
const user = { id: 1, name: 'QA User', role, email: 'qa@qa.test' };
const requests = [];
function respond(action) {
  requests.push(action);
  if (action === 'status') return { ok: true, needsSetup: false, driver: 'mysql', builderLocked: false, user };
  if (action === 'me') return { ok: true, user, caps: {}, builderToken: null };
  if (action === 'appr_count') return { ok: true, pending: 0 };
  if (action === 'leads_count') return { ok: true, unread: 0 };
  if (action === 'dashboard') return { ok: true, stats: { pages: 3 }, recent: [], kpi: {}, leads: [], chats: [], series: [], funnel: [], pipeline: [], tasks: [] };
  return { ok: true, avatars: {}, rows: [], items: [], list: [], total: 0, per: 20, pages: [], cfg: {}, apps: [] };
}
const hash = check === 'settings' ? '#/settings/integrations' : '#/dashboard';
const dom = new JSDOM(html, {
  url: 'http://localhost/admin/index.html' + hash, runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    win.scrollTo = () => {}; win.HTMLElement.prototype.scrollIntoView = function () {};
    win.fetch = (url, o) => { let a = ''; try { a = JSON.parse(o && o.body || '{}').action; } catch (e) {}
      const body = respond(a); return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(body) }); };
    win.navigator.clipboard = { writeText: () => Promise.resolve() };
    win.sessionStorage.setItem('wxaTok', 'qa-token');
  }
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const w = dom.window, d = w.document;
  await sleep(2000);
  if (check === 'settings') {
    const first = d.querySelector('#conn-grid [data-app]');
    console.log('connector Connect buttons:', d.querySelectorAll('#conn-grid [data-app]').length);
    if (!first) { console.log('RESULT: no connector button found'); w.close(); process.exit(0); }
    first.click(); await sleep(400);
    const ping = d.querySelector('#conn-m-ping');
    if (!ping) { console.log('RESULT: modal Test Ping not found'); w.close(); process.exit(0); }
    ping.click(); await sleep(200);
    const res = (d.querySelector('#conn-ping-res') || {}).textContent || '';
    const toastA = (d.querySelector('#toast') || {}).textContent || '';
    console.log('ping result text:', JSON.stringify(res.replace(/\s+/g, ' ').trim().slice(0, 140)));
    console.log('ping toast:', JSON.stringify(toastA));
    const cls = d.querySelector('#conn-modal-form') ? 'modal' : 'none';
    d.querySelector('#conn-m-cancel') && d.querySelector('#conn-m-cancel').click(); await sleep(150);
    const save = d.querySelector('#st-save-btn');
    if (save) { save.click(); await sleep(200); console.log('save toast:', JSON.stringify((d.querySelector('#toast') || {}).textContent || '')); }
    else console.log('save button: not on this tab');
    const hay = [res, toastA].join(' ');
    const forbidden = ['200 OK', 'Ping successful', 'saved live', 'Connected & Verified', 'Live Connected'];
    console.log('forbidden claims present:', forbidden.filter(f => hay.includes(f)));
    console.log('API requests during Ping+Save (action names):', requests.filter(a => /save|ping|test|connect|integ/i.test(a)));
  } else {
    await sleep(1000);
    const view = (d.querySelector('#view') || {}).textContent || '';
    const dx = (d.querySelector('#dx') || {}).textContent || '';
    const txt = (dx || view).replace(/\s+/g, ' ');
    console.log('role:', role, '| route:', hash, '| dashboard action called:', requests.includes('dashboard'));
    console.log('error card shown:', /Dashboard data is incomplete|Server error|went wrong|Could not load/i.test(view));
    console.log('stuck on Loading:', /Loading/.test(txt));
    console.log('view snippet:', JSON.stringify(view.replace(/\s+/g, ' ').trim().slice(0, 120)));
  }
  console.log('jsdom errors:', errors.length, errors.slice(0, 3));
  w.close(); process.exit(0);
})();
