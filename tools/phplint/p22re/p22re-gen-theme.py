#!/usr/bin/env python3
"""
P22.2 admin theme-improvement layer generator — v2.

Fixes over v1:
  * strips CSS comments before parsing (comments were captured as selectors)
  * strips an existing `html.dark ` prefix instead of doubling it
  * only remaps a TEXT colour when the same rule's BACKGROUND also flips
    (paired swap), so gold/navy buttons keep their dark ink
  * adds border-color remapping
"""
import io, re, os, collections

ROOT = __file__.rsplit("/tools/", 1)[0]
CSS = ROOT + "/frontend-v1/admin/admin.css"
OUT = "/tmp/wxverify/admin-theme-layer.css"

src = io.open(CSS, encoding="utf-8").read()
# strip comments (but keep line structure so selectors stay separate)
src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)

# split into rules, tracking whether each rule is already a dark override
def parse(t):
    out = []
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", t):
        sel, decl = m.group(1).strip(), m.group(2).strip()
        if not sel or sel.startswith("@") or "keyframes" in sel: continue
        out.append((sel, decl))
    return out

# ---------- also harvest CSS that the admin JS injects as <style> strings ----------
import glob
CSSISH = re.compile(r"[.#a-zA-Z\[][\w\s.,:()>+*\[\]=\"'-]*\{[^{}]*:[^{}]*\}")


def js_css():
    """Pull selector{decl} rules out of quoted CSS strings inside admin/*.js."""
    out = []
    for f in sorted(glob.glob(ROOT + "/frontend-v1/admin/*.js")):
        t = io.open(f, encoding="utf-8", errors="replace").read()
        for m in re.finditer(r'"((?:[^"\\]|\\.)*)"' + r"|'((?:[^'\\]|\\.)*)'", t):
            frag = m.group(1) if m.group(1) is not None else m.group(2)
            if not frag or len(frag) < 25:
                continue
            if "{" not in frag or "}" not in frag:
                continue
            if not CSSISH.search(frag):
                continue
            frag = frag.replace('\\"', '"').replace("\\'", "'")
            out.append(frag)
    return "\n".join(out)

root_block = re.search(r":root\{(.*?)\n\}", src, re.S).group(1)
dark_block = re.search(r"html\.dark\{(.*?)\n\}", src, re.S).group(1)
# remove only those two variable declarations
rest = re.sub(r":root\{" + re.escape(root_block) + r"\n\}", "", src, flags=re.S)
rest = re.sub(r"html\.dark\{" + re.escape(dark_block) + r"\n\}", "", rest, flags=re.S)
JS_CSS = js_css()
rest = rest + "\n" + JS_CSS

BG = {
    "#ffffff": "var(--card)", "#fff": "var(--card)", "#fafbfc": "var(--card)",
    "#f9fafb": "var(--bg2)", "#f2f4f7": "var(--bg2)", "#eef0f3": "var(--bg2)",
    "#f7f5f1": "var(--bg2)", "#f8f6f2": "var(--bg2)", "#e9ebf0": "var(--bg2)",
    "#f4efe7": "var(--pri-soft)", "#faf6ef": "var(--pri-soft)", "#fdf8f1": "var(--pri-soft)",
    "#fdf6ec": "var(--pri-soft)", "#fffdf9": "var(--pri-soft)", "#fbf6ef": "var(--pri-soft)",
    "#ecfdf3": "var(--ok-soft)", "#dcfae6": "var(--ok-soft)", "#e8f5ee": "var(--ok-soft)",
    "#e8f8ef": "var(--ok-soft)",
    "#fffaeb": "var(--warn-soft)", "#fff8ea": "var(--warn-soft)", "#fef0c7": "var(--warn-soft)",
    "#fef3f2": "var(--bad-soft)", "#fff1f1": "var(--bad-soft)", "#fee4e2": "var(--bad-soft)",
    "#eff8ff": "var(--info-soft)", "#f0f4ff": "var(--info-soft)", "#eef4ff": "var(--info-soft)",
    "#eef2ff": "var(--info-soft)", "#f4f3ff": "var(--info-soft)", "#efeaff": "var(--info-soft)",
    "#f5f3ff": "var(--info-soft)", "#ede9fe": "var(--info-soft)",
}
GOLD_BG = {"#e9d9c0": "var(--gold-dim)", "#d8c3a2": "var(--gold-dim)",
           "#e6cfa5": "var(--gold-dim)", "#cfae84": "var(--gold-dim)"}
BORDER = {"#eaecf0": "var(--line)", "#e4e7ec": "var(--line)", "#e6dccb": "var(--line)",
          "#eadfcd": "var(--line)", "#ecdcc4": "var(--line)",
          "#d0d5dd": "var(--line2)", "#f5c16c": "var(--line2)", "#a9c1ff": "var(--line2)",
          "#f5a3a3": "var(--line2)", "#ddd6fe": "var(--line2)"}
INK = {"#101828", "#0a0f1e", "#0c1628"}          # dark ink -> light text in dark mode
TXT = {"#475467": "var(--mut)", "#667085": "var(--mut)",
       "#b54708": "var(--warn)", "#b42318": "var(--bad)", "#d92d20": "var(--bad)",
       "#067647": "var(--ok)", "#027a48": "var(--ok)", "#079455": "var(--ok)", "#1f7a4d": "var(--ok)",
       "#3538cd": "var(--info)", "#5925dc": "var(--info)", "#175cd3": "var(--info)",
       "#6d28d9": "var(--info)", "#465fff": "var(--info)",
       "#93622b": "var(--gold-d)", "#6b5234": "var(--gold-d)", "#8a6a43": "var(--gold-d)",
       "#101828": "var(--txt)", "#0a0f1e": "var(--txt)", "#0c1628": "var(--txt)"}

# intentional light surfaces that must stay light in both themes
SKIP_BG = re.compile(r"iframe|\.builder-frame|\.tf-qr|\.switch|\.blk-sw|\.tst-ic|\.md-th|repeating-conic", re.I)
KEEP_RULE = re.compile(r"\.code\b")   # dark code block already

overrides, notes = {}, []
for sel, decl in parse(rest):
    if sel.startswith("html.dark"):
        continue                                   # already a dark override
    if KEEP_RULE.search(sel):
        continue
    repl = []
    bg_flipped = False

    for m in re.finditer(r"(background(?:-color)?\s*:\s*)(#[0-9a-fA-F]{3,8})\b", decl):
        prop, val = m.group(1), m.group(2).lower()
        if SKIP_BG.search(sel):
            continue
        rep = BG.get(val) or GOLD_BG.get(val)
        if rep:
            repl.append((prop, rep)); bg_flipped = True

    for m in re.finditer(r"((?:border(?:-color)?)[a-z-]*\s*:\s*[^;]*?)(#[0-9a-fA-F]{3,8})\b", decl):
        val = m.group(2).lower()
        if val in BORDER:
            repl.append(("border-color:", BORDER[val]))

    for m in re.finditer(r"(?<![-a-z])(color\s*:\s*)(#[0-9a-fA-F]{6})\b", decl):
        prop, val = m.group(1), m.group(2).lower()
        if val in INK and not bg_flipped:
            # dark ink with a stable (gold/navy) background -> keep it
            continue
        if val in TXT and (bg_flipped or val not in INK):
            repl.append((prop, TXT[val]))

    if repl:
        seen = {}
        for p, r in repl:
            seen[p.strip()] = r
        overrides[sel] = ";".join(f"{p}{r}" for p, r in seen.items())

print(f"rules parsed: {len(parse(rest))}   selectors overridden: {len(overrides)}")
print(f"  (includes {len(JS_CSS)} chars of CSS injected from admin JS)")

head = """/* ==========================================================================
   P22.2 — ADMIN THEME IMPROVEMENT LAYER  (appended; replaces no existing rule)
   * WCAG-passing contrast in both themes
   * one palette, one font (Plus Jakarta Sans — already shipped, no new download)
   * premium elevation / focus / motion polish
   Generated from an audit of admin.css. Edit here, not in the rules above.
   ========================================================================== */

/* ---------- 1. corrected variables (light) ---------- */
:root{
  /* --mut2 2.58:1 -> 5.19:1  (sidebar section headings were barely visible) */
  --mut2:#686d78;
  /* --gold-d 2.89:1 -> 5.60:1 (brand tagline, avatar, active nav icon) */
  --gold-d:#826238;
  /* status text now passes AA on its own soft surface */
  --ok:#067647;--warn:#b54708;--bad:#b42318;--info:#175cd3;
  /* polish tokens */
  --bg2:#f7f8fa;--gold-dim:#e9d9c0;
  /* --soft is owned by the print/PDF theme (light paper) but UI code uses it with a
     light fallback, so merge-tag chips stayed white in dark mode. Print re-defines
     it at runtime and still wins. */
  --soft:#f3f4f6;
  --sh1:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.1);
  --sh2:0 4px 8px -2px rgba(16,24,40,.1),0 2px 4px -2px rgba(16,24,40,.06);
  --sh3:0 12px 16px -4px rgba(16,24,40,.1),0 4px 6px -2px rgba(16,24,40,.05);
  --sh-pop:0 20px 24px -4px rgba(16,24,40,.12),0 8px 8px -4px rgba(16,24,40,.06);
  --ring:0 0 0 4px rgba(212,175,106,.22);
  --ease:cubic-bezier(.4,0,.2,1);
}
/* ---------- 1b. corrected variables (dark) ---------- */
html.dark{
  /* --mut2 2.91:1 -> 5.37:1 */
  --mut2:#8b9099;
  /* status text lightened for dark surfaces */
  --ok:#32d583;--warn:#fdb022;--bad:#fda29b;--info:#53b1fd;
  --bg2:#111725;--gold-dim:#3a3122;--soft:#111725;
  /* --gold-d must stay light: the light value #826238 is only 3.08:1 on a dark card */
  --gold-d:#b8924c;
  --sh1:0 1px 2px rgba(0,0,0,.4);
  --sh2:0 4px 8px -2px rgba(0,0,0,.45);
  --sh3:0 12px 16px -4px rgba(0,0,0,.5);
  --sh-pop:0 20px 24px -4px rgba(0,0,0,.55);
  --ring:0 0 0 4px rgba(212,175,106,.28);
}

/* ---------- 2. one font, both themes ---------- */
@font-face{font-family:"Plus Jakarta Sans";src:url("/assets/fonts/plus-jakarta-sans-400.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Plus Jakarta Sans";src:url("/assets/fonts/plus-jakarta-sans-500.woff2") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Plus Jakarta Sans";src:url("/assets/fonts/plus-jakarta-sans-600.woff2") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Plus Jakarta Sans";src:url("/assets/fonts/plus-jakarta-sans-700.woff2") format("woff2");font-weight:700;font-display:swap}
body{font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif}
"""

lines = ["\n/* ---------- 3. dark-mode colour fixes ----------",
         "   each of these rules hardcoded a light colour and stayed light in dark mode */"]
for sel, d in overrides.items():
    lines.append(f"html.dark {sel}{{{d}}}")

sidebar = """
/* ---------- 3b. navy sidebar (dark in BOTH themes) ---------- */
/* .nav-h / .nav-car were #6b7a90 = 4.14:1 at 11.5px. #8b98ab is already the
   sidebar's icon colour, so this also unifies the palette. */
.side .nav-h{color:#8b98ab}
.side .nav-car{color:#8b98ab}
"""

polish = """
/* ---------- 4. premium polish ---------- */
.card{box-shadow:var(--sh1);transition:box-shadow .2s var(--ease),transform .2s var(--ease),border-color .2s var(--ease)}
.card:hover{box-shadow:var(--sh2)}
.dd-menu,.modal,.auth-card{box-shadow:var(--sh-pop)}
.top,.side{box-shadow:var(--sh1)}
.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,
.nav-a:focus-visible,a:focus-visible,button:focus-visible{outline:0;box-shadow:var(--ring);border-color:var(--gold)}
h1,h2,h3{font-weight:700;letter-spacing:-.02em}
.ph h1{font-size:25px;font-weight:700}
.card-h h3{font-weight:600;letter-spacing:-.01em}
.nav-h{font-weight:600}
.btn,.nav-a,.icon-btn,.pill,.card{transition-timing-function:var(--ease)}
.kpi{transition:transform .2s var(--ease),box-shadow .2s var(--ease)}
.kpi:hover{transform:translateY(-2px);box-shadow:var(--sh2)}
html.dark ::-webkit-scrollbar{width:10px;height:10px}
html.dark ::-webkit-scrollbar-thumb{background:var(--line2);border-radius:8px;border:2px solid var(--card)}
html.dark ::-webkit-scrollbar-track{background:transparent}
"""

io.open(OUT, "w", encoding="utf-8").write(head + "\n".join(lines) + sidebar + polish)
print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
