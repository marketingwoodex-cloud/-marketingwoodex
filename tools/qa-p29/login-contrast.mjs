import path from 'path'; import { pathToFileURL } from 'url';
const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1280, height: 900 } });
const base = process.argv[2] || 'http://127.0.0.1:8080';
const AUDIT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
  const bgOf = el => { let e = el; while (e && e !== document.documentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement; } return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; };
  const sel = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let el;
  while ((el = walker.nextNode())) {
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    let op = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const o = parseFloat(getComputedStyle(e).opacity); if (!isNaN(o)) op *= o; }
    const fa = fg.a < 1 ? { ...fg, a: 1 } : fg;
    if (op < 1) { fa.r = fa.r * op + bg.r * (1 - op); fa.g = fa.g * op + bg.g * (1 - op); fa.b = fa.b * op + bg.b * (1 - op); }
    const rr = Math.round(ratio(fa, bg) * 100) / 100;
    if (rr < 4.5) out.push({ sel: sel(el), text: el.textContent.trim().slice(0, 40), ratio: rr, fg: cs.color, bg: `rgb(${bg.r},${bg.g},${bg.b})`, size: parseFloat(cs.fontSize), weight: +cs.fontWeight });
  }
  return out;
};
for (const mode of ['light', 'dark']) {
  const page = await browser.newPage();
  await page.goto(base + '/admin/', { waitUntil: 'load' });
  await page.evaluate(m => { document.documentElement.classList.toggle('dark', m === 'dark'); }, mode);
  await new Promise(r => setTimeout(r, 600));
  console.log(mode, JSON.stringify(await page.evaluate(AUDIT), null, 1));
  await page.close();
}
await browser.close();
