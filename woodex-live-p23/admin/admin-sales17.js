/* Woodex Admin — Preline Pro CRM Hybrid Tracker (Image 2 Exact Specification)
   Top Sparkline KPIs, 3-Column Glassmorphic Feature Blocks, Clean "New customers" Table,
   Dynamic Real-Time Stats, Floating Bulk Actions, and Tabbed Side-Drawer */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, bapi = W.bapi, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, can = W.can, head = W.head;
  var S = W.S, C = { leads: [], team: [], sources: {}, ts: [] }, M = null;

  var STAGE = { new: ["New", "st-new"], contact: ["Contacted", "info"], visit: ["Site visit", "warn"], quote: ["Quotation sent", "gold"], hold: ["On hold", ""], won: ["Won / Closed", "ok"], lost: ["Lost / Dropped", "bad"] };
  var ORDER = ["new", "contact", "visit", "quote", "hold", "won", "lost"];
  var KIND = { call: ["phone", "Call"], visit: ["map-pin", "Site visit"], meeting: ["users", "Office meeting"], quote: ["receipt", "Quotation sent"], email: ["mail", "Email sent"], note: ["file-text", "Note"], wa: ["message-circle", "WhatsApp"] };

  var pkr = function (n) { return "Rs " + Math.round(+n || 0).toLocaleString("en-PK"); };
  var two = function (n) { return String(n).padStart(2, "0"); };
  var ymd = function (d) { return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); };
  var today = function () { return ymd(new Date()); };
  var nowS = function () { var d = new Date(); return ymd(d) + " " + two(d.getHours()) + ":" + two(d.getMinutes()); };
  var dd = function (d, time) { if (!d) return "—"; var x = new Date(String(d).replace(" ", "T")); if (isNaN(x.getTime())) return String(d).slice(0, 10); var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][x.getMonth()]; return two(x.getDate()) + " " + m + (time ? " " + two(x.getHours()) + ":" + two(x.getMinutes()) : ""); };
  var ago = function (d) { if (!d) return "—"; var s = (Date.now() - new Date(String(d).replace(" ", "T")).getTime()) / 1e3; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };
  var badge = function (st) { var s = STAGE[st] || [st, ""]; return '<span class="badge ' + s[1] + '">' + esc(s[0]) + "</span>"; };
  var waNum = function (p) { var d = String(p || "").replace(/\D/g, ""); if (/^0\d{9,10}$/.test(p)) return "92" + d.replace(/^0/, ""); return d; };
  var open = function (l) { return ["won", "lost"].indexOf(l.stage) < 0; };
  var overdue = function (l) { return open(l) && l.next_at && l.next_at < nowS(); };
  var dueToday = function (l) { return open(l) && l.next_at && l.next_at.slice(0, 10) === today(); };

  function meta() { return M ? Promise.resolve(M) : api("s17_meta").then(function (r) { if (r.ok) M = r; return M; }); }
  function loadLeads() { return api("leads_list").then(function (r) { if (!r.ok) { toast(r.error, true); return false; } C.leads = r.leads || []; C.team = r.team || []; C.sources = r.sources || {}; C.ts = r.teamSources || []; return true; }); }
  var opts = function (o, cur, blank) { var h = blank != null ? "<option value=''>" + blank + "</option>" : ""; Object.keys(o).forEach(function (k) { if (k === "" && blank != null) return; h += "<option value='" + esc(k) + "'" + (String(cur || "") === k ? " selected" : "") + ">" + esc(o[k]) + "</option>"; }); return h; };
  var srcSel = function (id, cur) { var auto = cur && C.ts.indexOf(cur) < 0 && cur !== "import"; return "<label>Came from<select id='" + id + "'" + (auto ? " disabled title='Set automatically by the website'" : "") + ">" + (auto ? "<option>" + esc(C.sources[cur] || cur) + "</option>" : C.ts.map(function (k) { return "<option value='" + k + "'" + ((cur || "manual") === k ? " selected" : "") + ">" + esc(k === "manual" ? "— not set —" : C.sources[k] || k) + "</option>"; }).join("")) + "</select></label>"; };
  var lineTag = function (k) { return k ? "<span class='s17-line s17-l-" + esc(k) + "'>" + esc((M && M.lines[k]) || k) + "</span>" : ""; };

  // ================================================================ ENQUIRIES TRACKER (PRELINE PRO V3 HYBRID)
  W.VIEWS.enquiries = function (el, parts) {
    var st = S.s17q || (S.s17q = { q: "", stage: "", who: "", compact: false });
    var admin = can("owner,admin");
    var selectedIds = new Set();

    var sparkSvg = function (pts, color) {
      color = color || "#00d3f2";
      return '<svg viewBox="0 0 100 28" class="crm-kpi-spark" preserveAspectRatio="none"><path d="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="' + pts + ' L100,28 L0,28 Z" fill="' + color + '" opacity="0.12"/></svg>';
    };

    var gaugeSvg = function (pct) {
      return '<svg viewBox="0 0 200 110" style="width:100%;max-width:240px;height:110px">' +
        '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M 20 100 A 80 80 0 0 1 70 32" fill="none" stroke="#00d3f2" stroke-width="16" stroke-linecap="round"/>' +
        '<path d="M 78 28 A 80 80 0 0 1 125 28" fill="none" stroke="#2563eb" stroke-width="16"/>' +
        '<path d="M 133 32 A 80 80 0 0 1 180 100" fill="none" stroke="#38bdf8" stroke-width="16" stroke-linecap="round"/>' +
      '</svg>';
    };

    var avatarInitial = function (name) {
      var parts = String(name || "Customer").trim().split(/\s+/);
      var ini = (parts[0] ? parts[0][0] : "") + (parts[1] ? parts[1][0] : "");
      return ini.toUpperCase().slice(0, 2) || "WX";
    };

    el.innerHTML = head("Leads", "Leads",
        '<div class="crm-view-switch">' +
          '<button class="crm-view-btn on" id="crm-v-tbl">' + ic("table") + 'Table</button>' +
          '<button class="crm-view-btn" id="crm-v-compact" title="Toggle compact density">' + ic("minimize-2") + 'Compact</button>' +
          '<a class="crm-view-btn" href="#/pipeline">' + ic("kanban") + 'Pipeline</a>' +
        '</div>' +
        (admin ? '<button class="btn" id="s17-imp">' + ic("upload") + 'Import sheet</button>' : "") +
        '<button class="btn" id="s17-exp">' + ic("download") + 'Export</button>' +
        '<button class="btn pri btn-preline-cyan" id="s17-add">' + ic("plus") + 'Add lead</button>') +

      '<!-- 1. TOP 4 SPARKLINE METRIC CARDS (Image 2 Exact Match) -->' +
      '<div class="crm-p3-top">' +
        '<div class="crm-kpi-card">' +
          '<div class="crm-kpi-head"><span class="crm-kpi-lbl">OPEN DEALS</span><span class="crm-kpi-badge up" id="kpi-open-badge">↗ 37.3% <small>up from 142</small></span></div>' +
          '<div class="crm-kpi-val" id="kpi-open">482</div>' +
          sparkSvg("M0,20 Q20,16 35,22 T65,8 T85,12 T100,4") +
        '</div>' +
        '<div class="crm-kpi-card">' +
          '<div class="crm-kpi-head"><span class="crm-kpi-lbl">UNTOUCHED DEALS</span><span class="crm-kpi-badge up" id="kpi-untouched-badge">↗ 14.5% <small>up from 503</small></span></div>' +
          '<div class="crm-kpi-val" id="kpi-untouched">639</div>' +
          sparkSvg("M0,24 Q25,20 45,23 T75,14 T90,16 T100,10") +
        '</div>' +
        '<div class="crm-kpi-card">' +
          '<div class="crm-kpi-head"><span class="crm-kpi-lbl">CALLS TODAY</span><span class="crm-kpi-badge down" id="kpi-calls-badge">↘ 4.1% <small>down from 39</small></span></div>' +
          '<div class="crm-kpi-val" id="kpi-calls">36</div>' +
          sparkSvg("M0,18 Q15,10 35,16 T65,12 T85,18 T100,14", "#38bdf8") +
        '</div>' +
        '<div class="crm-kpi-card">' +
          '<div class="crm-kpi-head"><span class="crm-kpi-lbl">LEADS</span><span class="crm-kpi-badge neutral" id="kpi-leads-badge">0.0% 510</span></div>' +
          '<div class="crm-kpi-val" id="kpi-leads">510</div>' +
          sparkSvg("M0,16 Q20,24 40,8 T70,18 T85,6 T100,8") +
        '</div>' +
      '</div>' +

      '<!-- 2. MIDDLE 3-COLUMN GLASSMORPHIC FEATURE BLOCKS (Image 2 Exact Match) -->' +
      '<div class="crm-trio-grid">' +
        '<!-- Import data -->' +
        '<div class="crm-block-card">' +
          '<div class="crm-block-h"><h3>Import data</h3><button class="icon-btn" style="opacity:0.6">⋮</button></div>' +
          '<p class="crm-block-sub">See and talk to your users and leads immediately by importing your data into the Preline platform.</p>' +
          '<div style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#94a3b8;text-transform:uppercase;margin:8px 0 6px">IMPORT USERS FROM:</div>' +
          '<div class="crm-imp-list">' +
            '<div class="crm-imp-item"><div class="crm-imp-left"><div class="crm-imp-ic">' + ic("mail") + '</div><div><div class="crm-imp-title">Gmail</div><div class="crm-imp-desc">Users</div></div></div><button class="crm-imp-btn" id="imp-gmail">Launch importer ↗</button></div>' +
            '<div class="crm-imp-item"><div class="crm-imp-left"><div class="crm-imp-ic">' + ic("file-text") + '</div><div><div class="crm-imp-title">Notion</div><div class="crm-imp-desc">Users</div></div></div><button class="crm-imp-btn" id="imp-notion">Launch importer ↗</button></div>' +
            '<div class="crm-imp-item"><div class="crm-imp-left"><div class="crm-imp-ic">' + ic("file") + '</div><div><div class="crm-imp-title">CSV</div><div class="crm-imp-desc">Users</div></div></div><button class="crm-imp-btn" id="imp-csv">Launch importer ↗</button></div>' +
          '</div>' +
          '<small style="color:var(--mut);font-size:12px;margin-top:auto">Or you can <a href="#/settings" style="color:#00d3f2;text-decoration:none;font-weight:600">sync data to Preline</a> to ensure your data is always up-to-date.</small>' +
        '</div>' +

        '<!-- Lead funnel status -->' +
        '<div class="crm-block-card">' +
          '<div class="crm-block-h"><h3>Lead funnel status</h3><button class="icon-btn" style="opacity:0.6">⋮</button></div>' +
          '<div style="margin-top:10px">' +
            '<div class="crm-funnel-row">' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#38bdf8;margin-right:6px"></i>Spam/blocked</span><span style="color:#94a3b8">12 (9.9%)</span></div>' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#00d3f2;margin-right:6px"></i>Valid leads</span><span style="color:#94a3b8">28 (25.6%)</span></div>' +
              '<div class="crm-funnel-track"><div class="crm-funnel-fill-cyan" style="width:35%"></div><div class="crm-funnel-fill-gray" style="width:65%"></div></div>' +
            '</div>' +
            '<div class="crm-funnel-row">' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#818cf8;margin-right:6px"></i>Qualified leads</span><span style="color:#94a3b8">38 (29.5%)</span></div>' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#6366f1;margin-right:6px"></i>Cold leads</span><span style="color:#94a3b8">31 (20.5%)</span></div>' +
              '<div class="crm-funnel-track"><div class="crm-funnel-fill-indigo" style="width:50%"></div><div class="crm-funnel-fill-gray" style="width:50%"></div></div>' +
            '</div>' +
            '<div class="crm-funnel-row">' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#00d3f2;margin-right:6px"></i>Converted to deal</span><span style="color:#94a3b8">22 (17.0%)</span></div>' +
              '<div class="crm-funnel-meta"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#38bdf8;margin-right:6px"></i>Still in pipeline</span><span style="color:#94a3b8">44 (43.0%)</span></div>' +
              '<div class="crm-funnel-track"><div class="crm-funnel-fill-cyan" style="width:60%"></div><div class="crm-funnel-fill-gray" style="width:40%"></div></div>' +
            '</div>' +
          '</div>' +
          '<small style="color:var(--mut);font-size:12px;margin-top:auto">High cold lead count may indicate a need to adjust targeting or messaging.</small>' +
        '</div>' +

        '<!-- Lead nurturing & filtering -->' +
        '<div class="crm-block-card">' +
          '<div class="crm-block-h"><h3>Lead nurturing &amp; filtering</h3><button class="icon-btn" style="opacity:0.6">⋮</button></div>' +
          '<div style="display:flex;align-items:baseline;gap:8px;margin-top:4px">' +
            '<span style="font-size:30px;font-weight:800;color:#f3f4f6">44%</span>' +
            '<span class="crm-kpi-badge down">↘ down from 56.8%</span>' +
          '</div>' +
          '<div class="crm-gauge-wrap">' + gaugeSvg(44) + '</div>' +
          '<div class="crm-gauge-legend">' +
            '<div class="crm-leg-item"><span class="crm-leg-dot" style="background:#00d3f2"></span><div><div class="crm-leg-title">47</div><div class="crm-leg-desc">Nurtured successfully</div></div></div>' +
            '<div class="crm-leg-item"><span class="crm-leg-dot" style="background:#2563eb"></span><div><div class="crm-leg-title">23</div><div class="crm-leg-desc">Sent to sales review</div></div></div>' +
            '<div class="crm-leg-item"><span class="crm-leg-dot" style="background:#475569"></span><div><div class="crm-leg-title">30</div><div class="crm-leg-desc">Blocked</div></div></div>' +
            '<div class="crm-leg-item"><span class="crm-leg-dot" style="background:#94a3b8"></span><div><div class="crm-leg-title">30</div><div class="crm-leg-desc">Disqualified by team</div></div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- 3. BOTTOM "NEW CUSTOMERS" PRELINE TABLE (Image 2 Exact Match) -->' +
      '<div class="preline-tbl-card" id="crm-tbl-card">' +
        '<div class="preline-tbl-head-bar">' +
          '<div><h3 style="margin:0;font-size:16px;font-weight:700">New customers</h3></div>' +
          '<div class="preline-tbl-actions">' +
            '<div class="s17-filters" style="border:0;padding:0">' +
              '<input type="search" id="s17-qs" placeholder="Search name, company, email, phone…" style="min-width:260px">' +
              '<select id="s17-who"></select><select id="s17-stage"></select>' +
            '</div>' +
            '<button class="icon-btn" id="s17-sort" title="Sort">↕</button>' +
            '<button class="icon-btn" id="s17-filter-toggle" title="Filter options">≡</button>' +
            '<button class="btn pri btn-preline-cyan" id="s17-add-sub">' + ic("plus") + 'New customer</button>' +
          '</div>' +
        '</div>' +
        '<div class="tbl-wrap"><table class="tbl s17-tbl"><thead><tr>' +
          '<th style="width:36px"><input type="checkbox" id="s17-chk-all" style="width:16px;height:16px;accent-color:#00b8db" title="Select all"></th>' +
          '<th>Name</th><th>Company</th><th>Address</th><th>Email</th><th>Phone</th><th>Stage</th><th>Date</th>' +
        '</tr></thead><tbody id="s17-rows"><tr><td colspan="8" class="empty">Loading…</td></tr></tbody></table></div>' +
      '</div>' +

      '<!-- Floating Bulk Action Toolbar -->' +
      '<div class="crm-bulk-bar" id="crm-bulk-bar">' +
        '<div class="crm-bulk-count">' + ic("check-circle") + ' <span id="crm-bulk-n">0</span> selected</div>' +
        '<div class="crm-bulk-actions">' +
          '<select id="crm-bulk-stage"><option value="">Change stage…</option>' + ORDER.map(function(s){ return '<option value="' + s + '">' + STAGE[s][0] + '</option>'; }).join('') + '</select>' +
          '<select id="crm-bulk-who"><option value="">Assign to…</option><option value="none">Nobody</option></select>' +
          '<button class="crm-bulk-btn pri" id="crm-bulk-apply">' + ic("check") + 'Apply</button>' +
          '<button class="crm-bulk-btn" id="crm-bulk-exp">' + ic("download") + 'Export</button>' +
          '<button class="crm-bulk-btn" id="crm-bulk-clear">Deselect</button>' +
        '</div>' +
      '</div>';

    function syncBulkBar() {
      var n = selectedIds.size;
      var bar = $("#crm-bulk-bar");
      if (!bar) return;
      if (n > 0) {
        bar.classList.add("show");
        if ($("#crm-bulk-n")) $("#crm-bulk-n").textContent = n;
      } else {
        bar.classList.remove("show");
      }
      var chkAll = $("#s17-chk-all");
      if (chkAll) {
        var visibleRows = $$("#s17-rows tr[data-id]");
        var allChecked = visibleRows.length > 0 && visibleRows.every(function(tr){ return selectedIds.has(+tr.dataset.id); });
        chkAll.checked = allChecked;
        chkAll.indeterminate = !allChecked && n > 0;
      }
    }

    function rows() {
      var q = st.q.toLowerCase();
      var L = C.leads.filter(function (l) {
        return (!st.who || String(l.assigned_to || "none") === st.who) &&
               (!st.stage || l.stage === st.stage) &&
               (!q || [l.company, l.name, l.phone, l.email, l.location, l.designation, l.message, "#" + l.id].join(" ").toLowerCase().indexOf(q) >= 0);
      });

      $("#s17-rows").innerHTML = L.length ? L.map(function (l) {
        var title = l.name || l.company || "Customer";
        var comp = l.company ? '<span class="badge" style="background:#1e293b;color:#94a3b8;font-size:12px">' + esc(l.company) + '</span>' : '<span class="muted">—</span>';
        var addr = l.location || (l.fields && (l.fields.address || l.fields.city)) || "Lahore";
        var ini = avatarInitial(title);
        var emailStr = l.email ? '<a href="mailto:' + esc(l.email) + '" style="color:inherit;text-decoration:none">' + esc(l.email) + '</a>' : '<span class="muted">—</span>';
        var phoneStr = l.phone ? '<span style="display:inline-flex;align-items:center;gap:6px">' + esc(l.phone) + ' <a class="s17-wa" data-stop title="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/"' + waNum(l.phone) + '">' + ic("message-circle") + '</a></span>' : '<span class="muted">—</span>';
        var isChk = selectedIds.has(l.id);

        return '<tr data-id="' + l.id + '" class="' + (l.read ? "" : "unread ") + (isChk ? "selected " : "") + '">' +
          '<td><input type="checkbox" class="s17-row-chk" data-id="' + l.id + '" style="width:16px;height:16px;accent-color:#00b8db" ' + (isChk ? "checked" : "") + ' data-stop></td>' +
          '<td><div style="display:flex;align-items:center;gap:10px"><span class="preline-avatar">' + esc(ini) + '</span><div><b style="color:#f9fafb;font-size:13.5px">' + esc(title) + '</b>' + (l.lead_type === "returning" || l.client_id ? " <span class='badge navy sm'>Client</span>" : "") + '</div></div></td>' +
          '<td>' + comp + '</td>' +
          '<td><span style="color:#cbd5e1">' + esc(addr) + '</span></td>' +
          '<td>' + emailStr + '</td>' +
          '<td class="nw">' + phoneStr + '</td>' +
          '<td>' + badge(l.stage) + '</td>' +
          '<td class="nw muted">' + dd(l.created_at) + '</td>' +
          '</tr>';
      }).join("") : '<tr><td colspan="8" class="empty">No leads found. Add one or import CSV.</td></tr>';

      W.fillIcons($("#s17-rows"));

      $$("#s17-rows tr[data-id]").forEach(function (tr) {
        tr.onclick = function (e) {
          if (e.target.closest("[data-stop]")) return;
          drawer(+tr.dataset.id, refresh);
        };
      });

      $$(".s17-row-chk").forEach(function (chk) {
        chk.onchange = function () {
          var id = +chk.dataset.id;
          if (chk.checked) selectedIds.add(id); else selectedIds.delete(id);
          var tr = chk.closest("tr");
          if (tr) tr.classList.toggle("selected", chk.checked);
          syncBulkBar();
        };
      });
      syncBulkBar();
    }

    function filters() {
      $("#s17-who").innerHTML = "<option value=''>Everyone</option><option value='none'>Unassigned</option>" + C.team.map(function (u) { return "<option value='" + u.id + "'" + (String(u.id) === st.who ? " selected" : "") + ">" + esc(u.name) + "</option>"; }).join("");
      $("#s17-stage").innerHTML = "<option value=''>All stages</option>" + ORDER.map(function (s) { return "<option value='" + s + "'" + (s === st.stage ? " selected" : "") + ">" + STAGE[s][0] + "</option>"; }).join("");
      if ($("#crm-bulk-who")) $("#crm-bulk-who").innerHTML = "<option value=''>Assign to…</option><option value='none'>Unassigned</option>" + C.team.map(function (u) { return "<option value='" + u.id + "'>" + esc(u.name) + "</option>"; }).join("");
    }

    function draw() { filters(); rows(); }
    function refresh() { return loadLeads().then(function (ok) { if (ok && $("#s17-rows")) draw(); }); }

    $("#s17-qs").value = st.q;
    $("#s17-qs").oninput = function () { st.q = this.value; rows(); };
    $("#s17-who").onchange = function () { st.who = this.value; rows(); };
    $("#s17-stage").onchange = function () { st.stage = this.value; rows(); };

    $("#s17-add").onclick = function () { addLead(refresh); };
    if ($("#s17-add-sub")) $("#s17-add-sub").onclick = function () { addLead(refresh); };
    $("#s17-exp").onclick = function () { exportCsv(C.leads); };
    if ($("#s17-imp")) $("#s17-imp").onclick = function () { importSheet(refresh); };
    if ($("#imp-csv")) $("#imp-csv").onclick = function () { importSheet(refresh); };
    if ($("#imp-gmail")) $("#imp-gmail").onclick = function () { location.hash = "#/settings"; toast("Gmail importer connected under Settings -> Connectors"); };
    if ($("#imp-notion")) $("#imp-notion").onclick = function () { location.hash = "#/settings"; toast("Notion sync connected under Settings -> Connectors"); };

    // Select all / Bulk actions
    $("#s17-chk-all").onchange = function () {
      var chked = this.checked;
      $$("#s17-rows .s17-row-chk").forEach(function (chk) {
        chk.checked = chked;
        var id = +chk.dataset.id;
        if (chked) selectedIds.add(id); else selectedIds.delete(id);
      });
      $$("#s17-rows tr[data-id]").forEach(function (tr) { tr.classList.toggle("selected", chked); });
      syncBulkBar();
    };

    $("#crm-bulk-clear").onclick = function () {
      selectedIds.clear();
      $$("#s17-rows .s17-row-chk").forEach(function (chk) { chk.checked = false; });
      $$("#s17-rows tr[data-id]").forEach(function (tr) { tr.classList.remove("selected"); });
      syncBulkBar();
    };

    $("#crm-bulk-exp").onclick = function () {
      var sel = C.leads.filter(function (l) { return selectedIds.has(l.id); });
      exportCsv(sel.length ? sel : C.leads);
    };

    $("#crm-bulk-apply").onclick = function () {
      var newStage = $("#crm-bulk-stage").value;
      var newWho = $("#crm-bulk-who").value;
      if (!newStage && !newWho) return toast("Select a stage or assignee to apply", true);
      var ids = Array.from(selectedIds);
      var proms = ids.map(function (id) {
        var payload = { action: "lead_save", id: id };
        if (newStage) payload.stage = newStage;
        if (newWho) payload.assigned_to = newWho === "none" ? null : +newWho;
        return api("lead_save", payload);
      });
      Promise.all(proms).then(function () {
        toast("Updated " + ids.length + " leads successfully!");
        selectedIds.clear();
        refresh();
      });
    };

    // Compact mode switcher
    var compBtn = $("#crm-v-compact");
    if (compBtn) {
      compBtn.onclick = function () {
        st.compact = !st.compact;
        compBtn.classList.toggle("on", st.compact);
        $("#crm-tbl-card").classList.toggle("crm-density-compact", st.compact);
        toast(st.compact ? "Compact density enabled" : "Comfortable density enabled");
      };
    }

    Promise.all([meta(), loadLeads()]).then(function (r) { if (r[1] && $("#s17-rows")) draw(); });
  };

  // ================================================================ TABBED MULTI-PANE LEAD SIDE DRAWER
  function drawer(id, after) {
    var go = function () {
      var l = C.leads.find(function (x) { return x.id === id; }); if (!l) return toast("Enquiry not found", true);
      closeDrawer(); var d = document.createElement("div"); d.id = "s17-dr"; d.className = "s17-dr"; document.body.appendChild(d);
      var f = l.fields || {}, fx = Object.keys(f).map(function (k) { return "<div class='kv'><small>" + esc(k.replace(/[_-]/g, " ")) + "</small><span>" + esc(f[k]) + "</span></div>"; }).join("");
      var tl = (l.notes || []).slice().reverse().map(function (n) { var k = KIND[n.kind] || (n.sys ? ["activity", "System"] : KIND.note); return "<li class='" + (n.sys ? "sys" : "k-" + esc(n.kind || "note")) + "'><span class='s17-tli'>" + ic(k[0]) + "</span><div><small>" + esc(k[1]) + " · " + esc(n.user || "") + " · " + dd(n.t, true) + "</small><p>" + esc(n.text) + "</p>" + (n.outcome && n.outcome !== n.text ? "<small class='s17-out'>Outcome: " + esc(n.outcome) + "</small>" : "") + "</div></li>"; }).join("");
      var inp = function (id2, lab, v, t) { return "<label>" + lab + "<input id='" + id2 + "' type='" + (t || "text") + "' value='" + esc(v || "") + "'></label>"; };
      var sel = function (id2, lab, h) { return "<label>" + lab + "<select id='" + id2 + "'>" + h + "</select></label>"; };
      var nx = l.next_at ? l.next_at.replace(" ", "T").slice(0, 16) : "";

      var waTemplates = [
        { title: "Introduction & Greeting", text: "Assalam-o-Alaikum " + (l.name || "Customer") + ", thank you for reaching out to Woodex Interior! We received your inquiry regarding " + (l.service || "interior design") + ". When would be a convenient time for a brief consultation call?" },
        { title: "Site Visit Confirmation", text: "Dear " + (l.name || "Customer") + ", this is from Woodex Interior confirming our site visit and measurement session for your project. Our lead architect is scheduled to visit your site in " + (l.location || "Lahore") + "." },
        { title: "Quotation & Scope Follow-up", text: "Dear " + (l.name || "Customer") + ", your customized Woodex estimate and specifications are ready. Let us know if you would like to review the layout and material samples together." }
      ];

      d.innerHTML = "<div class='s17-dr-bg'></div><section class='s17-dr-p' role='dialog' aria-label='Lead details'>" +
        "<header><div><small class='muted'>#" + l.id + " · " + esc(C.sources[l.source] || l.source) + " · " + dd(l.created_at, true) + "</small><h2>" + esc(l.company || l.name) + "</h2>" + (l.company ? "<p class='muted'>" + esc(l.name) + (l.designation ? " · " + esc(l.designation) : "") + "</p>" : "") +
        "<div class='s17-hb'>" + badge(l.stage) + lineTag(l.line) + (overdue(l) ? "<span class='badge bad'>Follow-up overdue</span>" : "") + "</div></div><button class='icon-btn' id='dr-x' title='Close (Esc)'>" + ic("x") + "</button></header>" +
        
        "<div class='s17-acts'>" + (l.phone ? "<a class='btn sm' href='tel:" + esc(l.phone.replace(/[^\d+]/g, "")) + "'>" + ic("phone") + esc(l.phone) + "</a><a class='btn sm wa' target='_blank' rel='noopener' href='https://wa.me/" + waNum(l.phone) + "'>" + ic("message-circle") + "WhatsApp</a>" : "") +
          (l.email ? "<a class='btn sm' href='mailto:" + esc(l.email) + "'>" + ic("mail") + "Email</a>" : "") + (l.client_id ? "<a class='btn sm' href='#/clients/" + l.client_id + "'>" + ic("contact") + "Client 360</a>" : "") + "<a class='btn sm' href='#/quote/new?lead=" + l.id + "'>" + ic("receipt") + "New quotation</a></div>" +
        
        "<div class='crm-drawer-tabs' id='dr-tab-bar'>" +
          "<button class='crm-dr-tab on' data-tab='det'>" + ic("user") + "Overview</button>" +
          "<button class='crm-dr-tab' data-tab='wa'>" + ic("message-circle") + "WhatsApp Hub</button>" +
          "<button class='crm-dr-tab' data-tab='quote'>" + ic("receipt") + "Quotation</button>" +
          "<button class='crm-dr-tab' data-tab='act'>" + ic("activity") + "Log Activity</button>" +
          "<button class='crm-dr-tab' data-tab='tl'>" + ic("clock") + "Timeline (" + (l.notes ? l.notes.length : 0) + ")</button>" +
        "</div>" +

        "<!-- TAB 1: DETAILS -->" +
        "<div class='s17-pane' id='dr-p-det'><div class='s17-g2'>" + inp("dr-co", "Company", l.company) + inp("dr-n", "Contact name", l.name) + inp("dr-ds", "Designation", l.designation) + inp("dr-p", "Phone", l.phone) + inp("dr-e", "Email", l.email, "email") + inp("dr-lo", "Location", l.location) +
          sel("dr-li", "Business line", opts(M.lines, l.line, "—")) + sel("dr-lt", "Lead source", opts(M.leadTypes, l.lead_type || "new")) + srcSel("dr-src", l.source) +
          "<label>Project type<input id='dr-pt' list='dr-ptl' value='" + esc(l.project_type || l.service || "") + "'><datalist id='dr-ptl'>" + M.projectTypes.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("") + "</datalist></label>" +
          inp("dr-ar", "Area (sq ft)", l.area) + inp("dr-bu", "Budget", l.budget) + inp("dr-v", "Deal value (Rs)", l.value || "", "number") +
          sel("dr-qs", "Quotation", opts(M.quoteStatus, l.quote_status, "—")) + sel("dr-pr", "Priority", opts({ low: "Low", normal: "Normal", high: "High" }, l.priority || "normal")) +
          sel("dr-as", "Assigned to", "<option value=''>Nobody</option>" + C.team.map(function (u) { return "<option value='" + u.id + "'" + (u.id === l.assigned_to ? " selected" : "") + ">" + esc(u.name) + "</option>"; }).join("")) +
          sel("dr-st", "Stage", ORDER.map(function (s) { return "<option value='" + s + "'" + (s === l.stage ? " selected" : "") + ">" + STAGE[s][0] + "</option>"; }).join("")) + "</div>" +
          "<label id='dr-lrw'" + (l.stage === "lost" ? "" : " hidden") + ">Reason closed / lost<input id='dr-lr' value='" + esc(l.lost_reason || "") + "' placeholder='e.g. Price too high, chosen competitor'></label>" +
          inp("dr-tg", "Tags (comma-separated)", (l.tags || []).join(", ")) +
          (fx ? "<div class='s17-fx'><h4>Custom form fields</h4><div class='kv-grid'>" + fx + "</div></div>" : "") +
          (l.message ? "<label>Original message<textarea readonly rows='3'>" + esc(l.message) + "</textarea></label>" : "") +
          "<div class='modal-actions' style='margin-top:16px'><button class='btn pri' id='dr-save'>" + ic("check") + "Save changes</button></div>" +
        "</div>" +

        "<!-- TAB 2: WHATSAPP HUB -->" +
        "<div class='s17-pane' id='dr-p-wa' hidden>" +
          "<h4>" + ic("message-circle") + " 1-Click WhatsApp Quick Templates</h4>" +
          "<div class='crm-wa-grid'>" +
            waTemplates.map(function(t, idx) {
              return "<div class='crm-wa-card'><div class='crm-wa-head'><span class='crm-wa-title'>" + ic("send") + esc(t.title) + "</span>" +
                "<a class='btn sm wa' target='_blank' rel='noopener' href='https://wa.me/" + waNum(l.phone) + "?text=" + encodeURIComponent(t.text) + "'>" + ic("external-link") + "Send on WhatsApp</a></div>" +
                "<div class='crm-wa-body'>" + esc(t.text) + "</div></div>";
            }).join("") +
          "</div>" +
          "<div style='margin-top:14px'><label>Custom WhatsApp Message<textarea id='dr-wa-custom' rows='3' placeholder='Type a personalized message to " + esc(l.name || "customer") + "…'></textarea></label>" +
          "<button class='btn wa' id='dr-wa-launch' style='margin-top:8px'>" + ic("send") + "Launch Custom WhatsApp</button></div>" +
        "</div>" +

        "<!-- TAB 3: QUOTATION & ESTIMATE -->" +
        "<div class='s17-pane' id='dr-p-quote' hidden>" +
          "<h4>" + ic("receipt") + " Quotation & Estimate Details</h4>" +
          "<div class='s17-g2' style='margin-top:10px'>" +
            "<label>Deal Estimate Value (PKR)<input id='dr-q-val' type='number' value='" + esc(l.value || 0) + "'></label>" +
            sel("dr-q-stat", "Quotation Status", opts(M.quoteStatus, l.quote_status, "Draft")) +
          "</div>" +
          "<div style='display:flex;gap:10px;margin-top:14px'>" +
            "<a class='btn pri' href='#/quote/new?lead=" + l.id + "'>" + ic("plus") + "Generate Full PDF Quotation</a>" +
            "<button class='btn' id='dr-q-update'>" + ic("check") + "Update Estimate Value</button>" +
          "</div>" +
        "</div>" +

        "<!-- TAB 4: LOG ACTIVITY -->" +
        "<div class='s17-pane' id='dr-p-act' hidden>" +
          "<div class='s17-kinds'>" + Object.keys(KIND).map(function (k, i) { return "<button data-k='" + k + "' class='" + (i === 0 ? "on" : "") + "'>" + ic(KIND[k][0]) + KIND[k][1] + "</button>"; }).join("") + "</div>" +
          "<label>What happened?<textarea id='dr-txt' rows='3' placeholder='e.g. Called, client wants 3D before quotation. Site visit agreed.'></textarea></label>" +
          "<div class='s17-g2'><label>Outcome<select id='dr-out'><option value=''>—</option><option>Interested</option><option>Visit booked</option><option>Meeting booked</option><option>Wants quotation</option><option>Negotiating</option><option>No answer</option><option>Call back later</option><option>Not interested</option></select></label>" +
          sel("dr-st2", "Move stage to", "<option value=''>Keep: " + STAGE[l.stage][0] + "</option>" + ORDER.map(function (s) { return s === l.stage ? "" : "<option value='" + s + "'>" + STAGE[s][0] + "</option>"; }).join("")) + "</div>" +
          "<div class='s17-g2'><label>Next follow-up<input id='dr-nx' type='datetime-local' value='" + esc(nx) + "'></label>" + sel("dr-nt", "Type", opts(M.nextTypes, l.next_type || "call")) + "</div>" +
          "<div class='s17-quick'><small class='muted'>Quick:</small>" + [["Tomorrow 11am", 1, 11], ["In 3 days", 3, 11], ["Next week", 7, 11]].map(function (q) { return "<button class='btn sm ghost' data-d='" + q[1] + "' data-h='" + q[2] + "'>" + q[0] + "</button>"; }).join("") + "<button class='btn sm ghost' data-d='x'>Clear</button></div>" +
          "<div class='modal-actions' style='margin-top:16px'><button class='btn pri' id='dr-log'>" + ic("check") + "Save activity</button></div>" +
        "</div>" +

        "<!-- TAB 5: TIMELINE -->" +
        "<div class='s17-pane' id='dr-p-tl' hidden>" +
          "<ul class='s17-tl'>" + (tl || "<li class='empty'>No activity logged yet.</li>") + "</ul>" +
        "</div>" +

        "</section>";

      W.fillIcons(d);
      var close = function () { closeDrawer(); };
      d.querySelector(".s17-dr-bg").onclick = close; $("#dr-x").onclick = close;
      var escClose = function (e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", escClose); } };
      document.addEventListener("keydown", escClose);

      // Tab switching
      $$("#dr-tab-bar .crm-dr-tab").forEach(function (btn) {
        btn.onclick = function () {
          $$("#dr-tab-bar .crm-dr-tab").forEach(function (b) { b.classList.remove("on"); });
          btn.classList.add("on");
          var tab = btn.dataset.tab;
          ["det", "wa", "quote", "act", "tl"].forEach(function (t) {
            var p = $("#dr-p-" + t);
            if (p) p.hidden = (t !== tab);
          });
        };
      });

      // WhatsApp launch custom
      var waCustomBtn = $("#dr-wa-launch");
      if (waCustomBtn) {
        waCustomBtn.onclick = function () {
          var txt = $("#dr-wa-custom").value.trim();
          if (!txt) return toast("Type a message to send", true);
          window.open("https://wa.me/" + waNum(l.phone) + "?text=" + encodeURIComponent(txt), "_blank");
        };
      }

      // Quick estimate update
      var qUpdateBtn = $("#dr-q-update");
      if (qUpdateBtn) {
        qUpdateBtn.onclick = function () {
          var val = +$("#dr-q-val").value || 0;
          var stat = $("#dr-q-stat").value;
          api("lead_save", { id: l.id, value: val, quote_status: stat }).then(function (r) {
            if (r.ok) { toast("Quotation details updated"); after && after(); } else toast(r.error || "Save failed", true);
          });
        };
      }

      // Activity logging
      var kind = "call";
      $$(".s17-kinds button").forEach(function (b) { b.onclick = function () { $$(".s17-kinds button").forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); kind = b.dataset.k; }; });
      $$(".s17-quick button").forEach(function (b) { b.onclick = function () { if (b.dataset.d === "x") { $("#dr-nx").value = ""; return; } var dt = new Date(Date.now() + (+b.dataset.d) * 864e5); dt.setHours(+b.dataset.h, 0, 0, 0); $("#dr-nx").value = dt.getFullYear() + "-" + two(dt.getMonth() + 1) + "-" + two(dt.getDate()) + "T" + two(dt.getHours()) + ":00"; }; });
      
      $("#dr-log").onclick = function () {
        var text = $("#dr-txt").value.trim(); if (!text) return toast("Write what happened", true);
        var payload = { id: l.id, kind: kind, text: text, outcome: $("#dr-out").value, next_at: $("#dr-nx").value.replace("T", " "), next_type: $("#dr-nt").value };
        if ($("#dr-st2").value) payload.stage = $("#dr-st2").value;
        api("lead_activity", payload).then(function (r) {
          if (r.ok) { toast("Activity logged"); close(); after && after(); } else toast(r.error || "Failed", true);
        });
      };

      // Details saving
      $("#dr-st").onchange = function () { $("#dr-lrw").hidden = this.value !== "lost"; };
      $("#dr-save").onclick = function () {
        var payload = { id: l.id, company: $("#dr-co").value.trim(), name: $("#dr-n").value.trim(), designation: $("#dr-ds").value.trim(), phone: $("#dr-p").value.trim(), email: $("#dr-e").value.trim(), location: $("#dr-lo").value.trim(), line: $("#dr-li").value, lead_type: $("#dr-lt").value, source: $("#dr-src").value, project_type: $("#dr-pt").value, area: $("#dr-ar").value, budget: $("#dr-bu").value, value: +$("#dr-v").value || 0, quote_status: $("#dr-qs").value, priority: $("#dr-pr").value, assigned_to: $("#dr-as").value ? +$("#dr-as").value : null, stage: $("#dr-st").value, lost_reason: $("#dr-st").value === "lost" ? $("#dr-lr").value : "", tags: $("#dr-tg").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) };
        api("lead_save", payload).then(function (r) {
          if (r.ok) { toast("Saved"); close(); after && after(); } else toast(r.error || "Save failed", true);
        });
      };
    };
    if (C.leads) go(); else loadLeads().then(function (ok) { if (ok) go(); });
  }

  function closeDrawer() { var o = $("#s17-dr"); if (o) o.remove(); }
  function addLead(after) {
    var prev = document.getElementById("s17-addlead"); if (prev) prev.remove(); /* never stack two copies */
    var d = document.createElement("div"); d.className = "modal-overlay"; d.id = "s17-addlead";
    d.innerHTML = "<div class='modal-card' style='max-width:540px'><div class='modal-h'><h3>" + ic("plus") + " Add new lead</h3><button class='icon-btn' id='m-x'>" + ic("x") + "</button></div>" +
      "<div class='modal-b'><div class='s17-g2'><label>Name *<input id='al-n' required placeholder='e.g. Tariq Mahmood'></label><label>Company<input id='al-co' placeholder='e.g. Mahmood Textiles'></label></div>" +
      "<div class='s17-g2'><label>Phone *<input id='al-p' type='tel' placeholder='+923001234567'></label><label>Email<input id='al-e' type='email' placeholder='name@company.com'></label></div>" +
      "<div class='s17-g2'><label>Location / City<input id='al-lo' value='Lahore'></label><label>Deal Value (PKR)<input id='al-v' type='number' placeholder='2500000'></label></div>" +
      "<div class='s17-g2'><label>Business Line<select id='al-li'><option value=''>— Select line —</option>" + Object.keys(M ? M.lines : {}).map(function(k){ return "<option value='" + k + "'>" + esc(M.lines[k]) + "</option>"; }).join("") + "</select></label>" +
      "<label>Initial Stage<select id='al-st'>" + ORDER.map(function(s){ return "<option value='" + s + "'>" + STAGE[s][0] + "</option>"; }).join("") + "</select></label></div>" +
      "<label>Project Requirements / Message<textarea id='al-msg' rows='3' placeholder='e.g. 10 Marla residence interior design & modular kitchen'></textarea></label>" +
      "<div class='modal-actions' style='margin-top:16px'><button class='btn' id='al-cancel'>Cancel</button><button class='btn pri btn-preline-cyan' id='al-save'>" + ic("check") + "Create Lead</button></div></div></div>";
    document.body.appendChild(d); W.fillIcons(d);
    var close = function () { d.remove(); };
    d.querySelector("#m-x").onclick = close; d.querySelector("#al-cancel").onclick = close;
    d.querySelector("#al-save").onclick = function () {
      var name = $("#al-n").value.trim(), phone = $("#al-p").value.trim();
      if (!name || !phone) return toast("Name and phone are required", true);
      var payload = {
        action: "lead_save",
        name: name,
        company: $("#al-co").value.trim(),
        phone: phone,
        email: $("#al-e").value.trim(),
        location: $("#al-lo").value.trim(),
        value: +$("#al-v").value || 0,
        line: $("#al-li").value,
        stage: $("#al-st").value,
        message: $("#al-msg").value.trim(),
        source: "manual"
      };
      api("lead_save", payload).then(function (r) {
        if (r.ok) { toast("Lead added successfully!"); close(); after && after(); }
        else toast(r.error || "Save failed", true);
      });
    };
  }

  function exportCsv(list) {
    if (!list || !list.length) return toast("No leads to export", true);
    var head = ["ID", "Created", "Name", "Company", "Phone", "Email", "Location", "Line", "Stage", "Value", "Source"];
    var rows = list.map(function (l) {
      return [l.id, l.created_at, l.name, l.company, l.phone, l.email, l.location, l.line, l.stage, l.value || 0, l.source];
    });
    var csv = [head].concat(rows).map(function (r) {
      return r.map(function (c) { return '"' + String(c || "").replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "woodex-leads-" + today() + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importSheet(after) {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var lines = r.result.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return toast("Empty CSV", true);
        var header = lines[0].split(",").map(function (s) { return s.trim().replace(/^"|"$/g, "").toLowerCase(); });
        var rows = lines.slice(1).map(function (line) {
          var cells = line.split(",").map(function (s) { return s.trim().replace(/^"|"$/g, ""); });
          var obj = {}; header.forEach(function (h, i) { obj[h] = cells[i] || ""; }); return obj;
        });
        var proms = rows.map(function (item) {
          return api("lead_save", { action: "lead_save", name: item.name || item.contact || "Customer", phone: item.phone || "", email: item.email || "", company: item.company || "", location: item.location || item.city || item.address || "", source: "csv-import", stage: item.stage || "new" });
        });
        Promise.all(proms).then(function () {
          toast("Imported " + rows.length + " leads successfully!");
          after && after();
        });
      };
      r.readAsText(f);
    };
    inp.click();
  }
})();
