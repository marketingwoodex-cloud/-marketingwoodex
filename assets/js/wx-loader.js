/* Woodex content loader (Sveltia CMS edition).
 *
 * Reads page content from /content/<page>.json files — managed visually in
 * /admin/ (Sveltia CMS, no server needed) — and swaps it into any element
 * carrying a data-wx="page.section.field" attribute.
 *
 * Conventions:
 *   - Page slug comes from the URL path: "/" -> home, "/insights/" -> insights.
 *   - A data-wx key "home.hero.title" reads data["hero_title"] from
 *     /content/home.json (dots become underscores after the page prefix).
 *   - Fields whose name ends in "_image" are treated as images: an <img>
 *     gets its src replaced, any other element gets a background image.
 *   - Values containing HTML tags are injected as HTML, otherwise as text.
 *   - If the JSON file is missing or a key is absent, the baked-in HTML
 *     stays exactly as it is. The site works with zero backend.
 */
(function () {
  function pageSlug() {
    var p = location.pathname
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "")
      .replace(/^\//, "");
    if (!p) return "home";
    return p.replace(/\//g, ".");
  }

  var slug = pageSlug();
  var prefix = slug + ".";

  fetch("/content/" + slug + ".json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("no content file"); return r.json(); })
    .then(function (data) {
      document.querySelectorAll("[data-wx]").forEach(function (el) {
        var key = el.getAttribute("data-wx") || "";
        if (key.indexOf(prefix) !== 0) return;
        var name = key.slice(prefix.length).replace(/\./g, "_");
        if (!(name in data)) return;
        var val = data[name];
        if (val == null || val === "") return;
        if (/_image$/.test(name)) {
          if (el.tagName === "IMG") { el.src = val; }
          else { el.style.backgroundImage = "url('" + val + "')"; }
        } else if (/<[a-z][\s\S]*>/i.test(val)) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      });
      window.dispatchEvent(new CustomEvent("wx:ready"));
    })
    .catch(function () { /* offline or no file: baked-in content stays */ });
})();
