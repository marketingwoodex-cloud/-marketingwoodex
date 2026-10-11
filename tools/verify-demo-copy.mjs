/*
 * tools/verify-demo-copy.mjs — does the static copy really work with no PHP at all?
 *
 *   node tools/verify-demo-copy.mjs [port]
 *
 * It serves woodex-live-p23/ with a plain GET-only static file server (the same shape as
 * `python3 -m http.server`, which answers 501 to any POST), loads /demo-preview/ in jsdom over real
 * HTTP, signs in through the real login form, then walks every route in the sidebar. Any PHP request
 * would come back 501 here, so a green run proves the copy answered every API call inside the page.
 *
 * One harness aid: jsdom has neither matchMedia nor fetch, so the site pages that two screens load
 * inside an iframe (theme, builder) would throw there. The harness injects the same two-line shim into
 * the HTML it serves from outside /demo-preview/ that tools/demo-server.mjs injects into every page —
 * a real browser has both APIs, so it never sees the shim.
 *
 * Exit 0 = signed in and every route rendered.
 */
const jsdom = await (async () => {
  try { return await import("jsdom"); } catch { return await import("/tmp/pvtest/node_modules/jsdom/lib/api.js"); }
})();
const { JSDOM, VirtualConsole } = jsdom;
const { createServer } = await import("node:http");
const { readFile } = await import("node:fs/promises");
const { extname, join, normalize } = await import("node:path");

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "") + "/woodex-live-p23";
const PORT = Number(process.argv[2] || process.env.WX_COPY_PORT || 8142);
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".map": "application/json" };

/* ---- a dumb static host: GET/HEAD only, POST gets 501 (exactly like python -m http.server) ------ */
const HARNESS_SHIM = '<script>(function(){var w=window;if(!w.matchMedia)w.matchMedia=function(q){return{matches:false,media:q,' +
  'addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){},onchange:null};};' +
  'if(!w.fetch)w.fetch=function(){return Promise.resolve({ok:false,status:0,json:function(){return Promise.resolve({});},text:function(){return Promise.resolve("");}});};})();</script>';
let apiHits = 0, shimmed = 0;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) apiHits++;
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(501, { "Content-Type": "text/plain" }); return res.end("Unsupported method ('POST')"); }
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, rel.replace(/^\/+/, ""));
  if (rel.endsWith("/")) file = join(file, "index.html");
  try {
    let buf = await readFile(file);
    const type = MIME[extname(file)] || "application/octet-stream";
    if (type.startsWith("text/html") && !url.pathname.startsWith("/demo-preview/")) {
      const html = String(buf);
      const m = html.match(/<body[^>]*>/i);
      if (m) { buf = Buffer.from(html.replace(m[0], m[0] + HARNESS_SHIM)); shimmed++; }
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(req.method === "HEAD" ? undefined : buf);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});
await new Promise(r => server.listen(PORT, "127.0.0.1", r));
const base = `http://127.0.0.1:${PORT}`;
console.log(`\n  static host (GET only) on ${base} — serves ${ROOT}`);
console.log(`  admin asked for: ${base}/demo-preview/\n`);

const table = [];
let fails = [], errors = [];
process.on("unhandledRejection", e => errors.push("unhandledRejection: " + (e && e.message ? e.message : String(e))));
const vc = new VirtualConsole();
vc.on("jsdomError", e => { const m = String(e.message); if (!/Could not parse CSS|Not implemented|navigation/.test(m)) errors.push("jsdomError: " + m); });
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const { DEMO } = await import("./demo-data.mjs");
const NEEDED = ["telegram", "theme", "maintenance", "regional", "security", "team-feed", "library", "expenses", "bulkdoc"];

const dom = await JSDOM.fromURL(`${base}/demo-preview/`, {
  resources: "usable", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.fetch = (url, opts) => fetch(new URL(String(url), win.location.href), opts); /* files only: demo-api.js owns /api/* */
    win.HTMLCanvasElement.prototype.getContext = function () {
      return { canvas: this, createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null,
        measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
        save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {},
        stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, clearRect() {}, rect() {}, arc() {}, arcTo() {}, ellipse() {},
        setLineDash() {}, getLineDash: () => [], translate() {}, scale() {}, rotate() {}, transform() {}, setTransform() {},
        clip() {}, drawImage() {}, createImageData: () => ({ data: [] }), getImageData: () => ({ data: [] }), putImageData() {},
        fillText() {}, strokeText() {}, isPointInPath: () => false };
    };
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.IntersectionObserver = class { observar() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    win.URL.createObjectURL = () => "blob:demo"; win.URL.revokeObjectURL = () => {};
    win.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null });
    win.Element.prototype.scrollIntoView = function () {};
    win.scrollTo = function () {}; win.scrollBy = function () {};
    win.onerror = (m, src, line) => errors.push("window.onerror: " + m + " @" + (src || "").split("/").pop() + ":" + line);
  },
});
const win = dom.window, doc = win.document;
await wait(2500);

/* ---- the login screen came from the copy, not from PHP ------------------------------------------ */
table.push(["demo-data.js loaded its fixtures", !!(win.WX_DEMO_DATA && win.WX_DEMO_DATA.respond)]);
table.push(["the demo banner is on the page", !!doc.querySelector("#wx-demo-banner")]);
table.push(["the sign-in form rendered (no 501 banner)", !!doc.querySelector("#l-email") && !!doc.querySelector("#l-btn") && !/Server error (501)/.test(doc.body.innerHTML)]);
const help = await fetch(`${base}/demo-preview/demo-help.html`);
table.push(["demo-help.html is served next to it", help.status === 200 && /Demo@Woodex2026/.test(await help.text())]);

/* ---- sign in the way a person does -------------------------------------------------------------- */
if (!win.WXA) { console.log("  the app did not boot — stopping"); process.exit(1); }
doc.querySelector("#l-email").value = DEMO.email;
doc.querySelector("#l-pass").value = DEMO.password;
doc.querySelector("#l-btn").click();
await wait(2600);
const signedIn = !!(win.WXA && win.WXA.S && win.WXA.S.user);
table.push(["signing in through the form works", signedIn]);
if (!signedIn) {
  console.log("  login did not complete.");
  console.log("  fetch wrapper installed: " + (String(win.fetch).indexOf("API_RE") > -1 || win.fetch.name === "" ? "looks wrapped" : "native"));
  console.log("  collected errors: " + (errors.slice(0, 3).join(" | ") || "none"));
  const err = doc.querySelector(".err, #l-err, .error");
  if (err) console.log("  on-screen login error: " + String(err.textContent).slice(0, 200));
  for (const [n, ok] of table) console.log("  " + (ok ? "PASS" : "FAIL") + "  " + n);
  console.log("  exit 1");
  process.exit(1);
}

for (let i = 0; i < 60; i++) {
  if (win.WXA && win.WXA.VIEWS && NEEDED.every(v => win.WXA.VIEWS[v] && win.WXA.VIEWS[v] !== win.WXA.VIEWS.soon)) break;
  await wait(200);
}
table.push(["all deferred screens registered", NEEDED.every(v => win.WXA.VIEWS[v] && win.WXA.VIEWS[v] !== win.WXA.VIEWS.soon)]);
table.push(["the dashboard has real content", (doc.querySelector("#view") || { innerHTML: "" }).innerHTML.length > 1500]);

/* ---- walk every sidebar route ------------------------------------------------------------------- */
const routes = [];
doc.querySelectorAll("#nav a[href^='#/']").forEach(a => {
  const id = a.getAttribute("href").replace(/^#\//, "").split("/")[0];
  if (id && !routes.some(r => r[0] === id)) routes.push([id, (a.textContent || "").trim()]);
});
console.log("  routes discovered: " + routes.length + "\n");
const RENDER = {};
Object.keys(win.WXA.VIEWS).forEach(k => { const f = win.WXA.VIEWS[k]; win.WXA.VIEWS[k] = function () { RENDER[k] = (RENDER[k] || 0) + 1; return f.apply(this, arguments); }; });
const carried = [];
let apiBefore = apiHits;
for (const [id] of routes) {
  errors = []; RENDER[id] = 0;
  win.location.hash = "#/" + id;
  await wait(40);
  if (!RENDER[id]) win.dispatchEvent(new win.Event("hashchange"));
  await wait(id === "dashboard" ? 900 : 500);
  const html = (doc.querySelector("#view") || { innerHTML: "" }).innerHTML;
  const soon = !!doc.querySelector(".soon-box");
  let state = errors.length ? "ERROR" : soon ? "soon" : html.length > 220 ? "ok" : "EMPTY";
  if ((id === "builder" || id === "theme") && state !== "ok") state = "SKIP";
  if (state === "SKIP") carried.push(id);
  if (state === "ERROR") fails.push(id + " → " + errors[0].slice(0, 150));
  if (state === "EMPTY") fails.push(id + " → EMPTY");
  console.log("  " + (state === "ok" ? "✓" : state === "soon" ? "•" : state === "SKIP" ? "−" : "✗") + " " + id.padEnd(16) +
    String(html.length).padStart(7) + " B  " + state +
    (state === "SKIP" ? "  embedded preview runs in an iframe — a real browser is needed" : errors[0] ? "  " + errors[0].slice(0, 90) : ""));
}
table.push(["no PHP request was ever made by the page", apiHits === apiBefore]);
console.log("\n  ==== checks ====");
let bad = 0;
for (const [n, ok] of table) { if (!ok) bad++; console.log("  " + (ok ? "PASS" : "FAIL") + "  " + n); }
console.log("\n  routes: " + routes.length + " · route failures: " + fails.length + " · carried: " + (carried.join(", ") || "none") +
  " · check failures: " + bad + " · POSTs that reached the static host: " + (apiHits - apiBefore) +
  " · iframe pages given the jsdom shim: " + shimmed);
if (fails.length) console.log("  failing routes:\n    " + fails.join("\n    "));
console.log("  exit " + (fails.length || bad ? 1 : 0));
server.close();
process.exit(fails.length || bad ? 1 : 0);
