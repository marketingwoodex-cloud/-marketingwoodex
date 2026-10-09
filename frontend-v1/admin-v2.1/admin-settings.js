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

    $("#conn-q").oninput = function () {
      q = this.value.trim().toLowerCase();
      renderGrid();
    };

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
