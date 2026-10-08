/* ==================== ADVANCED COMMAND PALETTE (⌘K) ==================== */
let cmdItems = [], cmdSel = 0;
function openCmd() {
  const items = flatNav().map(([n, g]) => ({
    i: n.i,
    t: n.t,
    g: g ? "Navigation · " + g : "Navigation",
    run: () => { location.hash = "#/" + n.id; }
  }));

  // Quick Actions at top
  items.unshift(
    { i: "plus", t: "Add New Lead / Inquiry", g: "Quick Actions", kbd: "N", run: () => { location.hash = "#/enquiries"; } },
    { i: "file-text", t: "Create New Quotation (BOQ)", g: "Quick Actions", kbd: "Q", run: () => { location.hash = "#/quotes"; } },
    { i: "receipt", t: "Generate Invoice & Billing", g: "Quick Actions", kbd: "I", run: () => { location.hash = "#/invoices"; } },
    { i: "send", t: "Compose WhatsApp Broadcast", g: "Quick Actions", run: () => { location.hash = "#/wauto"; } },
    { i: "sparkles", t: "Ask AI Design Assistant", g: "Quick Actions", run: () => { location.hash = "#/aicenter"; } },
    { i: "layout-dashboard", t: "Toggle Light / Dark Theme", g: "Quick Actions", kbd: "T", run: () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark") }
  );

  cmdItems = items;
  cmdSel = 0;
  $("#cmdk").classList.add("on");
  $("#cmdk-in").value = "";
  drawCmd("");
  setTimeout(() => $("#cmdk-in").focus(), 30);
}

function drawCmd(q) {
  q = (q || "").toLowerCase().trim();
  const list = cmdItems.filter(x => !q || x.t.toLowerCase().includes(q) || (x.g || "").toLowerCase().includes(q));
  if (cmdSel >= list.length) cmdSel = 0;

  let html = "", lastG = null;
  list.forEach((x, i) => {
    if (x.g !== lastG) {
      html += '<div class="cmdk-g">' + esc(x.g) + '</div>';
      lastG = x.g;
    }
    html += '<div class="cmdk-i' + (i === cmdSel ? " on" : "") + '" data-i="' + i + '">' +
      ic(x.i) + '<span>' + esc(x.t) + '</span>' +
      (x.kbd ? '<kbd class="badge sm">' + esc(x.kbd) + '</kbd>' : "") +
    '</div>';
  });

  $("#cmdk-l").innerHTML = html || '<div class="cmdk-g" style="padding:16px;text-align:center">No matching commands found</div>';
  paintIcons($("#cmdk-l"));

  $$("#cmdk-l .cmdk-i").forEach(el => {
    el.onclick = () => { closeCmd(); list[+el.dataset.i].run(); };
    el.onmouseenter = () => { cmdSel = +el.dataset.i; drawCmd(q); };
  });

  const on = $("#cmdk-l .cmdk-i.on");
  if (on) on.scrollIntoView({ block: "nearest" });
}

function closeCmd() {
  $("#cmdk").classList.remove("on");
}
