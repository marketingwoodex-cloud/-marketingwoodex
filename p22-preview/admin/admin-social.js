/* Woodex Admin — Social Media & OAuth Profile Linking (Preline Pro Ocean Architecture)
   1-Click OAuth Connect Cards for Google Workspace, Meta, Instagram, WhatsApp, LinkedIn, TikTok, YouTube */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.social = function (el) {
    el.innerHTML = head("Social Media & Integrations", "Social Media",
      '<button class="btn" id="soc-sync-all">' + ic("refresh-cw") + 'Sync all feeds</button>' +
      '<button class="btn pri btn-preline-cyan" id="soc-add-conn">' + ic("plus") + 'Add new profile</button>') +

      '<div class="card" style="margin-bottom:20px;background:#111318;border:1px solid #20242f">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 20px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("globe") + '</span>' +
            '<div>' +
              '<b style="font-size:16px;color:#f9fafb">Connected Social Profiles & Marketing Channels</b>' +
              '<small class="muted" style="display:block;margin-top:2px">Manage 1-click OAuth logins, automated social posts, and inbound message synchronization</small>' +
            '</div>' +
          '</div>' +
          '<span class="badge ok" style="font-size:12px;padding:4px 10px">6 of 7 Connected</span>' +
        '</div>' +
      '</div>' +

      '<div id="soc-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:20px"></div>';

    W.fillIcons(el);

    var channels = [
      { id: "google", name: "Google Account & Services", icon: "🌐", connected: true, account: "woodexinterior.pk@gmail.com", desc: "Syncs Google Analytics 4, Search Console indexation, and Google Business Profile.", color: "#4285F4" },
      { id: "meta", name: "Meta / Facebook Business", icon: "📘", connected: true, account: "Marketing Woodex Interior", desc: "Direct integration for Facebook Page posts, Lead Generation Ads, and Messenger chats.", color: "#1877F2" },
      { id: "instagram", name: "Instagram Professional", icon: "📸", connected: true, account: "@woodexinterior", desc: "Showcases latest residential project reels, highlights, and direct customer messages.", color: "#E4405F" },
      { id: "whatsapp", name: "WhatsApp Cloud Business", icon: "💬", connected: true, account: "+92 300 4455667", desc: "Powers floating click-to-open chat widget and instant lead broadcast alerts.", color: "#25D366" },
      { id: "linkedin", name: "LinkedIn Company Hub", icon: "💼", connected: true, account: "Woodex Interior Studio", desc: "Corporate architectural inquiries, commercial B2B leads, and portfolio showcases.", color: "#0A66C2" },
      { id: "youtube", name: "YouTube Channel", icon: "▶️", connected: true, account: "Woodex Interior Architecture", desc: "Embeds 3D video walkthroughs, client testimonials, and workshop tour videos.", color: "#FF0000" },
      { id: "tiktok", name: "TikTok Creator Studio", icon: "🎵", connected: false, account: "Not connected", desc: "Connect your TikTok account to broadcast workshop joinery reels and design tips.", color: "#000000" }
    ];

    function draw() {
      var grid = $("#soc-grid");
      if (!grid) return;

      grid.innerHTML = channels.map(function (c) {
        return '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,0.25)">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<span style="font-size:26px">' + c.icon + '</span>' +
              '<div>' +
                '<b style="font-size:15px;color:#f9fafb;display:block">' + esc(c.name) + '</b>' +
                '<small style="color:' + (c.connected ? "#00d3f2" : "#94a3b8") + ';font-size:12px;font-weight:600">' + esc(c.account) + '</small>' +
              '</div>' +
            '</div>' +
            '<span class="badge ' + (c.connected ? "ok" : "ghost") + '" style="font-size:11px">' + (c.connected ? "Connected" : "Disconnected") + '</span>' +
          '</div>' +
          '<p style="font-size:12.5px;color:#94a3b8;line-height:1.5;margin:0;flex:1">' + esc(c.desc) + '</p>' +
          '<div style="border-top:1px solid #1a1e27;padding-top:12px;display:flex;gap:8px;align-items:center;margin-top:auto">' +
            (c.connected
              ? '<button class="btn sm" data-action="disconnect" data-id="' + c.id + '" style="flex:1">' + ic("shield") + 'Manage permissions</button>' +
                '<button class="btn sm pri btn-preline-cyan" data-action="sync" data-id="' + c.id + '">' + ic("refresh-cw") + 'Sync</button>'
              : '<button class="btn sm pri btn-preline-cyan" data-action="connect" data-id="' + c.id + '" style="flex:1">' + ic("link") + 'Connect account</button>'
            ) +
          '</div>' +
        '</div>';
      }).join("");

      W.fillIcons(grid);

      $$('#soc-grid [data-action]').forEach(function (btn) {
        btn.onclick = function () {
          var act = btn.dataset.action;
          var id = btn.dataset.id;
          if (act === "connect") {
            toast("Opening OAuth 2.0 authorization dialog for " + id + "…");
          } else if (act === "sync") {
            toast("Synchronizing " + id + " feed and analytics…");
          } else {
            toast("Opening channel settings and API keys for " + id);
          }
        };
      });
    }

    draw();

    $("#soc-sync-all").onclick = function () { toast("All 6 connected social channels synchronized successfully!"); };
    $("#soc-add-conn").onclick = function () { toast("Select a social network to connect."); };
  };
})();
