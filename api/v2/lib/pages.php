<?php
/**
 * api/v2/lib/pages.php — every write to a page file goes through here.
 *
 * The site is static HTML on Apache. That is not changing in this phase, so the one thing that has to
 * be true is this: **nobody writes a page without a version of what it was.**
 *
 * v2.1 did have `cms_file_backup()`, and it is worth being precise about why that is not enough. It
 * copied the page into `_private/page-backups/<name>-<stamp>.html` — a file per write, with no record of
 * what the write *was*, who made it, or that forty other files were changed by the same button. The one
 * thing an editor actually asks after a bad change — "put this morning's header back" — could not be
 * answered without knowing which of 150 timestamps belonged to it.
 *
 * So a write here does three things, in this order:
 *
 *   1. **Copy the current content into `wx_page_versions`** under a batch id, with a note and a name.
 *   2. **Write the new content atomically** — temporary file in the same directory, then rename.
 *   3. **Update the index row and the audit trail**, and prune that page's history to 20 versions.
 *
 * The batch is the important part. One action that touches 150 pages shares one batch id, so rollback is
 * one call and it restores exactly that action — not "everything written in the last five minutes", which
 * might include somebody else's work.
 */

declare(strict_types=1);

/** How many versions of a page to keep. 20 × the largest page on this site is still under 2 MB. */
const WX_PAGE_KEEP = 20;

/** Folders that are not content: a page-walk never enters them and a write never targets them. */
const WX_PAGE_SKIP = ['_private', 'admin', 'admin-v25', 'api', 'builder', 'assets', 'node_modules', 'tools', 'db', 'ci'];

/**
 * Normalise a page path and refuse anything that is not a content page under the site root.
 *
 * This is the only door into the filesystem that a request body reaches, so it refuses rather than
 * repairs: an absolute path, a `..`, a system folder or a non-HTML extension is an error, not something
 * to be sanitised into something else.
 */
function wx_page_rel(string $rel): string
{
    $rel = ltrim(str_replace('\\', '/', trim($rel)), '/');
    $rel = (string) preg_replace('~/{2,}~', '/', $rel);
    if ($rel === '' || str_contains($rel, '..') || str_starts_with($rel, '.')) {
        throw ApiError::validation('That is not a page path', 'rel');
    }
    if (str_contains($rel, "\0")) {
        throw ApiError::validation('That is not a page path', 'rel');
    }
    $top = explode('/', $rel)[0];
    if (in_array($top, WX_PAGE_SKIP, true) || in_array($top, ['admin.php', 'api', 'index.php'], true)) {
        throw ApiError::validation('"' . $top . '" is not a content folder', 'rel');
    }
    if (!preg_match('~^[a-z0-9][a-z0-9/_.-]*\.html?$~i', $rel)) {
        throw ApiError::validation('Pages are .html files — "' . $rel . '" is not one', 'rel');
    }
    $abs = WX_SITE_ROOT . '/' . $rel;
    /* A symlink out of the site is a way to write anywhere on the host, so the resolved path has to stay
       inside the site root. Done on the directory, because the file itself may be about to be created. */
    $dir = realpath(dirname($abs)) ?: '';
    $root = realpath(WX_SITE_ROOT) ?: '';
    if ($dir === '' || $root === '' || ($dir !== $root && !str_starts_with($dir, $root . '/'))) {
        throw ApiError::validation('That page is outside the site', 'rel');
    }
    return $rel;
}

function wx_page_path(string $rel): string
{
    return WX_SITE_ROOT . '/' . wx_page_rel($rel);
}

function wx_page_exists(string $rel): bool
{
    return is_file(wx_page_path($rel));
}

/** Every content page on disk, relative to the site root, sorted. */
function wx_page_walk(string $dir, bool $top = true): array
{
    $out = [];
    if (!is_dir($dir)) {
        return $out;
    }
    foreach (scandir($dir) ?: [] as $f) {
        if ($f === '' || $f[0] === '.') {
            continue;
        }
        $abs = $dir . '/' . $f;
        if (is_dir($abs)) {
            if ($top && in_array($f, WX_PAGE_SKIP, true)) {
                continue;
            }
            $out = array_merge($out, wx_page_walk($abs, false));
        } elseif (preg_match('~\.html?$~i', $f)) {
            $out[] = ltrim(substr($abs, strlen(WX_SITE_ROOT)), '/');
        }
    }
    sort($out);
    return $out;
}

/**
 * The page index: what is on disk, joined with what the admin knows about it.
 *
 * The disk is the source of truth, so a page that appeared by ftp still shows up here — with no title
 * and no author, which is exactly the right way for it to look. `stale` marks a page whose bytes no
 * longer match the recorded size, i.e. somebody edited it outside the admin since the last write.
 */
function wx_page_list(bool $reindex = false): array
{
    $rows = [];
    foreach (wx_all('SELECT * FROM wx_pages') as $r) {
        $rows[(string) $r['rel']] = $r;
    }
    $out = [];
    $seen = [];
    foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
        $seen[$rel] = true;
        $abs = WX_SITE_ROOT . '/' . $rel;
        $r = $rows[$rel] ?? null;
        $size = (int) filesize($abs);
        $out[] = [
            'rel' => $rel,
            'title' => $r !== null ? (string) ($r['title'] ?? '') : '',
            'folder' => str_contains($rel, '/') ? dirname($rel) : '',
            'bytes' => $size,
            'mtime' => gmdate('Y-m-d H:i:s', (int) filemtime($abs)),
            'updatedAt' => $r['updated_at'] ?? null,
            'updatedBy' => $r['updated_by_name'] ?? null,
            'stale' => $r !== null && (int) $r['bytes'] !== $size,
            'versions' => 0,
        ];
    }
    /* The version count for every page in one query — the alternative is a query per row in a list of
       hundreds of pages, which is the shape that makes a screen feel slow for no reason. */
    foreach (wx_all('SELECT rel, COUNT(*) n FROM wx_page_versions GROUP BY rel') as $r) {
        foreach ($out as $i => $p) {
            if ($p['rel'] === (string) $r['rel']) {
                $out[$i]['versions'] = (int) $r['n'];
            }
        }
    }
    /* Pages the index remembers but the disk no longer has: not deleted here, just reported. */
    $missing = [];
    foreach ($rows as $rel => $r) {
        if (!isset($seen[$rel])) {
            $missing[] = ['rel' => $rel, 'updatedAt' => $r['updated_at'], 'updatedBy' => $r['updated_by_name']];
        }
    }
    if ($reindex) {
        foreach ($out as $p) {
            wx_page_index($p['rel'], null, (int) $p['bytes'], null);
        }
    }
    return ['pages' => $out, 'missing' => $missing];
}

/** Read a page: the HTML plus what the index knows. */
function wx_page_get(string $rel, ?int $version = null): array
{
    $rel = wx_page_rel($rel);
    if ($version !== null) {
        $v = wx_one('SELECT * FROM wx_page_versions WHERE id = ? AND rel = ?', [$version, $rel]);
        if ($v === null) {
            throw ApiError::notFound('That version of the page is not in the history');
        }
        return ['rel' => $rel, 'html' => (string) $v['html'], 'version' => (int) $v['id'], 'createdAt' => $v['created_at'], 'createdBy' => $v['created_by_name'], 'note' => $v['note']];
    }
    if (!is_file(WX_SITE_ROOT . '/' . $rel)) {
        throw ApiError::notFound('Page not found');
    }
    $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
    return ['rel' => $rel, 'html' => $html, 'version' => null, 'bytes' => strlen($html), 'sha' => sha1($html)];
}

/** Upsert the index row for a page. Title is only touched when a title is passed. */
function wx_page_index(string $rel, ?string $title, int $bytes, ?array $me, ?string $sha = null): void
{
    $row = [
        'bytes' => $bytes,
        'sha' => $sha ?? sha1((string) @file_get_contents(WX_SITE_ROOT . '/' . $rel)),
        'updated_at' => wx_now(),
    ];
    if ($title !== null) {
        $row['title'] = mb_substr(trim($title), 0, 200);
    }
    if ($me !== null) {
        $row['updated_by'] = (int) $me['id'];
        $row['updated_by_name'] = (string) $me['name'];
    }
    if (wx_val('SELECT rel FROM wx_pages WHERE rel = ?', [$rel]) === null) {
        wx_insert('wx_pages', ['rel' => $rel, 'kind' => 'page'] + $row);
    } else {
        wx_update('wx_pages', $row, ['rel' => $rel]);
    }
}

/** The title a page already carries, so an index refresh does not throw it away. */
function wx_page_title_of(string $html): string
{
    return preg_match('~<title[^>]*>(.*?)</title>~is', $html, $m) ? trim((string) preg_replace('~\s+~', ' ', $m[1])) : '';
}

/**
 * Keep a version of the page as it is right now, and return its id.
 *
 * Called before a write, so the table holds what the page *was*. If the file does not exist yet, there
 * is nothing to keep and this returns 0 — a new page has no "before".
 */
function wx_page_snapshot(string $rel, array $me, string $note = '', ?string $batch = null, ?string $html = null): int
{
    $rel = wx_page_rel($rel);
    $abs = WX_SITE_ROOT . '/' . $rel;
    if ($html === null) {
        if (!is_file($abs)) {
            return 0;
        }
        $html = (string) file_get_contents($abs);
    }
    $id = wx_insert('wx_page_versions', [
        'rel' => $rel,
        'html' => $html,
        'bytes' => strlen($html),
        'sha' => sha1($html),
        'note' => mb_substr(trim($note), 0, 200) ?: null,
        'batch' => $batch,
        'created_at' => wx_now(),
        'created_by' => (int) $me['id'],
        'created_by_name' => (string) $me['name'],
    ]);
    wx_page_prune($rel);
    return $id;
}

/** Keep a page's history to WX_PAGE_KEEP versions. Oldest first, so the rows removed are the oldest. */
function wx_page_prune(string $rel): int
{
    $ids = array_column(wx_all('SELECT id FROM wx_page_versions WHERE rel = ? ORDER BY id DESC', [$rel]), 'id');
    $drop = array_slice($ids, WX_PAGE_KEEP);
    if (!$drop) {
        return 0;
    }
    foreach ($drop as $id) {
        wx_q('DELETE FROM wx_page_versions WHERE id = ?', [(int) $id]);
    }
    return count($drop);
}

/**
 * Write one page. The one function in the product that puts HTML on the site.
 *
 * @param array{note?:string, batch?:?string, title?:?string, snapshot?:bool} $opt
 * @return array{rel:string, bytes:int, before:int, version:int, batch:string}
 */
function wx_page_write(string $rel, string $html, array $me, array $opt = []): array
{
    $rel = wx_page_rel($rel);
    $abs = WX_SITE_ROOT . '/' . $rel;
    $batch = $opt['batch'] ?? wx_uuid();
    $note = (string) ($opt['note'] ?? '');
    $version = 0;
    $before = 0;
    if (($opt['snapshot'] ?? true) === true && is_file($abs)) {
        $before = (int) filesize($abs);
        $version = wx_page_snapshot($rel, $me, $note, $batch);
    }
    $dir = dirname($abs);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw ApiError::internal('Could not create the folder for ' . $rel);
    }
    /* Temporary file in the same directory, then rename: a half-written page is a page nobody can load,
       and the rename is what makes the change appear complete or not at all. */
    $tmp = $abs . '.wx' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $html, LOCK_EX) === false) {
        throw ApiError::internal('Could not write ' . $rel . ' — is the site folder writable by the web server?');
    }
    if (!@rename($tmp, $abs)) {
        @unlink($tmp);
        throw ApiError::internal('Could not replace ' . $rel);
    }
    @chmod($abs, 0644);
    wx_page_index($rel, $opt['title'] ?? null, strlen($html), $me);
    wx_audit($me, 'page.write', $rel, ['bytes' => strlen($html), 'before' => $before, 'version' => $version, 'batch' => $batch, 'note' => $note]);
    return ['rel' => $rel, 'bytes' => strlen($html), 'before' => $before, 'version' => $version, 'batch' => $batch];
}

/**
 * Write many pages as one change.
 *
 * This is what "change the header across 150 pages" is. Every page shares the batch id, so the history
 * screen can show the change as one item and rollback restores exactly those files. The callback does
 * the edit: it receives the page's current HTML and returns the new HTML, or null to leave it alone —
 * which is how a header rewrite skips the pages that do not contain the header.
 *
 * @param callable(string $rel, string $html):?string $edit
 * @return array{batch:string, changed:array<int,string>, skipped:int, versions:array<string,int>}
 */
function wx_page_write_many(array $rels, callable $edit, array $me, string $note = ''): array
{
    $batch = wx_uuid();
    $changed = [];
    $versions = [];
    $skipped = 0;
    foreach ($rels as $rel) {
        $rel = wx_page_rel((string) $rel);
        if (!is_file(WX_SITE_ROOT . '/' . $rel)) {
            $skipped++;
            continue;
        }
        $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
        $next = $edit($rel, $html);
        if ($next === null || $next === $html) {
            $skipped++;
            continue;
        }
        $r = wx_page_write($rel, $next, $me, ['note' => $note, 'batch' => $batch]);
        $changed[] = $rel;
        $versions[$rel] = $r['version'];
    }
    if ($changed) {
        wx_audit($me, 'page.write_many', count($changed) . ' page(s)', ['batch' => $batch, 'note' => $note, 'files' => array_slice($changed, 0, 20)]);
    }
    return ['batch' => $batch, 'changed' => $changed, 'skipped' => $skipped, 'versions' => $versions];
}

/** Page history, newest first, with the batch each version belongs to. */
function wx_page_history(string $rel, int $limit = 50): array
{
    $rel = wx_page_rel($rel);
    $out = [];
    foreach (wx_all('SELECT id, rel, bytes, sha, note, batch, restored_from, created_at, created_by, created_by_name FROM wx_page_versions WHERE rel = ? ORDER BY id DESC LIMIT ' . max(1, min(200, $limit)), [$rel]) as $r) {
        $out[] = [
            'id' => (int) $r['id'],
            'bytes' => (int) $r['bytes'],
            'note' => (string) ($r['note'] ?? ''),
            'batch' => $r['batch'],
            'restoredFrom' => $r['restored_from'] !== null ? (int) $r['restored_from'] : null,
            'at' => (string) $r['created_at'],
            'by' => (string) ($r['created_by_name'] ?? ''),
            'byId' => $r['created_by'] !== null ? (int) $r['created_by'] : null,
        ];
    }
    return $out;
}

/**
 * Restore one version of one page.
 *
 * The restore is itself a write, so the content it replaces is kept first — undo has an undo. The new
 * version records `restored_from` so the history reads "back to 12:40" rather than showing an anonymous
 * edit at 14:02.
 */
function wx_page_restore(int $versionId, array $me): array
{
    $v = wx_one('SELECT * FROM wx_page_versions WHERE id = ?', [$versionId]);
    if ($v === null) {
        throw ApiError::notFound('That version is not in the history');
    }
    $rel = (string) $v['rel'];
    $r = wx_page_write($rel, (string) $v['html'], $me, [
        'note' => 'restored version #' . $versionId . ($v['created_by_name'] ? ' (' . $v['created_by_name'] . ', ' . $v['created_at'] . ')' : ''),
        'snapshot' => true,
    ]);
    wx_q('UPDATE wx_page_versions SET restored_from = ? WHERE id = ?', [$versionId, $r['version']]);
    return $r + ['from' => $versionId];
}

/**
 * Roll back a whole batch: the header change across 150 pages, undone in one call.
 *
 * For each page in the batch, the *oldest* version in that batch is the content from before the change,
 * so restoring that version is the rollback. A page that was new (no version in the batch) is not
 * deleted — a rollback that removes pages is a different, scarier operation, and saying so here is
 * better than doing it quietly.
 *
 * @return array{batch:string, restored:array<int,string>, missing:array<int,string>, errors:array<int,array{rel:string,message:string}>}
 */
function wx_page_rollback_batch(string $batch, array $me): array
{
    $batch = trim($batch);
    if ($batch === '') {
        throw ApiError::validation('Which change? Pass the batch id', 'batch');
    }
    $rows = wx_all('SELECT rel, MIN(id) id FROM wx_page_versions WHERE batch = ? GROUP BY rel', [$batch]);
    if (!$rows) {
        throw ApiError::notFound('That change is not in the history');
    }
    $restored = [];
    $missing = [];
    $errors = [];
    $undo = wx_uuid();
    foreach ($rows as $r) {
        $rel = (string) $r['rel'];
        if (!is_file(WX_SITE_ROOT . '/' . $rel)) {
            $missing[] = $rel;
            continue;
        }
        try {
            $v = wx_one('SELECT * FROM wx_page_versions WHERE id = ?', [(int) $r['id']]);
            wx_page_write($rel, (string) $v['html'], $me, ['note' => 'rolled back change ' . substr($batch, 0, 8), 'batch' => $undo]);
            $restored[$rel] = (int) $r['id'];
        } catch (Throwable $e) {
            /* One unwritable page does not abandon the other 149 — the caller is told exactly which. */
            $errors[] = ['rel' => $rel, 'message' => $e->getMessage()];
        }
    }
    wx_audit($me, 'page.rollback', substr($batch, 0, 8), ['restored' => count($restored), 'missing' => count($missing), 'errors' => count($errors), 'batch' => $batch, 'undo' => $undo]);
    return ['batch' => $batch, 'undoBatch' => $undo, 'restored' => array_keys($restored), 'missing' => $missing, 'errors' => $errors];
}

/** Recent changes across every page, newest first — the history screen. */
function wx_page_changes(int $limit = 100): array
{
    $out = [];
    foreach (wx_all('SELECT id, rel, bytes, note, batch, created_at, created_by_name FROM wx_page_versions ORDER BY id DESC LIMIT ' . max(1, min(500, $limit))) as $r) {
        $out[] = [
            'id' => (int) $r['id'],
            'rel' => (string) $r['rel'],
            'bytes' => (int) $r['bytes'],
            'note' => (string) ($r['note'] ?? ''),
            'batch' => $r['batch'],
            'at' => (string) $r['created_at'],
            'by' => (string) ($r['created_by_name'] ?? ''),
        ];
    }
    return $out;
}

/**
 * Rewrite every page that contains a given string, as one batch.
 *
 * The primitive the header/footer work and the media rewriters both use: find the pages, let the caller
 * transform each one, write them all under one batch id. Returning the batch is what makes it
 * reversible.
 *
 * @param callable(string, string):?string $transform
 */
function wx_page_rewrite_all(string $needle, callable $transform, array $me, string $note): array
{
    $rels = [];
    foreach (wx_page_walk(WX_SITE_ROOT) as $rel) {
        $html = (string) file_get_contents(WX_SITE_ROOT . '/' . $rel);
        if ($needle === '' || str_contains($html, $needle)) {
            $rels[] = $rel;
        }
    }
    return wx_page_write_many($rels, $transform, $me, $note) + ['scanned' => count($rels)];
}

/**
 * Write a generated file that is not a page — the sitemap today, the launch announcement next.
 *
 * Same discipline as a page write (temporary file, rename, chmod) without a version row: these files are
 * *derived* from data that is itself versioned or queryable, so keeping history here would be history of
 * a cache. What it does keep is the property that matters on a live server — a reader never sees a
 * half-written file.
 */
function wx_write_file_atomic(string $abs, string $contents): bool
{
    $dir = realpath(dirname($abs)) ?: '';
    $root = realpath(WX_SITE_ROOT) ?: '';
    if ($dir === '' || $root === '' || ($dir !== $root && !str_starts_with($dir, $root . '/'))) {
        throw ApiError::validation('That file is outside the site', 'path');
    }
    $tmp = $abs . '.wx' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false) {
        throw ApiError::internal('Could not write ' . basename($abs) . ' — is the site folder writable?');
    }
    if (!@rename($tmp, $abs)) {
        @unlink($tmp);
        throw ApiError::internal('Could not replace ' . basename($abs));
    }
    @chmod($abs, 0644);
    return true;
}

/** A batch id that is a real UUID v4 — the history groups by it and it travels in URLs. */
function wx_uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
