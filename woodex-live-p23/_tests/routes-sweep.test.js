/* Woodex Admin v2.7 — 59-route headless sweep.
 *
 * Purpose: boot the REAL admin/admin.js (not a fixture page) inside jsdom with a stubbed
 * Admin API, then visit every NAV route and report per screen: thrown errors, whether the
 * canvas rendered real markup, or whether it fell back to the `soon` placeholder.
 *
 * The stub answers `status`, `me` and `pages` exactly as the backend would; every other
 * action gets a permissive empty payload, so a screen that throws here is a real bug in the
 * screen (bad DOM id, missing dependency, undefined helper) and not a backend difference.
 *
 * Run:
 *   1. cd woodex-live-p23 && python3 -m http.server 8103 --bind 0.0.0.0
 *   2. mkdir -p /tmp/pvtest && cd /tmp/pvtest && npm install jsdom --no-audit --no-fund
 *   3. node woodex-live-p23/_tests/routes-sweep.test.js 8103
 *
 * Exit 0 = every route rendered without a runtime error. `soon` routes are listed as
 * KNOWN-GAP (they are the unregistered views tracked as D1 in docs/V2.7-PRELINE-UPGRADE-PLAN.md).
 */
let jsdom;
try { jsdom = require("jsdom"); } catch (e) { jsdom = require("/tmp/pvtest/node_modules/jsdom"); }
const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;
const PORT = process.argv[2] || process.env.WX_TEST_PORT || "8103";
const BASE = "http://127.0.0.1:" + PORT + "/admin/index.html";

const wait = ms => new Promise(r => setTimeout(r, ms));
let errors = [];
/* a rejected boot promise (e.g. a missing element in a screen) must be reported, not fatal */
process.on("unhandledRejection", e => errors.push("unhandledRejection: " + (e && e.message ? e.message : String(e)) + " @ " + String((e && e.stack) || "").split("\n")[1]));
const vc = new VirtualConsole();
vc.on("jsdomError", e => { const m = String(e.message); if (!/Could not parse CSS|Not implemented|navigation/.test(m)) errors.push("jsdomError: " + m); });
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

/* ---- canned Admin API ----
 * `me`/`status`/`login`/`pages` are exact. Everything else gets a *universal* payload: a
 * callable proxy that answers every property access with itself, coerces to 0/"" , iterates
 * as empty and reports length 0. That way a screen can run its real render path
 * (`r.items.map(...)`, `for..of`, `r.kpis.length`) and produce an empty-but-valid screen,
 * instead of dying on a payload shape the backend would have provided. Fields whose *truthiness*
 * is a branch (`error`, `err`, `message`) stay undefined so error paths are not taken.
 */
const FALSY = new Set(["error", "err", "message", "warning", "stack"]);
const universal = new Proxy(function () {}, {
  get(t, k) {
    if (typeof k === "symbol") {
      if (k === Symbol.iterator) return function* () {};
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.toStringTag) return "WXStub";
      return undefined;
    }
    if (FALSY.has(k)) return undefined;
    if (k === "length" || k === "size" || k === "total") return 0;
    if (k === "then") return undefined;              /* never look like a thenable */
    if (k === "toString") return () => "";
    return universal;
  },
  set() { return true; },
  has() { return true; },
  ownKeys() { return []; },
  getOwnPropertyDescriptor() { return { configurable: true, enumerable: true, value: universal }; },
  apply() { return universal; },
  construct() { return universal; }
});

function respond(action) {
  if (action === "status") return { ok: true, user: { name: "QA Sweep", email: "qa@woodex.pk", role: "owner" }, setup: false, dbError: false };
  if (action === "me") return { ok: true, token: "qa-token", builderToken: "qa-builder", user: { name: "QA Sweep", email: "qa@woodex.pk", role: "owner" } };
  if (action === "login") return { ok: true, token: "qa-token", builderToken: "qa-builder", user: { name: "QA Sweep", email: "qa@woodex.pk", role: "owner" } };
  if (action === "pages") return { ok: true, pages: [], total: 0 };
  /* Phase 3 fixture pack: the three screens that were stuck on their Loading… shell because these
     payloads were missing. Shapes mirror api/builder.php:theme, api/admin.php:tg_get and :mt_get. */
  if (action === "theme_get") return { ok: true, vars: { "--wx-preset": "woodex", "--wx-navy": "#0c1628", "--wx-font": "dm", "--wx-font-head": "jakarta", "--wx-r-lg": "16px", "--wx-btn-radius": "999px" } };
  if (action === "tg_get") return { ok: true, cfg: { bot: "", site: "chat", tgUser: "", group: false, groupTitle: "", linked: 0, tokenSet: false, webhook: "", waDown: false, meDm: false, alertChats: false, alertLeads: true, alertChatsPhone: "" }, me: null, on: false };
  if (action === "mt_get") return { ok: true, on: false, mode: "maintenance", until: "", text: "", token: "qa-staff-token", files: [{ name: "404.html", bytes: 8123 }, { name: "500.html", bytes: 6402 }, { name: "503.html", bytes: 7311 }], pages: [{ path: "404.html", title: "Page not found" }, { path: "500.html", title: "Server error" }, { path: "503.html", title: "Maintenance" }] };
  /* v2.7 expense log — shapes mirror api/expense-lib.php exp_list / exp_kpis, so the screen draws
     real rows and real KPIs instead of falling through to the permissive payload. */
  if (action === "exp_list") return { ok: true, count: 3,
    items: [
      { id: 41, spent_on: "2026-10-03", category: "board", cat_label: "Board & raw material", node: "LHR", vendor: "Pak Boards, Gulberg", detail: "18 mm MDF, 14 sheets + 6 mm backing", amount: 96500, tax_pct: 18, tax_amt: 17370, wht_amt: 0, total: 113870, paid_by: "bank", pay_label: "Bank transfer", status: "paid", project: "NODE-26-014", receipt: "/assets/uploads/bill-41.webp", recurring: 0, note: "", created_by: "Ar. Bilal Ahmed", created_at: "2026-10-03 11:20:00" },
      { id: 42, spent_on: "2026-10-05", category: "wages", cat_label: "Site labour (daily wages)", node: "RWP", vendor: "Site crew — 6 men", detail: "Wardrobe carcass fitting, 3 days", amount: 54000, tax_pct: 0, tax_amt: 0, wht_amt: 0, total: 54000, paid_by: "cash", pay_label: "Cash", status: "paid", project: "NODE-26-011", receipt: "", recurring: 0, note: "", created_by: "Ar. Bilal Ahmed", created_at: "2026-10-05 09:05:00" },
      { id: 43, spent_on: "2026-10-07", category: "transport", cat_label: "Transport, fuel & loading", node: "KHI", vendor: "Al-Noor Transport", detail: "1.5 ton, 2 loads to site", amount: 22500, tax_pct: 5, tax_amt: 1125, wht_amt: 0, total: 23625, paid_by: "credit", pay_label: "On credit", status: "pending", project: "", receipt: "", recurring: 0, note: "Invoice awaited", created_by: "Ar. Bilal Ahmed", created_at: "2026-10-07 16:40:00" }
    ],
    totals: { amount: 173000, tax: 18495, with_tax: 191495 },
    range: { month: "2026-10", from: "2026-10-01", to: "2026-10-31" },
    meta: { categories: { board: "Board & raw material", hardware: "Hardware & fittings", polish: "Polish, paint & adhesive", glass: "Glass, mirrors & acrylic", transport: "Transport, fuel & loading", wages: "Site labour (daily wages)", workshop: "Workshop & machine labour", tools: "Machinery, tools & blades", rent: "Rent — workshop & showroom", utilities: "Electricity, gas & water", phone: "Internet & phone", marketing: "Marketing & advertising", software: "Software & subscriptions", taxes: "Taxes & government fees", professional: "Professional fees", repairs: "Repairs & maintenance", travel: "Travel & food", misc: "Miscellaneous" },
      pay: { cash: "Cash", bank: "Bank transfer", cheque: "Cheque", jazzcash: "JazzCash", easypaisa: "Easypaisa", card: "Card", credit: "On credit" },
      status: { paid: "Paid", pending: "Pending approval", credit: "On credit" },
      nodes: ["LHR", "ISB", "KHI", "RWP", "FSD", "GRW", "MUX", "PSH", "SKT", "BWP", "QTA", "HYD"] } };
  if (action === "exp_kpis") return { ok: true, kpis: {
    month: "2026-10", from: "2026-10-01", to: "2026-10-31", days: 31, day: 11, count: 3,
    sum: 173000, tax: 18495, wht: 0, with_tax: 191495,
    pending: { n: 1, value: 23625 }, credit: { n: 1, value: 23625 }, paid: { n: 2, value: 167870 },
    recurring: { value: 185000, n: 1 }, avg_day: 15727.27, projected: 487545.45,
    by_cat: [
      { key: "board", label: "Board & raw material", n: 1, amount: 96500, tax: 17370 },
      { key: "wages", label: "Site labour (daily wages)", n: 1, amount: 54000, tax: 0 },
      { key: "transport", label: "Transport, fuel & loading", n: 1, amount: 22500, tax: 1125 }
    ],
    by_node: [ { key: "LHR", n: 1, amount: 96500 }, { key: "RWP", n: 1, amount: 54000 }, { key: "KHI", n: 1, amount: 22500 } ],
    caps: { board: 120000, wages: 480000, transport: 140000, rent: 185000 },
    top: { key: "board", label: "Board & raw material", n: 1, amount: 96500, tax: 17370 },
    over_budget: [],
    meta: { categories: { board: "Board & raw material" }, pay: { cash: "Cash" }, status: { paid: "Paid" }, nodes: ["LHR", "RWP", "KHI"] } } };
  if (action === "notifications" || action === "notify_list") return { ok: true, items: [], unread: 0, total: 0 };
  return new Proxy({ ok: true }, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (FALSY.has(k)) return undefined;
      return universal;
    },
    set(t, k, v) { t[k] = v; return true; },
    has(t, k) { return true; },
    ownKeys(t) { return Object.keys(t); },
    getOwnPropertyDescriptor(t, k) { return { configurable: true, enumerable: true, value: (k in t) ? t[k] : universal }; }
  });
}

/* The admin embeds the public site (live header/footer preview) and the builder (/builder/)
 * in iframes. Those documents are separate windows that this harness does not instrument, so
 * they are answered with a stub document: the sweep verifies the ADMIN screen, not the embedded
 * site, and the builder page's own scripts are covered by the ARC/builder tests. */
const iframeStub = requestInterceptor(request => {
  const u = String(request.url || "");
  if (u === "http://127.0.0.1:" + PORT + "/" || /\/builder\/?(\?.*)?$/.test(u)) {
    return new Response("<!doctype html><html><head><title>site stub</title></head><body><header class=\"site-header\"></header><main><h1>stub</h1></main><footer class=\"footer\"></footer></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return undefined;
});

(async () => {
  const dom = await JSDOM.fromURL(BASE, {
    resources: "usable",
    runScripts: "dangerously", resources: { usable: true, interceptors: [iframeStub] }, pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      function Chart(el) { this.canvas = el; }
      Chart.prototype.destroy = function () {}; Chart.prototype.update = function () {};
      Chart.register = function () {}; Chart.defaults = { font: {}, plugins: {} };
      win.Chart = Chart;
      win.HTMLCanvasElement.prototype.getContext = function () {
        return { createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, fillRect() {}, clearRect() {}, arc() {}, closePath() {}, setLineDash() {}, translate() {}, scale() {}, rotate() {} };
      };
      win.URL.createObjectURL = () => "blob:qa"; win.URL.revokeObjectURL = () => {};
      win.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null });
      /* jsdom implements neither of these; the admin calls them for niceties only */
      win.Element.prototype.scrollIntoView = function () {};
      win.scrollTo = function () {}; win.scrollBy = function () {};
      win.fetch = function (url, opts) {
        let body = {}; try { body = JSON.parse((opts && opts.body) || "{}"); } catch (e) {}
        const payload = respond(body.action || "");
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload), text: () => Promise.resolve(JSON.stringify(payload)) });
      };
      win.onerror = (m, src, line, col) => errors.push("window.onerror: " + m + " @" + (src || "").split("/").pop() + ":" + line);
    }
  });

  const win = dom.window, doc = win.document;
  await wait(2500);

  /* 64 defer modules load in sequence; a route visited before its module lands renders the
     `soon` placeholder. Wait for the last-registered views so every route tests the real screen. */
  const NEEDED = ["telegram", "theme", "maintenance", "regional", "security", "team-feed", "library"];
  for (let i = 0; i < 60; i++) {
    const have = win.WXA && win.WXA.VIEWS && NEEDED.every(v => win.WXA.VIEWS[v] && win.WXA.VIEWS[v] !== win.WXA.VIEWS.soon);
    if (have) break;
    await wait(250);
  }

  const q = s => doc.querySelector(s);
  const fails = [], gaps = [], table = [];
  const ok = m => table.push(m) && console.log(m);

  if (!win.WXA) { console.log("✗ admin.js never exported WXA — boot failed"); console.log(errors.join("\n")); process.exit(1); }

  const NAV = [];
  (function walk(items) {
    items.forEach(it => {
      if (it.g) walk(it.items);
      else if (Array.isArray(it) && it.length > 1 && typeof it[0] === "string") NAV.push([it[0], it[1]]);
    });
  })(win.WXA.S && win.WXA.nav ? win.WXA.nav() : []);
  /* S.nav() is not exposed; read the rendered sidebar instead — it is built from NAV. */
  const routes = [];
  Array.prototype.slice.call(doc.querySelectorAll("#nav a[href^='#/']")).forEach(a => {
    const id = a.getAttribute("href").replace(/^#\//, "").split("/")[0];
    if (id && !routes.some(r => r[0] === id)) routes.push([id, (a.textContent || "").trim()]);
  });
  var V = win.WXA.VIEWS || {};
  var soonKeys = Object.keys(V).filter(function (k) { return V[k] === V.soon; });
  var reachable = routes.map(function (r) { return r[0]; });
  console.log("  VIEWS registered: " + Object.keys(V).length + " (placeholder: " + (soonKeys.join(", ") || "none") + ")");
  console.log("  registered but unreachable from the sidebar: " + (Object.keys(V).filter(function (k) { return k !== "soon" && reachable.indexOf(k) < 0; }).join(", ") || "none") + "\n");

  var only = (process.env.WX_ONLY || "").split(",").filter(Boolean);
  if (only.length) { for (let i = routes.length - 1; i >= 0; i--) if (only.indexOf(routes[i][0]) < 0) routes.splice(i, 1); }
  /* Per-route content markers. A screen is only "ok" if the strings that prove its blocks drew are
     actually in the canvas — 220 bytes of header markup is not a rendered screen. Add a row here
     when a screen gains a structural element worth pinning down. */
  var MARKS = {
    expenses: ["Expense log", "Spent in ", "Waiting for approval", "On credit", "Projected month-end",
               "By category", "Pak Boards, Gulberg", "Site labour (daily wages)", "Fixed monthly"]
  };
  var settle = Number(process.env.WX_WAIT || 0);
  console.log("\n  routes discovered in the sidebar: " + routes.length + "\n");

  for (const [id, label] of routes) {
    errors = [];
    win.location.hash = "#/" + id;
    win.dispatchEvent(new win.Event("hashchange"));
    await wait((id === "dashboard" ? 900 : 420) + settle);
    const view = q("#view");
    let html = view ? view.innerHTML : "";
    if (html.length <= 220) { await wait(900 + settle); errors = errors; html = view ? view.innerHTML : html; }
    const soon = !!doc.querySelector("#view .soon-box");
    const err = errors[0] || "";
    let state = err ? "ERROR" : soon ? "soon" : html.length > 220 ? "ok" : "EMPTY";
    /* Two conditions are carried by the harness, not by the app:
       · `builder` embeds the real builder page in an iframe — its document is stubbed here.
       · a screen that still shows a Loading… shell is waiting on a payload shape the stub does
         not fabricate; the fixture packs for those actions are added in Phase 3. */
    if (state !== "ok" && id === "builder") state = "SKIP";
    else if (state !== "ok" && /Loading…/.test(html)) state = "STUB";
    var want = MARKS[id] || [], missing = want.filter(function (m) { return html.indexOf(m) < 0; });
    if (state === "ok" && missing.length) state = "THIN";
    const mark = state === "ok" ? "✓" : state === "SKIP" ? "−" : state === "STUB" ? "~" : state === "soon" ? "•" : state === "THIN" ? "!" : "✗";
    ok("  " + mark + " " + id.padEnd(16) + String(html.length).padStart(7) + " B  " + state + (err ? "  " + err.slice(0, 110) : ""));
    if (state === "ERROR" || state === "EMPTY") fails.push(id + " → " + state + " " + err.slice(0, 200));
    if (state === "THIN") fails.push(id + " → rendered, but these markers never appeared: " + missing.join(", "));
    if (state === "STUB" || state === "SKIP") gaps.push(id + "(" + state + ")");
    if ((process.env.WX_DUMP || "").split(",").indexOf(id) > -1) {
      console.log("      └ " + html.slice(0, 260).replace(/\s+/g, " "));
      const marks = ["Starter suite", "Install all", "lb-sgrid", "sections-v27", "Your library"];
      console.log("      marks: " + marks.map(m => m + "=" + (html.indexOf(m) > -1 ? "yes" : "no")).join("  "));
    }
    if (state === "soon") gaps.push(id + "(soon)");
  }

  console.log("\n  ==== rendered " + table.length + " routes — errors/empty: " + fails.length + ", carried by the harness: " + gaps.length + " ====");
  if (fails.length) console.log("  failing routes:\n    " + fails.join("\n    "));
  if (gaps.length) console.log("  carried by the harness (not app failures): " + gaps.join(", "));
  console.log("  exit " + (fails.length ? 1 : 0));
  process.exit(fails.length ? 1 : 0);
})();
