# Master audit: why the changes were not showing

**Date:** 2026-10-11 (Asia/Karachi)
**Branch:** `arena/4ba510f0-marketingwoodex`
**Scope:** sign-in page, preview server, GitHub branch, local checkout.
**Credentials:** none are written here. Passwords and tokens are referred to by file only.

## Symptom

The sign-in page on the owner's screen still showed the old watercolour background, while the latest office background was on the server.

## Findings

| # | Finding | Evidence | Status |
|---|---|---|---|
| 1 | **Browser cache.** The background image URL had no version number, so the browser kept the old watercolour image. The stylesheet had a version number, so it reloaded. | Server returned the new CSS. The background file was 198 KB, updated 09:28. The URL itself had not changed. | **Fixed.** Renamed to `assets/img/signin-office-20261011.jpg` and pointed the CSS at it. Served with HTTP 200. Hard refresh (Ctrl+Shift+R) once. |
| 2 | **Work not on GitHub.** The branch tip was `34bbb75`, which did not have the clean sign-in CSS, the office background, the error-box fix or the preview login change. | `git ls-remote` showed `34bbb75`. The remote `admin.css` had 0 matches for the clean-card block. | **Fixed.** Pushed `7e61a46` to this branch only. Scan of the commit: 0 secret matches. |
| 3 | **Local checkout out of step.** The local checkout is at the old base `f86258a`, with 60 uncommitted entries. Some API files exist on the remote but not in the local tree. | `git status` and `git diff FETCH_HEAD`. | **Open.** Do not reset without approval. Resetting would discard local-only differences. |
| 4 | **Preview data is sample data.** The preview has no database. Numbers, leads, invoices and pending tasks are placeholders, so the dashboard cannot prove live data. | Preview server stub, `preview-server.py`. | **Expected.** Use staging with a real database to check data. |
| 5 | **Live site not changed.** The live site runs its own deployed code. Nothing in the preview or GitHub changes it until a deploy. | Deployment guide and plan. | **Expected.** Needs staging, then a deploy you approve. |
| 6 | **Not verified in this sandbox:** the five roles, the live database, Telegram, Gmail sending, Google sign-in. | No live services reachable from the sandbox. | **Open.** Needs your live setup. |

## Checks run

- Served `admin.css`: contains the clean sign-in block (1 match) and the new background URL (2 matches).
- Served `index.html`: stylesheet link versioned `admin.css?v=20261011b`.
- Background: 200, served file matches the disk file.
- Login API for `marketing.woodex@gmail.com`: correct password accepted; wrong password, old preview account, other email and empty password all refused; email case-insensitive. 6 of 6 passed.
- Browser sign-in: the form signs in, the dashboard loads as "Woodex Admin", light and dark screenshots saved.
- Push: branch tip is `7e61a46` on GitHub.

## What to do now

1. Hard refresh the admin page (Ctrl+Shift+R). The office background should appear.
2. If the change still does not appear, open `/admin/assets/img/signin-office-20261011.jpg` directly. It should show the office image.
3. For live use, follow the staging steps in `MASTER-TODO-2026-10-11.md`: rotate secrets, staging database, five role accounts, live services. Then approve the deploy.
4. Approve or decline a reset of the local checkout to `7e61a46`. That step would discard the 60 local-only entries.
