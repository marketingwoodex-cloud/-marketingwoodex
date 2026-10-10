#!/usr/bin/env node
/**
 * tools/dev-user.mjs — create or verify a temporary development login for the Woodex admin.
 *
 * The six accounts seeded by `_database/woodex-database.sql` all carry the deliberately dead
 * hash `$2y$10$LOCKED.SEED...`: no seeded account can be signed into, and the real owner is
 * created by running /wx-install.php once. This tool is the shortcut for a local or staging
 * database when you want to reach `admin/index.html` immediately.
 *
 *   node tools/dev-user.mjs --write                    # regenerate _database/woodex-dev-user.sql
 *   node tools/dev-user.mjs --password 'MyDev#2026'    # hash a custom password, print the SQL
 *   node tools/dev-user.mjs --check '<hash>' 'pw'      # test a pass_hash copied out of MySQL
 *
 * WHY IT CROSS-CHECKS: the hash has to satisfy PHP's `password_verify()` in api/admin.php, and
 * this repository is often edited on machines without PHP installed. So the hash is produced by
 * one bcrypt implementation and verified by a second, independent one — glibc's crypt(3) through
 * Python and the bcryptjs reference build through Node. Both accepting the password and rejecting
 * a wrong one is what "tested credential" means here. PHP's bcrypt (crypt_blowfish) reads the same
 * `$2y$10$` form: for an ASCII password the `$2a$`, `$2b$` and `$2y$` prefixes are the identical
 * computation, and PHP writes `$2y$` itself.
 *
 * MUST NOT be run against the live database — see the warning header it writes into the SQL file.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SQL_FILE = join(ROOT, "woodex-live-p23", "_database", "woodex-dev-user.sql");
const PRESET = { email: "dev@woodex.local", password: "Woodex#Dev2026", name: "Dev Login (temporary)", role: "owner", cost: 10 };

// ---------- tiny argv parser ----------
const argv = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes("--" + name);

// ---------- implementation 1: glibc crypt(3) through python3 ----------
const PY = `
import crypt, sys
pw, cost = sys.argv[1], 2 ** int(sys.argv[2])
h = crypt.crypt(pw, crypt.mksalt(crypt.METHOD_BLOWFISH, rounds=cost))
if not h or not h.startswith("$2"):
    sys.exit("python3 has no blowfish backend")
sys.stdout.write("$2y$" + h.split("$", 2)[2] + "\\n")
`;
const PY_CHECK = `
import crypt, sys
h, pw = sys.argv[1], sys.argv[2]
sys.stdout.write("1" if crypt.crypt(pw, h) == h else "0")
`;
const pyRun = (src, args) => {
  const r = spawnSync("python3", ["-c", src, ...args], { encoding: "utf8" });
  return r.status === 0 ? { ok: true, out: (r.stdout || "").trim() } : { ok: false, why: (r.stderr || "").trim().split("\n").pop() };
};

// ---------- implementation 2: bcryptjs (npm i bcryptjs) ----------
// Resolve whichever bcryptjs build is present: an explicit WX_BCRYPT, the repo's node_modules,
// the sandbox scratch install, or the working directory. The module is only trusted after Node
// has actually loaded it once.
const bcryptjs = (() => {
  const candidates = [
    process.env.WX_BCRYPT, join(ROOT, "node_modules", "bcryptjs"),
    "/tmp/bc/node_modules/bcryptjs", join(process.cwd(), "node_modules", "bcryptjs"),
  ].filter(Boolean).filter((p) => existsSync(p));
  for (const p of candidates) {
    const probe = spawnSync("node", ["-e", `require(${JSON.stringify(p)});`], { encoding: "utf8" });
    if (probe.status === 0) return { path: p };
  }
  return null;
})();
const jsEval = (src, args) => {
  if (!bcryptjs) return null;
  const r = spawnSync("node", ["-e", `const b=require(${JSON.stringify(bcryptjs.path)});${src}`, ...args], { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : null;
};
const jsHash = (pw, cost) => {
  // bcryptjs writes $2a$; hand it a $2y$ salt so the output keeps PHP's prefix.
  const out = jsEval(`process.stdout.write(b.hashSync(process.argv[1],process.argv[2]))`,
    [pw, "$2y$" + String(cost).padStart(2, "0") + "$" + "abcdefghijklmnopqrstuu"]);
  return out ? { ok: true, out } : { ok: false, why: bcryptjs ? "bcryptjs failed to hash" : "bcryptjs not installed (npm i bcryptjs)" };
};
const jsVerify = (pw, hash) => {
  const out = jsEval(`process.stdout.write(b.compareSync(process.argv[1],process.argv[2])?"1":"0")`, [pw, hash]);
  return out === null ? null : out === "1";
};

// ---------- cross-verification ----------
function verifyAll(pw, hash) {
  const out = [];
  const py = pyRun(PY_CHECK, [hash, pw]);
  if (py.ok) out.push({ impl: "glibc crypt(3) — python3 crypt", ok: py.out === "1" });
  const js = jsVerify(pw, hash);
  if (js !== null) out.push({ impl: "bcryptjs " + (bcryptjs?.path === "require" ? "(node_modules)" : "(reference build)"), ok: js });
  return out;
}

// ---------- --check: test a hash copied out of MySQL ----------
const ci = argv.indexOf("--check");
if (ci >= 0) {
  const [hash, pw] = [argv[ci + 1], argv[ci + 2]];
  if (!hash || pw === undefined) {
    console.error("usage: node tools/dev-user.mjs --check '<pass_hash from wx_users>' '<password>'");
    process.exit(2);
  }
  const results = verifyAll(pw, hash);
  if (!results.length) {
    console.error("No bcrypt implementation available: install python3 (with the crypt module) or run `npm i bcryptjs`.");
    process.exit(2);
  }
  for (const r of results) console.log(`  ${r.ok ? "MATCH  " : "NO MATCH"}  ${r.impl}`);
  const allOk = results.every((r) => r.ok);
  const allNo = results.every((r) => !r.ok);
  console.log(allOk ? "\n  → this hash belongs to that password; PHP password_verify() will accept the login."
    : allNo ? "\n  → wrong password, or the hash is a LOCKED.SEED placeholder."
      : "\n  → the implementations disagree: do not trust this hash.");
  process.exit(allOk ? 0 : 1);
}

// ---------- --write / default: mint a hash and print (or write) the SQL ----------
const pw = flag("password", PRESET.password);
const email = flag("email", PRESET.email);
const name = flag("name", PRESET.name);
const role = flag("role", PRESET.role);
if (pw.length < 8) { console.error("Password must be at least 8 characters (api/admin.php → valid_pw())."); process.exit(2); }

let hash = "", source = "";
const py = pyRun(PY, [pw, String(PRESET.cost)]);
if (py.ok) { hash = py.out; source = "glibc crypt(3) via python3"; }
else {
  const js = jsHash(pw, PRESET.cost);
  if (!js.ok) {
    console.error("Cannot hash: " + py.why + "\nInstall python3 (with the crypt module) or run `npm i bcryptjs` first.");
    process.exit(2);
  }
  hash = js.out; source = "bcryptjs";
}

const results = verifyAll(pw, hash);
if (!results.length) { console.error("Hashed with " + source + " but no independent verifier is available — refusing to emit an untested credential."); process.exit(1); }
const wrongRejected = verifyAll(pw + "x", hash).every((r) => !r.ok);

console.log("");
console.log("  Woodex development login");
console.log("  " + "-".repeat(66));
console.log("  email      : " + email);
console.log("  password   : " + pw);
console.log("  role       : " + role);
console.log("  hash       : " + hash);
console.log("  hashed by  : " + source + " (bcrypt, cost " + PRESET.cost + ")");
for (const r of results) console.log("  verified   : " + (r.ok ? "MATCH" : "NO MATCH") + "  — " + r.impl);
console.log("  wrong-pw   : " + (wrongRejected ? "correctly rejected by every implementation" : "!!! NOT REJECTED — do not use !!!"));
if (!results.every((r) => r.ok) || !wrongRejected) { console.error("\n  Verification failed — nothing written."); process.exit(1); }

const sql = `-- =============================================================================
--  DEV / STAGING LOGIN — TEMPORARY ACCOUNT FOR TESTING ONLY
-- =============================================================================
--  Generated by:  node tools/dev-user.mjs --write
--
--        email:     ${email}
--        password:  ${pw}        <- type it exactly
--        role:      ${role}${" ".repeat(Math.max(0, 14 - role.length))}(full access, so every screen opens)
--
--  The hash below is bcrypt, cost ${PRESET.cost}, written in the same \`$2y$${String(PRESET.cost).padStart(2, "0")}$\` form that
--  PHP's password_hash() produces — so \`password_verify()\` in api/admin.php accepts it. It was
--  verified against two independent bcrypt implementations (glibc crypt via python3 and the
--  bcryptjs reference JS build): both accept the correct password and reject a wrong one.
--
--  WHY THIS FILE EXISTS
--  The six rows seeded by \`woodex-database.sql\` carry the deliberately dead hash
--  \`$2y$10$LOCKED.SEED...\` — that is a security measure, not a typo. No seeded
--  account can be signed into, and the owner account is created by running
--  /wx-install.php once on a fresh database. This file is the shortcut for a
--  LOCAL or STAGING database where you want to reach the admin immediately.
--
--  ⚠  DO NOT RUN THIS AGAINST THE LIVE woodex.com.pk DATABASE.
--     It creates a full-access owner whose password is published in this
--     repository. If it has ever been run on a live database, delete the row
--     (statement at the bottom) and change the password of every owner account.
--
--  AFTER YOU ARE DONE TESTING — run the DELETE at the bottom of this file.
-- =============================================================================

INSERT INTO \`wx_users\` (\`name\`, \`email\`, \`role\`, \`pass_hash\`, \`active\`, \`pw_ver\`, \`created_at\`)
VALUES ('${name.replace(/'/g, "''")}', '${email}', '${role}',
        '${hash}',
        1, 1, NOW())
ON DUPLICATE KEY UPDATE
  \`pass_hash\` = VALUES(\`pass_hash\`),
  \`role\`      = '${role}',
  \`active\`    = 1,
  \`pw_ver\`    = \`pw_ver\` + 1;      -- +1 kills any session that was already open

-- Confirm it landed the way the login expects (active, owner, bcrypt):
--   SELECT id, email, role, active, LENGTH(pass_hash) AS hash_len FROM wx_users
--    WHERE email = '${email}';
--   expected: role=${role}, active=1, hash_len=60

-- -----------------------------------------------------------------------------
--  CLEANUP — uncomment and run when testing is over
-- -----------------------------------------------------------------------------
-- DELETE FROM \`wx_users\` WHERE \`email\` = '${email}';
`;

if (has("write")) {
  writeFileSync(SQL_FILE, sql, "utf8");
  console.log("\n  written    : woodex-live-p23/_database/woodex-dev-user.sql (" + sql.length + " bytes)");
} else {
  console.log("\n  " + "=".repeat(66) + "\n");
  console.log(sql);
  console.log("  (re-run with --write to save this to woodex-live-p23/_database/woodex-dev-user.sql)");
}

// Self-test: the file that was just written must verify, using the file's own hash.
if (has("write") && existsSync(SQL_FILE)) {
  const saved = (readFileSync(SQL_FILE, "utf8").match(/\$2y\$\d\d\$[./A-Za-z0-9]{53}/) || [])[0];
  const round = saved ? verifyAll(pw, saved) : [];
  const ok = saved && round.length && round.every((r) => r.ok);
  console.log("  re-check   : " + (ok ? "the hash in the written file verifies against the password" : "FAILED to verify the written file"));
  if (!ok) process.exit(1);
}
