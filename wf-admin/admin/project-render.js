/* Woodex Project renderer — pure functions, no DOM.
 * Used by the dashboard to generate public project pages + refresh the Projects index.
 * Matches the existing /projects/ design (dx, hx and ph classes in site.css).
 * The six hand-built illustrative studies stay untouched; published dashboard
 * projects are listed first, clearly tagged as projects (never as studies).
 */
var WxProjectRender = (function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function safeImg(u) {
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

  var HEADER = '<body id="project-page" data-page="project">\n<input type="checkbox" id="menu-cb" class="menu-cb" />\n' +
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
    '      <a href="/projects/" data-page-route="projects" aria-current="page">Projects</a><a href="/about/" data-page-route="about">About</a><a href="/insights/" data-page-route="insights">Insights</a><a id="nav-contact" href="/contact/" data-page-route="contact">Contact</a>\n' +
    '    </nav>\n' +
    '    <a class="header-cta" id="header-cta" href="#cta"><span class="header-cta-label">Get a quote</span></a>\n' +
    '    <label class="menu-toggle" for="menu-cb" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></label>\n' +
    '  </header>\n' +
    '<nav class="mobile-panel" id="mobile-menu" aria-label="Mobile navigation"><a href="/">Home</a><a href="/interior-design/">Interior Design</a><a href="/fit-out/">Fit Out</a><a href="/renovation/">Renovation</a><a href="/architecture/">Architecture</a><a href="/3d-visualization/">3D Studio</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/insights/">Insights</a><a class="mobile-primary" href="#cta">Get a quote</a></nav>\n' +
    '<main id="main-content">\n';

  var FOOTER = '</main>\n<footer class="footer"><div class="wrap">\n' +
    '    <div class="footer-main">\n' +
    '      <div class="footer-intro"><h2 id="footer-heading">Stay connected<br>with us.</h2><p id="footer-copy">Have a space in mind? Tell us what you have and where you are in the process.</p><a class="btn footer-cta" id="footer-cta" href="/contact/">Start your project</a></div>\n' +
    '      <nav class="footer-column" aria-label="Practice links"><h3>Practice</h3><a href="/about/" data-page-route="about">About</a><a href="/insights/design-process-explained/">Process</a><a href="/interior-design/" data-page-route="interior">Services</a><a href="/3d-visualization/" data-page-route="studio">3D Studio</a><a href="/projects/" data-page-route="projects" aria-current="page">Projects</a></nav>\n' +
    '      <nav class="footer-column" aria-label="Explore links"><h3>Explore</h3><a href="/interior-design/" data-page-route="interior">Interior design</a><a href="/fit-out/" data-page-route="fitout-hub">Fit out</a><a href="/turnkey-design-build/">Turnkey</a><a href="/renovation/" data-page-route="renovation">Renovation</a><a href="/architecture/" data-page-route="architecture">Architecture</a><a href="/insights/" data-page-route="insights">Insights</a><a href="/contact/">FAQ</a></nav>\n' +
    '      <div class="footer-column footer-contact"><h3>Get in touch</h3><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><a href="https://wa.me/923224000768">WhatsApp Woodex</a><a href="tel:+923224000768">+92 322 4000768</a><a href="tel:+923214686884">+92 321 4686884</a><address>M-71, Zainab Tower<br>Model Town Link Road<br>Lahore, Pakistan</address><p><strong>Mon–Sat 9:30–6:30</strong></p></div>\n' +
    '    </div>\n' +
    '    <div class="footer-word" aria-label="Interiors">INTERIORS</div>\n' +
    '    <div class="footer-bottom"><span>© 2026 Woodex Interior</span><div><span>Privacy</span><a href="https://woodexfurniture.pk" target="_blank" rel="noopener">Woodex Furniture™ ↗</a></div></div>\n' +
    '  </div></footer>\n<script src="/assets/site.js" defer></script>\n</body>\n</html>';

  var CTA = '\n    <section class="ph-section" id="cta" aria-labelledby="cta-title">\n' +
    '      <div class="ph-wrap ph-cta-grid">\n' +
    '        <div class="ph-cta-copy" data-ph-reveal="">\n' +
    '          <p class="ph-label">Start your project</p>\n' +
    '          <h2 id="cta-title">Tell us about your space.</h2>\n' +
    '          <p>Woodex Interior designs and builds across Lahore, Islamabad, Karachi and nationwide. Tell us about your space and we will take it from there.</p>\n' +
    '          <address class="ph-cta-meta">M-71, Zainab Tower, Model Town Link Road, Lahore<br><a href="tel:+923224000768">+92 322 4000768</a> &middot; <a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><br><strong>Mon&ndash;Sat 9:30&ndash;6:30</strong> &middot; Sunday closed</address>\n' +
    '          <div class="actions"><a class="btn" href="mailto:info@woodex.com.pk?subject=Start%20a%20Woodex%20project">Email the studio</a><a class="btn btn-light" href="tel:+923224000768">Call +92 322 4000768</a></div>\n' +
    '        </div>\n' +
    '        <figure class="ph-image ph-cta-media" data-ph-reveal=""><img src="/assets/img/img-c349a92a4ae0.webp" alt="Residential interior used as project photography placeholder"></figure>\n' +
    '      </div>\n' +
    '    </section>\n';

  // The six hand-built illustrative studies. Never altered, never reordered,
  // always listed after real published projects.
  var STATIC_STUDIES = [
    { slug: "courtyard-house", title: "A house around a courtyard", excerpt: "An existing house re-planned so light and a small court reach every room.", image: "/assets/img/img-27ed3ac85189.jpg", alt: "House courtyard view used as project photography placeholder" },
    { slug: "clinic-fit-out", title: "A clinic that calms", excerpt: "Waiting, consult and procedure arranged for calm and easy cleaning.", image: "/assets/img/img-5048d9095862.webp", alt: "Calm clinic waiting area used as project photography placeholder" },
    { slug: "retail-corner", title: "A corner shop that stops footfall", excerpt: "Entrance, display wall and checkout set out to turn footfall into sales.", image: "/assets/img/img-5194dc486e09.webp", alt: "Bright corner shop interior used as project photography placeholder" },
    { slug: "small-apartment", title: "Sixty square metres, fully used", excerpt: "One storage wall and clear sightlines make 60 square metres do three jobs.", image: "/assets/img/img-1f4b4ef86cb5.webp", alt: "Compact apartment living space used as project photography placeholder" },
    { slug: "office-floor", title: "One floor, three ways of working", excerpt: "Focus rows, meeting rooms and a social edge balanced for daylight and quiet.", image: "/assets/img/img-1d6ad6c77d0f.webp", alt: "Open-plan office floor used as project photography placeholder" },
    { slug: "cafe-corner", title: "A café that holds a crowd", excerpt: "Counter flow, mixed seating and lighting built to survive daily service.", image: "/assets/img/img-c7d3a3ebd62b.jpg", alt: "Corner café interior used as project photography placeholder" }
  ];

  function normalizeProject(p) {
    p = p || {};
    var images = Array.isArray(p.images) ? p.images : [];
    return {
      title: String(p.title || "Untitled project"),
      slug: String(p.slug || "project"),
      category: String(p.category || ""),
      location: String(p.location || ""),
      description: String(p.description || ""),
      images: images.map(function (im) {
        return {
          url: safeImg(im.url),
          caption: String(im.caption || ""),
          alt: String(im.alt || ""),
          width: Number(im.width) || 0,
          height: Number(im.height) || 0
        };
      }).filter(function (im) { return im.url; })
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

  function renderProjectHTML(raw) {
    var p = normalizeProject(raw);
    var hero = p.images.length ? p.images[0].url : DEFAULT_IMG;
    var heroAlt = p.images.length ? (p.images[0].alt || p.title) : "Woodex project";
    var desc = shortText(p.description, 160) || p.title;
    var canonical = "https://woodex.com.pk/projects/" + p.slug + "/";

    var jsonld = "[" + LOCAL_BIZ + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "Service",
      name: p.title, serviceType: p.category || "Interior project",
      description: desc, url: canonical,
      provider: { "@type": "LocalBusiness", name: "Woodex Interior" },
      areaServed: p.location ? { "@type": "City", name: p.location } : undefined
    }) + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://woodex.com.pk/" },
        { "@type": "ListItem", position: 2, name: "Projects", item: "https://woodex.com.pk/projects/" },
        { "@type": "ListItem", position: 3, name: p.title, item: canonical }
      ]
    }) + "]";

    var meta = "";
    if (p.category) meta += '<div class="dx-meta-item"><dt>Project type</dt><dd>' + esc(p.category) + "</dd></div>";
    if (p.location) meta += '<div class="dx-meta-item"><dt>Location</dt><dd>' + esc(p.location) + "</dd></div>";
    if (p.images.length) meta += '<div class="dx-meta-item"><dt>Photos</dt><dd>' + p.images.length + "</dd></div>";

    var body = "";
    paragraphs(p.description).forEach(function (para) {
      body += '<div data-st-reveal=""><p>' + esc(para) + "</p></div>\n";
    });
    if (p.images.length > 1) {
      body += '<div data-st-reveal=""><h2>Gallery</h2></div>\n';
      p.images.slice(1).forEach(function (im) {
        body += '<figure class="in-image" data-st-reveal="">' + imgTag(im, "", true);
        if (im.caption) body += "<figcaption>" + esc(im.caption) + "</figcaption>";
        body += "</figure>\n";
      });
    }

    return head(p.title, desc, canonical, jsonld) + HEADER +
      '\n    <section class="dx-hero dx-hero--image" aria-labelledby="dx-title">\n' +
      '      <img class="dx-hero-bg" src="' + esc(hero) + '" alt="' + esc(heroAlt) + '">\n' +
      '      <div class="dx-wrap dx-hero-inner" data-st-reveal>\n' +
      '        <p class="dx-kicker">' + esc(p.category || "Project") + "</p>\n" +
      '        <h1 id="dx-title">' + esc(p.title) + "</h1>\n" +
      (p.description ? '        <p class="dx-dek">' + esc(shortText(p.description, 180)) + "</p>\n" : "") +
      (meta ? '        <dl class="dx-meta">\n' + meta + "        </dl>\n" : "") +
      "      </div>\n    </section>\n" +
      '    <section class="dx-body">\n      <div class="dx-wrap">\n' + body +
      "      </div>\n    </section>\n" +
      CTA + FOOTER;
  }

  function projectCard(p) {
    var im = p.images.length ? p.images[0] : { url: DEFAULT_IMG, alt: "" };
    return '          <a class="hx-card" href="/projects/' + esc(p.slug) + '/" data-ph-reveal="">\n' +
      "            <figure>" + imgTag(im, "", true) + '<span class="hx-date">Project</span></figure>\n' +
      "            <h3>" + esc(p.title) + "</h3><p>" + esc(shortText(p.description, 140) || p.category || p.location || "Woodex Interior project.") + '</p><span class="hx-more">View the project</span>\n' +
      "          </a>\n";
  }

  function studyCard(s) {
    return '          <a class="hx-card" href="/projects/' + esc(s.slug) + '/" data-ph-reveal="">\n' +
      '            <figure><img src="' + esc(s.image) + '" alt="' + esc(s.alt) + '" loading="lazy"><span class="hx-date">Study · 2026</span></figure>\n' +
      "            <h3>" + esc(s.title) + "</h3><p>" + esc(s.excerpt) + '</p><span class="hx-more">View the study</span>\n' +
      "          </a>\n";
  }

  function renderIndexHTML(rawList) {
    var published = (rawList || []).map(normalizeProject);
    var hasReal = published.length > 0;

    var heroKicker = "Projects";
    var heroTitle = hasReal ? "Selected work and design studies." : "Studies in how spaces work.";
    var heroIntro = hasReal
      ? "Real Woodex projects, alongside six illustrative design studies in homes, clinics, shops, offices and cafés."
      : "Six anonymous studies in homes, clinics, shops, offices and cafés, each thought through to a buildable plan.";
    var metaDesc = hasReal
      ? "Woodex Interior projects and design studies from Lahore. Real fit-outs and interiors, plus six anonymous illustrative studies. Browse the shelf."
      : "Design studies from Woodex Interior, Lahore. Six anonymous, illustrative studies in homes, clinics, retail, offices and cafés, each thought through to a buildable plan. Browse the shelf.";

    var jsonld = "[" + LOCAL_BIZ + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "Service",
      name: "Projects", serviceType: "Projects", description: metaDesc,
      url: "https://woodex.com.pk/projects/",
      provider: { "@type": "LocalBusiness", name: "Woodex Interior" },
      areaServed: { "@type": "City", name: "Lahore" }
    }) + ", " + JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://woodex.com.pk/" },
        { "@type": "ListItem", position: 2, name: "Projects", item: "https://woodex.com.pk/projects/" }
      ]
    }) + "]";

    var cards = published.map(projectCard).join("") + STATIC_STUDIES.map(studyCard).join("");

    // Same shell as the hand-built index: projects hub body id for the hub styles.
    var hubHeader = HEADER.replace('<body id="project-page" data-page="project">', '<body id="projects-hub-page" data-page="projectsHub">');

    return head("Projects", metaDesc, "https://woodex.com.pk/projects/", jsonld) + hubHeader +
      '\n    <section class="hx-hero" aria-labelledby="projects-hero-title">\n' +
      '      <div class="hx-wrap">\n' +
      '        <p class="hx-kicker" data-ph-reveal="">' + esc(heroKicker) + "</p>\n" +
      '        <h1 id="projects-hero-title" data-ph-reveal="">' + esc(heroTitle) + "</h1>\n" +
      '        <p class="hx-intro" data-ph-reveal="">' + esc(heroIntro) + "</p>\n" +
      "      </div>\n" +
      '      <div class="hx-wordmark" aria-hidden="true">PROJECTS</div>\n' +
      "    </section>\n" +
      '\n    <section class="hx-grid" aria-label="Projects">\n' +
      '      <div class="hx-wrap">\n' +
      '        <div class="hx-cards">\n' + cards +
      "        </div>\n" +
      "      </div>\n" +
      "    </section>\n" +
      CTA + FOOTER;
  }

  return {
    STATIC_STUDIES: STATIC_STUDIES,
    normalizeProject: normalizeProject,
    renderProjectHTML: renderProjectHTML,
    renderIndexHTML: renderIndexHTML
  };
})();
