/* Woodex Admin v2 — Phase A4: enquiries inbox, lead details, pipeline (Kanban), clients, alerts & spam settings */
(function () {
  "use strict";
  var W = window.WXA, S = W.S, api = W.api, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, modal = W.modal, closeModal = W.closeModal, head = W.head, can = W.can;
  var STAGE = { new: ["New", "info"], contacted: ["Contacted", "gold"], visit: ["Site visit", "warn"], quote: ["Quote sent", "gold"], won: ["Won", "ok"], lost: ["Lost", "bad"] };
  var ORDER = ["new", "contacted", "visit", "quote", "won", "lost"];
  var C = { leads: [], sources: {}, team: [] };

  var badge = function (st) { var s = STAGE[st] || [st, ""]; return '<span class="badge ' + s[1] + '">' + s[0] + "</span>"; };
  var pkr = function (n) { return n ? "PKR " + Math.round(n).toLocaleString("en-PK") : "—"; };
  var dshort = function (d) { if (!d) return "—"; var x = new Date(d.replace(" ", "T")); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + (d.length > 10 ? " · " + x.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""); };
  var today = function () { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  var waNum = function (p) { var d = String(p || "").replace(/\D/g, ""); if (/^0\d{9,10}$/.test(d)) d = "92" + d.slice(1); else if (/^3\d{9}$/.test(d)) d = "92" + d; return d; };
  var waHref = function (l) { return "https://wa.me/" + waNum(l.phone) + "?text=" + encodeURIComponent("Hi " + String(l.name || "").split(" ")[0] + ", this is Woodex Interior about your " + (l.service ? l.service.toLowerCase() + " " : "") + "enquiry" + (l.id ? " (#" + l.id + ")" : "") + ". "); };
  var due = function (l) { return l.followup && l.followup <= today() && ORDER.indexOf(l.stage) < 4; };
  function load() { return api("leads_list").then(function (r) { if (!r.ok) { toast(r.error, true); return false; } C.leads = r.leads; C.sources = r.sources; C.team = r.team; badgeNav(); return true; }); }
  function badgeNav() {
    var n = C.leads.filter(function (l) { return !l.read; }).length, a = $('.nav-a[data-v="enquiries"]'); if (!a) return;
    var b = a.querySelector(".pill"); if (!n) { if (b) b.remove(); return; } if (!b) { b = document.createElement("span"); b.className = "pill"; b.style.cssText = "background:var(--gold);color:#0a0f1e"; a.appendChild(b); } b.textContent = n;
  }
  // unread badge after sign-in and every 60s
  var poll = function () { if (S.user && can("owner,admin,sales")) api("leads_count").then(function (r) { if (r.ok) { C.leads = C.leads.length ? C.leads : []; var a = $('.nav-a[data-v="enquiries"]'); if (!a) return; var b = a.querySelector(".pill"); if (!r.unread) { if (b) b.remove(); return; } if (!b) { b = document.createElement("span"); b.className = "pill"; b.style.cssText = "background:var(--gold);color:#0a0f1e"; a.appendChild(b); } b.textContent = r.unread; } }); };
  setInterval(poll, 60000); window.addEventListener("hashchange", function () { setTimeout(poll, 400); }); setTimeout(poll, 1500);

  // =========================================================== LEAD DETAIL (drawer-style modal)
  W.leadDrawer = function (id, after) {
    var l = C.leads.find(function (x) { return x.id === id; }); if (!l) return;
    var f = l.fields || {}, extra = Object.keys(f).map(function (k) { return "<div class='kv'><small>" + esc(k.replace(/[_-]/g, " ")) + "</small><span>" + esc(f[k]) + "</span></div>"; }).join("");
    modal("<div class='ld-head'><div><h2 style='margin:0'>" + esc(l.name) + "</h2><small class='muted'>#" + l.id + " · " + esc(C.sources[l.source] || l.source) + " · " + dshort(l.created_at) + (l.page ? " · " + esc(l.page) : "") + "</small></div>" + badge(l.stage) + "</div>" +
      "<div class='ld-acts'>" + (l.phone ? "<a class='btn sm' href='tel:" + esc(l.phone.replace(/[^\d+]/g, "")) + "'>" + ic("phone") + esc(l.phone) + "</a><a class='btn sm wa' target='_blank' rel='noopener' href='" + esc(waHref(l)) + "'>" + ic("message-circle") + "WhatsApp reply</a>" : "") + (l.email ? "<a class='btn sm' href='mailto:" + esc(l.email) + "?subject=" + encodeURIComponent("Your enquiry with Woodex Interior") + "'>" + ic("mail") + esc(l.email) + "</a>" : "") + "</div>" +
      "<div class='ld-grid'><div>" +
        (l.service ? "<div class='kv'><small>Service</small><span>" + esc(l.service) + "</span></div>" : "") + extra +
        (l.message ? "<div class='kv'><small>Message</small><span style='white-space:pre-wrap'>" + esc(l.message) + "</span></div>" : "") +
        "<h3 class='ld-h'>Notes & history</h3><div class='ld-notes'>" + (l.notes.length ? l.notes.slice().reverse().map(function (n) { return "<div class='note" + (n.sys ? " sys" : "") + "'><small>" + esc(n.user) + " · " + dshort(n.t) + "</small><div>" + esc(n.text) + "</div></div>"; }).join("") : "<p class='muted'>No notes yet.</p>") + "</div>" +
        "<div style='display:flex;gap:8px;margin-top:8px'><input id='ld-note' placeholder='Add a note (call outcome, site visit details…)' style='margin:0'><button class='btn' id='ld-addnote'>Add</button></div>" +
      "</div><div class='ld-side'>" +
        "<label>Stage<select id='ld-stage'>" + ORDER.map(function (s) { return "<option value='" + s + "'" + (s === l.stage ? " selected" : "") + ">" + STAGE[s][0] + "</option>"; }).join("") + "</select></label>" +
        "<label id='ld-lostw'" + (l.stage === "lost" ? "" : " hidden") + ">Reason lost<input id='ld-lost' value='" + esc(l.lost_reason || "") + "' placeholder='Budget, timing, chose another firm…'></label>" +
        "<label>Assigned to<select id='ld-ass'><option value=''>Nobody</option>" + C.team.map(function (u) { return "<option value='" + u.id + "'" + (u.id === l.assigned_to ? " selected" : "") + ">" + esc(u.name) + "</option>"; }).join("") + "</select></label>" +
        "<label>Follow-up date<input type='date' id='ld-fu' value='" + esc(l.followup || "") + "'></label>" +
        "<label>Estimated value (PKR)<input type='number' min='0' step='1000' id='ld-val' value='" + (l.value || "") + "'></label>" +
        "<label>Tags<input id='ld-tags' value='" + esc((l.tags || []).join(", ")) + "' placeholder='hot, dha, office'></label>" +
        (l.client_id ? "<a class='btn sm' href='#/clients' id='ld-cl'>" + ic("contact") + "View client</a>" : "<button class='btn sm' id='ld-conv'>" + ic("contact") + "Convert to client</button>") +
        (can("owner,admin") ? "<button class='btn sm danger' id='ld-del' style='margin-top:6px'>" + ic("x") + "Delete enquiry</button>" : "") +
      "</div></div><p class='err' id='ld-err'></p><div class='modal-actions'><button class='btn' id='ld-x'>Close</button><button class='btn pri' id='ld-save'>Save changes</button></div>");
    $("#modal-card").classList.add("wide");
    var close = function () { $("#modal-card").classList.remove("wide"); closeModal(); if (after) after(); };
    var upd = function (r) { if (!r.ok) { $("#ld-err").textContent = r.error; return false; } var i = C.leads.findIndex(function (x) { return x.id === id; }); C.leads[i] = r.lead; return true; };
    if (!l.read) api("lead_save", { id: id, read: true }).then(function (r) { if (upd(r)) badgeNav(); });
    $("#ld-x").onclick = close;
    $("#ld-stage").onchange = function () { $("#ld-lostw").hidden = this.value !== "lost"; };
    $("#ld-addnote").onclick = function () { var t = $("#ld-note").value.trim(); if (!t) return; api("lead_note", { id: id, text: t }).then(function (r) { if (upd(r)) W.leadDrawer(id, after); }); };
    $("#ld-note").onkeydown = function (e) { if (e.key === "Enter") $("#ld-addnote").click(); };
    $("#ld-save").onclick = function () {
      api("lead_save", { id: id, stage: $("#ld-stage").value, lost_reason: $("#ld-lost").value, assigned_to: $("#ld-ass").value, followup: $("#ld-fu").value, value: $("#ld-val").value, tags: $("#ld-tags").value })
        .then(function (r) { if (upd(r)) { toast("Saved ✓"); close(); } });
    };
    if ($("#ld-conv")) $("#ld-conv").onclick = function () { if (!confirm("Create a client record for " + l.name + " and mark this enquiry as won?")) return; api("lead_convert", { id: id }).then(function (r) { if (!r.ok) return toast(r.error, true); toast("Client created ✓"); load().then(function () { W.leadDrawer(id, after); }); }); };
    if ($("#ld-cl")) $("#ld-cl").onclick = function () { $("#modal-card").classList.remove("wide"); closeModal(); };
    if ($("#ld-del")) $("#ld-del").onclick = function () { if (!confirm("Delete enquiry #" + id + " from " + l.name + "? This cannot be undone.")) return; api("lead_delete", { id: id }).then(function (r) { if (!r.ok) return toast(r.error, true); C.leads = C.leads.filter(function (x) { return x.id !== id; }); toast("Deleted"); close(); }); };
  };

  function addLead(after) {
    modal("<h2>Add enquiry</h2><p class='muted' style='margin:-10px 0 14px'>For phone calls, walk-ins and referrals.</p><div class='g2'><label>Name<input id='al-n' required></label><label>Phone<input id='al-p'></label></div><div class='g2'><label>Email<input id='al-e' type='email'></label><label>Service<input id='al-s' placeholder='Kitchen, office fit-out…'></label></div><label>Notes / message<textarea id='al-m' rows='3'></textarea></label><p class='err' id='al-err'></p><div class='modal-actions'><button class='btn' id='al-x'>Cancel</button><button class='btn pri' id='al-go'>Add enquiry</button></div>");
    $("#al-x").onclick = closeModal;
    var dk = window.WXA.formDraft("enq", "#modal-card [id^='al-']");
    $("#al-go").onclick = function () { api("lead_save", { name: $("#al-n").value, phone: $("#al-p").value, email: $("#al-e").value, service: $("#al-s").value, message: $("#al-m").value }).then(function (r) { if (!r.ok) return ($("#al-err").textContent = r.error); dk.clear(); closeModal(); toast("Enquiry added ✓"); after(); }); };
  }

  // ---------------- CSV
  function csvCell(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv(list) {
    var cols = ["id", "created_at", "name", "phone", "email", "source", "service", "stage", "assigned_name", "followup", "value", "tags", "message", "details"];
    var rows = [cols.join(",")].concat(list.map(function (l) { var d = Object.keys(l.fields || {}).map(function (k) { return k + ": " + l.fields[k]; }).join("; "); return cols.map(function (c) { return csvCell(c === "tags" ? (l.tags || []).join(" ") : c === "details" ? d : c === "source" ? C.sources[l.source] || l.source : c === "stage" ? STAGE[l.stage][0] : l[c]); }).join(","); }));
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" })); a.download = "woodex-enquiries-" + today() + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
  }
  function parseCsv(t) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < t.length; i++) { var ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  function importCsv(after) {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.onchange = function () { var f = inp.files[0]; if (!f) return; f.text().then(function (t) {
      var rows = parseCsv(t.replace(/^\ufeff/, "")); if (rows.length < 2) return toast("The file has no rows", true);
      var hdr = rows[0].map(function (h) { return h.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, ""); });
      var alias = { full_name: "name", client: "name", mobile: "phone", phone_number: "phone", whatsapp: "phone", e_mail: "email", project_type: "service", type: "service", notes: "message", date: "created_at", created: "created_at", pipeline_stage: "stage", status: "stage", budget: "value" };
      hdr = hdr.map(function (h) { return alias[h] || h; }); if (hdr.indexOf("name") < 0) return toast("The CSV needs a 'name' column", true);
      var stageBy = {}; ORDER.forEach(function (s) { stageBy[s] = s; stageBy[STAGE[s][0].toLowerCase()] = s; });
      var list = rows.slice(1).map(function (r) { var o = {}; hdr.forEach(function (h, i) { o[h] = (r[i] || "").trim(); }); o.stage = stageBy[String(o.stage || "").toLowerCase()] || "new"; return o; });
      if (!confirm("Import " + list.length + " enquiries? Columns found: " + hdr.filter(function (h) { return ["name", "phone", "email", "service", "message", "stage", "value", "created_at"].indexOf(h) >= 0; }).join(", "))) return;
      api("leads_import", { rows: list }).then(function (r) { if (!r.ok) return toast(r.error, true); toast(r.imported + " enquiries imported ✓"); after(); });
    }); };
    inp.click();
  }

  // =========================================================== INBOX
  W.VIEWS.enquiries = function (el, parts) {
    if (window.WXA && window.WXA.VIEWS && window.WXA.VIEWS.enquiries && window.WXA.VIEWS.enquiries !== W.VIEWS.enquiries) {
      return window.WXA.VIEWS.enquiries(el, parts);
    }
  };

  
  W.VIEWS.clients = function (el) {
    el.innerHTML = head("Clients", "Clients", '<button class="btn pri" id="cl-add">' + ic("plus") + "Add client</button>") +
      '<div class="card"><div class="card-b" style="border-bottom:1px solid var(--line)"><input type="search" id="cl-q" placeholder="Search clients…" style="margin:0;max-width:300px"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Client</th><th>Contact</th><th>City</th><th>Enquiries</th><th>Won value</th><th>Since</th><th></th></tr></thead><tbody id="cl-rows"><tr><td colspan="7" class="empty">Loading…</td></tr></tbody></table></div></div>';
    var list = [], q = "";
    var draw = function () {
      var rows = list.filter(function (c) { return !q || [c.name, c.phone, c.email, c.company, c.city].join(" ").toLowerCase().indexOf(q) >= 0; });
      $("#cl-rows").innerHTML = rows.map(function (c) {
        return '<tr data-id="' + c.id + '"><td><b>' + esc(c.name) + "</b>" + (c.company ? "<small class='muted' style='display:block'>" + esc(c.company) + "</small>" : "") + "</td><td>" + esc(c.phone || "") + (c.email ? "<small class='muted' style='display:block'>" + esc(c.email) + "</small>" : "") + "</td><td>" + esc(c.city || "—") + "</td><td>" + c.leads.map(function (l) { return badge(l.stage); }).join(" ") + "</td><td>" + pkr(c.value) + "</td><td>" + dshort(c.created_at.slice(0, 10)) + '</td><td style="text-align:right;white-space:nowrap">' + (c.phone ? '<a class="btn sm wa" target="_blank" rel="noopener" data-stop href="https://wa.me/' + waNum(c.phone) + '">' + ic("message-circle") + "</a> " : "") + '<button class="btn sm">Edit</button></td></tr>';
      }).join("") || '<tr><td colspan="7" class="empty">' + (list.length ? "No clients match." : "No clients yet. Convert a won enquiry, or add one here.") + "</td></tr>";
      $$("#cl-rows tr[data-id]").forEach(function (tr) { tr.onclick = function (e) { if (!e.target.closest("[data-stop]")) edit(list.find(function (c) { return c.id === +tr.dataset.id; })); }; });
    };
    var reload = function () { api("clients_list").then(function (r) { if (!r.ok) return toast(r.error, true); list = r.clients; draw(); }); };
    var edit = function (c) {
      c = c || { name: "", phone: "", email: "", company: "", city: "Lahore", address: "", notes: "", leads: [] };
      modal("<h2>" + (c.id ? "Edit client" : "Add client") + "</h2><div class='g2'><label>Name<input id='ce-n' value='" + esc(c.name) + "'></label><label>Company<input id='ce-co' value='" + esc(c.company) + "'></label></div><div class='g2'><label>Phone<input id='ce-p' value='" + esc(c.phone) + "'></label><label>Email<input id='ce-e' value='" + esc(c.email) + "'></label></div><div class='g2'><label>City<input id='ce-c' value='" + esc(c.city) + "'></label><label>Address<input id='ce-a' value='" + esc(c.address) + "'></label></div><label>Notes<textarea id='ce-no' rows='3'>" + esc(c.notes) + "</textarea></label>" +
        (c.leads.length ? "<small class='muted'>Enquiries</small><div style='display:flex;flex-direction:column;gap:6px;margin:6px 0 10px'>" + c.leads.map(function (l) { return "<a href='#/enquiries' data-lead='" + l.id + "' class='ol-row' style='text-decoration:none;color:inherit'><b>#" + l.id + "</b> " + esc(l.service || "Enquiry") + " <span style='margin-left:auto'>" + badge(l.stage) + "</span></a>"; }).join("") + "</div>" : "") +
        "<p class='err' id='ce-err'></p><div class='modal-actions'>" + (c.id && can("owner,admin") ? "<button class='btn danger' id='ce-del' style='margin-right:auto'>Delete</button>" : "") + "<button class='btn' id='ce-x'>Cancel</button><button class='btn pri' id='ce-go'>Save</button></div>");
      $("#ce-x").onclick = closeModal;
      $$("[data-lead]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); closeModal(); load().then(function () { W.leadDrawer(+a.dataset.lead, reload); }); }; });
      $("#ce-go").onclick = function () { api("client_save", { id: c.id, name: $("#ce-n").value, company: $("#ce-co").value, phone: $("#ce-p").value, email: $("#ce-e").value, city: $("#ce-c").value, address: $("#ce-a").value, notes: $("#ce-no").value }).then(function (r) { if (!r.ok) return ($("#ce-err").textContent = r.error); closeModal(); toast("Saved ✓"); reload(); }); };
      if ($("#ce-del")) $("#ce-del").onclick = function () { if (!confirm("Delete client " + c.name + "? Their enquiries are kept.")) return; api("client_delete", { id: c.id }).then(function (r) { if (!r.ok) return toast(r.error, true); closeModal(); toast("Deleted"); reload(); }); };
    };
    $("#cl-q").oninput = function () { q = this.value.toLowerCase(); draw(); };
    $("#cl-add").onclick = function () { edit(null); };
    reload();
  };

  // =========================================================== ALERTS & SPAM SETTINGS
  function settings() {
    api("crm_settings").then(function (r) {
      if (!r.ok) return toast(r.error, true); var s = r.settings;
      var sec = function (k, ph) { return "<input type='password' id='cs-" + k + "' autocomplete='new-password' placeholder='" + (s[k + "Set"] ? "•••••••• saved (leave empty to keep)" : ph) + "'>"; };
      modal("<h2>Alerts & spam protection</h2><div class='cs'>" +
        "<section><h3>" + ic("mail") + "Email alerts</h3><label class='check'><input type='checkbox' id='cs-emailOn'" + (s.emailOn ? " checked" : "") + "> Email the team for every new enquiry</label>" +
        "<label>Send to <small>(comma separated)</small><input id='cs-emailTo' value='" + esc(s.emailTo) + "' placeholder='woodexinterior.pk@gmail.com, sales@woodex.com.pk'></label>" +
        "<div class='g2'><label>SMTP host<input id='cs-smtpHost' value='" + esc(s.smtpHost) + "' placeholder='smtp.hostinger.com'></label><label>Port<input id='cs-smtpPort' type='number' value='" + esc(s.smtpPort) + "'></label></div>" +
        "<div class='g2'><label>SMTP user<input id='cs-smtpUser' value='" + esc(s.smtpUser) + "' placeholder='alerts@woodex.com.pk'></label><label>SMTP password" + sec("smtpPass", "Mailbox password") + "</label></div>" +
        "<label>From address<input id='cs-smtpFrom' value='" + esc(s.smtpFrom) + "' placeholder='Woodex Website <alerts@woodex.com.pk>'></label><button class='btn sm' data-test='email'>Send test email</button></section>" +
        "<section><h3>" + ic("message-circle") + "WhatsApp alerts <small class='muted'>(Meta WhatsApp Cloud API)</small></h3><label class='check'><input type='checkbox' id='cs-waOn'" + (s.waOn ? " checked" : "") + "> WhatsApp the team for every new enquiry</label>" +
        "<label>Access token" + sec("waToken", "Permanent token from Meta Business") + "</label><div class='g2'><label>Phone number ID<input id='cs-waPhoneId' value='" + esc(s.waPhoneId) + "' placeholder='1234567890'></label><label>Send to <small>(numbers, comma separated)</small><input id='cs-waTo' value='" + esc(s.waTo) + "' placeholder='923224200168'></label></div>" +
        "<div class='g2'><label>Template name <small>(optional)</small><input id='cs-waTemplate' value='" + esc(s.waTemplate) + "' placeholder='new_lead'></label><label>Template language<input id='cs-waLang' value='" + esc(s.waLang) + "'></label></div>" +
        "<p class='hint'>Without a template, alerts are plain text, and Meta only delivers them if that team number messaged the business number in the last 24 hours. For reliable alerts, create an approved template with 3 variables: name, phone, service.</p><button class='btn sm' data-test='whatsapp'>Send test WhatsApp</button></section>" +
        "<section><h3>" + ic("shield-check") + "Spam protection</h3><p class='hint' style='margin-top:0'>Always on: hidden honeypot field and a limit of 5 enquiries per 10 minutes per connection. Add free Cloudflare Turnstile keys for an extra check (usually invisible to visitors).</p>" +
        "<div class='g2'><label>Turnstile site key<input id='cs-tsSite' value='" + esc(s.tsSite) + "' placeholder='0x4AAAA…'></label><label>Turnstile secret key" + sec("tsSecret", "0x4AAAA…") + "</label></div></section>" +
        "</div><p class='err' id='cs-err'></p><div class='modal-actions'><button class='btn' id='cs-x'>Cancel</button><button class='btn pri' id='cs-go'>Save settings</button></div>");
      $("#modal-card").classList.add("wide");
      var close = function () { $("#modal-card").classList.remove("wide"); closeModal(); };
      var collect = function () { var o = {}; ["emailOn", "waOn"].forEach(function (k) { o[k] = $("#cs-" + k).checked; }); ["emailTo", "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom", "waToken", "waPhoneId", "waTo", "waTemplate", "waLang", "tsSite", "tsSecret"].forEach(function (k) { o[k] = $("#cs-" + k).value.trim(); }); return o; };
      var saveIt = function () { return api("crm_settings_save", { settings: collect() }).then(function (x) { if (!x.ok) $("#cs-err").textContent = x.error; return x.ok; }); };
      $("#cs-x").onclick = close;
      $("#cs-go").onclick = function () { saveIt().then(function (ok) { if (ok) { close(); toast("Settings saved ✓"); } }); };
      $$("[data-test]").forEach(function (b) { b.onclick = function () { var ch = b.dataset.test; b.disabled = true; saveIt().then(function (ok) { if (!ok) { b.disabled = false; return; } api("crm_test", { channel: ch }).then(function (x) { b.disabled = false; x.ok ? toast("Test " + ch + ": " + x.result + " ✓") : toast(x.error, true); }); }); }; });
    });
  }
})();
