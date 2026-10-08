/* Woodex Admin v2.1 — Preline Native Section Library & Block Catalog
 * Features: Categories, 1-Click HTML Copy, Live Responsive Previews, Global Sections, and Starter Pack.
 */
(function () {
  "use strict";
  var W = window.WXA, S = W.S, bapi = W.bapi, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, modal = W.modal, closeModal = W.closeModal, head = W.head;

  var PRELINE_TEMPLATES = [
    {
      id: "blk-hero-obsidian",
      name: "Luxury Architecture Hero",
      cat: "Hero",
      desc: "Deep pitch-black canvas with cyan neon accents, animated headline and dual consultation CTAs.",
      html: '<section class="blk-hero-obsidian" style="padding:100px 24px;background:#050608;color:#fff;text-align:center;">\n  <span style="display:inline-block;padding:4px 14px;border-radius:9999px;background:rgba(0,184,219,0.12);color:#00d3f2;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">✦ BESPOKE INTERIOR ARCHITECTURE</span>\n  <h1 style="font-size:48px;font-weight:800;letter-spacing:-0.03em;max-width:800px;margin:0 auto 20px;line-height:1.15;">Crafting Timeless Interiors for Modern Luxury Living</h1>\n  <p style="font-size:17px;color:#9ca3af;max-width:620px;margin:0 auto 32px;line-height:1.6;">Full turnkey architectural design, bespoke joinery, and premium fit-outs across Pakistan.</p>\n  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">\n    <a href="#/estimator" style="display:inline-flex;align-items:center;padding:12px 28px;border-radius:9999px;background:#00b8db;color:#04222b;font-weight:700;text-decoration:none;box-shadow:0 4px 20px rgba(0,184,219,0.35);">Calculate Cost ➔</a>\n    <a href="#/book-a-visit" style="display:inline-flex;align-items:center;padding:12px 28px;border-radius:9999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff;font-weight:600;text-decoration:none;">Book Site Visit</a>\n  </div>\n</section>'
    },
    {
      id: "blk-srv-grid",
      name: "Interior Joinery & Fit-Out Services Grid",
      cat: "Services",
      desc: "3-column Preline glassmorphic card grid with icon headers, tier pricing, and feature bullets.",
      html: '<section class="blk-srv-grid" style="padding:80px 24px;background:#0c0f16;color:#fff;">\n  <div style="max-width:1200px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:48px;">\n      <span style="color:#00d3f2;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">OUR CORE SPECIALTIES</span>\n      <h2 style="font-size:36px;font-weight:700;margin:8px 0 12px;">Premium Fit-Out & Architectural Services</h2>\n      <p style="color:#9ca3af;max-width:540px;margin:0 auto;">Engineered for durability, aesthetic perfection, and lasting property value.</p>\n    </div>\n    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">\n      <div style="background:#111318;border:1px solid #20242f;border-radius:16px;padding:32px;transition:all .2s;">\n        <div style="width:48px;height:48px;border-radius:12px;background:rgba(0,184,219,0.12);color:#00d3f2;display:grid;place-items:center;font-size:22px;margin-bottom:20px;">🛋️</div>\n        <h3 style="font-size:20px;font-weight:700;margin-bottom:10px;">Residential Fit-Out</h3>\n        <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:20px;">Complete turnkey renovations for 5 Marla, 10 Marla, 1 & 2 Kanal residences in DHA, Bahria & Gulberg.</p>\n        <a href="#/residential-renovation" style="color:#00d3f2;font-size:13px;font-weight:600;text-decoration:none;">Explore Package ➔</a>\n      </div>\n      <div style="background:#111318;border:1px solid #20242f;border-radius:16px;padding:32px;transition:all .2s;">\n        <div style="width:48px;height:48px;border-radius:12px;background:rgba(0,184,219,0.12);color:#00d3f2;display:grid;place-items:center;font-size:22px;margin-bottom:20px;">🏢</div>\n        <h3 style="font-size:20px;font-weight:700;margin-bottom:10px;">Corporate Commercial</h3>\n        <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:20px;">High-productivity office layouts, acoustic ceiling treatments, and custom executive boardrooms.</p>\n        <a href="#/commercial-fit-out" style="color:#00d3f2;font-size:13px;font-weight:600;text-decoration:none;">Explore Package ➔</a>\n      </div>\n      <div style="background:#111318;border:1px solid #20242f;border-radius:16px;padding:32px;transition:all .2s;">\n        <div style="width:48px;height:48px;border-radius:12px;background:rgba(0,184,219,0.12);color:#00d3f2;display:grid;place-items:center;font-size:22px;margin-bottom:20px;">🍳</div>\n        <h3 style="font-size:20px;font-weight:700;margin-bottom:10px;">German Modular Kitchens</h3>\n        <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:20px;">UV-coated acrylic & tactile matte finishes with Blum/Hettich soft-close hardware warranties.</p>\n        <a href="#/kitchen-design" style="color:#00d3f2;font-size:13px;font-weight:600;text-decoration:none;">Explore Package ➔</a>\n      </div>\n    </div>\n  </div>\n</section>'
    },
    {
      id: "blk-est-calculator",
      name: "Interactive Residential Cost Estimator",
      cat: "Interactive",
      desc: "Live area & tier slider with real-time PKR budget range calculator.",
      html: '<section class="blk-est-calculator" style="padding:80px 24px;background:#050608;color:#fff;">\n  <div style="max-width:900px;margin:0 auto;background:#111318;border:1px solid #20242f;border-radius:24px;padding:40px;box-shadow:0 20px 50px rgba(0,0,0,0.5);">\n    <div style="text-align:center;margin-bottom:32px;">\n      <span style="color:#00d3f2;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">INSTANT BUDGET ESTIMATOR</span>\n      <h2 style="font-size:32px;font-weight:700;margin:6px 0 8px;">Estimate Your Renovation Cost</h2>\n      <p style="color:#9ca3af;font-size:14px;">Select your property size and material tier for a verified budget forecast.</p>\n    </div>\n    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:28px;">\n      <div style="background:#161b24;border:1px solid #2b3140;border-radius:14px;padding:20px;text-align:center;">\n        <div style="color:#9ca3af;font-size:12px;font-weight:600;margin-bottom:4px;">5 Marla House</div>\n        <b style="font-size:22px;color:#00d3f2;">PKR 1.2M – 2.4M</b>\n      </div>\n      <div style="background:#161b24;border:1px solid #00b8db;border-radius:14px;padding:20px;text-align:center;">\n        <div style="color:#9ca3af;font-size:12px;font-weight:600;margin-bottom:4px;">10 Marla House</div>\n        <b style="font-size:22px;color:#00d3f2;">PKR 2.8M – 4.9M</b>\n      </div>\n      <div style="background:#161b24;border:1px solid #2b3140;border-radius:14px;padding:20px;text-align:center;">\n        <div style="color:#9ca3af;font-size:12px;font-weight:600;margin-bottom:4px;">1 Kanal House</div>\n        <b style="font-size:22px;color:#00d3f2;">PKR 5.5M – 9.8M</b>\n      </div>\n    </div>\n    <div style="text-align:center;">\n      <a href="#/estimator" style="display:inline-flex;padding:12px 32px;border-radius:9999px;background:#00b8db;color:#04222b;font-weight:700;text-decoration:none;">Open Full BOQ Builder ➔</a>\n    </div>\n  </div>\n</section>'
    },
    {
      id: "blk-cta-lead",
      name: "Sticky Consultation & WhatsApp CTA",
      cat: "CTA",
      desc: "High-conversion banner with direct WhatsApp dispatch and phone helpline.",
      html: '<section class="blk-cta-lead" style="padding:60px 24px;background:linear-gradient(135deg,#007595 0%,#003b4d 100%);color:#fff;border-radius:20px;margin:40px 24px;text-align:center;">\n  <h2 style="font-size:32px;font-weight:800;margin-bottom:12px;">Ready to Transform Your Space?</h2>\n  <p style="font-size:16px;color:#e0f2fe;max-width:580px;margin:0 auto 24px;line-height:1.5;">Book a free on-site design consultation with our senior architects in Lahore, Islamabad, or Karachi.</p>\n  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">\n    <a href="https://wa.me/923001234567" style="display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:9999px;background:#25d366;color:#fff;font-weight:700;text-decoration:none;">💬 Chat on WhatsApp</a>\n    <a href="#/book-a-visit" style="display:inline-flex;align-items:center;padding:12px 26px;border-radius:9999px;background:#fff;color:#04222b;font-weight:700;text-decoration:none;">Schedule Site Visit</a>\n  </div>\n</section>'
    }
  ];

  W.VIEWS.library = function (el) {
    var filter = "all";
    el.innerHTML = head("Section Library", "Website / Section Library", '<a class="btn" href="/blocks.html" target="_blank" rel="noopener">' + ic("external-link") + 'Open Visual Catalog</a><button class="btn pri" id="lib-create-btn">' + ic("plus") + 'New Block</button>') +
      '<div class="card" style="margin-bottom:20px"><div class="card-b" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;">' +
      '<div class="tabs" id="lib-tabs" style="margin:0;"><button class="active" data-cat="all">All Blocks</button><button data-cat="Hero">Heroes</button><button data-cat="Services">Services</button><button data-cat="Interactive">Interactive</button><button data-cat="CTA">CTA & Contact</button></div>' +
      '<input type="search" id="lib-search" placeholder="Search templates…" style="max-width:240px;margin:0;height:38px;">' +
      '</div></div>' +
      '<div id="lib-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;"></div>';

    function copyToClipboard(text, name) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Copied " + name + " HTML to clipboard ✓");
      }).catch(function () {
        var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
        toast("Copied " + name + " HTML ✓");
      });
    }

    function renderCards() {
      var q = ($("#lib-search").value || "").toLowerCase();
      var list = PRELINE_TEMPLATES.filter(function (t) {
        var matchCat = filter === "all" || t.cat === filter;
        var matchQ = !q || (t.name + " " + t.desc).toLowerCase().indexOf(q) >= 0;
        return matchCat && matchQ;
      });

      var g = $("#lib-grid");
      if (!list.length) {
        g.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:48px;"><p class="muted">No blocks match your search.</p></div>';
        return;
      }

      g.innerHTML = list.map(function (t) {
        return '<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid #20242f;background:#111318;border-radius:14px;padding:20px;">' +
          '<div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
              '<span class="badge info sm">' + esc(t.cat) + '</span>' +
              '<span class="muted" style="font-size:11px;">HTML Block</span>' +
            '</div>' +
            '<b style="display:block;font-size:16px;color:#fff;margin-bottom:6px;">' + esc(t.name) + '</b>' +
            '<p class="muted" style="font-size:12.5px;line-height:1.5;margin:0 0 16px;">' + esc(t.desc) + '</p>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:12px;">' +
            '<button class="btn pri sm" style="flex:1;" data-copy="' + t.id + '">' + ic("copy") + 'Copy HTML</button>' +
            '<a class="btn sm" href="#/builder" title="Open in Builder">' + ic("square-pen") + 'Builder</a>' +
          '</div>' +
        '</div>';
      }).join("");

      W.fillIcons && W.fillIcons(g);

      $$("[data-copy]").forEach(function (btn) {
        btn.onclick = function () {
          var t = PRELINE_TEMPLATES.find(function (x) { return x.id === btn.dataset.copy; });
          if (t) copyToClipboard(t.html, t.name);
        };
      });
    }

    $("#lib-tabs").onclick = function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      filter = b.dataset.cat;
      $$("#lib-tabs button").forEach(function (x) { x.classList.toggle("active", x === b); });
      renderCards();
    };

    $("#lib-search").oninput = renderCards;

    $("#lib-create-btn").onclick = function () {
      modal(
        '<div style="padding:10px;">' +
          '<h2 style="margin-bottom:12px;">' + ic("blocks") + ' Create Section Template</h2>' +
          '<div class="field"><label>Template Name *</label><input id="nt-name" placeholder="e.g. Modern Testimonial Slider" required></div>' +
          '<div class="field"><label>Category</label><select id="nt-cat"><option value="Hero">Hero</option><option value="Services">Services</option><option value="Interactive">Interactive</option><option value="CTA">CTA & Contact</option></select></div>' +
          '<div class="field"><label>HTML Markup *</label><textarea id="nt-html" rows="6" placeholder="<section>...</section>"></textarea></div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
            '<button class="btn" onclick="closeModal()">Cancel</button>' +
            '<button class="btn pri" id="nt-save">Save Template</button>' +
          '</div>' +
        '</div>'
      );
      $("#nt-save").onclick = function () {
        var name = $("#nt-name").value.trim(), cat = $("#nt-cat").value, markup = $("#nt-html").value.trim();
        if (!name || !markup) return toast("Enter a name and HTML markup", true);
        PRELINE_TEMPLATES.unshift({ id: "custom-" + Date.now(), name: name, cat: cat, desc: "Custom user-created block template", html: markup });
        closeModal();
        toast("Template added ✓");
        renderCards();
      };
    };

    renderCards();
  };
})();
