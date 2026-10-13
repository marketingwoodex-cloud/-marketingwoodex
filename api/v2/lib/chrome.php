<?php
/**
 * api/v2/lib/chrome.php — the header, the menu and the footer, applied across every page at once.
 *
 * This is the second half of the Phase 3 gate. The plan's sentence is *"an editor changes the header
 * across 150 pages, and rolls the change back from page history"* — and everything that makes the second
 * clause true already exists: `wx_page_write_many()` writes a whole change under one batch id, and
 * `wx_page_rollback_batch()` undoes exactly that change.
 *
 * So the work here is (a) getting the *edit* right on a site where every page is its own file, and
 * (b) never writing a page except through the versioned writer.
 *
 * **What "getting the edit right" means.** These pages are not generated from a template; each one is a
 * finished HTML document with a header, a menu and a footer that are *nearly* the same. Applying one
 * header to all of them means replacing a region while keeping what is genuinely per-page:
 *
 *   · the current page's own link gets `aria-current="page"` (v2.1 did this, and without it the menu
 *     highlights nothing and the site feels broken);
 *   · the home page's brand keeps `aria-current="page"`;
 *   · the mobile menu keeps this page's "Get a quote" target, because that button points somewhere
 *     different on a service page than on the blog;
 *   · the footer keeps this page's own section anchors (`footer-process`, `footer-services`,
 *     `footer-faq`) and, unless the editor asked otherwise, this page's own `footer-intro` — the
 *     sentence that says what *this* page is about;
 *   · a footer link written as `/#page-contact` becomes `#page-contact` on the pages that actually have
 *     that section, because a link to the home page's contact form from the contact page is a link that
 *     scrolls nobody anywhere.
 *
 * **Everything is a preview first.** `wx_chrome_preview()` walks the site and returns which pages would
 * change and the region before/after, without writing anything; `wx_chrome_apply()` does the same walk
 * and writes. Same function, one flag apart — so what the screen showed is what gets written, which is
 * the property a "148 pages will change" button has to have.
 *
 * **Nothing is written unless it changed.** A page whose region already matches is left alone; the
 * result says how many were scanned, changed and skipped, because "nothing happened" and "I could not
 * find the header" look identical otherwise.
 */

declare(strict_types=1);

/** The regions of a page this file knows how to replace. */
const WX_CHROME_REGIONS = ['brand', 'cta', 'menu', 'footer', 'design'];

/** The pages whose header/footer is deliberately different: 404 has disabled links. */
const WX_CHROME_SKIP = ['404.html'];

/** Keep this many versions of the chrome *data* (not the pages — pages have their own history). */
const WX_CHROME_KEEP = 10;

/**
 * The stored chrome — what the editor last saved, ready to be applied.
 *
 * It lives in `wx_settings` rather than in a page, because it is the *source*: the pages on disk are the
 * result of applying it. Reading it back from a page would make the last hand-edit the truth and the
 * screen would slowly drift from the site.
 */
function wx_chrome_get(): array
{
    return [
        'brand' => (string) wx_setting('chrome.brand', ''),
        'cta' => (string) wx_setting('chrome.cta', ''),
        'footer' => (string) wx_setting('chrome.footer', ''),
        'menuDesktop' => (string) wx_setting('chrome.menu.desktop', ''),
        'menuMobile' => (string) wx_setting('chrome.menu.mobile', ''),
        'style' => (string) wx_setting('chrome.style', ''),
        'phone' => (string) wx_setting('chrome.phone', ''),
        'version' => (int) wx_setting('chrome.version', '0'),
        'updatedAt' => (string) wx_setting('chrome.updated_at', ''),
        'updatedBy' => (string) wx_setting('chrome.updated_by', ''),
    ];
}

/** Save the chrome data and keep a version of the shape it had before. */
function wx_chrome_put(array $data, array $me, string $note = ''): array
{
    foreach ([
        'brand' => 60000, 'cta' => 60, 'footer' => 200000,
        'menuDesktop' => 60000, 'menuMobile' => 60000, 'style' => 20000, 'phone' => 1000,
    ] as $key => $max) {
        if (!array_key_exists($key, $data)) {
            continue;
        }
        $v = (string) $data[$key];
        if (strlen($v) > $max) {
            throw ApiError::validation('The ' . $key . ' is too large (limit ' . $max . ' characters)', $key);
        }
        wx_setting_set('chrome.' . strtolower(preg_replace('~[A-Z]~', static fn($m) => '.' . strtolower($m[0]), $key)), $v);
    }
    $version = (int) wx_setting('chrome.version', '0') + 1;
    wx_setting_set('chrome.version', (string) $version);
    wx_setting_set('chrome.updated_at', wx_now());
    wx_setting_set('chrome.updated_by', (string) $me['name']);
    wx_chrome_version_keep($version, $data, $me, $note);
    wx_audit($me, 'chrome.save', 'v' . $version, ['note' => $note]);
    return wx_chrome_get() + ['savedVersion' => $version];
}

function wx_chrome_version_keep(int $version, array $data, array $me, string $note): void
{
    wx_insert('wx_chrome_versions', [
        'version' => $version,
        'data' => json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'note' => mb_substr(trim($note), 0, 200) ?: null,
        'created_at' => wx_now(),
        'created_by' => (int) $me['id'],
        'created_by_name' => (string) $me['name'],
    ]);
    foreach (array_slice(array_column(wx_all('SELECT id FROM wx_chrome_versions ORDER BY id DESC'), 'id'), WX_CHROME_KEEP) as $id) {
        wx_q('DELETE FROM wx_chrome_versions WHERE id = ?', [(int) $id]);
    }
}

/** The versions of the chrome data, newest first. */
function wx_chrome_versions_list(int $limit = 20): array
{
    $out = [];
    foreach (wx_all('SELECT id, version, note, created_at, created_by_name FROM wx_chrome_versions ORDER BY id DESC LIMIT ' . max(1, min(50, $limit))) as $r) {
        $out[] = [
            'id' => (int) $r['id'],
            'version' => (int) $r['version'],
            'note' => (string) ($r['note'] ?? ''),
            'at' => (string) $r['created_at'],
            'by' => (string) ($r['created_by_name'] ?? ''),
        ];
    }
    return $out;
}

/* ------------------------------------------------------------------ the edit itself
   The five transformations below are pure: page HTML in, page HTML out. No database, no filesystem, so
   the per-page rules above are unit-testable — they are the part of this feature that is easy to get
   subtly wrong on one page out of a hundred and never notice.
*/

/** The header/footer region spans of a page, addressed by the region names this file uses. */
function wx_chrome_spans(string $html): array
{
    $pats = [
        'menuDesktop' => '~<nav class="desktop-nav".*?</nav>~s',
        'menuMobile' => '~<nav class="mobile-panel".*?</nav>~s',
        'brand' => '~<a class="brand"[^>]*>.*?</a>~s',
        'footer' => '~<footer class="footer">.*?</footer>~s',
        'style' => '~\s*<style id="wx-chrome-style"[^>]*>.*?</style>~s',
        'phone' => '~<a class="wx-hphone"[^>]*>.*?</a>~s',
    ];
    $spans = [];
    foreach ($pats as $k => $re) {
        if (preg_match($re, $html, $m, PREG_OFFSET_CAPTURE)) {
            $spans[$k] = [$m[0][1], strlen($m[0][0]), $m[0][0]];
        }
    }
    return $spans;
}

/** `about/index.html` → `/about/`, the address the page is served at. */
function wx_page_url(string $rel): string
{
    return '/' . (string) preg_replace('~index\.html$~', '', $rel);
}

/**
 * One page's brand, with the home page marked as the current page.
 *
 * The home page's brand is a link to the homepage that you are already on, so it carries
 * `aria-current="page"` — that is what v2.1 did, and it is also the reason the brand cannot simply be
 * pasted into all 150 pages.
 */
function wx_chrome_brand(string $brand, string $rel): ?string
{
    if ($brand === '') {
        return null;
    }
    if (!preg_match('~^<a class="brand"[^>]*>.*</a>$~s', trim($brand))) {
        throw ApiError::validation('The brand must be a single <a class="brand">…</a>', 'brand');
    }
    return wx_page_url($rel) === '/'
        ? (string) preg_replace('~^<a class="brand"~', '<a class="brand" aria-current="page"', $brand, 1)
        : $brand;
}

/** One page's footer: this page's own anchors and intro survive, and stray `/#section` links are fixed. */
function wx_chrome_footer(string $footer, string $html, string $old, bool $keepIntro): string
{
    if ($footer === '') {
        return $old;
    }
    /* The section links a page owns: the process list, the services list, the FAQ. They point at
       anchors *on this page*, so the shared footer carries the page's own targets. */
    foreach (['footer-process', 'footer-services', 'footer-faq'] as $id) {
        if (preg_match('~<a id="' . $id . '" href="([^"]*)"~', $old, $m)) {
            $footer = (string) preg_replace('~(<a id="' . $id . '" href=")[^"]*"~', '${1}' . $m[1] . '"', $footer, 1);
        }
    }
    if ($keepIntro && preg_match('~<div class="footer-intro">.*?</div>(?=\s*<nav)~s', $old, $intro)) {
        $footer = (string) preg_replace_callback('~<div class="footer-intro">.*?</div>(?=\s*<nav)~s', static fn() => $intro[0], $footer, 1);
    }
    /* A footer link to `/#page-contact` sends a visitor on the contact page back to the home page to
       find the contact form they are already looking at. */
    return (string) preg_replace_callback(
        '~(id="footer-cta" href=")/#([a-z0-9-]+)"~',
        static fn($m) => str_contains($html, 'id="' . $m[2] . '"') ? $m[1] . '#' . $m[2] . '"' : $m[0],
        $footer
    );
}

/** One page's desktop menu, with this page's link marked current. */
function wx_chrome_menu(string $menu, string $rel, string $html): string
{
    if ($menu === '') {
        return $html;
    }
    $url = wx_page_url($rel);
    $done = false;
    return (string) preg_replace_callback(
        '~<nav class="desktop-nav".*?</nav>~s',
        static function () use ($menu, $url, &$done) {
            if ($done) {
                return $menu;
            }
            $done = true;
            return (string) preg_replace_callback(
                '~<a\b([^>]*\bhref="' . preg_quote($url, '~') . '")~',
                static function ($m) use (&$done) {
                    if (!$done) {
                        return $m[0];
                    }
                    return '<a' . $m[1] . ' aria-current="page"';
                },
                $menu
            );
        },
        $html
    );
}

/** One page's mobile menu, keeping this page's own "Get a quote" target. */
function wx_chrome_menu_mobile(string $menu, string $html): string
{
    if ($menu === '' || !preg_match('~<nav class="mobile-panel".*?</nav>~s', $html)) {
        return $html;
    }
    if (preg_match('~<a class="mobile-primary" href="([^"]*)"~', $html, $cta)) {
        $menu = (string) preg_replace_callback(
            '~(<a class="mobile-primary" href=")[^"]*"~',
            static fn($m) => $m[1] . $cta[1] . '"',
            $menu,
            1
        );
    }
    return (string) preg_replace('~<nav class="mobile-panel".*?</nav>~s', $menu, $html, 1);
}

/**
 * Apply a whole set of regions to one page's HTML, returning null when nothing changed.
 *
 * The order matters and mirrors the document: the style goes into `<head>`, the phone sits immediately
 * before the header's call-to-action button, then the brand, the two menus and the footer.
 *
 * @param array{regions?:string[], brand?:string, cta?:string, footer?:string, menuDesktop?:string, menuMobile?:string, style?:string, phone?:string, introAll?:bool} $edit
 */
function wx_chrome_apply_html(string $rel, string $html, array $edit): ?string
{
    $regions = $edit['regions'] ?? WX_CHROME_REGIONS;
    $out = $html;

    if (in_array('design', $regions, true)) {
        $style = isset($edit['style']) ? (string) $edit['style'] : null;
        if ($style !== null) {
            /* The style element is rewritten, not added: it owns the whitespace on both sides of itself
               and the `<`-side of `</head>`, so applying the same design twice produces the same page.
               (It did not, in the first draft: the removal ate the newline before the element and the
               insertion added one after the previous one, so every apply grew the head by a line. A
               preview that says "148 pages change" has to be right the second time too.) */
            $out = (string) preg_replace('~\s*<style id="wx-chrome-style"[^>]*>.*?</style>\s*~s', '', $out, 1);
            if ($style !== '') {
                $out = (string) preg_replace('~\s*</head>~i', "\n" . $style . "\n</head>", $out, 1);
            }
        }
        $phone = isset($edit['phone']) ? (string) $edit['phone'] : null;
        if ($phone !== null) {
            $out = (string) preg_replace('~<a class="wx-hphone"[^>]*>.*?</a>~s', '', $out);
            if ($phone !== '') {
                $out = (string) preg_replace_callback('~<a class="header-cta"~', static fn($m) => $phone . $m[0], $out, 1);
            }
        }
    }

    if (in_array('brand', $regions, true) && isset($edit['brand'])) {
        $brand = wx_chrome_brand((string) $edit['brand'], $rel);
        if ($brand !== null) {
            $out = (string) preg_replace_callback('~<a class="brand"[^>]*>.*?</a>~s', static fn() => $brand, $out, 1);
        }
    }

    if (in_array('cta', $regions, true) && !empty($edit['cta'])) {
        $label = htmlspecialchars((string) $edit['cta'], ENT_QUOTES);
        $out = (string) preg_replace_callback(
            '~(<a class="header-cta"[^>]*>\s*<span class="header-cta-label">).*?(</span>)~s',
            static fn($m) => $m[1] . $label . $m[2],
            $out,
            1
        );
    }

    if (in_array('menu', $regions, true) && !empty($edit['menuDesktop'])) {
        $out = wx_chrome_menu((string) $edit['menuDesktop'], $rel, $out);
    }
    if (in_array('menu', $regions, true) && !empty($edit['menuMobile'])) {
        $out = wx_chrome_menu_mobile((string) $edit['menuMobile'], $out);
    }

    if (in_array('footer', $regions, true) && !empty($edit['footer'])) {
        $spans = wx_chrome_spans($html);
        if (isset($spans['footer'])) {
            /* `introAll` is the *exception*: by default each page keeps its own intro sentence, and the
               switch says "no, use the shared one everywhere". Passing the flag straight through
               inverted the rule and did the opposite (the test caught it — 'the page keeps its own
               footer intro by default' failed while the introAll case also failed, both from one
               polarity). */
            $keepIntro = empty($edit['introAll']);
            $f = wx_chrome_footer((string) $edit['footer'], $html, $spans['footer'][2], $keepIntro);
            $out = (string) preg_replace_callback('~<footer class="footer">.*?</footer>~s', static fn() => $f, $out, 1);
        }
    }

    return $out === $html ? null : $out;
}

/**
 * Walk the site and work out what applying this edit would change — for every page, or for the pages the
 * caller named.
 *
 * @param array{regions?:string[], html?:string, rel?:string, limit?:int} $opt
 * @return array{scanned:int, changed:array<int,array{rel:string, url:string, bytes:int, before:string, after:string}>, skipped:int, missing:array<string,int>}
 */
function wx_chrome_diff(array $edit, array $opt = []): array
{
    $only = isset($opt['rel']) && $opt['rel'] !== '' ? [wx_page_rel((string) $opt['rel'])] : null;
    $limit = max(1, min(400, (int) ($opt['limit'] ?? 400)));
    $pages = $only ?? array_values(array_filter(wx_page_walk(WX_SITE_ROOT), static fn($r) => !in_array($r, WX_CHROME_SKIP, true)));
    $changed = [];
    $skipped = 0;
    $missing = [];
    $scanned = 0;

    foreach ($pages as $rel) {
        if (count($changed) >= $limit) {
            break;
        }
        if (!is_file(WX_SITE_ROOT . '/' . $rel)) {
            $missing[] = $rel;
            continue;
        }
        $scanned++;
        $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
        $next = wx_chrome_apply_html($rel, $html, $edit);
        if ($next === null) {
            $skipped++;
            continue;
        }
        /* The preview carries the two regions' fragments, not the whole page: a 150-page preview must not
           be a 12 MB response, and the interesting part is what the header now says. */
        $changed[] = [
            'rel' => $rel,
            'url' => wx_page_url($rel),
            'bytes' => strlen($html) . ' → ' . strlen($next),
            'before' => wx_chrome_region_of($html),
            'after' => wx_chrome_region_of($next),
        ];
    }
    return ['scanned' => $scanned, 'changed' => $changed, 'skipped' => $skipped, 'missing' => $missing];
}

/** The header/footer fragments of a page, for a preview that shows words rather than bytes. */
function wx_chrome_region_of(string $html): array
{
    $spans = wx_chrome_spans($html);
    $out = [];
    foreach (['brand', 'cta', 'menuDesktop', 'footer'] as $k) {
        if (!isset($spans[$k])) {
            continue;
        }
        $frag = trim($spans[$k][2]);
        $out[$k] = mb_substr((string) preg_replace('~\s+~', ' ', $frag), 0, 180)
            . (mb_strlen($frag) > 180 ? '…' : '');
    }
    $out['ctaLabel'] = preg_match('~<span class="header-cta-label">(.*?)</span>~s', $spans['brand'][2] ?? '') ? '' : '';
    if (preg_match('~<span class="header-cta-label">(.*?)</span>~s', $html, $m)) {
        $out['ctaLabel'] = trim((string) preg_replace('~\s+~', ' ', $m[1]));
    }
    return $out;
}

/**
 * Apply the edit across the site, as one batch.
 *
 * The batch id is returned so the screen can offer "undo this change", and it is the same mechanism the
 * page history screen already has — nothing new to learn, and the undo restores exactly the pages this
 * call wrote.
 *
 * @return array{batch:string, scanned:int, changed:array<int,string>, skipped:int, missing:array<string,int>, pages:int, version:?int}
 */
function wx_chrome_apply(array $edit, array $me, string $note = ''): array
{
    $diff = wx_chrome_diff($edit);
    $editForWrite = $edit;
    unset($editForWrite['regions']);
    $editForWrite['regions'] = $edit['regions'] ?? WX_CHROME_REGIONS;

    $result = wx_page_write_many(
        array_column($diff['changed'], 'rel'),
        static function (string $rel, string $html) use ($editForWrite): ?string {
            /* The same function the preview used, called on the file as it is at write time: a page that
               changed between the preview and the apply gets the current content, not the batched one. */
            return wx_chrome_apply_html($rel, $html, $editForWrite);
        },
        $me,
        $note !== '' ? $note : 'header/footer updated'
    );

    return [
        'batch' => $result['batch'],
        'scanned' => $diff['scanned'],
        'changed' => $result['changed'],
        'skipped' => $diff['skipped'] + $result['skipped'],
        'missing' => $diff['missing'],
        'pages' => count($result['changed']),
        'note' => $note,
    ];
}

/**
 * Find and replace inside one region of every page — the editor's "we changed our phone number and it is
 * in the footer of every page" tool.
 *
 * Scoped, because a site-wide find/replace over whole pages is how you rename a CSS class and break the
 * layout: the person chooses header, mobile menu or footer, and only that region is touched. `dry` is
 * the default in spirit — the caller asks first and is told exactly what would change.
 *
 * @param array{find?:string, replace?:string, scope?:string[], dry?:bool, limit?:int} $in
 * @return array{pages:array<int,array{rel:string,count:int}>, total:int, dry:bool, batch:?string, scanned:int}
 */
function wx_chrome_replace(array $in, array $me): array
{
    $find = (string) ($in['find'] ?? '');
    $replace = (string) ($in['replace'] ?? '');
    $dry = !empty($in['dry']);
    $scope = array_values(array_intersect((array) ($in['scope'] ?? []), ['header', 'mobile', 'footer']));
    if (mb_strlen($find) < 2) {
        throw ApiError::validation('Type at least two characters to find', 'find');
    }
    if (!$scope) {
        throw ApiError::validation('Choose where to search: header, mobile or footer', 'scope');
    }
    wx_chrome_no_scripts($replace, 'replace');

    /* The spans have to be recomputed for each replacement, because replacing inside a region moves the
       offsets of the regions after it. Back to front, so earlier offsets stay valid. */
    $pats = [
        'header' => '~<header class="site-header".*?</header>~s',
        'mobile' => '~<nav class="mobile-panel".*?</nav>~s',
        'footer' => '~<footer class="footer">.*?</footer>~s',
    ];

    $pages = [];
    $total = 0;
    $scanned = 0;

    $walk = static function (string $html) use ($pats, $scope, $find, $replace, &$count): string {
        $spans = [];
        foreach ($scope as $k) {
            if (preg_match($pats[$k], $html, $m, PREG_OFFSET_CAPTURE)) {
                $spans[] = [$m[0][1], strlen($m[0][0])];
            }
        }
        usort($spans, static fn($a, $b) => $b[0] <=> $a[0]);
        foreach ($spans as [$off, $len]) {
            $part = substr($html, $off, $len);
            $c = substr_count($part, $find);
            if ($c) {
                $count += $c;
                $html = substr_replace($html, str_replace($find, $replace, $part), $off, $len);
            }
        }
        return $html;
    };

    $limit = max(1, min(400, (int) ($in['limit'] ?? 400)));
    foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
        $scanned++;
        $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
        $count = 0;
        $next = $walk($html, $count);
        if ($count === 0) {
            continue;
        }
        $pages[] = ['rel' => $rel, 'count' => $count];
        $total += $count;
        if (count($pages) >= $limit) {
            break;
        }
        if (!$dry) {
            wx_page_write($rel, $next, $me, ['note' => 'replace in ' . implode('/', $scope) . ': “' . mb_substr($find, 0, 40) . '”']);
        }
    }

    if (!$dry && $total === 0) {
        return ['pages' => [], 'total' => 0, 'dry' => false, 'batch' => null, 'scanned' => $scanned];
    }

    $batch = null;
    if (!$dry) {
        $batch = wx_uuid();
        /* The page writes above each opened their own batch, which would make "undo this replace" a
           hundred undos. Re-stamp them into one batch so the history screen shows one change. */
        $rels = array_column($pages, 'rel');
        if ($rels) {
            $inList = implode(',', array_fill(0, count($rels), '?'));
            wx_q(
                'UPDATE wx_page_versions SET batch = ?, note = ? WHERE batch IN (SELECT b FROM (SELECT DISTINCT batch b FROM wx_page_versions WHERE rel IN (' . $inList . ') AND note LIKE ?) t)',
                array_merge([$batch, 'replace in ' . implode('/', $scope) . ': “' . mb_substr($find, 0, 160) . '”'], $rels, ['replace in ' . implode('/', $scope) . '%'])
            );
        }
        wx_audit($me, 'chrome.replace', '"' . mb_substr($find, 0, 60) . '" → "' . mb_substr($replace, 0, 60) . '"', [
            'pages' => count($pages),
            'total' => $total,
            'scope' => $scope,
            'batch' => $batch,
        ]);
    }

    return ['pages' => $pages, 'total' => $total, 'dry' => $dry, 'batch' => $batch, 'scanned' => $scanned];
}

/** Refuse scripts and handlers in anything that will be written into a page. One rule, one place. */
function wx_chrome_no_scripts(string $html, string $field): void
{
    if (preg_match('~<script|\son[a-z]+\s*=|javascript:~i', $html)) {
        throw ApiError::validation('Scripts are not allowed in the ' . $field, $field);
    }
}

/**
 * How many pages each region appears in — the number the screen shows before anybody clicks Apply.
 *
 * It is the honest answer to "how many pages will this change", and it is measured rather than assumed:
 * a page without a `<footer class="footer">` is a page the footer edit cannot reach, and saying
 * "150 pages" when 12 of them have no footer is how a change appears to have worked when it did not.
 */
function wx_chrome_coverage(): array
{
    $counts = ['brand' => 0, 'cta' => 0, 'menuDesktop' => 0, 'menuMobile' => 0, 'footer' => 0, 'style' => 0, 'phone' => 0];
    $pages = 0;
    $skipped = 0;
    foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
        if (in_array($rel, WX_CHROME_SKIP, true)) {
            $skipped++;
            continue;
        }
        $pages++;
        $spans = wx_chrome_spans((string) file_get_contents(WX_SITE_ROOT . '/' . $rel));
        foreach (array_keys($counts) as $k) {
            if (isset($spans[$k])) {
                $counts[$k]++;
            }
        }
    }
    return ['pages' => $pages, 'skipped' => $skipped, 'regions' => $counts];
}
