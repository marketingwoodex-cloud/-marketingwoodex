# Master QA sweep + the fixes (2026-10-12, fourth batch)

**Measured over every route the admin app has — 58 of them.**

| | Before this batch | After |
|---|---|---|
| Screens stuck on "Loading…" | **11** | **0** |
| Screens with JS errors | **14** | **0** |
| API actions the app calls | 271 | 271 |
| API actions the preview could answer | 31 | **all of the ones the screens use** |
| Business info vs Integrations | **identical page** (app bug) | two different screens |

Reproduce: `tools/qa-p29/master-qa.mjs` (walks every route, records the actions each screen calls,
whether "Loading…" is still on screen, JS errors with file:line, row counts, render time).

## 1. The one real app bug — Business info was Integrations

`admin-fields.js` defines a full **Business info** screen (Contact & hours / Brand & logo /
Social profiles) — address, phones, WhatsApp, social links, applied to ~85 pages. Then
`admin-settings.js` — which loads *later*, so it always won — ended with:

```js
W.VIEWS.business       = W.VIEWS.settings;   // ← clobbered the screen above
W.VIEWS.integrations   = W.VIEWS.settings;
W.VIEWS.connections    = W.VIEWS.settings;
```

So `#/business` and `#/settings` rendered the same Integrations page. The first line is removed;
`integrations` and `connections` stay aliases on purpose (they *are* the settings screen with a
different tab). This also explains "still both same page nothing change no design improve".

## 2. Why almost every screen hung on "Loading…"

The preview server answered only 31 of the 271 API actions the app calls. A screen whose action
gets an empty answer never finishes, so it keeps its placeholder. That is a **preview harness
gap, not an app bug** — but it made the preview useless for QA, so it is fixed:

- New `tools/qa-p29/preview_fixtures.py`: sample answers in the **same shape as the real API**
  (verified against `api/*.php` and against how each screen reads the response) for leads, clients,
  quotes, invoices, projects, bookings, media, files, database browser, CMS, SEO, forms, profile,
  logos, SEO agent, speed/PSI, activity, team, templates, approvals, notifications, announcement
  and business info. Sample data only — no credentials, no real customer.

## 3. The 11 stuck screens and what was missing

| Screen | Missing in the preview answer |
|---|---|
| Bookings | `cfg.days` / `cfg.blocked` (the closed-day check); `pending` must be a **list**, not a count |
| Clients | `clients_master` was not answered at all |
| Quotations | `quotes_list` was not answered at all |
| Leads | `leads_list` had no `team` / `sources` (the "Came from" and owner filters) |
| Forms | each form's `cfg`, `fields`, `pages`, counters |
| Estimator | each template's `rates.services` (the table reads the count per template) |
| Media library | `files` / `folders` / `trash` |
| File manager | `items[]` with `path` + `size` |
| SEO agent | `engines` as `{default, list}` and `last.issues` as a **list** of findings |
| My account | `activity[]` for the timeline; `me_get` `profile.whatsapp` |
| Maintenance | the `pages[]` the screen lists |
| Global (announcement) | the key is `ann`, not `cfg` |
| Database | `dbx_browse` `cols` + `rows` |

Plus two shape traps worth remembering: `pages_list` is the **builder's file list**
(`insights/<slug>/index.html`, `mtime` as an epoch number) while `cms_list` is the **CMS content
list** — the screens use both, for different things.

## 4. Also verified in the same sweep

- **Bookings** — calendar with Today / Next 7 days, Waiting / Confirmed / Done legend, real chips.
- **Clients** — 5 clients, "1 active · 1 returning", lifetime billed and outstanding balance from
  real totals.
- **Quotations** — Q-2026-0114 sent, Q-2026-0119 approved (PKR 42 lac shown), drafts.
- **Blog & insights** — the article panel now lists published insights articles with word counts
  and SEO health (it needs `insights/<slug>/index.html` paths), Live/Draft badges correct.
- **Projects** — Active 3, contract value, Invoiced/Received/Balance bar.
- **Activity log, Database, File manager, Maintenance, My account, Media** — all render with data.

## 5. Still open (not a bug, a decision)

- The **frontend mirror** `frontend-v1/admin` is an older copy of this app (`KNOWN_DRIFT`). If the
  mirrored copy is what gets deployed somewhere, today's fixes are not in it — say the word and I
  sync it (U6 / AS-32).
- The **dark-mode pass** and the **contrast gate** stay green after this batch (0 below AA).

## 6. Environment notes

- Preview runs with the account list in a git-ignored local file
  (`tools/qa-p29/.preview-accounts.local.json`); `__pycache__/` is now ignored too.
- `master-qa.mjs` takes the preview account from the environment only — no credential values in
  the repo (its own default fallback was removed for that reason).
