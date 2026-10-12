# Filtered static preview for the pro site, with a PREVIEW-ONLY API stub.
# - Serves public front-end files only (blocks PHP source, api/, private/db/template folders, SQL, env, dotfiles, docs).
# - POST /api/admin.php and /api/builder.php are answered by this stub (no PHP, no database, no real accounts).
# - /api/builder.php (site builder + theme) is answered by build_builder() in preview_fixtures.py.
# - Every action gets either a handler here, a shape from preview_fixtures.py, or an empty-but-valid answer;
#   a screen that hangs on "Loading…" means its action has no fixture yet — add one to preview_fixtures.py.
#   Login accepts ONLY accounts set by the environment (no built-in account, no values in this file):
#     PREVIEW_ACCOUNTS       JSON list, e.g. [{"email":"a@b.pk","role":"sales","password":"..."}]
#                            roles mirror api/roles-lib.php: owner|admin|editor|sales|support
#                            optional "name" and "token" per account
#     PREVIEW_ACCOUNTS_FILE  path to a file holding the same JSON (git-ignored; keep it out of the repo)
#     PREVIEW_EMAIL/PASS     one extra account (role owner) — kept so the QA probes keep working
#   Each account gets its own token, so `me`/`status` return THAT account after a reload
#   and the role gating in the sidebar can be checked by signing in as each role.
import http.server, os, sys, json, urllib.parse, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preview_fixtures import (build as build_fixture, build_builder, TEMPLATES, TPL_STARTERS,
                              TPL_NEXT, TPL_KINDS, _tpl_total)  # preview-only sample answers (see that file)
ROOT = sys.argv[1]
PORT = int(sys.argv[2])
PREVIEW_EMAIL = os.environ.get('PREVIEW_EMAIL', '').strip().lower()
PREVIEW_PASS = os.environ.get('PREVIEW_PASS', '')
TOKEN = 'preview-token'
# Role model mirrors api/roles-lib.php (ROLE_LABELS / wx_role_groups) so the preview can demo gating.
ROLE_LABELS = {'owner': 'Master', 'admin': 'Manager', 'editor': 'Developer', 'sales': 'Sales', 'support': 'Support'}
ROLE_GROUPS = {
    'owner': ['self', 'sales', 'conversations', 'updates', 'broadcast', 'ai', 'website', 'settings', 'master'],
    'admin': ['self', 'sales', 'conversations', 'updates', 'broadcast', 'ai', 'website', 'settings'],
    'editor': ['self', 'website', 'settings'],
    'sales': ['self', 'sales', 'conversations'],
    'support': ['self', 'conversations', 'updates', 'support_view'],
}
BUILDER_ROLES = ('owner', 'admin', 'editor')  # same list as the login branch of api/admin.php


# Same words api/admin.php role_canon() accepts: a role column another tool wrote must not
# lock the owner out of the app (nor make the preview silently drop the account).
ROLE_ALIAS = {'master': 'owner', 'superadmin': 'owner', 'administrator': 'owner', 'owner': 'owner',
              'manager': 'admin', 'admin': 'admin', 'developer': 'editor', 'editor': 'editor',
              'sales': 'sales', 'support': 'support'}


def role_canon(r):
    r = str(r or '').strip().lower()
    return ROLE_ALIAS.get(r, r or 'support')


def _load_accounts():
    raw = os.environ.get('PREVIEW_ACCOUNTS', '').strip()
    f = os.environ.get('PREVIEW_ACCOUNTS_FILE', '').strip()
    if not raw and f:
        try:
            with open(f, encoding='utf-8') as fh:
                raw = fh.read()
        except OSError as e:
            print('preview accounts file not readable: %s' % e)
    out = []
    if raw:
        try:
            rows = json.loads(raw)
        except ValueError as e:
            print('PREVIEW_ACCOUNTS is not valid JSON: %s' % e)
            rows = []
        for i, a in enumerate(rows if isinstance(rows, list) else []):
            em = str(a.get('email', '')).strip().lower()
            pw = str(a.get('password') or a.get('pass') or '')
            role = role_canon(a.get('role', 'owner'))
            if not em or not pw:
                print('preview account skipped (needs email + password): %s' % (em or '(no email)'))
                continue
            if role not in ROLE_GROUPS:
                print('preview account skipped (unknown role "%s"): %s' % (a.get('role'), em))
                continue
            out.append({'id': i + 1, 'name': str(a.get('name') or ROLE_LABELS[role]), 'role': role,
                        'email': em, 'password': pw, 'token': str(a.get('token') or ('preview-token-%d' % (i + 1)))})
    if PREVIEW_EMAIL and PREVIEW_PASS and not any(a['email'] == PREVIEW_EMAIL for a in out):
        out.append({'id': len(out) + 1, 'name': os.environ.get('PREVIEW_NAME', 'Owner'), 'role': 'owner',
                    'email': PREVIEW_EMAIL, 'password': PREVIEW_PASS, 'token': TOKEN})
    return out


ACCOUNTS = _load_accounts()
BY_TOKEN = dict((a['token'], a) for a in ACCOUNTS)
BY_EMAIL = dict((a['email'], a) for a in ACCOUNTS)
if ACCOUNTS:
    print('preview accounts: ' + ', '.join('%s (%s)' % (a['email'], a['role']) for a in ACCOUNTS))


def pub(a):
    return {'id': a['id'], 'name': a['name'], 'role': a['role'], 'email': a['email']}


def caps_of(a):
    return {'label': ROLE_LABELS.get(a['role'], a['role'].title()),
            'groups': ROLE_GROUPS.get(a['role'], ['self']), 'perms': []}


def builder_token(a):
    """api/admin.php gives a builder token to owner/admin/editor only; the builder screens and
    Hero slides show 'No builder access' without it. Same rule here."""
    return 'preview-builder-token' if a['role'] in BUILDER_ROLES else None
BLOCK_DIRS = {'api', '_private', '_database', '_templates', '_scripts', 'tools', 'node_modules', '.git'}
BLOCK_EXT = {'.php', '.sql', '.env', '.md', '.json', '.lock', '.yaml', '.yml', '.ini', '.bak', '.log', '.dist', '.sh', '.bat', '.tar', '.zip'}
BLOCK_NAMES = set()  # admin-tg.js no longer holds a token literal (C-1), so the Telegram page can be previewed
# Fallback identity for requests that arrive without a token (never a real person).
OWNER = ACCOUNTS[0] if ACCOUNTS else {'id': 1, 'name': os.environ.get('PREVIEW_NAME', 'Owner'),
                                     'role': 'owner', 'email': PREVIEW_EMAIL, 'token': TOKEN}
PREVIEW_PROJECT = {'id': 1, 'name': 'Preview project (stub)', 'stage': 'design', 'photos': [], 'value': 0, 'paid': 0, 'no': 'P-1', 'client': '',
                    'start': '2026-09-01', 'target': '2026-12-15', 'milestones': [{'label': 'Deposit', 'pct': 30, 'inv_id': 1}, {'label': 'Installation', 'pct': 70, 'inv_id': None}]}
PREVIEW_UNDATED = {'id': 2, 'name': 'Preview project without dates', 'stage': 'design', 'photos': [], 'value': 0, 'paid': 0, 'no': 'P-2', 'client': '', 'start': '', 'target': '', 'milestones': []}
FEED = []  # in-memory team feed for preview only
# In-memory inbox for preview only (shapes follow api/chat-lib.php). No real messages are sent.
CHATS = [
    {'id': 1, 'created_at': '2026-10-11 10:12:00', 'updated_at': '2026-10-11 10:14:00', 'name': 'Kamran Ashraf', 'phone': '+92 300 4455667', 'email': 'kamran@example.com', 'page': '/turnkey-design', 'status': 'open', 'mode': 'ai', 'agent': '', 'unread': 1, 'needs': False, 'last': 'Interested in turnkey construction and luxury interior for 10 Marla residence.', 'lead_id': None, 'handoff': '', 'assigned': None, 'tags': ['turnkey'], 'waitFrom': 0, 'channel': 'web'},
    {'id': 2, 'created_at': '2026-10-11 09:40:00', 'updated_at': '2026-10-11 09:58:00', 'name': 'Dr. Sarah Mansoor', 'phone': '+92 321 5551234', 'email': '', 'page': 'WhatsApp', 'status': 'open', 'mode': 'human', 'agent': 'Preview Owner', 'unread': 0, 'needs': True, 'last': 'Renovating a 3,000 sq ft dental clinic and wellness centre.', 'lead_id': 7, 'handoff': 'Asked to speak to a person', 'assigned': 1, 'tags': ['clinic'], 'waitFrom': 0, 'channel': 'wa'},
    {'id': 3, 'created_at': '2026-10-11 08:05:00', 'updated_at': '2026-10-11 08:20:00', 'name': 'Tariq Mahmood', 'phone': '', 'email': 'tariq@example.com', 'page': '/boardroom-tables', 'status': 'open', 'mode': 'ai', 'agent': '', 'unread': 0, 'needs': False, 'last': 'Complete solid wood executive boardroom table and acoustic panelling.', 'lead_id': None, 'handoff': '', 'assigned': None, 'tags': [], 'waitFrom': 0, 'channel': 'tg'},
]
MSGS = {
    1: [{'id': 1, 't': '2026-10-11 10:14:00', 'who': 'visitor', 'name': 'Kamran Ashraf', 'text': 'Interested in turnkey construction and luxury interior for 10 Marla residence.', 'att': None},
        {'id': 2, 't': '2026-10-11 10:14:02', 'who': 'ai', 'name': 'AI assistant', 'text': 'Assalam-o-Alaikum Kamran! Thank you for contacting Woodex Interior Studio. Our consultant will connect with you shortly.', 'att': None}],
    2: [{'id': 3, 't': '2026-10-11 09:40:00', 'who': 'visitor', 'name': 'Dr. Sarah Mansoor', 'text': 'Renovating a 3,000 sq ft dental clinic and wellness centre.', 'att': None},
        {'id': 4, 't': '2026-10-11 09:58:00', 'who': 'agent', 'name': 'Preview Owner', 'text': 'Thank you. Can we book a site visit this week?', 'att': None},
        {'id': 5, 't': '2026-10-11 09:59:00', 'who': 'note', 'name': 'Preview Owner', 'text': 'Call back after 3 pm.', 'att': None}],
    3: [{'id': 6, 't': '2026-10-11 08:20:00', 'who': 'visitor', 'name': 'Tariq Mahmood', 'text': 'Complete solid wood executive boardroom table and acoustic panelling.', 'att': None}],
}
NEXT_MSG = [100]
API_PATHS = {'/api/admin.php', '/api/builder.php'}

# ---------------------------------------------------------------- media library (real files)
# Mirrors api/media-lib.php: same folders, same exclusions, same "used on" detection. The
# preview used to answer media_list with sample files, which made the library look like it
# was not the website's data.
IMG_EXT = re.compile(r'\.(webp|jpe?g|png|gif|svg|avif)$', re.I)
IMG_OK = re.compile(r'^/assets/(img|uploads)/([a-z0-9-]+/)?[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png|gif|svg|avif)$')
RS_VARIANT = re.compile(r'\.w(480|960|1600)\.webp$', re.I)
RS_LEGACY = re.compile(r'-(480|960|1600)\.webp$', re.I)
PAGE_SKIP = {'_private', 'builder', 'admin', 'api', 'assets', 'node_modules', '.git', 'vendor',
             'tools', '_database', '_templates', '_scripts'}


def site_pages(root):
    """Every .html the website serves (a7_pages() in api/media-lib.php)."""
    out = []
    for dp, dns, fns in os.walk(root):
        rel = os.path.relpath(dp, root)
        top = rel.split(os.sep)[0]
        if rel != '.' and top in PAGE_SKIP:
            dns[:] = []
            continue
        for fn in fns:
            if fn.lower().endswith('.html'):
                out.append(os.path.relpath(os.path.join(dp, fn), root).replace(os.sep, '/'))
    return out


def _h_file_for(href, root):
    """a7_health_scan()'s $fileFor: the URL path -> the file it must exist as on disk."""
    p = urllib.parse.unquote(re.split(r'[?#]', href)[0])
    if p in ('', '/'):
        return 'index.html'
    p = p.lstrip('/')
    if p.endswith('/'):
        return p + 'index.html'
    return p if re.search(r'\.[a-z0-9]+$', p, re.I) else p + '/index.html'


def real_health_scan(root):
    """The same scan the admin runs on itself (a7_health_scan() in api/media-lib.php):
    it stays local — it reads the real pages and assets from disk and reports what is
    actually wrong with them. No network, so it behaves the same here as on the host."""
    redir = []
    try:
        with open(os.path.join(root, '_private', 'redirects.json'), encoding='utf-8') as fh:
            for r in (json.load(fh) or []):
                src = (r.get('from') if isinstance(r, dict) else r) or ''
                redir.append(re.split(r'[?#]', str(src))[0].rstrip('/'))
    except (OSError, ValueError):
        pass
    pages = [p for p in site_pages(root)
             if not re.match(r'^(404|500|503)\.html$', p, re.I)
             and not re.match(r'(^|/)(google[0-9a-f]+\.html|[a-z0-9]+siteauth\.(html|xml))$', p, re.I)]
    issues, titles, sizes = [], {}, {}
    def add(rel, typ, sev, msg, **extra):
        issues.append(dict(rel=rel, type=typ, sev=sev, msg=msg, **extra))
    for rel in pages:
        try:
            with open(os.path.join(root, rel), encoding='utf-8', errors='ignore') as fh:
                h = fh.read()
        except OSError:
            h = ''
        m = re.search(r'<title[^>]*>(.*?)</title>', h, re.I | re.S)
        title = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
        m = re.search(r'<meta[^>]+name="description"[^>]*content="([^"]*)"', h, re.I)
        desc = m.group(1) if m else None
        if title == '':
            add(rel, 'seo', 3, 'Missing page title')
        else:
            if len(title) > 65:
                add(rel, 'seo', 1, 'Title is long (%d characters, aim for 60)' % len(title))
            titles.setdefault(title, []).append(rel)
        if not desc:
            add(rel, 'seo', 2, 'Missing meta description')
        elif len(desc) > 165:
            add(rel, 'seo', 1, 'Description is long (%d, aim for 150-158)' % len(desc))
        main = re.sub(r'<script[\s\S]*?</script>', '', h, flags=re.I)
        h1 = len(re.findall(r'<h1[\s>]', main, re.I))
        if h1 == 0:
            add(rel, 'seo', 2, 'No main heading (H1)')
        elif h1 > 1:
            add(rel, 'seo', 1, '%d main headings (H1), use one' % h1)
        if not re.search(r'<link[^>]+rel="canonical"', h, re.I):
            add(rel, 'seo', 1, 'No canonical link')
        noalt = 0
        for tag in re.findall(r'<img\b[^>]*>', main, re.I):
            am = re.search(r'\salt\s*=\s*"([^"]*)"', tag, re.I)
            if (not am or am.group(1).strip() == '') and not re.search(r'aria-hidden="true"|role="presentation"', tag):
                noalt += 1
        if noalt:
            add(rel, 'alt', 2, '%d image(s) without alt text' % noalt, count=noalt)
        seen = set()
        for href in re.findall(r'\shref="(/[^"]*)"', main, re.I):
            if re.match(r'^//|^/(api|admin|builder)/', href) or href in seen:
                continue
            seen.add(href)
            if not os.path.isfile(os.path.join(root, _h_file_for(href, root))) \
                    and re.split(r'[?#]', href)[0].rstrip('/') not in redir:
                add(rel, 'link', 3, 'Broken link: ' + href, target=href)
        for u in re.findall(r'\s(?:src|href|content)="((?:https://woodex\.com\.pk)?/assets/[^"]+\.(?:webp|jpe?g|png|gif|svg|avif))"', main, re.I):
            u = u.replace('https://woodex.com.pk', '')
            if u in seen:
                continue
            seen.add(u)
            fp = os.path.join(root, re.split(r'[?#]', u)[0].lstrip('/'))
            if not os.path.isfile(fp):
                add(rel, 'image', 3, 'Missing image: ' + u, target=u)
                continue
            sz = sizes.get(u) or os.path.getsize(fp)
            sizes[u] = sz
            if sz > 350 * 1024:
                add(rel, 'image', 1, 'Large image %s (%d KB)' % (os.path.basename(u), round(sz / 1024)), target=u)
    for rels in titles.values():
        if len(rels) > 1:
            for r in rels:
                add(r, 'seo', 1, 'Same title as %d other page(s)' % (len(rels) - 1))
    pen = 0
    for i in issues:
        pen += 3 if i['sev'] == 3 else (1.2 if i['sev'] == 2 else 0.35)
    score = int(max(0, min(100, round(100 - pen * 100 / max(1, len(pages) * 4)))))
    counts = {k: len([i for i in issues if i['type'] == k]) for k in ('seo', 'alt', 'link', 'image')}
    return {'score': score, 'pages': len(pages), 'at': time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime()),
            'issues': issues, 'counts': counts}


def media_alt_map(root):
    try:
        with open(os.path.join(root, '_private', 'media.json'), encoding='utf-8') as fh:
            m = json.load(fh)
        return m.get('alt') or {}, len(m.get('trash') or [])
    except (OSError, ValueError):
        return {}, 0


def real_media_list(root):
    pages = {}
    for rel in site_pages(root):
        try:
            with open(os.path.join(root, rel), encoding='utf-8', errors='ignore') as fh:
                pages[rel] = fh.read().lower()
        except OSError:
            pass
    alt, trash = media_alt_map(root)
    files = []
    for base in ('assets/img', 'assets/uploads'):
        absbase = os.path.join(root, base)
        for dp, dns, fns in os.walk(absbase):
            if '_orig' in dp.split(os.sep):
                dns[:] = []
                continue
            for fn in fns:
                if not IMG_EXT.search(fn):
                    continue
                url = '/' + os.path.relpath(os.path.join(dp, fn), root).replace(os.sep, '/')
                if RS_VARIANT.search(url) or not IMG_OK.match(url):
                    continue
                if RS_LEGACY.search(url):
                    stem = RS_LEGACY.sub('', url)
                    if any(os.path.isfile(os.path.join(root, stem.lstrip('/') + ext)) for ext in ('.webp', '.jpg', '.jpeg', '.png')):
                        continue
                st = os.stat(os.path.join(dp, fn))
                sub = os.path.dirname(os.path.relpath(os.path.join(dp, fn), absbase)).replace(os.sep, '/')
                low = url.lower()
                used = [r for r, txt in pages.items() if low in txt or (len(fn) > 10 and fn.lower() in txt)]
                files.append({'url': url, 'name': fn, 'folder': 'site' if base == 'assets/img' else (sub or 'uploads'),
                              'size': st.st_size, 'mtime': time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(st.st_mtime)),
                              'alt': alt.get(url, ''), 'used': sorted(used)})
    files.sort(key=lambda x: x['mtime'], reverse=True)
    try:
        folders = sorted(d for d in os.listdir(os.path.join(root, 'assets/uploads'))
                         if os.path.isdir(os.path.join(root, 'assets/uploads', d)))
    except OSError:
        folders = []
    return {'ok': True, 'files': files, 'folders': folders, 'trash': trash}


# ---------------------------------------------------------------- redirects (real plan)
# Mirrors api/redirects-lib.php: the shipped plan in api/redirect-plan.json is merged into the
# saved rules on first use and whenever the plan file changes, deletions are remembered, and
# every rule is checked against the files that actually exist in the site tree. The preview used
# to answer with two sample rows, which is why the screen looked "not connected" to the complete
# list. Runtime state is kept outside the app tree (tools/qa-p29/.preview-state).
STATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.preview-state')


def _rd_path(name):
    os.makedirs(STATE_DIR, exist_ok=True)
    return os.path.join(STATE_DIR, name)


def _rd_read(name, default):
    try:
        with open(_rd_path(name), encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def _rd_write(name, obj):
    with open(_rd_path(name), 'w', encoding='utf-8') as fh:
        json.dump(obj, fh, indent=1)


def _rd_plan(root):
    try:
        with open(os.path.join(root, 'api', 'redirect-plan.json'), encoding='utf-8') as fh:
            rows = json.load(fh)
        return rows if isinstance(rows, list) else []
    except (OSError, ValueError):
        return []


def _rd_one(r):
    r = r if isinstance(r, dict) else {}
    return {'from': '/' + str(r.get('from') or '').strip().strip('/') + ('/' if str(r.get('from') or '').strip('/') else ''),
            'to': str(r.get('to') or ''), 'type': int(r.get('type') or 301),
            'match': 'prefix' if r.get('match') == 'prefix' else 'exact',
            'src': str(r.get('src') or '')[:80], 'on': r.get('on', True) is not False}


def _rd_merge(cur, add):
    have = {str(r['from']).lower() for r in cur}
    n = 0
    for r in add:
        x = _rd_one(r)
        if x['from'].lower() in have or x['from'] == '/':
            continue
        cur.append(x)
        have.add(x['from'].lower())
        n += 1
    return {'list': cur, 'added': n}


def _rd_hash(root):
    try:
        import hashlib
        with open(os.path.join(root, 'api', 'redirect-plan.json'), 'rb') as fh:
            return hashlib.sha256(fh.read()).hexdigest()[:16]
    except OSError:
        return ''


def _rd_list(root):
    cur = [_rd_one(r) for r in _rd_read('redirects.json', [])]
    cfg = _rd_read('redirects-cfg.json', {})
    h = _rd_hash(root)
    if not cfg.get('seeded') or cfg.get('planHash') != h:
        skip = {str(s).lower() for s in (cfg.get('skip') or [])}
        add = [r for r in _rd_plan(root) if _rd_one(r)['from'].lower() not in skip]
        m = _rd_merge(cur, add)
        cur = m['list']
        cfg['seeded'] = True
        cfg['planHash'] = h
        _rd_write('redirects.json', cur)
        _rd_write('redirects-cfg.json', cfg)
    return cur, cfg


def _rd_test(root, rules):
    out = []
    for r in rules:
        st, msg = 'ok', ('Gone (410)' if r['type'] == 410 else 'Target page exists')
        frm = os.path.join(root, r['from'].strip('/'))
        live = os.path.isfile(os.path.join(frm, 'index.html')) or os.path.isfile(frm)
        if not r['on']:
            st, msg = 'off', 'Switched off'
        elif live:
            st, msg = 'warn', 'A live page exists at this address; the redirect hides it'
        elif r['type'] != 410 and str(r['to']).startswith('/'):
            path = str(r['to']).split('?')[0].split('#')[0].rstrip('/')
            tgt = os.path.join(root, path.strip('/'))
            ok = path == '/' or os.path.isfile(os.path.join(tgt, 'index.html')) or os.path.isfile(tgt)
            if not ok:
                st, msg = 'bad', 'Target page not found'
        out.append({'i': rules.index(r), 'status': st, 'msg': msg})
    return out


def redirects_payload(root):
    rules, cfg = _rd_list(root)
    return {'ok': True, 'redirects': rules, 'cfg': {'www': cfg.get('www', True), 'spam': cfg.get('spam', True)},
            'planCount': len(_rd_plan(root)), 'test': _rd_test(root, rules),
            'missed': len(_rd_read('404.json', {}))}


def empty(extra=None):
    d = {'ok': True, 'avatars': {}, 'rows': [], 'items': [], 'list': [], 'total': 0, 'per': 20, 'pages': [], 'cfg': {}, 'apps': [],
         'pending': 0, 'unread': 0, 'stats': {'pages': 0}, 'recent': [], 'kpi': {}, 'leads': [], 'chats': [], 'series': [],
         'funnel': [], 'pipeline': [], 'tasks': [], 'caps': {}, 'builderToken': None}
    if extra: d.update(extra)
    return d

# Quotation templates live in preview_fixtures.py (one store for seed, list, import, save).

# Preview-only leads. `leads_followups` MUST carry overdue/today/upcoming (the real API always does,
# api/sales17-lib.php:155) — the sales/support home screens read .length straight off them.
PREVIEW_LEADS = [
    {'id': 1, 'name': 'Kamran Ashraf', 'company': 'Marla residence', 'phone': '+92 300 4455667', 'stage': 'new', 'line': 'turnkey',
     'service': 'Turnkey residence', 'source': 'Website form', 'assigned_to': 1, 'next_at': '2026-10-10 11:00:00', 'next_type': 'Call', 'created_at': '2026-10-08 10:12:00'},
    {'id': 2, 'name': 'Dr. Sarah Mansoor', 'company': 'Dental clinic', 'phone': '+92 321 5551234', 'stage': 'visit', 'line': 'fitout',
     'service': 'Clinic fit-out', 'source': 'WhatsApp', 'assigned_to': 1, 'next_at': '2026-10-12 09:00:00', 'next_type': 'Site visit', 'created_at': '2026-10-06 08:40:00'},
    {'id': 3, 'name': 'Tariq Mahmood', 'company': 'Boardroom', 'phone': '', 'stage': 'contacted', 'line': 'furniture',
     'service': 'Boardroom table', 'source': 'Google search', 'assigned_to': None, 'next_at': '2026-10-14 15:00:00', 'next_type': 'Quote follow-up', 'created_at': '2026-10-05 15:05:00'},
    {'id': 4, 'name': 'Ayesha Khan', 'company': '', 'phone': '+92 333 7778899', 'stage': 'new', 'line': 'interior',
     'service': 'Kitchen redesign', 'source': 'Instagram', 'assigned_to': None, 'next_at': '2026-10-15 12:30:00', 'next_type': 'Call', 'created_at': '2026-10-04 09:20:00'},
]
PROJECTS = []  # in-memory projects for preview only (sample projects created here are not saved anywhere)
try:
    import preview_fixtures as _F
    PROJECTS.extend([dict(x) for x in _F.PROJECTS])  # seeded sample projects (U4-style fixtures)
except Exception as _e:  # pragma: no cover - fixtures are optional
    print('preview fixtures not loaded:', _e)
PROJ_NEXT = [0]
PROJ_STAGES = ['planning', 'design', 'procurement', 'execution', 'finishing', 'handover', 'completed']
PROJ_LINES = {'project': 'Project', 'interior': 'Interior (WI)', 'furniture': 'Furniture (WF)'}
PROJ_TYPES = ['Interior', 'Fit-out', 'Renovation', 'Furniture']
def _proj_row(p):
    ms = p.get('milestones') or []
    inv = float(p.get('invoiced') or p.get('value') or 0)
    rec = float(p.get('paid') or 0)
    return dict(p, progress=float(p.get('progress') or 0), late=False, invoiced=inv, received=rec,
                balance=max(0.0, inv - rec), team_names=[], manager_name='', milestones=ms,
                invoices=p.get('invoices') or [], handover=p.get('target') or '')
def _proj_table():
    rows = [_proj_row(p) for p in PROJECTS]
    active = [p for p in rows if p['stage'] != 'completed']
    inv = sum(float(p.get('invoiced') or 0) for p in active)
    rec = sum(float(p.get('paid') or 0) for p in active)
    return {'ok': True, 'projects': rows, 'lines': PROJ_LINES, 'types': PROJ_TYPES, 'stages': PROJ_STAGES, 'team': [],
            'kpi': {'active': len(active), 'late': 0, 'completed': len(rows) - len(active), 'value': sum(p['value'] for p in active),
                    'invoiced': inv, 'received': rec, 'balance': max(0.0, inv - rec)}}
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def _blocked(self, p):
        parts = [x for x in urllib.parse.unquote(p).split('/') if x]
        if any(x.startswith('.') for x in parts): return True
        # Static data assets the front-end and the builder fetch at runtime (icon list, client logos,
        # announcement). Private/data JSON stays blocked below.
        STATIC_JSON = ('/builder/vendor/', '/assets/data/', '/assets/announce.json')
        if p.endswith('.json') and any(p.startswith(x) for x in STATIC_JSON): return False
        if any(x in BLOCK_DIRS for x in parts): return True
        name = parts[-1] if parts else ''
        if name in BLOCK_NAMES: return True
        return os.path.splitext(name)[1].lower() in BLOCK_EXT
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body))); self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)
    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if path not in API_PATHS:
            return self._json(404, {'ok': False, 'error': 'Not found in preview'})
        n = int(self.headers.get('Content-Length') or 0)
        try: data = json.loads(self.rfile.read(n) or b'{}')
        except Exception: data = {}
        action = data.get('action', '')
        me = BY_TOKEN.get(self.headers.get('X-WX-ADM') or '')  # who this token belongs to
        if me is None and (self.headers.get('X-WX-ADM') or ''):
            # QA safety net: a server restart or an accounts-file edit must never sign the person
            # out mid-session (every screen then shows "Not signed in" or sits on "Loading…").
            # A present-but-unknown token falls back to the owner identity, and says so in the log.
            print('preview: unknown token %s... -> owner fallback' % (self.headers.get('X-WX-ADM') or '')[:14])
            me = OWNER
        if action == 'status':
            st = {'ok': True, 'needsSetup': False, 'dbError': False, 'driver': 'preview (no database)', 'builderLocked': False}
            if me: st['user'] = pub(me)
            if path.endswith('/builder.php'):
                # The builder boots on this: loggedIn=true skips its own password screen.
                # A valid X-WX-CSRF builder token (or an admin session that can edit) counts.
                csrf = self.headers.get('X-WX-CSRF') or ''
                st['adminOnly'] = True
                st['loggedIn'] = bool(me and csrf and builder_token(me)) or bool(me and builder_token(me))
                if me: st['user'] = pub(me)
            return self._json(200, st)
        if action == 'login':
            if not ACCOUNTS:
                return self._json(200, {'ok': False, 'error': 'Preview sign-in is not set up. Start the preview with PREVIEW_ACCOUNTS (or PREVIEW_EMAIL / PREVIEW_PASS) set.'})
            em = data.get('email', '').strip().lower()
            acc = BY_EMAIL.get(em)
            if acc and data.get('password') == acc['password']:
                return self._json(200, {'ok': True, 'token': acc['token'], 'user': pub(acc), 'caps': caps_of(acc),
                                        'builderToken': builder_token(acc)})
            if acc:
                return self._json(200, {'ok': False, 'error': 'Wrong password. Check the preview password you set on the server.'})
            return self._json(200, {'ok': False, 'error': 'Preview sign-in only accepts the accounts set on the server. The live database is not connected in this preview.'})
        if action == 'me':
            if me:
                return self._json(200, {'ok': True, 'user': pub(me), 'caps': caps_of(me), 'builderToken': builder_token(me)})
            return self._json(200, {'ok': False, 'error': 'Not signed in'})
        if me is None and action not in ('password',):
            return self._json(200, {'ok': False, 'error': 'Not signed in'})
        if action == 'chat_list':
            box = data.get('box') or 'all'
            rows = [dict(c) for c in CHATS if c['status'] == 'open' and (box == 'all' or (box == 'mine' and c['assigned'] == me['id']) or (box == 'unassigned' and c['assigned'] is None))]
            return self._json(200, {'ok': True, 'chats': rows, 'team': [], 'me': me['id'],
                                    'counts': {'mine': sum(1 for c in CHATS if c['assigned'] == me['id']), 'unassigned': sum(1 for c in CHATS if c['assigned'] is None), 'all': len(CHATS)},
                                    'cfg': {'ai': True, 'on': True, 'saved': True, 'tg': False}})
        if action in ('chat_get', 'chat_reply', 'chat_mode', 'chat_suggest'):
            cid = int(data.get('id') or 0)
            c = next((x for x in CHATS if x['id'] == cid), None)
            if not c: return self._json(200, {'ok': False, 'error': 'Chat not found'})
            if action == 'chat_get':
                since = int(data.get('since') or 0)
                c['unread'] = 0; c['needs'] = False
                return self._json(200, {'ok': True, 'chat': dict(c), 'messages': [m for m in MSGS.get(cid, []) if m['id'] > since], 'typing': False})
            if action == 'chat_suggest':
                return self._json(200, {'ok': True, 'text': 'Thank you for your message. Could you share a convenient time for a site visit?'})
            if action == 'chat_mode':
                c['mode'] = 'human' if data.get('mode') == 'human' else 'ai'
                c['agent'] = me['name'] if c['mode'] == 'human' else ''
                return self._json(200, {'ok': True})
            text = str(data.get('text') or '').strip()
            if not text: return self._json(200, {'ok': False, 'error': 'Write a message'})
            NEXT_MSG[0] += 1
            MSGS.setdefault(cid, []).append({'id': NEXT_MSG[0], 't': '2026-10-11 12:00:00', 'who': 'agent', 'name': me['name'], 'text': text, 'att': None})
            c.update({'mode': 'human', 'agent': me['name'], 'last': text, 'assigned': me['id']})
            return self._json(200, {'ok': True})
        if action == 'aic_get':
            return self._json(200, {'ok': True, 'base': {'ai': True, 'on': True, 'noPrices': True, 'tone': 'designer', 'tones': ['designer', 'friendly', 'formal'], 'greeting': 'Assalam-o-Alaikum! How can we help you plan your space?', 'waAgent': '', 'waGreeting': ''},
                                    'aic': {'style': 'balanced', 'creativity': 35, 'length': 'medium', 'persona': 'Calm interior designer', 'signoff': '', 'instructions': '', 'urdu': True, 'on': True, 'chan': {'web': True, 'wa': True, 'tg': False}},
                                    'health': [{'k': 'ai', 'label': 'AI key', 'st': 'warn', 'detail': 'Not set in preview'}], 'channels': []})
        if action == 'aic_health':
            return self._json(200, {'ok': True, 'health': [{'k': 'ai', 'label': 'AI key', 'st': 'warn', 'detail': 'Not set in preview'}]})
        if action == 'ai_report':
            return self._json(200, {'ok': True, 'days': int(data.get('days') or 30), 'chats': 3, 'aiOnly': 2, 'handoffs': 1, 'leads': 1, 'visits': 0,
                                    'channels': {'web': 1, 'wa': 1, 'tg': 1}, 'firstReply': 40, 'firstTeam': 300, 'unanswered': 0,
                                    'reasons': [{'k': 'human', 'label': 'Asked for a person', 'n': 1}]})
        if action == 'wah_overview':
            return self._json(200, {'ok': True, 'connected': False, 'lastTick': 0, 'flowsOn': False, 'days': 7, 'waiting': 0,
                                    'wa': {'waiting': 0}, 'hub': {'remindHours': 0, 'remindChats': False, 'remindLeads': False, 'waba': ''},
                                    'camp': {'name': '', 'sent': 0, 'delivered': 0, 'read': 0, 'replied': 0, 'status': 'none'}, 'camps': [], 'rules': [], 'tpls': [], 'optout': 0, 'today': 0, 'week': 0, 'sent': 0, 'autoSent': 0,
                                    'running': 0, 'approved': 0, 'alert': '', 'cap': 0})
        if action == 'wah_insights':
            return self._json(200, {'ok': True, 'days': 7, 'sent': 0, 'optout': 0, 'winRate': 0,
                                    'reply': {'ai': 0, 'aiN': 0, 'team': 0, 'teamN': 0}, 'funnel': [], 'stages': [], 'sources': [],
                                    'camps': [], 'flows': [], 'series': []})
        if action == 'wag_get':
            return self._json(200, {'ok': True, 'dailyCap': 200, 'perTick': 20, 'quietFrom': 21, 'quietTo': 8, 'camps': [], 'tpls': [],
                                    'segs': [], 'flows': [], 'optout': [], 'runs': [], 'running': 0, 'enabled': False})
        if action == 'dash_data':
            # U4: a seeded dashboard so the KPI row, chips, funnel, target ring and the statistics
            # chart can be seen and contrast-checked. Shapes follow api/*.php; values are invented.
            days = int(data.get('days') or 28)
            axis, leads, sent, won, invoiced, paid, visitors = [], [], [], [], [], [], []
            for i in range(days, 0, -1):
                d = time.strftime('%Y-%m-%d', time.localtime(time.time() - i * 86400))
                axis.append(d)
                ph = (i % 7) / 7.0
                leads.append(int(2 + 3 * ph + (i % 3)))
                sent.append(int(1 + 2 * ph))
                won.append(int(1 * ph) + (1 if i % 5 == 0 else 0))
                invoiced.append(int(150000 + 90000 * ph))
                paid.append(int(100000 + 70000 * ph))
                visitors.append(int(40 + 60 * ph))
            return self._json(200, {'ok': True, 'days': days, 'role': me['role'], 'axis': axis, 'visitors': visitors,
                'crm': {
                    'kpi': {'leads': [sum(leads), sum(leads) * 4 // 5], 'pipeline': 7420000, 'openQuotes': [6, 3480000],
                            'quotesSent': [sum(sent), sum(sent) * 3 // 4], 'won': sum(won), 'paid': [sum(paid), sum(paid) * 9 // 10], 'unpaid': 1260000},
                    'chips': {'new': 4, 'follow': 3, 'overdue': 2},
                    'series': {'leads': leads, 'sent': sent, 'won': won, 'invoiced': invoiced, 'paid': paid},
                    'funnel': {'new': 12, 'contacted': 9, 'visit': 6, 'quoted': 5, 'won': sum(won), 'lost': 2},
                    'target': {'target': 2500000, 'month': sum(paid[-28:]), 'monthLabel': time.strftime('%B %Y')},
                    'followups': [{'id': 1, 'name': 'Kamran Ashraf', 'service': 'Turnkey residence', 'stage': 'contacted', 'followup': '2026-10-12', 'late': False},
                                  {'id': 2, 'name': 'Dr. Sarah Mansoor', 'service': 'Clinic fit-out', 'stage': 'visit', 'followup': '2026-10-11', 'late': True},
                                  {'id': 3, 'name': 'Tariq Mahmood', 'service': 'Boardroom table', 'stage': 'quoted', 'followup': '2026-10-13', 'late': False}],
                    'overdueN': 2,
                    'overdue': [{'id': 11, 'no': 'INV-0114', 'client': 'Mrs. Ahmed', 'due': '2026-10-02', 'balance': 480000},
                                {'id': 12, 'no': 'INV-0119', 'client': 'Gulberg Plaza', 'due': '2026-10-08', 'balance': 265000}],
                    'recent': [{'id': 1, 'name': 'Kamran Ashraf', 'service': 'Turnkey residence', 'stage': 'new', 'created_at': '2026-10-11 10:12:00', 'read': False},
                               {'id': 2, 'name': 'Dr. Sarah Mansoor', 'service': 'Clinic fit-out', 'stage': 'visit', 'created_at': '2026-10-11 08:40:00', 'read': True},
                               {'id': 3, 'name': 'Tariq Mahmood', 'service': 'Boardroom table', 'stage': 'quoted', 'created_at': '2026-10-10 15:05:00', 'read': True},
                               {'id': 4, 'name': 'Ayesha Khan', 'service': 'Kitchen redesign', 'stage': 'contacted', 'created_at': '2026-10-10 09:20:00', 'read': True}],
                    'sources': [{'name': 'Website form', 'n': 24}, {'name': 'WhatsApp', 'n': 15}, {'name': 'Google search', 'n': 9}, {'name': 'Instagram', 'n': 4}],
                    'tasks': []},
                'website': {'pages': 412, 'edits': sum(leads)}, 'recent': []})
        if action == 'projs_list':
            return self._json(200, {'ok': True, 'projects': [dict(PREVIEW_PROJECT), dict(PREVIEW_UNDATED)]})
        if action == 'arc_feed_list':
            pid = int(data.get('project_id') or 0)
            since = int(data.get('since') or 0)
            if pid != PREVIEW_PROJECT['id']: return self._json(200, {'ok': False, 'error': 'Project not found'})
            items = [m for m in FEED if m['id'] > since] if since else FEED[-100:]
            return self._json(200, {'ok': True, 'items': items, 'me': me['id']})
        if action == 'arc_feed_post':
            pid = int(data.get('project_id') or 0)
            text = str(data.get('text') or '').strip()
            if pid != PREVIEW_PROJECT['id']: return self._json(200, {'ok': False, 'error': 'Project not found'})
            if not text or len(text) > 2000: return self._json(200, {'ok': False, 'error': 'Message must be 1 to 2000 characters'})
            m = {'id': len(FEED) + 1, 'author_id': me['id'], 'author': me['name'], 'role': me['role'], 'text': text, 'at': int(time.time())}
            FEED.append(m)
            return self._json(200, {'ok': True, 'item': m})
        if action == 'invs_tracker':
            return self._json(200, build_fixture('invs_tracker', data) or {'ok': True, 'year': 2026, 'years': [2026], 'months': {}, 'rows': [], 'lateAll': 0})
        if action == 'tpl_list':
            return self._json(200, {'ok': True, 'templates': list(TEMPLATES)})
        if action == 'tpl_starters':
            return self._json(200, {'ok': True, 'templates': [dict(t) for t in TPL_STARTERS]})
        if action == 'tpl_import':
            names = {t['name'] for t in TEMPLATES}; n = 0
            for x in (data.get('templates') or [])[:50]:
                if not isinstance(x, dict) or not str(x.get('name') or '').strip(): continue
                name = str(x['name'])[:80]
                if name in names: continue
                TPL_NEXT[0] += 1
                t = {'id': TPL_NEXT[0], 'name': name, 'kind': x.get('kind') if x.get('kind') in TPL_KINDS else 'other',
                     'description': str(x.get('description') or '')[:400], 'sections': x.get('sections') or [], 'terms': str(x.get('terms') or '')[:3000]}
                t['total'] = _tpl_total(t); TEMPLATES.append(t); names.add(name); n += 1
            return self._json(200, {'ok': True, 'imported': n})
        if action == 'tpl_delete':
            tid = int(data.get('id') or 0)
            TEMPLATES[:] = [t for t in TEMPLATES if t['id'] != tid]
            return self._json(200, {'ok': True})
        if action == 's17_meta':
            return self._json(200, {'ok': True, 'lines': PROJ_LINES, 'leadTypes': {}, 'quoteStatus': {}, 'nextTypes': {}, 'clientTypes': {}, 'projectTypes': PROJ_TYPES})
        if action == 'projs_table':
            return self._json(200, _proj_table())
        if action == 'proj_save':
            pid = int(data.get('id') or 0)
            if pid:
                p = next((x for x in PROJECTS if x['id'] == pid), None)
                if not p: return self._json(200, {'ok': False, 'error': 'Project not found'})
                for k in ('stage', 'value', 'start', 'target', 'manager', 'site', 'client_name', 'name'):
                    if k in data and data[k] not in (None, ''): p[k] = int(data[k]) if k == 'value' and str(data[k]).isdigit() else data[k]
                return self._json(200, {'ok': True, 'project': _proj_row(p)})
            name = str(data.get('name') or '').strip()[:160]
            if not name: return self._json(200, {'ok': False, 'error': 'Project name is required'})
            PROJ_NEXT[0] += 1
            p = {'id': PROJ_NEXT[0], 'no': 'PRJ-%03d' % PROJ_NEXT[0], 'name': name, 'client_name': str(data.get('client_name') or ''), 'site': str(data.get('site') or ''),
                 'line': 'project', 'ptype': '', 'area': 0, 'stage': 'planning', 'start': '2026-10-11', 'target': str(data.get('target') or ''),
                 'value': int(float(data.get('value') or 0)), 'manager': None, 'milestones': []}
            PROJECTS.append(p)
            return self._json(200, {'ok': True, 'project': _proj_row(p)})
        if action == 'proj_meta':
            p = next((x for x in PROJECTS if x['id'] == int(data.get('id') or 0)), None)
            if not p: return self._json(200, {'ok': False, 'error': 'Project not found'})
            p['line'] = str(data.get('line') or p['line']); p['ptype'] = str(data.get('ptype') or '')
            return self._json(200, {'ok': True})
        if action == 'proj_milestones':
            p = next((x for x in PROJECTS if x['id'] == int(data.get('id') or 0)), None)
            if not p: return self._json(200, {'ok': False, 'error': 'Project not found'})
            plan = data.get('plan') or []
            if sum(float(m.get('pct') or 0) for m in plan) != 100: return self._json(200, {'ok': False, 'error': 'Milestones must add up to 100%'})
            p['milestones'] = [{'label': str(m.get('label') or '')[:80], 'pct': float(m.get('pct') or 0), 'inv_id': None, 'inv_no': '', 'status': 'unbilled'} for m in plan]
            return self._json(200, {'ok': True})
        if action == 'leads_followups':
            today = time.strftime('%Y-%m-%d')
            g = {'overdue': [], 'today': [], 'upcoming': []}
            for l in PREVIEW_LEADS:
                d = str(l.get('next_at') or '')[:10]
                if not d: continue
                g['overdue' if d < today else ('today' if d == today else 'upcoming')].append(dict(l))
            return self._json(200, dict({'ok': True}, **g))
        if action == 'leads_list':
            team = [{'id': a['id'], 'name': a['name']} for a in ACCOUNTS]
            return self._json(200, {'ok': True, 'leads': [dict(l) for l in PREVIEW_LEADS], 'total': len(PREVIEW_LEADS),
                                    'team': team, 'sources': {'Website form': 24, 'WhatsApp': 15, 'Google search': 9, 'Instagram': 4},
                                    'teamSources': ['Website form', 'WhatsApp', 'Google search', 'Instagram', 'import']})
        if action == 'leads_count':
            return self._json(200, {'ok': True, 'total': len(PREVIEW_LEADS),
                                    'new': sum(1 for l in PREVIEW_LEADS if l['stage'] == 'new')})
        if action == 'redirects':
            return self._json(200, redirects_payload(ROOT))
        if action == 'redirects_plan':
            rules, cfg = _rd_list(ROOT)
            m = _rd_merge(rules, _rd_plan(ROOT))
            _rd_write('redirects.json', m['list'])
            return self._json(200, {'ok': True, 'redirects': m['list'], 'added': m['added'],
                                    'test': _rd_test(ROOT, m['list'])})
        if action == 'redirects_save':
            rules = [_rd_one(r) for r in (data.get('redirects') or [])]
            _rd_write('redirects.json', rules)
            cfg = _rd_read('redirects-cfg.json', {})
            if isinstance(data.get('cfg'), dict):
                cfg['www'] = bool(data['cfg'].get('www', cfg.get('www', True)))
                cfg['spam'] = bool(data['cfg'].get('spam', cfg.get('spam', True)))
            have = {str(r['from']).lower() for r in rules}
            cfg['skip'] = sorted({_rd_one(r)['from'].lower() for r in _rd_plan(ROOT)} - have)
            cfg['seeded'] = True
            cfg['planHash'] = _rd_hash(ROOT)
            _rd_write('redirects-cfg.json', cfg)
            return self._json(200, dict(redirects_payload(ROOT), saved=True))
        if action == 'r404_list':
            rows = [{'path': k, **v} for k, v in (_rd_read('404.json', {}) or {}).items()]
            return self._json(200, {'ok': True, 'rows': rows})
        if action in ('users', 'user_save'):
            # The real API lists wx_users (api/admin.php "users" / "user_save"). Here the
            # equivalent store is the preview account list plus anything added from the
            # screen, kept in preview state so an edit survives a restart.
            if me['role'] not in ('owner', 'admin'):
                return self._json(200, {'ok': False, 'error': 'Your role cannot manage users'})
            extra = _rd_read('users.json', {}) or {}
            def _pub(a):
                row = dict(a)
                row.pop('password', None); row.pop('token', None)
                row['role'] = role_canon(row.get('role'))
                row['roleLabel'] = ROLE_LABELS.get(row['role'], row['role'])
                row['active'] = bool(row.get('active', True))
                row['created_at'] = row.get('created_at') or time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 86400 * 30))
                row['last_login'] = row.get('last_login')
                return row
            if action == 'users':
                rows = [_pub(a) for a in ACCOUNTS]
                for k, v in extra.items():
                    row = dict(v); row['id'] = int(k)
                    rows = [r for r in rows if r['id'] != row['id']] + [row]
                return self._json(200, {'ok': True, 'users': sorted(rows, key=lambda r: r['id'])})
            # user_save
            name = str(data.get('name') or '').strip()
            email = str(data.get('email') or '').strip().lower()
            role = role_canon(data.get('role'))
            uid = int(data.get('id') or 0)
            if not name or '@' not in email:
                return self._json(200, {'ok': False, 'error': 'Name and email are required'})
            if role not in ROLE_GROUPS:
                return self._json(200, {'ok': False, 'error': 'Unknown role'})
            pw = str(data.get('password') or '')
            if not uid and len(pw) < 8:
                return self._json(200, {'ok': False, 'error': 'Password must be at least 8 characters'})
            if uid and pw and len(pw) < 8:
                return self._json(200, {'ok': False, 'error': 'Password must be at least 8 characters'})
            taken = [a['email'] for a in ACCOUNTS if a['id'] != uid] + [v['email'] for k, v in extra.items() if int(k) != uid]
            if email in taken:
                return self._json(200, {'ok': False, 'error': 'Another member already uses that email'})
            nid = uid or (max([a['id'] for a in ACCOUNTS] + [int(k) for k in extra] + [0]) + 1)
            base = next((a for a in ACCOUNTS if a['id'] == nid), None) or {}
            row = {'id': nid, 'name': name, 'email': email, 'role': role, 'roleLabel': ROLE_LABELS.get(role, role),
                   'active': bool(data.get('active', True)), 'perms': base.get('perms', []),
                   'created_at': base.get('created_at') or time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime()),
                   'last_login': base.get('last_login')}
            extra[str(nid)] = row
            _rd_write('users.json', extra)
            return self._json(200, {'ok': True, 'user': row})
        if action in ('health_get', 'health_scan'):
            # Site health runs a local file scan on the host too (api/media-lib.php
            # a7_health_scan), so the preview runs the real thing instead of a fixture:
            # health_get reports the stored scan, health_scan performs it.
            store = _rd_read('health.json', {}) or {}
            if action == 'health_scan':
                store['scan'] = real_health_scan(ROOT)
                _rd_write('health.json', store)
            return self._json(200, {'ok': True, 'scan': store.get('scan'), 'psi': store.get('psi', {}),
                                    'psiKeySet': bool(store.get('psiKey')), 'site': store.get('site', 'https://woodex.com.pk')})
        if action in ('health_speed', 'health_psi'):
            store = _rd_read('health.json', {}) or {}
            psi = store.get('psi') or {}
            if action == 'health_speed':
                return self._json(200, {'ok': True, 'psi': psi, 'psiKeySet': bool(store.get('psiKey')),
                                        'site': store.get('site', 'https://woodex.com.pk')})
            rel = str(data.get('rel') or 'index.html')
            if not re.match(r'^[a-z0-9][a-z0-9/_\-.]*\.html$', rel, re.I) or '..' in rel:
                return self._json(200, {'ok': False, 'error': 'Invalid page'})
            strat = 'desktop' if data.get('strategy') == 'desktop' else 'mobile'
            # The host calls Google's PageSpeed API here. This sandbox has no route to it, so the
            # preview synthesises one plausible run with the very same fields the API result maps
            # to — the screen stays honest about being a preview.
            import preview_fixtures as _F
            row = dict(_F.PSI_ROW)
            row['strategy'] = strat
            row['perf'] = 96 if strat == 'desktop' else row['perf']
            row['at'] = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())
            key = rel + '|' + strat
            psi[key] = ([row] + list(psi.get(key) or []))[:10]
            store['psi'] = psi
            _rd_write('health.json', store)
            return self._json(200, {'ok': True, 'result': row})
        if action == 'media_list':
            # The library must show the website's own images, not samples.
            return self._json(200, real_media_list(ROOT))
        is_builder = path.endswith('/builder.php')
        fx = build_builder(action, data) if is_builder else build_fixture(action, data)
        if fx is not None:
            return self._json(200, fx)
        return self._json(200, empty())
    def end_headers(self):
        # SimpleHTTP sends Last-Modified only, so browsers may serve a stale admin bundle from their
        # own cache (that is exactly how an updated admin keeps "looking old"). Force revalidation.
        path = urllib.parse.urlsplit(self.path).path.lower()
        if path.endswith(('.html', '.css', '.js', '.json', '.php')) or path.endswith('/'):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        if self._blocked(urllib.parse.urlsplit(self.path).path):
            self.send_error(404); return
        super().do_GET()
    def do_HEAD(self):
        if self._blocked(urllib.parse.urlsplit(self.path).path):
            self.send_error(404); return
        super().do_HEAD()
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('0.0.0.0', PORT), H).serve_forever()
