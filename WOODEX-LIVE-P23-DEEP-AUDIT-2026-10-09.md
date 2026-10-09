# Woodex Live P23 "v2.5 Pro" Production Suite: Deep Audit

| | |
|---|---|
| Audit date | 2026-10-09 (UTC) |
| Target | `woodex-live-p23.zip` ("Woodex Live P23 Production Suite, v2.5 Pro") |
| Artifact SHA-256 | `595505d30f1a4cd6babc3d9ecaf28a5a6b20998aed2360ec1a6710ff7a725014` (28,650,149 bytes; 642 files; 43.0 MB uncompressed) |
| Git blob (branch `arena/8a776c65-marketingwoodex`) | `2d3c76d80f2e58d1b1a1ebe1c89d07120afa40c2`. This is the file the linked GitHub path serves. |
| Sibling compared for drift only | `woodex-live-P23.zip` (capital P), SHA-256 `831da4389563f382836dfa3c6e9b78dcc2960178376a76934b3ef3dd0705d94c` |
| Repository | `marketingwoodex-cloud/-marketingwoodex`. **Public** (unauthenticated GitHub API: `private: false`). |
| Report branch | `arena/9adcf885-marketingwoodex` (base `main` 782b50b) |
| Secrets in this report | Masked. Key names, counts, line numbers and hash prefixes only. No values, hashes, tokens, session IDs, or personal data are reproduced. |

Severity scale: **Critical** = exposes live credentials or customer data, enables account takeover with little effort, or takes the public site down on deploy. **High** = significant exposure or a broken admin/public path; fix before any release. **Medium** = weakens defences or hurts SEO, performance or release control. **Low** = hygiene. **Info** = observations and controls that work.

---

## 1. Verdict

**Not ready to deploy. Do not upload `woodex-live-p23.zip` to hosting.**

- **Security: Critical.** Staff login material and production customer and lead data are committed to a public repository. The shared staff password appears in the admin page's HTML, is pre-filled by sign-in buttons in the live-state copy, and is written into a public download page. Treat staff credentials as compromised until they are rotated.
- **Availability: Critical for this artifact.** `index.php` and `config.php` contain unresolved merge-conflict markers and fail to parse. The homepage would return HTTP 500, because `index.php` loads `config.php`. The admin shell script `admin/admin.js` also fails to parse.
- **The source tree is better than the zip.** The branch folder `p23-live/` has no merge markers and parses cleanly (46/46 PHP files, 86/86 JavaScript files). The zip was built from the older `frontend-v1/` staging tree. `p23-live/` still ships the same public installers, runtime data and shared-password references, so it is not release-ready either.

**Findings:** 4 Critical, 4 High, 11 Medium, 6 Low, 3 Info (28 in total). Section 5 lists them.

---

## 2. Do these first (today)

1. **Rotate credentials on the live site.** Reset every owner, admin and staff password, including the accounts pre-filled by `admin/admin.js`. End all sessions. Rotate the HMAC signing secret in `_private/config.json`, which invalidates every outstanding token. Confirm that no account still uses the documented default login (C-03).
2. **Delete from the live server:** `wx-install.php` (H-01), `wx-demo.php` (H-03), `wx-check.php` (M-02), the demo accounts on the `@demo.woodex.pk` domain, `_private/demo.json`, and `_private/dev-password.txt` if it exists. The SECURITY report lists that file, but it is in no artifact, so check the server directly.
3. **Unpublish the credential.** Remove the shared password from `admin/index.html` (lines 96, 108), `admin/admin.js` (lines 334, 344), `downloads.html` (line 70) and `woodex-database.sql` (line 273). Remove or gate `downloads.html` (C-01, H-04).
4. **Clean the repository.** Make the repo private, or purge `_private/`, `*.sql`, `*.zip`, `*.jsonl` and the password from git history with `git filter-repo` or BFG. Rotate anything found there, because clones and caches persist. Decide with counsel whether the customer and lead records trigger notification duties (C-02).
5. **Do not release this zip.** Rebuild from a reviewed tree that passes every gate in Section 8.

---

## 3. Scope and artifact identity

**Primary target:** `woodex-live-p23.zip`. The sandbox could not fetch the raw GitHub URL (TLS failure). The file was instead taken from the branch archive, and its git blob SHA was checked against the GitHub contents API (`2d3c76d8…`, 28,650,149 bytes). The bytes audited are therefore the bytes served for that path on the branch.

**Comparators (branch `arena/8a776c65-marketingwoodex`):**

| Path | Role in this audit |
|---|---|
| `woodex-live-P23/woodex-live-P23.zip` | Sibling, compared for drift |
| `p23-live/` | Live-state folder (645 files). Used to test whether the zip is a faithful copy. |
| `frontend-v1/` | Staging source. The zip's conflicted files are byte-identical to files here. |
| `woodex-master-P22/woodex-master-P22.1.zip`, `.2.zip` | Byte-identical to the primary artifact |
| `woodex-live-v3/woodex-master-production.zip` | Byte-identical to the sibling |
| Root reports `SECURITY-AUDIT-REPORT.md`, `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md`, `HOSTINGER-DEPLOYMENT-GUIDE.md` | Cross-checked in Section 7 |

**Timeline (from git metadata and file timestamps, UTC):**

| Time | Event |
|---|---|
| 11:27–11:42 | Commits `3eabd99` ("finalize production zip") and `638d536` ("add root index.php, config.php, .env") |
| 12:23:29–12:27:59 | Timestamps inside `_private/admin-db.json`. The data appears to be a production export from this window. |
| 12:25:36 | Commit `7ee38fb` ("…deploy woodex-live-p23.zip") commits the merge markers and the zip |
| 12:26:14 | Sign-in alert in `_private/outbox.jsonl` |
| 13:00:31 | Commit `f837ab9` rebuilds the zip, still with markers |
| 13:00:48 | Repository last pushed (GitHub API) |

---

## 4. Method and limits

Work was static and offline, except for read-only GitHub API calls. No request was sent to `woodex.com.pk`, and no account was used on any live system.

- **Parsing:** PHP 8.3.33 running as WebAssembly (`@php-wasm/node` 3.1.54), with `token_get_all` in `TOKEN_PARSE` mode across every PHP file. JavaScript was parsed with acorn 8 (`ecmaVersion: latest`, script then module).
- **Markup:** html-validate 8 with the recommended ruleset, run on 149 public HTML pages. Admin, builder, API, `_private`, `_database`, `_templates`, `assets` and vendor folders were excluded. Stylistic rules are counted but weighted lower.
- **Content and link checks:** a conflict-marker scan on all text files. Secret scans covered 14 pattern families (cloud and API key formats, private-key blocks, JWTs, database URLs, and password or secret assignments), followed by a literal search for each credential string found in the code. The pattern scan alone missed the shared password, because it was written as `.value = "…"`. A link checker covered 15,575 local references in HTML and CSS. SEO and accessibility checks covered all 149 public pages. Sitemap entries were resolved against the files.
- **Code review:** the authentication, authorisation, installer, backup and webhook code was read function by function, and the rest of each module was searched: `api/admin.php`, `api/security-lib.php`, `api/builder.php`, `api/media-lib.php`, `api/forms.php`, `api/chat.php`, `api/mcp.php`, `api/whatsapp.php`, `api/telegram.php`, `api/quote-view.php`, `api/redirects-lib.php`, `api/p18h-lib.php`, `api/content-lib.php`, `wx-install.php`, `wx-demo.php`, `wx-check.php`, root `.htaccess`, plus the SQL seeds.
- **Sink search:** `eval`, `exec`, `system`, `unserialize`, `create_function`, `include`/`require` of user input, `base64_decode` on input, and `DELETE FROM` built from a variable.
- **Password check:** `password_verify()` was run offline, inside the sandbox, against the hash shipped in the repository's own SQL seed. No live hash was tested. The purpose was to establish whether the documented default login is real.
- **Identity and drift:** SHA-256 per path across zip and folder copies; git blob SHAs; GitHub commit metadata.

---

## 5. Findings at a glance

| ID | Severity | Finding | Primary location |
|---|---|---|---|
| C-01 | **Critical** | Shared staff password published in the repo, in the admin page HTML and scripts, and on a public download page | `admin/index.html:96,108`; `admin/admin.js:334,344`; `downloads.html:70`; `woodex-database.sql:273` |
| C-02 | **Critical** | Production customer and lead data, password hashes and session records committed to a public repository | `_private/admin-db.json`; `_private/outbox.jsonl`; `_private/system.json`; `woodex-database.sql` |
| C-03 | **Critical** | Documented default owner login (username and password both the word `admin`) is valid in the shipped seed; a re-import resets owner passwords | `_database/woodex-v20.sql:51`; `woodex-database.sql`; `wx-install.php:44,69` |
| C-04 | **Critical** | Merge-conflict markers in `index.php`, `config.php`, `.env` and the Google verification file. Homepage and config fail (deploy blocker). | `index.php:3–60`; `config.php:3–88`; `.env:1–29`; `google0b104c3cfb7a4943.html:1–5` |
| H-01 | High | Public installer and first-run setup have no gate until the site is configured | `wx-install.php:15–50`; `api/admin.php:336–360` |
| H-02 | High | Admin shell script `admin/admin.js` does not parse, so the admin UI does not start | `admin/admin.js:284–289` |
| H-03 | High | `wx-demo.php` prints the demo password and can recreate owner-role demo accounts with an empty-password bypass | `wx-demo.php:10,12,22–24,38–45,63–64` |
| H-04 | High | Public download page links the sensitive package and gives master-login instructions; utility pages are in the sitemap | `downloads.html:8,42,58,70`; `sitemap.xml:14,23` |
| M-01 | Medium | Unauthenticated `cron` GET runs publishing, backups and booking reminders | `api/admin.php:255–256` |
| M-02 | Medium | `wx-check.php` discloses database name and user, user counts, and error logs | `wx-check.php:9,19–20,29,39–41` |
| M-03 | Medium | Latent `require` of an unvalidated `/api/` path in `index.php` (not reachable with current rewrites) | `index.php:11–14` |
| M-04 | Medium | Backup archives contain the server HMAC secret and the database password | `api/media-lib.php:60–62` |
| M-05 | Medium | Staff names, company e-mail addresses and phone numbers are hard-coded in client-side JavaScript | `admin/admin-users.js:41–48` |
| M-06 | Medium | Every public page links to a different company domain (`woodexfurniture.pk`), 439 times | Navigation and footer across public pages |
| M-07 | Medium | SEO and indexing defects: canonical and description gaps, dev pages indexed, broken references, a dead sitemap URL | See Section 6 |
| M-08 | Medium | Performance: 43 MB payload, 695 KB stylesheet, oversized images, duplicate originals | `assets/site-p21.css`; `assets/img/_orig/` |
| M-09 | Medium | Release identity and drift: "P22" zips are the P23 build, one "zip" is a RAR archive, and copies disagree | `woodex-master-P22/*.zip`; `deploy/woodex-26.zip` |
| M-10 | Medium | Hardening gaps: per-IP-only throttling, API tokens accepted in the URL, no CSP, version header, short password minimum | `api/admin.php` throttle; `api/mcp.php:34`; `.htaccess:31–35`; `index.php:50` |
| M-11 | Medium | Existing branch audit reports certify this build; their key claims are not supported | Root reports (Section 7) |
| L-01 | Low | Accessibility and markup defects (5,674 html-validate messages across 149 pages) | Public pages |
| L-02 | Low | 64 forms have an empty `action` and rely on JavaScript to submit | Public pages |
| L-03 | Low | Maintenance bypass token stored in `_private/system.json`; it becomes a live bypass when maintenance is enabled | `_private/system.json`; `api/p18h-lib.php:17–18,35` |
| L-04 | Low | Configuration inconsistencies: JSON and MySQL storage models, duplicate constants and keys, unused JSON database | `config.php`; `.env`; `_private/admin-db.json` |
| L-05 | Low | Duplicate binaries and SQL dumps shipped | `assets/img/_orig/`; root and `_database/` SQL |
| L-06 | Low | A restored backup can write redirect rules into `.htaccess` without re-validation (owner-only path) | `api/redirects-lib.php:61–75`; `api/media-lib.php:77–85` |
| I-01 | Info | Evidence of a past spam compromise; current public pages are clean | `.htaccess` managed block |
| I-02 | Info | No third-party API keys or private keys in the package | Secret scan |
| I-03 | Info | No dangerous PHP sinks; the one dynamic `DELETE FROM` is table-whitelisted | `api/media-lib.php:86–92` |

---

## 6. Findings in detail

### C-01: Shared staff password published (Critical)

**Evidence (zip, line numbers as in the file):**
- `admin/index.html:96` and `:108`: the literal is the **placeholder** text of the "Page-Builder Password" fields in the admin page's HTML. Anyone who views the page source can read it, and it shows in the field whenever that panel is visible.
- `admin/admin.js:334` and `:344`: two "social login" buttons pre-fill two staff e-mail addresses and this password into the sign-in form. In the zip the script does not parse (H-02), so these handlers do not run there. The equivalent handlers in `p23-live/admin/admin.js` (lines 332 and 342) do run, because that copy parses.
- `downloads.html:70`: tells visitors to sign in at `/admin/` as the Master Admin with the password.
- `woodex-database.sql:273`: comment "Password for all accounts: …".
- Repository-wide: the literal is in **89 text files** on branch `arena/8a776c65-marketingwoodex`, including `HOSTINGER-DEPLOYMENT-GUIDE.md` (13 times) and `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md` (6 times, Section 5, which lists six owner and staff logins). On `main` (base `782b50b`) it is in **64 tracked files**, including `GO-LIVE-AUDIT-REPORT.md` and `tools/**/*.mjs`.

**Impact:** Anyone can read the password. If any listed account still uses it, anyone can sign in with that role, including owner. Live use was not tested, by design, so assume it works until rotated.

**Fix:** Rotate every account that used it. Remove the literal from all files and from history. Remove the pre-fill code and the placeholders. Remove login instructions that contain credentials. Add a CI check that fails on the literal.

### C-02: Production data and credential material in a public repository (Critical)

**Evidence (counts and types only):**
- `_private/admin-db.json`: zip copy 9,136 bytes; `p23-live/` copy 28,532 bytes.
  - Zip copy: 6 user records (roles: two owners, admin, editor, sales, support), each with a password-hash field; 5 session records; 3 leads; 3 clients; 2 quotes; 1 invoice; 2 projects; 1 booking; an activity log that records client IP addresses.
  - `p23-live/` copy: 8 user records (hash fields `pass_hash` and `pw_hash`), 16 session records, 5 leads, 1 client.
- `_private/outbox.jsonl`: a sign-in alert from 2026-10-09 12:26:14 UTC, containing an IP address and a browser string.
- `_private/system.json`: a maintenance bypass token (see L-03).
- `woodex-database.sql` and `_database/woodex-database.sql` (identical): 6 `wx_users` rows and 5 `wx_clients` rows (names, phone numbers, e-mail addresses, addresses). The client rows look like sample data, but confirm.
- Timestamps inside the files (12:23–12:28 UTC today) suggest production exports rather than test data.

**Mitigating factors:** no PHP file in the zip reads `admin-db.json`, and login sessions are kept in `_private/security.json`, which is not in the artifact. That lowers the risk of direct session reuse. It does not reduce the risk from the password hashes, the personal data, or password reuse elsewhere.

**Fix:** As in Section 2. Move `_private/` runtime state out of version control. Add ignore rules for `_private/`, `*.sql`, `*.zip` and `*.jsonl`. Move deployable packages to release storage.

### C-03: Documented default owner login is valid in the seed data (Critical; verify on the live database today)

**Evidence:**
- `_database/woodex-v20.sql:51` inserts an owner account with a bcrypt hash, followed by `ON DUPLICATE KEY UPDATE pass=…, role='owner', active=1`. Re-importing the file resets the password of an existing account and promotes it to owner.
- `woodex-database.sql` seeds 6 `wx_users` rows (two owners, admin, editor, sales, support) that all share **one** bcrypt hash.
- Offline check, against that shipped hash only: the documented default login (the word `admin` as both username and password) **verifies**. The shared staff password from C-01 does **not** verify against it. The SQL comment at `woodex-database.sql:273` is therefore wrong about which password the seeded accounts use. Either way, both values are public.
- `wx-install.php:44` seeds that default on an empty user table, and `wx-install.php:69` prints it on success.

**Impact:** Any database built from these files (for example by importing the root `woodex-database.sql` through phpMyAdmin, which the file name invites) has a known owner account. Exploitation needs only the public default. Whether the live database has it is unknown.

**Fix:** Check the live user table today and reset any default account. Remove the seed passwords. Replace the seed with a one-time setup code. Remove the `ON DUPLICATE KEY` clause. Remove the root SQL dump from the package.

### C-04: Merge conflicts in entry points break the site (Critical; deploy blocker)

**Evidence:**
- `index.php`: conflict markers at lines 3, 15, 32, 37, 45, 60. The parse error is at line 15, so the homepage would return HTTP 500 through `ErrorDocument 500 /500.html` (`.htaccess:46`). `DirectoryIndex index.php index.html` (`.htaccess:5`) means `index.html` is never reached.
- `config.php`: markers at 3, 37 and 88; parse error at 37. `includes/config.php` requires `../config.php` and is broken as well, but nothing else in the zip loads it. Both halves define `SITE_URL` and `DB_HOST`. The database password is set to an empty string at line 54 and in the constant block at 65–68.
- `.env`: markers at 1, 9 and 29. Keys are repeated (`APP_NAME`, `APP_ENV`, `APP_DEBUG`, `APP_URL`) with different values in each block. `DB_PASSWORD` is empty (line 23).
- `google0b104c3cfb7a4943.html`: markers at 1, 3 and 5. This is the Google Search Console verification file, so verification will fail, and the file has no `<title>` and no `lang` attribute.
- **Origin:** commit `7ee38fb` (2026-10-09 12:25:36 UTC) committed these files with unresolved conflict markers. The marker text quotes commit `d21c542`, which is not present on GitHub, so the conflict probably came from a rebase or cherry-pick on another machine. The four files in the zip are byte-identical to `frontend-v1/index.php`, `config.php`, `.env` and `google…html` on the branch. The branch-root `index.php`, `config.php` and `.env` have no markers, and neither does `p23-live/`.
- Parse results: PHP 8.3 fails on 2 of 47 files (`config.php:37`, `index.php:15`). Corrected trees parse 46/46 (`p23-live/`).

**Fix:** Resolve each conflict. In `index.php`, keep the maintenance branch and drop the `/api/` dispatch (M-03). Remove duplicate constants. Restore the verification file to its single line. Rebuild the zip from the clean tree and re-run the Section 8 gates.

### H-01: Public installer and first-run setup have no gate (High)

**Evidence:**
- `wx-install.php:15–21`: POST is accepted unless the installer's failed-attempt lock is active. The only check (line 21) applies when `_private/db.json` exists with a non-empty `pass`. If `db.json` is missing, or its `pass` is empty, there is no check at all.
- Lines 16–18: the caller supplies the database host, name, user and password, and the owner name, e-mail and password. Line 35 runs the schema SQL, line 42 creates the owner, line 44 seeds the default login (C-03), and line 50 writes `_private/db.json`. The site is then pointed at the supplied database.
- `api/admin.php` `case 'setup'` (lines 336–360) has the same first-run window. It accepts any database details and creates an owner until `db.json` exists and a builder password is set.
- The package contains `_private/db.example.json` but not `_private/db.json`, so a fresh deployment of this zip starts in the open state.

**Impact:** Until setup is completed, anyone can create the owner account and point the site at a database they control. Full takeover requires the server to reach a MySQL host that the attacker runs. Whether Hostinger allows outbound MySQL from PHP was not verified. If it does, this becomes Critical. Even if it does not, anyone can overwrite the database configuration.

**Fix:** Remove `wx-install.php`. Require a one-time setup secret that is shown only to the operator. Refuse setup whenever a user row or `db.json` already exists.

### H-02: Admin shell script does not parse (High)

**Evidence:** `admin/admin.js:284–289`. Lines 284–285 and 291–292 repeat the same two `oninput` assignments. Lines 286–287 contain an orphaned ternary fragment (`? '<svg …' : '<svg …'`) left over from a password-visibility change. Acorn reports `Unexpected token` at 286:8. A parse error stops the entire script from running, so the admin sign-in logic never starts, even though `admin/index.html` loads the file. The `p23-live/` copy has the intended block (`eye.innerHTML = …`, lines 277–283) and parses.

**Fix:** Restore the `p23-live/` block. Add a parse gate to the release process.

### H-03: `wx-demo.php` publishes the demo password and can recreate owner demo accounts (High)

**Evidence:**
- `wx-demo.php:10` defines a constant demo password (the literal is not reproduced here). Lines 63–64 print that password, together with four demo accounts, to **every** visitor whenever `_private/db.json` exists, whether or not the demo is active.
- Line 12 gives the first demo account the `owner` role.
- Creation and reset (lines 22–45) are gated only by `hash_equals($db['pass'], $_POST['dbpass'])` (line 24). If `db.json` has an empty `pass`, an empty POST passes. Anyone can then recreate the owner demo accounts with the public password for seven days (lines 38–45 write `demo.json` with `until`).
- Mitigations observed: `api/admin.php:88–90` (`demo_expired()`) blocks sign-in for `@demo.woodex.pk` accounts after `until`. The page itself says "delete this file when you are done".

**Fix:** Delete the file. Never publish credentials in HTML. Remove the demo role from production.

### H-04: Public download page distributes the sensitive package (High)

**Evidence:** `downloads.html:42` links to the GitHub "raw" path for `woodex-master-P22.1.zip`, and `:58` to the one for `woodex-live-p23.zip`. Both sit on a feature branch. Those packages contain C-01, C-02 and C-04. Line 70 gives master-login instructions. Line 8 references `/admin-v3/v3.css`, which is not in the package. `sitemap.xml:23` lists `downloads.html`, and `sitemap.xml:14` lists `blocks.html`, a developer catalog page.

**Fix:** Remove the page, or put it behind sign-in. Never link deployment artifacts from the public site.

### M-01: Unauthenticated `cron` trigger (Medium)

**Evidence:** `api/admin.php:255–256`. GET is accepted for `cron`, and no secret is checked. The action runs `cms_tick()` (publishes scheduled pages), `a7_backup_auto()` (writes backup archives) and `bk_remind()` (sends booking reminders). Anyone can trigger these jobs at any time.

**Fix:** Require a secret token, or allow only CLI or cron invocation. Refuse GET.

### M-02: `wx-check.php` discloses server and database details (Medium)

**Evidence:** `wx-check.php:19–20` shows the database name and user to any visitor. Line 29 shows the number of users and owners. Lines 39–41 show error-log tails to anyone when `db.json` is absent. Line 9 lets anyone POST to delete the file itself.

**Fix:** Delete the file (see Section 2).

### M-03: Latent `require` of an unvalidated path in `index.php` (Medium; High if routing changes)

**Evidence:** `index.php:11–14` (HEAD side of the conflict). For any request whose path starts with `/api/`, the code runs `require __DIR__ . $uri` with no check for `..` segments. With the current `.htaccess`, that branch is not reachable: `/api/*` files are served directly, and there is no front-controller rewrite. Any future rewrite that sends requests to `index.php`, or any change in path normalisation, would expose arbitrary PHP execution and file disclosure.

**Fix:** Delete the branch when resolving C-04.

### M-04: Backup archives contain secrets (Medium)

**Evidence:** `api/media-lib.php:60–62` adds every top-level file in `_private/` to each backup, except the backup folders. Those files include `config.json` (the HMAC signing secret), `db.json` (the database password) and `security.json` (sessions). Backups are stored in `_private/backups/`, which `.htaccess` blocks, and owner-only download is enforced (`media-lib.php:319–325`).

**Impact:** A backup file that leaks gives an attacker the signing secret and database password together.

**Fix:** Exclude `config.json`, `db.json` and `security.json` from backups, or encrypt backups with a key that is not on the same server.

### M-05: Staff personal data in client-side JavaScript (Medium)

**Evidence:** `admin/admin-users.js:41–48` (the comment on line 41 calls it a "fallback"). The file holds a hard-coded team list with names, company e-mail addresses and phone numbers. Every visitor receives it.

**Fix:** Remove the fallback. Load team data only from the authenticated API.

### M-06: Public pages link to a different company domain (Medium; confirm intent)

**Evidence:** `https://woodexfurniture.pk` appears in 439 `href` attributes across 145 of the 149 public pages, with anchor text such as "Woodex Furniture™", "Furniture Design" and "Explore furniture". All 142 canonical links point to `woodex.com.pk`, and none point elsewhere.

**Impact:** If this is an intentional sister-brand link, it should be documented. If not, it sends link equity away from the site and muddles the brand.

**Fix:** Confirm with the business owner, then keep or remove.

### M-07: SEO and indexing defects (Medium)

- Seven public pages have no `<link rel="canonical">`: `404.html`, `500.html`, `503.html`, `blocks.html`, `coming-soon.html`, `downloads.html` and the Google verification file.
- Four pages have no meta description: `blocks.html`, `coming-soon.html`, `downloads.html` and the verification file.
- `blocks.html` is a developer catalog ("Woodex v3 — Master Template Blocks Catalog") with two `<h1>` elements, and `downloads.html` has none. Both are public and both are in `sitemap.xml` (lines 14, 23).
- `sitemap.xml:147` lists `https://woodex.com.pk/woodex-live-v3/`, which is not in the package.
- Broken references: `/admin-v3/` (`blocks.html:28–29`) and `/admin-v3/v3.css` (`downloads.html:8`).
- The verification file is corrupt (C-04).
- Working correctly: no duplicate titles or descriptions; every image has `alt`; JSON-LD parses; no `http://` links; `robots.txt` is sensible; 144 of 145 sitemap URLs resolve.

**Fix:** Add canonicals and descriptions. Mark or remove developer pages and drop them from the sitemap. Fix or remove the broken references.

### M-08: Payload and performance (Medium)

- Total 43.0 MB uncompressed. Images are 55% (23.75 MB across 289 files). HTML is 12.8 MB across 153 files, about 84 KB per page on average.
- `assets/site-p21.css` is 695 KB, with 7,893 rules and 368 `!important` declarations.
- The largest photo is 623 KB (`assets/img/img-469cf01b2548.jpg`). Several WebP files are 250–365 KB.
- Nine original images are duplicated in `assets/img/_orig/`, about 1.47 MB of duplicate bytes across the package.
- Admin-only vendor files are large: `admin/vendor/html2pdf.bundle.min.js` (885 KB) and `builder/vendor/icons.json` (551 KB).

**Fix:** Serve responsive image sizes. Split and minify the stylesheet. Drop `_orig/` from the public package. Lazy-load the admin vendor bundles.

### M-09: Release identity and drift (Medium)

- `woodex-master-P22/woodex-master-P22.1.zip` and `.2.zip` are byte-identical to the P23 artifact (`595505d3…`). The "P22" downloads therefore contain the P23 build, markers included.
- `woodex-live-v3/woodex-master-production.zip` is byte-identical to the sibling `woodex-live-P23.zip` (`831da438…`).
- `deploy/woodex-26.zip` on `main` is a RAR archive with a `.zip` name. It fails to open as ZIP.
- The zip and `p23-live/` disagree: 642 versus 645 files; 11 shared paths differ, including `index.php`, `config.php`, `.env`, `admin/admin.js`, `admin/index.html`, `sitemap.xml` and `_private/admin-db.json`; 8 runtime files exist only in `p23-live/`; 5 files (including two SQL dumps, `includes/config.php`, `css/style.css` and `js/main.js`) exist only in the zip.
- The admin title in the branch copies (`p23-live/`, `p22-preview/`, `woodex-vlive-P20/`) reads "Woodex Admin v2.5 Pro.5 Pro". The zip's own title is correct.

**Fix:** Publish a release manifest with hashes for each package, and name each artifact after its build. Build packages only from the reviewed tree.

### M-10: Hardening gaps (Medium)

- **Throttling:** per IP only (8 failures in 10 minutes, `api/admin.php` `throttle()`). There is no per-account lockout, so distributed guessing is not limited.
- **Password policy:** minimum 8 characters, with no breached-password or complexity check (`valid_pw()`).
- **Tokens in URLs:** `api/mcp.php:34` accepts the API token as `?key=`. Query strings reach server logs and referrers.
- **CORS:** `api/mcp.php:17` sends `Access-Control-Allow-Origin: *`. Impact is low, because the endpoint authenticates with a bearer token rather than cookies.
- **No Content-Security-Policy.** `.htaccess:31–35` sets HSTS, nosniff, frame options, referrer and permissions policies, but no CSP.
- **Version disclosure:** `index.php:50` sends `X-Powered-By: Woodex-Engine/2.5`.

**Fix:** Add per-account lockout and a breached-password check. Remove `?key=`. Add a CSP in report-only mode first. Remove the version header.

### M-11: Existing branch audit reports certify a release that fails (Medium)

The two root reports (`SECURITY-AUDIT-REPORT.md` and `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md`) grade this build "Pass" or "Production Certified". Several of their claims are contradicted by the artifact. Section 7 lists them one by one. The governance problem is that the reports hash nothing, name nothing exactly, and one of them publishes the shared password.

**Fix:** Require each audit to name the exact artifact and hash, and to attach the gate output from Section 8.

### L-01: Accessibility and markup defects (Low)

html-validate ran on 149 public pages and reported 5,674 messages.
- Mostly stylistic: `void-style` (4,003, self-closing `<meta/>`), `tel-non-breaking` (843, phone numbers without non-breaking spaces).
- Accessibility: `wcag/h63` (211 `<th>` without `scope`), `aria-label-misuse` (185), `prefer-native-element` (167), `no-implicit-button-type` (55, buttons that default to submit inside forms), `no-implicit-input-type` (69), `unique-landmark` (49), `hidden-focusable` (10, `aria-hidden` on focusable elements).
- Structure: `element-permitted-content` (8, `<figcaption>` outside `<figure>`). Three pages have an `<h1>` count other than one.

**Fix:** Fix the accessibility rules first. Batch the stylistic ones.

### L-02: Forms depend on JavaScript (Low)

Sixty-four forms have an empty `action` and rely on `assets/site.js` to submit (`site.js:250–252` rewrites `/api/contact` to `/api/forms.php`). Without JavaScript the forms do nothing.

**Fix:** Give each form a real `action` as a fallback.

### L-03: Maintenance bypass token at rest (Low)

`_private/system.json` holds the maintenance token. When maintenance is switched on, the module writes a cookie-based bypass rule (`wx_mt`, `api/p18h-lib.php:35`) into the managed `.htaccess` block (module header, lines 4 and 21). Maintenance is currently off, so no bypass rule is in the root `.htaccess`. The impact is limited to bypassing a maintenance page.

**Fix:** Rotate the token (Section 2). Keep it out of the repository.

### L-04: Configuration inconsistencies (Low)

- `config.php` sets `DB_DRIVER` to `json` ("Default JSON storage active") but the admin code uses MySQL only.
- `_private/admin-db.json` is read by no code in the artifact (see C-02).
- `.env` repeats its keys (C-04).
- `config.php` defines constants twice (C-04).

**Fix:** Pick one storage model and delete the other paths.

### L-05: Duplicate binaries and SQL dumps (Low)

About 1.47 MB of duplicate bytes: `assets/img/_orig/` copies of images, and the root `woodex-database.sql` duplicated in `_database/`. `_templates/chat-bot-answers.json` is identical to `api/chat-rules.json`.

**Fix:** Keep one copy of each file, and keep the SQL dumps out of the public package.

### L-06: Restore can write redirect rules without re-validation (Low; owner-only)

`api/redirects-lib.php:30–35` validates redirect input when it is saved, and the validation rejects whitespace and newlines (so direct injection is closed). `rd_lines()` (lines 61–75) builds `.htaccess` from the stored file without re-validating it. An owner who restores a backup containing a crafted `_private/redirects.json` can therefore inject Apache directives. `a7_restore_blocked()` (`api/media-lib.php:77–85`) does not block that file.

**Fix:** Re-validate in `rd_lines()`, and add `redirects.json` to the restore blocklist or validate it on restore.

### I-01: Past spam incident (Info)

The `.htaccess` managed block contains 12 `410 Gone` rules. One is a conditional rule for spam URLs (casino, gokkasten, gokautomat, blackjack, roulette, free-spins and a spam product pattern). The other 11 match spam pages and WordPress probe paths. This indicates an earlier compromise. The current public pages contain no spam or injected content: a whole-word scan found the terms only inside the redirect blocklists.

### I-02: No third-party secrets in the package (Info)

The scan covered 14 key, token and credential patterns and found no cloud, payment, chat or API keys, and no private-key blocks. `api/cacert.pem` contains 145 CA certificates and no private keys.

### I-03: No dangerous sinks (Info)

No `eval`, `exec`, `system`, `unserialize`, `create_function`, or include or require of user input was found in PHP. The dynamic `DELETE FROM` at `api/media-lib.php:92` is built from a table name that must match `^wx_[a-z0-9_]+$` and an existing table (`a7_db_restore`, lines 86–92). It is therefore not injectable.

---

## 7. Cross-check of existing branch audit reports

Verdicts: **Confirmed**, **Partly**, **Contradicted**, **Unverified** (needs a live test) or **Not found**.

### 7.1 `SECURITY-AUDIT-REPORT.md` (root, dated 2026-10-09, "Woodex Live P23 Security Audit Report")

| Claim | Verdict | Evidence |
|---|---|---|
| "Pass" on every endpoint and asset; the build is "hardened" | **Contradicted** | C-01 to C-04, H-01 and H-02 |
| "All 147 public pages, 65 admin modules, 40 PHP backend APIs" | **Partly** | 149 public HTML pages (153 in total); 61 admin JavaScript modules, not 65; 40 API PHP files (correct) |
| Endpoint table sizes: `admin.css` 158,695 B; `admin/index.html` 15,651 B; `index.html` 131,133 B; `admin-sales17.js` 43,367 B | **Not reproducible** | The zip has 163,957 / 13,683 / 130,672 / 43,434 B. `p23-live/` has 163,603 / 16,195 / 130,672 / 43,434 B. Matches: `admin-lib26.js` (15,898 B), `builder/index.html` (16,419 B) and `vendor/icons.js` (15,036 B, which is `admin/vendor/icons.js`). The report probably describes a different build or the live server. |
| GSC verification file "200 OK, 54 bytes, Pass" | **Partly** | True for the `p23-live/` copy (54 bytes). The zip's copy is corrupt (C-04). |
| "Admin authentication: pre-hashed PBKDF2/SHA-256 credentials" | **Contradicted** | The code uses `password_verify()` (bcrypt). PBKDF2 does not appear in the code. The seed hash verifies the default login (C-03). |
| "CSRF protection: dynamic HMAC builder tokens" | **Partly** | HMAC builder tokens exist (`api/builder.php:60–73`). Admin authentication uses custom request headers rather than cookies, which avoids classic CSRF. |
| "`_private/`, `_database/`, `_templates/` enforce Require all denied" | **Confirmed** | Each folder has its own `.htaccess`. Root `.htaccess:21–22` and `:26–28` add rules. |
| "Data storage includes `_private/dev-password.txt`" | **Not found** | The file is not in the zip, `p23-live/` or the branch. If it exists on the live server it must be deleted (Section 2). |
| Master package "woodex-live-p23.zip (27.28 MB)" | **Contradicted** | 27.28 MiB matches the sibling `woodex-live-P23.zip` (28,603,819 bytes). The linked file is 28,650,149 bytes (27.32 MiB). The report most likely describes the sibling, not the linked file. |
| "19/19 public and admin endpoints verified" | **Unverified** | No test artifacts exist in the branch. A live run is needed. |
| "Direct HTTPS download links and verified admin credentials" | **Contradicted** | The report publishes the shared password (C-01) and links the sensitive package (H-04). |

### 7.2 `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md` (root, dated 2026-10-09, "99.4 / 100, Production Certified")

| Claim | Verdict | Evidence |
|---|---|---|
| "Overall health 99.4 / 100, Production Certified" | **Contradicted** | Deploy blockers C-04 and H-02 |
| "153 HTML pages" | **Confirmed** | 153 HTML files |
| "0 missing images, 0 broken internal routes" | **Partly** | No missing images. Two broken `/admin-v3/` references (M-07) and one dead sitemap URL |
| "61 JavaScript modules pass `node --check`" | **Partly** | 61 admin modules, correct count. `admin.js` fails (H-02). All pass in `p23-live/`. |
| "Scrypt and bcrypt dual hashing (`pass_hash` / `pw_hash`)" | **Contradicted** | No PHP file verifies scrypt or reads `pw_hash`. `pw_hash` appears only in the `p23-live/` copy of `admin-db.json`, which no code reads. |
| "WCAG AAA compliance verified" | **Unverified / Contradicted** | Contrast was not measured here. html-validate reports accessibility defects (L-01). |
| "20 / 20 API endpoints returned 200 OK" | **Unverified** | Requires a live server. Nothing in the branch supports it. |
| "1-click demo role auto-provision" | **Contradicted (as a security feature)** | The buttons pre-fill the shared password (C-01). The demo accounts can be recreated by a public script (H-03). |
| "Downloads updated to direct GitHub links" | **Contradicted** | Distributes C-02 data and C-01 instructions (H-04) |
| Section 5 "verified working 1-click credentials" for six owner and staff accounts | **Contradicted, Critical** | Publishes the shared password (C-01). Must be removed and rotated. Also, the seed hash in the same repository does not verify that password (C-03). |
| "Full repository snapshot" download | **Contradicted** | The snapshot includes C-02 data and C-01 credentials |
| "Telegram and WhatsApp webhooks authenticate correctly" | **Confirmed** | Telegram secret compared with `hash_equals` (`api/telegram.php:17`). WhatsApp HMAC required and fail-closed (`api/whatsapp.php:25–27`). |

### 7.3 Other reports

- **`HOSTINGER-DEPLOYMENT-GUIDE.md`** (branch root): contains three conflict-marker lines and the shared password 13 times. Its instructions would send staff to a broken build with a published credential.
- **`woodex-live-v3/WOODEX-COMPLETE-PROJECT-AUDIT-REPORT.md` and `WOODEX-FULL-PROJECT-DEEP-AUDIT-REPORT.md`** (dated 2026-10-08, different target, "Admin v2"): out of scope and not checked line by line. One confirms that `.htaccess` blocks `_private/`, which is correct. The other describes passwords as scrypt-hashed, which the current PHP code does not implement.
- **`GO-LIVE-AUDIT-REPORT.md`** (on `main`): contains the shared password (C-01).

---

## 8. Gates before any re-release

Do not release until every gate passes, and record the output in the release notes.

1. **Conflict markers:** `git grep -nE '^(<<<<<<<|=======|>>>>>>>)'` returns nothing across the tree.
2. **PHP parse:** zero failures for every `.php` file, including the root `index.php`, `config.php` and `includes/config.php`.
3. **JavaScript parse:** zero failures for every `.js` file (acorn with `ecmaVersion: latest`, or `node --check`).
4. **Markup:** zero parser errors in html-validate. No `element-permitted-content` or `wcag/*` errors. Stylistic rules reviewed.
5. **Links:** zero broken local references in HTML and CSS. Every sitemap entry resolves. No noindex, utility or developer pages in the sitemap.
6. **Secrets:** zero matches for the shared-password literal and for the 14 secret-pattern families. `api/cacert.pem` still contains only CA certificates.
7. **Package contents:** no `_private/` data other than `.htaccess` and `db.example.json`. No `*.sql`, `*.zip`, `*.jsonl`, `wx-install.php`, `wx-demo.php` or `wx-check.php`. No `_orig/` folder. No duplicate binaries.
8. **Authentication:** `cron` requires a secret. `index.php` has no `/api/` dispatch. No demo role, or demo role disabled.
9. **Release record:** SHA-256, byte size and build commit recorded, and the artifact name matches its contents.
10. **After deploy (run by the site owner):** `/` returns 200 with homepage HTML. `/admin/` loads without script errors. `/api/admin.php` with `action: status` reports `needsSetup: false`. `/wx-install.php`, `/wx-demo.php` and `/wx-check.php` return 404. `/_private/`, `/config.php`, `/.env` and `/woodex-database.sql` are not downloadable.

---

## 9. What is working well

- **Passwords:** stored with `password_hash` (bcrypt) and checked with `password_verify`, both at sign-in and on password change (`api/admin.php`).
- **Tokens:** HMAC-signed with a server-side secret, bound to the user, the password version and the session ID. Sessions can be revoked remotely.
- **Two-factor:** TOTP with replay protection (`api/security-lib.php`). New-device sign-in alerts by e-mail.
- **Password reset:** single use (bound to the current password hash and version), one-hour expiry, and a neutral response that does not reveal whether an account exists (`api/admin.php` `pw_forgot`, `pw_reset`).
- **Brute force:** per-IP throttle with a delay on each failure.
- **Role control:** only an owner can create or edit an owner. The last active owner is protected (`api/admin.php:415`). Backup download, database export and import are owner-only. Restores skip code, secrets and configuration, and keep the user table (`api/media-lib.php:77–92`).
- **Public forms:** honeypot field, rate limit (5 per 10 minutes per IP), and auto-reply throttle (`api/forms.php`). Chat has per-IP limits and a 2,000-character cap (`api/chat.php:29`).
- **Webhooks:** WhatsApp HMAC required and fail-closed. Telegram secret compared in constant time.
- **Quotation links:** 128-bit HMAC tokens compared with `hash_equals` (`api/quote-view.php:17–21`).
- **Page builder:** session-bound tokens, strict page-path pattern, `..` rejected, `realpath` checked (`api/builder.php:124–131`).
- **Redirect input:** regex validation that rejects whitespace and newlines (`api/redirects-lib.php:30–35`).
- **Admin rendering:** an `esc()` helper escapes `& < > " '` on data fields. Client rows were checked by hand.
- **`.htaccess`:** denies `_private/`, dot-files, `.sql`, `.env`, `.md`, `.log`, `*-lib.php`, `router.php`, `chat-rules.json`, `redirect-plan.json`. Sets `Options -Indexes` and HSTS, nosniff, frame and referrer policies. The uploads folder has PHP execution disabled.
- **Public pages:** no spam or injection signatures, `alt` on every image, JSON-LD parses, no insecure links, unique titles and descriptions.

---

## 10. Limitations and unverified items

- **No live testing.** No HTTP request was sent to `woodex.com.pk`, and no login, database or browser test was run. Statements about the live site are inferences from the artifact and its timestamps. Items marked Unverified need a live check.
- **PHP version.** Parsing used PHP 8.3. Hostinger may run 7.4 or 8.2. The parse failures in C-04 are syntax errors that fail on every version. Compatibility with 7.4 was not tested.
- **Markup rules.** html-validate's recommended ruleset includes stylistic checks. Counts measure volume, not severity.
- **Performance and SEO.** Static analysis only. No crawl, rendering, Lighthouse run or Core Web Vitals measurement.
- **Passwords.** The only hash checked was the one shipped in the repository, and it was checked offline. No live hash or account was tested.
- **Code coverage.** The authentication, authorisation, installer, backup and webhook functions were read directly. Other `api/*-lib.php` modules were searched for dangerous patterns rather than read line by line. The 461 `innerHTML` sinks in admin and builder JavaScript were scanned by pattern: 299 have an escape helper within seven lines, 161 concatenate no data field, and one flagged line was a false positive. Client-row rendering was reviewed by hand; the rest was not reviewed line by line. The page builder's HTML sanitiser and the approval workflow were reviewed in outline only.
- **Live data.** Whether the live database holds the default login, the shared password, or the exported customer data was not checked. Items C-01 and C-03 depend on this and must be checked on the live system.
- **Not in scope:** the v3 admin, `woodex-admin-v3.zip`, and the older `deploy/` packages were searched for the critical patterns, not audited.

---

## Appendix A: Inventory

**Primary artifact** (642 files, 43.0 MB uncompressed):

| Type | Files | Size | Notes |
|---|---|---|---|
| Images (webp, jpg, png, gif, svg, ico) | 289 | 23.75 MB | 55% of payload |
| HTML | 153 | 12.84 MB | About 84 KB per page on average |
| JavaScript | 87 | 3.25 MB | Includes 885 KB and 551 KB vendor bundles |
| CSS | 9 | 1.02 MB | `site-p21.css` is 695 KB |
| PHP | 47 | 0.71 MB | 40 in `api/` |
| JSON | 11 | 0.66 MB | |
| Fonts (woff2) | 28 | 0.47 MB | |
| Certificates | 1 | 0.22 MB | `api/cacert.pem`, 145 CA certificates, 0 private keys |
| Configuration | 6 | 0.01 MB | Five `.htaccess` files and `.env` |
| SQL | 3 | 0.03 MB | Root dump, `_database/` dump, `_database/woodex-v20.sql` |

**Public pages audited:** 149 (excludes admin, builder, api, `_private`, `_database`, `_templates`, `assets` and vendor folders).

**Link check:** 15,575 local references in HTML and CSS. Two distinct broken targets, both `/admin-v3/` assets. No broken images.

**Largest files:** `admin/vendor/html2pdf.bundle.min.js` 885 KB; `assets/site-p21.css` 695 KB; `assets/img/img-469cf01b2548.jpg` 623 KB (duplicated in `_orig/`); `builder/vendor/icons.json` 551 KB; several WebP files of 250–365 KB.

**Duplicates:** 10 groups, 11 extra copies, about 1.47 MB.

---

## Appendix B: Artifact identity and comparisons

| Artifact | SHA-256 (prefix) | Bytes | Files | Merge-marker files | PHP parse OK | JS parse OK | Notes |
|---|---|---|---|---|---|---|---|
| `woodex-live-p23.zip` (audited) | `595505d30f1a4cd6` | 28,650,149 | 642 | 4 | 45 / 47 | 86 / 87 | Identical to `woodex-master-P22.1.zip` and `.2.zip` |
| `woodex-live-P23.zip` (sibling) | `831da4389563f382` | 28,603,819 | 633 | 0 | 44 / 44 | 85 / 85 | Identical to `woodex-live-v3/woodex-master-production.zip` |
| `p23-live/` (branch folder) | n/a | n/a | 645 | 0 | 46 / 46 | 86 / 86 | Live-state mirror with 8 runtime files not in the zip |
| `woodex-vlive-P20/woodex-v20-master.zip` | `26f85af0fe272443` | 28,552,257 | n/a | n/a | n/a | n/a | Older release, not audited in depth |

**Merge-marker files in the zip:** `index.php`, `config.php`, `.env`, `google0b104c3cfb7a4943.html`.

**Shared password literal:** present in 5 files of the zip (`admin/admin.js`, `admin/index.html`, `downloads.html`, `woodex-database.sql`, `_database/woodex-database.sql`). Also present in the sibling's `admin.js`, `admin/index.html` and `downloads.html`.

**Git blob SHA of the audited file:** `2d3c76d80f2e58d1b1a1ebe1c89d07120afa40c2`. Sibling: `944c383129d271c79cfb1406ff7aff358fa40328`.
