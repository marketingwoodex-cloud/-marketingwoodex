#!/usr/bin/env python3
"""Static regression checks for the remediation edits. Read-only.

Usage: python3 regression_static.py <repo-root>
Exit 0 only if every check passes. Static checks do NOT close a finding (E0/E1);
they guard against re-introduction of the wording and guards that were edited.
"""
import os
import sys

ROOT = sys.argv[1].rstrip('/')
TREES = ['woodex-live-p29-v2.1-pro', 'frontend-v1']
PRO = 'woodex-live-p29-v2.1-pro'

# Overstated status wording removed from the settings integrations UI (AD-05/06/07).
FORBIDDEN_SETTINGS = ['Live Connected', '24/7 listeners', 'Ping successful', 'saved live', 'Connected & Verified']

# Honest status wording that must be present in the pro settings file.
REQUIRED_SETTINGS = ['Not verified', 'marked connected in this browser only', 'Not saved', 'No request was sent']

# Files whose pro and frontend-v1 copies must stay byte-identical.
MIRRORED = [
    'admin/admin-settings.js',
    'admin/admin.js',
    'admin/admin-dash.js',
    'estimator/index.html',
]

results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS ' if ok else 'FAIL ') + name + (('  | ' + detail) if detail else ''))


def read(tree, rel):
    p = os.path.join(ROOT, tree, rel)
    if not os.path.isfile(p):
        return None
    with open(p, 'r', encoding='utf-8', errors='replace') as fh:
        return fh.read()


# 1. Forbidden overstated wording absent in every tree.
for tree in TREES:
    s = read(tree, 'admin/admin-settings.js')
    if s is None:
        check(f'[{tree}] admin-settings.js present', False, 'missing')
        continue
    hits = [t for t in FORBIDDEN_SETTINGS if t in s]
    check(f'[{tree}] overstated status wording absent', not hits, 'hits=' + repr(hits))

# 2. Honest wording present in the pro settings file.
s = read(PRO, 'admin/admin-settings.js') or ''
missing = [t for t in REQUIRED_SETTINGS if t not in s]
check('[pro] honest status wording present', not missing, 'missing=' + repr(missing))

# 3. Dashboard guards: owner path (admin-dash.js) and base path (admin.js).
d = read(PRO, 'admin/admin-dash.js') or ''
check('[pro] admin-dash: payload-shape guard present', 'Dashboard data is incomplete' in d)
check('[pro] admin-dash: promise .catch renders error card', 'The dashboard could not be drawn' in d and '}).catch(function (e)' in d)
a = read(PRO, 'admin/admin.js') or ''
check('[pro] admin.js: dashFail helper present', 'dashFail' in a)
check('[pro] admin.js: stats.folders shape guard present', '!r.stats || typeof r.stats.folders !== "object"' in a)

# 4. Estimator accessible names on the three visible public inputs.
e = read(PRO, 'estimator/index.html') or ''
for label in ['aria-label="Your name"', 'aria-label="Phone or WhatsApp number"', 'aria-label="Email address (optional)"']:
    check('[pro] estimator input has ' + label, label in e)

# 5. Mirror identity: pro and frontend-v1 copies byte-identical.
for rel in MIRRORED:
    a_ = read(PRO, rel)
    b_ = read('frontend-v1', rel)
    check('mirror identical: ' + rel, a_ is not None and a_ == b_)

print('')
print(f'SUMMARY: {sum(results)} PASS / {len(results) - sum(results)} FAIL of {len(results)}')
sys.exit(0 if all(results) else 1)
