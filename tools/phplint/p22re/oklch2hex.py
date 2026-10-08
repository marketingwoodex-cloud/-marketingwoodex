#!/usr/bin/env python3
"""oklch -> sRGB hex, for porting Preline/Tailwind v4 oklch tokens to plain CSS.

Preline v4 themes and Tailwind v4 both express every colour as oklch(). Browsers
render oklch() natively, so the ported CSS can keep the original values verbatim
— but contrast auditing and any hand-picked overrides need real sRGB numbers.

  usage: python3 tools/phplint/p22re/oklch2hex.py "oklch(60.9% 0.126 221.723)"
         python3 tools/phplint/p22re/oklch2hex.py --scale cyan
"""
import re
import sys


def oklch_to_srgb(L, C, H_deg):
    """OKLCH -> linear sRGB -> gamma-encoded sRGB (0..1 each)."""
    h = H_deg * 3.141592653589793 / 180.0
    a = C * __import__("math").cos(h)
    b = C * __import__("math").sin(h)

    # OKLab -> LMS
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b

    l = l_ ** 3
    m = m_ ** 3
    s = s_ ** 3

    # LMS -> linear sRGB
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, bb


def gam(x):
    if x <= 0.0031308:
        return 12.92 * x
    return 1.055 * (x ** (1 / 2.4)) - 0.055


def to_hex(L, C, H):
    r, g, b = oklch_to_srgb(L, C, H)
    out = []
    for v in (r, g, b):
        v = max(0.0, min(1.0, gam(v)))
        out.append(int(round(v * 255)))
    return "#%02x%02x%02x" % tuple(out)


def parse(s):
    """Accept oklch() with numeric or `none` chroma/hue, and optional / alpha."""
    s = s.strip()
    m = re.search(r"oklch\(\s*([^)]*?)\s*\)", s)
    if not m:
        raise ValueError("not an oklch() value: %r" % s)
    parts = [p.strip() for p in m.group(1).split("/")[0].split()]
    if len(parts) != 3:
        raise ValueError("oklch() needs L C H: %r" % s)

    def num(tok, default=0.0):
        if tok == "none":
            return default
        return float(tok[:-1]) / 100.0 if tok.endswith("%") else float(tok)

    L, C, H = num(parts[0]), num(parts[1]), num(parts[2])
    alpha = num(m.group(1).split("/")[1].strip(), 1.0) if "/" in m.group(1) else None
    return L, C, H, alpha


# Tailwind v4 default scales used by the Preline "ocean" theme.
SCALES = {
    "cyan": [(50, "98.4% 0.019 200.873"), (100, "95.6% 0.045 203.388"), (200, "91.7% 0.08 205.041"),
             (300, "86.5% 0.127 207.078"), (400, "78.9% 0.154 211.53"), (500, "71.5% 0.143 215.221"),
             (600, "60.9% 0.126 221.723"), (700, "52% 0.105 223.128"), (800, "45% 0.085 224.283"),
             (900, "39.8% 0.07 227.392"), (950, "30.2% 0.056 229.695")],
    "gray": [(50, "98.5% 0.002 247.839"), (100, "96.7% 0.003 264.542"), (200, "92.8% 0.006 264.531"),
             (300, "87.2% 0.01 258.338"), (400, "70.7% 0.022 261.325"), (500, "55.1% 0.027 264.364"),
             (600, "44.6% 0.03 256.802"), (700, "37.3% 0.034 259.733"), (800, "27.8% 0.033 256.848"),
             (900, "21% 0.034 264.665"), (950, "13% 0.028 261.692")],
    "neutral": [(50, "98.5% 0 none"), (100, "97% 0 none"), (200, "92.2% 0 none"), (300, "87% 0 none"),
                (400, "70.8% 0 none"), (500, "55.6% 0 none"), (600, "43.9% 0 none"), (700, "37.1% 0 none"),
                (800, "26.9% 0 none"), (900, "20.5% 0 none"), (950, "14.5% 0 none")],
    "sky": [(400, "74.6% 0.16 232.661"), (500, "68.5% 0.169 237.323"), (600, "58.8% 0.158 241.966")],
    "blue": [(500, "62.3% 0.214 259.815"), (600, "54.6% 0.245 262.881"), (800, "42.4% 0.199 265.638")],
    "violet": [(500, "60.6% 0.25 292.717"), (600, "54.1% 0.281 293.009"), (800, "43.2% 0.232 292.759")],
    "purple": [(500, "62.7% 0.265 303.9"), (600, "55.8% 0.288 302.321"), (800, "43.8% 0.218 303.724")],
    "red": [(400, "70.4% 0.191 22.216"), (500, "63.7% 0.237 25.331"), (600, "57.7% 0.245 27.325"),
            (950, "25.8% 0.092 26.042")],
    "amber": [(400, "82.8% 0.189 84.429"), (500, "76.9% 0.188 70.08"), (600, "66.6% 0.179 58.318")],
    "emerald": [(400, "76.5% 0.177 163.223"), (500, "69.6% 0.17 162.48"), (600, "59.6% 0.145 163.225")],
}


def main():
    args = sys.argv[1:]
    if args and args[0] == "--scale":
        name = args[1]
        print("=== %s ===" % name)
        for step, spec in SCALES[name]:
            L, C, H = parse("oklch(%s)" % spec)[:3]
            print("  %s-%s: oklch(%s)  ->  %s" % (name, step, spec, to_hex(L, C, H)))
        return
    for a in args:
        L, C, H, alpha = parse(a)
        print("%s  ->  %s" % (a, to_hex(L, C, H)))


if __name__ == "__main__":
    main()
