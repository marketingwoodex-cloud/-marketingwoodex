# Phase 15 — What changed

## Speed (mobile PageSpeed 61–62 → 91–97, desktop 98–99)
- Images converted to WebP; phone-size copies (480 / 960 px) with `srcset` on all ~600 images.
  Originals kept in `assets/img/_orig/`.
- Hero: first slide loads first, other slides lazy-load.
- Each page carries only the CSS it needs inline; the big stylesheet loads in the background.
- Correct font preloaded (Plus Jakarta Sans) + the headline font weight → no page jump while loading.
- Builder save keeps this fast loading.

## Mobile layout (all 87 pages)
- Hero / call-to-action buttons stack full width on phones (no broken text).
- No sideways scrolling on small phones (320 px) up to tablets.
- Home slider dots + arrows fit; text at least 12 px; bigger tap targets.

## Accessibility 84–88 → 97–100
- Readable colour contrast on grey labels and small text.
- Menu button works with keyboard (Enter / Space) and screen readers.
- Clearer link text (“Learn more about …”), correct heading order.

## Admin
- **New: Admin → Speed** — Google PageSpeed for mobile + desktop per page: scores, loading times,
  top 5 suggestions in plain English, history, and “Test key pages” for 11 main pages.
- **New: Reconnect database** screen — if the database login stops working, enter new Hostinger database
  details on the admin login page (protected by the page-builder password). Existing data is kept.

## Files
Full site. Server data in `_private/` is not included and is not touched.
