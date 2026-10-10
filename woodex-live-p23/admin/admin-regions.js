/* Woodex Admin v2.6 — REGIONAL OPERATIONS (api/regions-lib.php, actions rgn_*)
   Routes: #/regional/<tab>  ·  tabs: dashboard pipeline configs projects approvals ledger estimator rates reports health
   Every request carries the mandatory routing parameter (one or more of the 12 verified node codes). */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, VIEWS = W.VIEWS;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function ls(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  var BOOT = null, BOOTP = null, CHARTS = [], DRAW = {}, LAST = null;
  var F = {
    preset: ls("wxRgnPreset", "30d"), from: ls("wxRgnFrom", ""), to: ls("wxRgnTo", ""),
    nodes: ls("wxRgnNodes", []), stage: ls("wxRgnStage", "all")
  };
  var LEAD = { q: "", stages: [], priorities: [], unread: 0, page: 1, per: 25, sort: "created_at" };
  var LEDG = { kind: "all", status: "all" };
  var EST = null;   // estimator draft
  var TABS = [
    ["dashboard", "Node dashboard", "bar-chart-3"],
    ["pipeline", "Pipeline", "kanban"],
    ["configs", "Volume configs", "table"],
    ["projects", "Projects", "briefcase"],
    ["approvals", "Milestone approvals", "shield-check"],
    ["ledger", "Node ledger", "receipt"],
    ["estimator", "Estimator", "gauge"],
    ["rates", "Rate cards", "layers"],
    ["reports", "Reports", "activity"],
    ["health", "Health", "heart-pulse"]
  ];
  var TAB = (function () { var t = (location.hash.replace(/^#\/?/, "").split("/")[1] || "dashboard").split("?")[0]; return t || "dashboard"; })();

  function pkr(n) {
    n = +n || 0; var s = n < 0 ? "-" : ""; n = Math.abs(n);
    if (n >= 1e7) return s + "PKR " + (n / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr";
    if (n >= 1e5) return s + "PKR " + (n / 1e5).toFixed(1).replace(/\.0$/, "") + " Lac";
    return s + "PKR " + n.toLocaleString("en-PK");
  }
  function num(n) { return (+n || 0).toLocaleString("en-PK"); }
  function bf(n) { return (+n || 0).toLocaleString("en-PK", { maximumFractionDigits: 3 }); }
  function datef(s) { if (!s) return "—"; var d = new Date(String(s).replace(" ", "T")); return isNaN(d) ? esc(String(s)) : d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }); }
  function ago(t) { if (!t) return "—"; var s = (Date.now() - new Date(String(t).replace(" ", "T")).getTime()) / 1000; if (isNaN(s)) return "—"; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; }
  function today() { var d = new Date(); return d.toISOString().slice(0, 10); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + (+n || 0)); return d.toISOString().slice(0, 10); }
  function isDark() { return document.documentElement.classList.contains("dark"); }
  function node(code) { code = String(code || "").toUpperCase(); for (var i = 0; i < (BOOT ? BOOT.nodes.length : 0); i++) if (BOOT.nodes[i].code === code) return BOOT.nodes[i]; return { code: code, city: code, label: code, dir: "/", zone: "A", labour_index: 1, waste_pct: 12, lead_time_days: 14, tax_pct: 18, advance_pct: 40, areas: [] }; }
  function cityOf(code) { return node(code).city; }
  function stageLabel(code) { var S = BOOT ? BOOT.stages : []; for (var i = 0; i < S.length; i++) if (S[i].code === code) return S[i].label; return code; }
  function badge(text, cls) { return '<span class="badge ' + (cls || "") + '">' + esc(text) + "</span>"; }
  var QSTAGE = { new: "", contacted: "info", visit: "info", quote: "warn", won: "ok", lost: "bad" };
  var PSTAGE = { survey: "", design: "info", approval: "warn", fabrication: "warn", install: "info", handover: "ok" };
  var STATUS = { open: "", hold: "warn", done: "ok", cancelled: "bad" };
  var LSTATUS = { due: "warn", partial: "info", paid: "ok", cancelled: "bad" };
  var MSTATE = { pending: "warn", approved: "ok", rejected: "bad", done: "ok" };

  function boot() {
    if (BOOT) return Promise.resolve(BOOT);
    if (!BOOTP) BOOTP = api("rgn_boot").then(function (r) {
      if (!r.ok) throw r; BOOT = r;
      if (!F.nodes.length) { var a = []; for (var i = 0; i < r.nodes.length; i++) if (r.nodes[i].active) a.push(r.nodes[i].code); F.nodes = a.slice(0, 4); }
      return r;
    });
    return BOOTP;
  }
  function q() { var o = { preset: F.preset, nodes: F.nodes }; if (F.preset === "custom") { o.from = F.from; o.to = F.to; } return o; }

  function killCharts() { CHARTS.forEach(function (c) { try { c.destroy(); } catch (e) {} }); CHARTS = []; }
  /* Every canvas renderer gets a brand-new element so listeners from the previous
     paint can never fire twice (same trick admin.js route() uses for #view). */
  function remount(cv) { var box = document.createElement("div"); cv.innerHTML = ""; cv.appendChild(box); return box; }
  function spark(el, series) {
    if (!el) return;
    CHARTS = CHARTS.filter(function (c) { return c.canvas && c.canvas.isConnected; });
    if (!window.Chart) { setTimeout(function () { spark(el, series); }, 160); return; }
    var cx = el.getContext("2d"), gold = isDark() ? "#00b8db" : "#007595";
    var g = cx.createLinearGradient(0, 0, 0, 52); g.addColorStop(0, gold + "44"); g.addColorStop(1, gold + "00");
    CHARTS.push(new Chart(el, {
      type: "line",
      data: { labels: (LAST && LAST.axis ? LAST.axis : series.map(function (_, i) { return i; })), datasets: [{ data: series, borderColor: gold, backgroundColor: g, fill: true, tension: .35, borderWidth: 2, pointRadius: 0 }] },
      options: { maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { displayColors: false } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, layout: { padding: 0 } }
    }));
  }

  /* ---------------------------------------------------------------- Block 1 */
  function filterBar() {
    if (!BOOT) return '<div class="rgn-filters"><span class="muted">Loading node registry…</span></div>';
    var chips = BOOT.presets.map(function (p) {
      return '<button class="rgn-chip' + (F.preset === p.key ? " on" : "") + '" data-preset="' + p.key + '">' + esc(p.label) + "</button>";
    }).join("");
    var sel = F.nodes.map(function (c) { return cityOf(c); }).join(", ");
    var nodeList = BOOT.nodes.map(function (n) {
      return '<label><input type="checkbox" data-node="' + n.code + '"' + (F.nodes.indexOf(n.code) > -1 ? " checked" : "") + '> <b>' + esc(n.city) + "</b> <small>" + esc(n.code) + " · index " + n.labour_index + " · " + esc(n.dir) + (n.active ? "" : " · inactive") + "</small></label>";
    }).join("");
    return '<div class="rgn-filters">' +
      '<div class="rgn-seg" id="rg-preset">' + chips + "</div>" +
      '<div class="rgn-dates" id="rg-dates"' + (F.preset === "custom" ? "" : " hidden") + '><input type="date" id="rg-from" value="' + esc(F.from || addDays(-29)) + '"><span class="muted">→</span><input type="date" id="rg-to" value="' + esc(F.to || today()) + '"></div>' +
      '<div class="rgn-dd" id="rg-ddnodes"><button class="rgn-dd-btn" id="rg-dnbtn">' + ic("map-pin") + "<b>" + (F.nodes.length ? F.nodes.length + " node" + (F.nodes.length > 1 ? "s" : "") + " · " + esc(sel) : "All 12 nodes") + '</b><span class="muted">▾</span></button>' +
        '<div class="rgn-dd-menu" id="rg-dnmenu" hidden>' + nodeList +
          '<div class="toolbar" style="padding:8px 10px 2px"><button class="btn sm" id="rg-nall">Select all</button><button class="btn sm" id="rg-nnone">Clear</button></div>' +
        "</div></div>" +
      '<div class="rgn-seg" id="rg-sort">' + ["newest", "value"].map(function (s) { return '<button data-sort="' + s + '"' + (LEAD.sort === (s === "value" ? "value" : "created_at") ? ' class="on"' : "") + ">" + s + "</button>"; }).join("") + "</div>" +
      '<div class="toolbar" style="margin-left:auto">' +
        '<button class="btn sm" id="rg-export">' + ic("download") + "Export CSV</button>" +
        '<button class="btn sm" id="rg-refresh">' + ic("refresh-cw") + "Refresh</button>" +
        '<button class="btn pri sm" id="rg-newquote">' + ic("gauge") + "New regional quote</button>" +
      "</div></div>";
  }

  /* ---------------------------------------------------------------- Block 2 */
  function kpiSkeleton() {
    var labels = ["Total volume configurations", "Contract value under review", "Pending milestone approvals", "Ledger health"];
    var icons = ["layers", "briefcase", "shield-check", "receipt"];
    return '<div class="rgn-kpis" id="rg-kpis">' + labels.map(function (l, i) {
      return '<div class="rgn-kpi"><div class="top"><span class="lab">' + esc(l) + '</span><span class="ic">' + ic(icons[i]) + '</span></div><div class="val">—</div><div class="sub muted">Loading…</div><div class="rgn-spark"><canvas></canvas></div></div>';
    }).join("") + "</div>";
  }
  function renderKpis(r) {
    var host = $("#rg-kpis"); if (!host) return;
    LAST = r;
    r.kpi.forEach(function (k, i) {
      var box = host.children[i]; if (!box) return;
      var dl = k.delta || { pct: 0, dir: "flat" };
      box.querySelector(".top .ic").innerHTML = ic(["layers", "briefcase", "shield-check", "receipt"][i]);
      box.querySelector(".val").innerHTML = esc(k.valueLabel || k.value) + ' <span class="dl ' + dl.dir + '">' + (dl.dir === "up" ? "▲ " : dl.dir === "down" ? "▼ " : "· ") + dl.pct + "%</span>";
      box.querySelector(".sub").innerHTML = esc(k.sub);
      box.querySelector(".sub").parentNode.setAttribute("title", k.label + " · " + (r.window ? r.window.label : ""));
      var cv = box.querySelector("canvas");
      if (cv) { cv.__key = k.key; spark(cv, k.series || []); }
    });
  }

  /* ---------------------------------------------------------------- shell */
  function tabBar(r) {
    var counts = {};
    if (r) {
      counts.pipeline = r.totals.projects; counts.configs = r.totals.leads; counts.approvals = r.totals.milestones_pending;
      counts.ledger = r.ledger.length; counts.projects = r.totals.projects;
    }
    return '<div class="rgn-tabs" id="rg-tabs">' + TABS.map(function (t) {
      return '<button data-tab="' + t[0] + '"' + (TAB === t[0] ? ' class="on"' : "") + ">" + esc(t[1]) +
        (counts[t[0]] != null ? '<span class="cnt">' + counts[t[0]] + "</span>" : "") + "</button>";
    }).join("") + "</div>";
  }
  function visibleTab() { return TABS.some(function (t) { return t[0] === TAB; }) ? TAB : "dashboard"; }

  VIEWS.regional = function (el, parts) {
    var want = (parts && parts[0]) || (location.hash.replace(/^#\/?/, "").split("/")[1] || "").split("?")[0];
    if (want && TABS.some(function (t) { return t[0] === want; })) TAB = want;
    killCharts(); DRAW = {};
    el.innerHTML = W.head("Regional operations", "Sales · " + (BOOT ? "nodes live" : "nodes loading"),
      '<span class="badge gold">v' + (BOOT ? BOOT.version : "2.6.0") + "</span>") +
      '<div class="rgn-wrap">' + filterBar() + kpiSkeleton() +
      '<div class="card"><div class="card-b" style="padding-bottom:0">' + tabBar(null) + '</div><div class="rgn-canvas card-b" id="rg-canvas"><div class="empty">Loading…</div></div></div></div>';
    W.fillIcons(el);
    wireFilters(el);
    wireShell(el);
    load(el, true);
  };

  function wireFilters(el) {
    var segs = $("#rg-preset", el); if (segs) segs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-preset]"); if (!b) return;
      F.preset = b.dataset.preset; save("wxRgnPreset", F.preset);
      VIEWS.regional($("#view"), [TAB]);
    });
    var dates = $("#rg-dates", el); if (dates) dates.addEventListener("change", function (e) {
      if (e.target.id === "rg-from") { F.from = e.target.value; save("wxRgnFrom", F.from); }
      if (e.target.id === "rg-to") { F.to = e.target.value; save("wxRgnTo", F.to); }
      F.preset = "custom"; save("wxRgnPreset", "custom"); load($("#view"), true);
    });
    var dd = $("#rg-ddnodes", el);
    if (dd) {
      $("#rg-dnbtn", dd).addEventListener("click", function () { var m = $("#rg-dnmenu", dd); m.hidden = !m.hidden; });
      $("#rg-dnmenu", dd).addEventListener("change", function (e) {
        var cb = e.target.closest("[data-node]"); if (!cb) return;
        var code = cb.dataset.node, i = F.nodes.indexOf(code);
        if (cb.checked && i < 0) F.nodes.push(code);
        if (!cb.checked && i > -1) F.nodes.splice(i, 1);
        save("wxRgnNodes", F.nodes);
        var b = $("#rg-dnbtn b", dd);
        var sel = F.nodes.map(cityOf).join(", ");
        b.textContent = F.nodes.length ? F.nodes.length + " node" + (F.nodes.length > 1 ? "s" : "") + " · " + sel : "All 12 nodes";
        load($("#view"), true);
      });
      dd.addEventListener("click", function (e) {
        if (e.target.id === "rg-nall") { F.nodes = BOOT.nodes.map(function (n) { return n.code; }); save("wxRgnNodes", F.nodes); VIEWS.regional($("#view"), [TAB]); }
        if (e.target.id === "rg-nnone") { F.nodes = []; save("wxRgnNodes", F.nodes); VIEWS.regional($("#view"), [TAB]); }
      });
      document.addEventListener("click", function (e) {
        if (!dd.contains(e.target)) { var m = $("#rg-dnmenu", dd); if (m) m.hidden = true; }
      }, { once: true });
    }
    var sort = $("#rg-sort", el); if (sort) sort.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sort]"); if (!b) return;
      $$("button", sort).forEach(function (x) { x.classList.toggle("on", x === b); });
      LEAD.sort = b.dataset.sort === "value" ? "value" : "created_at"; LEAD.page = 1;
      if (visibleTab() === "configs") drawConfigs($("#rg-canvas"));
    });
  }

  function wireShell(el) {
    var tabs = $("#rg-tabs", el); if (tabs) tabs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      TAB = b.dataset.tab;
      history.replaceState(null, "", "#/regional/" + TAB);
      $$("button", tabs).forEach(function (x) { x.classList.toggle("on", x === b); });
      killCharts(); drawTab($("#rg-canvas"));
    });
    var ex = $("#rg-export", el); if (ex) ex.addEventListener("click", function () {
      var kind = visibleTab() === "ledger" ? "ledger" : visibleTab() === "projects" || visibleTab() === "pipeline" ? "projects" : visibleTab() === "approvals" ? "milestones" : "leads";
      ex.disabled = true;
      api("rgn_export", Object.assign({ kind: kind }, q())).then(function (r) {
        ex.disabled = false;
        if (!r.ok) return W.toast(r.error, true);
        var blob = new Blob(["\ufeff" + r.csv], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = r.filename;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        W.toast("Exported " + r.rows + " rows · " + r.nodes.length + " nodes ✓");
      });
    });
    var rf = $("#rg-refresh", el); if (rf) rf.addEventListener("click", function () { BOOTP = null; BOOT = null; VIEWS.regional($("#view"), [TAB]); });
    var nq = $("#rg-newquote", el); if (nq) nq.addEventListener("click", function () { TAB = "estimator"; history.replaceState(null, "", "#/regional/estimator"); $$("#rg-tabs button").forEach(function (x) { x.classList.toggle("on", x.dataset.tab === "estimator"); }); drawTab($("#rg-canvas")); });
  }

  function load(el, full) {
    boot().then(function () {
      if (!full) return;
      var bar = $(".rgn-filters", el);
      if (bar) { bar.outerHTML = filterBar(); wireFilters(el); W.fillIcons(el); }
      return api("rgn_kpis", Object.assign({}, q(), { stage: F.stage })).then(function (r) {
        if (!r.ok) { $("#rg-canvas").innerHTML = '<div class="empty">' + esc(r.error || "Could not load the regional dashboard") + "</div>"; return; }
        renderKpis(r);
        var tb = $("#rg-tabs", el); if (tb) tb.outerHTML = tabBar(r);
        W.fillIcons(el);
        drawTab($("#rg-canvas"), r);
      }).catch(function () { $("#rg-canvas").innerHTML = '<div class="empty">Network error while loading the node dashboard.</div>'; });
    }).catch(function (r) {
      $("#rg-canvas").innerHTML = '<div class="empty">' + esc((r && r.error) || "Could not load the node registry") + "</div>";
    });
  }

  function drawTab(cv, r) {
    if (!cv) return;
    if (!BOOT) { cv.innerHTML = '<div class="empty">Loading the node registry…</div>'; return; }
    var t = visibleTab();
    if (DRAW[t] && !r) return;
    DRAW[t] = 1;
    cv.innerHTML = '<div class="empty">Loading…</div>';
    if (t === "pipeline" || t === "projects" || t === "approvals" || t === "ledger" || t === "estimator" || t === "rates" || t === "reports" || t === "health") cv = remount(cv);
    if (t === "dashboard") return r ? drawDashboard(cv, r) : load($("#view"), true);
    if (t === "pipeline") return drawPipeline(cv);
    if (t === "configs") return drawConfigs(cv);
    if (t === "projects") return drawProjects(cv);
    if (t === "approvals") return drawApprovals(cv);
    if (t === "ledger") return drawLedger(cv);
    if (t === "estimator") return drawEstimator(cv);
    if (t === "rates") return drawRates(cv);
    if (t === "reports") return drawReports(cv);
    if (t === "health") return drawHealth(cv);
  }

  /* ---------------------------------------------------------------- dashboard */
  function drawDashboard(cv, r) {
    cv = remount(cv);
    var funnel = r.funnel, order = ["new", "contacted", "visit", "quote", "won", "lost"];
    var fmax = 1; order.forEach(function (s) { fmax = Math.max(fmax, funnel[s] ? funnel[s].n : 0); });
    var nodeCards = r.nodes.filter(function (n) { return n.selected; }).map(function (n) {
      var util = Math.min(100, Math.round((n.quote_value + n.lead_value) / 1e6));
      return '<div class="rgn-node sel"><h4>' + esc(n.city) + "</h4><small>" + esc(n.dir) + " · zone " + esc(n.zone) + " · index " + n.index + "</small>" +
        '<div class="row"><span>Leads</span><b>' + n.leads + " · " + pkr(n.lead_value) + "</b></div>" +
        '<div class="row"><span>Quotations</span><b>' + n.quotes + " · " + pkr(n.quote_value) + "</b></div>" +
        '<div class="row"><span>Projects</span><b>' + n.projects + " · " + pkr(n.project_value) + "</b></div>" +
        '<div class="row"><span>Pending approvals</span><b>' + n.pending_ms + "</b></div>" +
        '<div class="rgn-bar" title="share of a PKR 1 Cr pipeline"><i style="width:' + util + '%"></i></div>' +
        '<div class="row"><span class="muted">Waste ' + n.waste_pct + "% · " + n.lead_time_days + '-day lead</span><a class="btn sm" href="/admin/#/regional/pipeline">Open</a></div></div>';
    }).join("");
    cv.innerHTML =
      '<div class="rgn-alerts">' + (r.alerts.length ? r.alerts.map(function (a) {
        return '<div class="rgn-alert ' + a.level + '">' + ic(a.level === "bad" ? "triangle-alert" : a.level === "warn" ? "info" : "circle-check") +
          "<div><b>" + esc(a.text) + '</b><span class="fix">' + esc(a.fix) + '</span></div><a class="btn sm" style="margin-left:auto" href="' + esc(a.route) + '">Open</a></div>';
      }).join("") : '<div class="rgn-alert info">' + ic("circle-check") + "<div><b>No blockers in this window</b><span class=\"fix\">Routing, ledger and milestone queues are clean.</span></div></div>") + "</div>" +

      '<div class="rgn-2col" style="margin-top:20px">' +
        '<div class="card"><div class="card-h"><div><h3>Node output · ' + esc(r.window.label) + '</h3><small class="muted">' + r.nodes_selected.length + " of 12 nodes selected · bucket " + esc(r.window.bucket) + '</small></div><span class="badge gold">' + pkr(r.totals.receivable) + " receivable</span></div>" +
          '<div class="card-b"><div class="rgn-nodes">' + (nodeCards || '<div class="empty">No nodes selected</div>') + "</div></div></div>" +
        '<div class="card"><div class="card-h"><h3>Stage funnel</h3><small class="muted">' + esc(r.window.from) + " → " + esc(r.window.to) + '</small></div><div class="card-b">' +
          order.map(function (s) {
            var f = funnel[s] || { n: 0, value: 0 };
            return '<div class="rgn-node" style="margin-bottom:8px;padding:10px 12px"><div class="row" style="margin:0"><b>' + esc(stageLabel(s)) + '</b><span>' + f.n + " · " + pkr(f.value) + '</span></div><div class="rgn-bar"><i style="width:' + Math.max(2, f.n / fmax * 100) + '%"></i></div></div>';
          }).join("") + "</div></div>" +
      "</div>" +

      '<div class="rgn-2col" style="margin-top:20px">' +
        '<div class="card"><div class="card-h"><h3>Latest leads in the selected nodes</h3><a class="btn sm" href="#/regional/configs">All configs</a></div>' +
          '<div class="rgn-table-wrap" style="border:0;border-radius:0"><table class="rgn-table"><thead><tr><th>Node</th><th>Name</th><th>Service</th><th>Stage</th><th>Locality</th><th class="num">Value</th><th>When</th></tr></thead><tbody>' +
          (r.recent.length ? r.recent.map(function (l) {
            return "<tr data-lead=\"" + l.id + '"><td class="node-c">' + esc(l.node) + "<br><small>" + esc(l.city) + '</small></td><td><b>' + esc(l.name) + "</b><br><small>" + esc(l.service || "—") + '</small></td><td>' + esc(l.service || "—") + '</td><td>' + badge(stageLabel(l.stage), QSTAGE[l.stage] || "") + '</td><td class="muted">' + esc(l.location || "—") + '</td><td class="num">' + pkr(l.value) + '</td><td class="muted">' + ago(l.created_at) + "</td></tr>";
          }).join("") : '<tr><td colspan="7" class="empty">No leads routed in this window.</td></tr>') + "</tbody></table></div></div>" +

        '<div class="card"><div class="card-h"><h3>Priority queue</h3><span class="badge ' + (r.totals.milestones_pending ? 'warn' : 'ok') + '">' + r.totals.milestones_pending + ' approvals</span></div><div class="card-b">' +
          (r.milestones.length ? r.milestones.map(function (m) {
            return '<div class="rgn-node" style="margin-bottom:8px;padding:10px 12px"><div class="row" style="margin:0"><b>' + esc(m.name) + '</b><span class="muted">' + esc(m.node) + '</span></div><small class="muted">' + esc(m.project_title || m.project_code || "") + " · due " + datef(m.due_date) + " · " + pkr(m.amount) + "</small></div>";
          }).join("") : '<div class="empty">No milestone approvals pending.</div>') + "</div></div>" +
      "</div>";
  }

  /* ---------------------------------------------------------------- pipeline (kanban + swimlanes) */
  function drawPipeline(cv) {
    cv = remount(cv);
    api("rgn_projects", Object.assign({}, q(), { stage: "all", status: "all" })).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load projects") + "</div>"; return; }
      var rows = r.rows;
      var stages = (BOOT.stages || []).map(function (s) { return s.code; });
      var zones = ["A", "B", "C", "D"];
      var html = '<div class="rgn-faces"><span class="muted">' + rows.length + " projects across " + r.nodes_selected.length + ' nodes · drag-free kanban grouped by node zone</span>' +
        '<span style="margin-left:auto" class="badge gold">' + pkr(rows.reduce(function (a, p) { return a + (+p.contract_value || 0); }, 0)) + " contract value</span>" +
        '<button class="btn sm" id="rg-pnew">' + ic("plus") + "New project</button></div>";
      zones.forEach(function (z) {
        var inZone = rows.filter(function (p) { return (node(p.node).zone || "A") === z; });
        if (!inZone.length) return;
        html += '<div class="rgn-swim">Zone ' + z + ' <span>· ' + inZone.length + " projects · " + pkr(inZone.reduce(function (a, p) { return a + (+p.contract_value || 0); }, 0)) + "</span></div>" +
          '<div class="rgn-kan">' + stages.map(function (s) {
            var lane = inZone.filter(function (p) { return p.stage === s; });
            var val = lane.reduce(function (a, p) { return a + (+p.contract_value || 0); }, 0);
            return '<div class="rgn-lane"><div class="rgn-lane-h"><span>' + esc(stageLabel(s)) + ' <small>(' + lane.length + ")</small></span><small>" + pkr(val) + '</small></div><div class="rgn-lane-b">' +
              (lane.length ? lane.map(projectCard).join("") : '<div class="muted" style="padding:10px;text-align:center;font-size:12.5px">empty</div>') +
              "</div></div>";
          }).join("") + "</div>";
      });
      if (!rows.length) html += '<div class="empty">No projects in the register for this window. Create one, or import _database/woodex-regions.sql and seed the register.</div>';
      cv.innerHTML = html;
      W.fillIcons(cv);
      $$("[data-proj]", cv).forEach(function (el) { el.addEventListener("click", function () { openProject(+el.dataset.proj); }); });
      var nb = $("#rg-pnew", cv); if (nb) nb.addEventListener("click", function () { newProject(); });
    });
  }
  function projectCard(p) {
    return '<div class="rgn-card" data-proj="' + p.id + '"><b>' + esc(p.title) + "</b><small>" + esc(p.code || ("#" + p.id)) + " · " + esc(p.node) + " " + esc(cityOf(p.node)) + '</small>' +
      '<div class="rgn-bar" title="' + (p.progress || 0) + '% of weighted milestones"><i style="width:' + (p.progress || 0) + '%"></i></div>' +
      '<div class="meta"><span class="amt">' + pkr(p.contract_value) + '</span>' + badge((p.milestones_done || 0) + "/" + (p.milestones_total || 0) + " ms", p.progress >= 100 ? "ok" : "") + "</div>" +
      '<div class="meta"><small class="muted">target ' + datef(p.target_date) + '</small>' + badge(p.status, STATUS[p.status] || "") + "</div></div>";
  }

  /* ---------------------------------------------------------------- volume configs (leads table) */
  function drawConfigs(cv) {
    cv = remount(cv);
    api("rgn_leads", Object.assign({}, q(), { q: LEAD.q, stages: LEAD.stages, priorities: LEAD.priorities, unread: LEAD.unread, sort: LEAD.sort, page: LEAD.page, per: LEAD.per })).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load leads") + "</div>"; return; }
      var fs = r.facets, stageChips = ["new", "contacted", "visit", "quote", "won", "lost"].map(function (s) {
        var on = LEAD.stages.indexOf(s) > -1;
        return '<button class="rgn-chip' + (on ? " on" : "") + '" data-stage="' + s + '">' + esc(stageLabel(s)) + " <b>" + (fs.stages[s] || 0) + "</b></button>";
      }).join("");
      var prioChips = ["high", "normal", "low"].map(function (p) {
        var on = LEAD.priorities.indexOf(p) > -1;
        return '<button class="rgn-chip' + (on ? " on" : "") + '" data-prio="' + p + '">' + esc(p) + " <b>" + (fs.priorities[p] || 0) + "</b></button>";
      }).join("");
      var nodeChips = Object.keys(fs.nodes).map(function (n) { return '<span class="rgn-chip on" title="routed to ' + esc(cityOf(n)) + '">' + esc(n) + " <b>" + fs.nodes[n] + "</b></span>"; }).join("");
      var pages = Math.max(1, Math.ceil(r.total / r.per));
      cv.innerHTML =
        '<div class="rgn-faces"><input type="search" id="rg-lq" placeholder="Search name, phone, email, service, locality…" value="' + esc(LEAD.q) + '">' +
          '<button class="rgn-chip' + (LEAD.unread ? " on" : "") + '" id="rg-unread">unread <b>' + r.rows.filter(function (x) { return !x.is_read; }).length + "</b></button>" + stageChips + prioChips + nodeChips +
          '<span style="margin-left:auto" class="badge gold">' + r.total + " rows · " + pkr(r.sum_value) + "</span></div>" +
        '<div class="rgn-table-wrap"><table class="rgn-table"><thead><tr><th>Lead</th><th>Node</th><th>Stage</th><th>Priority</th><th>Value</th><th>Quote status</th><th>Next action</th><th>Created</th></tr></thead><tbody>' +
        (r.rows.length ? r.rows.map(function (l) {
          return '<tr data-lead="' + l.id + '"><td><b>' + esc(l.name) + "</b><br><small>" + esc(l.phone || l.email || "") + '</small></td><td class="node-c">' + esc(l.node) + "<br><small>" + esc(cityOf(l.node)) + '</small></td><td>' + badge(stageLabel(l.stage), QSTAGE[l.stage] || "") + '</td><td>' + badge(l.priority || "normal", l.priority === "high" ? "bad" : "") + '</td><td class="num">' + pkr(l.value) + '</td><td>' + esc(l.quote_status || "—") + '</td><td>' + (l.next_at ? datef(l.next_at) : '<span class="muted">—</span>') + '</td><td class="muted">' + ago(l.created_at) + "</td></tr>";
        }).join("") : '<tr><td colspan="8" class="empty">No leads match these filters.</td></tr>') + "</tbody></table></div>" +
        '<div class="rgn-pager"><button class="btn sm" id="rg-prev"' + (r.page <= 1 ? " disabled" : "") + ">← Prev</button><span>Page " + r.page + " of " + pages + "</span><button class=\"btn sm\" id=\"rg-next\"" + (r.page >= pages ? " disabled" : "") + ">Next →</button>" +
          '<button class="btn sm" id="rg-openlead">Open in CRM</button></div>';
      W.fillIcons(cv);
      var inp = $("#rg-lq", cv); if (inp) { var t = null; inp.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { LEAD.q = inp.value; LEAD.page = 1; drawConfigs(cv); }, 320); }); }
      cv.addEventListener("click", function (e) {
        var st = e.target.closest("[data-stage]"); if (st) { var s = st.dataset.stage, i = LEAD.stages.indexOf(s); if (i > -1) LEAD.stages.splice(i, 1); else LEAD.stages.push(s); LEAD.page = 1; return drawConfigs(cv); }
        var pr = e.target.closest("[data-prio]"); if (pr) { var p = pr.dataset.prio, j = LEAD.priorities.indexOf(p); if (j > -1) LEAD.priorities.splice(j, 1); else LEAD.priorities.push(p); LEAD.page = 1; return drawConfigs(cv); }
        if (e.target.closest("#rg-unread")) { LEAD.unread = LEAD.unread ? 0 : 1; LEAD.page = 1; return drawConfigs(cv); }
        if (e.target.closest("#rg-prev") && LEAD.page > 1) { LEAD.page--; return drawConfigs(cv); }
        if (e.target.closest("#rg-next")) { LEAD.page++; return drawConfigs(cv); }
        var row = e.target.closest("[data-lead]");
        if (row && e.target.closest("#rg-openlead")) { location.hash = "#/enquiries/" + row.dataset.lead; return; }
        if (row) { location.hash = "#/enquiries/" + row.dataset.lead; }
      });
    });
  }

  /* ---------------------------------------------------------------- projects table */
  function drawProjects(cv) {
    cv = remount(cv);
    api("rgn_projects", Object.assign({}, q(), { stage: F.stage, status: "all" })).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load the project register") + "</div>"; return; }
      var stages = ["all"].concat((BOOT.stages || []).map(function (s) { return s.code; }));
      cv.innerHTML =
        '<div class="rgn-faces"><div class="rgn-seg" id="rg-pstage">' + stages.map(function (s) {
          return '<button data-stage="' + s + '"' + (F.stage === s ? ' class="on"' : "") + ">" + esc(s === "all" ? "All stages" : stageLabel(s)) + "</button>";
        }).join("") + '</div><span class="badge gold" style="margin-left:auto">' + r.rows.length + " projects · " + pkr(r.rows.reduce(function (a, p) { return a + (+p.contract_value || 0); }, 0)) + '</span><button class="btn sm" id="rg-pnew">' + ic("plus") + "New project</button></div>" +
        '<div class="rgn-table-wrap"><table class="rgn-table"><thead><tr><th>Code</th><th>Project</th><th>Node</th><th>Stage</th><th class="num">Contract</th><th>Progress</th><th>Milestones</th><th>Target</th><th>Manager</th></tr></thead><tbody>' +
        (r.rows.length ? r.rows.map(function (p) {
          return '<tr data-proj="' + p.id + '" style="cursor:pointer"><td class="node-c">' + esc(p.code || ("#" + p.id)) + '</td><td><b>' + esc(p.title) + "</b><br><small class=\"muted\">" + esc(p.service_key || "—") + " · " + (p.covered_sqft ? num(p.covered_sqft) + " sq ft" : "—") + '</small></td><td>' + esc(p.node) + "<br><small>" + esc(cityOf(p.node)) + '</small></td><td>' + badge(stageLabel(p.stage), PSTAGE[p.stage] || "") + '</td><td class="num">' + pkr(p.contract_value) + '</td><td><div class="rgn-bar" style="min-width:90px"><i style="width:' + (p.progress || 0) + '%"></i></div><small class="muted">' + (p.progress || 0) + '%</small></td><td>' + (p.milestones_done || 0) + " / " + (p.milestones_total || 0) + '</td><td class="muted">' + datef(p.target_date) + '</td><td>' + (p.manager_id ? "#" + p.manager_id : "—") + "</td></tr>";
        }).join("") : '<tr><td colspan="9" class="empty">No projects in the register yet.</td></tr>') + "</tbody></table></div>";
      W.fillIcons(cv);
      var seg = $("#rg-pstage", cv);
      if (seg) seg.addEventListener("click", function (e) { var b = e.target.closest("[data-stage]"); if (!b) return; F.stage = b.dataset.stage; save("wxRgnStage", F.stage); drawProjects(cv); });
      cv.addEventListener("click", function (e) { var tr = e.target.closest("[data-proj]"); if (tr) openProject(+tr.dataset.proj); });
      var nb = $("#rg-pnew", cv); if (nb) nb.addEventListener("click", function () { newProject(); });
    });
  }

  function drawer(title, body, foot) {
    document.body.insertAdjacentHTML("beforeend",
      '<div class="rgn-backdrop" id="rg-bd"></div>' +
      '<aside class="rgn-drawer open" id="rg-dr"><div class="rgn-drawer-h"><div><h3 style="margin:0">' + esc(title) + '</h3><small class="muted" id="rg-drs">' + esc(foot || "") + "</small></div>" +
      '<button class="btn sm" id="rg-drx">' + ic("x") + "</button></div><div class=\"rgn-drawer-b\">" + body + "</div></aside>");
    var close = function () { var d = $("#rg-dr"); if (d) d.remove(); var b = $("#rg-bd"); if (b) b.remove(); };
    $("#rg-drx").addEventListener("click", close);
    $("#rg-bd").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); }, { once: true });
    W.fillIcons(document.body);
    return { close: close, el: $("#rg-dr") };
  }

  function openProject(id) {
    api("rgn_project_get", { id: id }).then(function (r) {
      if (!r.ok) return W.toast(r.error, true);
      var p = r.project, sp = r.spec || {};
      var ms = (r.milestones || []).map(function (m) {
        return '<div class="rgn-tl-row ' + (m.status === "approved" ? "done" : "") + (m.overdue ? " late" : "") + '"><div class="rgn-tl-dot">' + m.seq + '</div><div><b>' + esc(m.name) + '</b><small>' + esc(m.kind) + " · weight " + m.weight_pct + "% · " + pkr(m.amount) + (m.approved_by ? " · approved by " + esc(m.approved_by) : "") + '</small></div><div>' + badge(m.status, MSTATE[m.status] || "") + '</div><div class="muted">' + datef(m.due_date) + '</div><div class="toolbar">' +
          (m.status === "pending" ? '<button class="btn sm gold" data-ms-ok="' + m.id + '">' + ic("check") + 'Approve</button><button class="btn sm" data-ms-rj="' + m.id + '">Reject</button>' : "") +
          '<button class="btn sm" data-ms-ed="' + m.id + '">' + ic("edit") + "Edit</button></div></div>";
      }).join("");
      var lg = (r.ledger || []).map(function (l) {
        return "<tr><td>" + esc(l.kind) + '</td><td>' + esc(l.party || "—") + '</td><td class="num">' + pkr(l.amount) + '</td><td>' + badge(l.status, LSTATUS[l.status] || "") + '</td><td class="muted">' + datef(l.t) + "</td></tr>";
      }).join("");
      var specRows = "";
      if (sp && sp.node) {
        specRows = '<div class="rgn-recon">' +
          '<div><span>Node</span><b>' + esc(sp.node) + "</b></div><div><span>Board feet (gross)</span><b>" + bf(sp.gross_bf) + " bf</b></div>" +
          '<div><span>Waste tolerance</span><b>' + sp.waste_pct + "%</b></div><div><span>Workshop labour</span><b>" + sp.labour_pct + "% · " + pkr(sp.labour_per_bf) + "/bf</b></div>" +
          '<div><span>Zone · lead time</span><b>' + esc(sp.zone) + " · " + sp.lead_time_days + " days</b></div><div><span>Area</span><b>" + num(sp.area_sqft) + " sq ft</b></div></div>";
      } else specRows = '<div class="empty">No estimator snapshot stored on this project.</div>';
      var d = drawer("Project " + (p.code || "#" + p.id), 
        '<div class="rgn-recon">' +
          "<div><span>Title</span><b>" + esc(p.title) + "</b></div>" +
          "<div><span>Node</span><b>" + esc(p.node) + " · " + esc(cityOf(p.node)) + " · " + esc(r.node ? r.node.dir : "") + "</b></div>" +
          "<div><span>Stage</span><b>" + esc(stageLabel(p.stage)) + "</b></div>" +
          "<div><span>Status</span><b>" + esc(p.status) + "</b></div>" +
          "<div><span>Contract value</span><b>" + pkr(p.contract_value) + "</b></div>" +
          "<div><span>Advance</span><b>" + p.advance_pct + "% · " + pkr((+p.contract_value || 0) * (+p.advance_pct || 0) / 100) + "</b></div>" +
          "<div><span>Layout / category</span><b>" + esc(p.layout_code || "—") + " · " + esc(p.category_code || "—") + "</b></div>" +
          "<div><span>Covered area</span><b>" + num(p.covered_sqft) + " sq ft</b></div>" +
          "<div><span>Run length</span><b>" + (+p.run_length_lm || 0) + " lm</b></div>" +
          "<div><span>Site locality</span><b>" + esc(p.area || "—") + "</b></div>" +
          "<div><span>Start → target</span><b>" + datef(p.start_date) + " → " + datef(p.target_date) + "</b></div>" +
          "<div><span>Handover</span><b>" + datef(p.handover_date) + "</b></div>" +
        "</div>" +
        '<div class="rgn-block"><div class="rgn-block-h"><h4>Estimator snapshot</h4></div><div class="rgn-block-b">' + specRows + "</div></div>" +
        '<div class="rgn-block"><div class="rgn-block-h"><h4>Milestones</h4><button class="btn sm" id="rg-msadd">' + ic("plus") + "Milestone</button></div><div class=\"rgn-block-b\"><div class=\"rgn-tl\">" + (ms || '<div class="empty">No milestones — seed them from the estimator.</div>') + "</div></div></div>" +
        '<div class="rgn-block"><div class="rgn-block-h"><h4>Ledger entries</h4></div><div class="rgn-table-wrap" style="border:0;border-radius:0"><table class="rgn-table"><thead><tr><th>Kind</th><th>Party</th><th class="num">Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>' + (lg || '<tr><td colspan="5" class="empty">Nothing posted yet.</td></tr>') + "</tbody></table></div></div>",
        p.node + " · " + cityOf(p.node) + " · created " + datef(p.created_at));
      d.el.addEventListener("click", function (e) {
        var ok = e.target.closest("[data-ms-ok]"), rj = e.target.closest("[data-ms-rj]"), ed = e.target.closest("[data-ms-ed]");
        if (ok || rj) {
          var id = (ok || rj).dataset[ok ? "msOk" : "msRj"];
          api("rgn_milestone_approve", { id: +id, status: ok ? "approved" : "rejected", post_payment: ok ? 1 : 0, note: "" }).then(function (x) {
            if (!x.ok) return W.toast(x.error, true);
            W.toast("Milestone " + (ok ? "approved" : "rejected") + (x.posted ? " · invoice posted " + pkr(x.posted) : "") + " ✓");
            d.close(); openProject(p.id);
          });
        }
        if (ed) { var mid = +ed.dataset.msEd; var m = (r.milestones || []).filter(function (x) { return x.id === mid; })[0]; milestoneForm(p.id, m, function () { d.close(); openProject(p.id); }); }
        if (e.target.closest("#rg-msadd")) milestoneForm(p.id, null, function () { d.close(); openProject(p.id); });
      });
    });
  }

  function milestoneForm(projectId, m, done) {
    m = m || { seq: 10, name: "", kind: "progress", weight_pct: 10, amount: 0, due_date: addDays(14), note: "" };
    var d = drawer(m.id ? "Edit milestone #" + m.id : "New milestone", 
      '<div class="rgn-form">' +
        '<div class="f w6"><label>Name</label><input id="rg-mname" value="' + esc(m.name) + '"></div>' +
        '<div class="f"><label>Seq</label><input id="rg-mseq" type="number" min="1" value="' + m.seq + '"></div>' +
        '<div class="f"><label>Kind</label><select id="rg-mkind">' + ["progress", "approval", "payment", "handover"].map(function (k) { return '<option' + (m.kind === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Weight %</label><input id="rg-mw" type="number" min="0" max="100" value="' + m.weight_pct + '"></div>' +
        '<div class="f"><label>Amount PKR</label><input id="rg-ma" type="number" min="0" value="' + (m.amount || 0) + '"></div>' +
        '<div class="f"><label>Due date</label><input id="rg-mdue" type="date" value="' + esc((m.due_date || addDays(14)).slice(0, 10)) + '"></div>' +
        '<div class="f w12"><label>Note</label><textarea id="rg-mnote">' + esc(m.note || "") + "</textarea></div>" +
      "</div>", "project #" + projectId);
    d.el.querySelector(".rgn-drawer-f") || d.el.insertAdjacentHTML("beforeend", '<div class="rgn-drawer-f"><button class="btn" id="rg-cancel">Cancel</button><button class="btn pri" id="rg-save">' + ic("save") + "Save</button></div>");
    W.fillIcons(d.el);
    d.el.addEventListener("click", function (e) {
      if (e.target.closest("#rg-cancel")) d.close();
      if (e.target.closest("#rg-save")) {
        var body = { project_id: projectId, id: m.id || 0, seq: +$("#rg-mseq", d.el).value, name: $("#rg-mname", d.el).value,
          kind: $("#rg-mkind", d.el).value, weight_pct: +$("#rg-mw", d.el).value, amount: +$("#rg-ma", d.el).value,
          due_date: $("#rg-mdue", d.el).value, note: $("#rg-mnote", d.el).value };
        if (!body.name) return W.toast("Name is required", true);
        api("rgn_milestone_save", body).then(function (r) { if (!r.ok) return W.toast(r.error, true); W.toast("Milestone saved ✓"); d.close(); done && done(); });
      }
    });
  }

  function newProject() {
    var first = node(F.nodes[0] || "LHR");
    var d = drawer("New project in " + first.city,
      '<div class="rgn-form">' +
        '<div class="f w6"><label>Title</label><input id="rg-ptitle" placeholder="e.g. 1 Kanal house, DHA Phase 6"></div>' +
        '<div class="f"><label>Node</label><select id="rg-pnode">' + BOOT.nodes.map(function (n) { return '<option value="' + n.code + '"' + (n.code === first.code ? " selected" : "") + ">" + esc(n.city) + " (" + n.code + ")</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Locality</label><input id="rg-parea" placeholder="DHA"></div>' +
        '<div class="f"><label>Layout preset</label><select id="rg-playout"><option value="">—</option>' + BOOT.layouts.map(function (l) { return '<option value="' + l.code + '">' + esc(l.label) + " · " + num(l.covered_sqft) + " sq ft</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Category</label><select id="rg-pcat"><option value="">—</option>' + (BOOT.categories || []).map(function (c) { return '<option value="' + c.code + '">' + esc(c.label) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Service</label><select id="rg-pservice">' + Object.keys(BOOT.services).map(function (k) { return '<option value="' + k + '">' + esc(BOOT.services[k]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Finish</label><select id="rg-pfinish">' + ["essential", "standard", "premium"].map(function (f) { return "<option" + (f === "standard" ? " selected" : "") + ">" + f + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Covered area (sq ft)</label><input id="rg-parea2" type="number" min="0" value="2400"></div>' +
        '<div class="f"><label>Contract value PKR</label><input id="rg-pval" type="number" min="0" value="0"></div>' +
        '<div class="f"><label>Advance %</label><input id="rg-padv" type="number" min="0" max="100" value="40"></div>' +
        '<div class="f"><label>Marla</label><input id="rg-pmarla" type="number" min="0" step="0.5" value="10"></div>' +
        '<div class="f"><label>Start</label><input id="rg-pstart" type="date" value="' + today() + '"></div>' +
        '<div class="f"><label>Target</label><input id="rg-ptarget" type="date" value="' + addDays(45) + '"></div>' +
        '<div class="f w12"><label>Specification notes</label><textarea id="rg-pnotes" placeholder="Scope, species, finishes, site constraints"></textarea></div>' +
      "</div>", "stored in wx_region_projects");
    W.fillIcons(d.el);
    d.el.insertAdjacentHTML("beforeend", '<div class="rgn-drawer-f"><button class="btn" id="rg-cancel">Cancel</button><button class="btn pri" id="rg-save">' + ic("save") + "Create project</button></div>");
    d.el.addEventListener("click", function (e) {
      if (e.target.closest("#rg-cancel")) d.close();
      if (!e.target.closest("#rg-save")) return;
      var body = { id: 0, node: $("#rg-pnode", d.el).value, area: $("#rg-parea", d.el).value, title: $("#rg-ptitle", d.el).value,
        layout_code: $("#rg-playout", d.el).value, category_code: $("#rg-pcat", d.el).value, service_key: $("#rg-pservice", d.el).value,
        finish_key: $("#rg-pfinish", d.el).value, covered_sqft: +$("#rg-parea2", d.el).value, contract_value: +$("#rg-pval", d.el).value,
        advance_pct: +$("#rg-padv", d.el).value, marla: +$("#rg-pmarla", d.el).value, stage: "survey", status: "open",
        start_date: $("#rg-pstart", d.el).value, target_date: $("#rg-ptarget", d.el).value, notes: $("#rg-pnotes", d.el).value };
      if (!body.title) return W.toast("Title is required", true);
      api("rgn_project_save", body).then(function (r) { if (!r.ok) return W.toast(r.error, true); W.toast("Project " + r.project.code + " created ✓"); d.close(); drawProjects($("#rg-canvas")); });
    });
  }

  /* ---------------------------------------------------------------- approvals (milestones) */
  function drawApprovals(cv) {
    cv = remount(cv);
    api("rgn_milestones", Object.assign({}, q(), { status: "pending" })).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load milestones") + "</div>"; return; }
      var ms = r.rows, soon = ms.filter(function (m) { return m.due_date && m.due_date <= addDays(3); });
      cv.innerHTML =
        '<div class="rgn-faces"><span class="muted">' + ms.length + ' milestones waiting on the Master approval queue · ' + soon.length + " due within 3 days</span>" +
          '<span style="margin-left:auto" class="badge ' + (soon.length ? "warn" : "ok") + '">' + pkr(ms.reduce(function (a, m) { return a + (+m.amount || 0); }, 0)) + " held value</span></div>" +
        '<div class="rgn-tl">' + (ms.length ? ms.map(function (m) {
          return '<div class="rgn-tl-row' + (m.overdue ? " late" : "") + '"><div class="rgn-tl-dot">' + m.seq + "</div>" +
            "<div><b>" + esc(m.name) + "</b><small>" + esc(m.project_code || ("#" + m.project_id)) + " · " + esc(m.project_title || "") + " · " + esc(m.kind) + "</small></div>" +
            '<div>' + badge(m.node + " · " + cityOf(m.node), "gold") + "</div>" +
            '<div><b>' + pkr(m.amount) + "</b><small>weight " + m.weight_pct + "%</small></div>" +
            '<div class="toolbar"><span class="muted" style="font-size:12.5px">' + datef(m.due_date) + "</span>" +
              '<button class="btn sm gold" data-ok="' + m.id + '">' + ic("check") + 'Approve</button><button class="btn sm" data-rj="' + m.id + '">Reject</button><button class="btn sm" data-ed="' + m.id + '">' + ic("edit") + "</button></div></div>";
        }).join("") : '<div class="empty">The approval queue is empty for these nodes.</div>') + "</div>";
      W.fillIcons(cv);
      cv.addEventListener("click", function (e) {
        var ok = e.target.closest("[data-ok]"), rj = e.target.closest("[data-rj]"), ed = e.target.closest("[data-ed]");
        if (ok || rj) {
          var target = ok || rj, id = +target.dataset[ok ? "ok" : "rj"];
          target.disabled = true;
          api("rgn_milestone_approve", { id: id, status: ok ? "approved" : "rejected", post_payment: ok ? 1 : 0, note: "" }).then(function (x) {
            if (!x.ok) { target.disabled = false; return W.toast(x.error, true); }
            W.toast("Milestone " + (ok ? "approved" : "rejected") + (x.posted ? " · invoice " + pkr(x.posted) : "") + " ✓");
            DRAW = {}; drawApprovals(cv);
          });
        }
        if (ed) {
          var mid = +ed.dataset.ed, m = ms.filter(function (x) { return x.id === mid; })[0];
          milestoneForm(m.project_id, m, function () { DRAW = {}; drawApprovals(cv); });
        }
      });
    });
  }

  /* ---------------------------------------------------------------- ledger */
  function drawLedger(cv) {
    cv = remount(cv);
    var payload = Object.assign({}, q(), { kind: LEDG.kind, status: LEDG.status });
    api("rgn_ledger", payload).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load the node ledger") + "</div>"; return; }
      var rows = r.rows;
      var received = rows.reduce(function (a, l) { return a + (+l.paid || (l.status === "paid" ? l.amount : 0)); }, 0);
      var due = rows.reduce(function (a, l) { return a + (l.balance != null ? +l.balance : Math.max(0, l.amount - (+l.paid || 0))); }, 0);
      var overdue = rows.filter(function (l) { return l.overdue; }).reduce(function (a, l) { return a + (l.balance != null ? +l.balance : +l.amount); }, 0);
      var kinds = ["all", "invoice", "receipt", "po", "labour"];
      cv.innerHTML =
        '<div class="rgn-faces"><div class="rgn-seg" id="rg-lk">' + kinds.map(function (k) { return '<button data-k="' + k + '"' + (LEDG.kind === k ? ' class="on"' : "") + ">" + (k === "all" ? "All kinds" : k) + "</button>"; }).join("") + "</div>" +
          '<div class="rgn-seg" id="rg-ls">' + ["all", "due", "partial", "paid"].map(function (s) { return '<button data-s="' + s + '"' + (LEDG.status === s ? ' class="on"' : "") + ">" + s + "</button>"; }).join("") + "</div>" +
          '<span style="margin-left:auto" class="badge ok">received ' + pkr(received) + '</span><span class="badge warn">receivable ' + pkr(due) + '</span><span class="badge ' + (overdue ? "bad" : "ok") + '">overdue ' + pkr(overdue) + "</span>" +
          '<button class="btn sm" id="rg-lnew">' + ic("plus") + "Post entry</button></div>" +
        '<div class="rgn-table-wrap"><table class="rgn-table"><thead><tr><th>Node</th><th>Kind</th><th>Ref / party</th><th>Project</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (l) {
          var bal = l.balance != null ? +l.balance : Math.max(0, +l.amount - (+l.paid || 0));
          return '<tr class="' + (l.overdue ? "sel" : "") + '"><td class="node-c">' + esc(l.node) + "<br><small>" + esc(cityOf(l.node)) + "</small></td><td>" + esc(l.kind) + '</td><td><b>' + esc(l.party || "—") + "</b><br><small>" + esc(l.ref || "") + '</small></td><td>' + esc(l.project_code || "—") + '</td><td class="num">' + pkr(l.amount) + '</td><td class="num">' + pkr(l.paid || (l.status === "paid" ? l.amount : 0)) + '</td><td class="num">' + pkr(bal) + "</td><td>" + badge(l.overdue ? "overdue" : l.status, l.overdue ? "bad" : (LSTATUS[l.status] || "")) + '</td><td class="muted">' + datef(l.due_date || l.t) + '</td><td><button class="btn sm" data-led="' + l.id + '">' + ic("edit") + "</button></td></tr>";
        }).join("") : '<tr><td colspan="10" class="empty">No ledger entries in this window.</td></tr>') + "</tbody></table></div>";
      W.fillIcons(cv);
      cv.addEventListener("click", function (e) {
        var k = e.target.closest("[data-k]"), s = e.target.closest("[data-s]"), ed = e.target.closest("[data-led]");
        if (k) { LEDG.kind = k.dataset.k; DRAW = {}; return drawLedger(cv); }
        if (s) { LEDG.status = s.dataset.s; DRAW = {}; return drawLedger(cv); }
        if (e.target.closest("#rg-lnew")) return ledgerForm(null, function () { DRAW = {}; drawLedger(cv); });
        if (ed) { var id = +ed.dataset.led, row = rows.filter(function (x) { return x.id === id; })[0]; ledgerForm(row, function () { DRAW = {}; drawLedger(cv); }); }
      });
    });
  }

  function ledgerForm(l, done) {
    l = l || { node: F.nodes[0] || "LHR", kind: "invoice", ref: "", party: "", amount: 0, status: "due", t: today(), due_date: addDays(15), note: "", project_id: 0 };
    var d = drawer(l.id ? "Ledger entry #" + l.id : "Post ledger entry",
      '<div class="rgn-form">' +
        '<div class="f"><label>Node</label><select id="rg-lnode">' + BOOT.nodes.map(function (n) { return '<option value="' + n.code + '"' + (n.code === String(l.node).toUpperCase() ? " selected" : "") + ">" + esc(n.city) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Kind</label><select id="rg-lkind">' + ["invoice", "receipt", "po", "labour"].map(function (k) { return '<option' + (l.kind === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></div>" +
        '<div class="f w6"><label>Party</label><input id="rg-lparty" value="' + esc(l.party || "") + '" placeholder="Client, vendor or workshop"></div>' +
        '<div class="f w4"><label>Reference</label><input id="rg-lref" value="' + esc(l.ref || "") + '" placeholder="WI-10120"></div>' +
        '<div class="f"><label>Amount PKR</label><input id="rg-lamt" type="number" min="0" value="' + (l.amount || 0) + '"></div>' +
        '<div class="f"><label>Status</label><select id="rg-lstatus">' + ["due", "partial", "paid", "cancelled"].map(function (s) { return '<option' + (l.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Project id</label><input id="rg-lproj" type="number" min="0" value="' + (l.project_id || 0) + '"></div>' +
        '<div class="f"><label>Entry date</label><input id="rg-lt" type="date" value="' + esc((l.t || today()).slice(0, 10)) + '"></div>' +
        '<div class="f"><label>Due date</label><input id="rg-ldue" type="date" value="' + esc((l.due_date || addDays(15)).slice(0, 10)) + '"></div>' +
        '<div class="f w12"><label>Note</label><textarea id="rg-lnote">' + esc(l.note || "") + "</textarea></div>" +
      "</div>", "ledger entries are node-scoped");
    W.fillIcons(d.el);
    d.el.insertAdjacentHTML("beforeend", '<div class="rgn-drawer-f"><button class="btn" id="rg-cancel">Cancel</button><button class="btn pri" id="rg-save">' + ic("save") + "Save entry</button></div>");
    d.el.addEventListener("click", function (e) {
      if (e.target.closest("#rg-cancel")) d.close();
      if (!e.target.closest("#rg-save")) return;
      var body = { id: l.id || 0, node: $("#rg-lnode", d.el).value, kind: $("#rg-lkind", d.el).value, party: $("#rg-lparty", d.el).value,
        ref: $("#rg-lref", d.el).value, amount: +$("#rg-lamt", d.el).value, status: $("#rg-lstatus", d.el).value,
        project_id: +$("#rg-lproj", d.el).value, t: $("#rg-lt", d.el).value, due_date: $("#rg-ldue", d.el).value, note: $("#rg-lnote", d.el).value };
      if (!body.amount) return W.toast("Amount must be greater than zero", true);
      api("rgn_ledger_save", body).then(function (r) { if (!r.ok) return W.toast(r.error, true); W.toast("Ledger entry saved ✓"); d.close(); done && done(); });
    });
  }

  /* ---------------------------------------------------------------- health */
  function drawHealth(cv) {
    cv = remount(cv);
    api("rgn_health", {}).then(function (r) {
      if (!r.ok && !r.checks) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not run the node audit") + "</div>"; return; }
      var groups = {};
      r.checks.forEach(function (c) { (groups[c.group] = groups[c.group] || []).push(c); });
      cv.innerHTML =
        '<div class="rgn-score"><div class="ring" style="--p:' + r.score + '"><span>' + r.score + '%</span></div><div><b style="font-size:16px">Routing, registry and rate-book audit</b><br><small class="muted">' + r.checks.length + " checks · " + r.checks.filter(function (c) { return c.ok; }).length + " passing · generated " + esc(r.generated_at) + '</small><div class="toolbar" style="margin-top:10px"><button class="btn sm" id="rg-hsync">' + ic("refresh-cw") + "Sync rate cards</button><a class=\"btn sm\" href=\"/api/admin.php\" target=\"_blank\" rel=\"noopener\">" + ic("external-link") + "API endpoint</a></div></div></div>" +
        Object.keys(groups).map(function (g) {
          return '<div class="rgn-swim">' + esc(g) + " <span>· " + groups[g].length + " checks</span></div><div class=\"rgn-health\">" + groups[g].map(function (c) {
            return '<div class="rgn-hrow' + (c.ok ? "" : " bad") + '">' + ic(c.ok ? "circle-check" : "triangle-alert") + "<div><b>" + esc(c.name) + "</b><small>" + esc(c.detail) + (c.ok ? "" : "<br><em>" + esc(c.fix) + "</em>") + "</small></div></div>";
          }).join("") + "</div>";
        }).join("");
      W.fillIcons(cv);
      var s = $("#rg-hsync", cv);
      if (s) s.addEventListener("click", function () {
        s.disabled = true;
        api("rgn_rate_sync", {}).then(function (x) { s.disabled = false; if (!x.ok) return W.toast(x.error, true); W.toast(x.rows + " rate-card rows synced ✓"); DRAW = {}; drawHealth(cv); });
      });
    });
  }

  /* ---------------------------------------------------------------- reports */
  function drawReports(cv) {
    cv = remount(cv);
    api("rgn_reports", { months: 12, nodes: F.nodes }).then(function (r) {
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not build the monthly report") + "</div>"; return; }
      var m = r.matrix;
      cv.innerHTML =
        '<div class="rgn-2col">' +
          '<div class="card"><div class="card-h"><div><h3>Monthly performance matrix</h3><small class="muted">leads, quotations, contract value, receipts per month</small></div><span class="badge gold">' + r.months + " months</span></div>" +
            '<div class="rgn-table-wrap" style="border:0;border-radius:0"><table class="rgn-table"><thead><tr><th>Month</th><th class="num">Leads</th><th class="num">Lead value</th><th class="num">Quotes</th><th class="num">Quote value</th><th class="num">Won</th><th class="num">Projects</th><th class="num">Contract</th><th class="num">Received</th><th class="num">Overdue</th></tr></thead><tbody>' +
            m.map(function (x) {
              return "<tr><td><b>" + esc(x.label) + "</b></td><td class=\"num\">" + x.leads + '</td><td class="num">' + pkr(x.lead_value) + '</td><td class="num">' + x.quotes + '</td><td class="num">' + pkr(x.quote_value) + '</td><td class="num">' + x.won + '</td><td class="num">' + x.projects + '</td><td class="num">' + pkr(x.contract_value) + '</td><td class="num">' + pkr(x.received) + '</td><td class="num"' + (x.overdue ? ' style="color:var(--bad)"' : "") + ">" + pkr(x.overdue) + "</td></tr>";
            }).join("") + "</tbody></table></div></div>" +
          '<div class="card"><div class="card-h"><h3>Ranking by quotation value</h3><button class="btn sm" id="rg-rex">' + ic("download") + "CSV</button></div><div class=\"card-b\">" +
            (r.nodes.length ? r.nodes.map(function (n, i) {
              return '<div class="rgn-node" style="margin-bottom:8px;padding:10px 12px"><div class="row" style="margin:0"><b>' + (i + 1) + ". " + esc(n.city) + ' <small class="muted">' + esc(n.code) + '</small></b><span>' + pkr(n.quote_value) + '</span></div><div class="row"><span class="muted">' + n.leads + " leads · " + n.quotes + " quotes · " + n.projects + " projects</span><span>win " + n.win_rate + '%</span></div><div class="rgn-bar"><i style="width:' + Math.min(100, Math.max(2, n.quote_value / Math.max(1, r.nodes[0].quote_value) * 100)) + '%"></i></div></div>';
            }).join("") : '<div class="empty">No activity in the last 12 months.</div>') +
          "</div></div></div>" +
        '<div class="rgn-faces" style="margin-top:16px"><span class="muted">Best node ' + (r.best ? esc(r.best.city) : "—") + " · weakest " + (r.worst ? esc(r.worst.city) : "—") + " · total contract value " + pkr(r.totals.contract_value) + "</span></div>";
      W.fillIcons(cv);
      var ex = $("#rg-rex", cv);
      if (ex) ex.addEventListener("click", function () { $("#rg-export").click(); });
    });
  }

  /* ---------------------------------------------------------------- estimator */
  function estDefaults() {
    var first = node(F.nodes[0] || "LHR");
    return {
      node: first.code, service_key: "furniture", finish_key: "standard", layout_code: "",
      area_sqft: 2400, waste_pct: "", labour_pct: "", taxPct: "", advance_pct: "", discount: 0,
      plan_height_mm: 0,
      panels: [
        { label: "Wardrobe shutters 18 mm", qty: 4, t_mm: 18, w_mm: 600, len_mm: 2400, species_code: "walnut-us-fas", core_code: "18-veneer", coating_code: "matte-pu-12", faces: 2 },
        { label: "Wardrobe carcass sides", qty: 4, t_mm: 18, w_mm: 600, len_mm: 2400, species_code: "walnut-us-fas", core_code: "18-ply", coating_code: "melamine-clear", faces: 1 },
        { label: "Kitchen base shutters 25 mm", qty: 6, t_mm: 25, w_mm: 450, len_mm: 720, species_code: "teak-mm-a", core_code: "25-solid-hd", coating_code: "satin-pu-30", faces: 2 },
        { label: "Vanity drawer fronts 20 mm", qty: 4, t_mm: 20, w_mm: 500, len_mm: 300, species_code: "ash-white", core_code: "20-solid-strip", coating_code: "hardwax-oil", faces: 2 }
      ],
      runs: [
        { label: "Kitchen counter run", qty: 1, len_mm: 3000, h_mm: 720, d_mm: 600, species_code: "teak-mm-a" },
        { label: "Wardrobe run (3 bays)", qty: 1, len_mm: 3600, h_mm: 2400, d_mm: 600, species_code: "walnut-us-fas" }
      ],
      hardware: [
        { code: "hw-softclose-set", qty: 12 },
        { code: "hw-drawer-tandem", qty: 6 },
        { code: "hw-handle-gola", qty: 24 }
      ],
      meta: { name: "", phone: "", email: "", company: "", project: "", site: "", site_city: "", lead_id: "", client_id: "", terms: "", create_project: true, area_code: "", category_code: "", notes: "" }
    };
  }
  function estPayload() {
    var p = EST; return {
      node: p.node, service_key: p.service_key, finish_key: p.finish_key, layout_code: p.layout_code,
      area_sqft: +p.area_sqft || 0, waste_pct: p.waste_pct, labour_pct: p.labour_pct, taxPct: p.taxPct,
      advance_pct: p.advance_pct, discount: +p.discount || 0, plan_height_mm: +p.plan_height_mm || 0,
      panels: p.panels, runs: p.runs, hardware: p.hardware
    };
  }
  function drawEstimator(cv) {
    cv = remount(cv);
    if (!EST) EST = estDefaults();
    var n = node(EST.node);
    cv.innerHTML =
      '<div class="rgn-block"><div class="rgn-block-h"><h4>Regional binding</h4><span class="badge gold">' + esc(n.city) + " · index " + n.labour_index + " · zone " + esc(n.zone) + " · waste " + n.waste_pct + "% · " + n.lead_time_days + "-day lead</span></div><div class=\"rgn-block-b\">" +
        '<div class="rgn-form">' +
          '<div class="f"><label>Operation node</label><select id="rg-enode">' + BOOT.nodes.filter(function (x) { return x.active; }).map(function (x) { return '<option value="' + x.code + '"' + (x.code === EST.node ? " selected" : "") + ">" + esc(x.city) + " · " + x.code + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Service (/estimator)</label><select id="rg-eservice">' + Object.keys(BOOT.services).map(function (k) { return '<option value="' + k + '"' + (k === EST.service_key ? " selected" : "") + ">" + esc(BOOT.services[k]) + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Finish level</label><select id="rg-efinish">' + ["essential", "standard", "premium"].map(function (k) { return '<option' + (k === EST.finish_key ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Layout preset (/builder)</label><select id="rg-elayout"><option value="">— manual area —</option>' + BOOT.layouts.map(function (l) { return '<option value="' + l.code + '"' + (l.code === EST.layout_code ? " selected" : "") + ">" + esc(l.label) + " · " + num(l.covered_sqft) + " sq ft</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Covered area (sq ft)</label><input id="rg-earea" type="number" min="1" value="' + EST.area_sqft + '"></div>' +
          '<div class="f"><label>Waste tolerance %</label><input id="rg-ewaste" type="number" min="0" max="30" placeholder="' + n.waste_pct + '" value="' + EST.waste_pct + '"></div>' +
          '<div class="f"><label>Workshop labour %</label><input id="rg-elabour" type="number" min="0" max="60" placeholder="' + (22 * n.labour_index).toFixed(1) + '" value="' + EST.labour_pct + '"></div>' +
          '<div class="f"><label>GST %</label><input id="rg-etax" type="number" min="0" max="30" placeholder="' + n.tax_pct + '" value="' + EST.taxPct + '"></div>' +
          '<div class="f"><label>Advance %</label><input id="rg-eadv" type="number" min="0" max="100" placeholder="' + n.advance_pct + '" value="' + EST.advance_pct + '"></div>' +
          '<div class="f"><label>Discount PKR</label><input id="rg-edisc" type="number" min="0" value="' + EST.discount + '"></div>' +
          '<div class="f w4"><label>Plan wall height (mm)</label><input id="rg-eheight" type="number" min="0" value="' + EST.plan_height_mm + '"></div>' +
        "</div></div></div>" +

      '<div class="rgn-block"><div class="rgn-block-h"><h4>Solid timber panels → board feet</h4><button class="btn sm" id="rg-addpanel">' + ic("plus") + 'Panel</button></div><div class="rgn-block-b">' +
        '<div class="rgn-line head"><span>Label</span><span>Qty</span><span>t mm</span><span>w mm</span><span>len mm</span><span>Species</span><span></span></div>' +
        '<div id="rg-panels"></div>' +
        '<div class="rgn-recon" id="rg-panelbf"></div>' +
      "</div></div>" +

      '<div class="rgn-block"><div class="rgn-block-h"><h4>Millwork runs → running feet</h4><button class="btn sm" id="rg-addrun">' + ic("plus") + 'Run</button></div><div class="rgn-block-b"><div id="rg-runs"></div></div></div>' +

      '<div class="rgn-block"><div class="rgn-block-h"><h4>Hardware kits</h4></div><div class="rgn-block-b"><div id="rg-hw"></div><div class="rgn-picks" id="rg-hwpicks">' +
        BOOT.hardware_kits.map(function (h) { return '<button class="rgn-pick" data-hw="' + h.code + '" title="' + esc(h.per) + '">+ ' + esc(h.label) + " · " + pkr(h.rate) + "</button>"; }).join("") + "</div></div></div>" +

      '<div class="rgn-2col wide" style="margin-top:18px">' +
        '<div class="rgn-block"><div class="rgn-block-h"><h4>Automated quotation line items</h4><span class="badge" id="rg-esrc">live</span></div><div class="rgn-block-b" id="rg-elines"><div class="empty">Calculating…</div></div></div>' +
        '<div class="rgn-block"><div class="rgn-block-h"><h4>Reconciliation</h4></div><div class="rgn-block-b"><div class="rgn-recon" id="rg-erecon"><div class="empty">—</div></div>' +
          '<div class="toolbar" style="margin-top:12px"><button class="btn pri" id="rg-erecalc">' + ic("refresh-cw") + 'Recalculate</button><button class="btn gold" id="rg-equote">' + ic("file-text") + "Create quotation</button></div>" +
          '<div id="rg-equoteform" hidden style="margin-top:12px"></div>' +
        "</div></div>" +
      "</div>";
    W.fillIcons(cv);
    panelRows(cv); runRows(cv); hwRows(cv);
    recalc(cv);
    cv.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "rg-enode") { EST.node = t.value; return drawEstimator(cv); }
      if (t.id === "rg-eservice") { EST.service_key = t.value; return recalc(cv); }
      if (t.id === "rg-efinish") { EST.finish_key = t.value; return recalc(cv); }
      if (t.id === "rg-elayout") {
        EST.layout_code = t.value;
        var l = BOOT.layouts.filter(function (x) { return x.code === EST.layout_code; })[0];
        if (l) { EST.area_sqft = l.covered_sqft; EST.service_key = l.default_service === "turnkey" ? "turnkey-design-build" : (BOOT.services[l.default_service] ? l.default_service : EST.service_key); if (l.default_finish) EST.finish_key = l.default_finish; }
        return drawEstimator(cv);
      }
      if (["rg-earea", "rg-ewaste", "rg-elabour", "rg-etax", "rg-eadv", "rg-edisc", "rg-eheight"].indexOf(t.id) > -1) {
        EST.area_sqft = $("#rg-earea", cv).value; EST.waste_pct = $("#rg-ewaste", cv).value; EST.labour_pct = $("#rg-elabour", cv).value;
        EST.taxPct = $("#rg-etax", cv).value; EST.advance_pct = $("#rg-eadv", cv).value; EST.discount = $("#rg-edisc", cv).value; EST.plan_height_mm = $("#rg-eheight", cv).value;
        return recalc(cv);
      }
      var p = t.closest("[data-prow]"); if (p) { var pi = +p.dataset.prow, pk = t.dataset.k; EST.panels[pi][pk] = pk === "species_code" || pk === "core_code" || pk === "coating_code" || pk === "label" ? t.value : +t.value; return recalc(cv); }
      var r = t.closest("[data-rrow]"); if (r) { var ri = +r.dataset.rrow, rk = t.dataset.k; EST.runs[ri][rk] = rk === "species_code" || rk === "label" ? t.value : +t.value; return recalc(cv); }
      var h = t.closest("[data-hrow]"); if (h) { EST.hardware[+h.dataset.hrow].qty = +t.value; return recalc(cv); }
    });
    cv.addEventListener("click", function (e) {
      var dp = e.target.closest("[data-pdel]"), dr = e.target.closest("[data-rdel]"), dh = e.target.closest("[data-hdel]");
      if (dp) { EST.panels.splice(+dp.dataset.pdel, 1); return drawEstimator(cv); }
      if (dr) { EST.runs.splice(+dr.dataset.rdel, 1); return drawEstimator(cv); }
      if (dh) { EST.hardware.splice(+dh.dataset.hdel, 1); return drawEstimator(cv); }
      if (e.target.closest("#rg-addpanel")) { EST.panels.push({ label: "New panel", qty: 1, t_mm: 18, w_mm: 600, len_mm: 1200, species_code: "walnut-us-fas", core_code: "18-veneer", coating_code: "matte-pu-12", faces: 2 }); return drawEstimator(cv); }
      if (e.target.closest("#rg-addrun")) { EST.runs.push({ label: "New run", qty: 1, len_mm: 2400, h_mm: 720, d_mm: 560, species_code: "walnut-us-fas" }); return drawEstimator(cv); }
      var hp = e.target.closest("[data-hw]");
      if (hp) { EST.hardware.push({ code: hp.dataset.hw, qty: 1 }); return drawEstimator(cv); }
      if (e.target.closest("#rg-erecalc")) return recalc(cv);
      if (e.target.closest("#rg-equote")) return quoteForm(cv);
    });
  }
  function panelRows(cv) {
    var host = $("#rg-panels", cv); if (!host) return;
    host.innerHTML = EST.panels.map(function (p, i) {
      return '<div class="rgn-line" data-prow="' + i + '">' +
        '<input data-k="label" value="' + esc(p.label) + '">' +
        '<input data-k="qty" type="number" min="1" step="1" value="' + p.qty + '">' +
        '<input data-k="t_mm" type="number" min="1" value="' + p.t_mm + '">' +
        '<input data-k="w_mm" type="number" min="1" value="' + p.w_mm + '">' +
        '<input data-k="len_mm" type="number" min="1" value="' + p.len_mm + '">' +
        '<select data-k="species_code">' + BOOT.species.map(function (s) { return '<option value="' + s.code + '"' + (s.code === p.species_code ? " selected" : "") + ">" + esc(s.label) + " · " + pkr(s.rate_bf) + "/bf</option>"; }).join("") + "</select>" +
        '<button class="rgn-x" data-pdel="' + i + '" title="Remove">✕</button>' +
      "</div>";
    }).join("");
  }
  function runRows(cv) {
    var host = $("#rg-runs", cv); if (!host) return;
    host.innerHTML = '<div class="rgn-line head"><span>Label</span><span>Qty</span><span>Length mm</span><span>Height mm</span><span>Depth mm</span><span>Species</span><span></span></div>' +
      EST.runs.map(function (r, i) {
        return '<div class="rgn-line" data-rrow="' + i + '">' +
          '<input data-k="label" value="' + esc(r.label) + '">' +
          '<input data-k="qty" type="number" min="1" step="1" value="' + r.qty + '">' +
          '<input data-k="len_mm" type="number" min="1" value="' + r.len_mm + '">' +
          '<input data-k="h_mm" type="number" min="1" value="' + r.h_mm + '">' +
          '<input data-k="d_mm" type="number" min="1" value="' + r.d_mm + '">' +
          '<select data-k="species_code">' + BOOT.species.map(function (s) { return '<option value="' + s.code + '"' + (s.code === r.species_code ? " selected" : "") + ">" + esc(s.label) + "</option>"; }).join("") + "</select>" +
          '<button class="rgn-x" data-rdel="' + i + '" title="Remove">✕</button></div>';
      }).join("");
  }
  function hwRows(cv) {
    var host = $("#rg-hw", cv); if (!host) return;
    host.innerHTML = EST.hardware.length ? '<div class="rgn-line head"><span>Kit</span><span>Qty</span><span>Rate</span><span></span><span></span><span></span><span></span></div>' +
      EST.hardware.map(function (h, i) {
        var kit = BOOT.hardware_kits.filter(function (k) { return k.code === h.code; })[0] || { label: h.code, rate: 0, unit: "nos" };
        return '<div class="rgn-line" data-hrow="' + i + '"><input value="' + esc(kit.label) + '" disabled><input data-k="qty" type="number" min="0" value="' + h.qty + '"><input value="' + pkr(kit.rate) + '" disabled><span></span><span></span><span></span><button class="rgn-x" data-hdel="' + i + '">✕</button></div>';
      }).join("") : '<div class="muted" style="font-size:12.5px">No hardware added yet — use the kits below.</div>';
  }
  var RCALC = null, RTIMER = null;
  function recalc(cv) {
    clearTimeout(RTIMER);
    RTIMER = setTimeout(function () {
      api("rgn_estimate", estPayload()).then(function (r) {
        if (!r.ok) { $("#rg-elines", cv).innerHTML = '<div class="empty">' + esc(r.error || "Calculation failed") + "</div>"; return; }
        RCALC = r;
        var lines = "", sec = "";
        r.lines.forEach(function (l) {
          if (l.section !== sec) { sec = l.section; lines += '<tr class="sec"><td colspan="6">' + esc(sec) + "</td></tr>"; }
          lines += "<tr><td><code>" + esc(l.code) + "</code></td><td>" + esc(l.desc) + '<br><span class="basis">' + esc(l.basis ? l.basis.formula : "") + "</span></td>" +
            "<td>" + esc(l.unit) + '</td><td class="num">' + bf(l.qty) + '</td><td class="num">' + pkr(l.rate) + '</td><td class="num">' + pkr(l.amount) + "</td></tr>";
        });
        $("#rg-elines", cv).innerHTML = '<table class="rgn-lines"><thead><tr><th>Code</th><th>Description &amp; formula</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>' + lines + "</tbody></table>";
        var k = r.recon;
        $("#rg-erecon", cv).innerHTML =
          "<div><span>Net board feet</span><b>" + bf(k.net_bf) + " bf</b></div>" +
          "<div><span>Waste tolerance</span><b>" + k.waste_pct + "% · " + bf(k.waste_bf) + " bf</b></div>" +
          "<div><span>Gross board feet</span><b>" + bf(k.gross_bf) + " bf</b></div>" +
          "<div><span>Average timber rate</span><b>" + pkr(k.avg_rate_bf) + "/bf</b></div>" +
          "<div><span>Timber material</span><b>" + pkr(k.material) + "</b></div>" +
          "<div><span>Waste cost</span><b>" + pkr(k.waste_cost) + "</b></div>" +
          "<div><span>Surface coating</span><b>" + bf(k.coating_sqft) + " sq ft · " + pkr(k.coating) + "</b></div>" +
          "<div><span>Workshop labour</span><b>" + k.labour_pct + "% · " + pkr(k.labour) + "</b></div>" +
          "<div><span>Fabrication rate</span><b>" + pkr(k.labour_per_bf) + "/bf</b></div>" +
          "<div><span>Machine time</span><b>" + pkr(k.machine) + "</b></div>" +
          "<div><span>Site fitting</span><b>" + pkr(k.site) + "</b></div>" +
          "<div><span>Hardware</span><b>" + pkr(k.hardware) + "</b></div>" +
          "<div><span>Service scope</span><b>" + pkr(k.service) + "</b></div>" +
          "<div><span>Transport zone " + esc(k.zone) + "</span><b>" + pkr(k.transport) + "</b></div>" +
          "<div><span>Discount</span><b>" + pkr(k.discount) + "</b></div>" +
          "<div><span>GST " + k.tax_pct + "%</span><b>" + pkr(k.tax) + "</b></div>" +
          '<div class="total"><span>Total</span><b>' + pkr(k.total) + "</b></div>" +
          '<div class="total"><span>Advance ' + k.advance_pct + '%</span><b>' + pkr(k.advance) + "</b></div>" +
          "<div><span>Balance on completion</span><b>" + pkr(k.balance) + "</b></div>";
        var bfHost = $("#rg-panelbf", cv);
        if (bfHost) bfHost.innerHTML =
          "<div><span>Panel rows</span><b>" + r.panels.length + "</b></div>" +
          "<div><span>Net board feet</span><b>" + bf(k.net_bf) + " bf</b></div>" +
          "<div><span>Gross after waste</span><b>" + bf(k.gross_bf) + " bf</b></div>" +
          "<div><span>Coating surface</span><b>" + bf(k.coating_sqft) + " sq ft</b></div>";
        var src = $("#rg-esrc", cv); if (src) { src.textContent = r.rate.source === "db" ? "rate card · db" : "rate card · template"; src.className = "badge " + (r.rate.source === "db" ? "ok" : "warn"); }
      });
    }, 240);
  }
  function quoteForm(cv) {
    var host = $("#rg-equoteform", cv); if (!host) return;
    host.hidden = false;
    host.innerHTML = '<div class="rgn-form" style="border-top:1px dashed var(--line);padding-top:14px">' +
      '<div class="f w6"><label>Client name</label><input id="rg-qname" placeholder="Required"></div>' +
      '<div class="f w6"><label>Phone</label><input id="rg-qphone" placeholder="+92 3xx xxxxxxx"></div>' +
      '<div class="f w6"><label>Email</label><input id="rg-qemail"></div>' +
      '<div class="f w6"><label>Company</label><input id="rg-qcompany"></div>' +
      '<div class="f w6"><label>Project</label><input id="rg-qproject" placeholder="e.g. 1 Kanal house interior"></div>' +
      '<div class="f w6"><label>Site address</label><input id="rg-qsite"></div>' +
      '<div class="f"><label>Locality code</label><input id="rg-qarea" placeholder="DHA"></div>' +
      '<div class="f"><label>Lead id</label><input id="rg-qlead" type="number" min="0"></div>' +
      '<div class="f"><label>Client id</label><input id="rg-qclient" type="number" min="0"></div>' +
      '<div class="f"><label>Category</label><select id="rg-qcat"><option value="">—</option>' + (BOOT.categories || []).map(function (c) { return '<option value="' + c.code + '">' + esc(c.label) + "</option>"; }).join("") + "</select></div>" +
      '<div class="f w12"><label>Terms</label><textarea id="rg-qterms" placeholder="Defaults to the Woodex 50 / 40 / 10 schedule"></textarea></div>' +
      '<div class="f w12"><label><input type="checkbox" id="rg-qproj" checked style="width:auto;height:auto"> also create the node project + weighted milestone plan</label></div>' +
      "</div>" +
      '<div class="toolbar" style="margin-top:12px"><button class="btn pri" id="rg-qsave">' + ic("save") + 'Create quotation</button><a class="btn" id="rg-qcancel">Cancel</a></div>' +
      '<div id="rg-qout" style="margin-top:12px"></div>';
    W.fillIcons(host);
    host.addEventListener("click", function (e) {
      if (e.target.closest("#rg-qcancel")) { host.hidden = true; return; }
      if (!e.target.closest("#rg-qsave")) return;
      var body = Object.assign(estPayload(), {
        name: $("#rg-qname", host).value, phone: $("#rg-qphone", host).value, email: $("#rg-qemail", host).value,
        company: $("#rg-qcompany", host).value, project: $("#rg-qproject", host).value, site: $("#rg-qsite", host).value,
        area_code: $("#rg-qarea", host).value, lead_id: +$("#rg-qlead", host).value || 0, client_id: +$("#rg-qclient", host).value || 0,
        category_code: $("#rg-qcat", host).value, terms: $("#rg-qterms", host).value, create_project: $("#rg-qproj", host).checked ? 1 : 0
      });
      if (!body.name) return W.toast("Client name is required", true);
      var btn = $("#rg-qsave", host); btn.disabled = true;
      api("rgn_quote", body).then(function (r) {
        btn.disabled = false;
        if (!r.ok) return W.toast(r.error, true);
        $("#rg-qout", host).innerHTML = '<div class="rgn-alert info">' + ic("circle-check") + "<div><b>Quotation " + esc(r.quote.no) + " created · " + pkr(r.quote.total) + " · node " + esc(r.calc.node) +
          '</b><span class="fix">' + (r.project ? "Project " + esc(r.project.code) + " created with " + r.milestones + " milestones." : "No project register entry was requested.") + " Open it under Quotes → " + esc(r.quote.no) + ".</span></div>" +
          '<a class="btn sm" style="margin-left:auto" href="#/quotes/' + r.quote.id + '">Open quotation</a></div>';
        W.fillIcons(host);
        W.toast("Quotation " + r.quote.no + " created ✓");
      });
    });
  }

  /* ---------------------------------------------------------------- rate cards + variants */
  function drawRates(cv) {
    cv = remount(cv);
    var code = (F.nodes[0] || (BOOT.nodes[0] && BOOT.nodes[0].code) || "LHR");
    Promise.all([api("rgn_rates", { node: code }), api("rgn_variants", { node: code })]).then(function (both) {
      var r = both[0], vr = both[1] || { overrides: [] };
      if (!r.ok) { cv.innerHTML = '<div class="empty">' + esc(r.error || "Could not load the rate book") + "</div>"; return; }
      var n = r.node, byService = {};
      r.rows.forEach(function (x) { (byService[x.service_key] = byService[x.service_key] || []).push(x); });
      cv.innerHTML =
        '<div class="rgn-faces"><div class="rgn-seg" id="rg-rnode">' + BOOT.nodes.map(function (x) { return '<button data-node="' + x.code + '"' + (x.code === code ? ' class="on"' : "") + ">" + esc(x.city) + "</button>"; }).join("") + "</div>" +
          '<span class="badge gold">index ' + n.index + " · waste " + n.waste_pct + "% · zone " + esc(n.zone) + " · GST " + n.tax_pct + "%</span>" +
          '<span class="badge ' + (r.source === "database" ? "ok" : "warn") + '">' + esc(r.source) + "</span>" +
          '<div class="toolbar" style="margin-left:auto"><button class="btn sm" id="rg-sync">' + ic("refresh-cw") + 'Sync from estimator</button><a class="btn sm" href="/estimator/" target="_blank" rel="noopener">' + ic("external-link") + "Open /estimator</a></div></div>" +
        '<div class="rgn-table-wrap"><table class="rgn-table"><thead><tr><th>Service (/estimator key)</th><th>Finish</th><th>Unit</th><th class="num">Base rate PKR</th><th class="num">Labour %</th><th class="num">Waste %</th><th>Stored</th><th></th></tr></thead><tbody>' +
        Object.keys(byService).map(function (sk) {
          return byService[sk].map(function (x, i) {
            return '<tr data-rate="' + esc(x.service_key) + '" data-finish="' + esc(x.finish_key) + '">' +
              "<td>" + (i === 0 ? "<b>" + esc(x.service) + '</b><br><small class="muted">' + esc(x.service_key) + "</small>" : "") + "</td>" +
              "<td>" + badge(x.finish_key, x.finish_key === "premium" ? "gold" : "") + "</td>" +
              "<td>" + esc(x.unit) + "</td>" +
              '<td class="num"><input data-k="base_rate" type="number" min="0" step="10" value="' + x.base_rate + '" style="width:120px;text-align:right"></td>' +
              '<td class="num"><input data-k="labour_pct" type="number" min="0" max="60" step="0.5" value="' + x.labour_pct + '" style="width:90px;text-align:right"></td>' +
              '<td class="num"><input data-k="waste_pct" type="number" min="0" max="30" step="0.5" value="' + x.waste_pct + '" style="width:90px;text-align:right"></td>' +
              "<td>" + (x.stored ? badge("db", "ok") : badge("template", "warn")) + "</td>" +
              '<td><button class="btn sm" data-save>Em!</button></td></tr>';
          }).join("");
        }).join("") + "</tbody></table></div>" +
        '<div class="rgn-block" style="margin-top:18px"><div class="rgn-block-h"><h4>Timber variant overrides for ' + esc(node(code).city) + "</h4><span class=\"muted\" style=\"font-size:12.5px\">a stored override replaces the template rate book for this node only</span></div>" +
          '<div class="rgn-block-b"><div class="rgn-table-wrap" style="border:0"><table class="rgn-table"><thead><tr><th>Species</th><th class="muted">Template rate</th><th>Override PKR/bf</th><th>Labour %</th><th>Waste %</th><th></th></tr></thead><tbody>' +
          BOOT.species.map(function (s) {
            var ov = (vr.overrides || []).filter(function (x) { return String(x.species_code) === s.code; })[0] || null;
            return '<tr data-var="' + s.code + '"><td><b>' + esc(s.label) + '</b><br><small class="muted">' + esc(s.class) + " · " + esc(s.use) + " · moisture " + esc(s.moisture) + "%" + (ov ? " · override stored" : "") + "</small></td>" +
              '<td class="muted">' + pkr(s.rate_bf) + "/bf</td>" +
              '<td><input data-k="rate_bf" type="number" min="0" step="10" placeholder="' + s.rate_bf + '" value="' + (ov && ov.rate_bf != null ? ov.rate_bf : "") + '" style="width:120px"></td>' +
              '<td><input data-k="labour_pct" type="number" min="0" max="60" placeholder="' + (22 * n.index).toFixed(1) + '" value="' + (ov && ov.labour_pct != null ? ov.labour_pct : "") + '" style="width:90px"></td>' +
              '<td><input data-k="waste_pct" type="number" min="0" max="30" placeholder="' + n.waste_pct + '" value="' + (ov && ov.waste_pct != null ? ov.waste_pct : "") + '" style="width:90px"></td>' +
              '<td><button class="btn sm" data-vsave>' + (ov ? "Save" : "Save") + '</button></td></tr>';
          }).join("") + "</tbody></table></div></div></div>" +
        '<div class="rgn-block" style="margin-top:18px"><div class="rgn-block-h"><h4>Formula reference (bound to /estimator + /builder parameters)</h4></div><div class="rgn-block-b"><div class="rgn-recon">' +
          Object.keys(BOOT.formulas || {}).map(function (k) { return "<div><span>" + esc(k) + "</span><b><code>" + esc(BOOT.formulas[k]) + "</code></b></div>"; }).join("") +
        "</div></div></div>";
      W.fillIcons(cv);
      $$("[data-save]", cv).forEach(function (b) { b.innerHTML = ic("save") + "Save"; });
      cv.addEventListener("click", function (e) {
        var nb = e.target.closest("#rg-rnode [data-node]");
        if (nb) { F.nodes = [nb.dataset.node]; save("wxRgnNodes", F.nodes); DRAW = {}; return drawRates(cv); }
        var sv = e.target.closest("[data-save]");
        if (sv) {
          var tr = sv.closest("[data-rate]");
          var body = { node: code, service_key: tr.dataset.rate, finish_key: tr.dataset.finish,
            base_rate: +$('[data-k="base_rate"]', tr).value, labour_pct: +$('[data-k="labour_pct"]', tr).value, waste_pct: +$('[data-k="waste_pct"]', tr).value };
          sv.disabled = true;
          api("rgn_rate_save", body).then(function (r) { sv.disabled = false; if (!r.ok) return W.toast(r.error, true); W.toast("Rate card saved · " + body.service_key + " " + body.finish_key + " ✓"); });
          return;
        }
        var vs = e.target.closest("[data-vsave]");
        if (vs) {
          var vr = vs.closest("[data-var]");
          var vb = { node: code, species_code: vr.dataset.var };
          ["rate_bf", "labour_pct", "waste_pct"].forEach(function (k) { var el = $('[data-k="' + k + '"]', vr); if (el && el.value !== "") vb[k] = +el.value; });
          vs.disabled = true;
          api("rgn_variant_save", vb).then(function (r) { vs.disabled = false; if (!r.ok) return W.toast(r.error, true); W.toast("Override saved for " + vr.dataset.var + " · " + cityOf(code) + " ✓"); });
          return;
        }
        var sy = e.target.closest("#rg-sync");
        if (sy) { sy.disabled = true; api("rgn_rate_sync", {}).then(function (r) { sy.disabled = false; if (!r.ok) return W.toast(r.error, true); W.toast(r.rows + " rows synced ✓"); DRAW = {}; drawRates(cv); }); }
      });
    });
  }
})();
