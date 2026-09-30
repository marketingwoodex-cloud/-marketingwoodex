/* Woodex Admin — Phase 4: Header · Mega menu · Footer editor with live preview,
   Preview → Publish, and the last 10 published versions with one-click restore.
   Replaces the older "Main menu" view (Find & replace is kept). Owner/Admin only. */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, bapi = W.bapi, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, head = W.head;
  var A = function (s) { return esc(s == null ? "" : String(s)); };
  var arr = function (l) { return Array.prototype.slice.call(l || []); };
  var linkOf = function (a) { return { label: a.textContent.trim(), href: a.getAttribute("href") || "", route: a.getAttribute("data-page-route") || "", id: a.id || "", ext: a.getAttribute("target") === "_blank" }; };
  var aTag = function (l, cls) {
    return "<a" + (cls ? ' class="' + cls + '"' : "") + (l.id ? ' id="' + A(l.id) + '"' : "") + ' href="' + A(l.href) + '"' + (l.route ? ' data-page-route="' + A(l.route) + '"' : "") + (l.ext ? ' target="_blank" rel="noopener"' : "") + ">" + A(l.label) + "</a>";
  };

  // ------------------------------------------------------------------ parse home page → editable data
  function parse(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var nav = doc.querySelector("nav.desktop-nav"), mob = doc.querySelector("nav.mobile-panel"), foot = doc.querySelector("footer.footer"), brand = doc.querySelector("header a.brand"), cta = doc.querySelector(".header-cta-label");
    if (!nav || !mob || !foot || !brand) return null;
    var D = { v: 1, menu: { items: [], mobile: [] }, mega: null, header: {}, footer: {} };
    arr(nav.children).forEach(function (n) {
      if (n.tagName === "A") D.menu.items.push({ type: "link", label: n.textContent.trim(), href: n.getAttribute("href"), route: n.getAttribute("data-page-route") || "", id: n.id || "" });
      else if (n.classList.contains("nav-services")) {
        var trig = n.querySelector(".nav-services-trigger"), st = n.querySelector(".mega-studio"), pj = n.querySelector(".mega-project"), im = pj && pj.querySelector("img"), sp = pj && pj.querySelector("span");
        D.menu.items.push({ type: "mega", label: trig ? trig.childNodes[0].textContent.trim() : "Services" });
        D.mega = {
          cols: arr(n.querySelectorAll(".mega-column")).map(function (c) {
            var t = c.querySelector(".mega-title");
            return { title: t.textContent.trim(), href: t.getAttribute("href"), route: t.getAttribute("data-page-route") || "", links: arr(c.querySelectorAll("a")).filter(function (a) { return a !== t; }).map(linkOf) };
          }),
          studio: st ? linkOf(st) : { label: "", href: "" },
          card: { href: pj ? pj.getAttribute("href") : "/projects/", img: im ? im.getAttribute("src") : "", alt: im ? im.getAttribute("alt") : "", text: sp ? sp.textContent.trim() : "", w: im ? im.getAttribute("width") : "", h: im ? im.getAttribute("height") : "" }
        };
      }
    });
    arr(mob.querySelectorAll("a")).forEach(function (a) { D.menu.mobile.push({ label: a.textContent.trim(), href: a.getAttribute("href"), primary: a.classList.contains("mobile-primary") }); });
    var bi = brand.querySelector("img"), wm = brand.querySelector(".brand-wordmark"), sm = wm && wm.querySelector("small");
    D.header = { logo: bi ? bi.getAttribute("src") : "", lw: bi ? bi.getAttribute("width") : "", lh: bi ? bi.getAttribute("height") : "", word: wm ? wm.childNodes[0].textContent.trim() : "", small: sm ? sm.textContent.trim() : "", aria: brand.getAttribute("aria-label") || "", cta: cta ? cta.textContent.trim() : "Get a quote" };
    var h2 = foot.querySelector("#footer-heading"), fp = foot.querySelector("#footer-copy"), fc = foot.querySelector("#footer-cta"), ct = foot.querySelector(".footer-contact");
    var tels = [], email = "", wa = { label: "", href: "" };
    arr(ct ? ct.querySelectorAll("a") : []).forEach(function (a) { var h = a.getAttribute("href") || ""; if (/^mailto:/.test(h)) email = h.slice(7); else if (/wa\.me/.test(h)) wa = { label: a.textContent.trim(), href: h }; else if (/^tel:/.test(h)) tels.push(a.textContent.trim()); });
    var bot = foot.querySelector(".footer-bottom");
    D.footer = {
      heading: h2 ? h2.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "") : "", copy: fp ? fp.textContent.trim() : "", ctaLabel: fc ? fc.textContent.trim() : "", ctaHref: fc ? fc.getAttribute("href") : "/contact/",
      cols: arr(foot.querySelectorAll("nav.footer-column")).map(function (n) { var t = n.querySelector("h3"); return { title: t ? t.textContent.trim() : "", links: arr(n.querySelectorAll("a")).map(linkOf) }; }),
      contact: { title: ct && ct.querySelector("h3") ? ct.querySelector("h3").textContent.trim() : "Get in touch", email: email, waLabel: wa.label, waHref: wa.href, tels: tels.join("\n"),
        address: ct && ct.querySelector("address") ? ct.querySelector("address").innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() : "", hours: ct && ct.querySelector("p") ? ct.querySelector("p").textContent.trim() : "" },
      word: (foot.querySelector(".footer-word") || {}).textContent || "",
      copyright: bot && bot.querySelector("span") ? bot.querySelector("span").textContent.trim() : "",
      bottom: arr(bot ? bot.querySelectorAll("div a") : []).map(linkOf),
      introAll: false
    };
    return D;
  }

  // ------------------------------------------------------------------ build HTML from data
  function build(D) {
    var M = D.menu, G = D.mega, H = D.header, F = D.footer;
    var megaHtml = function (label) {
      return '      <div class="nav-services">\n        <button class="nav-services-trigger" type="button" aria-expanded="false" aria-controls="services-menu">' + A(label) + ' <span aria-hidden="true">⌄</span></button>\n        <div class="mega-menu" id="services-menu"' + (G.cols.length !== 4 ? ' data-cols="' + G.cols.length + '"' : "") + ">\n" +
        G.cols.map(function (c, ci) { return '          <div class="mega-column"><span class="mega-number">' + String(ci + 1).padStart(2, "0") + '</span><a class="mega-title" href="' + A(c.href) + '"' + (c.route ? ' data-page-route="' + A(c.route) + '"' : "") + ">" + A(c.title) + "</a>" + c.links.map(function (l) { return aTag(l); }).join("") + "</div>\n"; }).join("") +
        '          <div class="mega-feature">' + (G.studio.label ? aTag(G.studio, "mega-studio") : "") + '<a class="mega-project" href="' + A(G.card.href) + '"><img loading="lazy" decoding="async" src="' + A(G.card.img) + '" alt="' + A(G.card.alt) + '"' + (G.card.w ? ' width="' + A(G.card.w) + '" height="' + A(G.card.h) + '"' : "") + "><span>" + A(G.card.text) + "</span></a></div>\n        </div>\n      </div>";
    };
    var desktop = '<nav class="desktop-nav" aria-label="Page navigation">\n' + M.items.map(function (it) {
      return it.type === "mega" ? megaHtml(it.label) : "      " + aTag(it);
    }).join("\n") + "\n    </nav>";
    var mobile = '<nav class="mobile-panel" id="mobile-menu" aria-label="Mobile navigation">' + M.mobile.map(function (l) { return "<a" + (l.primary ? ' class="mobile-primary"' : "") + ' href="' + A(l.href) + '">' + A(l.label) + "</a>"; }).join("") + "</nav>";
    var brand = '<a class="brand" href="/" data-page-route="home" aria-label="' + A(H.aria || "Woodex Interior home") + '"><img class="brand-mark" src="' + A(H.logo) + '" alt=""' + (H.lw ? ' width="' + A(H.lw) + '" height="' + A(H.lh) + '"' : "") + '><span class="brand-divider" aria-hidden="true"></span><span class="brand-wordmark">' + A(H.word) + (H.small ? " <small>" + A(H.small) + "</small>" : "") + "</span></a>";
    var C = F.contact, nl = function (s) { return String(s || "").split("\n").map(function (x) { return A(x.trim()); }).filter(Boolean).join("<br>"); };
    var footer = '<footer class="footer"><div class="wrap">\n    <div class="footer-main">\n      <div class="footer-intro"><h2 id="footer-heading">' + nl(F.heading) + '</h2><p id="footer-copy">' + A(F.copy) + '</p><a class="btn footer-cta" id="footer-cta" href="' + A(F.ctaHref) + '">' + A(F.ctaLabel) + "</a></div>\n" +
      F.cols.map(function (c) { return '      <nav class="footer-column" aria-label="' + A(c.title) + ' links"><h3>' + A(c.title) + "</h3>" + c.links.map(function (l) { return aTag(l); }).join("") + "</nav>\n"; }).join("") +
      '      <div class="footer-column footer-contact"><h3>' + A(C.title) + "</h3>" + (C.email ? '<a href="mailto:' + A(C.email) + '">' + A(C.email) + "</a>" : "") + (C.waHref ? '<a href="' + A(C.waHref) + '">' + A(C.waLabel || "WhatsApp") + "</a>" : "") +
      String(C.tels || "").split("\n").map(function (t) { t = t.trim(); return t ? '<a href="tel:' + A(t.replace(/[^\d+]/g, "")) + '">' + A(t) + "</a>" : ""; }).join("") +
      (C.address ? "<address>" + nl(C.address) + "</address>" : "") + (C.hours ? "<p><strong>" + A(C.hours) + "</strong></p>" : "") + "</div>\n    </div>\n" +
      (F.word.trim() ? '    <div class="footer-word" aria-label="' + A(F.word.trim()) + '">' + A(F.word.trim()) + "</div>\n" : "") +
      '    <div class="footer-bottom"><span>' + A(F.copyright) + "</span><div>" + F.bottom.map(function (l) { return aTag(l); }).join("") + "</div></div>\n  </div></footer>";
    return { desktop: desktop, mobile: mobile, brand: brand, cta: H.cta, footer: footer };
  }

  // ------------------------------------------------------------------ validation
  function problems(D) {
    var bad = [], chk = function (l, where) { if (!String(l.label || "").trim() || !String(l.href || "").trim()) bad.push(where); };
    D.menu.items.forEach(function (it, i) { if (it.type === "link") chk(it, "Header menu link " + (i + 1)); else if (!String(it.label).trim()) bad.push("Mega menu button name"); });
    D.menu.mobile.forEach(function (l, i) { chk(l, "Mobile menu link " + (i + 1)); });
    if (D.mega) {
      if (D.mega.cols.length < 2 || D.mega.cols.length > 5) bad.push("Mega menu needs 2–5 columns");
      D.mega.cols.forEach(function (c, ci) { chk({ label: c.title, href: c.href }, "Mega column " + (ci + 1) + " heading"); c.links.forEach(function (l, li) { chk(l, "Mega column " + (ci + 1) + " link " + (li + 1)); }); });
      if (!D.mega.card.img) bad.push("Mega feature card image");
    }
    if (!D.header.logo) bad.push("Logo image");
    if (!String(D.header.cta).trim()) bad.push("Header button text");
    D.footer.cols.forEach(function (c, ci) { c.links.forEach(function (l, li) { chk(l, "Footer column " + (ci + 1) + " link " + (li + 1)); }); });
    D.footer.bottom.forEach(function (l, i) { chk(l, "Footer bottom link " + (i + 1)); });
    return bad;
  }

  // ------------------------------------------------------------------ view
  W.VIEWS.global = function (el) {
    el.innerHTML = head("Header & footer", "Header & footer") +
      '<div class="toolbar" style="margin-bottom:18px;flex-wrap:wrap"><button class="btn pri" data-gt="header">Header</button><button class="btn" data-gt="mega">Mega menu</button><button class="btn" data-gt="footer">Footer</button><button class="btn" data-gt="versions">' + ic("history") + 'Versions</button><button class="btn" data-gt="replace">Find & replace</button>' +
      '<span style="margin-left:auto;display:flex;gap:8px"><button class="btn" id="hf-discard">Discard changes</button><button class="btn pri" id="hf-publish">' + ic("upload") + 'Publish to all pages</button></span></div>' +
      '<div id="hf-wrap" style="display:grid;grid-template-columns:minmax(360px,1fr) minmax(420px,1.25fr);gap:20px;align-items:start"><div id="hf-body"><div class="empty">Loading…</div></div>' +
      '<div class="card" id="hf-prev" style="position:sticky;top:12px"><div class="card-h"><h3>Live preview</h3><span class="toolbar"><button class="btn sm pri" data-dev="d">Desktop</button><button class="btn sm" data-dev="m">Mobile</button><button class="btn sm" id="hf-mega">Show mega menu</button><button class="btn sm" id="hf-foot">Jump to footer</button></span></div>' +
      '<div class="card-b" style="padding:10px;background:var(--bg)"><div id="hf-frame-box" style="overflow:hidden;border-radius:10px;height:640px;position:relative"><iframe id="hf-frame" src="/" title="Preview" style="border:0;background:#fff;transform-origin:0 0"></iframe></div><p class="muted" style="margin:8px 0 0;font-size:12px">Preview only — nothing is live until you press <b>Publish</b>.</p></div></div></div>';
    W.fillIcons && W.fillIcons(el);
    var body = $("#hf-body"), frame = $("#hf-frame"), box = $("#hf-frame-box"), tab = "header", dev = "d", D = null, orig = "", S = W.S || {};
    var pagesDl = function () { return "<datalist id='hf-pages'>" + ((W.S && W.S.pages) || []).map(function (p) { return "<option value='" + A(p.url) + "'>" + A(p.title) + "</option>"; }).join("") + "</datalist>"; };

    // ---- preview
    var size = function () {
      var w = box.clientWidth, vw = dev === "d" ? 1366 : 390, sc = Math.min(1, w / vw);
      frame.style.width = vw + "px"; frame.style.height = 640 / sc + "px"; frame.style.transform = "scale(" + sc + ")";
      if (dev === "m") { frame.style.marginLeft = Math.max(0, (w - vw) / 2) + "px"; } else frame.style.marginLeft = "0";
    };
    var fdoc = function () { try { return frame.contentDocument; } catch (e) { return null; } };
    var swap = function (d, sel, html) { var n = d.querySelector(sel); if (!n) return; var t = d.createElement("div"); t.innerHTML = html; if (t.firstElementChild) n.replaceWith(t.firstElementChild); };
    var timer = 0;
    var paint = function () {
      clearTimeout(timer); timer = setTimeout(function () {
        var d = fdoc(); if (!d || !D || !d.querySelector("footer.footer")) return;
        var h = build(D), mOpen = !!d.querySelector(".mega-menu.open");
        swap(d, "nav.desktop-nav", h.desktop); swap(d, "nav.mobile-panel", h.mobile); swap(d, "header a.brand", h.brand); swap(d, "footer.footer", h.footer);
        var l = d.querySelector(".header-cta-label"); if (l) l.textContent = h.cta;
        if (mOpen || tab === "mega") { var mm = d.querySelector(".mega-menu"); if (mm) mm.classList.add("open"); }
        var cb = d.getElementById("menu-cb"); if (cb) cb.checked = dev === "m" && (tab === "header");
      }, 120);
    };
    frame.addEventListener("load", function () { size(); paint(); });
    window.addEventListener("resize", size);
    $$("[data-dev]").forEach(function (b) { b.onclick = function () { dev = b.dataset.dev; $$("[data-dev]").forEach(function (x) { x.classList.toggle("pri", x === b); }); size(); paint(); }; });
    $("#hf-mega").onclick = function () { var d = fdoc(), mm = d && d.querySelector(".mega-menu"); if (mm) { mm.classList.toggle("open"); d.defaultView.scrollTo(0, 0); } };
    $("#hf-foot").onclick = function () { var d = fdoc(), f = d && d.querySelector("footer.footer"); if (f) f.scrollIntoView(); };

    // ---- field helpers
    var inp = function (p, v, ph, extra) { return "<input data-p='" + p + "' value='" + A(v) + "' placeholder='" + A(ph || "") + "' " + (extra || "") + " style='margin:0'>"; };
    var area = function (p, v, rows) { return "<textarea data-p='" + p + "' rows='" + (rows || 3) + "' style='margin:0'>" + A(v) + "</textarea>"; };
    var fld = function (label, html) { return "<label style='display:block;margin-bottom:10px'><small class='muted'>" + label + "</small>" + html + "</label>"; };
    var ctl = function (p) { return "<span style='display:flex;gap:4px'><button class='btn sm' data-mv='" + p + "|-1' title='Move up'>↑</button><button class='btn sm' data-mv='" + p + "|1' title='Move down'>↓</button><button class='btn sm danger' data-rm='" + p + "' title='Remove'>✕</button></span>"; };
    var row = function (p, o, extra) { return "<div style='display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;margin-bottom:6px'>" + inp(p + ".label", o.label, "Label") + inp(p + ".href", o.href, "/page/", "list='hf-pages'") + "<span style='display:flex;gap:4px;align-items:center'>" + (extra || "") + ctl(p) + "</span></div>"; };
    var card = function (title, inner, btn) { return '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>' + title + "</h3>" + (btn || "") + '</div><div class="card-b">' + inner + "</div></div>"; };
    var addBtn = function (id, label) { return "<button class='btn sm' data-add='" + id + "'>" + ic("plus") + (label || "Link") + "</button>"; };
    var imgPick = function (p, v) { return "<div style='display:flex;gap:8px;align-items:center'>" + (v ? "<img src='" + A(v) + "' style='width:64px;height:44px;object-fit:cover;border-radius:6px;background:#eee'>" : "") + inp(p, v, "/assets/img/…") + "<button class='btn sm' data-pick='" + p + "'>" + ic("image") + "Choose</button></div>"; };

    var draw = function () {
      if (tab === "replace") { $("#hf-wrap").style.gridTemplateColumns = "1fr"; $("#hf-prev").style.display = "none"; return W.replaceTool ? W.replaceTool(body) : (body.innerHTML = '<div class="empty">Find & replace is unavailable.</div>'); }
      $("#hf-wrap").style.gridTemplateColumns = ""; $("#hf-prev").style.display = "";
      if (!D) return;
      var h = pagesDl();
      if (tab === "header") {
        h += card("Logo", fld("Logo image", imgPick("header.logo", D.header.logo)) + "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>" + fld("Name", inp("header.word", D.header.word)) + fld("Small text", inp("header.small", D.header.small)) + "</div>");
        h += card("Header button", fld("Button text (each page keeps its own button link)", inp("header.cta", D.header.cta, "Get a quote", "maxlength='40'")));
        h += card("Menu links", D.menu.items.map(function (it, i) {
          if (it.type === "mega") return "<div style='display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;margin-bottom:6px'><span class='badge gold'>Mega menu</span>" + inp("menu.items." + i + ".label", it.label, "Services") + "<span style='display:flex;gap:4px'><button class='btn sm' data-mv='menu.items." + i + "|-1'>↑</button><button class='btn sm' data-mv='menu.items." + i + "|1'>↓</button><button class='btn sm' data-go='mega'>Edit</button></span></div>";
          return row("menu.items." + i, it);
        }).join(""), addBtn("menu.items"));
        h += card("Mobile menu", D.menu.mobile.map(function (l, i) { return row("menu.mobile." + i, l, "<label class='check' style='margin:0 4px 0 0;font-size:12px' title='Show as the gold button (keeps each page’s own link)'><input type='checkbox' data-pc='menu.mobile." + i + ".primary'" + (l.primary ? " checked" : "") + ">Button</label>"); }).join(""), addBtn("menu.mobile"));
      } else if (tab === "mega") {
        if (!D.mega) h += '<div class="empty">This site has no mega menu.</div>';
        else {
          h += '<p class="muted" style="margin:0 0 12px">' + D.mega.cols.length + " of 5 columns · minimum 2. The preview keeps the mega menu open while you edit.</p>";
          h += D.mega.cols.map(function (c, ci) {
            var b = "mega.cols." + ci;
            return card("Column " + (ci + 1), "<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px'>" + inp(b + ".title", c.title, "Heading") + inp(b + ".href", c.href, "/page/", "list='hf-pages'") + "</div>" + c.links.map(function (l, li) { return row(b + ".links." + li, l); }).join("") + addBtn(b + ".links"),
              "<span style='display:flex;gap:4px'><button class='btn sm' data-mv='mega.cols." + ci + "|-1'>←</button><button class='btn sm' data-mv='mega.cols." + ci + "|1'>→</button>" + (D.mega.cols.length > 2 ? "<button class='btn sm danger' data-rm='mega.cols." + ci + "'>Remove column</button>" : "") + "</span>");
          }).join("");
          if (D.mega.cols.length < 5) h += "<button class='btn' data-add='mega.cols' style='margin-bottom:16px'>" + ic("plus") + "Add column</button>";
          h += card("Feature card", "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>" + fld("Top link text", inp("mega.studio.label", D.mega.studio.label)) + fld("Top link address", inp("mega.studio.href", D.mega.studio.href, "", "list='hf-pages'")) + "</div>" +
            fld("Image", imgPick("mega.card.img", D.mega.card.img)) + fld("Image description (alt)", inp("mega.card.alt", D.mega.card.alt)) +
            "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>" + fld("Caption", inp("mega.card.text", D.mega.card.text)) + fld("Card link", inp("mega.card.href", D.mega.card.href, "", "list='hf-pages'")) + "</div>");
        }
      } else if (tab === "footer") {
        var F = D.footer;
        h += card("Intro", fld("Heading (new line = line break)", area("footer.heading", F.heading, 2)) + fld("Text", area("footer.copy", F.copy, 2)) + "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>" + fld("Button text", inp("footer.ctaLabel", F.ctaLabel)) + fld("Button link", inp("footer.ctaHref", F.ctaHref, "", "list='hf-pages'")) + "</div>" +
          "<label class='check'><input type='checkbox' data-pc='footer.introAll'" + (F.introAll ? " checked" : "") + "> Use this intro on <b>all</b> pages <span class='muted'>(off = service pages keep their own heading &amp; button)</span></label>");
        h += F.cols.map(function (c, ci) { var b = "footer.cols." + ci; return card("Column " + (ci + 1), fld("Title", inp(b + ".title", c.title)) + c.links.map(function (l, li) { return row(b + ".links." + li, l, l.id ? "<span class='badge' title='Points to a section on each page'>auto</span>" : ""); }).join("") + addBtn(b + ".links")); }).join("");
        var C = F.contact;
        h += card("Contact", fld("Title", inp("footer.contact.title", C.title)) + "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>" + fld("Email", inp("footer.contact.email", C.email)) + fld("WhatsApp link", inp("footer.contact.waHref", C.waHref, "https://wa.me/92…")) + "</div>" +
          fld("WhatsApp text", inp("footer.contact.waLabel", C.waLabel)) + fld("Phone numbers (one per line)", area("footer.contact.tels", C.tels, 2)) + fld("Address (one line each)", area("footer.contact.address", C.address, 3)) + fld("Hours", inp("footer.contact.hours", C.hours)));
        h += card("Bottom bar", fld("Big word", inp("footer.word", F.word, "INTERIORS")) + fld("Copyright", inp("footer.copyright", F.copyright)) + F.bottom.map(function (l, i) { return row("footer.bottom." + i, l, "<label class='check' style='margin:0 4px 0 0;font-size:12px'><input type='checkbox' data-pc='footer.bottom." + i + ".ext'" + (l.ext ? " checked" : "") + ">New tab</label>"); }).join("") + addBtn("footer.bottom"));
      } else if (tab === "versions") {
        h += '<div class="card"><div class="card-h"><h3>Published versions</h3><small class="muted">last 10</small></div><div class="card-b" id="hf-vers"><div class="empty">Loading…</div></div></div>';
        body.innerHTML = h; loadVersions(); return;
      }
      body.innerHTML = h; W.fillIcons && W.fillIcons(body); paint();
    };

    // ---- state editing
    var get = function (p) { return p.split(".").reduce(function (o, k) { return o[k]; }, D); };
    var parent = function (p) { var a = p.split("."), k = +a.pop(); return { arr: get(a.join(".")), k: k }; };
    body.addEventListener("input", function (e) { var p = e.target.dataset.p; if (p && D) { var a = p.split("."), k = a.pop(); get(a.join("."))[k] = e.target.value; paint(); } });
    body.addEventListener("change", function (e) { var p = e.target.dataset.pc; if (p && D) { var a = p.split("."), k = a.pop(); get(a.join("."))[k] = e.target.checked; paint(); } if (e.target.dataset.p && /\.(logo|img)$/.test(e.target.dataset.p)) draw(); });
    body.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || !D) return;
      if (b.dataset.mv) { var q = b.dataset.mv.split("|"), o = parent(q[0]), to = o.k + +q[1]; if (to < 0 || to >= o.arr.length) return; o.arr.splice(to, 0, o.arr.splice(o.k, 1)[0]); draw(); }
      else if (b.dataset.rm) { var o2 = parent(b.dataset.rm); if (o2.arr[o2.k] && o2.arr[o2.k].type === "mega") return; o2.arr.splice(o2.k, 1); draw(); }
      else if (b.dataset.go) { setTab(b.dataset.go); }
      else if (b.dataset.add) {
        var t = get(b.dataset.add);
        if (b.dataset.add === "mega.cols") { if (t.length < 5) t.push({ title: "New column", href: "/", route: "", links: [{ label: "New link", href: "/" }] }); }
        else if (b.dataset.add === "menu.items") t.push({ type: "link", label: "New link", href: "/" });
        else if (b.dataset.add === "menu.mobile") t.splice(Math.max(0, t.length - 1), 0, { label: "New link", href: "/" });
        else t.push({ label: "New link", href: "/" });
        draw();
      } else if (b.dataset.pick) {
        var p = b.dataset.pick, set = function (url) { var a = p.split("."), k = a.pop(); get(a.join("."))[k] = url; draw(); };
        if (W.pickImage) W.pickImage(set); else { var u = prompt("Image address (e.g. /assets/img/…)", get(p)); if (u) set(u.trim()); }
      }
    });

    // ---- tabs
    var setTab = function (t) { tab = t; $$("[data-gt]").forEach(function (x) { x.classList.toggle("pri", x.dataset.gt === t); }); var d = fdoc(), mm = d && d.querySelector(".mega-menu"); if (mm && t !== "mega") mm.classList.remove("open"); if (t === "footer") { var f = d && d.querySelector("footer.footer"); if (f) f.scrollIntoView(); } else if (d) d.defaultView.scrollTo(0, 0); draw(); };
    $$("[data-gt]").forEach(function (b) { b.onclick = function () { setTab(b.dataset.gt); }; });

    // ---- versions
    var loadVersions = function () {
      api("chrome_versions", {}).then(function (r) {
        var v = (r && r.versions) || [], el2 = $("#hf-vers"); if (!el2) return;
        el2.innerHTML = v.length ? v.map(function (x, i) { return "<div style='display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)'><div style='flex:1'><b>" + A(x.note || "Published") + "</b>" + (i === 0 ? " <span class='badge green'>live</span>" : "") + "<br><small class='muted'>" + new Date(x.t * 1000).toLocaleString() + (x.by ? " · " + A(x.by) : "") + "</small></div><button class='btn sm' data-restore='" + i + "'>Load into editor</button></div>"; }).join("") : '<div class="empty">No versions yet — the current header &amp; footer is saved as “Original” on your first publish.</div>';
        $$("[data-restore]", el2).forEach(function (b) { b.onclick = function () { D = JSON.parse(JSON.stringify(v[+b.dataset.restore].data)); toast("Version loaded — check the preview, then press Publish to restore it"); setTab("header"); }; });
      });
    };

    // ---- publish
    $("#hf-discard").onclick = function () { if (D && JSON.stringify(D) !== orig && !confirm("Discard all unpublished changes?")) return; D = JSON.parse(orig); draw(); };
    $("#hf-publish").onclick = function () {
      if (!D) return; var bad = problems(D);
      if (bad.length) return toast("Please fix: " + bad.slice(0, 3).join(", ") + (bad.length > 3 ? "…" : ""), true);
      if (JSON.stringify(D) === orig) return toast("No changes to publish");
      var note = prompt("Publish header, mega menu and footer to all pages?\nEvery page is backed up first.\n\nShort note for this version (optional):", "");
      if (note === null) return;
      var btn = $("#hf-publish"); btn.disabled = true; btn.textContent = "Publishing…";
      var h = build(D), first = Promise.resolve();
      first = api("chrome_versions", {}).then(function (r) { if (r && r.ok && !(r.versions || []).length) return api("chrome_save", { data: JSON.parse(orig), note: "Original (before first publish)" }); });
      first.then(function () { return api("global_menu", { desktop: h.desktop, mobile: h.mobile }); })
        .then(function (x) { if (!x.ok) throw new Error(x.error); return api("global_chrome", { brand: h.brand, cta_label: h.cta, footer: h.footer, intro_all: !!D.footer.introAll }); })
        .then(function (x) { if (!x.ok) throw new Error(x.error); return api("chrome_save", { data: D, note: note || "Published" }).then(function () { return x; }); })
        .then(function (x) { orig = JSON.stringify(D); toast("Published to " + x.changed + " pages ✓"); })
        .catch(function (e) { toast(e.message || "Publish failed", true); })
        .then(function () { btn.disabled = false; btn.innerHTML = ic("upload") + "Publish to all pages"; W.fillIcons && W.fillIcons(btn.parentNode); });
    };

    bapi("load", { path: "index.html" }).then(function (r) {
      if (!r.ok) return (body.innerHTML = '<div class="empty">' + A(r.error || "Could not load") + "</div>");
      D = parse(r.html); if (!D) return (body.innerHTML = '<div class="empty">This site’s header/footer structure was not found.</div>');
      orig = JSON.stringify(D);
      var start = location.hash.split("/")[2]; if (/^(header|mega|footer|versions)$/.test(start || "")) return setTab(start);
      draw();
    });
    window.addEventListener("beforeunload", function (e) { if (D && orig && JSON.stringify(D) !== orig && document.body.contains(body)) { e.preventDefault(); e.returnValue = ""; } });
  };
})();
