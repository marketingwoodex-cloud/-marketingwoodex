/* Woodex Admin — P39 Phase 4: Telegram setup (bot, team group, alerts, website fallback) + "Link my Telegram" on My profile. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, V = W.VIEWS;
  function $(s, r) { return (r || document).querySelector(s); }
  function step(n, title, body, done) { return '<div class="card" style="margin-bottom:12px"><div class="card-b" style="display:flex;gap:14px;align-items:flex-start"><span style="flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:' + (done ? "#dcfce7;color:#166534" : "#f4efe7;color:#8a6a3f") + '">' + (done ? "✓" : n) + '</span><div style="flex:1;min-width:0"><h3 style="margin:2px 0 6px;font-size:15px">' + title + "</h3>" + body + "</div></div></div>"; }
  function sw(id, on, label, hint) { return '<label class="check" style="align-items:flex-start;margin:8px 0"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + "><span><b>" + label + "</b>" + (hint ? '<br><small class="muted">' + hint + "</small>" : "") + "</span></label>"; }

  V.telegram = function (el) {
    el.innerHTML = W.head("Telegram", "Telegram") + '<div id="tg-b"><div class="card"><div class="empty">Loading…</div></div></div>';
    api("tg_get").then(function (r) {
      if (!r.ok) { $("#tg-b").innerHTML = '<div class="card"><div class="empty">' + esc(r.error) + "</div></div>"; return; }
      var c = r.cfg, on = !!c.bot;
      $("#tg-b").innerHTML =
        '<div class="card" style="margin-bottom:12px"><div class="card-b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' + ic("send") +
        '<div style="flex:1;min-width:220px"><b>' + (on ? "Connected: @" + esc(c.bot) : "Not connected") + "</b><br><small class=\"muted\">" +
        (on ? (c.group ? "Team group: " + esc(c.groupTitle) : "No team group yet") + " · " + c.linked + " staff linked · WhatsApp is " + (c.waDown ? '<b style="color:#b42318">not working</b> (Telegram button is ' + (c.buttonLive ? "showing" : "hidden") + " on the website)" : "working") : "Customers can chat with your Telegram bot, staff reply from a Telegram group, and the website offers Telegram when WhatsApp is down.") +
        "</small></div>" + (on ? '<a class="btn sm" target="_blank" rel="noopener" href="https://t.me/' + esc(c.bot) + '">Open bot</a>' : "") + "</div></div>" +
        step(1, "Create your bot (2 minutes)", '<ol style="margin:0 0 10px 18px;padding:0;font-size:13.5px;line-height:1.7"><li>In Telegram, open <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> and send <code>/newbot</code>.</li><li>Name: <b>Woodex Interior</b> · username e.g. <b>WoodexInteriorBot</b>.</li><li>Copy the token it gives you and paste it here.</li></ol>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="tg-tok" type="password" autocomplete="off" placeholder="' + (c.tokenSet ? "Token saved (paste a new one to change)" : "123456789:AA…") + '" style="flex:1;min-width:240px;margin:0"><button class="btn pri" id="tg-con">' + (on ? "Reconnect" : "Connect") + "</button>" + (on ? '<button class="btn" id="tg-off">Disconnect</button>' : "") + "</div>" +
          '<small class="muted">The webhook is set for you: ' + esc(c.webhook) + "</small>", on) +
        step(2, "Link your Telegram account", '<p style="margin:0 0 8px;font-size:13.5px">Needed so the bot knows who you are when you reply from the team group. Every staff member does this once from <b>My profile</b>.</p><button class="btn" id="tg-me"' + (on ? "" : " disabled") + ">" + (r.me ? "✓ Linked · link again" : "Link my Telegram") + "</button>", r.me) +
        step(3, "Connect your team group", '<ol style="margin:0 0 8px 18px;padding:0;font-size:13.5px;line-height:1.7"><li>Create a Telegram group (e.g. <b>Woodex Team</b>) and add your staff.</li><li>Add <b>@' + esc(c.bot || "yourbot") + "</b> to the group and make it an <b>admin</b> (so it can read replies).</li><li>In the group, the Master or a Manager sends <code>/connect</code>.</li></ol>" +
          '<p class="muted" style="margin:0 0 8px;font-size:13px">Then every customer message appears in the group. Staff <b>reply to that message</b> to answer the customer on their channel (website, WhatsApp or Telegram). <code>/ai</code> hands back to the assistant, <code>/close</code> closes the chat.</p>' +
          (c.group ? '<button class="btn" id="tg-test">Send a test message</button>' : ""), !!c.group) +
        '<div class="card"><div class="card-h"><h3>Settings</h3></div><div class="card-b">' +
          sw("tg-cus", c.customers, "Customers can chat with the bot", "Same AI agent and Inbox as the website chat and WhatsApp.") +
          '<label style="margin:10px 0 4px;display:block"><b>Telegram button in the website chat</b></label><div class="seg" id="tg-btn">' + [["auto", "Only when WhatsApp is down"], ["always", "Always"], ["off", "Never"]].map(function (x) { return '<button data-v="' + x[0] + '"' + (c.button === x[0] ? ' class="on"' : "") + ">" + x[1] + "</button>"; }).join("") + "</div>" +
          '<h4 style="margin:16px 0 4px">Team group alerts</h4>' + sw("tg-ac", c.alertChats, "Customer messages", "Post every customer message so staff can reply from Telegram.") + sw("tg-al", c.alertLeads, "New leads") + sw("tg-aa", c.alertAppr, "Changes waiting for Master approval") +
        "</div></div>";
      W.fillIcons($("#tg-b"));
      $("#tg-con").onclick = function () { var b = this; b.disabled = true; api("tg_connect", { token: $("#tg-tok").value.trim() }).then(function (x) { b.disabled = false; if (!x.ok) return toast(x.error, true); toast("Connected to @" + x.cfg.bot + " ✓"); V.telegram(el); }); };
      if ($("#tg-off")) $("#tg-off").onclick = function () { if (confirm("Disconnect Telegram? Customers will no longer reach you there.")) api("tg_disconnect").then(function () { V.telegram(el); }); };
      if ($("#tg-test")) $("#tg-test").onclick = function () { api("tg_test").then(function (x) { toast(x.ok ? "Test sent to the team group ✓" : x.error, !x.ok); }); };
      $("#tg-me").onclick = linkMe;
      var save = function (o) { api("tg_save", o).then(function (x) { toast(x.ok ? "Saved" : x.error, !x.ok); }); };
      $("#tg-cus").onchange = function () { save({ customers: this.checked }); };
      $("#tg-ac").onchange = function () { save({ alertChats: this.checked }); };
      $("#tg-al").onchange = function () { save({ alertLeads: this.checked }); };
      $("#tg-aa").onchange = function () { save({ alertAppr: this.checked }); };
      $("#tg-btn").onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b) return; [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); }); save({ button: b.dataset.v }); };
    });
  };
  function linkMe() {
    api("tg_link_code").then(function (r) {
      if (!r.ok) return toast(r.error, true);
      W.modal("<h3>Link my Telegram</h3><p>Open this link on the phone where you use Telegram and tap <b>Start</b>. It works for 15 minutes.</p><p><a class='btn pri' target='_blank' rel='noopener' href='" + esc(r.link) + "'>Open Telegram</a></p><p class='muted' style='font-size:12.5px'>Or send <code>/start L" + esc(r.code) + "</code> to the bot.</p><div class='modal-actions'><button class='btn' onclick='WXA.closeModal()'>Done</button></div>");
    });
  }
  // My profile → Telegram card (everyone; only shows when Telegram is connected)
  var baseP = V.profile;
  if (baseP) V.profile = function (el, parts) {
    var r = baseP(el, parts);
    setTimeout(function () {
      api("tg_link_code").then(function (x) {
        if (!x.ok || !document.body.contains(el) || $("#tg-pc", el)) return;
        var d = document.createElement("div"); d.className = "card"; d.id = "tg-pc"; d.style.marginTop = "14px";
        d.innerHTML = '<div class="card-b" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">' + ic("send") + '<div style="flex:1"><b>Telegram</b><br><small class="muted">' + (x.linked ? "Linked ✓ You can reply to customers from the team group." : "Link your Telegram to reply to customers from the team group.") + '</small></div><button class="btn sm" id="tg-pl">' + (x.linked ? "Link again" : "Link my Telegram") + "</button></div>";
        el.appendChild(d); W.fillIcons(d); $("#tg-pl").onclick = linkMe;
      });
    }, 300);
    return r;
  };
  W.route();
})();
