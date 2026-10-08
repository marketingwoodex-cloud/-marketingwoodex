#!/usr/bin/env python3
"""Public-site contact + banned-word sweep (static).
Usage: python3 p22re-contacts.py [site-root]   (default: frontend-v1)
Scans every public HTML page and reports:
  - phone numbers / emails that are NOT the approved company contacts
  - banned marketing words in visible text
"""
import os, re, html, sys, collections

ROOT = sys.argv[1] if len(sys.argv) > 1 else "frontend-v1"
SKIP = ("admin/", "api/", "builder/", "_private", "_database", "assets/", "mcp-server/")
OK_PHONES = {"+923224000768", "+923002292569", "+924235907089"}
OK_EMAILS = {"info@woodex.com.pk", "marketing.woodex@gmail.com"}
BANNED = ["warranty", "guarantee", "delve", "in conclusion", "unlock the potential", "seamlessly integrate"]

def pages():
    out = []
    for dp, _, fs in os.walk(ROOT):
        for f in fs:
            if f != "index.html":
                continue
            rel = os.path.relpath(os.path.join(dp, f), ROOT).replace("\\", "/")
            if rel.startswith(SKIP):
                continue
            out.append(rel)
    return sorted(out)

def visible(h):
    h = re.sub(r"<(script|style|noscript)[\s\S]*?</\1>", " ", h, flags=re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))

def norm_phone(raw):
    d = re.sub(r"[^\d+]", "", raw)
    if d.startswith("0092"):
        d = "+" + d[4:]
    if d.startswith("92") and not d.startswith("+"):
        d = "+" + d
    if d.startswith("0") and len(d) == 11:
        d = "+92" + d[1:]
    if d.startswith("+92") and len(d) == 10:      # +92 3xx xxxxxxx typo guard
        d = d[:3] + "0" + d[3:]
    return d

bad_phones, bad_emails, bad_words = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
PHONE_RE = re.compile(r"(?:\+92|0092)[\s\-.]?\(?3\d{2}\)?[\s\-.]?\d{3}[\s\-.]?\d{4,5}|\b0?3\d{2}[\s\-.]?\d{7}\b")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
all_pages = pages()
links_checked = 0

for rel in all_pages:
    h = open(os.path.join(ROOT, rel), encoding="utf-8", errors="ignore").read()
    txt = visible(h)
    for m in PHONE_RE.finditer(h):
        raw, links_checked = m.group(0), links_checked + 1
        n = norm_phone(raw)
        if n not in OK_PHONES:
            bad_phones[n].append(rel)
    for m in EMAIL_RE.finditer(h):
        e = m.group(0).lower()
        if e not in OK_EMAILS:
            bad_emails[e].append(rel)
    low = txt.lower()
    for w in BANNED:
        for m in re.finditer(re.escape(w), low):
            bad_words[w].append(rel)

print("pages scanned:", len(all_pages))
print("phone strings checked:", links_checked)
print()
print("=== UNEXPECTED PHONES ===")
if bad_phones:
    for n, f in sorted(bad_phones.items()):
        print(f"  {n}  <- {f[0]} (+{len(f)-1} more)" if len(f) > 1 else f"  {n}  <- {f[0]}")
else:
    print("  none")
print("=== UNEXPECTED EMAILS ===")
if bad_emails:
    for e, f in sorted(bad_emails.items()):
        print(f"  {e}  <- {f[0]} (+{len(f)-1} more)" if len(f) > 1 else f"  {e}  <- {f[0]}")
else:
    print("  none")
print("=== BANNED WORDS (visible text) ===")
if bad_words:
    for w, f in sorted(bad_words.items()):
        print(f"  '{w}' x{len(f)}  <- {f[0]}" + (f" (+{len(f)-1} more)" if len(f) > 1 else ""))
else:
    print("  none")
sys.exit(1 if (bad_phones or bad_emails or bad_words) else 0)
