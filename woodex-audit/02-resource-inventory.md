# Resource Inventory

Revision: `24157f6`. Counts are `git ls-files` tracked files. The repository holds **7,286 tracked files** in about 130 top-level directories.

## A. P29 admin trees (the audit family)
| Tree | Tracked files | Role | Parse status (`node --check` admin JS) | Relationship |
|---|---:|---|---|---|
| `woodex-live-p29-v2.1-pro/` | 650 | **Primary target.** Adds `Dockerfile`, `render.yaml`, `_private/`. | 62/62 PASS; PHP 48/48 parse | Recommended source of truth (decision D-3) |
| `frontend-v1/` | 642 | Mirror of pro admin files; byte-identical after this pass for the 4 edited files | 0 failures | Mirror; also carries its own copy of the Telegram token and `.env` |
| `woodex-live-p29-v2.1/` | 642 | Plain copy with duplicated fragments | **3 SyntaxErrors** (`admin-settings.js:608`, `admin-chat.js:334`, `admin-social.js:333`) | Broken fork (AD-01, AD-02) |
| `woodex live p29-v2.1/` | 642 | Space-named plain copy | Same 3 SyntaxErrors | Broken fork |
| `woodex live p29-v2.1 pro/` | 642 | Space-named pro copy | PASS | Duplicate of pro |

Five admin files differ between plain and pro (RC-1 in `07`).

## B. Other tracked projects (registry only; mostly not audited)
| Path | Tracked files | Status | Notes |
|---|---:|---|---|
| `wf-admin/` | 389 | Not yet verified | Contains 129 hex-string detector hits (see `secret-scan-tracked-2026-10-11.txt`); MCP server `.env.example` |
| `woodex-vlive-P20/` | 615 | Not yet verified | Vendor bundle AWS-pattern false positive |
| `p23-live/` | 645 | Not yet verified | Tracked `.env` (keys empty or placeholder); hex hits |
| `p22-preview/` | 634 | Not yet verified | Tracked `.env`; admin contact address in env (personal data class) |
| `woodex-live-v3/` | 44 | Not yet verified | |
| `woodex-live-p23/` | 2 + subtree | Not yet verified | Tracked `.env`; 25 detector hits |
| `woodex-live-P23/` | 2 | Not yet verified | |
| `woodex-master-P22/` | 12 | Not yet verified | `CREDENTIALS-TEMPLATE.md` (template, fill-offline) |
| `netlify/` | 42 | Not yet verified | Netlify functions: auth (`cms-auth.mjs`), backups, analytics |
| `supabase/` | 3 | Not yet verified | |
| `tools/` | 383 | QA probes and security test scripts | Contains attack-payload and login test scripts; includes `tools/qa-p29/` used in this audit |
| `woodex-audit/` | 21+ | This pack | |
| ~40 marketing/content folders (`lahore/`, `karachi/`, `kitchen-design/`, …) | — | Not yet verified | Public content pages; SEO sample only (`10`) |

## C. Root-level documents with secret or PII exposure
| File | Finding |
|---|---|
| `HOSTINGER-DEPLOYMENT-GUIDE.md` | PHP snippet with a DB-password-shaped placeholder (L76) and a documented demo password (L90). See SEC-002. |
| `V2.1-VS-V2.5-PRO-BREAKDOWN.md` | Telegram token literal (L45). See SEC-003. |
| `COMPREHENSIVE-SYSTEM-AUDIT-REPORT.md`, `GO-LIVE-AUDIT-REPORT.md` | Contain the shared literal. See SEC-002. |
| `WOODEX_MASTER_AUDIT_SYSTEM_PROMPT (1).md` | The governing prompt. No secrets. |
| `QA-MASTER-REPORT-P29-V2.1-PRO.md` | Master report v1 (superseded by this pack; errata appended). |

## D. Configuration and secret-bearing locations (names only)
- `.env` in: pro, plain, space-named trees, `frontend-v1`, `woodex-live-p23`, and the repository root (root `.env` has empty DB password only). `.env.example` in the same trees.
- `config.php` in pro, plain, space-named, and `frontend-v1`: DB credential constant, Telegram token constant, two bank IBAN constants.
- `_private/*.json` in pro: `db.json`, `admin-db.json`, `system.json`, `company.json`, `dash.json`, and others. Credential-bearing names are listed in `08`.
- `Dockerfile`, `render.yaml` (pro only). `.htaccess` in root and per directory.

## E. Databases and data stores
- MySQL (`wx_users` table; `driver: mysql` in `status`). Live instance: **not accessible**.
- JSON file store under `_private/` (with lock and atomic-write defects, see `14`).
- SQL dumps tracked: `woodex-database.sql` (root), `_database/woodex-database.sql`, `_database/woodex-v20.sql`, in several trees. Each contains the Telegram token (line 318), 6 bcrypt user hashes, and personal email-like strings (DB-01).

## F. Environments
| Environment | Status |
|---|---|
| Production (Hostinger / Render / Apache) | **Not accessible** — no live checks run |
| Staging | **None identified** |
| Local checkout | Inspected |
| Browser (real) | **Not used** |
| PHP runtime | **Not available** (`@php-wasm/node` installed, fails on Node 22; see `18`) |

## G. Unresolved inventory questions
1. Which tree is deployed to production? (Decision D-3.)
2. Are the non-P29 trees (`wf-admin`, `p23-live`, `woodex-vlive-P20`, …) deployed anywhere? Unknown.
3. Does the live server read `.htaccess`? (`AllowOverride`; see `15`.)
4. Is the `pass_hash` data in `_private/admin-db.json` used by any runtime path? No PHP reference found (see `14`).
