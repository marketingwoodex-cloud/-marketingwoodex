import http from "node:http";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAdmin } from "./frontend-v1-admin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../woodex-live-p23");
const PRIV = path.join(ROOT, "_private");
const BACKUPS = path.join(PRIV, "backups");
const UPLOADS = path.join(ROOT, "assets/uploads");
const PORT = +process.env.PORT || 8084;
const DEV_CFG = path.join(PRIV, "dev-password.txt");
fs.mkdirSync(BACKUPS, { recursive: true });
let PASSWORD = process.env.WX_DEV_PASSWORD || (fs.existsSync(DEV_CFG) ? fs.readFileSync(DEV_CFG, "utf8").trim() : "") || "Woodex@2026";
const secret = () => crypto.createHash("sha256").update("wx-dev|" + PASSWORD).digest("hex");

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".zip": "application/zip" };

const makeToken = () => { const exp = String(Math.floor(Date.now() / 1000) + 12 * 3600); return exp + "." + crypto.createHmac("sha256", secret()).update("wx|" + exp).digest("hex"); };
function loggedIn(req) {
  const t = String(req.headers["x-wx-csrf"] || "");
  if (adminApi.installed()) return adminApi.builderOk(t);
  const m = /^(\d{10})\.([a-f0-9]{64})$/.exec(t);
  if (!m || +m[1] < Date.now() / 1000) return false;
  const good = crypto.createHmac("sha256", secret()).update("wx|" + m[1]).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(good), Buffer.from(m[2]));
}
const tokenUid = (req) => { const m = /^\d{10}\.(\d+)\./.exec(String(req.headers["x-wx-csrf"] || "")); return m ? +m[1] : null; };
const safeEq = (a, b) => { const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const tries = new Map();
const adminApi = createAdmin({ ROOT, secret, builderPassword: () => PASSWORD });

class Fail extends Error { constructor(msg, code = 400) { super(msg); this.code = code; } }
function pagePath(rel) {
  rel = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  if (!/^[a-z0-9][a-z0-9/_\-.]*\.html$/i.test(rel) || rel.includes("..")) throw new Fail("Invalid page path");
  if (/^(_private|builder|admin|api|assets)\//.test(rel)) throw new Fail("That file cannot be edited");
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Fail("Page not found", 404);
  return abs;
}

http.createServer(async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    const url = new URL(req.url, "http://localhost");
    let p = url.pathname;

    if (p === "/api/quote-view.php") { const r = adminApi.quoteView(url.searchParams.get("id"), url.searchParams.get("t") || ""); res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" }); return res.end(r.html); }
    if (p === "/api/mcp.php") {
      let body = ""; req.on("data", (c) => (body += c));
      await new Promise((r) => req.on("end", r));
      let r; try { r = await adminApi.mcp(req, body); } catch (e) { r = { status: 500, body: { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Server error" } } }; }
      res.writeHead(r.status || 200, { "Content-Type": "application/json; charset=utf-8" }); return res.end(JSON.stringify(r.body));
    }
    if (p === "/api/r404.php") { const ch = []; for await (const c of req) ch.push(c); adminApi.r404(Buffer.concat(ch).toString().slice(0, 2000)); res.writeHead(204); return res.end(); }
    if (p === "/api/chat.php") {
      const chunks = []; for await (const c of req) chunks.push(c);
      let status = 200, out; try { let inp = {}; try { inp = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch {} out = adminApi.chat(req, inp); } catch (e) { status = e.code || 500; out = { ok: false, error: e.code ? e.message : "Server error" }; }
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return res.end(JSON.stringify(out));
    }
    if (p === "/api/forms.php") {
      const chunks = []; for await (const c of req) chunks.push(c);
      let status = 200, out;
      try { let inp = {}; const raw = Buffer.concat(chunks).toString(); try { inp = JSON.parse(raw || "{}"); } catch { inp = Object.fromEntries(new URLSearchParams(raw)); } if (req.method === "GET") inp = { action: "config" }; else if (req.method !== "POST") throw Object.assign(new Error("POST required"), { code: 405 }); out = await adminApi.forms(req, inp); }
      catch (e) { status = e.code || 500; out = { ok: false, error: e.code ? e.message : "Server error" }; }
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return res.end(JSON.stringify(out));
    }
    if (p === "/api/admin.php" && ["backup_up", "db_dl", "db_up"].includes(url.searchParams.get("action"))) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = adminApi.rawAction(req, url.searchParams.get("action"), Buffer.concat(chunks));
      res.writeHead(r.status || 200, r.headers || { "Content-Type": "application/json" }); return res.end(r.body);
    }
    if (p === "/api/admin.php" && url.searchParams.get("action") === "backup_dl") {
      const f = adminApi.backupFile(req, String(url.searchParams.get("name") || ""));
      if (!f) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": 'attachment; filename="' + path.basename(f) + '"' });
      return fs.createReadStream(f).pipe(res);
    }
    if (p === "/api/admin.php") {
      const chunks = []; for await (const c of req) chunks.push(c);
      let status = 200, out;
      try { let inp = {}; try { inp = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch {} if (req.method === "GET" && url.searchParams.get("action") === "cron") inp = { action: "cron" }; out = await adminApi(req, inp); }
      catch (e) { status = e.code || 500; out = { ok: false, error: e.code ? e.message : "Server error" }; if (!e.code) console.error(e); }
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify(out));
    }

    if (!/^\/(admin|builder|api|assets)\//.test(p)) {
      const rel = (p.endsWith("/") ? p + "index.html" : /\.[a-z0-9]+$/i.test(p) ? p : p + "/index.html").replace(/^\/+/, "");
      const g = adminApi.publicGuard(rel, req);
      if (g && g.maint) { res.writeHead(503, { "Content-Type": MIME[".html"], "Retry-After": "3600" }); return fs.createReadStream(path.join(ROOT, g.maint)).pipe(res); }
      if (g && g.redirect) { res.writeHead(g.code || 301, { Location: g.redirect }); return res.end(); }
      if (g && g.gone) { res.writeHead(410, { "Content-Type": "text/plain" }); return res.end("410 Gone"); }
      if (g && g.notFound) { res.writeHead(404, { "Content-Type": MIME[".html"] }); return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res); }
    }
    let file = path.join(ROOT, p);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" + url.search }); return res.end(); }
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) { res.writeHead(404, { "Content-Type": MIME[".html"] }); return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res); }
    const ext = path.extname(file).toLowerCase();
    if (ext === ".html" && !/^\/(builder|admin)/.test(p)) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      const btn = `<a id="wx-prev-edit" href="/builder/#${encodeURIComponent(rel)}" hidden style="position:fixed;left:20px;bottom:20px;z-index:99999;background:#d4af6a;color:#0a0f1e;font:600 14px/1 system-ui,sans-serif;padding:14px 18px;border-radius:999px;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.35)">✏️ Edit this page</a><script>(function(){try{if(sessionStorage.getItem("wxaTok")){var b=document.getElementById("wx-prev-edit");if(b)b.hidden=false;}}catch(e){}})();</script>`;
      const lh = /Lighthouse|PageSpeed/i.test(req.headers["user-agent"] || "");
      const body = fs.readFileSync(file, "utf8").replace(/<\/body>/i, (lh ? "" : btn) + "</body>");
      if (/gzip/.test(req.headers["accept-encoding"] || "")) { res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache", "Content-Encoding": "gzip", Vary: "Accept-Encoding" }); return res.end(zlib.gzipSync(body)); }
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
      return res.end(body);
    }
    if (ext === ".zip") {
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${path.basename(file)}"`,
        "Content-Length": fs.statSync(file).size,
        "Cache-Control": "no-cache"
      });
      return fs.createReadStream(file).pipe(res);
    }
    const cache = /^\.(webp|jpe?g|png|gif|svg|woff2|avif)$/.test(ext) && !/^\/(builder|admin)/.test(p) ? "public, max-age=2592000" : "no-cache";
    if (/^\.(css|js|svg|json|txt|xml)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] || "")) { res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache, "Content-Encoding": "gzip", Vary: "Accept-Encoding" }); return fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res); }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); if (!res.headersSent) res.writeHead(500); res.end("Server error"); }
}).listen(PORT, "0.0.0.0", () => console.log(`Woodex Admin v2.1 Dedicated Preview → :${PORT} (0.0.0.0:${PORT})`));
