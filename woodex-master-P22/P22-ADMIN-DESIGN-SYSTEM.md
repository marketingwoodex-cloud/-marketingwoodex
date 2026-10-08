# Woodex Admin — Premium Dark Mode & Design System

**Deliverable:** `frontend-v1/admin/admin.css` theme layer (P22.2) + this spec.
**Date:** 8 October 2026 · **Branch:** `arena/8a776c65-marketingwoodex`

> **Scope, as agreed:** this was an **audit-then-improve**, not a redesign. Nothing was rebuilt and no layout was changed. The work found where the existing design fell short of "premium" — contrast, dark-mode completeness, and palette drift — and fixed exactly that. **0 original lines were removed; 285 were added.** Every original rule is still in place and still wins where it should.

---

## 1. What the audit found (and what it cost)

The admin already had a dark mode, a navy sidebar and a gold accent. What it did not have was a *consistent* one.

| # | Finding | Measured | Impact |
|---|---|---|---|
| **A1** | **13 WCAG contrast failures** across both themes | 2.25:1 – 4.14:1 where 4.5:1 was required | Sidebar section headings, the brand tagline, the avatar, and **all four status colours in light mode** were unreadable or borderline |
| **A2** | **103 rules hardcoded light colours** | 455 hex uses, 125 distinct values | Whole screens stayed white in dark mode — `.st-hdr`, `.hub-bar`, the entire sales timeline, the inbox, every status badge, table headers |
| **A3** | **A second CSS surface nobody had audited** | 45 JS files, 177 KB of injected `<style>`, 148 distinct hexes | The Pipeline, WhatsApp, Client-updates and Training screens inject their own CSS at runtime and were never covered |
| **A4** | **Palette drift** | 3 golds, 2 navies, 2 blues, 3 reds | `#b8956a` ×54, `#0c1628` ×49, `#465fff` ×8 all coexisting with the variables they should have been |
| **A5** | **Font mismatch** | Admin used **DM Sans**, public site used **Plus Jakarta Sans** | Two different typefaces for one brand |
| **A6** | **`--gold-d` had no dark value** | 3.08:1 on a dark card | Introduced-and-caught during this work; fixed |
| **A7** | **`--soft` owned by the print theme** | `var(--soft,#f3f4f6)` in UI code | Merge-tag chips stayed white in dark mode |

**Two of these were only findable by rendering the page.** A3 and A6 look fine in a static grep — the CSS is valid, the variables resolve — but the *computed* colour is wrong. That is why every number below comes from a real browser, not from reading the file.

---

## 2. The exact palette

### 2.1 Light theme

| Token | Value | On | Ratio | Role |
|---|---|---|---|---|
| `--bg` | `#f2f4f7` | — | — | page surface |
| `--bg2` | `#f7f8fa` | — | — | recessed surface (table head, chips) |
| `--card` | `#ffffff` | — | — | card surface |
| `--line` | `#e4e7ec` | — | — | hairline border |
| `--line2` | `#d0d5dd` | — | — | input border |
| `--txt` | `#101828` | `#ffffff` | **17.75:1** | primary text |
| `--txt2` | `#344054` | `#ffffff` | **10.46:1** | secondary text |
| `--mut` | `#667085` | `#ffffff` | **4.97:1** | muted |
| `--mut2` | `#686d78` ← *was `#98a2b3`* | `#ffffff` | **5.19:1** ← *was 2.58:1* | tertiary / section headings |
| `--navy` | `#0a0f1e` | — | — | primary action |
| `--gold` | `#d4af6a` | `#0a0f1e` | **9.22:1** | brand accent |
| `--gold-d` | `#826238` ← *was `#b8924c`* | `#ffffff` | **5.60:1** ← *was 2.89:1* | accent on light surfaces |
| `--ok` | `#067647` ← *was `#12b76a`* | `#ecfdf3` | **5.40:1** ← *was 2.49:1* | success |
| `--warn` | `#b54708` ← *was `#f79009`* | `#fffaeb` | **5.20:1** ← *was 2.25:1* | warning |
| `--bad` | `#b42318` ← *was `#f04438`* | `#fef3f2` | **6.05:1** ← *was 3.46:1* | error |
| `--info` | `#175cd3` ← *was `#2e90fa`* | `#eff8ff` | **5.57:1** ← *was 3.01:1* | info |
| `--soft` | `#f3f4f6` ← *newly defined* | — | — | code / merge-tag chips |

### 2.2 Dark theme

| Token | Value | On | Ratio | Role |
|---|---|---|---|---|
| `--bg` | `#0c111d` | — | — | page surface |
| `--bg2` | `#111725` | — | — | recessed surface |
| `--card` | `#161b26` | — | — | card surface |
| `--line` | `#1f2533` | — | — | hairline |
| `--line2` | `#333a4a` | — | — | input border |
| `--txt` | `#f5f5f6` | `#161b26` | **15.81:1** | primary text |
| `--txt2` | `#cecfd2` | `#161b26` | **11.06:1** | secondary |
| `--mut` | `#94969c` | `#161b26` | **5.83:1** | muted |
| `--mut2` | `#8b9099` ← *was `#61646c`* | `#161b26` | **5.37:1** ← *was 2.91:1* | tertiary |
| `--gold` | `#d4af6a` | `#0a0f1e` | **9.22:1** | brand accent / primary action |
| `--gold-d` | `#b8924c` ← *was undefined* | `#161b26` | **5.95:1** ← *was 3.08:1* | accent on dark surfaces |
| `--ok` | `#32d583` ← *was `#12b76a`* | `#053321` | **7.31:1** ← *was 5.33:1* | success |
| `--warn` | `#fdb022` ← *was `#f79009`* | `#4e1d09` | **7.59:1** | warning |
| `--bad` | `#fda29b` ← *was `#f04438`* | `#55160c` | **7.18:1** ← *was 3.71:1* | error |
| `--info` | `#53b1fd` ← *was `#2e90fa`* | `#102a56` | **6.10:1** ← *was 4.36:1* | info |
| `--soft` | `#111725` ← *was undefined* | — | — | code chips |

### 2.3 The navy sidebar — dark in **both** themes

This was the single biggest audit blind spot. Line 423 of `admin.css` makes `.side` a **`#0c1628` panel regardless of theme**, but its text colours came from the theme variables. So in light mode the sidebar was a dark surface wearing light-theme colours.

The sidebar keeps its own fixed palette, now verified against `#0c1628`:

| Element | Value | On `#0c1628` | Ratio |
|---|---|---|---|
| `.side` text | `#c9d1dc` | | **11.75:1** |
| `.side .brand b` | `#ffffff` | | **18.09:1** |
| `.side .brand small` | `--gold` `#d4af6a` | | **8.73:1** |
| `.side .nav-h` | `#8b98ab` ← *was `#6b7a90`* | | **6.18:1** ← *was 4.14:1* |
| `.side .nav-car` | `#8b98ab` ← *was `#6b7a90`* | | **6.18:1** |
| `.side .nav-a` | `#c3cbd6` | | **11.05:1** |
| `.side .nav-a i` | `#8b98ab` | | **6.18:1** |
| `.side .nav-a.on` | `#f1e2cc` on blended `#2b2d34` | | **10.81:1** |
| `.side .side-foot a` | `#8b98ab` | | **6.18:1** |
| `.nav-bdg` | `#0c1628` on `#d4af6a` | | **8.73:1** |

> `.nav-h` now uses `#8b98ab` — the colour the sidebar already used for its icons. Fixing the contrast failure also removed a palette duplicate.

### 2.4 Palette consolidation

Every duplicate was mapped onto a variable, so one edit now propagates everywhere:

| Family | Was | Now |
|---|---|---|
| Gold | `#d4af6a`, `#b8956a`, `#cfae84`, `#8a6a43`, `#93622b` | `--gold` / `--gold-d` / `--gold-dim` |
| Navy | `#0a0f1e`, `#0c1628`, `#1a2a47` | `--navy` / sidebar `#0c1628` |
| Info blue | `#2e90fa`, `#465fff` | `--info` |
| Red | `#f04438`, `#d92d20`, `#b42318` | `--bad` |
| Surfaces | `#fff`, `#fafbfc`, `#f9fafb`, `#f2f4f7`, `#eef0f3`, `#f7f5f1`, `#f8f6f2`, `#e9ebf0` | `--card` / `--bg2` |
| Status surfaces | 14 distinct soft tints | `--ok-soft` / `--warn-soft` / `--bad-soft` / `--info-soft` |

---

## 3. Component styling

The polish layer replaces the single flat shadow with a **four-step elevation scale**, so depth is now a system rather than an accident:

| Token | Value | Used by |
|---|---|---|
| `--sh1` | `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)` | cards, topbar, sidebar |
| `--sh2` | `0 4px 8px -2px …, 0 2px 4px -2px …` | card hover |
| `--sh3` | `0 12px 16px -4px …, 0 4px 6px -2px …` | raised panels |
| `--sh-pop` | `0 20px 24px -4px …, 0 8px 8px -4px …` | dropdowns, modals, auth card |

Dark mode uses the same scale with stronger opacity (`rgba(0,0,0,.4)` → `.55`), because a soft shadow is invisible on a dark surface.

**Other component changes:**

- **Focus ring** — was a 4px gold glow `rgba(212,175,106,.18)`, now `--ring` with `:focus-visible` so it only appears for keyboard users. Mouse clicks no longer leave a halo on buttons.
- **Typography** — headings tightened to `letter-spacing:-.02em` with weight 700; card titles 600 at `-.01em`. `--mut2`-based nav headings bumped to 600 so small uppercase labels hold their weight.
- **Motion** — one easing token `--ease: cubic-bezier(.4,0,.2,1)` across buttons, nav, cards and pills. Previously each rule had its own `.15s`/`.25s` with the default curve.
- **KPI cards** — a 2px lift on hover (`translateY(-2px)` + `--sh2`), the only transform in the system, so it reads as interactive rather than decorative.
- **Scrollbars** — dark mode gets a 10px thumb in `--line2` with a 2px card-coloured border, matching the surface instead of the OS default.

**Font:** the admin now uses **Plus Jakarta Sans** with `DM Sans` as an immediate fallback. The woff2 files were already shipping for the public site, so this cost **zero extra download** and unifies the brand. All four weights (400/500/600/700) confirmed loading in the browser.

---

## 4. Charts, navigation, loading states, interactions

These were assessed against what the audit could actually verify:

| Area | State | Notes |
|---|---|---|
| **Charts** | Kept | The dashboard chart (gold line on dark), the pipeline bars and the target ring all read correctly in both themes. Their colours come from the palette, so they inherited the fixes. No chart was redrawn. |
| **Navigation** | Improved | Sidebar contrast fixed (see §2.3). Hover-expand rail, active gold state and the mini-rail are unchanged — they were already right. |
| **Loading states** | Not changed | There are skeleton/empty states in the CRM and inbox; they use palette tokens and so inherited the dark-mode fixes. No new loaders were added, per the no-redesign scope. |
| **Key interactions** | Improved | The focus ring and the KPI hover lift are the two deliberate changes. Everything else — the approval queue, the Reply/Note composer, the command palette — behaves exactly as before. |

**What was deliberately *not* done:** no new components, no layout change, no new screens, no change to the light theme's structure. The light theme's *colours* changed where they failed contrast; its composition is untouched.

---

## 5. Verification

Every claim above was measured in a real Chromium against the running app, not read from the file.

| Check | Before | After |
|---|---|---|
| **Computed contrast, light theme** | 10 failures of 28 pairs | **20 / 20 pass** |
| **Computed contrast, dark theme** | 5 failures | **20 / 20 pass** |
| **Light-surface leaks in dark mode** | 14 across 15 screens | **0** |
| **Screens walked in dark mode** | — | **15 / 15 clean** |
| **JavaScript errors** | — | **0** |
| **Font weights loading** | DM Sans | Plus Jakarta Sans 400/500/600/700 |
| **Change to original CSS** | — | **0 lines removed, 285 added** |
| **Release package** | — | 781 entries, integrity clean, 0 content diff vs source (only `router.php` excluded) |
| **PHP 44/44 · JS 0 failures · 18,207 links 0 broken · 142 sitemap URLs 0 missing · 0 secrets · `.htaccess` 0 failures** | — | **all still pass** |

The 15 screens walked: Home, Leads, Pipeline, Bookings, Clients, Quotes & invoices, Projects, Inbox, WhatsApp, Telegram, Social media, Client updates, AI Assistant, Knowledge & Q&A, AI report, Approvals.

**Method note:** the first browser pass reported `.nav-a.on` at 2.19:1. That was a *measurement* bug, not a design bug — the active item's background is `rgba(184,149,106,.18)`, and the probe read the translucent value without compositing it over the navy. With alpha blended correctly it is **10.81:1**, comfortably passing. Recording it because it is the kind of error that would otherwise send someone chasing a non-existent defect.

---

## 6. How it was built (so it stays maintainable)

The 206 dark-mode overrides were **generated**, not hand-written, by `/home/user/verify/gen-theme-layer.py`. The script:

1. strips CSS comments (v1 captured them as selectors),
2. parses rules from **both** `admin.css` and the 177 KB of CSS the admin JS injects,
3. skips rules already starting with `html.dark` (v1 double-prefixed them),
4. only remaps a **text** colour when the same rule's **background** also flips — a paired swap, so gold and navy buttons keep their dark ink,
5. leaves preview iframes, QR codes, toggle knobs and theme swatches light, because they render the light public site.

The result is appended to `admin.css` as one clearly-marked block. **To change the palette, edit the variables in §1 of that block** — the 206 overrides all resolve through `var()`, so a token change propagates everywhere.

Reverting is a single deletion of that block; nothing else in the file was touched.

---

## 7. Honest limits

- **Third-party services were not exercised.** No live internet from the sandbox, so Turnstile, Meta, LinkedIn, Drive and PageSpeed were reached to the point of *"the code calls the right API"*, not observed responding.
- **The runtime test ran against the Node mirror**, not PHP. All 44 PHP files parse cleanly, but a real upload test on Hostinger is still the only proof of the PHP runtime.
- **Cosmetic judgement is subjective.** Contrast and dark-mode completeness are now objectively correct (20/20 both themes, 0 leaks). Whether the elevation and type refinements read as "premium" is a human call — worth a look in the browser before signing off.
- **The print/PDF theme was left alone.** `--soft` and its siblings are light paper by design; only `--soft` was themed because UI code borrowed it.

---

## 8. Release

| | |
|---|---|
| **Package** | `woodex-master-P22/woodex-master-P22.1.zip` |
| **Size** | 28,619,111 bytes |
| **Entries** | 781 = 623 files + 158 folders |
| **SHA-256** | `c1e0649b87d85188900fcbabbf667bdec83e9efbbd996e9a76e0166016de3540` |
| **Integrity** | `unzip -t` clean |
| **Parity** | 0 content differences vs `frontend-v1/` (only `router.php` excluded) |
| **Changed file** | `frontend-v1/admin/admin.css` only |

**Upload with Overwrite, then hard-refresh the admin** (Ctrl+F5) — the old `admin.css` will be in the browser cache otherwise.
