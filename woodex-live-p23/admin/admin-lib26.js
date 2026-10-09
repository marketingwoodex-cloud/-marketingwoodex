/* Woodex Admin — Master Section Library (70 Templates Suite)
   Preline Ocean Pure Styling, Scaled Iframe Previews, Responsive Device Switcher,
   1-Click Copy HTML, Builder Insertion, and JSON Starter Pack Engine */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var esc = W.esc, ic = W.ic, bapi = W.bapi, toast = W.toast, $ = W.$, $$ = W.$$;
  var curCat = "All", curQ = "", curSkin = "";

  var SKINS = [["", "Original"], ["white", "White"], ["cream", "Cream"], ["navy", "Navy"]];
  var CSS = '<link rel="stylesheet" href="/assets/v1-p21.css"><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/site-p21.css"><style>html,body{margin:0;overflow:hidden;pointer-events:none;background:#fff}.t6-hero{min-height:720px}</style>';

  function loadTemplates() {
    return new Promise(function (resolve) {
      var p1 = window.WX_TEMPLATES ? Promise.resolve(window.WX_TEMPLATES) : new Promise(function (ok) {
        var s = document.createElement("script"); s.src = "/builder/templates-v26.js";
        s.onload = function () { ok(window.WX_TEMPLATES || []); };
        s.onerror = function () { ok([]); };
        document.head.appendChild(s);
      });
      var p2 = window.WX_BLOCKS ? Promise.resolve(window.WX_BLOCKS) : new Promise(function (ok) {
        var s2 = document.createElement("script"); s2.src = "/builder/blocks.js";
        s2.onload = function () { ok(window.WX_BLOCKS || []); };
        s2.onerror = function () { ok([]); };
        document.head.appendChild(s2);
      });

      Promise.all([p1, p2]).then(function (results) {
        var t26 = results[0] || [];
        var blk = (results[1] || []).map(function (b) {
          var autoCat = "Services";
          var id = b.id || "";
          if (/hero|banner/i.test(id + " " + b.name)) autoCat = "Hero";
          else if (/kitchen|cabinet/i.test(id + " " + b.name)) autoCat = "Kitchens";
          else if (/wardrobe|closet/i.test(id + " " + b.name)) autoCat = "Wardrobes";
          else if (/office|boardroom|commercial/i.test(id + " " + b.name)) autoCat = "Commercial";
          else if (/cta|action/i.test(id + " " + b.name)) autoCat = "CTA";
          else if (/split|card|grid|feature/i.test(id + " " + b.name)) autoCat = "Features";
          else if (/quote|testi/i.test(id + " " + b.name)) autoCat = "Testimonials";
          else if (/faq|accordion/i.test(id + " " + b.name)) autoCat = "FAQ";
          else if (/stat|counter|number/i.test(id + " " + b.name)) autoCat = "Stats";

          return {
            id: b.id || "blk-" + Math.random().toString(36).slice(2, 7),
            name: b.name || "Block",
            cat: b.cat || autoCat,
            icon: b.icon || "🧱",
            html: b.html || ""
          };
        });
        resolve(t26.concat(blk));
      });
    });
  }

  function applySkin(html, s) {
    if (!s || /class="[^"]*\b(t6-hero|hero)\b/.test(html.slice(0, 200))) return html;
    var t = document.createElement("template"); t.innerHTML = html.trim();
    var r = t.content.firstElementChild; if (!r) return html;
    r.classList.remove("wx-skin-white", "wx-skin-cream", "wx-skin-navy");
    if (r.classList.contains("t6")) { r.classList.remove("cream", "navy"); if (s !== "white") r.classList.add(s); }
    else r.classList.add("wx-skin-" + s);
    return t.innerHTML;
  }

  function frameDoc(html) {
    return "<!doctype html><html><head><meta charset='utf-8'>" + CSS + "</head><body><main>" + html + "</main></body></html>";
  }

  function downloadJson(filename, text) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function copyText(txt, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast(msg || "Copied to clipboard!"); });
    } else {
      var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      toast(msg || "Copied to clipboard!");
    }
  }

  function previewModal(t, html) {
    // one preview at a time: opening again replaces the open preview instead of stacking a second overlay
    document.querySelectorAll(".modal-overlay.pm-overlay").forEach(function (o) { o.remove(); });
    var m = document.createElement("div");
    m.className = "modal-overlay pm-overlay";
    m.innerHTML = '<div class="modal-card" style="max-width:1280px;width:96vw;height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden;background:#0b0d13;border:1px solid #20242f;box-shadow:0 24px 80px rgba(0,0,0,0.85)">' +
      '<div style="padding:12px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e2430;background:#111318;flex-wrap:wrap;gap:10px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:22px">' + esc(t.icon || "🧱") + '</span>' +
          '<div><b style="color:#f9fafb;font-size:15px">' + esc(t.name) + '</b><small style="display:block;color:#00d3f2;font-size:11.5px">' + esc(t.cat) + '</small></div>' +
        '</div>' +
        '<!-- Device Breakpoint Switcher -->' +
        '<div class="seg" id="pm-dev-bar" style="background:#0b0d13;border-color:#1e2430">' +
          '<button class="on" data-w="100%">' + ic("monitor") + 'Desktop</button>' +
          '<button data-w="768px">' + ic("smartphone") + 'Tablet</button>' +
          '<button data-w="375px">' + ic("smartphone") + 'Mobile</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="btn sm" id="pm-copy">' + ic("copy") + 'Copy HTML</button>' +
          '<a class="btn sm pri btn-preline-cyan" href="/builder/#insert=' + encodeURIComponent(t.id) + '">' + ic("plus") + 'Use in Builder</a>' +
          '<button class="icon-btn" id="pm-x">' + ic("x") + '</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;position:relative;background:#1e2430;display:flex;justify-content:center;align-items:stretch;overflow:hidden;padding:12px">' +
        '<div id="pm-frame-wrap" style="width:100%;height:100%;transition:width 0.25s ease;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.5)">' +
          '<iframe id="pm-frame" style="width:100%;height:100%;border:0" srcdoc="' + esc(frameDoc(html)) + '"></iframe>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(m);
    W.fillIcons(m);
    var close = function () { m.remove(); };
    m.querySelector("#pm-x").onclick = close;
    m.onclick = function (e) { if (e.target === m) close(); };
    m.querySelector("#pm-copy").onclick = function () { copyText(html, "Section HTML copied!"); };

    // Device switcher listeners
    $$("#pm-dev-bar button").forEach(function (btn) {
      btn.onclick = function () {
        $$("#pm-dev-bar button").forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        $("#pm-frame-wrap").style.width = btn.dataset.w;
      };
    });
  }

  W.VIEWS.library = function (el) {
    el.innerHTML = W.head("Section Library (70 Templates)", "Section Library",
      '<button class="btn" id="lib-exp-pack">' + ic("download") + 'Export starter pack (.json)</button>' +
      '<button class="btn" id="lib-imp-btn">' + ic("upload") + 'Import JSON</button>' +
      '<a class="btn pri btn-preline-cyan" href="/builder/">' + ic("square-pen") + 'Open Builder</a>') +

      '<div class="card" style="margin-bottom:20px;background:#111318;border:1px solid #20242f">' +
        '<div class="card-b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:14px 18px">' +
          '<div style="flex:1;min-width:240px;position:relative">' +
            '<input type="search" id="lib-q-inp" placeholder="Search 70 templates by name, keyword, category…" value="' + esc(curQ) + '" style="margin:0;width:100%;background:#181c24;border-color:#262a33">' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            '<small style="color:var(--mut);font-weight:600">Color Skin:</small>' +
            SKINS.map(function (s) {
              return '<button class="btn sm' + (curSkin === s[0] ? ' pri' : ' ghost') + '" data-skin="' + s[0] + '" style="padding:4px 10px;font-size:12px">' + s[1] + '</button>';
            }).join("") +
          '</div>' +
        '</div>' +
        '<div style="padding:0 18px 14px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none" id="lib-cats-bar"></div>' +
      '</div>' +

      '<div id="lib-grid-cards" class="lib-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:20px"></div>' +
      '<input type="file" id="lib-file-inp" accept=".json" hidden>';

    W.fillIcons(el);

    loadTemplates().then(function (templates) {
      var cats = ["All"];
      templates.forEach(function (t) {
        var c = t.cat || "Other";
        if (cats.indexOf(c) < 0) cats.push(c);
      });

      function renderCats() {
        var bar = $("#lib-cats-bar");
        if (!bar) return;
        bar.innerHTML = cats.map(function (c) {
          var count = c === "All" ? templates.length : templates.filter(function (t) { return t.cat === c; }).length;
          return '<button class="btn sm' + (curCat === c ? ' pri btn-preline-cyan' : ' ghost') + '" data-c="' + esc(c) + '" style="white-space:nowrap;border-radius:999px;font-size:12px;padding:4px 12px">' +
            esc(c) + ' <span class="pill" style="opacity:0.8;font-size:10.5px;margin-left:4px">' + count + '</span></button>';
        }).join("");

        $$("#lib-cats-bar [data-c]").forEach(function (btn) {
          btn.onclick = function () {
            curCat = btn.dataset.c;
            renderCats();
            renderCards();
          };
        });
      }

      function renderCards() {
        var grid = $("#lib-grid-cards");
        if (!grid) return;
        var q = curQ.toLowerCase();
        var list = templates.filter(function (t) {
          var mCat = (curCat === "All" || t.cat === curCat);
          var mQ = (!q || (t.name + " " + t.cat + " " + (t.id || "")).toLowerCase().indexOf(q) >= 0);
          return mCat && mQ;
        });

        if (!list.length) {
          grid.innerHTML = '<div class="empty" style="grid-column:1/-1;padding:60px 20px;text-align:center"><b style="color:#94a3b8">No templates match your search.</b><p class="muted">Try clearing your search query or picking another category.</p></div>';
          return;
        }

        grid.innerHTML = list.map(function (t, i) {
          var skinned = applySkin(t.html, curSkin);
          return '<div class="card lib-item" data-id="' + esc(t.id) + '" style="background:#111318;border:1px solid #20242f;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.25)">' +
            '<div style="padding:12px 14px;border-bottom:1px solid #1a1e27;display:flex;align-items:center;justify-content:space-between;background:#0d0f14">' +
              '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
                '<span style="font-size:16px;flex:none">' + esc(t.icon || "🧱") + '</span>' +
                '<b style="font-size:13.5px;color:#f9fafb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(t.name) + '">' + esc(t.name) + '</b>' +
              '</div>' +
              '<span class="badge" style="background:#1e293b;color:#38bdf8;font-size:11px;flex:none">' + esc(t.cat || "Section") + '</span>' +
            '</div>' +
            '<div class="lib-preview-box" data-idx="' + i + '" style="position:relative;height:220px;background:#fff;cursor:pointer;overflow:hidden" title="Click to view responsive preview">' +
              '<iframe loading="lazy" tabindex="-1" style="width:312.5%;height:687px;border:0;transform:scale(0.32);transform-origin:0 0;pointer-events:none" srcdoc="' + esc(frameDoc(skinned)) + '"></iframe>' +
            '</div>' +
            '<div style="padding:10px 12px;border-top:1px solid #1a1e27;display:flex;gap:8px;align-items:center;background:#111318;margin-top:auto">' +
              '<button class="btn sm" data-act="copy" data-idx="' + i + '" style="flex:1;font-size:12px">' + ic("copy") + 'Copy HTML</button>' +
              '<button class="btn sm pri btn-preline-cyan" data-act="use" data-idx="' + i + '" style="flex:1;font-size:12px">' + ic("square-pen") + 'Use in Page</button>' +
            '</div>' +
          '</div>';
        }).join("");

        W.fillIcons(grid);

        // Card action listeners
        $$("#lib-grid-cards .lib-preview-box").forEach(function (box) {
          box.onclick = function () {
            var idx = +box.dataset.idx;
            var t = list[idx];
            previewModal(t, applySkin(t.html, curSkin));
          };
        });

        $$('#lib-grid-cards [data-act="copy"]').forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation();
            var idx = +b.dataset.idx;
            var t = list[idx];
            copyText(applySkin(t.html, curSkin), "Copied '" + t.name + "' HTML!");
          };
        });

        $$('#lib-grid-cards [data-act="use"]').forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation();
            var idx = +b.dataset.idx;
            var t = list[idx];
            bapi("blocks_save", { name: t.name, cat: t.cat || "Custom", html: applySkin(t.html, curSkin), tags: [t.cat, "v26"] }).then(function (r) {
              if (r.ok) {
                toast("Saved to your page builder blocks!");
                location.href = "/builder/";
              } else {
                toast(r.error || "Save failed", true);
              }
            });
          };
        });
      }

      renderCats();
      renderCards();

      // Filter events
      $("#lib-q-inp").oninput = function () {
        curQ = this.value;
        renderCards();
      };

      $$("[data-skin]").forEach(function (b) {
        b.onclick = function () {
          curSkin = b.dataset.skin;
          $$("[data-skin]").forEach(function (x) { x.className = "btn sm" + (x.dataset.skin === curSkin ? " pri" : " ghost"); });
          renderCards();
        };
      });

      // Export starter pack
      $("#lib-exp-pack").onclick = function () {
        downloadJson("woodex-70-section-templates.json", JSON.stringify({
          woodexStarterPack: 1,
          count: templates.length,
          generated: new Date().toISOString(),
          templates: templates
        }, null, 2));
        toast("Downloaded 70 section starter pack!");
      };

      // Import starter pack
      var finp = $("#lib-file-inp");
      $("#lib-imp-btn").onclick = function () { finp.click(); };
      finp.onchange = function () {
        var f = finp.files && finp.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            var d = JSON.parse(r.result);
            var impList = d.templates || d.blocks || (Array.isArray(d) ? d : []);
            if (!impList.length) return toast("No valid templates found in JSON", true);
            var proms = impList.map(function (item) {
              return bapi("blocks_save", { name: item.name || "Imported block", cat: item.cat || "Custom", html: item.html || "", tags: item.tags || ["imported"] });
            });
            Promise.all(proms).then(function () {
              toast("Imported " + impList.length + " templates into Builder!");
              finp.value = "";
              renderCards();
            });
          } catch (e) {
            toast("Invalid JSON file", true);
          }
        };
        r.readAsText(f);
      };
    });
  };
})();
