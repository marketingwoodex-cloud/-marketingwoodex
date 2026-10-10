# Filtered static preview for the pro site, with a PREVIEW-ONLY API stub.
# - Serves public front-end files only (blocks PHP source, api/, private/db/template folders, SQL, env, dotfiles, docs).
# - POST /api/admin.php and /api/builder.php are answered by this stub (no PHP, no database, no real accounts).
#   Login accepts ONE preview test account from env PREVIEW_EMAIL / PREVIEW_PASS. Everything else is rejected.
import http.server, os, sys, json, urllib.parse, time
ROOT = sys.argv[1]
PORT = int(sys.argv[2])
PREVIEW_EMAIL = os.environ.get('PREVIEW_EMAIL', 'preview@woodex.test')
PREVIEW_PASS = os.environ.get('PREVIEW_PASS', '')
TOKEN = 'preview-token'
BLOCK_DIRS = {'api', '_private', '_database', '_templates', '_scripts', 'tools', 'node_modules', '.git'}
BLOCK_EXT = {'.php', '.sql', '.env', '.md', '.json', '.lock', '.yaml', '.yml', '.ini', '.bak', '.log', '.dist', '.sh', '.bat', '.tar', '.zip'}
BLOCK_NAMES = {'admin-tg.js'}  # contains a token literal (SEC-003); not for preview
OWNER = {'id': 1, 'name': 'Preview Owner', 'role': 'owner', 'email': PREVIEW_EMAIL}
PREVIEW_PROJECT = {'id': 1, 'name': 'Preview project (stub)', 'stage': 'design', 'photos': [], 'value': 0, 'paid': 0, 'target': '', 'no': 'P-1', 'client': ''}
FEED = []  # in-memory team feed for preview only
API_PATHS = {'/api/admin.php', '/api/builder.php'}

def empty(extra=None):
    d = {'ok': True, 'avatars': {}, 'rows': [], 'items': [], 'list': [], 'total': 0, 'per': 20, 'pages': [], 'cfg': {}, 'apps': [],
         'pending': 0, 'unread': 0, 'stats': {'pages': 0}, 'recent': [], 'kpi': {}, 'leads': [], 'chats': [], 'series': [],
         'funnel': [], 'pipeline': [], 'tasks': [], 'caps': {}, 'builderToken': None}
    if extra: d.update(extra)
    return d

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def _blocked(self, p):
        parts = [x for x in urllib.parse.unquote(p).split('/') if x]
        if any(x.startswith('.') for x in parts): return True
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
        if action == 'status':
            st = {'ok': True, 'needsSetup': False, 'dbError': False, 'driver': 'preview (no database)', 'builderLocked': False}
            if self.headers.get('X-WX-ADM') == TOKEN: st['user'] = OWNER
            return self._json(200, st)
        if action == 'login':
            if PREVIEW_PASS and data.get('email') == PREVIEW_EMAIL and data.get('password') == PREVIEW_PASS:
                return self._json(200, {'ok': True, 'token': TOKEN, 'user': OWNER, 'builderToken': None})
            return self._json(200, {'ok': False, 'error': 'Preview sign-in only accepts the preview test account. The live database is not connected in this preview.'})
        if action == 'me':
            if self.headers.get('X-WX-ADM') == TOKEN:
                return self._json(200, {'ok': True, 'user': OWNER, 'caps': {}, 'builderToken': None})
            return self._json(200, {'ok': False, 'error': 'Not signed in'})
        if self.headers.get('X-WX-ADM') != TOKEN and action not in ('password',):
            return self._json(200, {'ok': False, 'error': 'Not signed in'})
        if action == 'projs_list':
            return self._json(200, {'ok': True, 'projects': [dict(PREVIEW_PROJECT)]})
        if action == 'arc_feed_list':
            pid = int(data.get('project_id') or 0)
            since = int(data.get('since') or 0)
            if pid != PREVIEW_PROJECT['id']: return self._json(200, {'ok': False, 'error': 'Project not found'})
            items = [m for m in FEED if m['id'] > since] if since else FEED[-100:]
            return self._json(200, {'ok': True, 'items': items, 'me': OWNER['id']})
        if action == 'arc_feed_post':
            pid = int(data.get('project_id') or 0)
            text = str(data.get('text') or '').strip()
            if pid != PREVIEW_PROJECT['id']: return self._json(200, {'ok': False, 'error': 'Project not found'})
            if not text or len(text) > 2000: return self._json(200, {'ok': False, 'error': 'Message must be 1 to 2000 characters'})
            m = {'id': len(FEED) + 1, 'author_id': OWNER['id'], 'author': OWNER['name'], 'role': OWNER['role'], 'text': text, 'at': int(time.time())}
            FEED.append(m)
            return self._json(200, {'ok': True, 'item': m})
        return self._json(200, empty())
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
