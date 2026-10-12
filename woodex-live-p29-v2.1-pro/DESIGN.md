# DESIGN.md — Dashboard Master Design System

> Single source of truth for the admin dashboard UI. Built on **Preline UI + Tailwind CSS (v4)**.
> Reference: Preline Blocks (preline.co/blocks), Preline Admin Dashboard template, Preline Theme semantic tokens.
> Rule for humans and AI agents: **do not invent styles. Compose from the tokens, blocks and patterns below.**

* * *

## 0. Setup

    npm i tailwindcss @tailwindcss/cli preline

    /* src/input.css */
    @import "tailwindcss";
    @import "./themes/theme.css";                  /* Preline theme (semantic tokens) */
    @source "./node_modules/preline/dist/*.js";
    @custom-variant dark (&:where(.dark, .dark *));

    <script src="./node_modules/preline/dist/preline.js"></script>

Optional (AI tooling): `npx skills add htmlstreamofficial/preline`

> Note: the Preline Pro admin dashboard template and premium blocks are paywalled. This file follows Preline's public conventions (class patterns, `hs-*` plugins, theme tokens). Verify exact token names against your installed theme file.

* * *

## 1. Design Principles

1. **Calm density**: data first, chrome second. Neutral surfaces, one accent.
2. **Tokens over values**: never hard-code hex. Use semantic tokens (Section 3).
3. **Light and dark parity**: every block ships both (`dark:` variants).
4. **Motion with purpose**: 150–300 ms, only to show state change or hierarchy.
5. **Accessible by default**: 4.5:1 text contrast, visible focus ring, keyboard-operable overlays.
6. **Mobile first**: sidebar collapses to an off-canvas drawer below `lg`.

* * *

## 2. Typography & Font

| Role | Font | Notes |
| --- | --- | --- |
| Sans (UI, default) | **Inter** | Preline default. Weights 400, 500, 600, 700 |
| Mono (code, IDs) | `ui-monospace, SFMono-Regular, Menlo, monospace` | Tabular data, API keys |

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    @theme {
      --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

### Type scale

| Token | Classes | Use |
| --- | --- | --- |
| Page title | `text-2xl font-semibold text-gray-800 dark:text-neutral-200` | H1 per page |
| Section title | `text-lg font-semibold` | Card / block headers |
| Card title | `text-base font-semibold` |     |
| Body | `text-sm text-gray-600 dark:text-neutral-400` | Default |
| Caption / meta | `text-xs text-gray-500 dark:text-neutral-500` | Timestamps, helper text |
| Eyebrow / label | `text-xs font-semibold uppercase tracking-wide` | Table headers, sidebar groups |
| Stat number | `text-3xl font-bold tabular-nums` | KPI values |

Rules: max 2 weights per block; `tabular-nums` for all numbers; line length ≤ 70ch for prose.

* * *

## 3. Color & Theme Tokens

Use Preline semantic tokens when the theme is installed; fall back to the Tailwind palette shown.

| Purpose | Light | Dark |
| --- | --- | --- |
| Page background | `bg-gray-50` | `dark:bg-neutral-900` |
| Surface (card, sidebar, header) | `bg-white` | `dark:bg-neutral-800` |
| Border | `border-gray-200` | `dark:border-neutral-700` |
| Text primary | `text-gray-800` | `dark:text-neutral-200` |
| Text secondary | `text-gray-600` | `dark:text-neutral-400` |
| Text muted | `text-gray-500` | `dark:text-neutral-500` |
| Primary (accent) | `bg-blue-600 hover:bg-blue-700 text-white` | same |
| Success | `text-teal-600 bg-teal-100` | `dark:bg-teal-800/30 dark:text-teal-500` |
| Warning | `text-yellow-700 bg-yellow-100` | `dark:bg-yellow-800/30 dark:text-yellow-500` |
| Danger | `text-red-600 bg-red-100` | `dark:bg-red-800/30 dark:text-red-500` |
| Info | `text-blue-600 bg-blue-100` | `dark:bg-blue-800/30 dark:text-blue-500` |

    @theme {
      --color-primary: var(--color-blue-600);
      --color-primary-hover: var(--color-blue-700);
      --color-surface: #ffffff;
      --color-page: var(--color-gray-50);
    }

Dark mode: toggle `class="dark"` on `<html>`; persist choice in `localStorage` (`hs_theme`: `light | dark | auto`).

### 3.1 Status text shades — AA correction (v1.1, 2026-10-13)

The §3 status row proposes `text-teal-600`, `text-red-600` and `text-blue-600` for text sitting on
their own soft chip surfaces. Measured against §12's own requirement (contrast ≥ 4.5:1 for text),
**three of those pairings fail**:

| Pairing | Contrast | Verdict |
| --- | --- | --- |
| `teal-600` `#0d9488` on `teal-100` `#ccfbf1` | **3.32:1** | fails |
| `red-600` `#dc2626` on `red-100` `#fee2e2` | **3.95:1** | fails |
| `blue-600` `#2563eb` on `blue-100` `#dbeafe` | **4.24:1** | fails |

**Rule: the `-100` shade is the chip fill, the `-700` shade is the text.**

| Purpose | Fill | Text (light) | Contrast | Text (dark) |
| --- | --- | --- | --- | --- |
| Success | `--color-ok-soft` teal-100 | `--color-ok` **teal-700** `#0f766e` | 4.86 / 5.20 | teal-500 `#14b8a6` |
| Warning | `--color-warn-soft` yellow-100 | `--color-warn` **yellow-700** `#a16207` | 4.58 / 4.75 | yellow-500 `#eab308` |
| Danger | `--color-bad-soft` red-100 | `--color-bad` **red-700** `#b91c1c` | 5.30 / 5.91 | red-500 `#ef4444` |
| Info | `--color-info-soft` blue-100 | `--color-info` **blue-700** `#1d4ed8` | 5.49 / 6.29 | blue-500 `#3b82f6` |

Contrast figures are `on white / on the soft fill`. Dark-mode values sit on `neutral-800` and clear
4.5:1 there. `--color-primary` (blue-600) is unchanged — it is a *fill* colour, and white on it is
5.17:1.

This is a refinement of §3, not a replacement: the brand, surface, border and text tokens in §3 are
adopted exactly as written. Only the status *text* shade moves one step darker so §3 and §12 stop
contradicting each other.

### 3.2 Token implementation

DESIGN.md tokens are compiled by `tools/ui-build` (Tailwind v4, `@theme static`) into
`admin/assets/woodex-tw.css`, and bridged to the legacy token names in
`admin/assets/wx-ds-tokens.css`, which **must load last**. The admin's hand-written stylesheets
consume the tokens, so a token change re-themes the entire admin from one place.

* * *

## 4. Spacing, Radius, Elevation

| Token | Value |
| --- | --- |
| Base unit | 4 px (Tailwind scale) |
| Page padding | `p-4 sm:p-6 lg:p-8` |
| Card padding | `p-4 md:p-5` |
| Grid gap | `gap-4 md:gap-6` |
| Radius: inputs/buttons | `rounded-lg` |
| Radius: cards/modals | `rounded-xl` |
| Radius: avatars/pills | `rounded-full` |
| Shadow: card | `shadow-xs` |
| Shadow: dropdown/modal | `shadow-md` / `shadow-lg` |
| Focus ring | `focus:outline-hidden focus:ring-2 focus:ring-blue-500` |

* * *

## 5. App Shell Layout

    ┌───────────┬──────────────────────────────────────┐
    │  SIDEBAR  │  HEADER (sticky, h-13)               │
    │  w-65     ├──────────────────────────────────────┤
    │  fixed    │  <main> lg:ps-65                     │
    │  lg:block │    page header · filters · blocks    │
    │           │                                      │
    └───────────┴──────────────────────────────────────┘

    <body class="bg-gray-50 dark:bg-neutral-900">
      <header class="sticky top-0 inset-x-0 z-48 w-full bg-white border-b border-gray-200 lg:ps-65 dark:bg-neutral-800 dark:border-neutral-700">
        <!-- Section 7 -->
      </header>

      <!-- Sidebar toggle (mobile) -->
      <div class="sticky top-0 inset-x-0 z-20 bg-white border-y border-gray-200 px-4 sm:px-6 lg:px-8 lg:hidden dark:bg-neutral-800 dark:border-neutral-700">
        <button type="button" class="py-3 text-gray-500 hover:text-gray-600"
          data-hs-overlay="#hs-application-sidebar" aria-controls="hs-application-sidebar" aria-label="Toggle navigation">
          <span class="sr-only">Toggle Navigation</span>
          <svg class="size-5" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
        </button>
      </div>

      <!-- Sidebar: Section 6 -->

      <main class="w-full lg:ps-65">
        <div class="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <!-- Page blocks -->
        </div>
      </main>
    </body>

Breakpoints: `sm 640 · md 768 · lg 1024 (sidebar pinned) · xl 1280 · 2xl 1536`.

* * *

## 6. Sidebar Master Spec

**Behavior**: pinned on `lg+`, off-canvas drawer below. Groups collapse via `hs-accordion`. Active item = tinted background.
**Width**: `w-65` (260 px). **Z-index**: `z-60`. **Animation**: `transition-all duration-300 transform`.

    <div id="hs-application-sidebar"
      class="hs-overlay [--auto-close:lg] hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform
             w-65 hidden fixed inset-y-0 start-0 z-60 bg-white border-e border-gray-200
             lg:block lg:translate-x-0 lg:end-auto lg:bottom-0
             dark:bg-neutral-800 dark:border-neutral-700"
      role="dialog" tabindex="-1" aria-label="Sidebar">
      <div class="relative flex flex-col h-full max-h-full">

        <!-- Brand -->
        <div class="px-6 pt-4 flex items-center justify-between">
          <a class="flex-none rounded-xl text-xl font-semibold focus:outline-hidden focus:opacity-80" href="#" aria-label="Brand">Brand</a>
        </div>

        <!-- Nav -->
        <div class="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300
                    dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          <nav class="hs-accordion-group p-3 w-full flex flex-col flex-wrap" data-hs-accordion-always-open>
            <ul class="flex flex-col space-y-1">

              <!-- Link (active) -->
              <li>
                <a class="flex items-center gap-x-3.5 py-2 px-2.5 bg-gray-100 text-sm text-gray-800 rounded-lg
                          dark:bg-neutral-700 dark:text-white" href="#" aria-current="page">
                  <svg class="size-4" ...></svg> Dashboard
                </a>
              </li>

              <!-- Link -->
              <li>
                <a class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100
                          focus:outline-hidden focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700
                          dark:hover:text-neutral-300" href="#">
                  <svg class="size-4" ...></svg> Orders
                </a>
              </li>

              <!-- Accordion group -->
              <li class="hs-accordion" id="users-accordion">
                <button type="button"
                  class="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700
                         rounded-lg hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  aria-expanded="true" aria-controls="users-accordion-sub">
                  <svg class="size-4" ...></svg> Users
                  <svg class="hs-accordion-active:block ms-auto hidden size-4" ...><!-- chevron up --></svg>
                  <svg class="hs-accordion-active:hidden ms-auto block size-4" ...><!-- chevron down --></svg>
                </button>
                <div id="users-accordion-sub"
                  class="hs-accordion-content w-full overflow-hidden transition-[height] duration-300 hidden" role="region">
                  <ul class="ps-8 pt-1 space-y-1">
                    <li><a class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100
                                  dark:text-neutral-400 dark:hover:bg-neutral-700" href="#">All users</a></li>
                  </ul>
                </div>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Footer (user / upgrade) -->
        <div class="p-3 border-t border-gray-200 dark:border-neutral-700"><!-- profile dropdown --></div>
      </div>
    </div>

Sidebar rules:

* Group labels: `px-2.5 pt-4 pb-1 text-xs font-semibold uppercase text-gray-500`.
* Max 2 nesting levels. Icons `size-4`, stroke `currentColor`.
* Collapsed/mini variant: `w-16`, labels hidden, tooltips via `hs-tooltip`.
* Always include `aria-current="page"` on the active link.

* * *

## 7. Header Master Spec

    <nav class="flex basis-full items-center w-full mx-auto px-4 sm:px-6 py-2.5" aria-label="Global">
      <div class="me-5 lg:me-0 lg:hidden"><!-- mobile logo --></div>
      <div class="w-full flex items-center justify-between gap-x-3 ms-auto md:ps-3 md:gap-x-3">
        <!-- Search -->
        <div class="relative max-w-sm w-full">
          <input type="text" class="py-2 ps-10 pe-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500
                 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400"
                 placeholder="Search" aria-label="Search">
          <div class="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3.5">
            <svg class="size-4 text-gray-400" ...></svg>
          </div>
        </div>
        <!-- Actions: theme toggle · notifications · profile dropdown -->
        <div class="flex items-center gap-x-2"></div>
      </div>
    </nav>

* * *

## 8. Complete Block System

Every block = one self-contained `<section>` or card, wrapping rules below. Naming: `block-<category>-<variant>`.

### 8.0 Block anatomy (universal card)

    <div class="flex flex-col bg-white border border-gray-200 shadow-xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
      <div class="px-4 py-3 md:px-5 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-gray-800 dark:text-neutral-200">Title</h2>
        <div><!-- actions --></div>
      </div>
      <div class="p-4 md:p-5"><!-- content --></div>
      <div class="px-4 py-3 md:px-5 border-t border-gray-200 dark:border-neutral-700"><!-- optional footer --></div>
    </div>

### 8.1 Block catalog

| #   | Category | Blocks | Key Preline plugin |
| --- | --- | --- | --- |
| 1   | **Navigation** | Sidebar, header, breadcrumbs, tabs, pagination, mobile drawer | `hs-overlay`, `hs-accordion`, `hs-tabs` |
| 2   | **Page header** | Title + actions, title + tabs, title + filters |     |
| 3   | **Stats / KPI** | Stat card, stat with sparkline, stat group, progress stat |     |
| 4   | **Charts** | Line, bar, area, donut, radial (ApexCharts) | Apexcharts + Preline chart tooltip |
| 5   | **Tables** | Basic, sortable, selectable, with avatars, with row actions, empty state | `hs-datatable`, `hs-dropdown` |
| 6   | **Cards** | Basic, media, list card, activity feed, task list |     |
| 7   | **Forms** | Input, select, textarea, switch, checkbox, radio, file upload, date picker, strong password, combobox | `hs-select`, `hs-datepicker`, `hs-file-upload`, `hs-toggle-password` |
| 8   | **Overlays** | Modal, drawer, dropdown, popover, tooltip, command palette | `hs-overlay`, `hs-dropdown`, `hs-tooltip` |
| 9   | **Feedback** | Alert, toast, badge, progress, spinner, skeleton | `hs-remove-element` |
| 10  | **Data display** | Avatar group, timeline, list group, description list, accordion, collapse | `hs-accordion`, `hs-collapse` |
| 11  | **Pages** | Auth (sign in / up / reset), profile, settings, billing, 404, 500, blank, upgrade |     |
| 12  | **Utility** | Empty state, filter bar, bulk-action bar, search results, notifications panel |     |

### 8.2 Key block specs

**Stat card**

    <div class="flex flex-col bg-white border border-gray-200 shadow-xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
      <div class="p-4 md:p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-500">Total revenue</p>
        <div class="mt-1 flex items-center gap-x-2">
          <h3 class="text-3xl font-bold tabular-nums text-gray-800 dark:text-neutral-200">$24,500</h3>
          <span class="inline-flex items-center gap-x-1 py-0.5 px-2 rounded-full bg-teal-100 text-xs font-medium text-teal-900 dark:bg-teal-500/10 dark:text-teal-500">+12.5%</span>
        </div>
      </div>
    </div>

Grid: `grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`.

**Table**

    <div class="-m-1.5 overflow-x-auto"><div class="p-1.5 min-w-full inline-block align-middle">
      <div class="border border-gray-200 rounded-xl overflow-hidden dark:border-neutral-700">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
          <thead class="bg-gray-50 dark:bg-neutral-800">
            <tr><th scope="col" class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-800 dark:text-neutral-200">Name</th></tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
            <tr class="hover:bg-gray-100 dark:hover:bg-neutral-700/50">
              <td class="px-6 py-3 text-sm text-gray-800 dark:text-neutral-200">Value</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div></div>

Rules: sticky header optional; row actions in `hs-dropdown`; always provide an empty-state row and a loading skeleton.

**Buttons**

| Variant | Classes |
| --- | --- |
| Primary | `py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none` |
| Secondary | `... border border-gray-200 bg-white text-gray-800 shadow-xs hover:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700` |
| Ghost | `... border border-transparent text-blue-600 hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-blue-800/30` |
| Danger | `... bg-red-600 text-white hover:bg-red-700` |
| Icon | `size-9.5 inline-flex justify-center items-center rounded-lg` |

**Form input**

    <label class="block text-sm font-medium mb-2 dark:text-white">Email</label>
    <input type="email" class="py-2.5 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500
           disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400">
    <p class="mt-2 text-xs text-gray-500 dark:text-neutral-500">Helper text</p>

Error state: `border-red-500 focus:ring-red-500` + `<p class="text-xs text-red-600 mt-2">`.

**Modal**

    <button data-hs-overlay="#modal-1" class="...">Open</button>
    <div id="modal-1" class="hs-overlay hidden size-full fixed top-0 start-0 z-80 overflow-x-hidden overflow-y-auto" role="dialog" tabindex="-1">
      <div class="hs-overlay-open:opacity-100 hs-overlay-open:duration-300 opacity-0 transition-all sm:max-w-lg sm:w-full m-3 sm:mx-auto">
        <div class="flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
          <!-- header / body / footer -->
        </div>
      </div>
    </div>

**Badge**: `inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium` + status color from Section 3.

**Empty state**: centered icon `size-10 text-gray-400`, title `text-sm font-semibold`, description `text-sm text-gray-500`, one primary action.

* * *

## 9. Animation Block System

### 9.1 Principles

* Durations: **fast 150 ms** (hover, press) · **base 200–300 ms** (overlays, accordions) · **slow 500 ms** (page/section entrance)
* Easing: `ease-out` for entering, `ease-in` for leaving, `ease-in-out` for movement.
* Animate `opacity` and `transform` only; avoid layout properties.
* Always honor reduced motion:

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    }

### 9.2 Keyframes (add to `input.css`)

    @theme {
      --animate-fade-in: fade-in .3s ease-out both;
      --animate-fade-up: fade-up .5s ease-out both;
      --animate-scale-in: scale-in .2s ease-out both;
      --animate-slide-in-right: slide-in-right .3s ease-out both;
      --animate-shimmer: shimmer 1.6s infinite linear;
      --animate-pulse-soft: pulse-soft 2s ease-in-out infinite;

      @keyframes fade-in        { from { opacity: 0 } to { opacity: 1 } }
      @keyframes fade-up        { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
      @keyframes scale-in       { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: none } }
      @keyframes slide-in-right { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: none } }
      @keyframes shimmer        { from { background-position: -200% 0 } to { background-position: 200% 0 } }
      @keyframes pulse-soft     { 0%,100% { opacity: 1 } 50% { opacity: .6 } }
    }

### 9.3 Animation blocks

| Block | Classes / pattern | Use |
| --- | --- | --- |
| Page entrance | `animate-fade-up` on `<main>` content wrapper | Route load |
| Staggered cards | `animate-fade-up` + inline `style="animation-delay:calc(var(--i)*60ms)"` (`--i` = index) | KPI grids, card lists |
| Hover lift | `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md` | Clickable cards |
| Button press | `transition active:scale-[.98]` | All buttons |
| Sidebar drawer | `transition-all duration-300 transform -translate-x-full hs-overlay-open:translate-x-0` | Mobile nav |
| Modal | `opacity-0 hs-overlay-open:opacity-100 transition-all duration-300` | Overlays |
| Dropdown | `hs-dropdown-open:opacity-100 opacity-0 duration-200 transition-[opacity,margin]` | Menus |
| Accordion | `hs-accordion-content transition-[height] duration-300` | Sidebar groups, FAQ |
| Skeleton | `bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200%_100%] animate-shimmer rounded` | Loading |
| Spinner | `animate-spin size-4 border-2 border-current border-t-transparent rounded-full` | Inline loading |
| Toast | `animate-slide-in-right` (enter) / `opacity-0 transition` (exit) | Notifications |
| Counter | JS count-up on stat numbers, 800 ms ease-out, once on viewport entry | KPI cards |
| Chart draw | ApexCharts `animations: { enabled: true, speed: 600 }` | Charts |
| Progress bar | `transition-[width] duration-500 ease-out` | Progress |

Skeleton block:

    <div class="space-y-3" aria-hidden="true">
      <div class="h-4 w-1/3 rounded animate-shimmer bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200%_100%] dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700"></div>
      <div class="h-4 w-full rounded animate-shimmer bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200%_100%] dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700"></div>
    </div>

* * *

## 10. Section & Page Templates

Each page = `page header` + 1–4 sections stacked with `space-y-4 sm:space-y-6`.

| Page | Sections (top to bottom) |
| --- | --- |
| **Overview dashboard** | Page header → KPI grid (4) → Revenue chart (2/3) + Donut (1/3) → Recent orders table → Activity feed |
| **List page** (users, orders) | Page header + primary action → Filter bar → Table → Pagination |
| **Detail page** | Breadcrumb → Header (title, status badge, actions) → Tabs → Two-column (content 2/3, meta 1/3) |
| **Analytics** | Date-range filter → KPI row → Chart grid (2×2) → Top-N tables |
| **Settings** | Tabs (Profile, Account, Billing, Team, Notifications) → Form cards with section headings |
| **Auth** | Centered card `max-w-md`, logo, form, social buttons, footer links |
| **Error / blank / upgrade** | Sidebar shell + one centered message block + recovery action |

Page header block:

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-neutral-200">Page title</h1>
        <p class="text-sm text-gray-600 dark:text-neutral-400">Short description.</p>
      </div>
      <div class="flex items-center gap-2"><!-- secondary + primary buttons --></div>
    </div>

Grid recipes:

* KPI: `grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`
* Chart split: `grid lg:grid-cols-3 gap-4 sm:gap-6` (chart `lg:col-span-2`)
* Detail: `grid lg:grid-cols-3 gap-4 sm:gap-6`

* * *

## 11. Iconography & Imagery

* Icons: Lucide / Heroicons outline, `size-4` (nav, buttons), `size-5` (headers), `size-10` (empty states). `stroke="currentColor"`.
* Avatars: `size-8` / `size-9.5` / `size-12`, `rounded-full`, fallback initials on `bg-gray-100`.
* Illustrations: flat, neutral, single accent; avoid photos inside data views.

* * *

## 12. Accessibility Checklist

* [ ] Contrast ≥ 4.5:1 (text), ≥ 3:1 (UI borders, icons)
* [ ] All interactive elements reachable by Tab, visible focus ring
* [ ] Overlays: `role="dialog"`, Esc closes, focus trapped (Preline handles this)
* [ ] Icon-only buttons have `aria-label` or `sr-only` text
* [ ] Tables: `<th scope>`; status never conveyed by color alone
* [ ] Forms: every input has a `<label>`; errors tied via `aria-describedby`
* [ ] `prefers-reduced-motion` respected

* * *

## 13. Project Structure

    /src
      input.css            # Tailwind + theme + animations
      /themes/theme.css    # Preline theme tokens
    /components
      sidebar.html
      header.html
      /blocks              # stat-card, table, modal, form-*, chart-*, empty-state ...
    /pages
      dashboard.html  users.html  orders.html  analytics.html  settings.html  auth-*.html  404.html
    /assets
      /js  app.js  theme-toggle.js  charts.js
    DESIGN.md

Preline JS re-init after dynamic DOM changes: `window.HSStaticMethods.autoInit();`

* * *

## 14. Rules for AI Agents / Contributors

1. Read this file before generating any UI.
2. Reuse a block from Section 8 before writing a new one; extend, do not fork.
3. Every element ships with `dark:` classes.
4. Use only the type scale (Section 2), spacing scale (Section 4) and colors (Section 3).
5. Overlays, dropdowns, accordions, tabs, tooltips, selects, datepickers: use Preline `hs-*` plugins, never custom JS.
6. Include loading, empty and error states for every data block.
7. New animation = add to Section 9 first.
8. Keep one primary button per view region.

* * *

*Version 1.1 · Stack: Tailwind CSS v4 · Preline UI · Inter · Light/Dark*

*v1.1 — added §3.1 (status text AA correction) and §3.2 (token implementation). No existing rule removed or weakened.*
