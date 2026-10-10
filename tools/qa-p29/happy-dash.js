// Runtime harness: boots the real admin/index.html in jsdom with a stubbed API, then reports what the
// #/settings/integrations route renders. Usage: node harness.js <variantDir> <hash> [waitMs]
const fs = require('fs'), path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const variant = process.argv[2], hash = process.argv[3] || '#/settings/integrations', wait = +(process.argv[4] || 1500);
const adminDir = path.join(variant, 'admin');
const html = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf8').replace(/<base[^>]*>/i, '');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('[jsdomError] ' + (e.message || e).toString().split('\n')[0] + (e.detail && e.detail.message ? ' :: ' + e.detail.message : '')));
vc.on('error', m => errors.push('[console.error] ' + String(m).split('\n')[0]));
class Loader extends ResourceLoader {
  fetch(url, opts) {
    const u = new URL(url);
    if (u.host !== 'localhost') return null;
    // relative to /admin/ (the page is served from /admin/), absolute paths from the site root
    let rel = u.pathname.replace(/^\/admin\//, '');
    if (u.pathname.startsWith('/admin/') === false && !u.pathname.startsWith('/admin')) rel = u.pathname.replace(/^\//, '');
    let file = path.join(adminDir, rel);
    if (!fs.existsSync(file)) file = path.join(variant, u.pathname.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { errors.push('[404] ' + u.pathname); return Promise.reject(new Error('404 ' + u.pathname)); }
    return Promise.resolve(fs.readFileSync(file));
  }
}
const user = { id: 1, name: 'QA Owner', role: 'owner', email: 'owner@qa.test' };
function respond(action) {
  if (action === 'status') return { ok: true, needsSetup: false, driver: 'mysql', builderLocked: false, user };
  if (action === 'me') return { ok: true, user, caps: {}, builderToken: null };
  if (action === 'dash_data') return { ok: true, days: 7, role: 'owner', axis: ['2026-09-27','2026-09-28'], visitors: [1,2], crm: { kpi: { leads: [1,2], pipeline: [1,2], quotesSent: [1,2], openQuotes: [1,2], paid: [1,2], unpaid: 0, won: 1 }, series: { leads: [1,2], sent: [1,2], won: [0,1], invoiced: [1,2], paid: [1,2] }, funnel: {}, recent: [], followups: [], overdue: [], overdueN: 0, sources: [], chips: { new: 0, overdue: 0, follow: 0 }, target: { target: 0, month: 0, monthLabel: 'October 2026' } } };
  if (action === 'dashboard') return { ok: true, editsByDay: {}, stats: { pages: 0, folders: {}, edits7: 0 }, recent: [], kpi: {}, leads: [], chats: [], series: [], funnel: [], pipeline: [], tasks: [] };
  if (action === 'appr_count') return { ok: true, pending: 0 };
  if (action === 'leads_count') return { ok: true, unread: 0 };
  return { ok: true, avatars: {}, rows: [], items: [], list: [], leads: [], chats: [], total: 0, per: 20, pages: [], tpls: [], sources: [], team: [], stages: [], users: [], flows: {}, camps: [] };
}
const dom = new JSDOM(html, {
  url: 'http://localhost/admin/index.html' + hash, runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    win.scrollTo = () => {};
    // jsdom has no canvas: give a minimal 2D context so Chart-drawing code can run (test-environment shim only)
    win.HTMLCanvasElement.prototype.getContext = function () { const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: () => true }); return ctx; };
    win.HTMLElement.prototype.scrollIntoView = function () {};
    win.fetch = (url, o) => {
      let action = ''; try { action = JSON.parse(o && o.body || '{}').action; } catch (e) {}
      const body = respond(action);
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(body) });
    };
    win.navigator.clipboard = { writeText: () => Promise.resolve() };
    win.sessionStorage.setItem('wxaTok', 'qa-token');
  }
});
setTimeout(() => {
  const w = dom.window, d = w.document;
  const view = d.querySelector('#view');
  const txt = (view && view.textContent || '').replace(/\s+/g, ' ').trim();
  console.log('VARIANT      :', variant.split('/').pop());
  console.log('ROUTE        :', hash, '| title:', d.title);
  console.log('WXA loaded   :', !!w.WXA, '| VIEWS.settings:', typeof (w.WXA && w.WXA.VIEWS.settings), '| VIEWS.soon:', typeof (w.WXA && w.WXA.VIEWS.soon));
  console.log('#view has "Phase undefined":', /Phase undefined/.test(txt));
  console.log('soon-box shown:', !!d.querySelector('#view .soon-box'), '| settings tabs:', !!d.querySelector('#st-subnav'), '| integ cards:', d.querySelectorAll('#view .card').length);
  console.log('view snippet :', txt.slice(0, 160));
  console.log('DASH_ERROR_SHOWN:', /could not be drawn|is incomplete|Dashboard data/.test(txt), '| STILL_LOADING:', /Loading dashboard/.test(txt));
  const phase = (view && view.innerHTML.match(/Phase[^<]{0,30}/) || [''])[0];
  console.log('phase text   :', JSON.stringify(phase));
  console.log('probe approvals===security:', !!(w.WXA && w.WXA.VIEWS.approvals === w.WXA.VIEWS.security), '| appr-screen-marker present:', /Staff approvals|Approval queue|approvals queue/i.test(txt));
  console.log('probe #st-tabs:', !!d.querySelector('#st-tabs'), '| .st-grid:', !!d.querySelector('#view .st-grid'), '| #in-mail:', !!d.getElementById('in-mail'), '| #in-wa:', !!d.getElementById('in-wa'), '| .ig-tile:', d.querySelectorAll('.ig-tile').length, '| ig-keys:', !!d.getElementById('ig-keys'));
  console.log('errors (' + errors.length + '):'); errors.slice(0, 12).forEach(e => console.log('  ' + e));
  w.close(); process.exit(0);
}, wait);
