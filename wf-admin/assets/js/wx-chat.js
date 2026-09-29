/* WOODEX live-chat visitor widget (H6) — floating button, polls every 5s.
   Attaches itself to the page; no other assets required. */
(function () {
  if (window.__wxChatInit) return;
  window.__wxChatInit = true;
  var API = "/api/router.php?fn=cms-chat";
  var vid = localStorage.getItem("wx-vid");
  if (!vid) {
    vid = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("wx-vid", vid);
  }
  var channelId = null, lastId = null, timer = null, open = false;

  function el(tag, css, parent, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function api(body, method) {
    return fetch(API, {
      method: method || "POST",
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  /* ---------- styles + shell ---------- */
  var btn = el("button", "position:fixed;right:18px;bottom:18px;z-index:9998;width:56px;height:56px;border-radius:50%;border:0;background:#2563eb;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 8px 24px rgba(10,15,30,.28);line-height:1", document.body);
  btn.innerHTML = "&#128172;";
  btn.setAttribute("aria-label", "Open live chat");

  var panel = el("div", "position:fixed;right:18px;bottom:84px;z-index:9998;width:340px;max-width:calc(100vw - 36px);height:460px;max-height:70vh;background:#fff;border:1px solid #e6e9f2;border-radius:16px;box-shadow:0 18px 50px rgba(10,15,30,.22);display:none;flex-direction:column;overflow:hidden;font-family:inherit", document.body);

  var head = el("div", "background:#0a0f1e;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px", panel);
  el("div", "width:9px;height:9px;border-radius:50%;background:#22c55e;flex:none", head);
  el("b", "font-size:14px", head, "Woodex Live Chat");
  el("span", "margin-left:auto;cursor:pointer;font-size:18px;opacity:.8", head, "\u00d7").onclick = close;

  var log = el("div", "flex:1;overflow-y:auto;padding:14px;background:#f8fafd", panel);
  var form = el("form", "display:flex;gap:8px;padding:10px;border-top:1px solid #e6e9f2;background:#fff", panel);
  var input = el("input", "flex:1;border:1px solid #d7dbe8;border-radius:999px;padding:9px 14px;font-size:13.5px;outline:none", form);
  input.placeholder = "Type a message…";
  var send = el("button", "border:0;background:#2563eb;color:#fff;border-radius:999px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer", form, "Send");

  function bubble(from, text, who) {
    var mine = from === "visitor";
    var wrap = el("div", "display:flex;" + (mine ? "justify-content:flex-end" : ""), log);
    var b = el("div", "max-width:80%;margin:0 0 8px;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;" +
      (mine ? "background:#2563eb;color:#fff;border-bottom-right-radius:4px"
            : "background:#fff;color:#1a2233;border:1px solid #e6e9f2;border-bottom-left-radius:4px"), wrap, (who && !mine ? who + ": " : "") + text);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  var greeted = false;
  function greet() {
    if (greeted) return;
    greeted = true;
    bubble("agent", "Hi 👋 — how can we help you today? Ask anything about our services.");
  }

  function ensureChannel() {
    if (channelId) return Promise.resolve(channelId);
    return api({ action: "open", visitor_id: vid, page: location.pathname, name: "" })
      .then(function (d) {
        channelId = d.channel && d.channel.id;
        return channelId;
      });
  }
  function poll() {
    if (!channelId || !open) return;
    api({ action: "poll", channel_id: channelId, visitor_id: vid, since: lastId || 0 }, "GET")
      .then(function (d) {
        if (!d || !d.messages) return;
        // render only messages we have not drawn yet (by id)
        d.messages.forEach(function (m) {
          if (window.__wxSeen && window.__wxSeen[m.id]) return;
          (window.__wxSeen = window.__wxSeen || {})[m.id] = 1;
          if (m.from !== "visitor") bubble(m.from, m.body, m.agent_name || "Agent");
        });
      }).catch(function () {});
  }

  function openPanel() {
    open = true;
    panel.style.display = "flex";
    btn.innerHTML = "&#128172;";
    ensureChannel().then(function () {
      greet();
      poll();
      if (timer) clearInterval(timer);
      timer = setInterval(poll, 5000);
      input.focus();
    });
  }
  function close() {
    open = false;
    panel.style.display = "none";
    if (timer) { clearInterval(timer); timer = null; }
  }
  btn.onclick = function () { open ? close() : openPanel(); };

  form.onsubmit = function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    ensureChannel().then(function () {
      return api({ action: "message", channel_id: channelId, visitor_id: vid, body: text });
    }).then(function () {
      bubble("visitor", text);
    }).catch(function () {
      bubble("agent", "Could not send — please try again.");
    });
  };
})();
