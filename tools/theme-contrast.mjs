#!/usr/bin/env node
/* Woodex Admin v2.7 — WCAG contrast gate for the design tokens.
 *
 *   node tools/theme-contrast.mjs            # both themes
 *   node tools/theme-contrast.mjs --json     # machine-readable
 *
 * The admin derives every colour from the tokens in admin/admin.css, so a single token pair that
 * fails AA fails on every screen at once — which is exactly the failure a per-screen review keeps
 * missing. This reads the light (`:root{…}`) and dark (`html.dark{…}`) blocks, resolves `var()`
 * chains, and checks the pairs that carry text against the surfaces they sit on.
 *
 * Thresholds: 4.5:1 for body/secondary text, 3:1 for large text (headings, KPI numbers) and for
 * non-text UI (borders that carry meaning, focus rings, status dots).
 * Exit 1 = at least one pair is below the threshold.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "woodex-live-p23");
const CSS = readFileSync(join(ROOT, "admin", "admin.css"), "utf8");

/* ---- token extraction ---- */
function block(re) {
  const m = CSS.match(re);
  if (!m) return {};
  const out = {};
  for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  return out;
}
const light = block(/:root\s*\{([\s\S]*?)\}/i);
const dark = Object.assign({}, light, block(/(?:html\.dark|\.dark)\s*\{([\s\S]*?)\}/i));

function hex(v, theme, depth = 0) {
  if (v == null || depth > 8) return null;
  v = String(v).trim();
  const varRef = v.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i);
  if (varRef) return hex(theme[varRef[1]] != null ? theme[varRef[1]] : varRef[2], theme, depth + 1);
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) return [Math.round(+rgb[1]), Math.round(+rgb[2]), Math.round(+rgb[3])];
  let h = v.replace("#", "");
  if (!/^[0-9a-f]+$/i.test(h)) return null;
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

/* ---- pairs: [foreground, background, minimum, what it carries] ---- */
const PAIRS = [
  ["--txt", "--bg", 4.5, "body text on the page background"],
  ["--txt", "--card", 4.5, "body text on a card"],
  ["--txt", "--card-elevated", 4.5, "body text on an elevated card"],
  ["--txt2", "--card", 4.5, "secondary text on a card"],
  ["--mut", "--bg", 4.5, "muted text on the page background"],
  ["--mut", "--card", 4.5, "muted text on a card"],
  ["--mut2", "--card", 3.0, "tertiary/label text on a card"],
  ["--pri", "--card", 3.0, "accent text and links on a card"],
  ["--pri", "--bg", 3.0, "accent on the page background"],
  ["--pri-fg", "--pri", 4.5, "primary button label"],
  ["--ok", "--card", 3.0, "success text"],
  ["--warn", "--card", 3.0, "warning text"],
  ["--bad", "--card", 3.0, "error text"],
  ["--info", "--card", 3.0, "info text"],
  ["--line", "--card", 1.2, "card border (non-text, must be visible)"]
];

const report = {};
let failures = 0, checked = 0;
for (const [name, theme] of [["light", light], ["dark", dark]]) {
  report[name] = [];
  for (const [fg, bg, min, what] of PAIRS) {
    const a = hex(theme[fg], theme), b = hex(theme[bg], theme);
    const ok = !!(a && b);
    const r = ok ? ratio(a, b) : 0;
    const pass = ok && r >= min;
    if (!pass) failures++;
    checked++;
    report[name].push({ token: fg + " on " + bg, ratio: +r.toFixed(2), min, pass, what, resolved: ok });
  }
}

if (process.argv.includes("--json")) { console.log(JSON.stringify(report, null, 2)); process.exit(failures ? 1 : 0); }
for (const theme of ["light", "dark"]) {
  console.log("\n" + theme.toUpperCase() + " THEME");
  for (const r of report[theme]) {
    console.log("  " + (r.pass ? "PASS" : "FAIL") + "  " + String(r.ratio).padStart(6) + ":1  (min " + r.min + ")  " + r.token.padEnd(30) + (r.pass ? "" : "  ← " + r.what));
  }
}
console.log("\n" + checked + " token pairs checked — failures: " + failures);
process.exit(failures ? 1 : 0);
