/* Woodex WhatsApp widget v2 (Phase 8).
 * Floating button on every public page → panel with office-hours status, a service picker (pre-selected from the page),
 * quick intents, optional name + phone and a message. Sending opens WhatsApp (wa.me) with a complete, prefilled message.
 * If name + phone are given the enquiry is also saved in Admin → Enquiries (source “WhatsApp widget”), so no lead is lost.
 * An anonymous click counter (page + service, no personal data) feeds Admin → Enquiries → WhatsApp stats.
 * Number: studio default below (Business info updates it) or window.WOODEX_CONFIG.whatsapp. Per-page greeting:
 * <body data-wa-msg="…"> or window.WOODEX_CONFIG.waMessage. Disable: window.WOODEX_CONFIG.whatsapp_widget = false. */
(function () {
  "use strict";
  if (window.__wxWaWidget) return;
  window.__wxWaWidget = true;

  var DEFAULT_NUMBER = "923224000768";
  var SERVICES = [
    ["Interior design", /interior|bedroom|living|kitchen|bath|dining|lounge|wardrobe|home|residential|apartment|villa/],
    ["Renovation", /renovat|remodel|makeover/],
    ["Fit-out", /fit-?out|office|retail|shop|restaurant|cafe|clinic|salon|showroom|commercial/],
    ["Turnkey", /turnkey|design-build/],
    ["Architecture", /architect|elevation|planning|house-design|construction/],
    ["3D visualization", /3d|visuali|render/],
    ["Furniture", /furniture/]
  ];
  var INTENTS = [["Get a quote", "I would like a quotation."], ["Book a site visit", "I would like to book a site visit."], ["Ask a question", "I have a question."]];

  function el(tag, cls, html) { var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function post(body) { try { return fetch("/api/forms.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(function () {}); } catch (e) { return null; } }
  // Office hours: Mon–Sat 9:30–18:30 Pakistan time (UTC+5, no DST)
  function officeOpen() { var d = new Date(Date.now() + 5 * 36e5), day = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes(); return day !== 0 && m >= 570 && m < 1110; }

  function init() {
    var cfg = window.WOODEX_CONFIG || {};
    if (cfg.whatsapp_widget === false || location.pathname.indexOf("/admin") === 0 || location.pathname.indexOf("/builder") === 0) return;
    var number = String(cfg.whatsapp || DEFAULT_NUMBER).replace(/\D/g, "") || DEFAULT_NUMBER;
    var path = location.pathname.toLowerCase(), pageSvc = "";
    SERVICES.some(function (s) { if (s[1].test(path)) { pageSvc = s[0]; return true; } return false; });
    var title = (document.querySelector("h1") || {}).textContent || document.title.split("|")[0];
    title = String(title).replace(/\s+/g, " ").trim().slice(0, 80);
    var greet = document.body.getAttribute("data-wa-msg") || cfg.waMessage || (pageSvc ? "Assalam-o-Alaikum! Planning " + pageSvc.toLowerCase() + "? Tell us about your space and we’ll help." : "Assalam-o-Alaikum! Tell us about your space and we will take it from there.");
    var open = officeOpen();

    var css = [
      ".wx-wa{position:fixed;right:18px;bottom:18px;z-index:9990;font-family:inherit}",
      ".wx-wa-btn{width:58px;height:58px;padding:0!important;min-width:0!important;border-radius:50%;border:0;background:#25d366;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 26px rgba(37,211,102,.38);position:relative}",
      ".wx-wa-btn svg{flex:none;width:30px!important;height:30px!important;fill:#fff!important;display:block}",
      ".wx-wa-btn:hover{transform:scale(1.05)}.wx-wa-dot{position:absolute;top:3px;right:3px;width:12px;height:12px;border-radius:50%;background:#b8956a;border:2px solid #fff}",
      ".wx-wa-panel{position:fixed;right:18px;bottom:88px;width:340px;max-width:calc(100vw - 24px);max-height:calc(100vh - 110px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(12,22,40,.25);z-index:9991;display:none;font-family:inherit;color:#0c1628}",
      ".wx-wa-panel.open{display:block;animation:wxwa .22s ease}@keyframes wxwa{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
      ".wx-wa-head{background:#075e54;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}",
      ".wx-wa-av{width:38px;height:38px;border-radius:50%;background:#fff;color:#0c1628;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex:none}",
      ".wx-wa-head .t{font-weight:700;font-size:15px;line-height:1.2}.wx-wa-head .s{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px}",
      ".wx-wa-head .s i{width:8px;height:8px;border-radius:50%;background:" + (open ? "#4ade80" : "#fbbf24") + ";display:inline-block}",
      ".wx-wa-x{margin-left:auto;background:none!important;border:0!important;color:#fff!important;font-size:22px;cursor:pointer;line-height:1;padding:0 4px!important;min-width:0!important}",
      ".wx-wa-body{padding:14px;background:#efeae2}",
      ".wx-wa-msg{background:#fff;border-radius:0 10px 10px 10px;padding:10px 12px;font-size:14px;line-height:1.5;box-shadow:0 1px 1px rgba(0,0,0,.08);margin-bottom:12px}",
      ".wx-wa-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#54656f;margin:0 0 6px}",
      ".wx-wa-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}",
      ".wx-wa-chip{border:1px solid #c9d1d6!important;background:#fff!important;color:#0c1628!important;border-radius:999px!important;padding:6px 11px!important;font-size:12.5px!important;cursor:pointer;min-width:0!important;line-height:1.3!important}",
      ".wx-wa-chip.on{background:#075e54!important;border-color:#075e54!important;color:#fff!important}",
      ".wx-wa-in{width:100%;box-sizing:border-box;border:1px solid #d5dbe0;border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;outline:none;background:#fff;color:#0c1628;margin:0 0 8px}",
      ".wx-wa-in:focus{border-color:#075e54}.wx-wa-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      "textarea.wx-wa-in{resize:vertical;min-height:64px}",
      ".wx-wa-send{width:100%;border:0!important;border-radius:999px!important;background:#25d366!important;color:#fff!important;font-weight:700;font-size:15px;padding:12px!important;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}",
      ".wx-wa-send svg{width:18px;height:18px;fill:#fff}",
      ".wx-wa-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}",
      ".wx-wa-foot{padding:8px 14px 12px;background:#efeae2;font-size:11px;color:#667781;text-align:center}"
    ].join("\n");
    document.head.appendChild(el("style", null, css));

    var waGlyph = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 2 6.5L4 29l7.7-2c1.8 1 3.9 1.6 6.1 1.6h.2c6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.6 1.2 1.2-4.4-.3-.4c-1-1.6-1.6-3.5-1.6-5.5 0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10.8-9 10.8zm5.5-7.5c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4z"/></svg>';
    var sendGlyph = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l18-8L3 4v6l12 2-12 2v6z"/></svg>';

    var wrap = el("div", "wx-wa"), btn = el("button", "wx-wa-btn", waGlyph + '<span class="wx-wa-dot" aria-hidden="true"></span>');
    btn.type = "button"; btn.setAttribute("aria-label", "Chat with Woodex on WhatsApp"); btn.setAttribute("aria-expanded", "false"); wrap.appendChild(btn);

    var panel = el("div", "wx-wa-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "WhatsApp chat with Woodex");
    panel.innerHTML =
      '<div class="wx-wa-head"><span class="wx-wa-av">W</span><div><div class="t">Woodex Interior</div><div class="s"><i></i>' + (open ? "Online · usually replies in minutes" : "Away · we reply from 9:30 am (Mon–Sat)") + '</div></div><button type="button" class="wx-wa-x" aria-label="Close chat">&times;</button></div>' +
      '<div class="wx-wa-body"><div class="wx-wa-msg">' + esc(greet) + '</div>' +
      '<span class="wx-wa-lbl">Service</span><div class="wx-wa-chips" data-g="svc">' + SERVICES.map(function (s) { return '<button type="button" class="wx-wa-chip' + (s[0] === pageSvc ? " on" : "") + '" data-v="' + esc(s[0]) + '">' + esc(s[0]) + "</button>"; }).join("") + "</div>" +
      '<span class="wx-wa-lbl">I would like to</span><div class="wx-wa-chips" data-g="int">' + INTENTS.map(function (x, i) { return '<button type="button" class="wx-wa-chip' + (i === 0 ? " on" : "") + '" data-v="' + i + '">' + esc(x[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="wx-wa-two"><input class="wx-wa-in" id="wx-wa-n" placeholder="Your name" autocomplete="name" maxlength="120" aria-label="Your name"><input class="wx-wa-in" id="wx-wa-p" type="tel" placeholder="Phone (optional)" autocomplete="tel" maxlength="40" aria-label="Phone"></div>' +
      '<textarea class="wx-wa-in" id="wx-wa-m" rows="2" placeholder="Area, city, budget or anything else (optional)" maxlength="1000" aria-label="Message"></textarea>' +
      '<input class="wx-wa-hp" id="wx-wa-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="button" class="wx-wa-send">' + sendGlyph + "Continue on WhatsApp</button></div>" +
      '<div class="wx-wa-foot">Opens WhatsApp with your message ready. Adding your phone lets us call you back.</div>';
    document.body.appendChild(panel); document.body.appendChild(wrap);

    var $ = function (s) { return panel.querySelector(s); };
    panel.addEventListener("click", function (e) {
      var c = e.target.closest(".wx-wa-chip"); if (!c) return;
      var g = c.parentNode, wasOn = c.classList.contains("on");
      [].forEach.call(g.querySelectorAll(".wx-wa-chip"), function (x) { x.classList.remove("on"); });
      if (!(wasOn && g.dataset.g === "svc")) c.classList.add("on"); // service can be cleared; intent always has one
    });
    function pick(g) { var c = panel.querySelector('[data-g="' + g + '"] .on'); return c ? c.getAttribute("data-v") : ""; }

    function send() {
      var name = $("#wx-wa-n").value.trim(), phone = $("#wx-wa-p").value.trim(), msg = $("#wx-wa-m").value.trim(), svc = pick("svc"), it = INTENTS[+pick("int") || 0];
      var text = "Assalam-o-Alaikum Woodex," + (name ? " this is " + name + "." : "") + "\n" + it[1] + (svc ? "\nService: " + svc : "") + (msg ? "\n" + msg : "") + "\nPage: " + title + " (" + location.origin + location.pathname + ")";
      window.open("https://wa.me/" + number + "?text=" + encodeURIComponent(text), "_blank", "noopener"); // open first: keeps popup blockers happy
      post({ action: "wa_click", page: location.pathname, service: svc });
      if (name.length >= 2 && /^[+\d][\d\s()-]{6,}$/.test(phone)) post({ form: "whatsapp", name: name, phone: phone, service: svc, message: it[0] + (msg ? " — " + msg : ""), page: location.pathname, _hp: $("#wx-wa-hp").value });
      if (window.gtag) try { window.gtag("event", "whatsapp_click", { service: svc || "none" }); } catch (e) {}
      if (window.fbq) try { window.fbq("track", "Contact"); } catch (e) {}
    }
    function toggle(force) {
      var o = typeof force === "boolean" ? force : !panel.classList.contains("open");
      panel.classList.toggle("open", o); btn.setAttribute("aria-expanded", String(o));
      var dot = btn.querySelector(".wx-wa-dot"); if (dot) dot.remove();
      if (o) setTimeout(function () { $("#wx-wa-n").focus(); }, 50);
    }
    btn.addEventListener("click", function () { toggle(); });
    $(".wx-wa-x").addEventListener("click", function () { toggle(false); });
    $(".wx-wa-send").addEventListener("click", send);
    $("#wx-wa-m").addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    // other page buttons can open it: <a href="#whatsapp"> or [data-wa-open]
    document.addEventListener("click", function (e) { var a = e.target.closest('a[href="#whatsapp"],[data-wa-open]'); if (a) { e.preventDefault(); toggle(true); } });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
