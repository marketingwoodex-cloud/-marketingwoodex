# P22 QA (2026-10-08)
- 5-role browser sweep: 174 routes, 0 errors (Master 59, Manager 59, Developer 35, Sales 14, Support 7).
- Connector actions tested: Gmail test, GitHub + Drive backup; Sales blocked (permission error).
- PHP lint 44 files clean; JS syntax OK.
- Real Gmail/GitHub/Drive delivery must be confirmed on Hostinger with your accounts.

# QA report — Master P22 (revision r6, 8 Oct 2026)

| Check | Result |
|---|---|
| PHP lint (44 files) | ✅ 0 errors |
| JS syntax (admin, builder, site, widget) | ✅ |
| Browser sweep: Master: every menu screen (59) | ✅ no page errors |
| Manager 59 · Developer 35 · Sales 15 · Support 7 screens | ✅ no page errors, role menus correct |
| Dashboard order | Stats → charts → pipeline → enquiries → **Quick actions → Connected apps → Pending tasks (bottom)** |
| Connectors | Gmail, Google Drive, GitHub featured; Test runs real checks (GitHub API, Gmail app password, Drive link) |
| Public pages | ✅ 200; CSS `site-p21.css` / `v1-p21.css` (cache-proof) |
| Installer | Asks for the owner name, email and password; re-run never resets passwords |

Note: the sweep's "Something went wrong" flag on Pages/SEO/Developer home is the title of the site's own 500 error page in the page list (false positive).
