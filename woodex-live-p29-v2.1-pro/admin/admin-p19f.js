/* Woodex Admin — P19 F1: Pipeline v2.
   Board that fits the screen, stage totals + forecast, filters (search / owner / line / period),
   richer cards (value, days in stage, next follow-up, owner), quick actions (WhatsApp, call, quote),
   won value + lost reason on drop. Uses the existing APIs (leads_list, lead_save, s17_meta) and lead drawer. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = W.esc, api = W.api, toast = W.toast, ic = W.ic || function () { return ""; };
  /* stage accent = theme token (see assets/wx-ds-pipeline.css); resolved by the browser,
     so a stage colour can never be light-only again */
  var STG = [["new", "New", "var(--status-info, var(--primary))", 10], ["contacted", "Contacted", "var(--status-warn, var(--primary))", 20], ["visit", "Site visit", "var(--status-warn, var(--primary))", 40], ["quote", "Quote sent", "var(--status-info, var(--primary))", 60], ["hold", "On hold", "var(--muted-foreground-1)", 15], ["won", "Won", "var(--status-ok, var(--primary))", 100], ["lost", "Lost", "var(--status-bad, var(--primary))", 0]];
  var LOST = ["Price too high", "Chose another company", "Timing / postponed", "No response", "Out of scope / area", "Other"];
  var st = { q: "", owner: "", line: "", days: "", hide: false };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem("wx_pl") || "{}"), { q: "" }); } catch (e) {}
  var D = { leads: [], team: [], lines: {}, sources: {} };

  var pkr = function (n) { n = Math.round(+n || 0); return n >= 1e6 ? "Rs " + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M" : n >= 1e3 ? "Rs " + Math.round(n / 1e3) + "k" : "Rs " + n; };
  var full = function (n) { return "Rs " + Math.round(+n || 0).toLocaleString("en-PK"); };
  var dt = function (s) { var d = new Date(String(s || "").replace(" ", "T")); return isNaN(d) ? null : d; };
  var days = function (s) { var d = dt(s); return d ? Math.max(0, Math.floor((Date.now() - d) / 864e5)) : 0; };
  function stageSince(l) { var t = l.created_at; (l.notes || []).forEach(function (n) { if (n.sys && /^Stage:/.test(n.text || "") && n.t > t) t = n.t; }); return t; }
  function nextAt(l) { return l.next_at || l.followup || ""; }
  function waNum(p) { var d = String(p || "").replace(/\D/g, ""); if (d.length === 11 && d[0] === "0") d = "92" + d.slice(1); else if (d.length === 10 && d[0] === "3") d = "92" + d; return d.length >= 11 ? d : ""; }
  function initials(n) { return String(n || "?").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }

  function filtered() {
    var q = st.q.toLowerCase(), lim = st.days ? Date.now() - (+st.days) * 864e5 : 0;
    return D.leads.filter(function (l) {
      if (st.owner === "none" ? l.assigned_to : (st.owner && String(l.assigned_to) !== st.owner)) return false;
      if (st.line && l.line !== st.line) return false;
      if (lim) { var d = dt(l.created_at); if (d && d < lim) return false; }
      return !q || [l.name, l.company, l.phone, l.service, l.email].join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }

  function card(l) {
    var since = days(stageSince(l)), open = l.stage !== "won" && l.stage !== "lost", nx = nextAt(l), nd = dt(nx), od = open && nd && nd < new Date(), wa = waNum(l.phone);
    var age = open ? '<span class="p19-age ' + (since > 14 ? "hot" : since > 7 ? "warm" : "") + '" title="Days in this stage">' + since + "d</span>" : "";
    return '<article class="p19-card' + (l.read ? "" : " unread") + (od ? " od" : "") + '" draggable="true" data-id="' + l.id + '">' +
      '<div class="p19-ct"><div class="p19-ctn"><b>' + esc(l.company || l.name) + "</b>" + (l.company && l.name && l.name !== l.company ? "<small>" + esc(l.name) + "</small>" : "") + "</div>" + age + "</div>" +
      '<div class="p19-tags">' + (l.service ? "<span>" + esc(l.service) + "</span>" : "") + (l.line && D.lines[l.line] ? '<span class="ln">' + esc(D.lines[l.line]) + "</span>" : "") + (!l.read ? '<span class="nw">new</span>' : "") + "</div>" +
      '<div class="p19-cf"><span class="v">' + (l.value ? full(l.value) : '<em>No value</em>') + "</span>" +
      (nx && open ? '<span class="nx' + (od ? " od" : "") + '" title="Next follow-up">' + ic("clock") + nd.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + "</span>" : "") +
      (l.assigned_name ? '<span class="av" title="' + esc(l.assigned_name) + '">' + esc(initials(l.assigned_name)) + "</span>" : '<span class="av none" title="Not assigned">–</span>') + "</div>" +
      '<div class="p19-qa">' + (wa ? '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" title="WhatsApp" data-stop>' + ic("message-circle") + "</a>" : "") + (l.phone ? '<a href="tel:' + esc(l.phone) + '" title="Call" data-stop>' + ic("phone") + "</a>" : "") +
      '<a href="#/quote/new?lead=' + l.id + '" title="New quotation" data-stop>' + ic("file-text") + "</a></div></article>";
  }

  function draw(el) {
    var L = filtered(), cols = STG.filter(function (s) { return (!st.hide || (s[0] !== "won" && s[0] !== "lost")) && (s[0] !== "hold" || L.some(function (l) { return l.stage === "hold"; })); });
    var open = L.filter(function (l) { return l.stage !== "won" && l.stage !== "lost"; });
    var pipe = open.reduce(function (a, l) { return a + (+l.value || 0); }, 0);
    var fc = open.reduce(function (a, l) { var s = STG.find(function (x) { return x[0] === l.stage; }); return a + (+l.value || 0) * (s ? s[3] : 0) / 100; }, 0);
    var m0 = new Date(); m0 = new Date(m0.getFullYear(), m0.getMonth(), 1);
    var won = L.filter(function (l) { return l.stage === "won"; }), lost = L.filter(function (l) { return l.stage === "lost"; });
    var wonM = won.filter(function (l) { var d = dt(stageSince(l)); return d && d >= m0; }).reduce(function (a, l) { return a + (+l.value || 0); }, 0);
    var rate = won.length + lost.length ? Math.round(won.length * 100 / (won.length + lost.length)) : 0;
    var od = open.filter(function (l) { var d = dt(nextAt(l)); return d && d < new Date(); }).length;
    $(".p19-kpi", el).innerHTML = [["Open deals", open.length, od ? od + " follow-up" + (od > 1 ? "s" : "") + " overdue" : "nothing overdue", od ? "bad" : ""], ["Pipeline value", pkr(pipe), "open deals"], ["Forecast", pkr(fc), "weighted by stage"], ["Won this month", pkr(wonM), won.length + " won in total"], ["Win rate", rate + "%", won.length + " won · " + lost.length + " lost"]]
      .map(function (k) { return '<div class="p19-k"><small>' + k[0] + "</small><b>" + k[1] + '</b><span class="' + (k[3] || "") + '">' + k[2] + "</span></div>"; }).join("");
    var kb = $(".p19-kb", el); kb.style.setProperty("--n", cols.length);
    kb.innerHTML = cols.map(function (s) {
      var items = L.filter(function (l) { return l.stage === s[0]; }).sort(function (a, b) { return String(nextAt(a) || "9").localeCompare(String(nextAt(b) || "9")) || b.id - a.id; });
      var v = items.reduce(function (a, l) { return a + (+l.value || 0); }, 0);
      return '<section class="p19-col" data-st="' + s[0] + '" style="--c:' + s[2] + '"><header><i></i><b>' + s[1] + "</b><span class='n'>" + items.length + "</span><small>" + (v ? pkr(v) : "") + "</small></header>" +
        '<div class="p19-list">' + (items.map(card).join("") || '<p class="p19-empty">Drop a lead here</p>') + "</div></section>";
    }).join("");
    W.fillIcons(kb);
    $$(".p19-card", kb).forEach(function (c) {
      c.onclick = function (e) { if (e.target.closest("[data-stop]")) return; W.leadDrawer ? W.leadDrawer(+c.dataset.id, function () { load(el); }) : (location.hash = "#/enquiries"); };
      c.ondragstart = function (e) { e.dataTransfer.setData("text/plain", c.dataset.id); e.dataTransfer.effectAllowed = "move"; c.classList.add("drag"); kb.classList.add("dragging"); };
      c.ondragend = function () { c.classList.remove("drag"); kb.classList.remove("dragging"); };
    });
    $$(".p19-col", kb).forEach(function (col) {
      col.ondragover = function (e) { e.preventDefault(); col.classList.add("over"); };
      col.ondragleave = function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("over"); };
      col.ondrop = function (e) { e.preventDefault(); col.classList.remove("over"); move(el, +e.dataTransfer.getData("text/plain"), col.dataset.st); };
    });
  }

  function move(el, id, to) {
    var l = D.leads.find(function (x) { return x.id === id; }); if (!l || l.stage === to) return;
    var go = function (extra) {
      var data = Object.assign({ id: id, stage: to }, extra || {}), prev = l.stage; l.stage = to; Object.assign(l, extra || {}); draw(el);
      api("lead_save", data).then(function (r) {
        if (!r.ok) { l.stage = prev; draw(el); return toast(r.error, true); }
        var i = D.leads.findIndex(function (x) { return x.id === id; }); D.leads[i] = r.lead; draw(el);
        toast(esc(l.company || l.name) + " → " + STG.find(function (s) { return s[0] === to; })[1]);
      });
    };
    if (to === "won") {
      W.modal("<h2>Mark as won 🎉</h2><p class='muted' style='margin:-8px 0 14px'>" + esc(l.company || l.name) + "</p><label>Final deal value (Rs)<input id='p19-wv' type='number' min='0' value='" + (+l.value || "") + "'></label><div class='modal-actions'><button class='btn' onclick='WXA.closeModal()'>Cancel</button><button class='btn pri' id='p19-wg'>Mark won</button></div>");
      $("#p19-wg").onclick = function () { var v = Math.max(0, Math.round(+$("#p19-wv").value || 0)); W.closeModal(); go(v ? { value: v } : {}); };
      return;
    }
    if (to === "lost") {
      W.modal("<h2>Why was it lost?</h2><p class='muted' style='margin:-8px 0 14px'>" + esc(l.company || l.name) + " — helps you see patterns later.</p><div class='p19-why'>" + LOST.map(function (r, i) { return "<label><input type='radio' name='p19w' value='" + esc(r) + "'" + (i === 0 ? " checked" : "") + "> " + esc(r) + "</label>"; }).join("") + "</div><label>Note (optional)<input id='p19-wn' placeholder='e.g. went with a cheaper local carpenter'></label><div class='modal-actions'><button class='btn' onclick='WXA.closeModal()'>Cancel</button><button class='btn danger' id='p19-lg'>Mark lost</button></div>");
      $("#p19-lg").onclick = function () { var r = ($("input[name=p19w]:checked") || {}).value || "Other", n = $("#p19-wn").value.trim(); W.closeModal(); go({ lost_reason: r + (n ? " — " + n : "") }); };
      return;
    }
    go();
  }

  function load(el) {
    return Promise.all([api("leads_list"), D.metaDone ? Promise.resolve(null) : api("s17_meta")]).then(function (r) {
      if (!r[0].ok) { $(".p19-kb", el).innerHTML = '<p class="err">' + esc(r[0].error) + "</p>"; return; }
      D.leads = r[0].leads || []; D.team = r[0].team || []; D.sources = r[0].sources || {};
      if (r[1] && r[1].ok) { D.lines = r[1].lines || {}; D.metaDone = true; }
      var os = $("#p19-own", el); if (os && os.options.length <= 2) { os.insertAdjacentHTML("beforeend", D.team.map(function (u) { return "<option value='" + u.id + "'>" + esc(u.name) + "</option>"; }).join("")); os.value = st.owner; }
      var ls = $("#p19-line", el); if (ls && ls.options.length <= 1) { ls.insertAdjacentHTML("beforeend", Object.keys(D.lines).map(function (k) { return "<option value='" + k + "'>" + esc(D.lines[k]) + "</option>"; }).join("")); ls.value = st.line; }
      draw(el);
    });
  }

  function addLead(el) {
    W.modal("<h2>Add enquiry</h2><div class='g2'><label>Contact name *<input id='al-n'></label><label>Company<input id='al-co'></label></div><div class='g2'><label>Phone<input id='al-p'></label><label>Service<input id='al-s' placeholder='Kitchen, office fit-out…'></label></div><div class='g2'><label>Estimated value (Rs)<input id='al-v' type='number' min='0'></label><label>Assigned to<select id='al-as'><option value=''>Nobody</option>" + D.team.map(function (u) { return "<option value='" + u.id + "'>" + esc(u.name) + "</option>"; }).join("") + "</select></label></div><label>Note<textarea id='al-m' rows='2'></textarea></label><p class='err' id='al-err'></p><div class='modal-actions'><button class='btn' onclick='WXA.closeModal()'>Cancel</button><button class='btn pri' id='al-go'>Add enquiry</button></div>");
    var dk = W.formDraft ? W.formDraft("pl", "#modal-card [id^='al-']") : { clear: function () {} };
    $("#al-go").onclick = function () {
      var n = $("#al-n").value.trim() || $("#al-co").value.trim(); if (!n) { $("#al-err").textContent = "Enter a contact name or company."; return; }
      api("lead_save", { name: n, company: $("#al-n").value.trim() ? $("#al-co").value : "", phone: $("#al-p").value, service: $("#al-s").value, value: $("#al-v").value, assigned_to: $("#al-as").value, message: $("#al-m").value, source: "manual" })
        .then(function (r) { if (!r.ok) return ($("#al-err").textContent = r.error); dk.clear(); W.closeModal(); toast("Enquiry added ✓"); load(el); });
    };
  }

  W.VIEWS.pipeline = function (el) {
    el.innerHTML = W.head("Pipeline", "Pipeline", '<button class="btn" id="p19-hide"></button><button class="btn pri" id="p19-add">' + ic("plus") + "Add enquiry</button>") +
      '<div class="p19-kpi"></div><div class="p19-fl"><div class="p19-s">' + ic("search") + '<input type="search" id="p19-q" placeholder="Search name, company, phone…"></div>' +
      '<select id="p19-own"><option value="">All owners</option><option value="none">Not assigned</option></select><select id="p19-line"><option value="">All lines</option></select>' +
      '<select id="p19-days"><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">This year</option></select>' +
      '<span class="p19-hint muted">Drag cards between stages · click to open</span></div><div class="p19-kb"><p class="muted">Loading…</p></div>';
    W.fillIcons(el);
    var save = function () { try { localStorage.setItem("wx_pl", JSON.stringify(st)); } catch (e) {} };
    var hb = $("#p19-hide", el), sh = function () { hb.textContent = st.hide ? "Show won & lost" : "Hide won & lost"; }; sh();
    hb.onclick = function () { st.hide = !st.hide; sh(); save(); draw(el); };
    $("#p19-add", el).onclick = function () { addLead(el); };
    $("#p19-q", el).oninput = function () { st.q = this.value.trim(); draw(el); };
    [["#p19-own", "owner"], ["#p19-line", "line"], ["#p19-days", "days"]].forEach(function (x) { var s = $(x[0], el); s.value = st[x[1]]; s.onchange = function () { st[x[1]] = s.value; save(); draw(el); }; });
    load(el);
  };

  /* the board styles live in assets/wx-ds-pipeline.css (loaded from index.html) so they
     are token-driven and theme-aware instead of a literal <style> blob injected at run time */
})();
