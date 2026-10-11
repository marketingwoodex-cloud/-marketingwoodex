# Open Questions and Limitations

| ID | Item | Impact | Evidence now | Next verification step | Responsible role |
|---|---|---|---|---|---|
| L-1 | **Session disclosure.** During triage, an unredacted `grep` printed the shared literal once (HOSTINGER-DEPLOYMENT-GUIDE.md, line 90) into session output. It was not written to any deliverable file. Treat it as exposed; it is already published (SEC-002). | Low additional (already public) | Process note | Rotation (SEC-002) covers it. | Owner |
| L-2 | Live validity of SEC-002 credentials | Critical if active | Committed dumps do not match (0/6 each; controls passed) | Owner rotates; operator confirms old password rejected | Owner / DB admin |
| L-3 | Telegram token validity | Critical if active | Fingerprint count only | Owner regenerates in BotFather | Owner |
| L-4 | Live host deny rules (AD-25) | Critical if rules ignored | Static only | Curl checks in `20` §2 | Operator |
| L-5 | Which tree is deployed (D-3) | Decides whether AD-01/02 are Critical | Unknown | Owner confirms | Owner |
| L-6 | Non-P29 projects (`wf-admin`, `p23-live`, `woodex-vlive-P20`, `netlify`, `supabase`, …) | Unknown secrets beyond the scan; unknown deploy | Secret scan only | Owner confirms which are live; audit each | Owner / auditor |
| L-7 | Approvals (AD-10) | Fixed in pro and mirror (C-008). Browser evidence: pre-fix Security on navigation and on fresh load (3/8 seeds); post-fix queue | Headless browser with stub API; no live site | Owner confirms `#/approvals` should show the queue (D-13) | Owner / auditor |
| L-8 | PHP runtime (AD-20, AD-21, AU-01, AU-03, SA-03, CC-02) | Behaviour of error paths and locks unverified | Parse only | Node 24 runtime, or approved alternative (T-12) | Owner decision, then auditor |
| L-9 | Settings and dashboard in a real browser | Headless Chromium runs passed (T-16, T-17, T-18) against the local copy with a stub API. Not run: live site, real API, Safari/Firefox, mobile widths, light/dark contrast on rendered pixels | Stub API; one browser engine | Live-site browser run of the same checks (after deploy, with owner approval) | Auditor / owner |
| L-10 | `content-lib.php:50` caller handles `0` return? | WC-02 severity | Not traced | Trace caller | Auditor |
| L-11 | `wa-cron.php` empty-key path | AU-03 hypothesis | Static | Runtime test once PHP available | Auditor |
| L-12 | Identity of the five integration cards on `#/settings/integrations` | AD-05 scope | Static `APPS` likely source | Confirm against DOM | Auditor |
| L-13 | Tile click behaviour (`admin-integ.js:60,89`) | AD-08 | Static | Browser click test | Auditor |
| L-14 | Chart.js instances keep stale colours after theme toggle (`admin.js:529–537`, `admin-dash.js:177`, `admin-reports.js:50`; AD-18) | Chart colours in dark mode | Static only | Browser toggle test | Auditor |
| L-15 | `admin-chat.js` and `admin-social.js` feature blocks, plain vs pro | Plain-only breakage | Syntax only | Diff | Auditor |
| L-16 | `api/whatsapp.php`, `api/telegram.php`, `builder.php` save path | Not fully read | grep only | Read | Auditor |
| L-17 | Backups (existence, recency, restore) | Data loss impact unknown | None | Owner shares backup policy; restore test in scratch DB | Owner / DB admin |
| L-18 | Repository visibility (D-1) | P0 exposure while public | OBSERVED public | Owner decision | Owner |
| L-19 | AD-16 light-background count (73) | Medium | From master report v1, not re-run | Re-run count | Auditor |
| L-20 | Public estimator submit path | Lead capture journey | Not traced end to end | Trace server handler | Auditor |
| L-21 | Real search performance and rankings | — | Not available | Not claimed. Owner supplies analytics if needed. | Owner |

## Limitations of this pack
- Pack is a **static audit with partial runtime checks**, not a full audit. No environment was inspected live.
- jsdom is a faithful harness for code paths, not for layout or real data.
- `detect-secrets` may miss credentials in unusual formats and can report false positives.
- Priority scores assume exposure 3 for internet-facing paths; confirm after live checks.
