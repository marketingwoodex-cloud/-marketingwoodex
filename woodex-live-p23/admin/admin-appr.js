/* Woodex Admin — Approvals Command Board & Minimizable Tasks Suite (Preline Pro Ocean Architecture)
   Interactive approvals board (Quotations, Blog/SEO drafts, Testimonials, Social posts),
   Batch multi-approval engine, Minimizable/Collapsible Pending Tasks drawer, and MCP Bridge Inspector */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.approvals = function (el) {
    el.innerHTML = head("Master Approvals & Pending Actions", "Approvals",
      '<button class="btn" id="ap-batch-btn">' + ic("layers") + 'Batch Actions</button>' +
      '<button class="btn pri btn-preline-cyan" id="ap-appr-all">' + ic("check-circle") + 'Approve All Waiting (5)</button>') +

      '<!-- Minimizable Pending Tasks Alert Box -->' +
      '<div class="card" id="ap-tasks-card" style="margin-bottom:20px;transition:all 0.2s ease">' +
        '<div class="card-b" style="padding:16px 20px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="kpi-ic" style="background:rgba(245,158,11,0.15);color:#f59e0b">' + ic("alert-triangle") + '</span>' +
              '<div>' +
                '<b style="font-size:15px;color:#f9fafb">Urgent Action Items & Pending Bottlenecks</b>' +
                '<small class="muted" style="display:block">4 items require immediate leadership decision before site execution</small>' +
              '</div>' +
            '</div>' +
            '<button class="btn sm" id="ap-toggle-drawer" style="font-size:12px">' + ic("chevron-up") + '<span id="ap-toggle-txt">Minimize</span></button>' +
          '</div>' +
          '<div id="ap-drawer-body" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">' +
            '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px"><small class="muted">Overdue Follow-ups</small><b style="font-size:20px;color:#ef4444;display:block;margin-top:2px">2 Leads</b></div>' +
            '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px"><small class="muted">Discount Requests >10%</small><b style="font-size:20px;color:#f59e0b;display:block;margin-top:2px">1 Quotation</b></div>' +
            '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px"><small class="muted">Unassigned Inquiries</small><b style="font-size:20px;color:#00d3f2;display:block;margin-top:2px">3 Chats</b></div>' +
            '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px"><small class="muted">Blog SEO Approvals</small><b style="font-size:20px;color:#10b981;display:block;margin-top:2px">1 Article</b></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Filter Bar -->' +
      '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 18px">' +
          '<div class="seg" id="ap-subnav">' +
            '<button class="on" data-cat="all">All Waiting (5)</button>' +
            '<button data-cat="quote">Quotations (2)</button>' +
            '<button data-cat="content">SEO & Articles (1)</button>' +
            '<button data-cat="social">Social Posts (1)</button>' +
            '<button data-cat="review">Client Reviews (1)</button>' +
            '<button data-cat="history">History</button>' +
          '</div>' +
          '<span class="badge ok">Master Approval Gateway Active</span>' +
        '</div>' +
      '</div>' +

      '<div id="ap-items-container" style="display:flex;flex-direction:column;gap:16px"></div>';

    W.fillIcons(el);

    var curCat = "all";
    var items = [
      {
        id: "AP-101",
        cat: "quote",
        title: "Quotation #Q-2026-042 (Bahria Town Villa - 10 Marla)",
        by: "Usman Ali (Sales Director)",
        role: "Sales",
        time: "14m ago",
        summary: "Special 12% discount requested on German UV Acrylic Modular Kitchen & Walk-in Closets. Total: PKR 4,250,000 (Discount: PKR 510,000).",
        diff: "Original: PKR 4,760,000 → Proposed: PKR 4,250,000",
        badge: "Discount Approval",
        badgeColor: "warn"
      },
      {
        id: "AP-102",
        cat: "quote",
        title: "Quotation #Q-2026-043 (Apex Medical & Aesthetics)",
        by: "Usman Ali (Sales Director)",
        role: "Sales",
        time: "45m ago",
        summary: "Corporate payment milestone schedule: 40% Advance, 40% Factory QA, 20% Final Handover. Total: PKR 6,500,000.",
        diff: "Custom milestone terms approved by Ar. Bilal Ahmed",
        badge: "Payment Terms",
        badgeColor: "navy"
      },
      {
        id: "AP-103",
        cat: "content",
        title: "SEO Article Draft: 'Top 7 Luxury Kitchen Trends in Lahore for 2026'",
        by: "Farhan Malik (Lead Developer)",
        role: "Developer",
        time: "2h ago",
        summary: "Complete 1,800 word guide optimized for keywords 'luxury interior Lahore', 'acrylic kitchen price'. Includes FAQ schema and 4K portfolio gallery.",
        diff: "Ready for 1-click blog publication",
        badge: "Blog Article",
        badgeColor: "ok"
      },
      {
        id: "AP-104",
        cat: "social",
        title: "Scheduled Instagram Reel & Facebook Broadcast",
        by: "Dr. Sarah Mansoor (Senior Stylist)",
        role: "Stylist",
        time: "3h ago",
        summary: "DHA Phase 6 Villa completed walkthrough video reel scheduled for broadcast today at 6:00 PM.",
        diff: "Cross-post to Meta, Instagram, LinkedIn",
        badge: "Social Post",
        badgeColor: "navy"
      },
      {
        id: "AP-105",
        cat: "review",
        title: "Client Testimonial: Malik Riaz Hussain (1 Kanal Villa)",
        by: "Engr. Hamza Farooq (Site Manager)",
        role: "Site Manager",
        time: "5h ago",
        summary: "5-Star verified review submitted with project photo for DHA Phase 6 residence.",
        diff: "Toggled to display on Home & Portfolio pages",
        badge: "Review Approval",
        badgeColor: "ok"
      }
    ];

    function drawItems() {
      var box = $("#ap-items-container");
      if (!box) return;

      var filtered = curCat === "all" ? items : curCat === "history" ? [] : items.filter(function(x){ return x.cat === curCat; });

      if (curCat === "history") {
        box.innerHTML = '<div class="card" style="padding:28px;text-align:center">' +
          '<b style="font-size:15px;color:#f9fafb;display:block;margin-bottom:6px">Approval Audit Trail</b>' +
          '<p class="muted" style="margin:0">Over 148 past approvals executed cleanly with zero rollback incidents.</p>' +
        '</div>';
        return;
      }

      if (!filtered.length) {
        box.innerHTML = '<div class="card" style="padding:28px;text-align:center"><b style="color:#10b981;font-size:15px">All items in this category are approved and live ✓</b></div>';
        return;
      }

      box.innerHTML = filtered.map(function (it) {
        return '<div class="card" data-id="' + it.id + '" style="border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:14px">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
            '<div>' +
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
                '<b style="font-size:15px;color:#f9fafb">' + esc(it.title) + '</b>' +
                '<span class="badge ' + it.badgeColor + '" style="font-size:11px">' + esc(it.badge) + '</span>' +
              '</div>' +
              '<small class="muted">Submitted by <b>' + esc(it.by) + '</b> · ' + esc(it.time) + ' · ID: <code>' + it.id + '</code></small>' +
            '</div>' +
            '<div style="display:flex;gap:8px">' +
              '<button class="btn sm" data-act="reject" data-id="' + it.id + '" style="color:#ef4444">' + ic("x") + 'Reject</button>' +
              '<button class="btn sm" data-act="view" data-id="' + it.id + '">' + ic("eye") + 'Inspect Details</button>' +
              '<button class="btn sm pri btn-preline-cyan" data-act="approve" data-id="' + it.id + '">' + ic("check") + 'Approve & Publish</button>' +
            '</div>' +
          '</div>' +
          '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px;font-size:13px;color:#cbd5e1;line-height:1.5">' +
            '<p style="margin:0 0 6px">' + esc(it.summary) + '</p>' +
            '<div style="border-top:1px solid var(--line);padding-top:8px;font-size:12px;color:#00d3f2;font-weight:600">' +
              ic("zap") + ' Change: ' + esc(it.diff) +
            '</div>' +
          '</div>' +
        '</div>';
      }).join("");

      W.fillIcons(box);

      $$('#ap-items-container [data-act]').forEach(function (btn) {
        btn.onclick = function () {
          var act = btn.dataset.act;
          var id = btn.dataset.id;
          if (act === "approve") {
            toast("Approved " + id + " and published live to production!");
            items = items.filter(function(x){ return x.id !== id; });
            drawItems();
          } else if (act === "reject") {
            var reason = prompt("Enter rejection reason for " + id + ":", "Requires budget adjustment");
            if (reason) {
              toast("Rejected " + id + " with note sent to creator.");
              items = items.filter(function(x){ return x.id !== id; });
              drawItems();
            }
          } else {
            toast("Inspecting full diff and parameters for " + id);
          }
        };
      });
    }

    drawItems();

    // Toggle drawer
    var drawer = $("#ap-drawer-body");
    var toggleBtn = $("#ap-toggle-drawer");
    var toggleTxt = $("#ap-toggle-txt");
    var isMin = false;
    if (toggleBtn && drawer) {
      toggleBtn.onclick = function () {
        isMin = !isMin;
        drawer.style.display = isMin ? "none" : "grid";
        toggleTxt.textContent = isMin ? "Expand" : "Minimize";
        toggleBtn.querySelector("svg, i").outerHTML = ic(isMin ? "chevron-down" : "chevron-up");
        W.fillIcons(toggleBtn);
      };
    }

    // Subnav switching
    $$("#ap-subnav button").forEach(function (b) {
      b.onclick = function () {
        $$("#ap-subnav button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curCat = b.dataset.cat;
        drawItems();
      };
    });

    $("#ap-appr-all").onclick = function () {
      toast("All 5 pending changes approved and committed live!");
      items = [];
      drawItems();
    };
    $("#ap-batch-btn").onclick = function () { toast("Batch multi-select mode activated."); };
  };
})();
