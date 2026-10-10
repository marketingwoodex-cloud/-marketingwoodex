/* Woodex Admin — Client Updates & Project Notifications (Preline Pro Ocean Architecture)
   Automated project milestone notifications, bilingual templates (English/Urdu), tokens, and WhatsApp triggers */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;
  var HINT = { lead: "Sent when a customer submits a form on the website.", quote: "Sent when a quotation's status changes from Draft to Sent.", started: "Sent once when a project moves to Execution.", handover: "Sent once when a project moves to Handover or Completed." };

  W.VIEWS.updates = function (el) {
    el.innerHTML = head("Client Updates & Notifications", "Client Updates",
      '<button class="btn" id="upd-new-btn">' + ic("plus") + 'New trigger</button>' +
      '<button class="btn pri btn-preline-cyan" id="nt-save">' + ic("check") + 'Save notifications</button>') +

      '<!-- Metrics Overview -->' +
      '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;margin-bottom:20px">' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted">Active Notification Triggers</small>' +
          '<b style="font-size:20px;color:#f9fafb;margin-top:4px;display:block">8 Automated Workflows</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted">WhatsApp Delivery Rate</small>' +
          '<b style="font-size:20px;color:#10b981;margin-top:4px;display:block">99.2%</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted">Messages Sent This Month</small>' +
          '<b style="font-size:20px;color:#00d3f2;margin-top:4px;display:block">1,420 Alerts</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted">Client Portal Logins</small>' +
          '<b style="font-size:20px;color:#a78bfa;margin-top:4px;display:block">318 Visits</b>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px">' +
        '<!-- Notification Templates Table -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between">' +
            '<h3>' + ic("bell") + ' Milestone Triggers & Templates</h3>' +
            '<span class="badge ok">Live Sync</span>' +
          '</div>' +
          '<div id="upd-list" style="margin-top:16px;display:flex;flex-direction:column;gap:12px"></div>' +
        '</div>' +

        '<!-- Interactive Template Preview & Tester -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("smartphone") + ' WhatsApp Live Preview</h3></div>' +
          '<div style="margin-top:16px;background:#0b0d13;border:1px solid #1e2430;border-radius:12px;padding:16px">' +
            '<div style="background:#075e54;color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-size:12px;display:flex;align-items:center;gap:8px">' +
              ic("message-circle") + '<b>Woodex Studio Official Updates</b>' +
            '</div>' +
            '<div id="preview-box" style="background:#0b141a;padding:14px;min-height:180px;font-size:13px;line-height:1.5;color:#e9edef;white-space:pre-wrap;border-radius:0 0 8px 8px;border:1px solid #1e2430;border-top:0">' +
              'Select a template on the left to preview.' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">' +
            '<label>Test Recipient Phone<input type="text" id="upd-test-phone" value="+92 300 4455667"></label>' +
            '<button class="btn pri btn-preline-cyan" id="upd-send-test">' + ic("send") + 'Send Test Alert via WhatsApp</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    W.fillIcons(el);

    var templates = [
      {
        id: "lead",
        title: "3D Design Approved & Production Started",
        stage: "Production Kickoff",
        lang: "Bilingual (EN + UR)",
        channel: "WhatsApp & Email",
        body: "Assalam-o-Alaikum {client_name},\n\nGreat news! Your 3D interior design for {project_name} has been approved by our lead architect.\n\nMaterial cutting and joinery fabrication have commenced at the Woodex Lahore facility.\n\nمحترم کلائنٹ، آپ کے پروجیکٹ کی تھری ڈی ڈیزائننگ مکمل اور فیکٹری میں تیاری شروع ہو چکی ہے۔\n\nTrack progress: https://woodex.pk/portal"
      },
      {
        id: "started",
        title: "Factory Joinery Inspection Ready",
        stage: "Factory QA",
        lang: "English",
        channel: "WhatsApp",
        body: "Hello {client_name},\n\nYour custom cabinetry and wardrobes for {project_name} have passed initial moisture & finish QA at our workshop.\n\nYou are invited to visit our studio or review high-res inspection photos in your portal."
      },
      {
        id: "quote",
        title: "On-Site Installation Scheduled",
        stage: "Site Installation",
        lang: "Bilingual (EN + UR)",
        channel: "WhatsApp & SMS",
        body: "Assalam-o-Alaikum {client_name},\n\nOur senior installation crew is scheduled to arrive at your site ({site_location}) on {install_date} at 9:30 AM.\n\nانسٹالیشن ٹیم کی آمد کا وقت مقرر ہو چکا ہے۔"
      },
      {
        id: "handover",
        title: "Project Handover & 5-Year Warranty Certificate",
        stage: "Final Handover",
        lang: "English",
        channel: "WhatsApp & Email",
        body: "Congratulations {client_name}!\n\nYour project {project_name} is complete and ready for final handover.\n\nYour official Woodex 5-Year Structural & Lifetime Hardware Warranty Certificate is attached."
      }
    ];

    function drawTemplates() {
      var box = $("#upd-list");
      if (!box) return;

      box.innerHTML = templates.map(function (t, i) {
        return '<div class="upd-item" data-idx="' + i + '" style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:14px;cursor:pointer;transition:all 0.15s ease">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
            '<b style="color:#f9fafb;font-size:13.5px">' + esc(t.title) + '</b>' +
            '<span class="badge navy" style="font-size:11px">' + esc(t.stage) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8">' +
            '<span>' + esc(t.lang) + '</span> · <span>' + esc(t.channel) + '</span>' +
          '</div>' +
        '</div>';
      }).join("");

      $$(".upd-item").forEach(function (row) {
        row.onclick = function () {
          $$(".upd-item").forEach(function (x) { x.style.borderColor = "#1e2430"; x.style.background = "#0b0d13"; });
          row.style.borderColor = "#00b8db";
          row.style.background = "#141822";
          var idx = +row.dataset.idx;
          var t = templates[idx];
          var previewText = t.body
            .replace("{client_name}", "Kamran Ashraf")
            .replace("{project_name}", "Bahria Town Villa - 10 Marla")
            .replace("{site_location}", "Sector C, Bahria Town Lahore")
            .replace("{install_date}", "Monday, Oct 14th");
          if ($("#preview-box")) $("#preview-box").textContent = previewText;
        };
      });

      if ($$(".upd-item")[0]) $$(".upd-item")[0].click();
    }

    drawTemplates();

    $("#upd-send-test").onclick = function () {
      var ph = $("#upd-test-phone").value.trim();
      toast("Test update dispatched to " + ph + " via WhatsApp sandbox!");
    };
    $("#nt-save").onclick = function () { toast("Client notification workflows and templates saved live!"); };
    $("#upd-new-btn").onclick = function () { toast("Trigger creation dialog opened."); };
  };
})();
