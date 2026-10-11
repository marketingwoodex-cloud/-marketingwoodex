# SEO and Content Audit (technical, static)

## Scope and method
Static check of robots, sitemap, metadata presence, and image sizes across the pro tree, via `site_static_audit.py`. **No crawl of a live site, no search-performance data, no ranking claims.** Content claims (awards, client names, metrics) were not reviewed.

## Summary and risk
Low. Basics are present. Gaps are metadata on utility pages and a few oversized images.

## Controls verified (positive)
- `robots.txt` present (SEO-01). STATIC.
- `sitemap.xml` present (SEO-01). STATIC.

## Findings
### SEO-02 — Missing meta descriptions and Open Graph tags on utility and content pages (Low)
- **No meta description (3):** `blocks.html`, `coming-soon.html`, `downloads.html`.
- **No Open Graph (6):** `404.html`, `500.html`, `503.html`, `blocks.html`, `coming-soon.html`, `downloads.html`.
- **Evidence:** STATIC E2 (site static audit output).
- **Fix:** add descriptions and OG tags. Do not invent claims. Owner content review required.
- **Note:** `downloads.html` also contains the sign-in hint (SEC-002); remove that first.

### PERF-01 — Image size (Medium, performance)
Two images at 623 KB (`assets/img/img-469cf01b2548.jpg` and `assets/img/_orig/img-469cf01b2548.jpg`). Resize and compress for web; keep the original out of the public path.

### WC-04 — Missing referenced assets (Medium)
`/assets/panoramas/dha6-luxury-living-360.jpg`, `/assets/img/qr-placeholder.png`, `/assets/images/` absent in the tree (reverify PASS). Broken images on the admin screens and any page that references them.

## Checks passed
- Robots and sitemap present.

## Checks not run / blocked
- Crawl status codes, redirect chains, canonicals, duplicate titles across the whole site (**not run**).
- Structured data validation (**not run**).
- Internal link graph and orphan pages (**not run**).
- Search performance and rankings (**BLOCKED**: no external search data access; none claimed).
- Mobile rendering (**not run**).
