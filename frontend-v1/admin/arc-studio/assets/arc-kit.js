/* ============================================================================
   WOODEX ADMIN V2.1 + ARC.STUDIO — interaction engine
   Vanilla, dependency-free. Every behaviour is opt-in through data attributes so
   the production screens stay declarative utility markup.
   Behaviours: theme, tabs/segments, dropdowns, drawers, modals, switches,
   row selection, kanban drag, filters, meters, toasts, kit preview loader.
   ========================================================================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var ARR = function (n) { return Array.prototype.slice.call(n || []); };
  var q = function (s, c) { return (c || doc).querySelector(s); };
  var qa = function (s, c) { return ARR((c || doc).querySelectorAll(s)); };

  /* ---- Theme ----------------------------------------------------------- */
  var THEME_KEY = "wxaTheme";
  function applyTheme(mode) {
    root.classList.toggle("dark", mode === "dark");
    root.setAttribute("data-theme", mode);
    qa("[data-arc-theme-label]").forEach(function (el) { el.textContent = mode === "dark" ? "Light" : "Dark"; });
    qa("[data-arc-theme-icon]").forEach(function (el) { el.setAttribute("data-mode", mode); });
    doc.dispatchEvent(new CustomEvent("arc:theme", { detail: { mode: mode } }));
  }
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function initTheme() {
    var saved = storedTheme();
    if (!saved) saved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(saved);
    qa("[data-arc-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = root.classList.contains("dark") ? "light" : "dark";
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        applyTheme(next);
      });
    });
  }
  window.arcTheme = applyTheme;

  /* ---- Tabs / segmented controls --------------------------------------- */
  var TAB_ON = "bg-stone-800 text-stone-50 dark:bg-stone-200 dark:text-stone-900";
  var TAB_OFF = "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100";
  function setTab(btn, on) {
    var onCls = (btn.getAttribute("data-on") || TAB_ON).split(" ").filter(Boolean);
    var offCls = (btn.getAttribute("data-off") || TAB_OFF).split(" ").filter(Boolean);
    (on ? offCls : onCls).forEach(function (c) { btn.classList.remove(c); });
    (on ? onCls : offCls).forEach(function (c) { btn.classList.add(c); });
    btn.setAttribute("aria-selected", on ? "true" : "false");
  }
  function initTabs(scope) {
    qa("[data-arc-tab]", scope).forEach(function (btn) {
      if (btn.dataset.arcBound) return;
      btn.dataset.arcBound = "1";
      btn.addEventListener("click", function () {
        var set = btn.closest("[data-arc-tabs]") || doc;
        var key = btn.getAttribute("data-arc-tab");
        var keys = qa("[data-arc-tab]", set).map(function (b) { return b.getAttribute("data-arc-tab"); });
        qa("[data-arc-tab]", set).forEach(function (b) { setTab(b, b === btn); });
        /* Panes belong to the set whose tab keys they share, wherever they sit in the document. */
        qa("[data-arc-pane]").forEach(function (p) {
          var pk = p.getAttribute("data-arc-pane");
          if (keys.indexOf(pk) > -1) p.hidden = pk !== key;
        });
      });
    });
  }

  /* ---- Dropdowns ------------------------------------------------------- */
  function closeMenus(except) {
    qa("[data-arc-menu]").forEach(function (m) {
      if (m === except) return;
      m.classList.add("hidden");
      var t = m.getAttribute("data-arc-menu");
      var btn = t && q('[data-arc-dd="' + t + '"]');
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }
  function initDropdowns(scope) {
    qa("[data-arc-dd]", scope).forEach(function (btn) {
      if (btn.dataset.arcBound) return;
      btn.dataset.arcBound = "1";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var key = btn.getAttribute("data-arc-dd");
        var menu = key ? q('[data-arc-menu="' + key + '"]') : btn.parentNode.querySelector("[data-arc-menu]");
        if (!menu) return;
        var willOpen = menu.classList.contains("hidden");
        closeMenus(menu);
        menu.classList.toggle("hidden", !willOpen);
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });
  }
  doc.addEventListener("click", function () { closeMenus(); });

  /* ---- Drawers + modals ------------------------------------------------ */
  function panel(id) { return q('[data-arc-drawer="' + id + '"], [data-arc-modal="' + id + '"]'); }
  function openPanel(id) { var p = panel(id); if (!p) return; p.hidden = false; requestAnimationFrame(function () { p.setAttribute("data-open", "1"); }); }
  function closePanel(id) { var p = panel(id); if (!p) return; p.removeAttribute("data-open"); setTimeout(function () { p.hidden = true; }, 150); }
  function initPanels(scope) {
    qa("[data-arc-open]", scope).forEach(function (btn) {
      if (btn.dataset.arcBound) return; btn.dataset.arcBound = "1";
      btn.addEventListener("click", function () { openPanel(btn.getAttribute("data-arc-open")); });
    });
    qa("[data-arc-close]", scope).forEach(function (btn) {
      if (btn.dataset.arcBound) return; btn.dataset.arcBound = "1";
      btn.addEventListener("click", function () {
        var p = btn.closest("[data-arc-drawer], [data-arc-modal]");
        if (p) closePanel(p.getAttribute("data-arc-drawer") || p.getAttribute("data-arc-modal"));
      });
    });
  }
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeMenus();
    qa("[data-arc-drawer][data-open], [data-arc-modal][data-open]").forEach(function (p) {
      closePanel(p.getAttribute("data-arc-drawer") || p.getAttribute("data-arc-modal"));
    });
  });

  /* ---- Switches -------------------------------------------------------- */
  function initSwitches(scope) {
    qa("[data-arc-switch]", scope).forEach(function (sw) {
      if (sw.dataset.arcBound) return; sw.dataset.arcBound = "1";
      var paint = function () {
        var on = sw.getAttribute("aria-checked") === "true";
        sw.classList.toggle("bg-stone-800", on); sw.classList.toggle("dark:bg-stone-200", on);
        sw.classList.toggle("bg-stone-200", !on); sw.classList.toggle("dark:bg-stone-800", !on);
        var knob = q("span", sw);
        if (knob) { knob.classList.toggle("translate-x-4", on); knob.classList.toggle("translate-x-0", !on); }
      };
      paint();
      sw.addEventListener("click", function () {
        sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") === "true" ? "false" : "true");
        paint();
        var label = sw.getAttribute("data-arc-switch");
        if (label) window.arcToast(label + (sw.getAttribute("aria-checked") === "true" ? " enabled" : " disabled"));
      });
    });
  }

  /* ---- Row selection ---------------------------------------------------- */
  function initSelection(scope) {
    var table = scope || doc;
    qa("[data-arc-check-all]", table).forEach(function (all) {
      if (all.dataset.arcBound) return; all.dataset.arcBound = "1";
      all.addEventListener("change", function () {
        var box = all.closest("table") || doc;
        qa("[data-arc-row]", box).forEach(function (row) {
          var cb = q("input[type=checkbox]", row);
          if (cb) { cb.checked = all.checked; paintRow(row, cb.checked); }
        });
        countSelection(box);
      });
    });
    qa("[data-arc-row]", table).forEach(function (row) {
      var cb = q("input[type=checkbox]", row);
      if (!cb || cb.dataset.arcBound) return; cb.dataset.arcBound = "1";
      cb.addEventListener("change", function () { paintRow(row, cb.checked); countSelection(); });
    });
  }
  function paintRow(row, on) {
    row.classList.toggle("bg-stone-100", on); row.classList.toggle("dark:bg-stone-800", on);
  }
  function countSelection(box) {
    var n = qa("[data-arc-row] input[type=checkbox]:checked", box || doc).length;
    qa("[data-arc-count]").forEach(function (el) { el.textContent = String(n).padStart(2, "0"); });
    qa("[data-arc-count-bar]").forEach(function (el) { el.hidden = n === 0; });
  }

  /* ---- Kanban drag ------------------------------------------------------ */
  function initKanban(scope) {
    qa("[data-arc-kanban]", scope).forEach(function (board) {
      if (board.dataset.arcBound) return; board.dataset.arcBound = "1";
      var dragging = null;
      qa("[data-arc-card]", board).forEach(function (card) {
        card.setAttribute("draggable", "true");
        card.addEventListener("dragstart", function () { dragging = card; card.classList.add("arc-dragging"); });
        card.addEventListener("dragend", function () { card.classList.remove("arc-dragging"); dragging = null; tapLanes(board, null); });
      });
      qa("[data-arc-lane]", board).forEach(function (lane) {
        lane.addEventListener("dragover", function (e) { e.preventDefault(); tapLanes(board, lane); });
        lane.addEventListener("drop", function (e) {
          e.preventDefault();
          if (!dragging) return;
          var zone = q("[data-arc-lane-body]", lane) || lane;
          var ghost = q("[data-arc-card].arc-dragging", board);
          (ghost || dragging).classList.remove("arc-dragging");
          zone.appendChild(ghost || dragging);
          tapLanes(board, null);
          recount(board);
          window.arcToast("Card moved to " + (q("[data-arc-lane-title]", lane) || lane).textContent.trim());
        });
      });
      recount(board);
    });
  }
  function tapLanes(board, active) {
    qa("[data-arc-lane]", board).forEach(function (l) { l.classList.toggle("arc-drop-target", l === active); });
  }
  function recount(board) {
    var sum = 0;
    qa("[data-arc-lane]", board).forEach(function (lane) {
      var n = qa("[data-arc-card]", lane).length;
      var out = q("[data-arc-lane-count]", lane);
      if (out) out.textContent = String(n).padStart(2, "0");
      var val = q("[data-arc-lane-value]", lane);
      if (val) {
        var total = qa("[data-arc-card]", lane).reduce(function (t, c) { return t + (parseFloat(c.getAttribute("data-value")) || 0); }, 0);
        val.textContent = "$" + (total / 1000).toFixed(1) + "k";
      }
      sum += n;
    });
    var boardCount = q("[data-arc-board-count]", board);
    if (boardCount) boardCount.textContent = String(sum).padStart(2, "0");
    qa("[data-arc-count]", board).forEach(function (el) { el.textContent = String(sum).padStart(2, "0"); });
  }

  /* ---- Inline filters --------------------------------------------------- */
  function initFilters(scope) {
    qa("[data-arc-filter]", scope).forEach(function (input) {
      if (input.dataset.arcBound) return; input.dataset.arcBound = "1";
      input.addEventListener("input", function () {
        var target = q(input.getAttribute("data-arc-target") || "");
        var term = input.value.trim().toLowerCase();
        qa("[data-arc-filter-item]", target || doc).forEach(function (item) {
          item.hidden = term !== "" && item.textContent.toLowerCase().indexOf(term) === -1;
        });
        var empty = q("[data-arc-filter-empty]");
        if (empty) {
          var shown = qa("[data-arc-filter-item]", target || doc).filter(function (i) { return !i.hidden; }).length;
          empty.hidden = shown !== 0;
        }
      });
    });
  }

  /* ---- Meters ----------------------------------------------------------- */
  function initMeters() {
    var run = function (el) {
      var v = Math.max(0, Math.min(100, parseFloat(el.getAttribute("data-arc-value")) || 0));
      el.style.width = v + "%";
    };
    qa("[data-arc-value]").forEach(function (el) {
      if (!("IntersectionObserver" in window)) { run(el); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { run(el); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(el);
    });
  }

  /* ---- Toast ------------------------------------------------------------ */
  var toastTimer = null;
  window.arcToast = function (msg) {
    var host = q("[data-arc-toast-host]");
    if (!host) {
      host = doc.createElement("div");
      host.setAttribute("data-arc-toast-host", "");
      host.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none";
      doc.body.appendChild(host);
    }
    var el = doc.createElement("div");
    el.className = "animate-arc-slide-in rounded-lg border border-stone-800 bg-stone-900 px-4 py-2 text-xs font-medium tracking-wide text-stone-50 shadow-lift dark:border-stone-200 dark:bg-stone-100 dark:text-stone-900";
    el.textContent = msg;
    host.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, 2200);
  };

  /* ---- Copy buttons ----------------------------------------------------- */
  function initCopy(scope) {
    qa("[data-arc-copy]", scope).forEach(function (btn) {
      if (btn.dataset.arcBound) return; btn.dataset.arcBound = "1";
      btn.addEventListener("click", function () {
        var sel = btn.getAttribute("data-arc-copy");
        var demo = sel === "demo" ? btn.closest("[data-arc-demo]") : null;
        var src = sel && sel !== "self" && !demo ? q(sel) : null;
        var text = demo ? demo.innerHTML : src ? (src.tagName === "TEXTAREA" || src.tagName === "INPUT" ? src.value : src.textContent) : btn.getAttribute("data-arc-copy-text") || "";
        if (navigator.clipboard) navigator.clipboard.writeText(text.trim());
        window.arcToast("Copied to clipboard");
      });
    });
  }

  /* ---- Boot ------------------------------------------------------------- */
  function boot() {
    initTheme(); initTabs(); initDropdowns(); initPanels(); initSwitches();
    initSelection(); initKanban(); initFilters(); initMeters(); initCopy();
    doc.dispatchEvent(new CustomEvent("arc:ready"));
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  window.arcInit = boot;
})();
