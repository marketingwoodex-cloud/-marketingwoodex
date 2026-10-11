/* demo-api.js — the one hand-written file in this copy.
 *
 * WHAT THIS FOLDER IS
 *   A copy of ../admin/ (the Woodex admin) that works with no PHP at all. Every other file in here is
 *   an exact copy of the original; the only difference is that index.html loads
 *   <script src="demo-data.js"> and <script src="demo-api.js"> just before admin.js. Nothing in
 *   ../admin/ was touched.
 *
 * WHAT THIS FILE DOES
 *   The admin speaks to the server by POSTing JSON to /api/admin.php with fetch(). On a static file
 *   server (python -m http.server, GitHub Pages, any preview host) that request can never be answered,
 *   which is the "Server error (501)" people see. So this file wraps window.fetch: calls to
 *   /api/admin.php and /api/builder.php are answered right here from the fixture set in demo-data.js,
 *   and every other request (CSS, images, /builder/*, /assets/*) is passed straight through to the
 *   real server exactly as before. Sign-in, routing, every screen and every button work; nothing is
 *   saved, because writes are acknowledged and thrown away.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   No database, no email, no WhatsApp, no Google/Sheets/Telegram calls, no file uploads (there is no
 *   disk here). The page builder's own iframe posts to PHP by itself, so saving there is inert too.
 *   See demo-help.html.
 */
(function () {
  "use strict";

  var DATA = window.WX_DEMO_DATA;
  var API_RE = /\/api\/(?:admin|builder)\.php$/;

  /* ---- two browser APIs the headless test harness lacks (a real browser has both) ------------- */
  if (!window.matchMedia) {
    window.matchMedia = function (q) {
      return { matches: false, media: q, addEventListener: function () {}, removeEventListener: function () {},
        addListener: function () {}, removeListener: function () {}, onchange: null };
    };
  }

  /* ---- the answer object: a real Response where there is one, a duck-typed one where there is not */
  function answer(status, body) {
    var text = JSON.stringify(body);
    if (typeof Response === "function") {
      return new Response(text, { status: status, headers: { "Content-Type": "application/json; charset=utf-8" } });
    }
    return {
      ok: status >= 200 && status < 300, status: status, statusText: String(status),
      headers: { get: function () { return "application/json"; } },
      json: function () { return Promise.resolve(JSON.parse(text)); },
      text: function () { return Promise.resolve(text); },
      clone: function () { return answer(status, body); },
    };
  }

  var nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url = String((input && input.url) || input || "");
    var path = url.split("?")[0];
    var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();

    if (!API_RE.test(path)) return nativeFetch ? nativeFetch(input, init) : Promise.reject(new TypeError("fetch is unavailable"));

    if (method !== "POST") {
      return Promise.resolve(answer(405, {
        ok: false,
        error: "This demo answers POST only — no PHP runs here. See demo-help.html.",
      }));
    }
    var payload = {};
    try { payload = JSON.parse(String((init && init.body) || "{}")) || {}; } catch (e) { payload = {}; }
    var token = "";
    try {
      var h = (init && init.headers) || {};
      token = (typeof h.get === "function" ? h.get("X-WX-ADM") : h["X-WX-ADM"]) || "";
    } catch (e) { token = ""; }

    if (!DATA || typeof DATA.respond !== "function") {
      return Promise.resolve(answer(500, { ok: false, error: "demo-data.js did not load — see demo-help.html" }));
    }
    var out = DATA.respond(String(payload.action || payload.a || ""), payload, token);
    return Promise.resolve(answer(out.status, out.body));
  };

  /* ---- the dark bar at the top, same wording as tools/demo-server.mjs ------------------------- */
  function banner() {
    if (document.getElementById("wx-demo-banner") || !document.body) return;
    var D = (DATA && DATA.DEMO) || {};
    var el = document.createElement("div");
    el.id = "wx-demo-banner";
    el.setAttribute("style", "position:sticky;top:0;z-index:9999;display:flex;gap:10px;align-items:center;" +
      "justify-content:center;flex-wrap:wrap;padding:9px 14px;font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
      "background:#0b0d13;color:#e2e8f0;border-bottom:1px solid #1e2430;text-align:center");
    el.innerHTML = '<b style="color:#7dd3fc">DEMO MODE</b>' +
      '<span>no PHP, no database — the API is answered inside this page by <code style="color:#cbd5e1">demo-api.js</code>; ' +
      "nothing is saved and nothing is sent anywhere</span>" +
      '<span style="opacity:.75">signed in as ' + (D.email || "demo@woodex.pk") + "</span>" +
      '<a href="demo-help.html" style="color:#7dd3fc">what works?</a>';
    document.body.insertBefore(el, document.body.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner);
  else banner();
})();
