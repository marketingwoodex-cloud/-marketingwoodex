#!/usr/bin/env python3
"""Boolean-only check: does the shared admin literal match any committed $2y$ hash?
Reads the literal from the tracked admin JS at runtime; never prints it or any hash.
Controls: a freshly generated bcrypt hash of a random string must verify (positive),
and a random wrong string must not (negative). Prints counts and booleans only."""
import re, sys, crypt, secrets, string, warnings, pathlib
warnings.filterwarnings("ignore", category=DeprecationWarning)
root = pathlib.Path(sys.argv[1])
src = (root / "admin/admin.js").read_text(errors="replace").splitlines()[234]
m = re.search(r'"([^"]{8,})"', src)
if not m:
    sys.exit("literal not located on expected line")
literal = m.group(1)
dumps = [root / "woodex-database.sql", root / "_database/woodex-database.sql", root / "_database/woodex-v20.sql"]
hash_re = re.compile(r"\$2y\$10\$[./A-Za-z0-9]{53}")
def ok(pw, h):
    return crypt.crypt(pw, h) == h
print(f"literal located: True (length {len(literal)}; value not printed)")
for d in dumps:
    occ = hash_re.findall(d.read_text(errors="replace")) if d.exists() else []
    distinct = sorted(set(occ))
    hits = sum(ok(literal, h) for h in distinct)
    print(f"{d.relative_to(root)}: bcrypt occurrences={len(occ)} distinct={len(distinct)} distinct_matching_literal={hits}")
rnd = "".join(secrets.choice(string.ascii_letters) for _ in range(20))
ctrl = crypt.crypt(rnd, crypt.mksalt(crypt.METHOD_BLOWFISH))
print("control positive (generated hash verifies correct string):", ok(rnd, ctrl))
print("control negative (wrong string rejected):", not ok(rnd + "x", ctrl))
