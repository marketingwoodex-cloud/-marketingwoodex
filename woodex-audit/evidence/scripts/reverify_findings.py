#!/usr/bin/env python3
"""Re-verify audit findings against the CURRENT tree. Read-only.
Each check: id, file (relative to tree root), regex, expected count (None = just report), note.
Prints PASS (anchor matches expectation) / FAIL / INFO with line numbers. Never prints secret values.
Usage: python3 reverify_findings.py <repo-root>
"""
import sys, re, os, json, subprocess
R = sys.argv[1].rstrip('/')
P = os.path.join(R, 'woodex-live-p29-v2.1-pro')
PL = os.path.join(R, 'woodex-live-p29-v2.1')

SCRIPT_JS = r'<script src="[^"]+\.js"'
JSV = r'\.js\?v='
HEX = r'#[0-9a-fA-F]{3,6}\b'
VARS = r'var\(--'
TRY = r'\btry\s*\{'
EMAIL = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}'

def lines(path):
    try: return open(path, encoding='utf-8', errors='ignore').read().split('\n')
    except FileNotFoundError: return None

def find(base, rel, pat, expect=None, count_only=False):
    p = os.path.join(base, rel)
    L = lines(p)
    if L is None: return ('FAIL', f'missing file {rel}')
    hits = [i+1 for i, l in enumerate(L) if re.search(pat, l)]
    n = len(hits)
    if expect is None: return ('INFO', f'{n} match(es) at lines {hits[:12]}')
    ok = (n == expect) if not isinstance(expect, tuple) else (expect[0] <= n <= expect[1])
    return ('PASS' if ok else 'FAIL', f'{n} match(es) at lines {hits[:12]} (expected {expect})')

def count_file(rel, pat):
    fp = os.path.join(P, rel)
    if not os.path.exists(fp): return -1
    t = open(fp, encoding='utf-8', errors='ignore').read()
    return len(re.findall(pat, t))

def node_ok(path):
    r = subprocess.run(['node', '--check', path], capture_output=True)
    return r.returncode == 0

CHECKS = [
 # ---- ADMIN & SETTINGS: build integrity
 ('AD-01','admin-settings.js (plain tree)', 'build', lambda: ('PASS' if not node_ok(os.path.join(PL,'admin/admin-settings.js')) else 'FAIL', 'plain copy fails node --check (expected FAIL = defect present)')),
 ('AD-01','admin-settings.js (-pro tree)', 'build', lambda: ('PASS' if node_ok(os.path.join(P,'admin/admin-settings.js')) else 'FAIL', '-pro copy parses (expected PASS)')),
 ('AD-02','admin-chat.js / admin-social.js (plain)', 'build', lambda: ('PASS' if not (node_ok(os.path.join(PL,'admin/admin-chat.js')) and node_ok(os.path.join(PL,'admin/admin-social.js'))) else 'FAIL', 'plain copies fail parse (expected FAIL)')),
 ('AD-02','renderActiveChat count (-pro vs plain)', 'dup', lambda: ('PASS' if count_file('admin/admin-chat.js', r'renderActiveChat')==3 else 'FAIL', f"-pro={count_file('admin/admin-chat.js', r'renderActiveChat')} (expected 3)")),
 # ---- routing / registry
 ('AD-03','admin.js:461 unknown hash -> dashboard', 'route', lambda: find(P,'admin/admin.js', r'if \(!def && v !== "profile"\) v = "dashboard"', 1)),
    ('AD-03','admin.js:680 soon-view: plain UNGUARDED, -pro guarded','phase', lambda: (lambda a,b: ('PASS' if ('def[4] ?' not in a and 'def[4] ?' in b) else 'FAIL', f"plain guarded={'def[4] ?' in a} | pro guarded={'def[4] ?' in b} (expected plain=False, pro=True)"))(open(os.path.join(PL,'admin/admin.js'),encoding='utf-8').read(), open(os.path.join(P,'admin/admin.js'),encoding='utf-8').read())),
 ('AD-04','#/integrations absent from NAV', 'route', lambda: find(P,'admin/admin.js', r'\["integrations",', 0)),
 ('AD-04','admin-settings.js alias integrations', 'route', lambda: find(P,'admin/admin-settings.js', r'integrations', None)),
 ('AD-10','admin-security.js no longer overwrites approvals (AD-10 fix, fixed pending verification)', 'registry', lambda: find(P,'admin/admin-security.js', r'W\.VIEWS\.approvals = W\.VIEWS\.security;', 0)),
 ('AD-10','admin-appr.js:21 defines approvals view', 'registry', lambda: find(P,'admin/admin-appr.js', r'VIEWS\.approvals = function', 1)),
 ('AD-11','admin-settings.js:588 connections alias', 'registry', lambda: find(P,'admin/admin-settings.js', r'W\.VIEWS\.connections = W\.VIEWS\.settings', 1)),
 ('AD-12','view keys defined by 2+ modules', 'registry', None),
 # ---- integrations truthfulness
 ('AD-05','APPS entries with connected:true', 'fake-status', lambda: find(P,'admin/admin-settings.js', r'connected: ?true', 14)),
 ('AD-05','no Claude AI-key card (Claude Desktop MCP snippet is separate)', 'fake-status', lambda: ('PASS' if count_file('admin/admin-settings.js', r'(?i)AI \(Claude\)|Claude AI|Claude keys|Claude API')==0 else 'FAIL', 'no Claude AI-key entry (expected 0)')),
 ('AD-06','Save toast "saved live!" REMOVED (post-remediation, expect 0; static only)', 'fake-status', lambda: ('PASS' if count_file('admin/admin-settings.js', r'saved live!')==0 else 'FAIL', 'expected 0')),
 ('AD-07','Ping canned "200 OK" REMOVED (post-remediation, expect 0; static only)', 'fake-status', lambda: ('PASS' if count_file('admin/admin-settings.js', r'Ping successful: 200 OK')==0 else 'FAIL', 'expected 0')),
 ('AD-07','Connect sets app.connected locally', 'fake-status', lambda: find(P,'admin/admin-settings.js', r'app\.connected = true;', 1)),
 ('AD-08','tile bridge targets #st-tabs', 'bridge', lambda: find(P,'admin/admin-integ.js', r'#st-tabs', (1,2))),
 ('AD-08','Settings renders #st-subnav', 'bridge', lambda: find(P,'admin/admin-settings.js', r'st-subnav', (1,5))),
 ('AD-09','observer targets .st-grid:not([data-ig])', 'bridge', lambda: find(P,'admin/admin-integ.js', r'st-grid:not\(\[data-ig\]\)', 1)),
 # ---- theme
 ('AD-13','.side !important obsidian (selector 1283, value 1284)', 'theme', lambda: find(P,'admin/admin.css', r'background: #0a0c10 !important', (3,3))),
 ('AD-14','.side selector blocks: 74 token bg, 190 mobile transform-only, 439 navy bg, 1283 obsidian bg', 'theme', lambda: find(P,'admin/admin.css', r'^\s*\.side\s*\{', 4)),
 ('AD-15','hex literals in admin-security.js', 'palette', lambda: ('INFO', f"{count_file('admin/admin-security.js', HEX)} hex, {count_file('admin/admin-security.js', VARS)} var( (expected 65 / 0 at rev f86258a)")),
 ('AD-15','hex literals in admin-integ.js', 'palette', lambda: ('INFO', f"{count_file('admin/admin-integ.js', HEX)} hex, {count_file('admin/admin-integ.js', VARS)} var( (expected 10 / 0)")),
 ('AD-17','data-theme used by live admin JS', 'theme', lambda: ('PASS' if count_file('admin/admin.js', r'data-theme')==0 else 'FAIL', 'admin.js data-theme refs (expected 0)')),
 ('AD-18','#dark-btn re-renders only on dashboard', 'theme', lambda: find(P,'admin/admin.js', r'dark-btn', 1)),
 # ---- persistence / boot
 ('AD-19','boot redirect to installer on dbError', 'boot', lambda: find(P,'admin/admin.js', r'st\.needsSetup \|\| st\.dbError', 1)),
 ('AD-19','status returns dbError when db() throws', 'boot', lambda: find(P,'api/admin.php', r'\$dbOk = false', 1)),
 ('AD-21','jwrite truncates before lock (file_put_contents LOCK_EX)', 'persist', lambda: find(P,'api/admin.php', r'function jwrite.*file_put_contents\(\$f', 1)),
 ('AD-21','jread takes no lock', 'persist', lambda: ('PASS' if count_file('api/admin.php', r'function jread[^\n]*flock')==0 else 'FAIL', 'flock inside jread (expected 0)')),
 ('AD-21','bsecret regenerates on empty read', 'persist', lambda: find(P,'api/admin.php', r'function bsecret', 1)),
 ('AD-22','seqL counter (WITHDRAWN: data-only, not code)', 'persist', lambda: ('INFO', 'seqL in pro api/ code: ' + str(count_file('api/admin.php', r'seqL')) + ' (expected 0)')),
 # ---- error envelope
 ('AD-20','dispatcher catches only PDOException', 'error', lambda: find(P,'api/admin.php', r'catch \(PDOException \$e\)', 1)),
 ('AD-20','strict_types=1 in admin.php', 'error', lambda: find(P,'api/admin.php', r'declare\(strict_types=1\)', 1)),
 ('AD-20','client maps non-JSON 500 to message', 'error', lambda: find(P,'admin/admin.js', r'Server error \(', 1)),
 ('CC-02','try-block count per library (12 present; r404-lib.php absent)', 'error', lambda: ('INFO', ', '.join(f"{f}={count_file('api/'+f, TRY)}" for f in ['content-lib.php','dash-lib.php','sales-lib.php','roles-lib.php','sheets-lib.php','redirects-lib.php','logos-lib.php','google-data-lib.php','phase8-lib.php','r404-lib.php','p18e-lib.php','p18h-lib.php','p18j-lib.php']))),
 # ---- overview / polling
 ('OV-01','unguarded s.folders reads (dashboard)', 'overview', lambda: find(P,'admin/admin.js', r'Object\.keys\(s\.folders\)', 2)),
 ('OV-02','navBadges interval 60s', 'poll', lambda: find(P,'admin/admin.js', r'setInterval\(function \(\) \{ if \(!document\.hidden\) navBadges', 1)),
 ('SA-01','admin-crm.js polling', 'poll', lambda: find(P,'admin/admin-crm.js', r'setInterval', None)),
 ('SA-02','admin-sales17.js replaces enquiries', 'registry', lambda: find(P,'admin/admin-sales17.js', r'W\.VIEWS\.enquiries = function', 1)),
 ('AU-04','admin-chat2.js setInterval(load,3000)', 'poll', lambda: find(P,'admin/admin-chat2.js', r'setInterval\(function \(\) \{ if \(d\.hidden', 1)),
 ('AU-05','admin-tg.js polling', 'poll', lambda: find(P,'admin/admin-tg.js', r'setInterval', None)),
 ('AU-05','admin-p18g.js polling', 'poll', lambda: find(P,'admin/admin-p18g.js', r'setInterval', None)),
 # ---- automation / locks
 ('AU-01','wag_tick takes wa-auto.lock with LOCK_NB', 'lock', lambda: find(P,'api/p18g-lib.php', r'wa-auto\.lock.*LOCK_NB', 1)),
 ('AU-01','wag_save is a plain writer (no lock inside)', 'lock', lambda: find(P,'api/p18g-lib.php', r'function wag_save', 1)),
 ('AU-02','silent busy return', 'busy', lambda: find(P,'api/p18g-lib.php', r"'busy' => true", 1)),
 ('AU-03','cronKey regenerated if empty', 'cron', lambda: find(P,'api/p18g-lib.php', r"cronKey'\] === ''", 1)),
 ('AU-03','cron key comparison hash_equals', 'cron', lambda: find(P,'api/wa-cron.php', r'hash_equals', 1)),
 # ---- website / CMS
 ('WC-01','builder content save without mtime check', 'cms', lambda: find(P,'api/builder.php', r'file_put_contents\(\$abs, \$content, LOCK_EX\)', 1)),
 ('WC-02','content-lib lock busy returns 0', 'cms', lambda: find(P,'api/content-lib.php', r'if \(!flock\(\$fh, LOCK_EX \| LOCK_NB\)\) \{ fclose\(\$fh\); return 0; \}', 1)),
 ('WC-04','missing asset: panorama image', 'asset', lambda: ('PASS' if not os.path.exists(os.path.join(P,'assets/panoramas/dha6-luxury-living-360.jpg')) else 'FAIL', 'file absent (expected absent)')),
 ('WC-04','missing asset: qr placeholder', 'asset', lambda: ('PASS' if not os.path.exists(os.path.join(P,'assets/img/qr-placeholder.png')) else 'FAIL', 'file absent (expected absent)')),
 ('WC-05','RewriteCond www repeated in .htaccess', 'deploy', lambda: find(P,'.htaccess', r'RewriteCond %\{HTTP_HOST\} \^www', 2)),
 # ---- deployment / security
 ('AD-25','Dockerfile chmod 777 on _private', 'deploy', lambda: find(P,'Dockerfile', r'chmod -R 777 /var/www/html/_private', 1)),
 ('AD-25','Dockerfile does NOT set AllowOverride (defect anchor: PASS = defect present)', 'deploy', lambda: ('PASS' if count_file('Dockerfile', r'AllowOverride')==0 else 'FAIL', 'AllowOverride in Dockerfile (expected 0 = defect present)')),
 ('AD-26','30-day cache on css/js', 'cache', lambda: find(P,'.htaccess', r'max-age=2592000', 1)),
    ('AD-26','admin/index.html script tags without ?v=', 'cache', lambda: ('INFO', f"{count_file('admin/index.html', SCRIPT_JS)} script tags, {count_file('admin/index.html', JSV)} with ?v=")),
 ('AD-24','secret-bearing files tracked (6 expected)', 'secret', None),
 ('AD-27','Telegram-format token literal in admin-tg.js (client JS)', 'secret', lambda: find(P,'admin/admin-tg.js', r'\d{6,}:[A-Za-z0-9_-]{30,}', (2,2))),
 ('AD-28','Telegram-format token in .env.example', 'secret', lambda: find(P,'.env.example', r'\d{6,}:[A-Za-z0-9_-]{30,}', 1)),
 ('AD-28','Telegram-format token in root SQL dump', 'secret', lambda: find(P,'woodex-database.sql', r'\d{6,}:[A-Za-z0-9_-]{30,}', 1)),
 ('DB-01','SQL dump: email-like strings (count only)', 'pii', lambda: ('INFO', f"{len(re.findall(EMAIL, open(os.path.join(P,'woodex-database.sql'),encoding='utf-8',errors='ignore').read()))} matches")),
 # ---- accessibility / SEO
 ('A11Y-01','estimator inputs without <label> (est-name/phone/email)', 'a11y', lambda: ('PASS' if all(not re.search(r'for="%s"'%i, open(os.path.join(P,'estimator/index.html'),encoding='utf-8').read()) for i in ['est-name','est-phone','est-email']) else 'FAIL', 'no label[for] for est-name, est-phone, est-email (expected none = defect present)')),
 ('A11Y-01','estimator honeypots aria-hidden (positive control)', 'a11y', lambda: find(P,'estimator/index.html', r'id="est-hp".*aria-hidden="true"', 1)),
 ('SEO-01','robots.txt present', 'seo', lambda: ('PASS' if os.path.exists(os.path.join(P,'robots.txt')) else 'FAIL', 'robots.txt present')),
 ('SEO-01','sitemap.xml present', 'seo', lambda: ('PASS' if os.path.exists(os.path.join(P,'sitemap.xml')) else 'FAIL', 'sitemap.xml present')),
]

SPECIAL = {
 'AD-12': lambda: (lambda c: ('INFO', f"{len(c)} keys with 2+ owners (expected 20)"))(
     __import__('collections').Counter()),
}

out = []
for cid, label, cat, fn in CHECKS:
    if fn is None:
        if cid == 'AD-12':
            admin = os.path.join(P, 'admin')
            owners = {}
            for f in os.listdir(admin):
                if not f.endswith('.js'): continue
                for m in re.finditer(r'(?:W\.)?VIEWS\.([a-zA-Z0-9_]+)\s*=(?!=)', open(os.path.join(admin,f),encoding='utf-8',errors='ignore').read()):
                    owners.setdefault(m.group(1), set()).add(f)
            multi = {k: sorted(v) for k, v in owners.items() if len(v) > 1}
            res = ('PASS' if len(multi) == 19 else 'FAIL', f'{len(multi)} keys with 2+ owners (expected 19 after AD-10 fix; was 20)')
        elif cid == 'AD-24':
            tracked = subprocess.run(['git','-C',R,'ls-files','woodex-live-p29-v2.1-pro/.env','woodex-live-p29-v2.1-pro/config.php','woodex-live-p29-v2.1-pro/_private/db.json','woodex-live-p29-v2.1-pro/_private/admin-db.json','woodex-live-p29-v2.1-pro/_private/system.json','woodex-live-p29-v2.1-pro/_private/company.json'], capture_output=True, text=True).stdout.split()
            res = ('PASS' if len(tracked) == 6 else 'FAIL', f'{len(tracked)} of 6 secret-bearing files tracked (expected 6)')
        else:
            res = ('INFO', 'n/a')
    else:
        res = fn()
    out.append((cid, label, res[0], res[1]))

for cid, label, st, msg in out:
    print(f"{st:4s} {cid:8s} {label}\n         {msg}")
print()
import collections
print('SUMMARY', dict(collections.Counter(s for _, _, s, _ in out)))
