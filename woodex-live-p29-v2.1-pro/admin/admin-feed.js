/* Woodex Admin — ARC.STUDIO Team Feed (A4): staff messages per project.
   Uses arc_feed_list / arc_feed_post (api/arc-feed-lib.php). Messages are shown as plain text (escaped). */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, $ = W.$, toast = W.toast, head = W.head;
  var POLL_MS = 15000, MAX_TEXT = 2000;
  var st = { pid: 0, items: [], me: 0, busy: false, timer: null };

  function when(t) {
    var d = new Date(t * 1000);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function body(text) { return esc(text).replace(/\n/g, "<br>"); }
  function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

  function drawList() {
    var box = $("#tf-list"); if (!box) return;
    if (!st.pid) { box.innerHTML = '<p class="muted">Choose a project to see its team feed.</p>'; return; }
    if (!st.items.length) { box.innerHTML = '<p class="muted">No messages yet. Post the first update below.</p>'; return; }
    box.innerHTML = st.items.map(function (m) {
      var mine = m.author_id === st.me;
      return '<div class="tf-msg' + (mine ? " tf-mine" : "") + '">' +
        '<div class="tf-meta"><b>' + esc(m.author || "Team member") + '</b> <span class="muted">' + esc(m.role || "") + " · " + when(m.at) + "</span></div>" +
        '<div class="tf-body">' + body(m.text) + "</div></div>";
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  function load(full) {
    if (!st.pid || st.busy) return Promise.resolve();
    st.busy = true;
    var since = full ? 0 : (st.items.length ? st.items[st.items.length - 1].id : 0);
    return api("arc_feed_list", { project_id: st.pid, since: since }).then(function (r) {
      st.busy = false;
      if (!r || !r.ok) { toast((r && r.error) || "Could not load the feed", true); return; }
      st.me = r.me || st.me;
      st.items = full ? r.items : st.items.concat(r.items);
      if (st.items.length > 300) st.items = st.items.slice(-300);
      drawList();
      var s = $("#tf-st"); if (s) s.textContent = "Updates every 15 s";
    }).catch(function () { st.busy = false; });
  }

  function post(e) {
    e.preventDefault();
    var ta = $("#tf-txt"), btn = $("#tf-send"), text = (ta.value || "").trim();
    if (!st.pid) return toast("Choose a project first", true);
    if (!text) return toast("Write a message first", true);
    if (text.length > MAX_TEXT) return toast("Message is too long", true);
    btn.disabled = true;
    api("arc_feed_post", { project_id: st.pid, text: text }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) return toast((r && r.error) || "Could not send", true);
      ta.value = ""; count();
      load(false);
    }).catch(function () { btn.disabled = false; toast("Could not send. Check the connection and try again.", true); });
  }

  function count() { var ta = $("#tf-txt"), c = $("#tf-cnt"); if (ta && c) c.textContent = ta.value.length + " / " + MAX_TEXT; }

  W.VIEWS["team-feed"] = function (el) {
    stop();
    el.innerHTML = head("Team feed", "Team feed", "") +
      '<div class="card"><div class="card-b" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<label for="tf-pj" style="font-weight:600">Project</label>' +
      '<select id="tf-pj" style="min-width:280px"><option value="">Loading projects…</option></select></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>Messages</h3><small class="muted" id="tf-st"></small></div>' +
      '<div class="card-b"><div id="tf-list" class="tf-list" aria-live="polite"></div>' +
      '<form id="tf-form" class="tf-form" style="margin-top:14px">' +
      '<textarea id="tf-txt" rows="3" maxlength="' + MAX_TEXT + '" placeholder="Write an update for the team…" aria-label="Message"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><small class="muted" id="tf-cnt">0 / ' + MAX_TEXT + '</small>' +
      '<button class="btn pri" type="submit" id="tf-send">' + ic("send") + " Send</button></div></form></div></div>";
    W.fillIcons && W.fillIcons(el);
    drawList();

    api("projs_list").then(function (r) {
      var sel = $("#tf-pj"); if (!sel) return;
      var list = (r && r.projects) || [];
      sel.innerHTML = '<option value="">Choose a project…</option>' + list.map(function (p) {
        return '<option value="' + p.id + '">' + esc(p.name || ("Project " + p.id)) + "</option>";
      }).join("");
      sel.onchange = function () {
        st.pid = +sel.value || 0; st.items = []; stop(); drawList();
        if (st.pid) { load(true); st.timer = setInterval(function () { if (!$("#tf-list")) return stop(); load(false); }, POLL_MS); }
      };
    }).catch(function () { var sel = $("#tf-pj"); if (sel) sel.innerHTML = '<option value="">Could not load projects</option>'; });

    $("#tf-form").onsubmit = post;
    $("#tf-txt").oninput = count;
  };
})();
