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

# (label, fg var, bg var, what uses it) — Preline ocean token names
PAIRS = [
    ("body text",               "foreground",        "background",         "page body"),
    ("body text on card",       "foreground",        "card",               "card headings / labels"),
    ("body text on popover",    "foreground",        "popover",            "modal / drawer / palette"),
    ("heading on bg-1",         "foreground",        "background-1",       ".auth-side"),
    ("secondary text",          "muted-foreground",  "card",               "buttons, nav links, labels"),
    ("secondary on bg",         "muted-foreground",  "background",         "page text on background"),
    ("secondary on bg-1",       "muted-foreground",  "background-1",       ".auth-side notes"),
    ("secondary on muted",      "muted-foreground",  "muted",              "kanban / seg controls"),
    ("strong secondary",        "foreground-2",      "card",               "table cell titles"),
    ("strong sec on bg-1",      "foreground-2",      "background-1",       ".as-note, .fd-b"),
    ("primary btn label",       "primary-foreground", "primary",           ".btn.pri"),
    ("primary btn hover",       "primary-foreground", "primary-hover",     ".btn.pri:hover"),
    ("accent text on card",     "accent",            "card",               "links, .badge.acc, .crumb a"),
    ("accent on bg",            "accent",            "background",         ".as-kicker, .st-t small"),
    ("accent on soft",          "accent",            "accent-soft",        ".btn.acc, .nav-a.on"),
    ("accent on soft-2",        "accent",            "accent-soft-2",      ".btn.acc:hover"),
    ("badge info",              "info",              "info-soft",          ".badge.inf"),
    ("OK status",               "success",           "success-soft",       "success badges"),
    ("WARN status",             "warning",           "warning-soft",       "warning badges"),
    ("BAD status",              "destructive",       "destructive-soft",   "error badges"),
    ("error text",              "destructive",       "card",               ".err"),
    ("sidebar text",            "sidebar-foreground", "sidebar",           "nav links"),
    ("sidebar muted",           "sidebar-muted",     "sidebar",            "nav group labels"),
    ("sidebar active text",     "sidebar-accent-foreground", "sidebar",     ".nav-a.on"),
    ("sidebar active bg",       "sidebar-accent-foreground", "sidebar-accent", ".nav-a.on"),
    ("sidebar hover",           "sidebar-foreground", "sidebar-hover",     ".nav-a:hover"),
    ("auth stat label",         "sidebar-muted",     "sidebar",            ".as-stat small"),
    ("auth stat value",         "foreground",        "sidebar",            ".as-stat b"),
    ("auth kicker",             "accent",            "sidebar",            ".as-kicker"),
    ("ta row text",             "foreground-2",      "card",               ".ta-r code"),
    ("ta row on muted",         "foreground-2",      "muted",              ".ta-r"),
    ("ta header",               "muted-foreground",  "muted",              ".as-ta-h"),
    ("ta footer",               "muted-foreground",  "card",               ".as-ta-f"),
    ("msg out label",           "primary-foreground", "primary",           ".msg.out"),
    ("chart axis",              "chart-axis",        "card",               "chart tick labels"),
    ("input border",            "border-input",      "card",               "WCAG 1.4.11 form-control boundary", 3.0),
    ("input border on muted",    "border-input",      "muted",              "inputs on --muted panels", 3.0),
]

def grade(r, need=4.5):
    """Grade a pair. `need` is the WCAG threshold: 4.5 for text (1.4.3),
    3.0 for non-text UI boundaries (1.4.11)."""
    if r >= max(need, 7.0):
        return "AAA"
    if r >= need:
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
    for pair in PAIRS:
        label, fg, bg, use = pair[:4]
        need = pair[4] if len(pair) > 4 else 4.5
        f, b = V.get(fg, "?"), V.get(bg, "?")
        if "?" in (f, b) or not f.startswith("#") or not b.startswith("#"):
            continue
        r = ratio(f, b)
        g = grade(r, need)
        flag = ""
        if g in ("FAIL", "AA-large"):
            flag = "  <-- " + use
            fails.append((theme, label, f, b, r, g, use))
        print(f"  {label:<26}{f:<10}{b:<10}{r:>6.2f}:1  {g:<10}{flag}")

print("\n" + "=" * 78)
print(f"PROBLEM PAIRS: {len(fails)}")
for t, l, f, b, r, g, u in fails:
    print(f"  [{t}] {l:<26} {f} on {b}  {r:.2f}:1  {g}   ({u})")
