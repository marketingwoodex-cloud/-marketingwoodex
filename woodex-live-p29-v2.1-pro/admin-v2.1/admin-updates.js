/* Woodex Admin — Client Updates & Project Notifications (Preline Pro Ocean Architecture)
   Automated project milestone notifications, bilingual templates (English/Urdu), tokens, and WhatsApp triggers */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.updates = function (el) {
    el.innerHTML = head("Client updates", "Home / Client updates",
      '<button class="btn pri btn-preline-cyan" id="upd-save-btn">' + ic("check") + 'Save</button>') +

      '<!-- 4-Step Lifecycle Progress Banner (From Image 10) -->' +
      '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px;margin-bottom:20px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px">' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<b style="color:#f9fafb;font-size:14px">How client updates work</b>' +
            '<span class="badge warn" style="font-size:11.5px">● WhatsApp connected</span>' +
            '<span class="badge navy" style="font-size:11.5px">● Auto-save leads on</span>' +
            '<span class="badge" style="font-size:11.5px;color:#9ca3af">● Mon-Sat, 9:30 am – 6:30 pm</span>' +
          '</div>' +
          '<button class="icon-btn sm" style="color:#6b7280;font-size:12px">Hide</button>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;position:relative">' +
          '<div style="background:#161922;border:1px solid #232836;border-radius:12px;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
              '<span style="width:28px;height:28px;border-radius:50%;background:#00b8db;color:#04222b;font-weight:800;display:grid;place-items:center;font-size:12px">1</span>' +
              '<b style="font-size:13.5px;color:#f9fafb">Project moves a step</b>' +
            '</div>' +
            '<small class="muted" style="font-size:12px;line-height:1.4;display:block">Enquiry received · Quotation sent · Work started · Handover.</small>' +
          '</div>' +

          '<div style="background:#161922;border:1px solid #232836;border-radius:12px;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
              '<span style="width:28px;height:28px;border-radius:50%;background:#00b8db;color:#04222b;font-weight:800;display:grid;place-items:center;font-size:12px">2</span>' +
              '<b style="font-size:13.5px;color:#f9fafb">Message is chosen</b>' +
            '</div>' +
            '<small class="muted" style="font-size:12px;line-height:1.4;display:block">Your English + Urdu text for that step, with name and project filled in.</small>' +
          '</div>' +

          '<div style="background:#161922;border:1px solid #232836;border-radius:12px;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
              '<span style="width:28px;height:28px;border-radius:50%;background:#00b8db;color:#04222b;font-weight:800;display:grid;place-items:center;font-size:12px">3</span>' +
              '<b style="font-size:13.5px;color:#f9fafb">Sent on 2 channels</b>' +
            '</div>' +
            '<small class="muted" style="font-size:12px;line-height:1.4;display:block">WhatsApp (when connected) and email, once per step, never twice.</small>' +
          '</div>' +

          '<div style="background:#161922;border:1px solid #232836;border-radius:12px;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
              '<span style="width:28px;height:28px;border-radius:50%;background:#00b8db;color:#04222b;font-weight:800;display:grid;place-items:center;font-size:12px">4</span>' +
              '<b style="font-size:13.5px;color:#f9fafb">Saved to timeline</b>' +
            '</div>' +
            '<small class="muted" style="font-size:12px;line-height:1.4;display:block">Shown on the client and project, so everyone knows what the client was told.</small>' +
          '</div>' +
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
        id: "t1",
        title: "3D Design Approved & Production Started",
        stage: "Production Kickoff",
        lang: "Bilingual (EN + UR)",
        channel: "WhatsApp & Email",
        body: "Assalam-o-Alaikum {client_name},\n\nGreat news! Your 3D interior design for {project_name} has been approved by our lead architect.\n\nMaterial cutting and joinery fabrication have commenced at the Woodex Lahore facility.\n\nمحترم کلائنٹ، آپ کے پروجیکٹ کی تھری ڈی ڈیزائننگ مکمل اور فیکٹری میں تیاری شروع ہو چکی ہے۔\n\nTrack progress: https://woodex.pk/portal"
      },
      {
        id: "t2",
        title: "Factory Joinery Inspection Ready",
        stage: "Factory QA",
        lang: "English",
        channel: "WhatsApp",
        body: "Hello {client_name},\n\nYour custom cabinetry and wardrobes for {project_name} have passed initial moisture & finish QA at our workshop.\n\nYou are invited to visit our studio or review high-res inspection photos in your portal."
      },
      {
        id: "t3",
        title: "On-Site Installation Scheduled",
        stage: "Site Installation",
        lang: "Bilingual (EN + UR)",
        channel: "WhatsApp & SMS",
        body: "Assalam-o-Alaikum {client_name},\n\nOur senior installation crew is scheduled to arrive at your site ({site_location}) on {install_date} at 9:30 AM.\n\nانسٹالیشن ٹیم کی آمد کا وقت مقرر ہو چکا ہے۔"
      },
      {
        id: "t4",
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

      // Select first
      if ($$(".upd-item")[0]) $$(".upd-item")[0].click();
    }

    drawTemplates();

    $("#upd-send-test").onclick = function () {
      var ph = $("#upd-test-phone").value.trim();
      toast("Test update dispatched to " + ph + " via WhatsApp sandbox!");
    };
    $("#upd-new-btn").onclick = function () { toast("Template creation wizard opened."); };
    $("#upd-send-btn").onclick = function () { toast("Bulk milestone update broadcasted to 14 active clients."); };
  };
})();
