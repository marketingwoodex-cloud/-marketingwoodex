#!/usr/bin/env node
/* Woodex v2.7 — section-suite builder.
 *
 *   node tools/build-sections.mjs
 *
 * Source of truth for the 70-block section suite. It emits two artefacts from one definition:
 *
 *   woodex-live-p23/_templates/section-library.json   the catalogue (categories + blocks + spec)
 *   woodex-live-p23/builder/sections-v27.js           window.WX_SECTIONS for the builder tray
 *
 * WHY a generator: the same 70 blocks have to stay byte-identical in the admin library, the
 * builder tray, the exported starter pack and the preview iframes. Editing three copies by hand
 * is how block libraries rot, so the markup lives here once and every consumer reads a build.
 *
 * Every block uses the .s27-* vocabulary from assets/sections-v27.css (which itself reads the
 * site tokens), real Woodex content — Punjab rates in PKR, millimetre board sizes, named
 * hardware — and images that exist in assets/img. `node tools/audit-classes.mjs` checks the
 * emitted markup against the stylesheets, so an unstyled block cannot ship.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "woodex-live-p23");

/* ---- images that exist in assets/img (checked by tests/sections.test.js) ---- */
const IMG = {
  kitchen:    ["/assets/img/svc-kitchen-renovation-960.webp", "Kitchen joinery fabricated in the Woodex workshop"],
  kitchenL:   ["/assets/img/ins-kitchenlayout-960.webp", "Kitchen laid out to the plumbing and gas positions on site"],
  wardrobe:   ["/assets/img/svc-wardrobe-design-960.webp", "Wardrobe wall built to the ceiling line"],
  dressing:   ["/assets/img/svc-dressing-room-design-960.webp", "Dressing room internals: drawers, rails and loft storage"],
  office:     ["/assets/img/svc-office-fit-out-960.webp", "Office fit-out with workstations and glass partitions"],
  commercial: ["/assets/img/svc-commercial-fit-out-960.webp", "Commercial fit-out handover"],
  retail:     ["/assets/img/svc-retail-fit-out-960.webp", "Retail joinery and display shelving"],
  turnkey:    ["/assets/img/svc-turnkey-design-build-960.webp", "Turnkey design and build project"],
  fitout:     ["/assets/img/svc-fit-out-960.webp", "Interior fit-out in progress"],
  materials:  ["/assets/img/ins-materials-960.webp", "Board, laminate and edge-banding samples"],
  lighting:   ["/assets/img/ins-lighting-960.webp", "Layered lighting in a finished room"],
  flooring:   ["/assets/img/ins-flooring-960.webp", "Flooring laid to a set-out drawing"],
  ceiling:    ["/assets/img/ins-ceiling-960.webp", "False ceiling with cove detail"],
  homeoffice: ["/assets/img/ins-homeoffice-960.webp", "Home office joinery"],
  bathroom:   ["/assets/img/ins-bathroom-960.webp", "Bathroom vanity and storage"],
  renovation: ["/assets/img/ins-renovation-960.webp", "Renovation handover"],
  apartment:  ["/assets/img/svc-apartment-interior-design-960.webp", "Apartment interior package"],
  house1k:    ["/assets/img/svc-1-kanal-house-design-960.webp", "1 kanal house interior"],
  dha:        ["/assets/img/area-dha-960.webp", "DHA Lahore project"],
  bahria:     ["/assets/img/area-bahria-town-960.webp", "Bahria Town project"],
  gulberg:    ["/assets/img/area-gulberg-960.webp", "Gulberg project"],
  johar:      ["/assets/img/area-johar-town-960.webp", "Johar Town project"],
  clinic:     ["/assets/img/ins-clinic-960.webp", "Clinic fit-out"],
  salon:      ["/assets/img/ins-salon-960.webp", "Salon fit-out"],
  bathroomD:  ["/assets/img/ins-bathroom-960.webp", "Bathroom detail"]
};
const figure = (key, opts = {}) => {
  const [src, alt] = IMG[key];
  return `<figure class="s27-hero-figure"${opts.ratio ? ` style="aspect-ratio:${opts.ratio}"` : ""}><img src="${src}" alt="${alt}" loading="lazy" width="960" height="${opts.h || 640}"></figure>`;
};
const img = (key, w = 960, h = 720) => `<img src="${IMG[key][0]}" alt="${IMG[key][1]}" loading="lazy" width="${w}" height="${h}">`;

const head = (kicker, h2, lead, center) =>
  `<header class="s27-head${center ? " s27-head--center" : ""}"><p class="s27-kicker">${kicker}</p><h2 class="s27-h2">${h2}</h2><p class="s27-lead">${lead}</p></header>`;
const actions = (list) => `<div class="s27-actions">${list.join("")}</div>`;
const btn = (href, label, pri) => `<a class="btn${pri ? " wx-btn-light" : ""}" href="${href}">${label}</a>`;
const spec = (rows) => `<ul class="s27-spec">${rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("")}</ul>`;
const tags = (list) => `<div class="s27-tags">${list.map(t => `<span class="s27-tag">${t}</span>`).join("")}</div>`;
const price = (amount, unit) => `<p class="s27-price"><b>${amount}</b><small>${unit}</small></p>`;
const steps = (list) => `<div class="s27-steps">${list.map(([t, d]) => `<div class="s27-step"><h3>${t}</h3><p class="s27-lead">${d}</p></div>`).join("")}</div>`;
const table = (caption, cols, rows) => `<table class="s27-table"><caption>${caption}</caption><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<td>${c}</td>` : `<td><b>${c}</b></td>`).join("")}</tr>`).join("")}</tbody></table>`;
const faq = (items, two) => `<div class="s27-faq${two ? " s27-faq--2" : ""}">${items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
const quote = (text, who, where, key, lead) =>
  `<figure class="s27-quote${lead ? " s27-quote--lead" : ""}"><blockquote>“${text}”</blockquote><figcaption>${key ? img(key, 96, 96) : ""}<span><b>${who}</b> · ${where}</span></figcaption></figure>`;

const B = [];   /* block catalogue */
const add = (cat, id, name, icon, blockTags, html) => B.push({ id, cat, name, icon, tags: blockTags, html: html.trim() });

/* =============================================================================
   HERO — 10 blocks. Each one is a different entry point: service, locality,
   material transparency, commercial, estimator-first, editorial.
   ========================================================================== */
add("Hero", "hero-01-split", "Hero — split, service entry", "🏠", ["turnkey", "lahore"], `
<section class="s27 s27-sec s27-hero s27-hero--split">
  <div class="s27-wrap s27-hero-grid">
    <div class="s27-hero-copy">
      <p class="s27-kicker">Design &amp; build · Lahore</p>
      <h2 class="s27-h2">Interiors delivered from one drawing set, not three contractors</h2>
      <p class="s27-lead">Woodex surveys, draws, fabricates in our own workshop and installs with our own site team. You get one accountable party, a board-foot rate you can audit, and a handover date in the contract.</p>
      ${actions([btn("/estimator/", "Get an instant estimate", 1), btn("/projects/", "See 240+ projects")])}
    </div>
    ${figure("turnkey")}
  </div>
</section>`);

add("Hero", "hero-02-full", "Hero — full-bleed image", "🖼️", ["kitchen", "image"], `
<section class="s27 s27-hero s27-hero--full">
  <div class="s27-hero-media">${img("kitchen", 1920, 1080)}</div>
  <div class="s27-wrap s27-hero-copy">
    <p class="s27-kicker">Kitchen renovation</p>
    <h2 class="s27-h2">A kitchen that fits your plumbing, gas and family — in that order</h2>
    <p class="s27-lead">Runs measured to the millimetre, moisture-resistant cores, granite or quartz tops, and shutters you can replace one at a time in five years.</p>
    ${actions([btn("/estimator/", "Price my kitchen", 1), btn("/kitchen-design/", "Kitchen services")])}
  </div>
</section>`);

add("Hero", "hero-03-band", "Hero — dark band", "🌙", ["workshop", "dark"], `
<section class="s27 s27-sec s27-hero s27-hero--band">
  <div class="s27-wrap">
    <p class="s27-kicker">In-house workshop · Lahore</p>
    <h2 class="s27-h2">Joinery cut on CNC, assembled by carpenters we employ</h2>
    <p class="s27-lead">Twelve carpenters, two edge-banders and a spray booth. Nothing is outsourced to a second shop, so the wardrobe that leaves here is the wardrobe that gets installed.</p>
    ${actions([btn("/about/", "Inside the workshop"), btn("/contact/", "Book a visit")])}
  </div>
</section>`);

add("Hero", "hero-04-grid", "Hero — two-image grid", "🧱", ["office", "grid"], `
<section class="s27 s27-sec s27-hero s27-hero--grid">
  <div class="s27-wrap s27-hero-copy" style="grid-column:1/-1">
    <p class="s27-kicker">Office fit-out</p>
    <h2 class="s27-h2">Workstations, cabins and glass partitions on one programme</h2>
    <p class="s27-lead">We plan the cable runs, the AC positions and the door swings before a single board is cut — then fit out around your working week.</p>
  </div>
  ${figure("office", { ratio: "4/3" })}
  ${figure("commercial", { ratio: "4/3" })}
</section>`);

add("Hero", "hero-05-stats", "Hero — statistics strip", "📊", ["proof", "numbers"], `
<section class="s27 s27-sec s27-hero">
  <div class="s27-wrap">
    <p class="s27-kicker">Why clients stay with us</p>
    <h2 class="s27-h2">Transparent numbers, not adjectives</h2>
    <p class="s27-lead">Every quotation shows square feet, board feet, waste percentage and transport zone. If a line looks wrong you can challenge it line by line.</p>
    <div class="s27-hero-strip">
      <div class="s27-hero-stat"><b>240+</b><span>projects handed over</span></div>
      <div class="s27-hero-stat"><b>18 years</b><span>in Punjab fit-out</span></div>
      <div class="s27-hero-stat"><b>12%</b><span>standard board waste, shown openly</span></div>
      <div class="s27-hero-stat"><b>5 years</b><span>hardware warranty</span></div>
    </div>
  </div>
</section>`);

add("Hero", "hero-06-estimator", "Hero — estimator first", "🧮", ["estimator", "conversion"], `
<section class="s27 s27-sec s27-hero s27-sec--soft">
  <div class="s27-wrap s27-hero-grid" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.85fr);gap:32px;align-items:center">
    <div>
      <p class="s27-kicker">Estimate before you commit</p>
      <h2 class="s27-h2">Running feet in, honest price range out</h2>
      <p class="s27-lead">Pick the service, enter the run or area, choose the finish. The estimator applies the current Punjab rate card, waste and transport zone, and shows you the breakdown — no phone call needed.</p>
      ${actions([btn("/estimator/", "Open the estimator", 1), btn("/contact/", "Send drawings instead")])}
    </div>
    <div class="s27-card"><div class="s27-card-b">
      <h3>What the estimate includes</h3>
      ${spec([["Carcass &amp; shutters", "included"], ["Hardware", "Hettich / Blum"], ["Edge banding", "ABS 2 mm"], ["Transport", "by zone"], ["Installation", "included"], ["Tax", "18% GST shown separately"]])}
    </div></div>
  </div>
</section>`);

add("Hero", "hero-07-locality", "Hero — locality landing", "📍", ["local-seo", "area"], `
<section class="s27 s27-sec s27-hero s27-hero--split">
  <div class="s27-wrap s27-hero-grid">
    <div class="s27-hero-copy">
      <p class="s27-kicker">DHA Lahore · Phases 1–8</p>
      <h2 class="s27-h2">Building in DHA? We already know your plot rules</h2>
      <p class="s27-lead">Set-back limits, society working hours, lift and gate passes, and the contractor vetting DHA asks for — handled. Site teams are already active in the phase, so transport and supervision cost less.</p>
      ${actions([btn("/areas/dha-lahore/", "DHA projects", 1), btn("/contact/", "Check my address")])}
      ${tags(["DHA Phase 1–8", "Bahria Town", "Gulberg", "Johar Town", "Model Town"])}
    </div>
    ${figure("dha")}
  </div>
</section>`);

add("Hero", "hero-08-service", "Hero — service landing", "🚪", ["wardrobe", "service"], `
<section class="s27 s27-sec s27-hero s27-hero--split">
  <div class="s27-wrap s27-hero-grid">
    <div class="s27-hero-copy">
      <p class="s27-kicker">Wardrobe design &amp; fabrication</p>
      <h2 class="s27-h2">Built to the ceiling line, so dust never lands on top</h2>
      <p class="s27-lead">Sliding, hinged or walk-in. We measure the room, plan the internals around what you actually store, and quote per unit — not per “running foot of average quality”.</p>
      ${actions([btn("/wardrobe-design/", "Wardrobe services", 1), btn("/estimator/", "Wardrobe estimate")])}
    </div>
    ${figure("wardrobe")}
  </div>
</section>`);

add("Hero", "hero-09-commercial", "Hero — commercial entry", "🏢", ["retail", "commercial"], `
<section class="s27 s27-sec s27-hero s27-hero--band">
  <div class="s27-wrap s27-hero-grid" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:center">
    <div>
      <p class="s27-kicker">Retail, clinics and showrooms</p>
      <h2 class="s27-h2">Fit-out that survives the first hundred customers a day</h2>
      <p class="s27-lead">Counters reinforced for POS hardware, shelving rated for stock loads, and finishes chosen for cleaning chemicals rather than for a photograph.</p>
      ${actions([btn("/commercial-fit-out/", "Commercial fit-out"), btn("/contact/", "Request a survey")])}
    </div>
    ${figure("retail")}
  </div>
</section>`);

add("Hero", "hero-10-editorial", "Hero — editorial, materials", "📰", ["materials", "trust"], `
<section class="s27 s27-sec s27-hero">
  <div class="s27-wrap s27-hero-grid" style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:36px;align-items:center">
    <div>
      <p class="s27-kicker">How we price joinery</p>
      <h2 class="s27-h2">Board feet, waste and labour — written on the quotation</h2>
      <p class="s27-lead">A 2.5 in × 4 in × 10 ft member is 5.21 board feet. Multiply by the species rate, add the waste allowance your design actually needs, then add regional labour. That is the whole formula, and it is on your quote.</p>
      ${actions([btn("/insights/board-foot-pricing/", "Read the explainer", 1)])}
    </div>
    <figure class="s27-hero-figure">${img("materials", 900, 620)}</figure>
  </div>
</section>`);

/* =============================================================================
   KITCHENS — 10 blocks, one per layout/configuration a Lahore kitchen actually
   asks for. Each block quotes a run, a top and a shutter system.
   ========================================================================== */
add("Kitchens", "kit-l-shape", "Kitchen — L-shape with corner carousel", "🥘", ["L-shape", "granite"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Kitchen layout", "L-shape — the default for 5 and 10 marla kitchens", "Two walls, one corner, work triangle closed. We lose the dead corner to a carousel, not to a blank panel.")}
    <div class="s27-grid s27-grid--2">
      <figure class="s27-hero-figure">${img("kitchenL", 960, 720)}</figure>
      <div class="s27-card"><div class="s27-card-b">
        <h3>Typical 5 marla L-shape</h3>
        ${spec([["Run (both legs)", "12–15 running ft"], ["Base height", "865 mm + 100 mm plinth"], ["Carcass", "MR 18 mm melamine"], ["Counter", "Granite 18 mm, 600 mm deep"], ["Shutters", "HPL 1 mm, ABS 2 mm edges"], ["Corner unit", "270° carousel, 2 shelves"], ["Hardware", "Hettich soft-close hinges"], ["Lead time", "18–21 working days"]])}
        ${price("PKR 24,500", "per running foot, installed")}
        ${actions([btn("/estimator/", "Price this layout", 1)])}
      </div></div>
    </div>
  </div>
</section>`);

add("Kitchens", "kit-u-shape", "Kitchen — U-shape with sink run", "🍳", ["U-shape", "three runs"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Kitchen layout", "U-shape — three runs, maximum storage", "Best when the kitchen is longer than it is wide and you want the sink, hob and fridge each on their own run.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Sink run</h3><p>Underslung stainless sink over a waterproofed carcass, with a 900 mm dishwasher bay beside it.</p>${spec([["Run", "7–9 ft"], ["Depth", "620 mm"]])}</div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Hob run</h3><p>Chimney duct aligned with the shaft, heat-resistant laminate, and two deep drawers for cookware.</p>${spec([["Run", "6–8 ft"], ["Depth", "600 mm"]])}</div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Tall run</h3><p>Fridge bay with ventilation grill, pantry pull-outs, and a broom cupboard at the end.</p>${spec([["Run", "5–7 ft"], ["Height", "2,100 mm"]])}</div></article>
    </div>
    ${actions([btn("/estimator/", "Estimate a U-shape"), btn("/kitchen-design/", "Kitchen services")])}
  </div>
</section>`);

add("Kitchens", "kit-galley", "Kitchen — parallel galley", "↔️", ["galley", "compact"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Kitchen layout", "Galley — for narrow flats and annexes", "Two facing runs with a 1,200 mm clear corridor: comfortable for two people, tight for three.")}
    <div class="s27-row">
      <div>
        <h3>What fits in a 1.2 m corridor</h3>
        <p>Base units on both sides at 600 mm depth, wall units at 350 mm on one side only so you never hit your head over the sink.</p>
        ${spec([["Total run", "14–18 running ft"], ["Corridor", "1,100–1,250 mm"], ["Wall units", "one side, 350 mm"], ["Flooring", "anti-skid porcelain"]])}
      </div>
      <figure>${img("kitchen", 720, 450)}</figure>
    </div>
  </div>
</section>`);

add("Kitchens", "kit-island", "Kitchen — island with breakfast seating", "🏝️", ["island", "seating"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Kitchen layout", "Island — when the room is wider than 3.6 m", "An island needs 900 mm of walkway on every side. We check the room first, then design the island around the hob or the sink.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Island specification</h3>
        ${spec([["Island size", "1,800 × 900 mm"], ["Seating", "3 stools, 300 mm overhang"], ["Top", "Quartz 20 mm, waterfall edges"], ["Services", "hob + 2 power sockets"], ["Extraction", "ducted chimney to shaft"]])}
        ${price("PKR 185,000", "for the island unit, installed")}
      </div></div>
      ${figure("kitchenL", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Kitchens", "kit-peninsula", "Kitchen — peninsula room divider", "🧩", ["peninsula", "open-plan"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Kitchen layout", "Peninsula — separation without losing the open plan", "One connected run that reaches into the dining space: storage on the kitchen side, seating on the dining side, no corridor to squeeze through.")}
    <div class="s27-grid s27-grid--2">
      ${figure("kitchen", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Why clients pick it</h3>
        <ul class="s27-spec" style="list-style:none">
          <li><span>Keeps the cook facing the family</span><b>yes</b></li>
          <li><span>Extra storage without an island</span><b>+8 ft</b></li>
          <li><span>Needs walkway both sides</span><b>900 mm</b></li>
          <li><span>Best for</span><b>3–5 marla</b></li>
        </ul>
        ${actions([btn("/estimator/", "Estimate this" , 1)])}
      </div></div>
    </div>
  </div>
</section>`);

add("Kitchens", "kit-straight", "Kitchen — straight run, budget reset", "➖", ["straight", "budget"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Kitchen layout", "Straight run — the honest budget option", "One wall, everything in reach. Fewer units, less hardware, lower board waste — and it still looks deliberate when the wall is measured properly.")}
    ${table("Straight run pricing by finish", ["Finish", "Rate / running ft", "Notes"], [
      ["Melamine carcass + HPL shutter", "PKR 19,800", "3 colours, 1 mm HPL"],
      ["MR carcass + acrylic shutter", "PKR 27,400", "high gloss, fingerprint-resistant"],
      ["MR carcass + lacquered MDF", "PKR 31,200", "spray booth finish, any RAL"]
    ])}
    ${actions([btn("/estimator/", "Price my run", 1), btn("/materials/", "Material guide")])}
  </div>
</section>`);

add("Kitchens", "kit-breakfast", "Kitchen — breakfast counter band", "☕", ["counter", "family"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Kitchen detail", "Breakfast counter — 300 mm overhang, three stools", "The cheapest way to add seating: an overhang on the existing run, supported on two steel brackets rather than a leg in the walkway.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Overhang</h3><p>300 mm clear knee space, 20 mm quartz or 18 mm granite, bull-nosed on the seating edge.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Support</h3><p>Two powder-coated steel L-brackets at 600 mm centres, fixed into the plinth frame — no floor leg.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Cost</h3><p>PKR 28,000–42,000 for a 1.8 m counter, including the top and brackets.</p></div></article>
    </div>
  </div>
</section>`);

add("Kitchens", "kit-handleless", "Kitchen — handleless matte", "🫥", ["handleless", "modern"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Kitchen finish", "Handleless matte — J-profile rails, no dust ledges", "Painted or laminate doors with an aluminium J-profile let you open a drawer with two fingers and clean the whole face with one wipe.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Door", "18 mm MDF, matte PU"], ["Profile", "anodised aluminium J-rail"], ["Carcass", "MR melamine 18 mm"], ["Waste", "9% — rails need clean edges"], ["Care", "damp cloth only, no abrasive"]])}
      </div></div>
      ${figure("lighting", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Kitchens", "kit-shaker", "Kitchen — shaker doors", "🔲", ["shaker", "classic"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Kitchen finish", "Shaker — a frame-and-panel door that can be repainted", "Solid-wood frames around an MDF panel: the door that survives a colour change in five years without a full replacement.")}
    <div class="s27-grid s27-grid--2">
      ${figure("materials", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Frame", "65 mm ash or beech"], ["Panel", "9 mm MDF, primed"], ["Finish", "2-pack PU, spray booth"], ["Hinge", "Blum clip-top, soft close"], ["Repaintable", "yes, sand &amp; recoat"]])}
      </div></div>
    </div>
  </div>
</section>`);

add("Kitchens", "kit-gloss", "Kitchen — high-gloss acrylic", "✨", ["acrylic", "gloss"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Kitchen finish", "Acrylic gloss — mirror finish without the mirror problems", "1.5 mm acrylic laminated to an MDF core: harder than laminate, cheaper than lacquer, and replaceable door by door.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b">${img("kitchen", 480, 360)}<h3>Where it works</h3><p>Compact kitchens where light needs to bounce, and dark rooms that need a lift.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Where it does not</h3><p>Direct sun on a south wall for six hours, or a household that uses abrasive creams.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Cost premium</h3><p>+PKR 3,900 per running foot over HPL, and 4 extra days in the schedule.</p></div></article>
    </div>
  </div>
</section>`);

/* =============================================================================
   WARDROBES — 10 blocks: the door systems, the internals, the awkward rooms.
   ========================================================================== */
add("Wardrobes", "ward-sliding-2", "Wardrobe — 2-door sliding", "🚪", ["sliding", "2-door"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Wardrobe", "2-door sliding — 5 ft and 6 ft widths", "The default for bedrooms where a hinged door would hit the bed. Top track carries the leaf, bottom track guides it — no sagging after two summers.")}
    <div class="s27-grid s27-grid--2">
      <figure class="s27-hero-figure">${img("wardrobe", 960, 640)}</figure>
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Width", "1,500 / 1,800 mm"], ["Height", "to ceiling, up to 2,700 mm"], ["Doors", "2 sliding leaves, 4 mm mirror optional"], ["Track", "anodised aluminium top + bottom"], ["Carcass", "18 mm MR melamine"], ["Internals", "2 rails, 5 shelves"], ["Warranty", "5 years on hardware"]])}
        ${price("PKR 96,000", "for 1,800 mm × 2,400 mm, installed")}
        ${actions([btn("/estimator/", "Price my wardrobe", 1)])}
      </div></div>
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-sliding-3", "Wardrobe — 3-door sliding", "🚪", ["sliding", "3-door"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Wardrobe", "3-door sliding — for wider walls and shared rooms", "Middle leaf overlaps both sides so either half opens independently. Cheaper than a walk-in, more usable than two separate units.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Layout</h3>
        ${spec([["Width", "2,400–2,700 mm"], ["Leaves", "3 × ~900 mm"], ["Openings", "left + middle, or right + middle"], ["Mirror", "centre leaf, 4 mm"], ["Internal split", "his / hers / linen"]])}
      </div></div>
      ${figure("dressing", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-hinged-2", "Wardrobe — 2-door hinged", "🚪", ["hinged", "budget"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Wardrobe", "Hinged — full access, lowest cost", "When there is 900 mm of clear floor in front of the unit, hinged doors open the whole carcass at once and cost less than sliding.")}
    ${table("Hinged versus sliding", ["Item", "Hinged", "Sliding"], [
      ["Cost for 1.8 m × 2.4 m", "PKR 74,000", "PKR 96,000"],
      ["Clear floor needed", "900 mm", "0 mm"],
      ["Full access at once", "yes", "no"],
      ["Track maintenance", "none", "annual clean"],
      ["Best for", "guest rooms, stores", "tight bedrooms"]
    ])}
  </div>
</section>`);

add("Wardrobes", "ward-hinged-4", "Wardrobe — 4-door wall unit", "🚪", ["hinged", "wall-unit"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Wardrobe", "4-door wall unit — wardrobe plus storage in one line", "Doors 1–2 are wardrobe, doors 3–4 are shelves and drawers: one continuous elevation that ends the “where does the linen go” argument.")}
    <div class="s27-grid s27-grid--2">
      ${figure("wardrobe", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Internal mix</h3>
        ${spec([["Doors 1–2", "double rail + 3 shelves"], ["Door 3", "5 pull-out drawers"], ["Door 4", "loft + shoe shelves"], ["Finish", "matte laminate, matching skirting"]])}
        ${price("PKR 168,000", "for 3,000 mm wall, installed")}
      </div></div>
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-walkin", "Wardrobe — walk-in dressing room", "🧍", ["walk-in", "premium"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Wardrobe", "Walk-in dressing room — plan the island last", "Open shelving on three walls, a full-height mirror, and a bench at 450 mm so you can sit while you tie laces.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Minimum room</h3><p>2,400 × 2,400 mm clear. Below that, call it a dressing alcove and use sliding fronts.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Lighting</h3><p>Warm 3,000 K strip in the shelf nosings plus one ceiling point — colour judgement happens here.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Cost</h3><p>PKR 265,000–420,000 depending on internals and how much is glass-fronted.</p></div></article>
    </div>
    ${actions([btn("/contact/", "Book a dressing-room consult", 1)])}
  </div>
</section>`);

add("Wardrobes", "ward-loft", "Wardrobe — loft storage overhead", "📦", ["loft", "storage"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Wardrobe", "Loft storage — the 500 mm everyone wastes", "Overhead cupboards above the wardrobe line for suitcases and winter quilts, with a flip-up flap or sliding shutters so you can reach them without a ladder in the doorway.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Details</h3>
        ${spec([["Depth", "500–600 mm"], ["Height", "400–600 mm"], ["Access", "flip-up flap or 2 sliding leaves"], ["Rating", "35 kg per shelf"], ["Adds", "PKR 18,500 per running ft"]])}
      </div></div>
      ${figure("dressing", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-mirror", "Wardrobe — mirror-front door", "🪞", ["mirror", "sliding"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Wardrobe", "Mirror-front — light, depth and a dressing mirror you do not store", "One leaf fully mirrored, backed with 4 mm MDF and safety film, so the room gains light and you stop buying a full-length mirror.")}
    <div class="s27-grid s27-grid--2">
      ${figure("wardrobe", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Why safety film matters</h3>
        <p>Mirror on a sliding leaf takes impacts at the edges. Film holds the glass together if it cracks — standard on every Woodex mirror door since 2019.</p>
        ${spec([["Glass", "4 mm, polished edges"], ["Film", "clear safety, 100 µm"], ["Backing", "9 mm MDF"], ["Weight", "adds 14 kg per leaf"]])}
      </div></div>
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-glass", "Wardrobe — glass-front display", "🪟", ["glass", "display"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Wardrobe", "Glass-front — for bags, watches and shoes", "Aluminium-framed glass leaves around lit shelves: it keeps dust out and turns the collection into the room's feature rather than a shelf.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Frame</h3><p>20 mm black or champagne aluminium, mitred corners, magnetic catches.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Lighting</h3><p>24 V LED strip in the nosing, dimmable, on the bedroom circuit.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Cost</h3><p>PKR 32,000 per glass door, including the frame and lighting.</p></div></article>
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-corner", "Wardrobe — corner L unit", "📐", ["corner", "L-shape"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Wardrobe", "Corner unit — the space a straight wardrobe cannot use", "An L-shaped run with the corner given over to hanging space on a diagonal rail, or to shelves you can actually reach.")}
    <div class="s27-row">
      <div>
        <h3>Two ways to treat the corner</h3>
        <p>Diagonal rail hangs 30% more clothes but needs 700 mm of frontage. Pull-out shelves use the depth and keep the frontage intact.</p>
        ${spec([["Corner size", "900 × 900 mm"], ["Diagonal rail", "+PKR 12,000"], ["Pull-out shelves", "+PKR 9,500"], ["Swing", "105° hinges"]])}
      </div>
      <figure>${img("dressing", 720, 450)}</figure>
    </div>
  </div>
</section>`);

add("Wardrobes", "ward-kids", "Wardrobe — children's room", "🧸", ["kids", "safety"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Wardrobe", "Children's wardrobe — two heights, no ladders", "Low rail at 900 mm so a seven-year-old can hang their own uniform, plus loft storage above for the things adults manage.")}
    <div class="s27-grid s27-grid--2">
      ${figure("wardrobe", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Safety points</h3>
        ${spec([["Wall fixing", "anchor bolts into masonry"], ["Edges", "2 mm ABS, no sharp corners"], ["Drawer stops", "anti-tip, 80% extension"], ["Paint", "low-VOC, EN 71-3 tested"], ["Design life", "8–10 years, adjustable rails"]])}
      </div></div>
    </div>
  </div>
</section>`);

/* =============================================================================
   OFFICE FIT-OUT — 8 blocks covering the zones an office actually needs.
   ========================================================================== */
add("Office", "off-workstations", "Office — 6-seat workstation cluster", "🖥️", ["workstations", "cable"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Office fit-out", "6-seat workstation cluster", "Bench desking for six, with a central cable spine, per-seat power, and screens that give a little privacy without closing the room.")}
    <div class="s27-grid s27-grid--2">
      <figure class="s27-hero-figure">${img("office", 960, 640)}</figure>
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Desk size", "1,200 × 600 mm per seat"], ["Top", "25 mm pre-lam MDF"], ["Frame", "60 × 60 mm MS, powder-coated"], ["Cable spine", "central, 150 mm grommets"], ["Screens", "1,400 mm acoustic fabric"], ["Seating", "task chair, lumbar"], ["Cost", "PKR 21,500 per seat"]])}
        ${actions([btn("/contact/", "Book an office survey", 1)])}
      </div></div>
    </div>
  </div>
</section>`);

add("Office", "off-bench12", "Office — 12-seat bench run", "🪑", ["bench", "open-plan"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Office fit-out", "12-seat bench run — one frame, twelve desks", "Fewer legs, one cable route, and a run you can shorten later by unbolting a bay instead of buying new furniture.")}
    ${table("Bench run economics", ["Configuration", "Desks", "Cost", "Per seat"], [
      ["Two 6-bay runs", "12", "PKR 232,000", "PKR 19,300"],
      ["One 12-bay run", "12", "PKR 208,000", "PKR 17,300"],
      ["With acoustic screens", "12", "PKR 246,000", "PKR 20,500"]
    ])}
    ${actions([btn("/contact/", "Request a layout", 1)])}
  </div>
</section>`);

add("Office", "off-manager", "Office — manager cabin", "🚪", ["cabin", "privacy"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Office fit-out", "Manager cabin — glass front, joinery inside", "Toughened glass to the corridor keeps daylight flowing; the back wall carries the storage, the credenza and the cable cut-outs.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Executive desk</h3><p>1,800 × 800 mm, wire-managed, with a grommet block for the PC, dock and phone.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Storage wall</h3><p>Full-height shelving with lockable lower cupboards for HR files.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Privacy</h3><p>10 mm toughened glass, frosted band at 900–1,500 mm, acoustic seal on the door.</p></div></article>
    </div>
  </div>
</section>`);

add("Office", "off-meeting", "Office — meeting room, 10 seats", "📊", ["meeting", "av"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Office fit-out", "Meeting room for ten", "Table sized to the room, TV on a reinforced wall, and cable paths drawn to the table box before the ceiling closes.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Room", "4,200 × 3,600 mm or larger"], ["Table", "2,800 × 1,200 mm, 10 seats"], ["Display", "65–75 in wall-mounted"], ["Table box", "HDMI, USB-C, 2 × power"], ["Acoustics", "50 mm PET panel on 2 walls"], ["Lighting", "dimmable, 4000 K, no glare into camera"]])}
      </div></div>
      ${figure("office", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Office", "off-reception", "Office — reception and waiting", "🛎️", ["reception", "brand"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Office fit-out", "Reception — the 20 seconds that set the tone", "A counter at 1,100 mm for standing handover and 750 mm for paperwork, a logo wall that takes a projector or a lightbox, and seats that are comfortable but not nap-length.")}
    <div class="s27-grid s27-grid--2">
      ${figure("commercial", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>Specification</h3>
        ${spec([["Counter", "2,200 × 750/1,100 mm"], ["Back unit", "display + filing + safe"], ["Logo wall", "corian or backlit acrylic"], ["Seating", "4 + 2, easy-clean fabric"], ["Floor", "porcelain, matte, R10"]])}
      </div></div>
    </div>
  </div>
</section>`);

add("Office", "off-pantry", "Office — pantry and breakout", "☕", ["pantry", "breakout"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Office fit-out", "Pantry and breakout", "Counter, sink, two microwaves, and a tall unit that hides the water cooler bottles — the space that keeps the desks clear of lunch.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Counter run</h3><p>PKR 22,000 per running ft with granite top, splashback and under-sink waterproofing.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Seating mix</h3><p>Bar-height ledge for four plus a low table for six — measured to the walkway you keep clear.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Services</h3><p>6 double sockets above counter, 1 dedicated microwave circuit, exhaust to the shaft.</p></div></article>
    </div>
  </div>
</section>`);

add("Office", "off-storage", "Office — storage wall and filing", "🗄️", ["storage", "filing"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Office fit-out", "Storage wall — files, coats and printer in one elevation", "One full-height run planned by the item it holds: ring binders at 400 mm depth, coats at 600 mm, printers on a reinforced shelf with power above.")}
    <div class="s27-row">
      <div>
        <h3>Depth rules that save money</h3>
        <p>Files need 400 mm; coats need 600 mm. Building one 600 mm bookcase for everything wastes 30% of the board cost, so we split the run.</p>
        ${spec([["File bays", "400 mm depth"], ["Coat bays", "600 mm depth"], ["Printer shelf", "500 kg load, 40 mm top"], ["Locks", "cam locks on all bays"]])}
      </div>
      <figure>${img("office", 720, 450)}</figure>
    </div>
  </div>
</section>`);

add("Office", "off-partitions", "Office — glass partitions", "🧱", ["partition", "glass"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Office fit-out", "Glass partitions — daylight with a door that closes", "Single or double glazed, framed or frameless, with the acoustic rating written on the quotation so you know what a client will hear.")}
    ${table("Partition options", ["System", "Glass", "Sound", "Cost / sq ft"], [
      ["Framed single", "10 mm toughened", "32 dB", "PKR 1,450"],
      ["Frameless single", "12 mm toughened", "30 dB", "PKR 1,750"],
      ["Frameless double", "2 × 8 mm + air gap", "41 dB", "PKR 2,600"],
      ["Solid + vision strip", "10 mm + MDF", "44 dB", "PKR 2,150"]
    ])}
  </div>
</section>`);

/* =============================================================================
   FEATURES / SERVICES — 12 blocks. These carry the trade argument: how the work
   is priced, built, supervised and handed over.
   ========================================================================== */
add("Features", "feat-turnkey", "Feature — turnkey design &amp; build", "🧭", ["turnkey", "process"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Service", "Turnkey design &amp; build — one contract, one handover date", "Survey, drawings, approvals, fabrication, installation and snag close-out under one signature. If a trade slips, it is our problem to solve, not yours.")}
    ${steps([["01 · Survey &amp; brief", "We measure, photograph services and record what must stay."], ["02 · Drawings", "Layout, elevations and a material board you approve in writing."], ["03 · Fabrication", "Cut and edged in our Lahore workshop, 18–24 working days."], ["04 · Installation", "Site team installs, protects finishes, clears daily."], ["05 · Handover", "Snag list closed, care sheet and warranty issued."]])}
  </div>
</section>`);

add("Features", "feat-workshop", "Feature — in-house workshop", "🏭", ["workshop", "quality"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Why it matters", "Fabricated in our workshop, not in your hallway", "Cutting on site is faster to start and slower to finish: dust everywhere, edges chipped, and no way to redo a panel without another delivery.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>CNC + edge-bander</h3><p>Panel edges closed in the same hour they are cut, so moisture never reaches the core.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Spray booth</h3><p>Two-pack PU and lacquer sprayed in a booth, not in your kitchen doorway.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Pre-assembly</h3><p>Every wardrobe is dry-fitted before transport; nothing arrives needing “a small cut”.</p></div></article>
    </div>
  </div>
</section>`);

add("Features", "feat-boardfoot", "Feature — board-foot pricing", "📐", ["pricing", "formula"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Pricing", "Board-foot pricing you can check with a calculator", "Board feet = (thickness in inches × width in inches × length in feet) ÷ 12. A 2 in × 4 in × 10 ft member is 5.21 board feet; we show the species rate next to it.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        <h3>Worked example</h3>
        ${spec([["Member", "2 in × 4 in × 10 ft"], ["Board feet", "5.21 bf"], ["Species rate", "PKR 1,450 / bf"], ["Material", "PKR 7,555"], ["Waste (12%)", "PKR 907"], ["Labour @ 22% of joinery", "PKR 1,861"], ["Line total", "PKR 10,323"]])}
      </div></div>
      ${figure("materials", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Features", "feat-cores", "Feature — moisture-resistant cores", "💧", ["materials", "cores"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Materials", "MR cores in every wet-adjacent run", "Kitchen carcasses, bathroom vanities and utility stores get moisture-resistant board; dry bedrooms can stay on standard melamine without paying for nothing.")}
    ${table("Where each core goes", ["Core", "Where we use it", "Why"], [
      ["MR 18 mm", "kitchens, vanities, utility", "resists short-term moisture"],
      ["Particle 18 mm", "bedrooms, offices, stores", "cheapest stable dry core"],
      ["Ply 12–18 mm", "sin k cradles, seating frames", "screw-holding strength"],
      ["HDF 6 mm", "door panels, back panels", "flat, paintable"]
    ])}
  </div>
</section>`);

add("Features", "feat-edging", "Feature — ABS 2 mm edge banding", "🔗", ["edging", "detail"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Detail", "2 mm ABS edges, not 0.5 mm tape", "Thin PVC tape chips at the first hip you brush past. 2 mm ABS is applied on the same machine that cut the panel, then trimmed flush — it survives a decade of trolleys and schoolbags.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Kitchens</h3><p>2 mm on all shutter edges, 1 mm on carcass fronts that face out.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Wardrobes</h3><p>2 mm on door perimeters; interiors left clean-cut with sealed edges.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Cost</h3><p>+PKR 380 per running foot, and worth it on anything used daily.</p></div></article>
    </div>
  </div>
</section>`);

add("Features", "feat-hardware", "Feature — hardware and warranty", "🔧", ["hardware", "warranty"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Hardware", "Named brands, five-year paper", "Every hinge, slide and lift is written on the quotation with its brand and series, and the warranty card is issued at handover — not at the end of a phone call.")}
    <div class="s27-grid s27-grid--4">
      <article class="s27-card"><div class="s27-card-b"><h3>Hinges</h3><p>Blum Clip-top, soft close</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Drawers</h3><p>Hettich InnoTech, 40 kg</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Sliding track</h3><p>Anodised aluminium, 80 kg leaf</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Lifts</h3><p>Hafele overhead flap stays</p></div></article>
    </div>
  </div>
</section>`);

add("Features", "feat-visuals", "Feature — 3D visuals before we cut", "🎨", ["3d", "approval"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Approvals", "See it before it is cut", "Layout drawings plus one 3D view per room. Nothing goes to the workshop until you have signed the elevation you actually want — that is how a colour argument is avoided after installation.")}
    ${steps([["Layout drawing", "Plan view with dimensions and appliance positions."], ["Elevation", "Every unit drawn at the height it will be built."], ["3D view", "One render per room in the chosen finish."], ["Material board", "Physical samples you keep."]])}
  </div>
</section>`);

add("Features", "feat-supervision", "Feature — site supervision and snag list", "📋", ["supervision", "quality"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("On site", "A supervisor with the drawings, and a snag list you co-sign", "Daily photographs, weekly progress note, and one snag walk at the end — items closed in seven working days or the retention is not released.")}
    <div class="s27-grid s27-grid--2">
      ${figure("fitout", { ratio: "4/3" })}
      <div class="s27-card"><div class="s27-card-b">
        <h3>What you receive</h3>
        ${spec([["Daily photos", "WhatsApp group"], ["Weekly note", "progress + risks"], ["Snag walk", "with the client"], ["Close-out", "7 working days"], ["Retention", "5% until closed"]])}
      </div></div>
    </div>
  </div>
</section>`);

add("Features", "feat-transport", "Feature — transport zones across Punjab", "🚚", ["transport", "logistics"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Logistics", "Transport quoted by zone, not by surprise", "Punjab is divided into four zones from our Lahore workshop. The zone is printed on the quotation, so a shift to a new site does not quietly add 9% to the invoice.")}
    ${table("Transport zones (2026 rate card)", ["Zone", "Typical cities", "Rate", "Minimum"], [
      ["A — 0–60 km", "Lahore, Sheikhupura", "2.5%", "PKR 12,000"],
      ["B — 60–150 km", "Gujranwala, Kasur, Faisalabad", "4.0%", "PKR 22,000"],
      ["C — 150–300 km", "Islamabad, Rawalpindi, Sialkot", "6.5%", "PKR 38,000"],
      ["D — 300 km+", "Multan, Bahawalpur, Peshawar", "9.0%", "PKR 55,000"]
    ])}
  </div>
</section>`);

add("Features", "feat-aftercare", "Feature — aftercare and annual service", "🧰", ["aftercare", "service"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Aftercare", "One free service visit a year", "We re-align hinges, lubricate sliding tracks, tighten handles and check silicone lines — the maintenance that keeps a kitchen usable far longer than the warranty period.")}
    <div class="s27-grid s27-grid--3">
      <article class="s27-card"><div class="s27-card-b"><h3>Year 1–5</h3><p>Included for kitchens and wardrobes. Booked by message, done in one visit.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Spare parts</h3><p>Shutters and doors are repeatable: same board, same edge, same colour code kept on file.</p></div></article>
      <article class="s27-card"><div class="s27-card-b"><h3>Repairs</h3><p>Chargeable after year five at the published labour rate, parts at cost.</p></div></article>
    </div>
  </div>
</section>`);

add("Features", "feat-trade", "Feature — for architects and contractors", "🤝", ["trade", "partners"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Trade", "Joinery packages for architects and main contractors", "Send a drawing set and a programme; we return a priced joinery package within five working days, with shop drawings and a fabrication slot held for you.")}
    <div class="s27-row s27-row--rev">
      <div>
        <h3>What the package includes</h3>
        ${spec([["Priced BOQ", "by unit, 5 working days"], ["Shop drawings", "A3 PDF + DWG"], ["Fabrication slot", "held on issue"], ["Site measure", "within 72 hours"], ["Payment terms", "40% advance, staged"]])}
      </div>
      <figure>${img("workshop" in IMG ? "fitout" : "office", 720, 450)}</figure>
    </div>
  </div>
</section>`);

add("Features", "feat-checklist", "Feature — handover checklist", "✅", ["handover", "checklist"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Handover", "The 12-point walk we do with you", "Nothing is signed off until both of us have walked the room and ticked the same list. It is printed, dated and filed with your project record.")}
    <div class="s27-grid s27-grid--2">
      <div class="s27-card"><div class="s27-card-b">
        ${spec([["1", "Doors aligned, gaps even"], ["2", "Drawers flush, soft-close working"], ["3", "Sliding leaves clear, no rub"], ["4", "Silicone lines straight"], ["5", "Cut-outs sealed"], ["6", "Plugs and grommets fitted"]])}
      </div></div>
      <div class="s27-card"><div class="s27-card-b">
        ${spec([["7", "Handles torqued"], ["8", "Lights and sensors tested"], ["9", "Protective film removed"], ["10", "Site swept and rubbish removed"], ["11", "Care sheet handed over"], ["12", "Warranty card issued"]])}
      </div></div>
    </div>
  </div>
</section>`);

/* =============================================================================
   TESTIMONIALS — 6 blocks, each with a real project type and locality.
   ========================================================================== */
add("Testimonials", "quote-dha", "Testimonial — DHA kitchen", "⭐", ["kitchen", "dha"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">${quote("They showed the board-foot calculation on the quotation and I checked it myself. The waste percentage was 12% — exactly what the sheet said. First contractor who let me do the maths.", "Ayesha K.", "DHA Phase 5, Lahore — kitchen &amp; utility", "kitchenL", true)}</div>
</section>`);

add("Testimonials", "quote-bahria", "Testimonial — Bahria wardrobes", "⭐", ["wardrobe", "bahria"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">${head("Client feedback", "Three bedrooms, one programme", "Wardrobes for three rooms delivered over two days, with the loft storage the original quote had left out.", null, true)}
  <div class="s27-grid s27-grid--3">
    ${quote("The wardrobe reaches the ceiling, so nothing collects on top. Internals were planned around what we actually own, not a catalogue.", "Faisal R.", "Bahria Orchard, Lahore")}
    ${quote("Sliding doors mean I can open both sides of the bed area. No more squeezing past a hinged door.", "Hina S.", "Bahria Town, Lahore")}
    ${quote("They came back in month four to align a door without charging me. That is the whole review.", "Adnan M.", "Bahria Town, Lahore")}
  </div>
  </div>
</section>`);

add("Testimonials", "quote-office", "Testimonial — Gulberg office", "⭐", ["office", "gulberg"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">${quote("We kept working while they fitted out two floors. Cable management was planned before the partitions went up, so we never lost a network point to a chase.", "Bilal T.", "Gulberg III, Lahore — 34 seats", "office", true)}</div>
</section>`);

add("Testimonials", "quote-isb", "Testimonial — Islamabad apartment", "⭐", ["apartment", "islamabad"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Client feedback", "Islamabad fit-out from a Lahore workshop", "Zone C transport was quoted up front at 6.5% with a PKR 38,000 minimum, which is what the final invoice showed.")}
    <div class="s27-grid s27-grid--2">
      ${quote("Everything arrived protected and pre-assembled. The flat had a lift limit, so the panels were split for the stairwell without changing the design.", "Sana &amp; Umair", "F-7, Islamabad — apartment interior")}
      ${figure("apartment", { ratio: "4/3" })}
    </div>
  </div>
</section>`);

add("Testimonials", "quote-clinic", "Testimonial — clinic fit-out", "⭐", ["clinic", "commercial"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Client feedback", "A clinic needs surfaces that survive alcohol wipes", "We specified HPL and stainless edging instead of laminate film, and the reception desk was reinforced for the weighing scale and records.")}
    <div class="s27-grid s27-grid--2">
      ${figure("clinic", { ratio: "4/3" })}
      ${quote("Two years of daily disinfectant and the counters still look new. The storage wall took all the files off the consulting tables.", "Dr. Naveed A.", "Johar Town, Lahore — 4-room clinic")}
    </div>
  </div>
</section>`);

add("Testimonials", "quote-logos", "Testimonial — client logos", "🏷️", ["logos", "trust"], `
<section class="s27 s27-sec s27-sec--soft">
  <div class="s27-wrap">
    ${head("Clients", "Some of the organisations we have fitted out", "Corporate fit-out, retail and franchise work delivered with the same workshop and the same supervisors as domestic projects.")}
    <div class="s27-logos"><span>Attock Petroleum</span><span>MG Motors</span><span>PSO</span><span>Shell</span><span>Total Parco</span><span>Xiaomi</span></div>
  </div>
</section>`);

/* =============================================================================
   CTA / ESTIMATOR / CONTACT — 10 blocks. Each one is a different conversion
   route: estimate, WhatsApp brief, site visit, samples, catalogue, trade.
   ========================================================================== */
add("CTA", "cta-band", "CTA — dark band", "📣", ["cta", "band"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  <div class="s27-band">
    <div><h2 class="s27-h2" style="margin:0 0 6px">Ready to price your joinery?</h2><p class="s27-lead" style="margin:0">Running feet in, honest price range out — before anyone calls you.</p></div>
    ${actions([btn("/estimator/", "Open the estimator", 1), btn("/contact/", "Talk to a designer")])}
  </div>
</div></section>`);

add("CTA", "cta-estimator", "CTA — instant estimate panel", "🧮", ["estimator"], `
<section class="s27 s27-sec">
  <div class="s27-wrap">
    ${head("Estimator", "Three inputs, one price range", "Service, quantity and finish. The estimator applies the current Punjab rate card with waste and transport, and prints the lines so you can compare it against any other quote.", null, true)}
    <div class="s27-est">
      <form class="s27-est-form s27-card" method="get" action="/estimator/" style="padding:22px">
        <div class="s27-field"><label for="s27-svc">Service</label>
          <select id="s27-svc" name="service">
            <option value="kitchen">Kitchen (per running foot)</option>
            <option value="wardrobe">Wardrobe (per unit)</option>
            <option value="office">Office fit-out (per sq ft)</option>
            <option value="turnkey">Turnkey interior (per sq ft)</option>
          </select></div>
        <div class="s27-field"><label for="s27-qty">Quantity (running ft / sq ft / units)</label><input id="s27-qty" name="qty" type="number" min="1" step="1" value="12" inputmode="numeric"></div>
        <div class="s27-field"><label for="s27-fin">Finish</label>
          <select id="s27-fin" name="finish">
            <option value="essential">Essential — melamine + HPL</option>
            <option value="standard" selected>Standard — MR core + 2 mm ABS</option>
            <option value="premium">Premium — acrylic / lacquer</option>
          </select></div>
        ${actions([`<button class="btn wx-btn-light" type="submit">Estimate on the next screen</button>`])}
        <p class="s27-note">The estimator opens with your numbers filled in; nothing is submitted to a mailing list.</p>
      </form>
      <aside class="s27-est-out">
        <div class="s27-line"><span>Indicative rate (Standard)</span><b>PKR 24,500 / running ft</b></div>
        <div class="s27-line"><span>Board waste allowance</span><b>12%</b></div>
        <div class="s27-line"><span>Transport, Zone A</span><b>2.5% · min PKR 12,000</b></div>
        <div class="s27-line"><span>GST</span><b>18%</b></div>
        <div class="s27-line s27-total"><span>Advance to book a slot</span><b>40%</b></div>
      </aside>
    </div>
  </div>
</section>`);

add("CTA", "cta-whatsapp", "CTA — WhatsApp brief", "💬", ["whatsapp", "contact"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  <div class="s27-grid s27-grid--2">
    <div>
      ${head("Fastest route", "Send your room photos on WhatsApp", "Four photos, the room size and what you want to store is enough for a realistic range within one working day — no meeting needed first.")}
      ${actions([`<a class="btn wx-btn-dark" href="https://wa.me/923001234567" rel="noopener">Open WhatsApp</a>`, btn("/contact/", "Or send an email")])}
    </div>
    <div class="s27-card"><div class="s27-card-b">
      <h3>What to send</h3>
      ${spec([["Photo 1", "the full wall, standing back"], ["Photo 2", "the corner you want to use"], ["Photo 3", "services: sockets, gas, water"], ["Size", "wall length × ceiling height"], ["Wish list", "what must fit inside"]])}
    </div></div>
  </div>
</div></section>`);

add("CTA", "cta-visit", "CTA — site visit booking", "📅", ["booking", "visit"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  ${head("Site visit", "Book the measure — PKR 3,000, credited to the order", "We measure, photograph services and record floor-to-ceiling heights. The fee covers two visits and is deducted from the quotation if you proceed.", null, true)}
  ${steps([["Pick a slot", "Weekdays 10:00–17:00, Saturday mornings."], ["We measure", "45–60 minutes, drawings started the same day."], ["You receive", "Layout plus a fixed quotation in 48 hours."]])}
  ${actions([btn("/contact/", "Book a visit", 1), btn("/estimator/", "Estimate first")])}
</div></section>`);

add("CTA", "cta-samples", "CTA — material sample box", "📦", ["samples", "materials"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  <div class="s27-grid s27-grid--2">
    <figure class="s27-hero-figure">${img("materials", 900, 640)}</figure>
    <div>
      ${head("Samples", "Ten boards, three edge colours, one granite chip", "Sent courier-paid inside Lahore. Look at them in your own light at 7 pm — showroom lights flatter everything.")}
      ${spec([["Contents", "10 × 100 mm board chips"], ["Edges", "ABS 2 mm in 3 colours"], ["Stone", "granite or quartz chip"], ["Delivery", "free in Lahore, PKR 900 outside"]])}
      ${actions([btn("/contact/", "Request the box", 1)])}
    </div>
  </div>
</div></section>`);

add("CTA", "cta-catalogue", "CTA — catalogue download", "📕", ["catalogue", "download"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  <div class="s27-band">
    <div><h2 class="s27-h2" style="margin:0 0 6px">Kitchen &amp; wardrobe catalogue (PDF, 24 pages)</h2><p class="s27-lead" style="margin:0">Layouts, internals, edge profiles and the 2026 rate bands — the same document our designers work from.</p></div>
    ${actions([btn("/downloads/", "Download the catalogue", 1)])}
  </div>
</div></section>`);

add("CTA", "cta-consult", "CTA — design consultation call", "📞", ["consultation"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  ${head("Consultation", "20 minutes with a designer, no fee", "Bring your plan or just the room dimensions. You leave with a layout direction, a realistic budget band and the two decisions that actually change the cost.", null, true)}
  <div class="s27-grid s27-grid--3">
    <article class="s27-card"><div class="s27-card-b"><h3>Call</h3><p>Weekdays 11:00 and 16:00. We call you, on the number you leave.</p></div></article>
    <article class="s27-card"><div class="s27-card-b"><h3>Video</h3><p>Show us the room live; we mark up the screen while you watch.</p></div></article>
    <article class="s27-card"><div class="s27-card-b"><h3>In studio</h3><p>Gulberg office, samples on the table, 45 minutes.</p></div></article>
  </div>
  ${actions([btn("/contact/", "Book a consultation", 1)])}
</div></section>`);

add("CTA", "cta-quote", "CTA — quotation request with spec sheet", "📝", ["quotation", "form"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  ${head("Quotation", "Request a fixed quotation", "Send the drawings, the room sizes or last year's quote — you get a line-by-line quotation with material, waste, labour, transport and GST shown separately.")}
  <form class="s27-card" method="post" action="/contact/" style="padding:22px">
    <div class="s27-grid s27-grid--2">
      <div class="s27-field"><label for="q-name">Name</label><input id="q-name" name="name" required autocomplete="name"></div>
      <div class="s27-field"><label for="q-phone">Mobile / WhatsApp</label><input id="q-phone" name="phone" required inputmode="tel" autocomplete="tel"></div>
      <div class="s27-field"><label for="q-scope">Scope</label>
        <select id="q-scope" name="scope"><option>Kitchen</option><option>Wardrobes</option><option>Full interior</option><option>Office fit-out</option><option>Retail / commercial</option></select></div>
      <div class="s27-field"><label for="q-when">When do you want to start?</label>
        <select id="q-when" name="when"><option>Immediately</option><option>Within a month</option><option>This quarter</option><option>Still planning</option></select></div>
    </div>
    <div class="s27-field"><label for="q-notes">Room sizes and what you want built</label><textarea id="q-notes" name="notes" rows="4" placeholder="Example: kitchen 12 × 8 ft, L-shape, needs a dishwasher bay and loft storage"></textarea></div>
    ${actions([`<button class="btn wx-btn-light" type="submit">Send the request</button>`])}
    <p class="s27-note">We reply with a quotation within 48 hours on weekdays. No SMS marketing, no reselling your number.</p>
  </form>
</div></section>`);

add("CTA", "cta-trade", "CTA — trade enquiry", "🤝", ["trade", "b2b"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  <div class="s27-band">
    <div><h2 class="s27-h2" style="margin:0 0 6px">Architect, contractor or developer?</h2><p class="s27-lead" style="margin:0">Send a drawing set for a priced joinery package in five working days, with a fabrication slot held while you tender.</p></div>
    ${actions([btn("/contact/", "Send drawings", 1), btn("/about/", "Workshop capability")])}
  </div>
</div></section>`);

add("CTA", "cta-contact-strip", "CTA — contact strip", "📍", ["contact", "strip"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  <div class="s27-grid s27-grid--3">
    <div class="s27-card"><div class="s27-card-b"><h3>Studio</h3><p>Woodex Interior Design Studio, Gulberg III, Lahore</p>${spec([["Weekdays", "10:00 – 19:00"], ["Saturday", "10:00 – 16:00"]])}</div></div>
    <div class="s27-card"><div class="s27-card-b"><h3>Write</h3><p><a href="mailto:info@woodex.com.pk">info@woodex.com.pk</a></p>${spec([["Reply time", "within 4 working hours"], ["Drawings", "PDF / DWG"]])}</div></div>
    <div class="s27-card"><div class="s27-card-b"><h3>Call</h3><p><a href="tel:+923001234567">+92 300 123 4567</a></p>${spec([["WhatsApp", "same number"], ["Site surveys", "Lahore + Punjab"]])}</div></div>
  </div>
</div></section>`);

/* =============================================================================
   FAQ — 4 blocks, grouped by the questions that actually arrive.
   ========================================================================== */
add("FAQ", "faq-timeline", "FAQ — timelines and lead time", "⏱️", ["timeline", "faq"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  ${head("Timelines", "How long a project actually takes", "Dates below are working days from a signed quotation and a paid advance — not from the first phone call.")}
  ${faq([
    ["How long does a kitchen take?", "18–21 working days in the workshop plus 2–3 days on site. Acrylic or lacquered finishes add 4 days because the spray booth needs two curing passes."],
    ["And a wardrobe?", "12–15 working days for a single unit, or 20–24 for a three-bedroom set built in one batch."],
    ["Full interior?", "6–10 weeks from demolition to handover for a 10 marla house, depending on civil work and how fast approvals come back."],
    ["Can it be faster?", "Yes, with a split fabrication slot: standard carcasses run first, feature units later. Ask for the express slot when you enquire — it costs 8% more."]
  ])}
</div></section>`);

add("FAQ", "faq-transport", "FAQ — transport and installation", "🚚", ["transport", "faq"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  ${head("Delivery", "Transport, access and installation", "Everything is pre-assembled in the workshop, so what arrives is what was dry-fitted — including the lift measurements we check beforehand.")}
  ${faq([
    ["Do you charge for transport?", "By zone from Lahore: A 2.5% (min PKR 12,000), B 4.0%, C 6.5%, D 9.0%. The zone is printed on the quotation before you sign."],
    ["What if the lift is too small?", "We split panels for the stairwell and re-assemble on site with concealed fixings. Tell us the lift dimensions at survey and the design accounts for it."],
    ["Do you install outside Punjab?", "Yes, with two conditions: transport is quoted at zone D and our installation team stays for the duration — we do not hand over to a local fitter."],
    ["Is installation included?", "For kitchens, wardrobes and offices, yes. Civil work, electrical and plumbing are quoted separately as builder's work."]
  ])}
</div></section>`);

add("FAQ", "faq-warranty", "FAQ — warranty and aftercare", "🛡️", ["warranty", "faq"], `
<section class="s27 s27-sec"><div class="s27-wrap">
  ${head("Warranty", "What is covered, for how long, and what is not", "Written on the quotation, issued as a card at handover, and honoured at the same address the work was installed.")}
  ${faq([
    ["What is the warranty?", "5 years on hardware (hinges, slides, tracks, lifts), 2 years on finishes and edge banding, 1 year on workmanship for installation."],
    ["What voids it?", "Water damage from a leaking fitting, standing water on a carcass base, abrasive cleaners on gloss finishes, or moving the unit without re-fixing it."],
    ["Do you service it?", "One free visit per year for the first five years: re-align doors, lubricate tracks, tighten handles, check silicone."],
    ["Are spare parts available?", "Yes. We keep the board code, edge colour and hardware series on file, so a replacement door matches the existing run."]
  ])}
</div></section>`);

add("FAQ", "faq-payments", "FAQ — payments and milestones", "💳", ["payment", "faq"], `
<section class="s27 s27-sec s27-sec--soft"><div class="s27-wrap">
  ${head("Payments", "Advance, milestones and what happens if you stop", "The schedule below is the standard one: 40% to book a fabrication slot, the rest against completed stages you can see on site.")}
  ${table("Standard milestone schedule", ["Stage", "Share", "Triggers"], [
    ["Advance", "40%", "books the workshop slot and material order"],
    ["Material in store", "20%", "boards and hardware received"],
    ["Fabrication complete", "15%", "dry-fit photos shared"],
    ["Installation", "15%", "units fixed on site"],
    ["Handover", "10%", "snag list closed"]
  ])}
  ${faq([
    ["Do you refund the advance?", "Material ordered for your project is not refundable, but the difference between the advance and the material cost is returned within 14 days."],
    ["Is GST included?", "Rates are shown excluding 18% GST; the quotation shows the tax line separately so a registered buyer can claim it."],
    ["Do you accept cards?", "Bank transfer for advances and installation payments. Cards only for the PKR 3,000 survey fee."]
  ], true)}
</div></section>`);

/* =============================================================================
   Emit
   ========================================================================== */
const CATS = [
  { key: "Hero",         label: "Heroes &amp; banners",      note: "Ten different entry points: service, locality, materials, commercial, estimator." },
  { key: "Kitchens",     label: "Kitchens",                  note: "One block per layout and finish a Lahore kitchen actually asks for." },
  { key: "Wardrobes",    label: "Wardrobes &amp; dressing",  note: "Door systems, internals and the awkward corners." },
  { key: "Office",       label: "Office fit-out",            note: "Workstations, cabins, meeting rooms, reception, pantry, storage, partitions." },
  { key: "Features",     label: "Features &amp; services",   note: "The trade argument: pricing formula, cores, edging, hardware, transport, aftercare." },
  { key: "Testimonials", label: "Social proof",              note: "Client quotes by project type and locality, plus the logo strip." },
  { key: "CTA",          label: "CTA, estimator &amp; contact", note: "Every conversion route: estimate, WhatsApp, visit, samples, catalogue, quotation." },
  { key: "FAQ",          label: "FAQ",                       note: "Timelines, transport, warranty, payments — the four question groups." }
];

const usedCats = new Set(B.map(b => b.cat));
const missingCats = usedCats.size !== CATS.length ? [...usedCats].filter(c => !CATS.some(k => k.key === c)) : [];
if (B.length !== 70) throw new Error("expected 70 blocks, built " + B.length);
if (missingCats.length) throw new Error("categories without metadata: " + missingCats.join(", "));

const catalogue = {
  woodexLibrary: 1,
  suite: "sections-v27",
  version: "2.7.0",
  generated: new Date().toISOString(),
  stylesheet: "/assets/sections-v27.css",
  devices: [375, 768, 1280],
  categories: CATS,
  blocks: B.map(b => ({
    id: b.id, cat: b.cat, name: b.name.replace(/&amp;/g, "&"), icon: b.icon,
    tags: b.tags, kind: "section", global: false,
    bytes: b.html.length,
    html: b.html
  }))
};

writeFileSync(join(ROOT, "_templates", "section-library.json"), JSON.stringify(catalogue, null, 2) + "\n");

const js = `/* Woodex v2.7 — section suite for the builder tray. GENERATED by tools/build-sections.mjs
 * Do not edit by hand: run \`node tools/build-sections.mjs\` after changing the generator.
 * Styles: ${catalogue.stylesheet} (loaded by the builder preview and by any page that uses a section).
 * ${catalogue.blocks.length} blocks across ${CATS.length} categories, generated ${catalogue.generated}.
 */
window.WX_SECTIONS = ${JSON.stringify(catalogue.blocks.map(b => ({ id: b.id, cat: b.cat, name: b.name, icon: b.icon, tags: b.tags, html: b.html })), null, 1)};
window.WX_SECTIONS_META = ${JSON.stringify({ version: catalogue.version, stylesheet: catalogue.stylesheet, categories: CATS.map(c => ({ key: c.key, label: c.label.replace(/&amp;/g, "&"), note: c.note.replace(/&amp;/g, "&") })) }, null, 1)};
`;
writeFileSync(join(ROOT, "builder", "sections-v27.js"), js);

const byCat = CATS.map(c => c.key + ": " + B.filter(b => b.cat === c.key).length).join(" · ");
console.log("section suite built");
console.log("  blocks      : " + B.length + "  (" + byCat + ")");
console.log("  catalogue   : _templates/section-library.json  " + JSON.stringify(catalogue).length + " B");
console.log("  builder     : builder/sections-v27.js  " + js.length + " B");
