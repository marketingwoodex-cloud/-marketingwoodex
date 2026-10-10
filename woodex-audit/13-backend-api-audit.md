# Backend and API Audit

## Scope and method
Static reading of `api/admin.php`, `api/*-lib.php`, `builder.php`, `wa-cron.php`, and `p18g-lib.php`. PHP parse lint 48/48 (php-parser, PHP 8.2 grammar). **No PHP runtime** — PHP was not executed. `@php-wasm/node` installed as an approved QA-only tool, but it fails on the sandbox's Node 22.22.3 (`processId must be set before init`; the package declares Node ≥24.18). Runtime behaviour is **UNKNOWN**.

## Summary and risk
High. The dispatcher catches one exception class. Libraries have no error handling. Locks and writes are inconsistent. A failure in persistence can present as a 503 or a 500 with no cause.

## Findings
| ID | Severity | Target | Finding | Status |
|---|---|---|---|---|
| AD-20 | High | `api/admin.php:591` | Only `catch (PDOException)`; other errors escape as empty 500 | Planned · runtime BLOCKED |
| CC-01 | High | `admin.php:591`; `admin.js:25` | Client shows "Server error (500). Open /wx-check.php" with no cause | Confirmed |
| CC-02 | High | 12 library files, 0 `try` | No local error handling (correction: 12, not 13) | Confirmed |
| SA-03 | High | `api/sales-lib.php` | Lead/invoice writes with no usable error; no transactions | Confirmed · runtime BLOCKED |
| AU-01 | High | `p18g-lib.php:236–313`, `wahub-lib.php:121–188` | Admin `wag_save` callers take no lock; cron does | Confirmed |
| AU-02 | High | `p18g-lib.php:94`; `content-lib.php:50` | `busy`/`0` returns silent | Confirmed |
| AU-03 | Medium | `p18g-lib.php:16–17`; `wa-cron.php:14` | cronKey regenerated on empty read | Hypothesis |
| WC-02 | High | `content-lib.php:50` | Lock busy → `0`; caller not yet traced | Confirmed |
| WC-03 | High | `admin.php:40, 96` | Builder token from shared secret; regenerates | Confirmed |
| AD-19 | Critical | `admin.php:288–290`; `admin.js:700` (pro; `:693` plain) | DB error → installer redirect; reconnect unreachable | Confirmed |
| AD-21 | Critical | `admin.php:36, 37, 40, 47` | Non-atomic write; fail-open read/secret | Confirmed |
| AD-22 | — | `seqL` | **Withdrawn** — data-only, not in `api/` | Withdrawn |

## Controls verified (positive)
- Failed login throttled; password compared with `password_verify` (STATIC).
- Token compare with `hash_equals` (STATIC).
- `declare(strict_types=1)` present (STATIC).

## Checks passed
- PHP parse 48/48 in pro tree (php-parser).

## Checks not run / blocked
- Any PHP execution path, including exception handling, `flock`, `rename` semantics.
- Idempotency and retries for webhooks (not traced).
- API response contract tests (no runtime).
- Rate limiting beyond login throttle (not traced).
