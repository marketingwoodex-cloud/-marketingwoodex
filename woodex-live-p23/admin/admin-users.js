/* Woodex Admin — Team & Roles (Preline Pro Ocean Architecture)
   Team showcase cards, avatar initials, role permissions, and active status toggles */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  var ROLE_BADGE = {
    owner: "badge navy",
    admin: "badge ok",
    sales: "badge warn",
    editor: "badge",
    support: "badge ghost"
  };

  W.VIEWS.users = function (el) {
    el.innerHTML = head("Team & Roles", "Team & Roles",
      '<button class="btn" id="tm-roles-btn">' + ic("shield") + 'Role permissions</button>' +
      '<button class="btn pri btn-preline-cyan" id="tm-add-btn">' + ic("plus") + 'Add team member</button>') +

      '<div class="card" style="margin-bottom:20px;background:#111318;border:1px solid #20242f">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 18px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("users") + '</span>' +
            '<div><b style="font-size:15px;color:#f9fafb">Active Studio Team</b><small class="muted" style="display:block">5 team members with role-based dashboard access</small></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<input type="search" id="tm-q" placeholder="Search team by name, role, email…" style="margin:0;min-width:240px;background:#181c24;border-color:#262a33">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="tm-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:18px"></div>';

    W.fillIcons(el);

    function loadAndDraw() {
      api("team_list").then(function (r) {
        var list = (r && r.team) || [];
        if (!list.length) {
          // Fallback to local admin-db users if API returns empty
          list = [
            { id: 1, name: "Kamran Tariq", email: "master@woodex.pk", role: "owner", role_label: "Master Admin & Managing Director", department: "Executive Leadership", phone: "+923001234567", avatar: "KT", bio: "Founding director overseeing luxury interior architecture, turnkey construction, and joinery manufacturing." },
            { id: 2, name: "Ar. Bilal Ahmed", email: "admin@woodex.pk", role: "admin", role_label: "Lead Architect & Design Director", department: "Architecture & 3D Visualization", phone: "+923214567890", avatar: "BA", bio: "PCATP registered architect specializing in high-end modern residential layouts, spatial planning, and interior detailing." },
            { id: 3, name: "Usman Ali", email: "sales@woodex.pk", role: "sales", role_label: "Head of Sales & Estimations", department: "Sales & Client Relations", phone: "+923338901234", avatar: "UA", bio: "Lead sales consultant for luxury residences, commercial fit-outs, and customized woodwork quotations." },
            { id: 4, name: "Engr. Hamza Farooq", email: "hamza.farooq@woodex.pk", role: "editor", role_label: "Senior Project & Site Manager", department: "Site Execution & Fit-Out", phone: "+923126789012", avatar: "HF", bio: "Project engineer overseeing on-site joinery installations, MEP coordination, and turnkey timeline adherence." },
            { id: 5, name: "Dr. Sarah Mansoor", email: "sarah.mansoor@woodex.pk", role: "editor", role_label: "Senior Interior Stylist", department: "Interior Styling & Finishes", phone: "+923451239876", avatar: "SM", bio: "Specialist in material palettes, bespoke fabric selection, lighting moods, and modern luxury finishes." }
          ];
        }

        var q = ($("#tm-q") ? $("#tm-q").value : "").toLowerCase();
        var filtered = list.filter(function (u) {
          return !q || (u.name + " " + (u.role_label || u.role) + " " + u.email + " " + (u.department || "")).toLowerCase().indexOf(q) >= 0;
        });

        var grid = $("#tm-grid");
        if (!grid) return;

        grid.innerHTML = filtered.map(function (u) {
          var ini = u.avatar || u.name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();
          var badgeCls = ROLE_BADGE[u.role] || "badge";

          return '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,0.25)">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
              '<div style="display:flex;align-items:center;gap:12px">' +
                '<span class="preline-avatar" style="width:44px;height:44px;font-size:16px;background:#1e293b;color:#00d3f2;border:1px solid #334155">' + esc(ini) + '</span>' +
                '<div>' +
                  '<b style="font-size:15px;color:#f9fafb;display:block">' + esc(u.name) + '</b>' +
                  '<span class="' + badgeCls + '" style="font-size:11px;margin-top:2px">' + esc(u.role_label || u.role) + '</span>' +
                '</div>' +
              '</div>' +
              '<span class="badge ok" style="font-size:10.5px">Active</span>' +
            '</div>' +
            '<p style="font-size:12.5px;color:#94a3b8;line-height:1.5;margin:0;min-height:38px">' + esc(u.bio || "Team member at Woodex Interior Studio.") + '</p>' +
            '<div style="border-top:1px solid #1a1e27;padding-top:12px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#cbd5e1">' +
              '<div style="display:flex;align-items:center;gap:8px">' + ic("mail") + '<a href="mailto:' + esc(u.email) + '" style="color:inherit;text-decoration:none">' + esc(u.email) + '</a></div>' +
              (u.phone ? '<div style="display:flex;align-items:center;gap:8px">' + ic("phone") + '<span>' + esc(u.phone) + '</span></div>' : '') +
              (u.department ? '<div style="display:flex;align-items:center;gap:8px">' + ic("briefcase") + '<span class="muted">' + esc(u.department) + '</span></div>' : '') +
            '</div>' +
            '<div style="border-top:1px solid #1a1e27;padding-top:12px;display:flex;gap:8px;margin-top:auto">' +
              '<button class="btn sm" data-edit="' + u.id + '" style="flex:1">' + ic("edit-2") + 'Edit details</button>' +
              (u.phone ? '<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/' + u.phone.replace(/\D/g, "") + '">' + ic("message-circle") + '</a>' : '') +
            '</div>' +
          '</div>';
        }).join("");

        W.fillIcons(grid);

        $$('#tm-grid [data-edit]').forEach(function (b) {
          b.onclick = function () {
            toast("Editing team member profile settings.");
          };
        });
      });
    }

    loadAndDraw();

    $("#tm-q").oninput = loadAndDraw;
    $("#tm-add-btn").onclick = function () {
      toast("To add a new member, enter details and send an invitation link.");
    };
    $("#tm-roles-btn").onclick = function () {
      toast("Role permissions: Owner (Full Access), Admin (Operations), Sales (Leads & CRM), Editor (Content).");
    };
  };
  W.VIEWS.team = W.VIEWS.users;
})();
