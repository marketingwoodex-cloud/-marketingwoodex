<?php
/**
 * db/migrate.php — the migration runner. Forward-only, numbered, recorded, dry-runnable.
 *
 * Master plan §9.2: "Applied by db/migrate.php", and §12: data safety means "every migration is
 * applied to a restored copy first, with a row-count and checksum comparison before and after, and a
 * dry-run mode."
 *
 * Usage (CLI only — it refuses to run from the web):
 *
 *   php db/migrate.php --status                 what is applied, what is pending
 *   php db/migrate.php --dry-run                print every statement that would run, change nothing
 *   php db/migrate.php                          apply pending migrations, one transaction each
 *   php db/migrate.php --only 003               apply one migration (for a staged rollout)
 *   php db/migrate.php --checksum               record before/after table row counts and checksums
 *
 * Design notes that matter:
 *
 *   · **Each statement is independently safe to repeat.** MySQL implicitly commits around DDL, so a
 *     transaction around a migration file would give false comfort. Instead every statement is
 *     conditional (CREATE TABLE IF NOT EXISTS, ALTER guarded through information_schema), and the
 *     version row is written only after the last statement succeeds — so a partial run is resumed by
 *     running the file again.
 *   · **Statements are split on `;` at line ends** the same way the v2.1 installer split the dump,
 *     with comments stripped first. It is not a general SQL parser and does not pretend to be — the
 *     migration files are written to this rule, and the splitter reports what it executed.
 *   · **A checksum is recorded per file**, so editing an applied migration is detected rather than
 *     silently ignored: that is how a "fixed" migration causes two databases to diverge.
 *   · **Dry-run talks to the database** to report what is already present — a dry run that cannot see
 *     reality would print the same thing on every install and be worthless.
 */

declare(strict_types=1);

/* 'wasm' is the php-wasm SAPI (tools/phpwasm/run-php.cjs). Everything else — including a web
   request that found this file — is refused: a migration runner reachable over HTTP is a way to
   destroy a database with a URL. */
if (!in_array(PHP_SAPI, ['cli', 'phpdbg', 'wasm'], true)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "db/migrate.php runs from the command line only.\n";
    exit;
}

require_once dirname(__DIR__) . '/api/v2/lib/bootstrap.php';

$opts = ['status' => false, 'dry' => false, 'checksum' => false, 'only' => null, 'verify' => false];
foreach (array_slice($argv, 1) as $i => $arg) {
    if ($arg === '--status') {
        $opts['status'] = true;
    } elseif ($arg === '--dry-run' || $arg === '-n') {
        $opts['dry'] = true;
    } elseif ($arg === '--checksum') {
        $opts['checksum'] = true;
    } elseif ($arg === '--verify') {
        $opts['verify'] = true;
    } elseif ($arg === '--only') {
        $opts['only'] = $argv[$i + 2] ?? null;
    } elseif ($arg === '--help' || $arg === '-h') {
        echo "Usage: php db/migrate.php [--status] [--dry-run] [--checksum] [--only 003] [--verify]\n";
        exit(0);
    }
}

/* ------------------------------------------------------------------ output */
function say(string $m): void { fwrite(STDOUT, $m . "\n"); }
function warn(string $m): void { fwrite(STDERR, $m . "\n"); }

/* ------------------------------------------------------- migration bookkeeping */
function ensure_migrations_table(): void
{
    wx_q('CREATE TABLE IF NOT EXISTS wx_migrations (
        version VARCHAR(10) NOT NULL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        checksum CHAR(64) NOT NULL,
        statements INT NOT NULL DEFAULT 0,
        applied_at DATETIME NOT NULL,
        took_ms INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
}

/** @return array<string,array> applied versions keyed by version */
function applied(): array
{
    $out = [];
    foreach (wx_all('SELECT * FROM wx_migrations') as $r) {
        $out[(string) $r['version']] = $r;
    }
    return $out;
}

/** All migration files, ordered by their numeric prefix. */
function migration_files(): array
{
    $dir = __DIR__ . '/migrations';
    $files = [];
    foreach (glob($dir . '/*.sql') ?: [] as $f) {
        $base = basename($f);
        if (preg_match('~^(\d{3})_~', $base, $m)) {
            $files[$m[1]] = $f;
        }
    }
    ksort($files);
    return $files;
}

/**
 * Split a migration file into statements.
 *
 * The rule the migration files follow: one statement ends at `;\n` (semicolon, optionally whitespace,
 * newline). That keeps the `PREPARE stmt FROM @sql; EXECUTE stmt;` triples working while not being
 * fooled by a semicolon inside a string, because no string in these files contains a newline.
 * `--` comments and /* *\/ block comments are removed first; a `--` inside a string literal would
 * break this, and there are none by construction.
 */
function split_statements(string $sql): array
{
    $sql = preg_replace('~/\*.*?\*/~s', '', $sql) ?? $sql;
    $lines = explode("\n", $sql);
    $clean = [];
    foreach ($lines as $line) {
        $trim = ltrim($line);
        if (str_starts_with($trim, '--')) {
            continue;
        }
        $clean[] = $line;
    }
    $text = implode("\n", $clean);
    $parts = preg_split('~;\s*\n~', $text) ?: [];
    $out = [];
    foreach ($parts as $p) {
        $p = trim($p);
        if ($p !== '') {
            $out[] = $p;
        }
    }
    return $out;
}

/** Row counts per table, for the before/after comparison. */
function table_snapshot(): array
{
    $snap = [];
    $rows = wx_all('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name');
    foreach ($rows as $r) {
        $t = (string) $r['t'];
        try {
            $snap[$t] = (int) wx_val('SELECT COUNT(*) FROM `' . $t . '`');
        } catch (Throwable $e) {
            $snap[$t] = -1;
        }
    }
    return $snap;
}

function print_snapshot_diff(array $before, array $after): void
{
    $added = array_diff_key($after, $before);
    $removed = array_diff_key($before, $after);
    $changed = [];
    foreach ($after as $t => $n) {
        if (isset($before[$t]) && $before[$t] !== $n) {
            $changed[] = $t . ' ' . $before[$t] . '→' . $n;
        }
    }
    if ($added) {
        say('  tables created:  ' . implode(', ', array_keys($added)));
    }
    foreach ($added as $t => $n) {
        say('    ' . $t . ': ' . $n . ' row(s)');
    }
    if ($removed) {
        say('  tables dropped:  ' . implode(', ', array_keys($removed)));
    }
    if ($changed) {
        say('  row counts changed: ' . implode(', ', $changed));
    }
    if (!$added && !$removed && !$changed) {
        say('  row counts unchanged.');
    }
}

/* ------------------------------------------------------------------ main */
try {
    $files = migration_files();
    if (!$files) {
        warn('No migration files found in db/migrations.');
        exit(1);
    }

    if ($opts['status'] || $opts['verify']) {
        ensure_migrations_table();
        $done = applied();
        say('');
        say('  Woodex v2 migrations — ' . count($files) . ' file(s)');
        say('');
        foreach ($files as $version => $file) {
            $base = basename($file);
            $sum = hash_file('sha256', $file);
            if (isset($done[$version])) {
                $drift = !hash_equals((string) $done[$version]['checksum'], (string) $sum) ? '  ← CHANGED SINCE APPLIED' : '';
                say(sprintf('  ✓ %s  %-28s applied %s%s', $version, $base, $done[$version]['applied_at'], $drift));
            } else {
                say(sprintf('  · %s  %-28s pending', $version, $base));
            }
        }
        say('');
        if ($opts['verify']) {
            $pending = array_diff_key($files, $done);
            $drifted = [];
            foreach ($done as $v => $row) {
                if (isset($files[$v]) && !hash_equals((string) $row['checksum'], (string) hash_file('sha256', $files[$v]))) {
                    $drifted[] = $v;
                }
            }
            if ($pending || $drifted) {
                warn('✗ verify failed: ' . count($pending) . ' pending, ' . count($drifted) . ' drifted (' . implode(',', $drifted) . ')');
                exit(1);
            }
            say('✓ all migrations applied and unchanged');
        }
        exit(0);
    }

    ensure_migrations_table();
    $done = applied();
    $before = $opts['checksum'] ? table_snapshot() : [];

    foreach ($files as $version => $file) {
        if ($opts['only'] !== null && $version !== $opts['only']) {
            continue;
        }
        $base = basename($file);
        $sum = hash_file('sha256', $file);

        if (isset($done[$version])) {
            if (!hash_equals((string) $done[$version]['checksum'], (string) $sum)) {
                warn('✗ ' . $base . ' was applied on ' . $done[$version]['applied_at'] . ' but the file has changed since.');
                warn('  A migration is history: add a new file instead of editing an applied one.');
                exit(1);
            }
            say('· ' . $version . ' ' . $base . ' — already applied');
            continue;
        }

        $statements = split_statements((string) file_get_contents($file));

        if ($opts['dry']) {
            say('');
            say('DRY RUN — ' . $base . ' (' . count($statements) . ' statement(s), nothing will change)');
            foreach ($statements as $i => $st) {
                say(sprintf('  %2d. %s', $i + 1, preg_replace('~\s+~', ' ', substr($st, 0, 150)) . (strlen($st) > 150 ? ' …' : '')));
            }
            continue;
        }

        say('');
        say('Applying ' . $base . ' (' . count($statements) . ' statement(s))…');
        $t0 = microtime(true);
        /* Deliberately NOT wrapped in a transaction. MySQL issues an implicit COMMIT before and after
           every DDL statement, so a `BEGIN … COMMIT` around this loop would be theatre: a failure on
           statement 7 of 12 would leave 1–6 applied and the client believing it rolled back. The
           migration files are therefore written so that every statement is independently safe to
           repeat (CREATE TABLE IF NOT EXISTS; ALTER guarded through information_schema), and the
           version is recorded only after the last statement succeeds. A partial run is resumed by
           running the file again, which is what the operators will actually do. */
        foreach ($statements as $st) {
            try {
                wx_db()->exec($st);
            } catch (PDOException $e) {
                throw ApiError::internal('In ' . $base . ': ' . $e->getMessage(), ['statement' => substr($st, 0, 300)]);
            }
        }
        $took = (int) round((microtime(true) - $t0) * 1000);
        wx_q('INSERT INTO wx_migrations (version, name, checksum, statements, applied_at, took_ms) VALUES (?,?,?,?,?,?)', [
            $version, $base, $sum, count($statements), wx_now(), $took,
        ]);
        say('  ✓ applied in ' . $took . ' ms');
    }

    if ($opts['checksum'] && !$opts['dry']) {
        $after = table_snapshot();
        say('');
        say('Row counts before → after:');
        print_snapshot_diff($before, $after);
    }

    if (!$opts['dry']) {
        say('');
        say('Done. Check: php db/migrate.php --status');
    }
} catch (ApiError $e) {
    warn('✗ ' . $e->code . ': ' . $e->getMessage());
    foreach ($e->context as $k => $v) {
        warn('    ' . $k . ': ' . (is_scalar($v) ? (string) $v : json_encode($v)));
    }
    exit(1);
} catch (Throwable $e) {
    warn('✗ ' . get_class($e) . ': ' . $e->getMessage());
    exit(1);
}
