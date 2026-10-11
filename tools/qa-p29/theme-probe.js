// Theme probe: boots the admin, routes to a screen, and reports light-coloured text that sits on a light canvas
// (no dark ancestor surface). Usage: THEME=light|dark node theme-probe.js <variantDir> <route>
const fs = require('fs'), path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const variant = process.argv[2], route = process.argv[3] || '#/security', theme = process.env.THEME || 'light';
const adminDir = path.join(variant, 'admin');
const html = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf8').replace(/<base[^>]*>/i, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => errs.push(String(e.message || e).split('\n')[0]));
class L extends ResourceLoader { fetch(url) { const u = new URL(url); if (u.host !== 'localhost') return null; let f = path.join(adminDir, u.pathname.replace(/^\/admin\//, '')); if (!fs.existsSync(f)) f = path.join(variant, u.pathname.replace(/^\//, '')); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return Promise.reject(new Error('404')); return Promise.resolve(fs.readFileSync(f)); } }
const user = { id: 1, name: 'QA Owner', role: 'owner', email: 'owner@qa.test' };
const respond = a => a === 'dashboard' ? { ok: true, stats: { pages: 0, folders: {} }, kpi: {}, leads: [], chats: [], charts: {} } :  a === 'status' ? { ok: true, needsSetup: false, driver: 'mysql', builderLocked: false, user } : a === 'me' ? { ok: true, user, caps: {}, builderToken: null } : { ok: true, avatars: {}, rows: [], items: [], list: [], leads: [], chats: [], total: 0, per: 20, pages: [], tpls: [], sources: [], team: [], stages: [], users: [], flows: {}, camps: [], pending: 0, unread: 0 };
const dom = new JSDOM(html, { url: 'http://localhost/admin/index.html' + route, runScripts: 'dangerously', resources: new L(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    win.scrollTo = () => {}; win.HTMLElement.prototype.scrollIntoView = function () {};
    win.fetch = (url, o) => { let a = ''; try { a = JSON.parse(o && o.body || '{}').action; } catch (e) {} return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(respond(a)) }); };
    win.sessionStorage.setItem('wxaTok', 'qa'); win.localStorage.setItem('wxaTheme', theme);
  } });
const w = dom.window;
setTimeout(() => { setTimeout(() => {
  const d = w.document, root = d.querySelector('#view');
  const LIGHT = /^(#f9fafb|#fff|#ffffff|#cbd5e1|#e2e8f0|#94a3b8|#9ca3af|#d1d5db|#f1f5f9|#00d3f2|#a78bfa)$/i;
  const rgb = s => { const m = String(s).match(/#([0-9a-f]{6})/i); return m ? parseInt(m[1].slice(0,2),16)*.299+parseInt(m[1].slice(2,4),16)*.587+parseInt(m[1].slice(4,6),16)*.114 : null; };
  const surface = el => { for (let p = el; p && p !== d.body; p = p.parentElement) {
      const bg = (p.style && p.style.background) || (p.style && p.style.backgroundColor) || '';
      if (/#|rgb|var\(--card|var\(--bg/.test(bg) && !/transparent|none/.test(bg)) return { el: p, bg };
      if (p.classList && (p.classList.contains('card') || p.classList.contains('modal-card'))) return { el: p, bg: 'class:card' };
    } return null; };
  let total = 0, flagged = [];
  root.querySelectorAll('*').forEach(el => {
    const c = el.style && el.style.color; if (!c || !LIGHT.test(c.trim()) && !/^rgb\(2[0-9]{2}/.test(c)) return;
    if (!el.textContent.trim() || el.children.length > 2) return;
    total++; const s = surface(el);
    if (!s) flagged.push({ text: el.textContent.trim().slice(0, 50), color: c });
  });
  const cs = d.documentElement.className, bodyBg = w.getComputedStyle(d.body).backgroundColor;
  console.log(`THEME=${theme} ROUTE=${route} html.class="${cs}" body.bg=${bodyBg} data-theme=${d.documentElement.getAttribute('data-theme')}`);
  console.log(`light-text nodes: ${total} | on NO dark surface (canvas): ${flagged.length}`);
  flagged.slice(0, 10).forEach(f => console.log(`  - color ${f.color} :: "${f.text}"`));
  console.log('hardcoded #f9fafb/#cbd5e1 inline colors in view:', (root.innerHTML.match(/#f9fafb|#cbd5e1/gi) || []).length, '| var(--) refs:', (root.innerHTML.match(/var\(--/g) || []).length);
  if (errs.length) console.log('jsdom errors:', errs.slice(0,3));
  w.close(); process.exit(0); }, 1200); }, 1500);
