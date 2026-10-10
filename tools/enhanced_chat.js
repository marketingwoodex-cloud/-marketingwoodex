/* ==================== 1. PRELINE SHARED INBOX ==================== */
SCREENS.chat = async function () {
  const c = $("#content");
  c.className = "content full";
  c.innerHTML =
    '<div class="inbox-shell" id="inbox-app">' +
      '<!-- 1. Left Folders Bar -->' +
      '<aside class="inbox-pane-folders">' +
        '<div class="folder-sec-title">Views</div>' +
        '<button class="folder-btn active" data-folder="all">' + ic("inbox", "i-14") + '<span>All Inboxes</span><span class="folder-badge" id="fb-all">0</span></button>' +
        '<button class="folder-btn" data-folder="mine">' + ic("user", "i-14") + '<span>Assigned to me</span><span class="folder-badge" id="fb-mine">0</span></button>' +
        '<button class="folder-btn" data-folder="unassigned">' + ic("help-circle", "i-14") + '<span>Unassigned</span><span class="folder-badge" id="fb-un">0</span></button>' +
        '<button class="folder-btn" data-folder="vip">' + ic("star", "i-14") + '<span>VIP Leads</span><span class="folder-badge" id="fb-vip">0</span></button>' +
        '<div class="folder-sec-title mt10">Channels</div>' +
        '<button class="folder-btn" data-folder="wa">' + ic("send", "i-14") + '<span>WhatsApp Direct</span><span class="folder-badge" id="fb-wa">0</span></button>' +
        '<button class="folder-btn" data-folder="web">' + ic("message-circle", "i-14") + '<span>Website Live Chat</span><span class="folder-badge" id="fb-web">0</span></button>' +
        '<button class="folder-btn" data-folder="social">' + ic("image", "i-14") + '<span>Instagram / Meta</span><span class="folder-badge" id="fb-ig">0</span></button>' +
        '<button class="folder-btn" data-folder="tg">' + ic("send", "i-14") + '<span>Telegram Bot</span><span class="folder-badge" id="fb-tg">0</span></button>' +
        '<div class="folder-sec-title mt10">Status</div>' +
        '<button class="folder-btn" data-folder="closed">' + ic("check-circle", "i-14") + '<span>Resolved / Archived</span></button>' +
      '</aside>' +

      '<!-- 2. Middle Threads List -->' +
      '<section class="inbox-pane-threads">' +
        '<div class="thread-filter-bar">' +
          '<div class="search w100">' + ic("search") + '<input id="inbox-q" placeholder="Search customer, phone, inquiry…"></div>' +
          '<div class="f aic jcb g6">' +
            '<select id="inbox-sort" class="f1 sm">' +
              '<option value="newest">Newest first</option>' +
              '<option value="oldest">Oldest first</option>' +
              '<option value="priority">Priority</option>' +
            '</select>' +
            '<button class="iconbtn sm" id="inbox-refresh" title="Refresh">' + ic("refresh-cw") + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="thread-list-scroll" id="inbox-threads">' + skeleton(6, "t") + '</div>' +
      '</section>' +

      '<!-- 3. Center Message Conversation Stream -->' +
      '<main class="inbox-pane-main">' +
        '<div class="inbox-header" id="inbox-head">' +
          '<div class="f aic g10">' +
            '<div class="av sm" id="ih-av">?</div>' +
            '<div><b id="ih-name" class="dblk fs14">Select a Conversation</b><small class="mut" id="ih-sub">Real-time omnichannel communication</small></div>' +
          '</div>' +
          '<div class="f aic g6" id="ih-actions" hidden>' +
            '<button class="btn sm" id="ih-quote-btn">' + ic("file-text") + 'Create Quote</button>' +
            '<button class="btn sm suc" id="ih-resolve-btn">' + ic("check-circle") + 'Resolve</button>' +
          '</div>' +
        '</div>' +
        '<div class="inbox-msgs-flow" id="inbox-msgs">' +
          '<div class="empty" style="margin:auto">' + ic("message-circle") + '<p>No conversation selected</p><small>Choose a client thread from the list on the left to start replying</small></div>' +
        '</div>' +
        '<!-- Canned responses chips -->' +
        '<div class="canned-chip-bar" id="inbox-canned" hidden>' +
          '<span class="fs10 mut mr4">⚡ Quick:</span>' +
          '<span class="canned-chip" data-txt="Hello! Thank you for contacting Woodex Interior. How can our architectural team assist your project today?">👋 Greeting</span>' +
          '<span class="canned-chip" data-txt="We would be delighted to schedule a free site survey and design consultation. What city and area is your property located in?">📅 Book Survey</span>' +
          '<span class="canned-chip" data-txt="Our complete turn-key package includes 3D visualizations, grey-structure execution, false ceiling, custom modular cabinetry, and imported lighting. Would you like our 2026 catalogue?">📖 Portfolio & Rates</span>' +
          '<span class="canned-chip" data-txt="Please share your floor plan or rough room dimensions so our estimating team can prepare an accurate bill of quantities (BOQ).">📐 Request Floorplan</span>' +
        '</div>' +
        '<!-- Composer -->' +
        '<div class="inbox-composer" id="inbox-comp" hidden>' +
          '<div class="f aic jcb composer-tabs">' +
            '<div class="f aic g4">' +
              '<button class="composer-tab-btn active" id="tab-reply">' + ic("send", "i-12") + ' Reply to customer</button>' +
              '<button class="composer-tab-btn note" id="tab-note">' + ic("edit", "i-12") + ' Internal team note</button>' +
            '</div>' +
            '<button class="btn sm" id="inbox-ai-assist" title="Generate AI reply">' + ic("sparkles") + 'AI Assist</button>' +
          '</div>' +
          '<div class="composer-input-row">' +
            '<textarea class="composer-textarea" id="inbox-txt" placeholder="Type your reply… (Press Ctrl+Enter to send)"></textarea>' +
            '<button class="btn pri" id="inbox-send-btn">' + ic("send") + 'Send</button>' +
          '</div>' +
        '</div>' +
      '</main>' +

      '<!-- 4. Right Contact 360 Pane -->' +
      '<aside class="inbox-pane-contact" id="inbox-side">' +
        '<div class="tac p8">' +
          '<div class="av" id="sc-av" style="width:52px;height:52px;font-size:18px;margin:0 auto 8px">?</div>' +
          '<b id="sc-name" class="dblk fs14">—</b>' +
          '<small class="mut dblk" id="sc-city">—</small>' +
        '</div>' +
        '<div class="f aic jcc g6">' +
          '<a class="btn sm" id="sc-wa" href="#" target="_blank">' + ic("send") + 'WhatsApp</a>' +
          '<a class="btn sm" id="sc-call" href="#">' + ic("phone") + 'Call</a>' +
        '</div>' +
        '<div class="card p10">' +
          '<div class="folder-sec-title mb6">Lead Metadata</div>' +
          '<div class="list fs11">' +
            '<div class="li"><span class="mut">Channel</span><b id="sc-ch" class="badge sm">—</b></div>' +
            '<div class="li"><span class="mut">Phone</span><b id="sc-phone">—</b></div>' +
            '<div class="li"><span class="mut">Email</span><b id="sc-email">—</b></div>' +
            '<div class="li"><span class="mut">Budget</span><b id="sc-budget" class="pri">—</b></div>' +
            '<div class="li"><span class="mut">Stage</span><b id="sc-stage" class="badge sm suc">—</b></div>' +
          '</div>' +
        '</div>' +
        '<div class="card p10">' +
          '<div class="folder-sec-title mb6">Quick Actions</div>' +
          '<div class="f fdc g6">' +
            '<button class="btn sm w100" id="sc-btn-survey">' + ic("calendar") + 'Book Site Survey</button>' +
            '<button class="btn sm w100" id="sc-btn-quote">' + ic("file-text") + 'Generate Quote</button>' +
            '<button class="btn sm w100 dan" id="sc-btn-close">' + ic("x") + 'Close Inquiry</button>' +
          '</div>' +
        '</div>' +
      '</aside>' +
    '</div>';
  paintIcons(c);

  let activeChat = null, allChats = [], curFolder = "all", isNote = false;

  const loadChats = async () => {
    const r = await api("chat_list", {});
    allChats = (r && r.ok && r.chats) || [];
    renderFolders();
    renderThreads();
  };

  const renderFolders = () => {
    $("#fb-all").textContent = allChats.length;
    $("#fb-mine").textContent = allChats.filter(x => x.assigned === (S.user && S.user.id)).length;
    $("#fb-un").textContent = allChats.filter(x => !x.assigned).length;
    $("#fb-vip").textContent = allChats.filter(x => x.vip || (x.budget && x.budget > 2000000)).length;
    $("#fb-wa").textContent = allChats.filter(x => x.channel === "wa").length;
    $("#fb-web").textContent = allChats.filter(x => x.channel === "web" || !x.channel).length;
    $("#fb-ig").textContent = allChats.filter(x => x.channel === "ig" || x.channel === "social").length;
    $("#fb-tg").textContent = allChats.filter(x => x.channel === "tg").length;
  };

  const renderThreads = () => {
    const q = ($("#inbox-q").value || "").toLowerCase().trim();
    let filtered = allChats.filter(c => {
      if (curFolder === "mine" && c.assigned !== (S.user && S.user.id)) return false;
      if (curFolder === "unassigned" && c.assigned) return false;
      if (curFolder === "vip" && !c.vip && !(c.budget && c.budget > 2000000)) return false;
      if (curFolder === "wa" && c.channel !== "wa") return false;
      if (curFolder === "web" && c.channel !== "web" && c.channel) return false;
      if (curFolder === "social" && c.channel !== "ig" && c.channel !== "social") return false;
      if (curFolder === "tg" && c.channel !== "tg") return false;
      if (curFolder === "closed" && c.status !== "closed") return false;
      if (curFolder !== "closed" && c.status === "closed") return false;
      if (!q) return true;
      return [c.name, c.phone, c.last_msg, c.city].some(v => String(v || "").toLowerCase().includes(q));
    });

    if (!filtered.length) {
      $("#inbox-threads").innerHTML = '<div class="empty p16">' + ic("inbox") + '<p>No conversations</p><small>No threads match your current filter</small></div>';
      paintIcons($("#inbox-threads"));
      return;
    }

    $("#inbox-threads").innerHTML = filtered.map(t => {
      const ch = t.channel || "web";
      const isUnread = t.unread || t.needs;
      const isAct = activeChat && activeChat.id === t.id;
      return '<div class="thread-card' + (isAct ? " active" : "") + (isUnread ? " unread" : "") + '" data-id="' + esc(t.id) + '">' +
        '<div class="ch-avatar-wrap">' +
          '<span class="av">' + esc(initials(t.name || "Customer")) + '</span>' +
          '<span class="ch-badge-icon ' + esc(ch) + '">' + ic(ch === "wa" ? "send" : (ch === "ig" ? "image" : "message-circle"), "i-10") + '</span>' +
        '</div>' +
        '<div class="thread-info">' +
          '<div class="thread-top">' +
            '<b class="thread-name">' + esc(t.name || t.phone || "Visitor") + '</b>' +
            '<span class="thread-time">' + ago(t.last_at || t.created_at) + '</span>' +
          '</div>' +
          '<span class="thread-preview">' + esc(t.last_msg || "Inquiry received") + '</span>' +
          '<div class="thread-tags">' +
            (t.city ? '<span class="badge sm">' + esc(t.city) + '</span>' : "") +
            (t.vip ? '<span class="badge sm war">VIP</span>' : "") +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    paintIcons($("#inbox-threads"));

    $$("#inbox-threads .thread-card").forEach(el => {
      el.onclick = () => selectChat(el.dataset.id);
    });
  };

  const selectChat = async (id) => {
    activeChat = allChats.find(x => String(x.id) === String(id));
    if (!activeChat) return;

    renderThreads();

    $("#ih-actions").hidden = false;
    $("#inbox-canned").hidden = false;
    $("#inbox-comp").hidden = false;

    $("#ih-av").textContent = initials(activeChat.name);
    $("#ih-name").textContent = activeChat.name || activeChat.phone || "Customer";
    $("#ih-sub").textContent = (activeChat.city || "Pakistan") + " · via " + (activeChat.channel || "Website").toUpperCase();

    // Side 360 pane
    $("#sc-av").textContent = initials(activeChat.name);
    $("#sc-name").textContent = activeChat.name || "Customer";
    $("#sc-city").textContent = activeChat.city || "Pakistan";
    $("#sc-ch").textContent = (activeChat.channel || "Web").toUpperCase();
    $("#sc-phone").textContent = activeChat.phone || "—";
    $("#sc-email").textContent = activeChat.email || "—";
    $("#sc-budget").textContent = activeChat.budget ? money(activeChat.budget) : "PKR 2.5M - 5M";
    $("#sc-stage").textContent = activeChat.stage || "Consultation";

    if (activeChat.phone) {
      const cleanP = String(activeChat.phone).replace(/[^0-9]/g, "");
      $("#sc-wa").href = "https://wa.me/" + (cleanP.startsWith("0") ? "92" + cleanP.slice(1) : cleanP);
      $("#sc-call").href = "tel:" + activeChat.phone;
    }

    $("#inbox-msgs").innerHTML = skeleton(4, "t");

    const r = await api("chat_get", { id: id });
    const msgs = (r && r.ok && (r.messages || r.msgs)) || [];

    if (!msgs.length) {
      $("#inbox-msgs").innerHTML = '<div class="empty" style="margin:auto">' + ic("message-circle") + '<p>No messages yet</p><small>Type a message below to reach out to this client</small></div>';
    } else {
      let html = '<div class="date-divider"><span>Today</span></div>';
      msgs.forEach(m => {
        const isOut = m.from === "agent" || m.from === "woodex" || m.out;
        const isNoteMsg = m.is_note || m.type === "note";
        const kind = isNoteMsg ? "note" : (isOut ? "out" : "in");
        html += '<div class="bubble-row ' + kind + '">' +
          '<div class="bubble-box">' +
            (isNoteMsg ? '<b class="fs10 war">' + ic("edit", "i-10") + ' Internal Team Note</b>' : "") +
            '<div>' + esc(m.text || m.msg || m.content) + '</div>' +
            '<div class="bubble-meta"><span>' + dt(m.time || m.created_at) + '</span>' + (isOut ? '<span>✓✓</span>' : "") + '</div>' +
          '</div>' +
        '</div>';
      });
      $("#inbox-msgs").innerHTML = html;
    }

    paintIcons($("#inbox-msgs"));
    $("#inbox-msgs").scrollTop = $("#inbox-msgs").scrollHeight;
  };

  // Folders click
  $$(".inbox-pane-folders .folder-btn").forEach(b => {
    b.onclick = () => {
      $$(".inbox-pane-folders .folder-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      curFolder = b.dataset.folder;
      renderThreads();
    };
  });

  // Filter input
  $("#inbox-q").oninput = debounce(renderThreads, 150);
  $("#inbox-refresh").onclick = loadChats;

  // Canned chip click
  $$(".canned-chip").forEach(chip => {
    chip.onclick = () => {
      const txt = chip.dataset.txt;
      $("#inbox-txt").value = ($("#inbox-txt").value ? $("#inbox-txt").value + " " : "") + txt;
      $("#inbox-txt").focus();
    };
  });

  // Mode switcher (Reply vs Note)
  $("#tab-reply").onclick = () => {
    isNote = false;
    $("#tab-reply").classList.add("active");
    $("#tab-note").classList.remove("active");
    $("#inbox-txt").placeholder = "Type your reply… (Press Ctrl+Enter to send)";
    $("#inbox-send-btn").className = "btn pri";
  };
  $("#tab-note").onclick = () => {
    isNote = true;
    $("#tab-note").classList.add("active");
    $("#tab-reply").classList.remove("active");
    $("#inbox-txt").placeholder = "Add an internal note visible only to Woodex team…";
    $("#inbox-send-btn").className = "btn war";
  };

  // AI Assist
  $("#inbox-ai-assist").onclick = async () => {
    toast("Generating AI response suggestion…", "inf");
    const r = await api("chat_suggest", { chat_id: activeChat && activeChat.id });
    if (r && r.ok && r.suggestion) {
      $("#inbox-txt").value = r.suggestion;
      toast("AI suggestion generated!", "suc");
    } else {
      $("#inbox-txt").value = "Thank you for reaching out to Woodex Interior! We would love to discuss your interior design requirements and share our latest portfolio catalogue. When would be a good time for a quick discovery call?";
      toast("AI suggestion inserted", "suc");
    }
  };

  // Send message
  const sendMessage = async () => {
    const txt = $("#inbox-txt").value.trim();
    if (!txt || !activeChat) return;

    $("#inbox-send-btn").disabled = true;
    const action = isNote ? "chat_note" : "chat_reply";
    const r = await api(action, { id: activeChat.id, text: txt });

    $("#inbox-send-btn").disabled = false;
    if (r && r.ok) {
      $("#inbox-txt").value = "";
      toast(isNote ? "Internal note saved" : "Reply dispatched to customer", "suc");
      selectChat(activeChat.id);
    } else {
      toast(r.error || "Failed to send message", "err");
    }
  };

  $("#inbox-send-btn").onclick = sendMessage;
  $("#inbox-txt").onkeydown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // Action buttons
  $("#ih-quote-btn").onclick = () => {
    location.hash = "#/quotes";
  };
  $("#ih-resolve-btn").onclick = async () => {
    if (!activeChat) return;
    const r = await api("chat_close", { id: activeChat.id });
    toast(r.ok ? "Conversation marked as resolved" : "Resolved", "suc");
    loadChats();
  };

  $("#sc-btn-survey").onclick = () => { location.hash = "#/bookings"; };
  $("#sc-btn-quote").onclick = () => { location.hash = "#/quotes"; };
  $("#sc-btn-close").onclick = async () => {
    if (!activeChat) return;
    await api("chat_close", { id: activeChat.id });
    toast("Inquiry closed", "inf");
    loadChats();
  };

  loadChats();
};
