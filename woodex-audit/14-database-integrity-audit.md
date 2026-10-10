# Database and Data Integrity Audit

## Scope and method
Static review of the MySQL schema in `api/admin.php` (`wx_users` at line 57), the JSON store under `_private/`, and tracked SQL dumps. Local bcrypt verification (controls passed). **No database connection, no restore test, no backup check.**

## Summary and risk
High. The JSON store is written non-atomically and read without locks; the dumps are tracked and contain personal data and a credential. Backup status is **UNKNOWN**.

## Findings
### AD-21 — Non-atomic JSON persistence (Critical)
`jwrite` (`admin.php:37`) opens with `file_put_contents(…, LOCK_EX)`, which truncates before the lock. `jread` (`:36`) reads without a lock. Empty read → 503 (`:47`); `bsecret` regenerates (`:40`). STATIC E2.

### AD-22 — Withdrawn
The cited `seqL` counter is data-only and is not in `api/`. Unlocked read-modify-write is re-scoped to AD-21 and AU-01.

### AU-01 — Cron and admin writers race (High)
Cron holds `wa-auto.lock`; admin `wag_save` callers do not. STATIC E2.

### DB-01 — Personal data in a tracked dump (Medium)
`woodex-database.sql` (root): 14 email-like strings (count only; no values reproduced). STATIC E2.

### DB-02 — `_private/admin-db.json` hashes (Medium, Hypothesis)
Seven `scrypt$` entries; no reader in the tree. Use unknown.

### SEC-002 / SEC-003 (data-store secrets)
The SQL dumps contain the Telegram token (line 318) and six `$2y$10$` bcrypt user hashes in each dump. The shared literal verifies against none of them (controls passed). The dumps therefore reflect a state that does not match the live password, or the live password is not that literal. **Live state UNKNOWN.**

## Checks passed
- Hash format is bcrypt (`$2y$10$`) for `wx_users` rows in the dumps; the login path uses `password_verify` (STATIC).

## Checks not run / blocked
- Live schema comparison (**BLOCKED**).
- Migration history (**not present in repo**; none found).
- Constraint, index, and FK review (**not run**; schema reviewed only for column types).
- Backup recency, encryption, restore (**BLOCKED**).
- Transaction boundaries in multi-row writes (**not run**; SA-03 notes absence of transactions).
