/* Woodex Admin — Social Media & Community Automation Suite (Preline Pro Ocean Architecture)
   Sub-Tabs: Connectors & Profiles, Post Scheduler, 24/7 AI Community Responder, Inbound Lead Ingest Bridge */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.social = function (el) {
    el.innerHTML = head("Social Media & Community Automation", "Social Media",
      '<button class="btn" id="soc-sync-all">' + ic("refresh-cw") + 'Sync all channels</button>' +
      '<button class="btn pri btn-preline-cyan" id="soc-new-post">' + ic("plus") + 'Create Post / Broadcast</button>') +

      '<!-- Modular Sub-Navigation Bar -->' +
      '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 18px">' +
          '<div class="seg" id="soc-subnav">' +
            '<button class="on" data-tab="connectors">' + ic("globe") + 'Profiles & OAuth</button>' +
            '<button data-tab="scheduler">' + ic("calendar") + 'Post Scheduler & Queue</button>' +
            '<button data-tab="ai-responder">' + ic("sparkles") + '24/7 AI Community Agent</button>' +
            '<button data-tab="leads-bridge">' + ic("inbox") + 'Inbound Lead Ingest</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span class="badge ok">● 6 Channels Live</span>' +
            '<span class="badge navy">AI Auto-Reply Active</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="soc-tab-content"></div>';

    W.fillIcons(el);

    var curTab = "connectors";

    var channels = [
      { id: "google", name: "Google Account & Services", icon: "🌐", connected: true, account: "woodexinterior.pk@gmail.com", desc: "Syncs Google Analytics 4, Search Console indexation, and Google Business Profile.", color: "#4285F4" },
      { id: "meta", name: "Meta / Facebook Business", icon: "📘", connected: true, account: "Marketing Woodex Interior", desc: "Direct integration for Facebook Page posts, Lead Generation Ads, and Messenger chats.", color: "#1877F2" },
      { id: "instagram", name: "Instagram Professional", icon: "📸", connected: true, account: "@woodexinterior", desc: "Showcases latest residential project reels, highlights, and direct customer messages.", color: "#E4405F" },
      { id: "whatsapp", name: "WhatsApp Cloud Business", icon: "💬", connected: true, account: "+92 300 4455667", desc: "Powers floating click-to-open chat widget and instant lead broadcast alerts.", color: "#25D366" },
      { id: "linkedin", name: "LinkedIn Company Hub", icon: "💼", connected: true, account: "Woodex Interior Studio", desc: "Corporate architectural inquiries, commercial B2B leads, and portfolio showcases.", color: "#0A66C2" },
      { id: "youtube", name: "YouTube Channel", icon: "▶️", connected: true, account: "Woodex Interior Architecture", desc: "Embeds 3D video walkthroughs, client testimonials, and workshop tour videos.", color: "#FF0000" },
      { id: "tiktok", name: "TikTok Creator Studio", icon: "🎵", connected: false, account: "Not connected", desc: "Connect your TikTok account to broadcast workshop joinery reels and design tips.", color: "#000000" }
    ];

    var scheduledPosts = [
      { id: "p1", title: "DHA Phase 6 Villa - Master Walk-Through Video", channels: ["Instagram", "Meta", "YouTube"], date: "Today at 6:00 PM", status: "Scheduled", preview: "Take a tour inside our latest 1 Kanal turnkey project in DHA Phase 6 Lahore featuring solid teak wall paneling and Italian marble accents." },
      { id: "p2", title: "Modern Acrylic Kitchen Design Trends 2026", channels: ["LinkedIn", "Meta"], date: "Tomorrow at 11:30 AM", status: "Scheduled", preview: "Why moisture-resistant German UV acrylic is outperforming traditional laminates in Lahore luxury residences. Read our comprehensive guide." },
      { id: "p3", title: "Commercial Clinic Fitout in Gulberg III", channels: ["Instagram", "LinkedIn"], date: "Oct 12 at 4:00 PM", status: "Draft", preview: "Acoustic comfort meets healthcare elegance. Complete architectural fit-out delivered for Apex Medical." }
    ];

    var recentSocialLeads = [
      { id: "sl1", user: "Hamza Rasheed", platform: "Instagram DM", comment: "Interested in complete 10 Marla interior design in Bahria Town. What is your price per sq ft? 0300-8877665", phone: "+92 300 8877665", status: "Auto-Ingested to CRM", time: "12m ago" },
      { id: "sl2", user: "Dr. Ayesha Tariq", platform: "Meta Comment", comment: "Need kitchen island remodel with Spanish quartz. Kindly contact 0321-4433221", phone: "+92 321 4433221", status: "Auto-Ingested to CRM", time: "1h ago" },
      { id: "sl3", user: "Zubair Ahmed", platform: "LinkedIn Message", comment: "Looking for corporate boardroom acoustic fit-out for our software house in Gulberg.", phone: "+92 333 5566778", status: "Assigned to Usman Ali", time: "3h ago" }
    ];

    function drawTab() {
      var box = $("#soc-tab-content");
      if (!box) return;

      if (curTab === "connectors") {
        box.innerHTML = '<div class="card" style="margin-bottom:20px">' +
          '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 20px">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("globe") + '</span>' +
              '<div>' +
                '<b style="font-size:16px;color:#f9fafb">Connected Social Profiles & Marketing Channels</b>' +
                '<small class="muted" style="display:block;margin-top:2px">Manage 1-click OAuth logins, automated social posts, and inbound message synchronization</small>' +
              '</div>' +
            '</div>' +
            '<span class="badge ok">6 of 7 Connected</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:20px">' +
          channels.map(function (c) {
            return '<div class="card" style="border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:14px">' +
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
              '<div style="border-top:1px solid var(--line);padding-top:12px;display:flex;gap:8px;align-items:center;margin-top:auto">' +
                (c.connected
                  ? '<button class="btn sm" data-action="manage" data-id="' + c.id + '" style="flex:1">' + ic("shield") + 'Permissions</button>' +
                    '<button class="btn sm pri btn-preline-cyan" data-action="sync" data-id="' + c.id + '">' + ic("refresh-cw") + 'Sync</button>'
                  : '<button class="btn sm pri btn-preline-cyan" data-action="connect" data-id="' + c.id + '" style="flex:1">' + ic("link") + 'Connect account</button>'
                ) +
              '</div>' +
            '</div>';
          }).join("") +
        '</div>';
      } else if (curTab === "scheduler") {
        box.innerHTML = '<div style="display:grid;grid-template-columns:1fr 340px;gap:20px">' +
          '<div class="card" style="padding:20px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px">' +
              '<div><b style="font-size:16px;color:#f9fafb">Publishing Calendar & Outbox</b><small class="muted" style="display:block">Automated cross-posting across Meta, Instagram, LinkedIn, and TikTok</small></div>' +
              '<button class="btn sm pri btn-preline-cyan" id="soc-add-post">' + ic("plus") + 'New Post</button>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:14px">' +
              scheduledPosts.map(function(p) {
                return '<div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px">' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
                    '<b style="font-size:14px;color:#f9fafb">' + esc(p.title) + '</b>' +
                    '<span class="badge ' + (p.status === "Scheduled" ? "ok" : "navy") + '">' + esc(p.status) + '</span>' +
                  '</div>' +
                  '<p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin:0 0 10px">' + esc(p.preview) + '</p>' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#94a3b8;border-top:1px solid var(--line);padding-top:10px">' +
                    '<span>Channels: ' + p.channels.map(function(c){ return '<span class="badge sm ghost" style="margin-right:4px">' + c + '</span>'; }).join("") + '</span>' +
                    '<span style="color:#00d3f2;font-weight:600">' + ic("clock") + ' ' + esc(p.date) + '</span>' +
                  '</div>' +
                '</div>';
              }).join("") +
            '</div>' +
          '</div>' +
          '<div class="card" style="padding:20px">' +
            '<h3>' + ic("zap") + ' Instant Quick Broadcast</h3>' +
            '<p class="muted" style="font-size:12.5px;margin:6px 0 14px">Blast an update or announcement directly to your connected social channels.</p>' +
            '<div style="display:flex;flex-direction:column;gap:12px">' +
              '<label>Target Audience / Channels' +
                '<select id="soc-q-chan"><option>All Active Channels (Meta, IG, LinkedIn)</option><option>Meta & Instagram Only</option><option>LinkedIn Corporate Only</option></select>' +
              '</label>' +
              '<label>Post Caption<textarea id="soc-q-txt" rows="4" placeholder="Write your broadcast announcement..."></textarea></label>' +
              '<button class="btn pri btn-preline-cyan" id="soc-q-send" style="margin-top:6px">' + ic("send") + 'Publish Broadcast Now</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      } else if (curTab === "ai-responder") {
        box.innerHTML = '<div class="card" style="padding:20px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px">' +
            '<div><b style="font-size:16px;color:#f9fafb">24/7 AI Community Manager</b><small class="muted" style="display:block">Automatically responds to public comments and direct messages on social media</small></div>' +
            '<label class="check" style="margin:0"><input type="checkbox" id="ai-soc-toggle" checked style="width:18px;height:18px;accent-color:#00b8db"> <b>AI Auto-Reply Enabled</b></label>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
            '<div style="display:flex;flex-direction:column;gap:14px">' +
              '<label>Auto-Reply Rule: Price & Rate Questions<textarea rows="3">Assalam-o-Alaikum! Our turnkey interior design typically starts at PKR 2,800/sq ft. We’ve sent you a direct message with our latest catalogue and price guide!</textarea></label>' +
              '<label>Auto-Reply Rule: Site Location & Office Visit<textarea rows="3">Our design studio is located in Sector C, Commercial Area, Bahria Town Lahore. We also operate in DHA Phase 6. Would you like to schedule an on-site consultation?</textarea></label>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:14px">' +
              '<label>Auto-DM: Phone Number Capture<textarea rows="3">Thank you for reaching out to Woodex Interior! Please share your contact number and project location, and our lead architect will share a 3D mood board.</textarea></label>' +
              '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px">' +
                '<b style="color:#00d3f2;font-size:13px;display:flex;align-items:center;gap:6px">' + ic("shield") + ' Smart Lead Extraction</b>' +
                '<p class="muted" style="font-size:12px;margin:6px 0 0">Whenever a user comments or DMs a phone number (e.g. 03xx-xxxxxxx), the AI immediately parses it and creates a CRM Lead tagged with "Source: Social Media".</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px;display:flex;justify-content:flex-end">' +
            '<button class="btn pri btn-preline-cyan" id="soc-save-ai">' + ic("check") + 'Save AI Community Rules</button>' +
          '</div>' +
        '</div>';
      } else if (curTab === "leads-bridge") {
        box.innerHTML = '<div class="card" style="padding:20px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px">' +
            '<div><b style="font-size:16px;color:#f9fafb">Inbound Social Leads Bridge</b><small class="muted" style="display:block">Leads automatically captured and extracted from Instagram, Facebook, and LinkedIn comments/DMs</small></div>' +
            '<a class="btn sm pri btn-preline-cyan" href="#/enquiries">' + ic("inbox") + 'View in CRM</a>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            recentSocialLeads.map(function(l) {
              return '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px">' +
                '<div style="display:flex;align-items:center;gap:12px">' +
                  '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("user") + '</span>' +
                  '<div>' +
                    '<b style="font-size:14px;color:#f9fafb;display:block">' + esc(l.user) + ' <small class="muted">via ' + esc(l.platform) + ' · ' + esc(l.time) + '</small></b>' +
                    '<p style="font-size:12.5px;color:#cbd5e1;margin:4px 0 0">' + esc(l.comment) + '</p>' +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
                  '<span class="badge ok">' + esc(l.status) + '</span>' +
                  '<b style="color:#00d3f2;font-size:12px">' + esc(l.phone) + '</b>' +
                '</div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      W.fillIcons(box);

      if ($("#soc-q-send")) {
        $("#soc-q-send").onclick = function () {
          var txt = $("#soc-q-txt").value.trim();
          if (!txt) return toast("Please type a message to broadcast.", true);
          toast("Broadcast published across connected social channels!");
          $("#soc-q-txt").value = "";
        };
      }
      if ($("#soc-save-ai")) {
        $("#soc-save-ai").onclick = function () { toast("AI Community Manager rules saved successfully!"); };
      }
      if ($("#soc-add-post")) {
        $("#soc-add-post").onclick = function () { toast("Post Composer opened."); };
      }
    }

    drawTab();

    $$("#soc-subnav button").forEach(function (b) {
      b.onclick = function () {
        $$("#soc-subnav button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curTab = b.dataset.tab;
        drawTab();
      };
    });

    $("#soc-sync-all").onclick = function () { toast("All 6 connected social channels synchronized successfully!"); };
    $("#soc-new-post").onclick = function () {
      $$("#soc-subnav button").forEach(function (x) { x.classList.remove("on"); });
      $$("#soc-subnav button[data-tab='scheduler']")[0].classList.add("on");
      curTab = "scheduler";
      drawTab();
    };
  };
})();
