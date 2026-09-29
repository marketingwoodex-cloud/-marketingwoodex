/* Woodex Live Builder — section library. Every block uses v1.css classes only. */
window.WX_BLOCKS = [
  { id: "cta", name: "Call-to-action band", icon: "📣", html: `
<section class="wx-cta"><div class="wrap wx-cta-inner">
  <div><h2>Ready to plan your space?</h2><p>Share your brief and we will confirm the right next step within one working day.</p></div>
  <div class="wx-actions"><a class="btn wx-btn-light" href="/contact/">Start your project</a><a class="btn wx-btn-outline wx-btn-light" href="/estimator/">Get an estimate</a></div>
</div></section>` },

  { id: "split", name: "Text + image", icon: "🖼️", html: `
<section class="wx-split"><div class="wrap wx-split-grid">
  <div class="wx-split-copy"><p class="wx-kicker">About the approach</p><h2>A heading that explains the benefit</h2>
    <p>Write two or three sentences here. Explain what the client gets, how it works and why it matters.</p>
    <ul><li>First key point</li><li>Second key point</li><li>Third key point</li></ul>
    <div class="wx-actions"><a class="btn wx-btn-dark" href="/contact/">Talk to us</a></div></div>
  <figure class="wx-split-media"><img src="/assets/img/img-c349a92a4ae0.webp" alt="Describe this image" loading="lazy" width="1600" height="1200"></figure>
</div></section>` },

  { id: "split-rev", name: "Image + text", icon: "🪞", html: `
<section class="wx-split wx-reverse"><div class="wrap wx-split-grid">
  <div class="wx-split-copy"><p class="wx-kicker">Craft</p><h2>Made in our own workshop</h2>
    <p>Kitchens, wardrobes and joinery built to the same drawings the site team uses, so everything fits on the first install.</p>
    <div class="wx-actions"><a class="btn wx-btn-outline" href="/projects/">See projects</a></div></div>
  <figure class="wx-split-media"><img src="/assets/img/img-f655d51401e8.webp" alt="Describe this image" loading="lazy" width="1600" height="1200"></figure>
</div></section>` },

  { id: "cards", name: "Feature cards (3)", icon: "🗂️", html: `
<section class="wx-features"><div class="wrap">
  <header class="wx-block-head"><p class="wx-kicker">What you get</p><h2>Three reasons clients choose Woodex</h2><p>A short line that introduces the cards below.</p></header>
  <div class="wx-cards">
    <article class="wx-cardx"><h3>Feature one</h3><p>Describe the benefit in one or two short sentences.</p></article>
    <article class="wx-cardx"><h3>Feature two</h3><p>Describe the benefit in one or two short sentences.</p></article>
    <article class="wx-cardx"><h3>Feature three</h3><p>Describe the benefit in one or two short sentences.</p></article>
  </div>
</div></section>` },

  { id: "stats", name: "Numbers strip", icon: "🔢", html: `
<section class="wx-stats" aria-label="Key numbers"><div class="wrap wx-stats-grid">
  <div class="wx-stat"><strong>2016</strong><span>Practising from Lahore</span></div>
  <div class="wx-stat"><strong>200+</strong><span>Completed spaces</span></div>
  <div class="wx-stat"><strong>6</strong><span>Disciplines, one team</span></div>
  <div class="wx-stat"><strong>4</strong><span>Cities served</span></div>
</div></section>` },

  { id: "process", name: "Process steps (4)", icon: "🪜", html: `
<section class="wx-process"><div class="wrap">
  <header class="wx-process-head"><div><p class="wx-kicker">How we work</p><h2>Four clear stages</h2></div><p>Explain the process in one sentence.</p></header>
  <ol class="wx-steps">
    <li class="wx-step"><h3>Brief</h3><p>What happens in this stage.</p></li>
    <li class="wx-step"><h3>Design</h3><p>What happens in this stage.</p></li>
    <li class="wx-step"><h3>Build</h3><p>What happens in this stage.</p></li>
    <li class="wx-step"><h3>Handover</h3><p>What happens in this stage.</p></li>
  </ol>
</div></section>` },

  { id: "gallery", name: "Image gallery", icon: "🏛️", html: `
<section class="wx-gallery"><div class="wrap">
  <header class="wx-block-head"><p class="wx-kicker">Gallery</p><h2>Recent spaces</h2></header>
  <div class="wx-gallery-grid">
    <figure><img src="/assets/img/img-dce06249b137.webp" alt="Project image" loading="lazy" width="1920" height="1280"></figure>
    <figure><img src="/assets/img/img-1d6ad6c77d0f.webp" alt="Project image" loading="lazy" width="1920" height="1280"></figure>
    <figure><img src="/assets/img/img-f655d51401e8.webp" alt="Project image" loading="lazy" width="1920" height="1280"></figure>
    <figure><img src="/assets/img/img-c349a92a4ae0.webp" alt="Project image" loading="lazy" width="2240" height="1120"></figure>
    <figure><img src="/assets/img/img-27c481fa9a3d.webp" alt="Project image" loading="lazy" width="1920" height="1280"></figure>
  </div>
</div></section>` },

  { id: "quotes", name: "Testimonials", icon: "💬", html: `
<section class="wx-testimonials wx-bg-light"><div class="wrap">
  <header class="wx-block-head"><p class="wx-kicker">Client words</p><h2>What our clients say</h2></header>
  <div class="wx-quotes">
    <blockquote class="wx-quote"><p>“Replace with a real client quote. Keep it short and specific.”</p><footer><strong>Client name</strong>Project type, City</footer></blockquote>
    <blockquote class="wx-quote"><p>“Replace with a real client quote. Keep it short and specific.”</p><footer><strong>Client name</strong>Project type, City</footer></blockquote>
    <blockquote class="wx-quote"><p>“Replace with a real client quote. Keep it short and specific.”</p><footer><strong>Client name</strong>Project type, City</footer></blockquote>
  </div>
</div></section>` },

  { id: "faq", name: "FAQ", icon: "❓", html: `
<section class="wx-faq"><div class="wrap">
  <header class="wx-block-head"><p class="wx-kicker">Questions</p><h2>Frequently asked questions</h2></header>
  <div class="wx-faq-list">
    <details open><summary>First question?</summary><p>Answer the question clearly in one or two sentences.</p></details>
    <details><summary>Second question?</summary><p>Answer the question clearly in one or two sentences.</p></details>
    <details><summary>Third question?</summary><p>Answer the question clearly in one or two sentences.</p></details>
  </div>
</div></section>` },

  { id: "prose", name: "Text block", icon: "📝", html: `
<section class="wx-text"><div class="wrap"><div class="wx-prose">
  <h2>Section heading</h2>
  <p>Write your paragraph here. Click any text in the preview to edit it directly.</p>
  <p>Add a second paragraph if needed.</p>
</div></div></section>` },

  { id: "logos", name: "Clients / logos strip", icon: "🏷️", html: `
<section class="wx-clients wx-pad-s"><div class="wrap">
  <div class="wx-logos"><span>CLIENT ONE</span><span>CLIENT TWO</span><span>CLIENT THREE</span><span>CLIENT FOUR</span><span>CLIENT FIVE</span></div>
</div></section>` },

  { id: "trust", name: "Why Woodex", icon: "🛡️", html: `
<section class="wx-trust"><div class="wrap wx-trust-grid">
  <div class="wx-trust-copy"><p class="wx-kicker">Why Woodex</p><h2>One accountable team from brief to handover</h2><p>Architecture, interiors, fit-out, renovation, 3D and custom furniture from one Lahore studio.</p>
    <div class="wx-actions"><a class="btn wx-btn-dark" href="/contact/">Start your project</a></div></div>
  <ul class="wx-trust-list">
    <li><strong>200+ completed spaces</strong><span>Homes, offices, retail and hospitality.</span></li>
    <li><strong>In-house 3D studio</strong><span>See the space before work begins.</span></li>
    <li><strong>Own furniture workshop</strong><span>Joinery made to the drawing.</span></li>
    <li><strong>Clear programme</strong><span>Dates agreed up front.</span></li>
  </ul>
</div></section>` }
];

/* Small elements — dropped into an existing section */
window.WX_ELEMENTS = [
  { id: "h2", name: "Heading", icon: "H", html: `<h2>New heading</h2>` },
  { id: "h3", name: "Sub-heading", icon: "h", html: `<h3>New sub-heading</h3>` },
  { id: "p", name: "Paragraph", icon: "¶", html: `<p>Write your text here. Click to edit it directly.</p>` },
  { id: "kicker", name: "Small label", icon: "ᴬ", html: `<p class="wx-kicker">Small label</p>` },
  { id: "btn", name: "Button", icon: "▭", html: `<div class="wx-actions"><a class="btn wx-btn-dark" href="/contact/">Button text</a></div>` },
  { id: "btn2", name: "Two buttons", icon: "▭▭", html: `<div class="wx-actions"><a class="btn wx-btn-dark" href="/contact/">Start your project</a><a class="btn wx-btn-outline" href="/estimator/">Get an estimate</a></div>` },
  { id: "img", name: "Image", icon: "🖼", html: `<figure class="wx-split-media"><img src="/assets/img/img-c349a92a4ae0.webp" alt="Describe this image" loading="lazy" width="1600" height="1200"></figure>` },
  { id: "video", name: "Video (YouTube)", icon: "▶", html: `<div class="wx-el-video" data-wx-video><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video" loading="lazy" allowfullscreen></iframe></div>` },
  { id: "list", name: "Check list", icon: "✓", html: `<ul class="wx-el-list"><li>First point</li><li>Second point</li><li>Third point</li></ul>` },
  { id: "quote", name: "Quote", icon: "❝", html: `<blockquote class="wx-quote"><p>“A short client quote goes here.”</p><footer><strong>Client name</strong>Project, City</footer></blockquote>` },
  { id: "cols2", name: "2 columns", icon: "▥", html: `<div class="wx-cols wx-cols-2"><div><h3>Column one</h3><p>Text for the first column.</p></div><div><h3>Column two</h3><p>Text for the second column.</p></div></div>` },
  { id: "cols3", name: "3 columns", icon: "▦", html: `<div class="wx-cols wx-cols-3"><div><h3>One</h3><p>Short text.</p></div><div><h3>Two</h3><p>Short text.</p></div><div><h3>Three</h3><p>Short text.</p></div></div>` },
  { id: "box", name: "Card box", icon: "▢", html: `<div class="wx-el-box"><h3>Card title</h3><p>Card text goes here.</p></div>` },
  { id: "spacer", name: "Spacer", icon: "↕", html: `<div class="wx-el-spacer" aria-hidden="true"></div>` },
  { id: "divider", name: "Divider line", icon: "—", html: `<hr class="wx-el-divider">` },
  { id: "map", name: "Google map", icon: "📍", html: `<div class="wx-el-map" data-wx-map><iframe src="https://www.google.com/maps?q=Lahore&output=embed" title="Map" loading="lazy"></iframe></div>` }
];

/* Phase 4 — components & widgets (icons are filled in by the builder from the icon set) */
window.WX_ELEMENTS = (window.WX_ELEMENTS || []).concat([
  { id: "icon", name: "Icon", icon: "★", cat: "Widgets", html: `<span class="wx-icon-box" data-wx-icon="star"></span>` },
  { id: "iconcards", name: "Icon features (3)", icon: "✦", cat: "Components", html: `<div class="wx-cols wx-cols-3"><div class="wx-el-box"><span class="wx-icon-box" data-wx-icon="ruler"></span><h3>Planning</h3><p>Measured layouts and clear drawings.</p></div><div class="wx-el-box"><span class="wx-icon-box" data-wx-icon="hammer"></span><h3>Build</h3><p>One team from shell to handover.</p></div><div class="wx-el-box"><span class="wx-icon-box" data-wx-icon="sofa"></span><h3>Furnish</h3><p>Furniture made for the space.</p></div></div>` },
  { id: "accordion", name: "Accordion", icon: "☰", cat: "Components", html: `<div class="wx-acc"><details open><summary>First question</summary><div><p>Answer to the first question.</p></div></details><details><summary>Second question</summary><div><p>Answer to the second question.</p></div></details><details><summary>Third question</summary><div><p>Answer to the third question.</p></div></details></div>` },
  { id: "tabs", name: "Tabs", icon: "⊟", cat: "Components", html: `<div class="wx-tabs"><input type="radio" name="wxt" id="wxt-1" checked><label for="wxt-1">Residential</label><input type="radio" name="wxt" id="wxt-2"><label for="wxt-2">Commercial</label><input type="radio" name="wxt" id="wxt-3"><label for="wxt-3">Hospitality</label><div class="wx-tab"><p>Homes planned around the way you live.</p></div><div class="wx-tab"><p>Offices and retail built to programme.</p></div><div class="wx-tab"><p>Restaurants, cafés and hotels.</p></div></div>` },
  { id: "alert", name: "Alert / notice", icon: "ⓘ", cat: "Components", html: `<div class="wx-alert" role="note"><strong>Note:</strong> Site visits are available Monday to Saturday.</div>` },
  { id: "badges", name: "Badges", icon: "◉", cat: "Components", html: `<div class="wx-badges"><span class="wx-badge">Residential</span><span class="wx-badge">Commercial</span><span class="wx-badge">Turnkey</span></div>` },
  { id: "progress", name: "Progress bars", icon: "▰", cat: "Components", html: `<div class="wx-progress"><div><span>Design<em>100%</em></span><i><b style="width:100%"></b></i></div><div><span>Construction<em>70%</em></span><i><b style="width:70%"></b></i></div><div><span>Furniture<em>40%</em></span><i><b style="width:40%"></b></i></div></div>` },
  { id: "table", name: "Table", icon: "▦", cat: "Components", html: `<div style="overflow-x:auto"><table class="wx-table"><thead><tr><th>Package</th><th>Includes</th><th>From</th></tr></thead><tbody><tr><td>Design only</td><td>Layouts, 3D, drawings</td><td>PKR —</td></tr><tr><td>Design + Build</td><td>Everything, one team</td><td>PKR —</td></tr></tbody></table></div>` },
  { id: "form", name: "Contact form", icon: "✉", cat: "Components", html: `<form class="wx-form" action="/api/contact" method="post"><label>Name<input type="text" name="name" autocomplete="name" required></label><label>Phone<input type="tel" name="phone" autocomplete="tel" required></label><label>Message<textarea name="message" rows="4"></textarea></label><button class="btn wx-btn-dark" type="submit">Send message</button></form>` },
  { id: "counters", name: "Counters", icon: "#", cat: "Widgets", html: `<div class="wx-counters"><div><strong data-wx-count="250">250</strong><span>Projects delivered</span></div><div><strong data-wx-count="10">10</strong><span>Years in practice</span></div><div><strong data-wx-count="6">6</strong><span>Cities served</span></div></div>` },
  { id: "countdown", name: "Countdown", icon: "⏱", cat: "Widgets", html: `<div class="wx-countdown" data-wx-countdown="2026-12-31T23:59:00"><div><b data-u="d">00</b><small>Days</small></div><div><b data-u="h">00</b><small>Hours</small></div><div><b data-u="m">00</b><small>Minutes</small></div><div><b data-u="s">00</b><small>Seconds</small></div></div>` },
  { id: "bars", name: "Bar chart", icon: "▮", cat: "Widgets", html: `<div class="wx-bars" role="img" aria-label="Projects per year"><div><b style="--v:40%"></b><small>2022</small></div><div><b style="--v:60%"></b><small>2023</small></div><div><b style="--v:80%"></b><small>2024</small></div><div><b style="--v:100%"></b><small>2025</small></div></div>` },
  { id: "social", name: "Social icons", icon: "@", cat: "Widgets", html: `<div class="wx-social"><a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noopener" data-wx-icon="instagram"></a><a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noopener" data-wx-icon="facebook"></a><a href="https://www.linkedin.com/" aria-label="LinkedIn" target="_blank" rel="noopener" data-wx-icon="linkedin"></a><a href="https://www.youtube.com/" aria-label="YouTube" target="_blank" rel="noopener" data-wx-icon="youtube"></a></div>` },
  { id: "whatsapp", name: "WhatsApp button", icon: "☏", cat: "Widgets", html: `<a class="wx-wa" href="https://wa.me/923000000000" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-wx-icon="message-circle"><span>WhatsApp</span></a>` }
]);
