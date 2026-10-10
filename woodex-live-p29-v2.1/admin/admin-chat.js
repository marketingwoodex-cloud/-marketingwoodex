/* Woodex Admin — Conversations & Live Chat Inbox (Preline Pro Ocean Architecture)
   Theme-adaptive split chat, channel filters (Website/WhatsApp), AI suggestions, and lead quick-converter */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.chat = function (el) {
    el.innerHTML = head("Conversations & Inbox", "Inbox",
      '<button class="btn" id="ch-canned-btn">' + ic("file-text") + 'Canned replies</button>' +
      '<button class="btn" id="ch-ai-btn">' + ic("sparkles") + 'AI Settings</button>' +
      '<a class="btn pri btn-preline-cyan" href="#/enquiries">' + ic("inbox") + 'View CRM Leads</a>') +

      '<div class="chat-shell card">' +
        '<!-- Left Pane: Conversations List -->' +
        '<div class="chat-left-pane">' +
          '<div class="chat-search-wrap">' +
            '<input type="search" id="chat-q" placeholder="Search conversations…" style="margin:0;width:100%">' +
            '<div class="seg" style="margin-top:10px;width:100%">' +
              '<button class="on" data-chan="all" style="flex:1">All (4)</button>' +
              '<button data-chan="wa" style="flex:1">WhatsApp (2)</button>' +
              '<button data-chan="web" style="flex:1">Website (2)</button>' +
            '</div>' +
          '</div>' +
          '<div id="chat-threads" class="chat-thread-list"></div>' +
        '</div>' +

        '<!-- Middle Pane: Active Conversation -->' +
        '<div class="chat-center-pane">' +
          '<div class="chat-header-bar">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<span class="preline-avatar" id="active-av">KA</span>' +
              '<div>' +
                '<b id="active-name" style="font-size:15px;display:block;color:var(--txt)">Kamran Ashraf</b>' +
                '<small style="color:#10b981;font-size:11.5px;font-weight:600">● Online via Website Chat</small>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<button class="btn sm" id="chat-takeover">' + ic("user") + 'Take over from AI</button>' +
              '<a class="btn sm wa" target="_blank" rel="noopener" id="chat-wa-btn" href="https://wa.me/923004455667">' + ic("message-circle") + 'Open WhatsApp</a>' +
            '</div>' +
          '</div>' +

          '<!-- Message History -->' +
          '<div id="chat-history" class="chat-history-box"></div>' +

          '<!-- Quick AI Suggestion Chips -->' +
          '<div class="chat-suggestions-bar">' +
            '<small style="color:var(--pri);font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap">' + ic("sparkles") + 'AI Suggestions:</small>' +
            '<button class="btn sm" data-chip="1" style="font-size:11.5px;white-space:nowrap">"Schedule 3D Design Session"</button>' +
            '<button class="btn sm" data-chip="2" style="font-size:11.5px;white-space:nowrap">"Send Modular Kitchen Catalog"</button>' +
            '<button class="btn sm" data-chip="3" style="font-size:11.5px;white-space:nowrap">"Confirm Site Measurement"</button>' +
          '</div>' +

          '<!-- Message Composer -->' +
          '<div class="chat-composer-bar">' +
            '<textarea id="chat-input" rows="2" placeholder="Type a response (press Enter to send, Shift+Enter for newline)…" style="flex:1;margin:0;resize:none;font-size:13px"></textarea>' +
            '<button class="btn pri btn-preline-cyan" id="chat-send-btn" style="height:44px;padding:0 18px">' + ic("send") + 'Send</button>' +
          '</div>' +
        '</div>' +

        '<!-- Right Pane: Customer Lead Profile -->' +
        '<div class="chat-right-drawer">' +
          '<b style="font-size:14px;color:var(--txt);border-bottom:1px solid var(--line);padding-bottom:8px">Customer Lead 360</b>' +
          '<div style="display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:var(--txt2)">' +
            '<div><small class="muted" style="display:block">Full Name</small><b id="p-name" style="color:var(--txt)">Kamran Ashraf</b></div>' +
            '<div><small class="muted" style="display:block">Company</small><span id="p-co">Ashraf Holdings</span></div>' +
            '<div><small class="muted" style="display:block">Phone</small><span id="p-ph">+92 300 4455667</span></div>' +
            '<div><small class="muted" style="display:block">Location</small><span id="p-loc">Bahria Town Sector C, Lahore</span></div>' +
            '<div><small class="muted" style="display:block">Service Brief</small><span id="p-srv">Turnkey Design-Build · 10 Marla</span></div>' +
            '<div><small class="muted" style="display:block">Estimated Budget</small><b id="p-val" style="color:var(--pri)">PKR 12,000,000</b></div>' +
          '</div>' +
          '<div style="border-top:1px solid var(--line);padding-top:14px;display:flex;flex-direction:column;gap:8px;margin-top:auto">' +
            '<a class="btn pri btn-preline-cyan" href="#/enquiries" style="font-size:12px">' + ic("inbox") + 'Open Full CRM Record</a>' +
            '<a class="btn sm" href="#/quote/new" style="font-size:12px">' + ic("receipt") + 'Create Quotation</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    W.fillIcons(el);

    var threads = [
      { id: 1, name: "Kamran Ashraf", co: "Ashraf Holdings", channel: "web", snippet: "Interested in turnkey construction and luxury interior for 10 Marla residence.", time: "2m ago", unread: true, phone: "+92 300 4455667", location: "Bahria Town Sector C, Lahore", service: "Turnkey Design-Build", value: "PKR 12,000,000" },
      { id: 2, name: "Dr. Sarah Mansoor", co: "Apex Wellness", channel: "wa", snippet: "Renovating a 3,000 sq ft dental clinic & wellness center.", time: "18m ago", unread: false, phone: "+92 321 5551234", location: "DHA Phase 5, Lahore", service: "Clinic Fit-Out", value: "PKR 6,500,000" },
      { id: 3, name: "Tariq Mahmood", co: "Mahmood Textiles", channel: "web", snippet: "Complete solid wood executive boardroom table & acoustic panelling.", time: "1h ago", unread: false, phone: "+92 333 4889900", location: "Gulberg III, Lahore", service: "Corporate Boardroom", value: "PKR 4,800,000" },
      { id: 4, name: "Ayesha Farooq", co: "Lake City Villa", channel: "wa", snippet: "Custom island with Blum soft-close fittings and Spanish quartz.", time: "3h ago", unread: false, phone: "+92 312 9876543", location: "Lake City, Lahore", service: "Acrylic Kitchen Island", value: "PKR 2,950,000" }
    ];

    var activeThread = threads[0];

    function drawThreads() {
      var box = $("#chat-threads");
      if (!box) return;

      box.innerHTML = threads.map(function (t) {
        var ini = t.name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();
        var isAct = t.id === activeThread.id;
        var chanBadge = t.channel === "wa" ? '<span class="badge ok" style="font-size:10px">WhatsApp</span>' : '<span class="badge info" style="font-size:10px">Website</span>';

        return '<div class="chat-thread-item' + (isAct ? ' active' : '') + '" data-id="' + t.id + '">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="preline-avatar" style="width:34px;height:34px;font-size:12px">' + esc(ini) + '</span>' +
              '<div>' +
                '<b style="font-size:13.5px;color:var(--txt);display:block">' + esc(t.name) + '</b>' +
                '<small style="color:var(--mut);font-size:11px">' + esc(t.co) + '</small>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">' +
              '<small style="color:var(--mut2);font-size:10.5px">' + esc(t.time) + '</small>' +
              chanBadge +
            '</div>' +
          '</div>' +
          '<p style="font-size:12px;color:' + (t.unread ? 'var(--txt)' : 'var(--mut)') + ';font-weight:' + (t.unread ? '600' : '400') + ';margin:6px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.snippet) + '</p>' +
        '</div>';
      }).join("");

      $$('#chat-threads .chat-thread-item').forEach(function (row) {
        row.onclick = function () {
          var tid = +row.dataset.id;
          activeThread = threads.find(function (t) { return t.id === tid; }) || threads[0];
          drawThreads();
          renderActiveChat();
        };
      });
    }

    function renderActiveChat() {
      var t = activeThread;
      var ini = t.name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();

      if ($("#active-av")) $("#active-av").textContent = ini;
      if ($("#active-name")) $("#active-name").textContent = t.name;
      if ($("#chat-wa-btn")) $("#chat-wa-btn").href = "https://wa.me/" + t.phone.replace(/\D/g, "");

      if ($("#p-name")) $("#p-name").textContent = t.name;
      if ($("#p-co")) $("#p-co").textContent = t.co;
      if ($("#p-ph")) $("#p-ph").textContent = t.phone;
      if ($("#p-loc")) $("#p-loc").textContent = t.location;
      if ($("#p-srv")) $("#p-srv").textContent = t.service;
      if ($("#p-val")) $("#p-val").textContent = t.value;

      var msgs = [
        { from: "user", text: t.snippet, time: "10:14 AM" },
        { from: "ai", text: "Assalam-o-Alaikum " + t.name + "! Thank you for contacting Woodex Interior Studio. We have received your project details for " + t.service + " in " + t.location + ". Our lead architectural consultant will connect with you shortly.", time: "10:14 AM" }
      ];

      var box = $("#chat-history");
      if (!box) return;

      box.innerHTML = msgs.map(function (m) {
        var isU = m.from === "user";
        return '<div style="display:flex;flex-direction:column;align-items:' + (isU ? 'flex-start' : 'flex-end') + ';max-width:80%;align-self:' + (isU ? 'flex-start' : 'flex-end') + '">' +
          '<div class="' + (isU ? 'chat-msg-user' : 'chat-msg-ai') + '">' +
            esc(m.text) +
          '</div>' +
          '<small style="color:var(--mut);font-size:10.5px;margin-top:3px">' + esc(m.time) + ' · ' + (isU ? 'Customer' : 'AI Assistant') + '</small>' +
        '</div>';
      }).join("");

      box.scrollTop = box.scrollHeight;
    }

    drawThreads();
    renderActiveChat();

    // Send handler
    var sendBtn = $("#chat-send-btn");
    var inp = $("#chat-input");
    if (sendBtn && inp) {
      var send = function () {
        var txt = inp.value.trim();
        if (!txt) return;
        var box = $("#chat-history");
        var bubble = document.createElement("div");
        bubble.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;max-width:80%;align-self:flex-end";
        bubble.innerHTML = '<div class="chat-msg-ai">' + esc(txt) + '</div><small style="color:var(--mut);font-size:10.5px;margin-top:3px">Just now · Agent</small>';
        box.appendChild(bubble);
        inp.value = "";
        box.scrollTop = box.scrollHeight;
        toast("Message sent to " + activeThread.name);
      };
      sendBtn.onclick = send;
      inp.onkeydown = function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      };
    }

    // AI suggestion chips
    $$('[data-chip]').forEach(function (b) {
      b.onclick = function () {
        var txt = b.textContent.replace(/^"|"$/g, "");
        if ($("#chat-input")) $("#chat-input").value = txt;
      };
    });

    if ($("#chat-takeover")) {
      $("#chat-takeover").onclick = function () {
        toast("You have taken over this conversation. AI responses paused for this chat.");
      };
    }
  };
  W.VIEWS.inbox = W.VIEWS.chat;
})();

    W.fillIcons(el);

    var threads = [
      { id: 1, name: "Kamran Ashraf", co: "Ashraf Holdings", channel: "web", snippet: "Interested in turnkey construction and luxury interior for 10 Marla residence.", time: "2m ago", unread: true, phone: "+92 300 4455667", location: "Bahria Town Sector C, Lahore", service: "Turnkey Design-Build", value: "PKR 12,000,000" },
      { id: 2, name: "Dr. Sarah Mansoor", co: "Apex Wellness", channel: "wa", snippet: "Renovating a 3,000 sq ft dental clinic & wellness center.", time: "18m ago", unread: false, phone: "+92 321 5551234", location: "DHA Phase 5, Lahore", service: "Clinic Fit-Out", value: "PKR 6,500,000" },
      { id: 3, name: "Tariq Mahmood", co: "Mahmood Textiles", channel: "web", snippet: "Complete solid wood executive boardroom table & acoustic panelling.", time: "1h ago", unread: false, phone: "+92 333 4889900", location: "Gulberg III, Lahore", service: "Corporate Boardroom", value: "PKR 4,800,000" },
      { id: 4, name: "Ayesha Farooq", co: "Lake City Villa", channel: "wa", snippet: "Custom island with Blum soft-close fittings and Spanish quartz.", time: "3h ago", unread: false, phone: "+92 312 9876543", location: "Lake City, Lahore", service: "Acrylic Kitchen Island", value: "PKR 2,950,000" }
    ];

    var activeThread = threads[0];

    function drawThreads() {
      var box = $("#chat-threads");
      if (!box) return;

      box.innerHTML = threads.map(function (t) {
        var ini = t.name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();
        var isAct = t.id === activeThread.id;
        var chanBadge = t.channel === "wa" ? '<span class="badge" style="background:#052e16;color:#4ade80;font-size:10px">WhatsApp</span>' : '<span class="badge" style="background:#082f49;color:#38bdf8;font-size:10px">Website</span>';

        return '<div class="chat-thread-item" data-id="' + t.id + '" style="padding:14px 16px;border-bottom:1px solid #1a1e27;cursor:pointer;background:' + (isAct ? '#181c24' : 'transparent') + ';border-left:3px solid ' + (isAct ? '#00b8db' : 'transparent') + ';transition:all 0.15s ease">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="preline-avatar" style="width:34px;height:34px;font-size:12px;background:#1e293b;color:#00d3f2">' + esc(ini) + '</span>' +
              '<div>' +
                '<b style="font-size:13.5px;color:#f9fafb;display:block">' + esc(t.name) + '</b>' +
                '<small style="color:#94a3b8;font-size:11px">' + esc(t.co) + '</small>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">' +
              '<small style="color:#64748b;font-size:10.5px">' + esc(t.time) + '</small>' +
              chanBadge +
            '</div>' +
          '</div>' +
          '<p style="font-size:12px;color:' + (t.unread ? '#f1f5f9' : '#8e95a5') + ';font-weight:' + (t.unread ? '600' : '400') + ';margin:6px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.snippet) + '</p>' +
        '</div>';
      }).join("");

      $$('#chat-threads .chat-thread-item').forEach(function (row) {
        row.onclick = function () {
          var tid = +row.dataset.id;
          activeThread = threads.find(function (t) { return t.id === tid; }) || threads[0];
          drawThreads();
          renderActiveChat();
        };
      });
    }

    function renderActiveChat() {
      var t = activeThread;
      var ini = t.name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();

      if ($("#active-av")) $("#active-av").textContent = ini;
      if ($("#active-name")) $("#active-name").textContent = t.name;
      if ($("#chat-wa-btn")) $("#chat-wa-btn").href = "https://wa.me/" + t.phone.replace(/\D/g, "");

      if ($("#p-name")) $("#p-name").textContent = t.name;
      if ($("#p-co")) $("#p-co").textContent = t.co;
      if ($("#p-ph")) $("#p-ph").textContent = t.phone;
      if ($("#p-loc")) $("#p-loc").textContent = t.location;
      if ($("#p-srv")) $("#p-srv").textContent = t.service;
      if ($("#p-val")) $("#p-val").textContent = t.value;

      var msgs = [
        { from: "user", text: t.snippet, time: "10:14 AM" },
        { from: "ai", text: "Assalam-o-Alaikum " + t.name + "! Thank you for contacting Woodex Interior Studio. We have received your project details for " + t.service + " in " + t.location + ". Our lead architectural consultant will connect with you shortly.", time: "10:14 AM" }
      ];

      var box = $("#chat-history");
      if (!box) return;

      box.innerHTML = msgs.map(function (m) {
        var isU = m.from === "user";
        return '<div style="display:flex;flex-direction:column;align-items:' + (isU ? 'flex-start' : 'flex-end') + ';max-width:80%;align-self:' + (isU ? 'flex-start' : 'flex-end') + '">' +
          '<div style="background:' + (isU ? '#1c2333' : '#00b8db') + ';color:' + (isU ? '#f9fafb' : '#04222b') + ';padding:10px 14px;border-radius:12px;font-size:13.5px;line-height:1.45;border:' + (isU ? '1px solid rgba(255,255,255,0.08)' : '0') + ';font-weight:' + (isU ? '400' : '500') + '">' +
            esc(m.text) +
          '</div>' +
          '<small style="color:#64748b;font-size:10.5px;margin-top:3px">' + esc(m.time) + ' · ' + (isU ? 'Customer' : 'AI Assistant') + '</small>' +
        '</div>';
      }).join("");

      box.scrollTop = box.scrollHeight;
    }

    drawThreads();
    renderActiveChat();

    // Send handler
    var sendBtn = $("#chat-send-btn");
    var inp = $("#chat-input");
    if (sendBtn && inp) {
      var send = function () {
        var txt = inp.value.trim();
        if (!txt) return;
        var box = $("#chat-history");
        var bubble = document.createElement("div");
        bubble.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;max-width:80%;align-self:flex-end";
        bubble.innerHTML = '<div style="background:#00b8db;color:#04222b;padding:10px 14px;border-radius:12px;font-size:13.5px;line-height:1.45;font-weight:500">' + esc(txt) + '</div><small style="color:#64748b;font-size:10.5px;margin-top:3px">Just now · Agent</small>';
        box.appendChild(bubble);
        inp.value = "";
        box.scrollTop = box.scrollHeight;
        toast("Message sent to " + activeThread.name);
      };
      sendBtn.onclick = send;
      inp.onkeydown = function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      };
    }

    // AI suggestion chips
    $$('[data-chip]').forEach(function (b) {
      b.onclick = function () {
        var txt = b.textContent.replace(/^"|"$/g, "");
        if ($("#chat-input")) $("#chat-input").value = txt;
      };
    });

    if ($("#chat-takeover")) {
      $("#chat-takeover").onclick = function () {
        toast("You have taken over this conversation. AI responses paused for this chat.");
      };
    }
  };
  W.VIEWS.inbox = W.VIEWS.chat;
})();
