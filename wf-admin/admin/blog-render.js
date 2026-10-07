/* Woodex Blog renderer — pure functions, no DOM.
 * Used by the dashboard to generate public article pages + the Insights index.
 * Matches the existing /insights/ article design (dx, hx and in classes in site.css).
 */
var WxBlogRender = (function () {
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

  // The 8 hand-built articles already live under /insights/. New posts publish
  // alongside them; the index regenerator lists new posts first, then these.
  var STATIC_ARTICLES = [
    { slug: "interior-design-cost-pakistan", title: "What interior design costs in Pakistan", excerpt: "Design fees per sq ft, room refresh budgets, full home and office ranges, and what moves the number.", image: "/assets/img/img-774a712057fc.webp", alt: "Warm Woodex living room interior", read: "6 min read" },
    { slug: "design-process-explained", title: "How a Woodex project runs", excerpt: "From first call to handover: the four first steps plus design, 3D, quantities and build.", image: "/assets/img/img-81b231a6c390.webp", alt: "Bright Woodex studio lounge interior", read: "5 min read" },
    { slug: "3d-visualization-guide", title: "See the room before it exists", excerpt: "Stills, walkthroughs and 360 views at 4K and up, with 2 revision rounds included.", image: "/assets/img/img-27c481fa9a3d.webp", alt: "Minimal Woodex interior with custom joinery", read: "4 min read" },
    { slug: "small-space-ideas", title: "Small rooms that live large", excerpt: "Storage walls, sightlines, light and multipurpose zones for compact homes.", image: "/assets/img/img-c349a92a4ae0.webp", alt: "Compact Woodex residential interior", read: "4 min read" },
    { slug: "retail-shop-interior-guide", title: "A shop interior that sells", excerpt: "Entrance, path, display, trial and checkout, plus lighting and materials that last.", image: "/assets/img/img-f655d51401e8.webp", alt: "Woodex 3D Studio retail showroom", read: "5 min read" },
    { slug: "office-interior-guide", title: "An office that works as hard as you do", excerpt: "Zoning for focus, meet and social, plus acoustics, daylight and brand cues.", image: "/assets/img/img-5048d9095862.webp", alt: "Modern Woodex coworking office interior", read: "5 min read" },
    { slug: "restaurant-planning-guide", title: "Planning a restaurant interior", excerpt: "Service flow, seating mix, mood versus durability, and kitchen adjacency.", image: "/assets/img/img-6f26e32ab200.webp", alt: "Elegant restaurant dining interior", read: "5 min read" },
    { slug: "home-renovation-checklist", title: "A calm home renovation checklist", excerpt: "Survey first, freeze scope, hold a buffer, sequence trades, and live through it.", image: "/assets/img/img-1f4b4ef86cb5.webp", alt: "Home interior mid renovation planning", read: "5 min read" },
  ];

  var DEFAULT_COVER = "/assets/img/img-1d6ad6c77d0f.webp";

  var NOJS_STYLE = '<style>\n/* No-JS fallbacks: everything visible, carousels natively scrollable, FAQ answers open. */\n.menu-cb{position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none}\n#menu-cb:checked ~ .mobile-panel{opacity:1;visibility:visible;transform:none}\n#menu-cb:checked ~ .site-header .menu-toggle:before{transform:translateY(6px) rotate(45deg)}\n#menu-cb:checked ~ .site-header .menu-toggle span{opacity:0}\n#menu-cb:checked ~ .site-header .menu-toggle:after{transform:translateY(-6px) rotate(-6px)}\nhtml:not(.js) [class*="-faq-a"]{grid-template-rows:1fr !important}\nhtml:not(.js) .hub-services-viewport,html:not(.js) .related-viewport,html:not(.js) .fitout-scope-viewport{overflow-x:auto}\nhtml:not(.js) button[id$="-prev"],html:not(.js) button[id$="-next"]{display:none}\nhtml:not(.js) .hm-slider-controls{display:none}\nhtml:not(.js) .hm-slider-dots{display:none}\n.wxq{border-left:4px solid #0a0f1e;padding:4px 0 4px 20px;margin:0;font-size:1.15rem;line-height:1.6;color:#0a0f1e;font-style:italic}\n.wx-list{margin:0 0 0 1.2rem;padding:0}\n.wx-list li{margin:0 0 .6rem;line-height:1.7}\n</style>';

  function head(title, desc, canonical, jsonld) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
      "<title>" + esc(title) + " | Woodex Interior</title>\n" +
      '<meta name="description" content="' + esc(desc) + '" />\n' +
      '<link rel="canonical" href="' + esc(canonical) + '" />\n' +
      '<link rel="stylesheet" href="/assets/site.css" />\n' + NOJS_STYLE + "\n" +
      '<script type="application/ld+json">\n' + jsonld + "\n</script>\n</head>\n";
  }

  var HEADER = '<body id="insight-page" data-page="insight">\n<input type="checkbox" id="menu-cb" class="menu-cb" />\n' +
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
    '      <a href="/projects/" data-page-route="projects">Projects</a><a href="/about/" data-page-route="about">About</a><a href="/insights/" data-page-route="insights" aria-current="page">Insights</a><a id="nav-contact" href="/contact/" data-page-route="contact">Contact</a>\n' +
    '    </nav>\n' +
    '    <a class="header-cta" id="header-cta" href="#cta"><span class="header-cta-label">Get a quote</span></a>\n' +
    '    <label class="menu-toggle" for="menu-cb" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></label>\n' +
    '  </header>\n' +
    '<nav class="mobile-panel" id="mobile-menu" aria-label="Mobile navigation"><a href="/">Home</a><a href="/interior-design/">Interior Design</a><a href="/fit-out/">Fit Out</a><a href="/renovation/">Renovation</a><a href="/architecture/">Architecture</a><a href="/3d-visualization/">3D Studio</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/insights/">Insights</a><a class="mobile-primary" href="#cta">Get a quote</a></nav>\n' +
    '<main id="main-content">\n';

  var FOOTER = '</main>\n<footer class="footer"><div class="wrap">\n' +
    '    <div class="footer-main">\n' +
    '      <div class="footer-intro"><h2 id="footer-heading">Stay connected<br>with us.</h2><p id="footer-copy">Have a space in mind? Tell us what you have and where you are in the process.</p><a class="btn footer-cta" id="footer-cta" href="/contact/">Start your project</a></div>\n' +
    '      <nav class="footer-column" aria-label="Practice links"><h3>Practice</h3><a href="/about/" data-page-route="about">About</a><a id="footer-process" href="/insights/design-process-explained/">Process</a><a id="footer-services" href="/interior-design/">Services</a><a href="/3d-visualization/" data-page-route="studio">3D Studio</a><a href="/projects/" data-page-route="projects">Projects</a></nav>\n' +
    '      <nav class="footer-column" aria-label="Explore links"><h3>Explore</h3><a href="/interior-design/" data-page-route="interior">Interior design</a><a href="/fit-out/" data-page-route="fitout-hub">Fit out</a><a href="/turnkey-design-build/">Turnkey</a><a href="/renovation/" data-page-route="renovation">Renovation</a><a href="/architecture/" data-page-route="architecture">Architecture</a><a href="/insights/" data-page-route="insights" aria-current="page">Insights</a><a id="footer-faq" href="/contact/">FAQ</a></nav>\n' +
    '      <div class="footer-column footer-contact"><h3>Get in touch</h3><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><a href="https://wa.me/923224000768">WhatsApp Woodex</a><a href="tel:+923224000768">+92 322 4000768</a><a href="tel:+923214686884">+92 321 4686884</a><address>M-71, Zainab Tower<br>Model Town Link Road<br>Lahore, Pakistan</address><p><strong>Mon–Sat 9:30–6:30</strong></p></div>\n' +
    '    </div>\n' +
    '    <div class="footer-word" aria-label="Interiors">INTERIORS</div>\n' +
    '    <div class="footer-bottom"><span>© 2026 Woodex Interior</span><div><span>Privacy</span><a href="https://woodexfurniture.pk" target="_blank" rel="noopener">Woodex Furniture™ ↗</a></div></div>\n' +
    '  </div></footer>\n<script src="/assets/site.js" defer></script>\n</body>\n</html>';

  var CTA = '\n    <section class="in-section" id="cta"><div class="in-wrap in-cta-grid">\n' +
    '          <div class="in-cta-copy" data-in-reveal="">\n' +
    '            <p class="in-label">Start your project</p>\n' +
    '            <h2>Have a space in mind? Talk to the studio.</h2>\n' +
    '            <div class="in-cta-meta"><address>M-71, Zainab Tower, Model Town Link Road, Lahore</address><a href="tel:+923224000768">+92 322 4000768</a><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><p><strong>Mon–Sat 9:30–6:30</strong> · Sunday closed</p></div>\n' +
    '            <div class="actions"><a class="btn" href="mailto:info@woodex.com.pk?subject=Start%20a%20Woodex%20project">Email the studio</a><a class="btn btn-light" href="tel:+923224000768">Call +92 322 4000768</a></div>\n' +
    '          </div>\n' +
    '          <figure class="in-image" data-in-reveal=""><img src="/assets/img/img-c349a92a4ae0.webp" alt="Contemporary Woodex residential interior"></figure>\n' +
    '        </div></section>\n';

  function parseBlocks(content) {
    var arr = content;
    if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch (e) { arr = []; } }
    return Array.isArray(arr) ? arr : [];
  }

  function readTime(blocks) {
    var words = 0;
    blocks.forEach(function (b) { words += String(b.text || "").trim().split(/\s+/).length; });
    return Math.max(2, Math.round(words / 200)) + " min read";
  }

  function blocksHTML(blocks) {
    var html = "";
    blocks.forEach(function (b) {
      var t = String(b.text || "");
      if (b.type === "heading") {
        html += '<div data-in-reveal=""><h2>' + esc(t) + "</h2></div>";
      } else if (b.type === "image") {
        var u = safeImg(b.url);
        if (!u) return;
        html += '<figure class="in-image" data-in-reveal=""><img src="' + esc(u) + '" alt="' + esc(b.caption || b.text || "Woodex Interior") + '">';
        if (b.caption) html += "<figcaption>" + esc(b.caption) + "</figcaption>";
        html += "</figure>";
      } else if (b.type === "quote") {
        html += '<div data-in-reveal=""><blockquote class="wxq">' + esc(t) + "</blockquote></div>";
      } else if (b.type === "list") {
        var items = t.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
        if (!items.length) return;
        html += '<div data-in-reveal=""><ul class="wx-list">' +
          items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
      } else {
        var paras = t.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
        if (!paras.length) return;
        html += '<div data-in-reveal="">' +
          paras.map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("") + "</div>";
      }
    });
    return html;
  }

  // post: {slug,title,excerpt,cover_image,content,published_at}
  // all: normalized [{slug,title,excerpt,image,alt,read}] for related reading
  function renderPostHTML(post, all) {
    var slug = String(post.slug || "post");
    var title = String(post.title || "Untitled");
    var excerpt = String(post.excerpt || "").slice(0, 300) ||
      "Notes from the Woodex Interior studio in Lahore.";
    var cover = safeImg(post.cover_image) || DEFAULT_COVER;
    var blocks = parseBlocks(post.content);
    var read = readTime(blocks);
    var url = "https://woodex.com.pk/insights/" + slug + "/";

    var jsonld = JSON.stringify([
      { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Woodex Interior", "url": "https://woodex.com.pk", "telephone": ["+923224000768", "+923214686884"], "email": "info@woodex.com.pk", "address": { "@type": "PostalAddress", "streetAddress": "M-71, Zainab Tower, Model Town Link Road", "addressLocality": "Lahore", "addressCountry": "PK" }, "openingHours": "Mo-Sa 09:30-18:30" },
      { "@context": "https://schema.org", "@type": "Article", "headline": title, "description": excerpt, "image": cover, "datePublished": post.published_at || "", "author": { "@type": "Organization", "name": "Woodex Interior" }, "publisher": { "@type": "Organization", "name": "Woodex Interior" }, "mainEntityOfPage": url },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://woodex.com.pk/" }, { "@type": "ListItem", "position": 2, "name": "Insights", "item": "https://woodex.com.pk/insights/" }, { "@type": "ListItem", "position": 3, "name": title, "item": url }] }
    ]);

    var related = (all || []).filter(function (a) { return a.slug !== slug; }).slice(0, 3);
    var relatedHTML = "";
    if (related.length) {
      relatedHTML = '\n    <section class="dx-related">\n      <div class="dx-wrap">\n' +
        '        <header data-in-reveal><p class="dx-kicker">Keep looking</p><h2>Related reading.</h2></header>\n' +
        '        <div class="dx-cards">\n' +
        related.map(function (a) {
          return '        <a class="dx-card" href="/insights/' + esc(a.slug) + '/" data-in-reveal>\n' +
            '          <figure><img src="' + esc(a.image) + '" alt="' + esc(a.alt || a.title) + '"><figcaption class="dx-tag">Insights</figcaption></figure>\n' +
            "          <h3>" + esc(a.title) + "</h3>\n" +
            "          <p>" + esc(a.excerpt) + "</p>\n" +
            '          <span class="dx-more">Read the article</span>\n        </a>';
        }).join("\n") + '\n        </div>\n      </div>\n    </section>\n';
    }

    return head(title, excerpt, url, jsonld) + HEADER +
      '\n    <section class="dx-hero dx-hero--image" aria-labelledby="dx-title">\n' +
      '      <img class="dx-hero-bg" src="' + esc(cover) + '" alt="" aria-hidden="true">\n' +
      '      <div class="dx-wrap dx-hero-inner">\n' +
      '        <p class="dx-kicker">Studio notes</p>\n' +
      '        <h1 id="dx-title">' + esc(title) + "</h1>\n" +
      '        <p class="dx-dek">' + esc(excerpt) + "</p>\n" +
      '        <dl class="dx-meta">\n' +
      '          <div class="dx-meta-item"><dt>Read time</dt><dd>' + esc(read) + "</dd></div>\n" +
      '          <div class="dx-meta-item"><dt>Studio</dt><dd>Woodex Studio</dd></div>\n' +
      "        </dl>\n      </div>\n    </section>\n" +
      '\n    <section class="dx-body">\n      <div class="dx-wrap dx-body-grid">\n' +
      '        <div class="dx-main">\n' + blocksHTML(blocks) + "\n        </div>\n      </div>\n    </section>\n" +
      relatedHTML + CTA + FOOTER;
  }

  // publishedPosts: normalized [{slug,title,excerpt,image,alt,read}], newest first
  function renderInsightsIndex(publishedPosts) {
    var cards = (publishedPosts || []).concat(STATIC_ARTICLES).map(function (a) {
      return '          <a class="hx-card" href="/insights/' + esc(a.slug) + '/" data-ih-reveal="">\n' +
        '            <figure><img src="' + esc(a.image) + '" alt="' + esc(a.alt || a.title) + '"><span class="hx-date">' + esc(a.read || "") + "</span></figure>\n" +
        "            <h3>" + esc(a.title) + "</h3><p>" + esc(a.excerpt) + '</p><span class="hx-more">Read the article</span>\n          </a>';
    }).join("\n");

    var jsonld = JSON.stringify([
      { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Woodex Interior", "url": "https://woodex.com.pk", "telephone": ["+923224000768", "+923214686884"], "email": "info@woodex.com.pk", "address": { "@type": "PostalAddress", "streetAddress": "M-71, Zainab Tower, Model Town Link Road", "addressLocality": "Lahore", "addressCountry": "PK" }, "openingHours": "Mo-Sa 09:30-18:30" },
      { "@context": "https://schema.org", "@type": "Service", "name": "Insights | Woodex Interior", "serviceType": "Insights", "description": "Practical notes from our Lahore studio on interior design cost, process, 3D visualization and planning, for homes and commercial spaces across Pakistan.", "url": "https://woodex.com.pk/insights/", "provider": { "@type": "LocalBusiness", "name": "Woodex Interior" }, "areaServed": { "@type": "City", "name": "Lahore" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://woodex.com.pk/" }, { "@type": "ListItem", "position": 2, "name": "Insights", "item": "https://woodex.com.pk/insights/" }] },
      { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [] }
    ]);

    return head("Insights", "Practical notes from our Lahore studio on interior design cost, process, 3D visualization and planning, for homes and commercial spaces across Pakistan.", "https://woodex.com.pk/insights/", jsonld) +
      HEADER.replace('<body id="insight-page" data-page="insight">', '<body id="insights-hub-page" data-page="insightsHub">') +
      '\n    <section class="hx-hero" aria-labelledby="insights-hero-title">\n' +
      '      <div class="hx-wrap">\n' +
      '        <p class="hx-kicker" data-ih-reveal="">Notes from the studio</p>\n' +
      '        <h1 id="insights-hero-title" data-ih-reveal="">Ideas for better spaces.</h1>\n' +
      '        <p class="hx-intro" data-ih-reveal="">Practical reading on cost, process and planning, from our Lahore studio.</p>\n' +
      "      </div>\n" +
      '      <div class="hx-wordmark" aria-hidden="true">INSIGHTS</div>\n    </section>\n' +
      '\n    <section class="hx-grid" aria-label="Articles">\n      <div class="hx-wrap">\n        <div class="hx-cards">\n' + cards + "\n        </div>\n      </div>\n    </section>\n" +
      '\n    <section class="ih-section" id="cta"><div class="ih-wrap ih-cta-grid">\n' +
      '      <div class="ih-cta-copy" data-ih-reveal="">\n' +
      '        <p class="ih-label">Start your project</p>\n' +
      "        <h2>Tell us about your space.</h2>\n" +
      '        <div class="ih-cta-meta"><address>M-71, Zainab Tower, Model Town Link Road, Lahore</address><a href="tel:+923224000768">+92 322 4000768</a><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a><p><strong>Mon–Sat 9:30–6:30</strong> · Sunday closed</p></div>\n' +
      '        <div class="actions"><a class="btn" href="/contact/">Start your project</a><a class="btn btn-light" href="https://wa.me/923224000768" target="_blank" rel="noopener">WhatsApp us</a></div>\n' +
      "      </div>\n" +
      '      <figure class="ih-cta-media" data-ih-reveal=""><img src="/assets/img/img-1d6ad6c77d0f.webp" alt="Woodex designed interior"></figure>\n' +
      "    </div></section>\n" + FOOTER;
  }

  function normalizePost(p) {
    var blocks = parseBlocks(p.content);
    return {
      slug: p.slug, title: p.title, excerpt: p.excerpt || "",
      image: safeImg(p.cover_image) || DEFAULT_COVER,
      alt: p.title, read: readTime(blocks),
    };
  }

  // Two clearly-labelled sample drafts for testing the module (never auto-published).
  var SAMPLE_POSTS = [
    {
      slug: "sample-reading-a-boq",
      title: "SAMPLE - Reading a BOQ before you sign",
      excerpt: "Sample post for testing the blog module. A BOQ lists every item with its quantity and rate.",
      cover_image: "/assets/img/img-774a712057fc.webp",
      content: [
        { type: "paragraph", text: "This is a sample post created to test the blog module. It is a draft and is not visible on the live site until published." },
        { type: "heading", text: "What to check first" },
        { type: "paragraph", text: "A BOQ is a bill of quantities. Every item in the project is listed with its quantity and its rate, so the total is built line by line instead of guessed." },
        { type: "list", text: "Quantities you can verify on site\nRates per unit, not lump sums\nExclusions stated in writing" },
        { type: "quote", text: "Approve numbers, not promises." },
        { type: "heading", text: "Compare like with like" },
        { type: "paragraph", text: "When two quotes differ, the scope usually differs too. Ask every firm for the line-item BOQ and compare those instead of headline totals." },
      ],
    },
    {
      slug: "sample-small-office-big-impression",
      title: "SAMPLE - Small office, big impression",
      excerpt: "Sample post for testing the blog module. Notes on making a compact office feel considered.",
      cover_image: "/assets/img/img-5048d9095862.webp",
      content: [
        { type: "paragraph", text: "This is a sample post created to test the blog module. It is a draft and is not visible on the live site until published." },
        { type: "heading", text: "Zone before you decorate" },
        { type: "paragraph", text: "Small offices work when every zone has a job: focus desks, one honest meeting spot, and a social edge near daylight. Draw the zones before choosing any finish." },
        { type: "image", url: "/assets/img/img-5048d9095862.webp", caption: "Sample image block with a caption." },
        { type: "quote", text: "A small space with a clear plan beats a large one without." },
      ],
    },
  ];

  return {
    STATIC_ARTICLES: STATIC_ARTICLES,
    SAMPLE_POSTS: SAMPLE_POSTS,
    renderPostHTML: renderPostHTML,
    renderInsightsIndex: renderInsightsIndex,
    normalizePost: normalizePost,
    parseBlocks: parseBlocks,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = WxBlogRender;
