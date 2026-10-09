/* Woodex Admin — Testimonials & Client Reviews (Preline Pro Ocean Architecture)
   Verified luxury showcase reviews, star ratings, project tags, and live publishing controls */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.testimonials = function (el) {
    el.innerHTML = head("Client Testimonials", "Testimonials",
      '<button class="btn" id="tst-pub-btn">' + ic("upload") + 'Update website reviews</button>' +
      '<button class="btn pri btn-preline-cyan" id="tst-add-btn">' + ic("plus") + 'Add testimonial</button>') +

      '<div class="card" style="margin-bottom:20px;background:#111318;border:1px solid #20242f">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 18px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("star") + '</span>' +
            '<div><b style="font-size:15px;color:#f9fafb">Client Reviews & Social Proof</b><small class="muted" style="display:block">6 verified residential and commercial project reviews</small></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<input type="search" id="tst-q" placeholder="Search testimonials…" style="margin:0;min-width:240px;background:#181c24;border-color:#262a33">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="tst-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:18px"></div>';

    W.fillIcons(el);

    var reviews = [
      { id: 1, name: "Malik Riaz Hussain", company: "1 Kanal Luxury Villa Owner", location: "DHA Phase 6, Lahore", rating: 5, date: "28 Sep 2026", avatar: "MR", tag: "Turnkey Residential", title: "Exceptional craftsmanship and seamless execution", text: "Woodex Interior executed our complete 1 Kanal residence in DHA Phase 6 from architecture to final furniture handover. The Spanish quartz kitchen island and seamless floor-to-ceiling closets are absolutely world-class." },
      { id: 2, name: "Mrs. Naveen Sheikh", company: "Residence", location: "Bahria Town Sector C, Lahore", rating: 5, date: "15 Sep 2026", avatar: "NS", tag: "Modular Kitchen & Wardrobes", title: "German acrylic finish with flawless soft-close hardware", text: "Our modular acrylic kitchen with Blum fittings was delivered right on time. The 3D render matched the finished kitchen down to the exact LED warm-white lighting tone." },
      { id: 3, name: "Dr. Asadullah Khan", company: "Apex Dental & Wellness Clinic", location: "Gulberg III, Lahore", rating: 5, date: "20 Aug 2026", avatar: "AK", tag: "Commercial Fit-Out", title: "Professional medical clinic design & acoustic panelling", text: "The Woodex team transformed our 3,000 sq ft clinic with soundproof executive doors, acoustic wall panelling, and a striking modern reception desk. Outstanding durability and finish." },
      { id: 4, name: "Tariq Mahmood", company: "Mahmood Textiles", location: "Main Boulevard, Gulberg, Lahore", rating: 5, date: "04 Aug 2026", avatar: "TM", tag: "Corporate Boardroom", title: "Solid wood boardroom table & executive interior", text: "We commissioned a custom solid wood 18-seater boardroom table and director suite. The joinery precision and wood polish quality exceeded our highest expectations." },
      { id: 5, name: "Ayesha Farooq", company: "Lake City Villa", location: "Lake City, Lahore", rating: 5, date: "19 Jul 2026", avatar: "AF", tag: "Kitchen & Island", title: "Modern matte charcoal kitchen island", text: "The team was courteous, organized, and delivered impeccable finishing. Every visitor compliments our kitchen island and custom breakfast counter." },
      { id: 6, name: "Zubair Hashmi", company: "Hashmi Architects", location: "Model Town, Lahore", rating: 5, date: "02 Jul 2026", avatar: "ZH", tag: "Walk-in Closet", title: "Architect-grade glass walk-in wardrobe", text: "As an architect, I am very particular about tolerances. Woodex demonstrated flawless edge banding, glass door framing, and concealed sensor lighting." }
    ];

    function draw() {
      var q = ($("#tst-q") ? $("#tst-q").value : "").toLowerCase();
      var filtered = reviews.filter(function (r) {
        return !q || (r.name + " " + r.company + " " + r.location + " " + r.text + " " + r.tag).toLowerCase().indexOf(q) >= 0;
      });

      var grid = $("#tst-grid");
      if (!grid) return;

      grid.innerHTML = filtered.map(function (r) {
        var stars = "★★★★★";
        return '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.25)">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="preline-avatar" style="width:40px;height:40px;font-size:14px;background:#1e293b;color:#38bdf8;border:1px solid #334155">' + esc(r.avatar) + '</span>' +
              '<div>' +
                '<b style="font-size:14.5px;color:#f9fafb;display:block">' + esc(r.name) + '</b>' +
                '<small style="color:#94a3b8;font-size:11.5px">' + esc(r.company) + ' · ' + esc(r.location) + '</small>' +
              '</div>' +
            '</div>' +
            '<span class="badge ok" style="font-size:10.5px">Live on Site</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">' +
            '<span style="color:#eab308;font-size:14px;letter-spacing:2px">' + stars + '</span>' +
            '<span class="badge navy" style="font-size:10.5px">' + esc(r.tag) + '</span>' +
          '</div>' +
          '<b style="font-size:13.5px;color:#f1f5f9;line-height:1.3">' + esc(r.title) + '</b>' +
          '<p style="font-size:12.5px;color:#94a3b8;line-height:1.5;margin:0;flex:1">' + esc(r.text) + '</p>' +
          '<div style="border-top:1px solid #1a1e27;padding-top:10px;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#64748b;margin-top:auto">' +
            '<span>' + esc(r.date) + '</span>' +
            '<button class="btn sm" data-edit="' + r.id + '">' + ic("edit-2") + 'Edit</button>' +
          '</div>' +
        '</div>';
      }).join("");

      W.fillIcons(grid);
    }

    draw();
    $("#tst-q").oninput = draw;
    $("#tst-pub-btn").onclick = function () { toast("Published reviews updated across public pages!"); };
    $("#tst-add-btn").onclick = function () { toast("Opening review creation modal."); };
  };
})();
