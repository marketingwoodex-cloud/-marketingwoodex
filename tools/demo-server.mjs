#!/usr/bin/env node
/**
 * tools/demo-server.mjs — run the Woodex admin from a plain Node process, with no PHP and no MySQL.
 *
 *   node tools/demo-server.mjs            # http://0.0.0.0:8090
 *   node tools/demo-server.mjs 8080       # another port
 *
 * WHY: admin/index.html talks to /api/admin.php over POST. A static file server answers every POST
 * with "501 Unsupported method", which is the red banner on the sign-in screen. This process serves
 * the same files AND answers those POSTs, so the untouched admin signs in and every screen opens.
 *
 * WHAT IT IS: the real front-end (admin/, builder/, assets/ — all served from disk, unmodified) on
 * top of the demo payloads in tools/demo-data.mjs. Nothing in the application is patched, and this
 * server writes nothing to disk.
 *
 * WHAT IT IS NOT: PHP. There is no database, no uploads, no mail and no Telegram bridge. Writes are
 * acknowledged so screens behave, but they vanish when the process stops. Every HTML page gets a
 * one-line banner injected saying exactly that — so nobody can mistake the demo for the live site —
 * and /wx-check.php answers with a demo-mode report instead of leaking PHP source.
 *
 * NOT FOR PRODUCTION. On a real host the site runs on PHP 8.2 + MySQL; delete this file and
 * tools/demo-data.mjs from the deployed copy (they are development tools, like tools/*.mjs).
 */
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO, respond, KNOWN_ACTIONS } from "./demo-data.mjs";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = resolve(HERE, "..", "woodex-live-p23");
const PORT = Number(process.argv[2] || process.env.WX_DEMO_PORT || 8090);
const HOST = process.env.WX_DEMO_HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".pdf": "application/pdf", ".map": "application/json; charset=utf-8",
  ".mp4": "video/mp4", ".webm": "video/webm", ".avif": "image/avif",
};

/* The banner is the one thing this server *adds* to a page — it never rewrites the app's own code.
   It is injected right after <body ...> in HTML responses only. */
const BANNER_ID = "wx-demo-banner";
const BANNER = `<div id="${BANNER_ID}" style="position:sticky;top:0;z-index:9999;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:7px 14px;background:#0c1628;color:#e9eef5;font:12px/1.4 system-ui,Segoe UI,Roboto,sans-serif;border-bottom:1px solid #253047">` +
  `<b style="color:#7dd3fc">DEMO MODE</b>` +
  `<span>no PHP, no database — screens, data and buttons are a Node process (<code style="color:#cbd5e1">tools/demo-server.mjs</code>); nothing is saved and nothing reaches the live site.</span>` +
  `<span style="opacity:.75">signed in as ${DEMO.email}</span>` +
  `<a href="/demo-help.html" style="color:#7dd3fc">what works?</a></div>`;

/* Two browser APIs the headless harness (jsdom) does not implement are filled in only when they are
   missing — a real browser has both, so on a real browser this snippet changes nothing. Without it the
   site pages that the builder and theme screens load inside an iframe throw on load. */
const SHIM_ID = "wx-demo-shim";
const SHIM = `<script id="${SHIM_ID}">(function(){var w=window;` +
  `if(!w.matchMedia)w.matchMedia=function(q){return{matches:false,media:q,addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){},onchange:null};};` +
  `if(!w.fetch)w.fetch=function(){return Promise.resolve({ok:false,status:0,json:function(){return Promise.resolve({});},text:function(){return Promise.resolve("");}});};` +
  `})();</script>`;

function injectBanner(html) {
  if (html.includes(BANNER_ID)) return html;
  const m = html.match(/<body[^>]*>/i);
  const add = BANNER + SHIM;
  return m ? html.replace(m[0], m[0] + add) : add + html;
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(text), "Cache-Control": "no-store" });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 8 * 1024 * 1024) break; chunks.push(c); }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/* /wx-check.php: on a real host this reports PHP, extensions, permissions and tables. Here it
   reports the demo honestly — and, unlike the static preview, it does not print PHP source. */
function checkPage() {
  const rows = [
    ["PHP", "not present — this is the Node demo server"],
    ["Database", "not connected — data comes from tools/demo-data.mjs (in memory)"],
    ["Actions answered", KNOWN_ACTIONS.length + " fixtures, everything else gets a shaped empty payload"],
    ["Sign in with", DEMO.email + " / " + DEMO.password],
    ["Writes", "acknowledged, never persisted"],
    ["Serving", ROOT],
  ];
  return "<!doctype html><html lang=en><head><meta charset=utf-8><title>Demo check — Woodex admin</title>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'><style>body{font:15px/1.6 system-ui,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;color:#0c1628}" +
    "h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:14px}td{border-bottom:1px solid #e2e8f0;padding:8px 6px;vertical-align:top}" +
    "td:first-child{color:#64748b;width:190px}code{background:#f1f5f9;padding:1px 5px;border-radius:4px}a{color:#007595}</style></head><body>" +
    "<h1>Demo check</h1><p>You are reading the demo server's own report. The real <code>/wx-check.php</code> needs PHP — " +
    "which is exactly why the sign-in screen showed <b>Server error (501)</b> when this tree was served by a static file server.</p>" +
    "<table>" + rows.map(r => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("") + "</table>" +
    "<p style='margin-top:22px'><a href='/admin/'>Open the admin</a> · <a href='/demo-help.html'>What works in the demo?</a></p></body></html>";
}

function helpPage() {
  const s = (t, items) => "<h2>" + t + "</h2><ul>" + items.map(i => "<li>" + i + "</li>").join("") + "</ul>";
  return "<!doctype html><html lang=en><head><meta charset=utf-8><title>Demo help — Woodex admin</title>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'><style>body{font:15px/1.65 system-ui,Segoe UI,Roboto,sans-serif;max-width:820px;margin:40px auto;padding:0 18px;color:#0c1628}" +
    "h1{font-size:22px}h2{font-size:15px;margin:24px 0 6px;color:#007595;text-transform:uppercase;letter-spacing:.04em}ul{margin:0;padding-left:18px}" +
    "code{background:#f1f5f9;padding:1px 5px;border-radius:4px}a{color:#007595}.k{display:inline-block;background:#0c1628;color:#e9eef5;padding:2px 8px;border-radius:6px;font:12px ui-monospace,monospace}</style></head><body>" +
    "<h1>Woodex admin — demo mode</h1><p><span class=k>" + DEMO.email + "</span> <span class=k>" + DEMO.password + "</span></p>" +
    s("Working with real demo data", [
      "Dashboard — KPIs, lead/paid series, pipeline funnel, follow-ups and the overdue list",
      "Expenses (Money → Expense log) — 10 vouchers, budget-versus-actual bars, filters, CSV",
      "Document packs (Money → Document packs) — tick types, build a pack, workbook, CSV, print packet",
      "Leads & pipeline, Clients, Bookings, Quotations, Invoices — Woodex-shaped records",
      "Regional ops — the 12 node codes, projects, milestones, ledger, rate cards",
      "Inbox, Team feed, WhatsApp, Media, SEO, Health, Theme, Telegram, Backups, Users, Activity log",
    ]) +
    s("Opens but has no data behind it", [
      "Anything that would read or write the real database: settings forms save into nothing",
      "Uploads (media, logos, backups) — there is no disk to write to on purpose",
      "The page builder's saved pages, Google/Sheets sync, Telegram and WhatsApp bridges",
    ]) +
    s("What is deliberately different from the live site", [
      "The dark bar at the top: this is the demo, and it says so on every page",
      "Writes are acknowledged and discarded; reload the browser and the demo starts over",
      "No PHP runs at all — <a href='/wx-check.php'>/wx-check.php</a> explains this instead of the 501",
    ]) +
    s("How to see the real thing", [
      "Deploy <code>woodex-live-p23/</code> to PHP 8.2 + MySQL (docs/V2.7-PRELINE-UPGRADE-PLAN.md §9 has the checklist), then open /wx-install.php once",
      "Or locally, on a machine with PHP and MySQL: <code>php -S 0.0.0.0:8080</code> inside <code>woodex-live-p23/</code>",
    ]) +
    "<p style='margin-top:24px'><a href='/admin/'>Open the admin</a></p></body></html>";
}

function sendFile(req, res, rel, status = 200) {
  const abs = join(ROOT, rel);
  const ext = extname(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const head = { "Content-Type": type, "Cache-Control": "no-store" };
  if (ext === ".html") {
    /* read, inject the banner, send */
    let html = "";
    const stream = createReadStream(abs);
    return new Promise((ok, no) => {
      stream.on("data", c => { html += c.toString("utf8"); });
      stream.on("error", no);
      stream.on("end", () => {
        const out = Buffer.from(injectBanner(html), "utf8");
        res.writeHead(status, Object.assign({}, head, { "Content-Length": out.length }));
        res.end(out); ok();
      });
    });
  }
  const size = statSync(abs).size;
  res.writeHead(status, Object.assign({}, head, { "Content-Length": size }));
  createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  let path = decodeURIComponent(url.pathname);

  /* --- the Admin API, answered in JavaScript --------------------------------------------- */
  if (path.startsWith("/api/") && path.endsWith(".php")) {
    if (req.method !== "POST") {
      /* a GET on an API endpoint is a mistake by hand; say so plainly instead of 501 */
      return json(res, 405, { ok: false, error: "The Admin API takes POST only. Open /admin/ and sign in." });
    }
    const body = await readBody(req);
    const action = String(body.action || url.searchParams.get("action") || "");
    const token = String(req.headers["x-wx-adm"] || "");
    if (!action) return json(res, 400, { ok: false, error: "No action given" });
    const { status, body: out } = respond(action, body, token);
    return json(res, status, out);
  }

  /* --- the two pages this server owns ---------------------------------------------------- */
  if (path === "/wx-check.php" || path === "/wx-check") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(checkPage());
  }
  if (path === "/demo-help.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(helpPage());
  }
  if (path === "/" || path === "") path = "/index.html";
  if (path.endsWith("/")) path += "index.html";

  /* never serve the private store, the database folder or dotfiles */
  if (/^\/(_private|_database|_templates|\.git)\b/.test(path) || /(^|\/)\./.test(path)) {
    return json(res, 403, { ok: false, error: "Not served in demo mode" });
  }

  const abs = normalize(join(ROOT, path));
  if (!abs.startsWith(ROOT)) return json(res, 403, { ok: false, error: "Outside the tree" });
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    /* a missing file is far more often a wrong path than a missing page — say which */
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<!doctype html><meta charset=utf-8><title>404 — demo server</title>" +
      "<body style='font:15px/1.6 system-ui,sans-serif;max-width:640px;margin:60px auto;color:#0c1628'>" +
      "<h1 style='font-size:20px'>Not in the demo tree</h1><p><code>" + path.replace(/[<>&]/g, "") + "</code> is not a file in " +
      "<code>woodex-live-p23/</code>. The admin lives at <a href='/admin/'>/admin/</a>.</p></body>");
  }
  try { await sendFile(req, res, path); }
  catch (e) { json(res, 500, { ok: false, error: "demo server could not read " + path }); }
});

export function startDemo(port = PORT, host = HOST) {
  return new Promise(resolve => server.listen(port, host, () => resolve(server)));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  server.listen(PORT, HOST, () => {
    const line = "─".repeat(78);
    console.log("\n" + line);
    console.log("  Woodex admin — DEMO SERVER (no PHP, no MySQL)");
    console.log(line);
    console.log("  admin      http://localhost:" + PORT + "/admin/");
    console.log("  sign in    " + DEMO.email + "   /   " + DEMO.password);
    console.log("  what works http://localhost:" + PORT + "/demo-help.html");
    console.log("  serving    " + ROOT);
    console.log("  fixtures   " + KNOWN_ACTIONS.length + " actions; everything else gets a shaped empty payload");
    console.log("  note       writes are acknowledged and discarded — this is a demo, not the live site");
    console.log(line + "\n");
  });
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  process.on("SIGINT", () => server.close(() => process.exit(0)));
}
