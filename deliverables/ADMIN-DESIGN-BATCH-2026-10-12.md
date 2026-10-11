# Admin design batch — U1–U3, AS-27…AS-31, OV-2, AU-10 (2026-10-12)

Tree: `woodex-live-p29-v2.1-pro` (source of truth, your decision D-3).
Nothing was deployed, no live site or production file was touched, no credential was changed.

## 1. What this batch fixed

| ID | Task | Status now | Evidence |
|---|---|---|---|
| OV-2 / AD-18 | Dashboard charts used gold/navy literals and kept their colours after a theme switch | **DONE** | canvas pixels: light mean ink `rgb(36,96,228)` (blue-600), dark `rgb(102,168,250)` (blue-400), `repainted:true` — `tools/qa-p29/ui-design-batch.mjs` |
| AD-18 | The theme toggle re-routed the dashboard (a full API refetch on every toggle) | **DONE** | `admin.js` toggle now only flips the class; charts repaint through `window.WXPalette` |
| AD-18 | Report chart (`admin-reports.js`) had `#c9a97a` / `#0c1628` / `#16a34a` and no re-theme | **DONE** | same palette helper, renderer registered while the modal is open |
| AU-10 | AI Assistant tab icons sat against their labels | **VERIFIED, no edit needed** | `.seg button` (`woodex-ds.css` line 258) already gives `display:inline-flex; gap:7px`; measured 7 px on all five `#ai-subnav` tabs in both themes |
| AS-27 | `.side` `!important` obsidian/navy sidebar blocks | **DONE** | one token set in `admin.css` (`--side-bg/fg/muted/hover/active/line`), light + dark; 27 `!important` declarations removed; `woodex-ui.css` sidebar tokens now alias them |
| AS-28 | Literal palettes in `admin-security.js`, `admin-conn.js` | **DONE** | 99 literals → `var(--card)`, `var(--card-sub)`, `var(--line)`, `var(--txt/2)`, `var(--mut)`, `var(--pri)`, `var(--pri-fg)`, `var(--code-bg/fg)`, `var(--ok/bad)` |
| U2 / AS-30 | ~60 literal colours in `admin/*.js`, inline styles everywhere | **DONE for the app chrome** | 343 replacements across 21 files, by property (backgrounds, borders, ink, gold family); `admin-theme.js`/`admin-chrome.js` palettes and `admin-print*.js` print inks are **data**, deliberately untouched |
| U7 / AS-31 | `Plus Jakarta Sans` leftovers | **DONE** | active font stack was already Inter; header comment corrected; remaining mentions are the *site-theme* preview in `features.html` / `master-components.html` (content, not admin chrome) |
| AS-33 | Audit manifest / CSS refresh | **PARTIAL** | cache-busters bumped to `?v=ui-3` for the changed assets (fixes the stale-CSS-after-deploy half of AD-26); `manifest.json` refresh still open |
| — | KPI delta ink (`▲ 26%`) failed AA in light mode (2.62:1) | **DONE** | `.dl.up/.dl.down` re-inked for both themes (`#047857`/`#b42318`, dark `#34d399`/`#fca5a5`) |
| — | Sign-in "or" divider was 4.39:1 light / 3.94:1 dark | **DONE** | now `var(--mut)`; login page audited clean in both themes |
| — | C-1 residue: `#c59b27` gold on the login button and shell | **DONE** | login button is `var(--pri)` / `var(--pri-fg)`; shell has no gold literal left |

## 2. What was added

- `admin/uipal.js` — resolves the theme tokens for `<canvas>` (canvas cannot read `var()`), keeps a
  registry of chart renderers keyed per screen, and repaints them when the theme class flips
  (including a live OS dark-mode change). Fallback literals are used only if the stylesheet is missing.
- `tools/qa-p29/ui-design-batch.mjs` — headless check: routes × both themes, chart ink sampling,
  icon-to-label gap measurement, inline-hex census, screenshots.
- `tools/qa-p29/login-contrast.mjs` — rendered AA audit of the sign-in page (it signs in nowhere).
- `tools/qa-p29/preview-server.py` — new **seeded `dash_data` fixture** (U4). The KPI row, chips,
  funnel, target ring, follow-ups, overdue invoices, latest-enquiries table and the chart can now be
  seen and measured; before this, data-heavy screens showed "Dashboard data is incomplete".

## 3. Verification (all on a local stub — no live data)

| Check | Result |
|---|---|
| `node --check` on every admin JS | 65 / 65 pass |
| Design batch, 6 routes × 2 themes | 0 page errors, chart repaint confirmed, tab gap 7 px |
| `theme-contrast.mjs` — full route sweep (58 screens × 2 themes) | light: 1 screen below AA → **fixed**, re-check 0; dark: 0 |
| HEAD baseline (`git archive`, same sweep) | light 0, dark 0 — so this batch introduced and then closed one contrast item, and no others |
| Sign-in flow (`preview-login-test.mjs`) | sign-in true, reload persists, 30 × HTTP 200, 0 page errors |
| Login page AA audit | 0 failures, both themes |
| `regression_static.py` | 15 / 15 PASS (the four `frontend-v1` mirror checks are now reported as *known drift, U6 open*) |
| `reverify_findings.py` | 51 PASS / 5 FAIL / 10 INFO — see §5; the five FAILs are stale expectations, not regressions |

Screenshots and JSON reports: `/tmp/ui-batch-final/`, `/tmp/contrast-final2/` (sandbox-only; ask me
to copy any of them into the repo or Drive).

## 4. Deliberately NOT changed

- `admin-theme.js`, `admin-chrome.js` — header/footer/mega-menu palettes are user-facing theme data.
- `admin-print*.js` — A4 print inks. An earlier sweep touched one line here by mistake; it was
  reverted with `git checkout --` and is now marked in-file as exempt.
- Brand colours in `admin-integ.js` (WhatsApp green, Instagram pink, …) — they identify third parties.
- `frontend-v1/admin` mirror — still the old theme, pending your U6/AS-32 decision (mirror or retire).
- Nothing about sign-in pre-fill removal (SEC-001) — still needs your explicit approval (C-2/AS-14).

## 5. Open items this batch did not close

| Item | Why it is still open |
|---|---|
| AD-13 FAIL in `reverify_findings.py` | The check asserts the obsidian `.side !important` block is *present*; this batch removed it. The script's expectation needs updating (same for AD-27/AD-28, where the token literal was already gone). |
| AD-24 FAIL (4 of 6 secret-bearing files tracked) | C-3 needs your approval to untrack `.env`, `config.php`, `_private/*.json`. |
| AD-02 FAIL | Pre-existing `-pro` vs plain copy mismatch in the chat library; untouched by this batch. |
| All stub-gap page errors on 56 routes | The preview stub returns empty payloads for those screens; not UI faults (unchanged from HEAD). |
| U1.2 real KPI screens, U6, U8/U9 | Next batch: page-header/KPI pass on remaining screens, mirror decision, manifest + mobile-width checks. |

## 6. To reproduce

```bash
cd tools/qa-p29 && npm install
PREVIEW_EMAIL=<any> PREVIEW_PASS=<any> python3 preview-server.py ../../woodex-live-p29-v2.1-pro 8080
PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node ui-design-batch.mjs http://127.0.0.1:8080 /tmp/out
PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node login-contrast.mjs http://127.0.0.1:8080
ALL=1 PREVIEW_EMAIL=<same> PREVIEW_PASS=<same> node theme-contrast.mjs http://127.0.0.1:8080 /tmp/out2
python3 ../../woodex-audit/evidence/scripts/regression_static.py ../..
```
