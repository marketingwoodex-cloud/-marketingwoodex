/* Woodex Admin — P16 3.5 Integrations grid + API keys table (Flowbite-style).
   Wraps the existing Settings → Integrations cards (no logic rewritten): tiles with status + filters, click a tile to open its card, API keys overview. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var esc = W.esc, ic = W.ic, api = W.api;
  var META = {
    "in-wa": ["WhatsApp Cloud API", "Messaging", "Live chat, auto-replies and offers on WhatsApp.", "#25d366"],
    "in-mail": ["Email (SMTP)", "Messaging", "Enquiry alerts, login alerts and quotation emails.", "#465fff"],
    "in-gdata": ["Analytics & Search Console", "Google", "Visitors, searches and clicks on your dashboard.", "#f9ab00"],
    "in-trk": ["Tracking codes", "Google", "GA4, Tag Manager, Meta Pixel and Search Console tag.", "#ea4335"],
    "in-psi": ["Google PageSpeed", "Google", "Speed and SEO scores for every page.", "#34a853"],
    "in-ai": ["AI writing", "AI", "Blog drafts, SEO text, chat replies (Claude, OpenAI, OpenRouter, local).", "#7a5af8"],
    "in-ts": ["Cloudflare Turnstile", "Security", "Invisible spam protection for website forms.", "#f38020"]
  };
  var ORDER = ["in-wa", "in-mail", "in-gdata", "in-trk", "in-psi", "in-ai", "in-ts"];
  var KEYS = [["in-ai", "AI provider key", "Blog, SEO, chat AI"], ["in-wa", "WhatsApp access token", "WhatsApp inbox & offers"], ["in-mail", "SMTP password", "All outgoing email"],
    ["in-gdata", "Google service-account key", "Analytics & Search Console"], ["in-psi", "PageSpeed API key", "Speed & Site health"], ["in-ts", "Turnstile secret key", "Form spam check"]];
  var filt = "all", open = null;

  function isOn(card) {
    var t = card.textContent;
    if (/Not connected|No key|\bOff\b/.test(card.querySelector(".card-h") ? card.querySelector(".card-h").textContent : "") && !card.querySelector(".card-b .badge.ok")) return false;
    if (/Not connected/.test(t)) return false;
    return !!card.querySelector(".badge.ok");
  }
  function enhance(grid) {
    if (grid.dataset.ig) return; grid.dataset.ig = "1";
    var box = document.createElement("div"); box.id = "ig"; grid.parentNode.insertBefore(box, grid);
    var keys = document.createElement("div"); keys.id = "ig-keys"; grid.parentNode.insertBefore(keys, grid.nextSibling);
    grid.classList.add("ig-cards");
    draw(grid);
    // late cards (Google, WhatsApp) are added by other modules → redraw when the grid changes
    var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { draw(grid); }, 120); }).observe(grid, { childList: true, subtree: true, characterData: true });
  }
  function cards(grid) { return ORDER.map(function (id) { return document.getElementById(id); }).filter(Boolean); }
  function draw(grid) {
    var box = document.getElementById("ig"); if (!box) return;
    var cs = cards(grid), on = cs.filter(isOn).length;
    var tile = function (c) {
      var m = META[c.id], ok = isOn(c), svg = c.querySelector(".card-h h3 svg");
      if (filt === "on" && !ok || filt === "off" && ok) return "";
      return '<button type="button" class="ig-tile' + (open === c.id ? " sel" : "") + '" data-o="' + c.id + '"><span class="ig-ic" style="--c:' + m[3] + '">' + (svg ? svg.outerHTML : "") + '</span><span class="ig-cat">' + m[1] + "</span><b>" + m[0] + "</b><small>" + m[2] + '</small><span class="ig-st ' + (ok ? "on" : "") + '"><i></i>' + (ok ? "Connected" : "Not set up") + '</span><span class="ig-go">' + (ok ? "Manage" : "Connect") + " →</span></button>";
    };
    box.innerHTML = '<div class="ig-head"><div><h3>Integrations</h3><p class="muted">' + on + " of " + cs.length + ' connected · all free except AI usage</p></div><div class="seg" id="ig-f">' +
      [["all", "All"], ["on", "Connected"], ["off", "Needs setup"]].map(function (x) { return '<button data-f="' + x[0] + '"' + (filt === x[0] ? ' class="on"' : "") + ">" + x[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="ig-grid">' + cs.map(tile).join("") +
      '<button type="button" class="ig-tile" data-tab="connections"><span class="ig-ic" style="--c:#0c1628">' + ic("key") + '</span><span class="ig-cat">Sign-in & agents</span><b>Google sign-in · AI agents (MCP)</b><small>Sign in with Google and connect Claude/ChatGPT to your admin.</small><span class="ig-st"><i></i>See Connections</span><span class="ig-go">Open →</span></button></div>' +
      (open ? '<div class="ig-back"><button type="button" class="btn sm" id="ig-all">← All integrations</button><b>' + esc(META[open][0]) + "</b></div>" : "");
    grid.classList.toggle("ig-one", !!open);
    cs.forEach(function (c) { c.classList.toggle("ig-show", c.id === open); });
    grid.hidden = !open;
    W.fillIcons && W.fillIcons(box);
    box.onclick = function (e) {
      var f = e.target.closest("[data-f]"), o = e.target.closest("[data-o]"), tb = e.target.closest("[data-tab]");
      if (f) { filt = f.dataset.f; draw(grid); }
      else if (o) { open = o.dataset.o; draw(grid); grid.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (tb) { var b = document.querySelector('#st-tabs [data-t="' + tb.dataset.tab + '"]'); if (b) b.click(); }
      else if (e.target.id === "ig-all") { open = null; draw(grid); box.scrollIntoView({ block: "start" }); }
    };
    keysTable(cs);
  }
  var mcp = null;
  function keysTable(cs) {
    var el = document.getElementById("ig-keys"); if (!el || open) { if (el) el.hidden = !!open; return; } el.hidden = false;
    var byId = {}; cs.forEach(function (c) { byId[c.id] = c; });
    var rows = KEYS.filter(function (k) { return byId[k[0]]; }).map(function (k) { var ok = isOn(byId[k[0]]);
      return "<tr><td><b>" + k[1] + "</b></td><td>" + k[2] + '</td><td><span class="badge ' + (ok ? "ok" : "") + '">' + (ok ? "Saved" : "Not set") + '</span></td><td class="muted">Server only · never shown again</td><td style="text-align:right"><button class="btn sm" data-o="' + k[0] + '">' + (ok ? "Replace" : "Add") + "</button></td></tr>"; });
    (mcp || []).forEach(function (t) { rows.push("<tr><td><b>" + esc(t.name) + '</b> <small class="muted">wxmcp_…' + esc(t.hint) + "</small></td><td>AI agent (MCP) access</td><td><span class=\"badge ok\">Active</span></td><td class=\"muted\">" + (t.last_used ? "Last used " + esc(String(t.last_used).slice(0, 16)) : "Never used") + ' · ' + (+t.uses || 0) + ' calls</td><td style="text-align:right"><button class="btn sm" data-tab="connections">Manage</button></td></tr>'); });
    el.innerHTML = '<div class="card" style="margin-top:22px"><div class="card-h"><div><h3>' + ic("key") + ' API keys & tokens</h3><small class="muted">Every secret the admin stores. Values are kept on the server and never sent back to the browser.</small></div><button class="btn sm" data-tab="connections">' + ic("plus") + 'New MCP token</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Key</th><th>Used for</th><th>Status</th><th>Storage</th><th></th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div></div>";
    W.fillIcons && W.fillIcons(el);
    el.onclick = function (e) { var o = e.target.closest("[data-o]"), tb = e.target.closest("[data-tab]"), box = document.getElementById("ig");
      if (o) { open = o.dataset.o; draw(document.querySelector(".ig-cards")); box.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (tb) { var b = document.querySelector('#st-tabs [data-t="' + tb.dataset.tab + '"]'); if (b) b.click(); } };
    if (mcp === null && W.can && W.can("owner,admin")) { mcp = []; api("mcp_tokens").then(function (r) { if (r.ok) { mcp = r.tokens; keysTable(cards()); } }); }
  }
  function boot() { var v = document.getElementById("view"); if (!v) return setTimeout(boot, 200);
    new MutationObserver(function () { var g = document.querySelector("#view .st-grid:not([data-ig])"); if (g && document.getElementById("in-mail")) { open = null; mcp = null; enhance(g); } }).observe(v, { childList: true, subtree: true }); }
  boot();
})();
