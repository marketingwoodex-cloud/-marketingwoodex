#!/usr/bin/env python3
"""Secret + dangerous-PHP scan over a release tree (default: extracted P22 zip).
Usage: python3 p22re-secrets.py [dir]   (default dir = woodex-master-P22/extracted)"""
import os, re, sys, json

ROOT = sys.argv[1] if len(sys.argv) > 1 else "woodex-master-P22/extracted"
SKIP_DIRS = {"node_modules"}
SECRET_PATTERNS = {
    "GitHub token (ghp_/gho_/ghs_/github_pat_)": re.compile(r"\b(ghp|gho_|ghs|github_pat)_[A-Za-z0-9_]{20,}"),
    "OpenAI key (sk-)": re.compile(r"\bsk-[A-Za-z0-9]{20,}"),
    "AWS access key (AKIA)": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "Meta/Facebook token (EAAB)": re.compile(r"\bEAAB[A-Za-z0-9]{20,}"),
    "Telegram bot token": re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{35}\b"),
    "Google API key (AIza)": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "Slack token (xox)": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),
    "Private key block": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "JWT": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "Generic api_key assignment": re.compile(r"(?i)(api[_-]?key|apikey|secret|token|password|passwd)\s*[\"']?\s*[:=]\s*[\"']([A-Za-z0-9/+_\-]{16,})[\"']"),
}
DANGEROUS = {
    "eval(": re.compile(r"\beval\s*\("),
    "assert(": re.compile(r"\bassert\s*\("),
    "shell_exec(": re.compile(r"\bshell_exec\s*\("),
    "exec(": re.compile(r"\bexec\s*\("),
    "system(": re.compile(r"\bsystem\s*\("),
    "passthru(": re.compile(r"\bpassthru\s*\("),
    "proc_open(": re.compile(r"\bproc_open\s*\("),
    "popen(": re.compile(r"\bpopen\s*\("),
    "unserialize(": re.compile(r"\bunserialize\s*\("),
    "preg_replace /e": re.compile(r"preg_replace\s*\(\s*[\"'][^\"']*['\"]\s*[\"'][a-zA-Z]*e[a-zA-Z]*['\"]"),
    "create_function(": re.compile(r"\bcreate_function\s*\("),
    "extract(": re.compile(r"\bextract\s*\("),
    "$$ variable vars": re.compile(r"\$\$"),
}
# Files that legitimately contain these words in docs/comments
DOC_EXT = {".md", ".txt", ".json", ".sql"}
BINARY_OK = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff2", ".woff", ".ttf", ".pdf", ".zip", ".ico", ".br")

hits, dhits, files = [], [], 0
for dp, dns, fns in os.walk(ROOT):
    dns[:] = [d for d in dns if d not in SKIP_DIRS]
    for fn in fns:
        p = os.path.join(dp, fn)
        ext = os.path.splitext(fn)[1].lower()
        if ext in BINARY_OK:
            continue
        files += 1
        rel = os.path.relpath(p, ROOT)
        try:
            txt = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        for name, rx in SECRET_PATTERNS.items():
            for m in rx.finditer(txt):
                # ignore obvious placeholders / docs
                frag = m.group(0)
                ctx = txt[max(0, m.start() - 60):m.end() + 20].replace("\n", " ")
                if re.search(r"(?i)(example|placeholder|your[_-]|xxx|changeme|dummy|sample|<|MY-KEY)", ctx):
                    continue
                hits.append((name, rel, ctx[:110]))
        if ext == ".php":
            for name, rx in DANGEROUS.items():
                for m in rx.finditer(txt):
                    line = txt[:m.start()].count("\n") + 1
                    ctx = txt.splitlines()[line - 1].strip()[:110] if line - 1 < len(txt.splitlines()) else ""
                    dhits.append((name, rel, f"L{line}: {ctx}"))

print(f"files scanned: {files}")
print(f"\n=== POSSIBLE SECRETS: {len(hits)} ===")
for n, f, c in hits[:40]:
    print(f"  [{n}] {f}\n      …{c}…")
if not hits:
    print("  none")
print(f"\n=== DANGEROUS PHP CONSTRUCTS: {len(dhits)} ===")
for n, f, c in dhits[:40]:
    print(f"  [{n}] {f} {c}")
if not dhits:
    print("  none")
