# Branch `arena/8a776c65-marketingwoodex` — what it is, what is usable

Reviewed 2026-10-12 by fetching the branch read-only into the local checkout.
Nothing was copied from it into this branch: it is a **parallel lineage**, not a newer
version. Where the two overlap, this branch is the newer one (see the comparison below).

## What that branch contains

| Area | Content |
|---|---|
| Deploy scaffolding | `Dockerfile`, `render.yaml`, `deploy/agentbridge.zip` (a WordPress plugin, unrelated), `netlify/*` functions |
| Parallel app copies | `frontend-v1/`, `p22-preview/`, `p23-live/`, `wf-admin/`, `woodex-live-v3/`, `supabase/`, `pro/`, plus its own `woodex-live-p29-v2.1` and `woodex-live-p29-v2.1-pro` |
| Planning docs | `MASTER-PLAN-V2.1.md`, `HOSTINGER-DEPLOYMENT-GUIDE.md`, `ADMIN-DEEP-AUDIT-AND-PLAN.md`, `FEATURES.md`, `MASTER-PLAN-P16…P19.md`, `GO-LIVE-AUDIT-REPORT.md` |
| Migrations | `netlify/quotation-templates-schema.sql`, `netlify/quotations-schema.sql`, `netlify/migration-v2-sections-invoices.sql`, `supabase/*.sql` — schema only, no rows |

## Comparison with this branch (`arena/7f38fddd`)

* **Schema: this branch is the superset** — 25 tables against their 20. No table is unique to them.
* **Redirects**: their `api/redirects-lib.php` is the *pre-fix* version; this branch already merges
  the shipped plan whenever it changes and remembers deletions (`rd_plan_hash` / `cfg.skip`).
* **Milestone billing**: their `api/sales17-lib.php` deletes the replaced invoice; this branch
  archives it to `wx_invoices_archive` first — keep ours.
* **Auth**: their `api/admin.php` drops Google sign-in (`auth_info`) and the shared-feed library;
  this branch still has them — keep ours.
* Their admin templates set `base href`, which this branch already handles.
* No data dump exists anywhere on that branch either: its largest `.sql` is 13,732 bytes of DDL.
  The real-data route therefore stays as agreed (a dump into Google Drive).

## Worth adopting from their planning docs

1. **Design tokens conflict — needs a decision.** `MASTER-PLAN-V2.1.md` specifies a
   "Preline Ocean Pure" palette (obsidian background, cyan accent). The DESIGN.md that was
   pasted for Admin V2.1.1 — the standing source of truth — specifies the current light
   gray/white surfaces with a blue accent, which is what `admin/woodex-v21.css` implements and
   what the delivered screenshots show. **Current work follows DESIGN.md**; switching to the
   cyan/obsidian palette is a one-file change if that is what the owner wants.
2. **Section library target: 70 blocks in 8 categories.** Spec from their doc:
   Hero & Banners (10), Kitchens & Cabinetry (10), Wardrobes & Closets (10),
   Office & Commercial Fit-out (8), Features & Services (12), Testimonials (6),
   CTA / Estimator / Contact (10), FAQ & Accordion (4).
   Current library shows **51 blocks** — 19 short of the spec; the category set exists but is
   thinner than described.
3. **Template card actions:** 1-click copy HTML, 1-click insert into the builder, and a preview
   modal that tests 375 / 768 / 1280 px. The library has the insert path; copy + breakpoint
   preview are the additions.
4. **Icon matrix:** 18px stroke icons from one helper (`W.ic`), navigation and action names listed
   in their doc. This branch already uses the Lucide sprite for the same purpose.

## Hostinger deployment steps (condensed from their guide, credential-free)

1. hPanel → Websites → Dashboard (`woodex.com.pk`) → File Manager → `public_html/`.
2. Upload the master zip, extract **directly into** `public_html/` (not into a subfolder).
3. Confirm `index.php`, `index.html`, `config.php`, `woodex-database.sql` and `admin/` sit at the
   top level of `public_html/`.
4. hPanel → Databases → create the MySQL database and user.
5. phpMyAdmin → Import → choose `woodex-database.sql` → Go (creates the schema and seed rows).
6. Put the database name/user/password into `config.php` (or the environment) and sign in to
   `/admin/` once to confirm the connection.

## Security findings on that branch (act on these independently of the code work)

* **The live Telegram bot token is hardcoded** in `woodex-live-p29-v2.1/admin/admin-tg.js`, twice —
  as the input's default value and as the fallback in the connect handler. Anyone who can read
  that file can control the bot (read and send messages as it). This branch removed the literal
  earlier (task C-1); the token itself should be treated as compromised and rotated in BotFather.
* **The deployment guide and the master plan print the shared password** for the six team accounts
  (`master@`, `manager@`, `developer@`, `sales@`, `support@`, `admin@` at `woodex.pk`). Those
  values should be rotated before the site is handed over, and the docs removed from the repo.
* Both issues sit on a repository that is still public, so rotation — not deletion — is the fix.

## Accounts confirmed for testing

The six team accounts map cleanly onto the role model and now work in the local preview
(`tools/qa-p29/.preview-accounts.local.json`, git-ignored, values never committed):

| Account | Role | Label | Builder token | Nav groups |
|---|---|---|---|---|
| `master@woodex.pk` | owner | Master | yes | self, sales, conversations, updates, broadcast, ai, website, settings, master |
| `admin@woodex.pk` | owner | Master | yes | same as master |
| `manager@woodex.pk` | admin | Manager | yes | all but `master` |
| `developer@woodex.pk` | editor | Developer | yes | self, website, settings |
| `sales@woodex.pk` | sales | Sales | no | self, sales, conversations |
| `support@woodex.pk` | support | Support | no | self, conversations, updates, support_view |

Verified: every account signs in, Master and Manager and Developer get a builder token, Sales and
Support do not; Developer sees Section library (51 cards), Header & footer and Hero slides **without**
any "No builder access" refusal; master-qa sweep as `master@woodex.pk` = 58 routes, 0 stuck, 0 page errors.
