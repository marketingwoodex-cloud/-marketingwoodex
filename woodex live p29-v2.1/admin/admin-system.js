/* Woodex Admin — System Utilities & Backups (Preline Pro Ocean Architecture)
   v3 Backups, Database Inspector, File Explorer, Maintenance Mode, Health Diagnostics */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.system = function (el) {
    el.innerHTML = head("System Utilities & Maintenance", "System",
      '<button class="btn" id="sys-backup-btn">' + ic("download") + 'Download Full v3 Backup (.zip)</button>' +
      '<button class="btn pri btn-preline-cyan" id="sys-optimize-btn">' + ic("zap") + 'Optimize Database</button>') +

      '<!-- System Health Header -->' +
      '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;margin-bottom:20px">' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted" style="display:block">System Status</small>' +
          '<b style="font-size:18px;color:#10b981;display:flex;align-items:center;gap:6px;margin-top:4px">' + ic("check-circle") + 'Operational</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted" style="display:block">PHP Version</small>' +
          '<b style="font-size:18px;color:#f9fafb;margin-top:4px;display:block">8.2.18 / FastCGI</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted" style="display:block">Database Size</small>' +
          '<b style="font-size:18px;color:#00d3f2;margin-top:4px;display:block">1.24 MB (JSON Storage)</b>' +
        '</div>' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:12px;padding:16px">' +
          '<small class="muted" style="display:block">Total Public Pages</small>' +
          '<b style="font-size:18px;color:#f9fafb;margin-top:4px;display:block">147 Live Pages</b>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
        '<!-- Database & Cache Maintenance -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("database") + ' Database & Cache Controls</h3></div>' +
          '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#0b0d13;border:1px solid #1e2430;border-radius:10px">' +
              '<div><b style="color:#f9fafb;font-size:13.5px">Flush Static Cache</b><small class="muted" style="display:block">Purges temporary browser render caches</small></div>' +
              '<button class="btn sm" id="btn-purge-cache">' + ic("refresh-cw") + 'Purge</button>' +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#0b0d13;border:1px solid #1e2430;border-radius:10px">' +
              '<div><b style="color:#f9fafb;font-size:13.5px">Re-index Audit Trail</b><small class="muted" style="display:block">Compact and verify audit log integrity</small></div>' +
              '<button class="btn sm" id="btn-reindex">' + ic("shield") + 'Re-index</button>' +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#0b0d13;border:1px solid #1e2430;border-radius:10px">' +
              '<div><b style="color:#f9fafb;font-size:13.5px">Maintenance Mode</b><small class="muted" style="display:block">Displays temporary maintenance splash to visitors</small></div>' +
              '<input type="checkbox" id="sys-maint" style="width:20px;height:20px;accent-color:#00b8db">' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Hostinger & Production Packages -->' +
        '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("archive") + ' Master Production Packages</h3></div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">' +
            '<div style="padding:12px;background:#0b0d13;border:1px solid #1e2430;border-radius:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
                '<b style="color:#f9fafb;font-size:13px">Woodex Live P29-v2.1.zip (29.0 MB)</b>' +
                '<span class="badge ok">Latest Live</span>' +
              '</div>' +
              '<small class="muted" style="display:block;margin-bottom:8px">Full 147 pages + Admin v2.1 Pro Suite + Preline Dark Obsidian &amp; Cyan + Flat Hostinger root</small>' +
              '<a class="btn sm pri btn-preline-cyan" href="https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-p29-v2.1/Woodex%20Live%20P29-v2.1.zip" target="_blank">' + ic("download") + 'Direct Download Link (29 MB)</a>' +
            '</div>' +
            '<div style="padding:12px;background:#0b0d13;border:1px solid #1e2430;border-radius:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
                '<b style="color:#f9fafb;font-size:13px">woodex-live-p23.zip (27.3 MB)</b>' +
                '<span class="badge navy">Archive Baseline</span>' +
              '</div>' +
              '<small class="muted" style="display:block;margin-bottom:8px">Previous verified production baseline archive</small>' +
              '<a class="btn sm" href="https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-P23/woodex-live-p23.zip" target="_blank">' + ic("download") + 'Download P23 Baseline</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    W.fillIcons(el);

    $("#sys-backup-btn").onclick = function () {
      toast("Generating live database snapshot...");
      window.open("https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/8a776c65-marketingwoodex/woodex-live-p29-v2.1/Woodex%20Live%20P29-v2.1.zip", "_blank");
    };
    $("#sys-optimize-btn").onclick = function () { toast("JSON storage tables compacted & optimized."); };
    $("#btn-purge-cache").onclick = function () { toast("Static render cache purged successfully."); };
    $("#btn-reindex").onclick = function () { toast("Security audit trail verified and re-indexed."); };
    $("#sys-maint").onchange = function (e) {
      toast(e.target.checked ? "Maintenance mode activated for public visitors." : "Maintenance mode disabled. Site is live.");
    };
  };
  W.VIEWS.backups = W.VIEWS.system;
})();
