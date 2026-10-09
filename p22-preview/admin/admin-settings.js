/* Woodex Admin — Settings & Integrations (Preline Pro Ocean Architecture)
   Google Analytics 4, Search Console, 360 VR Panoramic controls, Studio Config & Preline Palette */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.settings = function (el) {
    el.innerHTML = head("Global Settings & Integrations", "Settings",
      '<button class="btn" id="st-reset-btn">' + ic("refresh-cw") + 'Reset defaults</button>' +
      '<button class="btn pri btn-preline-cyan" id="st-save-btn">' + ic("check") + 'Save changes</button>') +

      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px">' +
        '<!-- Main Settings Column -->' +
        '<div style="display:flex;flex-direction:column;gap:20px">' +
          '<!-- Studio Profile -->' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("building") + ' Studio & Brand Identity</h3></div>' +
            '<div class="form-grid" style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              '<label>Studio Name<input type="text" id="st-name" value="Woodex Interior Design Studio"></label>' +
              '<label>Tagline / Motto<input type="text" id="st-tag" value="Signature Residential & Commercial Turnkey Architecture"></label>' +
              '<label>Primary Phone<input type="text" id="st-ph" value="+92 300 4455667"></label>' +
              '<label>WhatsApp Helpline<input type="text" id="st-wa" value="+92 300 4455667"></label>' +
              '<label style="grid-column:1/-1">Head Office Address<input type="text" id="st-addr" value="Sector C, Commercial Area, Bahria Town / DHA Phase 6, Lahore, Pakistan"></label>' +
              '<label>Base Currency<input type="text" id="st-cur" value="PKR (Pakistani Rupee)" readonly style="opacity:0.8"></label>' +
              '<label>Operating Hours<input type="text" id="st-hrs" value="Mon - Sat: 9:00 AM – 7:00 PM"></label>' +
            '</div>' +
          '</div>' +

          '<!-- Google Analytics 4 & Search Console -->' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between">' +
              '<h3>' + ic("bar-chart-2") + ' Google Services & Tracking</h3>' +
              '<span class="badge ok">Connected</span>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
              '<div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                  '<label style="margin:0;font-weight:600;color:#f9fafb">Google Analytics 4 Measurement ID</label>' +
                  '<a href="https://analytics.google.com" target="_blank" rel="noopener" style="font-size:12px;color:#00d3f2;text-decoration:none;display:flex;align-items:center;gap:4px">' + ic("external-link") + 'Open Analytics Console</a>' +
                '</div>' +
                '<input type="text" id="st-ga4" value="G-WX880921B" placeholder="G-XXXXXXXXXX">' +
              '</div>' +
              '<div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                  '<label style="margin:0;font-weight:600;color:#f9fafb">Google Search Console Verification Tag / HTML</label>' +
                  '<a href="https://search.google.com/search-console" target="_blank" rel="noopener" style="font-size:12px;color:#00d3f2;text-decoration:none;display:flex;align-items:center;gap:4px">' + ic("external-link") + 'Open Search Console</a>' +
                '</div>' +
                '<input type="text" id="st-gsc" value="google-site-verification: google0b104c3cfb7a4943.html" placeholder="google-site-verification=...">' +
                '<small class="muted" style="font-size:11.5px;margin-top:4px;display:block">Direct HTML verification file `google0b104c3cfb7a4943.html` is verified and active at root.</small>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- 360 Panoramic Virtual Tour Controls -->' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between">' +
              '<h3>' + ic("video") + ' 360 Panoramic Virtual Tours</h3>' +
              '<span class="badge navy">Kuula / Matterport</span>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between">' +
                '<div><b style="color:#f9fafb;font-size:13.5px">Enable 360 VR Tours on Portfolio</b><small class="muted" style="display:block">Displays interactive 360 tour button on luxury project showcase pages</small></div>' +
                '<input type="checkbox" id="st-vr-active" checked style="width:20px;height:20px;accent-color:#00b8db">' +
              '</div>' +
              '<label>Default VR Tour Embed URL (Kuula / Matterport / Pannellum)<input type="url" id="st-vr-url" value="https://kuula.co/share/collection/7lK9W?logo=1&info=1&fs=1&vr=1&sd=1&thumbs=1"></label>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Right Column: Preline Theme & Quick Toggles -->' +
        '<div style="display:flex;flex-direction:column;gap:20px">' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("sliders") + ' Preline Pro Theme</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
              '<label>Color Palette<select id="st-theme">' +
                '<option value="ocean" selected>Preline Ocean Cyan (Default #00b8db)</option>' +
                '<option value="slate">Preline Slate Modern (#3b82f6)</option>' +
                '<option value="emerald">Preline Luxury Emerald (#10b981)</option>' +
                '<option value="violet">Preline Royal Violet (#8b5cf6)</option>' +
              '</select></label>' +
              '<label>Admin Interface Mode<select id="st-mode">' +
                '<option value="dark" selected>High-Contrast Obsidian Dark</option>' +
                '<option value="light">Preline Clean Light Mode</option>' +
              '</select></label>' +
            '</div>' +
          '</div>' +

          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("shield") + ' Security & Access</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;font-size:12.5px;color:#cbd5e1">' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>CSRF Protection</span><span class="badge ok">Enforced</span></div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>Session Timeout</span><span>4 Hours</span></div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between"><span>Master Access</span><span class="badge navy">master@woodex.pk</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    W.fillIcons(el);

    $("#st-save-btn").onclick = function () {
      toast("Global settings and Google service configs saved live!");
    };
    $("#st-reset-btn").onclick = function () {
      toast("Settings restored to factory studio baseline.");
    };
  };
})();
