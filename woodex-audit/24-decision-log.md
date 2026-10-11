# Decision Log

| ID | Date | Decision | By | Basis | Effect / status |
|---|---|---|---|---|---|
| D-1 | 2026-10-11 | Repository visibility change to private | **Owner: "later"** | Owner answer to ask_user | **Not changed.** AD-24 remains open. Re-ask before release. |
| D-2 | 2026-10-11 | Credential rotation and history rewrite | **Owner: "as you recomend"** | Ambiguous: no explicit approval for a history rewrite | Agent did **not** rotate, rewrite history, or force-push. Rotation is owner action. Explicit "yes, rewrite history" required before any purge. |
| D-3 | pending | Source of truth (pro vs plain vs space-named) | Owner (to decide) | Evidence: pro passes; plain fails | Recommended: pro (`woodex-live-p29-v2.1-pro`). Not applied. |
| D-4 | 2026-10-11 | Install `@php-wasm/node` as QA-only tool | **Owner: approved** | ask_user | Installed in `tools/qa-p29/node_modules` (gitignored). Runtime **BLOCKED** (Node version). Manifest change reverted. |
| D-5 | 2026-10-11 | Apply narrow honest-status and dashboard-guard fixes | Agent under §5.3 | Narrow, reversible, tested | Applied (C-001..C-004). Not closed; pending verification. |
| D-6 | 2026-10-11 | Severity of AD-01 and AD-02 held at High, with a note that they become Critical if the plain tree is the deployed one. AD-05, AD-06 and AD-07 are High in the matrix. | Agent under prompt §5.1 | Matrix rows; deploy tree unknown (L-5) | Recorded in matrix. Executive summary item 5 previously said "Critical/High" for AD-05/06/07; corrected to High. Owner may override. |
| D-11 | 2026-10-11 | Apply the one-line AD-10 fix (remove the `VIEWS.approvals` overwrite in `admin-security.js`, both trees) | Agent under §5.3 | Narrow, reversible, tested in jsdom (navigation, initial load, control, `#/security`) | Applied as C-008. Owner may revert. Owner to confirm that `#/approvals` should show the queue. Browser test pending. |
| D-12 | 2026-10-11 | Browser checks (T-16, T-18, AD-10 link) cannot run: browser binaries are not downloadable from this sandbox | Owner | Options: (a) approve QA-only install of `@sparticuz/chromium` (npm, MIT, about 70 MB unpacked) into `tools/qa-p29`; (b) owner runs the steps in T-16/T-18 in a browser and records results; (c) accept jsdom-only for now and keep the status as fixed pending verification | Resolved 2026-10-11: owner chose option (a). QA-only install of `@sparticuz/chromium` (MIT, npm) and `puppeteer-core` in `tools/qa-p29` only. Browser runs done, headless Chromium with stub API. Not shipped. |
| D-13 | 2026-10-11 | Owner to confirm the intended view for `#/approvals`: the approvals queue (current fix) or the Security page | Owner | Browser evidence shows the queue after the fix; the approvals screen is the queue by design (`admin-appr.js`) | Pending owner confirmation |
| D-7 | pending | Approve removal of login pre-fill and fallback literal (SEC-001) | Owner | Changes authentication UI (§5.3) | **Awaiting approval.** |
| D-8 | pending | Approve removal of sign-in line from `downloads.html` (SEC-002) | Owner | Public content | **Awaiting approval.** |
| D-9 | pending | Approve untracking of env, config secrets, `_private/*`, SQL dumps | Owner | Changes deploy surface | **Awaiting approval.** |
| D-10 | pending | Approve Node 24 runtime or alternative for PHP tests | Owner | New runtime dependency | **Awaiting approval.** |
