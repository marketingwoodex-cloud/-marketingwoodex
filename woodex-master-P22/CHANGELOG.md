# P22.2 (2026-10-08)
- Package now identifies as P22 everywhere: installer "Woodex P22 installer", demo page P22, admin version tag `P22.2`.
- Database file renamed `_database/woodex-v20.sql` -> `_database/woodex-p22.sql` (all 20 tables, header fixed).
- Security: removed the built-in admin/admin login from the SQL file (a phpMyAdmin import could reset an `admin` account). Installer no longer falls back to admin/admin; a new site must enter its owner login.
- Repository: removed old P1-P20 / v26 / release zips and the `woodex-vlive-P20` folder, so only P22.2 remains.
- Code verified: 44/44 PHP, zip = source (623 files, 158 folders, 0 diffs).

# P22.1 (2026-10-08)
- Rebuilt as standard zip with folder entries (158 folders, 623 files). Same code as P22.
- Upload via File Manager → Extract (the Hostinger import tool cannot recognise this site).
# P22 (2026-10-08)
- Gmail connector: real SMTP test email + 'Use for all email alerts'.
- GitHub + Google Drive connectors: 'Back up now' + daily auto backup (cron) of pages + database.
- Drive via Apps Script web app (works on free Gmail).
- Pending tasks card at bottom of dashboard; Quick actions + Connected apps cards.
- Fix: Drive script code box height.

# Changelog
- **Master P22 r6**: dashboard Quick actions + Connected apps status; full 5-role QA sweep clean.
- **Master P22 r5**: dashboard Pending tasks moved to the bottom (icon badges); connectors Gmail, Google Drive, GitHub featured with real Test checks (GitHub API repo/permission check, Gmail app-password check, Drive folder link check).
- **Master P22 r3**: wx-install asks for the owner name/email/password; fixed re-run resetting the admin password to admin.
- **Master P22 r2**: admin setup reconnects an existing database (no forced new owner); README explains db.json and the setup pages.
- **Master P22** (8 Oct 2026): CSS renamed to site-p21.css / v1-p21.css (fixes broken styles from Hostinger cache); single upload zip woodex-master-P22.zip.
- **P21 cache fix**: ?v=p21 on CSS/JS links in all 145 pages; update zip woodex-P21-update-cachefix.zip.
- **P21** (8 Oct 2026): deep QA + security audit, 3 fixes, templates folder + import from file, to-do plan, credentials sheet, zip woodex-master-P22.zip.
- **P41**: SEO agent (Claude/Codex/Hermes/local), LinkedIn + GBP posting, smoother chat typing, alert phone.
- **P40**: Telegram channel + QR, one website button, social media (FB/IG) planner + comments, CSV lead import, chatbot training.
- **P39**: 5 roles + Master approvals, inbox upgrades.
- **P20 (V20)**: first full Hostinger package with installer.
- P1–P38: website v26, Builder v3, Admin v2, CRM, quotations, WhatsApp, SEO, speed.
