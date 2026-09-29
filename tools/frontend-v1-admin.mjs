// Woodex Admin v2 — PREVIEW backend (mirrors frontend-v1/api/admin.php).
// Stores data in frontend-v1/_private/admin-db.json instead of MySQL. Not deployed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
  const tokenFor = (u) => { const exp = String(Math.floor(Date.now() / 1000) + 12 * 3600); return u.id + "." + exp + "." + hmac("adm|" + u.id + "|" + exp + "|" + u.pw_ver); };
  const builderToken = (uid) => { const exp = String(Math.floor(Date.now() / 1000) + 12 * 3600); return exp + "." + uid + "." + hmac("wx|" + exp + "|" + uid); };
  const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active, created_at: u.created_at, last_login: u.last_login });
  const canBuild = (u) => ["owner", "admin", "editor"].includes(u.role);
  const validPw = (p) => { if (String(p || "").length < 8) throw new Fail("Password must be at least 8 characters"); };

  function current(db, req) {
    const m = /^(\d+)\.(\d{10})\.([a-f0-9]{64})$/.exec(String(req.headers["x-wx-adm"] || ""));
    if (!db || !m || +m[2] < Date.now() / 1000) return null;
    const u = db.users.find((x) => x.id === +m[1] && x.active);
    return u && hmac("adm|" + u.id + "|" + m[2] + "|" + u.pw_ver) === m[3] ? u : null;
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
  // =================================================================== A2 — pages, SEO, status, redirects, global parts
  const BACKUPS = path.join(PRIV, "backups"), PMETA = path.join(PRIV, "pages.json"), REDIR = path.join(PRIV, "redirects.json");
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
  function publishRules() {
    const meta = jr(PMETA, {}), red = jr(REDIR, []), q = (s) => s.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
    const lines = ["# BEGIN WOODEX-ADMIN (managed by /admin — do not edit by hand)", "<IfModule mod_rewrite.c>", "RewriteEngine On"];
    red.forEach((r) => lines.push("RewriteRule ^" + q(r.from.replace(/^\/+|\/+$/g, "")) + "/?$ " + r.to + " [R=301,L]"));
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
      case "redirects": need(["owner", "admin"]); return { ok: true, redirects: jr(REDIR, []) };
      case "redirects_save": {
        const u = need(["owner", "admin"]), list = [];
        for (const r of inp.redirects || []) {
          const from = "/" + String(r.from || "").replace(/^\/+|\/+$/g, "") + "/", to = String(r.to || "").trim();
          if (from === "//") continue;
          if (!/^\/[a-z0-9/_\-.]*$/i.test(from)) throw new Fail('Old address "' + from + '" is not valid');
          if (!/^(https?:\/\/[^\s"<>]+|\/[a-z0-9/_\-.#?=&]*)$/i.test(to)) throw new Fail('New address "' + to + '" is not valid');
          if (to.replace(/\/+$/, "") === from.replace(/\/+$/, "")) throw new Fail("A redirect cannot point to itself");
          list.push({ from, to });
        }
        jw(REDIR, list); publishRules(); log(db, u, "redirects.save", list.length + " redirects", ip); return done({ ok: true, redirects: list });
      }
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
  const STAGES = ["new", "contacted", "visit", "quote", "won", "lost"];
  const SOURCES = { contact: "Contact form", estimator: "Cost estimator", brief: "3D brief", "fitout-hub": "Fit-out quote", "office-fitout": "Office fit-out quote", manual: "Added by team", import: "CSV import" };
  const CRM = path.join(PRIV, "crm.json"), OUTBOX = path.join(PRIV, "outbox.jsonl");
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
    const ip = req.socket.remoteAddress || "";
    if (clip(inp._hp) || clip(inp.company_hp)) return { ok: true, id: 0 }; // bot: pretend success
    const h = (formHits.get(ip) || []).filter((t) => Date.now() - t < 600000); if (h.length >= 5) throw new Fail("Too many enquiries from this connection. Please WhatsApp us instead.", 429); h.push(Date.now()); formHits.set(ip, h);
    if (c.tsSecret) {
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
    if (!/^(leads?_|clients?_|crm_)/.test(action)) return null;
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
        Object.assign(c, { name, phone: clip(inp.phone, 40), email: clip(inp.email, 190), company: clip(inp.company, 120), city: clip(inp.city, 80), address: clip(inp.address, 300), notes: clip(inp.notes, 4000) });
        log(db, u, inp.id ? "client.update" : "client.create", c.name, ip); return done({ ok: true, client: c });
      }
      case "client_delete": { const u = need(["owner", "admin"]), c = db.clients.find((x) => x.id === +inp.id); if (!c) throw new Fail("Client not found", 404); db.clients = db.clients.filter((x) => x !== c); db.leads.forEach((l) => { if (l.client_id === c.id) l.client_id = null; }); log(db, u, "client.delete", c.name, ip); return done({ ok: true }); }
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
  const qLabel = (q) => q.no + (q.version > 1 ? " · V" + q.version : "") + (q.option ? " · " + q.option : "");
  const invPub = (i) => { const paid = i.payments.reduce((a, p) => a + p.amount, 0); return { ...i, paid, balance: Math.max(0, i.total - paid), payStatus: paid <= 0 ? "unpaid" : paid >= i.total ? "paid" : "partial", overdue: paid < i.total && i.due_date && i.due_date < now().slice(0, 10) }; };
  function a5(action, inp, need, db, ip) {
    if (!/^(tpl_|quote_|quotes_|inv_|invs_|pay_|proj_|projs_|company_)/.test(action)) return null;
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
          valid_days: Math.max(1, Math.round(num(inp.valid_days) || c.validDays)), sections: cleanSections(inp.sections), discount: num(inp.discount), taxPct: num(inp.taxPct), terms: clip(inp.terms, 3000), notes: clip(inp.notes, 2000), intro: clip(inp.intro, 1500), updated_at: now() });
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
  const CTYPES = ["post", "study", "testimonial", "member", "faq"];
  const PAGE_TYPES = { post: "insights", study: "projects" };
  const AI_DEF = { provider: "anthropic", anthropicKey: "", anthropicModel: "claude-sonnet-4-5", openaiKey: "", openaiModel: "gpt-4o-mini", openrouterKey: "", openrouterModel: "nousresearch/hermes-3-llama-3.1-405b", voice: "Calm, plain, confident British English. Short sentences. No hype, no exclamation marks. Woodex Interior is a design, fit-out and renovation studio in Lahore, Pakistan." };
  const AI_SECRETS = ["anthropicKey", "openaiKey", "openrouterKey"];
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
    if (!key) throw new Fail("Add an API key for " + ({ anthropic: "Claude", openai: "OpenAI", openrouter: "OpenRouter" }[p] || p) + " in Content → AI settings");
    let r, j;
    try {
      if (p === "anthropic") { r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 2500, system, messages: [{ role: "user", content: user }] }), signal: AbortSignal.timeout(60000) }); j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message || r.status); return (j.content || []).map((x) => x.text || "").join(""); }
      const url = p === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
      r = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json", "HTTP-Referer": "https://woodex.com.pk", "X-Title": "Woodex Admin" }, body: JSON.stringify({ model, max_tokens: 2500, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: AbortSignal.timeout(60000) });
      j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message || r.status); return j.choices[0].message.content || "";
    } catch (e) { throw new Fail("AI request failed: " + String(e.message || e).slice(0, 200), 502); }
  }
  const AI_TASKS = {
    outline: (i) => `Write a full blog article for the Woodex website.\nTitle: ${i.title}\nNotes from the team: ${i.notes || "(none)"}\nReturn ONLY JSON: {"dek":"one-sentence standfirst","blocks":[{"t":"h","text":"..."},{"t":"p","text":"..."},{"t":"list","items":["**Label:** text"]}],"summary":["three short takeaways"],"faqs":[{"q":"...","a":"..."}],"quote":"one pull quote"}. 5-7 sections, each a heading plus 1-2 paragraphs. Use **bold** sparingly. Prices in PKR where relevant.`,
    meta: (i) => `Write SEO metadata for this page.\nTitle: ${i.title}\nText: ${String(i.text || "").slice(0, 4000)}\nReturn ONLY JSON: {"title":"max 60 characters, ends with | Woodex Interior","desc":"140-158 characters"}`,
    alt: (i) => `Write alt text (max 110 characters, no "image of") for a photo on the Woodex website. File: ${i.file || ""}. Context: ${i.context || ""}. Return only the alt text.`,
    improve: (i) => `Rewrite this paragraph to be clearer and tighter, same meaning and length or shorter. Return only the paragraph.\n\n${String(i.text || "").slice(0, 3000)}`,
    excerpt: (i) => `Write a card summary (max 150 characters) for this page. Return only the text.\nTitle: ${i.title}\n${String(i.text || "").slice(0, 3000)}`,
    faqs: (i) => `Write 4 FAQs a Pakistani client would ask about: ${i.title}.\nContext: ${String(i.text || "").slice(0, 3000)}\nReturn ONLY JSON: [{"q":"...","a":"1-3 sentences"}]`,
  };
  async function a6(action, inp, need, db, ip) {
    if (!/^(cms_|ai_)/.test(action)) return null;
    const ED = ["owner", "admin", "editor"], OA = ["owner", "admin"];
    const c = cmsLoad(), done = (o) => { jw(CMS, c); save(db); return o; };
    const find = (id) => { const it = c.items.find((x) => x.id === +id); if (!it) throw new Fail("Item not found", 404); return it; };
    switch (action) {
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
        if (!it) { it = { id: ++c.seq, type, status: "draft", created_at: now(), created_by: u.name, rel: null }; c.items.push(it); }
        Object.assign(it, { title, slug, data, seo: { title: clip(inp.seo && inp.seo.title, 90), desc: clip(inp.seo && inp.seo.desc, 200), og: clip(inp.seo && inp.seo.og, 300) }, order: +inp.order || 0, updated_at: now(), updated_by: u.name });
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
        const u = need(ED), it = find(inp.id); if (!PAGE_TYPES[it.type]) throw new Fail("Not a page item");
        const rel = String(inp.rel || ""); if (!cmsRelOk(rel, it.type) || !fs.existsSync(path.join(ROOT, rel))) throw new Fail("Page was not written");
        it.rel = rel; it.status = "published"; it.published_at = it.published_at || now(); delete it.pending; it.publishAt = null; sitemapAdd(rel);
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
        if (!["anthropic", "openai", "openrouter"].includes(c.ai.provider)) c.ai.provider = "anthropic";
        log(db, u, "settings.ai", c.ai.provider, ip); return done({ ok: true, ai: aiPub(c.ai) });
      }
      case "ai_run": {
        const u = need(ED), task = String(inp.task || ""); if (!AI_TASKS[task]) throw new Fail("Unknown AI task");
        const text = await aiCall(c.ai, "You write website copy for Woodex Interior. " + c.ai.voice, AI_TASKS[task](inp.input || {}));
        log(db, u, "ai." + task, "", ip); save(db); return { ok: true, text };
      }
      case "ai_test": { need(OA); const t = await aiCall(c.ai, "Reply with one word.", "Say OK."); return { ok: true, text: t.slice(0, 60) }; }
    }
    return null;
  }

  const adminApi = async function (req, inp) {
    const action = String(inp.action || "status"), ip = req.socket.remoteAddress || "";
    let db = load(); if (db) { try { if (cmsTick(db)) save(db); } catch (e) { console.error("cmsTick", e.message); } }
    const need = (roles) => { const u = current(db, req); if (!u) throw new Fail("Not signed in", 401); if (roles && !roles.includes(u.role)) throw new Fail("You do not have permission for this", 403); return u; };
    const done = (o) => { save(db); return o; };
    switch (action) {
      case "cron": return { ok: true, published: 0 };
      case "status": { const u = current(db, req); return { ok: true, needsSetup: !db, driver: "json", builderLocked: true, user: u ? pub(u) : null }; }
      case "setup": {
        if (db) throw new Fail("Already set up", 403);
        if (String(inp.builderPassword || "") !== builderPassword()) throw new Fail("The current builder password is wrong", 401);
        const name = String(inp.name || "").trim(), email = String(inp.email || "").trim().toLowerCase();
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Fail("Enter your name and a valid email"); validPw(inp.password);
        db = { users: [], activity: [], seqU: 1, seqA: 0 };
        const u = { id: 1, name, email, role: "owner", pass_hash: hash(inp.password), active: 1, pw_ver: 1, created_at: now(), last_login: null }; db.users.push(u);
        log(db, u, "setup", "", ip);
        return done({ ok: true, token: tokenFor(u), builderToken: builderToken(u.id), user: pub(u) });
      }
      case "login": {
        if (!db) throw new Fail("Admin is not set up yet", 503);
        const t = tries.get(ip) || { n: 0, t: 0 };
        if (t.n >= 8 && Date.now() - t.t < 600000) throw new Fail("Too many attempts — wait 10 minutes", 429);
        const u = db.users.find((x) => x.email === String(inp.email || "").trim().toLowerCase());
        if (!u || !u.active || !verify(inp.password, u.pass_hash)) { tries.set(ip, { n: Date.now() - t.t < 600000 ? t.n + 1 : 1, t: Date.now() }); await new Promise((r) => setTimeout(r, 400)); throw new Fail("Wrong email or password", 401); }
        u.last_login = now(); log(db, u, "login", "", ip);
        return done({ ok: true, token: tokenFor(u), builderToken: canBuild(u) ? builderToken(u.id) : null, user: pub(u) });
      }
      case "me": { const u = need(); return { ok: true, user: pub(u), builderToken: canBuild(u) ? builderToken(u.id) : null }; }
      case "logout": { const u = current(db, req); if (u) { log(db, u, "logout", "", ip); save(db); } return { ok: true }; }
      case "profile": { const u = need(); const n = String(inp.name || "").trim(); if (!n) throw new Fail("Name is required"); u.name = n.slice(0, 120); log(db, u, "profile.update", "", ip); return done({ ok: true, user: pub(u) }); }
      case "password": {
        const u = need(); if (!verify(inp.current, u.pass_hash)) throw new Fail("Current password is wrong", 401); validPw(inp.next);
        u.pass_hash = hash(inp.next); u.pw_ver++; log(db, u, "password.change", "", ip); return done({ ok: true, token: tokenFor(u) });
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
          Object.assign(old, { name, email, role, active }); if (pw || !active) old.pw_ver++; if (pw) old.pass_hash = hash(pw);
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
        const r = (await a2(action, inp, need, db, ip)) || (await a4(action, inp, need, db, ip)) || a5(action, inp, need, db, ip) || (await a6(action, inp, need, db, ip)); if (r) return r;
        throw new Fail("Unknown action", 404);
      }
    }
  };
  adminApi.forms = formsApi;
  adminApi.publicGuard = function (rel) {
    // preview-only: mimic the managed .htaccess rules (redirects, drafts 404)
    const url = "/" + rel.replace(/index\.html$/, ""), r = jr(REDIR, []).find((x) => x.from === url || x.from === url + "/");
    if (r) return { redirect: r.to };
    const m = jr(PMETA, {})[rel]; if (m && m.status === "draft") return { notFound: true };
    return null;
  };
  return adminApi;
}
export { Fail as AdminFail };
