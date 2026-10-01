/* Woodex Admin — P17 S4: quotation & invoice print layouts (single file).
   Layouts: "single" (one-page style quotation) and "project" (summary page + one page per trade, Interior Arch style).
   New header (logo left · number & contacts right), Prepared-for / Project boxes, grey section rows, numbered items,
   heading + spec rows, lakh-style amount in words, terms, bank, signature block, footer "Phone | Address | Website · Thank you".
   Wraps WXPrint: q.layout "classic" (or empty) still uses the original A5 layout. Invoices use the new design. */
(function () {
  "use strict";
  var P = window.WXPrint; if (!P) return;
  var OLDQ = P.quote, OLDI = P.invoice; P.invoiceClassic = OLDI; P.quoteClassic = OLDQ;
  var LOGO = "/assets/img/img-f941b08b9510.png";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var money = function (n) { return Math.round(n || 0).toLocaleString("en-US"); };
  var amt = function (n) { return n ? money(n) : "–"; };
  var qtyf = function (n) { return n ? (Math.round(n * 1000) / 1000).toLocaleString("en-US") : "–"; };
  var dlong = function (d) { if (!d) return ""; var x = new Date(String(d).slice(0, 10) + "T00:00:00"); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  var addDays = function (d, n) { var x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  var UNIT = { sft: "sft", rft: "rft", sqmt: "sq m", nos: "nos", each: "each", set: "set", point: "point", job: "job", lumpsum: "L/S" };
  var QT = { fitout: "Fit-out", renovation: "Renovation", interior: "Interior design", proposal: "Proposal", furniture: "Furniture supply" };
  var two = function (n) { return String(n).padStart(2, "0"); };
  var lines = function (t) { return String(t || "").split("\n").map(function (x) { return x.replace(/^\s*(?:[-•*]|\d{1,2}[.)])\s+/, "").trim(); }).filter(Boolean); };

  /** Auto numbering: headings → 5.1, 5.2; items under a heading → 5.1.1; items before any heading → 5.1, 5.2 */
  function numbered(s, si) {
    var h = 0, k = 0, out = [];
    s.items.forEach(function (it) {
      var code = it.code;
      if (it.kind === "head") { h++; k = 0; code = code || (si + 1) + "." + h; }
      else if (it.kind === "spec") code = "";
      else { k++; code = code || (h ? (si + 1) + "." + h + "." + k : (si + 1) + "." + k); }
      out.push({ it: it, code: code });
    });
    return out;
  }
  function css(pdf) {
    return '@font-face{font-family:"DM Sans";src:url("/assets/fonts/dm-sans-400.woff2") format("woff2");font-weight:400}@font-face{font-family:"DM Sans";src:url("/assets/fonts/dm-sans-500.woff2") format("woff2");font-weight:500 700}' +
      ":root{--ink:#0c1628;--gold:#b8956a;--g2:#8a6a40;--line:#e3e1dc;--soft:#f4efe7;--sec:#eceae5;--mut:#6b7280}" +
      '@page{size:A4;margin:10mm 12mm 14mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);font:7pt "DM Sans",Arial,sans-serif;color:#8a6a40}}' +
      "*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
      "body{margin:0;font-family:'DM Sans',Arial,sans-serif;color:var(--ink);font-size:9.4pt;line-height:1.45;background:" + (pdf ? "#fff" : "#e7e5e0") + "}" +
      ".doc{background:#fff;width:210mm;margin:" + (pdf ? "0" : "8mm auto") + ";padding:" + (pdf ? "0 12mm" : "11mm 12mm 14mm") + ";box-shadow:" + (pdf ? "none" : "0 8px 34px rgba(12,22,40,.16)") + "}" +
      "@media print{body{background:#fff}.doc{width:auto;margin:0;padding:0;box-shadow:none}.xf{position:fixed;left:0;right:0;bottom:0}.xf-sp{height:10mm}}@media screen{.xf{margin-top:9mm}.xf-sp{display:none}}" +
      "table.pg{width:100%;border-collapse:collapse}table.pg>thead>tr>td,table.pg>tfoot>tr>td,table.pg>tbody>tr>td{padding:0;border:0}" +
      ".xh{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;padding-bottom:4mm;margin-bottom:5mm;border-bottom:1.5px solid var(--ink);position:relative}.xh:after{content:'';position:absolute;left:0;bottom:-4px;width:34mm;height:2.5px;background:var(--gold)}" +
      ".xb{display:flex;align-items:center;gap:3.2mm}.xb img{height:13mm}.xb b{display:block;font-size:15pt;letter-spacing:.2em;line-height:1}.xb small{display:block;font-size:6.6pt;letter-spacing:.42em;color:var(--g2);margin-top:1.4mm}.xb em{display:block;font-style:normal;font-size:7pt;color:var(--mut);margin-top:1.2mm;letter-spacing:.02em}" +
      ".xr{text-align:right}.xr h1{margin:0;font-size:21pt;letter-spacing:.14em;font-weight:700;line-height:1}.xr h1 span{color:var(--gold)}" +
      ".xm{display:inline-grid;grid-template-columns:auto auto;gap:.6mm 4mm;margin-top:2.4mm;font-size:8.6pt;text-align:right}.xm small{color:var(--mut);text-align:left}.xm b{font-weight:600}" +
      ".xc{font-size:7.4pt;color:var(--mut);margin-top:2mm;line-height:1.5}" +
      ".chips{display:flex;gap:2mm;justify-content:flex-end;margin-top:2mm}.chip{font-size:7pt;font-weight:700;letter-spacing:.12em;border:1px solid var(--gold);color:var(--g2);border-radius:1.4mm;padding:.6mm 2.2mm;text-transform:uppercase}" +
      ".boxes{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:5mm}.box{border:1px solid var(--line);border-radius:2.4mm;padding:3.4mm 4mm;background:#fcfbf9}.box small{display:block;font-size:6.8pt;letter-spacing:.16em;text-transform:uppercase;color:var(--g2);font-weight:700;margin-bottom:1.2mm}.box b{font-size:10.5pt}.box div{font-size:8.6pt;color:#374151}" +
      ".box dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 3mm;margin:0;font-size:8.6pt}.box dt{color:var(--mut)}.box dd{margin:0;font-weight:500}" +
      ".intro{color:#374151;margin:0 0 4mm;font-size:9pt}" +
      "table.t{width:100%;border-collapse:collapse}table.t thead{display:table-header-group}table.t tr{break-inside:avoid;page-break-inside:avoid}" +
      "table.t th{background:var(--ink);color:#fff;font-weight:600;font-size:7.4pt;letter-spacing:.08em;text-transform:uppercase;padding:2.3mm 2.2mm;text-align:left}table.t th:first-child{border-radius:1.6mm 0 0 0}table.t th:last-child{border-radius:0 1.6mm 0 0}" +
      "th.r,td.r{text-align:right}th.c,td.c{text-align:center}table.t td{padding:2mm 2.2mm;border-bottom:1px solid var(--line);vertical-align:top;font-size:8.8pt}" +
      "td.sr{width:13mm;color:var(--mut);font-variant-numeric:tabular-nums}td.n{white-space:nowrap;font-variant-numeric:tabular-nums}" +
      "tr.sec td{background:var(--sec);font-weight:700;font-size:8.8pt;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #d6d3cc}tr.sec td.sr{color:var(--g2);font-weight:700}" +
      "tr.hd td{font-weight:700;background:#faf8f4}tr.sp td{color:#4b5563;font-size:8.2pt;font-style:italic;padding-top:.6mm;border-bottom-style:dashed}tr.sp td.d{white-space:pre-wrap}" +
      "tr.ss td{font-weight:700;background:#fff;border-bottom:1.5px solid var(--ink)}" +
      ".foot2{display:grid;grid-template-columns:1fr 78mm;gap:6mm;margin-top:4mm;break-inside:avoid}.words{border:1px dashed var(--gold);border-radius:2mm;padding:3mm 3.5mm;font-size:8.6pt;align-self:start;background:#fffdf9}.words small{display:block;font-size:6.8pt;letter-spacing:.14em;text-transform:uppercase;color:var(--g2);font-weight:700}" +
      ".tot div{display:flex;justify-content:space-between;padding:1.3mm 3mm;font-size:9pt;border-bottom:1px solid var(--line)}.tot .g{background:var(--ink);color:#fff;font-weight:700;font-size:11.5pt;padding:2.8mm 3mm;border-radius:1.6mm;border:0;margin-top:1.4mm}.tot .g span:last-child{color:#e6cfa5}" +
      "h3{font-size:8.6pt;letter-spacing:.16em;text-transform:uppercase;color:var(--g2);margin:6mm 0 2.4mm;break-after:avoid}" +
      ".terms{margin:0;padding-left:4.5mm;color:#374151;font-size:8.6pt}.terms li{margin-bottom:1.1mm;break-inside:avoid}" +
      ".scope{columns:2;column-gap:8mm;margin:0;padding-left:4.5mm;font-size:8.8pt}.scope li{margin-bottom:1.2mm;break-inside:avoid}" +
      ".bank{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:.8mm 4mm;font-size:8.6pt;border:1px solid var(--line);border-radius:2mm;padding:3mm 4mm}.bank small{color:var(--mut)}" +
      ".sign{display:grid;grid-template-columns:1fr 1fr;gap:16mm;margin-top:14mm;break-inside:avoid}.sign div{border-top:1px solid var(--ink);padding-top:1.8mm;font-size:8.4pt;font-weight:700}.sign small{display:block;font-weight:400;color:var(--mut);font-size:7.6pt}" +
      ".sign.three{grid-template-columns:repeat(3,1fr);gap:10mm}" +
      ".xf{border-top:1px solid var(--line);padding-top:2mm;font-size:7pt;color:var(--mut);display:flex;justify-content:space-between;gap:6mm;background:#fff}.xf b{color:var(--g2);font-weight:600}" +
      ".brk{break-before:page;page-break-before:always}.keep{break-inside:avoid}" +
      ".trade{display:flex;justify-content:space-between;align-items:flex-end;margin:0 0 3mm;padding-bottom:2mm;border-bottom:1px solid var(--line)}.trade h2{margin:0;font-size:14pt;text-transform:uppercase;letter-spacing:.04em}.trade h2 span{color:var(--gold);margin-right:2.5mm}.trade .kv{font-size:8pt;color:var(--mut);text-align:right}.trade .kv b{color:var(--ink)}" +
      ".note{margin-top:2.4mm;font-size:8.2pt;color:#4b5563;border-left:2.5px solid var(--gold);padding:.6mm 0 .6mm 3mm}" +
      ".stamp{display:inline-block;border:2px solid;border-radius:1.6mm;padding:.8mm 3mm;font-weight:700;letter-spacing:.14em;font-size:8.6pt;text-transform:uppercase;transform:rotate(-4deg)}.paid{color:#15803d}.due{color:#b42318}.part{color:#a16207}" +
      (pdf ? ".xh,.xf{display:none!important}.xh-pdf{display:flex!important}" : ".xh-pdf{display:none}");
  }
  function header(c, title, meta, chips) {
    return '<div class="xh"><div class="xb"><img src="' + LOGO + '" alt=""><div><b>WOODEX</b><small>INTERIOR</small><em>' + esc(c.tagline || "Design · Build · Furniture") + "</em></div></div>" +
      '<div class="xr"><h1>' + title + '<span>.</span></h1><div class="xm">' + meta.map(function (m) { return "<small>" + m[0] + "</small><b>" + esc(m[1]) + "</b>"; }).join("") + "</div>" +
      (chips && chips.length ? '<div class="chips">' + chips.map(function (x) { return '<span class="chip">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="xc">' + esc(c.address) + "<br>" + esc(c.phones) + " · " + esc(c.email) + (c.ntn ? " · NTN " + esc(c.ntn) : "") + "</div></div></div>";
  }
  // PDF mode: the PDF maker stamps a compact letterhead on every page, so the first page shows the title band only
  function pdfBand(title, meta) { return '<div class="xh-pdf" style="justify-content:space-between;align-items:flex-end;margin:0 0 5mm"><h1 style="margin:0;font-size:20pt;letter-spacing:.14em">' + title + '<span style="color:#b8956a">.</span></h1><div class="xm">' + meta.map(function (m) { return "<small>" + m[0] + "</small><b>" + esc(m[1]) + "</b>"; }).join("") + "</div></div>"; }
  function footer(c, label) {
    var ph = String(c.phones || "").split("·")[0].trim();
    return '<div class="xf"><span>' + esc(ph) + " &nbsp;|&nbsp; " + esc(c.address) + " &nbsp;|&nbsp; " + esc(c.web) + "</span><span><b>Thank you for your business</b> · " + esc(label) + "</span></div>";
  }
  function wrap(title, inner, c, label, pdf) {
    return "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + css(pdf) + "</style></head><body><div class='doc'><table class='pg'><tbody><tr><td>" + inner + "</td></tr></tbody><tfoot><tr><td><div class='xf-sp'></div></td></tr></tfoot></table>" + footer(c, label) + "</div></body></html>";
  }
  function boxes(cl, rightTitle, rows) {
    return '<div class="boxes"><div class="box"><small>Prepared for</small><b>' + esc(cl.company || cl.name) + "</b>" + (cl.company && cl.name !== cl.company ? "<div>Attn: " + esc(cl.name) + "</div>" : "") + (cl.address ? "<div>" + esc(cl.address) + "</div>" : "") + "<div>" + esc([cl.phone, cl.email].filter(Boolean).join(" · ")) + "</div></div>" +
      '<div class="box"><small>' + rightTitle + "</small><dl>" + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl></div></div>";
  }
  function totals(d, label) {
    return '<div class="foot2"><div class="words"><small>Amount in words</small>Rupees ' + P.words(d.total) + ' Only</div><div class="tot">' +
      (d.discount || d.tax ? "<div><span>Subtotal</span><span>" + money(d.subtotal) + "</span></div>" : "") + (d.discount ? "<div><span>Discount</span><span>– " + money(d.discount) + "</span></div>" : "") +
      (d.tax ? "<div><span>Tax (" + (+d.taxPct || 0) + "%)</span><span>" + money(d.tax) + "</span></div>" : "") + '<div class="g"><span>' + (label || "TOTAL (Rs)") + "</span><span>" + money(d.total) + "</span></div></div></div>";
  }
  function termsBlock(t, c) { var l = lines(t || c.payTerms); return l.length ? '<div class="keep"><h3>Terms &amp; conditions</h3><ol class="terms">' + l.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>" : ""; }
  function bankBlock(c) {
    if (!c.bankName && !c.bankAccount && !c.bankIban) return "";
    return '<div class="keep"><h3>Bank details</h3><div class="bank">' + [["Bank", c.bankName], ["Account title", c.bankTitle], ["Account no.", c.bankAccount], ["IBAN", c.bankIban]].filter(function (r) { return r[1]; }).map(function (r) { return "<small>" + r[0] + "</small><b>" + esc(r[1]) + "</b>"; }).join("") + "</div></div>";
  }
  function signBlock(left, right, mid) {
    var cell = function (x) { return "<div>" + esc(x[0]) + "<small>" + esc(x[1] || "") + "</small>" + (x[2] ? "<small>" + esc(x[2]) + "</small>" : "") + "</div>"; };
    return '<div class="sign' + (mid ? " three" : "") + '">' + cell(left) + (mid ? cell(mid) : "") + cell(right) + "</div>";
  }
  function itemRows(s, si, cols) { // cols: "single" (Sr Desc Qty Unit Rate Amount) or "trade" (Item# Desc Unit No's Rate Amount)
    return numbered(s, si).map(function (x) {
      var it = x.it;
      if (it.kind === "head") return '<tr class="hd"><td class="sr">' + esc(x.code) + '</td><td colspan="5">' + esc(it.desc) + "</td></tr>";
      if (it.kind === "spec") return '<tr class="sp"><td></td><td class="d" colspan="5">' + esc(it.desc) + "</td></tr>";
      return cols === "trade" ? '<tr><td class="sr">' + esc(x.code) + "</td><td>" + esc(it.desc) + '</td><td class="c">' + (UNIT[it.unit] || esc(it.unit)) + '</td><td class="r n">' + qtyf(it.qty) + '</td><td class="r n">' + amt(it.rate) + '</td><td class="r n">' + amt(it.amount) + "</td></tr>"
        : '<tr><td class="sr">' + esc(x.code) + "</td><td>" + esc(it.desc) + '</td><td class="r n">' + qtyf(it.qty) + '</td><td class="c">' + (UNIT[it.unit] || esc(it.unit)) + '</td><td class="r n">' + amt(it.rate) + '</td><td class="r n">' + amt(it.amount) + "</td></tr>";
    }).join("");
  }
  var signer = function (q, c) { return [q.sign_name || c.signName || "Prepared by", q.sign_title || c.signTitle || "For " + (c.name || "Woodex Interior")]; };

  // ------------------------------------------------------------- SINGLE-PAGE QUOTATION
  function single(q, c, pdf) {
    var label = P.label(q), valid = addDays(q.date, q.valid_days || c.validDays || 15), secs = q.sections.filter(function (s) { return s.items.length; });
    var meta = [["Quotation no.", label], ["Date", dlong(q.date)], ["Valid until", dlong(valid)]];
    var area = q.sections.reduce(function (a, s) { return a + (+s.area || 0); }, 0);
    var body = header(c, "QUOTATION", meta, q.qtype ? [QT[q.qtype]] : []) + pdfBand("QUOTATION", meta) +
      boxes(q.client, "Project details", [["Project", q.project || "—"], ["Site", q.site], ["Type", QT[q.qtype] || ""], ["Area", area ? money(area) + " sft" : ""]]) +
      (q.intro ? '<p class="intro">' + esc(q.intro) + "</p>" : "") + scopeBlock(q) +
      '<table class="t"><thead><tr><th>Sr</th><th>Description</th><th class="r">Qty</th><th class="c">Unit</th><th class="r">Rate (Rs)</th><th class="r">Amount (Rs)</th></tr></thead><tbody>' +
      secs.map(function (s) { var si = q.sections.indexOf(s); return '<tr class="sec"><td class="sr">' + two(si + 1) + '</td><td colspan="4">' + esc(s.name) + '</td><td class="r n">' + amt(s.subtotal) + "</td></tr>" + itemRows(s, si, "single") + (s.note ? '<tr class="sp"><td></td><td class="d" colspan="5">Note: ' + esc(s.note) + "</td></tr>" : ""); }).join("") +
      "</tbody></table>" + totals(q) + termsBlock(q.terms, c) + bankBlock(c) +
      signBlock([signer(q, c)[0], signer(q, c)[1]], ["Accepted by client", q.client.company || q.client.name, "Signature · date · stamp"]);
    return wrap("Quotation " + label + " - " + q.client.name, body, c, label, pdf);
  }
  function scopeBlock(q) { var l = lines(q.scope); return l.length ? '<div class="keep"><h3>Scope of work</h3><ul class="scope">' + l.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : ""; }

  // ------------------------------------------------------------- PROJECT QUOTATION (summary + trade pages)
  function project(q, c, pdf) {
    var label = P.label(q), valid = addDays(q.date, q.valid_days || c.validDays || 15);
    var chips = [q.option || "Option-1", "V-" + (q.version || 1)].concat(q.qtype ? [QT[q.qtype]] : []);
    var meta = [["Quotation no.", label], ["Date", dlong(q.date)], ["Valid until", dlong(valid)]];
    var area = Math.max.apply(null, q.sections.map(function (s) { return +s.area || 0; }).concat([0]));
    var body = header(c, "QUOTATION", meta, chips) + pdfBand("QUOTATION", meta) +
      boxes(q.client, "Project details", [["Project", q.project || "—"], ["Site", q.site], ["Type", QT[q.qtype] || "Interior project"], ["Covered area", area ? money(area) + " sft" : ""], ["Rate", area ? "Rs " + money(q.total / area) + " / sft overall" : ""]]) +
      (q.intro ? '<p class="intro">' + esc(q.intro) + "</p>" : "") + scopeBlock(q) +
      "<h3 style='margin-top:1mm'>Summary of cost</h3>" +
      '<table class="t"><thead><tr><th>Sr</th><th>Particulars</th><th class="r">Total area (sft)</th><th class="r">Per sft (Rs)</th><th class="r">Amount (Rs)</th></tr></thead><tbody>' +
      q.sections.map(function (s, i) { var a = +s.area || 0; return '<tr><td class="sr">' + two(i + 1) + '</td><td style="font-weight:600;text-transform:uppercase;letter-spacing:.03em">' + esc(s.name) + '</td><td class="r n">' + (a ? money(a) : "–") + '</td><td class="r n">' + (a && s.subtotal ? money(s.subtotal / a) : "–") + '</td><td class="r n">' + amt(s.subtotal) + "</td></tr>"; }).join("") +
      '<tr class="ss"><td></td><td>TOTAL</td><td></td><td></td><td class="r n">' + money(q.subtotal) + "</td></tr></tbody></table>" + totals(q) +
      signBlock([signer(q, c)[0], signer(q, c)[1]], ["Approved by client", q.client.company || q.client.name, "Signature · date"], ["Approved by consultant", "Name & signature", ""]) +
      q.sections.filter(function (s) { return s.items.length; }).map(function (s) {
        var si = q.sections.indexOf(s), a = +s.area || 0;
        return '<div class="brk"></div><div class="trade"><h2><span>' + two(si + 1) + "</span>" + esc(s.name) + '</h2><div class="kv">' + (a ? "Area <b>" + money(a) + " sft</b> · Rs <b>" + money(s.subtotal / a) + "</b> / sft<br>" : "") + "Section total <b>Rs " + money(s.subtotal) + "</b></div></div>" +
          '<table class="t"><thead><tr><th>Item #</th><th>Description</th><th class="c">Unit</th><th class="r">No\'s / qty</th><th class="r">Rate (Rs)</th><th class="r">Amount (Rs)</th></tr></thead><tbody>' + itemRows(s, si, "trade") +
          '<tr class="ss"><td></td><td colspan="4">Total · ' + esc(s.name) + '</td><td class="r n">' + money(s.subtotal) + "</td></tr></tbody></table>" + (s.note ? '<div class="note">' + esc(s.note) + "</div>" : "");
      }).join("") +
      '<div class="brk"></div>' + termsBlock(q.terms, c) + bankBlock(c) + signBlock([signer(q, c)[0], signer(q, c)[1]], ["Accepted by client", q.client.company || q.client.name, "Signature · date · stamp"]);
    return wrap("Quotation " + label + " - " + q.client.name, body, c, label, pdf);
  }

  P.quote = function (q, c, opts) {
    opts = opts || {};
    if (q.layout === "single") return single(q, c, !!opts.pdf);
    if (q.layout === "project") return project(q, c, !!opts.pdf);
    return OLDQ(q, c, opts);
  };

  // ------------------------------------------------------------- INVOICE (new design, all invoices)
  P.invoice = function (inv, c, opts) {
    opts = opts || {}; if (opts.classic) return OLDI(inv, c);
    var st = inv.payStatus === "paid" ? '<span class="stamp paid">Paid</span>' : inv.payStatus === "partial" ? '<span class="stamp part">Part paid</span>' : '<span class="stamp due">' + (inv.mode === "after_delivery" ? "Due on delivery" : "Unpaid") + "</span>";
    var meta = [["Invoice no.", inv.no], ["Date", dlong(inv.issue_date)]].concat(inv.due_date ? [["Due date", dlong(inv.due_date)]] : []).concat(inv.po ? [["PO #", inv.po]] : []);
    var secs = (inv.sections || []).filter(function (s) { return s.items.length; });
    var body = header(c, "INVOICE", meta, []) +
      boxes(inv.client, "Invoice details", [["Project", inv.project || ""], ["Site", inv.site], ["Quotation", inv.quote_label || ""], ["Delivery", inv.delivery_date ? dlong(inv.delivery_date) + (inv.delivered ? " (delivered " + dlong(inv.delivered) + ")" : "") : ""], ["Terms", inv.mode === "after_delivery" ? "Payment after delivery" : inv.schedule || ""]]) +
      '<table class="t"><thead><tr><th>Sr</th><th>Description</th><th class="r">Qty</th><th class="c">Unit</th><th class="r">Rate (Rs)</th><th class="r">Amount (Rs)</th></tr></thead><tbody>' +
      secs.map(function (s) { var si = inv.sections.indexOf(s); return (secs.length > 1 || s.name !== "Supply & services" ? '<tr class="sec"><td class="sr">' + two(si + 1) + '</td><td colspan="4">' + esc(s.name) + '</td><td class="r n">' + amt(s.subtotal) + "</td></tr>" : "") + itemRows(s, si, "single"); }).join("") +
      "</tbody></table>" + totals(inv, "INVOICE TOTAL (Rs)") +
      '<div class="keep"><h3>Payments received &nbsp;' + st + "</h3>" + (inv.payments.length ? '<table class="t"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount (Rs)</th></tr></thead><tbody>' + inv.payments.map(function (p) { return "<tr><td>" + esc(p.rcpt) + "</td><td>" + dlong(p.date) + "</td><td>" + esc(p.method) + "</td><td>" + esc(p.ref || "") + '</td><td class="r n">' + money(p.amount) + "</td></tr>"; }).join("") + "</tbody></table>" : '<p class="intro">No payments received yet.</p>') +
      '<div class="foot2" style="margin-top:2mm"><div></div><div class="tot"><div><span>Received</span><span>' + money(inv.paid) + '</span></div><div class="g"><span>BALANCE DUE (Rs)</span><span>' + money(inv.balance) + "</span></div></div></div></div>" +
      termsBlock(inv.terms, c) + bankBlock(c) + (inv.notes ? "<h3>Notes</h3><p class='intro'>" + esc(inv.notes) + "</p>" : "") +
      signBlock([c.signName || "Prepared by", c.signTitle || "For " + c.name], ["Received by", inv.client.company || inv.client.name, "Signature · date · stamp"]);
    return wrap("Invoice " + inv.no + " - " + inv.client.name, body, c, "Invoice " + inv.no, false);
  };
  P.layouts = { single: "Single page", project: "Project (summary + trades)", classic: "Classic BOQ" };
})();
