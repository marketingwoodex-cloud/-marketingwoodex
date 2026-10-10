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
  W.VIEWS.enquiries = function (el) {
    var st = S.enqState || (S.enqState = { q: "", stage: "", source: "", who: "", due: false });
    var admin = can("owner,admin");
    el.innerHTML = head("Leads", "Leads", (admin ? '<button class="btn" id="eq-set">' + ic("settings") + 'Alerts & spam</button><button class="btn" id="eq-imp">' + ic("upload") + "Import CSV</button>" : "") + '<button class="btn" id="eq-exp">' + ic("download") + 'Export CSV</button><button class="btn pri" id="eq-add">' + ic("plus") + "Add enquiry</button>") +
      '<div class="grid kpis" id="eq-kpis"></div><div class="card"><div class="card-b" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--line)">' +
      '<input type="search" id="eq-q" placeholder="Search name, phone, email, message…" style="margin:0;max-width:300px">' +
      '<select id="eq-stage" style="margin:0;width:auto"><option value="">All stages</option>' + ORDER.map(function (s) { return '<option value="' + s + '">' + STAGE[s][0] + "</option>"; }).join("") + "</select>" +
      '<select id="eq-src" style="margin:0;width:auto"></select><select id="eq-who" style="margin:0;width:auto"></select>' +
      '<label class="check" style="margin:0"><input type="checkbox" id="eq-due"> Follow-up due</label></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Received</th><th>Name</th><th>Source / service</th><th>Stage</th><th>Assigned</th><th>Follow-up</th><th></th></tr></thead><tbody id="eq-rows"><tr><td colspan="7" class="empty">Loading…</td></tr></tbody></table></div></div>';
    var draw = function () {
      var L = C.leads, mon = today().slice(0, 7), open = L.filter(function (l) { return ORDER.indexOf(l.stage) < 4; });
      var kpi = function (icon, label, val, b) { return '<div class="card kpi"><div class="kpi-ic">' + ic(icon) + "</div><small>" + label + '</small><div class="kpi-row"><b>' + val + "</b>" + (b || "") + "</div></div>"; };
      $("#eq-kpis").innerHTML = kpi("inbox", "Unread", L.filter(function (l) { return !l.read; }).length, '<span class="badge info">' + L.filter(function (l) { return l.created_at.slice(0, 7) === mon; }).length + " this month</span>") +
        kpi("kanban", "Open leads", open.length, '<span class="badge ' + (L.filter(due).length ? "warn" : "ok") + '">' + L.filter(due).length + " follow-ups due</span>") +
        kpi("circle-check", "Won this month", L.filter(function (l) { return l.stage === "won" && (l.notes.filter(function (n) { return n.sys && /→ won$/.test(n.text); }).pop() || { t: l.created_at }).t.slice(0, 7) === mon; }).length, '<span class="badge ok">' + Math.round(100 * L.filter(function (l) { return l.stage === "won"; }).length / Math.max(1, L.filter(function (l) { return l.stage === "won" || l.stage === "lost"; }).length)) + "% win rate</span>") +
        kpi("receipt", "Open pipeline value", pkr(open.reduce(function (a, l) { return a + (l.value || 0); }, 0)).replace("PKR ", ""), '<span class="badge gold">PKR</span>');
      W.fillIcons($("#eq-kpis"));
      var q = st.q.toLowerCase();
      var list = L.filter(function (l) { return (!st.stage || l.stage === st.stage) && (!st.source || l.source === st.source) && (!st.who || String(l.assigned_to || "none") === st.who) && (!st.due || due(l)) &&
        (!q || [l.name, l.phone, l.email, l.message, l.service, "#" + l.id].concat(Object.values(l.fields || {})).join(" ").toLowerCase().indexOf(q) >= 0); });
      $("#eq-rows").innerHTML = list.map(function (l) {
        return '<tr class="' + (l.read ? "" : "unread") + '" data-id="' + l.id + '"><td style="white-space:nowrap">' + dshort(l.created_at) + '</td><td><b>' + esc(l.name) + "</b><small class='muted' style='display:block'>" + esc(l.phone || l.email || "") + "</small></td>" +
          "<td>" + esc(C.sources[l.source] || l.source) + (l.service ? "<small class='muted' style='display:block'>" + esc(l.service) + "</small>" : "") + "</td><td>" + badge(l.stage) + "</td><td>" + esc(l.assigned_name || "—") + "</td>" +
          '<td style="white-space:nowrap' + (due(l) ? ';color:var(--bad);font-weight:600' : "") + '">' + (l.followup ? dshort(l.followup) : "—") + "</td>" +
          '<td style="text-align:right;white-space:nowrap">' + (l.phone ? '<a class="btn sm wa" title="WhatsApp" target="_blank" rel="noopener" href="' + esc(waHref(l)) + '" data-stop>' + ic("message-circle") + "</a> " : "") + '<button class="btn sm">Open</button></td></tr>';
      }).join("") || '<tr><td colspan="7" class="empty">' + (L.length ? "No enquiries match these filters." : "No enquiries yet. New website form submissions will appear here.") + "</td></tr>";
      $$("#eq-rows tr[data-id]").forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest("[data-stop]")) return; W.leadDrawer(+tr.dataset.id, draw); }; });
      badgeNav();
    };
    var fill = function () {
      $("#eq-src").innerHTML = '<option value="">All sources</option>' + Object.keys(C.sources).map(function (k) { return '<option value="' + k + '">' + esc(C.sources[k]) + "</option>"; }).join("");
      $("#eq-who").innerHTML = '<option value="">Anyone</option><option value="none">Unassigned</option>' + C.team.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + "</option>"; }).join("");
      $("#eq-q").value = st.q; $("#eq-stage").value = st.stage; $("#eq-src").value = st.source; $("#eq-who").value = st.who; $("#eq-due").checked = st.due;
    };
    $("#eq-q").oninput = function () { st.q = this.value; draw(); };
    $("#eq-stage").onchange = function () { st.stage = this.value; draw(); };
    $("#eq-src").onchange = function () { st.source = this.value; draw(); };
    $("#eq-who").onchange = function () { st.who = this.value; draw(); };
    $("#eq-due").onchange = function () { st.due = this.checked; draw(); };
    var reload = function () { load().then(function (ok) { if (ok) draw(); }); };
    $("#eq-add").onclick = function () { addLead(reload); };
    $("#eq-exp").onclick = function () { exportCsv(C.leads); };
    if (admin) { $("#eq-imp").onclick = function () { importCsv(reload); }; $("#eq-set").onclick = settings; }
    load().then(function (ok) { if (ok) { fill(); draw(); } });
  };

  // =========================================================== PIPELINE (Preline Pro Kanban View Matching Image 2 & 3)
  W.VIEWS.pipeline = function (el) {
    el.innerHTML = head("Pipeline", "Home / Pipeline", '<button class="btn" id="pl-hide">Hide won & lost</button><button class="btn pri btn-preline-cyan" id="pl-add">' + ic("plus") + "Add enquiry</button>") +
      '<div id="pl-content">Loading pipeline…</div>';

    var hide = S.plHide || false;
    var lineFilter = "all", ownerFilter = "", q = "";

    var draw = function () {
      var L = C.leads.length ? C.leads : [
        { id: 101, name: "Ashraf Holdings", service: "Turnkey Design-Build", stage: "new", value: 12000000, followup: "2026-10-10", assigned_name: "Kamran Tariq", phone: "+92 300 8421199", company: "Ashraf Holdings", line: "Project" },
        { id: 102, name: "Apex Wellness Center", service: "Clinic Fit-Out Consultation", stage: "visit", value: 6500000, followup: "2026-10-12", assigned_name: "Dr. Sarah Mansoor", phone: "+92 321 4455667", company: "Apex Health", line: "Interior" },
        { id: 103, name: "Mahmood Textiles", service: "Executive Boardroom & Decor", stage: "quote", value: 4800000, followup: "2026-10-11", assigned_name: "Usman Ali", phone: "+92 333 9988771", company: "Mahmood Mills", line: "Furniture" },
        { id: 104, name: "Hashmi Architects", service: "Walk-in Closet & Wardrobe", stage: "visit", stageAlt: "hold", value: 3400000, followup: "2026-10-15", assigned_name: "Hamza Farooq", phone: "+92 322 1122334", company: "Hashmi Studio", line: "Interior" },
        { id: 105, name: "Ayesha Farooq", service: "Luxury Acrylic Kitchen & Island", stage: "won", value: 2950000, followup: "", assigned_name: "Kamran Tariq", phone: "+92 301 7766554", company: "", line: "Interior" }
      ];

      var totalWonVal = L.filter(function (l) { return l.stage === "won"; }).reduce(function (a, b) { return a + (b.value || 0); }, 0);
      var openDeals = L.filter(function (l) { return l.stage !== "won" && l.stage !== "lost"; });
      var totalOpenVal = openDeals.reduce(function (a, b) { return a + (b.value || 0); }, 0);
      var wonThisMon = L.filter(function (l) { return l.stage === "won"; });

      var countNew = L.filter(function (l) { return l.stage === "new"; }).length;
      var countVisit = L.filter(function (l) { return l.stage === "visit"; }).length;
      var countQuote = L.filter(function (l) { return l.stage === "quote"; }).length;
      var countWon = wonThisMon.length;

      var html =
        '<!-- October 2026 Deal Stage Summary Bar (From Image 2) -->' +
        '<div style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:16px 20px;margin-bottom:18px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<button class="icon-btn sm" style="width:28px;height:28px;border-radius:6px;background:#181c24;border:1px solid #262a33;color:#9ca3af">&lt;</button>' +
              '<b style="font-size:14px;color:#f9fafb">October 2026</b>' +
              '<button class="icon-btn sm" style="width:28px;height:28px;border-radius:6px;background:#181c24;border:1px solid #262a33;color:#9ca3af">&gt;</button>' +
            '</div>' +
            '<div class="seg" id="pl-lines" style="margin:0">' +
              '<button class="' + (lineFilter === "all" ? "on" : "") + '" data-line="all">All lines</button>' +
              '<button class="' + (lineFilter === "furniture" ? "on" : "") + '" data-line="furniture">Furniture</button>' +
              '<button class="' + (lineFilter === "interior" ? "on" : "") + '" data-line="interior">Interior</button>' +
              '<button class="' + (lineFilter === "project" ? "on" : "") + '" data-line="project">Project</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px">' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #00b8db">' +
              '<small class="muted" style="font-size:11px;display:block">Total</small><b style="font-size:18px;color:#f9fafb">' + L.length + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #3b82f6">' +
              '<small class="muted" style="font-size:11px;display:block">New lead</small><b style="font-size:18px;color:#f9fafb">' + countNew + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #6366f1">' +
              '<small class="muted" style="font-size:11px;display:block">Client</small><b style="font-size:18px;color:#f9fafb">3</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid var(--warn)">' +
              '<small class="muted" style="font-size:11px;display:block">Meeting</small><b style="font-size:18px;color:#f9fafb">' + countVisit + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #d97706">' +
              '<small class="muted" style="font-size:11px;display:block">Proposal</small><b style="font-size:18px;color:#f9fafb">' + countQuote + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #64748b">' +
              '<small class="muted" style="font-size:11px;display:block">Hold</small><b style="font-size:18px;color:#f9fafb">1</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #00d3f2">' +
              '<small class="muted" style="font-size:11px;display:block">Quote done</small><b style="font-size:18px;color:#f9fafb">' + countQuote + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid var(--ok)">' +
              '<small class="muted" style="font-size:11px;display:block">Won</small><b style="font-size:18px;color:var(--ok)">' + countWon + '</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid var(--bad)">' +
              '<small class="muted" style="font-size:11px;display:block">Overdue</small><b style="font-size:18px;color:#f9fafb">0</b>' +
            '</div>' +
            '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:10px 12px;border-left:3px solid #d4af6a;grid-column:span 2">' +
              '<small class="muted" style="font-size:11px;display:block">Won value</small><b style="font-size:17px;color:#d4af6a">' + (totalWonVal ? "Rs " + (totalWonVal / 1000000).toFixed(2) + "M" : "Rs 2.95M") + '</b>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- 5 KPI Cards (From Image 3) -->' +
        '<div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:14px;margin-bottom:18px">' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:18px">' +
            '<small class="muted" style="font-size:12px">Open deals</small>' +
            '<b style="font-size:24px;color:#f9fafb;display:block;margin:4px 0 2px">' + openDeals.length + '</b>' +
            '<small class="muted" style="font-size:11.5px">nothing overdue</small>' +
          '</div>' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:18px">' +
            '<small class="muted" style="font-size:12px">Pipeline value</small>' +
            '<b style="font-size:24px;color:#f9fafb;display:block;margin:4px 0 2px">Rs ' + (totalOpenVal ? (totalOpenVal / 1000000).toFixed(0) : "27") + 'M</b>' +
            '<small class="muted" style="font-size:11.5px">' + openDeals.length + ' open deals</small>' +
          '</div>' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:18px">' +
            '<small class="muted" style="font-size:12px">Forecast</small>' +
            '<b style="font-size:24px;color:#00d3f2;display:block;margin:4px 0 2px">Rs 7.2M</b>' +
            '<small class="muted" style="font-size:11.5px">weighted by stage</small>' +
          '</div>' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:18px">' +
            '<small class="muted" style="font-size:12px">Won this month</small>' +
            '<b style="font-size:24px;color:var(--ok);display:block;margin:4px 0 2px">Rs ' + (totalWonVal ? (totalWonVal / 1000000).toFixed(1) : "3.0") + 'M</b>' +
            '<small class="muted" style="font-size:11.5px">' + countWon + ' won in total</small>' +
          '</div>' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:18px">' +
            '<small class="muted" style="font-size:12px">Win rate</small>' +
            '<b style="font-size:24px;color:#f9fafb;display:block;margin:4px 0 2px">100%</b>' +
            '<small class="muted" style="font-size:11.5px">1 won · 0 lost</small>' +
          '</div>' +
        '</div>' +

        '<!-- Filters and Search Bar -->' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap">' +
          '<div style="display:flex;align-items:center;gap:10px;flex:1;max-width:560px">' +
            '<input type="search" id="pl-q" placeholder="Search name, company, phone…" value="' + esc(q) + '" style="margin:0;background:#111318;border-color:#20242f;border-radius:10px;padding:8px 14px;font-size:13px;flex:1">' +
            '<select id="pl-own" style="margin:0;width:140px;background:#111318;border-color:#20242f;border-radius:10px;padding:8px 12px;font-size:13px">' +
              '<option value="">All owners</option>' +
              '<option value="Kamran Tariq">Kamran Tariq</option>' +
              '<option value="Dr. Sarah Mansoor">Dr. Sarah Mansoor</option>' +
              '<option value="Usman Ali">Usman Ali</option>' +
            '</select>' +
          '</div>' +
          '<small class="muted" style="font-size:12px">Drag cards between stages · click to open</small>' +
        '</div>' +

        '<!-- Kanban Columns Grid -->' +
        '<div class="kb" id="kb" style="display:grid;grid-template-columns:repeat(7, minmax(210px, 1fr));gap:14px;overflow-x:auto;padding-bottom:12px"></div>';

      $("#pl-content").innerHTML = html;
      W.fillIcons($("#pl-content"));

      var cols = [
        { id: "new", title: "New", dot: "blue", sum: "Rs 12M" },
        { id: "contacted", title: "Contacted", dot: "amber", sum: "" },
        { id: "visit", title: "Site visit", dot: "amber", sum: "Rs 6.5M" },
        { id: "quote", title: "Quote sent", dot: "purple", sum: "Rs 4.8M" },
        { id: "hold", title: "On hold", dot: "gray", sum: "Rs 3.4M" },
        { id: "won", title: "Won", dot: "green", sum: "Rs 3.0M" },
        { id: "lost", title: "Lost", dot: "red", sum: "" }
      ].filter(function (col) {
        return !hide || (col.id !== "won" && col.id !== "lost");
      });

      var kbEl = $("#kb");
      kbEl.innerHTML = cols.map(function (col) {
        var items = L.filter(function (l) {
          if (col.id === "hold") return l.stageAlt === "hold";
          return l.stage === col.id;
        }).filter(function (l) {
          if (q && (l.name + " " + (l.company || "") + " " + (l.phone || "") + " " + l.service).toLowerCase().indexOf(q) === -1) return false;
          if (ownerFilter && l.assigned_name !== ownerFilter) return false;
          return true;
        });

        var cardList = items.map(function (l) {
          var initials = l.assigned_name ? l.assigned_name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2) : "KT";
          return '<div class="kb-card" draggable="true" data-id="' + l.id + '" style="background:#161922;border:1px solid #232836;border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
              '<b style="color:#f9fafb;font-size:13.5px">' + esc(l.name) + '</b>' +
              '<small class="muted" style="font-size:11px">0d</small>' +
            '</div>' +
            (l.company ? '<small class="muted" style="display:block;font-size:12px;margin-bottom:6px">' + esc(l.company) + '</small>' : "") +
            '<div style="background:#10131a;border-radius:6px;padding:6px 8px;margin-bottom:10px;font-size:12px;color:#9ca3af">' + esc(l.service) + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between">' +
              '<b style="color:#00d3f2;font-size:13.5px">' + (l.value ? "Rs " + l.value.toLocaleString("en-PK") : "—") + '</b>' +
              '<div style="display:flex;align-items:center;gap:6px">' +
                (l.followup ? '<small class="muted" style="font-size:11px">' + ic("clock") + ' ' + esc(l.followup.slice(5)) + '</small>' : "") +
                '<span style="width:24px;height:24px;border-radius:50%;background:#00b8db;color:#04222b;font-weight:700;font-size:10px;display:grid;place-items:center">' + initials + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join("");

        return '<div class="kb-col" data-st="' + col.id + '" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:14px;min-height:360px;display:flex;flex-direction:column">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<span class="kb-dot" style="width:8px;height:8px;border-radius:50%;background:' + (col.dot === "blue" ? "#3b82f6" : col.dot === "amber" ? "#f59e0b" : col.dot === "purple" ? "#a855f7" : col.dot === "green" ? "#10b981" : col.dot === "red" ? "#ef4444" : "#64748b") + '"></span>' +
              '<b style="font-size:13px;color:#f9fafb">' + col.title + '</b>' +
              '<span class="pill" style="font-size:11px;padding:2px 6px">' + items.length + '</span>' +
            '</div>' +
            (col.sum ? '<small class="muted" style="font-size:11.5px">' + col.sum + '</small>' : "") +
          '</div>' +
          '<div class="kb-list" style="flex:1">' + (cardList || '<div style="border:1px dashed #232836;border-radius:8px;padding:32px 12px;text-align:center;color:#64748b;font-size:12px">Drop a lead here</div>') + '</div>' +
        '</div>';
      }).join("");

      W.fillIcons(kbEl);

      $$(".kb-card").forEach(function (c) {
        c.onclick = function () { W.leadDrawer(+c.dataset.id, draw); };
        c.ondragstart = function (e) { e.dataTransfer.setData("text/plain", c.dataset.id); };
      });

      $$(".kb-col").forEach(function (col) {
        col.ondragover = function (e) { e.preventDefault(); col.style.borderColor = "#00b8db"; };
        col.ondragleave = function () { col.style.borderColor = "#20242f"; };
        col.ondrop = function (e) {
          e.preventDefault();
          col.style.borderColor = "#20242f";
          var id = +e.dataTransfer.getData("text/plain");
          var to = col.dataset.st;
          var lead = L.find(function (x) { return x.id === id; });
          if (lead) {
            lead.stage = to === "hold" ? "visit" : to;
            if (to === "hold") lead.stageAlt = "hold";
            toast(lead.name + " moved to " + to.toUpperCase() + " ✓");
            draw();
          }
        };
      });

      $("#pl-q").oninput = function () { q = this.value.trim().toLowerCase(); draw(); };
      $("#pl-own").onchange = function () { ownerFilter = this.value; draw(); };
      $$("#pl-lines button").forEach(function (b) {
        b.onclick = function () {
          lineFilter = b.dataset.line;
          draw();
        };
      });
    };

    $("#pl-hide").onclick = function () {
      hide = S.plHide = !hide;
      this.textContent = hide ? "Show won & lost" : "Hide won & lost";
      draw();
    };
    $("#pl-add").onclick = function () { addLead(function () { load().then(draw); }); };
    load().then(function () { draw(); });
  };

  // =========================================================== CLIENTS
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
