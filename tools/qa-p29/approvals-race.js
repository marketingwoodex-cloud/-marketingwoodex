// AD-10 harness: does #/approvals render the approvals queue, and does the result depend on load timing?
// Usage: node approvals-race.js <variantDir> [mode] [seed]
//   mode: shipped (default) | jitter (random delay on every admin script fetch, seeded) | reversed (admin-security.js executes before admin-appr.js)
// Run a copy from a folder with jsdom installed (see README). Prints booleans and counts only.
const fs = require('fs'), path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const variant = process.argv[2], mode = process.argv[3] || 'shipped', seed = +(process.argv[4] || 1);
const adminDir = path.join(variant, 'admin');
let html = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf8').replace(/<base[^>]*>/i, '');
if (mode === 'reversed') {
  const a = html.match(/<script src="admin-appr\.js" defer><\/script>/), s = html.match(/<script src="admin-security\.js" defer><\/script>/);
  if (!a || !s) throw new Error('script tags not found');
  html = html.replace(a[0], '__APPR__').replace(s[0], a[0]).replace('__APPR__', s[0]);
}
let rng = seed * 9301 + 49297; const rand = () => (rng = (rng * 9301 + 49297) % 233280) / 233280;
const errors = [];
const trace = [];
const T0 = Date.now();
function log(m) { trace.push(String(Date.now() - T0).padStart(5) + 'ms ' + m); }
function scriptOf(stack) { const m = String(stack || '').match(/admin\/([\w.-]+\.js)/); return m ? m[1] : '(inline/other)'; }
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('[jsdomError] ' + String(e.message || e).split('\n')[0]));
class Loader extends ResourceLoader {
  fetch(url) {
    const u = new URL(url); if (u.host !== 'localhost') return null;
    let rel = u.pathname.replace(/^\/admin\//, ''); let file = path.join(adminDir, rel);
    if (!fs.existsSync(file)) file = path.join(variant, u.pathname.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return Promise.reject(new Error('404'));
    const delay = mode === 'jitter' ? Math.floor(rand() * 400) : 0;
    return new Promise(r => setTimeout(() => r(fs.readFileSync(file)), delay));
  }
}
const user = { id: 1, name: 'QA Owner', role: 'owner', email: 'owner@qa.test' };
function respond(action) {
  if (action === 'status') return { ok: true, needsSetup: false, driver: 'mysql', builderLocked: false, user };
  if (action === 'me') return { ok: true, user, caps: {}, builderToken: null };
  if (action === 'appr_count') return { ok: true, pending: 0 };
  if (action === 'leads_count') return { ok: true, unread: 0 };
  return { ok: true, avatars: {}, rows: [], items: [], list: [], total: 0, per: 20, pages: [], cfg: {} };
}
const dom = new JSDOM(html, {
  url: 'http://localhost/admin/index.html#/approvals', runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    win.scrollTo = () => {}; win.HTMLElement.prototype.scrollIntoView = function () {};
    win.fetch = (url, o) => { let action = ''; try { action = JSON.parse(o && o.body || '{}').action; } catch (e) {}
      const body = respond(action); return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(body) }); };
    win.navigator.clipboard = { writeText: () => Promise.resolve() };
    // Trace VIEWS.approvals writes/reads, with the script that wrote it, once admin.js exposes window.WXA.
    let stored;
    Object.defineProperty(win, 'WXA', { configurable: true, enumerable: true,
      get() { return stored; },
      set(v) {
        stored = v;
        if (v && v.VIEWS) {
          let val = v.VIEWS.approvals;
          Object.defineProperty(v.VIEWS, 'approvals', { configurable: true, enumerable: true,
            get() { log('read  VIEWS.approvals (route)'); return val; },
            set(n) { log('write VIEWS.approvals from ' + scriptOf(new Error().stack)); val = n; } });
        }
      } });
    win.addEventListener('DOMContentLoaded', () => {
      const mo = new win.MutationObserver(() => {
        const d = win.document;
        if (d.querySelector('#ap-tab') && !trace.some(t => t.includes('QUEUE'))) log('QUEUE rendered (#ap-tab)');
        if (/My Security/.test((d.querySelector('#view') || {}).textContent || '') && !trace.some(t => t.includes('SECURITY'))) log('SECURITY rendered');
      });
      mo.observe(win.document.documentElement, { childList: true, subtree: true });
    });
    win.sessionStorage.setItem('wxaTok', 'qa-token');
  }
});
// User-visible check: after boot, navigate away and back to #/approvals (the sidebar link path).
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(2500);
  const w0 = dom.window;
  const nav = { before: { queue: !!w0.document.querySelector('#ap-tab') } };
  w0.location.hash = '#/dashboard'; await sleep(600);
  w0.location.hash = '#/approvals'; await sleep(800);
  nav.after = { queue: !!w0.document.querySelector('#ap-tab'), security: /My Security/.test((w0.document.querySelector('#view') || {}).textContent || '') };
  console.log('NAVIGATE #/dashboard -> #/approvals: queue=' + nav.after.queue + ' security=' + nav.after.security);
  trace.push('(navigate-back check done)');
  report();
})();
function report() {
  const w = dom.window, d = w.document, v = d.querySelector('#view');
  const txt = (v && v.textContent || '').replace(/\s+/g, ' ').trim();
  const sameFn = !!(w.WXA && w.WXA.VIEWS.approvals === w.WXA.VIEWS.security);
  const queue = !!d.querySelector('#ap-tab') && !!d.querySelector('#ap-list');
  console.log(`MODE=${mode} SEED=${seed} VARIANT=${path.basename(variant)}`);
  console.log(`VIEWS.approvals===VIEWS.security: ${sameFn}`);
  console.log(`approvals queue rendered (#ap-tab + #ap-list): ${queue}`);
  console.log(`view heading starts: ${JSON.stringify(txt.slice(0, 60))}`);
  console.log(`errors: ${errors.length}`);
  console.log('trace:'); trace.forEach(t => console.log('  ' + t));
  w.close(); process.exit(0);
}
