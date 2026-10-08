#!/usr/bin/env python3
"""Contrast audit for frontend-v1/admin-v3/v3.css — light + dark themes.

Companion to p22re-contrast.py (which audits v2's admin.css). v3 uses Preline
semantic token names, so the pair table below maps v3's components onto them.

Usage:  python3 tools/phplint/p22re/p22re-contrast-v3.py
"""
import re, io, os

ROOT = __file__.rsplit("/tools/", 1)[0]
CSS = ROOT + "/frontend-v1/admin-v3/v3.css"


def hex2rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
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
    acc = {}
    for m in re.finditer(re.escape(sel) + r"\s*\{([^}]*)\}", src, re.S):
        for k, v in parse_vars(m.group(1)).items():
            acc[k] = v
    return acc


L = all_vars(":root")
D = dict(L)
D.update(all_vars("html.dark"))

# (label, fg var, bg var, what uses it)
PAIRS = [
    ("body text",               "foreground",        "background",         "page body"),
    ("body text on card",       "foreground",        "card",               "card headings / labels"),
    ("body text on popover",    "foreground",        "popover",            "modal / drawer / palette"),
    ("secondary text",          "muted-foreground",  "card",               "buttons, nav links, labels"),
    ("secondary on bg",         "muted-foreground",  "background",         "page text on background"),
    ("secondary on card-2",     "muted-foreground",  "card-2",             "table zebra rows"),
    ("primary btn label",       "primary-foreground","primary",            ".btn.pri"),
    ("accent btn label",        "accent-foreground", "accent",             ".btn.acc"),
    ("accent-2 on card",        "accent-2",          "card",               ".badge.acc text"),
    ("sidebar text",            "sidebar-foreground","sidebar",            "nav links"),
    ("sidebar muted",           "sidebar-muted",     "sidebar",            "nav group labels"),
    ("sidebar active text",     "sidebar-accent-foreground", "sidebar",     ".nav-a.on"),
    ("OK status",               "success",           "success-soft",       "success badges"),
    ("WARN status",             "warning",           "warning-soft",       "warning badges"),
    ("BAD status",              "destructive",       "destructive-soft",   "error badges"),
    ("INFO status",             "info",              "info-soft",          "info badges"),
    ("error text",              "destructive",       "card",               ".err"),
    ("link text",               "info",              "card",               "links"),
    ("auth note on navy",       "sidebar-muted",     "sidebar",            ".as-note"),
    ("auth stat label",         "sidebar-muted",     "sidebar",            ".as-stat small"),
    ("auth stat value",         "#ffffff",          "sidebar",            ".as-stat b"),
    ("auth kicker (gold)",      "accent",            "sidebar",            ".as-kicker"),
    ("ta row text",             "foreground-2",      "card",               ".ta-r code"),
    ("ta row on muted",         "foreground-2",      "muted",              ".ta-r"),
    ("ta header",               "muted-foreground",  "muted",              ".as-ta-h"),
    ("ta footer",               "muted-foreground",  "card",               ".as-ta-f"),
    ("ta badge info",           "info",              "info-soft",          ".ta-r .badge.inf"),
]


def grade(r, large=False):
    if r >= 7:
        return "AAA"
    if r >= (3.0 if large else 4.5):
        return "AA"
    if r >= 3.0:
        return "AA-large"
    return "FAIL"


print("CONTRAST AUDIT — frontend-v1/admin-v3/v3.css")
print("=" * 78)
fails = []
for theme, V in (("LIGHT", L), ("DARK", D)):
    print(f"\n── {theme} " + "─" * (74 - len(theme)))
    print(f"  {'pair':<26}{'fg':<10}{'bg':<10}{'ratio':>7}  {'grade':<10}")
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
        print(f"  {label:<26}{f:<10}{b:<10}{r:>6.2f}:1  {g:<10}{flag}")

print("\n" + "=" * 78)
print(f"PROBLEM PAIRS: {len(fails)}")
for t, l, f, b, r, g, u in fails:
    print(f"  [{t}] {l:<26} {f} on {b}  {r:.2f}:1  {g}   ({u})")
