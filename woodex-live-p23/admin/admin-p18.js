/* Woodex Admin — P18 A3: billing pages.
   #/invoice/new  → full Create invoice page (line items, live totals) — uses the existing inv_new action.
   #/transactions → every payment received across invoices, totals cards, filters, receipt preview + PDF.
   Installs after all deferred scripts (DOMContentLoaded) so it wraps the final VIEWS.invoice. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var num = function (n) { return Math.round(+n || 0).toLocaleString("en-US"); };
  var today = function () { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  var dd = function (d) { if (!d) return "—"; var x = new Date(String(d).slice(0, 10) + "T00:00:00"); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  var api = function (a, b) { return W.api(a, b || {}); }, toast = function (m, bad) { W.toast(m, bad); };
  var ic = function (n) { return '<i data-i="' + n + '"></i>'; };
  var UNITS = [["nos", "nos"], ["sft", "sft"], ["rft", "rft"], ["set", "set"], ["job", "job"], ["each", "each"], ["lumpsum", "L/S"]];
  var head = function (title, crumb, tools) { return '<div class="ph"><div><h1>' + title + '</h1><div class="crumb"><a href="#/dashboard">Home</a> / ' + crumb + '</div></div><div class="toolbar">' + (tools || "") + "</div></div>"; };

  // ------------------------------------------------------------------ CREATE INVOICE
  function createInvoice(el) {
    var rows = [{ desc: "", qty: 1, unit: "nos", rate: "", disc: "" }], clients = [], picked = null;
    el.innerHTML = head("Create invoice", '<a href="#/invoices">Invoices</a> / New', '<a class="btn" href="#/invoices">Cancel</a><button class="btn pri" id="ci-go">' + ic("file-plus") + "Create invoice</button>") +
      '<div class="ci">' +
      '<div class="card"><div class="card-h"><h3>Invoice details</h3></div><div class="card-b ci-grid">' +
        '<label>Client / company *<input id="ci-c" list="ci-cl" placeholder="Search clients, or type a new company name" autocomplete="off"><datalist id="ci-cl"></datalist><small class="muted" id="ci-ch"></small></label>' +
        '<label>Business line<select id="ci-l"><option value="interior">Interior → WI- number</option><option value="furniture">Furniture → WF- number</option><option value="project">Project → WI- number</option></select></label>' +
        '<div class="ci-new" id="ci-new" hidden><label>Contact name<input id="ci-cn"></label><label>Phone<input id="ci-cp" placeholder="03xx xxxxxxx"></label><label class="span2">Customer address<input id="ci-ca" placeholder="Enter customer address"></label></div>' +
        '<label>Project<input id="ci-p" placeholder="e.g. Head office workstations"></label><label>PO #<input id="ci-po" placeholder="Client purchase order"></label>' +
        '<label>Payment condition<select id="ci-m"><option value="">Standard (as per terms)</option><option value="after_delivery">Payment after delivery</option></select></label>' +
        '<div class="ci-2"><label>Issue date<input id="ci-d" type="date" value="' + today() + '"></label><label>Due date<input id="ci-dd" type="date"></label></div>' +
        '<label>Delivery date<input id="ci-del" type="date"></label><label>Payment schedule<input id="ci-sc" placeholder="e.g. 50% advance, 50% on delivery"></label>' +
        '<label class="span2">Additional info <small class="muted">(printed as terms)</small><textarea id="ci-t" rows="3" placeholder="Terms or receipt info (optional)"></textarea></label>' +
      "</div></div>" +
      '<div class="card"><div class="card-h"><h3>Items</h3><button class="btn sm" id="ci-add">' + ic("plus") + 'Add item</button></div><div class="tbl-wrap"><table class="tbl ci-items"><thead><tr><th style="width:56px">S. No.</th><th>Products / description</th><th style="width:90px" class="r">Quantity</th><th style="width:96px">Unit</th><th style="width:130px" class="r">Unit cost</th><th style="width:120px" class="r">Discount</th><th style="width:130px" class="r">Total</th><th style="width:44px"></th></tr></thead><tbody id="ci-rows"></tbody></table></div>' +
        '<div class="ci-foot"><div class="ci-words"><small>Amount in words</small><span id="ci-w">—</span></div><div class="ci-tot">' +
          '<div><span>Subtotal</span><b id="ci-sub">0</b></div>' +
          '<div><span>Extra discount (Rs)</span><input id="ci-xd" type="number" min="0" placeholder="0"></div>' +
          '<div><span>Rent / transport (Rs)</span><input id="ci-r" type="number" min="0" placeholder="0"></div>' +
          '<div><span>Tax %</span><input id="ci-tx" type="number" min="0" max="50" step="0.5" placeholder="0"></div>' +
          '<div class="ci-tax"><span>Total tax</span><b id="ci-tax">0</b></div>' +
          '<div class="g"><span>Grand total (Rs)</span><b id="ci-gt">0</b></div></div></div></div>' +
      '<p class="err" id="ci-e"></p></div>';
    W.fillIcons(el);
    var lineTot = function (r) { return Math.max(0, Math.round(((+r.qty || 0) * (+r.rate || 0) - (+r.disc || 0)) * 100) / 100); };
    function calc() {
      var sub = Math.round(rows.reduce(function (a, r) { return a + lineTot(r); }, 0)), xd = Math.min(Math.max(0, +$("#ci-xd").value || 0), sub), rent = Math.max(0, +$("#ci-r").value || 0), tp = Math.min(Math.max(0, +$("#ci-tx").value || 0), 50);
      var tax = Math.round((sub - xd + rent) * tp / 100), gt = sub - xd + rent + tax;
      $("#ci-sub").textContent = num(sub); $("#ci-tax").textContent = num(tax); $("#ci-gt").textContent = num(gt);
      $("#ci-w").textContent = gt ? "Rupees " + WXPrint.words(gt) + " Only" : "—";
      $$("#ci-rows tr").forEach(function (tr, i) { var t = tr.querySelector("[data-t]"); if (t) t.textContent = num(lineTot(rows[i])); });
      return { sub: sub, xd: xd, rent: rent, tp: tp, gt: gt };
    }
    function draw() {
      $("#ci-rows").innerHTML = rows.map(function (r, i) {
        return "<tr><td class='muted'>" + (i + 1) + "</td><td><input data-k='desc' placeholder='Item or service' value='" + esc(r.desc) + "'></td><td><input data-k='qty' type='number' min='0' step='any' class='r' value='" + esc(r.qty) + "'></td>" +
          "<td><select data-k='unit'>" + UNITS.map(function (u) { return "<option value='" + u[0] + "'" + (u[0] === r.unit ? " selected" : "") + ">" + u[1] + "</option>"; }).join("") + "</select></td>" +
          "<td><input data-k='rate' type='number' min='0' step='any' class='r' placeholder='0' value='" + esc(r.rate) + "'></td><td><input data-k='disc' type='number' min='0' step='any' class='r' placeholder='0' value='" + esc(r.disc) + "'></td>" +
          "<td class='r nw'><b data-t>0</b></td><td><button class='icon-btn' data-x title='Remove'" + (rows.length < 2 ? " disabled" : "") + ">✕</button></td></tr>";
      }).join("");
      $$("#ci-rows tr").forEach(function (tr, i) {
        $$("[data-k]", tr).forEach(function (f) { f.oninput = f.onchange = function () { rows[i][f.dataset.k] = f.value; calc(); }; });
        tr.querySelector("[data-x]").onclick = function () { rows.splice(i, 1); draw(); };
      });
      calc();
    }
    draw();
    $("#ci-add").onclick = function () { rows.push({ desc: "", qty: 1, unit: "nos", rate: "", disc: "" }); draw(); var L = $$("#ci-rows [data-k=desc]"); L[L.length - 1].focus(); };
    ["#ci-xd", "#ci-r", "#ci-tx"].forEach(function (s) { $(s).oninput = calc; });
    var label = function (c) { return (c.company || c.name) + (c.phone ? " · " + c.phone : ""); };
    api("clients_master").then(function (r) { clients = r.clients || []; $("#ci-cl").innerHTML = clients.map(function (c) { return "<option value='" + esc(label(c)) + "'>"; }).join(""); });
    $("#ci-c").oninput = function () { var v = this.value.trim(); picked = clients.find(function (c) { return label(c) === v; }) || null; $("#ci-new").hidden = !v || !!picked; $("#ci-ch").textContent = picked ? "Existing client ✓" + (picked.city ? " · " + picked.city : "") : v ? "New client — add contact details below" : ""; };
    $("#ci-go").onclick = function () {
      var b = this, t = calc(), v = $("#ci-c").value.trim(), items = rows.filter(function (r) { return String(r.desc).trim() && lineTot(r) > 0; });
      $("#ci-e").textContent = "";
      if (!v) return ($("#ci-e").textContent = "Choose a client or type a company name"), $("#ci-c").focus();
      if (!items.length) return ($("#ci-e").textContent = "Add at least one item with a quantity and unit cost");
      // per-line discount is folded into the line rate so totals stay exact; the note keeps it visible
      var secItems = items.map(function (r) { var q = +r.qty || 1, d = +r.disc || 0, rate = Math.round((((+r.rate || 0) * q - d) / q) * 100) / 100;
        return { kind: "", desc: String(r.desc).trim() + (d ? " (less discount Rs " + num(d) + ")" : ""), qty: q, unit: r.unit, rate: rate }; });
      b.disabled = true; b.textContent = "Creating…";
      api("inv_new", { client_id: picked ? picked.id : 0, client: picked ? {} : { company: v, name: $("#ci-cn").value.trim() || v, phone: $("#ci-cp").value.trim(), address: $("#ci-ca").value.trim() },
        line: $("#ci-l").value, project: $("#ci-p").value, po: $("#ci-po").value, issue_date: $("#ci-d").value, due_date: $("#ci-dd").value, delivery_date: $("#ci-del").value, mode: $("#ci-m").value,
        schedule: $("#ci-sc").value, terms: $("#ci-t").value, sections: [{ name: "Supply & services", note: "", items: secItems }], discount: t.xd, rent: t.rent, taxPct: t.tp })
        .then(function (r) { if (!r.ok) { b.disabled = false; b.innerHTML = ic("file-plus") + "Create invoice"; W.fillIcons(b); $("#ci-e").textContent = r.error; return; }
          toast("Invoice " + r.invoice.no + " created ✓"); location.hash = "#/invoice/" + r.invoice.id; });
    };
  }

  // ------------------------------------------------------------------ TRANSACTIONS
  var MET = { bank: "Bank transfer", cash: "Cash", cheque: "Cheque", online: "Online" };
  function transactions(el) {
    var st = W.S.p18tx || (W.S.p18tx = { month: "", method: "", q: "" }), all = [];
    el.innerHTML = head("Transactions", '<a href="#/invoices">Invoices</a> / Transactions', '<button class="btn" id="tx-exp">' + ic("download") + 'Export CSV</button><a class="btn pri" href="#/invoices">' + ic("receipt") + "Invoices</a>") +
      '<div class="tx-cards" id="tx-cards"></div>' +
      '<div class="card"><div class="s17-filters tx-f"><input type="search" id="tx-q" placeholder="Search receipt, invoice, client, reference…"><select id="tx-m"></select><select id="tx-me"><option value="">All methods</option>' + Object.keys(MET).map(function (k) { return "<option value='" + k + "'>" + MET[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Receipt</th><th>Date</th><th>Client</th><th>Invoice</th><th>Method</th><th>Reference</th><th class="r">Amount (Rs)</th><th>Recorded by</th></tr></thead><tbody id="tx-rows"><tr><td colspan="8" class="empty">Loading…</td></tr></tbody></table></div></div>';
    W.fillIcons(el);
    function list() {
      var q = st.q.toLowerCase();
      return all.filter(function (p) { return (!st.month || p.date.slice(0, 7) === st.month) && (!st.method || p.method === st.method) && (!q || [p.rcpt, p.inv.no, p.inv.client.name, p.inv.client.company, p.ref, p.note].join(" ").toLowerCase().indexOf(q) >= 0); });
    }
    function draw() {
      var L = list(), sum = function (a) { return a.reduce(function (s, p) { return s + p.amount; }, 0); }, m0 = today().slice(0, 7);
      var thisM = all.filter(function (p) { return p.date.slice(0, 7) === m0; }), by = {}; L.forEach(function (p) { by[p.method] = (by[p.method] || 0) + p.amount; });
      var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })[0];
      $("#tx-cards").innerHTML = [["Received (shown)", num(sum(L)), L.length + " payments", "ok"], ["This month", num(sum(thisM)), thisM.length + " payments", ""], ["Average payment", L.length ? num(sum(L) / L.length) : "—", "per receipt", ""], ["Top method", top ? MET[top] : "—", top ? "Rs " + num(by[top]) : "", ""]]
        .map(function (c) { return "<div class='card tx-c " + c[3] + "'><small>" + c[0] + "</small><b>" + c[1] + "</b><span class='muted sm'>" + c[2] + "</span></div>"; }).join("");
      $("#tx-rows").innerHTML = L.length ? L.map(function (p, i) {
        return "<tr data-i='" + all.indexOf(p) + "'><td class='nw'><b>" + esc(p.rcpt) + "</b></td><td class='nw' data-sort='" + p.date + "'>" + dd(p.date) + "</td><td><b>" + esc(p.inv.client.company || p.inv.client.name) + "</b>" + (p.inv.client.company && p.inv.client.name !== p.inv.client.company ? "<small class='muted d'>" + esc(p.inv.client.name) + "</small>" : "") + "</td>" +
          "<td class='nw'><a href='#/invoice/" + p.inv.id + "' data-stop>" + esc(p.inv.no) + "</a></td><td><span class='badge tx-" + p.method + "'>" + (MET[p.method] || esc(p.method)) + "</span></td><td>" + esc(p.ref || "—") + "</td><td class='r nw'><b>" + num(p.amount) + "</b></td><td class='muted'>" + esc(p.by || "") + "</td></tr>";
      }).join("") : "<tr><td colspan='8' class='empty'>No payments match. Payments appear here when you record them on an invoice.</td></tr>";
      $$("#tx-rows tr[data-i]").forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest("[data-stop]")) return; receipt(all[+tr.dataset.i]); }; });
    }
    function receipt(p) {
      Promise.all([api("inv_get", { id: p.inv.id }), api("company_get")]).then(function (r) {
        if (!r[0].ok) return toast(r[0].error, true);
        var inv = r[0].invoice, c = r[0].company || r[1].company, pay = inv.payments.find(function (x) { return x.rcpt === p.rcpt; }) || p;
        WXPrint.preview(WXPrint.receipt(inv, pay, c), "Receipt " + pay.rcpt + " · " + inv.client.name);
      });
    }
    api("invs_list").then(function (r) {
      if (!r.ok) return toast(r.error, true);
      all = []; (r.invoices || []).forEach(function (inv) { (inv.payments || []).forEach(function (p) { all.push(Object.assign({}, p, { inv: inv })); }); });
      all.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var ms = {}; all.forEach(function (p) { ms[p.date.slice(0, 7)] = 1; });
      $("#tx-m").innerHTML = "<option value=''>All months</option>" + Object.keys(ms).sort().reverse().map(function (m) { var d = new Date(m + "-01T00:00:00"); return "<option value='" + m + "'" + (m === st.month ? " selected" : "") + ">" + d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) + "</option>"; }).join("");
      $("#tx-me").value = st.method; $("#tx-q").value = st.q; draw();
    });
    $("#tx-q").oninput = function () { st.q = this.value; draw(); };
    $("#tx-m").onchange = function () { st.month = this.value; draw(); };
    $("#tx-me").onchange = function () { st.method = this.value; draw(); };
    $("#tx-exp").onclick = function () {
      var L = list(), rws = [["Receipt", "Date", "Client", "Company", "Invoice", "Method", "Reference", "Amount", "Recorded by"].join(",")].concat(L.map(function (p) { return [p.rcpt, p.date, p.inv.client.name, p.inv.client.company, p.inv.no, MET[p.method] || p.method, p.ref, p.amount, p.by].map(function (x) { return '"' + String(x == null ? "" : x).replace(/"/g, '""') + '"'; }).join(","); }));
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rws.join("\n")], { type: "text/csv" })); a.download = "woodex-transactions-" + (st.month || "all") + ".csv"; a.click();
    };

    // ---- Bank deposit reconciliation (runs in the browser; nothing is saved) ----
    // Paste or upload a bank statement CSV. Each bank credit is matched to one unmatched payment
    // with the same amount (±1 Rs) within 3 days; a receipt, invoice or reference found in the
    // statement description breaks ties. Anything left over on either side is listed.
    var RC = { rows: [] };
    function parseCsv(text) {
      var rows = [], row = [], cur = "", q = false, i, c;
      for (i = 0; i < text.length; i++) {
        c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
        else if (c === '"') q = true;
        else if (c === ",") { row.push(cur.trim()); cur = ""; }
        else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur.trim()); cur = ""; if (row.some(function (x) { return x !== ""; })) rows.push(row); row = []; }
        else cur += c;
      }
      row.push(cur.trim()); if (row.some(function (x) { return x !== ""; })) rows.push(row);
      return rows;
    }
    function parseDate(v) {
      v = String(v || "").trim(); var m;
      if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
      if ((m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2); }
      var d = new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 10);
    }
    function parseAmt(v) { var n = parseFloat(String(v || "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? NaN : n; }
    function dayDiff(a, b) { return Math.abs((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000); }
    function parseStatement(text) {
      var rows = parseCsv(text); if (!rows.length) return [];
      var head = rows[0].map(function (h) { return h.toLowerCase(); }), col = function (re) { return head.findIndex(function (h) { return re.test(h); }); };
      var dI = col(/date/), aI = col(/^(amount|credit|deposit|cr|amt)/), dsI = col(/desc|narr|particular|detail|remark/), rI = col(/ref|cheque|chq|utr/);
      var body = rows;
      if (dI < 0 && aI < 0) { dI = 0; dsI = 1; aI = rows[0].length - 1; body = rows; } else body = rows.slice(1);
      return body.map(function (r) {
        var amt = aI >= 0 ? parseAmt(r[aI]) : NaN, date = parseDate(r[dI]), desc = dsI >= 0 ? (r[dsI] || "") : "", ref = rI >= 0 ? (r[rI] || "") : "";
        return { date: date, desc: desc, ref: ref, amount: amt, raw: r.join(" | ") };
      }).filter(function (x) { return x.date && !isNaN(x.amount) && x.amount > 0; });
    }
    function reconcileNow() {
      var text = $("#rc-text").value.trim(); if (!text) return toast("Paste a bank statement CSV or choose a file", true);
      var credits = parseStatement(text), pool = all.slice(), used = {}, matched = [], unmatched = [];
      if (!credits.length) return toast("No credit rows found. Columns needed: date and amount (optional: description, reference).", true);
      credits.forEach(function (b) {
        var best = null, bestScore = -1, bestStrong = false;
        pool.forEach(function (p, idx) {
          if (used[idx] || Math.abs(p.amount - b.amount) >= 1) return;
          var dd2 = dayDiff(p.date, b.date); if (dd2 > 3) return;
          var hay = (b.desc + " " + b.ref).toLowerCase(), score = 10 - dd2, strong = false;
          [p.rcpt, p.inv && p.inv.no, p.ref].forEach(function (k) { if (k && hay.indexOf(String(k).toLowerCase()) > -1) { score += 20; strong = true; } });
          [p.inv && p.inv.client && p.inv.client.company, p.inv && p.inv.client && p.inv.client.name].forEach(function (k) { if (k && k.length > 2 && hay.indexOf(String(k).toLowerCase()) > -1) { score += 15; strong = true; } });
          if (score > bestScore) { bestScore = score; best = idx; bestStrong = strong; }
        });
        if (best === null) unmatched.push(b); else { used[best] = 1; matched.push({ b: b, p: pool[best], strong: bestStrong }); }
      });
      var leftover = all.filter(function (p, idx) { return !used[idx] && (!credits.length || (p.date >= credits.reduce(function (m, x) { return x.date < m ? x.date : m; }, "9999") && p.date <= credits.reduce(function (m, x) { return x.date > m ? x.date : m; }, "0000"))); });
      var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
      $("#rc-out").innerHTML =
        "<div class='tx-cards' style='margin-top:12px'>" +
        [["Bank credits", num(sum(credits.map(function (x) { return x.amount; }))), credits.length + " rows", ""], ["Matched", num(sum(matched.map(function (m) { return m.b.amount; }))), matched.length + " payments", "ok"], ["Bank, no payment", num(sum(unmatched.map(function (x) { return x.amount; }))), unmatched.length + " rows", unmatched.length ? "bad" : ""], ["Payments, not on statement", num(sum(leftover.map(function (x) { return x.amount; }))), leftover.length + " payments", leftover.length ? "" : "ok"]]
          .map(function (c) { return "<div class='card tx-c " + c[3] + "'><small>" + c[0] + "</small><b>" + c[1] + "</b><span class='muted sm'>" + c[2] + "</span></div>"; }).join("") + "</div>" +
        "<div class='tbl-wrap' style='margin-top:12px'><table class='tbl'><thead><tr><th>Status</th><th>Bank date</th><th>Statement description</th><th>Matched payment</th><th class='r'>Amount (Rs)</th></tr></thead><tbody>" +
        (matched.map(function (m) { return "<tr><td>" + (m.strong ? "<span class='badge ok'>Matched</span>" : "<span class='badge warn'>Amount &amp; date only</span>") + "</td><td class='nw'>" + dd(m.b.date) + "</td><td>" + esc(m.b.desc || m.b.raw) + "</td><td>" + esc(m.p.rcpt) + " · " + esc(m.p.inv.no) + " · " + esc(m.p.inv.client.company || m.p.inv.client.name) + "</td><td class='r nw'><b>" + num(m.b.amount) + "</b></td></tr>"; }).join("") +
          unmatched.map(function (b) { return "<tr><td><span class='badge bad'>No payment</span></td><td class='nw'>" + dd(b.date) + "</td><td>" + esc(b.desc || b.raw) + "</td><td class='muted'>Record this payment on its invoice</td><td class='r nw'><b>" + num(b.amount) + "</b></td></tr>"; }).join("") +
          leftover.map(function (p) { return "<tr><td><span class='badge warn'>Not on statement</span></td><td class='nw'>" + dd(p.date) + "</td><td class='muted'>—</td><td>" + esc(p.rcpt) + " · " + esc(p.inv.no) + " · " + esc(p.inv.client.company || p.inv.client.name) + "</td><td class='r nw'><b>" + num(p.amount) + "</b></td></tr>"; }).join("") +
          (!matched.length && !unmatched.length && !leftover.length ? "<tr><td colspan='5' class='empty'>Nothing to show.</td></tr>" : "")) +
        "</tbody></table></div>";
    }
    var rcCard = document.createElement("div"); rcCard.className = "card"; rcCard.style.marginTop = "16px";
    rcCard.innerHTML = "<div class='card-h'><h3>Bank deposit reconciliation</h3><span class='muted sm'>Matched in your browser only</span></div><div class='card-b'>" +
      "<p class='muted sm' style='margin:0 0 10px'>Upload or paste a bank statement CSV with a date and an amount column (description and reference help matching). Each credit is matched to a recorded payment with the same amount within 3 days.</p>" +
      "<div style='display:flex;gap:10px;flex-wrap:wrap;align-items:center'><input type='file' id='rc-file' accept='.csv,text/csv'><button class='btn pri' id='rc-go'>" + ic("check") + "Match statement</button></div>" +
      "<textarea id='rc-text' rows='5' style='width:100%;margin-top:10px' placeholder='Date,Description,Reference,Amount&#10;2026-10-02,FT RAAST FROM TARIQ MAHMOOD,WX-0012,250000'></textarea><div id='rc-out'></div></div>";
    el.appendChild(rcCard); W.fillIcons(rcCard);
    $("#rc-file").onchange = function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { $("#rc-text").value = String(rd.result); reconcileNow(); }; rd.readAsText(f); };
    $("#rc-go").onclick = reconcileNow;
  }

  function install() {
    var V = W.VIEWS; if (!V) return;
    var oldInv = V.invoice;
    V.invoice = function (el, parts, def) { if (parts && parts[0] === "new") return createInvoice(el); return oldInv(el, parts, def); };
    V.transactions = transactions;
    // the invoice list's "New invoice" button opens the full page instead of the small pop-up
    document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("#it-new"); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); location.hash = "#/invoice/new"; }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
