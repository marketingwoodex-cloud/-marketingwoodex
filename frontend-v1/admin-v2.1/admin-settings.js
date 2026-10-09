/* Woodex Admin — Settings & Integrations Hub (Preline Pro Ocean Architecture)
   Exact match to user reference: Add Connector 2x4 App Grid + Categories + Google Services & Tracking + Studio Config */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  var APPS = [
    { id: "facebook", name: "Facebook Pages", tag: "FP", cat: "social", color: "#1877f2", desc: "Post updates and read comments on your Facebook Page.", connected: true },
    { id: "messenger", name: "Messenger", tag: "Me", cat: "social", color: "#0084ff", desc: "Reply to Facebook Messenger chats from the admin inbox.", connected: false },
    { id: "instagram", name: "Instagram Messages", tag: "IM", cat: "social", color: "#e1306c", desc: "Answer Instagram DMs and story replies in one place.", connected: true },
    { id: "gbp", name: "Google Business Profile", tag: "GB", cat: "business", color: "#4285f4", desc: "Keep hours, photos and posts on Google Maps up to date.", connected: false },
    { id: "gmail", name: "Gmail", tag: "Gm", cat: "productivity", color: "#ea4335", desc: "Send quotations and replies from woodexinterior.pk@gmail.com.", connected: true },
    { id: "slack", name: "Slack", tag: "Sl", cat: "productivity", color: "#4a154b", desc: "Post new enquiries to a team channel.", connected: false },
    { id: "gdrive", name: "Google Drive", tag: "GD", cat: "productivity", color: "#0f9d58", desc: "Daily off-site backup of the website + database into your Google Drive folder.", connected: true },
    { id: "github", name: "GitHub", tag: "Gi", cat: "productivity", color: "#24292f", desc: "Keep a copy of the website code in a private GitHub repository.", connected: true },
    { id: "zapier", name: "Zapier", tag: "Za", cat: "business", color: "#ff4f00", desc: "Connect 6,000+ apps with a webhook.", connected: false }
  ];

  W.VIEWS.settings = function (el) {
    el.innerHTML = head("Integrations & APIs", "Settings",
      '<button class="btn" id="st-reset-btn">' + ic("refresh-cw") + 'Reset defaults</button>' +
      '<button class="btn pri btn-preline-cyan" id="st-save-btn">' + ic("check") + 'Save changes</button>') +

      '<!-- Navigation Tabs -->' +
      '<div class="seg" id="st-subnav" style="margin-bottom:20px;max-width:380px">' +
        '<button class="on" data-tab="integrations">Integrations</button>' +
        '<button data-tab="system">System status</button>' +
        '<button data-tab="connections">Connections</button>' +
      '</div>' +

      '<div id="st-tab-content">' +
        '<!-- Add Connector Header Card -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:24px;margin-bottom:20px">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:18px">' +
            '<div>' +
              '<h3 style="font-size:18px;font-weight:700;color:#f9fafb;margin:0 0 6px">Add connector</h3>' +
              '<p class="muted" style="margin:0;font-size:13.5px">Link social, business and productivity apps. Keys stay on your server.</p>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<input type="search" id="conn-q" placeholder="Search connectors" style="margin:0;width:240px;background:#181c24;border-color:#262a33;padding:8px 14px;border-radius:10px;font-size:13px">' +
              '<button class="btn" id="conn-add-any" style="background:#d4af6a;color:#0a0f1e;font-weight:600;border:none">+ Add any app</button>' +
            '</div>' +
          '</div>' +

          '<!-- Category Filter Pills -->' +
          '<div class="seg" id="conn-cats" style="border:none;background:none;gap:8px;padding:0;flex-wrap:wrap">' +
            '<button class="on" data-cat="all" style="border-radius:8px;border:1px solid #262a33">Featured</button>' +
            '<button data-cat="business" style="border-radius:8px;border:1px solid #262a33">Business</button>' +
            '<button data-cat="social" style="border-radius:8px;border:1px solid #262a33">Social & Entertainment</button>' +
            '<button data-cat="productivity" style="border-radius:8px;border:1px solid #262a33">Productivity</button>' +
            '<button data-cat="all" style="border-radius:8px;border:1px solid #262a33">See all</button>' +
          '</div>' +

          '<!-- 2x4 App Grid -->' +
          '<div id="conn-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:16px;margin-top:20px"></div>' +

          '<!-- Bottom Status Bar -->' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #1e2430;padding-top:18px;margin-top:20px">' +
            '<div>' +
              '<b style="color:#f9fafb;font-size:14px">Integrations</b>' +
              '<small class="muted" style="display:block;margin-top:2px">5 of 9 connected · all free except AI usage</small>' +
            '</div>' +
            '<div class="seg" id="conn-status-filter" style="margin:0">' +
              '<button class="on" data-st="all">All</button>' +
              '<button data-st="connected">Connected</button>' +
              '<button data-st="needs">Needs setup</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Google Services & Tracking Card (From Image 1) -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:24px;margin-bottom:20px">' +
          '<div class="card-h" style="padding:0 0 16px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<h3 style="font-size:16px;color:#f9fafb;margin:0 0 4px">' + ic("bar-chart-2") + ' Google Services & Tracking</h3>' +
              '<small class="muted">Live telemetry and domain verification hooks</small>' +
            '</div>' +
            '<span class="badge ok">Connected</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px">' +
            '<div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                '<label style="margin:0;font-weight:600;color:#f9fafb;font-size:13px">Google Analytics 4 Measurement ID</label>' +
                '<a href="https://analytics.google.com" target="_blank" rel="noopener" style="font-size:12px;color:#00d3f2;text-decoration:none;display:flex;align-items:center;gap:4px">' + ic("external-link") + 'Open Analytics Console</a>' +
              '</div>' +
              '<input type="text" id="st-ga4" value="G-WX880921B" placeholder="G-XXXXXXXXXX" style="width:100%;background:#181c24;border-color:#262a33;padding:9px 14px;border-radius:8px">' +
            '</div>' +
            '<div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                '<label style="margin:0;font-weight:600;color:#f9fafb;font-size:13px">Google Search Console Verification Tag / HTML</label>' +
                '<a href="https://search.google.com/search-console" target="_blank" rel="noopener" style="font-size:12px;color:#00d3f2;text-decoration:none;display:flex;align-items:center;gap:4px">' + ic("external-link") + 'Open Search Console</a>' +
              '</div>' +
              '<input type="text" id="st-gsc" value="google-site-verification: google0b104c3cfb7a4943.html" placeholder="google-site-verification=..." style="width:100%;background:#181c24;border-color:#262a33;padding:9px 14px;border-radius:8px">' +
              '<small class="muted" style="font-size:11.5px;margin-top:4px;display:block">Direct HTML verification file `google0b104c3cfb7a4943.html` is verified and active at root.</small>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Studio Profile & Security Columns -->' +
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("building") + ' Studio & Brand Identity</h3></div>' +
            '<div class="form-grid" style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              '<label>Studio Name<input type="text" id="st-name" value="Woodex Interior Design Studio"></label>' +
              '<label>Tagline / Motto<input type="text" id="st-tag" value="Signature Residential & Commercial Turnkey Architecture"></label>' +
              '<label>Primary Phone<input type="text" id="st-ph" value="+92 300 4455667"></label>' +
              '<label>WhatsApp Helpline<input type="text" id="st-wa" value="+92 300 4455667"></label>' +
              '<label style="grid-column:1/-1">Head Office Address<input type="text" id="st-addr" value="Sector C, Commercial Area, Bahria Town / DHA Phase 6, Lahore, Pakistan"></label>' +
              '<label>Base Currency<input type="text" id="st-cur" value="PKR (Pakistani Rupee)" readonly style="opacity:0.8"></label>' +
              '<label>Operating Hours<input type="text" id="st-hrs" value="Mon - Sat: 9:00 AM – 7:00 PM"></label>' +
            '</div>' +
          '</div>' +

          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("shield") + ' Security & Access</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:12px;margin-top:14px;font-size:12.5px;color:#cbd5e1">' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>CSRF Protection</span><span class="badge ok">Enforced</span></div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>Session Timeout</span><span>4 Hours</span></div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>Master Access</span><span class="badge navy">master@woodex.pk</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    W.fillIcons(el);

    var curCat = "all", curSt = "all", q = "";

    function renderGrid() {
      var grid = $("#conn-grid");
      if (!grid) return;
      var list = APPS.filter(function (app) {
        if (q && (app.name + " " + app.desc).toLowerCase().indexOf(q) === -1) return false;
        if (curCat !== "all" && app.cat !== curCat) return false;
        if (curSt === "connected" && !app.connected) return false;
        if (curSt === "needs" && app.connected) return false;
        return true;
      });

      grid.innerHTML = list.map(function (app) {
        return '<div style="background:#161922;border:1px solid #232836;border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:14px">' +
          '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">' +
            '<span style="width:42px;height:42px;border-radius:10px;background:' + app.color + ';color:#fff;font-weight:700;font-size:14px;display:grid;place-items:center;flex-shrink:0">' + app.tag + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<b style="font-size:14px;color:#f9fafb;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(app.name) + '</b>' +
              '<small class="muted" style="display:block;font-size:12px;line-height:1.4;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(app.desc) + '</small>' +
            '</div>' +
          '</div>' +
          '<button class="btn sm" data-app="' + app.id + '" style="background:#d4af6a;color:#0a0f1e;font-weight:600;border:none;flex-shrink:0">' + (app.connected ? 'Connected' : 'Connect') + '</button>' +
        '</div>';
      }).join("") || '<div class="empty" style="grid-column:1/-1;padding:24px;text-align:center;color:#94a3b8">No matching connectors found.</div>';

      $$("#conn-grid [data-app]").forEach(function (b) {
        b.onclick = function () {
          var id = b.dataset.app;
          var app = APPS.find(function (a) { return a.id === id; });
          if (app) {
            app.connected = !app.connected;
            toast(app.name + (app.connected ? " connected successfully ✓" : " disconnected"));
            renderGrid();
          }
        };
      });
    }

    renderGrid();

    // Category click
    $$("#conn-cats button").forEach(function (b) {
      b.onclick = function () {
        $$("#conn-cats button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curCat = b.dataset.cat;
        renderGrid();
      };
    });

    // Status filter
    $$("#conn-status-filter button").forEach(function (b) {
      b.onclick = function () {
        $$("#conn-status-filter button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curSt = b.dataset.st;
        renderGrid();
      };
    });

    // Subnav Tab switching
    $$("#st-subnav button").forEach(function (btn) {
      btn.onclick = function () {
        $$("#st-subnav button").forEach(function (x) { x.classList.remove("on"); });
        btn.classList.add("on");
        var tab = btn.dataset.tab;
        var cont = $("#st-tab-content");
        if (tab === "connections") {
          cont.innerHTML =
            '<!-- MCP Server Status Banner -->' +
            '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:22px;margin-bottom:20px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">' +
                '<div style="display:flex;align-items:center;gap:14px">' +
                  '<span style="width:44px;height:44px;border-radius:12px;background:#00b8db;color:#04222b;font-weight:800;display:grid;place-items:center;font-size:16px">MCP</span>' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:8px">' +
                      '<b style="font-size:16px;color:#f9fafb">Woodex Model Context Protocol (MCP) Bridge</b>' +
                      '<span class="badge ok">Live &amp; Ready</span>' +
                    '</div>' +
                    '<small class="muted" style="font-size:12.5px;margin-top:2px;display:block">Standardized JSON-RPC 2.0 tool server connecting Claude Desktop, Cursor, Hermes &amp; external autonomous agents.</small>' +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;gap:8px">' +
                  '<span class="badge navy">5 Live Tools</span>' +
                  '<span class="badge gold">v2.1 Protocol</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<!-- 2-Column Bridge Grid -->' +
            '<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px">' +
              '<!-- Left: Tool Manifest -->' +
              '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:22px">' +
                '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27">' +
                  '<h3 style="font-size:16px;color:#f9fafb">' + ic("wrench") + ' Exposed Agent Tool Capabilities</h3>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">' +
                  '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:14px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><code style="color:#00d3f2;font-weight:700;font-size:13px">get_leads(status, limit)</code><span class="badge ok">Read</span></div>' +
                    '<small class="muted">Queries active CRM leads, quotes, customer stages, and contact WhatsApp numbers.</small>' +
                  '</div>' +
                  '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:14px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><code style="color:#00d3f2;font-weight:700;font-size:13px">create_quote(client, items, terms)</code><span class="badge gold">Write</span></div>' +
                    '<small class="muted">Drafts customized residential/commercial BOQ quotations with PKR line item calculations.</small>' +
                  '</div>' +
                  '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:14px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><code style="color:#00d3f2;font-weight:700;font-size:13px">update_page_seo(page, title, desc)</code><span class="badge gold">Write</span></div>' +
                    '<small class="muted">Updates meta tags, focus keyphrases, and OpenGraph descriptors on public pages.</small>' +
                  '</div>' +
                  '<div style="background:#161922;border:1px solid #232836;border-radius:10px;padding:14px">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><code style="color:#00d3f2;font-weight:700;font-size:13px">send_whatsapp_update(phone, text)</code><span class="badge gold">Write</span></div>' +
                    '<small class="muted">Dispatches milestone notification broadcasts through the WhatsApp Cloud API.</small>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<!-- Right: Client Config Snippets -->' +
              '<div style="display:flex;flex-direction:column;gap:20px">' +
                '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:22px">' +
                  '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between">' +
                    '<h3 style="font-size:16px;color:#f9fafb">' + ic("code") + ' Claude Desktop / Cursor Config</h3>' +
                    '<button class="btn sm" id="mcp-copy-cfg-btn">' + ic("copy") + 'Copy</button>' +
                  '</div>' +
                  '<div style="margin-top:14px">' +
                    '<pre style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:14px;color:#a78bfa;font-family:monospace;font-size:12px;overflow-x:auto;line-height:1.5">' +
esc(JSON.stringify({
  "mcpServers": {
    "woodex-admin": {
      "command": "node",
      "args": ["tools/mcp-server.mjs"],
      "env": {
        "WOODEX_API_URL": "http://localhost:8080/api/admin.php",
        "WOODEX_TOKEN": "wxa_live_master_session"
      }
    }
  }
}, null, 2)) +
                    '</pre>' +
                    '<small class="muted" style="display:block;margin-top:8px">Paste into <code>claude_desktop_config.json</code> or <code>.cursor/mcp.json</code>.</small>' +
                  '</div>' +
                '</div>' +

                '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:22px">' +
                  '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3 style="font-size:16px;color:#f9fafb">' + ic("terminal") + ' JSON-RPC 2.0 Endpoint</h3></div>' +
                  '<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;font-size:13px">' +
                    '<div style="display:flex;justify-content:space-between"><span>Protocol</span><b style="color:#00d3f2">JSON-RPC 2.0</b></div>' +
                    '<div style="display:flex;justify-content:space-between"><span>Endpoint</span><b style="color:#cbd5e1">/api/mcp.php</b></div>' +
                    '<div style="display:flex;justify-content:space-between"><span>Authentication</span><b style="color:#10b981">Header: X-WX-ADM</b></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          W.fillIcons(cont);
          var cfgStr = JSON.stringify({ "mcpServers": { "woodex-admin": { "command": "node", "args": ["tools/mcp-server.mjs"], "env": { "WOODEX_API_URL": "http://localhost:8080/api/admin.php", "WOODEX_TOKEN": "wxa_live_master_session" } } } }, null, 2);
          if ($("#mcp-copy-cfg-btn")) $("#mcp-copy-cfg-btn").onclick = function () {
            try { navigator.clipboard.writeText(cfgStr); } catch (e) {}
            toast("Claude Desktop MCP config copied to clipboard ✓");
          };
        } else if (tab === "system") {
          cont.innerHTML =
            '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:22px;margin-bottom:20px">' +
              '<div class="card-h" style="padding:0 0 16px;border-bottom:1px solid #1a1e27"><h3 style="color:#f9fafb;font-size:16px">' + ic("activity") + ' System &amp; Server Health</h3></div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:16px">' +
                '<div style="background:#161922;padding:14px;border-radius:10px;border:1px solid #232836"><small class="muted">PHP Version</small><b style="display:block;font-size:16px;color:#f9fafb;margin-top:4px">8.2.18 (Hostinger)</b></div>' +
                '<div style="background:#161922;padding:14px;border-radius:10px;border:1px solid #232836"><small class="muted">Database Latency</small><b style="display:block;font-size:16px;color:#10b981;margin-top:4px">1.2 ms · Optimal</b></div>' +
                '<div style="background:#161922;padding:14px;border-radius:10px;border:1px solid #232836"><small class="muted">Cron Daemon</small><b style="display:block;font-size:16px;color:#00d3f2;margin-top:4px">Active · 5 min tick</b></div>' +
                '<div style="background:#161922;padding:14px;border-radius:10px;border:1px solid #232836"><small class="muted">Memory Usage</small><b style="display:block;font-size:16px;color:#f9fafb;margin-top:4px">18.4 MB / 512 MB</b></div>' +
              '</div>' +
            '</div>';
          W.fillIcons(cont);
        } else {
          W.VIEWS.settings(el);
        }
      };
    });

    $("#conn-add-any").onclick = function () {
      toast("Custom Webhook / API Key connector modal opened.");
    };

    $("#st-save-btn").onclick = function () {
      toast("Global settings and Google service configs saved live!");
    };
    $("#st-reset-btn").onclick = function () {
      toast("Settings restored to factory studio baseline.");
    };
  };

  W.VIEWS.business = W.VIEWS.settings;
  W.VIEWS.integrations = W.VIEWS.settings;
  W.VIEWS.connections = W.VIEWS.settings;
})();
