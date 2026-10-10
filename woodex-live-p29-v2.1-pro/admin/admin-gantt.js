/* Woodex Admin — ARC.STUDIO Timeline (A5): read-only Gantt from existing project dates.
   Bars run from project `start` to `target`. Milestones (wx_projects.milestones) carry no dates yet,
   so they are listed under each bar in order, not placed on the time axis. Data: projs_list. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, $ = W.$, toast = W.toast, head = W.head;
  var DAY = 86400000;

  function ts(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var t = Date.parse(s + "T00:00:00Z"); return isNaN(t) ? null : t;
  }
  function fmt(t) {
    var d = new Date(t);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function monthStart(t) { var d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }
  function nextMonth(t) { var d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }

  function render(el, projects) {
    var today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    var rows = [], undated = 0;
    projects.forEach(function (p) {
      var s = ts(p.start), e = ts(p.target);
      if (s === null || e === null || e < s) { undated++; return; }
      rows.push({ p: p, s: s, e: e });
    });

    var box = $("#gt-body");
    if (!rows.length) {
      box.innerHTML = '<p class="muted">No project has a start and target date yet. Add them on the project record to see its bar here.</p>' +
        (undated ? '<p class="muted" style="margin-top:8px">' + undated + " project(s) without dates are not shown.</p>" : "");
      return;
    }

    // Axis: from the start of the earliest month to the end of the latest month, always at least 3 months.
    var lo = Math.min.apply(null, rows.map(function (r) { return Math.min(r.s, today); }));
    var hi = Math.max.apply(null, rows.map(function (r) { return Math.max(r.e, today); }));
    var a0 = monthStart(lo), a1 = nextMonth(hi);
    if (a1 - a0 < 90 * DAY) a1 = nextMonth(a1);
    var span = a1 - a0;
    function pos(t) { return Math.max(0, Math.min(100, (t - a0) / span * 100)); }

    var ticks = "";
    for (var m = a0; m < a1; m = nextMonth(m)) {
      ticks += '<div class="gt-tick" style="left:' + pos(m) + '%"><span>' +
        new Date(m).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) + "</span></div>";
    }

    var list = rows.sort(function (x, y) { return x.s - y.s; }).map(function (r) {
      var p = r.p, left = pos(r.s), width = Math.max(0.8, pos(r.e) - left);
      var past = r.e < today;
      var ms = Array.isArray(p.milestones) ? p.milestones : [];
      var billed = ms.filter(function (m) { return !!m.inv_id; }).length;
      var msHtml = ms.length
        ? '<ol class="gt-ms">' + ms.map(function (m) {
            return "<li>" + esc(m.label || "Milestone") + ' <span class="muted">' + esc(String(m.pct)) + "% · " +
              (m.inv_id ? "billed" : "not billed") + "</span></li>";
          }).join("") + "</ol>"
        : '<p class="muted gt-ms-none">No milestones set.</p>';
      return '<div class="gt-row" role="listitem">' +
        '<div class="gt-label"><b>' + esc(p.name || "Project") + "</b>" +
        '<small class="muted">' + esc(p.stage || "") + (past ? ' · <span class="gt-past">Past target</span>' : "") + "</small>" +
        '<small class="muted">' + fmt(r.s) + " – " + fmt(r.e) + "</small></div>" +
        '<div class="gt-track"><div class="gt-bar' + (past ? " past" : "") + '" style="left:' + left + "%;width:" + width + '%" title="' +
        esc((p.name || "Project") + ": " + fmt(r.s) + " to " + fmt(r.e)) + '"></div>' +
        '<div class="gt-today" style="left:' + pos(today) + '%"></div></div>' +
        '<div class="gt-meta"><small class="muted">' + billed + "/" + ms.length + " billed</small>" + msHtml + "</div></div>";
    }).join("");

    box.innerHTML = '<div class="gt-wrap" role="list" aria-label="Project timeline">' +
      '<div class="gt-row gt-axis-row" aria-hidden="true"><div></div><div class="gt-axis-track">' + ticks + "</div></div>" + list + "</div>" +
      '<p class="muted" style="margin-top:12px">Today: ' + fmt(today) + (undated ? " · " + undated + " project(s) without dates not shown" : "") +
      ". Milestones are listed in order; they are not placed on the time axis until they have dates.</p>";
  }

  W.VIEWS["gantt"] = function (el) {
    el.innerHTML = head("Timeline", "Timeline", "") +
      '<div class="card"><div class="card-h"><h3>Projects by date</h3><small class="muted">Start to target date</small></div>' +
      '<div class="card-b" id="gt-body"><p class="muted">Loading…</p></div></div>';
    api("projs_list").then(function (r) {
      if (!$("#gt-body")) return;
      if (!r || r.ok === false) { $("#gt-body").innerHTML = '<p class="muted">Could not load projects.</p>'; toast((r && r.error) || "Could not load projects", true); return; }
      render(el, r.projects || []);
    }).catch(function () { if ($("#gt-body")) $("#gt-body").innerHTML = '<p class="muted">Could not load projects.</p>'; });
  };
})();
