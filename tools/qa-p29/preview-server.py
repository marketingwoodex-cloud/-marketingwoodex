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
        if action == 'chat_list':
            box = data.get('box') or 'all'
            rows = [dict(c) for c in CHATS if c['status'] == 'open' and (box == 'all' or (box == 'mine' and c['assigned'] == OWNER['id']) or (box == 'unassigned' and c['assigned'] is None))]
            return self._json(200, {'ok': True, 'chats': rows, 'team': [], 'me': OWNER['id'],
                                    'counts': {'mine': sum(1 for c in CHATS if c['assigned'] == OWNER['id']), 'unassigned': sum(1 for c in CHATS if c['assigned'] is None), 'all': len(CHATS)},
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
                c['agent'] = OWNER['name'] if c['mode'] == 'human' else ''
                return self._json(200, {'ok': True})
            text = str(data.get('text') or '').strip()
            if not text: return self._json(200, {'ok': False, 'error': 'Write a message'})
            NEXT_MSG[0] += 1
            MSGS.setdefault(cid, []).append({'id': NEXT_MSG[0], 't': '2026-10-11 12:00:00', 'who': 'agent', 'name': OWNER['name'], 'text': text, 'att': None})
            c.update({'mode': 'human', 'agent': OWNER['name'], 'last': text, 'assigned': OWNER['id']})
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
        if action == 'projs_list':
            return self._json(200, {'ok': True, 'projects': [dict(PREVIEW_PROJECT), dict(PREVIEW_UNDATED)]})
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
