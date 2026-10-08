# 🏛️ Woodex Studio — Master Migration Plan (v2 to v3 Theme System Blocks)
**Execution Date**: October 08, 2026 – October 15, 2026  
**Target Standard**: Preline Ocean & Obsidian Dark Design System · Pure CSS Modularity · Zero Build Dependencies  
**Rule**: v2 baseline remains 100% untouched. All v3 work proceeds in parallel at `/admin-v3/` and `/woodex-live-v3/`.

---

## 📊 1. Architectural Analysis: v2 Baseline vs. v3 Block System

| Layer / Feature | Current v2 Baseline | Target v3 Block System |
|---|---|---|
| **Color System** | Legacy Navy & Gold tokens | Preline Ocean & Obsidian Dark (`#050608` pitch black + `#00b8db` cyan accent) |
| **Typography** | Mixed fonts | Inter (`400`, `500`, `600`, `700`) served locally via woff2 |
| **Public Page Sections** | Hardcoded static HTML blocks | Reusable, modular **Preline Block Templates** mapped to CMS Section Library |
| **Admin Control** | Separate v2 screens | Full 6-Hub unified Control Room (52 screens) + Visual Section Builder |
| **Performance** | Basic CSS | Gzip-compressed, WCAG AAA compliant, zero-dependency plain CSS/JS |

---

## 🧱 2. Master v3 Block Templates Catalog (Core Block Library)

The public website will be composed of 10 standardized, high-performance modular blocks:

1. **`BLK-HERO-01` · Luxury Architectural Hero**:
   - Split layout with high-res 3D render preview, glassmorphic badge, dynamic heading, and 1-click WhatsApp / Consultation booking CTA.
2. **`BLK-SRV-02` · 3-Column Services & Joinery Grid**:
   - Modern cards with hover elevation for Kitchens, Wardrobes, Complete Renovation, and Commercial Fit-Out.
3. **`BLK-PROJ-03` · Masonry Project Portfolio Showcase**:
   - Filterable gallery tabs (`Residential`, `Commercial`, `Kitchens`, `DHA Lahore`, `Bahria Town`) with high-res lightbox.
4. **`BLK-EST-04` · Interactive Construction & Interior Estimator**:
   - Real-time PKR cost calculator based on covered area (Marla / Kanal), finish tier (Standard, Executive, Ultra-Luxury).
5. **`BLK-CITY-05` · Localized City Authority Banner**:
   - Geo-targeted proof blocks for Lahore, Islamabad, Karachi, Rawalpindi with regional portfolio links.
6. **`BLK-STEP-06` · 4-Stage Architectural Process Stepper**:
   - `01 Consultation` → `02 3D Layout & BOQ` → `03 Factory Manufacturing` → `04 On-Site Handover`.
7. **`BLK-REV-07` · Verified Client Testimonial Carousel**:
   - Verified homeowner reviews with star ratings and video project links.
8. **`BLK-FAQ-08` · Structured Schema Accordion FAQ**:
   - SEO-optimized FAQ accordion with instant answers for rates, warranty, and timelines.
9. **`BLK-CTA-09` · Glassmorphic Conversion Banner**:
   - High-contrast lead capture box with phone input and direct WhatsApp trigger.
10. **`BLK-FOOT-10` · Global Multi-Column Footer & Chrome**:
    - Complete site map, NTN registration, office addresses, and social channels.

---

## 🗓️ 3. Date-Scheduled Master Implementation Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        V2 TO V3 MASTER EXECUTION SCHEDULE                    │
├──────────────┬──────────────────────────────┬───────────────────────────────┤
│ Date         │ Phase / Milestone            │ Deliverables & Scope          │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 08, 2026 │ Phase 1: Core Foundation &   │ • Complete v3 Admin (52 hubs) │
│ (TODAY)      │ Master Block Engine          │ • Glassmorphic Login + SSO    │
│              │                              │ • Section Library CMS sync    │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 09, 2026 │ Phase 2: Homepage & Core     │ • Homepage (`index.html`)     │
│              │ Architectural Pillars        │ • Services Pillar Page        │
│              │                              │ • Portfolio Showcase Page     │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 10, 2026 │ Phase 3: High-Value Landing  │ • 1-Kanal Villa Design Hub    │
│              │ & Residential Hubs           │ • 10-Marla Modern House Hub   │
│              │                              │ • 5-Marla / 2-Kanal Hubs      │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 11, 2026 │ Phase 4: Commercial, Kitchen │ • Kitchens & Cabinetry        │
│              │ & Specialty Pages            │ • Commercial Office Fit-Out   │
│              │                              │ • Restaurant & Retail Design  │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 12, 2026 │ Phase 5: Regional City Pages │ • Lahore Regional Hub         │
│              │ & Conversion Funnels         │ • Islamabad / Rawalpindi Hub  │
│              │                              │ • Karachi & Multan Hubs       │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 13, 2026 │ Phase 6: Interactive Tools   │ • Online BOQ Estimator        │
│              │ & Lead Capture Funnels       │ • Book a Site Visit Page      │
│              │                              │ • Contact & Inquiry Hub       │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 14, 2026 │ Phase 7: SEO Schema, Speed   │ • Core Web Vitals (95+ score) │
│              │ & Full Accessibility Audit   │ • 0 contrast problem pairs    │
│              │                              │ • XML sitemap & robots sync   │
├──────────────┼──────────────────────────────┼───────────────────────────────┤
│ Oct 15, 2026 │ Phase 8: Hostinger Package & │ • Master production zip build │
│              │ Production Verification      │ • 1-click cPanel deployment   │
└──────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 🎯 4. Core Pillar Pages Migration Matrix (Phase 2 & 3)

| Page Route | Target v3 Block Architecture | Primary CTA Funnel |
|---|---|---|
| `/` (Homepage) | `BLK-HERO-01` + `BLK-SRV-02` + `BLK-PROJ-03` + `BLK-STEP-06` + `BLK-CTA-09` | Book Free Site Survey |
| `/services/` | `BLK-SRV-02` (Full Joinery & Architecture Grid) + `BLK-FAQ-08` | Download 2026 Rates BOQ |
| `/projects/` | `BLK-PROJ-03` (Filterable Masonry Portfolio) + Case Studies | Request Similar Project Quote |
| `/1-kanal-house-design/` | `BLK-HERO-01` (1-Kanal Luxury) + Floorplans + BOQ Breakdown | Instant 1-Kanal Estimate |
| `/10-marla-house-design/` | `BLK-HERO-01` (10-Marla Modern) + Cost Analysis + Finishes | Instant 10-Marla Estimate |
| `/estimator/` | `BLK-EST-04` (Interactive Area & Luxury Tier Calculator) | WhatsApp Estimate Summary |
| `/contact/` | `BLK-HERO-01` (Split Office Map + Fast Inquiry Form) | Direct WhatsApp / Helpline |
| `/book-a-visit/` | Calendar Schedule Step-by-Step Consultation Booking | Confirmed On-Site Survey |

---

## 🔒 5. Quality & Non-Regression Guarantees

1. **v2 Isolation**: Admin v2 (`/admin/`) and existing production endpoints remain untouched.
2. **Speed & Zero Build Tools**: All blocks utilize semantic HTML and modular CSS variables with zero Node/npm dependencies required on Hostinger.
3. **Accessibility**: 100% WCAG AA/AAA compliance across all 74 color pairs in both dark obsidian and light modes.
4. **Instant Rollback & Backup**: Automated snapshots saved to `_private/backups/` before any file modifications.
