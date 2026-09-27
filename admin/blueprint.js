/* Woodex Master Blueprint views — Pipeline, Visits, Clients, Testimonials,
 * Services, Locations, Analytics, Theme, Navigation, SEO, Audit, Versions,
 * Backups, Health + Quick Actions. Runs after the main dashboard script and
 * talks to it through window.WxDash. */
(function () {
  "use strict";
  function boot(tries) {
    var D = window.WxDash;
    if (!D) {
      if (tries > 0) setTimeout(function () { boot(tries - 1); }, 250);
      return;
    }
    init(D);
  }
  function init(D) {
  var esc = D.esc;

  var TITLES2 = {
    pipeline: "Sales Pipeline", visits: "Site Visits", clients: "Clients",
    testimonials: "Testimonials", services: "Services", locations: "Locations",
    analytics: "Analytics", theme: "Theme", navigation: "Navigation",
    seo: "SEO Manager", audit: "Audit Trail", versions: "Versions",
    backups: "Backups", health: "System Health"
  };
  function setTitle(v) {
    document.getElementById("wx-view-title").textContent = TITLES2[v] || v;
  }
  function loadingCard(msg) {
    return '<div class="card"><div class="card-body text-center text-muted py-5">' + esc(msg || "Loading…") + "</div></div>";
  }
  function errorCard(msg) {
    return '<div class="card"><div class="card-body text-center text-muted py-5">' + esc(msg) + "</div></div>";
  }
  function gateWrites(root) {
    if (D.canWrite()) return;
    root.querySelectorAll("[data-write]").forEach(function (el) { el.style.display = "none"; });
  }
  function jres(r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); }
  function needOk(res, what) {
    if (res.s !== 200 || !res.j || res.j.error) throw new Error((res.j && res.j.error) || (what || "Request failed."));
    return res.j;
  }

  /* ---------- generic modal ---------- */
  var bpModal = null;
  function openBpModal(title, bodyHTML, saveLabel, onSave, wide) {
    var old = document.getElementById("wx-bp-modal");
    if (old) old.remove();
    var div = document.createElement("div");
    div.innerHTML = '<div class="modal fade" id="wx-bp-modal" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog' + (wide === false ? "" : " modal-lg") + '"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"></h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="button" class="btn btn-dark" id="wx-bp-save"></button></div></div></div></div>';
    document.body.appendChild(div.firstChild);
    var mEl = document.getElementById("wx-bp-modal");
    mEl.querySelector(".modal-title").textContent = title;
    mEl.querySelector(".modal-body").innerHTML = bodyHTML;
    var saveBtn = mEl.querySelector("#wx-bp-save");
    if (!onSave) { saveBtn.style.display = "none"; }
    else {
      saveBtn.textContent = saveLabel || "Save";
      saveBtn.onclick = function () { onSave(mEl, saveBtn); };
    }
    bpModal = new bootstrap.Modal(mEl);
    bpModal.show();
  }
  function closeBpModal() { if (bpModal) bpModal.hide(); }
  function field(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function lines(id) {
    return field(id).split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function inRow(label, id, val, type, hint) {
    return '<div class="mb-3"><label class="form-label fw-bold" for="' + id + '">' + esc(label) + "</label>" +
      '<input class="form-control" id="' + id + '" type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"' +
      (hint ? ' placeholder="' + esc(hint) + '"' : "") + " />" +
      (hint && type !== "text" ? "" : "") + "</div>";
  }
  function txRow(label, id, val, rows, hint) {
    return '<div class="mb-3"><label class="form-label fw-bold" for="' + id + '">' + esc(label) + "</label>" +
      '<textarea class="form-control" id="' + id + '" rows="' + (rows || 3) + '"' +
      (hint ? ' placeholder="' + esc(hint) + '"' : "") + ">" + esc(val == null ? "" : val) + "</textarea></div>";
  }
  function selRow(label, id, options, val) {
    var opts = options.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("");
    return '<div class="mb-3"><label class="form-label fw-bold" for="' + id + '">' + esc(label) + "</label>" +
      '<select class="form-select" id="' + id + '">' + opts + "</select></div>";
  }

  /* ================= PIPELINE ================= */
  var STAGES = ["new", "contacted", "site_visit", "quoted", "won", "lost"];
  var STAGE_LABEL = { new: "New", contacted: "Contacted", site_visit: "Site Visit", quoted: "Quoted", won: "Won", lost: "Lost" };
  function stageOf(r) { return STAGES.indexOf(r.pipeline_stage) >= 0 ? r.pipeline_stage : "new"; }
  function loadPipeline() {
    setTitle("pipeline");
    var root = document.getElementById("wx-root-pipeline");
    root.innerHTML = loadingCard("Loading pipeline…");
    D.api("/.netlify/functions/cms-enquiries?limit=500", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load enquiries.");
      var rows = data.enquiries || [];
      var grand = data.total != null ? data.total : rows.length;
      var counts = {}; STAGES.forEach(function (s) { counts[s] = 0; });
      rows.forEach(function (r) { counts[stageOf(r)]++; });
      var total = rows.length, conv = total ? Math.round(counts.won / total * 100) : 0;
      var scopeNote = grand > total ? "Showing " + total + " of " + grand + " enquiries" : total + " enquiries";
      var cards = STAGES.map(function (st) {
        return '<div class="col-6 col-md-2 mb-3"><div class="card h-100"><div class="card-body text-center">' +
          '<div class="h3 mb-1">' + counts[st] + "</div>" + D.statusBadge(st) + "</div></div></div>";
      }).join("");
      var body = rows.map(function (r) {
        var st = stageOf(r);
        var opts = STAGES.map(function (s) {
          return '<option value="' + s + '"' + (s === st ? " selected" : "") + ">" + STAGE_LABEL[s] + "</option>";
        }).join("");
        var stageCell = D.canWrite()
          ? '<select class="form-select form-select-sm" data-pstage="' + r.id + '">' + opts + "</select>"
          : D.statusBadge(st);
        return "<tr><td>" + esc(r.name) + "</td><td>" + esc(r.phone) + "</td><td>" + esc(r.project_type || "–") +
          '</td><td><span class="badge text-bg-secondary">' + esc(r.source || "website") + "</span></td>" +
          "<td>" + D.timeAgo(r.created_at) + "</td><td>" + stageCell + "</td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="row">' + cards + "</div>" +
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Active pipeline</span>' +
        '<span class="text-muted small">' + scopeNote + " · " + conv + "% won</span></div>" +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Name</th><th>Phone</th><th>Type</th><th>Source</th><th>Received</th><th>Stage</th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="6" class="text-center text-muted py-4">No enquiries yet.</td></tr>') +
        "</tbody></table></div></div>";
      root.querySelectorAll("[data-pstage]").forEach(function (sel) {
        sel.addEventListener("change", function () {
          var id = sel.getAttribute("data-pstage");
          D.api("/.netlify/functions/cms-enquiries", { method: "PATCH", body: { id: id, pipeline_stage: sel.value } })
            .then(jres).then(function (res) { needOk(res, "Stage update failed."); loadPipeline(); })
            .catch(function (e) { alert(e.message); loadPipeline(); });
        });
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load the pipeline."); });
  }

  /* ================= SITE VISITS ================= */
  var VISIT_STATUS = [["scheduled", "Scheduled"], ["done", "Done"], ["cancelled", "Cancelled"]];
  function loadVisits() {
    setTitle("visits");
    var root = document.getElementById("wx-root-visits");
    root.innerHTML = loadingCard("Loading site visits…");
    D.api("/.netlify/functions/cms-site-visits", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load site visits.");
      var rows = data.visits || data.site_visits || [];
      var body = rows.map(function (v) {
        return '<tr><td>' + esc(v.client_name) + "</td><td>" + esc(v.phone || "–") + "</td><td>" + esc(v.address || "–") +
          "</td><td>" + (v.visit_date ? esc(new Date(v.visit_date).toLocaleString()) : "–") + "</td>" +
          "<td>" + D.statusBadge(v.status) + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-vact="edit" data-id="' + v.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-vact="del" data-id="' + v.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Site visits</span>' +
        '<button class="btn btn-dark btn-sm" data-write id="wx-visit-new"><i class="bi bi-plus-lg"></i> Schedule visit</button></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Client</th><th>Phone</th><th>Address</th><th>Date</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="6" class="text-center text-muted py-4">No site visits scheduled.</td></tr>') +
        "</tbody></table></div></div>";
      var nw = document.getElementById("wx-visit-new");
      if (nw) nw.onclick = function () { openVisitModal(null); };
      root.querySelectorAll("[data-vact]").forEach(function (b) {
        b.onclick = function () {
          var v = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          if (b.getAttribute("data-vact") === "edit") openVisitModal(v);
          else if (confirm("Delete this visit?")) {
            D.api("/.netlify/functions/cms-site-visits", { method: "DELETE", body: { id: v.id } })
              .then(jres).then(function (res) { needOk(res); loadVisits(); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load site visits."); });
  }
  function openVisitModal(v) {
    var dt = v && v.visit_date ? new Date(v.visit_date).toISOString().slice(0, 16) : "";
    openBpModal(v ? "Edit visit" : "Schedule visit",
      inRow("Client name", "vv-name", v && v.client_name) +
      inRow("Phone", "vv-phone", v && v.phone) +
      inRow("Address", "vv-addr", v && v.address) +
      inRow("Date & time", "vv-date", dt, "datetime-local") +
      selRow("Status", "vv-status", VISIT_STATUS, v ? v.status : "scheduled") +
      txRow("Notes", "vv-notes", v && v.notes, 3),
      "Save",
      function (mEl, btn) {
        var name = field("vv-name").trim();
        if (name.length < 2) { alert("Client name is required."); return; }
        btn.disabled = true;
        var payload = {
          client_name: name, phone: field("vv-phone").trim(), address: field("vv-addr").trim(),
          visit_date: field("vv-date") || null, status: field("vv-status"), notes: field("vv-notes").trim()
        };
        var req = v
          ? D.api("/.netlify/functions/cms-site-visits", { method: "PATCH", body: Object.assign({ id: v.id }, payload) })
          : D.api("/.netlify/functions/cms-site-visits", { method: "POST", body: payload });
        req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadVisits(); })
          .catch(function (e) { btn.disabled = false; alert(e.message); });
      });
  }
  function quickVisit() { D.showView("visits"); setTimeout(function () { openVisitModal(null); }, 60); }

  /* ================= CLIENTS ================= */
  function loadClients(q) {
    setTitle("clients");
    var root = document.getElementById("wx-root-clients");
    root.innerHTML = loadingCard("Loading clients…");
    var url = "/.netlify/functions/cms-clients" + (q ? "?q=" + encodeURIComponent(q) : "");
    D.api(url, { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load clients.");
      var rows = data.clients || [];
      var body = rows.map(function (c) {
        return '<tr><td>' + esc(c.name) + "</td><td>" + esc(c.company || "–") + "</td><td>" + esc(c.phone || "–") +
          "</td><td>" + esc(c.email || "–") + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-cact="edit" data-id="' + c.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-cact="del" data-id="' + c.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">' +
        '<span class="fw-bold">Clients</span>' +
        '<div class="d-flex gap-2"><input class="form-control form-control-sm" id="wx-client-q" style="width:220px" placeholder="Search name, company, phone…" value="' + esc(q || "") + '" />' +
        '<button class="btn btn-dark btn-sm" data-write id="wx-client-new"><i class="bi bi-plus-lg"></i> Add client</button></div></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="5" class="text-center text-muted py-4">No clients yet.</td></tr>') +
        "</tbody></table></div></div>";
      var qi = document.getElementById("wx-client-q"), deb = null;
      qi.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(function () { loadClients(qi.value.trim()); }, 400); });
      var nw = document.getElementById("wx-client-new");
      if (nw) nw.onclick = function () { openClientModal(null); };
      root.querySelectorAll("[data-cact]").forEach(function (b) {
        b.onclick = function () {
          var c = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          if (b.getAttribute("data-cact") === "edit") openClientModal(c);
          else if (confirm("Delete this client?")) {
            D.api("/.netlify/functions/cms-clients", { method: "DELETE", body: { id: c.id } })
              .then(jres).then(function (res) { needOk(res); loadClients(q); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load clients."); });
  }
  function openClientModal(c) {
    openBpModal(c ? "Edit client" : "Add client",
      inRow("Name", "vc-name", c && c.name) +
      inRow("Company", "vc-company", c && c.company) +
      inRow("Phone", "vc-phone", c && c.phone) +
      inRow("Email", "vc-email", c && c.email, "email") +
      txRow("Address", "vc-addr", c && c.address, 2) +
      txRow("Notes", "vc-notes", c && c.notes, 3),
      "Save",
      function (mEl, btn) {
        var name = field("vc-name").trim();
        if (name.length < 2) { alert("Name is required."); return; }
        btn.disabled = true;
        var payload = {
          name: name, company: field("vc-company").trim(), phone: field("vc-phone").trim(),
          email: field("vc-email").trim(), address: field("vc-addr").trim(), notes: field("vc-notes").trim()
        };
        var req = c
          ? D.api("/.netlify/functions/cms-clients", { method: "PATCH", body: Object.assign({ id: c.id }, payload) })
          : D.api("/.netlify/functions/cms-clients", { method: "POST", body: payload });
        req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadClients(); })
          .catch(function (e) { btn.disabled = false; alert(e.message); });
      });
  }

  /* ================= TESTIMONIALS ================= */
  function stars(n) {
    var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆";
    return '<span style="color:#b98a2f;letter-spacing:2px">' + s + "</span>";
  }
  function loadTestimonials() {
    setTitle("testimonials");
    var root = document.getElementById("wx-root-testimonials");
    root.innerHTML = loadingCard("Loading testimonials…");
    D.api("/.netlify/functions/cms-testimonials", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load testimonials.");
      var rows = data.testimonials || [];
      var body = rows.map(function (t) {
        var q = esc(t.quote || "");
        if (q.length > 90) q = q.slice(0, 90) + "…";
        return "<tr><td>" + esc(t.client_name) + (t.company ? '<div class="text-muted small">' + esc(t.company) + "</div>" : "") +
          "</td><td>" + stars(Number(t.rating) || 5) + "</td><td>" + q + "</td>" +
          "<td>" + (t.featured ? '<span class="badge text-bg-warning">Featured</span> ' : "") +
          (t.published ? '<span class="badge text-bg-success">Published</span>' : '<span class="badge text-bg-secondary">Draft</span>') + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-tact="toggle" data-id="' + t.id + '">' + (t.published ? "Unpublish" : "Publish") + "</button>" +
          '<button class="btn btn-outline-dark" data-tact="edit" data-id="' + t.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-tact="del" data-id="' + t.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Testimonials</span>' +
        '<button class="btn btn-dark btn-sm" data-write id="wx-tm-new"><i class="bi bi-plus-lg"></i> Add testimonial</button></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Client</th><th>Rating</th><th>Quote</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="5" class="text-center text-muted py-4">No testimonials yet. Never invent client quotes.</td></tr>') +
        "</tbody></table></div></div>" +
        '<p class="text-muted small mt-2">Only real client words go here. Published testimonials feed the website testimonial data.</p>';
      var nw = document.getElementById("wx-tm-new");
      if (nw) nw.onclick = function () { openTestimonialModal(null); };
      root.querySelectorAll("[data-tact]").forEach(function (b) {
        b.onclick = function () {
          var t = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          var act = b.getAttribute("data-tact");
          if (act === "edit") openTestimonialModal(t);
          else if (act === "toggle") {
            D.api("/.netlify/functions/cms-testimonials", { method: "PATCH", body: { id: t.id, published: !t.published } })
              .then(jres).then(function (res) { needOk(res); loadTestimonials(); }).catch(function (e) { alert(e.message); });
          } else if (confirm("Delete this testimonial?")) {
            D.api("/.netlify/functions/cms-testimonials", { method: "DELETE", body: { id: t.id } })
              .then(jres).then(function (res) { needOk(res); loadTestimonials(); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load testimonials."); });
  }
  function openTestimonialModal(t) {
    openBpModal(t ? "Edit testimonial" : "Add testimonial",
      inRow("Client name", "vt-name", t && t.client_name) +
      inRow("Company", "vt-company", t && t.company) +
      selRow("Rating", "vt-rating", [["5", "5 stars"], ["4", "4 stars"], ["3", "3 stars"], ["2", "2 stars"], ["1", "1 star"]], String((t && t.rating) || 5)) +
      txRow("Quote (client's own words)", "vt-quote", t && t.quote, 4) +
      inRow("Project", "vt-project", t && t.project) +
      inRow("Service", "vt-service", t && t.service) +
      inRow("Location", "vt-location", t && t.location) +
      '<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="vt-featured"' + (t && t.featured ? " checked" : "") + ' /><label class="form-check-label" for="vt-featured">Featured</label></div>' +
      '<div class="form-check"><input class="form-check-input" type="checkbox" id="vt-pub"' + (t && t.published ? " checked" : "") + ' /><label class="form-check-label" for="vt-pub">Published</label></div>',
      "Save",
      function (mEl, btn) {
        var name = field("vt-name").trim(), quote = field("vt-quote").trim();
        if (name.length < 2 || quote.length < 4) { alert("Client name and their quote are required."); return; }
        btn.disabled = true;
        var payload = {
          client_name: name, company: field("vt-company").trim(), rating: Number(field("vt-rating")) || 5,
          quote: quote, project: field("vt-project").trim(), service: field("vt-service").trim(),
          location: field("vt-location").trim(),
          featured: mEl.querySelector("#vt-featured").checked, published: mEl.querySelector("#vt-pub").checked
        };
        var req = t
          ? D.api("/.netlify/functions/cms-testimonials", { method: "PATCH", body: Object.assign({ id: t.id }, payload) })
          : D.api("/.netlify/functions/cms-testimonials", { method: "POST", body: payload });
        req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadTestimonials(); })
          .catch(function (e) { btn.disabled = false; alert(e.message); });
      });
  }

  /* ================= SERVICES ================= */
  function svcRenderReady() { return typeof window.WxServiceRender !== "undefined"; }
  function loadServices() {
    setTitle("services");
    var root = document.getElementById("wx-root-services");
    root.innerHTML = loadingCard("Loading services…");
    D.api("/.netlify/functions/cms-services", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load services.");
      var rows = data.services || [];
      var body = rows.map(function (s) {
        return "<tr><td>" + esc(s.name) + (s.category ? '<div class="text-muted small">' + esc(s.category) + "</div>" : "") +
          '</td><td><code>/' + esc(s.slug || "") + "/</code></td>" +
          "<td>" + (s.published ? '<span class="badge text-bg-success">Published</span>' : '<span class="badge text-bg-secondary">Draft</span>') + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-sact="pub" data-id="' + s.id + '">' + (s.published ? "Unpublish" : "Publish") + "</button>" +
          '<button class="btn btn-outline-dark" data-sact="edit" data-id="' + s.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-sact="del" data-id="' + s.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Services</span>' +
        '<button class="btn btn-dark btn-sm" data-write id="wx-svc-new"><i class="bi bi-plus-lg"></i> Add service</button></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Name</th><th>URL</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="4" class="text-center text-muted py-4">No services yet.</td></tr>') +
        "</tbody></table></div></div>" +
        '<p class="text-muted small mt-2">Publishing a service generates its page, which you can then refine in the page builder.</p>';
      var nw = document.getElementById("wx-svc-new");
      if (nw) nw.onclick = function () { openServiceModal(null); };
      root.querySelectorAll("[data-sact]").forEach(function (b) {
        b.onclick = function () {
          var s = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          var act = b.getAttribute("data-sact");
          if (act === "edit") openServiceModal(s);
          else if (act === "pub") { s.published ? unpublishService(s) : publishService(s); }
          else if (confirm("Delete this service? This removes its database record (published pages stay until unpublished).")) {
            D.api("/.netlify/functions/cms-services", { method: "DELETE", body: { id: s.id } })
              .then(jres).then(function (res) { needOk(res); loadServices(); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load services."); });
  }
  function svcFormHTML(s) {
    var arr = function (v) { return Array.isArray(v) ? v.join("\n") : ""; };
    return inRow("Service name", "vs-name", s && s.name) +
      inRow("Category", "vs-cat", s && s.category, "text", "e.g. Interior, Architecture") +
      inRow("Hero title", "vs-hero", s && s.hero_title, "text", "Defaults to the service name") +
      txRow("Introduction", "vs-intro", s && s.introduction, 3) +
      txRow("Benefits (one per line)", "vs-benefits", arr(s && s.benefits), 3) +
      txRow("Process steps (one per line)", "vs-process", arr(s && s.process), 3) +
      txRow("Deliverables (one per line)", "vs-deliv", arr(s && s.deliverables), 3) +
      txRow("Gallery image URLs (one per line)", "vs-gallery", arr(s && s.gallery), 2) +
      txRow("FAQs (one per line: Question | Answer)", "vs-faqs", (s && s.faqs || []).map(function (f) { return typeof f === "string" ? f : (f.q + " | " + f.a); }).join("\n"), 3) +
      inRow("SEO title", "vs-seot", s && s.seo && s.seo.title) +
      txRow("SEO description", "vs-seod", s && s.seo && s.seo.description, 2);
  }
  function collectService() {
    var name = field("vs-name").trim();
    if (name.length < 2) { alert("Service name is required."); return null; }
    var faqs = lines("vs-faqs").map(function (l) {
      var p = l.split("|"); return { q: (p[0] || "").trim(), a: (p[1] || "").trim() };
    }).filter(function (f) { return f.q && f.a; });
    return {
      name: name, category: field("vs-cat").trim(), hero_title: field("vs-hero").trim(),
      introduction: field("vs-intro").trim(), benefits: lines("vs-benefits"),
      process: lines("vs-process"), deliverables: lines("vs-deliv"), gallery: lines("vs-gallery"),
      faqs: faqs, seo: { title: field("vs-seot").trim(), description: field("vs-seod").trim() }
    };
  }
  function openServiceModal(s) {
    openBpModal(s ? "Edit service" : "Add service", svcFormHTML(s), "Save", function (mEl, btn) {
      var data = collectService(); if (!data) return;
      btn.disabled = true;
      var req = s
        ? D.api("/.netlify/functions/cms-services", { method: "PATCH", body: Object.assign({ id: s.id }, data) })
        : D.api("/.netlify/functions/cms-services", { method: "POST", body: data });
      req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadServices(); })
        .catch(function (e) { btn.disabled = false; alert(e.message); });
    });
  }
  function publishService(s) {
    if (!svcRenderReady()) { alert("Service renderer is still loading. Try again in a moment."); return; }
    if (!confirm("Publish /" + s.slug + "/ to the live website?")) return;
    var n = window.WxServiceRender.normalizeService(s);
    var html = window.WxServiceRender.renderServiceHTML(n);
    D.cmsSavePage(s.slug + "/index.html", html, "CMS: publish service " + s.slug)
      .then(function () {
        return D.api("/.netlify/functions/cms-services", { method: "PATCH", body: { id: s.id, published: true, published_slug: s.slug } }).then(jres);
      })
      .then(function (res) { if (res) needOk(res); loadServices(); })
      .catch(function (e) { alert(e.message || "Publish failed."); });
  }
  function unpublishService(s) {
    if (!confirm("Unpublish /" + (s.published_slug || s.slug) + "/? The page will be removed from the website.")) return;
    D.api("/.netlify/functions/cms-delete", { method: "POST", body: { path: (s.published_slug || s.slug) + "/index.html", message: "CMS: unpublish service " + s.slug } })
      .then(jres).then(function () {
        return D.api("/.netlify/functions/cms-services", { method: "PATCH", body: { id: s.id, published: false } }).then(jres);
      })
      .then(function (res) { needOk(res); loadServices(); })
      .catch(function (e) { alert(e.message || "Unpublish failed."); });
  }

  /* ================= LOCATIONS ================= */
  function locRenderReady() { return typeof window.WxLocationRender !== "undefined"; }
  function loadLocations() {
    setTitle("locations");
    var root = document.getElementById("wx-root-locations");
    root.innerHTML = loadingCard("Loading locations…");
    D.api("/.netlify/functions/cms-locations", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load locations.");
      var rows = data.locations || [];
      var body = rows.map(function (l) {
        return "<tr><td>" + esc(l.name) + '</td><td><code>/' + esc(l.slug || "") + "/</code></td>" +
          "<td>" + (l.published ? '<span class="badge text-bg-success">Published</span>' : '<span class="badge text-bg-secondary">Draft</span>') + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-lact="pub" data-id="' + l.id + '">' + (l.published ? "Unpublish" : "Publish") + "</button>" +
          '<button class="btn btn-outline-dark" data-lact="edit" data-id="' + l.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-lact="del" data-id="' + l.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Locations</span>' +
        '<button class="btn btn-dark btn-sm" data-write id="wx-loc-new"><i class="bi bi-plus-lg"></i> Add location</button></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Name</th><th>URL</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="4" class="text-center text-muted py-4">No locations yet.</td></tr>') +
        "</tbody></table></div></div>";
      var nw = document.getElementById("wx-loc-new");
      if (nw) nw.onclick = function () { openLocationModal(null); };
      root.querySelectorAll("[data-lact]").forEach(function (b) {
        b.onclick = function () {
          var l = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          var act = b.getAttribute("data-lact");
          if (act === "edit") openLocationModal(l);
          else if (act === "pub") { l.published ? unpublishLocation(l) : publishLocation(l); }
          else if (confirm("Delete this location?")) {
            D.api("/.netlify/functions/cms-locations", { method: "DELETE", body: { id: l.id } })
              .then(jres).then(function (res) { needOk(res); loadLocations(); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load locations."); });
  }
  function openLocationModal(l) {
    var arr = function (v) { return Array.isArray(v) ? v.join("\n") : ""; };
    openBpModal(l ? "Edit location" : "Add location",
      inRow("Location name", "vl-name", l && l.name, "text", "e.g. Multan") +
      txRow("Introduction", "vl-intro", l && l.introduction, 3) +
      txRow("Services available (one per line)", "vl-services", arr(l && l.services), 3) +
      txRow("FAQs (one per line: Question | Answer)", "vl-faqs", (l && l.faqs || []).map(function (f) { return typeof f === "string" ? f : (f.q + " | " + f.a); }).join("\n"), 3) +
      inRow("Map embed URL", "vl-map", l && l.map_url, "text", "Google Maps embed link, optional") +
      inRow("SEO title", "vl-seot", l && l.seo && l.seo.title) +
      txRow("SEO description", "vl-seod", l && l.seo && l.seo.description, 2),
      "Save",
      function (mEl, btn) {
        var name = field("vl-name").trim();
        if (name.length < 2) { alert("Location name is required."); return; }
        var faqs = lines("vl-faqs").map(function (x) {
          var p = x.split("|"); return { q: (p[0] || "").trim(), a: (p[1] || "").trim() };
        }).filter(function (f) { return f.q && f.a; });
        var payload = {
          name: name, introduction: field("vl-intro").trim(), services: lines("vl-services"),
          faqs: faqs, map_url: field("vl-map").trim(),
          seo: { title: field("vl-seot").trim(), description: field("vl-seod").trim() }
        };
        btn.disabled = true;
        var req = l
          ? D.api("/.netlify/functions/cms-locations", { method: "PATCH", body: Object.assign({ id: l.id }, payload) })
          : D.api("/.netlify/functions/cms-locations", { method: "POST", body: payload });
        req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadLocations(); })
          .catch(function (e) { btn.disabled = false; alert(e.message); });
      });
  }
  function publishLocation(l) {
    if (!locRenderReady()) { alert("Location renderer is still loading. Try again in a moment."); return; }
    if (!confirm("Publish /" + l.slug + "/ to the live website?")) return;
    var n = window.WxLocationRender.normalizeLocation(l);
    var html = window.WxLocationRender.renderLocationHTML(n);
    D.cmsSavePage(l.slug + "/index.html", html, "CMS: publish location " + l.slug)
      .then(function () {
        return D.api("/.netlify/functions/cms-locations", { method: "PATCH", body: { id: l.id, published: true, published_slug: l.slug } }).then(jres);
      })
      .then(function (res) { if (res) needOk(res); loadLocations(); })
      .catch(function (e) { alert(e.message || "Publish failed."); });
  }
  function unpublishLocation(l) {
    if (!confirm("Unpublish /" + (l.published_slug || l.slug) + "/?")) return;
    D.api("/.netlify/functions/cms-delete", { method: "POST", body: { path: (l.published_slug || l.slug) + "/index.html", message: "CMS: unpublish location " + l.slug } })
      .then(jres).then(function () {
        return D.api("/.netlify/functions/cms-locations", { method: "PATCH", body: { id: l.id, published: false } }).then(jres);
      })
      .then(function (res) { needOk(res); loadLocations(); })
      .catch(function (e) { alert(e.message || "Unpublish failed."); });
  }

  /* ================= ANALYTICS ================= */
  function loadAnalytics() {
    setTitle("analytics");
    var root = document.getElementById("wx-root-analytics");
    root.innerHTML = loadingCard("Loading analytics…");
    D.api("/.netlify/functions/cms-analytics", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load analytics.");
      var byDay = data.byDay || [], max = 1;
      byDay.forEach(function (d) { if (d.views > max) max = d.views; });
      var bars = byDay.map(function (d) {
        var hgt = Math.max(4, Math.round(d.views / max * 120));
        return '<div class="text-center" style="flex:1"><div class="bg-dark rounded-top mx-auto" style="width:70%;height:' + hgt + 'px;opacity:.85"></div>' +
          '<div class="text-muted mt-1" style="font-size:10px">' + esc(d.day.slice(5)) + "</div></div>";
      }).join("");
      var top = (data.topPages || []).map(function (p) {
        return "<tr><td><code>" + esc(p.path) + "</code></td><td>" + p.views + "</td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="row mb-3">' +
        '<div class="col-md-4 mb-3"><div class="card"><div class="card-body text-center"><div class="h3 mb-0">' + (data.total || 0) + '</div><div class="text-muted small">Page views · last 30 days</div></div></div></div>' +
        '<div class="col-md-4 mb-3"><div class="card"><div class="card-body text-center"><div class="h3 mb-0">' + (data.today || 0) + '</div><div class="text-muted small">Views today</div></div></div></div>' +
        '<div class="col-md-4 mb-3"><div class="card"><div class="card-body text-center"><div class="h3 mb-0">' + (data.topPages || []).length + '</div><div class="text-muted small">Pages tracked</div></div></div></div>' +
        "</div>" +
        '<div class="card mb-3"><div class="card-header fw-bold">Views · last 14 days</div><div class="card-body">' +
        (bars ? '<div class="d-flex align-items-end gap-1">' + bars + "</div>" : '<p class="text-muted mb-0">No views recorded yet. Visits to the live site will appear here.</p>') +
        "</div></div>" +
        '<div class="card"><div class="card-header fw-bold">Top pages</div><div class="table-responsive">' +
        '<table class="table table-hover mb-0"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>' +
        (top || '<tr><td colspan="2" class="text-center text-muted py-4">No data yet.</td></tr>') +
        "</tbody></table></div></div>" +
        '<p class="text-muted small mt-2">Counts page views only. No visitor identities are stored.</p>';
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load analytics."); });
  }

  /* ================= THEME ================= */
  var THEME_DEFAULTS = { typeScale: 100, sectionSpacing: 100, cardRadius: 12, buttonRadius: 8, containerWidth: 1200 };
  function loadTheme() {
    setTitle("theme");
    var root = document.getElementById("wx-root-theme");
    root.innerHTML = loadingCard("Loading theme…");
    D.api("/.netlify/functions/cms-settings", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load settings.");
      var t = Object.assign({}, THEME_DEFAULTS, (data.settings && data.settings.theme) || {});
      var num = function (id, label, val, min, max, suffix) {
        return '<div class="mb-3"><label class="form-label fw-bold" for="' + id + '">' + esc(label) + '</label><div class="d-flex align-items-center gap-3">' +
          '<input type="range" class="form-range flex-grow-1" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" />' +
          '<span class="badge text-bg-dark" id="' + id + '-v">' + val + esc(suffix || "") + "</span></div></div>";
      };
      root.innerHTML =
        '<div class="alert alert-info small">Brand guardrails are on: the Woodex navy (#0a0f1e), button styles and logo stay locked. ' +
        "This customizer only adjusts type scale, spacing and corners.</div>" +
        '<div class="card"><div class="card-header fw-bold">Theme customizer</div><div class="card-body">' +
        num("th-type", "Type scale", t.typeScale, 90, 110, "%") +
        num("th-space", "Section spacing", t.sectionSpacing, 60, 140, "%") +
        num("th-card", "Card corner radius", t.cardRadius, 0, 24, "px") +
        num("th-btn", "Button corner radius", t.buttonRadius, 0, 24, "px") +
        num("th-cont", "Content width", t.containerWidth, 1100, 1600, "px") +
        '<div class="d-flex gap-2 mt-2" data-write>' +
        '<button class="btn btn-outline-dark" id="th-save">Save</button>' +
        '<button class="btn btn-dark" id="th-publish">Save &amp; publish to website</button></div>' +
        '<div class="text-muted small mt-2" id="th-status"></div>' +
        "</div></div>";
      ["th-type", "th-space", "th-card", "th-btn", "th-cont"].forEach(function (id) {
        var r = document.getElementById(id);
        r.addEventListener("input", function () { document.getElementById(id + "-v").textContent = r.value; });
      });
      var collect = function () {
        return {
          typeScale: Number(field("th-type")), sectionSpacing: Number(field("th-space")),
          cardRadius: Number(field("th-card")), buttonRadius: Number(field("th-btn")),
          containerWidth: Number(field("th-cont"))
        };
      };
      var save = function () {
        return D.api("/.netlify/functions/cms-settings", { method: "POST", body: { key: "theme", value: collect() } }).then(jres).then(function (res) { needOk(res); });
      };
      document.getElementById("th-save").onclick = function () {
        document.getElementById("th-status").textContent = "Saving…";
        save().then(function () { document.getElementById("th-status").textContent = "Saved."; })
          .catch(function (e) { document.getElementById("th-status").textContent = e.message; });
      };
      document.getElementById("th-publish").onclick = function () {
        document.getElementById("th-status").textContent = "Publishing…";
        save().then(function () {
          var js = "window.WX_THEME = " + JSON.stringify(collect()) + ";";
          return D.cmsSavePage("assets/js/theme-config.js", js, "CMS: publish theme config");
        }).then(function () { document.getElementById("th-status").textContent = "Published. The live site picks it up on next visit."; })
          .catch(function (e) { document.getElementById("th-status").textContent = e.message; });
      };
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load theme."); });
  }

  /* ================= NAVIGATION ================= */
  function loadNavigation() {
    setTitle("navigation");
    var root = document.getElementById("wx-root-navigation");
    root.innerHTML = loadingCard("Loading navigation…");
    D.api("/.netlify/functions/cms-menu-items", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load navigation.");
      var rows = data.items || data.menu_items || [];
      rows.sort(function (a, b) { return (a.position || 0) - (b.position || 0); });
      var body = rows.map(function (m) {
        return "<tr><td>" + esc(m.label) + '</td><td><code>' + esc(m.url) + "</code></td><td>" + (m.position || 0) +
          "</td><td>" + (m.visible ? '<span class="badge text-bg-success">Visible</span>' : '<span class="badge text-bg-secondary">Hidden</span>') + "</td>" +
          '<td class="text-end"><div class="btn-group btn-group-sm" data-write>' +
          '<button class="btn btn-outline-dark" data-nact="edit" data-id="' + m.id + '">Edit</button>' +
          '<button class="btn btn-outline-danger" data-nact="del" data-id="' + m.id + '">Delete</button>' +
          "</div></td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Navigation menu</span><div class="d-flex gap-2" data-write>' +
        '<button class="btn btn-outline-dark btn-sm" id="wx-nav-publish">Publish menu data</button>' +
        '<button class="btn btn-dark btn-sm" id="wx-nav-new"><i class="bi bi-plus-lg"></i> Add item</button></div></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr>' +
        "<th>Label</th><th>URL</th><th>Order</th><th>Visibility</th><th></th>" +
        "</tr></thead><tbody>" +
        (body || '<tr><td colspan="5" class="text-center text-muted py-4">No menu items yet.</td></tr>') +
        "</tbody></table></div></div>" +
        '<p class="text-muted small mt-2">Publishing writes the menu data file. Applying it across all site pages ships with the header builder.</p>' +
        '<div class="text-muted small" id="wx-nav-status"></div>';
      document.getElementById("wx-nav-new").onclick = function () { openMenuItemModal(null); };
      document.getElementById("wx-nav-publish").onclick = function () {
        var st = document.getElementById("wx-nav-status"); st.textContent = "Publishing…";
        var js = "window.WX_NAV = " + JSON.stringify(rows.map(function (m) {
          return { label: m.label, url: m.url, position: m.position || 0, visible: !!m.visible };
        })) + ";";
        D.cmsSavePage("assets/js/nav-config.js", js, "CMS: publish navigation data")
          .then(function () { st.textContent = "Menu data published."; })
          .catch(function (e) { st.textContent = e.message; });
      };
      root.querySelectorAll("[data-nact]").forEach(function (b) {
        b.onclick = function () {
          var m = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
          if (b.getAttribute("data-nact") === "edit") openMenuItemModal(m);
          else if (confirm("Delete this menu item?")) {
            D.api("/.netlify/functions/cms-menu-items", { method: "DELETE", body: { id: m.id } })
              .then(jres).then(function (res) { needOk(res); loadNavigation(); }).catch(function (e) { alert(e.message); });
          }
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load navigation."); });
  }
  function openMenuItemModal(m) {
    openBpModal(m ? "Edit menu item" : "Add menu item",
      inRow("Label", "vn-label", m && m.label) +
      inRow("URL", "vn-url", m && m.url, "text", "/interior-design/") +
      inRow("Order", "vn-pos", m ? m.position : 0, "number") +
      '<div class="form-check"><input class="form-check-input" type="checkbox" id="vn-vis"' + (!m || m.visible ? " checked" : "") + ' /><label class="form-check-label" for="vn-vis">Visible</label></div>',
      "Save",
      function (mEl, btn) {
        var label = field("vn-label").trim(), url = field("vn-url").trim();
        if (label.length < 2 || !url) { alert("Label and URL are required."); return; }
        btn.disabled = true;
        var payload = { label: label, url: url, position: Number(field("vn-pos")) || 0, visible: mEl.querySelector("#vn-vis").checked };
        var req = m
          ? D.api("/.netlify/functions/cms-menu-items", { method: "PATCH", body: Object.assign({ id: m.id }, payload) })
          : D.api("/.netlify/functions/cms-menu-items", { method: "POST", body: payload });
        req.then(jres).then(function (res) { needOk(res); closeBpModal(); loadNavigation(); })
          .catch(function (e) { btn.disabled = false; alert(e.message); });
      });
  }

  /* ================= SEO ================= */
  function loadSeo() {
    setTitle("seo");
    var root = document.getElementById("wx-root-seo");
    root.innerHTML = loadingCard("Loading SEO manager…");
    D.api("/.netlify/functions/cms-redirects", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load redirects.");
      var rows = data.redirects || [];
      var body = rows.map(function (r) {
        return '<tr><td><code>' + esc(r.from_path) + '</code></td><td><code>' + esc(r.to_path) + "</code></td>" +
          "<td>" + (r.active ? '<span class="badge text-bg-success">Active</span>' : '<span class="badge text-bg-secondary">Off</span>') + "</td>" +
          '<td class="text-end" data-write><button class="btn btn-outline-danger btn-sm" data-ract="del" data-id="' + r.id + '">Delete</button></td></tr>';
      }).join("");
      root.innerHTML =
        '<div class="row">' +
        '<div class="col-md-6 mb-3"><div class="card h-100"><div class="card-header fw-bold">Sitemap &amp; robots</div><div class="card-body">' +
        '<p class="text-muted small">Generates sitemap.xml from the live page list and publishes it, plus a robots.txt you can edit.</p>' +
        '<div class="d-flex flex-wrap gap-2" data-write>' +
        '<button class="btn btn-outline-dark btn-sm" id="wx-seo-sitemap">Generate &amp; publish sitemap.xml</button>' +
        '<button class="btn btn-outline-dark btn-sm" id="wx-seo-robots">Publish robots.txt</button></div>' +
        txRow("robots.txt", "wx-robots", "User-agent: *\nAllow: /\n\nSitemap: https://marketingwoodex.vercel.app/sitemap.xml", 5) +
        '<div class="text-muted small" id="wx-seo-status"></div>' +
        "</div></div></div>" +
        '<div class="col-md-6 mb-3"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<span class="fw-bold">Redirects</span><button class="btn btn-dark btn-sm" data-write id="wx-red-new"><i class="bi bi-plus-lg"></i> Add</button></div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>From</th><th>To</th><th>Status</th><th></th></tr></thead><tbody>' +
        (body || '<tr><td colspan="4" class="text-center text-muted py-4">No redirects yet.</td></tr>') +
        "</tbody></table></div>" +
        '<div class="card-body"><p class="text-muted small mb-0">Redirects are stored here and included in the next deploy configuration.</p></div>' +
        "</div></div></div>";
      document.getElementById("wx-seo-sitemap").onclick = publishSitemap;
      document.getElementById("wx-seo-robots").onclick = function () {
        var st = document.getElementById("wx-seo-status"); st.textContent = "Publishing…";
        D.cmsSavePage("robots.txt", field("wx-robots"), "CMS: publish robots.txt")
          .then(function () { st.textContent = "robots.txt published."; })
          .catch(function (e) { st.textContent = e.message; });
      };
      var rn = document.getElementById("wx-red-new");
      if (rn) rn.onclick = function () {
        openBpModal("Add redirect",
          inRow("From path", "vr-from", "", "text", "/old-page/") + inRow("To path", "vr-to", "", "text", "/new-page/"),
          "Save", function (mEl, btn) {
            var from = field("vr-from").trim(), to = field("vr-to").trim();
            if (from.charAt(0) !== "/" || !to) { alert("From must start with / and To is required."); return; }
            btn.disabled = true;
            D.api("/.netlify/functions/cms-redirects", { method: "POST", body: { from_path: from, to_path: to } })
              .then(jres).then(function (res) { needOk(res); closeBpModal(); loadSeo(); })
              .catch(function (e) { btn.disabled = false; alert(e.message); });
          }, false);
      };
      root.querySelectorAll("[data-ract]").forEach(function (b) {
        b.onclick = function () {
          if (!confirm("Delete this redirect?")) return;
          D.api("/.netlify/functions/cms-redirects", { method: "DELETE", body: { id: b.getAttribute("data-id") } })
            .then(jres).then(function (res) { needOk(res); loadSeo(); }).catch(function (e) { alert(e.message); });
        };
      });
      gateWrites(root);
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load SEO manager."); });
  }
  function publishSitemap() {
    var st = document.getElementById("wx-seo-status"); st.textContent = "Generating…";
    var base = "https://marketingwoodex.vercel.app";
    var urls = [];
    var done = function () {
      var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(function (u) { return "  <url><loc>" + esc(base + u) + "</loc></url>"; }).join("\n") +
        "\n</urlset>";
      D.cmsSavePage("sitemap.xml", xml, "CMS: publish sitemap.xml")
        .then(function () { st.textContent = "sitemap.xml published with " + urls.length + " URLs."; })
        .catch(function (e) { st.textContent = e.message; });
    };
    fetch("./pages.json").then(function (r) { return r.json(); }).then(function (pages) {
      (pages || []).forEach(function (p) { if (p.url) urls.push(p.url); });
      return D.api("/.netlify/functions/cms-blog-posts?status=published", { method: "GET" }).then(jres);
    }).then(function (res) {
      ((res.j && (res.j.posts || res.j.blog_posts)) || []).forEach(function (p) { if (p.slug) urls.push("/insights/" + p.slug + "/"); });
      return D.api("/.netlify/functions/cms-services", { method: "GET" }).then(jres);
    }).then(function (res) {
      ((res.j && res.j.services) || []).forEach(function (s) { if (s.published && s.slug) urls.push("/" + s.slug + "/"); });
      return D.api("/.netlify/functions/cms-locations", { method: "GET" }).then(jres);
    }).then(function (res) {
      ((res.j && res.j.locations) || []).forEach(function (l) { if (l.published && l.slug) urls.push("/" + l.slug + "/"); });
      urls = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
      done();
    }).catch(function (e) { st.textContent = e.message || "Sitemap generation failed."; });
  }

  /* ================= AUDIT TRAIL ================= */
  function loadAudit() {
    setTitle("audit");
    var root = document.getElementById("wx-root-audit");
    root.innerHTML = loadingCard("Loading audit trail…");
    D.api("/.netlify/functions/cms-stats", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Could not load activity.");
      var rows = data.activity || [];
      var body = rows.map(function (a) {
        return "<tr><td>" + esc(a.text) + "</td><td>" + esc(a.kind || "–") + "</td><td>" + D.timeAgo(a.created_at) + "</td></tr>";
      }).join("");
      root.innerHTML =
        '<div class="card"><div class="card-header fw-bold">Audit trail</div>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Event</th><th>Type</th><th>When</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="3" class="text-center text-muted py-4">No activity recorded yet.</td></tr>') +
        "</tbody></table></div></div>";
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Could not load audit trail."); });
  }

  /* ================= VERSIONS ================= */
  function loadVersions() {
    setTitle("versions");
    var root = document.getElementById("wx-root-versions");
    root.innerHTML =
      '<div class="card"><div class="card-header fw-bold">Page version history</div><div class="card-body">' +
      '<p class="text-muted small">Every publish through the dashboard snapshots the previous content. The newest 20 versions are kept per page.</p>' +
      '<div class="d-flex gap-2 mb-3"><input class="form-control" id="wx-ver-path" placeholder="Page path, e.g. about/index.html" style="max-width:340px" />' +
      '<button class="btn btn-dark" id="wx-ver-load">Load versions</button></div>' +
      '<div id="wx-ver-list"></div></div></div>';
    document.getElementById("wx-ver-load").onclick = function () {
      var path = field("wx-ver-path").trim();
      if (!path) { alert("Enter a page path."); return; }
      var list = document.getElementById("wx-ver-list");
      list.innerHTML = '<p class="text-muted">Loading…</p>';
      D.api("/.netlify/functions/cms-versions?path=" + encodeURIComponent(path), { method: "GET" }).then(jres).then(function (res) {
        var data = needOk(res, "Could not load versions.");
        var rows = data.versions || [];
        if (!rows.length) { list.innerHTML = '<p class="text-muted">No versions stored for this page yet.</p>'; return; }
        list.innerHTML = '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>Saved</th><th>By</th><th>Note</th><th>Size</th><th></th></tr></thead><tbody>' +
          rows.map(function (v) {
            return "<tr><td>" + D.timeAgo(v.created_at) + "</td><td>" + esc(v.created_by || "–") + "</td><td>" + esc(v.note || "–") +
              "</td><td>" + Math.round((v.size || 0) / 1024) + " KB</td>" +
              '<td class="text-end"><div class="btn-group btn-group-sm">' +
              '<button class="btn btn-outline-dark" data-ver="prev" data-id="' + v.id + '">Preview</button>' +
              (D.canWrite() ? '<button class="btn btn-outline-danger" data-ver="rest" data-id="' + v.id + '">Restore</button>' : "") +
              "</div></td></tr>";
          }).join("") + "</tbody></table></div>";
        list.querySelectorAll("[data-ver]").forEach(function (b) {
          b.onclick = function () {
            var v = rows.find(function (x) { return x.id === b.getAttribute("data-id"); });
            if (b.getAttribute("data-ver") === "prev") previewVersion(v, path);
            else if (confirm("Restore " + path + " to the version from " + new Date(v.created_at).toLocaleString() + "? The current page will be snapshotted first.")) {
              D.api("/.netlify/functions/cms-versions", { method: "POST", body: { id: v.id } }).then(jres)
                .then(function (res2) { needOk(res2); alert("Page restored."); })
                .catch(function (e) { alert(e.message); });
            }
          };
        });
      }).catch(function (e) { list.innerHTML = '<p class="text-muted">' + esc(e.message) + "</p>"; });
    };
    function previewVersion(v) {
      openBpModal("Preview — " + v.page_path + " (" + new Date(v.created_at).toLocaleString() + ")",
        '<div class="text-muted small mb-2">Loading snapshot…</div><iframe id="wx-ver-frame" style="width:100%;height:60vh;border:1px solid #ddd;border-radius:8px" title="Version preview"></iframe>',
        null, null);
      D.api("/.netlify/functions/cms-versions?id=" + encodeURIComponent(v.id), { method: "GET" }).then(jres).then(function (res) {
        var data = needOk(res, "Could not load version.");
        var fr = document.getElementById("wx-ver-frame");
        if (fr && data.version && data.version.html) fr.srcdoc = data.version.html;
        else if (fr) fr.srcdoc = "<p style='font-family:sans-serif;padding:24px'>No snapshot content stored.</p>";
      }).catch(function (e) {
        var fr = document.getElementById("wx-ver-frame");
        if (fr) fr.srcdoc = "<p style='font-family:sans-serif;padding:24px'>" + esc(e.message || "Could not load.") + "</p>";
      });
    }
  }

  /* ================= BACKUPS ================= */
  function loadBackups() {
    setTitle("backups");
    var root = document.getElementById("wx-root-backups");
    if (!D.isAdmin()) {
      root.innerHTML = '<div class="alert alert-warning">Backups are available to Admin users only.</div>';
      return;
    }
    root.innerHTML =
      '<div class="card"><div class="card-header fw-bold">Backups</div><div class="card-body">' +
      '<p class="text-muted">Download a full export of every dashboard table as JSON. Passwords are never included. ' +
      "Server-level backups remain with Supabase and Vercel.</p>" +
      '<button class="btn btn-dark" id="wx-backup-dl"><i class="bi bi-download"></i> Download full backup</button>' +
      '<div class="text-muted small mt-2" id="wx-backup-status"></div></div></div>';
    document.getElementById("wx-backup-dl").onclick = function () {
      var st = document.getElementById("wx-backup-status"); st.textContent = "Preparing export…";
      D.api("/.netlify/functions/cms-backups", { method: "GET" }).then(jres).then(function (res) {
        var data = needOk(res, "Backup failed.");
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "woodex-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        st.textContent = "Backup downloaded.";
      }).catch(function (e) { st.textContent = e.message; });
    };
  }

  /* ================= HEALTH ================= */
  function loadHealth() {
    setTitle("health");
    var root = document.getElementById("wx-root-health");
    root.innerHTML = loadingCard("Checking system health…");
    D.api("/.netlify/functions/cms-health", { method: "GET" }).then(jres).then(function (res) {
      var data = needOk(res, "Health check failed.");
      var dot = function (ok) {
        return '<span class="badge ' + (ok === "ok" ? "text-bg-success" : "text-bg-danger") + '">' + (ok === "ok" ? "Online" : "Down") + "</span>";
      };
      var card = function (label, status, note) {
        return '<div class="col-md-3 col-6 mb-3"><div class="card h-100"><div class="card-body text-center">' +
          '<div class="fw-bold mb-2">' + esc(label) + "</div>" + dot(status) +
          (note ? '<div class="text-muted small mt-2">' + esc(note) + "</div>" : "") + "</div></div></div>";
      };
      root.innerHTML =
        '<div class="row">' +
        card("Website", "ok", "Dashboard reachable") +
        card("Supabase", data.supabase, "Database") +
        card("GitHub", data.github, "Publishing") +
        card("CMS API", "ok", "Authenticated") +
        "</div>" +
        '<div class="card"><div class="card-body d-flex justify-content-between align-items-center">' +
        '<span class="text-muted small">Last checked: ' + esc(data.time || "–") + '</span>' +
        '<button class="btn btn-outline-dark btn-sm" id="wx-health-re">Re-check</button></div></div>';
      document.getElementById("wx-health-re").onclick = loadHealth;
    }).catch(function (e) { root.innerHTML = errorCard(e.message || "Health check failed."); });
  }

  /* ================= QUICK ACTIONS ================= */
  function quickAction(kind) {
    if (kind === "service") { D.showView("services"); setTimeout(function () { setTitle("services"); loadServices(); setTimeout(function () { openServiceModal(null); }, 300); }, 60); }
    else if (kind === "location") { D.showView("locations"); setTimeout(function () { setTitle("locations"); loadLocations(); setTimeout(function () { openLocationModal(null); }, 300); }, 60); }
    else if (kind === "testimonial") { D.showView("testimonials"); setTimeout(function () { setTitle("testimonials"); loadTestimonials(); setTimeout(function () { openTestimonialModal(null); }, 300); }, 60); }
    else if (kind === "visit") { quickVisit(); }
    else if (kind === "page") D.showView("builder");
    else if (kind === "project") D.showView("projects");
    else if (kind === "post") D.showView("blog");
    else if (kind === "member") D.showView("team");
    else if (kind === "media") D.showView("media");
    else if (kind === "quote") D.showView("quotations");
    else if (kind === "invoice") D.showView("invoices");
  }

  /* ================= delegation ================= */
  var LOADERS = {
    pipeline: loadPipeline, visits: loadVisits, clients: loadClients,
    testimonials: loadTestimonials, services: loadServices, locations: loadLocations,
    analytics: loadAnalytics, theme: loadTheme, navigation: loadNavigation,
    seo: loadSeo, audit: loadAudit, versions: loadVersions,
    backups: loadBackups, health: loadHealth
  };
  document.addEventListener("click", function (e) {
    var qa = e.target.closest("[data-qa]");
    if (qa) {
      e.preventDefault();
      var dd = qa.closest(".dropdown-menu");
      if (dd) { var t = document.querySelector('[data-bs-toggle="dropdown"]'); if (t && window.bootstrap) bootstrap.Dropdown.getOrCreateInstance(t).hide(); }
      quickAction(qa.getAttribute("data-qa"));
      return;
    }
    var a = e.target.closest("[data-view]");
    if (a) {
      var v = a.getAttribute("data-view");
      if (LOADERS[v]) setTimeout(function () { setTitle(v); LOADERS[v](); }, 0);
    }
  });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { boot(40); });
  } else {
    boot(40);
  }
})();
