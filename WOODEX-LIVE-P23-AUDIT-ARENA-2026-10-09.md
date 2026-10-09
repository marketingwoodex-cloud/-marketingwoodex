# Woodex Live P23 — Deep Audit Report

> **Companion report on this branch:** `WOODEX-LIVE-P23-DEEP-AUDIT-2026-10-09.md` (commit `73f3002`) audits the same zip (same SHA-256). This report was produced independently. §10 cross-checks the two, lists where they differ, and notes which items were verified here.

**Date:** 2026-10-09 (Asia/Karachi) · **Target:** `woodex-live-P23/woodex-live-p23.zip` · **Source:** branch `arena/8a776c65-marketingwoodex` (HEAD `01506bac`) · **Scope:** full package audit, including the "Woodex Admin v2.5 Pro" console at `/admin/`

---

## ⛔ Verdict: NOT READY — do not upload or publish this package

The package has **4 P0 blockers**:

1. The homepage cannot run (merge-conflict markers in `index.php` and `config.php`).
2. The admin console cannot load, so nobody can sign in (JavaScript syntax error).
3. Default and published credentials are in the files, including seeded owner accounts.
4. The repository that hosts the package is **public** and contains operational data and secrets.

| Severity | Count | Summary |
|---|---|---|
| 🔴 P0 Blocker | 4 | Conflict markers break the homepage · admin JS fails to parse · default credentials published and seeded · private data in a public repo |
| 🟠 P1 High | 6 | Installer and diagnostic scripts public · unauthenticated cron · builder first-run window · hard-coded team roster and missing endpoints · leftover pages publish credentials · 145 pages link to a second domain |
| 🟡 P2 Medium | 9 | No CSP · forgot-password reveals admins · tokens in URLs · unused and duplicate files · near-duplicate zips · heavy CSS and images · inconsistent contact and analytics settings · backups contain the signing secret and DB password · latent `require` in `index.php` |
| 🟢 P3 Low | 6 | Auth status text · builder SSRF rebinding · dead sitemap URL · SEO gaps · header hygiene · download page accuracy |

**What is solid:** authentication primitives, webhook verification, the public enquiry form defences, builder path and code guards, most of `.htaccess`, link integrity (3 broken of 21,531 references), and the metadata on public pages (see §7).

---

## 1. Scope, sources and assumptions

- **Target:** `woodex-live-P23/woodex-live-p23.zip` (lowercase, as linked). 807 entries (642 files, 165 folders), 28,650,149 bytes, SHA-256 `595505d30f1a4cd6babc3d9ecaf28a5a6b20998aed2360ec1a6710ff7a725014`. ZIP integrity test passed.
- **Comparison set:**
  - `woodex-live-P23/woodex-live-P23.zip` (uppercase sibling, 633 files)
  - `p23-live/` (loose tree on the same branch)
  - `frontend-v1/` (source tree the zip was built from)
  - `woodex-live-v3/woodex-master-production.zip`
- **"v2.5 pro" (assumption):** this is the **Woodex Admin v2.5 Pro** console served at `/admin/`. Evidence:
  - `admin/index.html` title and badge: "Woodex Admin v2.5 Pro", "ADMIN V2.5 PRO".
  - `downloads.html`: "Open Live Admin v2.5 Pro", "integrated Admin v2.5 Pro".
  - Branch commit `280b34a37d` (09:29 today): "release(v2.5-pro) … upgraded suite branding to Woodex Admin v2.5 Pro".
  - If you meant a different artifact, tell me and the admin-specific findings can be re-scoped.
- **Not tested:** the live site (the sandbox can reach only GitHub, npm and PyPI); execution of `.htaccess` under Apache or LiteSpeed (those findings rest on documented directive behaviour); email delivery.
- **Not changed:** no file in the package, the site or the branch was modified, no login was attempted against any system, and no git history was rewritten.

**Evidence labels:** **[V]** verified by execution or byte-level comparison · **[R]** established by reading code or content.

---

## 2. Immediate actions (ordered)

1. **Today — credentials.** Check the live admin for the owner and admin accounts: `master@`, `admin@`, `manager@`, `developer@`, `sales@`, `support@woodex.pk`. Change any password that is a default, or that still accepts `admin`. Disable accounts you do not need. Rotate the maintenance token (P0-4). If any backup archive has left the server, also rotate the database password and the HMAC signing secret (P2-8).
2. **Today — stop the package.** Do not upload `woodex-live-p23.zip` (or the uppercase sibling) to Hostinger.
3. **Today — repository.** Decide whether the repository should be private, or whether history must be purged (P0-4). Deleting files does not remove them from git history.
4. **Rebuild** the package from a clean export of the resolved `p23-live/` files after the fixes in P0-1, P0-2 and P1-1. Run the gates in §9.
5. **Re-audit** against §9 before any upload.

---

## 3. Findings — P0 (blockers)

### P0-1 Merge-conflict markers are shipped; the homepage cannot run  [V]

Four files in the package contain unresolved git conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> d21c542 (Fix Hostinger website recognition …)`):

| File | Marker lines | Effect |
|---|---|---|
| `index.php` | 3, 15, 32, 37, 45, 60 | PHP 8.2 parse error at line 15 (`unexpected token "==="`). `.htaccess:5` sets `DirectoryIndex index.php index.html`, so `/` runs `index.php` first and returns HTTP 500 (`500.html`). |
| `config.php` | 3, 37, 88 | PHP parse error at line 37. Loaded by `index.php` (and `includes/config.php`). |
| `.env` | 1, 9, 29 | Not parsed by PHP. `.htaccess:26` blocks web access, but any loader that reads it will fail. |
| `google0b104c3cfb7a4943.html` | 1, 3, 5 | Google's HTML-file verification needs the file to contain exactly the token line. It does not, so verification will fail. |

- **Root cause [V]:** commit `638d536a13` (11:42 today) has no markers in `frontend-v1/index.php`. Commit `7ee38fbab9` (12:35, "Fix Hostinger website recognition … deploy woodex-live-p23.zip") introduces them. Commit `f837ab950f` (13:00) still contains them, and so does branch HEAD `01506bac`.
- The zip matches the `frontend-v1/` source byte-for-byte for these files. `p23-live/` holds resolved versions instead: `index.php` 605 bytes, `config.php` 1,073 bytes, `.env` 171 bytes, verification file 54 bytes.
- The branch's `HOSTINGER-DEPLOYMENT-GUIDE.md` also contains two conflict markers.
- The PHP parser covered 47 files: 45 parse, 2 fail (`index.php`, `config.php`).

**Fix:** take the resolved `p23-live/` versions after review, and confirm they contain the intended maintenance and routing logic. Make the Google verification file contain exactly `google-site-verification: google0b104c3cfb7a4943.html`. Add the conflict-marker gate (§9).

### P0-2 The admin console (v2.5 Pro) does not load, so nobody can sign in  [V]

- `admin/admin.js` lines 286–289 are leftover fragments of an incomplete edit to the password show/hide button. The new code is at lines 268–272. Line 286 starts with a bare `? '<svg …'`, followed by stray `};` and `}`. Node's parser rejects the file: `Unexpected token '?'`.
- `admin.js` is the only file that defines `window.WXA` (line 585). Twelve of the 59 admin modules destructure `window.WXA` at load without a guard (for example `admin-pages.js:4`, `admin-content.js:8`, `admin-crm.js:4`, `admin-sales.js:4`), so they throw too.
- **Runtime test [V]:** jsdom 24 loaded `/admin/` from a local copy, with `fetch` stubbed.
  - As shipped: `window.WXA` is undefined. Errors: one `SyntaxError` and three `TypeError`s (reading `S`, `api` and `bapi`). Clicking **Sign in** sent **zero** requests.
  - Control, same test with the clean `p23-live/admin/admin.js`: `WXA` is defined, and clicking Sign in sends `POST /api/admin.php`. The control shows the test is capable of detecting a working login.
- The release commit `280b34a37d` says "verified all live endpoints". The API contract mostly holds (240 of 242 front-end actions have a handler, see P1-4), but the packaged admin does not start. The release claim does not hold for this package.

**Fix:** delete lines 286–289 of `admin/admin.js` (keep the `textContent` version at line 271). Remove the SSO auto-fill handlers at lines 330–348 (P0-3). Re-run the admin smoke test as a gate (§9).

### P0-3 Default and published admin credentials, including seeded owner accounts  [V]

| Where | What it does | Why it matters |
|---|---|---|
| `downloads.html:70` | Tells visitors to sign in at `/admin/` as `master@woodex.pk` with the default `Woodex@…` password, shown in plain text. (Value withheld in this report.) | `.htaccess` has no rule for `.html`, so the page is served publicly. The zip is public on GitHub. |
| `woodex-database.sql` (root) and `_database/woodex-database.sql`, lines 273–283 | Comment: "Password for all accounts: Woodex@…". Seeds six accounts: `master@` (owner), `admin@` (owner), `manager@` (admin), `developer@` (editor), `sales@`, `support@`. The INSERT ends with `ON DUPLICATE KEY UPDATE pass_hash=VALUES(pass_hash), active=1`. | **The single bcrypt hash in both files verifies the password `admin`, not the comment's password.** Checked with PHP 8.2 `password_verify` and with Python `crypt`; the hash is not reproduced here. Re-importing the file resets all six passwords to `admin` and re-enables disabled accounts. |
| `_database/woodex-v20.sql:51` | Seeds `admin` as owner with the same hash and `ON DUPLICATE KEY UPDATE pass_hash=…, role='owner', active=1`. | Same hash, so the password is `admin`. |
| `wx-install.php:4, 44, 69` | Creates and prints the login `admin / admin` when the user table is empty. | Default credentials built into the product. |
| `admin/admin.js:330–348`, button at `admin/index.html:50` | "Sign in via Google Workspace SSO" pre-fills `admin@woodex.pk` and the default password, then submits. A GitHub variant (`developer@woodex.pk`) exists in code but has no button, so it is dead code. | Embeds a password in client-side code. The "SSO" label is misleading. |
| `wx-demo.php:10, 12–15, 64` | Demo password constant. Four demo accounts, including an **owner**. The table printing the password is rendered for every visitor. | The demo password is public. The accounts are created with the database password. |
| `admin/index.html:96, 108` | Placeholder text in the page-builder password fields shows the default password pattern. | Low. |

**Impact:** the default password and the owner account names are public in this repository. If the live database was ever seeded from these SQL files, or the installer's `admin / admin` path ran, owner access is open to anyone who reads the repo. The live state cannot be checked from here.

**Fix (today):** check the live database for the six emails and for `admin`, then change or disable them. Remove the credentials from `downloads.html`, the SQL comments and seeds, the admin placeholders and `admin.js`. Replace fixed-hash seeds with a one-time setup that forces a new password. Remove the `ON DUPLICATE KEY UPDATE pass_hash` clauses.

### P0-4 Operational data and secrets are in a public repository  [V]

- `marketingwoodex-cloud/-marketingwoodex` is **public** (GitHub API: `isPrivate: false`). The package and the branch copies can be downloaded by anyone.
- **Business and personal data in `_private/`:**
  - `p23-live/_private/admin-db.json` (28,532 bytes; the zip has a smaller 9,136-byte copy). It holds six user records (two owner-role), with role names, permission lists, password-hash fields and session records. It also holds lead, client, booking, quote, invoice and project records containing names, phone numbers, email addresses and a street address.
  - The branch copy has about 17 phone-like strings and 15 distinct email addresses. Timestamps show seeding at `2026-10-09 12:23:29`, which suggests demo data. **Verify; if any record is real, treat it as a personal-data exposure.**
  - `_private/outbox.jsonl`: a sign-in notification containing an internal IP address and a browser string.
  - `_private/system.json`: a 32-character hex maintenance token (value withheld). It is the value of the staff bypass cookie `wx_mt` (`router.php:18`, `admin-p18h.js:20`). Anyone holding it can view the site while maintenance mode is on.
- **Credentials in code:** 42 scripts under `tools/` (`phplint`, `sectest`) contain literal login passwords.
- **Secret scan:** the whole branch (5,194 entries) was scanned for provider keys (Google, AWS, GitHub, Slack, Telegram, WhatsApp/Meta), private-key blocks, service-account JSON and password assignments. No live provider key was found. The root `.env` lists the Hostinger database keys with an **empty** `DB_PASSWORD`. No secret value was found in any `.env` file.
- The same patterns appear in sibling packages: `p22-preview/_private/system.json`, `woodex-vlive-P20/site/wx-demo.php` and `woodex-live-v3/admin-v3/v3.js`. These were not audited in depth.
- Git history keeps every committed version, so deleting files from the tree does not remove them.

**Fix:** rotate every exposed value (§2, step 1). Decide between a private repository and a history purge (for example with `git filter-repo`), coordinated with the team. Add `_private/`, `.env` and credential-file patterns to `.gitignore`. Move test credentials to environment variables.

---

## 4. Findings — P1 (high; fix before go-live)

### P1-1 Installer and diagnostic scripts are public  [R]

- **`wx-install.php`:** reachable by anyone, and not blocked by `.htaccess`. It needs valid database credentials, but it accepts any host. After connecting it can create an owner login with a password the operator chooses (lines 18–44). Its success page prints `admin / admin` (line 69). Its own header says to delete it after installing.
- **`wx-demo.php`:** a public page that displays the demo password (line 64). With the database password it creates four demo accounts, including an owner (lines 12–15, 38–44).
- **`wx-check.php`:** shows the PHP version, extensions and the database **name and user** (line 20). Before setup, it shows the PHP error log to anyone (line 39).

**Fix:** remove all three from the package. Keep the installer in the runbook, not in the web root. If you must keep them, restrict by IP and delete after use.

### P1-2 Unauthenticated cron trigger  [R]

`api/admin.php:256`: `GET ?action=cron` runs `cms_tick()` (publishing), `a7_backup_auto()` (creates backup files) and `bk_remind()` (sends booking reminders to clients). It requires no key and no session. Compare `api/wa-cron.php:14`, which checks a key with `hash_equals`.

**Fix:** require a secret cron key with a constant-time comparison, or restrict the action to CLI. Rate-limit the backup step.

### P1-3 Page-builder first-run window  [R]

`api/builder.php:201–207`: `action=setup` needs no database credentials. While `_private/db.json` does not exist, anyone can set the builder password. After that, the builder's `save` action writes page HTML into the site root (line 249), and `upload` accepts images. The admin's own `setup` (`api/admin.php:336`) does require database credentials, which is a much stronger gate.

**Fix:** finish setup before the domain points at the site, or ship a one-time setup token. Disable builder `setup` once the admin is the intended entry point.

### P1-4 Team and lead features are broken, and the team roster is hard-coded  [V]

- `admin/admin-users.js:38` calls `team_list`. No PHP handler exists. The fallback at lines 41–50 **always** shows five hard-coded staff records (names, `@woodex.pk` addresses and bios).
- `admin/admin-sales17.js:469` calls `lead_act`. No PHP handler exists.
- Coverage: 240 of 242 front-end action names have a matching backend string. All seven public `/api/*.php` endpoints that pages reference exist.

**Fix:** implement the two endpoints or remove the buttons. Remove the hard-coded roster and show an empty state instead.

### P1-5 Leftover pages are public, broken, and publish credentials  [V]

- **`downloads.html`:** publishes the default credential (P0-3). Loads `/admin-v3/v3.css`, which is not in the package (line 8). The "Woodex Admin v3 (208 KB)" card links to the 27 MB site zip. Download links are pinned to the branch name `arena/8a776c65-marketingwoodex` on GitHub.
- **`blocks.html`:** links to `/admin-v3/` and `/admin-v3/#/builder` (lines 28–29), neither of which is in the package. It has no canonical, no description and no `noindex`. It is not in the sitemap, but it is publicly reachable.

**Fix:** delete both pages. If they must stay, remove the credentials, fix the links and add `noindex`.

### P1-6 Footer links to a second domain on 145 pages  [V] — verify

`https://woodexfurniture.pk` appears in footers and related-card blocks on 145 of 153 HTML files (for example `1-kanal-house-design/index.html:134, 138`). The links use `rel="noopener"` but not `nofollow`, so they send visitors and link equity to another domain.

**Fix:** confirm ownership and intent. If it is a sister brand, document it. If not, remove it.

---

## 5. Findings — P2 (medium)

### P2-1 No Content-Security-Policy; the admin token is readable by scripts  [V]

- The `.htaccess` header block (lines 30–39) sets `nosniff`, frame options, referrer policy, HSTS and permissions policy, but no CSP.
- The admin stores its session token in `sessionStorage` (keys `wxaTok` and `wxTok`; set at `admin.js:224` and `:564`).
- The admin JS has about 396 `innerHTML` occurrences and about 1,270 `esc(` calls, so escaping is mostly in place. Without a CSP, though, any XSS can read the token.

**Fix:** add a CSP in report-only mode first (`script-src 'self'`, with hashes for any inline code), then enforce it. Consider HttpOnly cookies for the admin session.

### P2-2 Forgot-password reveals which emails are admins  [R]

`api/admin.php:368–376`: for unknown emails the handler waits 300 ms and returns the generic message. For a known active admin, when SMTP is not configured, it returns the same message **plus a `hint` key** and skips the delay (line 372). The response body and the timing both reveal whether an email belongs to an admin.

**Fix:** return the same body and take the same time in every case. Drop the hint.

### P2-3 Tokens accepted in URL query strings  [R]

- `api/mcp.php:34` accepts the MCP bearer token as `?key=`. Web servers and proxies log full URLs.
- `api/wa-cron.php:14` takes its cron key as `?key=`.

**Fix:** accept headers only. Rotate the keys if access logs are retained.

### P2-4 Unused and duplicate files in the package  [V]

- `assets/img/_orig/`: nine original images (1.86 MB) that no file references, sitting in the public web root.
- Eight duplicate groups (1.47 MB wasted): six image pairs (each present in `assets/img/` and `_orig/`), the root `woodex-database.sql` and `_database/woodex-database.sql` (identical), and `_templates/chat-bot-answers.json` with `api/chat-rules.json`.
- `router.php`: a local-testing router. Its own header says Hostinger does not use it.
- `api/cacert.pem` (212 KB CA bundle) sits in the public `api/` folder. `api/forms.php` uses it for Turnstile, so it can stay, but it does not need to be web-accessible.

**Fix:** delete the unused and duplicate files. Move `cacert.pem` outside the web root if the PHP path allows it.

### P2-5 Two near-identical zips, and a byte-identical duplicate in the repo  [V]

- `woodex-live-p23.zip` (642 files) and `woodex-live-P23.zip` (633 files) differ only by case in the name.
  - The lowercase zip has the conflicts (P0-1) and the root `index.php`, `config.php`, `.env`, `favicon.ico` and `woodex-database.sql`.
  - The uppercase zip lacks those root files, differs in 19 files, and adds `_private/health.json`.
  - Both carry the P0-3 and P1-1 problems, so the uppercase zip is **not** a safe fallback.
- `woodex-live-v3/woodex-master-production.zip` is byte-identical to the uppercase zip (SHA-256 `831da4389563f382836dfa3c6e9b78dcc2960178376a76934b3ef3dd0705d94c`).

**Fix:** keep one artifact with a unique name, generated from a clean export, and delete the duplicates.

### P2-6 Performance: inline CSS, render-blocking stylesheets, heavy images  [V]

- Sampled pages carry 51–71 KB of inline `<style>` each. It repeats on every page and cannot be cached across pages.
- `assets/site-p21.css` (695 KB, 2,655 lines) loads on all 145 public pages. `v1-p21.css` and `theme.css` load on the sampled pages.
- Seven images exceed 300 KB. The largest is a 623 KB JPG that is duplicated in `_orig/`.
- Admin and builder vendor bundles are large (for example `html2pdf` at 885 KB and `icons.json` at 551 KB). They load only in the admin or builder.
- Positive: CSS and JS get a 30-day cache header (`.htaccess:36–38`).

**Fix:** move inline CSS into cached files and purge unused rules. Resize and convert images (target ≤200 KB, responsive sizes). Add cache-busting query strings to every stylesheet reference.

### P2-7 Contact details and analytics IDs disagree across the package  [V] — verify

- **Phone:** the public site uses `+92 322 4000768` (292 `wa.me` links and 519 `tel:` links). The seed `woodex-database.sql:291` sets `site_phone` to the placeholder `+92 300 1234567`. `.env` has `WHATSAPP_NUMBER="+923001234567"`. `admin/master-components.html` shows the placeholder.
- **Analytics:** no GA4 or GTM tag appears on any public page. The admin settings field pre-fills `G-WX880921B` (`admin-settings.js:42`). `_private/admin-db.json` holds `G-WOODEX2026`. The input placeholder is `G-XXXXXXXXXX`.
- **Storage:** `config.php` sets `DB_DRIVER = 'json'` ("Default JSON storage active"), but no code path reads a JSON store. The admin requires MySQL, so `_private/admin-db.json` is unused and misleading.

**Fix:** set one contact number and one GA4 property (or add the tag). Remove the JSON-driver setting and the unused store.

### P2-8 Backup archives contain the signing secret and the database password  [R]

`api/media-lib.php:59–62` adds every top-level file in `_private/` to each backup, except the backup folders themselves. That includes `config.json` (the HMAC signing secret), `db.json` (the database password) and `security.json` (session data). The same function adds `db-dump.json`, a full export of every `wx_` table, which includes the user table and its password hashes. The archives sit in `_private/backups/`, which `.htaccess` blocks, and owner-only download is enforced (`media-lib.php:319–325`).

**Impact:** a leaked backup gives an attacker the signing secret and the database password together, which is enough to forge sessions and reach the database.

**Fix:** exclude `config.json`, `db.json` and `security.json` from backups. Encrypt backups with a key that is not stored on the same server. Keep the user-table dump out of archives, or redact the hash columns.

### P2-9 Latent `require` of an unvalidated path in `index.php`  [R]

The HEAD side of the conflict in `index.php` (lines 11–14) runs `require __DIR__ . $uri` for any request whose path starts with `/api/`, with no check for `..` segments. Today's `.htaccess` makes the branch unreachable, because `/api/*` files are served directly and there is no front-controller rewrite. Any future rewrite that sends requests to `index.php`, or any change to path normalisation, would expose it.

**Fix:** delete the branch when resolving P0-1. Do not reintroduce it.

---

## 6. Findings — P3 (low / hygiene)

- **P3-1 Auth status text [R].** `api/builder.php:199` returns the internal auth reason (`why`) to anonymous callers. The database-error branch (line 79) can place PDO exception text in that field. Not exercised live.
- **P3-2 Builder URL fetch and DNS rebinding [R; signed-in builders only].** `api/builder.php:325–335` resolves the host and checks the IP, then calls `file_get_contents()`, which resolves the host again. Redirects are refused (good), but the resolved IP is not pinned.
- **P3-3 Dead sitemap URL [V].** `sitemap.xml` lists `https://woodex.com.pk/woodex-live-v3/`, which is not in the package.
- **P3-4 SEO gaps [V].** Seven utility pages (404, 500, 503, coming-soon, the verification file, `blocks.html`, `downloads.html`) lack canonical and Open Graph tags. Four lack meta descriptions. Three titles run to 63–64 characters (`lahore/gulberg`, `renovation`, `residential-renovation`).
- **P3-5 Header hygiene [V].** HSTS is `max-age=31536000` without `includeSubDomains` (`.htaccess:34`). Some stylesheet references are unversioned (`/assets/site-p21.css`) under a 30-day cache, so an update can stay stale in browsers.
- **P3-6 Download page and vendored code [V].** The download page labels and links do not match (P1-5). Vendored libraries have no version manifest. Chart.js 4.4.1 is current; the others cannot be checked from the files alone. Run a software-composition scan.

---

## 7. What is working well (verified or read)

- **Authentication primitives:** `password_hash` and `password_verify` in the PHP paths. HMAC tokens bound to user, expiry, password version and session ID. `hash_equals` for comparisons. Login throttle of 8 failures per 10 minutes per IP. Reset tokens bound to the current password hash.
- **Owner-only operations:** backup download, upload, database export and restore are owner-gated. Restore validates table and column names before writing.
- **Webhooks:** the WhatsApp `X-Hub-Signature-256` check fails closed. The Telegram secret header is compared before processing.
- **Public enquiry form:** honeypot fields, five enquiries per IP per 10 minutes, a Turnstile hook, email validation, and auto-reply throttling (once per 24 hours per phone or email, 60 per day site-wide).
- **Page builder:** page paths are validated, `code_guard` blocks script injection on save, and uploads must pass `getimagesize`.
- **`.htaccess`:** HTTPS and apex-domain redirect. Dotfiles are blocked. `_private/`, `_database/` and `_templates/` have deny-all rules. `assets/uploads/` blocks PHP, HTML, JS and SVG execution. All 27 redirect targets exist.
- **Static analysis:** no `eval`, `exec`, `unserialize` or dynamic `include` in the PHP. Interpolated SQL uses constants or validated names, and request data goes through bound parameters.
- **Links and assets:** 21,531 references checked across 153 HTML files. Three are broken, all in the two leftover pages (P1-5).
- **SEO basics:** unique titles and descriptions on public pages. Canonicals on 142 pages, all `https://woodex.com.pk`. JSON-LD on 142 pages. An `alt` attribute on all 1,992 `<img>` tags on public pages. `lang` set on all content pages. `robots.txt` disallows `/admin/`, `/builder/` and `/api/`, with a clear AI-crawler policy. The sitemap lists 145 URLs on the canonical host.
- **Data files:** all 12 JSON and JSONL files parse. 78 of 79 non-vendor JavaScript files parse (the one failure is P0-2).
- **Dependencies:** all vendored assets are local. There are no CDN scripts, so no third-party script runs at load.

---

## 8. Verification log

| Check | Method | Result |
|---|---|---|
| Zip integrity | Python `zipfile.testzip()` on both zips | OK |
| PHP syntax | PHP 8.2.33 parser (WebAssembly build via `@php-wasm/node`), `token_get_all(TOKEN_PARSE)` on 47 files | 2 failures (P0-1) |
| JavaScript syntax | Node v22 `--check` on 79 non-vendor files (as script, then as module) | 1 failure (P0-2) |
| Admin runtime | jsdom 24 loads `/admin/` from a local copy, stubs `fetch`, clicks Sign in. Control run with the clean `admin.js`. | P0-2 confirmed; control behaves correctly |
| Credential hashes | PHP `password_verify` and Python `crypt` against the bcrypt hash in both SQL files | Verifies `admin`; does not verify the comment's password (P0-3) |
| JSON | `json.load` on 11 `.json` and 1 `.jsonl` file | All valid |
| Links and assets | HTML parser over 153 files; resolves root-relative and relative targets | 21,531 references, 3 broken |
| Metadata | Head parsing of 149 public pages; sitemap and robots cross-check | §7 |
| Endpoints | Front-end `api("…")` action names against PHP strings | 240 of 242 matched (P1-4) |
| Package vs branch | SHA-256 per file across the zip, `p23-live/` and `frontend-v1/` | 626 of 642 identical; 11 differ (conflicted and runtime files); 5 only in the zip; 8 only in `p23-live/` |
| Duplicates | SHA-256 over all package files | 8 groups, 1.47 MB |
| Branch secret scan | Regex scan of 5,194 entries: provider keys, private keys, service-account JSON, password assignments | No live provider key; test passwords and one maintenance token (P0-4) |
| Repository | GitHub API: visibility, branch commits, per-commit file contents | Public; markers introduced in `7ee38fbab9` |
| Resolved entry points | PHP 8.2 parser on `p23-live/index.php` and `p23-live/config.php` | Both parse (the fix is viable) |
| Resolved admin and public JS | Node `--check` on all 78 non-vendor files in `p23-live/` | 78 of 78 parse |
| Backup contents | Code reading of `api/media-lib.php:59–62` and `:319–325` | Confirmed (P2-8) |

**Not done:** live-site checks (no route to `woodex.com.pk` from the sandbox); execution of `.htaccess` under Apache or LiteSpeed; login attempts against any system; email tests; any change to the package, the site or the branch code.

---

## 9. Gates before re-audit and upload

- `php -l` on every PHP file: 0 errors.
- `node --check` on every non-vendor JavaScript file: 0 errors.
- No conflict markers anywhere: `grep -rE '^(<<<<<<<|=======|>>>>>>>)'` returns nothing.
- No `_private/`, `.env`, `wx-*.php`, `router.php`, `tools/` or backup files in the package.
- Admin smoke test: `/admin/` loads, `window.WXA` is defined, and Sign in sends `POST /api/admin.php`.
- Homepage returns 200. `google0b104c3cfb7a4943.html` contains exactly the verification line.
- Sitemap: 0 missing targets. Internal links: 0 broken.
- No default or published credentials in any file. Seeds contain no fixed-hash owner accounts.
- Live check: the six seeded emails and `admin` are disabled or have new passwords.

---

## 10. Cross-check with the companion report on this branch

The companion report (`WOODEX-LIVE-P23-DEEP-AUDIT-2026-10-09.md`, commit `73f3002`, 28 findings) covers the same zip. The two reports agree on the verdict and on the core findings.

### 10.1 Mapping

| This report | Companion report | Status |
|---|---|---|
| P0-1 conflict markers | C-04 | Agree |
| P0-2 admin JS does not parse | H-02 | Agree on the defect. This report rates it P0 because the runtime test shows that Sign in never starts. |
| P0-3 default and published credentials | C-01, C-03, H-04 | Agree. C-03's offline check matches ours: the seed hash accepts `admin`, not the comment's password. |
| P0-4 private data and secrets in a public repo | C-02, L-03 | Agree |
| P1-1 installers and diagnostics | H-01, H-03, M-02 | Agree |
| P1-2 unauthenticated cron | M-01 | Agree |
| P1-3 builder first-run window | H-01 (part) | Agree. This report narrows it to the builder path, which needs no database credentials. |
| P1-4 team roster; missing handlers | M-05 | Roster agrees. The missing `team_list` and `lead_act` handlers are not in the companion report. |
| P1-5 leftover pages | H-04 | Agree |
| P1-6 second-domain links | M-06 | Agree |
| P2-1 no CSP; token in `sessionStorage` | M-10 | CSP agrees. The token storage is new here. |
| P2-2 forgot-password hint | not listed | New here |
| P2-3 tokens in query strings | noted (query-string keys) | Agree in substance |
| P2-4 unused and duplicate files | L-05 | Agree |
| P2-5 near-duplicate zips | M-09 | Agree |
| P2-6 performance | M-08 | Agree |
| P2-7 contact and analytics IDs | L-04 | Agree. The GA4 ID conflict is new here. |
| P2-8 backups contain secrets | M-04 | Agree (confirmed here) |
| P2-9 latent `require` in `index.php` | M-03 | Agree (confirmed here) |
| P3-2 DNS rebinding in builder fetch | not listed | New here |
| P3-4 SEO gaps | M-07 | Agree in direction |
| Root audit reports | M-11, §7 | Agree. `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md` on this branch claims "99.4 / 100" and "Production Certified". The P0 findings in both reports contradict that claim. |

### 10.2 Companion items not verified here

- **L-01** accessibility and markup defects
- **L-02** forms depend on JavaScript
- **L-06** restore can write redirect rules without re-validation (owner-only)

Treat these as unconfirmed until someone checks them.

### 10.3 Recommendation

Read both reports. Where they differ, the evidence should decide. This report's runtime tests and byte comparisons are the most direct evidence for P0-2 and for the relationship between the package and its source tree. Then keep one report as the record and retire the other, so the branch does not carry two conflicting "deep audit" documents. Until then, the root certification reports should be treated as withdrawn.

---

## Appendix A — Artifacts

| Artifact | Bytes | SHA-256 | Notes |
|---|---|---|---|
| `woodex-live-P23/woodex-live-p23.zip` | 28,650,149 | `595505d30f1a4cd6babc3d9ecaf28a5a6b20998aed2360ec1a6710ff7a725014` | Target. 807 entries (642 files, 165 folders). |
| `woodex-live-P23/woodex-live-P23.zip` | 28,603,819 | `831da4389563f382836dfa3c6e9b78dcc2960178376a76934b3ef3dd0705d94c` | Sibling. 633 files. Older build without conflict markers. |
| `woodex-live-v3/woodex-master-production.zip` | 28,603,819 | `831da4389563f382836dfa3c6e9b78dcc2960178376a76934b3ef3dd0705d94c` | Byte-identical to the sibling. |
| Branch archive `arena/8a776c65-marketingwoodex` | 457,189,596 | not recorded | HEAD `01506bac174c6a8a6825e6c44175725a3aade66d` |

## Appendix B — Package layout (top level)

- Top-level folders, with the number of entries inside each: `assets/` 341 · `insights/` 98 · `admin/` 72 · `api/` 44 · `builder/` 21 · `lahore/` 18 · `projects/` 14 · `_private/` 7 · `_templates/` 7 · `_database/` 4.
- Root files: 21. Among them are the entry points (`index.php`, `index.html`, `router.php`), the installer and diagnostics (`wx-install.php`, `wx-demo.php`, `wx-check.php`), `.htaccess`, `.env`, `config.php`, `robots.txt`, `sitemap.xml`, `llms.txt` and the error pages.
- 81 top-level page folders (for example `1-kanal-house-design/`), each holding an `index.html`, plus 62 nested page folders under `insights/`, `lahore/` and `projects/`.
- PHP: 47 files in total, of which 45 parse.
