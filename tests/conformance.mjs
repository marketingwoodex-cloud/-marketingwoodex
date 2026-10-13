#!/usr/bin/env node
/**
 * tests/conformance.mjs — the checks that must pass before Phase 1 can be called done.
 *
 * Why this file exists rather than a promise: the Phase 1 gate in the master plan is "a signed-in
 * request round-trips cookie → CSRF → controller → MySQL → envelope; the eight Critical findings are
 * closed and verified". Half of that needs a live host. The other half is structural, and structure is
 * exactly what regresses silently — a route added without a permission check, a query built by string
 * concatenation, a cookie that loses its flags in a refactor.
 *
 * So this suite reads the source and asserts the invariants. It runs anywhere, in a second, and it is
 * wired into CI. Behavioural tests that need PHP + MySQL live in tests/run.php.
 *
 *   node tests/conformance.mjs            human output
 *   node tests/conformance.mjs --json     machine output (CI)
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const exists = (p) => existsSync(join(ROOT, p));

/**
 * Source with comments removed. Several checks below assert "this pattern is absent", and a comment
 * that *explains* the pattern is not a regression — without this, documenting a fix fails its own
 * test, and the pressure is to delete the explanation.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#(?!\[).*$/gm, "");
const readCode = (p) => stripComments(read(p));

let passed = 0;
const failures = [];
const notes = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error("assertion returned false");
    if (typeof result === "string") notes.push(`${name}: ${result}`);
    passed += 1;
  } catch (err) {
    failures.push(`${name} — ${err.message}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const assertEq = (a, b, msg) => { if (a !== b) throw new Error(`${msg} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`); };

/* ============================================================== 1. route integrity */

const router = read("api/v2/lib/router.php");
const routeFiles = readdirSync(join(ROOT, "api/v2/routes")).filter((f) => f.endsWith(".php"));

/** Parse the route table literal out of router.php: ['GET', 'leads/{id}', 'leads', 'wx_route_leads_get', 'get_lead'] */
function parseRoutes() {
  const body = router.slice(router.indexOf("$routes = ["), router.indexOf("];", router.indexOf("$routes = [")));
  const routes = [];
  for (const m of body.matchAll(/\[\s*'([A-Z]+)',\s*'([^']+)',\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(null|'[a-z_0-9]+')\s*\]/g)) {
    routes.push({ method: m[1], pattern: m[2], file: m[3], fn: m[4], action: m[5] === "null" ? null : m[5].slice(1, -1) });
  }
  return routes;
}
const routes = parseRoutes();

check("router declares routes", () => assert(routes.length >= 15, `only ${routes.length} routes parsed`));

check("every route file exists", () => {
  for (const r of routes) {
    assert(exists(`api/v2/routes/${r.file}.php`), `route ${r.method} /${r.pattern} names missing file routes/${r.file}.php`);
  }
});

check("every route handler is declared in its file", () => {
  for (const r of routes) {
    const src = read(`api/v2/routes/${r.file}.php`);
    assert(new RegExp(`function\\s+${r.fn}\\s*\\(`).test(src), `routes/${r.file}.php has no function ${r.fn}`);
  }
});

/* Public by design: health probes and the sign-in endpoints. Everything else must authenticate. */
const PUBLIC_ROUTES = new Set(["health", "version", "auth/login", "auth/login/2fa", "auth/logout"]);

check("every non-public handler enforces authentication", () => {
  for (const r of routes) {
    if (PUBLIC_ROUTES.has(r.pattern)) continue;
    const src = read(`api/v2/routes/${r.file}.php`);
    // The handler body, from its declaration to the next top-level function.
    const start = src.indexOf(`function ${r.fn}(`);
    const rest = src.slice(start + 10);
    const nextFn = rest.search(/\nfunction\s/);
    const body = nextFn === -1 ? rest : rest.slice(0, nextFn);
    assert(
      /wx_require_user\s*\(/.test(body) || /wx_current_user\s*\(/.test(body),
      `${r.fn} (${r.method} /${r.pattern}) never calls wx_require_user()`,
    );
  }
});

check("every route's permission action exists in the generated alias table", () => {
  const aliases = read("api/v2/aliases.php");
  const missing = [];
  for (const r of routes) {
    if (r.action === null) continue;
    if (!aliases.includes(`'${r.action}' =>`)) missing.push(`${r.action} (${r.pattern})`);
  }
  assertEq(missing.length, 0, `permission keys that no v2.1 action matches — these would fail closed and lock users out: ${missing.join(", ")}`);
});

/* ============================================================== 2. envelope discipline */

const libs = readdirSync(join(ROOT, "api/v2/lib")).filter((f) => f.endsWith(".php"));

check("only the front controller and http.php may write output", () => {
  const offenders = [];
  const files = [...routeFiles.map((f) => `api/v2/routes/${f}`), ...libs.map((f) => `api/v2/lib/${f}`), "api/v2/index.php"];
  for (const f of files) {
    const src = read(f);
    // `echo`, `print`, `printf`, `var_dump` — anything that could corrupt the JSON body.
    const echoes = [...src.matchAll(/^\s*(echo|print|printf|var_dump|print_r)\b/gm)];
    if (!echoes.length) continue;
    // The two allowed places: http.php's wx_respond (the single exit point) and index.php's
    // shutdown guard, which runs only when the normal path is already broken.
    if (f === "api/v2/lib/http.php" || f === "api/v2/index.php") continue;
    offenders.push(`${f} (${echoes.length}×)`);
  }
  assertEq(offenders.length, 0, `output outside the envelope: ${offenders.join(", ")}`);
});

check("no PHP warnings can leak into a response body", () => {
  assert(/ini_set\('display_errors',\s*'0'\)/.test(read("api/v2/index.php")), "index.php must force display_errors off");
  assert(/ob_start\(\)/.test(read("api/v2/index.php")), "index.php must buffer output so a stray notice cannot corrupt JSON");
  assert(/while\s*\(ob_get_level\(\)\s*>\s*0\)/.test(read("api/v2/lib/http.php")), "wx_respond must discard buffered output");
});

check("the front controller catches everything, not just PDOException", () => {
  const src = read("api/v2/index.php");
  assert(/catch\s*\(Throwable/.test(src), "index.php has no catch (Throwable) — an unexpected error would be a blank 500");
  assert(/register_shutdown_function/.test(src), "a fatal error mid-request would bypass try/catch; the shutdown guard is required");
});

check("error codes are the closed set", () => {
  const errors = read("api/v2/lib/errors.php");
  const declared = errors.match(/WX_ERROR_CODES\s*=\s*\[([^\]]*)\]/)[1].match(/'([A-Z_]+)'/g).map((s) => s.slice(1, -1)).sort();
  assertEq(declared.join(","), "AUTH,CONFLICT,FORBIDDEN,INTERNAL,NOT_FOUND,RATE_LIMIT,UPSTREAM,VALIDATION", "the closed set changed");

  // No file may invent a code that is not in the set.
  const bad = [];
  for (const f of [...libs.map((x) => `api/v2/lib/${x}`), ...routeFiles.map((x) => `api/v2/routes/${x}`)]) {
    for (const m of read(f).matchAll(/new\s+(?:Api)?Error\w*\(\s*'([A-Z_]+)'/g)) {
      if (!declared.includes(m[1])) bad.push(`${f}: ${m[1]}`);
    }
    for (const m of read(f).matchAll(/ApiError::[a-z]+\(/g)) {
      /* named constructors are checked by construction — they pass a literal above */
      void m;
    }
  }
  assertEq(bad.length, 0, `codes outside the closed set: ${bad.join(", ")}`);
});

check("an unknown error code cannot become a ninth code", () => {
  assert(/!in_array\(\$code,\s*WX_ERROR_CODES,\s*true\)/.test(read("api/v2/lib/errors.php")), "ApiError must coerce an unknown code to INTERNAL");
});

check("request ids are validated when supplied by a client", () => {
  const http = read("api/v2/lib/http.php");
  assert(/preg_match\('~\^r_\[a-f0-9\]\{6,16\}\$~',\s*\$given\)/.test(http), "a client-supplied request-id must match the format before being trusted");
});

/* ============================================================== 3. session & CSRF */

const httpSrc = read("api/v2/lib/http.php");
const authSrc = read("api/v2/lib/auth.php");

check("the session cookie is HttpOnly + Secure + SameSite", () => {
  assert(/'httponly'\s*=>\s*(true|\$httpOnly)/.test(httpSrc), "session cookie must be HttpOnly");
  assert(/'samesite'\s*=>\s*'Lax'/.test(httpSrc), "session cookie must be SameSite=Lax");
  assert(/wx_is_https\(\)/.test(httpSrc), "Secure must be derived from the request scheme, defaulting on");
});

check("the session cookie value is never stored in the database", () => {
  assert(/hash\('sha256',\s*\$sid\)/.test(authSrc), "sessions must be keyed by sha256 of the cookie, not the cookie");
  assert(/preg_match\('~\^\[a-f0-9\]\{64\}\$~'/.test(authSrc), "the cookie must be format-checked before use");
});

check("CSRF is required for every unsafe method", () => {
  assert(/if\s*\(\$m === 'GET' \|\| \$m === 'HEAD' \|\| \$m === 'OPTIONS'\)/.test(authSrc), "GET/HEAD/OPTIONS must be the only token-free methods");
  assert(/wx_csrf_ok_for_method\(\)/.test(authSrc), "wx_require_user must apply the CSRF check");
  assert(/hash_equals\(\(string\) \$row\['csrf_hash'\]/.test(authSrc), "the CSRF token must be compared with hash_equals against the session row");
});

check("sessions die when the password changes", () => {
  assert(/\$u\['pw_ver'\] !== \(int\) \$row\['pw_ver'\]/.test(authSrc), "a stale pw_ver must invalidate the session");
  assert(/password_needs_rehash/.test(authSrc), "password hashes must be upgraded on login");
});

check("the application secret is stored with a checksum", () => {
  assert(/wx_secrets/.test(authSrc), "the secret must live in wx_secrets");
  assert(/checksum/.test(authSrc) && /hash\('sha256', \$stored\)/.test(authSrc), "the checksum must be verified on read");
  assert(/secret_checksum_mismatch/.test(authSrc), "a mismatch must be audited as a Critical event, not silently regenerated");
});

check("login is throttled per account as well as per IP", () => {
  assert(/wx_login_locked/.test(authSrc) && /wx_login_attempts/.test(authSrc), "per-account lockout is missing");
  assert(/wx_throttle/.test(authSrc), "the v2.1 IP throttle must be retained");
});

check("sign-in does not reveal whether an account exists", () => {
  const login = authSrc.slice(authSrc.indexOf("function wx_login("), authSrc.indexOf("function wx_login_finish("));
  assert(/throw ApiError::auth\('Email or password is not correct'\)/.test(login), "wrong email and wrong password must give the same answer");
});

check("the no-CORS decision is explicit", () => {
  const all = [...routeFiles.map((f) => `api/v2/routes/${f}`), ...libs.map((f) => `api/v2/lib/${f}`), "api/v2/index.php"].map(read).join("\n");
  assert(!/Access-Control-Allow-Origin/.test(all), "the API is same-origin; no Access-Control-Allow-Origin may be emitted");
  assert(!/Access-Control-Allow-Credentials/.test(all), "credentials must never be CORS-enabled");
});

/* ============================================================== 4. data access */

const dbSrc = read("api/v2/lib/db.php");

check("UPDATE cannot run without a WHERE clause", () => {
  assert(/function wx_update\(string \$table, array \$set, array \$where\)/.test(dbSrc), "wx_update must require a where map");
  assert(/if \(!\$set \|\| !\$where\)/.test(dbSrc), "wx_update must refuse an empty where map");
});

check("no query is built by interpolating a variable into SQL", () => {
  const files = [...libs.map((f) => `api/v2/lib/${f}`), ...routeFiles.map((f) => `api/v2/routes/${f}`)];
  const bad = [];
  for (const f of files) {
    const src = read(f);
    // wx_q/wx_all/wx_one/wx_val with a double-quoted SQL string containing $… — the shape that
    // invites injection. Single-quoted strings with concatenation of *literal* identifiers are fine
    // and are checked separately below.
    for (const m of src.matchAll(/wx_(?:q|all|one|val|count)\(\s*"([^"]*\$[^"]*)"/g)) {
      bad.push(`${f}: ${m[1].slice(0, 60)}`);
    }
  }
  assertEq(bad.length, 0, `interpolated SQL: ${bad.join(" | ")}`);
});

check("table names in generated SQL come from a whitelist, not from input", () => {
  // wx_insert/wx_update take a table name; the only callers are the routes, which pass literals.
  const bad = [];
  for (const f of routeFiles.map((x) => `api/v2/routes/${x}`)) {
    for (const m of read(f).matchAll(/wx_(?:insert|update)\(\s*\$([a-z_]+)/g)) {
      bad.push(`${f}: table name from $${m[1]}`);
    }
  }
  assertEq(bad.length, 0, bad.join(", "));
});

check("JSON stores are written atomically", () => {
  const store = read("api/v2/lib/store.php");
  assert(/rename\(\$tmp, \$this->file\)/.test(store), "a store write must rename a temp file over the target");
  assert(/flock\(\$fh, \$how\)/.test(store) && /LOCK_EX/.test(store), "writes must take an exclusive lock");
  assert(/fsync/.test(store), "the temp file should be flushed to disk before the rename");
  assert(/damaged/.test(store), "a corrupt store must raise, not decode to an empty array");
});

check("the non-atomic v2.1 write pattern is gone", () => {
  const files = [...libs.map((f) => `api/v2/lib/${f}`), ...routeFiles.map((f) => `api/v2/routes/${f}`), "api/v2/index.php"];
  const bad = files.filter((f) => /file_put_contents\([^)]*LOCK_EX/.test(read(f)));
  assertEq(bad.length, 0, `file_put_contents(…, LOCK_EX) is not atomic: ${bad.join(", ")}`);
});

check("every write is audited", () => {
  const missing = [];
  for (const f of routeFiles.map((x) => `api/v2/routes/${x}`)) {
    const src = read(f);
    if (/-save|-delete|_save|_delete|_add|revoke|password|logout/.test(src) === false) continue;
    const handlers = [...src.matchAll(/function\s+(wx_route_\w+)\(/g)].map((m) => m[1]);
    for (const h of handlers) {
      const body = src.slice(src.indexOf(`function ${h}(`));
      const end = body.indexOf("\nfunction ", 10);
      const chunk = end === -1 ? body : body.slice(0, end);
      if (/wx_(insert|update|q)\(/.test(chunk) && !/wx_audit\(/.test(chunk)) missing.push(h);
    }
  }
  assertEq(missing.length, 0, `handlers that write without auditing: ${missing.join(", ")}`);
});

/* ============================================================== 5. migrations */

const migrationDir = join(ROOT, "db/migrations");
const migrations = readdirSync(migrationDir).filter((f) => f.endsWith(".sql")).sort();

check("migrations 000–005 are present", () => {
  const nums = migrations.map((f) => f.slice(0, 3));
  for (const n of ["000", "001", "002", "003", "004", "005"]) {
    assert(nums.includes(n), `migration ${n} is missing`);
  }
  assertEq(nums.join(","), nums.slice().sort().join(","), "migration files are not in ascending order");
});

check("every ALTER is guarded so a re-run cannot fail", () => {
  const unguarded = [];
  for (const f of migrations) {
    const src = read(`db/migrations/${f}`);
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (/^\s*ALTER TABLE/i.test(line)) {
        // A bare ALTER is only acceptable if the surrounding statement is a guarded PREPARE body,
        // which shows up as a quoted 'ALTER TABLE …' string inside the IF(…).
        unguarded.push(`${f}:${i + 1}`);
      }
    });
  }
  assertEq(unguarded.length, 0, `ALTER must be wrapped in the information_schema guard: ${unguarded.join(", ")}`);
});

check("001_roles.sql is generated, not hand-written", () => {
  const src = read("db/migrations/001_roles.sql");
  assert(/GENERATED FILE, DO NOT EDIT BY HAND/.test(src), "missing the generated-file header");
  assert(/node tools\/gen-caps\.mjs/.test(src), "missing the regeneration command");
});

check("the DDL guard pattern is the information_schema one", () => {
  for (const f of ["000_platform.sql", "002_indexes.sql", "003_document_columns.sql", "004_fk.sql"]) {
    const src = read(`db/migrations/${f}`);
    assert(/information_schema/.test(src), `${f} has no information_schema guard`);
    assert(/PREPARE stmt FROM @sql/.test(src), `${f} does not use the PREPARE guard`);
  }
});

check("migrations seed settings without overwriting operator values", () => {
  const src = read("db/migrations/005_settings_seed.sql");
  assert(/INSERT IGNORE INTO wx_settings/.test(src), "settings seeds must be INSERT IGNORE");
  assert(!/DELETE FROM wx_settings|UPDATE wx_settings/.test(src), "a seed must never reset a tuned value");
});

check("the runner supports a dry run and detects an edited migration", () => {
  const src = read("db/migrate.php");
  assert(/--dry-run/.test(src), "no dry-run flag");
  assert(/checksum/.test(src) && /hash_file\('sha256'/.test(src), "no per-file checksum");
  assert(/has changed since/.test(src), "editing an applied migration must be an error");
  assert(
    /!in_array\(PHP_SAPI, \['cli', 'phpdbg', 'wasm'\], true\)/.test(src),
    "the runner must refuse every SAPI except a command line (cli/phpdbg/wasm)",
  );
});

check("the runner does not pretend DDL is transactional", () => {
  const src = read("db/migrate.php");
  assert(/implicitly commits around DDL|implicit COMMIT/.test(src), "the reason for not wrapping DDL in a transaction should be stated");
});

/* ============================================================== 6. generated artefacts */

check("generated artefacts are up to date", () => {
  for (const [script, target] of [["tools/gen-aliases.mjs", "api/v2/aliases.php"], ["tools/gen-caps.mjs", "db/migrations/001_roles.sql"]]) {
    try {
      execFileSync("node", [script, "--check"], { cwd: ROOT, stdio: "pipe" });
    } catch (err) {
      throw new Error(`${target} is stale — run: node ${script} (${String(err.stdout || "").trim()})`);
    }
  }
});

/* ============================================================== 7. the eight Critical findings */

check("Critical 1 — no shared demo password in the tree", () => {
  const offenders = [];
  const scan = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir))) {
      if (["node_modules", ".git", "dist", "_private"].includes(entry)) continue;
      const rel = `${dir}/${entry}`;
      const s = statSync(join(ROOT, rel));
      if (s.isDirectory()) { scan(rel); continue; }
      if (!/\.(php|html|js|json|md)$/.test(entry)) continue;
      const src = readCode(rel);
      if (/Demo@Woodex2026/.test(src)) offenders.push(rel);
    }
  };
  scan("frontend-v1");
  assertEq(offenders.length, 0, `a hardcoded demo password is back in: ${offenders.join(", ")}`);
});

check("Critical 1 — the installer cannot seed a default login", () => {
  const src = read("frontend-v1/wx-install.php");
  assert(!/login created: admin \/ admin/i.test(src), "the admin/admin seeding branch is back");
  assert(!/password <code>admin<\/code>/.test(src), "the installer must not print a default credential");
  assert(/no longer creates a default login|no default password/i.test(src), "the refusal should say why");
});

check("Critical 1 — demo page never renders a stored credential", () => {
  const src = read("frontend-v1/wx-demo.php");
  assert(!/const DEMO_PASS/.test(src), "the shared password constant is back");
  assert(!/DEMO_PASS/.test(src), "the page still references a shared password");
  assert(/random_bytes\(12\)/.test(src), "the demo password must be random per run");
  assert(/shown once/.test(src), "the one-time display must be explained to the operator");
});

check("Critical 5 — no login pre-fill, no empty-password fallback", () => {
  const html = read("frontend-v1/admin/index.html");
  assert(!/id="l-pass"[^>]*value=/.test(html), "the login password field is pre-filled");
  assert(!/id="l-email"[^>]*value=[^>]/.test(html), "the login email field is pre-filled");
  const js = read("frontend-v1/admin/admin.js");
  assert(!/\$\("#l-pass"\)\.value\s*\|\|/.test(js), "an empty password silently becomes a default");
  assert(!/l-pass"\)\.value\s*=\s*["'][^"']+["']/.test(js), "the login handler writes a literal password");
});

check("Critical 6 — no admin sign-in hint in downloads", () => {
  assert(!exists("frontend-v1/downloads.html"), "downloads.html exists again and must be reviewed for sign-in hints");
});

check("Critical 7 — no secrets tracked in git", () => {
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n");
  const bad = tracked.filter((f) => /(^|\/)(\.env|config\.php)$/.test(f) || /_private\/(?!\.htaccess|db\.example\.json)/.test(f));
  assertEq(bad.length, 0, `tracked secrets: ${bad.join(", ")}`);
  const ignore = read(".gitignore");
  assert(/_private/.test(ignore), ".gitignore must exclude _private");
});

check("Critical 8 — private paths are denied by config", () => {
  assert(exists("frontend-v1/_private/.htaccess"), "_private/.htaccess is missing");
  const src = read("frontend-v1/_private/.htaccess");
  assert(/Require all denied|Deny from all/.test(src), "_private/.htaccess must deny access");
  assert(exists("api/v2/.htaccess"), "api/v2/.htaccess is missing");
});

/* ============================================================== 8. client */

const apiTs = readCode("admin-v25/src/lib/api.ts");

check("the client keeps the CSRF token out of web storage", () => {
  assert(!/localStorage/.test(apiTs), "the token must not be in localStorage — that is the v2.1 vulnerability");
  assert(!/sessionStorage/.test(apiTs), "the token must not be in sessionStorage — that is the v2.1 vulnerability");
  assert(/let csrfToken: string \| null = null/.test(apiTs), "the token should live in a module-scoped variable");
});

check("the client sends the CSRF header and same-origin credentials", () => {
  assert(/X-WX-CSRF["'\]]*\s*[:=]\s*csrfToken/.test(apiTs), "the CSRF header is not sent");
  assert(/credentials: "same-origin"/.test(apiTs), "cookie sessions need credentials on every request");
});

check("the client retries only safe methods", () => {
  assert(/method === "GET" \|\| method === "HEAD" \? MAX_RETRIES : 0/.test(apiTs), "a POST must never be retried automatically");
  assert(/RETRY_STATUSES = new Set\(\[502, 503, 504\]\)/.test(apiTs), "only gateway failures are retryable");
});

check("the client surfaces the request-id on every failure", () => {
  assert(/readonly requestId: string/.test(apiTs), "ApiFailure must carry the request-id");
  assert(/X-WX-Request-Id/.test(apiTs), "the request-id header must be read");
  assert(/TIMEOUT_MS/.test(apiTs) && /AbortController/.test(apiTs), "v2.1 had no timeout; the client must have one");
});

check("the client maps the closed error set", () => {
  const codes = apiTs.slice(apiTs.indexOf("export type ErrorCode"), apiTs.indexOf("export interface ApiMeta"));
  for (const c of ["AUTH", "FORBIDDEN", "VALIDATION", "NOT_FOUND", "CONFLICT", "RATE_LIMIT", "UPSTREAM", "INTERNAL"]) {
    assert(codes.includes(`"${c}"`), `error code ${c} is missing from the client union`);
  }
});

/* ============================================================== 9. legacy bridge */

const legacy = read("api/v2/routes/legacy.php");

check("the legacy bridge is an explicit allow-list", () => {
  assert(/function wx_legacy_bridged\(\)/.test(legacy), "the bridged actions must be an explicit list");
  assert(/Not served by api\/v2 yet/.test(legacy), "an unbridged action must say so rather than guess");
});

check("the legacy door returns the v2.1 shape, not the v2 envelope", () => {
  assert(/array_merge\(\['ok' => true\], \$payload/.test(legacy), "legacy responses must stay flat for old clients");
  assert(/'error' => \$e->getMessage\(\)/.test(legacy), "legacy clients render `error` as a string");
  const index = read("api/v2/index.php");
  assert(/wx_is_legacy_request\(\)/.test(index), "the front controller must branch on the legacy door");
});

/* ============================================================== report */

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ passed, failed: failures.length, failures, notes }, null, 2));
} else {
  for (const n of notes) console.log(`  · ${n}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`\n  ${passed} passed · ${failures.length} failed\n`);
}
process.exit(failures.length ? 1 : 0);
