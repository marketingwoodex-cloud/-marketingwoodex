/* Woodex Admin — Inbox (communication block). Live conversations from chat_list / chat_get / chat_reply.
   Three panes: conversations (box + channel filters, search), the active chat, and lead details.
   Routes: #/chat and #/chat/<id> (the pop-up dock links to #/chat/<id>). New visitor messages that arrive
   while this view is open are marked "New". Polls the list every 15 s and the open chat every 3 s;
   timers stop when the view leaves the DOM. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, head = W.head;
  var CH = { web: "Website", wa: "WhatsApp", tg: "Telegram" };
  var BOX = [["all", "All"], ["mine", "Mine"], ["unassigned", "Unassigned"]];
  var CHAN = [["all", "All"], ["web", "Website"], ["wa", "WhatsApp"], ["tg", "Telegram"]];
  var st = { box: "all", chan: "all", q: "", chats: [], counts: {}, id: 0, chat: null, msgs: [], last: 0, sending: false, first: true, team: [] };

  function alive() { return !!document.getElementById("cb-threads"); }
  function stopTimers() { (W._cbTimers || []).forEach(clearInterval); W._cbTimers = []; }
  function ini(n) { return String(n || "?").trim().split(/\s+/).map(function (x) { return x.charAt(0); }).join("").slice(0, 2).toUpperCase() || "?"; }
  function when(s) {
    if (!s) return "";
    var d = new Date(String(s).replace(" ", "T")); if (isNaN(d)) return "";
    return d.toDateString() === new Date().toDateString()
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  function chanBadge(c) {
    var k = c.channel || "web";
    return '<span class="cb-chan-b ' + esc(k) + '">' + esc(CH[k] || k) + "</span>";
  }
  function who(c) { return c.name || "Visitor #" + c.id; }

  // ---------- lists ----------
  function drawTabs() {
    var box = $("#cb-box"); if (!box) return;
    var n = { all: st.counts.all, mine: st.counts.mine, unassigned: st.counts.unassigned };
    box.innerHTML = BOX.map(function (b) {
      return '<button type="button" role="tab" aria-selected="' + (st.box === b[0]) + '" class="' + (st.box === b[0] ? "on" : "") + '" data-box="' + b[0] + '">' +
        esc(b[1]) + (n[b[0]] != null ? ' <span class="cb-n">' + esc(String(n[b[0]])) + "</span>" : "") + "</button>";
    }).join("");
    var ch = $("#cb-chan"); if (!ch) return;
    ch.innerHTML = CHAN.map(function (c) {
      return '<button type="button" aria-pressed="' + (st.chan === c[0]) + '" class="' + (st.chan === c[0] ? "on" : "") + '" data-chan="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
  }
  function drawThreads() {
    var box = $("#cb-threads"); if (!box) return;
    var q = st.q.toLowerCase();
    var rows = st.chats.filter(function (c) {
      if (st.chan !== "all" && (c.channel || "web") !== st.chan) return false;
      if (!q) return true;
      return [c.name, c.phone, c.last, c.page].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    if (!rows.length) { box.innerHTML = '<p class="cb-empty">' + (st.chats.length ? "No conversations match these filters." : "No open conversations yet. New website and WhatsApp chats appear here.") + "</p>"; return; }
    box.innerHTML = rows.map(function (c) {
      var on = c.id === st.id, n = who(c), unread = c.unread || c.needs;
      return '<button type="button" role="option" aria-selected="' + on + '" class="cb-item' + (on ? " on" : "") + (unread ? " unread" : "") + '" data-id="' + c.id + '">' +
        '<span class="cb-av">' + esc(ini(n)) + "</span>" +
        '<span class="cb-item-b"><span class="cb-item-t"><b>' + esc(n) + "</b><small>" + esc(when(c.updated_at)) + "</small></span>" +
        '<span class="cb-item-s">' + esc(c.last || "") + "</span>" +
        '<span class="cb-item-m">' + chanBadge(c) +
        (c.needs ? ' <span class="cb-tag warn">Needs you</span>' : "") +
        (unread && !c.needs ? ' <span class="cb-tag">New</span>' : "") +
        (c.mode === "ai" ? ' <span class="cb-tag ai">AI</span>' : "") + "</span></span></button>";
    }).join("");
  }
  function loadList() {
    if (!alive()) return stopTimers();
    return api("chat_list", { status: "open", box: st.box }).then(function (r) {
      if (!alive()) return stopTimers();
      if (!r || !r.ok) { toast((r && r.error) || "Could not load conversations", true); return; }
      st.chats = r.chats || []; st.counts = r.counts || {}; st.team = r.team || [];
      if (!st.id && st.chats.length) { st.id = st.chats[0].id; st.first = true; }
      drawTabs(); drawThreads();
      if (st.id && (!st.chat || st.chat.id !== st.id)) loadChat(true);
    });
  }

  // ---------- active chat ----------
  function msgHtml(m, c) {
    if (m.who === "sys") return '<div class="cb-sys">' + esc(m.text) + (m.t ? " · " + esc(when(m.t)) : "") + "</div>";
    var out = m.who === "agent" || m.who === "ai" || m.who === "note";
    var label = m.who === "visitor" ? who(c) : m.who === "ai" ? "AI assistant" : m.who === "note" ? "Internal note" : (m.name || "Team");
    var body = W.chatX ? W.chatX.body(m) : esc(m.text);
    return '<div class="cb-row ' + (out ? "out" : "in") + (m.fresh ? " fresh" : "") + '">' +
      '<div class="cb-bub ' + esc(m.who) + '">' + body + "</div>" +
      '<small class="cb-meta">' + esc(label) + " · " + esc(when(m.t)) + (m.fresh ? ' <span class="cb-tag">New</span>' : "") + "</small></div>";
  }
  function drawChat() {
    var c = st.chat, box = $("#cb-msgs"), hd = $("#cb-head"), inf = $("#cb-info");
    if (!c || !box) {
      if (hd) hd.innerHTML = '<div class="cb-none">Select a conversation to read it and reply.</div>';
      if (box) box.innerHTML = ""; if (inf) inf.innerHTML = ""; return;
    }
    var n = who(c), takeover = c.mode === "ai";
    var digits = String(c.phone || "").replace(/\D/g, "");
    hd.innerHTML = '<span class="cb-av lg">' + esc(ini(n)) + '</span><div class="cb-head-t"><b>' + esc(n) + "</b>" +
      "<small>" + chanBadge(c) + " " + esc(takeover ? "AI is answering" : "Handled by " + (c.agent || "the team")) + "</small></div>" +
      '<div class="cb-head-a">' +
        '<button type="button" class="btn sm" id="cb-mode" data-mode="' + (takeover ? "human" : "ai") + '">' + ic("user") + (takeover ? "Take over from AI" : "Hand back to AI") + "</button>" +
        (c.channel === "wa" && digits ? '<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/' + esc(digits) + '">' + ic("message-circle") + "Open WhatsApp</a>" : "") +
      "</div>";
    box.innerHTML = st.msgs.map(function (m) { return msgHtml(m, c); }).join("") || '<p class="cb-empty">No messages yet.</p>';
    var ty = $("#cb-ty"); if (ty) ty.textContent = st.typing ? n + " is typing…" : "";
    if (st.first) box.scrollTop = box.scrollHeight;
    if (inf) inf.innerHTML = infoHtml(c);
    W.fillIcons && W.fillIcons(hd);
    if (st.first) { var d = $("#cb-msgs"); if (d) d.scrollTop = d.scrollHeight; }
  }
  function infoHtml(c) {
    var tags = (c.tags || []).map(function (t) { return '<span class="cb-tag">' + esc(t) + "</span>"; }).join(" ");
    function row(k, v) { return v ? '<div class="cb-kv"><small>' + esc(k) + "</small><span>" + v + "</span></div>" : ""; }
    var digits = String(c.phone || "").replace(/\D/g, "");
    return '<div class="cb-info-h"><span class="cb-av lg">' + esc(ini(who(c))) + "</span><b>" + esc(who(c)) + "</b>" + chanBadge(c) + "</div>" +
      row("Phone", c.phone ? '<a href="tel:' + esc(digits) + '">' + esc(c.phone) + "</a>" : "") +
      row("Email", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") +
      row("Page", c.page ? esc(c.page) : "") +
      row("Handled by", esc(c.mode === "ai" ? "AI assistant" : (c.agent || "Team"))) +
      row("Hand-over reason", c.handoff ? esc(c.handoff) : "") +
      row("Tags", tags) +
      '<div class="cb-info-a">' +
        (c.lead_id ? '<a class="btn pri btn-preline-cyan" href="#/enquiries">' + ic("inbox") + "Open lead #" + esc(String(c.lead_id)) + "</a>" : '<p class="muted" style="margin:0">No lead yet. The AI creates one when the visitor shares a phone number.</p>') +
      "</div>";
  }
  function loadChat(first) {
    if (!alive()) return stopTimers();
    var id = st.id; if (!id) return;
    if (first) { st.msgs = []; st.last = 0; st.first = true; }
    return api("chat_get", { id: id, since: st.last }).then(function (r) {
      if (!alive() || id !== st.id) return;
      if (!r || !r.ok) { toast((r && r.error) || "Could not load the chat", true); return; }
      st.chat = r.chat; st.typing = !!r.typing;
      var added = (r.messages || []).filter(function (m) { return m.id > st.last; });
      added.forEach(function (m) { st.last = Math.max(st.last, m.id); m.fresh = !st.first && m.who === "visitor"; st.msgs.push(m); });
      drawThreads(); drawChat();
      st.first = false;
    });
  }
  function selectChat(id) {
    st.id = id; st.chat = null; st.msgs = []; st.last = 0; st.first = true;
    if (history.replaceState) history.replaceState(null, "", "#/chat/" + id);
    drawThreads(); loadChat(true);
  }

  // ---------- actions ----------
  function send(e) {
    if (e) e.preventDefault();
    var ta = $("#cb-txt"), btn = $("#cb-send"); if (!ta || st.sending || !st.id) return;
    var text = ta.value.trim(); if (!text) return;
    st.sending = true; btn.disabled = true;
    api("chat_reply", { id: st.id, text: text }).then(function (r) {
      st.sending = false; btn.disabled = false;
      if (!r || !r.ok) { toast((r && r.error) || "Message not sent", true); return; }
      ta.value = ""; st.first = false; loadChat(false); loadList();
    }).catch(function () { st.sending = false; btn.disabled = false; toast("Message not sent. Check the connection and try again.", true); });
  }
  function suggest() {
    var b = $("#cb-suggest"), ta = $("#cb-txt"); if (!b || !ta || !st.id) return;
    b.disabled = true;
    api("chat_suggest", { id: st.id }).then(function (r) {
      b.disabled = false;
      if (!r || !r.ok) return toast((r && r.error) || "Could not suggest a reply", true);
      ta.value = r.text || ""; ta.focus();
    }).catch(function () { b.disabled = false; });
  }
  function toggleMode(e) {
    var b = e.target.closest("#cb-mode"); if (!b || !st.id) return;
    api("chat_mode", { id: st.id, mode: b.dataset.mode }).then(function (r) {
      if (!r || !r.ok) return toast((r && r.error) || "Could not change the mode", true);
      toast(b.dataset.mode === "human" ? "You have taken over this chat. The AI is paused." : "The AI is back in this chat.");
      loadChat(false); loadList();
    });
  }

  W.VIEWS.chat = function (el, parts) {
    stopTimers();
    var want = parts && parts[0] ? parseInt(parts[0], 10) : 0;
    st.id = want || 0; st.chat = null; st.msgs = []; st.last = 0; st.first = true; st.sending = false; st.q = ""; st.typing = false;
    el.innerHTML = head("Inbox", "Inbox",
      '<a class="btn" href="#/aicenter">' + ic("sparkles") + "AI settings</a>" +
      '<a class="btn pri btn-preline-cyan" href="#/enquiries">' + ic("inbox") + "View CRM leads</a>") +
      '<div class="cb-shell card">' +
        '<aside class="cb-list" aria-label="Conversations">' +
          '<div class="cb-list-h"><input type="search" id="cb-q" placeholder="Search name, phone or message" aria-label="Search conversations"></div>' +
          '<div class="cb-tabs" id="cb-box"></div>' +
          '<div class="cb-chans" id="cb-chan"></div>' +
          '<div id="cb-threads" class="cb-threads" role="listbox" aria-label="Open conversations"></div>' +
        "</aside>" +
        '<section class="cb-chat" aria-live="polite">' +
          '<header class="cb-chat-h" id="cb-head"></header>' +
          '<div class="cb-msgs" id="cb-msgs" tabindex="0" aria-label="Messages"></div>' +
          '<div class="cb-typing" id="cb-ty"></div>' +
          '<form class="cb-form" id="cb-form">' +
            '<textarea id="cb-txt" rows="2" placeholder="Reply… (Enter to send, Shift+Enter for a new line)" aria-label="Reply"></textarea>' +
            '<div class="cb-form-b">' +
              '<button type="button" class="btn sm" id="cb-suggest">' + ic("sparkles") + "Suggest reply</button>" +
              '<button class="btn pri btn-preline-cyan" type="submit" id="cb-send">' + ic("send") + "Send</button>" +
            "</div>" +
          "</form>" +
        "</section>" +
        '<aside class="cb-info" id="cb-info" aria-label="Lead details"></aside>' +
      "</div>";
    W.fillIcons && W.fillIcons(el);
    drawTabs(); drawChat();

    $("#cb-box").onclick = function (e) { var b = e.target.closest("[data-box]"); if (!b) return; st.box = b.dataset.box; drawTabs(); loadList(); };
    $("#cb-chan").onclick = function (e) { var b = e.target.closest("[data-chan]"); if (!b) return; st.chan = b.dataset.chan; drawTabs(); drawThreads(); };
    $("#cb-threads").onclick = function (e) { var b = e.target.closest(".cb-item"); if (b) selectChat(+b.dataset.id); };
    $("#cb-q").oninput = function () { st.q = this.value.trim(); drawThreads(); };
    $("#cb-form").onsubmit = send;
    $("#cb-suggest").onclick = suggest;
    $("#cb-txt").onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#cb-form").requestSubmit(); } };
    $("#cb-head").onclick = toggleMode;

    W._cbTimers = [
      setInterval(function () { if (!alive()) return stopTimers(); loadChat(false); }, 3000),
      setInterval(function () { if (!alive()) return stopTimers(); loadList(); }, 15000)
    ];
    loadList();
  };
  W.VIEWS.inbox = W.VIEWS.chat;
})();
