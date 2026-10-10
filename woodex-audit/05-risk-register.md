# Risk Register

**Priority score = Impact (1–5) × Likelihood (1–5) × Exposure (1–3).** Exposure = 3 for anything reachable from the internet (public pages, admin login, public repository); 2 for cron or internal; 1 for local-only. Scores are a triage aid; overrides are explained. Ranges: 40–75 investigate immediately; 20–39 P1/P2; 8–19 P2/P3; 1–7 informational.

| Rank | ID | Risk | I | L | E | Score | Initial priority | Override / note |
|---|---|---|---:|---:|---:|---:|---|---|
| 1 | SEC-002 | Owner sign-in hint and DB password published (public page, public repository) | 5 | 5 | 3 | 75 | **P0** | Override: credential exposure. L=5 because the value is public now; live validity UNKNOWN. |
| 2 | SEC-001 | Browser-served admin login pre-fills and falls back to the literal | 5 | 5 | 3 | 75 | **P0** | Override: same literal as SEC-002. |
| 3 | SEC-003 | Telegram bot token in 36 tracked locations | 5 | 5 | 3 | 75 | **P0** | Override: credential exposure; sends messages as the bot. |
| 4 | AD-24 | Repository public; secret files tracked; no ignore rules | 5 | 5 | 3 | 75 | **P0** | Override: credential exposure (the root cause for rows 1–3). |
| 5 | AD-21 | Non-atomic write; empty read → 503; secret regeneration logs out all admins and builders | 5 | 3 | 3 | 45 | P0/P1 (investigate immediately) | Concurrency required; L=3. |
| 6 | AD-19 | DB error redirects to installer; reconnect unreachable | 4 | 4 | 3 | 48 | P0/P1 (investigate immediately) | Installer reachable from admin on DB error — exact reachability UNKNOWN. |
| 7 | AD-05 | Integrations report connected from literals | 4 | 5 | 3 | 60 | P1 (investigate immediately) | Owner may believe providers are connected. |
| 8 | AD-25 | Deny rules depend on `.htaccess` being honoured; `_private` set to 777 | 5 | 2 | 3 | 30 | P1/P2 | Hypothesis; if confirmed, raises to 75 (exposes credential files). Live check required. |
| 9 | SEC-004 | Other tracked `.env` files | 2 | 3 | 3 | 18 | P2/P3 | Keys empty or placeholder. |
| 10 | AU-01 | Cron and admin writers race; opt-outs overwritten | 4 | 3 | 2 | 24 | P1/P2 | Compliance exposure. |
| 11 | WC-01 | Save checks timestamp only (1 s), not atomic; restore unchecked | 3 | 3 | 3 | 27 | P1/P2 | Concurrent editors. |
| 12 | AD-20 / CC-01 / CC-02 / SA-03 | Error envelope; blank 500s | 3 | 4 | 3 | 36 | P1/P2 | Runtime unverified (PHP blocked). |
| 13 | AU-02 | Silent busy returns | 3 | 3 | 2 | 18 | P2/P3 | — |
| 14 | AD-13 | Sidebar `!important` split theme | 2 | 5 | 3 | 30 | P1/P2 | Accessibility and brand. |
| 15 | AD-01 / AD-02 | Plain trees do not parse | 3 | 3 | 1 | 9 | P2/P3 | Escalate to P0 if the plain tree is deployed (UNKNOWN). |
| 16 | DB-01 | 14 email-like strings in a tracked SQL dump | 3 | 4 | 3 | 36 | P1/P2 | Privacy. |
| 17 | OV-01 / OV-03 | Dashboard stuck "Loading" | 2 | 3 | 3 | 18 | P2/P3 | Fixed pending verification. |
| 18 | WC-05 | Dev router vs production divergence | 3 | 2 | 3 | 18 | P2/P3 | Live verification required. |
| 19 | AD-26 | 30-day cache on mutable admin assets | 2 | 3 | 3 | 18 | P2/P3 | — |
| 20 | Others (Medium/Low) | See matrix | 1–2 | 2–3 | 1–3 | 2–18 | P3 | — |

## Notes
- The four P0 rows share one root cause (committed credentials in a public repository). Containment must address them together (decision D-1, D-2).
- Scores do not account for live exposure of the database — that is UNKNOWN until the live host is inspected.
- Re-score after live verification: AD-25 and AD-19 depend on it.
