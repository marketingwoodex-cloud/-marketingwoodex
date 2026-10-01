# WOODEX AGENCY PLATFORM — Master Plan v3.1 (Expanded: deploy pipeline · multi-frontend API · widget registry · tokens · menus · starters)

**Version:** 3.1 · **Date:** 2026-10-02 · **Status:** for approval
**Builds on:** `MASTER-PLAN-V3-LEAN.md` (stack: Laravel 12 + free TailAdmin Laravel + Supabase Free Postgres + R2; Vercel internal-only).
**Input merged:** your "Expanded Architecture Blueprint". Everything in it is kept in intent; §1 lists what I **changed and why**, so nothing broken gets built.
**Companion file:** `docs/headless/bootstrap/deploy-hostinger.yml` (corrected workflow, a template — not active, untested until Phase 0).

> **SUPERSEDED as the plan to follow by [`MASTER-PLAN.md`](MASTER-PLAN.md) (v4.0).** This file remains the detail annex for API/widgets/tokens/menus/starters. Corrections made later: fast path is 39 days (not 33); the deploy kit now lives in `bootstrap/` and targets a **new repo** with Laravel at the root (no `platform/` folder).

---

## 1. Review of the blueprint — keep / fix / reject

| # | Blueprint item | Verdict | Problem (evidence) | Fix in this plan |
|---|---|---|---|---|
| 1 | **Option A: Hostinger Git Manager auto-pull** | ✘ reject for Laravel | Hostinger's Git deploy **runs no build step; "what's in the repo is what gets served"** and replaces files in the deploy dir ([Hostinger docs](https://docs.hostinger.com/websites/git)). Laravel needs `vendor/` + Vite build; the docroot must be `public/`, not the app root | **Option B only** (GitHub Actions builds, then ships) |
| 2 | Workflow `rsync` to **`public_html`** | ✘ unsafe | Uploading the whole Laravel app into `public_html` exposes `.env`, `app/`, `storage/`. Docs/guides put the app **outside** the web root and symlink `public_html → app/public` ([campcodes](https://www.campcodes.com/blog/how-to-deploy-a-php-application-to-hostinger-step-by-step-guide-2026/)) | release dirs + symlink swap (§2) |
| 3 | Missing **SSH port** | ✘ will fail | `easingthemes/ssh-deploy` defaults to port 22; Hostinger **shared uses 65002** (VPS 22) ([kahunam](https://kahunam.com/articles/web-development/how-to-deploy-to-hostinger-automatically-with-github-actions/)) | `REMOTE_PORT` secret |
| 4 | `easingthemes/ssh-deploy@main` | ✘ supply-chain risk | unpinned branch ref runs whatever is on `main` | use plain `rsync`/`ssh` (no third-party deploy action) and **pin** official actions; if the action is used, pin a tag/SHA (latest listed: v6.0.1 — [Marketplace](https://github.com/marketplace/actions/ssh-deploy)) |
| 4b | Diagram says "runs Pest tests" — YAML doesn't; no `setup-node`; no migrate/cache; no rollback | ✘ gaps | — | test job with **Postgres service** (RLS tests need real Postgres), migrate, cache, health check, rollback |
| 4c | Deploys `main` straight to production; this repo's root **is the live static Woodex site** | ✘ dangerous | P15's own README warns "overwrites every page" | platform lives in `platform/`; `develop` → **staging**; production only by **manual dispatch**; first cut-over per v2 §12.4 |
| 5 | Pure headless API + Sanctum for every frontend | ◐ fix auth | Browsers can't hold secret tokens. Sanctum is for **dashboards/builder/staff** | three credential types (§3.1) |
| 6 | `GET /tenant/theme`, `/pages/{slug}`, `/navigation/{location}`, `POST /crm/lead` | ◐ rename/clarify | `/navigation` **already exists** in v1 as the *admin sidebar* API (collision); "tenant" is now "site" | map in §3.2 (public ones under `/delivery` and `/public`; admin sidebar stays `/me/navigation`) |
| 7 | Frontends "fetch Puck JSON directly" | ◐ accept with contract | Puck data = `{content[], root, zones}`; `zones` is being **deprecated for slot fields** ([Puck docs](https://puckeditor.com/docs/api-reference/data-model/data)); Puck's `<Render>`/`<ServerRender>` are **React** — Vue/Nuxt/Blade need their own renderer | canonical store = Puck data **wrapped with `schema_version`** + per-widget JSON Schema; Blade is the reference renderer (§4) |
| 8 | Widgets as "plugins" in `resources/js/puck/plugins/*.jsx` that also work in "frontend renderers" | ◐ fix | a `.jsx` file is React-only, so it cannot be "universal"; also "plugin" collides with Puck's own *plugin API* (editor-UI extensions) | **Widget = schema.json + Blade partial (output) + Puck config (editor)**; call them *widgets*, not plugins (§4) |
| 9 | `api_data_source: "/api/v1/projects?category={filter}"` fetched by the client | ✘ rework | a free-form URL string in stored content is an injection/SSRF-style hazard, and client-side fetch **hurts SEO and the P15 PageSpeed (91–97)** | **named, whitelisted data sources** resolved **server-side at publish** (+ optional client filter calls) (§4.3) |
| 10 | Theme tokens printed with `{{ … }}` into `<style>` | ◐ harden | Blade escaping is HTML-oriented, not CSS-safe; values come from user input | strict validators + allow-lists; deliver as hashed `theme.css`; inline only critical vars (§5) |
| 11 | `navigation_menus` single JSONB tree | ◐ accept lean model, add safety | no versions/draft, no locale, slug links break on rename, no size/depth limits, `tenant_id` naming, no RLS | versioned JSONB tree with schema validation + page-uid refs (§6) |
| 12 | `applyTemplateToTenant()` | ✘ unsafe | `'is_published' => true` publishes untouched template instantly; no draft version row; **mass-assigns `tenant_id`** (bypasses scopes); slug collisions; media/placeholders not remapped; menus/theme not applied; no transaction/authorization/idempotency | `SiteStarterService::apply()` (§7) |
| 13 | Roadmap "without delaying Phase 0" | ◐ not free | CI/CD + public API + widgets + megamenu + starters are real work | revised days in §9 (**61 → 71**) |

---

## 2. GitHub → Hostinger pipeline (Option B, corrected)

```
push to develop ──▶ [test] Pest + Postgres service (RLS isolation tests)
                      └▶ [build] composer --no-dev, npm ci, vite build (incl. Puck island) → release.tgz (artifact)
                           └▶ [deploy:staging] scp → ~/releases/<sha> → remote release.sh
manual dispatch (target=production, ref=tag) ─▶ same jobs, environment: production
```
**Server layout (Hostinger, via SSH — shared port 65002, VPS 22):**
```
~/releases/<sha>/              ← extracted build (app outside the web root)
~/shared/.env                  ← created once by hand on the server; never in git/CI
~/shared/storage/              ← logs, cache, framework dirs (symlinked into each release)
~/current  → releases/<sha>    ← atomic symlink swap (ln -sfn + mv -T)
public_html → ~/current/public ← one-time setup (rm -rf public_html; ln -s …) — verify per plan in Phase 0
```
**`release.sh` (runs on the server, committed in `platform/deploy/`):** extract → link shared `.env`/`storage` → `php artisan down --retry=30` → **pre-migration DB backup** (Supabase Free has no daily backups; our `app:backup-db` → R2) → `migrate --force` → `config:cache route:cache view:cache` → swap `current` → `up` → health check `/up` → **on failure: repoint to previous release, `up`, exit non-zero** → keep last 5 releases.
**Secrets (GitHub → Settings → Secrets, per environment):** `SSH_KEY` (dedicated deploy key, ed25519), `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_KNOWN_HOSTS` (pinned host key, no trust-on-first-use), `PHP_BIN` (e.g. `/opt/alt/php83/usr/bin/php` — confirm path in Phase 0). **No DB/R2/PSP secrets in GitHub** — they live only in `~/shared/.env`.
**Environments:** `staging` = `staging.<domain>` + its **own Supabase project** (free tier allows 2 active projects); `production` = separate project. Required-reviewer rules on private repos may need a paid GitHub plan — verify; the plan does not depend on them (production is `workflow_dispatch` only).
**Free CI note:** GitHub Actions free minutes are enough for this size; check current quota for private repos in Phase 0.
**Phase 0 exit gate:** push to `develop` → staging updates itself; a deliberately broken migration triggers automatic rollback; production dispatch works with a no-op release.

### 2.1 Hostinger decision ladder (decided 2026-10-02 after reviewing the "`.htaccess` into `public_html`" guides)
Test the options **in this order in Phase 0** (half a day); take the first one that works on your plan.

| Step | Method | Use when | Verdict |
|---|---|---|---|
| **1** | **Actions → release folders → symlink `public_html → current/public`** (§2) | SSH is on and symlinks are allowed | **Target setup.** App, `.env`, `vendor` are outside the web root. Fast rollback |
| **2** | Actions → app outside `public_html`; **copy `public/` into `public_html`** and edit its `index.php` paths (`../current/...`) | SSH on, symlink to `public_html` blocked | Safe fallback. Deploy script does the copy. Slightly slower, no atomic switch |
| **3** | Move to **Hostinger VPS** (KVM 2, about $15/mo; SSH port 22, real web root, queue workers) | Shared plan has no SSH or blocks both of the above | Needed anyway when real clients arrive |
| **4** | `.htaccess` rewrite (`RewriteRule ^(.*)$ public/$1 [L]`) with the whole app in `public_html` | **Only for a throw-away demo** | **Not for production** |

**Why not the `.htaccess` method (guide 1 and 2):**
- It works, but security depends on **one file**. If a deploy replaces it or the rewrite engine is off, `storage/logs`, `composer.json`, `config/*` and `.env` can be downloaded.
- Hostinger's Git deploy **replaces files in the deploy directory and runs no build** ([docs](https://docs.hostinger.com/websites/git)). So `vendor/` and `public/build/` would have to be committed to git or built by hand on the server.
- "Run `composer install` on the server" is fragile on shared hosting (memory/time limits, PHP version mismatch). Our CI builds `vendor/` and the Vite assets once, with PHP 8.3, and ships the result.
- Manual zip upload has no tests, no rollback and no history.

**What the guides got right (already in the plan):** Node is not needed on the server (we build in GitHub Actions) · no daemons: **cron every minute runs `schedule:run`** and `queue:work --stop-when-empty` (DB queue) · root/sudo is not available · local and server **PHP version must match (8.3)**.
**If the `.htaccess` fallback is ever used for a demo:** also add `Options -Indexes` and deny rules for dotfiles, `.env`, `*.log`, `composer.*`; keep `storage/` and `vendor/` unreachable; test `/.env`, `/storage/logs/laravel.log`, `/composer.json` all return 403/404 **after every deploy** (CI smoke test).

---

## 3. Multi-frontend API contract

### 3.1 Credentials (who may call what)
| Credential | Held by | Can do | Cannot do |
|---|---|---|---|
| **Sanctum token** (opaque, revocable, TOTP at login) | TailAdmin dashboards, Puck builder, staff, agencies | everything their role allows | — |
| **Publishable key** `pk_…` (per site, origin-locked, rate-limited) | **browsers / any public frontend** | `GET /delivery/*` (published only), `POST /public/forms/{id}` | read drafts, any admin route |
| **Secret key** `sk_…` (per site, server-side only) | Next.js/Nuxt/SSR servers, build scripts | everything `pk_` can + create **preview tokens** to read drafts | admin writes |
| **Preview token** | editors' preview links | one page's draft for ≤ 1 h | anything else |
Rules: CORS allow-list per site; published content only; `ETag` + `Cache-Control: s-maxage` so **Cloudflare caches** delivery responses; purge on publish; public POSTs need Turnstile + rate limit + idempotency key.

### 3.2 Endpoint mapping (your names → final)
| Blueprint | Final path | Notes |
|---|---|---|
| `GET /tenant/theme` | `GET /api/v1/delivery/theme` (JSON tokens) and `GET /api/v1/delivery/theme.css?v=<hash>` | site resolved from key or `Host`; immutable when hashed |
| `GET /pages/{slug}` | `GET /api/v1/delivery/pages/{slug}?locale=` | returns `{ schema_version, data:{content,root,zones}, seo, layout:{header_menu, footer_menu, theme_hash}, etag }`; `?include=layout` embeds menus to save a round trip |
| `GET /navigation/{location}` | `GET /api/v1/delivery/menus/{location}` (`header|footer|mobile`) | admin sidebar remains `GET /api/v1/me/navigation` |
| `POST /crm/lead` | `POST /api/v1/public/forms/{form_id}` | validates against the form's field schema; creates lead + notifies; never echoes PII |
| (new) | `GET /api/v1/delivery/widgets` | widget registry (schemas) so any renderer can implement widgets |
| (new) | `GET /api/v1/delivery/collections/{type}?filter[…]=&limit=` | the only data endpoint widgets may call |
| (new) | `GET /api/v1/delivery/sitemap.xml`, `/robots.txt` | per site |
OpenAPI is generated by **Scramble** from these routes (v3 decision), with response schemas from Laravel API Resources.

---

## 4. Widget registry ("global plugin engine", corrected)

### 4.1 What a widget is
```
widgets/<id>/
  widget.json        ← id, version, category, label_i18n, props_schema (JSON Schema), defaults, data_sources[], a11y notes
  view.blade.php     ← output renderer (reference; SSR/SSG, SEO-safe)
  editor.jsx         ← Puck component config (fields generated from props_schema; custom preview only if needed)
  snapshot.test      ← golden HTML for default + 2 prop variants
```
- **Single source of truth = `widget.json`.** A build script generates the Puck `fields` from `props_schema` (so editor and output cannot disagree) and publishes the registry at `/delivery/widgets`.
- **Registry injection:** `resources/js/puck/widgets/index.js` auto-imports every `editor.jsx`/generated config (Vite glob). New widget = new folder; no registry edits.
- **Other frontends:** Next/Vue/Nuxt implement the same `widget.json` in their own component; the contract is the schema, not the JSX. We ship Blade first; React/Vue renderers are built on demand (v3 scope cut).
- **Security:** widgets are **platform-curated code** (reviewed, in git). Tenants/agencies choose and configure widgets; they **cannot upload JSX/JS** in v1. Agency-custom widgets = pull request or later marketplace with review.
- **Naming:** we call these *widgets* to avoid confusion with Puck's *plugin API* (editor-UI extensions: `renderRoot`, `renderFields`, …).

### 4.2 v1 widget set (Interior & Fit-out) — 12
`hero` · `rich-text` · `feature-grid` · `service-cards` · `process-steps` · `portfolio-grid` (collection-backed) · `gallery` · `testimonials` · `faq` (+FAQ JSON-LD) · `stats` · `cta-bar` · `contact-form` (bound to `/public/forms`). Plus layout widgets used by menus: `promo-banner`. (3D/AR portfolio, estimator embed, booking widget = later.)

### 4.3 Data sources (replaces the free-form `api_data_source` URL)
```jsonc
// widget.json
"data_sources": [{
  "key": "projects",
  "collection": "projects",                       // must exist in the site's collections
  "params": { "category": {"type":"string","from_prop":"filter_category"},
              "limit": {"type":"integer","max":24,"default":6} },
  "fields": ["title","slug","cover","category"]   // whitelist of returned fields
}]
```
- **Resolved server-side at publish** and embedded into the rendered HTML (SEO + speed). On content change, affected pages are **re-rendered by a queued job** and the Cloudflare cache is purged.
- Optional client-side filtering (e.g. category tabs) calls only `GET /delivery/collections/{type}` with the same typed params and a `pk_` key; arbitrary URLs are rejected at save time.
- Puck's `resolveData` (async prop resolution) and `external` fields can be used **inside the editor** to preview the live data; the published output does not depend on them.

---

## 5. Theme token system (hardened)

**Canonical variables** (one namespace, used by Blade, Tailwind v4 and other frontends): `--wx-color-{primary,secondary,surface,text,accent,muted,success,danger}`, `--wx-radius-{sm,md,lg,pill}`, `--wx-font-heading`, `--wx-font-body`, `--wx-space-section`.
(Your `--brand-*` names are accepted as **aliases** in `theme.css` for compatibility, but widgets use `--wx-*` only.)
**Stored** per site (`themes` table, versioned; agency brand-kit → site → page override inheritance).
**Validation on save (server-side, rejects otherwise):** colours = `#rgb/#rrggbb/#rrggbbaa` only · radius = `0–32px` or `9999px` · fonts = **allow-list of self-hosted** families (Plus Jakarta Sans, DM Sans, Inter, + agency-approved) · **WCAG AA contrast** check text/surface and primary/primary-contrast · max payload size.
**Delivery:** `theme.css?v=<sha>` (immutable, CDN-cached) + a tiny inline `:root{…}` of critical variables generated from the **validated** token object (never raw user strings). Light/dark: `data-theme` attribute; choice cached in `localStorage` and applied by a 5-line inline script before paint to avoid the flash.
**TailAdmin:** its Tailwind v4 theme maps to the same variables, so dashboard screens rebrand per agency (white-label) with no code change.
**Example token JSON** = your `tokens.colors/typography/borders` shape is kept; add `schema_version` and `dark` overrides.

---

## 6. Header / footer / mega-menu builder

**Model (lean, safe):** `menus(site_id, location, locale, status[draft|published], version)` + immutable `menu_versions(menu_id, version, tree JSONB, created_by)`; the editor (TailAdmin drag-drop tree) saves a whole tree per version.
```sql
CREATE TABLE app.menu_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     uuid NOT NULL REFERENCES app.sites(id),
  menu_id     uuid NOT NULL REFERENCES app.menus(id),
  version     int  NOT NULL,
  tree        jsonb NOT NULL CHECK (jsonb_typeof(tree) = 'array' AND pg_column_size(tree) < 65536),
  created_by  uuid, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_id, version)
);
ALTER TABLE app.menu_versions ENABLE ROW LEVEL SECURITY;  ALTER TABLE app.menu_versions FORCE ROW LEVEL SECURITY;
-- policy: site_id = NULLIF(current_setting('app.site_id', true), '')::uuid  (USING + WITH CHECK)
```
**Node schema (JSON Schema, validated server-side):** `type: link | page | collection | button | group | megamenu | widget`, `label_i18n`, `page_uid` (preferred) or `url` (https/relative only), `icon` (allow-listed set), `excerpt_i18n`, `children[]` (**max depth 3, max 100 nodes**), `widget` (only `promo-banner` and other whitelisted widgets, using Puck slot data), `visibility`.
**Links reference page UIDs**, resolved to slugs at delivery → renaming a page cannot break the menu; broken refs are flagged in the editor.
**Mega-menu column** = `group` with icon + link + excerpt (as in your diagram); promo column = `widget` node.
**Publish:** same draft → publish flow as pages; `GET /delivery/menus/{location}` returns the published version with resolved links; header/footer HTML is rendered into every page at publish (purge-on-change).
**Mobile:** `location=mobile` may reuse `header` via flag.

---

## 7. Starter template engine (corrected)

**Global starters** live in a system table (`site_id IS NULL`, read-only to tenants via a dedicated RLS policy `USING (site_id IS NULL OR site_id = current)` for `SELECT` only); agency-private starters carry `agency_id`. Each starter is **versioned**: `{theme_tokens, menus, global_sections, pages[] (Puck data + seo), media manifest, placeholders, collections seed}`.
```php
// app/Services/SiteStarterService.php
public function apply(Site $site, Starter $starter, User $by): StarterApplication
{
    Gate::forUser($by)->authorize('apply', [$starter, $site]);          // agency/site permission

    return DB::transaction(function () use ($site, $starter, $by) {
        $app      = $site->starterApplications()->create([
                       'starter_id' => $starter->id, 'starter_version' => $starter->version, 'applied_by' => $by->id]);
        $mediaMap = $this->media->copyManifest($starter, $site);         // R2 server-side copy → [oldUid => newUid]
        $this->themes->applyTokens($site, $starter->theme_tokens);       // validated like any theme save
        $ctx      = $site->placeholderContext();                         // {{company.name}}, {{company.phone}}, {{company.whatsapp}}…

        foreach ($starter->pages as $p) {
            $data = $this->rewrite($p->puck_json, $mediaMap, $ctx);      // swap media uids + placeholders
            $page = $site->pages()->create([                             // relation → tenant scope applied, no mass-assigned site_id
                'slug' => $this->uniqueSlug($site, $p->slug), 'title' => $p->title,
                'status' => 'draft', 'starter_origin' => "{$starter->id}@{$starter->version}",
            ]);
            $page->versions()->create(['version' => 1, 'data' => $data, 'seo' => $p->seo, 'created_by' => $by->id]);
        }
        $this->menus->seedFromStarter($site, $starter->menus);           // links by page_uid via old→new map
        $this->collections->seed($site, $starter->collections);
        return $app->markComplete();                                     // report: created/skipped/renamed
    });
}
```
Rules: everything lands as **draft** (review → publish); idempotent per `(site, starter, version)`; slug collisions get a suffix and are reported; **starter updates never overwrite a live site** — a later "diff-and-apply" shows what changed (v2 §4.2). Provenance stored (`starter_origin`) for the agency's bulk-update tool.

---

## 8. Updated architecture view
```
GitHub (develop/tags) ─Actions─▶ Hostinger releases/ + current symlink ─▶ Laravel 12
   Laravel: /app (TailAdmin) · /builder (Puck island) · /console (Filament) · /api/v1 (Sanctum + pk/sk keys)
   Delivery path: /delivery/* + published HTML ─▶ Cloudflare cache (purge on publish) ─▶ any frontend (Blade static, Next, Nuxt, Alpine)
   Data: Supabase Postgres (RLS, session pooler) · R2 (media, backups) · queue = DB driver driven by cron
   Content model: sites → pages/page_versions (Puck data) · widgets registry · themes · menus/menu_versions · starters/starter_applications
```

---

## 9. Revised roadmap (replaces v3 §5 numbers)

| Phase | Added by this expansion | Base (v3) | New total |
|---|---|---|---|
| 0 Setup & de-risk | **+2** CI/CD pipeline (test→build→release symlink→rollback), staging env, Hostinger symlink/SSH-port probe | 6 | **8** |
| 1 Core | **+2** `pk/sk` keys + CORS, `/delivery` skeleton (theme, pages, menus, widgets), theme validators | 7 | **9** |
| 2 Woodex migration | — | 10 | 10 |
| 3 Builder + publish + tokens | **+8** widget registry + schema→Puck generator + 12 widgets (Blade + editor + snapshot tests) **+4**, menu/mega-menu builder **+2**, starter engine **+2** | 14 | **22** |
| 4 CRM + sales | — | 10 | 10 |
| 5 Agency lite | **−2** (site-from-starter already built in Phase 3) | 8 | **6** |
| 6 Go-live | — | 6 | 6 |
| **Total** | **+10 net** | 61 | **≈ 71 days** (est. ±30 %) |
Pro-forma at the PRD's own ≈ $143/day ≈ **$10.2k** (not a quote). One developer ≈ 14–15 weeks → **go-live ≈ late January–February 2027** if Phase 0 starts mid-October; two developers from Phase 3 ≈ 10–11 weeks.
**Fast path (≈ 39 d; 8 + 9 + 22):** Phases 0 → 1 → 3 = multi-site builder with widgets, tokens, menus, starters, deploy pipeline.
**Cost impact on monthly infra:** none (Actions free minutes assumed; staging uses the 2nd free Supabase project).

---

## 10. Added risks
| Risk | Mitigation |
|---|---|
| `public_html` symlink may not be allowed on the chosen Hostinger plan (sources conflict: one says web root can't be changed, guides use a symlink) | Phase 0 probe; fallback = copy `public/` into `public_html` with edited `index.php` paths (app stays outside), or VPS |
| Blade output vs Puck editor preview drift (two renderers per widget) | schema-generated fields, golden snapshot tests per widget, visual diff in CI |
| Puck data-format changes (`zones` → slots) | `schema_version` wrapper + migration step in the page loader; pin Puck version |
| Public delivery abuse (scraping, hotlinking `pk_`) | origin lock, rate limits, Cloudflare WAF rules, key rotation |
| Re-render storms after a global change (theme/menu) | queue with batching + debounce; purge by tag; staged rollout per site |
| Rollback restores code but not data | migrations additive-only; pre-deploy DB backup; destructive changes only in a later release |
| GitHub plan limits on environments/minutes | production by manual dispatch; check quotas in Phase 0 |

## 11. Needed from you (unchanged items first)
1. Hostinger **plan name + SSH enabled?** (decides symlink/SSH port 65002 vs VPS 22).
2. Supabase **two projects** (staging + production) and Cloudflare account/domain + R2 bucket (no secrets in chat).
3. Confirm: Woodex is the only pilot; Interior & Fit-out only vertical for v1.
4. Who builds the Puck/React part?
5. **New:** OK that the legacy live site stays untouched until the Phase-6 cut-over, with `platform/` developed on `develop` → staging?
6. **New:** staging domain/subdomain name (e.g. `staging.<your-domain>`).
