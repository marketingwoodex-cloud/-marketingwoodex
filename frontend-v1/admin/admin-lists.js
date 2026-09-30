/* Woodex Admin — P16 3.4 list-page pattern. Upgrades every existing list table without touching its module:
   paging for long lists (25/page), row count, mobile card rows (data-label), sticky header. Re-applies when a list redraws. */
(function () {
  "use strict";
  var PER = 25, busy = false;
  function label(tbl) {
    var hs = [].map.call(tbl.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
    [].forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) {
      [].forEach.call(tr.children, function (td, i) { if (!td.hasAttribute("data-label") && hs[i]) td.setAttribute("data-label", hs[i]); });
    });
  }
  function page(tbl) {
    var tb = tbl.tBodies[0]; if (!tb) return;
    var rows = [].filter.call(tb.rows, function (r) { return !r.querySelector(".empty") && r.style.display !== "none" || r.hasAttribute("data-pg"); });
    var wrap = tbl.closest(".tbl-wrap") || tbl.parentNode, bar = wrap.nextElementSibling && wrap.nextElementSibling.classList.contains("lp-bar") ? wrap.nextElementSibling : null;
    if (rows.length <= PER) { rows.forEach(function (r) { if (r.hasAttribute("data-pg")) { r.removeAttribute("data-pg"); r.style.display = ""; } }); if (bar) bar.remove(); return; }
    var n = Math.ceil(rows.length / PER), p = Math.min(+(tbl.dataset.pg || 1), n); tbl.dataset.pg = p;
    rows.forEach(function (r, i) { r.setAttribute("data-pg", ""); r.style.display = i >= (p - 1) * PER && i < p * PER ? "" : "none"; });
    if (!bar) { bar = document.createElement("div"); bar.className = "lp-bar"; wrap.parentNode.insertBefore(bar, wrap.nextSibling); }
    var btn = function (k, t, dis, on) { return '<button type="button" data-p="' + k + '"' + (dis ? " disabled" : "") + (on ? ' class="on"' : "") + ">" + t + "</button>"; }, nums = "";
    for (var k = 1; k <= n; k++) if (k === 1 || k === n || Math.abs(k - p) <= 1) nums += btn(k, k, false, k === p); else if (Math.abs(k - p) === 2) nums += "<span>…</span>";
    bar.innerHTML = "<small>Showing " + ((p - 1) * PER + 1) + "–" + Math.min(p * PER, rows.length) + " of " + rows.length + "</small><div>" + btn(p - 1, "‹", p === 1) + nums + btn(p + 1, "›", p === n) + "</div>";
    bar.onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b || b.disabled) return; tbl.dataset.pg = b.dataset.p; run(); (tbl.closest(".card") || tbl).scrollIntoView({ block: "start", behavior: "smooth" }); };
  }
  function run() {
    if (busy) return; busy = true;
    try { [].forEach.call(document.querySelectorAll("#view table.tbl"), function (t) { t.classList.add("lp"); label(t); page(t); }); } finally { setTimeout(function () { busy = false; }, 0); }
  }
  var tmr; function soon() { clearTimeout(tmr); tmr = setTimeout(run, 60); }
  function boot() { var v = document.getElementById("view"); if (!v) return setTimeout(boot, 200);
    new MutationObserver(function (m) { if (!busy && m.some(function (x) { return x.type === "childList"; })) soon(); }).observe(v, { childList: true, subtree: true });
    // a new search/filter resets to page 1
    v.addEventListener("input", function (e) { if (e.target.matches("input[type=search], input[placeholder^='Search'], select")) [].forEach.call(v.querySelectorAll("table.tbl"), function (t) { t.dataset.pg = 1; }); }, true);
    v.addEventListener("change", function (e) { if (e.target.matches("select")) [].forEach.call(v.querySelectorAll("table.tbl"), function (t) { t.dataset.pg = 1; }); }, true);
    run(); }
  boot();
})();
