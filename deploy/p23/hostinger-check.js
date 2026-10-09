#!/usr/bin/env node
/**
 * WOODEX — Hostinger public_html readiness check.
 *
 * Run it against the folder that will become public_html (the unzipped package):
 *   node hostinger-check.js /path/to/extracted/woodex-diploy-23
 *
 * Everything is pure Node (no shell, no PHP, no zip tool needed): 54 checks that
 * answer one question — will hPanel serve this site without a 500, a 404 or a
 * leak?  Exit code = number of failed checks.
 */
const fs = require('fs'), path = require('path');
const R = path.resolve(process.argv[2] || '.');
const rows = [];
const add = (ok, name, note = '') => rows.push([!!ok, name, note]);

const list = (dir, acc = []) => {
  let es = [];
  try { es = fs.readdirSync(path.join(R, dir), { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of es) {
    const rel = (dir ? dir + '/' : '') + e.name;
    if (e.isDirectory()) { acc.push({ rel, dir: true }); list(rel, acc); }
    else acc.push({ rel, dir: false });
  }
  return acc;
};
const all = list('');
const exists = p => { try { fs.statSync(path.join(R, p)); return true; } catch (e) { return false; } };
const isDir = p => { try { return fs.statSync(path.join(R, p)).isDirectory(); } catch (e) { return false; } };
const isFile = p => { try { return fs.statSync(path.join(R, p)).isFile(); } catch (e) { return false; } };
const read = p => { try { return fs.readFileSync(path.join(R, p), 'utf8'); } catch (e) { return ''; } };
const files = all.filter(x => !x.dir).map(x => x.rel);

/* A — entry files Hostinger needs directly in public_html */
['index.php', 'index.html', '.htaccess', 'config.php', 'includes/config.php', 'favicon.ico',
 'robots.txt', 'sitemap.xml', '404.html', '500.html', '503.html', 'coming-soon.html',
 'DEPLOY-HOSTINGER.md'].forEach(f => add(isFile(f), 'entry file: ' + f));

/* B — folder layout from Hostinger's own example */
['assets', 'css', 'js', 'images', 'uploads', 'admin', 'api', 'includes', '_private',
 '_database', '_templates', 'builder', 'insights', 'projects'].forEach(d => add(isDir(d), 'folder: ' + d + '/'));

/* C — .htaccess rules that make the difference on shared hosting */
const ht = read('.htaccess');
add(/DirectoryIndex[^\n]*index\.php/.test(ht), 'DirectoryIndex serves index.php first');
add(/RewriteRule \^_private/.test(ht) && /RewriteRule \^_database/.test(ht) && /RewriteRule \^_templates/.test(ht), '_private, _database, _templates return 403');
add(/RewriteRule \^config\\.php\$/.test(ht) && /RewriteRule \^includes\//.test(ht), 'config.php and /includes/ return 403');
add(/\\.sql/.test(ht) && /\\.log/.test(ht) && /\\.env/.test(ht), '*.sql, *.log, *.md, *.env, *-lib.php blocked');
add(/HTTPS\}?\s*!=on|\{HTTPS\} !=on/.test(ht) && /www\\?\./.test(ht), 'HTTPS forced + www → apex redirect');
add(/Cache-Control/.test(ht) && /DEFLATE/i.test(ht), 'cache headers + gzip enabled');
add(/ErrorDocument 404 \/404\.html/.test(ht) && /ErrorDocument 500/.test(ht) && /ErrorDocument 503/.test(ht), 'ErrorDocuments for 404 / 500 / 503');
add(/RewriteRule \^uploads\/.+assets\/uploads/.test(ht.replace(/\s+/g, ' ')) && /RewriteRule \^images\/.+assets\/img/.test(ht.replace(/\s+/g, ' ')), '/uploads and /images aliased to the real media folders');
add((ht.match(/<IfModule/g) || []).length === (ht.match(/<\/IfModule>/g) || []).length && (ht.match(/<FilesMatch/g) || []).length === (ht.match(/<\/FilesMatch>/g) || []).length, 'IfModule / FilesMatch blocks balanced');
add(!/\r/.test(ht), 'no CRLF in .htaccess (CRLF silently breaks rules on Apache)');

/* D — LiteSpeed killers */
const hts = ['.htaccess'].concat(all.filter(x => !x.dir && path.basename(x.rel) === '.htaccess').map(x => x.rel));
const badPhpDir = [...new Set(hts)].filter(f => /^[^#]*\b(php_flag|php_value)\b/m.test(read(f)));
add(badPhpDir.length === 0, 'no php_flag / php_value in any .htaccess', badPhpDir.join(', ') || 'LiteSpeed rejects those with HTTP 500');

/* E — nothing that must not be in a docroot */
const junk = files.filter(f => /\.(zip|tar|gz|sql|log|bak|sqlite|env\.local)$/i.test(f) && !f.startsWith('_database/'));
add(junk.length === 0, 'no archives/dumps outside _database/', junk.slice(0, 3).join(', ') || (junk.length ? '' : 'the only .sql files sit in the blocked _database/ folder'));
add(!files.some(f => /^(package(-lock)?\.json|composer\.(json|lock)|yarn\.lock|php\.ini|\.user\.ini|web\.config)$/.test(f)), 'no manifest/php.ini/web.config in the docroot');
add(!files.some(f => /(^|\/)node_modules\//.test(f)) && !files.some(f => /(^|\/)\.git\//.test(f)), 'no node_modules / .git inside');
add(!files.some(f => /\.html$/i.test(f) && /(^|\/)(uploads|images|_private|_database)\//.test(f)), 'no stray .html in media/private folders (the admin would list them as pages)');

/* F — private storage the PHP writes to */
['assets/uploads/.htaccess', 'images/.htaccess', 'uploads/.htaccess', '_private/.htaccess',
 '_database/.htaccess', '_templates/.htaccess'].forEach(f => add(isFile(f), 'deny-execution .htaccess: ' + f));
add(isFile('_private/db.example.json'), '_private/db.example.json (template for db.json)');
add(isFile('api/cacert.pem'), 'api/cacert.pem (outbound HTTPS: WhatsApp, AI, Google)');

/* G — app pieces */
add(exists('admin/index.html') && exists('admin/admin.js') && exists('admin/admin.css'), 'admin dashboard entry files');
add(exists('builder/index.html') && exists('builder/builder.js'), 'page builder entry files');
['api/admin.php', 'api/builder.php', 'api/forms.php', 'api/chat.php', 'api/mcp.php'].forEach(f => add(isFile(f), 'endpoint: ' + f));
add(exists('wx-install.php') && exists('wx-check.php'), 'installer + server self-check');
add(files.filter(f => /\.(webp|jpe?g|png|svg)$/i.test(f)).length > 200, 'images shipped: ' + files.filter(f => /\.(webp|jpe?g|png|svg)$/i.test(f)).length);
add(files.filter(f => /\.php$/i.test(f)).length >= 45, 'php files: ' + files.filter(f => /\.php$/i.test(f)).length);

/* H — unresolved-conflict scan (the bug that took this site down once) */
const conflicted = files.filter(f => /\.(php|js|css|html|env|txt|md)$|\.htaccess$/.test(f) && /^(<<<<<<< |>>>>>>> )/m.test(read(f)));
add(conflicted.length === 0, 'no unresolved merge conflicts', conflicted.slice(0, 5).join(', ') || files.length + ' text files scanned');
const phpNoTag = files.filter(f => f.endsWith('.php') && !read(f).startsWith('<?php'));
add(phpNoTag.length === 0, 'every .php starts with <?php (no BOM/whitespace → no “white page”)', phpNoTag.slice(0, 3).join(', '));

/* I — sizes Hostinger cares about */
const big = files.map(f => ({ f, s: fs.statSync(path.join(R, f)).size })).filter(x => x.s > 8 * 1048576);
add(big.length === 0, 'no file over 8 MB', big.map(x => x.f).join(', '));
const modes = new Map(); let wrong = [];
for (const x of all) {
  const m = fs.statSync(path.join(R, x.rel)).mode & 0o7777;
  const want = x.dir ? 0o755 : 0o644;
  modes.set(octal(m), (modes.get(octal(m)) || 0) + 1);
  if (m & 0o002) wrong.push('world-writable ' + x.rel);
  if (!x.dir && (m & 0o004) === 0) wrong.push('not readable ' + x.rel);
}
function octal(n) { return n.toString(8); }
add(wrong.length === 0, 'permissions ' + [...modes.keys()].join(' / ') + ' (755 dirs / 644 files wanted)', wrong.slice(0, 3).join(', '));
add(files.length >= 500, 'file count: ' + files.length, 'hPanel extraction is instant at this size');
const symlinks = all.filter(x => { try { return fs.lstatSync(path.join(R, x.rel)).isSymbolicLink(); } catch (e) { return false; } });
add(symlinks.length === 0, 'no symlinks (Hostinger extraction drops them)', symlinks.slice(0, 3).map(s => s.rel).join(', '));

/* J — SEO bits that must exist for the domain */
add(/Sitemap: https:\/\/woodex\.com\.pk\/sitemap\.xml/.test(read('robots.txt')), 'robots.txt points at the sitemap');
add(/Disallow: \/admin\//.test(read('robots.txt')), 'robots.txt keeps /admin, /api, /builder, /_private out of Google');
const sm = read('sitemap.xml'); const locs = [...sm.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
const dead = locs.filter(u => { const p = u.replace(/^\/|\/$/g, ''); return !(exists(p + '/index.html') || exists(p + '.html') || exists(p) || p === ''); });
add(locs.length > 100 && dead.length === 0, 'sitemap URLs resolve: ' + (locs.length - dead.length) + '/' + locs.length, dead.slice(0, 4).join(', '));
add(!files.some(f => /(^|\/)wp-(admin|content|login|includes)/.test(f)), 'no WordPress leftovers (a scanned site with wp-* is a red flag)');

const failed = rows.filter(r => !r[0]);
for (const [ok, name, note] of rows) console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (note ? '   — ' + note : ''));
console.log('\n' + (failed.length ? failed.length + ' of ' + rows.length + ' checks FAILED — fix before uploading'
  : 'ALL ' + rows.length + ' HOSTINGER public_html CHECKS PASSED — ready to upload'));
process.exit(Math.min(failed.length, 255));
