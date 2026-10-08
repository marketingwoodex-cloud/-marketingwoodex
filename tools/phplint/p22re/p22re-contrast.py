#!/usr/bin/env python3
"""Contrast audit for frontend-v1/admin/admin.css — light + dark themes."""
import re, io, os

ROOT = __file__.rsplit("/tools/", 1)[0]
CSS = ROOT + "/frontend-v1/admin/admin.css"

def hex2rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3: h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def lum(rgb):
    def f(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = lum(hex2rgb(a)), lum(hex2rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def parse_vars(block):
    out = {}
    for m in re.finditer(r"--([a-z0-9-]+)\s*:\s*([^;}]+)", block):
        out[m.group(1)] = m.group(2).strip()
    return out

src = io.open(CSS, encoding="utf-8").read()

def all_vars(sel):
    """Every declaration of a variable in blocks matching `sel`.
    Later same-specificity rules win, so apply in document order."""
    acc = {}
    for m in re.finditer(re.escape(sel) + r"\{([^}]*)\}", src, re.S):
        for k, v in parse_vars(m.group(1)).items():
            acc[k] = v
    return acc

# :root may be redefined later (the P22.2 theme layer); last one wins
L = all_vars(":root")
# html.dark inherits from :root, then overrides
D = dict(L); D.update(all_vars("html.dark"))

# (label, fg var, bg var, what uses it). fg/bg may be a var name or a literal #hex.
PAIRS = [
    ("body text",              "txt",   "bg",    "page body"),
    ("body text on card",      "txt",   "card",  "card headings / labels"),
    ("secondary text",         "txt2",  "card",  "buttons, nav links, labels"),
    ("secondary on bg",        "txt2",  "bg",    "page text on background"),
    ("muted text",             "mut",   "card",  ".muted / .hint / crumb"),
    ("muted on bg",            "mut",   "bg",    "hints on page bg"),
    ("muted2 (nav headings)",  "mut2",  "card",  ".nav-h section labels"),
    ("muted2 on bg",           "mut2",  "bg",     "nav-h / pill on bg"),
    ("gold-d accent (light)",  "gold-d","card",  ".brand small, .pill.new, .av"),
    ("gold-d on pri-soft",     "gold-d","pri-soft", "nav active icon, pill.new"),
    ("primary btn label",      "#fff",  "navy",  ".btn.pri (light)"),
    ("primary btn (dark)",     "navy",  "gold",  "html.dark .btn.pri"),
    ("gold btn label",         "navy",  "gold",  ".btn.gold"),
    ("logo letter",            "gold",  "navy",  ".logo (light)"),
    ("logo letter (dark)",     "navy",  "gold",  "html.dark .logo"),
    ("nav active text",        "txt",   "pri-soft", ".nav-a.on"),
    ("nav icon active",        "@gold-icon", "pri-soft", ".nav-a.on i"),
    ("brand tagline",          "@brand-tag", "card",  ".brand small"),
    ("avatar initial",         "@brand-tag", "pri-soft", ".av"),
    ("nav icon idle",          "mut",   "card",  ".nav-a i"),
    ("side footer link",       "mut",   "card",  ".side-foot a"),
    ("pill text",              "mut",   "bg",    ".pill"),
    ("pill.new text",          "gold-d","pri-soft", ".pill.new"),
    ("OK status",              "ok",    "ok-soft", "success badges"),
    ("WARN status",            "warn",  "warn-soft", "warning badges"),
    ("BAD status",             "bad",   "bad-soft", "error badges"),
    ("INFO status",            "info",  "info-soft", "info badges"),
    ("user role text",         "mut",   "card",  ".u-txt small"),
    ("search icon",            "mut",   "bg",    ".top-search i"),
]

def grade(r, large=False):
    if r >= 7:   return "AAA"
    if r >= (3.0 if large else 4.5): return "AA"
    if r >= 3.0: return "AA-large"
    return "FAIL"

print("CONTRAST AUDIT — frontend-v1/admin/admin.css")
print("=" * 78)
fails = []
EXTRA = {"LIGHT": {"@gold-icon": "gold-d", "@brand-tag": "gold-d"},
         "DARK":  {"@gold-icon": "gold",   "@brand-tag": "gold"}}
for theme, V in (("LIGHT", L), ("DARK", D)):
    V = dict(V, **EXTRA[theme])
    print(f"\n── {theme} " + "─" * (74 - len(theme)))
    print(f"  {'pair':<28}{'fg':<10}{'bg':<10}{'ratio':>7}  {'grade':<10}")
    for label, fg, bg, use in PAIRS:
        f, b = V.get(fg, "?"), V.get(bg, "?")
        if "?" in (f, b) or not f.startswith("#") or not b.startswith("#"):
            continue
        r = ratio(f, b)
        g = grade(r)
        flag = ""
        if g in ("FAIL", "AA-large"):
            flag = "  <-- " + use
            fails.append((theme, label, f, b, r, g, use))
        print(f"  {label:<28}{f:<10}{b:<10}{r:>6.2f}:1  {g:<10}{flag}")

print("\n" + "=" * 78)
print(f"PROBLEM PAIRS: {len(fails)}")
for t, l, f, b, r, g, u in fails:
    print(f"  [{t}] {l:<28} {f} on {b}  {r:.2f}:1  {g}   ({u})")
