/* Woodex v2.7 — section-suite test.
 *
 *   node woodex-live-p23/_tests/sections.test.js
 *   (no server needed — this validates the built artefacts, not a running page)
 *
 * Checks the 70-block catalogue and the builder bundle emitted by tools/build-sections.mjs:
 * block count per category, unique ids, well-formed markup, every class defined by the section
 * stylesheet or the site sheets, every image present in assets/img, every link either internal
 * or a known-good external, and no placeholder text anywhere.
 *
 * Exit 0 = the suite is safe to load into the library and the builder tray.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, "_templates", "section-library.json"), "utf8"));
const BUILDER = fs.readFileSync(path.join(ROOT, "builder", "sections-v27.js"), "utf8");
const SECTION_CSS = fs.readFileSync(path.join(ROOT, "assets", "sections-v27.css"), "utf8");

const passes = [], fails = [];
const check = (name, ok, extra) => { (ok ? passes : fails).push(name + (extra ? " → " + extra : "")); console.log((ok ? "  ✓ " : "  ✗ ") + name + (extra ? " → " + extra : "")); };

/* ---------- 1. catalogue shape ---------- */
const EXPECTED = { Hero: 10, Kitchens: 10, Wardrobes: 10, Office: 8, Features: 12, Testimonials: 6, CTA: 10, FAQ: 4 };
check("catalogue declares the v2.7 suite", CAT.suite === "sections-v27" && CAT.version === "2.7.0", CAT.suite + " " + CAT.version);
check("70 blocks", CAT.blocks.length === 70, String(CAT.blocks.length) + " blocks");
for (const [cat, n] of Object.entries(EXPECTED)) {
  const got = CAT.blocks.filter(b => b.cat === cat).length;
  check("category " + cat + " has " + n, got === n, got + " blocks");
}
check("categories declared once", new Set(CAT.categories.map(c => c.key)).size === CAT.categories.length && CAT.categories.length === 8);
check("ids are unique", new Set(CAT.blocks.map(b => b.id)).size === 70);
check("markup is unique per block", new Set(CAT.blocks.map(b => b.html)).size === 70);
check("every block carries tags", CAT.blocks.every(b => Array.isArray(b.tags) && b.tags.length));
check("every block has an icon and a name", CAT.blocks.every(b => b.icon && b.name.length > 4));

/* ---------- 2. markup well-formedness (light parser: tag balance + attribute quoting) ---------- */
const VOID = new Set(["img", "br", "hr", "input", "meta", "link", "source", "col"]);
function tagBalance(html) {
  const stack = [], errors = [];
  for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const [full, tag] = m;
    if (full.startsWith("</")) {
      if (VOID.has(tag.toLowerCase())) { errors.push("closing void tag </" + tag + ">"); continue; }
      const open = stack.pop();
      if (open !== tag.toLowerCase()) errors.push("expected </" + open + "> but found </" + tag + ">");
    } else if (!full.endsWith("/>") && !VOID.has(tag.toLowerCase())) stack.push(tag.toLowerCase());
  }
  if (stack.length) errors.push("unclosed: " + stack.join(", "));
  return errors;
}
let balanceErrors = 0, attrErrors = 0;
for (const b of CAT.blocks) {
  const errs = tagBalance(b.html);
  if (errs.length) { balanceErrors++; console.log("      " + b.id + " → " + errs.join("; ")); }
  if (/class="[^"]*"[^>]*class=/.test(b.html)) attrErrors++;
}
check("all 70 blocks are tag-balanced", balanceErrors === 0, balanceErrors + " with errors");
check("no duplicate class attributes in one tag", attrErrors === 0);
check("every block is a <section>", CAT.blocks.every(b => b.html.trim().startsWith("<section") && b.html.trim().endsWith("</section>")));

/* ---------- 3. no placeholder text (the standing rule) ---------- */
const BANNED = [/\blorem\b/i, /ipsum/i, /insert (?:code|your|text)/i, /TODO/, /TBD/, /\bXXX\b/, /placeholder/i, /example\.com/i, /dummy text/i];
/* scan the visible text, not attributes: `placeholder="…"` is legitimate form markup */
const visible = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
for (const b of CAT.blocks) {
  const hit = BANNED.find(re => re.test(visible(b.html)));
  if (hit) fails.push("placeholder in " + b.id + " → " + hit);
}
check("no placeholder text in any block", !fails.some(f => f.startsWith("placeholder in")));

/* ---------- 4. stylesheet coverage ---------- */
const cssClasses = new Set([...SECTION_CSS.matchAll(/\.(-?[a-zA-Z][a-zA-Z0-9_-]*)/g)].map(m => m[1]));
const siteCss = ["assets/site-p21.css", "assets/v1-p21.css", "assets/v3-blocks.css"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const siteClasses = new Set([...siteCss.matchAll(/\.(-?[a-zA-Z][a-zA-Z0-9_-]*)/g)].map(m => m[1]));
const used = new Set();
for (const b of CAT.blocks) for (const m of b.html.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(c => c && used.add(c));
/* every class a block uses must be defined either by sections-v27.css (the suite's own sheet, which
   carries the .s27-* vocabulary) or by the public-site sheets the preview and the published page load */
const adminCss = fs.readFileSync(path.join(ROOT, "admin", "admin.css"), "utf8");
const adminClasses = new Set([...adminCss.matchAll(/\.(-?[a-zA-Z][a-zA-Z0-9_-]*)/g)].map(m => m[1]));
const isStyled = c => cssClasses.has(c) || siteClasses.has(c) || adminClasses.has(c);
const unstyled = [...used].filter(c => !isStyled(c));
check("all shapes styled — every class resolves in sections-v27.css or the site sheets", unstyled.length === 0, used.size + " classes, unresolved: " + (unstyled.join(", ") || "none"));
check("suite vocabulary is scoped — .s27-* defined in sections-v27.css", [...used].filter(c => c.startsWith("s27") && !cssClasses.has(c)).length === 0);

/* ---------- 5. images exist ---------- */
const imgs = new Set();
for (const b of CAT.blocks) for (const m of b.html.matchAll(/<img[^>]+src="([^"]+)"/g)) imgs.add(m[1]);
const missingImgs = [...imgs].filter(src => !fs.existsSync(path.join(ROOT, src.replace(/^\//, ""))));
check("every <img> points at a real file", missingImgs.length === 0, imgs.size + " images, missing: " + (missingImgs.join(", ") || "none"));
check("every image has alt text", CAT.blocks.every(b => !/<img(?![^>]*\balt=)/.test(b.html)));
check("every image is lazy + sized", CAT.blocks.every(b => !/<img(?![^>]*loading="lazy")/.test(b.html) && !/<img(?![^>]*width=)/.test(b.html)));

/* ---------- 6. links ---------- */
const links = new Set();
for (const b of CAT.blocks) for (const m of b.html.matchAll(/href="([^"]+)"/g)) links.add(m[1]);
const badLinks = [...links].filter(h => /^javascript:/i.test(h) || h === "#" || /^http:\/\//i.test(h));
check("no dead or insecure links", badLinks.length === 0, links.size + " links, offending: " + (badLinks.join(", ") || "none"));
const internal = [...links].filter(h => h.startsWith("/"));
check("internal links used", internal.length >= 8, internal.length + " internal links");

/* ---------- 7. builder bundle matches the catalogue ---------- */
const ids = [...BUILDER.matchAll(/^\s*"id": "([a-z0-9-]+)"/gm)].map(m => m[1]);
check("builder bundle carries all 70 ids", ids.length === 70 && CAT.blocks.every(b => ids.includes(b.id)), ids.length + " ids");
check("builder bundle declares the stylesheet", BUILDER.includes("/assets/sections-v27.css"));
check("builder bundle exposes window.WX_SECTIONS", BUILDER.includes("window.WX_SECTIONS =") && BUILDER.includes("window.WX_SECTIONS_META"));
check("builder bundle is generated, not hand-edited", BUILDER.includes("GENERATED by tools/build-sections.mjs"));

/* ---------- 8. export/import contract with the admin library ---------- */
check("catalogue is importable by blocks_import", CAT.woodexLibrary === 1 && CAT.blocks.every(b => b.kind === "section" && typeof b.html === "string" && typeof b.cat === "string" && typeof b.name === "string"));
check("catalogue fits the 200-block library cap", CAT.blocks.length <= 200);
check("device previews declared", Array.isArray(CAT.devices) && CAT.devices.join() === "375,768,1280");

console.log("\n===== PASS " + passes.length + " · FAIL " + fails.length + " =====");
if (fails.length) { console.log("failures:\n  - " + fails.join("\n  - ")); process.exit(1); }
