<?php
/**
 * WX DB factory — one place that opens the database.
 *
 * Hosting (Hostinger/XAMPP) uses MySQL exactly as before: same DSN, same options,
 * no behaviour change. When _private/db.json carries "driver": "sqlite" the app
 * opens a single SQLite file instead, through api/_lib/db-sqlite.php, which
 * translates the MySQL dialect the API is written in.
 *
 * Why the second driver exists: so the whole API can be executed, end to end,
 * on a machine with no MySQL server (local QA, sandbox runs, preview). MySQL
 * stays the supported production driver — see docs/DEVELOPER-HANDBOOK.md.
 */
declare(strict_types=1);

/** Read the db config the same way every endpoint does. */
function wx_db_config(string $file): array {
    $raw = is_file($file) ? @file_get_contents($file) : false;
    $c = $raw ? json_decode((string)$raw, true) : null;
    return is_array($c) ? $c : [];
}

function wx_db_driver(array $c): string {
    $d = strtolower(trim((string)($c['driver'] ?? '')));
    if ($d === 'sqlite') return 'sqlite';
    return 'mysql';
}

/** The XML PDO options used everywhere in this app. */
function wx_db_options(): array {
    return [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
}

/**
 * Open the configured database. $c = the parsed _private/db.json.
 * mysql  → identical to the previous inline `new PDO('mysql:...')`.
 * sqlite → file path from $c['file'] (default _private/woodex.sqlite).
 */
function wx_db(array $c): PDO {
    if (wx_db_driver($c) === 'sqlite') {
        require_once __DIR__ . '/db-sqlite.php';
        return wx_sqlite_open($c);
    }
    $dsn = 'mysql:host=' . (($c['host'] ?? '') ?: 'localhost') . ';dbname=' . ($c['name'] ?? '') . ';charset=utf8mb4';
    return new PDO($dsn, (string)($c['user'] ?? ''), (string)($c['pass'] ?? ''), wx_db_options());
}

/* ---------------------------------------------------------------------------
   Schema migrations: once per deployment, not once per request.

   Every api/*-lib.php carries a *_migrate() that creates its tables and adds
   columns that were introduced later ("ALTER TABLE ... ADD COLUMN" wrapped in a
   try/catch). Its guard was `static $done`, which only lives for one request, so
   on MySQL the app re-ran the whole create/alter dance on EVERY request — wasted
   metadata locks and an error log full of swallowed "duplicate column" failures.

   mig_skip() checks a small memo file and lets the DDL run once. The memo key is
   the migration file's path + mtime + size + a hash of db.json, so:
     * editing a lib (new table/column) re-runs its migration exactly once,
     * pointing db.json at another database re-runs everything once,
     * deleting _private/schema.json forces every migration to run again.
   If the DDL throws, nothing is written for that file, so the next request retries.
   --------------------------------------------------------------------------- */

function mig_state_file(): string {
    $dir = defined('PRIVATE_DIR') ? PRIVATE_DIR : dirname(__DIR__, 2) . '/_private';
    return rtrim($dir, '/') . '/schema.json';
}

function mig_key(string $file): string {
    $st = @stat($file);
    $dbFile = defined('DB_FILE') ? DB_FILE : dirname(__DIR__, 2) . '/_private/db.json';
    $db = is_file($dbFile) ? (string)@file_get_contents($dbFile) : '';
    return md5($file . '|' . ((int)($st['mtime'] ?? 0)) . '|' . ((int)($st['size'] ?? 0)) . '|' . md5($db));
}

/** True when this file's DDL has already run for this code + this database. */
function mig_skip(string $file): bool {
    $f = mig_state_file();
    if (!is_file($f)) return false;
    $m = json_decode((string)@file_get_contents($f), true);
    return is_array($m) && !empty($m['done'][mig_key($file)]);
}

/** Remember that this file's DDL ran. Called only after the DDL succeeded. */
function mig_done(string $file): void {
    $f = mig_state_file();
    $m = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
    if (!is_array($m)) $m = ['done' => []];
    $m['done'][mig_key($file)] = date('c');
    /* Drop entries for code versions or databases that no longer apply, so the file stays small. */
    foreach (array_keys($m['done']) as $k) {
        if (substr_count((string)$k, '|') || strlen((string)$k) !== 32) unset($m['done'][$k]);
    }
    if (count($m['done']) > 200) $m['done'] = array_slice($m['done'], -200, null, true);
    @file_put_contents($f, json_encode($m, JSON_PRETTY_PRINT), LOCK_EX);
    @chmod($f, 0600);
}

/** Forget the memo — used by the installer and the QA runner after a fresh database is created. */
function mig_reset(): void {
    @unlink(mig_state_file());
}

/**
 * Is this database actually set up (does it have the app's tables)?
 * A common hosting mistake is a correct db.json pointing at an empty or half-imported database;
 * the app then answered every request with "Database error", which tells the owner nothing.
 */
function wx_db_ready(PDO $pdo): bool {
    static $ready = null;
    if ($ready !== null) return $ready;
    try {
        $ready = (bool)$pdo->query("SHOW TABLES LIKE 'wx_users'")->fetchColumn();
    } catch (Throwable $e) {
        $ready = false;
    }
    return $ready;
}
