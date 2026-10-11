#!/usr/bin/env node
/**
 * css-check.mjs — cheapest possible guard for the stylesheet.
 *
 * Why: an in-place edit that truncates a rule (e.g. a scripted replace that stops at the first
 * newline) leaves an unbalanced `{`, and a browser then silently DISCARDS every rule after it.
 * The symptom is invisible in screenshots until you measure colours, so check it mechanically.
 *
 * Usage: node css-check.mjs [file ...]        (default: woodex-live-p29-v2.1-pro/admin/*.css)
 * Exit code 1 if any file fails.
 */
import fs from 'fs';
import path from 'path';

const DEFAULT_DIR = path.resolve(import.meta.dirname, '../../woodex-live-p29-v2.1-pro/admin');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(DEFAULT_DIR).filter(f => f.endsWith('.css')).map(f => path.join(DEFAULT_DIR, f));

let failed = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // scan the stylesheet the way a parser does: skip comments and quoted strings, so a brace inside
  // `content: "{"` or a comment cannot be mistaken for a block delimiter.
  let open = 0, close = 0, depth = 0, minDepth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? src.length : e + 1; continue; }
    if (c === '"' || c === "'") { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '{') { open++; depth++; }
    else if (c === '}') { close++; depth--; if (depth < minDepth) minDepth = depth; }
  }

  const problems = [];
  if (open !== close) problems.push(`unbalanced braces: ${open} { vs ${close} }`);
  if (minDepth < 0) problems.push('closing brace with no open rule (stray })');
  if (depth > 0) problems.push(`${depth} rule(s) left unclosed at EOF — browsers drop everything after the break`);

  const kb = (src.length / 1024).toFixed(1);
  if (problems.length) {
    failed++;
    console.log(`FAIL ${path.basename(file)} (${kb} KB) — ${problems.join('; ')}`);
  } else {
    console.log(`ok   ${path.basename(file)} (${kb} KB) — ${open} rules, balanced`);
  }
}
process.exit(failed ? 1 : 0);
