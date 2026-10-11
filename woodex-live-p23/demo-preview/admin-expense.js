/* Woodex Admin v2.7 — EXPENSE LOG (api/expense-lib.php, actions exp_*)
   Route: #/expenses   ·   Master and Manager only (the API enforces it too; this is the UI half)

   The shop's cash book. Block 1: month + filters + the toolbar actions. Block 2: five money KPIs
   for the month (spent, GST, waiting for approval, on credit, projected from the run-rate). Block
   3: the voucher table, and beside it the category breakdown with budget-versus-actual bars, the
   postings per office, the fixed monthly costs with the copy-forward action, and the budget editor.

   Amounts are pre-tax PKR with GST held separately at 18 % by default, so a Rs 100,000 board bill
   reads 100,000 + 18,000 GST = 118,000 cash out, and the month's GST figure is what gets filed. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, head = W.head,
      can = W.can, fillIcons = W.fillIcons, VIEWS = W.VIEWS;

  var CSS = [
    ".ex-wrap{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}",
    "@media (max-width:1100px){.ex-wrap{grid-template-columns:1fr}}",
    ".ex-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}",
    ".ex-filters label{margin:0}",
    ".ex-sums{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:10px 20px;border-top:1px solid var(--line);color:var(--mut);font-size:13px}",
    ".ex-sums b{color:var(--txt);font-size:15px}",
    ".ex-amt{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}",
    ".ex-tot{font-weight:700}",
    ".ex-mut{color:var(--mut);font-size:12px}",
    ".ex-chip{display:inline-block;padding:1px 8px;border-radius:999px;background:var(--pri-soft);color:var(--pri);font-size:11px;white-space:nowrap}",
    ".ex-receipt{display:inline-flex;align-items:center;gap:4px;color:var(--info);font-size:12px;text-decoration:none}",
    ".ex-receipt:hover{text-decoration:underline}",
    ".ex-bars{display:grid;gap:12px}",
    ".ex-bar{display:grid;gap:5px}",
    ".ex-bar i{display:flex;justify-content:space-between;gap:10px;font-style:normal;font-size:12px;color:var(--mut)}",
    ".ex-bar i b{color:var(--txt);font-weight:600}",
    ".ex-bar u{display:block;height:8px;border-radius:999px;background:var(--bg);overflow:hidden;text-decoration:none}",
    ".ex-bar u s{display:block;height:100%;background:var(--pri);text-decoration:none}",
    ".ex-bar.over u s{background:var(--bad)}",
    ".ex-bar.over i b{color:var(--bad)}",
    ".ex-list{display:grid;gap:8px}",
    ".ex-li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}",
    ".ex-li:last-child{border-bottom:0}",
    ".ex-li small{color:var(--mut);font-size:12px}",
    ".ex-empty{padding:26px 18px;text-align:center;color:var(--mut);font-size:13px}",
    ".ex-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}",
    "@media (max-width:700px){.ex-grid{grid-template-columns:1fr}}",
    ".ex-foot{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:16px}",
    ".ex-cap{display:grid;grid-template-columns:1fr 130px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}",
    ".ex-cap:last-child{border-bottom:0}",
    ".ex-cap input{margin:0;text-align:right}",
    ".ex-actions{white-space:nowrap;text-align:right}",
    ".ex-actions button{margin-left:4px}",
    ".ex-tag{display:inline-flex;align-items:center;gap:3px;color:var(--pri);font-size:11px}",
    ".ex-err{color:var(--bad);font-size:13px;min-height:18px;margin:8px 0 0}"
  ].join("");

  function style() {
    if ($("#ex-css")) return;
    var s = document.createElement("style"); s.id = "ex-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthLabel(m) { var p = String(m || "").split("-"); return p.length === 2 ? MONTHS[+p[1] - 1] + " " + p[0] : String(m); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function money(n) { return "Rs " + Math.round(+n || 0).toLocaleString("en-PK"); }
  function money2(n) { return "Rs " + (+n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dayLabel(d) { var p = String(d).split("-"); return p.length === 3 ? p[2] + " " + MONTHS[+p[1] - 1].slice(0, 3) : String(d); }
  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var F = { month: ls("wxExpMonth", today().slice(0, 7)), cat: "", node: "", status: "", pay: "", q: "" };
  var ST = { rows: [], totals: null, kpis: null, meta: null, busy: false };
  var BADGE = { paid: "ok", pending: "warn", credit: "info" };
  function statusLabel(s) { return { paid: "Paid", pending: "Pending", credit: "On credit" }[s] || s; }

  function opts(list, cur, all) {
    var h = '<option value="">' + esc(all) + "</option>";
    Object.keys(list || {}).forEach(function (k) {
      h += '<option value="' + esc(k) + '"' + (String(cur) === String(k) ? " selected" : "") + ">" + esc(list[k]) + "</option>";
    });
    return h;
  }
  function nodeOpts(cur) {
    var h = '<option value="">All locations</option>';
    ((ST.meta && ST.meta.nodes) || []).forEach(function (n) {
      h += '<option value="' + esc(n) + '"' + (cur === n ? " selected" : "") + ">" + esc(n) + "</option>";
    });
    return h;
  }

  /* ------------------------------------------------------- block 1 + the block 3 shell */
  function shell() {
    return head("Expense log", "Money",
      '<button class="btn" id="ex-csv">' + ic("download") + "Export CSV</button>" +
      '<button class="btn" id="ex-bud">' + ic("gauge") + "Budgets</button>" +
      '<button class="btn pri" id="ex-new">' + ic("plus") + "Log expense</button>") +
      '<div class="card"><div class="card-b"><div class="ex-filters">' +
        '<label>Month<input type="month" id="ex-m" value="' + esc(F.month) + '"></label>' +
        '<label>Category<select id="ex-f-cat"></select></label>' +
        '<label>Location<select id="ex-f-node"></select></label>' +
        '<label>Status<select id="ex-f-st"></select></label>' +
        '<label>Paid by<select id="ex-f-pay"></select></label>' +
        '<label>Search<input id="ex-f-q" placeholder="Vendor, detail or project" value="' + esc(F.q) + '"></label>' +
      "</div></div>" +
      '<div class="ex-sums" id="ex-sums"><span>Loading…</span></div></div>' +
      '<div class="kpis" id="ex-kpis" style="margin:18px 0"></div>' +
      '<div class="ex-wrap">' +
        '<div class="card"><div class="card-h"><h3>Vouchers <small class="muted" id="ex-n"></small></h3>' +
          '<button class="btn sm" id="ex-today">Today</button></div>' +
          '<div class="tbl-wrap"><table class="tbl sm"><thead><tr>' +
            "<th>Date</th><th>Category</th><th>Payee / detail</th><th>Loc</th><th>Mode</th>" +
            '<th class="ex-amt">Amount</th><th class="ex-amt">GST</th><th>Status</th><th></th>' +
          '</tr></thead><tbody id="ex-rows"><tr><td colspan="9"><div class="ex-empty">Loading…</div></td></tr></tbody></table></div></div>' +
        '<div style="display:grid;gap:18px">' +
          '<div class="card"><div class="card-h"><h3>By category</h3><small class="muted">budget vs spent</small></div>' +
            '<div class="card-b ex-bars" id="ex-cats"><span class="ex-mut">Loading…</span></div></div>' +
          '<div class="card"><div class="card-h"><h3>By location</h3></div>' +
            '<div class="card-b ex-list" id="ex-nodes"><span class="ex-mut">Loading…</span></div></div>' +
          '<div class="card"><div class="card-h"><h3>Fixed monthly</h3>' +
            '<button class="btn sm" id="ex-copy" title="Copies every voucher marked as repeating from last month into this month, as pending">' + ic("copy") + "Copy last month</button></div>" +
            '<div class="card-b ex-list" id="ex-rec"><span class="ex-mut">Loading…</span></div></div>' +
        "</div>" +
      "</div>";
  }

  /* ------------------------------------------------------- block 2: KPIs */
  function kpi(icon, label, value, foot) {
    return '<div class="card kpi"><div class="kpi-ic">' + ic(icon) + "</div><small>" + esc(label) + "</small>" +
      '<div class="kpi-row"><b>' + esc(value) + "</b></div>" +
      (foot ? '<div class="ex-mut" style="margin-top:6px">' + foot + "</div>" : "") + "</div>";
  }
  function drawKpis() {
    var k = ST.kpis, host = $("#ex-kpis"); if (!host || !k) return;
    var over = k.over_budget.length;
    host.innerHTML =
      kpi("receipt", "Spent in " + monthLabel(k.month), money(k.sum),
        k.count + " voucher" + (k.count === 1 ? "" : "s") + " · with GST " + money(k.with_tax)) +
      kpi("file-text", "GST on the month", money(k.tax), "withheld at source " + money(k.wht)) +
      kpi("clock", "Waiting for approval", money(k.pending.value), k.pending.n + " pending voucher" + (k.pending.n === 1 ? "" : "s")) +
      kpi("arrow-up", "On credit", money(k.credit.value), k.credit.n + " payable to vendors") +
      kpi("bar-chart-3", "Projected month-end", money(k.projected), "day " + k.day + " of " + k.days + " · " + money(k.avg_day) + " a day") +
      (over ? '<div class="card kpi" style="border-color:var(--bad)"><div class="kpi-ic">' + ic("triangle-alert") + "</div><small>Over budget</small>" +
        '<div class="kpi-row"><b>' + over + '</b></div><div class="ex-mut" style="margin-top:6px">' +
        over + " categor" + (over === 1 ? "y is" : "ies are") + " above the cap set in Budgets</div></div>" : "");
    fillIcons(host);
  }

  /* ------------------------------------------------------- block 3: table + panels */
  function drawRows() {
    var tb = $("#ex-rows"); if (!tb) return;
    if (!ST.rows.length) {
      var filtered = !!(F.cat || F.node || F.status || F.pay || F.q);
      tb.innerHTML = '<tr><td colspan="9"><div class="ex-empty">No vouchers for ' + esc(monthLabel(F.month)) +
        (filtered ? " with these filters — clear one and try again." : ". Log the first one with “Log expense”.") + "</div></td></tr>";
      return;
    }
    tb.innerHTML = ST.rows.map(function (r) {
      return '<tr data-id="' + r.id + '">' +
        "<td>" + esc(dayLabel(r.spent_on)) + '<br><span class="ex-mut">' + esc(r.spent_on) + "</span></td>" +
        '<td><span class="ex-chip">' + esc(r.cat_label) + "</span>" + (r.recurring ? '<br><span class="ex-tag">' + ic("refresh-cw") + "fixed</span>" : "") + "</td>" +
        "<td>" + esc(r.vendor || "—") + (r.detail ? '<br><span class="ex-mut">' + esc(r.detail) + "</span>" : "") +
          (r.project ? '<br><span class="ex-mut">project ' + esc(r.project) + "</span>" : "") + "</td>" +
        '<td><span class="ex-mut">' + esc(r.node) + "</span></td>" +
        "<td>" + esc(r.pay_label) + (r.receipt ? '<br><a class="ex-receipt" href="' + esc(r.receipt) + '" target="_blank" rel="noopener">' + ic("paperclip") + "bill</a>" : "") + "</td>" +
        '<td class="ex-amt ex-tot">' + money2(r.amount) + "</td>" +
        '<td class="ex-amt">' + (r.tax_amt ? money(r.tax_amt) + '<br><span class="ex-mut">' + esc(r.tax_pct) + "%</span>" : '<span class="ex-mut">—</span>') + "</td>" +
        '<td><span class="badge ' + (BADGE[r.status] || "ok") + '">' + esc(statusLabel(r.status)) + "</span></td>" +
        '<td class="ex-actions"><button class="btn sm" data-ex="edit" title="Edit">' + ic("square-pen") + "</button>" +
          '<button class="btn sm" data-ex="dup" title="Copy to a new pending voucher">' + ic("copy") + "</button>" +
          '<button class="btn sm" data-ex="del" title="Delete">' + ic("x") + "</button></td></tr>";
    }).join("");
    fillIcons(tb);
  }

  function drawTotals() {
    var host = $("#ex-sums"), t = ST.totals, k = ST.kpis || {}; if (!host) return;
    host.innerHTML = "<span>" + esc(monthLabel(F.month)) + " · <b>" + (t ? t.amount.toLocaleString("en-PK") : "0") + "</b> before GST</span>" +
      "<span>GST <b>" + (t ? t.tax.toLocaleString("en-PK") : "0") + "</b></span>" +
      "<span>Cash out <b>" + (t ? t.with_tax.toLocaleString("en-PK") : "0") + "</b></span>" +
      (k.recurring ? "<span>Fixed <b>" + k.recurring.value.toLocaleString("en-PK") + "</b> over " + k.recurring.n + " voucher" + (k.recurring.n === 1 ? "" : "s") + "</span>" : "");
    var n = $("#ex-n"); if (n) n.textContent = ST.rows.length + " row" + (ST.rows.length === 1 ? "" : "s");
  }

  function drawCats() {
    var host = $("#ex-cats"), k = ST.kpis; if (!host || !k) return;
    if (!k.by_cat.length) { host.innerHTML = '<span class="ex-mut">Nothing logged this month yet.</span>'; return; }
    var max = Math.max.apply(null, k.by_cat.map(function (c) { return Math.max(c.amount, k.caps[c.key] || 0); })) || 1;
    host.innerHTML = k.by_cat.map(function (c) {
      var cap = k.caps[c.key] || 0, over = cap > 0 && c.amount > cap;
      var pct = Math.max(3, Math.round((c.amount / max) * 100));
      return '<div class="ex-bar' + (over ? " over" : "") + '"><i><span>' + esc(c.label) + ' <span class="ex-mut">· ' + c.n + "</span></span><b>" + money(c.amount) + "</b></i>" +
        '<u aria-hidden="true"><s style="width:' + pct + '%"></s></u>' +
        (cap > 0 ? '<i><span class="ex-mut">cap ' + money(cap) + "</span><span" + (over ? ' style="color:var(--bad)"' : "") + ">" + Math.round((c.amount / cap) * 100) + "%</span></i>" : "") + "</div>";
    }).join("");
  }

  function drawNodes() {
    var host = $("#ex-nodes"), k = ST.kpis; if (!host || !k) return;
    if (!k.by_node.length) { host.innerHTML = '<span class="ex-mut">No postings yet this month.</span>'; return; }
    var sum = k.by_node.reduce(function (a, x) { return a + x.amount; }, 0) || 1;
    host.innerHTML = k.by_node.map(function (x) {
      return '<div class="ex-li"><span><b>' + esc(x.key) + '</b> <small>' + x.n + " voucher" + (x.n === 1 ? "" : "s") + "</small></span>" +
        "<span>" + money(x.amount) + ' <small>' + Math.round((x.amount / sum) * 100) + "%</small></span></div>";
    }).join("");
  }

  function drawRec() {
    var host = $("#ex-rec"); if (!host) return;
    var fixed = ST.rows.filter(function (r) { return r.recurring; });
    host.innerHTML = fixed.length
      ? fixed.map(function (r) {
          return '<div class="ex-li"><span><b>' + esc(r.vendor || r.cat_label) + '</b><br><small>' + esc(r.cat_label) + " · day " + esc(String(r.spent_on).slice(8)) + "</small></span><span>" + money(r.amount) + "</span></div>";
        }).join("")
      : '<span class="ex-mut">No fixed costs marked yet. Tick “repeats every month” on the rent, wages or internet vouchers and they can be carried forward.</span>';
  }

  /* ------------------------------------------------------- data */
  function load() {
    if (ST.busy) return;
    ST.busy = true;
    api("exp_list", { month: F.month, cat: F.cat, node: F.node, status: F.status, pay: F.pay, q: F.q }).then(function (r) {
      ST.busy = false;
      if (!r.ok) { toast(r.error || "Could not load the expense log", true); return; }
      ST.rows = r.items || []; ST.totals = r.totals;
      if (r.meta) ST.meta = r.meta;
      fillFilters(); drawRows(); drawTotals();
    });
    api("exp_kpis", { month: F.month }).then(function (r) {
      if (!r.ok) return;
      ST.kpis = r.kpis; drawKpis(); drawCats(); drawNodes(); drawRec(); drawTotals();
    });
  }

  function fillFilters() {
    var m = ST.meta; if (!m) return;
    var c = $("#ex-f-cat"), n = $("#ex-f-node"), s = $("#ex-f-st"), p = $("#ex-f-pay");
    if (c && !c.options.length) c.innerHTML = opts(m.categories, F.cat, "All categories");
    if (n && !n.options.length) n.innerHTML = nodeOpts(F.node);
    if (s && !s.options.length) s.innerHTML = opts(m.status, F.status, "Any status");
    if (p && !p.options.length) p.innerHTML = opts(m.pay, F.pay, "Any method");
  }

  /* ------------------------------------------------------- voucher modal */
  function editor(row) {
    var r = row || {
      spent_on: today(), category: "board", node: ls("wxExpNode", "LHR"), vendor: "", detail: "",
      amount: "", tax_pct: 18, wht_amt: 0, paid_by: "cash", status: "paid", project: "", receipt: "", recurring: 0, note: ""
    };
    var m = ST.meta || { categories: {}, pay: {}, status: {}, nodes: [] };
    W.modal("<h2>" + (row ? "Edit voucher #" + row.id : "Log an expense") + '</h2><div class="ex-grid">' +
      '<label>Date spent<input type="date" id="ex-d" value="' + esc(r.spent_on) + '"></label>' +
      '<label>Category<select id="ex-c">' + opts(m.categories, r.category, "Pick a category") + "</select></label>" +
      '<label>Paid to (vendor / shop)<input id="ex-v" value="' + esc(r.vendor) + '" placeholder="Pak Boards, Gulberg"></label>' +
      '<label>Location<select id="ex-n2">' + nodeOpts(r.node) + "</select></label>" +
      '<label>Amount before GST (Rs)<input id="ex-a" type="number" min="0" step="0.01" value="' + esc(r.amount) + '"></label>' +
      '<label>GST %<input id="ex-t" type="number" min="0" max="30" step="0.5" value="' + esc(r.tax_pct) + '"></label>' +
      '<label>Withheld at source (Rs)<input id="ex-w" type="number" min="0" step="0.01" value="' + esc(r.wht_amt) + '"></label>' +
      '<label>Paid by<select id="ex-pb">' + opts(m.pay, r.paid_by, "Pick a method") + "</select></label>" +
      '<label>Status<select id="ex-st">' + opts(m.status, r.status, "Pick a status") + "</select></label>" +
      '<label>Project / client ref<input id="ex-pj" value="' + esc(r.project) + '" placeholder="NODE-26-014"></label>' +
      '<label class="span2">Detail <small class="muted">(prints as the narration)</small><textarea id="ex-det" rows="2">' + esc(r.detail) + "</textarea></label>" +
      '<label class="span2">Bill scan path <small class="muted">(/assets/uploads/… — copy it from Media)</small><input id="ex-rc" value="' + esc(r.receipt) + '"></label>' +
      "</div>" +
      '<label class="check"><input type="checkbox" id="ex-rec"' + (r.recurring ? " checked" : "") + "> Repeats every month (rent, wages, internet — can be copied forward)</label>" +
      '<label>Note<input id="ex-nt" value="' + esc(r.note) + '"></label>' +
      '<div class="ex-sums" id="ex-live"></div><p class="ex-err" id="ex-e"></p>' +
      '<div class="ex-foot"><span class="ex-mut">' + (row ? "Editing voucher #" + row.id : "New voucher") + '</span><span>' +
      '<button class="btn" id="ex-x">Cancel</button> <button class="btn pri" id="ex-s">' + ic("check") + (row ? "Save changes" : "Log expense") + "</button></span></div>", "wide");
    fillIcons($("#modal-card"));

    function live() {
      var a = +$("#ex-a").value || 0, t = +$("#ex-t").value || 0, w = +$("#ex-w").value || 0;
      var gst = Math.round(a * t) / 100;
      $("#ex-live").innerHTML = "<span>Before GST <b>" + money2(a) + "</b></span><span>GST <b>" + money2(gst) + "</b></span>" +
        "<span>Bill total <b>" + money2(a + gst) + "</b></span><span>Cash out <b>" + money2(Math.max(0, a + gst - w)) + "</b></span>";
    }
    ["ex-a", "ex-t", "ex-w"].forEach(function (id) { var n = $("#" + id); if (n) n.oninput = live; });
    live();
    $("#ex-x").onclick = W.closeModal;
    $("#ex-s").onclick = function () {
      var b = $("#ex-s"); b.disabled = true;
      api("exp_save", {
        id: row ? row.id : 0, spent_on: $("#ex-d").value, category: $("#ex-c").value, node: $("#ex-n2").value,
        vendor: $("#ex-v").value, detail: $("#ex-det").value, amount: +$("#ex-a").value || 0, tax_pct: +$("#ex-t").value || 0,
        wht_amt: +$("#ex-w").value || 0, paid_by: $("#ex-pb").value, status: $("#ex-st").value, project: $("#ex-pj").value,
        receipt: $("#ex-rc").value, recurring: $("#ex-rec").checked ? 1 : 0, note: $("#ex-nt").value
      }).then(function (res) {
        b.disabled = false;
        if (!res.ok) { $("#ex-e").textContent = res.error || "Could not save the voucher"; return; }
        save("wxExpNode", $("#ex-n2").value);
        toast(row ? "Voucher #" + row.id + " updated" : "Expense logged — " + money(res.item ? res.item.amount : 0) + " · " + (res.item ? res.item.cat_label : ""));
        W.closeModal(); load();
      });
    };
    setTimeout(function () { var f = $("#ex-v"); if (f) f.focus(); }, 30);
  }

  /* ------------------------------------------------------- budgets modal */
  function budgets() {
    var m = ST.meta || { categories: {} }, caps = (ST.kpis && ST.kpis.caps) || {};
    var spent = {}; ((ST.kpis && ST.kpis.by_cat) || []).forEach(function (c) { spent[c.key] = c.amount; });
    W.modal("<h2>Monthly budget per category</h2><p class='muted'>A cap is the most you want to spend on that category in one month. Leave it empty for no cap. The bars on the screen turn red once a category passes its cap.</p>" +
      '<div style="max-height:52vh;overflow:auto">' + Object.keys(m.categories).map(function (k) {
        return '<div class="ex-cap"><span>' + esc(m.categories[k]) + ' <small class="ex-mut">spent ' + money(spent[k] || 0) + "</small></span>" +
          '<input type="number" min="0" step="500" data-cap="' + esc(k) + '" value="' + (caps[k] ? Math.round(caps[k]) : "") + '" placeholder="no cap"></div>';
      }).join("") + "</div>" +
      '<p class="ex-err" id="ex-be"></p><div class="ex-foot"><span class="ex-mut">Saved per category · PKR</span><span>' +
      '<button class="btn" id="ex-bx">Cancel</button> <button class="btn pri" id="ex-bs">' + ic("check") + "Save budgets</button></span></div>", "wide");
    fillIcons($("#modal-card"));
    $("#ex-bx").onclick = W.closeModal;
    $("#ex-bs").onclick = function () {
      var caps2 = {}, n = 0;
      $$("[data-cap]", $("#modal-card")).forEach(function (i) { var v = +i.value || 0; if (v > 0) { caps2[i.dataset.cap] = v; n++; } });
      var b = $("#ex-bs"); b.disabled = true;
      api("exp_budget_save", { caps: caps2, month: F.month }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { $("#ex-be").textContent = r.error || "Could not save the budgets"; return; }
        ST.kpis = r.kpis; toast(n + " monthly cap" + (n === 1 ? "" : "s") + " saved");
        W.closeModal(); drawKpis(); drawCats();
      });
    };
  }

  /* ------------------------------------------------------- CSV */
  function cell(v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csv() {
    if (!ST.rows.length) { toast("Nothing to export for this month and filter", true); return; }
    var rows = [["Date", "Category", "Vendor", "Detail", "Location", "Project", "Mode", "Status", "Amount", "GST %", "GST", "Withheld", "Bill total", "Repeating", "Logged by"]];
    ST.rows.forEach(function (r) {
      rows.push([r.spent_on, r.cat_label, r.vendor, r.detail, r.node, r.project, r.pay_label, statusLabel(r.status),
        r.amount, r.tax_pct, r.tax_amt, r.wht_amt, r.total, r.recurring ? "yes" : "", r.created_by]);
    });
    var text = rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n");
    var blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "woodex-expenses-" + F.month + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast(ST.rows.length + " voucher" + (ST.rows.length === 1 ? "" : "s") + " exported");
  }

  /* ------------------------------------------------------- events */
  function bind() {
    $("#ex-new").onclick = function () { editor(null); };
    $("#ex-bud").onclick = budgets;
    $("#ex-csv").onclick = csv;
    $("#ex-today").onclick = function () { F.month = today().slice(0, 7); save("wxExpMonth", F.month); $("#ex-m").value = F.month; load(); };
    $("#ex-m").onchange = function () { F.month = this.value || today().slice(0, 7); save("wxExpMonth", F.month); load(); };
    [["ex-f-cat", "cat"], ["ex-f-node", "node"], ["ex-f-st", "status"], ["ex-f-pay", "pay"]].forEach(function (pair) {
      var n = $("#" + pair[0]); if (n) n.onchange = function () { F[pair[1]] = this.value; load(); };
    });
    var q = $("#ex-f-q"), t = null;
    if (q) q.oninput = function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { F.q = v; load(); }, 350); };
    $("#ex-copy").onclick = function () {
      var b = $("#ex-copy"); b.disabled = true;
      api("exp_recurring_copy", { month: F.month }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { toast(r.error || "Could not copy the fixed costs", true); return; }
        if (r.kpis) ST.kpis = r.kpis;
        toast(r.added ? r.added + " fixed voucher" + (r.added === 1 ? "" : "s") + " copied from " + monthLabel(r.from)
          : "Nothing to copy — " + monthLabel(r.from) + " has no fixed vouchers, or they are already in " + monthLabel(r.month));
        load();
      });
    };
    $("#ex-rows").onclick = function (e) {
      var b = e.target.closest("[data-ex]"); if (!b) return;
      var tr = e.target.closest("tr"), id = +(tr && tr.dataset.id || 0);
      var row = ST.rows.filter(function (r) { return r.id === id; })[0]; if (!row) return;
      if (b.dataset.ex === "edit") { editor(row); return; }
      if (b.dataset.ex === "del") {
        if (!confirm("Delete this voucher?\n\n" + row.cat_label + " · " + row.vendor + " · " + money2(row.amount) + " on " + row.spent_on +
          "\n\nThe deletion is recorded in the activity log.")) return;
        api("exp_del", { id: id }).then(function (r) { if (!r.ok) { toast(r.error || "Could not delete", true); return; } toast("Voucher deleted"); load(); });
        return;
      }
      if (b.dataset.ex === "dup") {
        api("exp_duplicate", { id: id }).then(function (r) {
          if (!r.ok) { toast(r.error || "Could not copy", true); return; }
          toast("Copied to a new pending voucher"); load();
        });
      }
    };
  }

  VIEWS.expenses = function (el) {
    style();
    if (!can("owner,admin")) {
      el.innerHTML = head("Expense log", "Money") + '<div class="card"><div class="ex-empty">' +
        esc("Costs and vendor bills are visible to the Master and to Managers only. Ask an owner for access.") + "</div></div>";
      return;
    }
    el.innerHTML = shell();
    bind();
    fillFilters();
    load();
  };
})();
