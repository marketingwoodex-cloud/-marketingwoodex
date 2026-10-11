/* Woodex Admin v2.7 — BULK DOCUMENT MANAGER (api/bulkdoc-lib.php, actions bd_*)
   Route: #/bulkdoc

   One place to answer "what documents exist for this period, and how do I get them out?".
   Block 1: the period (this month / last month / this quarter / this year / custom), a status
   filter that adapts to the document types you tick, and a search box. Block 2: four counters —
   documents, value at stake, types available, and how many documents carry no parsable date (so
   they can never be silently missing from a pack). Block 3: the catalogue with per-type counts,
   and the pack pane that turns the selection into a multi-sheet workbook, a CSV, or a printable
   packet in a new window.

   Everything is read live from the tables the owning screens write — this screen holds no data of
   its own, and building a pack changes nothing (the only write is one activity-log line). */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, head = W.head,
      can = W.can, fillIcons = W.fillIcons, VIEWS = W.VIEWS;

  var CSS = [
    ".bd-grid{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:18px;align-items:start}",
    "@media (max-width:1150px){.bd-grid{grid-template-columns:1fr}}",
    ".bd-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}",
    ".bd-filters label{margin:0}",
    ".bd-sums{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:10px 20px;border-top:1px solid var(--line);color:var(--mut);font-size:13px}",
    ".bd-sums b{color:var(--txt);font-size:15px}",
    ".bd-amt{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}",
    ".bd-note{color:var(--mut);font-size:12px}",
    ".bd-cat{width:100%}",
    ".bd-cat td:first-child{width:34px}",
    ".bd-cat tr.off{opacity:.5}",
    ".bd-prev{max-height:230px;overflow:auto}",
    ".bd-prev table{margin:0}",
    ".bd-warn{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-left:3px solid var(--warn);border-radius:8px;color:var(--mut);font-size:12px;margin:10px 0}",
    ".bd-empty{padding:24px 16px;text-align:center;color:var(--mut);font-size:13px}",
    ".bd-actions{display:grid;gap:8px}",
    ".bd-actions button{width:100%;justify-content:center}",
    ".bd-type{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0}",
    ".bd-type h4{margin:0 0 6px;font-size:13px;display:flex;justify-content:space-between;gap:10px}",
    ".bd-cover{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;border-bottom:2px solid var(--line);padding-bottom:10px;margin-bottom:14px}"
  ].join("");

  function style() {
    if ($("#bd-css")) return;
    var s = document.createElement("style"); s.id = "bd-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function money(n) { return "Rs " + Math.round(+n || 0).toLocaleString("en-PK"); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function monthStart() { return today().slice(0, 7) + "-01"; }
  function monthEnd() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
  function esc2(s) { return esc(String(s == null ? "" : s)); }

  /* Status values the backend accepts, per document type (they live in each owning lib). */
  var STATUS = {
    quotes: ["pending", "proposal", "done"],
    invoices: ["unpaid", "partial", "paid", "overdue"],
    milestones: ["pending", "done", "approved", "rejected"],
    expenses: ["paid", "pending", "credit"],
    leads: ["new", "contacted", "visit", "won", "lost"],
    activity: []
  };
  var PRESETS = [["month", "This month"], ["prev_month", "Last month"], ["quarter", "This quarter"], ["year", "This year"], ["custom", "Custom dates"]];

  var F = { preset: "month", from: monthStart(), to: monthEnd(), status: "", q: "" };
  var ST = { types: [], total: null, period: null, picked: {}, pack: null, busy: false };

  function shell() {
    return head("Document packs", "Money",
      '<button class="btn" id="bd-csv">' + ic("download") + "CSV</button>" +
      '<button class="btn" id="bd-xlsx">' + ic("table") + "Workbook</button>" +
      '<button class="btn pri" id="bd-print">' + ic("file-text") + "Print packet</button>") +
      '<div class="card"><div class="card-b"><div class="bd-filters">' +
        '<label>Period<select id="bd-p">' + PRESETS.map(function (p) {
          return '<option value="' + p[0] + '"' + (F.preset === p[0] ? " selected" : "") + ">" + p[1] + "</option>";
        }).join("") + "</select></label>" +
        '<label>From<input type="date" id="bd-f" value="' + esc(F.from) + '"></label>' +
        '<label>To<input type="date" id="bd-t" value="' + esc(F.to) + '"></label>' +
        '<label>Status<select id="bd-s"><option value="">Any status</option></select></label>' +
        '<label>Search<input id="bd-q" placeholder="Client, number or vendor" value="' + esc(F.q) + '"></label>' +
        '<label>&nbsp;<button class="btn" id="bd-go">' + ic("filter") + "Apply</button></label>" +
      "</div></div>" +
      '<div class="bd-sums" id="bd-sums"><span>Loading…</span></div></div>' +
      '<div class="kpis" id="bd-kpis" style="margin:18px 0"></div>' +
      '<div class="bd-grid">' +
        '<div class="card"><div class="card-h"><h3>Available documents <small class="muted" id="bd-n"></small></h3>' +
          '<span><button class="btn sm" id="bd-all">Select all</button><button class="btn sm" id="bd-none">Clear</button></span></div>' +
          '<div class="tbl-wrap"><table class="tbl sm bd-cat"><thead><tr><th></th><th>Document type</th><th class="bd-amt">Documents</th><th class="bd-amt">Value</th></tr></thead>' +
          '<tbody id="bd-rows"><tr><td colspan="4"><div class="bd-empty">Loading…</div></td></tr></tbody></table></div></div>' +
        '<div style="display:grid;gap:18px">' +
          '<div class="card"><div class="card-h"><h3>Pack</h3><small class="muted" id="bd-pk"></small></div>' +
            '<div class="card-b"><div class="bd-actions">' +
              '<button class="btn pri" id="bd-build">' + ic("layers") + "Build the pack</button>" +
              '<button class="btn" id="bd-xlsx2">' + ic("table") + "Download workbook (.xlsx)</button>" +
              '<button class="btn" id="bd-csv2">' + ic("download") + "Download CSV</button>" +
              '<button class="btn" id="bd-print2">' + ic("file-text") + "Print / save as PDF</button>" +
            "</div></div></div>" +
          '<div class="card"><div class="card-h"><h3>Preview</h3><small class="muted">first 10 rows per type</small></div>' +
            '<div class="card-b" id="bd-prev"><div class="bd-empty">Tick the document types you want, then press “Build the pack”.</div></div></div>' +
        "</div>" +
      "</div>";
  }

  function kpi(icon, label, value, foot) {
    return '<div class="card kpi"><div class="kpi-ic">' + ic(icon) + "</div><small>" + esc(label) + "</small>" +
      '<div class="kpi-row"><b>' + esc(value) + "</b></div>" +
      (foot ? '<div class="bd-note" style="margin-top:6px">' + foot + "</div>" : "") + "</div>";
  }

  function drawKpis() {
    var host = $("#bd-kpis"); if (!host) return;
    var t = ST.total || { documents: 0, value: 0 };
    var undated = ST.types.reduce(function (a, x) { return a + x.undated; }, 0);
    var picked = Object.keys(ST.picked).filter(function (k) { return ST.picked[k]; });
    var pickedDocs = ST.types.filter(function (x) { return ST.picked[x.id]; }).reduce(function (a, x) { return a + x.documents; }, 0);
    host.innerHTML =
      kpi("layers", "Documents in " + (ST.period ? ST.period.label : "the period"), String(t.documents), ST.types.length + " document types read from their own tables") +
      kpi("receipt", "Value covered", money(t.value), "invoice balance, quotation totals and certificate amounts") +
      kpi("check-circle", "Selected for the pack", String(pickedDocs), picked.length ? picked.length + " type" + (picked.length === 1 ? "" : "s") + " ticked" : "nothing ticked yet") +
      kpi(undated ? "triangle-alert" : "check-circle", "Undated documents", String(undated),
        undated ? "carry no parsable date — they stay out of any period pack on purpose" : "every document carries a date");
    fillIcons(host);
  }

  function drawRows() {
    var tb = $("#bd-rows"); if (!tb) return;
    if (!ST.types.length) { tb.innerHTML = '<tr><td colspan="4"><div class="bd-empty">No document types available to you.</div></td></tr>'; return; }
    tb.innerHTML = ST.types.map(function (x) {
      var on = !!ST.picked[x.id];
      return '<tr class="' + (on ? "" : "off") + '" data-type="' + esc(x.id) + '">' +
        '<td><input type="checkbox" data-pick="' + esc(x.id) + '"' + (on ? " checked" : "") + '></td>' +
        "<td><b>" + esc(x.label) + "</b>" + (x.truncated ? ' <span class="badge warn">capped</span>' : "") +
          '<br><span class="bd-note">' + esc(x.note) + "</span></td>" +
        '<td class="bd-amt">' + x.documents + "</td>" +
        '<td class="bd-amt">' + (x.value_column ? money(x.value) : '<span class="bd-note">—</span>') + "</td></tr>";
    }).join("");
    var n = $("#bd-n"); if (n) n.textContent = ST.types.reduce(function (a, x) { return a + x.documents; }, 0) + " documents";
    fillStatus();
  }

  function fillStatus() {
    var sel = $("#bd-s"); if (!sel) return;
    var picked = Object.keys(ST.picked).filter(function (k) { return ST.picked[k]; });
    var pool = {}, list = [];
    picked.forEach(function (t) { (STATUS[t] || []).forEach(function (s) { if (!pool[s]) { pool[s] = 1; list.push([s, picked.length > 1 ? t + " · " + s : s]); } }); });
    sel.innerHTML = '<option value="">Any status</option>' + list.map(function (p) {
      return '<option value="' + esc(p[0]) + '"' + (F.status === p[0] ? " selected" : "") + ">" + esc(p[1]) + "</option>";
    }).join("");
    sel.disabled = !list.length;
  }

  function drawSums() {
    var host = $("#bd-sums"); if (!host) return;
    var t = ST.total || { documents: 0, value: 0 };
    host.innerHTML = "<span>Period <b>" + esc(ST.period ? ST.period.label : "—") + "</b></span>" +
      "<span>Documents <b>" + t.documents + "</b></span>" +
      "<span>Value <b>" + money(t.value) + "</b></span>" +
      '<span class="bd-note">A pack is built from live data — nothing is cached, nothing is changed.</span>';
  }

  function preview(pack) {
    var host = $("#bd-prev"); if (!host) return;
    var keys = Object.keys(pack);
    if (!keys.length) { host.innerHTML = '<div class="bd-empty">Nothing matched — widen the period or clear the status filter.</div>'; return; }
    host.innerHTML = keys.map(function (k) {
      var t = pack[k];
      var head2 = t.columns.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("");
      var body = t.rows.slice(0, 10).map(function (r) {
        return "<tr>" + r.map(function (v) { return "<td>" + esc2(v) + "</td>"; }).join("") + "</tr>";
      }).join("");
      return '<div class="bd-type"><h4><span>' + esc(t.label) + '</span><span class="bd-note">' + t.documents +
        " document" + (t.documents === 1 ? "" : "s") + (t.value ? " · " + money(t.value) : "") + "</span></h4>" +
        (t.rows.length ? '<div class="bd-prev"><table class="tbl sm"><thead><tr>' + head2 + "</tr></thead><tbody>" + body + "</tbody></table></div>" : '<span class="bd-note">No documents in this period.</span>') +
        (t.rows.length > 10 ? '<div class="bd-note" style="margin-top:6px">… and ' + (t.rows.length - 10) + " more in the export</div>" : "") +
        (t.truncated ? '<div class="bd-warn">' + ic("triangle-alert") + "<span>This type hit the 2,000-row safety cap. Narrow the period to get every document.</span></div>" : "") +
        (t.undated ? '<div class="bd-warn">' + ic("info") + "<span>" + t.undated + " document(s) of this type carry no parsable date and are outside every period pack — open the owning screen to fix the date.</span></div>" : "") +
        "</div>";
    }).join("");
    fillIcons(host);
  }

  /* ---------------------------------------------------------------- data */
  function loadTypes() {
    api("bd_types", { preset: F.preset, from: F.from, to: F.to }).then(function (r) {
      if (!r.ok) { toast(r.error || "Could not read the document catalogue", true); return; }
      ST.types = r.types; ST.total = r.total; ST.period = r.period;
      if (ST.period) { F.from = ST.period.from; F.to = ST.period.to; $("#bd-f").value = F.from; $("#bd-t").value = F.to; }
      drawKpis(); drawRows(); drawSums();
    });
  }
  function build(silent) {
    var picked = Object.keys(ST.picked).filter(function (k) { return ST.picked[k]; });
    if (!picked.length) { if (!silent) toast("Tick at least one document type first", true); return Promise.resolve(null); }
    ST.busy = true;
    return api("bd_pack", { types: picked, preset: F.preset, from: F.from, to: F.to, status: F.status, q: F.q }).then(function (r) {
      ST.busy = false;
      if (!r.ok) { toast(r.error || "Could not build the pack", true); return null; }
      ST.pack = r; preview(r.pack);
      var pk = $("#bd-pk"); if (pk) pk.textContent = r.total.documents + " documents · " + money(r.total.value);
      toast(r.total.documents + " document" + (r.total.documents === 1 ? "" : "s") + " ready in the pack");
      return r;
    });
  }

  /* ---------------------------------------------------------------- exports */
  function stamp() { return today() + "-" + (ST.period ? ST.period.from + "_" + ST.period.to : "pack"); }
  function csv() {
    build(true).then(function (r) {
      if (!r) return;
      var lines = ["# Woodex document pack", "# Period," + r.period.from + " to " + r.period.to, "# Built," + r.total.generated_at + " by " + r.total.by,
        "# Documents," + r.total.documents, "# Value," + r.total.value, ""];
      Object.keys(r.pack).forEach(function (k) {
        var t = r.pack[k];
        lines.push("# " + t.label.toUpperCase() + " (" + t.documents + ")");
        lines.push(t.columns.map(cell).join(","));
        t.rows.forEach(function (row) { lines.push(row.map(cell).join(",")); });
        lines.push("");
      });
      var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "woodex-document-pack-" + stamp() + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
      toast(r.total.documents + " documents exported to CSV");
    });
  }
  function cell(v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

  function workbook() {
    build(true).then(function (r) {
      if (!r) return;
      if (!W.xlsxBook) { toast("The Excel writer is not loaded on this page", true); return; }
      var sheets = [{ name: "Pack summary", rows: [["Document pack"], ["Period", r.period.from + " → " + r.period.to], ["Built", r.total.generated_at],
        ["By", r.total.by], ["Documents", r.total.documents], ["Value (Rs)", r.total.value], ["Undated (excluded)", r.total.undated], []] }];
      Object.keys(r.pack).forEach(function (k) {
        var t = r.pack[k];
        sheets.push({ name: t.label, rows: [t.columns].concat(t.rows) });
      });
      W.xlsxBook("woodex-document-pack-" + stamp(), sheets);
      toast(Object.keys(r.pack).length + " sheet" + (Object.keys(r.pack).length === 1 ? "" : "s") + " written to the workbook");
    });
  }

  function packet() {
    build(true).then(function (r) {
      if (!r) return;
      var doc = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Woodex document pack " + esc(r.period.from) + " → " + esc(r.period.to) + "</title>" +
        "<style>@page{size:A4;margin:14mm}" +
        "body{font:12px/1.45 system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:18px}" +
        "h1{font-size:19px;margin:0 0 2px}h2{font-size:14px;margin:22px 0 6px;padding-bottom:4px;border-bottom:1.5px solid #0c1628}" +
        "table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #d8dee7;padding:4px 6px;text-align:left;vertical-align:top}" +
        "th{background:#f1f5f9;font-weight:600}td.n,th.n{text-align:right}" +
        ".meta{display:flex;gap:18px;flex-wrap:wrap;color:#475569;font-size:11px;margin-bottom:8px}" +
        ".brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0c1628;padding-bottom:8px;margin-bottom:12px}" +
        ".brand b{font-size:15px}.sec{page-break-inside:avoid}" +
        "footer{margin-top:18px;border-top:1px solid #d8dee7;padding-top:6px;color:#64748b;font-size:10px}" +
        "@media print{.noprint{display:none}}</style></head><body>" +
        '<div class="noprint" style="margin-bottom:12px"><button onclick="window.print()">Print / save as PDF</button></div>' +
        '<div class="brand"><div><b>Woodex Interior — ' + esc("document pack") + "</b><br><span>" + esc("woodex.com.pk") + "</span></div>" +
        "<div style=\"text-align:right\">" + esc(r.period.from) + " → " + esc(r.period.to) + "<br>" + esc(r.total.documents) + " documents · " + esc(money(r.total.value)) + "</div></div>" +
        '<div class="meta"><span>Built ' + esc(r.total.generated_at) + "</span><span>By " + esc(r.total.by) + "</span><span>" + esc(r.total.types) + " document type(s)</span>" +
        (r.total.undated ? "<span>" + esc(r.total.undated) + " undated document(s) excluded</span>" : "") + "</div>";
      Object.keys(r.pack).forEach(function (k) {
        var t = r.pack[k];
        doc += '<section class="sec"><h2>' + esc(t.label) + " <span style=\"font-weight:400;color:#64748b\">· " + t.documents + " document(s)</span></h2>";
        if (!t.rows.length) doc += '<p style="color:#64748b">No documents in this period.</p>';
        else {
          doc += "<table><thead><tr>" + t.columns.map(function (c, i) {
            return "<th" + (i > 0 && /Rs|%/.test(c) ? ' class="n"' : "") + ">" + esc(c) + "</th>";
          }).join("") + "</tr></thead><tbody>" + t.rows.map(function (row) {
            return "<tr>" + row.map(function (v, i) {
              return "<td" + (i > 0 && typeof v === "number" ? ' class="n"' : "") + ">" + esc2(v) + "</td>";
            }).join("") + "</tr>";
          }).join("") + "</tbody></table>";
        }
        doc += "</section>";
      });
      doc += '<footer>Woodex Interior · ' + esc(r.period.label) + " · generated by " + esc(r.total.by) + " on " + esc(r.total.generated_at) +
        ". Figures are PKR; invoice rows show the outstanding balance, quotations the total including GST.</footer></body></html>";
      var w = window.open("", "_blank");
      if (!w) { toast("The browser blocked the packet window — allow pop-ups for the admin", true); return; }
      w.document.open(); w.document.write(doc); w.document.close();
      setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
    });
  }

  /* ---------------------------------------------------------------- events */
  function bind() {
    $("#bd-p").onchange = function () { F.preset = this.value; loadTypes(); };
    $("#bd-go").onclick = function () {
      F.from = $("#bd-f").value || monthStart(); F.to = $("#bd-t").value || monthEnd();
      if (F.preset !== "custom") F.preset = "custom";
      $("#bd-p").value = "custom";
      loadTypes();
    };
    $("#bd-s").onchange = function () { F.status = this.value; };
    var q = $("#bd-q"), t = null;
    q.oninput = function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { F.q = v; }, 350); };
    $("#bd-all").onclick = function () { ST.types.forEach(function (x) { ST.picked[x.id] = true; }); drawRows(); drawKpis(); };
    $("#bd-none").onclick = function () { ST.picked = {}; drawRows(); drawKpis(); };
    $("#bd-rows").onclick = function (e) {
      var box = e.target.closest("[data-pick]"); if (!box) return;
      ST.picked[box.dataset.pick] = box.checked;
      var tr = e.target.closest("tr"); if (tr) tr.className = box.checked ? "" : "off";
      drawKpis(); fillStatus();
    };
    $("#bd-build").onclick = function () { build(false); };
    $("#bd-xlsx").onclick = workbook; $("#bd-xlsx2").onclick = workbook;
    $("#bd-csv").onclick = csv; $("#bd-csv2").onclick = csv;
    $("#bd-print").onclick = packet; $("#bd-print2").onclick = packet;
  }

  VIEWS.bulkdoc = function (el) {
    style();
    if (!can("owner,admin,sales")) {
      el.innerHTML = head("Document packs", "Money") + '<div class="card"><div class="bd-empty">' +
        esc("Documents are available to the Master, Managers and Sales.") + "</div></div>";
      return;
    }
    el.innerHTML = shell();
    bind();
    loadTypes();
  };
})();
