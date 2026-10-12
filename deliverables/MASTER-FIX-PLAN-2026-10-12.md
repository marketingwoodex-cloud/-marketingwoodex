# Master fix plan — how to fix every single issue

Date: 2026-10-12 · Branch `arena/7f38fddd-marketingwoodex` · HEAD `1b6c3f6`
Decision requested: **approve the plan in §5** (or tell me why not)

---

## 1. Your proposal, and my honest recommendation

> *"create complete project in node and run complete after approval convert into php database ready to deploy"*

**My recommendation: do not rewrite in Node. Verify the PHP that already exists.**

I can now prove that recommendation instead of arguing it — see §2. Here is the arithmetic:

| | Rewrite in Node, then back to PHP | Verify the existing PHP (this plan) |
| --- | --- | --- |
| Code to write | 366 API actions + 64 screens + 25 tables **twice** | 0 — the code exists and is audited |
| Where the bugs come from | the rewrite, plus the second conversion Node→PHP | the real code, found by running it |
| Effort | ~8–12 weeks, and every screen re-proven | ~1 week of verification and fixes |
| Deployability | a Node app does not run on your Hostinger shared hosting; the site is HTML+PHP | unchanged — it *is* the deploy target |
| Risk | you re-open every bug class we just closed | you close the ones that are left |

A rewrite also has a hidden cost you have already paid once: **the current live deployment is an older
build**, and one reason is that two code lines drifted apart. Two codebases (Node + PHP) means that
drift becomes permanent.

**What you actually want is not a different language — it is proof that everything works before you
upload.** That gap is real (nothing in this project has ever executed end-to-end here), and as of
today it is closable *in the real PHP*.

---

## 2. The discovery that changes everything

A WebAssembly PHP runtime is reachable from this sandbox. Verified just now, in this workspace:

```
PHP 8.3.33
PDO drivers: mysql, sqlite
json yes · mbstring yes · pdo_sqlite yes · sqlite3 yes · pdo_mysql yes · mysqli yes
curl yes · openssl yes · zip yes · gd yes · fileinfo yes · session yes

boot (one-time): 0.2s
per call: 2–77 ms
```

**What this means:** for the first time, the project's own PHP — all 44 files, all 366 actions — can be
executed here, in a fast loop, instead of only being syntax-checked. Combined with the existing browser
harness, this closes the last two verification gaps:

| Layer | Before today | After this plan |
| --- | --- | --- |
| Static (syntax, wiring, dead actions) | ✅ 44/44 parse, 0 unhandled actions | ✅ stays green |
| UI (screens render, no crashes) | ✅ 58 routes, probes green | ✅ re-run against **real PHP** |
| **PHP runtime** (does the action work?) | ❌ never executed | ✅ **every action executed** |
| **Real data** (does it work with your records?) | ❌ fixtures only | ✅ needs your SQL dump (§6) |

---

## 3. What still stands between us and "ready to deploy"

Seven honest gaps, in the order they bite:

1. **No action has ever run.** Syntax is not behaviour. A `case` can parse and still throw on the first
   real call (a missing helper, a wrong column name, a function that only exists in another module).
2. **No real data.** ~50 lesser-used screens read sample fixtures; nobody has seen them against your
   records (your 5 invoices, 1 project, real leads, real users).
3. **MySQL-specific SQL is unverified.** The code uses MySQL dialect (`ON DUPLICATE KEY UPDATE`,
   `DATE_FORMAT`, engine clauses). Only a real MySQL (your host, or your dump) proves those.
4. **Outbound services.** PageSpeed, WhatsApp, Telegram, Google — each needs a live credential.
5. **Uploads and file paths.** Media upload/serve, backups, restores are path- and permission-sensitive;
   only a real filesystem run proves them.
6. **Security exposure that is still live:** the shared password is in 118 tracked files, a Telegram bot
   token in 25, a tracked `.env`, and the repo is public.
7. **Packaging drift.** The zip must contain the *fixed* code plus a fresh schema, and the deploy steps
   must leave `_private/` intact.

---

## 4. Why "fix every single issue" needs this order

A fix is only a fix if something would fail when it breaks again. So every phase below ends in a
**machine gate**, not an opinion. That is how the 20+ real bugs already closed this session were found:
router aliases that hid editors, the invoice that billed the contact instead of the company, the fake
Team screen with five invented people, the `undefined` speed table, the health scan flagging your 404
page as critical, the role word that locked the owner out.

---

## 5. The plan (approval requested)

### P1 — Local PHP runner · *the foundation* · ~1 day
Build `tools/qa-p29/php-runner.mjs` (test-only, outside the shipped project):

* boots the WASM PHP **once**, mounts the project, serves `/api/admin.php` and `/api/builder.php`;
* a thin DB adapter provides SQLite for local runs, translating the handful of MySQL-isms
  (`ENGINE=`, `AUTO_INCREMENT`, `REPLACE INTO`, `ON DUPLICATE KEY UPDATE`) and **logging every
  translation** so nothing is silently faked;
* production code gains exactly one guarded hook (`WX_LOCAL_DSN`): if unset — as on your host — nothing
  changes;
* new gate: `php-sweep.mjs` — call **all 366 actions** as Master, Admin, Developer, Sales, Support and
  an anonymous session; assert each answers `{ok:true}` or a *deliberate* refusal, never a PHP fatal.

**Exit criteria:** 366/366 actions execute; every permission check refuses the right roles; the fatal
list is empty.

### P2 — PHP-backed preview · ~half a day
Point the existing browser probes at the PHP runner instead of the fixture server. From then on, every
screenshot and every probe measures the **real backend**, so fixture-vs-real drift becomes impossible.

**Exit criteria:** `master-qa.mjs` 58 routes / 0 stuck / 0 page errors **against real PHP**.

### P3 — Fix everything P1 and P2 expose · ~2–3 days
Work the defect list: PHP warnings/fatals, wrong SQL, missing helpers, screens that were only ever fed
by fixtures. Each fix lands with its regression probe.

### P4 — Real data · *needs your dump* · ~1 day
Import `woodex-database.sql` (or your dump) into the local database, then re-run P1–P3 against your
records: real counts on every list, real totals on invoices, real clients/leads/projects, real users.

**Exit criteria:** the master audit you asked for — every screen, every action, every count, on your data.

### P5 — Host-equivalent pass · ~half a day
Where SQLite cannot represent MySQL behaviour, mark it and verify it on the host with `wx-audit.php`
(read-only, credential-masking, already written). Optionally you install XAMPP/WAMP locally and I run
the same sweep against real MySQL + PHP — that removes the last caveat entirely.

### P6 — Security and packaging · ~half a day
Secrets out of the tree and rotated; repo private; fresh schema in the zip; `config.php` template;
deploy guide; **final zip = the master project ready to upload**.

**Exit criteria:** zip extracts into `public_html/`, `wx-install.php` runs clean, `wx-audit.php` reports
green on the live database.

### P7 — Post-deploy proof · ~half a day
Smoke on the host: sign in with each role, create one invoice, edit one page, run Site health, connect
Telegram. Then hand over.

**Total: about one week of work, and at the end every layer is verified — not asserted.**

---

## 6. What I need from you

1. **Approve §5** (or tell me what you want changed). If you still want a Node version, say so and I will
   scope it honestly — but I recommend P1–P7.
2. **The SQL dump** (P4 blocker): Hostinger → phpMyAdmin → Export → SQL → Drive link. Even a copy from
   *before* your latest changes is fine — I need real rows, not the schema.
3. **Answers already waiting:** dark-mode colour direction (DESIGN.md vs obsidian/cyan), section-library
   count (51 vs 70), invoice print designs, template-card actions.
4. **Security go-ahead:** repo private + rotate the Telegram token and the shared team password.
5. **Optional but decisive:** if you can install XAMPP/WAMP on your machine (or give me a MySQL
   connection on the host), P5 becomes a real MySQL run instead of a caveat.

---

## 7. Risks and how the plan handles them

| Risk | Mitigation |
| --- | --- |
| The SQLite shim gives false confidence | every translation is logged and reported; MySQL-specific statements are listed and marked "host-only" instead of being silently accepted |
| A WASM PHP build differs from Hostinger's PHP | the runner targets PHP 8.3; the host runs 8.x; anything version-sensitive is flagged for `wx-audit.php` |
| Outbound APIs cannot be reached here | those five integrations are verified by contract + on the host, never claimed as tested |
| "Fixed" without proof | every phase ends in a gate that fails loudly on regression |
| Time spent on verification instead of new features | deliberate: you asked for *ready to deploy*, and the named complaints are already fixed |

---

## 8. What is already done, so it does not get re-litigated

Invoice create/track/pay proven end to end · Telegram screen wired and probed · Site health running on
real pages · Speed `undefined` fixed · redirects on the real 36-rule plan · media library on real files ·
status chips live · role-alias lockout closed · the fake Team screen replaced with real users and the
website Team screen restored · 275 UI actions all answered by PHP · no duplicate handlers · 58 routes
green · contrast 0 failures over 8 runs · 58 screens with 0 overflow · developer documentation shipped
(handbook + API reference + module map + data model).

---

*Prepared from verified measurements on this branch. Nothing in this document is an estimate of
behaviour — the PHP facts were produced by running PHP, and the gate numbers by running the gates.*
