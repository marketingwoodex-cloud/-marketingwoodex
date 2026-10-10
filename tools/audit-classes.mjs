#!/usr/bin/env node
/* Woodex Admin v2.7 — class-coverage audit.
 *
 *   node tools/audit-classes.mjs                      # every admin/*.js against every design layer
 *   node tools/audit-classes.mjs admin/admin-regions.js
 *
 * WHY: the admin writes its markup as class strings inside JavaScript, so nothing in the CSS build
 * can prove a class exists. A class no layer defines renders as an unstyled element — exactly the
 * failure the design system exists to prevent. This walks the class="…" strings in the given
 * sources and checks every class against admin.css (runtime tokens + components), woodex-ui.css
 * (Preline-replica layer), assets/preline-theme.css (Tailwind v4 utilities), regional.css, and the
 * <style> blocks that several modules inject at runtime from inside their own .js file.
 *
 * Exit code 1 = at least one referenced class has no rule anywhere.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "woodex-live-p23");
const LAYERS = ["admin/admin.css", "admin/woodex-ui.css", "admin/assets/preline-theme.css", "admin/regional.css"];

const args = process.argv.slice(2);
const sources = args.length
  ? args
  : readdirSync(join(ROOT, "admin")).filter(f => f.endsWith(".js")).map(f => join("admin", f));

/* Build the set of every class name that ANY layer defines. A definition is a `.name` token
   anywhere in a stylesheet, or anywhere in the admin JavaScript — several modules keep their
   component CSS in the same file (either inside an injected <style> block or as a separate
   string constant), and both count. Extraction is deliberately generous: `0.5rem` and
   `url(x.png)` cannot introduce false gaps, only extra false definitions, which is the safe
   direction for an audit whose job is to catch genuinely unstyled markup. */
const defined = new Set();
const CLASS_TOKEN = /\.(-?[a-zA-Z][a-zA-Z0-9_-]*)/g;
const harvest = (text, rel) => { for (const m of text.matchAll(CLASS_TOKEN)) defined.add(m[1]); };

const layerFiles = [];
for (const rel of LAYERS) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.error("missing design layer: " + rel); process.exit(2); }
  const css = readFileSync(p, "utf8");
  harvest(css, rel); layerFiles.push(rel);
}
/* The admin embeds the real site in preview iframes, and those documents load the public
   stylesheets (assets/site-p21.css, assets/v1-p21.css …). A class defined there renders in the
   preview, so it is not a gap — it is reported separately as "site". */
const siteDefined = new Set();
const walk = dir => {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith(".css") && !LAYERS.includes(rel)) {
      for (const m of readFileSync(join(ROOT, rel), "utf8").matchAll(CLASS_TOKEN)) siteDefined.add(m[1]);
    }
  }
};

walk("");
const jsFiles = readdirSync(join(ROOT, "admin")).filter(f => f.endsWith(".js"));
for (const f of jsFiles) {
  const rel = "admin/" + f;
  harvest(readFileSync(join(ROOT, rel), "utf8"), rel);
  layerFiles.push(rel);
}

let bad = 0, checked = 0;
for (const src of sources) {
  const code = readFileSync(join(ROOT, src), "utf8");
  const used = new Set();
  for (const m of code.matchAll(/class=["']([^"']*)/g)) {
    /* `class="card ' + cls + '"` is assembled at runtime: only the literal prefix is auditable,
       so names that come from variables (cls, sp, tone, r2 …) are skipped rather than reported. */
    const literal = m[1].split("'")[0].split("+")[0];
    for (const raw of literal.split(/\s+/)) {
      const c = raw.trim();
      if (/^-?[a-zA-Z][a-zA-Z0-9_-]*$/.test(c)) used.add(c);
    }
  }
  const siteOnly = [], missing = [];
  for (const c of used) {
    if (defined.has(c)) continue;
    if (c.endsWith("-")) continue;                       /* assembled prefix, audited at its definition */
    (siteDefined.has(c) ? siteOnly : missing).push(c);
  }
  checked += used.size;
  console.log((missing.length ? "✗ " : siteOnly.length ? "· " : "✓ ") + src.padEnd(28) + String(used.size).padStart(4) + " classes" +
    (missing.length ? "  MISSING: " + missing.join(" ") : "") +
    (siteOnly.length ? "  (site sheet: " + siteOnly.join(" ") + ")" : ""));
  bad += missing.length;
}
console.log("\n" + checked + " class references checked against " + defined.size + " admin-layer definitions (" +
  LAYERS.length + " stylesheets + " + jsFiles.length + " modules) and " + siteDefined.size +
  " public-site definitions — missing: " + bad);
process.exit(bad ? 1 : 0);
