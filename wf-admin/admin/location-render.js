/* Woodex Location renderer — pure functions, no DOM.
 * Used by the dashboard to generate public location pages at /<slug>/,
 * matching the existing top-level location pages (e.g. /lahore/).
 * Visual language copied from lahore/index.html (ct-* classes in site.css):
 * single navy #0a0f1e, no gradients, pill buttons, short human copy.
 * Never invents copy: every section renders only from the location record;
 * sections with no data are omitted. Loads under
 * new Function("window", src + "\nreturn WxLocationRender;") in Node.
 */
var WxLocationRender = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^(\/|https?:\/\/)/i.test(u) && !/["<>]/.test(u)) return u;
    return "";
  }

  var DEFAULT_IMG = "/assets/img/img-1d6ad6c77d0f.webp";

  var NOJS_STYLE = '<style>\n/* No-JS fallbacks: everything visible, carousels natively scrollable, FAQ answers open. */\n.menu-cb{position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none}\n#menu-cb:checked ~ .mobile-panel{opacity:1;visibility:visible;transform:none}\n#menu-cb:checked ~ .site-header .menu-toggle:before{transform:translateY(6px) rotate(45deg)}\n#menu-cb:checked ~ .site-header .menu-toggle span{opacity:0}\n#menu-cb:checked ~ .site-header .menu-toggle:after{transform:translateY(-6px) rotate(-6px)}\nhtml:not(.js) [class*="-faq-a"]{grid-template-rows:1fr !important}\nhtml:not(.js) .hub-services-viewport,html:not(.js) .related-viewport,html:not(.js) .fitout-scope-viewport{overflow-x:auto}\nhtml:not(.js) button[id$="-prev"],html:not(.js) button[id$="-next"]{display:none}\nhtml:not(.js) .hm-slider-controls{display:none}\nhtml:not(.js) .hm-slider-dots{display:none}\n</style>';

  var LOCAL_BIZ = '{"@context": "https://schema.org", "@type": "LocalBusiness", "name": "Woodex Interior", "url": "https://woodex.com.pk", "telephone": ["+923224000768", "+923214686884"], "email": "info@woodex.com.pk", "address": {"@type": "PostalAddress", "streetAddress": "M-71, Zainab Tower, Model Town Link Road", "addressLocality": "Lahore", "addressCountry": "PK"}, "openingHours": "Mo-Sa 09:30-18:30"}';

  function head(title, desc, canonical, jsonld) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
      "<title>" + esc(title) + " | Woodex Interior</title>\n" +
      '<meta name="description" content="' + esc(desc) + '" />\n' +
      '<link rel="canonical" href="' + esc(canonical) + '" />\n' +
      '<link rel="stylesheet" href="/assets/site.css" />\n' + NOJS_STYLE + "\n" +
      '<script type="application/ld+json">\n' + jsonld + "\n</script>\n</head>\n";
  }

  var HEADER = '<body id="city-page" data-page="city">\n<input type="checkbox" id="menu-cb" class="menu-cb" />\n' +
    '<header class="site-header">\n' +
    '    <a class="brand" href="/" data-page-route="home" aria-label="Woodex Interior home"><img class="brand-mark" src="/assets/img/img-f941b08b9510.png" alt=""><span class="brand-divider" aria-hidden="true"></span><span class="brand-wordmark">WOODEX <small>INTERIOR</small></span></a>\n' +
    '    <nav class="desktop-nav" aria-label="Page navigation">\n' +
    '      <a href="/" data-page-route="home">Home</a>\n' +
    '      <a href="/3d-visualization/" data-page-route="studio">Woodex Studio</a>\n' +
    '      <div class="nav-services">\n' +
    '        <button class="nav-services-trigger" type="button" aria-expanded="false" aria-controls="services-menu">Services <span aria-hidden="true">⌄</span></button>\n' +
    '        <div class="mega-menu" id="services-menu">\n' +
    '          <div class="mega-column"><span class="mega-number">01</span><a class="mega-title" href="/interior-design/" data-page-route="interior">Interior Design</a><a href="/commercial-interior/">Commercial interiors</a><a href="/office-interior-design/">Office design</a><a href="/interior-design/">Residential interiors</a><a href="/kitchen-design/">Kitchen design</a></div>\n' +
    '          <div class="mega-column"><span class="mega-number">02</span><a class="mega-title" href="/fit-out/" data-page-route="fitout-hub">Fit Out</a><a href="/turnkey-design-build/">Turnkey projects</a><a href="/commercial-fit-out/">Commercial fit out</a><a href="/office-fit-out/" data-page-route="officeFitout">Office fit out</a><a href="/fit-out/">Project management</a></div>\n' +
    '          <div class="mega-column"><span class="mega-number">03</span><a class="mega-title" href="/renovation/" data-page-route="renovation">Renovation</a><a href="/office-renovation/">Office renovation</a><a href="/commercial-renovation/">Commercial renovation</a><a href="/restaurant-cafe-renovation/">Restaurant renovation</a><a href="/residential-renovation/">House renovation</a></div>\n' +
    '          <div class="mega-column"><span class="mega-number">04</span><a class="mega-title" href="/architecture/" data-page-route="architecture">Architecture</a><a href="/architecture/">Residential architecture</a><a href="/architecture/">Commercial architecture</a><a href="/front-elevation-design/">Front elevation</a><a href="/master-planning/">Master planning</a></div>\n' +
    '          <div class="mega-feature"><a class="mega-studio" href="/3d-visualization/" data-page-route="studio">3D Studio</a><a class="mega-project" href="/projects/"><img src="/assets/img/img-dce06249b137.webp" alt="Contemporary Woodex project exterior"><span>Selected projects · View studies</span></a></div>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <a href="/projects/" data-page-route="projects">Projects</a><a href="/about/" data-page-route="about">About</a><a href="/insights/" data-page-route="insights">Insights</a><a id="nav-contact" href="/contact/" data-page-route="contact">Contact</a>\n' +
    '    </nav>\n' +
    '    <a class="header-cta" id="header-cta" href="#cta"><span class="header-cta-label">Get a quote</span></a>\n' +
    '    <label class="menu-toggle" for="menu-cb" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></label>\n' +
    '  </header>\n' +
    '<nav class="mobile-panel" id="mobile-menu" aria-label="Mobile navigation"><a href="/">Home</a><a href="/interior-design/">Interior Design</a><a href="/fit-out/">Fit Out</a><a href="/renovation/">Renovation</a><a href="/architecture/">Architecture</a><a href="/3d-visualization/">3D Studio</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/insights/">Insights</a><a class="mobile-primary" href="#cta">Get a quote</a></nav>\n' +
    '<main id="main-content">\n';

  var FOOTER = '</main>\n<footer class="footer"><div class="wrap">\n' +
    '    <div class="footer-main">\n' +
    '      <div class="footer-intro"><h2 id="footer-heading">Stay connected<br>with us.</h2><p id="footer-copy">Have a space in mind? Tell us what you have and where you are in the process.</p><a class="btn footer-cta" id="footer-cta" href="/contact/">Start your project</a></div>\n' +
    '      <nav class="footer-column" aria-label="Practice links"><h3>Practice</h3><a href="/about/" data-page-route="about">About</a><a href="/insights/design-process-explained/">Process</a><a href="/interior-design/" data-page-route="interior">Services</a><a href="/3d-visualization/" data-page-route="studio">3D Studio</a><a href="/projects/" data-page-route="projects">Projects</a></nav>\n' +
    '      <nav class="footer-column" aria-label="Explore links"><h3>Explore</h3><a href="/interior-design/" data-page-route="interior">Interior design</a><a href="/fit-out/" data-page-route="fitout-hub">Fit out</a><a href="/turnkey-design-build/">Turnkey</a><a href="/renovation/" data-page-route="renovation">Renovation</a><a href="/architecture/" data-page-route="architecture">Architecture</a><a href="/insights/" data-page-route="insights">Insights</a><a href="/contact/">FAQ</a></nav>\n' +
    '      <div class="footer-column footer-contact"><h3>Get in touch</h3><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><a href="https://wa.me/923224000768">WhatsApp Woodex</a><a href="tel:+923224000768">+92 322 4000768</a><a href="tel:+923214686884">+92 321 4686884</a><address>M-71, Zainab Tower<br>Model Town Link Road<br>Lahore, Pakistan</address><p><strong>Mon–Sat 9:30–6:30</strong></p></div>\n' +
    '    </div>\n' +
    '    <div class="footer-word" aria-label="Interiors">INTERIORS</div>\n' +
    '    <div class="footer-bottom"><span>© 2026 Woodex Interior</span><div><span>Privacy</span><a href="https://woodexfurniture.pk" target="_blank" rel="noopener">Woodex Furniture™ ↗</a></div></div>\n' +
    '  </div></footer>\n<script src="/assets/site.js" defer></script>\n</body>\n</html>';

  function trimStr(v, fb) {
    var s = String(v == null ? "" : v).trim();
    return s || String(fb == null ? "" : fb);
  }

  function normServices(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (it) {
      it = it || {};
      return {
        name: trimStr(it.name || it.title, ""),
        url: safeUrl(it.url || it.href || it.link),
        text: trimStr(it.text || it.description, "")
      };
    }).filter(function (it) { return it.name; });
  }

  function normFaqs(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (f) {
      f = f || {};
      return { q: trimStr(f.q || f.question, ""), a: trimStr(f.a || f.answer, "") };
    }).filter(function (f) { return f.q && f.a; });
  }

  function normalizeLocation(l) {
    l = l || {};
    return {
      name: trimStr(l.name, "Untitled location"),
      slug: trimStr(l.slug, "location"),
      introduction: trimStr(l.introduction, ""),
      services: normServices(l.services),
      faqs: normFaqs(l.faqs),
      map_url: safeUrl(l.map_url || l.mapUrl),
      seo: {
        title: trimStr(l.seo && l.seo.title, ""),
        description: trimStr(l.seo && l.seo.description, "")
      }
    };
  }

  function shortText(s, n) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (s.length <= n) return s;
    var cut = s.slice(0, n);
    var sp = cut.lastIndexOf(" ");
    return (sp > 40 ? cut.slice(0, sp) : cut).trim() + "…";
  }

  function renderLocationHTML(raw) {
    var l = normalizeLocation(raw);
    var desc = l.seo.description || shortText(l.introduction, 160) || ("Woodex Interior in " + l.name + ".");
    var canonical = "https://woodex.com.pk/" + l.slug + "/";

    var faqJson = "";
    if (l.faqs.length) {
      faqJson = ", " + JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: l.faqs.map(function (f) {
          return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } };
        })
      });
    }

    var jsonld = "[" + LOCAL_BIZ + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "Service",
      name: "Interior Design in " + l.name, serviceType: "Interior design",
      description: desc, url: canonical,
      provider: { "@type": "LocalBusiness", name: "Woodex Interior" },
      areaServed: { "@type": "City", name: l.name }
    }) + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://woodex.com.pk/" },
        { "@type": "ListItem", position: 2, name: l.name, item: canonical }
      ]
    }) + faqJson + "]";

    var html = head(l.seo.title || ("Interior Design in " + l.name), desc, canonical, jsonld) + HEADER;

    // Hero, same shape as the hand-built city pages.
    html += '\n    <section class="ct-hero" aria-labelledby="city-hero-title">\n' +
      '      <figure class="ct-hero-media" aria-hidden="true"><img src="' + esc(DEFAULT_IMG) + '" alt=""></figure>\n' +
      '      <div class="ct-wrap ct-hero-grid">\n' +
      '        <div class="ct-hero-copy" data-ct-reveal="">\n' +
      '          <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>→</span><span>' + esc(l.name) + '</span></nav>\n' +
      '          <p class="ct-label">Where we work</p>\n' +
      '          <h1 id="city-hero-title">Interior design in ' + esc(l.name) + '</h1>\n' +
      "        </div>\n" +
      '        <div class="ct-hero-note" data-ct-reveal="">\n' +
      (l.introduction ? "          <p>" + esc(l.introduction) + "</p>\n" : "") +
      '          <div class="actions"><a class="btn" href="/contact/">Start a ' + esc(l.name) + ' project</a><a class="btn btn-light" href="/insights/design-process-explained/">How we work</a></div>\n' +
      "        </div>\n" +
      "      </div>\n" +
      "    </section>\n";

    // Services available in this city.
    if (l.services.length) {
      html += '\n    <section class="ct-section ct-soft" id="city-services"><div class="ct-wrap">\n' +
        '      <header class="ct-center" data-ct-reveal=""><p class="ct-label">Services</p><h2>What we take on in ' + esc(l.name) + '</h2></header>\n' +
        '      <div class="ct-cards">\n';
      l.services.forEach(function (sv) {
        html += '        <article class="ct-card" data-ct-reveal=""><h3>' + esc(sv.name) + "</h3>" +
          (sv.text ? "<p>" + esc(sv.text) + "</p>" : "") +
          (sv.url ? '<a href="' + esc(sv.url) + '">Learn more</a>' : "") +
          "</article>\n";
      });
      html += "      </div>\n    </div></section>\n";
    }

    // Embedded map, only when a URL was supplied.
    if (l.map_url) {
      html += '\n    <section class="ct-section" id="city-map"><div class="ct-wrap">\n' +
        '      <header class="ct-center" data-ct-reveal=""><p class="ct-label">Map</p><h2>Find us in ' + esc(l.name) + '</h2></header>\n' +
        '      <div data-ct-reveal="" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px">\n' +
        '        <iframe title="Map of ' + esc(l.name) + '" src="' + esc(l.map_url) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>\n' +
        "      </div>\n" +
        "    </div></section>\n";
    }

    // FAQs
    if (l.faqs.length) {
      html += '\n    <section class="ct-section ct-soft" id="city-faq"><div class="ct-wrap">\n' +
        '      <header class="ct-center" data-ct-reveal=""><p class="ct-label">FAQ</p><h2>Questions, answered</h2></header>\n' +
        '      <div class="ct-faq-list">\n';
      l.faqs.forEach(function (f, i) {
        html += '      <div class="ct-faq-item" data-ct-reveal="">\n' +
          '        <button class="ct-faq-q" type="button" aria-expanded="' + (i === 0 ? "true" : "false") + '"><span>' + esc(f.q) + '</span><span class="plus">+</span></button>\n' +
          '        <div class="ct-faq-a"><div><p>' + esc(f.a) + "</p></div></div>\n" +
          "      </div>\n";
      });
      html += "      </div>\n    </div></section>\n";
    }

    // Contact CTA, same shape as the hand-built city pages.
    html += '\n    <section class="ct-section" id="cta"><div class="ct-wrap"><div class="ct-cta"><div class="ct-cta-grid">\n' +
      '      <div class="ct-cta-copy" data-ct-reveal="">\n' +
      '        <p class="ct-label">Start a project</p>\n' +
      '        <h2>Start your ' + esc(l.name) + ' project with one accountable team.</h2>\n' +
      '        <div class="ct-cta-meta">\n' +
      '          <address>M-71, Zainab Tower<br>Model Town Link Road<br>Lahore, Pakistan</address>\n' +
      '          <p><a href="tel:+923224000768">+92 322 4000768</a><br><a href="tel:+923214686884">+92 321 4686884</a><br><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a></p>\n' +
      '          <p><strong>Mon–Sat 9:30–6:30</strong><br>Sunday closed</p>\n' +
      "        </div>\n" +
      '        <div class="actions"><a class="btn" href="mailto:info@woodex.com.pk">Email the studio</a><a class="btn btn-light" href="tel:+923224000768">Call +92 322 4000768</a></div>\n' +
      "      </div>\n" +
      '      <figure class="ct-image ct-cta-media" data-ct-reveal=""><img src="' + esc(DEFAULT_IMG) + '" alt="Contemporary building exterior used as project photography placeholder"><figcaption>Project photography placeholder · Woodex</figcaption></figure>\n' +
      "    </div></div></div></section>\n";

    return html + FOOTER;
  }

  return {
    normalizeLocation: normalizeLocation,
    renderLocationHTML: renderLocationHTML
  };
})();
