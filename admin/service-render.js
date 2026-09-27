/* Woodex Service renderer — pure functions, no DOM.
 * Used by the dashboard to generate public service pages at /<slug>/,
 * matching the existing top-level service pages (e.g. /interior-design/).
 * Visual language copied from interior-design/index.html (id-* classes in site.css):
 * single navy #0a0f1e, no gradients, pill buttons, short human copy.
 * Never invents copy: every section renders only from the service record;
 * sections with no data are omitted. Loads under
 * new Function("window", src + "\nreturn WxServiceRender;") in Node.
 */
var WxServiceRender = (function () {
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

  var HEADER = '<body id="service-page" data-page="service">\n<input type="checkbox" id="menu-cb" class="menu-cb" />\n' +
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
    '    <a class="header-cta" id="header-cta" href="#svc-contact"><span class="header-cta-label">Get a quote</span></a>\n' +
    '    <label class="menu-toggle" for="menu-cb" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></label>\n' +
    '  </header>\n' +
    '<nav class="mobile-panel" id="mobile-menu" aria-label="Mobile navigation"><a href="/">Home</a><a href="/interior-design/">Interior Design</a><a href="/fit-out/">Fit Out</a><a href="/renovation/">Renovation</a><a href="/architecture/">Architecture</a><a href="/3d-visualization/">3D Studio</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/insights/">Insights</a><a class="mobile-primary" href="#svc-contact">Get a quote</a></nav>\n' +
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

  function normTitleText(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (it) {
      if (typeof it === "string") return { title: it.trim(), text: "" };
      it = it || {};
      return { title: trimStr(it.title || it.name, ""), text: trimStr(it.text || it.description, "") };
    }).filter(function (it) { return it.title; });
  }

  function normStrings(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (it) {
      if (typeof it === "string") return it.trim();
      return trimStr(it && (it.title || it.name), "");
    }).filter(Boolean);
  }

  function normImages(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (im) {
      im = im || {};
      return {
        url: safeUrl(im.url),
        caption: trimStr(im.caption, ""),
        alt: trimStr(im.alt, ""),
        width: Number(im.width) || 0,
        height: Number(im.height) || 0
      };
    }).filter(function (im) { return im.url; });
  }

  function normFaqs(raw) {
    var a = Array.isArray(raw) ? raw : [];
    return a.slice(0, 30).map(function (f) {
      f = f || {};
      return { q: trimStr(f.q || f.question, ""), a: trimStr(f.a || f.answer, "") };
    }).filter(function (f) { return f.q && f.a; });
  }

  function normalizeService(s) {
    s = s || {};
    return {
      name: trimStr(s.name, "Untitled service"),
      slug: trimStr(s.slug, "service"),
      category: trimStr(s.category, ""),
      hero_title: trimStr(s.hero_title, ""),
      introduction: trimStr(s.introduction, ""),
      benefits: normTitleText(s.benefits),
      process: normTitleText(s.process),
      deliverables: normStrings(s.deliverables),
      gallery: normImages(s.gallery),
      faqs: normFaqs(s.faqs),
      seo: {
        title: trimStr(s.seo && s.seo.title, ""),
        description: trimStr(s.seo && s.seo.description, "")
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

  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function imgTag(im, cls, lazy) {
    var attrs = 'src="' + esc(im.url) + '" alt="' + esc(im.alt || im.caption || "Woodex project photo") + '"';
    if (im.width > 0 && im.height > 0) attrs += ' width="' + im.width + '" height="' + im.height + '"';
    if (cls) attrs += ' class="' + cls + '"';
    if (lazy) attrs += ' loading="lazy"';
    return "<img " + attrs + ">";
  }

  function faqItem(f, open) {
    return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="' + (open ? "true" : "false") + '"><span>' + esc(f.q) + '</span><span class="plus">+</span></button><div class="faq-a"><div><p>' + esc(f.a) + "</p></div></div></div>";
  }

  function renderServiceHTML(raw) {
    var s = normalizeService(raw);
    var heroTitle = s.hero_title || s.name;
    var desc = s.seo.description || shortText(s.introduction, 160) || s.name;
    var canonical = "https://woodex.com.pk/" + s.slug + "/";
    var heroImg = s.gallery.length ? s.gallery[0] : { url: DEFAULT_IMG, alt: "", caption: "" };

    var faqJson = "";
    if (s.faqs.length) {
      faqJson = ", " + JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: s.faqs.map(function (f) {
          return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } };
        })
      });
    }

    var jsonld = "[" + LOCAL_BIZ + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "Service",
      name: s.name, serviceType: s.category || s.name,
      description: desc, url: canonical,
      provider: { "@type": "LocalBusiness", name: "Woodex Interior" },
      areaServed: { "@type": "Country", name: "Pakistan" }
    }) + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://woodex.com.pk/" },
        { "@type": "ListItem", position: 2, name: s.name, item: canonical }
      ]
    }) + faqJson + "]";

    var html = head(s.seo.title || s.name, desc, canonical, jsonld) + HEADER;

    // Hero (navy). Lead and figure only when the record supplies the data.
    html += '\n    <section class="id-hero" aria-labelledby="service-title"><div class="wrap id-hero-grid">\n' +
      '      <div class="id-hero-copy id-reveal"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>→</span><span>' + esc(s.name) + '</span></nav><p class="id-label">' + esc(s.category || "Service") + '</p><h1 id="service-title">' + esc(heroTitle) + "</h1>\n" +
      (s.introduction ? '        <p class="lead">' + esc(shortText(s.introduction, 200)) + "</p>\n" : "") +
      '        <div class="actions"><a class="btn" href="#svc-contact">Get a free consultation</a><a class="btn btn-light" href="https://wa.me/923224000768">WhatsApp</a></div></div>\n' +
      '      <figure class="id-image id-hero-media id-reveal"><img src="' + esc(heroImg.url) + '" alt="' + esc(heroImg.alt || heroTitle) + '"' + (heroImg.width > 0 && heroImg.height > 0 ? ' width="' + heroImg.width + '" height="' + heroImg.height + '"' : "") + "></figure>\n" +
      "    </div></section>\n";

    // Introduction
    if (s.introduction) {
      html += '\n    <section class="id-section" aria-label="Overview"><div class="wrap id-reveal"><p class="id-label">Overview</p>\n';
      paragraphs(s.introduction).forEach(function (para) {
        html += '      <p class="lead">' + esc(para) + "</p>\n";
      });
      html += "    </div></section>\n";
    }

    // Benefits cards
    if (s.benefits.length) {
      html += '\n    <section class="id-section id-soft" aria-labelledby="svc-benefits-title"><div class="wrap"><header class="id-head id-reveal"><p class="id-label">Benefits</p><h2 id="svc-benefits-title">What you get with ' + esc(s.name) + '</h2></header><div class="id-cover-list id-reveal">\n';
      s.benefits.forEach(function (b) {
        html += '      <div class="id-cover-item"><strong>' + esc(b.title) + "</strong>" + (b.text ? "<span>" + esc(b.text) + "</span>" : "") + "</div>\n";
      });
      html += "    </div></div></section>\n";
    }

    // Process, numbered steps
    if (s.process.length) {
      html += '\n    <section class="id-section id-dark" aria-labelledby="svc-process-title"><div class="wrap"><header class="id-head id-reveal"><p class="id-label">Process</p><h2 id="svc-process-title">How this service runs</h2></header><div class="id-process-list id-reveal">\n';
      s.process.forEach(function (st, i) {
        html += '      <article class="id-step"><h3>' + (i + 1) + ". " + esc(st.title) + "</h3>" + (st.text ? "<p>" + esc(st.text) + "</p>" : "") + "</article>\n";
      });
      html += "    </div></div></section>\n";
    }

    // Deliverables checklist
    if (s.deliverables.length) {
      html += '\n    <section class="id-section" aria-labelledby="svc-deliverables-title"><div class="wrap"><header class="id-head id-reveal"><p class="id-label">Deliverables</p><h2 id="svc-deliverables-title">Included in the scope</h2></header><div class="id-cover-list id-reveal">\n';
      s.deliverables.forEach(function (d) {
        html += '      <div class="id-cover-item"><strong><span aria-hidden="true">✓</span> ' + esc(d) + "</strong></div>\n";
      });
      html += "    </div></div></section>\n";
    }

    // Gallery (first image already used as hero media)
    if (s.gallery.length > 1) {
      html += '\n    <section class="id-section id-soft" aria-labelledby="svc-gallery-title"><div class="wrap"><header class="id-head id-reveal"><p class="id-label">Gallery</p><h2 id="svc-gallery-title">A look at the work</h2></header>\n';
      s.gallery.slice(1).forEach(function (im) {
        html += '      <figure class="in-image id-reveal">' + imgTag(im, "", true);
        if (im.caption) html += "<figcaption>" + esc(im.caption) + "</figcaption>";
        html += "</figure>\n";
      });
      html += "    </div></section>\n";
    }

    // FAQs
    if (s.faqs.length) {
      html += '\n    <section class="id-section id-dark" aria-labelledby="svc-faq-title"><div class="wrap id-faq-grid"><div class="id-faq-side id-reveal"><p class="id-label">Before we begin</p><h2 id="svc-faq-title">' + esc(s.name) + ' FAQ</h2></div><div class="faq-wrap id-reveal">\n';
      s.faqs.forEach(function (f, i) {
        html += "      " + faqItem(f, i === 0) + "\n";
      });
      html += "    </div></div></section>\n";
    }

    // Contact CTA, same family as the service pages.
    html += '\n    <section class="id-section" id="svc-contact"><div class="wrap id-contact-grid">\n' +
      '      <figure class="id-image id-contact-visual id-reveal"><img loading="lazy" src="' + esc(heroImg.url) + '" alt="' + esc(heroImg.alt || heroTitle) + '"><figcaption class="id-contact-overlay"><h2>Start your ' + esc(s.name) + ' project.</h2><p>Tell us what you are planning.</p></figcaption></figure>\n' +
      '      <div class="id-contact-card id-reveal"><p class="id-label">Talk to Woodex</p><h3>Book a free consultation</h3><p><a href="tel:+923224000768">+92 322 4000768</a><br><a href="tel:+923214686884">+92 321 4686884</a></p><p><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a></p><p>M-71, Zainab Tower<br>Model Town Link Road, Lahore</p><p><strong>Mon-Sat 9:30-6:30</strong></p><div class="id-contact-actions"><a class="btn" href="mailto:info@woodex.com.pk?subject=' + esc(encodeURIComponent(s.name + " enquiry")) + '">Email Woodex</a><a class="btn btn-secondary" href="https://wa.me/923224000768">WhatsApp</a></div></div>\n' +
      "    </div></section>\n";

    // Related note: core Woodex services, all real site pages.
    html += '\n    <section class="id-section id-soft" aria-label="Related services"><div class="wrap id-connect-grid"><div class="id-connect-copy id-reveal"><p class="id-label">Keep exploring</p><h2>More Woodex services</h2><nav class="id-connect-list" aria-label="Related Woodex services"><a class="id-connect-link" href="/interior-design/"><span>01</span><strong>Interior Design</strong><span>→</span></a><a class="id-connect-link" href="/fit-out/"><span>02</span><strong>Fit Out</strong><span>→</span></a><a class="id-connect-link" href="/renovation/"><span>03</span><strong>Renovation</strong><span>→</span></a><a class="id-connect-link" href="/architecture/"><span>04</span><strong>Architecture</strong><span>→</span></a></nav></div></div></section>\n';

    return html + FOOTER;
  }

  return {
    normalizeService: normalizeService,
    renderServiceHTML: renderServiceHTML
  };
})();
