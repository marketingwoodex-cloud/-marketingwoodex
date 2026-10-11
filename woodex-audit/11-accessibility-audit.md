# Accessibility Audit

## Scope and method
Static CSS and markup review, jsdom label check, and contrast arithmetic (CALC). **No screen-reader test, no keyboard-only walk-through, no axe/WAVE run on a live page. No WCAG conformance is claimed.** Target standard WCAG 2.2 AA, not tested in full.

## Summary and risk
Medium to High. Light-theme contrast fails for sidebar text. The public estimator form had unlabelled inputs (now fixed in working tree).

## Controls verified
- Estimator name, phone and email inputs now have `aria-label` (A11Y-001). RUNTIME jsdom: 3 → 0 unlabelled visible controls. Honeypot fields excluded (aria-hidden).

## Findings
### RC-3 / AD-13 — Sidebar contrast in light mode (High)
Sidebar text colours on a light background, CALC (WCAG relative luminance):
| Foreground | Background | Ratio | Needed (normal text) |
|---|---|---:|---:|
| `#cbd5e1` | `#fff` | 1.48 | 4.5 |
| `#00d3f2` | `#fff` | 1.81 | 4.5 |
| `#9ca3af` | `#fff` | 2.54 | 4.5 |
| `#94a3b8` | `#f8fafc` | 2.45 | 4.5 |
Text passes only because the sidebar is always dark (AD-13). These ratios are arithmetic on the colour pairs named in the CSS analysis. Where those pairs actually appear on screen was **not** confirmed in a browser, so the scope is unconfirmed.

### AD-15 — Hard-coded palettes in security and integration screens (High)
`admin-security.js` (65 hex literals, 0 `var(`), `admin-integ.js` (10, 0). Light cards in dark mode and dark cards in light mode. STATIC E2. Theme-probe run on `#/security` earlier (prior session): 15 light-text nodes per mode on dark card surfaces (RUNTIME, jsdom; computed colour limits apply).

### AD-16 — Unscoped light backgrounds (Medium)
73 light-background rules not scoped under `html.dark` (report count, not re-run this pass).

### AD-08 — Dead tile click (High, functional)
Keyboard and mouse users get no response from integration tiles (no target). STATIC E2.

## Checks passed
- Estimator labels (RUNTIME jsdom).

## Checks not run / blocked
- Keyboard focus order and visible focus (**not run**).
- Screen-reader announcements for dialogs, tabs and dynamic status (**not run**).
- Zoom and reflow at 400% (**not run**).
- Automated scan (axe/WAVE/Lighthouse) (**not run**).
- Reduced-motion behaviour (**not run**).
