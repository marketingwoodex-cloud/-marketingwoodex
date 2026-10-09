# 📋 Woodex Admin v2.1 Master Architecture & Upgrade Plan
**Preline Ocean Pure Design System · 70 Section Block Suite · Unified SVG Icons · Staged 3-Phase Rollout**

---

## 🎯 Executive Summary & Directives
* **Design Direction**: **Preline Ocean Pure** — High-contrast obsidian dark palette (`#0b0d13`), card surfaces (`#111318`), crisp border definitions (`#20242f`), and sharp Cyan-500 accents (`#00b8db` / `#00d3f2`).
* **Section Block Suite**: Complete **70 Section Template Library** with rendered responsive preview cards, 1-click HTML copy, direct Builder insertion, and JSON Starter Pack Import/Export.
* **Icon & Typography System**: Unified inline SVG vector icons (Lucide / Feather) and Inter typography across all 35+ admin views.
* **Safety & Non-Breaking Mandate**: Zero alterations to existing public frontend templates, database schemas, or core backend APIs. 100% backward compatible.

---

## 🗺️ 3-Phase Structured Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Design System, Typography & SVG Icon Standardization                  │
│ • Preline Ocean Pure Token System (#0b0d13, #111318, #00b8db, #20242f)          │
│ • Unified SVG Icon System across all 35+ views, buttons, drawer tabs & tables   │
│ • Typography hierarchy (Inter headings, WCAG AAA readability, status badges)    │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: 70 Section Block Suite & Visual Template System                        │
│ • Categorized Section Library UI (Hero, Kitchens, Wardrobes, Offices, CTA, FAQ) │
│ • Scaled responsive iframe preview cards with lazy IntersectionObserver         │
│ • 1-Click "Copy HTML", "Insert into Builder", and "Full Screen Preview" modals  │
│ • Starter Pack JSON Import / Export Engine with validation                      │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Core Views Deep Polish & Master Deployment Synchronization             │
│ • Dashboard Overview & CRM Leads tracker harmonization                          │
│ • Visual Page Builder block insertion tray integration                          │
│ • Full synchronization across p23-live/, frontend-v1/, and master zip packages  │
│ • Git commit, push, and Port 8080 live preview validation                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Phase 1 Specifications: Design System & Unified Icons

### 1.1 Color Palette & Token Model
| Token | Dark Value (Obsidian) | Light Value (Ocean) | Usage |
| :--- | :--- | :--- | :--- |
| `--bg` | `#0b0d13` | `#f9fafb` | Root viewport canvas |
| `--card` | `#111318` | `#ffffff` | Primary card & module container |
| `--card-elev` | `#181c24` | `#f1f5f9` | Hover states, dropdowns, popovers |
| `--line` | `#20242f` | `#e2e8f0` | Crisp structural borders |
| `--pri` | `#00b8db` | `#007595` | Primary brand accent & main buttons |
| `--pri-glow` | `#00d3f2` | `#0090b8` | Hover state, active indicators |
| `--txt` | `#f9fafb` | `#0f172a` | High-contrast body text (WCAG AAA) |
| `--mut` | `#94a3b8` | `#64748b` | Secondary captions, timestamps |

### 1.2 SVG Icon Matrix (`W.ic(...)`)
All views utilize vectorized 18px stroke icons:
* **Navigation**: `layout-dashboard`, `inbox`, `kanban`, `clock`, `receipt`, `message-circle`, `send`, `sparkles`, `square-pen`, `layers`, `palette`, `zap`, `users`, `shield`, `settings`.
* **Actions**: `plus`, `download`, `upload`, `check`, `x`, `trash-2`, `edit-2`, `external-link`, `copy`, `eye`, `refresh-cw`, `search`, `filter`.

---

## 🧱 Phase 2 Specifications: 70 Section Block Suite

### 2.1 Categorized Section Library (`#/library`)
* **Hero & Banners (10)**: Luxury Interior Hero, Kitchen Master Showcase, Architectural Split Hero, Modern Farmhouse Showcase, Video Background Hero.
* **Kitchens & Cabinetry (10)**: German Acrylic Island, Matte Charcoal Linear Kitchen, Classic Shaker Wood, Quartz Countertop Showcase, Pantry Organization.
* **Wardrobes & Closets (10)**: Walk-In Glass Wardrobe, Floor-to-Ceiling Sliding, Integrated Warm LED Closet, Modular Bedroom Storage.
* **Office & Commercial Fit-out (8)**: Executive Boardroom, Modern Coworking Grid, Acoustic Wall Panelling, Reception & Lounge.
* **Features & Services (12)**: 3-Column Service Grid, Turnkey Construction Process, Material Quality Inspection, Architectural 3D Renders.
* **Testimonials & Social Proof (6)**: Client Quote Carousels, Verified Video Testimonials, DHA & Bahria Town Project Reviews.
* **CTA, Estimator & Contact (10)**: Interactive Cost Estimator CTA, VIP Consultation Booking, Quick WhatsApp Floating Banner, Multi-Step Inquiry Form.
* **FAQ & Accordion (4)**: Pricing & Timelines FAQ, Warranty & Materials FAQ, Architectural Process Accordion.

### 2.2 Template Card Actions
* **1-Click Copy HTML**: Direct sanitized copy into clipboard.
* **1-Click Insert**: Posts block data into current builder draft.
* **Preview Modal**: Interactive lightbox iframe testing responsive breakpoints (Mobile 375px, Tablet 768px, Desktop 1280px).

---

## 🚀 Phase 3 Specifications: Deployment & Verification
* **Master ZIP Packages**: Direct sync to `woodex-live-P23/woodex-live-p23.zip` (27.3 MB).
* **Git Repository**: Branch `arena/8a776c65-marketingwoodex`.
* **Verified Credentials**: Master (`master@woodex.pk`), Admin (`admin@woodex.pk`), Sales (`sales@woodex.pk`).
