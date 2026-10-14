# Woodex admin v2.5 — work-sandbox memory

*Written 14 October 2026, at `4bbefe5`, on branch `arena/4150341e-marketingwoodex`.*
*The design authority is `ADMIN-V2.5-MASTER-PLAN-2026-10-13.md` (the 18-page plan, also as PDF). This
document is the memory: where things are, what is already true, what is next, and what bit us on the way.
Where the two disagree, the plan wins for design and this file wins for state.*

---

## 1. Resume in five minutes

```bash
git fetch origin && git reset --hard origin/arena/4150341e-marketingwoodex
cd admin-v25 && npm ci && cd ..                 # the console's dependencies
cd tools/phpwasm && npm ci && cd ../..          # php-wasm (the only PHP this sandbox has)
cd tools/phplint && npm ci && cd ../..

# the gate, in the order that fails fastest
node tools/phpwasm/run-php.cjs tests/run.php            # 1085 passed · 0 failed · 14 skipped
node tests/conformance.mjs                              # 85 passed · 0 failed
node tools/phplint/php-lint.mjs                         # 159 PHP files parse clean
cd admin-v25 && npm run typecheck && npm run smoke && cd ..   # tsc clean · 150 checks · 65 routes
node tools/gen-aliases.mjs --check && node tools/gen-caps.mjs --check

# the console, with sample data (the API cannot run here — see §3)
cd admin-v25 && npx vite --host 0.0.0.0 --port 5173   # NO VITE_WX_DEMO: the flag forces demo on and Leave demo mode cannot turn it off. Demo is ?demo=1 only.
```

The preview is proxied under the sandbox's own hostname; bind `0.0.0.0`, never `127.0.0.1`. Prove the
preview is *current* by fetching a source module, not the HTML shell — the build stamp lives in
`src/components/Shell.tsx` (a `+` after the short SHA means tracked files differ from that commit, which is
what an uncommitted screen looks like):

```bash
curl -s http://127.0.0.1:5173/src/components/Shell.tsx | grep -o 'built [0-9-]* [0-9:]*Z'
```

**A turn can come back re-cloned.** The workspace keeps the files but not `.git` or its `node_modules`: the
repository arrives at the base commit `782b50b` with the branch checked out and everything committed-to-date
sitting in the working tree as untracked or modified files, no dependencies installed, and the preview
process dead. The recovery, in this order, and the third step is the one that loses work if it is skipped:

```bash
cp <any file you changed since the last commit> /tmp/                 # reset --hard clobbers colliding files
git fetch origin && git reset --hard origin/arena/4150341e-marketingwoodex
cp /tmp/<that file> back                                              # then reinstall, restart the preview
```

`php-lint` is a quick detector of a half-restored tree: it prints the number of files it parsed, so 157 where
159 is expected means two files are missing from the working tree.

**There is no PHP and no MySQL in this sandbox.** `api/v2` cannot answer here: every screen is honest
about that (`not answering` in the status strip, `demo data` only in demo mode). Verification is by
tests, by `php-wasm`, and by running the console against sample data — the gate itself (§6) is a host run.

---

## 2. The two site generations — the single most confusing thing about this repo

The repository holds **two complete websites** and a stack of older admin generations. Knowing which is
which saves an hour every time.

| Tree | What it is | Evidence |
|---|---|---|
| `frontend-v1/` | **The live site as it ships to Hostinger.** 150 HTML pages, the v2.1 PHP API (`api/*.php`), the v2.1 admin (`admin/`, 69 files), `_private/`, `_database/`, `_templates/`, `.htaccess`, the installer (`wx-install.php`). Every P20–P22 release zip was built from this tree — the P22 payload is byte-identical to it. | `find frontend-v1 -name '*.html' \| wc -l` → **150**, the number the plan quotes |
| the repository root | **The v2.5 work area.** `api/v2/` (the new API), `admin-v25/` (the new console), `db/` (migrations), `tests/`, `tools/`, the plans — *plus* a second, newer marketing site (86 pages, `assets/site.css` + `assets/site.js`, enquiries posted to `/.netlify/functions/*`) that was built for the v26 redesign. | root `index.html` references `/assets/site.css`; root `contact/index.html` posts to a Netlify function |

The console edits **the tree under `WX_SITE_ROOT`**, which is `dirname(dirname(api/v2))` — the repository
root here, `public_html` on the host. So in this sandbox the console's page/hero/chrome/business screens
read the *root* (v26) pages, while the release carries the *`frontend-v1`* pages.

**Why the release is still right.** The cut-over in plan §14.2 is additive: `api/v2` is deployed beside
`api/`, the console beside `admin/`, and nothing of the live site is replaced. Three facts make the
console work on the live pages, and all three were checked against `frontend-v1/` before the P25 zip was
built:

- the chrome anchors the header/footer editor rewrites are present
  (`#header-cta` ×6, `.footer-main` ×2, `nav.desktop-nav` ×6 in `frontend-v1/index.html`);
- the form ids it recognises are present (`est-form`, `brief-form`, `fitout-hub-form`, `fitout-quote-form`);
- the announcement bar's contract is present: `frontend-v1/assets/site.js` already fetches
  `assets/announce.json` and applies `wx-ann--<style>` / `wx-has-ann`, `frontend-v1/assets/v1-p21.css`
  styles it, and `frontend-v1/assets/announce.json` exists (`{"on":false,…,"v":0}`).

**Open question for the owner (§9 Q7):** should the v26 pages replace the `frontend-v1` pages in the
release, or is the v26 site the Netlify deployment and Hostinger the admin/API host? Until that is
answered the release stays additive — it never replaces a live page.

---

## 3. Where everything lives

```
api/v2/                     the new API — one front controller and one file per resource
  index.php                 router, envelope, request-id, error boundary, shutdown guard
  .htaccess                 every path under /api/v2/ → index.php; lib/ and routes/ 404
  lib/            (33 files) bootstrap · errors · http · store · db · settings · validate · money · audit
                            auth · caps · approvals · router · pages · chrome · heroes · content · media
                            library · placements · theme · redirects · forms · estimator · notify
                            clientview · projects · clients · templates · business · announce · ai
  routes/         (33 files) one per router `file` name — the router loads exactly the matched one
  data/*.json               generated data (quote starters, section library, city templates…)
  aliases.php               the 365 v2.1 actions and where each was served from (generated)
db/migrations/000…014.sql   forward-only migrations; `db/migrate.php` runs them, `db/owner.php` gets you in
tests/run.php               the API's own suite, run under php-wasm (no database)
tests/conformance.mjs       duplicate functions, route-table parse, dead includes, gate coverage, SQL
                            interpolation, rate limits — and the shipped browser blocks run against stubs
admin-v25/src/
  lib/            nav.ts · api.ts · live.ts · demo.ts · format.ts · session.tsx · theme.ts · mock.ts
  components/     primitives.tsx · Shell.tsx · CommandPalette.tsx · charts.tsx · AiSettings.tsx
  screens/        24 live screens + the mock Dashboard
tools/            phpwasm · phplint · gen-aliases · gen-caps · gen-quote-starters · make-release
docs/             the audit and plan documents (moved here in P25; see §7)
frontend-v1/      the live site (§2)
woodex-master-P25/  the release pack: README · CHANGELOG · MANIFEST.json · this file · the zip
```

Two slices have landed since P25 was packed: **the AI settings** (`lib/ai.php` + `routes/ai.php`, the panel in
`components/AiSettings.tsx`, §8a) and **publishing a page** (`wx_page_head_plan()` / `wx_page_publish()` /
`wx_page_state()` in `lib/pages.php`, `POST /pages/{rel}/publish`, the card in `screens/LivePages.tsx`, §8c).

Rules the publish slice added, which the next slice touching pages must keep:

- the *rules* of a page change live in a **pure** function (`wx_page_head_plan()` — HTML in, HTML and the
  facts out) and the reading/writing is the thin function around it. That split is why they are tested at all
  in a sandbox with no database;
- **absent means keep, empty means remove** — a request that does not carry a field must not erase it;
- the two files a page change writes besides the page are named by a constant *as well as* by their real path
  (`WX_PAGE_STATE_FILE`, `WX_PAGE_SITEMAP_FILE`) so a test can point them at scratch paths. `_private/pages.json`
  is v2.1's file and the old admin still reads it;
- `wx_write_file_atomic()` refuses any path outside `WX_SITE_ROOT`, so scratch files in a test live *inside*
  the site tree (a dot-named file is skipped by the page walk) and are deleted at the end.

House rules that the codebase now enforces, and that a new file must not break:

- a library is included from `lib/bootstrap.php` in dependency order — a new `lib/*.php` needs a line there;
- a route file's name must equal the `file` column its router rows declare (`routes/ai.php` ↔ `ai`);
- route wrappers are two lines (`wx_appr_route(...)` + `..._do`); route files load per request through
  `wx_route_match()`, never from `bootstrap.php`;
- every write route goes through the approval gate with a label in `WX_APPR_LABELS` when it is policy-wrapped;
- money is whole rupees, computed by `doc_totals()`; the screen prints, it never re-adds;
- `wx_settings` is the only settings writer; JSON stores go through `JsonStore` (`lib/store.php`).

---

## 4. What is built, and where it was proved

66 commits. The recent ones, newest first — the commit messages carry the reasoning, and they are worth
reading before changing the files they touch.

| Commit | Slice | The one thing it decided |
|---|---|---|
| (this slice) | **Integrations — connectors and keys** | `api/v2/lib/connectors.php`, `routes/connectors.php` (`GET/POST /connectors`, `POST /connectors/{conn}/delete`), `admin-v25/src/screens/LiveIntegrations.tsx` on `/integrations` (alias `/settings`). v2.1's `_private/connectors.json`, shape kept. A key is write-only: the server returns `hasSecret` and the last four characters; a save sends a key only when one is typed; only `secretClear` erases. Counts are computed on the server. Connector **tests and backup pushes still run in v2.1** — the screen says so. |
| `4bbefe5` | **The pages screen** listens to publishing | Where a page is public, in three facts read from the server, with the consequence written under the buttons; the service and city views are filters over the pages, not collections. |
| `e2ab209` | **Publishing a page** | v2.1's `page_meta_save` with one repair: the sitemap now follows the status both ways, so unpublishing takes the address out instead of leaving Google a promise. The rules are one pure function. |
| `93b66f0` | **The AI settings** | v2.1's record in v2.1's file; the key never leaves the server; and the request, the response and the model filter are three pure functions, which is the only reason the first outward call this API makes is tested at all. |
| `12d54cd` | **The P25 pack**, rebuilt | The release artifact for the commit that carries it; `gitSha` is deliberately one commit behind, because an artifact cannot contain its own hash. |
| `47cde56` | **Approvals screen** + the strip's stale clause | The Master's queue is a screen: read it, judge one request, decide it, change the policy. Approving replays the stored request; a preview never offers the button. |
| `76ea06a` | Business check reports visible pairs | A sentinel pair kept the phone-number spellings working without ever being *shown* as a string that was looked for. |
| `2cd5756` | **Business info** + **announcement bar** | The company details are read off the site, not out of a copy of the defaults; the bar is one JSON file with the site's own script fetching it. |
| `d59427a` | **Quote templates** | The nine BOQ shapes are *generated* from the site's own `assets/js/quotation-templates.js`, never hand-typed twice. |
| `4f9c269` | **Demo mode** | `VITE_WX_DEMO=1` / `?demo=1` only. A path with no fixture gets no answer; demo is never inferred and never a fallback. |
| `a6abdbf`, `93c41f5`, `7081759` | **Client updates** | The client page a link opens, the seven events, the channels — and the sending is described as it really is (`sent` only with a transport). |
| `cd368c2` | **Projects + timeline** | The money a project has actually billed, on its own date axis; a milestone-billed project is not "unbilled". |
| `3ad9116` | Forms + rate book | Which pages carry a form, where each enquiry goes, and the figures every price starts from. |
| `82e0b66` | Page heroes | Edit a hero where it stands (byte-range geometry), or pick one of six designs. |
| `b2945b5`, `750a59e`, `0114426` | Sign in + build stamp | Sign in with the name you have; the bundle names itself; the door says what is true before it is pressed. |
| `c67d564` | City pages | An address rule and a furniture rule, not copy-and-edit. |
| `f4ae6b9` | Builder bridge | v2.1's 19 builder actions: 17 served, 2 named as decisions; parameter names translated (`path` → `rel`). |
| `b78e054` … `876a9c3` | Fetchers, media upload, theme, page editor, section library | The Phase 3 gate's three sentences became one undoable write each. |
| `3deb37d`, `b97d3d8`, `81bb80d` | Header & footer, content CMS, chrome across pages | The header is one edit across every page; the article is composed by the server. |
| `158346e`, `7f8deb1`, `ba060b0`, `a031f93` | Redirects, media library, library, placements | The first Phase 3 screens, and the verdict keyed by the rule the API names. |

Measured at `4bbefe5`: **1085** API tests · **85** conformance checks · **159** PHP files lint clean ·
**150** smoke checks over **65** console routes · `tsc` clean · 365 legacy actions named, 151 bridged
(`page_meta_save` is the first *pages* action to cross).

---

## 5. The gate, and what each part of it catches

| Command | Catches |
|---|---|
| `node tools/phpwasm/run-php.cjs tests/run.php` | behaviour: validation, approvals, money, page writes, publishing a page, the content composer, the announce block, the AI settings, the client page |
| `node tests/conformance.mjs` | the mistakes a compiler cannot see: a duplicated function name, a route row pointing at a missing handler, a dead `include`, a write route with no approval gate, SQL built by interpolation, the shipped browser blocks run against stubs |
| `node tools/phplint/php-lint.mjs` | PHP 8 grammar over `api/v2`, `db/`, `tests/` (the shipped command-line tools are shipped code) |
| `cd admin-v25 && npm run typecheck` | TypeScript, screens included |
| `cd admin-v25 && npm run smoke` | every route renders: offline-honest, demo-labelled, and no screen showing invented numbers |
| `node tools/gen-aliases.mjs --check`, `gen-caps.mjs --check` | generated artefacts drifted from their source (365 actions; `001_roles.sql` byte-identical to v2.1's matrix) |

Two habits worth keeping: run `tests/conformance.mjs` after touching a route table, and rebuild the
smoke bundle after touching a screen — the smoke test reads a *built* bundle, so a stale `.smoke/`
proves nothing.

**The real gate is on the host** (plan §11, Appendix A): an editor publishes an article, changes the
header across 150 pages, and rolls the change back from page history. Migrations 000–014 are written and
re-runnable, but they have never run against MySQL — `php db/migrate.php --dry-run` is the first thing to
run there.

---

## 6. Traps — the ones that cost time, with the fix

**The sandbox**
- No PHP, no MySQL, no PHP extensions. `node tools/phpwasm/run-php.cjs <script>` mounts a *filtered* tree
  (plus `MOUNT_FILES`), excludes dot-directories, and does not mount `/tmp`.
- `npx tsc --noEmit` works only from inside `admin-v25/`.
- The API through the 5173 proxy answers `502 UPSTREAM` — by design. The console's answer to a missing
  API is a sentence, never data.
- Stale preview servers must be stopped before restarting (`pkill -f "vite --host 0.0.0.0 --port 5173"`), and
  a re-cloned turn leaves the old one dead — the port is free and the preview must be started again.
- A turn can come back re-cloned at the base commit: check `git log --oneline -1` before assuming. Then
  `git fetch origin && git reset --hard origin/<branch>` — **after backing up anything uncommitted**, because
  `reset --hard` deletes untracked files that collide with tracked paths. Dependencies and the preview
  process are gone too (§1).
- The JS/CDN dependencies of `tools/*` are not part of the workspace snapshot: `npm i --prefix tools/phpwasm
  @php-wasm/node@3.1.58`, `npm --prefix tools/phplint install`, `npm ci` in `admin-v25`.

**The console**
- React does not run effects during `renderToString`: a screen must feed its state from the fetched value
  (`draft ?? server`), never from an effect, or the smoke test sees an empty screen.
- Assertions in `smoke.tsx` read module-scope `let`s; a `const` declared inside the render pass is invisible.
- `at()`, the helper that renders a screen against a session, is declared *inside* one try block in
  `smoke.tsx` — a new render goes there too, or TypeScript says `TS2304`.
- Primitives: `Btn` is `default|primary|ghost` (plus `size`, `iconOnly`, `icon`) — there is no `danger`;
  there is no `.icon-btn` and no `.field`. Two-up rows are `.grid.grid-2`; wrappers are `className="stack"`.
- `ErrorCode` accepts only real codes — narrow an envelope with `isPending(r)` before reading it.
- SSR entity-encodes apostrophes and inserts `<!-- -->` between adjacent text children: interpolate into
  one template literal.
- **The console uses `BrowserRouter`, so routes are `/integrations?demo=1`, not `/#/integrations`.** A hash URL falls back to the dashboard, and a crawl built on it reports every route as passing. Check the `<h1>` per route, not just the absence of errors.
- **A headless browser exists without the CDN:** `@sparticuz/chromium` from npm, with `al2023.tar.br` brotli-decompressed and extracted to `lib/`, then `LD_LIBRARY_PATH` set to it, and `puppeteer-core` pointed at `/tmp/chromium`. Playwright's own download is blocked.
- **To exercise the live path without PHP,** a stub API on :8081 (in-memory, logging each request body) and a second Vite with `WX_API_TARGET=http://127.0.0.1:8081`. It proves what the browser sends, which the demo cannot.
- `App.tsx` must import every primitive a screen renders, and a screen is not real until its id is in
  `BUILT_IDS` *and* it has a `<Route>` — otherwise the link opens the build-plan card (§8f).

**The API**
- Never call a helper without checking it exists; the v2.1 names are close enough to invent plausibly.
- `$a + $b` does not override keys — `array_merge()` does.
- `wx_doc_put`/`wx_doc_get` throw outside `WX_DOC_TABLES`.
- PHP single-quoted strings: a literal `'` or an unquoted word after `, ` is a parse error;
  `php-lint --verbose` names file:line.
- A JSON body is not a validation: every write goes through `wx_v_*`, and a refusal names the *field*.

**The shell**
- A failed command inside a compound `&&` line does not stop the next command (a pipeline's exit code is
  the last command's). Re-grep after every patch.
- Backticks in `git commit -m` are substituted — write the message to a file and use `-F`.
- `git status --porcelain` needs `--untracked-files=no` to mean "tracked edits only".
- Python patch scripts must match their anchor exactly and write at the end; an `AssertionError` aborts
  before the write while the shell carries on.

---

## 7. The P25 release pack

`woodex-master-P25/` — `README.md` (install + upgrade), `CHANGELOG.md`, `MANIFEST.json`, this document, and
`woodex-master-P25.zip` (27.9 MB, 720 files, 43.1 MB uncompressed).

**What the zip is.** The Hostinger payload: the live 150-page site (`frontend-v1/`) untouched, plus
`api/v2/`, `db/` (migrations + `migrate.php` + `owner.php`), and `admin-next/` — the built console at
`/admin-next/` per plan §14.2 step 2. The only site file the pack edits is `.htaccess`, and only by
appending a marked block that serves the console's deep links its own `index.html`.

**What the zip is not.** It is not the v26 marketing site (§2) and it does not replace any live page. It
is not an install: on a host that has never run v2.1 there is no database, and `wx-install.php` (included)
is the way to make one.

**How it is built.** `node tools/make-release.mjs` — repeatable, refuses to ship a credential
(`_private/db.json`, `.env`, `*.pem` except the CA bundle, anything named like a secret), refuses to build
if the console's build fails, appends the `.htaccess` block, zips with `-X` (no host metadata) and writes
`MANIFEST.json` with the git SHA, the console's own build stamp, file counts, SHA-256 of `api/v2/index.php`,
the console's `index.html`, and the zip itself, plus the migration list. `--dry-run` lists without copying;
`--skip-console` reuses an existing build. Two builds of one commit differ by exactly one line — the
console's build stamp, which carries the minute the bundle was built and is deliberately kept (it is what
makes a screenshot arguable). The payload is therefore bound to *commit + stamp*, and the manifest records
both, so no claim of byte-identical rebuilds is being made: an earlier claim in this project was wrong, and
the comment in `tools/make-release.mjs` says why.

**Upgrading a live site** (File Manager, not Hostinger's "Import website" tool):

1. back up `public_html` and the database;
2. upload the zip, extract over `public_html` (Overwrite), delete the zip;
3. `php db/migrate.php --status` → `--dry-run` → run it (it needs `_private/db.json`, which v2.1's install
   wrote);
4. open `/admin-next/` — sign in with an existing `wx_users` account (or `php db/owner.php --status`);
5. leave `/admin/` alone: it is the v2.1 admin and the rollback path until coverage is complete;
6. check the three generation facts from §2 on the host once, then roll back by restoring the previous
   release zip.

**Where the pack lives.** Committed in this repository at `woodex-master-P25/` (so the GitHub link is the
file's own page: <https://github.com/marketingwoodex-cloud/-marketingwoodex/tree/arena/4150341e-marketingwoodex/woodex-master-P25>, direct download <https://github.com/marketingwoodex-cloud/-marketingwoodex/raw/arena/4150341e-marketingwoodex/woodex-master-P25/woodex-master-P25.zip>), published as release
[`p25`](https://github.com/marketingwoodex-cloud/-marketingwoodex/releases/tag/p25), and copied to a public Drive folder for sharing:
<https://drive.google.com/drive/folders/12rpZKxUpHibqPZNMLi1VBMxlmWgTpBuz>. The release carries notes and a
tag rather than the file as an asset: `uploads.github.com` is blocked from the build sandbox (`github.com`
and `api.github.com` are not), so the payload was committed and pushed instead — the same bytes, with the
SHA-256 in the manifest to check either copy against.

Rollback for any single file: `git show <sha>:<path>` on this branch — the manifest records the SHA the
payload was built from.

---

## 8. What is next, in order

### a. AI settings (`cms_ai_*`) — delivered, and the first outward call this API makes

`api/v2/lib/ai.php` + `routes/ai.php` (`GET|POST /ai/settings`, `POST /ai/models`, `POST /ai/test`), the
`AiSettings` panel at the foot of the Content screen, and the fixtures behind it. v2.1's contract is kept
exactly, because the record lives in **v2.1's own file** (`_private/content.json`) and both admins read it:
`AI_DEF`'s eleven keys, `anthropic` by default, the two per-provider defaults, and the writing voice with its
own 800-character limit while every other field stops at 300.

Four things were wrong in v2.1 and each is a decision here:

- **a read could leak a key** — `wx_ai_pub()` is the only serialiser, and a test asserts the key appears
  nowhere in the answer;
- **an empty key field meant *erase*** — absent and empty both mean *keep*; only `<k>Clear` deletes;
- **`clip($v, 300)` shortened a mistyped key into a wrong one** — this refuses and names the field;
- **the request, the response and the model filter lived inside one function** that only ran with cURL and a
  key — they are three pure functions now (`wx_ai_request()`, `wx_ai_text()`, `wx_ai_models_clean()`).

The call itself (`wx_ai_http()`) is the one `curl_exec()` in this API and **has never run**: this sandbox has
no cURL, no key and no route to a provider. The tests pin everything up to it — the request Claude needs
(`anthropic-version`, the voice as a top-level field, `max_tokens` 6000), the same request in OpenAI's shape
(the voice as the first message), the custom-endpoint URL rule, the model filter (OpenAI cut to
`^(gpt|o\d|chatgpt)`, embeddings/whisper/tts/dall-e/audio dropped, 400 maximum, the preferred default
suggested), the two shapes an answer carries text in, and the failure that names *which* thing is missing —
cURL or the key — instead of blaming the key.

On the host, the first thing to try is **Test the key** on the Content screen: it is one small request, and
its two failure messages are written to say which of the two it is.

### b. The announcement bar — delivered, and worth reading before touching

Built already (`api/v2/lib/announce.php`, `GET|POST /chrome/announce`, the panel in `LiveGlobal.tsx`, the
site's own script in `assets/site.js`), and it is the clearest example of this project's recurring shape: the
server half is small and the honest half is smaller. The contract, kept exactly:

- `assets/announce.json` — `{on, text, link, linkText, style, v}`; text ≤ 160, linkText ≤ 40;
- the link must match `^(/[^\s"<>]*|https://[^\s"<>]+|tel:\+?[0-9 ]+|mailto:[^\s"<>]+)$`;
- styles `navy|wood|cream`; `on` with empty text is a validation error naming the field;
- `v` is the visitor's dismissal key and moves only when the announcement changes;
- the write is atomic (`wx_write_file_atomic()`) — v2.1 truncated before it locked, so a page fetched during
  a save could get half a file and show nothing at all.

The feature had been working in the *older copy* of this site and was absent from the files `index.html`
actually links, so the console could have saved an announcement no visitor could ever see. That is why the
screen reports which half is missing — and how many pages load the script — instead of promising a bar, and
why the site side (`assets/site.js` + `assets/site.css`) shipped in the same slice.

### c. Services and cities — delivered, in the two halves it always had

The plan's row said "services & cities" and it turned out to be two different things, which is worth keeping
straight:

- **cities** are content items of type `city` published at a root-level address by the address rule and the
  furniture rule (`wx_content_rel()`, `wx_content_shell_rel()`, §8's `c67d564`); the `/cities` screen is the
  content studio with the city preset. v2.1's copy-and-rewrite flow is *not* ported, deliberately — plan §11.
- **services** were never a collection: v2.1's services screen was a *view* of the pages (kind ≠ city, minus
  articles and studies, minus the machinery), and the pages screen now offers exactly that filter, plus the
  cities the other way round, with each page's own `<body data-page>` as the kind.

Neither half could say whether a page was public, so **publishing a page** came with them: the status card on
the pages screen, `POST /pages/{rel}/publish` (v2.1's `page_meta_save`, bridged for the old admin), one pure
function for the rules and one thin function that writes the page, `_private/pages.json` and the sitemap.

### c2. Then the rest of Phase 3

**Integrations is delivered as the save/list/delete half** (see the §4 row). Still open in this slice, in order:
1. Connector **test** (`conn_test`: GitHub, Gmail, Drive address checks) and **push** (`conn_push`: off-site backup to GitHub or Drive, `p22_push()` / `conn_tick()`). Both make outward calls with live credentials, so they need the host. Port them as pure request builders first, as `wx_ai_request()` was done.
2. Gmail send and "use Gmail for mail" (`conn_gmail_send`, `conn_gmail_use`) — needs the SMTP transport, which v2.5 does not have yet.
3. The gallery of 22 connectors (v2.1 `admin-settings.js` cards) — the screen only offers a free "Kind" field today.
4. **Security, open:** the approval gate stores the request body verbatim in the queue (`wx_appr_wrap()` → `'body'`). A Manager's `conn_save` with a key therefore writes the key into the approvals table until it is decided. `cms_ai_save` has the same exposure today. Decide: encrypt the queued body, or strip secrets from the queued body and ask the Master to re-enter them on approval.

The SEO screens (`seo-lib.php` → titles, descriptions, sitemap, the audit) and integrations (`conn-lib.php`'s
22 connectors and their keys — the largest remaining piece of the phase, and the one that needs a host to
test against). The pages screen's remaining v2.1 action is `page_delete` (trash + a redirect): the API has no
route for it yet, and it is the one destructive page action nobody has asked for.

### d. Phases 4–6

Read plan §12 for the schedule: 4 — AI centre, automation, WhatsApp hub; 5 — SEO and the marketing
surfaces; 6 — the client portal (tokenised, no login; the HMAC pattern already exists in
`quote-view.php`). Nothing in those phases is started. `cms_ai_*` (§8a) is the first thing Phase 4 needs.

### e. The host run — the only thing that proves the phase

On the host, after the upgrade in §7: publish an article as an editor; change the header through the
console and watch 150 pages change as one batch; roll that batch back from page history; check
`/api/v2/health`; check that `/admin/` (v2.1) still works. Record the numbers in the plan's §11 table —
they are the reason the table exists.

### f. Housekeeping, in the order it hurts

1. **FIXED (0a375c9) — the plain `/dashboard` no longer shows invented numbers.** `/dashboard` renders `screens/LiveDashboard.tsx`, which shows the offline, signed-out or checking state with no figures. Verified in headless Chromium: no PKR figures, "not answering" strip shown, no errors.
   Still open: the 'No server here?' callout offers 'open the console with sample data' (`?demo=1`). That goes with the demo-removal step.
2. **Four admin generations coexist** (`admin/`, `wf-admin/`, `frontend-v1/admin/`, and history's v2.1) —
   plan §2's finding. Nothing is deleted until Phase 6; the names belong in the README so nobody guesses.
3. **The old release zips** (`deploy/p17…p20`, `woodex-master-P22/`, `woodex-vlive-P20/`) were removed from
   the tree in P25 to keep the repository navigable. Their record is in `CHANGELOG.md` and their bytes are
   recoverable from history (`git log --diff-filter=A -- <path>`, then `git show <sha>:<path>`).
4. The v26 pages at the root are not the release's pages (§2). Either they replace the live ones later, or
   the release should stop carrying the older generation — an owner decision, not a build decision.

---

## 9. Open questions for the owner

The plan's §17 six decisions are still open and still block *design sign-off*, not the build: the
navigation model, the density/typography direction, the dashboard's one job, the client-facing document
design, the search & command palette's scope, and the portal's branding. They were deliberately not
re-asked.

New, found while packaging:

1. **Which generation of pages is the live site?** (§2) — the release currently ships both, additively.
2. **Do the sections' enquiries keep going to Netlify on the Hostinger copy, or move to `api/v2`?** The
   forms screen names the address each page posts to; Phase 4 is where the address changes.
3. **Should `/admin/` be repointed at the console now?** Plan §14.2 step 4 says when coverage is complete;
   with Phase 3 half-built, the honest answer is not yet — but the 302 is a five-minute change.

---

## 10. Working agreements

These were all learned the hard way in this project; they are the difference between a fix and a second bug.

1. **Fix the function that produces a label, not the string.** When something wrong appears on screen,
   find the one place that computes it (`linkLabel()`, `wx_notify_*`) and make *that* true, so the same
   wrongness cannot appear from a second screen.
2. **The console never presents a prototype as the product**, and never invents a number. `demo data` only
   in demo mode, `not answering` with a reason when the host is silent, `live · api/v2 <version>` when it
   is not.
3. **A pasted label is evidence, not a complaint to be deleted.** Trace it to the code, then fix the code.
4. **The preview must be current, and proving it is part of restarting it** — fetch a module, not the HTML
   shell, and say which commit it is serving.
5. **A bare phase signal is approval to build.** Don't re-ask the plan's decisions; don't stop for the host
   gate; the next slice follows without a pause.
6. **The server is the only place a number is computed.** Screens print; they never re-add, round or
   re-derive money, counts or totals.
7. **Write the reasoning in the commit message.** `git log` is the project's other document — the plans say
   what should be true, the commits say why it is.
