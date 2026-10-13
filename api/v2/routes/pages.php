<?php
/**
 * api/v2/routes/pages.php — the pages themselves, and their history.
 *
 * This is the smallest thing that makes the Phase 3 gate possible: *an editor publishes an article,
 * changes the header across 150 pages, and rolls the change back from page history.* The header/footer
 * editor, the section library and the article builder all sit on top of these six routes, and none of
 * them is allowed to write a page any other way.
 *
 * The routes have no entry in the v2.1 alias table, because v2.1 had no pages API — it wrote HTML from
 * whichever screen needed to and kept a copy. `action` is null for that reason and the permission check
 * is by role, which is the honest description of what is new here.
 */

declare(strict_types=1);

const WX_PAGES_EDIT = ['owner', 'admin', 'editor'];

/** GET /pages — the site's content pages, with the history counts and anything stale on disk. */
function wx_route_pages_list(array $ctx): array
{
    wx_require_user(null, WX_PAGES_EDIT);
    $r = wx_page_list(!empty($ctx['query']['reindex']));
    $folders = [];
    foreach ($r['pages'] as $p) {
        $f = $p['folder'];
        $folders[$f === '' ? '(root)' : $f] = ($folders[$f === '' ? '(root)' : $f] ?? 0) + 1;
    }
    ksort($folders);
    return ['data' => [
        'pages' => $r['pages'],
        'missing' => $r['missing'],
        'folders' => $folders,
        'count' => count($r['pages']),
        'stale' => count(array_filter($r['pages'], static fn($p) => $p['stale'])),
    ]];
}

/** GET /pages/history — every change, newest first; `?batch=` narrows it to one change. */
function wx_route_pages_changes(array $ctx): array
{
    wx_require_user(null, WX_PAGES_EDIT);
    $batch = trim((string) ($ctx['query']['batch'] ?? ''));
    if ($batch !== '') {
        $rows = [];
        foreach (wx_all('SELECT id, rel, bytes, note, batch, created_at, created_by_name FROM wx_page_versions WHERE batch = ? ORDER BY rel', [$batch]) as $r) {
            $rows[] = ['id' => (int) $r['id'], 'rel' => (string) $r['rel'], 'bytes' => (int) $r['bytes'], 'note' => (string) ($r['note'] ?? ''), 'at' => (string) $r['created_at'], 'by' => (string) ($r['created_by_name'] ?? '')];
        }
        if (!$rows) {
            throw ApiError::notFound('That change is not in the history');
        }
        return ['data' => ['batch' => $batch, 'files' => $rows, 'count' => count($rows)]];
    }
    /* Grouped by default: a change that rewrote 148 pages is one entry, because that is what the person
       did. `?flat=1` returns the rows, one per file, for anyone who wants the detail. */
    if (!empty($ctx['query']['flat'])) {
        return ['data' => ['changes' => wx_page_changes((int) ($ctx['query']['limit'] ?? 100)), 'grouped' => false]];
    }
    return ['data' => ['changes' => wx_page_changes_grouped((int) ($ctx['query']['limit'] ?? 40)), 'grouped' => true]];
}

/** GET /pages/{rel} — one page's HTML, or one version of it (`?version=`). */
function wx_route_pages_get(array $ctx): array
{
    wx_require_user(null, WX_PAGES_EDIT);
    $rel = (string) ($ctx['params']['rel'] ?? '');
    $version = isset($ctx['query']['version']) ? (int) $ctx['query']['version'] : null;
    $page = wx_page_get($rel, $version);
    $data = [
        'rel' => $page['rel'],
        'html' => $page['html'],
        'bytes' => strlen((string) $page['html']),
        'version' => $page['version'],
        'versions' => $version === null ? wx_page_history($page['rel'], 20) : [],
        'fresh' => $version === null ? (bool) ($page['sha'] ?? '') : false,
    ];
    if ($version === null) {
        $row = wx_one('SELECT * FROM wx_pages WHERE rel = ?', [$page['rel']]);
        $data['index'] = $row === null ? null : [
            'title' => (string) ($row['title'] ?? ''),
            'bytes' => (int) $row['bytes'],
            'updatedAt' => $row['updated_at'],
            'updatedBy' => $row['updated_by_name'],
        ];
        $data['mtime'] = is_file(WX_SITE_ROOT . '/' . $page['rel']) ? gmdate('Y-m-d H:i:s', (int) filemtime(WX_SITE_ROOT . '/' . $page['rel'])) : null;
    }
    return ['data' => $data];
}

/**
 * POST /pages — write one page.
 *
 * The body carries the whole page; the API does not trust it as a fragment. A page that arrives without
 * `<!doctype html>` is a page somebody is about to publish broken, so it is refused before the file is
 * touched. This is the "publish an article" path.
 */
function wx_route_pages_write(array $ctx): array
{
    return wx_appr_route('page_write', $ctx, 'pages', 'wx_route_pages_write_do', static fn() => wx_route_pages_write_do($ctx));
}

function wx_route_pages_write_do(array $ctx): array
{
    $u = wx_require_user(null, WX_PAGES_EDIT);
    $rel = (string) ($ctx['body']['rel'] ?? '');
    $html = (string) ($ctx['body']['html'] ?? '');
    if ($html === '') {
        throw ApiError::validation('The page is empty', 'html');
    }
    if (!preg_match('~^\s*(<!doctype html|<html)~i', $html)) {
        throw ApiError::validation('A page must be a complete HTML document (from <!doctype html>)', 'html');
    }
    return wx_guard('page.write', static function () use ($rel, $html, $u, $ctx) {
        $title = isset($ctx['body']['title']) ? (string) $ctx['body']['title'] : wx_page_title_of($html);
        $r = wx_page_write($rel, $html, $u, ['note' => (string) ($ctx['body']['note'] ?? 'edit'), 'title' => $title]);
        return ['data' => $r + ['title' => $title]];
    });
}

/** POST /pages/{rel}/restore — put one version back (the restore is itself a version). */
function wx_route_pages_restore(array $ctx): array
{
    return wx_appr_route('page_restore', $ctx, 'pages', 'wx_route_pages_restore_do', static fn() => wx_route_pages_restore_do($ctx));
}

function wx_route_pages_restore_do(array $ctx): array
{
    $u = wx_require_user(null, WX_PAGES_EDIT);
    $id = (int) ($ctx['body']['version'] ?? $ctx['params']['version'] ?? 0);
    return wx_guard('page.restore', static fn() => ['data' => wx_page_restore($id, $u)]);
}

/**
 * POST /pages/rollback — undo a whole change.
 *
 * This is the header-across-150-pages undo. `batch` is what the write returned, so the person undoes
 * *that change* and not "the last five minutes", which may contain a colleague's work.
 */
function wx_route_pages_rollback(array $ctx): array
{
    return wx_appr_route('page_rollback', $ctx, 'pages', 'wx_route_pages_rollback_do', static fn() => wx_route_pages_rollback_do($ctx));
}

function wx_route_pages_rollback_do(array $ctx): array
{
    $u = wx_require_user(null, WX_PAGES_EDIT);
    $batch = (string) ($ctx['body']['batch'] ?? '');
    return wx_guard('page.rollback', static fn() => ['data' => wx_page_rollback_batch($batch, $u)]);
}

/**
 * GET /pages/search — which pages contain a string.
 *
 * The two things this is for: finding what a change would touch *before* making it ("which pages show the
 * phone number in the header"), and answering "where does this image appear" for the media library. It
 * returns the count and the first twenty, because the screen shows a number and a preview, not 150 rows.
 */
function wx_route_pages_search(array $ctx): array
{
    wx_require_user(null, WX_PAGES_EDIT);
    $needle = trim((string) ($ctx['query']['q'] ?? ''));
    if (mb_strlen($needle) < 3) {
        throw ApiError::validation('Search for at least three characters', 'q');
    }
    $hits = [];
    foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
        $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
        $n = substr_count($html, $needle);
        if ($n > 0) {
            $hits[] = ['rel' => $rel, 'hits' => $n, 'title' => wx_page_title_of($html)];
        }
    }
    usort($hits, static fn($a, $b) => $b['hits'] <=> $a['hits']);
    return ['data' => [
        'q' => $needle,
        'count' => count($hits),
        'total' => array_sum(array_column($hits, 'hits')),
        'pages' => array_slice($hits, 0, 20),
    ]];
}
