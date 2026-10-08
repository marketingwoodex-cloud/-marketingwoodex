#!/usr/bin/env python3
"""Verify a release .htaccess actually blocks what it must (simulated Apache rules).
Usage: python3 p22re-htaccess.py [dir]   (default dir = woodex-master-P22/extracted)"""
import re, sys, os

HT = (sys.argv[1] if len(sys.argv) > 1 else "woodex-master-P22/extracted") + "/.htaccess"
txt = open(HT, encoding="utf-8").read()

# ---- 1. collect <FilesMatch "regex"> ... </FilesMatch> blocks
blocks = re.findall(r'<FilesMatch\s+"([^"]+)"\s*>(.*?)</FilesMatch>', txt, re.S)
print(f"FilesMatch blocks found: {len(blocks)}")
rules = []
for pat, body in blocks:
    denied = bool(re.search(r"Require\s+all\s+denied|Deny\s+from\s+all", body))
    header = bool(re.search(r"Header\s", body))
    rules.append((pat, denied, header, body.strip()[:80]))

def matches(path):
    """Does any FilesMatch pattern match this (basename or path)?"""
    hits = []
    for pat, denied, header, _ in rules:
        try:
            if re.search(pat, path) or re.search(pat, os.path.basename(path)):
                hits.append((pat, denied, header))
        except re.error:
            hits.append((pat + " [INVALID REGEX]", False, False))
    return hits

# ---- 2. must-be-blocked files
MUST_BLOCK = ["api/chat-rules.json", "api/redirect-plan.json", "api/admin-lib.php",
              "api/router.php", "error_log", "db.sql", "x.bak", "README.md"]
MUST_ALLOW = ["api/admin.php", "api/chat.php", "api/forms.php", "api/whatsapp.php",
              "index.html", "assets/site-p21.css", "wx-install.php", "wx-check.php", "sitemap.xml"]

print("\n=== MUST BE BLOCKED (web) ===")
fail = 0
for f in MUST_BLOCK:
    h = matches(f)
    ok = any(d for _, d, _ in h)
    if not ok: fail += 1
    print(f"  {'PASS' if ok else 'FAIL'}  {f:28} -> " + (", ".join(f"{p}{' [denied]' if d else ''}" for p, d, _ in h) or "no rule"))

print("\n=== MUST STAY ACCESSIBLE ===")
for f in MUST_ALLOW:
    h = matches(f)
    blocked = any(d for _, d, _ in h)
    if blocked: fail += 1
    print(f"  {'FAIL (blocked!)' if blocked else 'PASS'}  {f:28} -> " + (", ".join(p for p, _, _ in h) or "no rule"))

# ---- 3. RewriteRule guards for _private
print("\n=== RewriteRule guards ===")
priv = re.findall(r"RewriteRule\s+\^_private\(/\|\$\)\s+-\s+\[F,L\]", txt)
dot  = re.findall(r"RewriteRule\s+\(\^\|/\)\\\.\(\?!well-known\)\s+-\s+\[F,L\]", txt)
print(f"  {'PASS' if priv else 'FAIL'}  _private/ blocked by rewrite: {len(priv)} rule(s)")
if not priv: fail += 1
print(f"  {'PASS' if dot else 'FAIL'}  dotfiles blocked by rewrite: {len(dot)} rule(s)")
if not dot: fail += 1
# _private/db.json (the real DB file with credentials) must be caught by the _private guard
import re as _re
_priv_hit = any(_re.search(r"\^_private\(/\|\$\)", r) for r in txt.splitlines())
print(f"  {'PASS' if _priv_hit else 'FAIL'}  _private/db.json (real DB file) blocked by ^_private(/|$) [F,L]")
if not _priv_hit: fail += 1

# ---- 4. security headers present
print("\n=== Security headers in .htaccess ===")
for h in ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
          "Strict-Transport-Security", "Permissions-Policy", "Content-Security-Policy"]:
    n = txt.count(h)
    print(f"  {'PASS' if n else 'MISSING':7} {h}: {n}")
    if h == "Content-Security-Policy" and n == 0:
        print("         (known open item D1 — CSP not yet added)")

# ---- 5. private folders each deny
print("\n=== Private folder .htaccess files ===")
BASE = sys.argv[1] if len(sys.argv) > 1 else "woodex-master-P22/extracted"
for d in ["_private", "_database", "_templates"]:
    p = f"{BASE}/{d}/.htaccess"
    if os.path.isfile(p):
        b = open(p).read()
        ok = "Require all denied" in b or "Deny from all" in b
        print(f"  {'PASS' if ok else 'FAIL'}  {d}/.htaccess -> {b.strip()[:40]!r}")
        if not ok: fail += 1
    else:
        print(f"  FAIL  {d}/.htaccess missing"); fail += 1

print(f"\n=== TOTAL FAILURES: {fail} ===")
sys.exit(1 if fail else 0)
