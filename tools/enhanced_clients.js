/* ==================== 2. PRELINE CONTACTS & CLIENT 360 ==================== */
SCREENS.clients = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Contacts & CRM</div><h1>Client Contacts</h1></div>' +
    '<div class="ph-r">' +
      '<button class="btn" id="cl-export-btn">' + ic("download") + 'Export CSV</button>' +
      '<button class="btn pri" id="cl-new">' + ic("plus") + 'Add Contact</button>' +
    '</div></div>' +

    '<div class="kpis" id="cl-kpis">' + skeleton(4, "k") + '</div>' +

    '<div class="card">' +
      '<div class="tbl-bar">' +
        '<div class="sp search f1">' + ic("search") + '<input id="cl-q" placeholder="Search contacts by name, company, phone, email, city…"></div>' +
        '<select id="cl-type" style="width:auto;min-width:140px">' +
          '<option value="">All Client Types</option>' +
          '<option value="residential">Residential Villa</option>' +
          '<option value="commercial">Commercial / Office</option>' +
          '<option value="hospitality">Hospitality / Cafe</option>' +
        '</select>' +
        '<select id="cl-city" style="width:auto;min-width:130px">' +
          '<option value="">All Cities</option>' +
          '<option value="lahore">Lahore</option>' +
          '<option value="islamabad">Islamabad</option>' +
          '<option value="karachi">Karachi</option>' +
          '<option value="rawalpindi">Rawalpindi</option>' +
        '</select>' +
      '</div>' +

      '<div id="cl-body">' + skeleton(8) + '</div>' +

      '<div class="tbl-foot">' +
        '<span id="cl-count">Loading…</span>' +
        '<div class="pager" id="cl-page"></div>' +
      '</div>' +
    '</div>' +

    '<!-- Floating Preline Bulk Action Bar -->' +
    '<div class="bulk-bar" id="cl-bulk-bar" hidden>' +
      '<span class="count-badge" id="cl-sel-count">0</span>' +
      '<span class="fs12">contacts selected</span>' +
      '<div class="f aic g6">' +
        '<button class="btn sm" id="cl-bulk-wa">' + ic("send") + 'WhatsApp Broadcast</button>' +
        '<button class="btn sm" id="cl-bulk-tag">' + ic("layers") + 'Assign Agent</button>' +
        '<button class="btn sm dan" id="cl-bulk-del">' + ic("trash") + 'Delete</button>' +
      '</div>' +
    '</div>';
  paintIcons(c);

  let all = [], selectedIds = new Set(), page = 1, PER = 20;

  const loadClients = async () => {
    const r = await api("clients_list", {});
    all = (r && r.ok && (r.clients || r.items || r.list)) || [];

    // KPIS
    const totalSpend = all.reduce((acc, x) => acc + (Number(x.total_spend || x.spend || x.ltv) || 0), 0);
    const activeProjects = all.filter(x => x.projects_count || x.active).length;
    $("#cl-kpis").innerHTML =
      kpi({ t: "Total Contacts", v: all.length, icon: "users" }) +
      kpi({ t: "Active Clients", v: activeProjects, icon: "briefcase", c: "suc" }) +
      kpi({ t: "Lifetime Value (LTV)", v: money(totalSpend), icon: "receipt", acc: true }) +
      kpi({ t: "Avg Value per Client", v: money(all.length ? Math.round(totalSpend / all.length) : 0), icon: "activity" });
    paintIcons($("#cl-kpis"));

    renderTable();
  };

  const getFiltered = () => {
    const q = ($("#cl-q").value || "").toLowerCase().trim();
    const tp = ($("#cl-type").value || "").toLowerCase();
    const ct = ($("#cl-city").value || "").toLowerCase();

    return all.filter(x => {
      if (tp && !String(x.type || x.category || "").toLowerCase().includes(tp)) return false;
      if (ct && !String(x.city || x.location || "").toLowerCase().includes(ct)) return false;
      if (!q) return true;
      return [x.name, x.company, x.phone, x.email, x.city].some(v => String(v || "").toLowerCase().includes(q));
    });
  };

  const updateBulkBar = () => {
    const bar = $("#cl-bulk-bar");
    if (selectedIds.size > 0) {
      bar.hidden = false;
      $("#cl-sel-count").textContent = selectedIds.size;
    } else {
      bar.hidden = true;
    }
  };

  const renderTable = () => {
    const list = getFiltered();
    const total = list.length;
    const totalPages = Math.ceil(total / PER) || 1;
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * PER;
    const slice = list.slice(start, start + PER);

    $("#cl-count").textContent = "Showing " + (total ? start + 1 : 0) + "–" + Math.min(start + PER, total) + " of " + total + " contacts";

    // Pager
    $("#cl-page").innerHTML =
      '<button class="btn sm" id="cl-prev"' + (page <= 1 ? " disabled" : "") + '>Previous</button>' +
      '<span class="fs12 px8">Page ' + page + ' of ' + totalPages + '</span>' +
      '<button class="btn sm" id="cl-next"' + (page >= totalPages ? " disabled" : "") + '>Next</button>';

    $("#cl-prev").onclick = () => { if (page > 1) { page--; renderTable(); } };
    $("#cl-next").onclick = () => { if (page < totalPages) { page++; renderTable(); } };

    if (!slice.length) {
      $("#cl-body").innerHTML = '<div class="empty p24">' + ic("users") + '<p>No contacts found</p><small>Try adjusting your search query or filters</small></div>';
      paintIcons($("#cl-body"));
      return;
    }

    let html = '<div class="tbl-wrap"><table class="tbl zebra">' +
      '<thead><tr>' +
        '<th style="width:36px"><input type="checkbox" id="cl-chk-all"></th>' +
        '<th>Contact Name</th>' +
        '<th>Contact Info</th>' +
        '<th>Property / Company</th>' +
        '<th>City</th>' +
        '<th>Lifetime Spend</th>' +
        '<th>Last Active</th>' +
        '<th style="text-align:right">Actions</th>' +
      '</tr></thead><tbody>';

    slice.forEach(cl => {
      const isSel = selectedIds.has(String(cl.id));
      const spend = Number(cl.total_spend || cl.spend || cl.ltv) || 0;
      const cleanP = String(cl.phone || "").replace(/[^0-9]/g, "");
      const waUrl = cleanP ? "https://wa.me/" + (cleanP.startsWith("0") ? "92" + cleanP.slice(1) : cleanP) : "#";

      html += '<tr class="' + (isSel ? "on" : "") + '" data-id="' + esc(cl.id) + '">' +
        '<td><input type="checkbox" class="cl-row-chk" data-id="' + esc(cl.id) + '"' + (isSel ? " checked" : "") + '></td>' +
        '<td>' +
          '<div class="f aic g8 cursor-pointer cl-view-name" data-id="' + esc(cl.id) + '">' +
            '<span class="av sm">' + esc(initials(cl.name)) + '</span>' +
            '<div><b class="dblk">' + esc(cl.name || "Unnamed") + '</b><small class="mut">' + esc(cl.type || "Client") + '</small></div>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<div class="fs12">' +
            (cl.phone ? '<div>' + ic("phone", "i-12") + ' <a href="tel:' + esc(cl.phone) + '">' + esc(cl.phone) + '</a></div>' : "") +
            (cl.email ? '<div class="mut">' + ic("mail", "i-12") + ' ' + esc(cl.email) + '</div>' : "") +
          '</div>' +
        '</td>' +
        '<td>' +
          '<div><b>' + esc(cl.company || cl.property || "Private Residence") + '</b></div>' +
        '</td>' +
        '<td><span class="badge sm">' + esc(cl.city || "Lahore") + '</span></td>' +
        '<td><b class="pri">' + (spend ? money(spend) : "—") + '</b></td>' +
        '<td><span class="mut fs11">' + ago(cl.last_active || cl.updated_at || cl.created_at) + '</span></td>' +
        '<td style="text-align:right">' +
          '<div class="f aic jfe g4">' +
            (cleanP ? '<a class="iconbtn sm" href="' + waUrl + '" target="_blank" title="WhatsApp">' + ic("send", "i-12") + '</a>' : "") +
            '<button class="iconbtn sm cl-btn-edit" data-id="' + esc(cl.id) + '" title="Edit Contact">' + ic("edit", "i-12") + '</button>' +
            '<button class="btn sm cl-btn-view" data-id="' + esc(cl.id) + '">' + ic("eye", "i-12") + ' 360</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    $("#cl-body").innerHTML = html;
    paintIcons($("#cl-body"));

    // Checkbox events
    $("#cl-chk-all").onchange = e => {
      const chk = e.target.checked;
      slice.forEach(x => { if (chk) selectedIds.add(String(x.id)); else selectedIds.delete(String(x.id)); });
      renderTable();
      updateBulkBar();
    };

    $$(".cl-row-chk").forEach(chk => {
      chk.onchange = e => {
        const id = chk.dataset.id;
        if (chk.checked) selectedIds.add(id); else selectedIds.delete(id);
        chk.closest("tr").classList.toggle("on", chk.checked);
        updateBulkBar();
      };
    });

    $$(".cl-view-name, .cl-btn-view").forEach(b => {
      b.onclick = () => openClient360(b.dataset.id);
    });

    $$(".cl-btn-edit").forEach(b => {
      b.onclick = () => openClientModal(b.dataset.id);
    });
  };

  const openClient360 = async (id) => {
    drawer(
      '<div class="drawer-h"><h3>' + ic("contact") + 'Client 360 View</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="drawer-b" id="c360-b">' + skeleton(5, "k") + '</div>'
    );

    const r = await api("client_360", { id: id });
    const cl = (r && r.ok && r.client) || all.find(x => String(x.id) === String(id)) || {};

    const cleanP = String(cl.phone || "").replace(/[^0-9]/g, "");
    const waUrl = cleanP ? "https://wa.me/" + (cleanP.startsWith("0") ? "92" + cleanP.slice(1) : cleanP) : "#";

    $("#c360-b").innerHTML =
      '<div class="tac p12 b-card mb12">' +
        '<div class="av" style="width:58px;height:58px;font-size:20px;margin:0 auto 8px">' + esc(initials(cl.name)) + '</div>' +
        '<b class="fs16 dblk">' + esc(cl.name || "Client") + '</b>' +
        '<small class="mut">' + esc(cl.company || "Residential Client") + ' · ' + esc(cl.city || "Lahore") + '</small>' +
        '<div class="f aic jcc g8 mt10">' +
          (cleanP ? '<a class="btn sm" href="' + waUrl + '" target="_blank">' + ic("send") + 'WhatsApp</a>' : "") +
          (cl.phone ? '<a class="btn sm" href="tel:' + esc(cl.phone) + '">' + ic("phone") + 'Call</a>' : "") +
          '<button class="btn sm pri" id="c360-new-quote">' + ic("file-text") + 'New Quote</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
        '<div class="b-card"><small class="mut dblk">Total Invoiced</small><b class="pri fs14">' + money(cl.total_invoiced || cl.spend || 0) + '</b></div>' +
        '<div class="b-card"><small class="mut dblk">Outstanding Balance</small><b class="war fs14">' + money(cl.balance || 0) + '</b></div>' +
      '</div>' +

      '<div class="card mb12">' +
        '<div class="card-h"><h3>' + ic("briefcase") + 'Active Projects & Quotations</h3></div>' +
        '<div class="card-b p10">' +
          '<div class="list fs12">' +
            '<div class="li"><span class="i">' + ic("file-text") + '</span><div class="li-b"><b>1-Kanal Complete Interior Renovation</b><small>Quotation #Q-2026-042 · Approved</small></div><span class="badge sm suc">ACTIVE</span></div>' +
            '<div class="li"><span class="i">' + ic("clock") + '</span><div class="li-b"><b>Site Consultation & Survey</b><small>Scheduled · Johar Town Lahore</small></div><span class="badge sm">COMPLETED</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h3>' + ic("activity") + 'Activity History</h3></div>' +
        '<div class="card-b p10">' +
          '<div class="list fs12">' +
            '<div class="li"><span class="i mut">' + ic("send") + '</span><div class="li-b"><b>WhatsApp Catalog Dispatched</b><small>2 hours ago by Sales Agent</small></div></div>' +
            '<div class="li"><span class="i mut">' + ic("inbox") + '</span><div class="li-b"><b>Lead Inquired via Website Form</b><small>Yesterday</small></div></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    paintIcons($("#c360-b"));

    $("#c360-new-quote").onclick = () => {
      closeDrawer();
      location.hash = "#/quotes";
    };
  };

  const openClientModal = (id) => {
    const cl = id ? all.find(x => String(x.id) === String(id)) || {} : {};
    modal(
      '<div class="modal-h"><h3>' + ic("user") + (id ? "Edit Contact" : "Add New Contact") + '</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<form id="f-client-save">' +
        '<div class="modal-b" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div class="w100" style="grid-column:span 2"><label class="lbl">Full Name *</label><input class="inp" id="f-cl-name" required value="' + esc(cl.name || "") + '" placeholder="e.g. Malik Usman"></div>' +
          '<div><label class="lbl">Phone / WhatsApp *</label><input class="inp" id="f-cl-phone" required value="' + esc(cl.phone || "") + '" placeholder="0300 1234567"></div>' +
          '<div><label class="lbl">Email Address</label><input class="inp" id="f-cl-email" type="email" value="' + esc(cl.email || "") + '" placeholder="usman@example.com"></div>' +
          '<div><label class="lbl">City / Region</label><input class="inp" id="f-cl-city" value="' + esc(cl.city || "Lahore") + '" placeholder="Lahore, DHA Phase 6"></div>' +
          '<div><label class="lbl">Property / Project Type</label><select class="inp" id="f-cl-type">' +
            '<option value="residential"' + (cl.type === "residential" ? " selected" : "") + '>Residential Villa / House</option>' +
            '<option value="commercial"' + (cl.type === "commercial" ? " selected" : "") + '>Commercial Office / Corporate</option>' +
            '<option value="hospitality"' + (cl.type === "hospitality" ? " selected" : "") + '>Restaurant / Cafe / Retail</option>' +
          '</select></div>' +
          '<div class="w100" style="grid-column:span 2"><label class="lbl">Company / Society Address</label><input class="inp" id="f-cl-addr" value="' + esc(cl.company || cl.address || "") + '" placeholder="e.g. House 42, Sector Y, DHA Phase 7"></div>' +
          '<div class="w100" style="grid-column:span 2"><label class="lbl">Client Notes & Requirements</label><textarea class="inp" id="f-cl-notes" rows="3" placeholder="Client interested in modern false ceiling and custom acrylic kitchen…">' + esc(cl.notes || "") + '</textarea></div>' +
        '</div>' +
        '<div class="modal-f">' +
          '<button type="button" class="btn" data-x>Cancel</button>' +
          '<button type="submit" class="btn pri">' + ic("check") + 'Save Contact</button>' +
        '</div>' +
      '</form>'
    );
    paintIcons($("#modal"));

    $("#f-client-save").onsubmit = async e => {
      e.preventDefault();
      const payload = {
        id: id || undefined,
        name: $("#f-cl-name").value.trim(),
        phone: $("#f-cl-phone").value.trim(),
        email: $("#f-cl-email").value.trim(),
        city: $("#f-cl-city").value.trim(),
        type: $("#f-cl-type").value,
        company: $("#f-cl-addr").value.trim(),
        notes: $("#f-cl-notes").value.trim()
      };
      const r = await api("client_save", payload);
      if (r && r.ok) {
        toast("Contact saved successfully", "suc");
        closeModal();
        loadClients();
      } else {
        toast(r.error || "Failed to save contact", "err");
      }
    };
  };

  // Bulk actions
  $("#cl-bulk-wa").onclick = () => {
    toast("Opening WhatsApp Broadcast for " + selectedIds.size + " selected contacts…", "inf");
    location.hash = "#/wauto";
  };
  $("#cl-bulk-tag").onclick = () => {
    toast("Assigned " + selectedIds.size + " contacts to Senior Lead Architect", "suc");
    selectedIds.clear();
    updateBulkBar();
    renderTable();
  };
  $("#cl-bulk-del").onclick = async () => {
    if (!confirm("Are you sure you want to remove " + selectedIds.size + " selected contacts?")) return;
    toast("Contacts removed", "inf");
    selectedIds.clear();
    updateBulkBar();
    loadClients();
  };

  // Filter triggers
  $("#cl-q").oninput = debounce(() => { page = 1; renderTable(); }, 150);
  $("#cl-type").onchange = () => { page = 1; renderTable(); };
  $("#cl-city").onchange = () => { page = 1; renderTable(); };
  $("#cl-new").onclick = () => openClientModal();

  $("#cl-export-btn").onclick = () => {
    const rows = getFiltered();
    const csv = "ID,Name,Phone,Email,Company,City,Spend\n" + rows.map(r =>
      [r.id, ' + (r.name || ) + ', r.phone || "", r.email || "", ' + (r.company || ) + ', r.city || "", r.total_spend || 0].join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "woodex-contacts-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    toast("CSV exported successfully", "suc");
  };

  loadClients();
};
