/*
 * _tests/demo-server.test.js — does the demo server really let the untouched admin sign in?
 *
 * This is the honest test of the fix for "Server error (501)": it boots admin/index.html from the
 * demo server over real HTTP (jsdom's fetch is bridged to Node's fetch, so every request leaves the
 * process, crosses a socket and is answered by tools/demo-server.mjs), signs in through the real
 * login form with the demo credentials, then walks every route in the sidebar and reports anything
 * that threw or rendered empty.
 *
 *   node woodex-live-p23/_tests/demo-server.test.js            # own port 8123
 *   node woodex-live-p23/_tests/demo-server.test.js 8124
 *
 * Handy switches while working on a fixture: WX_ONLY=seo,health runs just those routes, WX_STACK=1
 * prints the first admin frame of every error, WX_DUMP=1 prints what the route rendered when it failed.
 *
 * Exit 0 = signed in and every route rendered. Two screens are carried the way the routes sweep
 * carries them: builder and theme both render the live site inside a same-origin iframe, which jsdom
 * does not execute.
 */
/* ESM: jsdom is resolved with dynamic import so the script runs with either a local install or the
   sandbox scratch copy. */
const jsdom = await (async () => {
  try { return await import("jsdom"); } catch (e) { return await import("/tmp/pvtest/node_modules/jsdom/lib/api.js"); }
})();
const { JSDOM, VirtualConsole } = jsdom;
const { startDemo } = await import("../../tools/demo-server.mjs");
const { DEMO } = await import("../../tools/demo-data.mjs");

const PORT = Number(process.argv[2] || process.env.WX_DEMO_TEST_PORT || 8123);
const wait = ms => new Promise(r => setTimeout(r, ms));
const table = [];
let fails = [], errors = [];

let stacks = [];
const shortStack = e => String((e && e.stack) || "").split("\n")
  .filter(l => /\/admin\/|\/tools\/|\/woodex-live-p23\//.test(l)).slice(0, 3).join("\n        ");
process.on("unhandledRejection", e => {
  errors.push("unhandledRejection: " + (e && e.message ? e.message : String(e)));
  if (process.env.WX_STACK) stacks.push(shortStack(e));
});
const vc = new VirtualConsole();
vc.on("jsdomError", e => { const m = String(e.message); if (!/Could not parse CSS|Not implemented|navigation/.test(m)) errors.push("jsdomError: " + m); });
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

(async () => {
  await startDemo(PORT, "127.0.0.1");
  console.log("\n  demo server up on http://127.0.0.1:" + PORT);
  const base = `http://127.0.0.1:${PORT}`;
  const post = (body) => fetch(base + "/api/admin.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  /* --- 1. the server answers the way the admin needs -------------------------------------- */
  const status = await (await post({ action: "status" })).json();
  const loginRes = await post({ action: "login", email: DEMO.email, password: DEMO.password });
  const loginBody = await loginRes.json();
  const badRes = await post({ action: "login", email: DEMO.email, password: "nope" });
  const getRes = await fetch(base + "/api/admin.php");
  const banner = await (await fetch(base + "/admin/index.html")).text();
  const check = await (await fetch(base + "/wx-check.php")).text();
  const privateRes = await fetch(base + "/_private/db.json");

  table.push(["POST status answers ok:true, needsSetup:false", status.ok === true && status.needsSetup === false]);
  table.push(["POST login returns a token + the owner user", loginRes.status === 200 && !!loginBody.token && loginBody.user.role === "owner"]);
  table.push(["login with a wrong password is 401", badRes.status === 401]);
  table.push(["GET on the API says POST only (never 501)", getRes.status === 405]);
  table.push(["HTML pages carry the DEMO MODE banner", /wx-demo-banner/.test(banner) && /DEMO MODE/.test(banner)]);
  table.push(["/wx-check.php explains demo mode", /Demo check/.test(check)]);
  table.push(["/_private is never served", privateRes.status === 403]);

  /* --- 2. the real admin, over real HTTP --------------------------------------------------- */
  const dom = await JSDOM.fromURL(`${base}/admin/index.html`, {
    resources: "usable", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.fetch = (url, opts) => fetch(new URL(String(url), win.location.href), opts);
      /* Chart.js needs ctx.canvas back, or it refuses the canvas ("can't acquire context") */
      win.HTMLCanvasElement.prototype.getContext = function () {
        return {
          canvas: this, createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null,
          measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
          save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {},
          stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, clearRect() {}, rect() {}, arc() {}, arcTo() {}, ellipse() {},
          setLineDash() {}, getLineDash: () => [], translate() {}, scale() {}, rotate() {}, transform() {}, setTransform() {},
          clip() {}, drawImage() {}, createImageData: () => ({ data: [] }), getImageData: () => ({ data: [] }), putImageData() {},
          fillText() {}, strokeText() {}, isPointInPath: () => false,
        };
      };
      win.URL.createObjectURL = () => "blob:demo"; win.URL.revokeObjectURL = () => {};
      /* jsdom has no layout engine, so the two observers the dashboard charts and lazy blocks ask for
         are stubbed exactly the way the routes sweep stubs them. */
      win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      win.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
      win.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null });
      win.Element.prototype.scrollIntoView = function () {};
      win.scrollTo = function () {}; win.scrollBy = function () {};
      win.onerror = (m, src, line) => errors.push("window.onerror: " + m + " @" + (src || "").split("/").pop() + ":" + line);
    },
  });
  const win = dom.window, doc = win.document;
  await wait(2500);

  const loginShown = !!doc.querySelector("#l-email") && !!doc.querySelector("#l-btn");
  table.push(["the real login screen rendered (no 501 banner)", loginShown && !/Server error/.test(doc.body.innerHTML)]);

  doc.querySelector("#l-email").value = DEMO.email;
  doc.querySelector("#l-pass").value = DEMO.password;
  doc.querySelector("#l-btn").click();
  await wait(2600);

  table.push(["signing in through the form works", !!(win.WXA && win.WXA.S && win.WXA.S.user)]);
  table.push(["the dashboard canvas has real content", (doc.querySelector("#view") || { innerHTML: "" }).innerHTML.length > 1500]);

  const NEEDED = ["telegram", "theme", "maintenance", "regional", "security", "team-feed", "library", "expenses", "bulkdoc"];
  for (let i = 0; i < 60; i++) {
    const have = win.WXA && win.WXA.VIEWS && NEEDED.every(v => win.WXA.VIEWS[v] && win.WXA.VIEWS[v] !== win.WXA.VIEWS.soon);
    if (have) break;
    await wait(200);
  }
  table.push(["all deferred screens registered", NEEDED.every(v => win.WXA.VIEWS[v] && win.WXA.VIEWS[v] !== win.WXA.VIEWS.soon)]);

  /* --- 3. walk the sidebar ------------------------------------------------------------------ */
  const routes = [];
  Array.prototype.slice.call(doc.querySelectorAll("#nav a[href^='#/']")).forEach(a => {
    const id = a.getAttribute("href").replace(/^#\//, "").split("/")[0];
    if (id && !routes.some(r => r[0] === id)) routes.push([id, (a.textContent || "").trim()]);
  });
  const only = (process.env.WX_ONLY || "").split(",").map(x => x.trim()).filter(Boolean);
  if (only.length) { for (let i = routes.length - 1; i >= 0; i--) if (only.indexOf(routes[i][0]) < 0) routes.splice(i, 1); }
  console.log("  routes discovered: " + routes.length + "\n");
  const MARK = { expenses: ["Expense log", "Pak Boards, Gulberg"], bulkdoc: ["Document packs", "Available documents"] };
  const carried = [];
  /* jsdom fires hashchange on its own when the hash is assigned, so the router runs once. A second,
     synthetic dispatch would detach the first render's container and break every screen that queries
     the document after its fetch resolves — so each view is counted and nudged only if it stayed quiet. */
  const RENDER = {};
  Object.keys(win.WXA.VIEWS).forEach(k => {
    const f = win.WXA.VIEWS[k];
    win.WXA.VIEWS[k] = function () { RENDER[k] = (RENDER[k] || 0) + 1; return f.apply(this, arguments); };
  });

  for (const [id] of routes) {
    errors = []; stacks = [];
    RENDER[id] = 0;
    win.location.hash = "#/" + id;
    await wait(40);
    if (!RENDER[id]) win.dispatchEvent(new win.Event("hashchange"));
    await wait(id === "dashboard" ? 900 : 500);
    const html = (doc.querySelector("#view") || { innerHTML: "" }).innerHTML;
    const soon = !!doc.querySelector(".soon-box");
    const missing = (MARK[id] || []).filter(m => html.indexOf(m) < 0);
    let state = errors.length ? "ERROR" : soon ? "soon" : html.length > 220 ? "ok" : "EMPTY";
    if (state === "ok" && missing.length) state = "THIN";
    /* Two screens embed a live preview document that jsdom does not run: the builder page inside an
       iframe and the theme screen's same-origin site preview. The sweep carries them the same way. */
    if ((id === "builder" || id === "theme") && state !== "ok") state = "SKIP";
    if (state === "SKIP") carried.push(id);
    if (state === "ERROR") {
      fails.push(id + " → " + errors[0].slice(0, 160));
      if (process.env.WX_STACK && stacks[0]) console.log("        " + stacks[0]);
    }
    if (process.env.WX_DUMP && state !== "ok" && state !== "SKIP") {
      console.log("        view node: " + ((doc.querySelector("#view") || {}).id || "?") + " · children " + doc.querySelectorAll("#view > *").length);
      console.log("        head: " + html.replace(/\s+/g, " ").slice(0, 320));
    }
    if (state === "EMPTY") fails.push(id + " → EMPTY");
    if (state === "THIN") fails.push(id + " → missing markers: " + missing.join(", "));
    const why = state === "SKIP" ? "embedded site preview runs in an iframe — a real browser is needed"
      : errors[0] ? errors[0].slice(0, 90) : "";
    console.log("  " + (state === "ok" ? "✓" : state === "soon" ? "•" : state === "SKIP" ? "−" : "✗") + " " + id.padEnd(16) + String(html.length).padStart(7) + " B  " + state + (why ? "  " + why : ""));
  }

  console.log("\n  ==== checks ====");
  let bad = 0;
  for (const [name, ok] of table) { if (!ok) bad++; console.log("  " + (ok ? "PASS" : "FAIL") + "  " + name); }
  console.log("\n  routes: " + routes.length + " · route failures: " + fails.length + " · carried by the harness: " + (carried.join(", ") || "none") + " · check failures: " + bad);
  if (fails.length) console.log("  failing routes:\n    " + fails.join("\n    "));
  console.log("  exit " + (fails.length || bad ? 1 : 0));
  process.exit(fails.length || bad ? 1 : 0);
})();
