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
