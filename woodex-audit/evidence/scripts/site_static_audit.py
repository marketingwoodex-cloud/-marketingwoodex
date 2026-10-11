#!/usr/bin/env python3
"""Static SEO / accessibility / performance pass over the PUBLIC pages of a Woodex tree.
Read-only. Prints aggregate counts and per-file findings (paths only, no content).
Usage: python3 site_static_audit.py <tree-root>
"""
import sys, os, re, collections
from html.parser import HTMLParser

root = sys.argv[1]
SKIP = ('admin/', 'builder/', '_private/', '_templates/', '_database/', 'vendor/', 'includes/', 'api/', 'node_modules/', 'assets/')

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.d = collections.Counter(); self.title = None; self.in_title = False
        self.cur_tag = None; self.h1 = 0; self.in_h1 = False
        self.imgs_noalt = 0; self.imgs = 0; self.inputs_unlabeled = 0; self.labels_for = set(); self.input_ids = []
        self.ids = set(); self.inputs_noname = 0; self.buttons_empty = 0; self.btn_open = False; self.btn_text = ''
        self.render_block_js = 0; self.lang = None; self.viewport = False; self.canonical = False
        self.meta_desc = False; self.og = False; self.jsonld = 0; self.skip_link = False
        self.in_jsonld = False; self.jsonld_bad = 0; self.noscript_ok = True
        self.head_open = True; self.ld_text = ''
        self.label_depth = 0; self.unnamed_ids = []; self.unnamed_noid = 0
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'title': self.in_title = True; self.title = ''
        if tag == 'h1': self.h1 += 1; self.in_h1 = True
        if tag == 'meta':
            n = (a.get('name') or a.get('property') or '').lower()
            if n == 'viewport': self.viewport = True
            if n == 'description' and a.get('content','').strip(): self.meta_desc = True
            if n.startswith('og:'): self.og = True
        if tag == 'link' and 'canonical' in (a.get('rel') or ''): self.canonical = True
        if tag == 'img':
            self.imgs += 1
            if 'alt' not in a: self.imgs_noalt += 1
        if tag == 'script':
            src = a.get('src')
            if src and self.head_open and not ('defer' in a or 'async' in a) and a.get('type') != 'application/ld+json':
                self.render_block_js += 1
            if a.get('type') == 'application/ld+json': self.in_jsonld = True; self.ld_text = ''
        if tag == 'body': self.head_open = False
        if tag == 'label':
            self.label_depth += 1
            if a.get('for'): self.labels_for.add(a['for'])
        if tag in ('input','select','textarea'):
            if a.get('type') not in ('hidden','submit','button','image','reset'):
                self.input_ids.append(a.get('id'))
                if not a.get('aria-label') and not a.get('aria-labelledby') and not a.get('title') and self.label_depth == 0:
                    if a.get('id'): self.unnamed_ids.append(a['id'])
                    else: self.unnamed_noid += 1
        if tag == 'button': self.btn_open = True; self.btn_text = ''; self.btn_attrs = a
        if tag == 'a' and (a.get('href') or '').startswith('#') and 'skip' in ((a.get('class') or '') + (a.get('href') or '')).lower(): self.skip_link = True
        if 'id' in a: self.ids.add(a['id'])
    def handle_endtag(self, tag):
        if tag == 'label': self.label_depth = max(0, self.label_depth-1)
        if tag == 'title': self.in_title = False
        if tag == 'h1': self.in_h1 = False
        if tag == 'script' and self.in_jsonld:
            self.in_jsonld = False; self.jsonld += 1
            try:
                import json; json.loads(self.ld_text)
            except Exception: self.jsonld_bad += 1
        if tag == 'button':
            if self.btn_open and not self.btn_text.strip() and not any(k in self.btn_attrs for k in ('aria-label','aria-labelledby','title')):
                self.buttons_empty += 1
            self.btn_open = False
    def handle_data(self, data):
        if self.in_title: self.title = (self.title or '') + data
        if self.in_jsonld: self.ld_text += data
        if self.btn_open: self.btn_text += data

def files():
    for dp, dn, fn in os.walk(root):
        rel = os.path.relpath(dp, root) + '/'
        if rel.startswith('./'): rel = rel[2:]
        if any(rel.startswith(s) or ('/'+s) in ('/'+rel) for s in SKIP if s not in ('assets/',)): continue
        for f in fn:
            if f.endswith('.html') and not f.startswith('google'):
                yield os.path.relpath(os.path.join(dp, f), root)

stats = collections.Counter(); per = collections.defaultdict(list)
for rel in sorted(files()):
    txt = open(os.path.join(root, rel), encoding='utf-8', errors='ignore').read()
    p = P()
    try: p.feed(txt)
    except Exception as e: per['parse_error'].append(rel); continue
    stats['pages'] += 1
    if not p.title or not p.title.strip(): per['no_title'].append(rel)
    elif len(p.title.strip()) > 70: per['title_gt_70'].append(rel)
    if not p.meta_desc: per['no_meta_description'].append(rel)
    if p.h1 == 0: per['no_h1'].append(rel)
    if p.h1 > 1: per['multiple_h1'].append(rel)
    if not p.canonical: per['no_canonical'].append(rel)
    if not p.lang: per['no_html_lang'].append(rel)
    if not p.viewport: per['no_viewport'].append(rel)
    if not p.og: per['no_open_graph'].append(rel)
    if p.imgs_noalt: per['img_missing_alt_attr'].append(f'{rel} ({p.imgs_noalt})')
    unresolved = [i for i in p.unnamed_ids if i not in p.labels_for] + ['(no id)'] * p.unnamed_noid
    if unresolved: per['input_without_accessible_name'].append(f'{rel} ({len(unresolved)}: ' + ', '.join(sorted(set(unresolved))[:4]) + ')')
    if p.buttons_empty: per['button_without_name'].append(f'{rel} ({p.buttons_empty})')
    if p.jsonld_bad: per['invalid_jsonld'].append(rel)
    if p.render_block_js: per['head_script_not_deferred'].append(f'{rel} ({p.render_block_js})')
    stats['jsonld_blocks'] += p.jsonld
    stats['pages_with_jsonld'] += 1 if p.jsonld else 0
    stats['pages_with_skip_link'] += 1 if p.skip_link else 0
    stats['imgs'] += p.imgs
    stats['imgs_noalt'] += p.imgs_noalt

print('STATS', dict(stats))
for k in sorted(per):
    print(f'{k}: {len(per[k])}')
    for x in per[k][:8]: print('   ', x)
    if len(per[k]) > 8: print(f'    ... +{len(per[k])-8} more')

# performance: largest static assets and total bytes of first-party CSS/JS
big = []
tot = collections.Counter()
for dp, dn, fn in os.walk(root):
    if any(s in dp for s in ('/vendor','node_modules','/.git')): continue
    for f in fn:
        pth = os.path.join(dp, f); sz = os.path.getsize(pth)
        ext = f.rsplit('.',1)[-1].lower() if '.' in f else ''
        if ext in ('css','js'): tot[ext] += sz
        if ext in ('jpg','jpeg','png','webp','gif') and sz > 400_000:
            big.append((sz, os.path.relpath(pth, root)))
print('FIRST_PARTY_BYTES', dict(tot))
print('IMAGES_OVER_400KB', len(big))
for sz, pth in sorted(big, reverse=True)[:10]: print(f'   {sz//1024} KB  {pth}')
