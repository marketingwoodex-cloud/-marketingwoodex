<?php
/**
 * api/v2/routes/chrome.php — the header, the menu and the footer, across the whole site.
 *
 * Four routes, in the order a person uses them:
 *
 *   1. `GET /chrome` — what is stored, which regions the site's pages have, and the recent versions.
 *   2. `POST /chrome/preview` — *what would change*, page by page, with the before/after of the region.
 *   3. `POST /chrome` — apply it, as one batch, and answer with the batch id that undoes it.
 *   4. `POST /chrome/replace` — find and replace inside one region, with a dry run.
 *
 * The preview and the apply are the same edit through the same function, so the number on the button is
 * the number of pages that change. `apply` is the only one that writes.
 */

declare(strict_types=1);

const WX_CHROME_ROLES = ['owner', 'admin'];

/** GET /chrome — the stored header/footer, what the site has, and the version log. */
function wx_route_chrome_get(array $ctx): array
{
    wx_require_user('global_chrome', WX_CHROME_ROLES);
    /* The first reader after an upgrade should see the header the site actually has, not an empty form:
       when nothing is stored yet, the chrome is read off a real page and offered as the starting point. */
    $stored = wx_chrome_get();
    $coverage = wx_chrome_coverage();
    $guess = null;
    if ($stored['brand'] === '' || $stored['footer'] === '') {
        foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
            if (in_array($rel, WX_CHROME_SKIP, true)) {
                continue;
            }
            $spans = wx_chrome_spans((string) file_get_contents(WX_SITE_ROOT . '/' . $rel));
            if (isset($spans['brand'], $spans['footer'])) {
                $guess = [
                    'rel' => $rel,
                    'brand' => trim($spans['brand'][2]),
                    'footer' => trim($spans['footer'][2]),
                    'menuDesktop' => isset($spans['menuDesktop']) ? trim($spans['menuDesktop'][2]) : '',
                    'menuMobile' => isset($spans['menuMobile']) ? trim($spans['menuMobile'][2]) : '',
                    'style' => isset($spans['style']) ? trim($spans['style'][2]) : '',
                    'phone' => isset($spans['phone']) ? trim($spans['phone'][2]) : '',
                ];
                break;
            }
        }
    }
    return ['data' => [
        'chrome' => $stored,
        'coverage' => $coverage,
        'versions' => wx_chrome_versions_list(),
        'fromPage' => $guess,
    ]];
}

/**
 * POST /chrome/preview — the same edit, without writing.
 *
 * The body carries the regions to change; anything absent is left as it is on each page.
 */
function wx_route_chrome_preview(array $ctx): array
{
    /* Same roles as the apply, checked here because this route is not a change and so has no entry in
       the approval policy — see the note in lib/router.php. */
    wx_require_user('global_chrome', WX_CHROME_ROLES);
    $edit = wx_chrome_edit_from_body($ctx['body']);
    $diff = wx_chrome_diff($edit, ['rel' => (string) ($ctx['body']['rel'] ?? ''), 'limit' => (int) ($ctx['body']['limit'] ?? 12)]);
    return ['data' => [
        'scanned' => $diff['scanned'],
        'changed' => $diff['changed'],
        'skipped' => $diff['skipped'],
        'missing' => $diff['missing'],
        'pages' => count($diff['changed']),
        'truncated' => count($diff['changed']) >= (int) ($ctx['body']['limit'] ?? 12),
    ]];
}

/**
 * POST /chrome — save the header/footer data and apply it across the site.
 *
 * Two decisions worth stating. The data is saved even if the apply is a no-op (a person who edited the
 * footer and then found the site already matches has still changed what the editor holds). And the apply
 * returns the **batch id**: "undo this" is one call, and it is the same page-history rollback the rest of
 * the admin already uses.
 */
function wx_route_chrome_apply(array $ctx): array
{
    return wx_appr_route('global_chrome', $ctx, 'chrome', 'wx_route_chrome_apply_do', static fn() => wx_route_chrome_apply_do($ctx));
}

function wx_route_chrome_apply_do(array $ctx): array
{
    $u = wx_require_user('global_chrome', WX_CHROME_ROLES);
    $edit = wx_chrome_edit_from_body($ctx['body']);
    $note = (string) ($ctx['body']['note'] ?? '');

    return wx_guard('chrome.apply', static function () use ($edit, $u, $note, $ctx) {
        /* Only the fields this request carried are saved. Passing an absent key through as null would
           *clear* it (`wx_chrome_put` writes what it is given), so applying a footer would wipe the
           stored brand — the kind of data loss a "save" that means "replace the whole object" causes. */
        $fields = array_intersect_key($edit, array_flip(['brand', 'cta', 'footer', 'menuDesktop', 'menuMobile', 'style', 'phone']));
        $saved = wx_chrome_put($fields, $u, $note);
        $result = wx_chrome_apply($edit, $u, $note);
        return ['data' => $result + ['chrome' => $saved, 'versions' => wx_chrome_versions_list()]];
    });
}

/**
 * POST /chrome/replace — inside one region of every page, with a dry run first.
 *
 * The dry run is the default because the button that does this for real is the one that touches 150
 * files. `dry: true` walks the whole site and writes nothing.
 */
function wx_route_chrome_replace(array $ctx): array
{
    return wx_appr_route('global_replace', $ctx, 'chrome', 'wx_route_chrome_replace_do', static fn() => wx_route_chrome_replace_do($ctx));
}

function wx_route_chrome_replace_do(array $ctx): array
{
    $u = wx_require_user('global_replace', WX_CHROME_ROLES);
    $in = is_array($ctx['body']) ? $ctx['body'] : [];
    return wx_guard('chrome.replace', static fn() => ['data' => wx_chrome_replace($in, $u)]);
}

/** POST /chrome/versions/{id} — put a stored header/footer back (the pages are a separate decision). */
function wx_route_chrome_restore(array $ctx): array
{
    return wx_appr_route('chrome_save', $ctx, 'chrome', 'wx_route_chrome_restore_do', static fn() => wx_route_chrome_restore_do($ctx));
}

function wx_route_chrome_restore_do(array $ctx): array
{
    $u = wx_require_user('chrome_save', WX_CHROME_ROLES);
    $id = (int) ($ctx['params']['id'] ?? $ctx['body']['id'] ?? 0);
    return wx_guard('chrome.restore', static function () use ($id, $u) {
        $row = wx_one('SELECT * FROM wx_chrome_versions WHERE id = ?', [$id]);
        if ($row === null) {
            throw ApiError::notFound('That version is not in the log');
        }
        $data = json_decode((string) $row['data'], true);
        if (!is_array($data)) {
            throw ApiError::conflict('That version cannot be read');
        }
        $saved = wx_chrome_put($data, $u, 'restored version ' . (int) $row['version']);
        /* Deliberately not applied to the pages: restoring what the editor *holds* and pushing it to 150
           files are two decisions, and this route only does the first. The screen offers the second as
           the Apply button it already has. `restored` is the version that was put back — not the new
           counter value, which is a different number and would make the screen's sentence wrong. */
        return ['data' => [
            'chrome' => $saved,
            'restored' => (int) $row['version'],
            'applied' => false,
            'hint' => 'Press Apply to write this across the site.',
            'versions' => wx_chrome_versions_list(),
        ]];
    });
}

/**
 * Read the edit out of a request body, refusing anything that could run in a browser.
 *
 * Only the keys present are returned, and `null` means "leave this region alone" — which is why an empty
 * string and an absent key are different things: `"cta": ""` is an editor clearing the button text, and
 * the transformations treat an empty string as "nothing to write here".
 */
function wx_chrome_edit_from_body(array $body): array
{
    $edit = [];
    $regions = $body['regions'] ?? null;
    $edit['regions'] = is_array($regions) && $regions
        ? array_values(array_intersect($regions, WX_CHROME_REGIONS))
        : WX_CHROME_REGIONS;
    if (!$edit['regions']) {
        throw ApiError::validation('Choose at least one part of the page to change', 'regions');
    }

    foreach (['brand', 'cta', 'footer', 'menuDesktop', 'menuMobile', 'style', 'phone'] as $key) {
        if (!array_key_exists($key, $body)) {
            continue;
        }
        $v = trim((string) $body[$key]);
        wx_chrome_no_scripts($v, $key);
        $edit[$key] = $v;
    }

    if (isset($edit['brand']) && $edit['brand'] !== '' && !preg_match('~^<a class="brand"[^>]*>.*</a>$~s', $edit['brand'])) {
        throw ApiError::validation('The brand must be a single <a class="brand">…</a>', 'brand');
    }
    if (isset($edit['footer']) && $edit['footer'] !== '' && !preg_match('~^<footer class="footer">.*</footer>$~s', $edit['footer'])) {
        throw ApiError::validation('The footer must be a single <footer class="footer">…</footer>', 'footer');
    }
    foreach (['menuDesktop' => '<nav class="desktop-nav"', 'menuMobile' => '<nav class="mobile-panel"'] as $key => $shape) {
        if (isset($edit[$key]) && $edit[$key] !== '' && !preg_match('~^' . preg_quote($shape, '~') . '[^>]*>.*</nav>$~s', $edit[$key])) {
            throw ApiError::validation('The menu must be a single ' . $shape . '…</nav>', $key);
        }
    }
    if (isset($edit['cta']) && mb_strlen($edit['cta']) > 40) {
        throw ApiError::validation('Button text is too long (40 characters)', 'cta');
    }
    if (isset($edit['style']) && $edit['style'] !== '') {
        if (!preg_match('~^<style id="wx-chrome-style" data-cfg="[^"<>]*">[^<]*</style>$~s', $edit['style'])) {
            throw ApiError::validation('The design block must be the single <style id="wx-chrome-style"> element', 'style');
        }
        if (preg_match('~@import|expression\s*\(|url\s*\(~i', $edit['style'])) {
            throw ApiError::validation('The design block cannot load external resources', 'style');
        }
    }
    if (isset($edit['phone']) && $edit['phone'] !== '') {
        if (!preg_match('~^<a class="wx-hphone" href="tel:[0-9+]{4,20}">.*</a>$~s', $edit['phone'])) {
            throw ApiError::validation('The phone must be <a class="wx-hphone" href="tel:…">…</a>', 'phone');
        }
    }
    if (array_key_exists('introAll', $body)) {
        $edit['introAll'] = (bool) $body['introAll'];
    }
    return $edit;
}
