/* Woodex Admin — canvas palette + theme re-render (U3 / OV-2 / AD-18).
 *
 * Chart.js paints into <canvas>, and canvas cannot resolve CSS `var()`. Until now every chart
 * carried the old palette as literals (`#d4af6a` gold, `#0c1628` navy) and kept its colours after a
 * theme switch, so charts were the one place the design layer could not reach.
 *
 * This file resolves the theme tokens at draw time and re-runs every registered chart renderer when
 * the theme changes, so the canvas follows the same tokens as the rest of the admin. Charts with
 * no registration keep their old behaviour (they just keep using palette()).
 *
 * Usage in a chart file:
 *   var P = window.WXPalette.palette();
 *   ... borderColor: P.brand, backgroundColor: P.grid ...
 *   window.WXPalette.register("dashboard", function () { redraw(); });
 */
(function () {
  "use strict";
  var html = document.documentElement;

  // Fallbacks: only used if the stylesheet failed to load (a chart must still draw).
  var FB = {
    brand: "#2563eb", brandLight: "#60a5fa", strong: "#111827", strongDark: "#f5f5f5",
    ok: "#10b981", warn: "#f59e0b", bad: "#ef4444", muted: "#94a3b8",
    seriesLight: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8", "#d1d5db"],
    seriesDark: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#a3a3a3", "#525252"]
  };

  function dark() { return html.classList.contains("dark"); }

  function tok(name, fallback) {
    var v = "";
    try { v = getComputedStyle(html).getPropertyValue(name); } catch (e) {}
    v = (v || "").trim();
    return v || fallback;
  }

  // Same shape in both themes: callers never test for dark themselves.
  function palette() {
    var d = dark();
    return {
      dark: d,
      brand: tok("--pri", d ? FB.brandLight : FB.brand),        // accent series (was the gold literal)
      strong: tok("--txt", d ? FB.strongDark : FB.strong),      // second series (was the navy literal)
      grid: d ? "rgba(255,255,255,.10)" : "rgba(17,24,39,.08)", // grid lines: never a solid block
      text: tok("--mut", FB.muted),                             // axis labels and legend
      font: tok("--ui-font", '"Inter",system-ui,sans-serif'),
      ok: tok("--ok", FB.ok),
      warn: tok("--warn", FB.warn),
      bad: tok("--bad", FB.bad),
      ringBorder: tok("--ui-surface", d ? "#262626" : "#ffffff"),   // doughnut segment separators
      series: d ? FB.seriesDark.slice() : FB.seriesLight.slice()
    };
  }

  /**
   * "#2563eb" + 0.35 -> "rgba(37,99,235,0.35)". Anything else (rgb(), a named colour) is returned
   * unchanged, because the token may already carry its own alpha.
   */
  function alpha(c, a) {
    var m = String(c).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return c;
    var h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }

  // Registrations are keyed: drawing the same screen twice replaces its own renderer, never stacks.
  var reg = Object.create(null);
  function register(key, fn) { reg[key] = fn; }
  function unregister(key) { delete reg[key]; }
  function refresh() {
    Object.keys(reg).forEach(function (k) { try { reg[k](); } catch (e) { if (window.console) console.error("WXPalette:", k, e); } });
  }

  // The theme toggle flips a class on <html>; the optional health-check switch in Settings
  // also previews the two palettes. Watching the attribute catches every path, including
  // future toggles that do not know about this file.
  if (window.MutationObserver) {
    var last = html.className;
    new MutationObserver(function () {
      if (html.className === last) return;
      last = html.className;
      refresh();
    }).observe(html, { attributes: true, attributeFilter: ["class"] });
  }
  // "Auto" theme: the OS setting can change while the tab is open.
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { setTimeout(refresh, 60); });
  } catch (e) {}

  window.WXPalette = { dark: dark, tok: tok, alpha: alpha, palette: palette, register: register, unregister: unregister, refresh: refresh, keys: function () { return Object.keys(reg); } };
})();
