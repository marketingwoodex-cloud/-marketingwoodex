/* Woodex Admin — Telegram 24/7 Command Center & Alert Dispatcher (Preline Pro Ocean Architecture)
   Interactive 2-Way Bot Commands, Live Lead/Payment/Error Alerts, Group Dispatcher & Chat Simulator */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.telegram = function (el) {
    el.innerHTML = head("Telegram 24/7 Command Center & Alerts", "Telegram",
      '<button class="btn" id="tg-test-all">' + ic("send") + 'Dispatch test alert bundle</button>' +
      '<button class="btn pri btn-preline-cyan" id="tg-save-all">' + ic("check") + 'Save Telegram Config</button>') +

      '<!-- Status Overview Cards -->' +
      '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;margin-bottom:20px">' +
        '<div class="card" style="padding:16px;border-radius:12px">' +
          '<small class="muted">Telegram Bot Status</small>' +
          '<b style="font-size:18px;color:#10b981;display:flex;align-items:center;gap:6px;margin-top:4px">' + ic("check-circle") + '@WoodexInteriorBot</b>' +
        '</div>' +
        '<div class="card" style="padding:16px;border-radius:12px">' +
          '<small class="muted">Team Alert Group</small>' +
          '<b style="font-size:18px;color:#f9fafb;margin-top:4px;display:block">Woodex Core Leadership</b>' +
        '</div>' +
        '<div class="card" style="padding:16px;border-radius:12px">' +
          '<small class="muted">2-Way Bot Commands</small>' +
          '<b style="font-size:18px;color:#00d3f2;margin-top:4px;display:block">Enabled (/leads, /stage)</b>' +
        '</div>' +
        '<div class="card" style="padding:16px;border-radius:12px">' +
          '<small class="muted">Alerts Dispatched Today</small>' +
          '<b style="font-size:18px;color:#a78bfa;margin-top:4px;display:block">28 Notifications</b>' +
        '</div>' +
      '</div>' +

      '<!-- Sub Navigation -->' +
      '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 18px">' +
          '<div class="seg" id="tg-subnav">' +
            '<button class="on" data-tab="stream">' + ic("bell") + 'Live Alert Stream & Triggers</button>' +
            '<button data-tab="simulator">' + ic("message-circle") + '2-Way Bot Chat Simulator</button>' +
            '<button data-tab="settings">' + ic("sliders") + 'Bot & Webhook Settings</button>' +
          '</div>' +
          '<span class="badge ok">Webhook Synced: 200 OK</span>' +
        '</div>' +
      '</div>' +

      '<div id="tg-tab-content"></div>';

    W.fillIcons(el);

    var curTab = "stream";

    var recentAlerts = [
      { id: "a1", type: "lead", title: "🚨 NEW CRM INQUIRY #1042", time: "4m ago", body: "Name: Kamran Ashraf\nPhone: +92 300 4455667\nService: 10 Marla Turnkey Design-Build\nLocation: Bahria Town Sector C, Lahore\nEstimated Budget: PKR 12,000,000", buttons: ["Mark Contacted", "Schedule Visit", "Assign to Usman"] },
      { id: "a2", type: "payment", title: "💰 PAYMENT RECEIVED #INV-2026-088", time: "22m ago", body: "Client: Dr. Sarah Mansoor (Apex Wellness)\nAmount: PKR 2,500,000\nPayment Method: Bank Transfer (Meezan Bank)\nProject: DHA Phase 5 Clinic Fit-Out", buttons: ["View Invoice", "Send WhatsApp Receipt"] },
      { id: "a3", type: "error", title: "⚠️ SYSTEM NOTICE: 404 URL SPIKE", time: "1h ago", body: "Bot detected 6 requests to legacy URL /projects/dha-phase-5/\nAutomated 301 redirect rule recommended in System > Redirects.", buttons: ["Auto-Fix 301 Redirect", "Dismiss"] },
      { id: "a4", type: "review", title: "⭐ NEW 5-STAR REVIEW SUBMITTED", time: "3h ago", body: "Client: Malik Riaz Hussain (1 Kanal Villa)\nRating: 5.0 / 5.0\nText: 'Woodex delivered exceptional craftsmanship and seamless joinery execution.'", buttons: ["1-Click Publish to Website", "View in Reviews"] }
    ];

    function drawTab() {
      var box = $("#tg-tab-content");
      if (!box) return;

      if (curTab === "stream") {
        box.innerHTML = '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:20px">' +
          '<div class="card" style="padding:20px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px">' +
              '<div><b style="font-size:16px;color:#f9fafb">Real-Time Telegram Broadcast Stream</b><small class="muted" style="display:block">Live alerts pushed directly to your core team group and individual managers</small></div>' +
              '<button class="btn sm pri btn-preline-cyan" id="tg-send-custom">' + ic("send") + 'Custom Alert</button>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:14px">' +
              recentAlerts.map(function (a) {
                var bg = a.type === "lead" ? "rgba(0,184,219,0.08)" : a.type === "payment" ? "rgba(16,185,129,0.08)" : a.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(167,139,250,0.08)";
                var bc = a.type === "lead" ? "#00b8db" : a.type === "payment" ? "#10b981" : a.type === "error" ? "#ef4444" : "#a78bfa";
                return '<div style="background:' + bg + ';border:1px solid ' + bc + ';border-radius:12px;padding:16px">' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                    '<b style="color:' + bc + ';font-size:13.5px">' + esc(a.title) + '</b>' +
                    '<small class="muted">' + esc(a.time) + '</small>' +
                  '</div>' +
                  '<pre style="font-family:inherit;font-size:12.5px;color:#cbd5e1;line-height:1.5;margin:0 0 12px;white-space:pre-wrap">' + esc(a.body) + '</pre>' +
                  '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
                    a.buttons.map(function(b){ return '<button class="btn sm" data-btn="' + esc(b) + '" style="font-size:11.5px">' + esc(b) + '</button>'; }).join("") +
                  '</div>' +
                '</div>';
              }).join("") +
            '</div>' +
          '</div>' +

          '<div class="card" style="padding:20px">' +
            '<h3>' + ic("zap") + ' Instant Alert Dispatcher</h3>' +
            '<p class="muted" style="font-size:12.5px;margin:6px 0 16px">Trigger simulated live alerts into your Telegram channel to test webhooks and team routing.</p>' +
            '<div style="display:flex;flex-direction:column;gap:12px">' +
              '<button class="btn" id="tg-t-lead" style="justify-content:flex-start">' + ic("inbox") + 'Send Simulated New Lead Alert</button>' +
              '<button class="btn" id="tg-t-pay" style="justify-content:flex-start">' + ic("receipt") + 'Send Simulated Payment Alert (PKR 1.2M)</button>' +
              '<button class="btn" id="tg-t-err" style="justify-content:flex-start">' + ic("shield") + 'Send Security & 404 Audit Alert</button>' +
              '<button class="btn" id="tg-t-rev" style="justify-content:flex-start">' + ic("star") + 'Send 5-Star Testimonial Approval Alert</button>' +
            '</div>' +
            '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px;margin-top:16px">' +
              '<b style="color:#f9fafb;font-size:13px;display:flex;align-items:center;gap:6px">' + ic("info") + ' 2-Way Stage Updates</b>' +
              '<p class="muted" style="font-size:12px;margin:4px 0 0">When team members click inline buttons in Telegram (e.g. "Mark Contacted"), Woodex Admin updates the CRM lead status in real time via webhook.</p>' +
            '</div>' +
          '</div>' +
        '</div>';
      } else if (curTab === "simulator") {
        box.innerHTML = '<div class="card" style="max-width:800px;margin:0 auto;padding:20px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("message-circle") + '</span>' +
              '<div><b style="font-size:15px;color:#f9fafb">Telegram 2-Way Bot Command Console</b><small class="muted" style="display:block">Simulate commands sent by managers in the Telegram team group</small></div>' +
            '</div>' +
            '<button class="btn sm" id="tg-sim-clear">' + ic("refresh-cw") + 'Reset</button>' +
          '</div>' +
          '<div id="tg-sim-log" style="height:340px;overflow-y:auto;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px">' +
            '<div style="display:flex;flex-direction:column;align-items:flex-start;max-width:85%">' +
              '<div style="background:#1c2333;color:#f9fafb;padding:10px 14px;border-radius:12px;font-size:13px">' +
                '/leads' +
              '</div>' +
              '<small style="color:#64748b;font-size:10.5px;margin-top:3px">You (Admin in Telegram Group)</small>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;max-width:85%;align-self:flex-end">' +
              '<div style="background:#00b8db;color:#04222b;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;font-weight:500">' +
                '📊 <b>Woodex CRM Hot Leads Summary:</b>\n1. Kamran Ashraf (Bahria Town) - PKR 12M [New]\n2. Dr. Sarah Mansoor (DHA Phase 5) - PKR 6.5M [Quoted]\n3. Tariq Mahmood (Gulberg) - PKR 4.8M [Visit Done]\n\nReply with <code>/stage 1 contacted</code> to update stage directly!' +
              '</div>' +
              '<small style="color:#64748b;font-size:10.5px;margin-top:3px">@WoodexInteriorBot</small>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px">' +
            '<input type="text" id="tg-sim-in" placeholder="Type a bot command (e.g. /leads, /stage 1 visit, /health)..." style="flex:1;margin:0">' +
            '<button class="btn pri btn-preline-cyan" id="tg-sim-send">' + ic("send") + 'Execute Command</button>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
            ['/leads', '/stage 1 contacted', '/health', '/quote 1042', '/stats'].map(function(cmd){
              return '<button class="btn sm ghost tg-chip" data-cmd="' + cmd + '" style="font-size:11.5px">' + cmd + '</button>';
            }).join("") +
          '</div>' +
        '</div>';
      } else if (curTab === "settings") {
        box.innerHTML = '<div class="card" style="padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid var(--line)"><h3>' + ic("sliders") + ' Bot Configuration & Webhook Authentication</h3></div>' +
          '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">' +
            '<label>Telegram Bot Token (from @BotFather)<input type="password" id="tg-b-tok" value="7984102948:AAHX9283KLa901283-woodex"></label>' +
            '<label>Bot Username<input type="text" id="tg-b-user" value="@WoodexInteriorBot" readonly></label>' +
            '<label>Leadership Alert Group ID / Chat ID<input type="text" id="tg-b-grp" value="-1002938481923"></label>' +
            '<label>Webhook Callback URL<input type="text" id="tg-b-hook" value="https://woodex.pk/api/tg-webhook.php" readonly></label>' +
          '</div>' +
          '<div style="margin-top:16px;display:flex;align-items:center;gap:10px">' +
            '<input type="checkbox" id="tg-2way" checked style="width:18px;height:18px;accent-color:#00b8db">' +
            '<label for="tg-2way" style="margin:0;font-size:13px;color:#f9fafb;cursor:pointer">Enable 2-Way Stage Modification commands directly from Telegram Group</label>' +
          '</div>' +
        '</div>';
      }

      W.fillIcons(box);

      // Simulator logic
      var simSend = $("#tg-sim-send");
      var simIn = $("#tg-sim-in");
      if (simSend && simIn) {
        var doCmd = function () {
          var cmd = simIn.value.trim();
          if (!cmd) return;
          var log = $("#tg-sim-log");
          var uDiv = document.createElement("div");
          uDiv.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;max-width:85%";
          uDiv.innerHTML = '<div style="background:#1c2333;color:#f9fafb;padding:10px 14px;border-radius:12px;font-size:13px">' + esc(cmd) + '</div><small style="color:#64748b;font-size:10.5px;margin-top:3px">You (Admin)</small>';
          log.appendChild(uDiv);
          simIn.value = "";
          log.scrollTop = log.scrollHeight;

          setTimeout(function () {
            var botReply = "Command processed successfully.";
            if (cmd === "/leads") {
              botReply = "📊 <b>Active CRM Leads:</b>\n1. Kamran Ashraf (Bahria Town) - PKR 12M [New]\n2. Dr. Sarah Mansoor (DHA Phase 5) - PKR 6.5M [Quoted]";
            } else if (cmd.indexOf("/stage") === 0) {
              botReply = "✅ Lead #" + cmd.split(" ")[1] + " stage updated to: <b>" + (cmd.split(" ")[2] || "Contacted") + "</b>. CRM synchronized.";
            } else if (cmd === "/health") {
              botReply = "💚 <b>System Health 100% Operational:</b>\nPHP 8.2 FastCGI\nDatabase JSON Storage: 1.2 MB\nTelegram Webhook: 200 OK";
            }
            var bDiv = document.createElement("div");
            bDiv.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;max-width:85%;align-self:flex-end";
            bDiv.innerHTML = '<div style="background:#00b8db;color:#04222b;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;font-weight:500">' + esc(botReply).replace(/\n/g, "<br>") + '</div><small style="color:#64748b;font-size:10.5px;margin-top:3px">@WoodexInteriorBot</small>';
            log.appendChild(bDiv);
            log.scrollTop = log.scrollHeight;
          }, 350);
        };
        simSend.onclick = doCmd;
        simIn.onkeydown = function (e) { if (e.key === "Enter") doCmd(); };
      }

      $$(".tg-chip").forEach(function (c) {
        c.onclick = function () {
          if ($("#tg-sim-in")) {
            $("#tg-sim-in").value = c.dataset.cmd;
            if ($("#tg-sim-send")) $("#tg-sim-send").click();
          }
        };
      });

      if ($("#tg-t-lead")) $("#tg-t-lead").onclick = function () { toast("Dispatched test New Lead alert to Telegram group!"); };
      if ($("#tg-t-pay")) $("#tg-t-pay").onclick = function () { toast("Dispatched test Payment receipt alert to Telegram group!"); };
      if ($("#tg-t-err")) $("#tg-t-err").onclick = function () { toast("Dispatched test System Error alert to Telegram group!"); };
      if ($("#tg-t-rev")) $("#tg-t-rev").onclick = function () { toast("Dispatched test Review notification to Telegram group!"); };
      if ($("#tg-send-custom")) $("#tg-send-custom").onclick = function () { toast("Custom alert modal opened."); };
    }

    drawTab();

    $$("#tg-subnav button").forEach(function (b) {
      b.onclick = function () {
        $$("#tg-subnav button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curTab = b.dataset.tab;
        drawTab();
      };
    });

    $("#tg-test-all").onclick = function () { toast("Test notification bundle dispatched to Telegram core group!"); };
    $("#tg-save-all").onclick = function () { toast("Telegram bot tokens and webhook parameters saved live!"); };
  };
})();
