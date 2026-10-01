// Woodex Admin v2 — PREVIEW backend (mirrors frontend-v1/api/admin.php).
// Stores data in frontend-v1/_private/admin-db.json instead of MySQL. Not deployed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROLES = ["owner", "admin", "editor", "sales"];
class Fail extends Error { constructor(m, c = 400) { super(m); this.code = c; } }

export function createAdmin({ ROOT, secret, builderPassword }) {
  const PRIV = path.join(ROOT, "_private"), DBF = path.join(PRIV, "admin-db.json"), ACT = path.join(PRIV, "activity.jsonl");
  const load = () => (fs.existsSync(DBF) ? JSON.parse(fs.readFileSync(DBF, "utf8")) : null);
  const save = (d) => fs.writeFileSync(DBF, JSON.stringify(d, null, 1));
  const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const hash = (pw) => { const s = crypto.randomBytes(16).toString("hex"); return "scrypt$" + s + "$" + crypto.scryptSync(pw, s, 32).toString("hex"); };
  const verify = (pw, h) => { const [, s, k] = String(h || "").split("$"); if (!s) return false; const a = crypto.scryptSync(String(pw), s, 32), b = Buffer.from(k, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const hmac = (s) => crypto.createHmac("sha256", secret()).update(s).digest("hex");
  /** Token = uid.exp.sid.sig — the session id makes every sign-in listable and revocable (Security → Sessions). */
  let lastSid = null; // sid of the session tokenFor() just created (bound into the builder token)
  const tokenFor = (u, req, ip) => {
    const exp = String(Math.floor(Date.now() / 1000) + 12 * 3600), sid = crypto.randomBytes(8).toString("hex"); lastSid = sid;
    u.sessions = (u.sessions || []).filter((x) => x.exp > Date.now() / 1000).slice(-9);
    u.sessions.push({ sid, exp: +exp, ip: ip || "", ua: String((req && req.headers["user-agent"]) || "").slice(0, 200), created: now(), seen: now() });
    return u.id + "." + exp + "." + sid + "." + hmac("adm|" + u.id + "|" + exp + "|" + u.pw_ver + "|" + sid);
  };
  // ---- TOTP (RFC 6238) for two-factor sign-in
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const b32enc = (buf) => { let bits = "", out = ""; for (const b of buf) bits += b.toString(2).padStart(8, "0"); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; };
  const b32dec = (str) => { let bits = ""; for (const c of String(str).toUpperCase().replace(/[^A-Z2-7]/g, "")) bits += B32.indexOf(c).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
  const hotp = (key, ctr) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(ctr)); const h = crypto.createHmac("sha1", key).update(b).digest(), o = h[19] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, "0"); };
  const totpOk = (secret, code, u) => { code = String(code || "").replace(/\s/g, ""); if (!/^\d{6}$/.test(code)) return false; const key = b32dec(secret), t = Math.floor(Date.now() / 30000);
    for (const d of [-1, 0, 1]) if (hotp(key, t + d) === code) { if (u) { if ((u.totp_last || 0) >= t + d) return false; u.totp_last = t + d; } return true; } return false; };
  const sha = (x) => crypto.createHash("sha256").update(String(x)).digest("hex");
  /** Builder token = exp.uid.sid.sig — bound to the admin session: signing out / revoking / disabling kills builder access too. */
  const builderToken = (uid, sid) => { const exp = String(Math.floor(Date.now() / 1000) + 12 * 3600); return exp + "." + uid + "." + sid + "." + hmac("wx|" + exp + "|" + uid + "|" + sid); };
  const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active, created_at: u.created_at, last_login: u.last_login });
  const canBuild = (u) => ["owner", "admin", "editor"].includes(u.role);
  const validPw = (p) => { if (String(p || "").length < 8) throw new Fail("Password must be at least 8 characters"); };

  function current(db, req) {
    if (req && req._wxAs) return (db && db.users.find((x) => x.id === req._wxAs && x.active)) || null; // MCP bearer-token user
    const m = /^(\d+)\.(\d{10})\.([a-f0-9]{16})\.([a-f0-9]{64})$/.exec(String(req.headers["x-wx-adm"] || ""));
    if (!db || !m || +m[2] < Date.now() / 1000) return null;
    const u = db.users.find((x) => x.id === +m[1] && x.active);
    if (!u || hmac("adm|" + u.id + "|" + m[2] + "|" + u.pw_ver + "|" + m[3]) !== m[4]) return null;
    const s = (u.sessions || []).find((x) => x.sid === m[3]); if (!s) return null; // signed out remotely
    s.seen = now(); u._sid = m[3]; return u;
  }
  function log(db, u, action, target = "", ip = "") { db.activity.push({ id: ++db.seqA, user_id: u ? u.id : null, user_name: u ? u.name : null, action, target: String(target).slice(0, 255), ip, created_at: now() }); if (db.activity.length > 5000) db.activity.splice(0, db.activity.length - 5000); }
  function ingest(db) {
    if (!fs.existsSync(ACT)) return; const raw = fs.readFileSync(ACT, "utf8"); fs.writeFileSync(ACT, "");
    for (const l of raw.split("\n")) { let a; try { a = JSON.parse(l); } catch { continue; } if (!a.action) continue;
      const u = a.uid ? db.users.find((x) => x.id === +a.uid) : null;
      db.activity.push({ id: ++db.seqA, user_id: u ? u.id : null, user_name: u ? u.name : "Builder", action: "builder." + a.action, target: String(a.target || "").slice(0, 255), ip: a.ip || "", created_at: new Date(a.t * 1000).toISOString().slice(0, 19).replace("T", " ") }); }
  }
  function walk(dir, out = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; }
  function stats() {
    const s = { pages: 0, folders: {}, media: 0, mediaBytes: 0, backups: 0, lastBackup: 0 };
    for (const f of walk(ROOT)) {
      const rel = path.relative(ROOT, f).split(path.sep).join("/");
      if (/^(builder|admin|api|assets|_private)\//.test(rel)) {
        if (/^assets\/uploads\/.*\.(jpe?g|png|webp|gif)$/i.test(rel)) { s.media++; s.mediaBytes += fs.statSync(f).size; }
        if (rel.startsWith("_private/backups/")) { s.backups++; s.lastBackup = Math.max(s.lastBackup, Math.floor(fs.statSync(f).mtimeMs / 1000)); }
        continue;
      }
      if (rel.endsWith(".html")) { s.pages++; const k = rel.includes("/") ? rel.split("/")[0] : "(top level)"; s.folders[k] = (s.folders[k] || 0) + 1; }
    }
    return s;
  }
  const tries = new Map();
  function finishLogin(db, u, req, ip) {
    u.last_login = now(); log(db, u, "login", "", ip);
    const ua = String(req.headers["user-agent"] || ""), dev = sha(ip + "|" + ua.replace(/[\d.]+/g, "")).slice(0, 16);
    u.known = u.known || [];
    if (!u.known.includes(dev)) {
      if (u.known.length && u.alerts !== false) loginAlert(u, ip, ua);
      u.known = [...u.known, dev].slice(-20);
    }
    return { ok: true, token: tokenFor(u, req, ip), builderToken: canBuild(u) ? builderToken(u.id, lastSid) : null, user: pub(u) };
  }
  function loginAlert(u, ip, ua) {
    const text = `Hello ${u.name},\n\nYour Woodex Admin account was just signed in to from a new device.\n\nTime: ${now()} UTC\nIP address: ${ip}\nDevice: ${ua.slice(0, 160)}\n\nIf this was you, ignore this email. If not, sign in, change your password and use Security → "Sign out all other devices".`;
    try { fs.mkdirSync(PRIV, { recursive: true }); fs.appendFileSync(path.join(PRIV, "outbox.jsonl"), JSON.stringify({ t: now(), channel: "email", to: u.email, subject: "New sign-in to Woodex Admin", text }) + "\n"); } catch {}
  }
  // =================================================================== A2 — pages, SEO, status, redirects, global parts
  const BACKUPS = path.join(PRIV, "backups"), PMETA = path.join(PRIV, "pages.json"), REDIR = path.join(PRIV, "redirects.json"), CHROME = path.join(PRIV, "chrome.json");
  const RESERVED = /^(_private|builder|admin|api|assets)\//;
  const jr = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
  const jw = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 1));
  const urlOf = (rel) => "/" + rel.replace(/index\.html$/, "");
  const relOk = (rel) => {
    rel = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, ""); if (rel === "" || rel.endsWith("/")) rel += "index.html";
    if (!/^[a-z0-9][a-z0-9/_\-.]*\.html$/i.test(rel) || rel.includes("..") || RESERVED.test(rel)) throw new Fail("Invalid page path");
    if (!fs.existsSync(path.join(ROOT, rel))) throw new Fail("Page not found", 404); return rel;
  };
  const allPages = () => walk(ROOT).filter((f) => f.endsWith(".html")).map((f) => path.relative(ROOT, f).split(path.sep).join("/")).filter((r) => !RESERVED.test(r)).sort();
  const stampName = () => { const d = new Date(), p = (n, l = 2) => String(n).padStart(l, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}.html`; };
  const bdir = (rel) => path.join(BACKUPS, rel.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "_"));
  function backupPage(rel) {
    const d = bdir(rel); fs.mkdirSync(d, { recursive: true }); let n = stampName(); while (fs.existsSync(path.join(d, n))) n = n.replace(/(\d{3})\.html$/, (m, x) => String(+x + 1).padStart(3, "0") + ".html");
    fs.copyFileSync(path.join(ROOT, rel), path.join(d, n));
    const old = fs.readdirSync(d).filter((f) => f.endsWith(".html")).sort(); while (old.length > 30) fs.unlinkSync(path.join(d, old.shift()));
  }
  const hattr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
  const dec = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
  const tagAttr = (tag, a) => { const m = new RegExp("\\s" + a + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)')", "i").exec(tag); return m ? dec(m[2] != null ? m[2] : m[3] || "") : ""; };
  const findMeta = (h, key, val) => { const m = new RegExp("<meta\\b[^>]*\\b" + key + "\\s*=\\s*[\"']" + reEsc(val) + "[\"'][^>]*>", "i").exec(h); return m ? m[0] : null; };
  const addHead = (h, tag) => h.replace(/<\/head>/i, () => tag + "\n</head>");
  function setMeta(h, key, val, content) { const old = findMeta(h, key, val), nw = content === "" ? "" : `<meta ${key}="${val}" content="${hattr(content)}">`; if (old != null) return h.replace(old, () => nw); return nw ? addHead(h, nw) : h; }
  function setCanonical(h, href) { const nw = href ? `<link rel="canonical" href="${hattr(href)}">` : "", m = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(h); if (m) return h.replace(m[0], () => nw); return nw ? addHead(h, nw) : h; }
  function pageInfo(rel, meta) {
    const abs = path.join(ROOT, rel), h = fs.readFileSync(abs, "utf8"), st = fs.statSync(abs);
    const title = dec(((/<title>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || "").trim());
    const g = (k, v, a = "content") => { const m = findMeta(h, k, v); return m ? tagAttr(m, a) : ""; };
    const desc = g("name", "description"), robots = g("name", "robots"), og = g("property", "og:image");
    const cm = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(h), can = cm ? tagAttr(cm[0], "href") : "";
    const main = (/<main\b[\s\S]*?<\/main>/i.exec(h) || [h])[0];
    const h1 = (main.match(/<h1\b/gi) || []).length, noalt = (main.match(/<img\b[^>]*>/gi) || []).filter((i) => !/\salt\s*=/i.test(i)).length;
    const words = (main.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
    const issues = [];
    if (!title) issues.push("No title"); else if (title.length > 60) issues.push("Title over 60 characters");
    if (!desc) issues.push("No meta description"); else if (desc.length < 70 || desc.length > 160) issues.push("Description should be 70–160 characters");
    if (h1 !== 1) issues.push(h1 ? "More than one H1" : "No H1");
    if (noalt) issues.push(noalt + " image(s) without alt text");
    if (!og) issues.push("No social share image");
    if (words < 250) issues.push("Thin content (" + words + " words)");
    return { path: rel, url: urlOf(rel), title, description: desc, canonical: can, ogImage: og, noindex: /noindex/i.test(robots), status: (meta[rel] || {}).status || "published",
      mtime: Math.floor(st.mtimeMs / 1000), size: st.size, words, issues, score: Math.max(0, 100 - issues.length * 12), folder: rel.split("/").length > 2 ? rel.split("/")[0] : "" };
  }
  // ---- P16 3.8b redirects v2 (mirror of api/redirects-lib.php)
  const RD_CFG = path.join(PRIV, "redirect-cfg.json"), RD_404 = path.join(PRIV, "r404.json"), RD_PLAN = path.join(ROOT, "api", "redirect-plan.json");
  const rdCfg = () => Object.assign({ www: true, spam: true, seeded: false }, jr(RD_CFG, {}));
  const rdOne = (r) => { let type = +r.type || 301; if (![301, 302, 410].includes(type)) type = 301; const match = r.match === "prefix" ? "prefix" : "exact";
    return { from: "/" + String(r.from || "").replace(/^\/+|\/+$/g, "") + "/", to: type === 410 ? "" : String(r.to || "").trim(), type, match, src: String(r.src || "").trim().slice(0, 60), on: r.on === undefined ? true : !!r.on }; };
  const rdClean = (rows) => { const list = [], seen = {};
    for (const r of rows) { if (!r || !String(r.from || "").replace(/[\/ ]/g, "")) continue; const x = rdOne(r);
      if (!/^\/[a-z0-9/_\-.&]*$/i.test(x.from)) throw new Fail('Old address "' + x.from + '" is not valid (letters, numbers, - _ . / & only)');
      if (/^\/(admin|api|assets|builder|_private)\//i.test(x.from)) throw new Fail('"' + x.from + '" is a system folder and cannot be redirected');
      if (x.type !== 410) { if (!x.to) throw new Fail("Choose a new address for " + x.from);
        if (!/^(https?:\/\/[^\s"<>]+|\/[a-z0-9/_\-.#?=&]*)$/i.test(x.to)) throw new Fail('New address "' + x.to + '" is not valid');
        if (x.to.replace(/\/+$/, "") === x.from.replace(/\/+$/, "")) throw new Fail("A redirect cannot point to itself (" + x.from + ")"); }
      const k = (x.from + "|" + x.match).toLowerCase(); if (seen[k]) continue; seen[k] = 1; list.push(x); }
    return list; };
  const rdMerge = (cur, add) => { const have = {}; cur.forEach((r) => (have[r.from.toLowerCase()] = 1)); let n = 0;
    add.forEach((r) => { const x = rdOne(r); if (have[x.from.toLowerCase()]) return; cur.push(x); have[x.from.toLowerCase()] = 1; n++; }); return { list: cur, added: n }; };
  const rdList = () => { let cur = jr(REDIR, []).map(rdOne); const c = rdCfg();
    if (!c.seeded) { cur = rdMerge(cur, jr(RD_PLAN, [])).list; jw(REDIR, cur); c.seeded = true; jw(RD_CFG, c); publishRules(); } return cur; };
  const rdLines = (q) => { const c = rdCfg(), L = [];
    if (c.www) L.push("# one official address: no www", "RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]", "RewriteRule ^ https://%1%{REQUEST_URI} [R=301,L]");
    if (c.spam) L.push("# hacked-spam cleanup: tell Google these are gone for good", "RewriteCond %{REQUEST_URI} (casino|gokkasten|gokautomat|blackjack|roulette|free-spins|itm-[0-9]{4,}) [NC]", "RewriteRule ^ - [G,L]", "RewriteCond %{QUERY_STRING} (^|&)(p|page_id|attachment_id|cat)=[0-9]+ [NC]", "RewriteRule ^$ /? [R=301,L]");
    jr(REDIR, []).map(rdOne).forEach((r) => { if (!r.on) return; const pt = "^" + q(r.from.replace(/^\/+|\/+$/g, "")) + (r.match === "prefix" ? "(/.*)?$" : "/?$");
      L.push(r.type === 410 ? "RewriteRule " + pt + " - [G,L]" : "RewriteRule " + pt + " " + r.to + " [R=" + r.type + ",L]"); });
    return L; };
  const rdExists = (pth) => pth === "/" || fs.existsSync(path.join(ROOT, pth.replace(/\/+$/, ""), "index.html")) || (fs.existsSync(path.join(ROOT, pth)) && fs.statSync(path.join(ROOT, pth)).isFile());
  const rdTest = (list) => { const from = {}; list.forEach((r) => { if (r.on) from[r.from.toLowerCase()] = r; });
    return list.map((r, i) => { let st = "ok", msg = r.type === 410 ? "Gone (410)" : "Target page exists";
      if (!r.on) { st = "off"; msg = "Switched off"; }
      else if (rdExists(r.from)) { st = "warn"; msg = "A live page exists at this address; the redirect hides it"; }
      else if (r.type !== 410 && r.to[0] === "/") { const pth = r.to.replace(/[?#].*$/, ""), nx = from[("/" + pth.replace(/^\/+|\/+$/g, "") + "/").toLowerCase()];
        if (nx) { st = "warn"; msg = "Chain: " + r.to + " redirects again to " + (nx.to || "410") + ". Point it straight to the final page"; }
        else if (!rdExists(pth)) { st = "bad"; msg = "Target page not found (" + pth + ")"; } }
      else if (r.type !== 410) msg = "External link (not checked)";
      return { i, status: st, msg }; }); };
  const rd404List = () => Object.entries(jr(RD_404, {})).map(([p, v]) => ({ path: p, n: v.n | 0, last: v.last || "", ref: v.ref || "" })).sort((a, b) => b.n - a.n).slice(0, 200);
  const rd404Log = (p, ref, ipAddr) => { let pth = "/" + String(p || "").replace(/[?#].*$/, "").slice(0, 200).replace(/^\/+|\/+$/g, "") + "/";
    if (pth === "//" || /^\/(admin|api|assets|builder|_private)\//i.test(pth) || /\.(js|css|map|png|jpe?g|webp|gif|svg|ico|woff2?)\/$/i.test(pth)) return;
    const d = jr(RD_404, {}); if (!d[pth] && Object.keys(d).length >= 300) { const lo = Object.entries(d).sort((a, b) => a[1].n - b[1].n)[0]; delete d[lo[0]]; }
    const e = d[pth] || { n: 0 }; e.n++; e.last = new Date().toISOString(); ref = String(ref || "").replace(/[\s"<>]/g, "").slice(0, 200); if (ref && !/localhost|e2b\.app/.test(ref)) e.ref = ref; d[pth] = e; jw(RD_404, d); };
  function publishRules() {
    const meta = jr(PMETA, {}), red = jr(REDIR, []), q = (s) => s.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
    const lines = ["# BEGIN WOODEX-ADMIN (managed by /admin — do not edit by hand)", "<IfModule mod_rewrite.c>", "RewriteEngine On"];
    rdLines(q).forEach((l) => lines.push(l)); // P16 3.8b
    Object.keys(meta).forEach((rel) => { if (meta[rel].status === "draft") lines.push("RewriteRule ^" + q(rel.replace(/index\.html$/, "")) + "(index\\.html)?$ - [R=404,L]"); });
    lines.push("</IfModule>", "# END WOODEX-ADMIN");
    const ht = path.join(ROOT, ".htaccess"); let cur = fs.existsSync(ht) ? fs.readFileSync(ht, "utf8") : "";
    cur = cur.replace(/\n?# BEGIN WOODEX-ADMIN[\s\S]*?# END WOODEX-ADMIN\n?/, "\n");
    fs.writeFileSync(ht, cur.trimEnd() + "\n\n" + lines.join("\n") + "\n");
    const sm = path.join(ROOT, "sitemap.xml"); let base = "https://woodex.com.pk"; if (fs.existsSync(sm)) { const b = /<loc>(https?:\/\/[^/<]+)/.exec(fs.readFileSync(sm, "utf8")); if (b) base = b[1]; }
    let x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const rel of allPages()) {
      if (rel === "404.html" || ["draft", "hidden"].includes((meta[rel] || {}).status)) continue;
      const head = fs.readFileSync(path.join(ROOT, rel), "utf8").slice(0, 6000), m = findMeta(head, "name", "robots"); if (m && /noindex/i.test(tagAttr(m, "content"))) continue;
      x += "  <url><loc>" + base + urlOf(rel) + "</loc><lastmod>" + new Date(fs.statSync(path.join(ROOT, rel)).mtimeMs).toISOString().slice(0, 10) + "</lastmod></url>\n";
    }
    fs.writeFileSync(sm, x + "</urlset>\n");
  }
  const PATS = { header: /<header class="site-header"[\s\S]*?<\/header>/, mobile: /<nav class="mobile-panel"[\s\S]*?<\/nav>/, footer: /<footer class="footer"[\s\S]*?<\/footer>/ };
  const unsafe = (x) => /<script|\son[a-z]+\s*=|javascript:/i.test(x);

  async function a2(action, inp, need, db, ip) {
    const done = (o) => { save(db); return o; };
    switch (action) {
      case "pages_list": {
        need(["owner", "admin", "editor"]); ingest(db); const meta = jr(PMETA, {}), last = {};
        db.activity.filter((a) => ["builder.save", "builder.page_new", "builder.restore", "page.meta"].includes(a.action)).forEach((a) => (last[a.target] = a.user_name));
        const pages = allPages().map((rel) => Object.assign(pageInfo(rel, meta), { editedBy: last[rel] || null })).sort((a, b) => (a.url === "/" ? -1 : b.url === "/" ? 1 : a.url.localeCompare(b.url)));
        return done({ ok: true, pages });
      }
      case "page_meta_save": {
        const u = need(["owner", "admin", "editor"]), rel = relOk(inp.path), title = String(inp.title || "").trim(), desc = String(inp.description || "").trim(), status = String(inp.status || "published");
        if (!["published", "hidden", "draft"].includes(status)) throw new Fail("Unknown status");
        if (rel === "index.html" && status === "draft") throw new Fail("The home page cannot be a draft");
        if (!title) throw new Fail("Title is required");
        const can = String(inp.canonical || "").trim(), og = String(inp.ogImage || "").trim();
        for (const v of [can, og]) if (v && !/^(https?:\/\/|\/)[^\s"<>]*$/.test(v)) throw new Fail("Links must start with https:// or /");
        backupPage(rel); const abs = path.join(ROOT, rel); let h = fs.readFileSync(abs, "utf8"); const tt = "<title>" + hattr(title) + "</title>";
        h = /<title>[\s\S]*?<\/title>/i.test(h) ? h.replace(/<title>[\s\S]*?<\/title>/i, () => tt) : addHead(h, tt);
        h = setMeta(h, "name", "description", desc); h = setMeta(h, "property", "og:title", title); h = setMeta(h, "property", "og:description", desc); h = setMeta(h, "property", "og:image", og);
        const noindex = !!inp.noindex || status !== "published", rm = findMeta(h, "name", "robots"), robots = rm ? tagAttr(rm, "content") : "";
        h = setMeta(h, "name", "robots", noindex ? "noindex, follow" : /noindex/i.test(robots) ? "" : robots); h = setCanonical(h, can);
        fs.writeFileSync(abs, h);
        const meta = jr(PMETA, {}); if (status === "published") delete meta[rel]; else meta[rel] = { status }; jw(PMETA, meta);
        publishRules(); log(db, u, "page.meta", rel, ip); return done({ ok: true, page: pageInfo(rel, meta) });
      }
      case "page_delete": {
        const u = need(["owner", "admin"]), rel = relOk(inp.path), to = String(inp.redirectTo || "").trim();
        if (rel === "index.html" || rel === "404.html") throw new Fail("This page cannot be deleted");
        if (!/^\/[a-z0-9/_\-.]*$/i.test(to)) throw new Fail("Choose a page to redirect visitors to");
        const trash = path.join(PRIV, "trash"); fs.mkdirSync(trash, { recursive: true });
        fs.renameSync(path.join(ROOT, rel), path.join(trash, stampName().slice(0, 15) + "-" + rel.replace(/[^a-z0-9]+/gi, "_")));
        try { fs.rmdirSync(path.dirname(path.join(ROOT, rel))); } catch {}
        const red = jr(REDIR, []).filter((r) => r.from !== urlOf(rel)); red.push({ from: urlOf(rel), to }); jw(REDIR, red);
        const meta = jr(PMETA, {}); delete meta[rel]; jw(PMETA, meta);
        publishRules(); log(db, u, "page.delete", rel + " → " + to, ip); return done({ ok: true });
      }
      case "backup_get": {
        need(["owner", "admin", "editor"]); const rel = relOk(inp.path), file = path.basename(String(inp.file || ""));
        if (!/^\d{8}-\d{6}(-\d{3})?\.html$/.test(file)) throw new Fail("Invalid backup");
        const f = path.join(bdir(rel), file); if (!fs.existsSync(f)) throw new Fail("Backup not found", 404);
        return { ok: true, html: fs.readFileSync(f, "utf8") };
      }
      case "redirects": { need(["owner", "admin"]); const l = rdList(), c = rdCfg(); return { ok: true, redirects: l, cfg: { www: c.www, spam: c.spam }, planCount: jr(RD_PLAN, []).length, test: rdTest(l), missed: Object.keys(jr(RD_404, {})).length }; }
      case "redirects_save": {
        const u = need(["owner", "admin"]), list = rdClean(inp.redirects || []);
        if (inp.cfg && typeof inp.cfg === "object") { const c = rdCfg(); c.www = "www" in inp.cfg ? !!inp.cfg.www : c.www; c.spam = "spam" in inp.cfg ? !!inp.cfg.spam : c.spam; c.seeded = true; jw(RD_CFG, c); }
        jw(REDIR, list); publishRules(); log(db, u, "redirects.save", list.length + " redirects", ip); return done({ ok: true, redirects: list, test: rdTest(list) });
      }
      case "redirects_plan": {
        const u = need(["owner", "admin"]), m = rdMerge(jr(REDIR, []).map(rdOne), jr(RD_PLAN, []));
        jw(REDIR, m.list); publishRules(); log(db, u, "redirects.save", "loaded plan (+" + m.added + ")", ip); return done({ ok: true, redirects: m.list, added: m.added, test: rdTest(m.list) });
      }
      case "r404_list": need(["owner", "admin"]); return { ok: true, rows: rd404List() };
      case "r404_clear": { need(["owner", "admin"]); const pth = String(inp.path || ""); if (!pth) jw(RD_404, {}); else { const d = jr(RD_404, {}); delete d[pth]; jw(RD_404, d); } return { ok: true, rows: rd404List() }; }
      case "global_menu": {
        const u = need(["owner", "admin"]), d = String(inp.desktop || ""), mob = String(inp.mobile || "");
        if (unsafe(d) || unsafe(mob)) throw new Fail("Scripts are not allowed in the menu");
        if (!/^<nav class="desktop-nav"[^>]*>[\s\S]*<\/nav>$/.test(d) || !/^<nav class="mobile-panel"[^>]*>[\s\S]*<\/nav>$/.test(mob)) throw new Fail("Invalid menu HTML");
        let n = 0;
        for (const rel of allPages()) {
          if (rel === "404.html") continue; // special menu (disabled links)
          const abs = path.join(ROOT, rel), o = fs.readFileSync(abs, "utf8"), url = urlOf(rel);
          const segs = url.replace(/^\/+|\/+$/g, "").split("/"), alts = [reEsc(url)]; if (segs.length > 1) alts.push(reEsc("/" + segs[0] + "/"));
          const dd = d.replace(new RegExp('<a\\b(?![^>]*class="mega-project")([^>]*\\bhref="(?:' + alts.join("|") + ')")', "g"), (m, a) => "<a" + a + ' aria-current="page"');
          const cta = /<a class="mobile-primary" href="([^"]*)"/.exec(o); const mm = cta ? mob.replace(/(<a class="mobile-primary" href=")[^"]*"/, (m, a) => a + cta[1] + '"') : mob;
          const h = o.replace(/<nav class="desktop-nav"[\s\S]*?<\/nav>/, () => dd).replace(/<nav class="mobile-panel"[\s\S]*?<\/nav>/, () => mm);
          if (h !== o) { backupPage(rel); fs.writeFileSync(abs, h); n++; }
        }
        log(db, u, "global.menu", n + " pages", ip); return done({ ok: true, changed: n });
      }
      case "chrome_versions": { need(["owner", "admin"]); return done({ ok: true, versions: jr(CHROME, []) }); }
      case "chrome_save": {
        const u = need(["owner", "admin"]), data = inp.data;
        if (!data || typeof data !== "object") throw new Fail("Nothing to save");
        if (JSON.stringify(data).length > 200000) throw new Fail("Too large");
        const v = jr(CHROME, []); v.unshift({ t: Math.floor(Date.now() / 1000), by: u.name || u.email || "", note: String(inp.note || "").slice(0, 120), data });
        jw(CHROME, v.slice(0, 10)); return done({ ok: true, versions: v.slice(0, 10) });
      }
      case "global_chrome": {
        const u = need(["owner", "admin"]), brand = String(inp.brand || ""), cta = String(inp.cta_label || "").trim(), foot = String(inp.footer || ""), introAll = !!inp.intro_all;
        if (unsafe(brand) || unsafe(foot) || unsafe(cta)) throw new Fail("Scripts are not allowed");
        if (brand && !/^<a class="brand"[^>]*>[\s\S]*<\/a>$/.test(brand)) throw new Fail("Invalid logo HTML");
        if (foot && !/^<footer class="footer">[\s\S]*<\/footer>$/.test(foot)) throw new Fail("Invalid footer HTML");
        if (cta.length > 40) throw new Fail("Button text is too long");
        const escH = (x) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        let n = 0;
        for (const rel of allPages()) {
          if (rel === "404.html") continue;
          const abs = path.join(ROOT, rel), o = fs.readFileSync(abs, "utf8"), url = urlOf(rel); let h = o;
          if (brand) { const b = url === "/" ? brand.replace(/^<a class="brand"/, '<a class="brand" aria-current="page"') : brand; h = h.replace(/<a class="brand"[^>]*>[\s\S]*?<\/a>/, () => b); }
          if (cta) h = h.replace(/(<a class="header-cta"[^>]*>\s*<span class="header-cta-label">)[\s\S]*?(<\/span>)/, (m, a, c) => a + escH(cta) + c);
          const old = foot && /<footer class="footer">[\s\S]*?<\/footer>/.exec(h);
          if (old) {
            let f = foot;
            for (const id of ["footer-process", "footer-services", "footer-faq"]) { const m = new RegExp('<a id="' + id + '" href="([^"]*)"').exec(old[0]); if (m) f = f.replace(new RegExp('(<a id="' + id + '" href=")[^"]*"'), (x, a) => a + m[1] + '"'); }
            if (!introAll) { const it = /<div class="footer-intro">[\s\S]*?<\/a><\/div>/.exec(old[0]); if (it) f = f.replace(/<div class="footer-intro">[\s\S]*?<\/a><\/div>/, () => it[0]); }
            f = f.replace(/(id="footer-cta" href=")\/#([a-z0-9-]+)"/g, (m, a, id) => (h.includes('id="' + id + '"') ? a + "#" + id + '"' : m));
            h = h.replace(/<footer class="footer">[\s\S]*?<\/footer>/, () => f);
          }
          if (h !== o) { backupPage(rel); fs.writeFileSync(abs, h); n++; }
        }
        log(db, u, "global.chrome", n + " pages", ip); return done({ ok: true, changed: n });
      }
      case "global_replace": {
        const u = need(["owner", "admin"]), find = String(inp.find || ""), rep = String(inp.replace || ""), dry = !!inp.dry;
        const scope = (inp.scope || []).filter((k) => PATS[k]);
        if (find.length < 2) throw new Fail("Type at least 2 characters to find"); if (!scope.length) throw new Fail("Choose where to search");
        if (unsafe(rep)) throw new Fail("Scripts are not allowed");
        const res = []; let total = 0;
        for (const rel of allPages()) {
          const abs = path.join(ROOT, rel); let h = fs.readFileSync(abs, "utf8"), cnt = 0;
          const spans = scope.map((k) => { const m = PATS[k].exec(h); return m ? [m.index, m[0].length] : null; }).filter(Boolean).sort((a, b) => b[0] - a[0]);
          for (const [off, len] of spans) { const part = h.substr(off, len), c = part.split(find).length - 1; if (c) { cnt += c; h = h.slice(0, off) + part.split(find).join(rep) + h.slice(off + len); } }
          if (cnt) { res.push({ path: rel, count: cnt }); total += cnt; if (!dry) { backupPage(rel); fs.writeFileSync(abs, h); } }
        }
        if (!dry && total) log(db, u, "global.replace", `"${find.slice(0, 60)}" → "${rep.slice(0, 60)}" (${res.length} pages)`, ip);
        return done({ ok: true, pages: res, total, dry });
      }
    }
    return null;
  }

  // =================================================================== A4 — forms, leads, pipeline, clients, alerts
  const STAGES = ["new", "contacted", "visit", "quote", "hold", "won", "lost"];
  const SOURCES = { contact: "Contact form", estimator: "Cost estimator", brief: "3D brief", "fitout-hub": "Fit-out quote", "office-fitout": "Office fit-out quote", whatsapp: "WhatsApp widget", chat: "Live chat", manual: "Added by team", import: "CSV import" };
  const CRM = path.join(PRIV, "crm.json"), OUTBOX = path.join(PRIV, "outbox.jsonl");
  const OFFERS = path.join(PRIV, "offers.json");
  const GSA = path.join(PRIV, "google-sa.json");
  const crmCfg = () => Object.assign({ emailOn: false, emailTo: "", smtpHost: "", smtpPort: 465, smtpUser: "", smtpPass: "", smtpFrom: "", waOn: false, waToken: "", waPhoneId: "", waTo: "", waTemplate: "", waLang: "en", tsSite: "", tsSecret: "" }, jr(CRM, {}));
  const SECRETS = ["smtpPass", "waToken", "tsSecret"];
  const cfgPub = (c) => { const o = { ...c }; SECRETS.forEach((k) => { o[k + "Set"] = !!c[k]; o[k] = ""; }); return o; };
  const clip = (v, n = 500) => String(v == null ? "" : v).trim().slice(0, n);
  const formHits = new Map();
  const ensureCrm = (db) => { db.leads = db.leads || []; db.clients = db.clients || []; db.seqL = db.seqL || 0; db.seqC = db.seqC || 0; };
  function leadText(l) {
    const f = Object.entries(l.fields || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
    return `New enquiry #${l.id} — ${SOURCES[l.source] || l.source}\nName: ${l.name}\nPhone: ${l.phone}${l.email ? "\nEmail: " + l.email : ""}${l.service ? "\nService: " + l.service : ""}${l.message ? "\nMessage: " + l.message : ""}${f ? "\n" + f : ""}\nPage: ${l.page || "-"}`;
  }
  async function sendAlerts(l, only) {
    const c = crmCfg(), res = {}, text = leadText(l);
    if ((only ? only === "email" : c.emailOn) && c.emailTo) {
      // preview server: no SMTP — write to the outbox file instead (api/forms.php sends real mail on Hostinger)
      fs.appendFileSync(OUTBOX, JSON.stringify({ t: now(), channel: "email", to: c.emailTo, subject: `New enquiry #${l.id}: ${l.name}`, text }) + "\n"); res.email = "queued (preview outbox)";
    }
    if ((only ? only === "whatsapp" : c.waOn) && c.waToken && c.waPhoneId && c.waTo) {
      for (const to of c.waTo.split(/[\s,]+/).filter(Boolean)) {
        const body = c.waTemplate ? { messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "template", template: { name: c.waTemplate, language: { code: c.waLang || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: `#${l.id} ${l.name}` }, { type: "text", text: l.phone }, { type: "text", text: (SOURCES[l.source] || l.source) + (l.service ? " · " + l.service : "") }] }] } }
          : { messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text.slice(0, 4000) } };
        try { const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(c.waPhoneId)}/messages`, { method: "POST", headers: { Authorization: "Bearer " + c.waToken, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
          const j = await r.json().catch(() => ({})); res.whatsapp = r.ok ? "sent" : "failed: " + ((j.error && j.error.message) || r.status);
        } catch (e) { res.whatsapp = "failed: " + (e.name === "TimeoutError" ? "no response from Meta" : e.message); }
        fs.appendFileSync(OUTBOX, JSON.stringify({ t: now(), channel: "whatsapp", to, result: res.whatsapp }) + "\n");
      }
    }
    return res;
  }
  const leadPub = (l, db) => ({ ...l, assigned_name: l.assigned_to ? ((db.users.find((u) => u.id === l.assigned_to) || {}).name || "") : "" });
  /** public endpoint: /api/forms.php */
  async function formsApi(req, inp) {
    const c = crmCfg();
    if (inp.action === "config") return { ok: true, turnstile: c.tsSite || "" };
    if (inp.action === "wa_click") {
      const f = path.join(PRIV, "wa-stats.json"), st = jr(f, {}), d = new Date().toISOString().slice(0, 10);
      st.days = st.days || {}; st.days[d] = (st.days[d] || 0) + 1;
      for (const [k, v] of [["pages", String(inp.page || "/").replace(/[^a-z0-9/_-]/gi, "").slice(0, 120) || "/"], ["services", String(inp.service || "").replace(/[^\w &/-]/g, "").slice(0, 60)]]) { st[k] = st[k] || {}; if (v && (st[k][v] || Object.keys(st[k]).length < 300)) st[k][v] = (st[k][v] || 0) + 1; }
      jw(f, st); return { ok: true };
    }
    const ip = req.socket.remoteAddress || "";
    if (clip(inp._hp) || clip(inp.company_hp)) return { ok: true, id: 0 }; // bot: pretend success
    const h = (formHits.get(ip) || []).filter((t) => Date.now() - t < 600000); if (h.length >= 5) throw new Fail("Too many enquiries from this connection. Please WhatsApp us instead.", 429); h.push(Date.now()); formHits.set(ip, h);
    if (c.tsSecret && inp.form !== "whatsapp") {
      const tok = clip(inp["cf-turnstile-response"] || inp.turnstile, 2048); if (!tok) throw new Fail("Please complete the spam check", 400);
      try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret: c.tsSecret, response: tok, remoteip: ip }), signal: AbortSignal.timeout(6000) }); const j = await r.json(); if (!j.success) throw new Fail("Spam check failed — please try again", 400); }
      catch (e) { if (e instanceof Fail) throw e; /* Cloudflare unreachable: accept rather than lose the lead */ }
    }
    const name = clip(inp.name, 120), phone = clip(inp.phone, 40), email = clip(inp.email, 190);
    if (name.length < 2) throw new Fail("Please enter your name");
    if (!/^[+\d][\d\s()-]{6,}$/.test(phone)) throw new Fail("Please enter a valid phone number");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Fail("Please check your email address");
    const source = Object.prototype.hasOwnProperty.call(SOURCES, inp.form) && !["manual", "import"].includes(inp.form) ? inp.form : "contact";
    const skip = new Set(["action", "form", "name", "phone", "email", "message", "service", "page", "_hp", "company_hp", "cf-turnstile-response", "turnstile"]), fields = {};
    for (const [k, v] of Object.entries(inp)) if (!skip.has(k) && /^[a-z0-9_ -]{1,40}$/i.test(k) && v !== "" && v != null && Object.keys(fields).length < 25) fields[k] = clip(v, 1000);
    const db = load(); if (!db) throw new Fail("Enquiries are not available right now. Please WhatsApp us.", 503); ensureCrm(db);
    const l = { id: ++db.seqL, created_at: now(), source, page: clip(inp.page, 200), name, phone, email, service: clip(inp.service, 120), message: clip(inp.message, 4000), fields, stage: "new", assigned_to: null, followup: "", value: 0, lost_reason: "", client_id: null, tags: [], notes: [], read: false, ip };
    db.leads.push(l); save(db);
    sendAlerts(l).catch(() => {});
    return { ok: true, id: l.id };
  }
  const leadFind = (db, id) => { const l = db.leads.find((x) => x.id === +id); if (!l) throw new Fail("Enquiry not found", 404); return l; };
  const SALES = ["owner", "admin", "sales"];
  async function a4(action, inp, need, db, ip) {
    if (!/^(leads?_|clients?_|crm_|gdata_)/.test(action)) return null;
    ensureCrm(db); const done = (o) => { save(db); return o; };
    switch (action) {
      case "leads_list": { need(SALES); return { ok: true, leads: db.leads.slice().reverse().map((l) => leadPub(l, db)), stages: STAGES, sources: SOURCES, team: db.users.filter((u) => u.active && SALES.includes(u.role)).map((u) => ({ id: u.id, name: u.name })) }; }
      case "leads_count": { need(); return { ok: true, unread: db.leads.filter((l) => !l.read).length }; }
      case "lead_save": {
        const u = need(SALES); let l;
        if (inp.id) l = leadFind(db, inp.id);
        else { const name = clip(inp.name, 120); if (!name) throw new Fail("Name is required"); l = { id: ++db.seqL, created_at: now(), source: "manual", page: "", name, phone: "", email: "", service: "", message: "", fields: {}, stage: "new", assigned_to: null, followup: "", value: 0, lost_reason: "", client_id: null, tags: [], notes: [], read: true }; db.leads.push(l); }
        const before = l.stage;
        ["name", "phone", "email", "service", "message", "lost_reason"].forEach((k) => { if (k in inp) l[k] = clip(inp[k], k === "message" ? 4000 : 190); });
        if ("stage" in inp) { if (!STAGES.includes(inp.stage)) throw new Fail("Unknown stage"); l.stage = inp.stage; }
        if ("assigned_to" in inp) { const a = +inp.assigned_to || null; if (a && !db.users.some((x) => x.id === a)) throw new Fail("Unknown team member"); l.assigned_to = a; }
        if ("followup" in inp) { const f = clip(inp.followup, 10); if (f && !/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new Fail("Follow-up must be a date"); l.followup = f; }
        if ("value" in inp) l.value = Math.max(0, Math.round(+inp.value || 0));
        if ("tags" in inp) l.tags = (Array.isArray(inp.tags) ? inp.tags : String(inp.tags).split(",")).map((t) => clip(t, 30).toLowerCase()).filter(Boolean).slice(0, 10);
        if ("read" in inp) l.read = !!inp.read;
        s17LeadExtra(l, inp, db);
        if (before !== l.stage) l.notes.push({ t: now(), user: u.name, text: `Stage: ${before} → ${l.stage}`, sys: true });
        log(db, u, inp.id ? "lead.update" : "lead.create", `#${l.id} ${l.name}${before !== l.stage ? " → " + l.stage : ""}`, ip);
        return done({ ok: true, lead: leadPub(l, db) });
      }
      case "lead_note": { const u = need(SALES), l = leadFind(db, inp.id), text = clip(inp.text, 2000); if (!text) throw new Fail("Write a note first"); l.notes.push({ t: now(), user: u.name, text }); log(db, u, "lead.note", `#${l.id}`, ip); return done({ ok: true, lead: leadPub(l, db) }); }
      case "lead_delete": { const u = need(["owner", "admin"]), l = leadFind(db, inp.id); db.leads = db.leads.filter((x) => x !== l); log(db, u, "lead.delete", `#${l.id} ${l.name}`, ip); return done({ ok: true }); }
      case "leads_import": {
        const u = need(["owner", "admin"]), rows = Array.isArray(inp.rows) ? inp.rows.slice(0, 2000) : []; let n = 0;
        for (const r of rows) { const name = clip(r.name, 120); if (!name) continue; const st = STAGES.includes(String(r.stage || "").toLowerCase()) ? String(r.stage).toLowerCase() : "new";
          db.leads.push({ id: ++db.seqL, created_at: /^\d{4}-\d{2}-\d{2}/.test(r.created_at || "") ? clip(r.created_at, 19) : now(), source: "import", page: "", name, phone: clip(r.phone, 40), email: clip(r.email, 190), service: clip(r.service, 120), message: clip(r.message, 4000), fields: {}, stage: st, assigned_to: null, followup: "", value: Math.max(0, Math.round(+r.value || 0)), lost_reason: "", client_id: null, tags: [], notes: [], read: true }); n++; }
        log(db, u, "lead.import", n + " rows", ip); return done({ ok: true, imported: n });
      }
      case "lead_convert": {
        const u = need(SALES), l = leadFind(db, inp.id);
        if (l.client_id && db.clients.some((c) => c.id === l.client_id)) return { ok: true, client_id: l.client_id };
        let c = db.clients.find((x) => (l.phone && x.phone.replace(/\D/g, "") === l.phone.replace(/\D/g, "")) || (l.email && x.email === l.email));
        if (!c) { c = { id: ++db.seqC, name: l.name, phone: l.phone, email: l.email, company: "", city: "Lahore", address: "", notes: "", created_at: now() }; db.clients.push(c); }
        l.client_id = c.id; if (!["won", "lost"].includes(l.stage)) { l.notes.push({ t: now(), user: u.name, text: `Stage: ${l.stage} → won`, sys: true }); l.stage = "won"; }
        log(db, u, "client.create", `${c.name} (from #${l.id})`, ip); return done({ ok: true, client_id: c.id });
      }
      case "clients_list": { need(SALES); return { ok: true, clients: db.clients.slice().reverse().map((c) => { const ls = db.leads.filter((l) => l.client_id === c.id); return { ...c, leads: ls.map((l) => ({ id: l.id, stage: l.stage, service: l.service, value: l.value, created_at: l.created_at })), value: ls.filter((l) => l.stage === "won").reduce((a, l) => a + (l.value || 0), 0) }; }) }; }
      case "client_save": {
        const u = need(SALES), name = clip(inp.name, 120); if (!name) throw new Fail("Name is required");
        let c = inp.id ? db.clients.find((x) => x.id === +inp.id) : null; if (inp.id && !c) throw new Fail("Client not found", 404);
        if (!c) { c = { id: ++db.seqC, created_at: now() }; db.clients.push(c); }
        Object.assign(c, { name, phone: clip(inp.phone, 40), email: clip(inp.email, 190), company: clip(inp.company, 120), city: clip(inp.city, 80), address: clip(inp.address, 300), notes: clip(inp.notes, 4000) }); s17ClientExtra(c, inp);
        log(db, u, inp.id ? "client.update" : "client.create", c.name, ip); return done({ ok: true, client: c });
      }
      case "client_delete": { const u = need(["owner", "admin"]), c = db.clients.find((x) => x.id === +inp.id); if (!c) throw new Fail("Client not found", 404); db.clients = db.clients.filter((x) => x !== c); db.leads.forEach((l) => { if (l.client_id === c.id) l.client_id = null; }); log(db, u, "client.delete", c.name, ip); return done({ ok: true }); }
      case "gdata_status": { need(["owner", "admin", "sales", "editor"]); const c = jr(GSA, {}); return { ok: true, connected: !!c.email, email: c.email || "", ga4: c.ga4 || "", gsc: c.gsc || "" }; }
      case "gdata_save": { need(["owner", "admin"]); const c = jr(GSA, {});
        if (inp.keyJson) { let k; try { k = JSON.parse(inp.keyJson); } catch { k = null; } if (!k || k.type !== "service_account" || !k.client_email || !k.private_key) throw new Fail('This is not a service-account key file (it must contain "type": "service_account")'); c.email = k.client_email; }
        if ("ga4" in inp) c.ga4 = String(inp.ga4 || "").replace(/\D/g, ""); if ("gsc" in inp) { const g = String(inp.gsc || "").trim(); if (g && !/^(sc-domain:[a-z0-9.-]+|https?:\/\/\S+\/)$/i.test(g)) throw new Fail("Search Console property: use sc-domain:woodex.com.pk or https://woodex.com.pk/ (with the ending /)"); c.gsc = g; }
        jw(GSA, c); return { ok: true, connected: !!c.email, email: c.email || "", ga4: c.ga4, gsc: c.gsc }; }
      case "gdata_clear": { need(["owner", "admin"]); try { fs.unlinkSync(GSA); } catch {} return { ok: true }; }
      case "gdata_report": { need(["owner", "admin", "sales", "editor"]); const c = jr(GSA, {}); if (!c.email) return { ok: true, connected: false };
        const days = [7, 28, 90].includes(+inp.days) ? +inp.days : 28; let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        const daily = [], sd = []; for (let i = days; i >= 1; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); const u = Math.round(40 + rnd() * 60 + (days - i) * 0.6); daily.push({ date: d, users: u, sessions: Math.round(u * 1.3), views: Math.round(u * 2.6) }); sd.push({ date: d, clicks: Math.round(u * 0.35), impressions: Math.round(u * 9) }); }
        const sum = (a, k) => a.reduce((t, x) => t + x[k], 0), cl = sum(sd, "clicks"), im = sum(sd, "impressions");
        return { ok: true, connected: true, cached: false, preview: true, days, at: new Date().toISOString(),
          ga4: c.ga4 ? { daily, totals: { users: sum(daily, "users"), sessions: sum(daily, "sessions"), views: sum(daily, "views") }, pages: [["/", 1240], ["/renovation/", 610], ["/interior-design/", 480], ["/projects/", 390], ["/contact/", 250]].map(([p, v]) => ({ path: p, views: v })), sources: [["Organic Search", 820], ["Direct", 510], ["Organic Social", 260], ["Referral", 90]].map(([n, v]) => ({ name: n, sessions: v })) } : { error: "Add your GA4 Property ID (Analytics → Admin → Property details)." },
          gsc: c.gsc ? { daily: sd, totals: { clicks: cl, impressions: im, ctr: Math.round(cl / im * 1000) / 10, position: 14.2 }, queries: [["interior designer lahore", 120, 2100, 6.1], ["woodex interior", 95, 300, 1.2], ["home renovation lahore", 40, 1800, 11.4], ["office fit out lahore", 22, 900, 9.8]].map(([q, a, b, p]) => ({ q, clicks: a, impressions: b, position: p })) } : { error: "Add your Search Console property (e.g. sc-domain:woodex.com.pk)." } }; }
      case "crm_wa_status": { need(["owner", "admin"]); const c = crmCfg(); if (!c.waToken || !c.waPhoneId) return { ok: true, connected: false };
        return { ok: true, connected: true, info: { ok: true, number: "+92 300 1234567 (preview)", name: "Woodex Interior", quality: "GREEN" } }; }
      case "crm_wa_connect": { const u = need(["owner", "admin"]); const c = crmCfg(); const tok = String(inp.token || "").trim() || c.waToken, pid = String(inp.phoneId || "").replace(/\D/g, "");
        if (!tok || !pid) throw new Fail("Enter the access token and the Phone number ID"); if (tok === "bad") throw new Fail("Meta did not accept this: Invalid OAuth access token");
        c.waToken = tok; c.waPhoneId = pid; jw(CRM, c); log(db, u, "settings.wa", pid, ip); return done({ ok: true, info: { ok: true, number: "+92 300 1234567 (preview)", name: "Woodex Interior" } }); }
      case "crm_wa_disconnect": { const u = need(["owner", "admin"]); const c = crmCfg(); c.waToken = ""; c.waPhoneId = ""; c.waOn = false; jw(CRM, c); return done({ ok: true }); }
      case "crm_offers": { need(SALES); const c = crmCfg(); return { ok: true, offers: jr(OFFERS, {}).offers || [], waConnected: !!(c.waToken && c.waPhoneId) }; }
      case "crm_offer_save": { const u = need(["owner", "admin"]); const d = jr(OFFERS, {}); const list = d.offers || []; const id = String(inp.id || "") || crypto.randomBytes(4).toString("hex");
        const o = { id, title: clip(inp.title, 80), code: String(inp.code || "").replace(/[^A-Za-z0-9-]/g, "").toUpperCase(), percent: Math.max(0, Math.min(90, +inp.percent || 0)), expires: /^\d{4}-\d{2}-\d{2}$/.test(inp.expires || "") ? inp.expires : "", msg: clip(inp.msg, 1000), sent: 0 };
        if (!o.title || !o.msg) throw new Fail("Enter a title and the message"); const i = list.findIndex(x => x.id === id); if (i >= 0) { o.sent = list[i].sent || 0; list[i] = o; } else list.push(o);
        d.offers = list; jw(OFFERS, d); return done({ ok: true, offers: list }); }
      case "crm_offer_delete": { need(["owner", "admin"]); const d = jr(OFFERS, {}); d.offers = (d.offers || []).filter(x => x.id !== String(inp.id || "")); jw(OFFERS, d); return done({ ok: true, offers: d.offers }); }
      case "crm_offer_send": { const u = need(SALES); const d = jr(OFFERS, {}); const off = (d.offers || []).find(x => x.id === String(inp.id || "")); if (!off) throw new Fail("Offer not found", 404);
        if (off.expires && off.expires < new Date().toISOString().slice(0, 10)) throw new Fail("This offer has expired — change the date first");
        const ids = (inp.leads || []).slice(0, 50).map(Number); if (!ids.length) throw new Fail("Choose at least one lead"); const c = crmCfg(); let sent = 0; const results = [];
        for (const id of ids) { const l = (db.leads || []).find(x => x.id === id); if (!l) continue; const first = String(l.name || "").trim().split(" ")[0] || "there";
          const txt = off.msg.replace(/\{name\}/g, first).replace(/\{code\}/g, off.code).replace(/\{percent\}/g, off.percent).replace(/\{expires\}/g, off.expires);
          const link = l.phone ? "https://wa.me/" + String(l.phone).replace(/\D/g, "") + "?text=" + encodeURIComponent(txt) : "";
          const err = !l.phone ? "no phone number" : !(c.waToken && c.waPhoneId) ? "WhatsApp is not connected (Settings → Integrations)" : "";
          if (!err) { sent++; l.notes.push({ t: now(), user: u.name, text: "Offer sent on WhatsApp: " + off.title }); } results.push({ id, name: l.name, ok: !err, error: err, link }); }
        off.sent = (off.sent || 0) + sent; jw(OFFERS, d); return done({ ok: true, sent, results }); }
      case "crm_settings": { need(["owner", "admin"]); return { ok: true, settings: cfgPub(crmCfg()) }; }
      case "crm_settings_save": {
        const u = need(["owner", "admin"]), c = crmCfg(), s = inp.settings || {};
        for (const k of Object.keys(c)) { if (!(k in s)) continue; if (SECRETS.includes(k) && s[k] === "" && !s[k + "Clear"]) continue; c[k] = typeof c[k] === "boolean" ? !!s[k] : k === "smtpPort" ? (+s[k] || 465) : clip(s[k], 600); }
        if (c.emailTo && c.emailTo.split(/[\s,]+/).filter(Boolean).some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) throw new Fail("Check the alert email address(es)");
        jw(CRM, c); log(db, u, "settings.crm", "", ip); return done({ ok: true, settings: cfgPub(c) });
      }
      case "crm_test": {
        need(["owner", "admin"]); const ch = inp.channel === "whatsapp" ? "whatsapp" : "email", c = crmCfg();
        if (ch === "email" && !c.emailTo) throw new Fail("Add an alert email address first");
        if (ch === "whatsapp" && !(c.waToken && c.waPhoneId && c.waTo)) throw new Fail("Add the WhatsApp token, phone number ID and recipient first");
        const r = await sendAlerts({ id: 0, source: "manual", name: "Test enquiry", phone: "+92 300 0000000", email: "", service: "Test", message: "This is a test alert from Woodex Admin.", fields: {}, page: "/admin/" }, ch);
        const v = r[ch] || "not sent"; if (/^failed/.test(v)) throw new Fail(v); return { ok: true, result: v };
      }
    }
    return null;
  }

  // =================================================================== A5 — templates, quotations, invoices, payments, projects
  const UNITS = ["sft", "rft", "sqmt", "nos", "each", "set", "point", "job", "lumpsum"];
  const QSTATUS = ["draft", "sent", "approved", "rejected", "superseded", "invoiced"];
  const PSTAGES = ["planning", "design", "procurement", "execution", "finishing", "handover", "completed"];
  const COMPANY = path.join(PRIV, "company.json");
  const companyCfg = () => Object.assign({ name: "Woodex Interior", tagline: "Design · Build · Furniture", address: "M-71, Zainab Tower, Model Town Link Road, Lahore", phones: "+92 322 4000768 · +92 321 4686884", email: "info@woodex.com.pk", web: "woodex.com.pk", ntn: "", bankName: "", bankTitle: "", bankAccount: "", bankIban: "", prefix: "WI-", nextNo: 10100, validDays: 15, consultant: "Woodex Interior" }, jr(COMPANY, {}));
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const r2 = (n) => Math.round(n * 100) / 100;
  function cleanSections(sections) {
    if (!Array.isArray(sections)) return [];
    return sections.slice(0, 40).map((s) => ({
      name: clip(s && s.name, 80) || "Section", note: clip(s && s.note, 600),
      items: (Array.isArray(s && s.items) ? s.items : []).slice(0, 300).map((it) => {
        const qty = num(it.qty), rate = num(it.rate), unit = UNITS.includes(String(it.unit || "").toLowerCase()) ? String(it.unit).toLowerCase() : "job";
        return { desc: clip(it.desc, 600), qty, unit, rate, amount: r2(qty * rate) };
      }).filter((it) => it.desc),
    }));
  }
  function totals(doc) {
    let sub = 0; doc.sections.forEach((s) => { s.subtotal = r2(s.items.reduce((a, it) => a + it.amount, 0)); sub += s.subtotal; });
    doc.subtotal = Math.round(sub); doc.discount = Math.min(Math.round(num(doc.discount)), doc.subtotal); doc.taxPct = Math.min(num(doc.taxPct), 50);
    doc.tax = Math.round((doc.subtotal - doc.discount) * doc.taxPct / 100); doc.total = doc.subtotal - doc.discount + doc.tax; return doc;
  }
  const ensureA5 = (db) => { ensureCrm(db); ["tpls", "quotes", "invoices", "projects"].forEach((k) => { db[k] = db[k] || []; }); ["seqT", "seqQ", "seqI", "seqP", "seqPay"].forEach((k) => { db[k] = db[k] || 0; }); };
  const clientOf = (inp) => ({ name: clip(inp.name, 120), phone: clip(inp.phone, 40), email: clip(inp.email, 190), address: clip(inp.address, 300), company: clip(inp.company, 120) });
  const qViewTok = (q) => hmac("qv|" + q.id + "|" + q.no).slice(0, 32);
  const qViewUrl = (q, host) => (host ? "https://" + String(host).replace(/[^a-z0-9.\-:]/gi, "") : "") + "/api/quote-view.php?id=" + q.id + "&t=" + qViewTok(q);
  const qLabel = (q) => q.no + (q.version > 1 ? " · V" + q.version : "") + (q.option ? " · " + q.option : "");
  const invPub = (i) => { const paid = i.payments.reduce((a, p) => a + p.amount, 0); return { ...i, paid, balance: Math.max(0, i.total - paid), payStatus: paid <= 0 ? "unpaid" : paid >= i.total ? "paid" : "partial", overdue: paid < i.total && i.due_date && i.due_date < now().slice(0, 10) }; };
  // ---- P17 S1+S2 mirror of api/sales17-lib.php
  const S17 = { lines: { furniture: "Furniture", interior: "Interior", project: "Project" }, leadTypes: { new: "New lead", returning: "Returning client", referral: "Referral" },
    quoteStatus: { "": "—", pending: "Pending", proposal: "Proposal / Quotation", done: "Done" }, nextTypes: { call: "Call", whatsapp: "WhatsApp", visit: "Site visit", meeting: "Meeting", email: "Email" },
    clientTypes: { individual: "Individual", company: "Company", developer: "Developer / builder", architect: "Architect / consultant" },
    projectTypes: ["Kitchen", "Wardrobe", "Full home", "Office", "Retail / showroom", "Restaurant / café", "Clinic / pharmacy", "Renovation", "Architecture", "3D design", "Furniture supply", "Other"] };
  const s17dt = (v) => { v = String(v || "").trim(); if (!v) return ""; const t = new Date(v.replace(" ", "T")); if (isNaN(t)) throw new Fail(`Check the date / time "${v.slice(0, 30)}"`); const p = (n) => String(n).padStart(2, "0"); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:00`; };
  const s17dig = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.length === 11 && d[0] === "0") d = "92" + d.slice(1); else if (d.length === 10 && d[0] === "3") d = "92" + d; return d; };
  function s17LeadExtra(l, inp, db) {
    for (const [k, n] of Object.entries({ company: 120, designation: 80, location: 160, project_type: 60, budget: 60, area: 30 })) if (k in inp) l[k] = clip(inp[k], n);
    const en = { line: Object.keys(S17.lines), lead_type: Object.keys(S17.leadTypes), quote_status: Object.keys(S17.quoteStatus), next_type: Object.keys(S17.nextTypes), priority: ["low", "normal", "high"] };
    for (const [k, ok] of Object.entries(en)) if (k in inp) { const v = String(inp[k] || ""); if (v && !ok.includes(v)) throw new Fail("Unknown " + k.replace("_", " ")); l[k] = v; }
    if ("next_at" in inp) { l.next_at = s17dt(inp.next_at); l.followup = l.next_at.slice(0, 10); }
    if ("last_contact" in inp) l.last_contact = s17dt(inp.last_contact);
    if (inp.client_id) { if (!db.clients.some((c) => c.id === +inp.client_id)) throw new Fail("Client not found", 404); l.client_id = +inp.client_id; }
  }
  function s17ClientExtra(c, inp) {
    c.updated_at = now(); for (const k of ["designation", "source"]) if (k in inp) c[k] = clip(inp[k], 80);
    if ("type" in inp) { if (inp.type && !S17.clientTypes[inp.type]) throw new Fail("Unknown client type"); c.type = inp.type || ""; }
    if ("line" in inp) { if (inp.line && !S17.lines[inp.line]) throw new Fail("Unknown business line"); c.line = inp.line || ""; }
    if ("tags" in inp) c.tags = (Array.isArray(inp.tags) ? inp.tags : String(inp.tags).split(",")).map((t) => clip(t, 30).toLowerCase()).filter(Boolean).slice(0, 12);
  }
  const s17Status = (iv, pp, ls) => { const open = pp.filter((p) => !["handover", "done", "closed"].includes(p.stage)), bal = iv.reduce((a, i) => a + i.balance, 0), won = ls.filter((l) => l.stage === "won").length;
    if (iv.length >= 2 || won >= 2) return "returning"; if (open.length || bal > 0 || (iv.length === 1 && new Date(iv[0].issue_date) > Date.now() - 90 * 864e5)) return "active"; if (!iv.length && !won) return "prospect"; return "past"; };
  function s17Docs(db, c) { const d = s17dig(c.phone), mine = (x) => +x.client_id === c.id || (d.length >= 10 && s17dig((x.client || {}).phone) === d);
    return [(db.quotes || []).filter(mine), (db.invoices || []).filter(mine).map(invPub), (db.projects || []).filter((p) => +p.client_id === c.id)]; }
  const s17InvNo = (line) => { if (line !== "furniture") { const c = companyCfg(), no = c.prefix + c.nextNo; c.nextNo++; jw(COMPANY, c); return no; } const c = jr(COMPANY, {}), n = Math.max(10050, +c.wfNext || 10050); c.wfNext = n + 1; jw(COMPANY, c); return (c.wfPrefix || "WF-") + n; };
  const s17InvRow = (x) => { const i = invPub(x), t = now().slice(0, 10); const r = { ...i, track: i.total > 0 && i.balance <= 0 ? "paid" : i.mode === "after_delivery" && !i.delivered ? "after_delivery" : i.paid > 0 ? "partial" : "unpaid", late: !!(i.delivery_date && !i.delivered && i.delivery_date < t) };
    ["po", "delivery_date", "line", "mode", "track_note", "delivered"].forEach((k) => { r[k] = String(r[k] || ""); }); r.company = (i.client && (i.client.company || i.client.name)) || ""; delete r.sections; return r; };
  function s17InvClient(db, inp) {
    let cid = +inp.client_id || 0; const ic = inp.client || {}, cl = { name: clip(ic.name, 120), company: clip(ic.company, 120), phone: clip(ic.phone, 40), email: clip(ic.email, 190), address: clip(ic.address, 300) };
    if (cid) { const c = db.clients.find((x) => x.id === cid); if (!c) throw new Fail("Client not found", 404); for (const k in cl) if (!cl[k]) cl[k] = c[k] || ""; }
    if (!cl.name) cl.name = cl.company; if (!cl.name) throw new Fail("Pick a client or type the company name");
    if (!cid) { const d = s17dig(cl.phone); const c = db.clients.find((x) => (d.length >= 10 && s17dig(x.phone) === d) || (cl.company && String(x.company || "").toLowerCase() === cl.company.toLowerCase()));
      if (c) cid = c.id; else { const n = { id: ++db.seqC, name: cl.name, phone: cl.phone, email: cl.email, company: cl.company, city: "Lahore", address: cl.address, notes: "", created_at: now() }; db.clients.push(n); cid = n.id; } }
    return [cid, cl];
  }
  async function a17(action, inp, need, db, ip) {
    if (!["lead_activity", "leads_followups", "leads_stats", "leads_import2", "clients_master", "client_360", "clients_merge", "s17_meta", "inv_new", "inv_track", "invs_tracker", "invs_import"].includes(action)) return null;
    ensureCrm(db); const done = (o) => { save(db); return o; };
    switch (action) {
      case "s17_meta": need(SALES); return { ok: true, ...S17 };
      case "lead_activity": {
        const u = need(SALES), l = leadFind(db, inp.id), k = String(inp.kind || "note"); if (!["call", "whatsapp", "visit", "meeting", "email", "note"].includes(k)) throw new Fail("Unknown activity type");
        const text = clip(inp.text, 2000), out = clip(inp.outcome, 190); if (!text && !out) throw new Fail("Write what happened");
        l.notes.push({ t: now(), user: u.name, text: text || out, kind: k, outcome: out }); l.read = true;
        if (k !== "note") { l.last_contact = now(); if (l.stage === "new") { l.notes.push({ t: now(), user: u.name, text: "Stage: new → contacted", sys: true }); l.stage = "contacted"; } }
        if ("next_at" in inp) { l.next_at = s17dt(inp.next_at); l.followup = l.next_at.slice(0, 10); l.next_type = l.next_at ? (S17.nextTypes[inp.next_type] ? inp.next_type : "call") : ""; }
        if (inp.stage && STAGES.includes(inp.stage) && inp.stage !== l.stage) { l.notes.push({ t: now(), user: u.name, text: `Stage: ${l.stage} → ${inp.stage}`, sys: true }); l.stage = inp.stage; }
        log(db, u, "lead.activity", `#${l.id} ${k}`, ip); return done({ ok: true, lead: leadPub(l, db) });
      }
      case "leads_followups": {
        need(SALES); const n = now(), today = n.slice(0, 10), wk = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) + " 23:59:59", g = { overdue: [], today: [], upcoming: [] };
        db.leads.filter((l) => l.next_at && !["won", "lost"].includes(l.stage) && l.next_at < wk).sort((a, b) => (a.next_at < b.next_at ? -1 : 1)).forEach((l) => {
          const r = { id: l.id, name: l.name, company: l.company || "", phone: l.phone, stage: l.stage, next_at: l.next_at, next_type: l.next_type || "", line: l.line || "", assigned_name: leadPub(l, db).assigned_name };
          const d = l.next_at.slice(0, 10); g[d === today ? "today" : l.next_at < n ? "overdue" : "upcoming"].push(r); });
        return { ok: true, ...g };
      }
      case "leads_stats": {
        need(SALES); const m = /^\d{4}-\d{2}$/.test(inp.month || "") ? inp.month : ""; const k = { total: 0, new: 0, client: 0, meeting: 0, proposal: 0, hold: 0, done: 0, won: 0, lost: 0, value: 0, wonValue: 0 };
        for (const l of db.leads) { if (m && String(l.created_at).slice(0, 7) !== m) continue; k.total++; k.value += l.value || 0;
          if (l.lead_type === "returning" || l.client_id) k.client++; else k.new++; if (l.stage === "visit") k.meeting++; if (l.stage === "quote" || l.quote_status === "proposal") k.proposal++;
          if (l.stage === "hold") k.hold++; if (l.quote_status === "done") k.done++; if (l.stage === "won") { k.won++; k.wonValue += l.value || 0; } if (l.stage === "lost") k.lost++; }
        return { ok: true, month: m, stats: k, months: [...new Set(db.leads.map((l) => String(l.created_at).slice(0, 7)))].sort().reverse().slice(0, 36) };
      }
      case "leads_import2": {
        const u = need(["owner", "admin"]); let n = 0, skip = 0; const team = {}; db.users.forEach((t) => (team[String(t.name).split(" ")[0].toLowerCase()] = t.id));
        const known = new Set(db.leads.map((l) => s17dig(l.phone) + "|" + String(l.name).toLowerCase()));
        const dt = (v) => { v = String(v || "").trim(); if (!v || /dd\//i.test(v)) return ""; const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; const t = new Date(v); return isNaN(t) ? "" : t.toISOString().slice(0, 19).replace("T", " "); };
        for (const r of (Array.isArray(inp.rows) ? inp.rows : []).slice(0, 3000)) {
          if (!r || typeof r !== "object") continue; const co = clip(r.company, 120); let name = clip(r.name, 120); if (!name || /^name$/i.test(name)) name = co; if (!name || /^(company|name)$/i.test(name)) { skip++; continue; }
          const key = s17dig(r.phone) + "|" + name.toLowerCase(); if (known.has(key)) { skip++; continue; } known.add(key);
          const act = String(r.action || "").trim().toLowerCase(); let stage = { won: "won", hold: "hold", meeting: "visit", visit: "visit", close: "lost", closed: "lost", lost: "lost", done: "contacted", contacted: "contacted" }[act] || "new";
          const qv = String(r.quotation || "").toLowerCase(), qs = qv.includes("done") ? "done" : /propo|quot/.test(qv) ? "proposal" : qv.includes("pend") ? "pending" : ""; if (qs === "proposal" && stage === "new") stage = "quote";
          const line = S17.lines[String(r.line || "").toLowerCase()] ? String(r.line).toLowerCase() : ""; const src = String(r.source || ""), lt = /client/i.test(src) ? "returning" : /refer/i.test(src) ? "referral" : "new";
          const meet = dt(r.meeting), last = dt(r.last_contact), ca = dt(r.date); const full = (d, h) => (d && d.length === 10 ? d + " " + h : d);
          db.leads.push({ id: ++db.seqL, created_at: full(ca, "10:00:00") || now(), source: "import", page: "", name, phone: clip(r.phone, 40), email: "", service: "", message: clip(r.note, 2000), fields: {}, stage,
            assigned_to: team[String(r.assigned || "-").trim().split(" ")[0].toLowerCase()] || null, followup: meet.slice(0, 10), value: 0, lost_reason: "", client_id: null, tags: [], notes: [], read: true,
            company: co === name ? "" : co, designation: clip(r.designation, 80), location: clip(r.location, 160), line, lead_type: lt, quote_status: qs, last_contact: full(last, "10:00:00"), next_at: full(meet, "11:00:00"), next_type: meet ? "meeting" : "" });
          n++; }
        log(db, u, "lead.import", n + " rows (sheet)", ip); return done({ ok: true, imported: n, skipped: skip });
      }
      case "clients_master": {
        need(SALES); const I = (db.invoices || []).map(invPub);
        return { ok: true, types: S17.clientTypes, lines: S17.lines, clients: db.clients.slice().reverse().map((c) => {
          const ls = db.leads.filter((l) => l.client_id === c.id), iv = I.filter((i) => +i.client_id === c.id), pp = (db.projects || []).filter((p) => +p.client_id === c.id), qq = (db.quotes || []).filter((q) => +q.client_id === c.id);
          const last = [c.created_at, ...ls.map((l) => l.last_contact || l.created_at), ...iv.map((i) => i.issue_date || "")].sort().pop();
          return { id: c.id, name: c.name, company: c.company || "", phone: c.phone || "", email: c.email || "", city: c.city || "", type: c.type || "", line: c.line || "", tags: c.tags || [], created_at: c.created_at,
            leads: ls.length, quotes: qq.length, openQuotes: qq.filter((q) => ["draft", "sent"].includes(q.status)).length, invoices: iv.length, lifetime: iv.reduce((a, i) => a + i.total, 0), paid: iv.reduce((a, i) => a + i.paid, 0),
            balance: iv.reduce((a, i) => a + i.balance, 0), projects: pp.length, last, status: s17Status(iv, pp, ls) }; }) };
      }
      case "client_360": {
        need(SALES); const c0 = db.clients.find((x) => x.id === +inp.id); if (!c0) throw new Fail("Client not found", 404);
        const c = { phone: "", email: "", company: "", city: "", address: "", notes: "", type: "", source: "", line: "", designation: "", tags: [], ...c0 };
        const leads = db.leads.filter((l) => l.client_id === c.id).slice().reverse().map((l) => leadPub(l, db)); const [quotes, invs, projs] = s17Docs(db, c); const tl = [];
        for (const l of leads) { tl.push({ t: l.created_at, k: "lead", title: `Enquiry #${l.id}${l.service ? " — " + l.service : ""}`, sub: "Stage: " + l.stage, id: l.id }); for (const n of l.notes) if (!n.sys) tl.push({ t: n.t, k: "note", title: n.text, sub: n.user || "", id: l.id }); }
        const f = (n) => Math.round(+n || 0).toLocaleString("en-US");
        for (const x of quotes) tl.push({ t: x.created_at || x.date || "", k: "quote", title: `Quotation ${x.no}${x.version > 1 ? " · V" + x.version : ""} — ${x.status}`, sub: "Rs " + f(x.total), id: x.id });
        for (const x of invs) { tl.push({ t: (x.issue_date || "") + " 09:00:00", k: "invoice", title: `Invoice ${x.no} — Rs ${f(x.total)}`, sub: x.payStatus[0].toUpperCase() + x.payStatus.slice(1) + (x.balance ? " · balance Rs " + f(x.balance) : ""), id: x.id });
          for (const p of x.payments) tl.push({ t: (p.date || "") + " 12:00:00", k: "payment", title: `Payment Rs ${f(p.amount)} (${p.method || ""})`, sub: "Invoice " + x.no, id: x.id }); }
        for (const p of projs) tl.push({ t: p.created_at || p.start || "", k: "project", title: "Project " + p.name, sub: "Stage: " + p.stage, id: p.id });
        tl.sort((a, b) => String(b.t).localeCompare(String(a.t)));
        let next = null; for (const l of leads) if (l.next_at && !["won", "lost"].includes(l.stage) && (!next || l.next_at < next.at)) next = { at: l.next_at, type: l.next_type, lead: l.id };
        const sum = (a, k) => a.reduce((s, x) => s + (+x[k] || 0), 0);
        return { ok: true, client: c, status: s17Status(invs, projs, leads), next, kpis: { lifetime: sum(invs, "total"), paid: sum(invs, "paid"), balance: sum(invs, "balance"), quoted: sum(quotes, "total"), projects: projs.length, last: (tl[0] || {}).t || c.created_at },
          leads, quotes: quotes.map((x) => ({ ...x, label: x.no + (x.version > 1 ? " · V" + x.version : "") + (x.option ? " · " + x.option : "") })), invoices: invs, projects: projs, timeline: tl.slice(0, 300) };
      }
      case "inv_new": {
        const u = need(SALES); ensureA5(db); const [cid, cl] = s17InvClient(db, inp); const line = S17.lines[inp.line] ? inp.line : "interior";
        let secs = cleanSections(inp.sections); if (!secs.some((x) => x.items.length)) { const amt = num(inp.total); if (amt <= 0) throw new Fail("Enter the invoice amount or add items"); secs = [{ name: "Supply & services", note: "", items: [{ desc: clip(inp.desc, 600) || clip(inp.project, 160) || "As per work order", qty: 1, unit: "job", rate: amt, amount: amt }] }]; }
        const no = String(inp.no || "").trim() ? clip(inp.no, 30) : s17InvNo(line); if (db.invoices.some((x) => x.no === no)) throw new Fail("Invoice " + no + " already exists");
        const i = totals({ sections: secs, discount: inp.discount || 0, taxPct: inp.taxPct || 0 });
        Object.assign(i, { id: ++db.seqI, no, quote_id: null, quote_label: "", client: cl, client_id: cid, project: clip(inp.project, 160), site: clip(inp.site, 200), issue_date: /^\d{4}-\d{2}-\d{2}$/.test(inp.issue_date || "") ? inp.issue_date : now().slice(0, 10), due_date: /^\d{4}-\d{2}-\d{2}$/.test(inp.due_date || "") ? inp.due_date : "",
          terms: clip(inp.terms, 3000), notes: "", schedule: clip(inp.schedule, 600), payments: [], seqPay: 0, created_by: u.name, created_at: now(), po: clip(inp.po, 60), delivery_date: /^\d{4}-\d{2}-\d{2}$/.test(inp.delivery_date || "") ? inp.delivery_date : "", delivered: "", line, mode: inp.mode === "after_delivery" ? "after_delivery" : "", track_note: clip(inp.track_note, 500) });
        db.invoices.push(i); log(db, u, "invoice.create", no + " " + cl.name + " (standalone)", ip); return done({ ok: true, invoice: s17InvRow(i) });
      }
      case "inv_track": {
        const u = need(SALES); ensureA5(db); const i = db.invoices.find((x) => x.id === +inp.id); if (!i) throw new Fail("Invoice not found", 404);
        if ("po" in inp) i.po = clip(inp.po, 60); if ("track_note" in inp) i.track_note = clip(inp.track_note, 500);
        if ("delivery_date" in inp) i.delivery_date = /^\d{4}-\d{2}-\d{2}$/.test(inp.delivery_date || "") ? inp.delivery_date : "";
        if ("line" in inp) i.line = S17.lines[inp.line] ? inp.line : ""; if ("mode" in inp) i.mode = inp.mode === "after_delivery" ? "after_delivery" : "";
        if ("delivered" in inp) i.delivered = inp.delivered ? (/^\d{4}-\d{2}-\d{2}$/.test(String(inp.delivered)) ? inp.delivered : now().slice(0, 10)) : "";
        log(db, u, "invoice.track", i.no, ip); return done({ ok: true, invoice: s17InvRow(i) });
      }
      case "invs_tracker": {
        need(SALES); ensureA5(db); const y = /^\d{4}$/.test(String(inp.year || "")) ? String(inp.year) : now().slice(0, 4);
        const all = db.invoices.slice().reverse().map(s17InvRow), years = [...new Set([now().slice(0, 4), ...all.map((i) => String(i.issue_date).slice(0, 4))])].sort().reverse();
        const rows = all.filter((i) => String(i.issue_date).slice(0, 4) === y), months = {};
        for (let m = 1; m <= 12; m++) months[`${y}-${String(m).padStart(2, "0")}`] = { count: 0, total: 0, received: 0, balance: 0 };
        rows.forEach((i) => { const k = months[i.issue_date.slice(0, 7)]; if (!k) return; k.count++; k.total += i.total; k.received += i.paid; k.balance += i.balance; });
        return { ok: true, year: y, years, rows, months, lateAll: all.filter((i) => i.late).length, outstandingAll: all.reduce((a, i) => a + i.balance, 0) };
      }
      case "invs_import": {
        const u = need(["owner", "admin"]); ensureA5(db); let n = 0, skip = 0; const have = new Set(db.invoices.map((i) => i.no));
        const dt = (v) => { v = String(v || "").trim(); const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? 2000 + +m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; const t = v ? new Date(v) : null; return t && !isNaN(t) ? t.toISOString().slice(0, 10) : ""; };
        const nm = (v) => Math.round(parseFloat(String(v || "").replace(/[^\d.]/g, "")) || 0);
        for (const r of (Array.isArray(inp.rows) ? inp.rows : []).slice(0, 3000)) {
          if (!r || typeof r !== "object") continue; const no = clip(r.no, 30), co = clip(r.company, 120), tot = nm(r.total);
          if (!no || !co || tot <= 0 || (/^(invoice|inv)/i.test(no) && !/\d/.test(no)) || have.has(no)) { skip++; continue; } have.add(no);
          const [cid, cl] = s17InvClient(db, { client: { company: co, name: co } }); const date = dt(r.date) || now().slice(0, 10), rec = Math.min(tot, nm(r.received)), stt = String(r.status || "").toLowerCase();
          const i = totals({ sections: [{ name: "Supply & services", note: "", items: [{ desc: clip(r.note, 600) || "As per PO " + clip(r.po, 60), qty: 1, unit: "job", rate: tot, amount: tot }] }], discount: 0, taxPct: 0 });
          Object.assign(i, { id: ++db.seqI, no, quote_id: null, quote_label: "", client: cl, client_id: cid, project: "", site: "", issue_date: date, due_date: "", terms: "", notes: "", schedule: "", payments: [], seqPay: 0, created_by: u.name, created_at: now(),
            po: clip(r.po, 60), delivery_date: dt(r.delivery), delivered: stt.includes("paid") && !stt.includes("part") ? date : "", line: /^WF/i.test(no) ? "furniture" : "interior", mode: stt.includes("after") ? "after_delivery" : "", track_note: clip(r.note, 500) });
          if (rec > 0) { i.seqPay = 1; i.payments.push({ id: 1, rcpt: no + "-R1", date, amount: rec, method: "bank", ref: "", note: "Imported from sheet", by: u.name, t: now() }); }
          db.invoices.push(i); n++; }
        log(db, u, "invoice.import", n + " rows", ip); return done({ ok: true, imported: n, skipped: skip });
      }
      case "clients_merge": {
        const u = need(["owner", "admin"]), keep = +inp.keep, drop = +inp.merge; if (!keep || !drop || keep === drop) throw new Fail("Pick two different clients");
        const a = db.clients.find((x) => x.id === keep), b = db.clients.find((x) => x.id === drop); if (!a || !b) throw new Fail("Client not found", 404);
        db.leads.forEach((l) => { if (l.client_id === drop) l.client_id = keep; }); for (const t of ["quotes", "invoices", "projects"]) (db[t] || []).forEach((x) => { if (+x.client_id === drop) x.client_id = keep; });
        for (const k of ["phone", "email", "company", "city", "address"]) if (!String(a[k] || "").trim() && String(b[k] || "").trim()) a[k] = b[k]; a.notes = [a.notes, b.notes].filter(Boolean).join("\n");
        db.clients = db.clients.filter((x) => x !== b); log(db, u, "client.merge", `${b.name} → ${a.name}`, ip); return done({ ok: true, id: keep });
      }
    }
    return null;
  }
  function a5(action, inp, need, db, ip) {
    if (!/^(dash_|tpl_|quote_|quotes_|inv_|invs_|pay_|proj_|projs_|company_)/.test(action)) return null;
    ensureA5(db); const done = (o) => { save(db); return o; };
    const SALES = ["owner", "admin", "sales"], ALL = ["owner", "admin", "sales", "editor"];
    const findQ = (id) => { const q = db.quotes.find((x) => x.id === +id); if (!q) throw new Fail("Quotation not found", 404); return q; };
    const findI = (id) => { const i = db.invoices.find((x) => x.id === +id); if (!i) throw new Fail("Invoice not found", 404); return i; };
    const findP = (id) => { const p = db.projects.find((x) => x.id === +id); if (!p) throw new Fail("Project not found", 404); return p; };
    switch (action) {
      // ---------- company / document settings
      case "company_get": need(ALL); return { ok: true, company: companyCfg(), units: UNITS };
      case "company_save": {
        const u = need(["owner", "admin"]), c = companyCfg(), s = inp.company || {};
        for (const k of Object.keys(c)) if (k in s) c[k] = ["nextNo", "validDays"].includes(k) ? Math.max(1, Math.round(num(s[k]))) : clip(s[k], 300);
        const used = db.quotes.reduce((m, q) => Math.max(m, +String(q.no).replace(/\D/g, "") || 0), 0);
        if (c.nextNo <= used) throw new Fail("Next number must be higher than " + used + " (already used)");
        jw(COMPANY, c); log(db, u, "settings.company", "", ip); return done({ ok: true, company: c });
      }
      // ---------- templates
      case "tpl_list": need(SALES); return { ok: true, templates: db.tpls.map((t) => totals({ ...t, sections: t.sections.map((s) => ({ ...s, items: s.items.slice() })) })) };
      case "tpl_save": {
        const u = need(["owner", "admin"]), name = clip(inp.name, 80); if (!name) throw new Fail("Template name is required");
        let t = inp.id ? db.tpls.find((x) => x.id === +inp.id) : null; if (inp.id && !t) throw new Fail("Template not found", 404);
        if (!t) { t = { id: ++db.seqT, created_at: now() }; db.tpls.push(t); }
        Object.assign(t, { name, kind: ["design", "fitout", "renovation", "other"].includes(inp.kind) ? inp.kind : "other", description: clip(inp.description, 400), sections: cleanSections(inp.sections), terms: clip(inp.terms, 3000), updated_at: now() });
        log(db, u, "template.save", name, ip); return done({ ok: true, template: t });
      }
      case "tpl_import": {
        const u = need(["owner", "admin"]); let n = 0;
        for (const x of (Array.isArray(inp.templates) ? inp.templates : []).slice(0, 50)) { const name = clip(x.name, 80); if (!name || db.tpls.some((t) => t.name === name)) continue;
          db.tpls.push({ id: ++db.seqT, name, kind: ["design", "fitout", "renovation", "other"].includes(x.kind) ? x.kind : "other", description: clip(x.description, 400), sections: cleanSections(x.sections), terms: clip(x.terms, 3000), created_at: now(), updated_at: now() }); n++; }
        log(db, u, "template.import", n + " templates", ip); return done({ ok: true, imported: n });
      }
      case "tpl_delete": { const u = need(["owner", "admin"]), t = db.tpls.find((x) => x.id === +inp.id); if (!t) throw new Fail("Template not found", 404); db.tpls = db.tpls.filter((x) => x !== t); log(db, u, "template.delete", t.name, ip); return done({ ok: true }); }
      // ---------- quotations
      case "dash_target_save": { const u = need(["owner", "admin"]); db.dashTarget = Math.max(0, Math.round(+inp.target || 0)); return done({ ok: true, target: db.dashTarget }); }
      case "dash_data": {
        const u = need(ALL); const days = [7, 28, 90].includes(+inp.days) ? +inp.days : 28; const ymd = (t) => new Date(t).toISOString().slice(0, 10);
        const today = ymd(Date.now()), start = ymd(Date.now() - (days - 1) * 864e5), pStart = ymd(Date.now() - (2 * days - 1) * 864e5);
        const axis = []; for (let i = days - 1; i >= 0; i--) axis.push(ymd(Date.now() - i * 864e5));
        const o = { ok: true, days, role: u.role, crm: null, axis, visitors: axis.map(() => null) };
        if (!SALES.includes(u.role)) return o;
        const idx = Object.fromEntries(axis.map((d, i) => [d, i])), Z = () => axis.map(() => 0);
        const S = { leads: Z(), sent: Z(), won: Z(), invoiced: Z(), paid: Z() }; const inP = (d) => d >= pStart && d < start;
        let lN = 0, lP = 0, sN = 0, sP = 0, wN = 0, oq = 0, oqv = 0, pN = 0, pP = 0, unpaid = 0, mp = 0; const m0 = today.slice(0, 8) + "01"; const overdue = [];
        const funnel = { new: 0, contacted: 0, visit: 0, quoted: 0, won: 0, lost: 0 }; let pipe = 0; const src = {};
        for (const l of db.leads) { const d = String(l.created_at).slice(0, 10); if (d in idx) { lN++; S.leads[idx[d]]++; src[l.source] = (src[l.source] || 0) + 1; } else if (inP(d)) lP++; funnel[l.stage] = (funnel[l.stage] || 0) + 1; if (!["won", "lost"].includes(l.stage)) pipe += +l.value || 0; }
        for (const q of db.quotes) { const s = String(q.sent_at || "").slice(0, 10), a = String(q.approved_at || "").slice(0, 10); if (s in idx) { sN++; S.sent[idx[s]]++; } else if (s && inP(s)) sP++; if (a in idx) { wN++; S.won[idx[a]]++; } if (q.status === "sent") { oq++; oqv += +q.total || 0; } }
        for (const i of db.invoices) { const paid = (i.payments || []).reduce((m, p) => m + (+p.amount || 0), 0), bal = Math.max(0, i.total - paid); if (i.issue_date in idx) S.invoiced[idx[i.issue_date]] += i.total;
          for (const p of i.payments || []) { if (p.date in idx) { pN += +p.amount; S.paid[idx[p.date]] += +p.amount; } else if (inP(p.date)) pP += +p.amount; if (p.date >= m0) mp += +p.amount; }
          unpaid += bal; if (bal > 0 && i.due_date && i.due_date < today) overdue.push({ id: i.id, no: i.no, client: i.client?.name || "", balance: bal, due: i.due_date }); }
        const leads = db.leads.slice().sort((a, b) => b.id - a.id);
        const follow = leads.filter((l) => l.followup && l.followup <= today && !["won", "lost"].includes(l.stage)).slice(0, 8).map((l) => ({ id: l.id, name: l.name, service: l.service || "", stage: l.stage, followup: l.followup, late: l.followup < today }));
        o.crm = { kpi: { leads: [lN, lP], pipeline: pipe, quotesSent: [sN, sP], openQuotes: [oq, oqv], paid: [pN, pP], unpaid, won: wN }, series: S, funnel,
          recent: leads.slice(0, 6).map((l) => ({ id: l.id, name: l.name, service: l.service || "", stage: l.stage, source: l.source, created_at: l.created_at, read: !!l.is_read })),
          followups: follow, overdue: overdue.slice(0, 6), overdueN: overdue.length, sources: Object.entries(src).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
          chips: { new: db.leads.filter((l) => !l.is_read).length, overdue: overdue.length, follow: follow.length }, target: { target: db.dashTarget || 0, month: mp, monthLabel: new Date().toLocaleString("en", { month: "long", year: "numeric" }) } };
        return o;
      }
      case "quotes_list": { need(SALES); return { ok: true, quotes: db.quotes.slice().reverse().map(({ sections, ...q }) => ({ ...q, label: qLabel(q), sectionCount: sections.length })) }; }
      case "quote_get": { need(SALES); const q = findQ(inp.id); return { ok: true, quote: { ...q, label: qLabel(q) }, family: db.quotes.filter((x) => x.no === q.no).map((x) => ({ id: x.id, label: qLabel(x), status: x.status, total: x.total, version: x.version, option: x.option })), company: companyCfg(), invoice: db.invoices.find((i) => i.quote_id === q.id) ? invPub(db.invoices.find((i) => i.quote_id === q.id)) : null }; }
      case "quote_save": {
        const u = need(SALES); let q;
        if (inp.id) { q = findQ(inp.id); if (["approved", "invoiced", "superseded"].includes(q.status)) throw new Fail("This quotation is " + q.status + ". Create a new version to change it."); }
        else {
          const c = companyCfg(); q = { id: ++db.seqQ, no: c.prefix + c.nextNo, version: 1, option: "", status: "draft", created_by: u.name, created_at: now(), history: [{ t: now(), user: u.name, text: "Created" }] };
          c.nextNo++; jw(COMPANY, c); db.quotes.push(q);
          if (inp.lead_id) { const l = db.leads.find((x) => x.id === +inp.lead_id); if (l) { q.lead_id = l.id; if (["new", "contacted", "visit"].includes(l.stage)) { l.notes.push({ t: now(), user: u.name, text: `Stage: ${l.stage} → quote (${q.no})`, sys: true }); l.stage = "quote"; } } }
        }
        const c = companyCfg();
        Object.assign(q, { client: clientOf(inp.client || {}), client_id: +inp.client_id || q.client_id || null, project: clip(inp.project, 160), site: clip(inp.site, 200), kind: clip(inp.kind, 20) || q.kind || "other", date: /^\d{4}-\d{2}-\d{2}$/.test(inp.date || "") ? inp.date : q.date || now().slice(0, 10),
          valid_days: Math.max(1, Math.round(num(inp.valid_days) || c.validDays)), sections: cleanSections(inp.sections), discount: num(inp.discount), taxPct: num(inp.taxPct), terms: clip(inp.terms, 3000), notes: clip(inp.notes, 2000), intro: clip(inp.intro, 1500), design: ["classic", "minimal", "premium"].includes(inp.design) ? inp.design : q.design || "classic", updated_at: now() });
        if (!q.client.name) throw new Fail("Client name is required");
        totals(q); log(db, u, inp.id ? "quote.update" : "quote.create", qLabel(q) + " " + q.client.name, ip);
        return done({ ok: true, quote: { ...q, label: qLabel(q) } });
      }
      case "quote_copy": {
        // mode: version (same number, V+1) | option (same number, new option) | duplicate (new number)
        const u = need(SALES), src = findQ(inp.id), mode = ["version", "option", "duplicate"].includes(inp.mode) ? inp.mode : "version", c = companyCfg();
        if (src.status === "invoiced" && mode !== "duplicate") throw new Fail("This quotation is already invoiced. Duplicate it to start a new number.");
        const fam = db.quotes.filter((x) => x.no === src.no);
        const q = JSON.parse(JSON.stringify(src)); Object.assign(q, { id: ++db.seqQ, status: "draft", created_by: u.name, created_at: now(), updated_at: now(), sent_at: null, approved_at: null, history: [{ t: now(), user: u.name, text: mode === "duplicate" ? "Duplicated from " + qLabel(src) : "Created from " + qLabel(src) }] });
        if (mode === "duplicate") { q.no = c.prefix + c.nextNo; c.nextNo++; jw(COMPANY, c); q.version = 1; q.option = ""; q.lead_id = null; }
        else if (mode === "version") { q.version = Math.max(...fam.filter((x) => x.option === src.option).map((x) => x.version)) + 1; }
        else { const n = fam.reduce((m, x) => Math.max(m, +(String(x.option).match(/\d+/) || [1])[0]), 1); q.option = "Option " + (n + 1); q.version = 1; fam.forEach((x) => { if (!x.option) x.option = "Option 1"; }); }
        db.quotes.push(q); log(db, u, "quote." + mode, qLabel(q), ip); return done({ ok: true, quote: { ...q, label: qLabel(q) } });
      }
      case "quote_link": { need(SALES); const q = findQ(inp.id); return { ok: true, link: qViewUrl(q, inp._host) }; }
      case "quote_send": {
        const u = need(SALES), q = findQ(inp.id), ch = String(inp.channel || ""), to = String(inp.to || "").trim(), link = qViewUrl(q, inp._host);
        if (["superseded", "rejected"].includes(q.status)) throw new Fail("This quotation is " + q.status);
        let what;
        if (ch === "email") {
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Fail("Enter a valid email address");
          const pdf = String(inp.pdf || ""), bin = pdf ? Buffer.from(pdf, "base64") : null;
          if (bin && bin.slice(0, 4).toString() !== "%PDF") throw new Fail("The PDF file is not valid");
          // preview: no real SMTP, the email is written to _private/outbox/ instead
          const ob = path.join(PRIV, "outbox"); fs.mkdirSync(ob, { recursive: true }); const stem = path.join(ob, Date.now() + "-" + q.no);
          fs.writeFileSync(stem + ".txt", "To: " + to + "\nSubject: " + clip(inp.subject, 200) + "\n\n" + clip(inp.message, 5000) + "\n\nView online: " + link); if (bin) fs.writeFileSync(stem + ".pdf", bin);
          what = "Emailed to " + to + (bin ? " (PDF attached)" : "");
        } else if (ch === "whatsapp") what = "Shared on WhatsApp" + (to ? " with " + clip(to, 40) : "");
        else throw new Fail("Choose email or WhatsApp");
        q.history.push({ t: now(), user: u.name, text: what }); q.last_sent = { t: now(), channel: ch, to: clip(to, 190) };
        if (q.status === "draft") { q.status = "sent"; q.sent_at = now(); q.history.push({ t: now(), user: u.name, text: "Status: draft → sent" }); }
        log(db, u, "quote.send", qLabel(q) + " · " + ch, ip); return done({ ok: true, quote: { ...q, label: qLabel(q) }, link });
      }
      case "quote_status": {
        const u = need(SALES), q = findQ(inp.id), to = String(inp.status || "");
        if (!["draft", "sent", "approved", "rejected"].includes(to)) throw new Fail("Unknown status");
        if (q.status === "invoiced") throw new Fail("This quotation is already invoiced");
        if (to === "approved" && db.quotes.some((x) => x.no === q.no && x.id !== q.id && ["approved", "invoiced"].includes(x.status))) throw new Fail("Another version of " + q.no + " is already approved");
        const from = q.status; q.status = to; q.updated_at = now(); if (to === "sent") q.sent_at = now(); if (to === "approved") q.approved_at = now();
        q.history.push({ t: now(), user: u.name, text: `Status: ${from} → ${to}` + (inp.note ? " (" + clip(inp.note, 200) + ")" : "") });
        if (to === "approved") db.quotes.forEach((x) => { if (x.no === q.no && x.id !== q.id && ["draft", "sent"].includes(x.status)) { x.status = "superseded"; x.history.push({ t: now(), user: u.name, text: "Superseded by " + qLabel(q) }); } });
        const l = q.lead_id && db.leads.find((x) => x.id === q.lead_id);
        if (l && to === "approved" && l.stage !== "won") { l.notes.push({ t: now(), user: u.name, text: `Stage: ${l.stage} → won (${qLabel(q)} approved)`, sys: true }); l.stage = "won"; l.value = q.total; }
        if (l && to === "sent" && ["new", "contacted", "visit"].includes(l.stage)) { l.notes.push({ t: now(), user: u.name, text: `Stage: ${l.stage} → quote (${qLabel(q)} sent)`, sys: true }); l.stage = "quote"; }
        log(db, u, "quote." + to, qLabel(q), ip); return done({ ok: true, quote: { ...q, label: qLabel(q) } });
      }
      case "quote_delete": { const u = need(["owner", "admin"]), q = findQ(inp.id); if (!["draft", "rejected", "superseded"].includes(q.status)) throw new Fail("Only draft, rejected or superseded quotations can be deleted"); db.quotes = db.quotes.filter((x) => x !== q); log(db, u, "quote.delete", qLabel(q), ip); return done({ ok: true }); }
      case "quote_invoice": {
        const u = need(SALES), q = findQ(inp.id); if (q.status !== "approved") throw new Fail("Approve the quotation before converting it to an invoice");
        if (db.invoices.some((i) => i.quote_id === q.id)) throw new Fail("This quotation already has an invoice");
        let clientId = q.client_id;
        if (!clientId || !db.clients.some((c) => c.id === clientId)) { const d = q.client.phone.replace(/\D/g, ""); let c = db.clients.find((x) => (d && x.phone.replace(/\D/g, "") === d) || (q.client.email && x.email === q.client.email));
          if (!c) { c = { id: ++db.seqC, name: q.client.name, phone: q.client.phone, email: q.client.email, company: q.client.company || "", city: "Lahore", address: q.client.address, notes: "", created_at: now() }; db.clients.push(c); } clientId = c.id; q.client_id = c.id; }
        const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        const i = { id: ++db.seqI, no: q.no, quote_id: q.id, quote_label: qLabel(q), client: { ...q.client }, client_id: clientId, project: q.project, site: q.site, sections: JSON.parse(JSON.stringify(q.sections)), subtotal: q.subtotal, discount: q.discount, taxPct: q.taxPct, tax: q.tax, total: q.total, issue_date: now().slice(0, 10), due_date: due, terms: q.terms, notes: "", schedule: clip(inp.schedule, 600) || (/75%/.test(q.terms) ? "75% advance with work order, 25% on approval" : "50% advance with work order, balance on completion"), payments: [], created_by: u.name, created_at: now() };
        db.invoices.push(i); q.status = "invoiced"; q.history.push({ t: now(), user: u.name, text: "Converted to invoice " + i.no });
        if (inp.project !== false) { db.projects.push({ id: ++db.seqP, name: q.project || q.client.name, client_id: clientId, client_name: q.client.name, quote_id: q.id, invoice_id: i.id, no: q.no, site: q.site, stage: "planning", start: now().slice(0, 10), target: "", value: q.total, manager: null, updates: [{ t: now(), user: u.name, text: "Project opened from " + qLabel(q) }], photos: [], created_at: now() }); }
        log(db, u, "invoice.create", i.no + " " + i.client.name, ip); return done({ ok: true, invoice: invPub(i) });
      }
      // ---------- invoices & payments
      case "invs_list": need(SALES); return { ok: true, invoices: db.invoices.slice().reverse().map(({ sections, ...i }) => invPub({ ...i, sections: [] })) };
      case "inv_get": { need(SALES); const i = findI(inp.id); return { ok: true, invoice: invPub(i), company: companyCfg() }; }
      case "inv_save": {
        const u = need(SALES), i = findI(inp.id);
        if ("due_date" in inp) i.due_date = /^\d{4}-\d{2}-\d{2}$/.test(inp.due_date) ? inp.due_date : "";
        if ("issue_date" in inp && /^\d{4}-\d{2}-\d{2}$/.test(inp.issue_date)) i.issue_date = inp.issue_date;
        ["notes", "schedule", "terms"].forEach((k) => { if (k in inp) i[k] = clip(inp[k], 3000); });
        log(db, u, "invoice.update", i.no, ip); return done({ ok: true, invoice: invPub(i) });
      }
      case "pay_add": {
        const u = need(SALES), i = findI(inp.id), amount = Math.round(num(inp.amount)); if (!amount) throw new Fail("Enter the amount received");
        const bal = invPub(i).balance; if (amount > bal) throw new Fail("Amount is more than the balance (PKR " + bal.toLocaleString() + ")");
        const p = { id: ++db.seqPay, rcpt: i.no + "-R" + (i.payments.length + 1), date: /^\d{4}-\d{2}-\d{2}$/.test(inp.date || "") ? inp.date : now().slice(0, 10), amount, method: ["cash", "bank", "cheque", "online"].includes(inp.method) ? inp.method : "bank", ref: clip(inp.ref, 80), note: clip(inp.note, 300), by: u.name, t: now() };
        i.payments.push(p); log(db, u, "payment.add", `${i.no} PKR ${amount}`, ip); return done({ ok: true, invoice: invPub(i), payment: p });
      }
      case "pay_delete": { const u = need(["owner", "admin"]), i = findI(inp.id), p = i.payments.find((x) => x.id === +inp.pay_id); if (!p) throw new Fail("Payment not found", 404); i.payments = i.payments.filter((x) => x !== p); log(db, u, "payment.delete", `${i.no} ${p.rcpt}`, ip); return done({ ok: true, invoice: invPub(i) }); }
      // ---------- projects
      case "projs_list": { need(ALL); return { ok: true, projects: db.projects.slice().reverse().map((p) => { const i = p.invoice_id && db.invoices.find((x) => x.id === p.invoice_id); return { ...p, paid: i ? invPub(i).paid : 0, manager_name: p.manager ? ((db.users.find((u) => u.id === p.manager) || {}).name || "") : "" }; }), stages: PSTAGES, team: db.users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name })) }; }
      case "proj_save": {
        const u = need(["owner", "admin", "sales"]); let p = inp.id ? findP(inp.id) : null;
        if (!p) { const name = clip(inp.name, 160); if (!name) throw new Fail("Project name is required"); p = { id: ++db.seqP, name, client_id: null, client_name: "", quote_id: null, invoice_id: null, no: "", site: "", stage: "planning", start: now().slice(0, 10), target: "", value: 0, manager: null, updates: [{ t: now(), user: u.name, text: "Project created" }], photos: [], created_at: now() }; db.projects.push(p); }
        const before = p.stage;
        ["name", "client_name", "site"].forEach((k) => { if (k in inp) p[k] = clip(inp[k], 200) || p[k]; });
        ["start", "target"].forEach((k) => { if (k in inp) p[k] = /^\d{4}-\d{2}-\d{2}$/.test(inp[k]) ? inp[k] : ""; });
        if ("stage" in inp) { if (!PSTAGES.includes(inp.stage)) throw new Fail("Unknown stage"); p.stage = inp.stage; }
        if ("manager" in inp) p.manager = +inp.manager || null;
        if ("value" in inp) p.value = Math.round(num(inp.value));
        if (before !== p.stage) p.updates.push({ t: now(), user: u.name, text: `Stage: ${before} → ${p.stage}`, sys: true });
        log(db, u, inp.id ? "project.update" : "project.create", p.name, ip); return done({ ok: true, project: p });
      }
      case "proj_update": { const u = need(ALL), p = findP(inp.id), t = clip(inp.text, 2000); if (!t) throw new Fail("Write an update first"); p.updates.push({ t: now(), user: u.name, text: t }); log(db, u, "project.note", p.name, ip); return done({ ok: true, project: p }); }
      case "proj_photo": {
        const u = need(ALL), p = findP(inp.id), m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(inp.data || ""));
        if (!m) throw new Fail("Only JPG, PNG or WebP photos"); const buf = Buffer.from(m[2], "base64"); if (buf.length > 6 * 1024 * 1024) throw new Fail("Photo is larger than 6 MB");
        const magic = buf.slice(0, 4).toString("hex"); if (!/^(ffd8ff|89504e47|52494646)/.test(magic)) throw new Fail("That file is not an image");
        const dir = path.join(ROOT, "assets/uploads/projects"); fs.mkdirSync(dir, { recursive: true });
        const name = `p${p.id}-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`; fs.writeFileSync(path.join(dir, name), buf);
        const ph = { url: "/assets/uploads/projects/" + name, caption: clip(inp.caption, 200), stage: p.stage, t: now(), by: u.name }; p.photos.push(ph);
        log(db, u, "project.photo", p.name, ip); return done({ ok: true, project: p });
      }
      case "proj_photo_delete": { const u = need(["owner", "admin", "sales"]), p = findP(inp.id), ph = p.photos.find((x) => x.url === inp.url); if (!ph) throw new Fail("Photo not found", 404); p.photos = p.photos.filter((x) => x !== ph); try { fs.unlinkSync(path.join(ROOT, ph.url)); } catch {} return done({ ok: true, project: p }); }
      case "proj_delete": { const u = need(["owner", "admin"]), p = findP(inp.id); db.projects = db.projects.filter((x) => x !== p); log(db, u, "project.delete", p.name, ip); return done({ ok: true }); }
    }
    return null;
  }

  // =================================================================== A6 — content collections (blog, portfolio, testimonials, team, FAQs) + AI
  const CMS = path.join(PRIV, "content.json");
  const CTYPES = ["post", "study", "testimonial", "member", "faq", "city"];
  const PAGE_TYPES = { post: "insights", study: "projects" };
  const AI_DEF = { customKey: "", customModel: "", customUrl: "", provider: "anthropic", anthropicKey: "", anthropicModel: "claude-sonnet-4-5", openaiKey: "", openaiModel: "gpt-4o-mini", openrouterKey: "", openrouterModel: "nousresearch/hermes-3-llama-3.1-405b", voice: "Calm, plain, confident British English. Short sentences. No hype, no exclamation marks. Woodex Interior is a design, fit-out and renovation studio in Lahore, Pakistan." };
  const AI_SECRETS = ["anthropicKey", "openaiKey", "openrouterKey", "customKey"];
  const cmsLoad = () => { const c = jr(CMS, {}); c.items = c.items || []; c.seq = c.seq || 0; c.ai = Object.assign({}, AI_DEF, c.ai || {}); return c; };
  const aiPub = (a) => { const o = { ...a }; AI_SECRETS.forEach((k) => { o[k + "Set"] = !!a[k]; o[k] = ""; }); return o; };
  const cmsBackup = (rel) => { const abs = path.join(ROOT, rel); if (!fs.existsSync(abs)) return; const d = path.join(PRIV, "backups", rel.replace(/[^a-z0-9]+/gi, "_")); fs.mkdirSync(d, { recursive: true }); const t = new Date(), p = (n, l = 2) => String(n).padStart(l, "0"); fs.copyFileSync(abs, path.join(d, `${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}-${p(t.getMilliseconds(), 3)}.html`)); };
  const cmsRelOk = (rel, type) => new RegExp("^" + PAGE_TYPES[type] + "/[a-z0-9][a-z0-9-]{0,59}/index\\.html$").test(rel);
  const htmlOk = (h) => typeof h === "string" && h.length < 3 * 1024 * 1024 && /<html/i.test(h) && /<\/html>/i.test(h) && !/<[^>]+\s(contenteditable|data-wx-ed)[\s=>]/i.test(h);
  const sitemapAdd = (rel) => { const f = path.join(ROOT, "sitemap.xml"); if (!fs.existsSync(f)) return; const loc = "https://woodex.com.pk/" + rel.replace(/index\.html$/, ""); let x = fs.readFileSync(f, "utf8"); if (x.includes("<loc>" + loc + "</loc>") || !x.includes("</urlset>")) return; fs.writeFileSync(f, x.replace("</urlset>", "  <url><loc>" + loc + "</loc></url>\n</urlset>")); };
  /** Publish scheduled items whose time has come. Runs on every admin request (and can be hit by cron). */
  function cmsTick(db) {
    const c = cmsLoad(), t = now(); let n = 0;
    for (const it of c.items) {
      if (it.status !== "scheduled" || !it.publishAt || it.publishAt > t) continue;
      if (it.pending && PAGE_TYPES[it.type]) {
        const { rel, html, card } = it.pending; if (!cmsRelOk(rel, it.type) || !htmlOk(html)) { it.status = "draft"; it.error = "Scheduled page was invalid"; continue; }
        const abs = path.join(ROOT, rel); cmsBackup(rel); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, html);
        const li = path.join(ROOT, PAGE_TYPES[it.type], "index.html"), href = "/" + rel.replace(/index\.html$/, "");
        if (card && fs.existsSync(li)) { let L = fs.readFileSync(li, "utf8"); if (!L.includes('href="' + href + '"')) { const m = L.match(/<div class="hx-cards">/); if (m) { cmsBackup(PAGE_TYPES[it.type] + "/index.html"); L = L.replace(m[0], m[0] + "\n" + card); fs.writeFileSync(li, L); } } }
        it.rel = rel; delete it.pending; sitemapAdd(rel);
      }
      it.status = "published"; it.published_at = t; n++; if (db) log(db, null, "content.autopublish", it.title);
    }
    if (n) jw(CMS, c); return n;
  }
  async function aiCall(a, system, user) {
    const p = a.provider, key = a[p + "Key"], model = a[p + "Model"];
    if (!key && !(p === "custom" && a.customUrl)) throw new Fail("Add an API key for " + ({ anthropic: "Claude", openai: "OpenAI", openrouter: "OpenRouter" }[p] || p) + " in Content → AI settings");
    let r, j;
    try {
      if (p === "anthropic") { r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 6000, system, messages: [{ role: "user", content: user }] }), signal: AbortSignal.timeout(60000) }); j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message || r.status); return (j.content || []).map((x) => x.text || "").join(""); }
      const url = p === "custom" ? String(a.customUrl).replace(/\/+$/, "").replace(/\/chat\/completions$/, "") + "/chat/completions" : p === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
      r = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json", "HTTP-Referer": "https://woodex.com.pk", "X-Title": "Woodex Admin" }, body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: AbortSignal.timeout(60000) });
      j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message || r.status); return j.choices[0].message.content || "";
    } catch (e) { throw new Fail("AI request failed: " + String(e.message || e).slice(0, 200), 502); }
  }
  const AI_TASKS = {
    outline: (i) => `Write a full blog article for the Woodex website.\nTitle: ${i.title}\nNotes from the team: ${i.notes || "(none)"}\nReturn ONLY JSON: {"dek":"one-sentence standfirst","blocks":[{"t":"h","text":"..."},{"t":"p","text":"..."},{"t":"list","items":["**Label:** text"]}],"summary":["three short takeaways"],"faqs":[{"q":"...","a":"..."}],"quote":"one pull quote"}. 5-7 sections, each a heading plus 1-2 paragraphs. Use **bold** sparingly. Prices in PKR where relevant.`,
    meta: (i) => `Write SEO metadata for this page.\nTitle: ${i.title}\nText: ${String(i.text || "").slice(0, 4000)}\nReturn ONLY JSON: {"title":"max 60 characters, ends with | Woodex Interior","desc":"140-158 characters"}`,
    alt: (i) => `Write alt text (max 110 characters, no "image of") for a photo on the Woodex website. File: ${i.file || ""}. Context: ${i.context || ""}. Return only the alt text.`,
    improve: (i) => `Rewrite this paragraph to be clearer and tighter, same meaning and length or shorter. Return only the paragraph.\n\n${String(i.text || "").slice(0, 3000)}`,
    excerpt: (i) => `Write a card summary (max 150 characters) for this page. Return only the text.\nTitle: ${i.title}\n${String(i.text || "").slice(0, 3000)}`,
    city: (i) => `You are localising a Woodex city landing page from ${i.source} to ${i.city}, Pakistan. The studio is based in Lahore and serves ${i.city} with site visits.\nRewrite each string for ${i.city}: mention real ${i.city} areas/neighbourhoods where natural, keep facts honest (the studio and showroom are in Lahore, not in ${i.city}), keep roughly the same length, keep **bold** markers and [link](url) markup unchanged.\nReturn ONLY a JSON array of exactly ${(i.texts || []).length} strings in the same order.\n\n${JSON.stringify((i.texts || []).slice(0, 120)).slice(0, 14000)}`,
    faqs: (i) => `Write 4 FAQs a Pakistani client would ask about: ${i.title}.\nContext: ${String(i.text || "").slice(0, 3000)}\nReturn ONLY JSON: [{"q":"...","a":"1-3 sentences"}]`,
  };
  const BIZ_DEF = { email: "info@woodex.com.pk", phone1: "+92 322 4000768", phone2: "+92 321 4686884", wa: "+92 322 4000768", addr1: "M-71, Zainab Tower", addr2: "Model Town Link Road", city: "Lahore", country: "Pakistan", days: "Mon–Sat", open: "09:30", close: "18:30" };
  const BIZ_ASSETS = ["assets/site.js", "assets/js/whatsapp-widget.js"];
  const safeRel = (r) => typeof r === "string" && /^[a-z0-9][a-z0-9/_\-.]*\.html$/i.test(r) && !r.includes("..") && !/^(_private|builder|admin|api|assets)\//.test(r);
  const cityRelOk = (r) => typeof r === "string" && /^[a-z0-9][a-z0-9-]{0,59}\/index\.html$/.test(r) && !/^(builder|admin|api|assets|insights|projects)\//.test(r);
  async function a6(action, inp, need, db, ip) {
    if (!/^(cms_|ai_)/.test(action)) return null;
    const ED = ["owner", "admin", "editor"], OA = ["owner", "admin"];
    const c = cmsLoad(), done = (o) => { jw(CMS, c); save(db); return o; };
    const find = (id) => { const it = c.items.find((x) => x.id === +id); if (!it) throw new Fail("Item not found", 404); return it; };
    switch (action) {
      case "cms_page_kinds": { need(ED); const out = {}; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const a = path.join(d, f.name); if (f.isDirectory()) { if (!/^(_private|builder|admin|api|assets|node_modules)$/.test(f.name) || d !== ROOT) walk(a); } else if (f.name.endsWith(".html")) { const rel = path.relative(ROOT, a).split(path.sep).join("/"); if (!safeRel(rel)) continue; const m = /<body[^>]*data-page="([^"]*)"/i.exec(fs.readFileSync(a, "utf8").slice(0, 12000)); out[rel] = m ? m[1] : ""; } } }; walk(ROOT); return { ok: true, kinds: out }; }
      case "cms_sitemap_add": { need(ED); const rel = String(inp.rel || ""); if (!safeRel(rel) || !fs.existsSync(path.join(ROOT, rel))) throw new Fail("Page not found"); sitemapAdd(rel); return { ok: true }; }
      case "cms_biz_get": { need(ED); return { ok: true, biz: Object.assign({}, BIZ_DEF, c.biz || {}), applied: Object.assign({}, BIZ_DEF, c.bizApplied || {}) }; }
      case "cms_biz_save": {
        const u = need(OA), b = inp.biz || {}, o = {}; for (const k of Object.keys(BIZ_DEF)) o[k] = clip(b[k], 160) || BIZ_DEF[k];
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) throw new Fail("Check the email address");
        for (const k of ["phone1", "phone2", "wa"]) if (o[k].replace(/\D/g, "").length < 10) throw new Fail("Check the phone numbers (use +92 format)");
        if (!/^\d{2}:\d{2}$/.test(o.open) || !/^\d{2}:\d{2}$/.test(o.close)) throw new Fail("Check the opening hours");
        c.biz = o; if (inp.applied) c.bizApplied = { ...o }; log(db, u, inp.applied ? "business.apply" : "business.save", "", ip); return done({ ok: true, biz: o, applied: Object.assign({}, BIZ_DEF, c.bizApplied || {}) });
      }
      case "cms_biz_assets": {
        const u = need(OA), pairs = (Array.isArray(inp.pairs) ? inp.pairs : []).filter((p) => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string" && p[0].length >= 4 && p[0].length < 200 && p[1].length < 200 && !/[<>\\`]/.test(p[1]));
        let n = 0; for (const rel of BIZ_ASSETS) { const f = path.join(ROOT, rel); if (!fs.existsSync(f)) continue; let x = fs.readFileSync(f, "utf8"); const before = x; for (const [a, b2] of pairs) x = x.split(a).join(b2); if (x !== before) { cmsBackup(rel); fs.writeFileSync(f, x); n++; } }
        log(db, u, "business.assets", n + " files", ip); return { ok: true, files: n };
      }
      case "cms_list": { need(ED); const ty = CTYPES.includes(inp.type) ? inp.type : null; return { ok: true, items: c.items.filter((x) => !ty || x.type === ty).map(({ pending, ...x }) => ({ ...x, hasPending: !!pending })).reverse(), aiReady: !!c.ai[c.ai.provider + "Key"] }; }
      case "cms_get": { need(ED); const { pending, ...it } = find(inp.id); return { ok: true, item: it }; }
      case "cms_save": {
        const u = need(ED), type = String(inp.type || ""); if (!CTYPES.includes(type)) throw new Fail("Unknown content type");
        const title = clip(inp.title, 160); if (!title) throw new Fail(type === "testimonial" || type === "member" ? "Name is required" : "Title is required");
        const data = inp.data && typeof inp.data === "object" ? inp.data : {}; if (JSON.stringify(data).length > 400000) throw new Fail("Content is too large");
        let it = inp.id ? find(inp.id) : null;
        const slug = PAGE_TYPES[type] ? String(inp.slug || "").toLowerCase() : "";
        if (PAGE_TYPES[type]) {
          if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(slug)) throw new Fail("Page address: lowercase letters, numbers and dashes only");
          if (it && it.rel && it.slug !== slug) throw new Fail("The address of a published page cannot be changed");
          if (c.items.some((x) => x.type === type && x.slug === slug && x !== it)) throw new Fail("Another item already uses that address");
          if (!it || !it.rel) { const rel = PAGE_TYPES[type] + "/" + slug + "/index.html"; if (fs.existsSync(path.join(ROOT, rel)) && !(inp.claim === rel)) throw new Fail("A page already exists at /" + PAGE_TYPES[type] + "/" + slug + "/"); }
        }
        if (type === "city") { const cs = String(inp.slug || "").toLowerCase(); if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(cs)) throw new Fail("Page address: lowercase letters, numbers and dashes only"); if ((!it || !it.rel) && fs.existsSync(path.join(ROOT, cs, "index.html"))) throw new Fail("A page already exists at /" + cs + "/"); if (c.items.some((x) => x.type === "city" && x.slug === cs && x !== it)) throw new Fail("Another draft already uses that address"); inp.slug = cs; }
        if (!it) { it = { id: ++c.seq, type, status: "draft", created_at: now(), created_by: u.name, rel: null }; c.items.push(it); }
        Object.assign(it, { title, slug: type === "city" ? inp.slug : slug, data, seo: { title: clip(inp.seo && inp.seo.title, 90), desc: clip(inp.seo && inp.seo.desc, 200), og: clip(inp.seo && inp.seo.og, 300) }, order: +inp.order || 0, updated_at: now(), updated_by: u.name });
        if (inp.claim && PAGE_TYPES[type] && inp.claim === PAGE_TYPES[type] + "/" + slug + "/index.html") { it.rel = inp.claim; it.status = "published"; it.imported = true; }
        const st = String(inp.status || "");
        if (st === "draft" && it.status === "scheduled") { it.status = "draft"; delete it.pending; }
        if (st === "scheduled") {
          const at = String(inp.publishAt || "").replace("T", " ").slice(0, 16); if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(at)) throw new Fail("Pick a publish date and time");
          if (it.rel) throw new Fail("This item is already live. Just publish your changes.");
          if (PAGE_TYPES[type]) { const p = inp.pending || {}; if (!cmsRelOk(p.rel, type) || !htmlOk(p.html)) throw new Fail("Could not prepare the scheduled page"); it.pending = { rel: p.rel, html: p.html, card: clip(p.card, 4000) }; }
          it.status = "scheduled"; it.publishAt = at + ":00";
        }
        if (st === "published" && !PAGE_TYPES[type]) { it.status = "published"; it.published_at = it.published_at || now(); }
        log(db, u, "content.save", type + ": " + title, ip); return done({ ok: true, item: it });
      }
      case "cms_published": { // called by the browser after it wrote the page with the builder API
        const u = need(ED), it = find(inp.id); if (!PAGE_TYPES[it.type] && it.type !== "city") throw new Fail("Not a page item");
        const rel = String(inp.rel || ""); if (!(it.type === "city" ? cityRelOk(rel) : cmsRelOk(rel, it.type)) || !fs.existsSync(path.join(ROOT, rel))) throw new Fail("Page was not written");
        it.rel = rel; it.status = "published"; it.published_at = it.published_at || now(); delete it.pending; it.publishAt = null; if (it.type === "city") it.data = { source: (it.data || {}).source || "" }; sitemapAdd(rel);
        log(db, u, "content.publish", it.title, ip); return done({ ok: true, item: it });
      }
      case "cms_status": { const u = need(ED), it = find(inp.id); if (PAGE_TYPES[it.type]) throw new Fail("Use Publish for pages"); it.status = inp.status === "published" ? "published" : "draft"; log(db, u, "content." + it.status, it.title, ip); return done({ ok: true, item: it }); }
      case "cms_reorder": { need(ED); (Array.isArray(inp.ids) ? inp.ids : []).forEach((id, n) => { const it = c.items.find((x) => x.id === +id); if (it) it.order = n + 1; }); return done({ ok: true }); }
      case "cms_delete": { const u = need(OA), it = find(inp.id); if (it.rel) throw new Fail("This page is live. Pages cannot be deleted; edit it instead."); c.items = c.items.filter((x) => x !== it); log(db, u, "content.delete", it.title, ip); return done({ ok: true }); }
      case "cms_placements": { need(ED); return { ok: true, placements: c.placements || { testimonial: ["index.html", "about/index.html"], member: ["about/index.html"] } }; }
      case "cms_placements_save": { const u = need(OA), p = inp.placements || {}; c.placements = {}; ["testimonial", "member"].forEach((k) => { c.placements[k] = (Array.isArray(p[k]) ? p[k] : []).filter((r) => /^[a-z0-9][a-z0-9/_\-.]*\.html$/i.test(r) && !r.includes("..") && !/^(_private|builder|admin|api|assets)\//.test(r)).slice(0, 80); const st = p[k + "Set"] || {}; c.placements[k + "Set"] = { kicker: clip(st.kicker, 60), heading: clip(st.heading, 120) }; }); log(db, u, "content.placements", "", ip); return done({ ok: true, placements: c.placements }); }
      case "cms_ai_get": need(OA); return { ok: true, ai: aiPub(c.ai) };
      case "cms_ai_save": {
        const u = need(OA), s = inp.ai || {};
        for (const k of Object.keys(AI_DEF)) { if (!(k in s)) continue; if (AI_SECRETS.includes(k) && s[k] === "" && !s[k + "Clear"]) continue; c.ai[k] = clip(s[k], k === "voice" ? 800 : 300); }
        if (!["anthropic", "openai", "openrouter", "custom"].includes(c.ai.provider)) c.ai.provider = "anthropic";
        log(db, u, "settings.ai", c.ai.provider, ip); return done({ ok: true, ai: aiPub(c.ai) });
      }
      case "ai_run": {
        const u = need(ED), task = String(inp.task || ""); if (!AI_TASKS[task]) throw new Fail("Unknown AI task");
        const text = await aiCall(c.ai, "You write website copy for Woodex Interior. " + c.ai.voice, AI_TASKS[task](inp.input || {}));
        log(db, u, "ai." + task, "", ip); save(db); return { ok: true, text };
      }
      case "cms_ai_models": { need(OA); const p = inp.provider || c.ai.provider; let key = String(inp.key || "").trim() || c.ai[p + "Key"] || ""; if (key === "none") key = "";
        const base = (String(inp.url || "").trim() || c.ai.customUrl || "").replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
        if (p === "custom" && !/^https?:\/\//i.test(base)) throw new Fail("Enter the endpoint URL first (e.g. https://your-tunnel.example.com/v1)");
        if (!key && p !== "custom" && p !== "openrouter") throw new Fail("Enter the API key first");
        const url = { anthropic: "https://api.anthropic.com/v1/models?limit=100", openai: "https://api.openai.com/v1/models", openrouter: "https://openrouter.ai/api/v1/models", custom: base + "/models" }[p];
        const h = p === "anthropic" ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : key ? { authorization: "Bearer " + key } : {};
        let j; try { const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) }); j = await r.json().catch(() => ({})); if (!r.ok) throw new Fail("Provider said: " + (j.error?.message || "HTTP " + r.status), 502); } catch (e) { if (e instanceof Fail) throw e; throw new Fail("Could not reach the provider: " + (e.cause?.code || e.message), 502); }
        const ids = [...new Set((j.data || j.models || []).map(m => String(m.id || m.name || "")).filter(id => id && !(p === "openai" && !/^(gpt|o\d|chatgpt)/.test(id)) && !/(embed|whisper|tts|dall-e|image|audio|realtime|moderation|transcribe|search)/i.test(id)))];
        if (!ids.length) throw new Fail("No chat models returned by this provider");
        const pref = { anthropic: ["claude-sonnet-4", "claude-3-7-sonnet"], openai: ["gpt-4.1-mini", "gpt-4o-mini"], openrouter: ["anthropic/claude-sonnet-4", "openai/gpt-4o-mini"], custom: [] }[p] || [];
        let best = ids[0]; outer: for (const w of pref) for (const id of ids) if (id.startsWith(w)) { best = id; break outer; }
        if (p !== "anthropic") ids.sort(); return { ok: true, models: ids.slice(0, 400), recommended: best }; }
      case "ai_test": { need(OA); const t = await aiCall(c.ai, "Reply with one word.", "Say OK."); return { ok: true, text: t.slice(0, 60) }; }
    }
    return null;
  }

  // ================================================================== A7: media library, site backups, site health
  const MEDIA = path.join(PRIV, "media.json"), MTRASH = path.join(PRIV, "media-trash"), SBK = path.join(PRIV, "site-backups"), HEALTH = path.join(PRIV, "health.json");
  const IMG_DIRS = ["assets/img", "assets/uploads"], IMG_RE = /\.(webp|jpe?g|png|gif|svg|avif)$/i, SITE_URL = "https://woodex.com.pk";
  const sniff = (b) => b[0] === 0xff && b[1] === 0xd8 ? "jpg" : b[0] === 0x89 && b[1] === 0x50 ? "png" : b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP" ? "webp" : b.slice(0, 3).toString() === "GIF" ? "gif" : null;
  const mediaRelOk = (u) => typeof u === "string" && /^\/assets\/(img|uploads)\/([a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png|gif|svg|avif)$/i.test(u) && !u.includes("..");
  const walkFiles = (dir, test, out = [], skipRoot = null) => { if (!fs.existsSync(dir)) return out; for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const a = path.join(dir, f.name); if (f.isDirectory()) { if (skipRoot && dir === ROOT && skipRoot.test(f.name)) continue; walkFiles(a, test, out, skipRoot); } else if (test(f.name)) out.push(a); } return out; };
  const relOf = (a) => path.relative(ROOT, a).split(path.sep).join("/");
  const htmlPages = () => walkFiles(ROOT, (n) => n.endsWith(".html"), [], /^(_private|builder|admin|api|assets|node_modules)$/).map(relOf);
  /** Text of everything that can reference an image: pages, CSS/JS, stored content (drafts, company logo…). */
  function usageCorpus() {
    const parts = htmlPages().map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel), "utf8")]);
    for (const a of walkFiles(path.join(ROOT, "assets"), (n) => /\.(css|js)$/.test(n))) parts.push([relOf(a), fs.readFileSync(a, "utf8")]);
    for (const f of fs.existsSync(PRIV) ? fs.readdirSync(PRIV).filter((n) => n.endsWith(".json") && !/^(media|health|admin-db|crm|db|config|redirects)\.json$/.test(n)) : []) parts.push(["_private/" + f, fs.readFileSync(path.join(PRIV, f), "utf8")]);
    return parts;
  }
  const mediaLoad = () => { const m = jr(MEDIA, {}); m.alt = m.alt || {}; m.trash = m.trash || []; m.seq = m.seq || 0; return m; };
  function backupOne(kind, u) {
    fs.mkdirSync(SBK, { recursive: true });
    const t = new Date(), p = (n) => String(n).padStart(2, "0"), name = `${kind}-${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}.tar.gz`;
    const list = [...htmlPages(), "sitemap.xml", "robots.txt", ".htaccess", "assets/site.js", "assets/js", "assets/v1.css"].filter((r) => fs.existsSync(path.join(ROOT, r)));
    if (fs.existsSync(PRIV)) for (const f of fs.readdirSync(PRIV)) if (!/^(backups|site-backups|media-trash|trash)$/.test(f)) list.push("_private/" + f);
    if (kind !== "daily") list.push(...IMG_DIRS.filter((d) => fs.existsSync(path.join(ROOT, d))));
    const lf = path.join(SBK, ".list"); fs.writeFileSync(lf, list.join("\n"));
    execFileSync("tar", ["czf", path.join(SBK, name), "-C", ROOT, "-T", lf]); fs.unlinkSync(lf);
    // retention: 7 daily, 4 weekly, 10 manual, 3 safety
    const keep = { daily: 7, weekly: 4, full: 10, safety: 3 };
    for (const k of Object.keys(keep)) { const fsx = fs.readdirSync(SBK).filter((f) => f.startsWith(k + "-")).sort(); while (fsx.length > keep[k]) fs.unlinkSync(path.join(SBK, fsx.shift())); }
    return { name, size: fs.statSync(path.join(SBK, name)).size, by: u ? u.name : "cron" };
  }
  const bkList = () => (fs.existsSync(SBK) ? fs.readdirSync(SBK).filter((f) => /^(daily|weekly|full|safety|upload)-\d{8}-\d{6}\.(tar\.gz|zip)$/.test(f)).sort().reverse().map((f) => { const s = fs.statSync(path.join(SBK, f)); return { name: f, kind: f.split("-")[0], size: s.size, at: s.mtime.toISOString().slice(0, 19).replace("T", " ") }; }) : []);
  function backupAuto() {
    const l = bkList(), age = (k) => { const b = l.find((x) => x.kind === k); return b ? (Date.now() - fs.statSync(path.join(SBK, b.name)).mtimeMs) / 36e5 : 1e9; };
    const made = []; if (age("daily") > 20) made.push(backupOne("daily").name); if (age("weekly") > 24 * 6.5) made.push(backupOne("weekly").name);
    const h = jr(HEALTH, {}); h.lastCron = now(); jw(HEALTH, h); return made;
  }
  // ---- health scan
  function healthScan() {
    const redir = jr(REDIR, []).map((r) => r.from.replace(/\/$/, "")), pages = htmlPages(), issues = [], titles = {}, sizeCache = {};
    const fileFor = (href) => { let p = decodeURIComponent(href.split(/[?#]/)[0]); if (!p || p === "/") return "index.html"; p = p.replace(/^\/+/, ""); if (p.endsWith("/")) return p + "index.html"; return /\.[a-z0-9]+$/i.test(p) ? p : p + "/index.html"; };
    const add = (rel, type, sev, msg, extra) => issues.push({ rel, type, sev, msg, ...(extra || {}) });
    for (const rel of pages) {
      if (rel === "404.html") continue;
      const h = fs.readFileSync(path.join(ROOT, rel), "utf8"), attr = (tag, a) => { const m = new RegExp("\\s" + a + "\\s*=\\s*\"([^\"]*)\"", "i").exec(tag); return m ? m[1] : null; };
      const title = ((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1] || "").trim(), desc = attr((/<meta[^>]+name="description"[^>]*>/i.exec(h) || [""])[0], "content");
      if (!title) add(rel, "seo", 3, "Missing page title"); else { if (title.length > 65) add(rel, "seo", 1, `Title is long (${title.length} characters, aim for 60)`); if (title.length < 20) add(rel, "seo", 1, "Title is very short"); (titles[title] = titles[title] || []).push(rel); }
      if (!desc) add(rel, "seo", 2, "Missing meta description"); else if (desc.length > 165) add(rel, "seo", 1, `Description is long (${desc.length}, aim for 150-158)`); else if (desc.length < 70) add(rel, "seo", 1, `Description is short (${desc.length})`);
      const main = h.replace(/<script[\s\S]*?<\/script>/gi, ""), h1 = (main.match(/<h1[\s>]/gi) || []).length;
      if (h1 === 0) add(rel, "seo", 2, "No main heading (H1)"); else if (h1 > 1) add(rel, "seo", 1, `${h1} main headings (H1), use one`);
      if (!/<link[^>]+rel="canonical"/i.test(h)) add(rel, "seo", 1, "No canonical link");
      let noAlt = 0; for (const m of main.matchAll(/<img\b[^>]*>/gi)) { const a = attr(m[0], "alt"); if ((a === null || !a.trim()) && !/aria-hidden="true"|role="presentation"/.test(m[0])) noAlt++; }
      if (noAlt) add(rel, "alt", 2, `${noAlt} image(s) without alt text`, { count: noAlt });
      const seen = new Set();
      for (const m of main.matchAll(/\shref="(\/[^"]*)"/gi)) { const href = m[1]; if (/^\/\/|^\/(api|admin|builder)\//.test(href) || seen.has(href)) continue; seen.add(href); const f = fileFor(href); if (!fs.existsSync(path.join(ROOT, f)) && !redir.includes(href.split(/[?#]/)[0].replace(/\/$/, ""))) add(rel, "link", 3, "Broken link: " + href, { target: href }); }
      for (const m of main.matchAll(/\s(?:src|href|content)="((?:https:\/\/woodex\.com\.pk)?\/assets\/[^"]+\.(?:webp|jpe?g|png|gif|svg|avif))"/gi)) {
        const u = m[1].replace(SITE_URL, ""), f = path.join(ROOT, u.split("?")[0]); if (seen.has(u)) continue; seen.add(u);
        if (!fs.existsSync(f)) { add(rel, "image", 3, "Missing image: " + u, { target: u }); continue; }
        const sz = sizeCache[u] ?? (sizeCache[u] = fs.statSync(f).size); if (sz > 350 * 1024) add(rel, "image", 1, `Large image ${u.split("/").pop()} (${Math.round(sz / 1024)} KB)`, { target: u, size: sz });
      }
    }
    for (const [t, rels] of Object.entries(titles)) if (rels.length > 1) rels.forEach((r) => add(r, "seo", 1, `Same title as ${rels.length - 1} other page(s)`));
    const pen = issues.reduce((a, i) => a + (i.sev === 3 ? 3 : i.sev === 2 ? 1.2 : 0.35), 0), score = Math.max(0, Math.min(100, Math.round(100 - pen * 100 / (pages.length * 4))));
    return { score, pages: pages.length, at: now(), issues, counts: ["seo", "alt", "link", "image"].reduce((o, k) => (o[k] = issues.filter((i) => i.type === k).length, o), {}) };
  }

  async function a7(action, inp, need, db, ip) {
    if (!/^(media_|backup_|health_)/.test(action)) return null;
    const ED = ["owner", "admin", "editor"], OA = ["owner", "admin"];
    switch (action) {
      case "media_list": {
        need(ED); const m = mediaLoad(), corpus = usageCorpus(), files = [];
        for (const d of IMG_DIRS) for (const a of walkFiles(path.join(ROOT, d), (n) => IMG_RE.test(n))) {
          const url = "/" + relOf(a), s = fs.statSync(a), base = url.slice(1), name = path.basename(a);
          const used = corpus.filter(([, t]) => t.includes(base) || (name.length > 10 && t.includes(name))).map(([r]) => r);
          files.push({ url, name, folder: d === "assets/img" ? "site" : (path.relative(path.join(ROOT, d), path.dirname(a)).split(path.sep).join("/") || "uploads"), size: s.size, mtime: s.mtime.toISOString().slice(0, 19).replace("T", " "), alt: m.alt[url] || "", used });
        }
        const folders = fs.existsSync(path.join(ROOT, "assets/uploads")) ? fs.readdirSync(path.join(ROOT, "assets/uploads"), { withFileTypes: true }).filter((f) => f.isDirectory()).map((f) => f.name) : [];
        return { ok: true, files: files.sort((a, b) => b.mtime.localeCompare(a.mtime)), folders, trash: m.trash.length };
      }
      case "media_folder": { need(ED); const n = String(inp.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); if (!n) throw new Fail("Folder name: letters and numbers"); fs.mkdirSync(path.join(ROOT, "assets/uploads", n), { recursive: true }); return { ok: true, name: n }; }
      case "media_upload": case "media_replace": {
        const u = need(action === "media_upload" ? ED : OA), data = Buffer.from(String(inp.data || ""), "base64");
        if (!data.length || data.length > 8 * 1024 * 1024) throw new Fail("Image is empty or larger than 8 MB"); const ext = sniff(data); if (!ext) throw new Fail("Only JPG, PNG, WebP or GIF images are allowed");
        if (action === "media_replace") {
          const url = String(inp.url || ""); if (!mediaRelOk(url)) throw new Fail("Invalid image"); const abs = path.join(ROOT, url); if (!fs.existsSync(abs)) throw new Fail("Image not found", 404);
          const cur = path.extname(abs).slice(1).toLowerCase().replace("jpeg", "jpg"); if (cur !== ext) throw new Fail("The new file must be the same format (" + cur + ")");
          const m = mediaLoad(); fs.mkdirSync(MTRASH, { recursive: true }); const tf = Date.now() + "-" + path.basename(abs); fs.copyFileSync(abs, path.join(MTRASH, tf));
          m.trash.push({ id: ++m.seq, url, file: tf, size: fs.statSync(abs).size, at: now(), by: u.name, why: "replaced" }); jw(MEDIA, m);
          const before = fs.statSync(abs).size; fs.writeFileSync(abs, data); log(db, u, "media.optimise", url, ip); save(db); return { ok: true, url, before, after: data.length };
        }
        const folder = String(inp.folder || "").replace(/[^a-z0-9-]/g, ""), dir = path.join(ROOT, "assets/uploads", folder); if (folder && !fs.existsSync(dir)) throw new Fail("Folder not found");
        fs.mkdirSync(dir, { recursive: true });
        const base = (String(inp.name || "image").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image").slice(0, 40), name = `${base}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
        fs.writeFileSync(path.join(dir, name), data); const url = "/assets/uploads/" + (folder ? folder + "/" : "") + name;
        if (inp.alt) { const m = mediaLoad(); m.alt[url] = clip(inp.alt, 200); jw(MEDIA, m); }
        log(db, u, "media.upload", url, ip); save(db); return { ok: true, url, size: data.length };
      }
      case "media_alt": {
        const u = need(ED), url = String(inp.url || ""), alt = clip(inp.alt, 200); if (!mediaRelOk(url)) throw new Fail("Invalid image");
        const m = mediaLoad(); m.alt[url] = alt; jw(MEDIA, m); let pages = 0;
        if (inp.apply && alt) {
          const ea = alt.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
          for (const rel of htmlPages()) {
            const abs = path.join(ROOT, rel), h = fs.readFileSync(abs, "utf8"); if (!h.includes(url)) continue;
            const n = h.replace(/<img\b[^>]*>/gi, (tag) => { if (!tag.includes('src="' + url + '"') && !tag.includes('src="' + SITE_URL + url + '"')) return tag; if (/\salt="[^"]+"/.test(tag)) return tag; return /\salt=""/.test(tag) ? tag.replace(/\salt=""/, ` alt="${ea}"`) : tag.replace(/^<img/i, `<img alt="${ea}"`); });
            if (n !== h) { cmsBackup(rel); fs.writeFileSync(abs, n); pages++; }
          }
        }
        log(db, u, "media.alt", url, ip); save(db); return { ok: true, pages };
      }
      case "media_trash": {
        const u = need(OA), m = mediaLoad(), urls = (Array.isArray(inp.urls) ? inp.urls : []).filter(mediaRelOk).slice(0, 200), corpus = inp.force ? [] : usageCorpus(), moved = [], blocked = [];
        fs.mkdirSync(MTRASH, { recursive: true });
        for (const url of urls) {
          const abs = path.join(ROOT, url); if (!fs.existsSync(abs)) continue;
          if (corpus.some(([, t]) => t.includes(url.slice(1)))) { blocked.push(url); continue; }
          const tf = Date.now() + "-" + crypto.randomBytes(2).toString("hex") + "-" + path.basename(abs); m.trash.push({ id: ++m.seq, url, file: tf, size: fs.statSync(abs).size, at: now(), by: u.name, why: "deleted" }); fs.renameSync(abs, path.join(MTRASH, tf)); moved.push(url);
        }
        jw(MEDIA, m); log(db, u, "media.trash", moved.length + " file(s)", ip); save(db); return { ok: true, moved, blocked };
      }
      case "media_trash_list": { need(OA); return { ok: true, trash: mediaLoad().trash.slice().reverse() }; }
      case "media_restore": case "media_purge": {
        const u = need(OA), m = mediaLoad(), ids = inp.all ? m.trash.map((t) => t.id) : [+inp.id]; let n = 0;
        for (const id of ids) {
          const i = m.trash.findIndex((t) => t.id === id); if (i < 0) continue; const t = m.trash[i], src = path.join(MTRASH, t.file);
          if (action === "media_restore") { const dst = path.join(ROOT, t.url); if (fs.existsSync(dst) && t.why !== "replaced") throw new Fail("A file with that name exists again"); fs.mkdirSync(path.dirname(dst), { recursive: true }); if (fs.existsSync(src)) fs.copyFileSync(src, dst); }
          if (fs.existsSync(src)) fs.unlinkSync(src); m.trash.splice(i, 1); n++;
        }
        jw(MEDIA, m); log(db, u, action === "media_restore" ? "media.restore" : "media.purge", n + " file(s)", ip); save(db); return { ok: true, n };
      }
      case "backup_list": { need(OA); const h = jr(HEALTH, {}); return { ok: true, backups: bkList(), lastCron: h.lastCron || null, format: "tar.gz" }; }
      case "backup_run": { const u = need(OA), kind = inp.kind === "daily" ? "daily" : "full"; const b = backupOne(kind, u); log(db, u, "backup.create", b.name, ip); save(db); return { ok: true, backup: b }; }
      case "backup_delete": { const u = need(OA), b = bkList().find((x) => x.name === inp.name); if (!b) throw new Fail("Backup not found", 404); fs.unlinkSync(path.join(SBK, b.name)); log(db, u, "backup.delete", b.name, ip); save(db); return { ok: true }; }
      case "backup_restore": {
        const u = need(OA), b = bkList().find((x) => x.name === inp.name); if (!b) throw new Fail("Backup not found", 404);
        const safety = backupOne("safety", u); execFileSync("tar", ["xzf", path.join(SBK, b.name), "-C", ROOT]);
        db = load(); log(db, u, "backup.restore", b.name + " (safety copy " + safety.name + ")", ip); save(db); return { ok: true, safety: safety.name };
      }
      case "health_get": { need(ED); const h = jr(HEALTH, {}); return { ok: true, scan: h.scan || null, psi: h.psi || {}, psiKeySet: !!h.psiKey, site: h.site || SITE_URL, lastCron: h.lastCron || null }; }
      case "health_scan": { const u = need(ED), h = jr(HEALTH, {}); h.scan = healthScan(); jw(HEALTH, h); log(db, u, "health.scan", h.scan.score + "/100", ip); save(db); return { ok: true, scan: h.scan }; }
      case "health_settings": { need(OA); const h = jr(HEALTH, {}); if (typeof inp.psiKey === "string" && inp.psiKey !== "") h.psiKey = inp.psiKey.trim().slice(0, 100); if (inp.clearKey) delete h.psiKey; if (/^https:\/\/[a-z0-9.-]+$/i.test(inp.site || "")) h.site = inp.site; jw(HEALTH, h); return { ok: true, psiKeySet: !!h.psiKey, site: h.site || SITE_URL }; }
      case "health_speed": { need(ED); const h = jr(HEALTH, {}); return { ok: true, psi: h.psi || {}, psiKeySet: !!h.psiKey, site: h.site || SITE_URL }; }
      case "health_psi": {
        need(ED); const h = jr(HEALTH, {}), rel = String(inp.rel || "index.html"); if (!/^[a-z0-9][a-z0-9/_\-.]*\.html$/i.test(rel) || rel.includes("..")) throw new Fail("Invalid page");
        const strategy = inp.strategy === "desktop" ? "desktop" : "mobile", url = (h.site || SITE_URL) + "/" + rel.replace(/index\.html$/, "");
        const q = new URLSearchParams({ url, strategy }); ["performance", "accessibility", "best-practices", "seo"].forEach((c) => q.append("category", c)); if (h.psiKey) q.set("key", h.psiKey);
        const r = process.env.PSI_FAKE ? await psiFake(strategy) : await fetch("https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" + q, { signal: AbortSignal.timeout(90000) }).catch((e) => ({ ok: false, statusText: e.message }));
        if (!r.ok) { let msg = r.statusText || "request failed"; try { msg = (await r.json()).error.message; } catch {} throw new Fail("PageSpeed: " + String(msg).slice(0, 200)); }
        const j = await r.json(), cat = j.lighthouseResult.categories, au = j.lighthouseResult.audits, sc = (k) => (cat[k] ? Math.round(cat[k].score * 100) : null);
        const res = { at: now(), strategy, perf: sc("performance"), a11y: sc("accessibility"), bp: sc("best-practices"), seo: sc("seo"), lcp: au["largest-contentful-paint"] && au["largest-contentful-paint"].displayValue, cls: au["cumulative-layout-shift"] && au["cumulative-layout-shift"].displayValue, tbt: au["total-blocking-time"] && au["total-blocking-time"].displayValue, fcp: au["first-contentful-paint"] && au["first-contentful-paint"].displayValue, si: au["speed-index"] && au["speed-index"].displayValue, tips: psiTips(au) };
        const h2 = jr(HEALTH, {}); h2.psi = h2.psi || {}; const k = rel + "|" + strategy; h2.psi[k] = [res, ...(h2.psi[k] || [])].slice(0, 10); jw(HEALTH, h2); return { ok: true, result: res };
      }
    }
    return null;
  }
  /* P15: top 5 suggestions (mirrors psi_tips in media-lib.php) */
  function psiTips(au) {
    const t = [];
    for (const [id, a] of Object.entries(au)) {
      if (a.score == null || a.score >= 0.9) continue;
      const ms = Math.max(+(a.details && a.details.overallSavingsMs) || 0, +(a.metricSavings && a.metricSavings.LCP) || 0, +(a.metricSavings && a.metricSavings.FCP) || 0);
      const kb = (+(a.details && a.details.overallSavingsBytes) || 0) / 1024;
      if (ms <= 0 && kb <= 0 && a.scoreDisplayMode !== "metricSavings") continue;
      t.push({ id, title: String(a.title || id).replace(/<[^>]+>/g, "").slice(0, 120), value: String(a.displayValue || "").slice(0, 60), ms: Math.round(ms), kb: Math.round(kb) });
    }
    return t.sort((x, y) => y.ms - x.ms || y.kb - x.kb).slice(0, 5);
  }
  /* Test mode: PSI_FAKE=1 returns a realistic fake PageSpeed answer (no Google call). */
  function psiFake(strategy) {
    const d = strategy === "desktop", rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
    const j = { lighthouseResult: { categories: { performance: { score: (d ? rnd(95, 100) : rnd(86, 97)) / 100 }, accessibility: { score: rnd(96, 101) / 100 }, "best-practices": { score: 1 }, seo: { score: 1 } },
      audits: { "largest-contentful-paint": { displayValue: (d ? 0.8 : 2.6) + " s" }, "cumulative-layout-shift": { displayValue: "0.01" }, "total-blocking-time": { displayValue: "20 ms" }, "first-contentful-paint": { displayValue: (d ? 0.5 : 1.8) + " s" }, "speed-index": { displayValue: (d ? 0.9 : 3.1) + " s" },
        "render-blocking-insight": { title: "Render blocking requests", score: 0.5, displayValue: "Est savings of 300 ms", scoreDisplayMode: "metricSavings", metricSavings: { FCP: 300, LCP: 300 } },
        "image-delivery-insight": { title: "Improve image delivery", score: 0.5, displayValue: "Est savings of 42 KiB", scoreDisplayMode: "metricSavings", metricSavings: { LCP: 150 }, details: { overallSavingsBytes: 43000 } },
        "unused-css-rules": { title: "Reduce unused CSS", score: 0.5, displayValue: "Est savings of 60 KiB", details: { overallSavingsMs: 120, overallSavingsBytes: 61000 } } } } };
    return Promise.resolve({ ok: true, json: async () => j });
  }
  // raw file download for backups (called by the preview server before JSON handling)
  /* Phase 7 — raw: backup_up (tar.gz body), db_dl (JSON download), db_up (JSON body). Mirrors api/media-lib.php media_raw(). */
  function rawAction(req, action, body) {
    const db = load(); const u = db && current(db, req);
    const J = (st, o) => ({ status: st, type: "application/json; charset=utf-8", body: JSON.stringify(o) });
    if (!u || !["owner", "admin"].includes(u.role)) return J(403, { ok: false, error: "You do not have permission for this" });
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    if (action === "db_dl") return { status: 200, type: "application/json", name: "woodex-database-" + stamp + ".json", body: JSON.stringify({ woodexDb: 1, exported: new Date().toISOString(), tables: db }) };
    if (!body || !body.length) return J(400, { ok: false, error: "The file was empty" });
    if (action === "backup_up") {
      if (!(body[0] === 0x1f && body[1] === 0x8b) && !(body[0] === 0x50 && body[1] === 0x4b)) return J(400, { ok: false, error: "That is not a backup file" });
      fs.mkdirSync(SBK, { recursive: true }); const name = "upload-" + stamp + (body[0] === 0x1f ? ".tar.gz" : ".zip"); fs.writeFileSync(path.join(SBK, name), body);
      log(db, u, "backup.upload", name, ""); save(db); return J(200, { ok: true, name, size: body.length });
    }
    if (action === "db_up") {
      let j; try { j = JSON.parse(body.toString()); } catch { return J(400, { ok: false, error: "This is not a Woodex database file" }); }
      const t = j && (j.tables || j); if (!t || !Array.isArray(t.users) || !t.users.length) return J(400, { ok: false, error: "This is not a Woodex database file" });
      const safety = backupOne("safety", u); save(t); const d2 = load(); log(d2, u, "db.import", "database (safety copy " + safety.name + ")", ""); save(d2);
      return J(200, { ok: true, rows: Object.keys(t).length, safety: safety.name });
    }
    return J(400, { ok: false, error: "Unknown action" });
  }
  function backupFile(req, name) { const db = load(); const u = db && current(db, req); if (!u || !["owner", "admin"].includes(u.role)) return null; const b = bkList().find((x) => x.name === name); return b ? path.join(SBK, b.name) : null; }


  // ================================================================== A8: settings & integrations
  const SETF = path.join(PRIV, "settings.json");
  const GEN_DEF = { siteName: "Woodex Interior", logo: "/assets/img/img-f941b08b9510.png", favicon: "/assets/img/favicon.svg", share: "/assets/img/img-c7d3a3ebd62b.jpg" };
  const TRK_DEF = { ga4: "", gtm: "", pixel: "", gsc: "" };
  const setLoad = () => { const x = jr(SETF, {}); return { general: { ...GEN_DEF, ...(x.general || {}) }, generalApplied: { ...GEN_DEF, ...(x.generalApplied || {}) }, tracking: { ...TRK_DEF, ...(x.tracking || {}) }, trackingApplied: x.trackingApplied || null }; };
  const imgOk = (u) => typeof u === "string" && /^\/assets\/(img|uploads)\/[a-z0-9/_.-]+\.(png|jpe?g|webp|svg|gif|ico)$/i.test(u) && !u.includes("..");
  // ---- Phase 8: Google sign-in (existing users only), AI Agent (MCP) tokens, WhatsApp stats
  const GFILE = path.join(PRIV, "google.json"), MFILE = path.join(PRIV, "mcp.json");
  const gCid = () => String(jr(GFILE, {}).clientId || "").trim();
  const mLoad = () => { const m = jr(MFILE, {}); m.tokens = m.tokens || []; m.log = m.log || []; return m; };
  const mPub = (t) => ({ id: t.id, name: t.name, user: t.user_name || "", hint: t.hint, created_at: t.created_at, last_used: t.last_used || null, uses: t.uses || 0 });
  async function gVerify(cred) {
    const cid = gCid(); if (!cid) throw new Fail("Google sign-in is not set up yet");
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(cred || ""))) throw new Fail("Invalid Google response");
    let t = {}; try { t = await (await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(cred), { signal: AbortSignal.timeout(10000) })).json(); } catch {}
    if (!t.sub || t.aud !== cid || !["accounts.google.com", "https://accounts.google.com"].includes(t.iss) || +t.exp < Date.now() / 1000) throw new Fail("Google sign-in could not be verified", 401);
    if (String(t.email_verified) !== "true") throw new Fail("Your Google email is not verified", 401);
    return { sub: String(t.sub), email: String(t.email || "").toLowerCase() };
  }
  async function p8(action, inp, need, db, ip, req) {
    if (!/^(google_|mcp_|wa_stats$)/.test(action)) return null;
    const OA = ["owner", "admin"], done = (o) => { save(db); return o; };
    switch (action) {
      case "google_cfg": return { ok: true, clientId: gCid() };
      case "google_login": {
        const g = await gVerify(inp.credential);
        const u = db.users.find((x) => x.google_sub === g.sub) || db.users.find((x) => g.email && x.email === g.email);
        if (!u || !u.active) { log(db, null, "login.google_denied", g.email, ip); save(db); throw new Fail("This Google account is not an Admin user. Ask the owner to add " + (g.email || "your email") + " in Users.", 403); }
        if (!u.google_sub) { u.google_sub = g.sub; u.google_email = g.email; }
        if (u.totp_on) { const exp = Math.floor(Date.now() / 1000) + 300; save(db); return { ok: true, need2fa: true, ticket: u.id + "." + exp + "." + hmac("2fa|" + u.id + "|" + exp + "|" + u.pw_ver) }; }
        return done(finishLogin(db, u, req, ip));
      }
      case "google_me": { const u = need(); return { ok: true, clientId: gCid(), linked: !!u.google_sub, email: u.google_email || "" }; }
      case "google_link": {
        const u = need(), g = await gVerify(inp.credential);
        if (db.users.some((x) => x.id !== u.id && x.google_sub === g.sub)) throw new Fail("That Google account is linked to another user");
        u.google_sub = g.sub; u.google_email = g.email; log(db, u, "google.link", g.email, ip); return done({ ok: true, linked: true, email: g.email });
      }
      case "google_unlink": { const u = need(); delete u.google_sub; delete u.google_email; log(db, u, "google.unlink", "", ip); return done({ ok: true, linked: false }); }
      case "google_save": {
        const u = need(["owner"]), cid = String(inp.clientId || "").trim();
        if (cid && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(cid)) throw new Fail("The client ID should end with .apps.googleusercontent.com");
        jw(GFILE, { clientId: cid }); log(db, u, "google.settings", cid ? "on" : "off", ip); return done({ ok: true, clientId: cid });
      }
      case "mcp_tokens": { need(OA); return { ok: true, tokens: mLoad().tokens.slice().reverse().map(mPub) }; }
      case "mcp_token_new": {
        const u = need(OA), m = mLoad(), name = clip(inp.name, 60) || "AI agent";
        if (m.tokens.length >= 20) throw new Fail("Maximum 20 tokens. Revoke an old one first.");
        const raw = "wxmcp_" + crypto.randomBytes(24).toString("hex");
        m.tokens.push({ id: crypto.randomBytes(6).toString("hex"), name, hash: sha(raw), hint: raw.slice(-4), user_id: u.id, user_name: u.name, created_at: now(), last_used: null, uses: 0 });
        jw(MFILE, m); log(db, u, "mcp.token_new", name, ip); return done({ ok: true, token: raw, tokens: m.tokens.slice().reverse().map(mPub) });
      }
      case "mcp_token_revoke": {
        const u = need(OA), m = mLoad(), n = m.tokens.length; m.tokens = m.tokens.filter((t) => t.id !== String(inp.id || ""));
        if (m.tokens.length === n) throw new Fail("Token not found", 404);
        jw(MFILE, m); log(db, u, "mcp.token_revoke", String(inp.id), ip); return done({ ok: true, tokens: m.tokens.slice().reverse().map(mPub) });
      }
      case "mcp_log": { need(OA); return { ok: true, log: mLoad().log.slice(-100).reverse() }; }
      case "wa_stats": {
        need(); const w = jr(path.join(PRIV, "wa-stats.json"), {}), days = w.days || {}, keys = Object.keys(days).sort();
        const since = (n) => new Date(Date.now() - (n - 1) * 864e5).toISOString().slice(0, 10), sum = (n) => keys.filter((k) => k >= since(n)).reduce((a, k) => a + days[k], 0);
        const top = (o) => Object.fromEntries(Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 10));
        const leads30 = (db.leads || []).filter((l) => l.source === "whatsapp" && l.created_at >= since(30)).length;
        return { ok: true, today: days[new Date().toISOString().slice(0, 10)] || 0, d7: sum(7), d30: sum(30), leads30, days: Object.fromEntries(keys.slice(-30).map((k) => [k, days[k]])), pages: top(w.pages), services: top(w.services) };
      }
    }
    return null;
  }
  // ---- Phase 10: live chat + notifications (mirror of api/chat-lib.php; AI replies need the PHP server)
  const CHATF = path.join(PRIV, "chat.json");
  const CHAT_DEF = { on: true, ai: true, emailAlert: true, autoLead: true, greeting: "Assalam-o-Alaikum! 👋 I am the Woodex assistant. Ask me anything about interior design, renovation, fit-out or prices. A team member can join any time.", hours: "Mon–Sat, 9:30 am – 6:30 pm", knowledge: "Woodex Interior is an interior design and build company in Lahore, Pakistan.", tone: "friendly", toneNote: "", qa: [], avoid: "Competitor comparisons\nPolitics or religion", prices: "", openFrom: "09:30", openTo: "18:30", days: [1, 2, 3, 4, 5, 6], afterHours: "Thanks for your message! We are away right now.", waAgent: false, waVerify: "", waSecret: "", waGreeting: "Assalam-o-Alaikum! Thank you for contacting Woodex Interior." };
  const require_rand = () => Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const chatCfg = () => Object.assign({}, CHAT_DEF, jr(CHATF, {}));
  const ensureChat = (db) => { db.chats = db.chats || []; db.chatMsgs = db.chatMsgs || []; db.seqCh = db.seqCh || 0; db.seqCm = db.seqCm || 0; };
  const chatOpenNow = () => { const d = new Date(Date.now() + 5 * 36e5), w = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes(); return w !== 0 && m >= 570 && m < 1110; };
  const chatAdd = (db, c, who, name, text) => { const m = { id: ++db.seqCm, chat_id: c.id, t: now(), who, name: String(name || "").slice(0, 120), text: String(text).slice(0, 4000) }; db.chatMsgs.push(m); c.updated_at = now(); c.last_text = ((who === "visitor" ? "" : who === "agent" ? "You: " : "AI: ") + text).slice(0, 250); if (who === "visitor") c.unread = (c.unread || 0) + 1; return m.id; };
  const chatMsgs = (db, cid, since = 0) => db.chatMsgs.filter((m) => m.chat_id === cid && m.id > since).map(({ chat_id, ...m }) => m);
  const chatPub = (c) => ({ channel: c.channel || "web", id: c.id, created_at: c.created_at, updated_at: c.updated_at, name: c.name || "", phone: c.phone || "", email: c.email || "", page: c.page || "", status: c.status, mode: c.mode, agent: c.agent_name || "", unread: c.unread || 0, needs: !!c.needs, last: c.last_text || "", lead_id: c.lead_id || null });
  const chatMakeLead = (db, c) => { ensureCrm(db); const l = { id: ++db.seqL, created_at: now(), source: "chat", page: c.page, name: c.name || "Chat visitor #" + c.id, phone: c.phone || "", email: c.email || "", service: "", message: chatMsgs(db, c.id).filter((m) => m.who === "visitor").map((m) => "• " + m.text).join("\n").slice(0, 3900), fields: { chat: c.id }, stage: "new", read: false, notes: [], tags: [], value: 0, assigned_to: null, client_id: null, followup: "" }; db.leads.push(l); c.lead_id = l.id; };
  const chatCapture = (db, c, text) => {
    let m; if (!c.phone && (m = /(?:\+?92|0)\s?3\d{2}[\s-]?\d{7}|\+?\d[\d\s-]{8,14}\d/.exec(text))) c.phone = m[0].replace(/[^\d+]/g, "");
    if (!c.email && (m = /[\w.+-]+@[\w-]+\.[\w.]{2,}/.exec(text))) c.email = m[0].toLowerCase();
    if (!c.name && (m = /\b(?:my name is|this is|i am|i'm|name:)\s+([a-z][a-z]+(?:\s[a-z][a-z]+)?)/i.exec(text)) && !/^(looking|interested|from|here|planning|a|an|the)\b/i.test(m[1])) c.name = m[1].toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());
    if (!c.lead_id && (c.phone || c.email) && chatCfg().autoLead) chatMakeLead(db, c);
  };
  /** public visitor endpoint (api/chat.php) */
  const chatPublic = function (req, inp) {
    const cfg = chatCfg(), act = String(inp.action || "cfg"), db = load(), ip = req.socket.remoteAddress || "";
    if (!db) return { ok: true, on: false };
    ensureChat(db);
    if (act === "cfg") return { ok: true, on: !!cfg.on, greeting: cfg.greeting, hours: cfg.hours, open: chatOpenNow(), ai: !!cfg.ai };
    if (!cfg.on) throw new Fail("Chat is offline", 403);
    const vchat = () => { const c = db.chats.find((x) => x.id === +inp.chat_id); if (!c || !/^[a-f0-9]{40}$/.test(String(inp.token || "")) || c.token !== sha(inp.token)) throw new Fail("Chat not found", 404); return c; };
    const vpub = (c, since) => ({ ok: true, chat_id: c.id, mode: c.mode, agent: c.agent_name || "", status: c.status, messages: chatMsgs(db, c.id, since) });
    if (act === "poll") return vpub(vchat(), +inp.since || 0);
    if (act !== "send") throw new Fail("Unknown action", 404);
    const text = String(inp.text || "").trim().slice(0, 2000); if (!text) throw new Fail("Write a message");
    if (clip(inp._hp)) return { ok: true, messages: [] };
    const t = tries.get("c" + ip) || { n: 0, t: Date.now() }; if (Date.now() - t.t > 900000) { t.n = 0; t.t = Date.now(); } if (++t.n > 40) throw new Fail("You are sending messages too fast. Please wait a few minutes.", 429); tries.set("c" + ip, t);
    let c, token = null, isNew = false;
    if (+inp.chat_id) c = vchat();
    else { token = crypto.randomBytes(20).toString("hex"); c = { id: ++db.seqCh, token: sha(token), created_at: now(), updated_at: now(), page: String(inp.page || "/").replace(/[^\w/\-.?=&%]/g, "").slice(0, 200) || "/", ip, name: clip(inp.name, 120) || "", status: "open", mode: "ai", unread: 0, needs: 0 }; db.chats.push(c); isNew = true; chatAdd(db, c, "ai", "Woodex assistant", cfg.greeting); }
    c.status = "open"; chatAdd(db, c, "visitor", c.name, text); chatCapture(db, c, text); c.alerted = 1;
    if (c.mode === "ai" && !db.chatMsgs.some((m) => m.chat_id === c.id && m.who === "sys")) { chatAdd(db, c, "sys", "", chatOpenNow() ? "Thanks! A team member will reply here in a few minutes. You can also leave your phone number and we will call you." : "Thanks for your message! We are away right now (" + cfg.hours + "). Leave your name and phone number and we will call you back first thing."); c.needs = 1; }
    save(db); return { ...vpub(c, isNew ? 0 : +inp.since || 0), ...(token ? { token } : {}) };
  };
  // ---- Phase 12 mirror: client updates (preview writes to _private/outbox/*-update.txt; PHP sends real WhatsApp/email)
  const NTF = path.join(PRIV, "notify.json"), NT_EV = { lead: "Enquiry received", quote: "Quotation sent", started: "Work started", handover: "Handover" };
  const ntMsg = (en, ur) => "Dear {name},\n" + en + "\n\nمحترم {name}، " + ur + "\n\n{company} · {phone}";
  const NT_DEF = { email: true, wa: true, waLang: "en", ev: {
    lead: { on: true, subject: "We received your enquiry: {company}", tpl: "", text: ntMsg("Thank you for contacting {company}. Our team will call you shortly.", "{company} سے رابطہ کرنے کا شکریہ۔ ہماری ٹیم جلد آپ سے رابطہ کرے گی۔") },
    quote: { on: true, subject: "Your quotation {ref} from {company}", tpl: "", text: ntMsg("Your quotation {ref} for {project} is ready: {link}", "{project} کے لیے آپ کی کوٹیشن {ref} تیار ہے: {link}") },
    started: { on: true, subject: "Work has started on {project}", tpl: "", text: ntMsg("Good news! Work has started on {project}.", "خوشخبری! {project} پر کام شروع ہو گیا ہے۔") },
    handover: { on: true, subject: "Your project {project} is ready", tpl: "", text: ntMsg("{project} is complete and ready for handover. Thank you!", "{project} مکمل ہو گیا ہے اور حوالگی کے لیے تیار ہے۔ شکریہ!") } } };
  const ntCfg = () => { const c = Object.assign({}, NT_DEF, jr(NTF, {})); c.ev = Object.assign({}, NT_DEF.ev, c.ev || {}); for (const k in NT_DEF.ev) c.ev[k] = Object.assign({}, NT_DEF.ev[k], c.ev[k] || {}); return c; };
  const ntLog = [];
  // ---- Phase 13 mirror: SEO manager (same actions as api/seo-lib.php; no AI in preview)
  const SEOF = path.join(PRIV, "seo.json"), SEO_SCH = ["LocalBusiness", "Service", "Article", "FAQPage", "BreadcrumbList"];
  const seoData = () => { const d = jr(SEOF, {}); d.pages = d.pages || {}; return d; };
  const seoTypes = (h) => { const t = []; h = h.replace(/<script type="application\/ld\+json" id="wx-seo-schema">[\s\S]*?<\/script>/i, ""); for (const m of h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { (function w(o) { if (!o || typeof o !== "object") return; if (o["@type"]) [].concat(o["@type"]).forEach((x) => t.push(String(x))); Object.values(o).forEach(w); })(JSON.parse(m[1])); } catch {} } return [...new Set(t)]; };
  const seoFaq = (h) => [...h.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)].map((m) => ({ "@type": "Question", name: m[1].replace(/<[^>]+>/g, "").trim(), acceptedAnswer: { "@type": "Answer", text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() } })).filter((x) => x.name && x.acceptedAnswer.text).slice(0, 20);
  async function p13(action, inp, need, db, ip) {
    if (!action.startsWith("seo_")) return null;
    const ED = ["owner", "admin", "editor"];
    switch (action) {
      case "seo_list": { need(ED); const sm = fs.existsSync(path.join(ROOT, "sitemap.xml")) ? (fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").match(/<loc>/g) || []).length : 0; const hl = jr(path.join(PRIV, "health.json"), {});
        return { ok: true, pages: seoData().pages, robots: fs.existsSync(path.join(ROOT, "robots.txt")) ? fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8") : "", sitemap: sm, scanAt: hl.scan ? hl.scan.at : null, broken: hl.scan ? (hl.scan.issues || []).filter((x) => x.type === "link").length : 0, schemas: SEO_SCH, aiReady: false }; }
      case "seo_page": { need(ED); const rel = relOk(inp.path), h = fs.readFileSync(path.join(ROOT, rel), "utf8"); const m = h.match(/<script type="application\/ld\+json" id="wx-seo-schema">([\s\S]*?)<\/script>/i); let mine = []; try { mine = m ? JSON.parse(m[1])["@graph"].map((x) => x["@type"]) : []; } catch {}
        return { ok: true, existing: seoTypes(h), managed: mine, faq: seoFaq(h).length, seo: seoData().pages[rel] || null }; }
      case "seo_save": { const u = need(ED), rel = relOk(inp.path), d = seoData(), p = d.pages[rel] || {}; p.kw = String(inp.kw || "").trim().slice(0, 120); p.related = (inp.related || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
        for (const k of ["seo", "read"]) if (inp[k] != null) p[k] = Math.max(0, Math.min(100, +inp[k] | 0));
        let res = null; if (Array.isArray(inp.schema)) { p.schema = SEO_SCH.filter((t) => inp.schema.includes(t)); backupPage(rel); const abs = path.join(ROOT, rel); let h = fs.readFileSync(abs, "utf8"); const have = seoTypes(h), base = "https://woodex.com.pk", url = base + urlOf(rel), g = [], added = [];
          const title = ((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim(), h1 = ((h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(), desc = ((h.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || "");
          for (const t of p.schema) { if (have.includes(t)) continue;
            if (t === "LocalBusiness") g.push({ "@type": "LocalBusiness", "@id": base + "/#business", name: "Woodex Interior", url: base + "/", telephone: "+92 322 4000768", address: { "@type": "PostalAddress", streetAddress: "M-71, Zainab Tower, Model Town Link Road, Lahore", addressLocality: "Lahore", addressCountry: "PK" } });
            if (t === "Service") g.push({ "@type": "Service", name: h1 || title, description: desc, url, areaServed: "Pakistan", provider: { "@id": base + "/#business", "@type": "LocalBusiness", name: "Woodex Interior" } });
            if (t === "Article") g.push({ "@type": "Article", headline: (h1 || title).slice(0, 110), description: desc, mainEntityOfPage: url, author: { "@type": "Organization", name: "Woodex Interior" } });
            if (t === "FAQPage") { const f = seoFaq(h); if (!f.length) continue; g.push({ "@type": "FAQPage", mainEntity: f }); }
            if (t === "BreadcrumbList") { const parts = urlOf(rel).split("/").filter(Boolean); if (!parts.length) continue; let acc = ""; g.push({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: base + "/" }].concat(parts.map((x, k) => { acc += "/" + x; return { "@type": "ListItem", position: k + 2, name: k === parts.length - 1 && h1 ? h1 : x.replace(/-/g, " "), item: base + acc + "/" }; })) }); }
            added.push(t); }
          h = h.replace(/\s*<script type="application\/ld\+json" id="wx-seo-schema">[\s\S]*?<\/script>/i, "");
          if (g.length) h = h.replace(/<\/head>/i, () => '<script type="application/ld+json" id="wx-seo-schema">' + JSON.stringify({ "@context": "https://schema.org", "@graph": g }).replace(/</g, "\\u003c") + "</script>\n</head>");
          fs.writeFileSync(abs, h); res = { added, existing: have }; }
        p.t = now(); d.pages[rel] = p; jw(SEOF, d); log(db, u, "seo.save", rel, ip); return { ok: true, page: p, schema: res }; }
      case "seo_scores": { need(ED); const d = seoData(); for (const [rel, s] of Object.entries(inp.scores || {})) d.pages[rel] = Object.assign(d.pages[rel] || {}, { seo: +s.seo | 0, read: +s.read | 0 }); jw(SEOF, d); return { ok: true }; }
      case "seo_ai": need(ED); return { ok: false, error: "Add an API key in Blog & insights → AI settings (the preview has no AI)" };
      case "seo_robots_save": { need(["owner", "admin"]); const t = String(inp.text || "").replace(/\r/g, ""); if (/^\s*Disallow:\s*\/\s*$/mi.test(t)) return { ok: false, error: "This would block Google from the whole site (Disallow: /). Remove that line." }; fs.writeFileSync(path.join(ROOT, "robots.txt"), t.trimEnd() + "\n"); return { ok: true }; }
      case "seo_sitemap": { need(ED); publishRules(); return { ok: true, count: (fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").match(/<loc>/g) || []).length }; }
    }
    return null;
  }
  async function p12(action, inp, need, db, ip) {
    if (!action.startsWith("notify_")) return null;
    const done = (x) => x;
    switch (action) {
      case "notify_get": need(["owner", "admin"]); return { ok: true, cfg: ntCfg(), events: NT_EV, waReady: false, emailReady: false, log: ntLog.slice(0, 60) };
      case "notify_save": { need(["owner", "admin"]); const s = inp.cfg || {}, c = ntCfg(); for (const k of ["email", "wa"]) if (k in s) c[k] = !!s[k]; if (s.waLang) c.waLang = String(s.waLang);
        for (const k in NT_EV) if (s.ev && s.ev[k]) { const x = s.ev[k]; if ("on" in x) c.ev[k].on = !!x.on; for (const f of ["text", "subject", "tpl"]) if (f in x) c.ev[k][f] = String(x[f]).slice(0, 3000); }
        jw(NTF, c); return done({ ok: true, cfg: c }); }
      case "notify_test": { const u = need(["owner", "admin"]); const e = inp.event; if (!NT_EV[e]) return { ok: false, error: "Unknown event" }; const ph = String(inp.phone || "").trim(), em = String(inp.email || "").trim(); if (!ph && !em) return { ok: false, error: "Enter your phone or email to receive the test" };
        const ev = ntCfg().ev[e], v = { name: u.name, company: "Woodex Interior", phone: "+92 322 4000768", ref: "WI-10000", project: "Test project", link: "https://woodex.com.pk/" }, fill = (t) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
        const ob = path.join(PRIV, "outbox"); fs.mkdirSync(ob, { recursive: true }); fs.writeFileSync(path.join(ob, Date.now() + "-update.txt"), "To: " + [ph, em].filter(Boolean).join(" / ") + "\nSubject: " + fill(ev.subject) + "\n\n" + fill(ev.text));
        const result = {}; if (ph) { result.whatsapp = "sent (preview outbox)"; ntLog.unshift({ t: now(), event: e, ref: v.ref, name: u.name, channel: "wa", dest: ph, result: "sent" }); } if (em) { result.email = "sent (preview outbox)"; ntLog.unshift({ t: now(), event: e, ref: v.ref, name: u.name, channel: "email", dest: em, result: "sent" }); }
        return { ok: true, result }; }
    }
    return null;
  }
  async function p10(action, inp, need, db, ip, req) {
    if (!/^(chat_|notif_)/.test(action)) return null;
    ensureChat(db); ensureCrm(db); const SALES = ["owner", "admin", "sales"], done = (o) => { save(db); return o; };
    const get = (id) => { const c = db.chats.find((x) => x.id === +id); if (!c) throw new Fail("Chat not found", 404); return c; };
    switch (action) {
      case "chat_list": { need(SALES); const st = inp.status === "closed" ? "closed" : "open"; return { ok: true, chats: db.chats.filter((c) => c.status === st).sort((a, b) => (b.needs || 0) - (a.needs || 0) || String(b.updated_at).localeCompare(a.updated_at)).map(chatPub), cfg: { ai: chatCfg().ai, on: chatCfg().on } }; }
      case "chat_get": { need(SALES); const c = get(inp.id); c.unread = 0; c.needs = 0; return done({ ok: true, chat: chatPub(c), messages: chatMsgs(db, c.id, +inp.since || 0) }); }
      case "chat_reply": { const u = need(SALES), c = get(inp.id), t = String(inp.text || "").trim(); if (!t) throw new Fail("Write a message"); if (c.mode === "ai") chatAdd(db, c, "sys", "", u.name + " joined the chat"); const id = chatAdd(db, c, "agent", u.name, t); Object.assign(c, { mode: "human", agent_name: u.name, status: "open", unread: 0, needs: 0 }); return done({ ok: true, id, chat: chatPub(c) }); }
      case "chat_mode": { const u = need(SALES), c = get(inp.id), m = inp.mode === "ai" ? "ai" : "human"; c.mode = m; c.agent_name = m === "human" ? u.name : null; chatAdd(db, c, "sys", "", m === "human" ? u.name + " joined the chat" : "The assistant is back in this chat"); return done({ ok: true, chat: chatPub(c) }); }
      case "chat_close": { const u = need(SALES), c = get(inp.id); c.status = inp.reopen ? "open" : "closed"; c.unread = 0; c.needs = 0; log(db, u, inp.reopen ? "chat.reopen" : "chat.close", "#" + c.id, ip); return done({ ok: true, chat: chatPub(c) }); }
      case "chat_lead": { const u = need(SALES), c = get(inp.id); for (const k of ["name", "phone", "email"]) if (String(inp[k] || "").trim()) c[k] = clip(inp[k], 190); if (!c.lead_id) chatMakeLead(db, c); log(db, u, "chat.lead", "#" + c.id, ip); return done({ ok: true, chat: chatPub(c) }); }
      case "chat_test": { need(["owner", "admin"]); return { ok: false, error: "Add an AI key first (Blog & insights → AI settings)" }; }
      case "chat_cfg_get": { need(["owner", "admin"]); return { ok: true, cfg: chatCfg(), aiReady: false }; }
      case "chat_cfg_save": { const u = need(["owner", "admin"]), sv = inp.cfg || {}, c = chatCfg(); for (const k of ["on", "ai", "emailAlert", "autoLead"]) if (k in sv) c[k] = !!sv[k]; for (const [k, n] of [["greeting", 500], ["hours", 80], ["knowledge", 12000], ["toneNote", 400], ["avoid", 2000], ["prices", 4000], ["afterHours", 500], ["waGreeting", 500], ["waSecret", 120], ["openFrom", 5], ["openTo", 5], ["tone", 20]]) if (k in sv) c[k] = String(sv[k]).trim().slice(0, n); if ("waAgent" in sv) c.waAgent = !!sv.waAgent; if (Array.isArray(sv.days)) c.days = sv.days.map(Number); if (Array.isArray(sv.qa)) c.qa = sv.qa.filter((x) => x && x.q && x.a).map((x) => ({ q: String(x.q).slice(0, 300), a: String(x.a).slice(0, 1500) })); if (!c.waVerify) c.waVerify = require_rand(); jw(CHATF, c); log(db, u, "chat.settings", "", ip); return done({ ok: true, cfg: c }); }
      case "notif_poll": {
        const u = need(), sales = SALES.includes(u.role); let items = [];
        const lu = sales ? db.leads.filter((l) => !l.read).length : 0, open = db.chats.filter((c) => c.status === "open" && (c.unread || c.needs)), cu = sales ? open.length : 0;
        if (sales) { items = open.map((c) => ({ kind: "chat", id: c.id, t: c.updated_at, title: (c.needs ? "Needs a person · " : "Live chat · ") + (c.name || "Visitor #" + c.id), text: c.last_text || "", href: "#/chat/" + c.id })).concat(db.leads.filter((l) => !l.read).slice(-8).reverse().map((l) => ({ kind: "lead", id: l.id, t: l.created_at, title: "New enquiry · " + l.name, text: (SOURCES[l.source] || l.source) + (l.service ? " · " + l.service : ""), href: "#/leads" }))).sort((a, b) => String(b.t).localeCompare(a.t)); }
        const lastV = db.chatMsgs.filter((m) => m.who === "visitor").reduce((a, m) => Math.max(a, m.id), 0);
        return { ok: true, leads: lu, chats: cu, total: lu + cu, items: items.slice(0, 12), stamp: String(sales ? (db.seqL || 0) * 100000 + lastV : 0) };
      }
    }
    return null;
  }
  async function a8(action, inp, need, db, ip) {
    if (!/^set_/.test(action)) return null;
    const OA = ["owner", "admin"];
    switch (action) {
      case "set_get": {
        need(OA); const x = setLoad(), c = crmCfg(), ai = cmsLoad().ai;
        return { ok: true, ...x, mail: { emailOn: c.emailOn, emailTo: c.emailTo, smtpHost: c.smtpHost, smtpPort: c.smtpPort, smtpUser: c.smtpUser, smtpFrom: c.smtpFrom, smtpPassSet: !!c.smtpPass }, turnstile: { tsSite: c.tsSite, tsSecretSet: !!c.tsSecret },
          ai: { provider: ai.provider, ready: !!ai[ai.provider + "Key"] }, psi: !!jr(path.join(PRIV, "health.json"), {}).psiKey,
          system: { server: "Node " + process.version + " (preview)", zip: "tar (preview)", curl: true, openssl: true, cron: jr(path.join(PRIV, "health.json"), {}).lastCron || null, disk: null } };
      }
      case "set_general_save": {
        const u = need(OA), g = inp.general || {}, x = jr(SETF, {}), o = {};
        o.siteName = clip(g.siteName, 80) || GEN_DEF.siteName; if (/[<>"]/.test(o.siteName)) throw new Fail("Site name cannot contain < > or quotes");
        for (const k of ["logo", "favicon", "share"]) { o[k] = clip(g[k], 200) || GEN_DEF[k]; if (!imgOk(o[k])) throw new Fail("Pick the " + k + " from the media library"); }
        x.general = o; if (inp.applied) x.generalApplied = { ...o }; jw(SETF, x); log(db, u, inp.applied ? "settings.general_apply" : "settings.general", "", ip); save(db);
        return { ok: true, ...setLoad() };
      }
      case "set_tracking_save": {
        const u = need(OA), t = inp.tracking || {}, x = jr(SETF, {}), o = {
          ga4: clip(t.ga4, 20).toUpperCase(), gtm: clip(t.gtm, 20).toUpperCase(), pixel: clip(t.pixel, 20).replace(/\D/g, ""), gsc: clip(t.gsc, 120).replace(/^.*content="([^"]+)".*$/, "$1") };
        if (o.ga4 && !/^G-[A-Z0-9]{4,15}$/.test(o.ga4)) throw new Fail("GA4 measurement ID looks like G-XXXXXXXXXX");
        if (o.gtm && !/^GTM-[A-Z0-9]{4,12}$/.test(o.gtm)) throw new Fail("Tag Manager ID looks like GTM-XXXXXXX");
        if (o.pixel && !/^\d{8,20}$/.test(o.pixel)) throw new Fail("Meta Pixel ID is a number (8-20 digits)");
        if (o.gsc && !/^[A-Za-z0-9_-]{10,100}$/.test(o.gsc)) throw new Fail("Search Console code: paste the content value of the meta tag");
        x.tracking = o; if (inp.applied) x.trackingApplied = { ...o, at: now() }; jw(SETF, x); log(db, u, inp.applied ? "settings.tracking_apply" : "settings.tracking", "", ip); save(db);
        return { ok: true, ...setLoad() };
      }
      case "set_ts_test": {
        need(OA); const c = crmCfg(); if (!c.tsSite || !c.tsSecret) throw new Fail("Add both Turnstile keys first");
        const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret: c.tsSecret, response: "wx-test" }), signal: AbortSignal.timeout(8000) }).then((x) => x.json()).catch((e) => ({ neterr: e.message }));
        if (r.neterr) throw new Fail("Could not reach Cloudflare: " + r.neterr);
        const codes = r["error-codes"] || []; if (codes.includes("invalid-input-secret")) throw new Fail("Cloudflare says the secret key is wrong");
        return { ok: true, result: "Secret key accepted by Cloudflare" };
      }
    }
    return null;
  }
  const adminApi = async function (req, inp) {
    const action = String(inp.action || "status"), ip = req.socket.remoteAddress || "";
    let db = load(); if (db) { try { if (cmsTick(db)) save(db); } catch (e) { console.error("cmsTick", e.message); } }
    const need = (roles) => { const u = current(db, req); if (!u) throw new Fail("Not signed in", 401); if (roles && !roles.includes(u.role)) throw new Fail("You do not have permission for this", 403); return u; };
    const done = (o) => { save(db); return o; };
    switch (action) {
      case "cron": { let backups = []; try { backups = backupAuto(); } catch (e) { console.error("backup", e.message); } return { ok: true, published: 0, backups }; }
      /* P15 test mode: WX_DB_BROKEN=1 simulates a broken DB connection (mirrors db_reconnect in admin.php) */
      case "sys_check": { const u = current(db, req); if (!u) throw new Fail("Not signed in", 401); if (!["owner","admin"].includes(u.role)) throw new Fail("You do not have permission for this", 403);
        const C = (g, n, ok, d, f) => ({ group: g, name: n, ok, detail: d, fix: f || "" }); const checks = [C("Server","PHP version",true,"Node preview " + process.version), C("Database","MySQL connection",true,"JSON store (preview)"), C("Files","SSL certificate bundle", fs.existsSync(path.join(ROOT,"api/cacert.pem")), "api/cacert.pem"), C("Sign-in","Admin token received", !!req.headers["x-wx-adm"], req.headers["x-wx-adm"] ? "header X-WX-ADM OK" : "missing")];
        for (const [n, url] of [["Google","https://www.googleapis.com/"],["OpenAI","https://api.openai.com/v1/models"]]) { try { const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) }); checks.push(C("Outgoing HTTPS", n, true, "HTTP " + r.status)); } catch (e) { checks.push(C("Outgoing HTTPS", n, false, String(e.cause?.code || e.message), "Sandbox network")); } }
        return { ok: true, checks, version: "P16", time: new Date().toISOString(), server: "node-preview" }; }
      case "db_reconnect": { if (!process.env.WX_DB_BROKEN) throw new Fail("The database connection already works. Please sign in normally.", 409); if (inp.builderPassword !== (process.env.WX_DEV_PASSWORD || "Woodex@2026")) throw new Fail("The builder password is wrong", 401); if (!inp.dbName || !inp.dbUser) throw new Fail("Enter the database name and user"); process.env.WX_DB_BROKEN = ""; return { ok: true, users: 1, fresh: false }; }
      case "status": { if (process.env.WX_DB_BROKEN) return { ok: true, needsSetup: false, dbError: true, driver: "mysql", builderLocked: true, user: null }; const u = current(db, req); return { ok: true, needsSetup: !db, driver: "json", builderLocked: true, user: u ? pub(u) : null }; }
      case "setup": {
        if (db) throw new Fail("Already set up", 403);
        if (String(inp.builderPassword || "") !== builderPassword()) throw new Fail("The current builder password is wrong", 401);
        const name = String(inp.name || "").trim(), email = String(inp.email || "").trim().toLowerCase();
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Fail("Enter your name and a valid email"); validPw(inp.password);
        db = { users: [], activity: [], seqU: 1, seqA: 0 };
        const u = { id: 1, name, email, role: "owner", pass_hash: hash(inp.password), active: 1, pw_ver: 1, created_at: now(), last_login: null }; db.users.push(u);
        log(db, u, "setup", "", ip);
        return done({ ok: true, token: tokenFor(u, req, ip), builderToken: builderToken(u.id, lastSid), user: pub(u) });
      }
      case "login": {
        if (!db) throw new Fail("Admin is not set up yet", 503);
        const t = tries.get(ip) || { n: 0, t: 0 };
        if (t.n >= 8 && Date.now() - t.t < 600000) throw new Fail("Too many attempts — wait 10 minutes", 429);
        const u = db.users.find((x) => x.email === String(inp.email || "").trim().toLowerCase());
        if (!u || !u.active || !verify(inp.password, u.pass_hash)) { tries.set(ip, { n: Date.now() - t.t < 600000 ? t.n + 1 : 1, t: Date.now() }); await new Promise((r) => setTimeout(r, 400)); throw new Fail("Wrong email or password", 401); }
        tries.delete(ip);
        if (u.totp_on) { const exp = Math.floor(Date.now() / 1000) + 300; return { ok: true, need2fa: true, ticket: u.id + "." + exp + "." + hmac("2fa|" + u.id + "|" + exp + "|" + u.pw_ver) }; }
        return done(finishLogin(db, u, req, ip));
      }
      case "login_2fa": {
        if (!db) throw new Fail("Admin is not set up yet", 503);
        const t = tries.get("2fa" + ip) || { n: 0, t: 0 }; if (t.n >= 6 && Date.now() - t.t < 600000) throw new Fail("Too many attempts — wait 10 minutes", 429);
        const m = /^(\d+)\.(\d{10})\.([a-f0-9]{64})$/.exec(String(inp.ticket || "")), u = m && db.users.find((x) => x.id === +m[1] && x.active);
        if (!u || +m[2] < Date.now() / 1000 || hmac("2fa|" + u.id + "|" + m[2] + "|" + u.pw_ver) !== m[3]) throw new Fail("Sign-in expired, enter your password again", 401);
        const code = String(inp.code || "").trim(); let ok = totpOk(u.totp, code, u), used = false;
        if (!ok && /^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(code)) { const h = sha(code.toLowerCase().replace("-", "")), i = (u.recovery || []).indexOf(h); if (i > -1) { u.recovery.splice(i, 1); ok = used = true; } }
        if (!ok) { tries.set("2fa" + ip, { n: Date.now() - t.t < 600000 ? t.n + 1 : 1, t: Date.now() }); save(db); await new Promise((r) => setTimeout(r, 400)); throw new Fail("That code is not right. Check the time on your phone", 401); }
        if (used) log(db, u, "2fa.recovery_used", (u.recovery || []).length + " left", ip);
        return done(finishLogin(db, u, req, ip));
      }
      case "sec_get": {
        const u = need(); const cur = u._sid;
        return done({ ok: true, totp: !!u.totp_on, recoveryLeft: (u.recovery || []).length, alerts: u.alerts !== false,
          sessions: (u.sessions || []).filter((x) => x.exp > Date.now() / 1000).map((x) => ({ sid: x.sid, ip: x.ip, ua: x.ua, created: x.created, seen: x.seen, current: x.sid === cur })).reverse(),
          logins: db.activity.filter((a) => a.user_id === u.id && /^(login|2fa\.)/.test(a.action)).slice(-10).reverse().map(({ action, ip, created_at }) => ({ action, ip, created_at })),
          team: ["owner", "admin"].includes(u.role) ? db.users.map((x) => ({ id: x.id, name: x.name, role: x.role, totp: !!x.totp_on, sessions: (x.sessions || []).filter((s) => s.exp > Date.now() / 1000).length })) : null });
      }
      case "sec_2fa_begin": { const u = need(); u.totp_pending = b32enc(crypto.randomBytes(20)); return done({ ok: true, secret: u.totp_pending, uri: "otpauth://totp/" + encodeURIComponent("Woodex Admin:" + u.email) + "?secret=" + u.totp_pending + "&issuer=" + encodeURIComponent("Woodex Admin") }); }
      case "sec_2fa_enable": {
        const u = need(); if (!u.totp_pending) throw new Fail("Start the setup again"); if (!totpOk(u.totp_pending, inp.code)) throw new Fail("That code is not right. Scan again or check your phone's time");
        u.totp = u.totp_pending; delete u.totp_pending; u.totp_on = true; const codes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex")); u.recovery = codes.map(sha);
        log(db, u, "2fa.enable", "", ip); return done({ ok: true, codes: codes.map((c) => c.slice(0, 4) + "-" + c.slice(4)) });
      }
      case "sec_2fa_disable": case "sec_recovery_new": {
        const u = need(); if (!verify(inp.password, u.pass_hash)) throw new Fail("Password is wrong", 401);
        if (action === "sec_2fa_disable") { u.totp_on = false; delete u.totp; u.recovery = []; log(db, u, "2fa.disable", "", ip); return done({ ok: true }); }
        if (!u.totp_on) throw new Fail("Two-factor is not on"); const codes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex")); u.recovery = codes.map(sha); log(db, u, "2fa.recovery_new", "", ip); return done({ ok: true, codes: codes.map((c) => c.slice(0, 4) + "-" + c.slice(4)) });
      }
      case "sec_2fa_reset": {
        const me = need(["owner", "admin"]), t = db.users.find((x) => x.id === +inp.user_id); if (!t) throw new Fail("User not found", 404);
        if (t.role === "owner" && me.role !== "owner") throw new Fail("Only the owner can do this", 403);
        t.totp_on = false; delete t.totp; t.recovery = []; t.sessions = []; log(db, me, "2fa.reset", t.email, ip); return done({ ok: true });
      }
      case "sec_revoke": {
        const u = need(); const cur = u._sid;
        if (inp.user_id && +inp.user_id !== u.id) { if (!["owner", "admin"].includes(u.role)) throw new Fail("No permission", 403); const t = db.users.find((x) => x.id === +inp.user_id); if (!t) throw new Fail("User not found", 404); if (t.role === "owner" && u.role !== "owner") throw new Fail("Only the owner can do this", 403); t.sessions = []; log(db, u, "session.revoke_all", t.email, ip); return done({ ok: true }); }
        u.sessions = (u.sessions || []).filter((x) => (inp.others ? x.sid === cur : x.sid !== String(inp.sid || "") || x.sid === cur));
        log(db, u, "session.revoke", inp.others ? "all other devices" : "one device", ip); return done({ ok: true });
      }
      case "sec_alerts": { const u = need(); u.alerts = !!inp.on; return done({ ok: true, alerts: u.alerts }); }
      case "pw_forgot": { // preview: no SMTP, so the reset link is written to _private/outbox/
        const email = String(inp.email || "").trim().toLowerCase(), msg = "If that email belongs to an Admin user, a reset link has been sent. Check your inbox (and spam).", u = db && db.users.find((x) => x.email === email && x.active);
        if (!u) return { ok: true, message: msg };
        const exp = Math.floor(Date.now() / 1000) + 3600, tok = u.id + "." + exp + "." + hmac("pwr|" + u.id + "|" + exp + "|" + u.pw_ver + "|" + u.pass_hash);
        const ob = path.join(PRIV, "outbox"); fs.mkdirSync(ob, { recursive: true }); fs.writeFileSync(path.join(ob, Date.now() + "-reset.txt"), "To: " + u.email + "\n/admin/#reset=" + tok);
        log(db, u, "password.reset_request", "", ip); return done({ ok: true, message: msg });
      }
      case "pw_reset": {
        const m = /^(\d+)\.(\d{10})\.([a-f0-9]{64})$/.exec(String(inp.token || "")); if (!m || +m[2] < Date.now() / 1000) throw new Fail("This reset link has expired. Ask for a new one.", 401);
        const u = db && db.users.find((x) => x.id === +m[1] && x.active); if (!u || hmac("pwr|" + u.id + "|" + m[2] + "|" + u.pw_ver + "|" + u.pass_hash) !== m[3]) throw new Fail("This reset link is not valid or was already used. Ask for a new one.", 401);
        validPw(inp.password); u.pass_hash = hash(inp.password); u.pw_ver++; u.sessions = []; log(db, u, "password.reset", "", ip); return done({ ok: true, message: "Password changed. Sign in with your new password." });
      }
      case "me": { const u = need(); return { ok: true, user: pub(u), builderToken: canBuild(u) ? builderToken(u.id, u._sid) : null }; }
      case "logout": { const u = current(db, req); if (u) { u.sessions = (u.sessions || []).filter((x) => x.sid !== u._sid); log(db, u, "logout", "", ip); save(db); } return { ok: true }; }
      case "profile": { const u = need(); const n = String(inp.name || "").trim(); if (!n) throw new Fail("Name is required"); u.name = n.slice(0, 120); log(db, u, "profile.update", "", ip); return done({ ok: true, user: pub(u) }); }
      case "password": {
        const u = need(); if (!verify(inp.current, u.pass_hash)) throw new Fail("Current password is wrong", 401); validPw(inp.next);
        u.pass_hash = hash(inp.next); u.pw_ver++; u.sessions = []; log(db, u, "password.change", "", ip); return done({ ok: true, token: tokenFor(u, req, ip) });
      }
      case "users": need(["owner", "admin"]); return { ok: true, users: db.users.map(pub) };
      case "user_save": {
        const me = need(["owner", "admin"]);
        const id = +inp.id || 0, name = String(inp.name || "").trim(), email = String(inp.email || "").trim().toLowerCase(), role = String(inp.role || "editor"), active = inp.active ? 1 : 0, pw = String(inp.password || "");
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Fail("Enter a name and a valid email");
        if (!ROLES.includes(role)) throw new Fail("Unknown role");
        if (role === "owner" && me.role !== "owner") throw new Fail("Only the owner can create another owner", 403);
        if (db.users.some((x) => x.email === email && x.id !== id)) throw new Fail("That email is already used");
        if (id) {
          const old = db.users.find((x) => x.id === id); if (!old) throw new Fail("User not found", 404);
          if (old.role === "owner" && me.role !== "owner") throw new Fail("Only the owner can edit the owner", 403);
          if (old.role === "owner" && (role !== "owner" || !active) && db.users.filter((x) => x.role === "owner" && x.active).length < 2) throw new Fail("There must be at least one active owner");
          if (old.id === me.id && !active) throw new Fail("You cannot deactivate yourself");
          if (pw) validPw(pw);
          const bump = pw || !active || old.role !== role; Object.assign(old, { name, email, role, active }); if (pw || !active) old.pw_ver++; if (pw) old.pass_hash = hash(pw);
          if (bump && old.id !== me.id) old.sessions = []; // sign out everywhere (admin + builder) when access changes
          log(db, me, "user.update", email, ip);
        } else { validPw(pw); db.users.push({ id: ++db.seqU, name, email, role, pass_hash: hash(pw), active, pw_ver: 1, created_at: now(), last_login: null }); log(db, me, "user.create", email, ip); }
        return done({ ok: true });
      }
      case "dashboard": {
        need(); ingest(db);
        const since = new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10), wk = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 19).replace("T", " ");
        const editsByDay = {}; db.activity.filter((a) => a.action.startsWith("builder.") && a.created_at.slice(0, 10) >= since).forEach((a) => { const d = a.created_at.slice(0, 10); editsByDay[d] = (editsByDay[d] || 0) + 1; });
        const s = stats(); s.team = db.users.filter((u) => u.active).length; ensureCrm(db); const mon = now().slice(0, 7); s.leadsMonth = db.leads.filter((l) => l.created_at.slice(0, 7) === mon).length; s.leadsUnread = db.leads.filter((l) => !l.read).length; ensureA5(db); s.quotesOpen = db.quotes.filter((q) => q.status === 'sent').length; s.quotesOpenValue = db.quotes.filter((q) => q.status === 'sent').reduce((a, q) => a + q.total, 0); s.receivable = db.invoices.reduce((a, i) => a + invPub(i).balance, 0); s.leadsOpen = db.leads.filter((l) => !['won','lost'].includes(l.stage)).length; s.edits7 = db.activity.filter((a) => (a.action === "builder.save" || a.action === "builder.page_new") && a.created_at >= wk).length;
        const recent = db.activity.slice(-8).reverse().map(({ user_name, action, target, created_at }) => ({ user_name, action, target, created_at }));
        return done({ ok: true, stats: s, editsByDay, recent });
      }
      case "activity": {
        need(["owner", "admin"]); ingest(db);
        const q = String(inp.q || "").toLowerCase(), per = 30, page = Math.max(1, +inp.page || 1);
        const all = db.activity.slice().reverse().filter((a) => !q || [a.action, a.target, a.user_name].some((v) => String(v || "").toLowerCase().includes(q)));
        return done({ ok: true, rows: all.slice((page - 1) * per, page * per).map(({ user_name, action, target, ip, created_at }) => ({ user_name, action, target, ip, created_at })), total: all.length, per, page });
      }
      default: {
        const r = (await a2(action, inp, need, db, ip)) || (await a17(action, inp, need, db, ip)) || (await a4(action, inp, need, db, ip)) || a5(action, inp, need, db, ip) || (await a6(action, inp, need, db, ip)) || (await a7(action, inp, need, db, ip)) || (await a8(action, inp, need, db, ip)) || (await p8(action, inp, need, db, ip, req)) || (await p10(action, inp, need, db, ip, req)) || (await p12(action, inp, need, db, ip)) || (await p13(action, inp, need, db, ip)); if (r) return r;
        throw new Fail("Unknown action", 404);
      }
    }
  };
  adminApi.installed = () => !!load();
  /** Builder token check: signature + user active + builder role + admin session still alive. */
  adminApi.builderOk = function (t) {
    const m = /^(\d{10})\.(\d+)\.([a-f0-9]{16})\.([a-f0-9]{64})$/.exec(String(t || ""));
    if (!m || +m[1] < Date.now() / 1000) return false;
    const good = hmac("wx|" + m[1] + "|" + m[2] + "|" + m[3]);
    if (!crypto.timingSafeEqual(Buffer.from(good), Buffer.from(m[4]))) return false;
    const db = load(), u = db && db.users.find((x) => x.id === +m[2]);
    return !!(u && u.active && canBuild(u) && (u.sessions || []).some((x) => x.sid === m[3] && x.exp > Date.now() / 1000));
  };
  /** MCP (Streamable HTTP, JSON responses) — mirror of api/mcp.php. Returns {status, body|null, headers}. */
  adminApi.mcp = async function (req, body) {
    const H = { "WWW-Authenticate": 'Bearer realm="woodex-mcp"' }, rid = body && typeof body === "object" && !Array.isArray(body) ? (body.id ?? null) : null;
    const rpc = (result, error, status = 200, headers) => ({ status, headers, body: { jsonrpc: "2.0", id: rid, ...(error ? { error } : { result }) } });
    const text = (d, isError = false) => ({ content: [{ type: "text", text: typeof d === "string" ? d : JSON.stringify(d, null, 2) }], isError });
    const m0 = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || "").trim()), raw = m0 ? m0[1] : new URL(req.url, "http://x").searchParams.get("key") || "";
    const M = mLoad(), T = raw && M.tokens.find((t) => t.hash === sha(raw));
    if (!T) return rpc(null, { code: -32001, message: "Missing or invalid token. Create one in Woodex Admin → Settings → AI Agent." }, 401, H);
    const db0 = load(), user = db0 && db0.users.find((x) => x.id === T.user_id && x.active);
    if (!user) return rpc(null, { code: -32001, message: "The Admin user of this token is inactive" }, 401, H);
    if (!body || Array.isArray(body) || body.jsonrpc !== "2.0" || !body.method) return rpc(null, { code: Array.isArray(body) ? -32600 : -32700, message: Array.isArray(body) ? "Batch requests are not supported" : "Invalid JSON-RPC request" }, 400);
    if (!("id" in body)) return { status: 202, body: null };
    const logCall = (tool, ok, note = "") => { const m = mLoad(); const t = m.tokens.find((x) => x.id === T.id); if (t) { t.last_used = now(); t.uses = (t.uses || 0) + 1; } m.log.push({ t: now(), token: T.name, tool, ok, note: String(note).slice(0, 160), ip: req.socket.remoteAddress || "" }); m.log = m.log.slice(-500); jw(MFILE, m); };
    const P = body.params || {}, VER = ["2025-06-18", "2025-03-26", "2024-11-05"];
    const call = async (action, inp = {}) => { const r2 = { headers: {}, socket: req.socket, url: "/api/admin.php", _wxAs: user.id }; try { return await adminApi(r2, { ...inp, action }); } catch (e) { return { ok: false, error: e instanceof Fail ? e.message : "Server error" }; } };
    const S = (props = {}, req2 = []) => ({ type: "object", properties: props, required: req2 }), st = (d) => ({ type: "string", description: d }), it = (d) => ({ type: "integer", description: d });
    const TOOLS = {
      list_leads: ["Lists website enquiries (leads) newest first. Filter by stage or a search word.", S({ stage: st("new, contacted, visit, quote, won or lost"), search: st("Matches name, phone, email, service or message"), limit: it("Max rows (default 25, max 200)") }), true],
      get_lead: ["Full details of one lead including its notes/history.", S({ id: it("Lead id") }, ["id"]), true],
      add_lead_note: ["Adds a note to a lead (marked as written by the AI agent). Does not change the stage.", S({ id: it("Lead id"), text: st("Note text") }, ["id", "text"]), false],
      list_quotes: ["Lists quotations (number, client, status, total).", S({ status: st("draft, sent, approved, invoiced, rejected, superseded"), search: st("Matches number, client or project"), limit: it("Max rows (default 25)") }), true],
      get_quote: ["Full quotation with sections, items and totals.", S({ id: it("Quotation id") }, ["id"]), true],
      create_quote_draft: ["Creates a NEW quotation as a draft for the team to review. It is never sent to the client. Units: sft, rft, sqmt, nos, each, set, point, job, lumpsum.", S({ client: { type: "object", properties: { name: st("Client name"), phone: st("Phone"), email: st("Email"), address: st("Address") }, required: ["name"] }, project: st("Project title"), site: st("Site address"), kind: st("residential, commercial, renovation, fitout or other"), sections: { type: "array", items: { type: "object", properties: { name: st("Section name, e.g. Kitchen"), items: { type: "array", items: { type: "object", properties: { desc: st("Description"), qty: { type: "number" }, unit: st("Unit"), rate: { type: "number", description: "Rate in PKR" } }, required: ["desc"] } } } } }, notes: st("Internal/client notes"), lead_id: it("Link to this lead (optional)") }, ["client"]), false],
      list_clients: ["Lists clients with contact details.", S({ search: st("Matches name, phone or email"), limit: it("Max rows (default 50)") }), true],
      list_pages: ["Lists all website pages with title, description, URL and SEO status.", S(), true],
      site_stats: ["Dashboard numbers: pages, leads this month, unread leads, quotation and sales totals.", S(), true],
      monthly_report: ["Report for one month: leads by source and stage, won/lost, quotations and their value.", S({ month: st("YYYY-MM (default: current month)") }), true],
      whatsapp_stats: ["WhatsApp button clicks (today, 7 and 30 days), top pages and services, WhatsApp leads.", S(), true],
      create_blog_draft: ["Creates an Insights blog post as a DRAFT (not published). Body in simple markdown: \"## Heading\", \"- list item\", blank line between paragraphs.", S({ title: st("Post title"), slug: st("Page address (optional)"), excerpt: st("1–2 sentence summary"), body: st("Article body in simple markdown") }, ["title", "body"]), false],
    };
    switch (body.method) {
      case "initialize": logCall("initialize", true, (P.clientInfo || {}).name || ""); return rpc({ protocolVersion: VER.includes(P.protocolVersion) ? P.protocolVersion : VER[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "woodex-admin", title: "Woodex Interior Admin", version: "1.0.0" }, instructions: "Woodex Interior (Lahore) admin data. Currency is PKR. You can read leads, quotations, clients, pages and reports, and create drafts (quotation, blog post) or lead notes. Drafts are reviewed by the team before anything is sent or published. Signed in as " + user.name + " (" + user.role + ")." });
      case "ping": return rpc({});
      case "tools/list": return rpc({ tools: Object.entries(TOOLS).map(([name, [description, inputSchema, ro]]) => ({ name, description, inputSchema, annotations: { readOnlyHint: ro, destructiveHint: false, idempotentHint: ro, openWorldHint: false } })) });
      case "resources/list": return rpc({ resources: [] });
      case "prompts/list": return rpc({ prompts: [] });
      case "tools/call": break;
      default: return rpc(null, { code: -32601, message: "Method not found: " + body.method });
    }
    const tool = String(P.name || ""), a = P.arguments || {};
    if (!TOOLS[tool]) return rpc(null, { code: -32602, message: "Unknown tool: " + tool });
    const has = (row, q, keys) => !q || keys.some((k) => String(typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k] ?? "").toLowerCase().includes(q.toLowerCase()));
    const lim = (v, d, mx = 200) => (+v > 0 ? Math.min(+v, mx) : d);
    const pick = (o, ks) => Object.fromEntries(ks.filter((k) => k in o).map((k) => [k, o[k]]));
    const LK = ["id", "created_at", "name", "phone", "email", "service", "message", "stage", "source", "page", "value", "followup", "assigned_name", "tags", "lost_reason"];
    const run = async (action, inp, post) => { const r = await call(action, inp); if (!r.ok) { logCall(tool, false, r.error); return rpc(text(r.error || "Failed", true)); } const { ok, ...rest } = r, out = post ? post(r) : rest; logCall(tool, typeof out !== "string"); return rpc(text(out, typeof out === "string")); };
    switch (tool) {
      case "list_leads": return run("leads_list", {}, (r) => { const rows = r.leads.filter((l) => (!a.stage || l.stage === a.stage) && has(l, String(a.search || "").trim(), ["name", "phone", "email", "service", "message"])).slice(0, lim(a.limit, 25)); return { count: rows.length, stages: r.stages, leads: rows.map((l) => ({ ...pick(l, LK), notes: (l.notes || []).length })) }; });
      case "get_lead": return run("leads_list", {}, (r) => { const l = r.leads.find((x) => +x.id === +a.id); return l ? { ...pick(l, LK), notes: l.notes || [] } : "Lead not found"; });
      case "add_lead_note": if (!String(a.text || "").trim()) return rpc(text("Write a note first", true)); return run("lead_note", { id: +a.id, text: "[AI agent · " + T.name + "] " + String(a.text).trim() }, (r) => ({ ok: true, lead: r.lead && r.lead.id, message: "Note added" }));
      case "list_quotes": return run("quotes_list", {}, (r) => { const rows = r.quotes.filter((x) => (!a.status || x.status === a.status) && has(x, String(a.search || "").trim(), ["no", "client", "project"])).slice(0, lim(a.limit, 25)); return { count: rows.length, quotes: rows.map((x) => pick(x, ["id", "no", "label", "version", "option", "status", "client", "project", "site", "kind", "date", "total", "subtotal", "created_by", "created_at", "sent_at", "approved_at", "lead_id"])) }; });
      case "get_quote": return run("quote_get", { id: +a.id }, (r) => { const { history, ...q } = r.quote; return { quote: q, versions: r.family, invoice: r.invoice ? { no: r.invoice.no, status: r.invoice.status } : null }; });
      case "create_quote_draft": { const inp = pick(a, ["client", "project", "site", "kind", "sections", "notes", "lead_id"]); inp.notes = (String(inp.notes || "") + "\n(Draft prepared by AI agent: " + T.name + ")").trim(); return run("quote_save", inp, (r) => ({ ok: true, id: r.quote.id, no: r.quote.no, status: r.quote.status, total: r.quote.total, message: "Draft saved. Open Admin → Quotations to review and send it." })); }
      case "list_clients": return run("clients_list", {}, (r) => { const rows = (r.clients || []).filter((c) => has(c, String(a.search || "").trim(), ["name", "phone", "email", "company"])).slice(0, lim(a.limit, 50)); return { count: rows.length, clients: rows }; });
      case "list_pages": return run("pages_list", {}, (r) => ({ count: r.pages.length, pages: r.pages }));
      case "site_stats": return run("dashboard", {}, (r) => r.stats);
      case "whatsapp_stats": return run("wa_stats", {});
      case "monthly_report": {
        const mo = /^\d{4}-\d{2}$/.test(a.month || "") ? a.month : new Date().toISOString().slice(0, 7);
        const L = await call("leads_list"), Q = await call("quotes_list"); if (!L.ok || !Q.ok) { logCall(tool, false, L.error || Q.error); return rpc(text(L.error || Q.error, true)); }
        const ls = L.leads.filter((l) => String(l.created_at).slice(0, 7) === mo), cnt = (k) => ls.reduce((o, l) => ((o[l[k]] = (o[l[k]] || 0) + 1), o), {});
        const qs = Q.quotes.filter((x) => String(x.created_at || "").slice(0, 7) === mo), ap = Q.quotes.filter((x) => String(x.approved_at || "").slice(0, 7) === mo), val = (xs) => xs.reduce((s, x) => s + (+x.total || 0), 0);
        logCall(tool, true); return rpc(text({ month: mo, leads: ls.length, leadsBySource: cnt("source"), leadsByStage: cnt("stage"), quotationsCreated: qs.length, quotationsValue: val(qs), quotationsApproved: ap.length, approvedValue: val(ap), currency: "PKR" }));
      }
      case "create_blog_draft": {
        const title = String(a.title || "").trim(), bodyMd = String(a.body || ""); if (!title || !bodyMd.trim()) return rpc(text("Title and body are required", true));
        let slug = (String(a.slug || "").toLowerCase().trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).replace(/[^a-z0-9-]/g, "").slice(0, 60) || "post-" + Date.now();
        const blocks = []; for (const chunk of bodyMd.replace(/\r/g, "").trim().split(/\n{2,}/)) { let para = null; for (const ln of chunk.split("\n").map((x) => x.trim()).filter(Boolean)) { let m; if ((m = /^#{1,4}\s+(.+)$/.exec(ln))) { blocks.push({ t: "h", text: m[1].slice(0, 200) }); para = null; } else if ((m = /^(?:[-*•]|\d+[.)])\s+(.+)$/.exec(ln))) { const last = blocks[blocks.length - 1]; if (last && last.t === "list") last.items.push(m[1]); else blocks.push({ t: "list", items: [m[1]] }); para = null; } else if ((m = /^>\s*(.+)$/.exec(ln))) { blocks.push({ t: "quote", text: m[1] }); para = null; } else if (para) para.text += " " + ln; else { para = { t: "p", text: ln }; blocks.push(para); } } }
        return run("cms_save", { type: "post", title, slug, status: "draft", data: { excerpt: clip(a.excerpt, 300), blocks: blocks.slice(0, 120), aiAgent: T.name }, seo: { description: clip(a.excerpt, 160) } }, (r) => ({ ok: true, id: r.item && r.item.id, slug, status: "draft", message: "Draft saved. Open Admin → Insights to add a hero image, review and publish." }));
      }
    }
  };
  /** Client quotation view (mirror of api/quote-view.php) → {status, html} */
  adminApi.quoteView = function (id, t) {
    const db = load(), q = db && (db.quotes || []).find((x) => x.id === +id);
    const e = (m) => ({ status: 404, html: '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh"><h1 style="font-size:22px">' + m + "</h1>" });
    if (!q || !/^[a-f0-9]{32}$/.test(String(t)) || qViewTok(q) !== t) return e("This quotation link is not valid.");
    if (q.status === "superseded") return e("This quotation has been replaced by a newer version.");
    if (!q.viewed_at || Date.parse(q.viewed_at.replace(" ", "T")) < Date.now() - 432e5) { q.viewed_at = now(); q.views = (q.views || 0) + 1; q.history.push({ t: now(), user: "Client", text: "Viewed online" }); save(db); }
    const c = companyCfg(), { history, notes, created_by, lead_id, client_id, last_sent, ...pq } = q; pq.label = qLabel(q);
    const J = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
    const html = fs.readFileSync(path.join(ROOT, "api", "quote-view.php"), "utf8").split("?>").slice(1).join("?>")
      .replace(/<\?= htmlspecialchars\(\$title\) \?>/, "Quotation " + qLabel(q)).replace(/<\?= htmlspecialchars\(q_label\(\$x\)\) \?>/, qLabel(q))
      .replace(/<\?= htmlspecialchars\(\(string\)\$x\['client'\]\['name'\]\) \?>/, q.client.name.replace(/</g, "&lt;")).replace(/<\?= number_format\(\(float\)\$x\['total'\]\) \?>/, Math.round(q.total).toLocaleString("en-US"))
      .replace(/<\?php if \(\$wa\): \?>[\s\S]*?<\?php endif; \?>/, "").replace("<?= json_encode($q, $J) ?>", J(pq)).replace("<?= json_encode($c, $J) ?>", J(c));
    return { status: 200, html };
  };
  adminApi.chat = chatPublic;
  adminApi.r404 = (body, ipAddr) => { try { const b = JSON.parse(body || "{}"); rd404Log(b.p, b.r, ipAddr); } catch {} };
  adminApi.forms = formsApi; adminApi.backupFile = backupFile; adminApi.rawAction = rawAction;
  adminApi.publicGuard = function (rel) {
    // preview-only: mimic the managed .htaccess rules (redirects, drafts 404)
    const url = "/" + rel.replace(/index\.html$/, ""), u2 = (url.endsWith("/") ? url : url + "/").toLowerCase(), c = rdCfg();
    if (c.spam && /(casino|gokkasten|gokautomat|blackjack|roulette|free-spins|itm-[0-9]{4,})/i.test(url)) return { gone: true };
    const r = jr(REDIR, []).map(rdOne).find((x) => x.on && (x.match === "prefix" ? u2.startsWith(x.from.toLowerCase()) : x.from.toLowerCase() === u2));
    if (r) return r.type === 410 ? { gone: true } : { redirect: r.to, code: r.type };
    const m = jr(PMETA, {})[rel]; if (m && m.status === "draft") return { notFound: true };
    return null;
  };
  return adminApi;
}
export { Fail as AdminFail };
