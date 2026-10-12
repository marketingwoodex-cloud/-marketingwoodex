# DESIGN TOKEN RECONCILIATION — current admin vs DESIGN.md v1.0

**Date:** 2026-10-13 · **Source of truth:** `woodex-live-p29-v2.1-pro/DESIGN.md`
**Scope:** every colour literal in `admin/**/*.css` and `admin/*.js`, measured against DESIGN.md §3.

---

## 1. Headline numbers

| Measure | Value |
|---|---|
| Distinct hex colours in the admin | **326** |
| Total literal colour uses | **1,424** |
| **Already exact DESIGN.md tokens** | **31 colours · 387 uses** |
| **Near-miss** (ΔRGB ≤ 25 — collapse is imperceptible) | **157 colours · 627 uses** |
| **Off-palette** (real violations) | **138 colours · 410 uses** |

**Read this first: DESIGN.md does not require a colour *invention*, it requires a colour *collapse*.**
The primary DESIGN.md specifies — `blue-600` `#2563eb` — is **already the admin's most-used blue (×22)**, and `blue-700` `#1d4ed8` is already in use (×11). The neutral ramp is already largely Tailwind (`#e5e7eb` gray-200 ×27, `#9ca3af` gray-400 ×12, `#f3f4f6` gray-100 ×10). Roughly **71% of all colour uses (1,014 of 1,424) already resolve to a DESIGN.md token** either exactly or within an imperceptible Δ.

---

## 2. Tier 1 — EXACT matches (387 uses) — no action

Already compliant. These are the skeleton the migration keeps:

| Hex | Uses | DESIGN.md token |
|---|---|---|
| `#ffffff` | 195 | `white` (surface) |
| `#e5e7eb` | 27 | `gray-200` (border) |
| `#2563eb` | 22 | **`blue-600` (primary)** |
| `#111827` | 16 | `gray-900` |
| `#f9fafb` | 14 | `gray-50` (page bg) |
| `#9ca3af` | 12 | `gray-400` |
| `#1d4ed8` | 11 | `blue-700` (primary hover) |

…plus 24 more (`gray-100/300/500/600/700/800`, `neutral-200/300/400/500/600/700/800/900`, `blue-100/500`, `red-100/500/600`, `teal-100/600`, `yellow-100/500/700`).

## 3. Tier 2 — NEAR (157 colours · 627 uses) — mechanical collapse

Every one of these is within ΔRGB ≤ 25 of a DESIGN.md token: the same colour, typed by hand. Highest-volume cases:

| Current | Uses | → DESIGN.md token | Δ | Note |
|---|---|---|---|---|
| `#0c1628` | 60 | `gray-900` `#111827` | 5.5 | **the single biggest win — 60 uses of a near-black** |
| `#667085` | 42 | `gray-500` `#6b7280` | 7.3 | grey ramp duplicate |
| `#e4e7ec` | 39 | `gray-200` `#e5e7eb` | 1.4 | border duplicate (Δ 1.4 — invisible) |
| `#f2f4f7` | 21 | `gray-100` `#f3f4f6` | 1.4 | surface duplicate (invisible) |
| `#f4efe7` | 21 | `gray-100` `#f3f4f6` | 15.8 | **warm cream — see §4** |
| `#d92d20` | 19 | `red-600` `#dc2626` | 9.7 | danger duplicate |
| `#94a3b8` | 15 | `gray-400` `#9ca3af` | 12.0 | |
| `#f59e0b` | 14 | `yellow-500` `#eab308` | 23.9 | warning duplicate |
| `#344054` | 14 | `gray-700` `#374151` | 4.4 | |
| `#475467` | 13 | `gray-600` `#4b5563` | 5.7 | |
| `#d0d5dd` | 12 | `gray-300` `#d1d5db` | 2.2 | |
| `#0a0f1e` | 12 | `gray-900` `#111827` | 14.5 | 3rd near-black |
| `#f04438` | 11 | `red-500` `#ef4444` | 12.0 | |
| `#98a2b3` | 10 | `gray-400` `#9ca3af` | 5.7 | 2nd grey-400 |

…and ~140 more. **This tier is the bulk of the work and it is pure find-and-replace.** Collapsing it removes ~600 redundant declarations with no visible change — the whole point of a token layer.

## 4. Tier 3 — OFF-PALETTE (138 colours · 410 uses) — needs a decision

These are not near-misses; they are **six duplicate ramps plus two competing brand identities**. Grouped by cause:

### 4a. Duplicate ramps — 4 different greens, 4 reds, 4 ambers, 3 blues for one purpose each

| Purpose | DESIGN.md says | Actually in use | Total uses |
|---|---|---|---|
| Success | `teal-600` `#0d9488` | `#12b76a` ×19 · `#10b981` ×13 · `#067647` ×12 · `#16a34a` ×7 · `#047857` ×5 | **56** |
| Danger | `red-600` `#dc2626` | `#b42318` ×17 · `#b91c1c` ×6 | 23 |
| Warning | `yellow-500/700` | `#f79009` ×11 · `#b54708` ×7 | 18 |
| Info/primary | `blue-600` | `#465fff` ×10 · `#6366f1` ×5 · `#38bdf8` ×8 | 23 |

**The success colour is defined four different ways and used 56 times.** This is exactly the "inconsistent" impression being reported — and it is mechanical to fix.

### 4b. Two competing brand identities

| Family | Uses | Verdict under DESIGN.md |
|---|---|---|
| **Gold / bronze** — `#b8956a` ×31, `#b8924c` ×9, `#d4af6a` ×6, `#e6cfa5` ×5, `#f4efe7` ×21, `#fffdf9` ×4, `#fffbeb` ×4 | **~80** | **No gold exists in DESIGN.md.** §1: *"Neutral surfaces, one accent."* §3 primary is blue. → **conflict** |
| **Cyan / obsidian** — `#00b8db` ×9, `#00d3f2` ×9, `#04222b` ×7, `#38bdf8` ×8 | **~33** | From the V2.1.1 pass. §1 allows one accent; §3 defines it as blue. → **conflict** |

**DESIGN.md §3 already decides the accent: `blue-600`, hover `blue-700`** — and the admin already uses those. So the *default* resolution is: **blue is the accent; cyan is out; gold is out of the UI chrome.** Gold is a brand asset (timber/wood identity), so the one judgement call left is whether it survives as a logo/brand mark only.

### 4c. Must NOT be changed (brand marks, not styling)

`#25d366` ×5 — the WhatsApp brand green. It identifies a third-party product and is not a UI colour. Same principle would apply to any other vendor mark.

---

## 5. What this means for effort

| Tier | Colours | Uses | Work |
|---|---|---|---|
| 1 exact | 31 | 387 | none |
| 2 near | 157 | 627 | mechanical collapse → `var()` |
| 3a duplicate ramps | ~30 | 120 | mechanical, per-purpose decision is already made by DESIGN.md |
| 3b brand conflict | ~20 | 113 | **one decision from the owner** (§4b) |
| 3c vendor marks | few | 5 | leave |

**~90% of the 1,424 literal uses are mechanical.** The only genuine judgement is the gold/cyan question — everything else DESIGN.md already answers.

---

## 6. Related findings (not colour)

| Area | Current | DESIGN.md §4/§5 | Gap |
|---|---|---|---|
| Sidebar width | needs measuring | `w-65` (260 px) | TBC |
| Header height | needs measuring | `h-13` sticky, `lg:ps-65` | TBC |
| Card radius | mixed | `rounded-xl` | drift |
| Input radius | mixed | `rounded-lg` | drift |
| Card shadow | mixed | `shadow-xs` | drift |
| Inline JS styles | **471** | §4: *"No inline `style` except dynamic values"* | **violation** |
| Preline `hs-*` plugins | **0** | §14: *"use Preline `hs-*` plugins, never custom JS"* | **violation** |
| Tailwind utility usage | `woodex-tw.css` = 887 B | §0: Tailwind v4 throughout | **violation** |
| Loading/empty/error states | partial | §4 mandates all three per data block | **violation** |

Full raw dump of all 326 colours: `deliverables/design-v211/token-reconciliation-raw.txt`
