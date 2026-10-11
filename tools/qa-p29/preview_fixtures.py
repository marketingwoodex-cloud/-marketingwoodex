"""Preview-only API fixtures for tools/qa-p29/preview-server.py.

WHY: the admin app has ~270 API actions. Without a preview answer, every screen that
calls one hangs on its "Loading…" placeholder, so the preview cannot be used to QA the
ui. These fixtures return the SAME SHAPE as the real API (checked against api/*.php and
against how each screen reads the response) filled with sample data.

RULES
  - Sample data only. Nothing here is a real customer, real message or real credential.
  - Never import anything from the app; this file is data + tiny builders.
  - Shapes must match the PHP `out([...])` of the same action name. When a screen reads
    a field that is missing here it throws in the console — that is a preview bug, not
    an app bug; fix it here.

Add a fixture whenever a screen shows "Loading…" forever in the preview.
"""
import time

DAY = 86400


def ymd(off=0):
    return time.strftime('%Y-%m-%d', time.localtime(time.time() + off * DAY))


def ts(off=0, hm='10:00'):
    return ymd(off) + ' ' + hm


def epoch(off=0, hm='10:00'):
    """Same instant as ts(off, hm) but as a unix timestamp: pages_list sends mtime as a number."""
    return int(time.mktime(time.strptime(ts(off, hm), '%Y-%m-%d %H:%M')))


LEADS = [
    {'id': 1, 'name': 'Kamran Ashraf', 'company': 'Marla residence', 'client_id': 1, 'client': 'Kamran Ashraf',
     'phone': '+92 300 4455667', 'email': 'kamran@example.com', 'stage': 'new', 'lead_type': 'residential',
     'line': 'turnkey', 'service': 'Turnkey residence', 'source': 'Website form', 'city': 'Lahore',
     'value': 4200000, 'assigned_to': 1, 'assigned_name': 'Preview Owner', 'quote_status': '', 'client_type': '',
     'next_at': ts(-2, '11:00'), 'next_type': 'Call', 'created_at': ts(-4, '10:12'), 'last_contact': ts(-2, '11:00')},
    {'id': 2, 'name': 'Dr. Sarah Mansoor', 'company': 'Dental clinic', 'client_id': 2, 'client': 'Dr. Sarah Mansoor',
     'phone': '+92 321 5551234', 'email': 'sarah@example.com', 'stage': 'visit', 'lead_type': 'commercial',
     'line': 'fitout', 'service': 'Clinic fit-out', 'source': 'WhatsApp', 'city': 'Lahore',
     'value': 6800000, 'assigned_to': 1, 'assigned_name': 'Preview Owner', 'quote_status': 'sent', 'client_type': 'commercial',
     'next_at': ts(0, '09:00'), 'next_type': 'Site visit', 'created_at': ts(-6, '08:40'), 'last_contact': ts(0, '09:00')},
    {'id': 3, 'name': 'Tariq Mahmood', 'company': 'Gulberg Plaza', 'client_id': 3, 'client': 'Gulberg Plaza',
     'phone': '+92 322 1112233', 'email': 'tariq@example.com', 'stage': 'contacted', 'lead_type': 'commercial',
     'line': 'furniture', 'service': 'Boardroom table', 'source': 'Google search', 'city': 'Lahore',
     'value': 1450000, 'assigned_to': None, 'assigned_name': '', 'quote_status': 'draft', 'client_type': 'corporate',
     'next_at': ts(2, '15:00'), 'next_type': 'Quote follow-up', 'created_at': ts(-7, '15:05'), 'last_contact': ts(-3, '12:00')},
    {'id': 4, 'name': 'Ayesha Khan', 'company': '', 'client_id': 4, 'client': 'Ayesha Khan',
     'phone': '+92 333 7778899', 'email': 'ayesha@example.com', 'stage': 'new', 'lead_type': 'residential',
     'line': 'interior', 'service': 'Kitchen redesign', 'source': 'Instagram', 'city': 'Islamabad',
     'value': 950000, 'assigned_to': None, 'assigned_name': '', 'quote_status': '', 'client_type': 'prospect',
     'next_at': ts(3, '12:30'), 'next_type': 'Call', 'created_at': ts(-8, '09:20'), 'last_contact': ''},
]

CLIENTS = [
    {'id': 1, 'name': 'Kamran Ashraf', 'company': 'Marla residence', 'client_type': 'residential', 'status': 'prospect',
     'phone': '+92 300 4455667', 'email': 'kamran@example.com', 'city': 'Lahore', 'source': 'Website form',
     'quotes': 2, 'lifetime': 4200000, 'balance': 480000, 'projects': 1, 'last_activity': ts(-2, '11:00'), 'created_at': ts(-40)},
    {'id': 2, 'name': 'Dr. Sarah Mansoor', 'company': 'Dental clinic', 'client_type': 'commercial', 'status': 'active',
     'phone': '+92 321 5551234', 'email': 'sarah@example.com', 'city': 'Lahore', 'source': 'WhatsApp',
     'quotes': 3, 'lifetime': 6800000, 'balance': 1260000, 'projects': 1, 'last_activity': ts(0, '09:58'), 'created_at': ts(-60)},
    {'id': 3, 'name': 'Gulberg Plaza', 'company': 'Gulberg Plaza', 'client_type': 'corporate', 'status': 'returning',
     'phone': '+92 322 1112233', 'email': 'tariq@example.com', 'city': 'Lahore', 'source': 'Google search',
     'quotes': 4, 'lifetime': 12400000, 'balance': 265000, 'projects': 2, 'last_activity': ts(-1, '16:20'), 'created_at': ts(-200)},
    {'id': 4, 'name': 'Ayesha Khan', 'company': '', 'client_type': 'residential', 'status': 'prospect',
     'phone': '+92 333 7778899', 'email': 'ayesha@example.com', 'city': 'Islamabad', 'source': 'Instagram',
     'quotes': 0, 'lifetime': 0, 'balance': 0, 'projects': 0, 'last_activity': ts(-8, '09:20'), 'created_at': ts(-8)},
    {'id': 5, 'name': 'Mrs. Ahmed', 'company': '', 'client_type': 'residential', 'status': 'past',
     'phone': '+92 345 9090909', 'email': '', 'city': 'Lahore', 'source': 'Referral',
     'quotes': 1, 'lifetime': 1150000, 'balance': 0, 'projects': 1, 'last_activity': ts(-90), 'created_at': ts(-400)},
]

QUOTES = [
    {'id': 1, 'no': 'Q-2026-0114', 'client_id': 1, 'client': 'Kamran Ashraf', 'title': 'Turnkey residence — 10 Marla',
     'total': 4200000, 'status': 'sent', 'date': ymd(-6), 'valid_until': ymd(24), 'version': 2, 'option': 'A',
     'sectionCount': 3, 'currency': 'PKR', 'created_at': ts(-6)},
    {'id': 2, 'no': 'Q-2026-0119', 'client_id': 2, 'client': 'Dr. Sarah Mansoor', 'title': 'Clinic fit-out',
     'total': 6800000, 'status': 'approved', 'date': ymd(-12), 'valid_until': ymd(18), 'version': 1, 'option': 'A',
     'sectionCount': 4, 'currency': 'PKR', 'created_at': ts(-12)},
    {'id': 3, 'no': 'Q-2026-0121', 'client_id': 3, 'client': 'Gulberg Plaza', 'title': 'Boardroom table + acoustic panels',
     'total': 1450000, 'status': 'draft', 'date': ymd(-3), 'valid_until': ymd(27), 'version': 1, 'option': 'A',
     'sectionCount': 2, 'currency': 'PKR', 'created_at': ts(-3)},
]

INVOICES = [
    {'id': 11, 'no': 'INV-0114', 'client_id': 1, 'client': 'Kamran Ashraf', 'total': 1260000, 'paid': 780000,
     'balance': 480000, 'status': 'partial', 'date': ymd(-20), 'due': ymd(-10), 'project_id': 1,
     'payments': [{'id': 1, 'date': ymd(-18), 'amount': 400000, 'mode': 'Bank transfer', 'note': 'Deposit'},
                  {'id': 2, 'date': ymd(-8), 'amount': 380000, 'mode': 'Cash', 'note': ''}]},
    {'id': 12, 'no': 'INV-0119', 'client_id': 3, 'client': 'Gulberg Plaza', 'total': 265000, 'paid': 0,
     'balance': 265000, 'status': 'unpaid', 'date': ymd(-14), 'due': ymd(-4), 'project_id': 2, 'payments': []},
    {'id': 13, 'no': 'INV-0121', 'client_id': 2, 'client': 'Dr. Sarah Mansoor', 'total': 680000, 'paid': 680000,
     'balance': 0, 'status': 'paid', 'date': ymd(-30), 'due': ymd(-16), 'project_id': 3,
     'payments': [{'id': 3, 'date': ymd(-28), 'amount': 680000, 'mode': 'Bank transfer', 'note': 'Milestone 1'}]},
]

PROJECTS = [
    {'id': 1, 'no': 'P-1', 'name': 'Turnkey residence — 10 Marla', 'client_id': 1, 'client': 'Kamran Ashraf',
     'stage': 'execution', 'type': 'Interior', 'line': 'project', 'value': 4200000, 'paid': 780000,
     'start': ymd(-35), 'target': ymd(60), 'progress': 45,
     'milestones': [{'label': 'Deposit', 'pct': 30, 'inv_id': 11, 'inv_no': 'INV-0114', 'status': 'billed'},
                    {'label': 'Installation', 'pct': 70, 'inv_id': None, 'inv_no': '', 'status': 'unbilled'}]},
    {'id': 2, 'no': 'P-2', 'name': 'Boardroom table + acoustic panels', 'client_id': 3, 'client': 'Gulberg Plaza',
     'stage': 'procurement', 'type': 'Furniture', 'line': 'furniture', 'value': 1450000, 'paid': 0,
     'start': ymd(-10), 'target': ymd(45), 'progress': 20,
     'milestones': [{'label': 'Advance', 'pct': 50, 'inv_id': 12, 'inv_no': 'INV-0119', 'status': 'billed'},
                    {'label': 'Delivery', 'pct': 50, 'inv_id': None, 'inv_no': '', 'status': 'unbilled'}]},
    {'id': 3, 'no': 'P-3', 'name': 'Clinic fit-out', 'client_id': 2, 'client': 'Dr. Sarah Mansoor',
     'stage': 'handover', 'type': 'Fit-out', 'line': 'project', 'value': 6800000, 'paid': 680000,
     'start': ymd(-90), 'target': ymd(7), 'progress': 92,
     'milestones': [{'label': 'Milestone 1', 'pct': 100, 'inv_id': 13, 'inv_no': 'INV-0121', 'status': 'paid'}]},
]

BOOKINGS = [
    {'id': 1, 'name': 'Dr. Sarah Mansoor', 'type': 'visit', 'type_label': 'Site visit', 'status': 'confirmed',
     'd': ymd(0), 'tm': '09:00', 'phone': '+92 321 5551234', 'note': 'Measure the treatment rooms'},
    {'id': 2, 'name': 'Kamran Ashraf', 'type': 'meeting', 'type_label': 'Design meeting', 'status': 'waiting',
     'd': ymd(0), 'tm': '11:30', 'phone': '+92 300 4455667', 'note': 'Material selection'},
    {'id': 3, 'name': 'Gulberg Plaza', 'type': 'install', 'type_label': 'Installation', 'status': 'waiting',
     'd': ymd(1), 'tm': '10:00', 'phone': '+92 322 1112233', 'note': 'Boardroom delivery'},
    {'id': 4, 'name': 'Ayesha Khan', 'type': 'call', 'type_label': 'Call', 'status': 'done',
     'd': ymd(-1), 'tm': '15:00', 'phone': '+92 333 7778899', 'note': 'Kitchen brief'},
    {'id': 5, 'name': 'Mrs. Ahmed', 'type': 'meeting', 'type_label': 'Handover', 'status': 'cancelled',
     'd': ymd(2), 'tm': '13:00', 'phone': '+92 345 9090909', 'note': 'Rescheduled by the client'},
]

MEDIA_FILES = [
    {'name': 'living-room-lahore.webp', 'url': '/assets/img/living-room-lahore.webp', 'size': 284320, 'w': 1600, 'h': 1067,
     'ext': 'webp', 'folder': 'assets/img', 'alt': 'Living room with walnut panelling', 'used': ['/', '/portfolio'], 'date': ts(-20)},
    {'name': 'boardroom-table.webp', 'url': '/assets/img/boardroom-table.webp', 'size': 198440, 'w': 1400, 'h': 933,
     'ext': 'webp', 'folder': 'assets/img', 'alt': 'Solid wood boardroom table', 'used': ['/boardroom-tables'], 'date': ts(-34)},
    {'name': 'clinic-fitout-01.jpg', 'url': '/assets/img/clinic-fitout-01.jpg', 'size': 512900, 'w': 2000, 'h': 1333,
     'ext': 'jpg', 'folder': 'assets/img', 'alt': '', 'used': [], 'date': ts(-6)},
    {'name': 'kitchen-render.png', 'url': '/assets/img/kitchen-render.png', 'size': 903210, 'w': 2400, 'h': 1600,
     'ext': 'png', 'folder': 'assets/img', 'alt': 'Kitchen render', 'used': ['/kitchen-redesign'], 'date': ts(-12)},
    {'name': 'team-photo.jpg', 'url': '/assets/img/team-photo.jpg', 'size': 331220, 'w': 1800, 'h': 1200,
     'ext': 'jpg', 'folder': 'assets/img', 'alt': 'Studio team', 'used': ['/about'], 'date': ts(-60)},
]

FM_ITEMS = [
    {'path': 'assets/img/living-room-lahore.webp', 'size': 284320, 'modified': ts(-20), 'dir': False},
    {'path': 'assets/img/boardroom-table.webp', 'size': 198440, 'modified': ts(-34), 'dir': False},
    {'path': 'assets/img/kitchen-render.png', 'size': 903210, 'modified': ts(-12), 'dir': False},
    {'path': 'assets/fonts/inter-400.woff2', 'size': 48220, 'modified': ts(-120), 'dir': False},
]

DB_TABLES = [
    {'name': 'wx_leads', 'rows': 4}, {'name': 'wx_clients', 'rows': 5}, {'name': 'wx_quotes', 'rows': 3},
    {'name': 'wx_invoices', 'rows': 3}, {'name': 'wx_projects', 'rows': 3}, {'name': 'wx_users', 'rows': 6},
    {'name': 'wx_chats', 'rows': 3}, {'name': 'wx_pages', 'rows': 18},
]

PAGES = [
    {'path': 'index.html', 'url': '/', 'title': 'Home', 'kind': 'page', 'status': 'published', 'size': 48210,
     'updated': ts(-1), 'score': 92, 'blocks': 12, 'words': 1280, 'mtime': epoch(-1), 'editedBy': 'Manager',
     'issues': []},
    {'path': 'portfolio.html', 'url': '/portfolio', 'title': 'Portfolio', 'kind': 'page', 'status': 'published',
     'size': 31140, 'updated': ts(-3), 'score': 84, 'blocks': 8, 'words': 940, 'mtime': epoch(-3), 'editedBy': 'Developer',
     'issues': ['3 images missing alt text']},
    {'path': 'insights/walnut-vs-oak/index.html', 'url': '/blog/walnut-vs-oak', 'title': 'Walnut vs oak: choosing wood for interiors',
     'kind': 'blog', 'status': 'published', 'size': 22880, 'updated': ts(-5), 'score': 71, 'blocks': 6, 'words': 1520,
     'mtime': epoch(-5), 'editedBy': 'Manager', 'issues': ['Meta description is 168 chars (over 160)',
                                                       'One H2 is missing', 'No internal links']},
    {'path': 'insights/kitchen-layout-2026/index.html', 'url': '/blog/kitchen-layout-2026', 'title': 'Kitchen layouts that work in 2026',
     'kind': 'blog', 'status': 'draft', 'size': 19400, 'updated': ts(-2), 'score': 0, 'blocks': 4, 'words': 610,
     'mtime': epoch(-2), 'editedBy': 'Developer', 'issues': ['Still a draft']},
    {'path': 'turnkey-design.html', 'url': '/turnkey-design', 'title': 'Turnkey design & build', 'kind': 'service',
     'status': 'published', 'size': 27620, 'updated': ts(-9), 'score': 88, 'blocks': 7, 'words': 780, 'mtime': epoch(-9),
     'editedBy': 'Manager', 'issues': []},
    {'path': 'about.html', 'url': '/about', 'title': 'About the studio', 'kind': 'page', 'status': 'published',
     'size': 18240, 'updated': ts(-22), 'score': 86, 'blocks': 5, 'words': 520, 'mtime': epoch(-22), 'editedBy': 'Manager',
     'issues': ['Phone number not linked']},
]
CMS_PAGES = [
    {'id': 1, 'kind': 'page', 'slug': 'home', 'title': 'Home', 'url': '/', 'status': 'published', 'updated': ts(-1),
     'seo_title': 'Interior Design Lahore | Woodex', 'blocks': 12},
    {'id': 2, 'kind': 'page', 'slug': 'portfolio', 'title': 'Portfolio', 'url': '/portfolio', 'status': 'published',
     'updated': ts(-3), 'seo_title': 'Portfolio | Woodex', 'blocks': 8},
    {'id': 3, 'kind': 'blog', 'slug': 'walnut-vs-oak', 'title': 'Walnut vs oak: choosing wood for interiors',
     'url': '/blog/walnut-vs-oak', 'path': 'insights/walnut-vs-oak/index.html', 'status': 'published',
     'updated': ts(-5), 'mtime': epoch(-5), 'seo_title': 'Walnut vs oak | Woodex', 'blocks': 6},
    {'id': 4, 'kind': 'blog', 'slug': 'kitchen-layout-2026', 'title': 'Kitchen layouts that work in 2026',
     'url': '/blog/kitchen-layout-2026', 'path': 'insights/kitchen-layout-2026/index.html', 'status': 'draft',
     'updated': ts(-2), 'mtime': epoch(-2), 'seo_title': '', 'blocks': 4},
    {'id': 5, 'kind': 'service', 'slug': 'turnkey-design', 'title': 'Turnkey design & build', 'url': '/turnkey-design',
     'status': 'published', 'updated': ts(-9), 'seo_title': 'Turnkey design | Woodex', 'blocks': 7},
]

TEAM = [
    {'id': 1, 'name': 'Preview Owner', 'email': 'preview@example.com', 'role': 'owner', 'active': 1, 'last_login': ts(0, '08:00')},
    {'id': 2, 'name': 'Manager', 'email': 'manager@woodex.pk', 'role': 'admin', 'active': 1, 'last_login': ts(-1, '17:20')},
    {'id': 3, 'name': 'Developer', 'email': 'developer@woodex.pk', 'role': 'editor', 'active': 1, 'last_login': ts(-2, '12:05')},
    {'id': 4, 'name': 'Sales', 'email': 'sales@woodex.pk', 'role': 'sales', 'active': 1, 'last_login': ts(0, '09:10')},
    {'id': 5, 'name': 'Support', 'email': 'support@woodex.pk', 'role': 'support', 'active': 1, 'last_login': ts(-3, '16:40')},
]

TEMPLATES = [
    {'id': 1, 'name': 'Interior fit-out (per sq ft)', 'kind': 'fitout', 'total': 0, 'items': 6, 'updated': ts(-12),
     'sections': [{'title': 'Works', 'items': [{'desc': 'Civil & demolition', 'qty': 1, 'rate': 250000}]}]},
    {'id': 2, 'name': 'Furniture — boardroom table', 'kind': 'furniture', 'total': 1450000, 'items': 3, 'updated': ts(-30),
     'sections': [{'title': 'Furniture', 'items': [{'desc': 'Solid walnut table 12-seat', 'qty': 1, 'rate': 1250000}]}]},
]

APPROVALS = [
    {'id': 1, 'who': 'Manager', 'what': 'Updated the Home hero', 'status': 'pending', 'at': ts(-1, '14:10'),
     'note': '', 'kind': 'page'},
    {'id': 2, 'who': 'Developer', 'what': 'Changed the site theme accent', 'status': 'pending', 'at': ts(-2, '11:25'),
     'note': '', 'kind': 'theme'},
    {'id': 3, 'who': 'Sales', 'what': 'Sent Q-2026-0114 to Kamran Ashraf', 'status': 'approved', 'at': ts(-6, '12:00'),
     'note': 'Approved by Master', 'kind': 'quote'},
]

ACTIVITY = [
    {'id': 1, 'created_at': ts(0, '09:10'), 'user': 'Sales', 'action': 'login', 'target': 'admin panel', 'ip': '127.0.0.1'},
    {'id': 2, 'created_at': ts(0, '09:40'), 'user': 'Support', 'action': 'chat.reply', 'target': 'Kamran Ashraf', 'ip': '127.0.0.1'},
    {'id': 3, 'created_at': ts(-1, '17:20'), 'user': 'Manager', 'action': 'page.save', 'target': 'portfolio.html', 'ip': '127.0.0.1'},
    {'id': 4, 'created_at': ts(-1, '16:05'), 'user': 'Preview Owner', 'action': 'user.create', 'target': 'Support', 'ip': '127.0.0.1'},
    {'id': 5, 'created_at': ts(-2, '12:05'), 'user': 'Developer', 'action': 'media.upload', 'target': 'kitchen-render.png', 'ip': '127.0.0.1'},
]

SEO_ROWS = [
    {'path': '/', 'title': 'Interior Design Lahore | Woodex', 'status': 'ok', 'issues': 0, 'score': 92},
    {'path': '/portfolio', 'title': 'Portfolio | Woodex', 'status': 'ok', 'issues': 1, 'score': 84},
    {'path': '/blog/walnut-vs-oak', 'title': 'Walnut vs oak | Woodex', 'status': 'warn', 'issues': 3, 'score': 71},
    {'path': '/turnkey-design', 'title': 'Turnkey design | Woodex', 'status': 'ok', 'issues': 0, 'score': 88},
]

PSI_ROW = {'performance': 88, 'lcp': '2.1 s', 'cls': '0.02', 'tbt': '180 ms', 'at': ts(-1, '13:00'), 'score': 88}


# ---- quotation templates (api/sales-lib.php sales_starter_templates + wx_templates) -----
TPL_KINDS = ('design', 'fitout', 'renovation', 'other')


def _tpl_total(t):
    tot = 0.0
    for sec in t.get('sections') or []:
        for it in (sec or {}).get('items') or []:
            try:
                tot += float(it.get('qty') or 0) * float(it.get('rate') or 0)
            except (TypeError, ValueError):
                pass
    return round(tot, 2)


def _seed_templates():
    """Mirror of sales_starter_templates() in api/sales-lib.php."""
    terms = ("50% advance with the confirmed purchase order; balance before delivery.\n"
             "Rates hold for 30 days and exclude tax where applicable.\n"
             "Timeline counts from the advance received and drawings approved.\n"
             "Quantities are measured on site; variations settle at the same rates.")

    def R(d, q, u, r):
        return {'desc': d, 'qty': q, 'unit': u, 'rate': r}

    def S(n, items):
        return {'name': n, 'note': 'Measured on site; final quantities may vary within 5%.', 'items': items}

    rows = [
        ('Home renovation 1 Kanal', 'renovation', 'Turnkey renovation of a 1 Kanal house: civil, plumbing, electrical and finishes.', [
            S('Demolition & civil', [R('Dismantling existing finishes, including debris removal', 1, 'job', 185000),
                                     R('Cement plaster repair: kitchen and bathrooms', 850, 'sft', 210),
                                     R('Waterproofing, roof and bathroom floors', 1200, 'sft', 165)]),
            S('Plumbing & sanitary', [R('Concealed water supply and drainage lines', 1, 'job', 265000),
                                      R('Sanitary fixture set installation, per bathroom', 3, 'set', 46000)]),
            S('Electrical', [R('Concealed wiring, DB panel and earthing', 1, 'job', 320000),
                             R('Light points with switch board and fixture', 24, 'pts', 4200)]),
            S('Flooring', [R('Vitrified tile 600x600 supply and laying', 1900, 'sft', 315),
                           R('Skirting, matching tile', 320, 'rft', 260)]),
            S('Painting', [R('Putty, primer and premium emulsion, 2 coats', 3200, 'sft', 95),
                           R('Weather coat on external facade', 900, 'sft', 130)]),
        ]),
        ('Interior design package', 'design', 'Concept to working drawings with 3D views and site supervision visits.', [
            S('Design services', [R('Concept design with 3D visualisation, per room', 4, 'room', 38000),
                                  R('Working drawings: floor, ceiling and electrical layout', 1, 'job', 120000),
                                  R('Site supervision visit', 6, 'visit', 8000)]),
            S('Execution allowance', [R('TV console, lacquered MDF with storage', 6, 'rft', 14500),
                                      R('Wall panelling behind bed or sofa', 78, 'sft', 1250)]),
        ]),
        ('Office fit-out per seat', 'fitout', 'Rate card for office interiors, priced per workstation.', [
            S('Workstations', [R('Manager desk 5x2.5 ft with side return', 2, 'no', 62000),
                               R('Modular workstation 4x2 ft', 12, 'no', 28500),
                               R('Mesh-back ergonomic chair', 14, 'no', 21000)]),
            S('Ceiling & lighting', [R('Grid ceiling 600x600 with insulation', 850, 'sft', 175),
                                     R('Panel LED luminaire supplied and fixed', 26, 'no', 5200)]),
        ]),
        ('Kitchen cabinets per running foot', 'fitout', 'Modular kitchen: carcass, shutters, hardware and counter on a running-foot rate.', [
            S('Kitchen', [R('Base cabinet, MDF carcass with soft-close hardware', 14, 'rft', 22500),
                          R('Wall cabinet with lift-up or hinged shutters', 10, 'rft', 19500),
                          R('Quartz counter top, 20 mm', 12, 'rft', 16500),
                          R('Stainless sink with mixer tap', 1, 'set', 48000)]),
        ]),
    ]
    out = []
    for i, (name, kind, desc, sections) in enumerate(rows, start=1):
        t = {'id': i, 'name': name, 'kind': kind, 'description': desc, 'sections': sections, 'terms': terms}
        t['total'] = _tpl_total(t)
        out.append(t)
    return out


TPL_STARTERS = _seed_templates()          # the server's starter set (tpl_starters)
TEMPLATES = [dict(t) for t in TPL_STARTERS]
TPL_NEXT = [len(TEMPLATES)]


# =====================================================================================
# Sales documents — quotations, invoices, payments, clients, company settings.
#
# Shapes mirror the PHP they stand in for, field for field, because the screens read
# them field by field:
#   api/sales-lib.php      doc_totals() q_pub() inv_pub() client_of() company_cfg()
#   api/sales17-lib.php    s17_inv_row() s17_inv_client() inv_new inv_track invs_tracker
# Anything missing here shows up as "undefined" on screen — that is a preview bug.
# =====================================================================================
Q_SEQ = [122]        # next quotation sequence
INV_SEQ = [130]      # next invoice sequence
PAY_SEQ = [900]      # next payment row id
COMPANY = {
    'name': 'Woodex Interior', 'tagline': 'Design · Build · Furniture',
    'address': 'M-71, Zainab Tower, Model Town Link Road, Lahore',
    'phones': '+92 42 3517 4400', 'email': 'info@woodex.com.pk', 'web': 'woodex.com.pk',
    'ntn': '0000000-0', 'bankName': '', 'bankTitle': '', 'bankAccount': '', 'bankIban': '',
    'signName': 'Preview Owner', 'signTitle': 'Director',
    'signers': [{'name': 'Preview Owner', 'title': 'Director'}],
    'banks': [{'bank': 'Bank Alfalah', 'title': 'WOODEX INTERIOR', 'account': '0000-0000-0000',
               'iban': 'PK00XXXX0000000000000000', 'branch': 'Model Town Link Road, Lahore', 'use': 'interior'},
              {'bank': 'Meezan Bank', 'title': 'WOODEX FURNITURE', 'account': '0000-0000-0000',
               'iban': 'PK00XXXX0000000000000000', 'branch': 'Model Town Link Road, Lahore', 'use': 'furniture'}],
    'wallets': [{'name': 'JazzCash', 'number': '+92 300 0000000'}],
    'payTerms': '', 'prefix': 'Q-2026-', 'nextNo': 122, 'validDays': 15, 'consultant': 'Woodex Interior',
}
UNITS = ['sft', 'rft', 'sqmt', 'nos', 'each', 'set', 'point', 'job', 'lumpsum']
S17_LINES = {'furniture': 'Furniture', 'interior': 'Interior', 'project': 'Project'}

_CLIENT_BY_ID = {c['id']: c for c in CLIENTS}


def _client_obj(name, cid=None, **over):
    """Same keys as client_of() in sales-lib.php."""
    c = dict(_CLIENT_BY_ID.get(cid) or {})
    o = {'name': name or c.get('name', ''), 'phone': c.get('phone', ''), 'email': c.get('email', ''),
         'address': c.get('address', ''), 'company': c.get('company', ''), 'city': c.get('city', '')}
    o.update(over)
    if not o['name']:
        o['name'] = o['company']
    return o


def _fix_clients(rows):
    for r in rows:
        if isinstance(r.get('client'), str):
            r['client'] = _client_obj(r['client'], r.get('client_id'))


_fix_clients(QUOTES)
_fix_clients(INVOICES)
_fix_clients(PROJECTS)


def _totals(doc):
    """doc_totals() parity: per-section subtotals, discount, tax, total, advance."""
    sub = 0.0
    sections = []
    for s in doc.get('sections') or []:
        items = []
        for it in s.get('items') or []:
            try:
                qty = float(it.get('qty') or 0)
                rate = float(it.get('rate') or 0)
            except (TypeError, ValueError):
                qty = rate = 0.0
            items.append(dict(it, amount=round(qty * rate, 2)))
        st = round(sum(i['amount'] for i in items), 2)
        sections.append(dict(s, items=items, subtotal=st))
        sub += st
    doc['sections'] = sections
    doc['subtotal'] = int(round(sub))
    doc['discount'] = int(min(float(doc.get('discount') or 0), doc['subtotal']))
    doc['taxPct'] = min(float(doc.get('taxPct') or 0), 50)
    doc['rent'] = max(0, int(round(float(doc.get('rent') or 0))))
    doc['tax'] = int(round((doc['subtotal'] - doc['discount'] + doc['rent']) * doc['taxPct'] / 100))
    doc['total'] = doc['subtotal'] - doc['discount'] + doc['rent'] + doc['tax']
    doc['advance'] = min(max(0, int(round(float(doc.get('advance') or 0)))), doc['total'])
    return doc


def _q_pub(q):
    q = dict(q)
    q['label'] = str(q.get('no', '')) + (' · V' + str(q['version']) if int(q.get('version') or 1) > 1 else '') \
        + (' · ' + str(q['option']) if q.get('option') else '')
    return q


def _inv_pub(i):
    """inv_pub() parity."""
    i = dict(i)
    paid = int(sum(int(p.get('amount') or 0) for p in i.get('payments') or []))
    i['paid'] = paid
    i['balance'] = max(0, int(i.get('total') or 0) - paid)
    i['payStatus'] = 'unpaid' if paid <= 0 else ('paid' if paid >= int(i.get('total') or 0) else 'partial')
    due = str(i.get('due_date') or '')
    i['overdue'] = bool(paid < int(i.get('total') or 0) and due and due < ymd(0))
    return i


def _s17_row(i):
    """s17_inv_row() parity — the tracker's row shape."""
    r = _inv_pub(i)
    t = ymd(0)
    r['track'] = 'paid' if (int(r.get('total') or 0) > 0 and r['balance'] <= 0) else \
        ('after_delivery' if (r.get('mode') == 'after_delivery' and not r.get('delivered')) else
         ('partial' if r['paid'] > 0 else 'unpaid'))
    r['late'] = bool(r.get('delivery_date') and not r.get('delivered') and str(r['delivery_date']) < t)
    for k in ('po', 'delivery_date', 'line', 'mode', 'track_note', 'delivered'):
        r[k] = str(r.get(k) or '')
    cl = r.get('client') if isinstance(r.get('client'), dict) else {'name': r.get('client') or ''}
    r['company'] = str(cl.get('company') or cl.get('name') or '')
    r.pop('sections', None)
    return r


def _norm_inv(i):
    i.setdefault('issue_date', i.get('date', ymd(0)))
    i.setdefault('due_date', i.get('due', ''))
    i.setdefault('subtotal', int(i.get('total') or 0))
    for k, v in (('discount', 0), ('taxPct', 0), ('tax', 0), ('rent', 0), ('notes', ''),
                 ('schedule', ''), ('terms', 'Payment 50% advance, balance on completion.'),
                 ('quote_id', None), ('quote_label', ''), ('po', ''), ('delivery_date', ''),
                 ('delivered', ''), ('track_note', ''), ('mode', ''), ('line', 'interior'),
                 ('project_id', None), ('created_by', 'Preview Owner')):
        i.setdefault(k, v)
    i.setdefault('created_at', ts(-20))
    i.setdefault('blocks', [])
    if not i.get('sections'):
        # inv_get() hands the invoice's own sections to the screen, which maps over them.
        i['sections'] = [{'name': 'Supply & services', 'note': '', 'subtotal': int(i.get('total') or 0),
                          'items': [{'desc': str(i.get('project') or 'As per agreement')[:120], 'qty': 1,
                                     'unit': 'job', 'rate': int(i.get('total') or 0),
                                     'amount': int(i.get('total') or 0)}]}]
    pays = []
    for n, p in enumerate(i.get('payments') or [], start=1):
        pays.append({'id': int(p.get('id') or n), 'rcpt': str(i.get('no')) + '-R' + str(n),
                     'date': p.get('date', ymd(0)), 'amount': int(p.get('amount') or 0),
                     'method': p.get('method') or p.get('mode') or 'bank', 'ref': p.get('ref', ''),
                     'by': p.get('by') or 'Preview Owner', 'note': p.get('note', '')})
    i['payments'] = pays
    i['seqPay'] = len(pays)
    return i


for _i in INVOICES:
    _norm_inv(_i)

# Sample invoices are dated inside the *current* month (and one in the previous month) so the
# invoice tracker opens on real numbers, and every status its chips count is represented:
# paid, partial, unpaid, after-delivery, and a late delivery.
_TODAY = ymd(0)
_M0 = _TODAY[:7]
_M1 = ymd(-31)[:7]
_day = lambda back: '%s-%02d' % (_M0, max(1, int(_TODAY[8:10]) - back))


def _month_of_back(back):
    d = ymd(-back)
    return d


for _n, _i in enumerate(INVOICES):
    _back = 1 + _n * 2
    _d = ymd(-_back)
    _i['issue_date'] = _d if _d[:7] == _M0 else _day(_back)
    if not _i.get('due_date'):
        _i['due_date'] = _i['issue_date']

INVOICES.extend([
    {'id': 14, 'no': 'INV-0125', 'client_id': 2, 'client': 'Dr. Sarah Mansoor', 'total': 940000, 'paid': 0,
     'status': 'unpaid', 'date': ymd(0), 'due': ymd(10), 'project_id': 3, 'payments': [],
     'line': 'furniture', 'delivery_date': ymd(-4), 'delivered': '', 'po': 'PO-2291',
     'track_note': 'Client asked to hold delivery until the clinic closes for renovation.'},
    {'id': 15, 'no': 'INV-0126', 'client_id': 4, 'client': "Ayesha Khan", 'total': 385000, 'paid': 0,
     'status': 'unpaid', 'date': ymd(0), 'due': ymd(20), 'project_id': None, 'payments': [],
     'line': 'interior', 'mode': 'after_delivery', 'delivery_date': ymd(-2), 'delivered': '',
     'track_note': 'Billed after installation, as agreed.'},
    {'id': 16, 'no': 'INV-0110', 'client_id': 1, 'client': 'Kamran Ashraf', 'total': 780000, 'paid': 780000,
     'status': 'paid', 'date': _M1 + '-18', 'due': _M1 + '-28', 'project_id': 1,
     'payments': [{'id': 9, 'date': _M1 + '-20', 'amount': 780000, 'method': 'bank', 'note': 'Final payment'}],
     'line': 'project'},
])
for _i in INVOICES:
    _norm_inv(_i)
_fix_clients(INVOICES)   # the invoices added above still carried a plain client name


def _norm_quote(q):
    q.setdefault('version', 1)
    q.setdefault('option', '')
    q.setdefault('date', ymd(0))
    q.setdefault('valid_days', 15)
    q.setdefault('project', '')
    q.setdefault('site', '')
    q.setdefault('kind', 'other')
    q.setdefault('qtype', '')
    q.setdefault('layout', 'classic')
    q.setdefault('design', 'classic')
    q.setdefault('notes', '')
    q.setdefault('intro', '')
    q.setdefault('scope', '')
    q.setdefault('terms', '50% advance payment with work order.\nBalance before delivery.')
    q.setdefault('history', [])
    q.setdefault('created_by', 'Preview Owner')
    q.setdefault('created_at', ts(-6))
    if not q.get('sections'):
        q['sections'] = [
            {'name': 'Scope of work', 'note': '', 'items': [
                {'desc': 'Design and execution as per approved drawings', 'qty': 1, 'unit': 'job',
                 'rate': int(q.get('total') or 0) or 250000}]},
        ]
    return _totals(q)


for _q in QUOTES:
    _norm_quote(_q)


def _next_q_no():
    Q_SEQ[0] += 1
    return 'Q-2026-%04d' % Q_SEQ[0]


def _next_inv_no():
    INV_SEQ[0] += 1
    return 'INV-%04d' % INV_SEQ[0]


def _save_quote(d):
    qid = int(d.get('id') or 0)
    q = next((x for x in QUOTES if x['id'] == qid), None)
    new = q is None
    if new:
        q = {'id': (max([x['id'] for x in QUOTES] + [0]) + 1), 'no': _next_q_no(), 'version': 1,
             'option': '', 'status': 'draft', 'created_by': 'Preview Owner', 'created_at': ts(0),
             'history': []}
        QUOTES.append(q)
    cl = d.get('client') if isinstance(d.get('client'), dict) else {}
    if new and not (cl or {}).get('name'):
        return {'ok': False, 'error': 'Client name is required'}
    if cl:
        q['client'] = _client_obj(cl.get('name', ''), d.get('client_id'), **{k: cl.get(k, '') for k in ('phone', 'email', 'address', 'company')})
    elif 'client' not in q:
        q['client'] = _client_obj('')
    q['client_id'] = int(d.get('client_id') or q.get('client_id') or 0) or None
    for k, lim in (('project', 160), ('site', 160), ('notes', 2000), ('intro', 1500), ('scope', 6000), ('terms', 3000)):
        if k in d:
            q[k] = str(d.get(k) or '')[:lim]
    for k in ('kind', 'qtype', 'layout', 'design'):
        if d.get(k):
            q[k] = d[k]
    if d.get('date'):
        q['date'] = str(d['date'])[:10]
    for k in ('discount', 'taxPct', 'rent', 'advance'):
        if k in d:
            q[k] = d[k]
    if isinstance(d.get('sections'), list):
        q['sections'] = d['sections']
    q['updated_at'] = ts(0)
    if new:
        q['history'].append({'t': ts(0), 'user': 'Preview Owner', 'text': 'Quotation created'})
    return {'ok': True, 'quote': _q_pub(_totals(q))}


def _inv_from_quote(q):
    i = {'id': (max([x['id'] for x in INVOICES] + [0]) + 1), 'no': str(q.get('no')), 'quote_id': q['id'],
         'quote_label': _q_pub(q)['label'], 'client': dict(q.get('client') or {}), 'client_id': q.get('client_id'),
         'project': q.get('project', ''), 'site': q.get('site', ''), 'project_id': None,
         'subtotal': q.get('subtotal', 0), 'discount': q.get('discount', 0), 'rent': q.get('rent', 0),
         'taxPct': q.get('taxPct', 0), 'tax': q.get('tax', 0), 'total': q.get('total', 0),
         'issue_date': ymd(0), 'due_date': ymd(15), 'terms': q.get('terms', ''), 'notes': '',
         'schedule': '50% advance with work order, balance on completion', 'payments': [], 'seqPay': 0,
         'created_by': 'Preview Owner', 'created_at': ts(0),
         'sections': [dict(sec) for sec in (q.get('sections') or [])], 'blocks': [],
         'line': 'interior', 'mode': '', 'po': '', 'delivery_date': '', 'delivered': '', 'track_note': ''}
    INVOICES.append(i)
    return i


def _pay_add(d):
    i = next((x for x in INVOICES if x['id'] == int(d.get('id') or 0)), None)
    if i is None:
        return {'ok': False, 'error': 'Invoice not found'}
    amount = int(round(float(d.get('amount') or 0)))
    if amount <= 0:
        return {'ok': False, 'error': 'Enter the amount received'}
    bal = _inv_pub(i)['balance']
    if amount > bal:
        return {'ok': False, 'error': 'Amount is more than the balance (PKR %s)' % format(bal, ',d')}
    PAY_SEQ[0] += 1
    method = d.get('method') if d.get('method') in ('cash', 'bank', 'cheque', 'online') else 'bank'
    p = {'id': PAY_SEQ[0], 'rcpt': str(i['no']) + '-R' + str(len(i['payments']) + 1),
         'date': str(d.get('date') or ymd(0))[:10], 'amount': amount, 'method': method,
         'ref': str(d.get('ref') or '')[:80], 'note': str(d.get('note') or '')[:200]}
    i['payments'].append(p)
    i['seqPay'] = len(i['payments'])
    return {'ok': True, 'invoice': _inv_pub(i), 'payment': p}


def _sales_build(action, d):
    """Answers for the sales/CRM screens. Returns None when the action is not handled here."""
    if action == 'quotes_list':
        rows = []
        for q in QUOTES:
            r = _q_pub(q)
            r['sectionCount'] = len(q.get('sections') or [])
            r.pop('sections', None)
            rows.append(r)
        return {'ok': True, 'quotes': rows}
    if action == 'quote_get':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found', 'code': 404}
        inv = next((x for x in INVOICES if x.get('quote_id') == q['id']), None)
        return {'ok': True, 'quote': _q_pub(q),
                'family': [{'id': f['id'], 'version': f.get('version', 1), 'option': f.get('option', ''),
                            'status': f.get('status', 'draft')} for f in QUOTES if f.get('no') == q.get('no')],
                'company': dict(COMPANY), 'invoice': _inv_pub(inv) if inv else None}
    if action == 'quote_save':
        return _save_quote(d)
    if action == 'quote_delete':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found'}
        if q.get('status') not in ('draft', 'rejected', 'superseded'):
            return {'ok': False, 'error': 'Only draft, rejected or superseded quotations can be deleted'}
        QUOTES.remove(q)
        return {'ok': True}
    if action == 'quote_status':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found'}
        to = str(d.get('status') or '')
        if to not in ('draft', 'sent', 'approved', 'rejected'):
            return {'ok': False, 'error': 'Unknown status'}
        if q.get('status') == 'invoiced':
            return {'ok': False, 'error': 'This quotation is already invoiced'}
        frm = q.get('status')
        q['status'] = to
        q.setdefault('history', []).append({'t': ts(0), 'user': 'Preview Owner', 'text': 'Status: %s -> %s' % (frm, to)})
        if to == 'approved':
            for f in QUOTES:
                if f.get('no') == q.get('no') and f['id'] != q['id'] and f.get('status') in ('draft', 'sent'):
                    f['status'] = 'superseded'
        return {'ok': True, 'quote': _q_pub(q)}
    if action == 'quote_copy':
        src = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if src is None:
            return {'ok': False, 'error': 'Quotation not found', 'code': 404}
        mode = d.get('mode') if d.get('mode') in ('version', 'option', 'duplicate') else 'version'
        x = dict(src)
        x['id'] = max([q['id'] for q in QUOTES] + [0]) + 1
        x['status'] = 'draft'
        x['history'] = []
        if mode == 'duplicate':
            x['no'] = _next_q_no()
            x['version'] = 1
            x['option'] = ''
        elif mode == 'version':
            x['version'] = max([q.get('version', 1) for q in QUOTES if q.get('no') == src.get('no')] + [1]) + 1
        else:
            x['option'] = 'Option %d' % (len([q for q in QUOTES if q.get('no') == src.get('no')]) + 1)
            x['version'] = 1
        QUOTES.append(x)
        return {'ok': True, 'quote': _q_pub(x)}
    if action == 'quote_invoice':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found', 'code': 404}
        if q.get('status') == 'invoiced':
            return {'ok': False, 'error': 'This quotation is already invoiced'}
        q['status'] = 'invoiced'
        i = _inv_from_quote(q)
        return {'ok': True, 'invoice': _inv_pub(i)}
    if action == 'quote_link':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found'}
        return {'ok': True, 'url': 'https://woodex.com.pk/api/quote-view.php?id=%d&t=previewtoken' % q['id']}
    if action == 'quote_send':
        q = next((x for x in QUOTES if x['id'] == int(d.get('id') or 0)), None)
        if q is None:
            return {'ok': False, 'error': 'Quotation not found'}
        if q.get('status') == 'draft':
            q['status'] = 'sent'
        return {'ok': True, 'sent': True, 'via': str(d.get('channel') or 'email'), 'quote': _q_pub(q)}
    if action == 'invs_list':
        return {'ok': True, 'invoices': [dict(_inv_pub(i), sections=[]) for i in INVOICES]}
    if action == 'inv_get':
        i = next((x for x in INVOICES if x['id'] == int(d.get('id') or 0)), None)
        if i is None:
            return {'ok': False, 'error': 'Invoice not found', 'code': 404}
        return {'ok': True, 'invoice': _inv_pub(i), 'company': dict(COMPANY)}
    if action == 'inv_save':
        i = next((x for x in INVOICES if x['id'] == int(d.get('id') or 0)), None)
        if i is None:
            return {'ok': False, 'error': 'Invoice not found', 'code': 404}
        if d.get('due_date'):
            i['due_date'] = str(d['due_date'])[:10]
        if d.get('issue_date'):
            i['issue_date'] = str(d['issue_date'])[:10]
        for k in ('notes', 'schedule', 'terms'):
            if k in d:
                i[k] = str(d.get(k) or '')[:3000]
        if isinstance(d.get('blocks'), list):
            i['blocks'] = d['blocks']
        return {'ok': True, 'invoice': _inv_pub(i)}
    if action == 'inv_new':
        cl = d.get('client') if isinstance(d.get('client'), dict) else {}
        cid = int(d.get('client_id') or 0) or None
        name = str(cl.get('name') or cl.get('company') or '').strip()
        if not name and not cid:
            return {'ok': False, 'error': 'Pick a client or type the company name'}
        line = d.get('line') if d.get('line') in S17_LINES else 'interior'
        secs = d.get('sections') if isinstance(d.get('sections'), list) else []
        amt = float(d.get('total') or 0)
        if not secs or not sum(len(s.get('items') or []) for s in secs):
            if amt <= 0:
                return {'ok': False, 'error': 'Enter the invoice amount or add items'}
            secs = [{'name': 'Supply & services', 'note': '', 'items': [
                {'desc': str(d.get('desc') or d.get('project') or 'As per agreement')[:600],
                 'qty': 1, 'unit': 'job', 'rate': amt}]}]
        i = {'id': (max([x['id'] for x in INVOICES] + [0]) + 1),
             'no': (str(d['no'])[:30] if str(d.get('no') or '').strip() else _next_inv_no()),
             'quote_id': None, 'quote_label': '', 'client': _client_obj(name, cid, **{k: cl.get(k, '') for k in ('phone', 'email', 'address', 'company')}),
             'client_id': cid, 'project': str(d.get('project') or '')[:160], 'site': str(d.get('site') or '')[:160],
             'issue_date': str(d.get('issue_date') or ymd(0))[:10], 'due_date': str(d.get('due_date') or '')[:10],
             'terms': str(d.get('terms') or '')[:3000], 'notes': str(d.get('notes') or '')[:3000],
             'payments': [], 'seqPay': 0, 'created_by': 'Preview Owner', 'created_at': ts(0),
             'po': str(d.get('po') or '')[:60], 'delivery_date': str(d.get('delivery_date') or '')[:10],
             'line': line, 'mode': ('after_delivery' if d.get('mode') == 'after_delivery' else ''),
             'track_note': str(d.get('track_note') or '')[:500], 'delivered': '', 'schedule': '',
             'sections': [dict(x) for x in secs], 'blocks': []}
        for k in ('discount', 'rent', 'taxPct'):
            i[k] = d.get(k) or 0
        _totals(i)
        INVOICES.append(i)
        return {'ok': True, 'invoice': _s17_row(i)}
    if action == 'inv_track':
        i = next((x for x in INVOICES if x['id'] == int(d.get('id') or 0)), None)
        if i is None:
            return {'ok': False, 'error': 'Invoice not found', 'code': 404}
        for k, lim in (('po', 60), ('track_note', 500)):
            if k in d:
                i[k] = str(d.get(k) or '')[:lim]
        if 'delivery_date' in d:
            i['delivery_date'] = str(d.get('delivery_date') or '')[:10]
        if 'line' in d:
            i['line'] = d['line'] if d['line'] in S17_LINES else ''
        if 'mode' in d:
            i['mode'] = 'after_delivery' if d.get('mode') == 'after_delivery' else ''
        if 'delivered' in d:
            i['delivered'] = (str(d.get('delivered'))[:10] if d.get('delivered') else ymd(0)) if d.get('delivered') else ''
        return {'ok': True, 'invoice': _s17_row(i)}
    if action == 'pay_add':
        return _pay_add(d)
    if action == 'pay_delete':
        i = next((x for x in INVOICES if x['id'] == int(d.get('id') or 0)), None)
        if i is None:
            return {'ok': False, 'error': 'Invoice not found', 'code': 404}
        pid = int(d.get('pay_id') or 0)
        keep = [p for p in i['payments'] if int(p['id']) != pid]
        if len(keep) == len(i['payments']):
            return {'ok': False, 'error': 'Payment not found', 'code': 404}
        i['payments'] = keep
        return {'ok': True, 'invoice': _inv_pub(i)}
    if action == 'invs_tracker':
        rows = [_s17_row(i) for i in INVOICES]
        years = sorted({str(i.get('issue_date', ''))[:4] for i in INVOICES} | {ymd(0)[:4]}, reverse=True)
        year = str(d.get('year') or ymd(0)[:4])
        yr = [r for r in rows if str(r.get('issue_date', ''))[:4] == year]
        months = {}
        for m in range(1, 13):
            k = '%s-%02d' % (year, m)
            mm = [r for r in yr if str(r.get('issue_date', ''))[:7] == k]
            months[k] = {'count': len(mm), 'total': sum(int(r['total']) for r in mm),
                         'received': sum(int(r['paid']) for r in mm),
                         'balance': sum(int(r['balance']) for r in mm)}
        return {'ok': True, 'year': year, 'years': years, 'rows': yr, 'months': months,
                'lateAll': len([r for r in rows if r['late']]),
                'outstandingAll': sum(int(r['balance']) for r in rows)}
    if action == 'clients_list':
        out = []
        for c in CLIENTS:
            row = dict(c)
            row.setdefault('city', 'Lahore')
            row.setdefault('type', 'individual')
            row.setdefault('source', 'Referral')
            row.setdefault('notes', '')
            row['quotes'] = [q['id'] for q in QUOTES if q.get('client_id') == c['id']]
            row['invoices'] = [i['id'] for i in INVOICES if i.get('client_id') == c['id']]
            row['projects'] = [p['id'] for p in PROJECTS if p.get('client_id') == c['id']]
            out.append(row)
        return {'ok': True, 'clients': out}
    if action == 'client_save':
        cl = d.get('client') if isinstance(d.get('client'), dict) else d
        name = str(cl.get('name') or '').strip()
        if not name:
            return {'ok': False, 'error': 'Client name is required'}
        cid = int(d.get('id') or cl.get('id') or 0)
        c = next((x for x in CLIENTS if x['id'] == cid), None)
        if c is None:
            c = {'id': max([x['id'] for x in CLIENTS] + [0]) + 1, 'created_at': ts(0)}
            CLIENTS.append(c)
        for k in ('name', 'phone', 'email', 'company', 'city', 'address', 'type', 'source', 'notes'):
            if k in cl:
                c[k] = str(cl.get(k) or '')[:190]
        return {'ok': True, 'client': dict(c)}
    if action == 'company_get':
        return {'ok': True, 'company': dict(COMPANY), 'units': UNITS}
    if action == 'company_save':
        c = d.get('company') if isinstance(d.get('company'), dict) else {}
        for k, v in c.items():
            if k in ('banks', 'signers', 'wallets') and isinstance(v, list):
                COMPANY[k] = v
            elif k in COMPANY:
                COMPANY[k] = v
        return {'ok': True, 'company': dict(COMPANY)}
    if action == 'tpl_save':
        name = str(d.get('name') or '').strip()[:80]
        if not name:
            return {'ok': False, 'error': 'Template name is required'}
        tid = int(d.get('id') or 0)
        t = next((x for x in TEMPLATES if x['id'] == tid), None)
        if t is None:
            if any(x['name'] == name for x in TEMPLATES):
                return {'ok': False, 'error': 'Another template already has that name'}
            TPL_NEXT[0] += 1
            t = {'id': TPL_NEXT[0]}
            TEMPLATES.append(t)
        t.update({'name': name, 'kind': d.get('kind') if d.get('kind') in TPL_KINDS else 'other',
                  'description': str(d.get('description') or '')[:400],
                  'sections': d.get('sections') or [], 'terms': str(d.get('terms') or '')[:3000]})
        t['total'] = _tpl_total(t)
        return {'ok': True, 'template': dict(t)}
    return None


def build(action, data):
    """Return a response dict for `action`, or None to fall through to the server default."""
    d = data or {}
    r = _sales_build(action, d)
    if r is not None:
        return r
    if action == 'bk_list':
        items = [dict(b) for b in BOOKINGS]
        return {'ok': True, 'today': ymd(0), 'items': items,
                'pending': [dict(b) for b in items if b['status'] == 'waiting'],
                'team': [{'id': t['id'], 'name': t['name']} for t in TEAM], 'cfg': {'open': '09:00', 'close': '18:00', 'slot': 30, 'days': [1, 2, 3, 4, 5, 6], 'blocked': []}}
    if action == 'clients_master':
        return {'ok': True, 'clients': [dict(c) for c in CLIENTS], 'total': len(CLIENTS)}
    if action == 'client_360':
        cid = int(d.get('id') or d.get('client_id') or 1)
        c = next((x for x in CLIENTS if x['id'] == cid), CLIENTS[0])
        return {'ok': True, 'client': dict(c), 'leads': [l for l in LEADS if l['client_id'] == cid],
                'quotes': [q for q in QUOTES if q['client_id'] == cid], 'invoices': [i for i in INVOICES if i['client_id'] == cid],
                'projects': [p for p in PROJECTS if p['client_id'] == cid]}
    if action == 'client_comms':
        return {'ok': True, 'items': [{'at': ts(-2, '11:05'), 'kind': 'call', 'text': 'Discussed the walnut finish'},
                                      {'at': ts(-5, '15:40'), 'kind': 'email', 'text': 'Sent the quotation Q-2026-0114'}]}
    if action == 'quotes_list':
        return {'ok': True, 'quotes': [dict(q) for q in QUOTES]}
    if action == 'invs_list':
        return {'ok': True, 'invoices': [dict(i) for i in INVOICES]}
    if action == 'invs_tracker':
        year = str(d.get('year') or time.strftime('%Y'))
        return {'ok': True, 'year': year, 'years': [year], 'lateAll': sum(1 for i in INVOICES if i['balance'] > 0 and i['due'] < ymd(0)),
                'months': {str(m): {'count': 1, 'total': INVOICES[m - 1]['total'], 'received': INVOICES[m - 1]['paid']} for m in (1, 2, 3)},
                'rows': [dict(i, issue_date=i['date'], line='interior' if i['id'] != 12 else 'furniture',
                              month=i['date'][:7]) for i in INVOICES]}
    if action == 'projs_table':
        return {'ok': True, 'projects': [dict(p) for p in PROJECTS]}
    if action == 'media_list':
        return {'ok': True, 'files': [dict(f) for f in MEDIA_FILES], 'folders': ['assets/img', 'assets/fonts'],
                'trash': [], 'total': len(MEDIA_FILES), 'bytes': sum(f['size'] for f in MEDIA_FILES)}
    if action == 'fm_list':
        dirn = str(d.get('dir') or 'assets')
        return {'ok': True, 'dir': dirn, 'ro': False, 'trash': [], 'maxUpload': 25 * 1024 * 1024,
                'items': [dict(x) for x in FM_ITEMS]}
    if action in ('dbx_tables',):
        return {'ok': True, 'tables': [dict(t) for t in DB_TABLES]}
    if action == 'dbx_browse':
        table = str(d.get('table') or 'wx_leads')
        cols = {'wx_leads': ['id', 'name', 'stage', 'value', 'created_at'], 'wx_clients': ['id', 'name', 'status', 'city'],
                'wx_quotes': ['id', 'no', 'client', 'total', 'status'], 'wx_invoices': ['id', 'no', 'client', 'total', 'balance']}.get(
                    table, ['id', 'name', 'created_at'])
        rows = [list(r) for r in ([v for v in l.values()][:len(cols)] for l in (LEADS if table == 'wx_leads' else CLIENTS))]
        return {'ok': True, 'table': table, 'cols': [{'name': c, 'type': 'text'} for c in cols], 'rows': rows,
                'total': len(rows), 'page': 1, 'per': 50}
    if action == 'pages_list':
        rows = [dict(x) for x in PAGES]
        return {'ok': True, 'pages': rows, 'items': rows, 'total': len(rows), 'aiReady': True}
    if action == 'cms_list':
        kind = str(d.get('kind') or '')
        rows = [dict(p) for p in CMS_PAGES if not kind or p['kind'] == kind]
        return {'ok': True, 'items': rows, 'pages': rows, 'aiReady': True, 'total': len(rows)}
    if action == 'cms_page_kinds':
        return {'ok': True, 'kinds': [{'id': 'page', 'label': 'Page'}, {'id': 'blog', 'label': 'Blog'},
                                      {'id': 'service', 'label': 'Service'}, {'id': 'city', 'label': 'City'},
                                      {'id': 'portfolio', 'label': 'Portfolio'}]}
    if action == 'cms_tpl_list':
        return {'ok': True, 'templates': [{'id': 1, 'name': 'Standard page', 'blocks': 6},
                                          {'id': 2, 'name': 'Service page', 'blocks': 5},
                                          {'id': 3, 'name': 'Blog post', 'blocks': 4}]}
    if action == 'cms_placements':
        return {'ok': True, 'placements': [{'id': 'home-hero', 'label': 'Home hero', 'page': '/', 'block': 'hero'},
                                           {'id': 'footer-cta', 'label': 'Footer CTA', 'page': 'global', 'block': 'cta'}]}
    if action in ('cms_biz_get', 'cms_biz_save'):
        biz = {'email': 'info@woodex.com.pk', 'phone1': '+92 322 4000768', 'phone2': '+92 322 4000768',
               'wa': '+92 322 4000768', 'addr1': 'M-71, Zainab Tower', 'addr2': 'Model Town Link Road',
               'city': 'Lahore', 'country': 'Pakistan', 'days': 'Mon–Sat', 'open': '10:00', 'close': '19:30',
               'facebook': 'https://facebook.com/woodexinterior', 'instagram': 'https://instagram.com/woodexinterior',
               'linkedin': '', 'youtube': '', 'tiktok': '', 'pinterest': '', 'x': ''}
        return {'ok': True, 'biz': dict(biz), 'applied': dict(biz), 'saved': True}
    if action == 'cms_biz_assets':
        return {'ok': True, 'assets': ['assets/site.js', 'assets/js/whatsapp-widget.js'], 'applied': 0}
    if action == 'cms_announce_get':
        return {'ok': True, 'ann': {'on': True, 'text': 'Eid holidays: studio closed 20–22 Oct',
                                    'link': '/contact', 'linkText': 'Talk to us', 'style': 'navy'}}
    if action == 'seo_list':
        return {'ok': True, 'pages': [dict(r) for r in SEO_ROWS], 'total': len(SEO_ROWS)}
    if action == 'sag_get':
        return {'ok': True, 'cfg': {'engine': 'builtin', 'auto': False, 'tone': 'professional'},
                'engines': {'default': 'builtin', 'list': [
                    {'id': 'builtin', 'label': 'Built-in rules', 'ready': True, 'model': ''},
                    {'id': 'openai', 'label': 'OpenAI', 'ready': False, 'model': 'gpt-4o-mini'}]},
                'last': {'at': ts(-1, '13:00'), 'pages': 4, 'issues': [
                    {'sev': '3', 'manual': False, 'msg': 'Meta description is 168 chars on /blog/walnut-vs-oak',
                     'url': '/blog/walnut-vs-oak'},
                    {'sev': '2', 'manual': False, 'msg': '3 images missing alt text on /portfolio', 'url': '/portfolio'},
                    {'sev': '1', 'manual': True, 'msg': 'No internal links from the home page to /turnkey-design',
                     'url': '/'}]},
                'history': [{'at': ts(-1, '13:00'), 'pages': 4, 'issues': 3}, {'at': ts(-8, '13:00'), 'pages': 4, 'issues': 5}]}
    if action == 'health_speed':
        return {'ok': True, 'psi': {'index.html|mobile': [dict(PSI_ROW)], 'index.html|desktop': [dict(PSI_ROW, performance=96)],
                                    '/portfolio|mobile': [dict(PSI_ROW, performance=79)], '/portfolio|desktop': [dict(PSI_ROW, performance=90)]}}
    if action in ('health_get', 'health_scan'):
        return {'ok': True, 'score': 88, 'checked': ts(-1, '13:00'), 'items': [
            {'id': 'ssl', 'label': 'HTTPS certificate', 'status': 'ok', 'detail': 'valid until 2027-01-14'},
            {'id': 'robots', 'label': 'robots.txt', 'status': 'ok', 'detail': 'found'},
            {'id': 'sitemap', 'label': 'sitemap.xml', 'status': 'warn', 'detail': '3 pages not listed'},
            {'id': 'backup', 'label': 'Last backup', 'status': 'ok', 'detail': ts(-1, '02:00')}]}
    if action in ('redirects',):
        return {'ok': True, 'redirects': [{'id': 1, 'from': '/old-portfolio', 'to': '/portfolio', 'code': 301, 'hits': 12},
                                          {'id': 2, 'from': '/furniture', 'to': '/boardroom-tables', 'code': 301, 'hits': 4}],
                'resolve': []}
    if action == 'r404_list':
        return {'ok': True, 'rows': [{'path': '/blog/old-post', 'hits': 9, 'last': ts(-2, '18:00')},
                                     {'path': '/services/interior', 'hits': 3, 'last': ts(-4, '10:30')}]}
    if action == 'activity':
        return {'ok': True, 'rows': [dict(a) for a in ACTIVITY], 'total': len(ACTIVITY), 'per': 20, 'page': 1}
    if action == 'team_list':
        return {'ok': True, 'team': [dict(t) for t in TEAM], 'perms': {}, 'roles': ['owner', 'admin', 'editor', 'sales', 'support']}
    if action == 'tpl_list':
        return {'ok': True, 'templates': [dict(t) for t in TEMPLATES]}
    if action in ('est_tpls',):
        rates = {'services': [{'name': 'Civil & demolition', 'unit': 'sq ft', 'rate': 350},
                              {'name': 'Gypsum ceiling', 'unit': 'sq ft', 'rate': 480},
                              {'name': 'Painting', 'unit': 'sq ft', 'rate': 210}],
                 'finishes': [{'name': 'Standard', 'factor': 1.0}, {'name': 'Premium', 'factor': 1.35}]}
        out = []
        for t in TEMPLATES:
            o = dict(t); o['rates'] = {'services': [dict(x) for x in rates['services']], 'finishes': [dict(x) for x in rates['finishes']]}
            out.append(o)
        return {'ok': True, 'templates': out}
    if action == 'appr_list':
        return {'ok': True, 'items': [dict(a) for a in APPROVALS], 'total': len(APPROVALS)}
    if action == 'appr_cfg_get':
        return {'ok': True, 'cfg': {'pages': True, 'theme': True, 'media': False, 'quotes': True}}
    if action == 'appr_count':
        return {'ok': True, 'pending': sum(1 for a in APPROVALS if a['status'] == 'pending')}
    if action == 'forms_get':
        return {'ok': True, 'defaults': {'emailTo': 'hello@woodex.pk', 'waTo': '+92 300 0000000', 'subject': 'New website enquiry'},
                'forms': [
                    {'id': 'contact', 'label': 'Contact form', 'on': True, 'total': 24, 'month': 6, 'last': ts(-1, '16:20'),
                     'pages': ['/', '/contact', '/turnkey-design'], 'fields': ['name', 'phone', 'email', 'service', 'message'],
                     'cfg': {'emailTo': '', 'alertTo': 'hello@woodex.pk', 'waTo': '', 'waAlert': False,
                             'reply': True, 'replyText': 'Thank you — we will reply within one working day.'}},
                    {'id': 'quote', 'label': 'Quotation request', 'on': True, 'total': 11, 'month': 3, 'last': ts(-2, '11:05'),
                     'pages': ['/estimator', '/turnkey-design'], 'fields': ['name', 'phone', 'city', 'budget', 'notes'],
                     'cfg': {'emailTo': 'sales@example.com', 'alertTo': '', 'waTo': '', 'waAlert': False,
                             'reply': False, 'replyText': ''}}]}
    if action == 'me_get':
        return {'ok': True, 'user': {'id': 1, 'name': 'Preview Owner', 'email': 'preview@example.com', 'role': 'owner',
                                     'created_at': ts(-400), 'avatar': ''},
                'profile': {'whatsapp': '923004455667', 'phone': '923004455667', 'city': 'Lahore', 'title': 'Director',
                            'bio': 'Interior design studio, Lahore.', 'timezone': 'Asia/Karachi'},
                'stats': {'logins': 42, 'pages': 18, 'chats': 3, 'last_login': ts(0, '08:00')},
                'security': {'twofa': False, 'sessions': 1, 'pass_changed': ts(-30)},
                'activity': [{'action': 'login', 'target': '', 'created_at': ts(0, '08:00')},
                             {'action': 'page.save', 'target': 'portfolio.html', 'created_at': ts(-2, '17:20')},
                             {'action': 'media.upload', 'target': 'kitchen-render.png', 'created_at': ts(-2, '12:05')}]}
    if action in ('logos_get',):
        return {'ok': True, 'data': {'show': True, 'kicker': 'Trusted by', 'title': 'Studios & brands we build for',
                                     'grey': True, 'speed': 40,
                                     'items': [{'name': 'Gulberg Plaza', 'logo': '/assets/img/logos/gulberg.svg', 'url': '/portfolio'},
                                               {'name': 'Dental Care Lahore', 'logo': '/assets/img/logos/dental.svg', 'url': '/portfolio'},
                                               {'name': 'Woodex Studio', 'logo': '/assets/img/logos/woodex.svg', 'url': '/'}]}}
    if action == 'notify_get':
        return {'ok': True, 'cfg': {'email': True, 'emailTo': 'hello@woodex.pk', 'wa': False, 'waTo': '',
                                    'newLead': True, 'newChat': True, 'digest': 'daily', 'digestAt': '08:00'},
                'waReady': False, 'emailReady': True, 'channels': ['email']}
    if action in ('crm_offers',):
        return {'ok': True, 'offers': [{'id': 1, 'title': 'Autumn fit-out offer', 'text': '10% off fit-out this month',
                                        'sent': 12, 'opened': 5, 'status': 'sent', 'at': ts(-5, '10:00')},
                                       {'id': 2, 'title': 'Maintenance reminder', 'text': 'Time for the annual polish',
                                        'sent': 0, 'opened': 0, 'status': 'draft', 'at': ts(-1, '16:00')}]}
    if action == 'chat_cfg_get':
        return {'ok': True, 'cfg': {'on': True, 'name': 'Woodex assistant', 'greeting': 'Assalam-o-Alaikum! How can we help?',
                                    'hours': '09:00–18:00', 'handoff': 'whatsapp', 'ai': True, 'tone': 'professional'}}
    if action == 'crm_wa_status':
        return {'ok': True, 'connected': False, 'number': '', 'provider': 'whatsapp-cloud', 'ready': False}
    if action in ('wah_overview', 'wah_insights', 'wag_get', 'wauto', 'wainsights'):
        return {'ok': True, 'connected': False, 'ready': False, 'stats': {'sent': 0, 'delivered': 0, 'read': 0, 'replies': 0},
                'rows': [], 'rules': [], 'flows': [], 'apps': [], 'cfg': {}, 'series': {'sent': [], 'read': []}, 'axis': []}
    if action in ('ai_report', 'aic_get', 'ai_run'):
        return {'ok': True, 'days': 28, 'unanswered': [{'q': 'Do you do turnkey projects in DHA?', 'n': 4},
                                                       {'q': 'What is the cost per sq ft?', 'n': 3}],
                'stats': {'chats': 12, 'answered': 10, 'handoff': 2, 'accuracy': 0.83}, 'history': []}
    if action == 'aic_save':
        return {'ok': True}
    if action == 'gdata_report':
        return {'ok': True, 'connected': False, 'rows': [], 'note': 'Google Analytics is not connected in the preview.'}
    if action in ('s17_meta',):
        return {'ok': True, 'lines': [{'id': 'interior', 'label': 'Interior (WI)'}, {'id': 'furniture', 'label': 'Furniture (WF)'}],
                'leadTypes': [{'id': 'residential', 'label': 'Residential'}, {'id': 'commercial', 'label': 'Commercial'}],
                'quoteStatus': [{'id': 'draft', 'label': 'Draft'}, {'id': 'sent', 'label': 'Sent'}, {'id': 'approved', 'label': 'Approved'}],
                'nextTypes': [{'id': 'call', 'label': 'Call'}, {'id': 'visit', 'label': 'Site visit'}, {'id': 'quote', 'label': 'Quote follow-up'}],
                'clientTypes': [{'id': 'prospect', 'label': 'Prospect'}, {'id': 'active', 'label': 'Active'}],
                'projectTypes': [{'id': 'interior', 'label': 'Interior'}, {'id': 'fitout', 'label': 'Fit-out'}],
                'stages': ['new', 'contacted', 'visit', 'quoted', 'won', 'lost'],
                'team': [{'id': t['id'], 'name': t['name']} for t in TEAM]}
    if action == 'tg_link_code':
        return {'ok': True, 'code': 'WX-4F2A-9C1B', 'link': 'https://t.me/WoodexStudioBot', 'linked': False}
    if action == 'tg_get':
        return {'ok': True, 'cfg': {'on': False, 'token': '', 'chat': '', 'username': 'WoodexStudioBot'},
                'linked': False, 'ready': False, 'log': []}
    if action == 'mt_get':
        return {'ok': True, 'on': False, 'message': 'Planned maintenance: Sunday 02:00–03:00', 'until': '',
                'token': '', 'pages': [{'path': 'index.html', 'url': '/'}, {'path': 'portfolio.html', 'url': '/portfolio'},
                                       {'path': 'turnkey-design.html', 'url': '/turnkey-design'}]}
    if action == 'backup_list':
        return {'ok': True, 'backups': [{'id': 1, 'at': ts(-1, '02:00'), 'size': 4_200_000, 'kind': 'auto', 'files': 812},
                                        {'id': 2, 'at': ts(-8, '02:00'), 'size': 4_050_000, 'kind': 'auto', 'files': 806}]}
    if action in ('backups',):
        return {'ok': True, 'backups': [{'id': 1, 'at': ts(-1, '02:00'), 'size': 4_200_000, 'kind': 'auto'}]}
    return None


# ---------------------------------------------------------------------------
# /api/builder.php — the site builder + theme endpoint (separate from admin.php).
# The Pages & builder, Section library, Header & footer, Hero slides and Theme
# screens all talk to this one. Before this block the stub returned `empty()`
# for all of it, so those screens rendered blank.
# ---------------------------------------------------------------------------

SITE_THEME = {
    '--wx-navy': '#0c1628', '--wx-ink': '#12151c', '--wx-muted': '#6a6560',
    '--wx-paper': '#ffffff', '--wx-surface': '#f4efe7', '--wx-beige': '#f4efe7',
    '--wx-accent': '#b8956a', '--wx-wood': '#b8956a', '--wx-cream': '#f4efe7',
    '--wx-preset': 'studio-classic', '--wx-font': 'Plus Jakarta Sans',
    '--wx-font-head': 'Plus Jakarta Sans', '--wx-h1': '56px', '--wx-h2': '38px',
    '--wx-h3': '24px', '--wx-c1': '#0c1628', '--wx-c2': '#b8956a', '--wx-c3': '#f4efe7',
    '--wx-c4': '#12151c', '--wx-section': '88px', '--wx-container': '1200px',
    '--wx-btn-radius': '10px', '--wx-r-lg': '18px', '--wx-base-size': '16px',
}

PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Preview page</title></head>
<body>
<section class="hero"><h1>Turnkey interiors in Lahore</h1>
  <p>Design, fit-out and furniture under one roof.</p>
  <a class="btn" href="#contact">Book a consultation</a></section>
<section class="cards"><article><h2>Interior design</h2><p>Concept to handover.</p></article>
  <article><h2>Fit-out</h2><p>Civil, ceiling, electrical.</p></article></section>
</body>
</html>"""

SECTION_LIBRARY = [
    {'id': 'hero-split', 'name': 'Hero — split image', 'kind': 'hero', 'used': 3,
     'html': '<section class="hero"><h1>{{title}}</h1><p>{{lead}}</p></section>'},
    {'id': 'cta-band', 'name': 'CTA band', 'kind': 'cta', 'used': 7,
     'html': '<section class="cta"><h2>{{title}}</h2><a class="btn" href="#contact">Talk to us</a></section>'},
    {'id': 'cards-3', 'name': 'Three cards', 'kind': 'cards', 'used': 5,
     'html': '<section class="cards"><article><h2>{{a}}</h2></article><article><h2>{{b}}</h2></article><article><h2>{{c}}</h2></article></section>'},
    {'id': 'faq-acc', 'name': 'FAQ accordion', 'kind': 'faq', 'used': 2,
     'html': '<section class="faq"><details><summary>{{q}}</summary><p>{{a}}</p></details></section>'},
]


def build_builder(action, data):
    """Answers for /api/builder.php. Same shape as api/builder.php."""
    d = data or {}
    if action == 'pages':
        return {'ok': True, 'pages': [{'path': p['path'], 'url': p['url'], 'title': p['title'],
                                       'mtime': p['mtime'], 'size': p['size'], 'score': p.get('score', 0),
                                       'words': p.get('words', 0)} for p in PAGES]}
    if action == 'load':
        rel = str(d.get('path') or 'index.html')
        p = next((x for x in PAGES if x['path'] == rel), None)
        if not p:
            return {'ok': False, 'error': 'Page not found in preview'}
        return {'ok': True, 'path': rel, 'title': p['title'], 'url': p['url'], 'html': PAGE_HTML,
                'mtime': p['mtime'], 'size': p['size'], 'ro': False}
    if action == 'save':
        return {'ok': True, 'mtime': epoch(0, time.strftime('%H:%M')), 'size': len(PAGE_HTML), 'saved': True}
    if action == 'page_new':
        slug = str(d.get('slug') or 'new-page')
        folder = str(d.get('folder') or '').strip('/')
        rel = (folder + '/' if folder else '') + slug + '/index.html'
        return {'ok': True, 'path': rel, 'url': '/' + rel.replace('/index.html', ''), 'created': True}
    if action in ('theme', 'theme_get'):
        return {'ok': True, 'vars': dict(SITE_THEME), 'preset': SITE_THEME['--wx-preset'],
                'fonts': [{'id': 'jakarta', 'label': 'Plus Jakarta Sans'},
                          {'id': 'inter', 'label': 'Inter'},
                          {'id': 'manrope', 'label': 'Manrope'}], 'saved': True}
    if action == 'blocks_list':
        return {'ok': True, 'blocks': [dict(b) for b in SECTION_LIBRARY], 'total': len(SECTION_LIBRARY)}
    if action == 'blocks_usage':
        return {'ok': True, 'usage': {b['id']: b['used'] for b in SECTION_LIBRARY},
                'pages': [{'path': 'index.html', 'blocks': ['hero-split', 'cards-3']},
                          {'path': 'portfolio.html', 'blocks': ['cta-band']}]}
    if action == 'blocks_save':
        return {'ok': True, 'id': str(d.get('id') or 'custom-block'), 'saved': True}
    if action == 'blocks_delete':
        return {'ok': True}
    if action in ('backups', 'backup_list'):
        return {'ok': True, 'backups': [{'id': 'index-2026-10-11-0200', 'path': 'index.html', 'at': ts(-1, '02:00'),
                                         'size': 48210, 'kind': 'auto'},
                                        {'id': 'portfolio-2026-10-10-0200', 'path': 'portfolio.html', 'at': ts(-2, '02:00'),
                                         'size': 31140, 'kind': 'auto'}],
                'file': 'index.html', 'size': 48210}
    if action == 'backup_get':
        return {'ok': True, 'path': str(d.get('path') or 'index.html'), 'html': PAGE_HTML,
                'mtime': epoch(-1), 'at': ts(-1, '02:00')}
    if action == 'restore':
        return {'ok': True, 'path': str(d.get('path') or 'index.html'), 'restored': True}
    if action == 'media':
        return {'ok': True, 'media': [{'url': f['url'], 'name': f['name'], 'size': f['size'],
                                       'w': f['w'], 'h': f['h'], 'alt': f['alt']} for f in MEDIA_FILES]}
    if action == 'upload':
        return {'ok': True, 'url': '/assets/uploads/preview-upload.webp', 'width': 1600, 'height': 1067}
    return None
