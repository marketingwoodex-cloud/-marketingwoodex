# UX and Functional Audit

## Scope and method
Static reading of routes, views, and controls, plus jsdom RUNTIME probes (owner dashboard, estimator labels, settings and approvals identity from prior harness runs). No real browser session.

## Summary and risk
High. Several screens show content that does not match server state (Integrations, Save, Ping), routes fall through to the dashboard, and one approvals screen may show the wrong view.

## Findings
| ID | Severity | Symptom (user-visible) | Evidence | Status |
|---|---|---|---|---|
| AD-04 | High | `#/integrations` opens the dashboard | RUNTIME (prior harness) | Confirmed |
| AD-03 | High (plain tree) | "Phase undefined" on coming-soon screens | RUNTIME (prior) | Confirmed (plain) |
| AD-05 | High | Integrations show connected for 14 providers | STATIC E2 | In progress (wording honest) |
| AD-06 | High | Save shows success without saving | STATIC E2 | Fixed pending verification (now "Not saved") |
| AD-07 | High | Ping shows "200 OK" without a request | STATIC E2 | Fixed pending verification (now "Not verified") |
| AD-08 | High | Integration tiles do nothing | STATIC E2 | Confirmed |
| AD-10 | High | Approvals may show the security view | RUNTIME identity check; effect HYPOTHESIS | Confirmed (overwrite), effect Hypothesis |
| AD-12 | High | Same screen content depends on script order | STATIC E2 (20 keys) | Confirmed |
| OV-01 / OV-03 | High | Dashboard stuck on "Loading…" when data is incomplete | RUNTIME jsdom before/after | Fixed pending verification |
| A11Y-001 | Medium | Estimator fields announced without a name | RUNTIME jsdom | Fixed pending verification |
| SA-02 | Medium | Enquiries screen depends on hash suffix | STATIC E2 | Confirmed |
| WC-01 | High | A second editor's save (same second) or a restore can overwrite the first without warning | STATIC E2 | Confirmed |
| AU-02 | High | Campaign reports success with nothing queued | STATIC E2 | Confirmed |

## Controls verified (positive)
- The owner dashboard renders its normal content with a realistic payload, with no error card (RUNTIME jsdom, before and after the change: no regression).
- Owner dashboard now shows an error state for an incomplete payload (RUNTIME jsdom).

## Checks not run / blocked
- Full journey test: lead → enquiry → quotation → approval (**not run**; no live data, no approved test tenant).
- Multi-tab edits and stale responses (**not run**).
- Dark theme and responsive viewports (**not run** in a browser).
- Destructive confirmation flows (**not traced**).
- Settings Save and Ping after the wording change (**not run in browser**).
