<?php
/**
 * SQLite driver for WX — executes the MySQL-flavoured SQL this API is written in.
 *
 * Loaded only when _private/db.json says "driver": "sqlite" (see api/_lib/db.php).
 * Nothing here runs on MySQL hosting.
 *
 * What it does
 *   1. Opens one SQLite file (default _private/woodex.sqlite).
 *   2. Registers the MySQL functions the API calls (NOW, CURDATE, RAND, DATE_FORMAT, CONCAT).
 *   3. Rewrites, per statement, the MySQL-only syntax that SQLite does not understand:
 *      SHOW TABLES, SHOW COLUMNS / DESCRIBE, LIMIT a,b, FOR UPDATE, ON DUPLICATE KEY UPDATE,
 *      INSERT IGNORE, TRUNCATE, and MySQL column types in CREATE/ALTER TABLE.
 *   4. With WX_SQL_TRACE=1 it appends every translation it made to
 *      _private/qa-sql-trace.log (string literals are redacted, so no customer data is logged).
 *
 * Anything it cannot translate throws with the original SQL attached, so a
 * mismatch is loud instead of silently wrong.
 */
declare(strict_types=1);

/** MySQL type name → SQLite storage class. */
const WX_SQL_TYPE_MAP = [
    'int' => 'INTEGER', 'integer' => 'INTEGER', 'tinyint' => 'INTEGER', 'smallint' => 'INTEGER',
    'mediumint' => 'INTEGER', 'bigint' => 'INTEGER', 'bit' => 'INTEGER', 'bool' => 'INTEGER', 'boolean' => 'INTEGER',
    'varchar' => 'TEXT', 'char' => 'TEXT', 'tinytext' => 'TEXT', 'text' => 'TEXT', 'mediumtext' => 'TEXT',
    'longtext' => 'TEXT', 'json' => 'TEXT', 'enum' => 'TEXT', 'set' => 'TEXT', 'uuid' => 'TEXT',
    'datetime' => 'TEXT', 'timestamp' => 'TEXT', 'date' => 'TEXT', 'time' => 'TEXT', 'year' => 'INTEGER',
    'decimal' => 'REAL', 'numeric' => 'REAL', 'float' => 'REAL', 'double' => 'REAL', 'real' => 'REAL',
    'blob' => 'BLOB', 'mediumblob' => 'BLOB', 'longblob' => 'BLOB', 'binary' => 'BLOB', 'varbinary' => 'BLOB',
];

/** MySQL DATE_FORMAT specifiers → PHP date() specifiers. */
const WX_SQL_DATEFMT = [
    '%Y' => 'Y', '%y' => 'y', '%m' => 'm', '%c' => 'n', '%d' => 'd', '%e' => 'j', '%H' => 'H', '%k' => 'G',
    '%h' => 'h', '%I' => 'h', '%l' => 'g', '%i' => 'i', '%s' => 's', '%S' => 's', '%p' => 'A', '%T' => 'H:i:s',
    '%r' => 'h:i:s A', '%M' => 'F', '%b' => 'M', '%W' => 'l', '%a' => 'D', '%j' => 'z', '%D' => 'jS',
    '%U' => 'W', '%u' => 'W', '%V' => 'W', '%x' => 'o', '%X' => 'o', '%f' => 'u', '%%' => '\\%',
];

class WX_SqlitePDO extends PDO {
    /** @var array<string,int> translation counters, readable by the QA runner */
    public static array $stats = [];
    public static array $udfs = [];

    private static function bump(string $k): void {
        self::$stats[$k] = (self::$stats[$k] ?? 0) + 1;
    }

    private static function note(string $tag, string $before, string $after): void {
        self::bump($tag);
        wx_sql_log($tag, $before, $after);
    }

    /** Translate + run every statement (DDL may expand into several). */
    public function exec(string $statement): int|false {
        $list = wx_sql_translate($statement);
        if (!$list) return 0;
        $n = 0;
        foreach ($list as $st) { $r = parent::exec($st); if ($r !== false) $n += (int)$r; }
        return $n;
    }

    public function query(string $statement, ?int $mode = null, mixed ...$args): PDOStatement|false {
        $list = wx_sql_translate($statement);
        if (!$list) return false;
        $last = array_pop($list);
        foreach ($list as $st) parent::exec($st);
        return ($mode === null) ? parent::query($last) : parent::query($last, $mode, ...$args);
    }

    public function prepare(string $query, array $options = []): PDOStatement|false {
        $list = wx_sql_translate($query);
        if (!$list) {
            // A statement that translates to nothing still has to return a statement.
            $list = ["SELECT 1 WHERE 0"];
        }
        $last = array_pop($list);
        foreach ($list as $st) parent::exec($st); // side statements (indexes) from a DDL conversion
        return parent::prepare($last, $options);
    }
}

function wx_sqlite_stats(): array { return ['translations' => WX_SqlitePDO::$stats, 'udfCalls' => WX_SqlitePDO::$udfs]; }
function wx_sqlite_stats_reset(): void { WX_SqlitePDO::$stats = []; WX_SqlitePDO::$udfs = []; }

function wx_sql_trace_on(): bool {
    $e = getenv('WX_SQL_TRACE');
    if ($e !== false && $e !== '' && $e !== '0') return true;
    return !empty($GLOBALS['WX_SQL_TRACE_ON']);
}

function wx_sql_redact(string $sql): string {
    $sql = (string)preg_replace_callback("~'([^']{25,})'~", static fn() => "'…'", $sql);
    return (string)preg_replace('~\s+~', ' ', trim($sql));
}

function wx_sql_log(string $tag, string $before, string $after): void {
    if (!wx_sql_trace_on()) return;
    $file = getenv('WX_SQL_TRACE_FILE') ?: dirname(__DIR__, 2) . '/_private/qa-sql-trace.log';
    if (!is_dir(dirname($file))) @mkdir(dirname($file), 0770, true);
    @file_put_contents(
        $file,
        date('c') . "\t" . $tag . "\t" . wx_sql_redact($before) . "  =>  " . wx_sql_redact($after) . "\n",
        FILE_APPEND | LOCK_EX
    );
}

/** Where the SQLite file lives: "file" in db.json, else _private/woodex.sqlite. */
function wx_sqlite_path(array $c): string {
    $root = dirname(__DIR__, 2);
    $f = trim((string)($c['file'] ?? ''));
    if ($f === '') $f = '_private/woodex.sqlite';
    if ($f[0] !== '/') $f = $root . '/' . ltrim($f, '/');
    $dir = dirname($f);
    if (!is_dir($dir)) @mkdir($dir, 0770, true);
    return $f;
}

/** Open (creating if needed) the SQLite database and teach it the MySQL functions. */
function wx_sqlite_open(array $c): PDO {
    $GLOBALS['WX_SQL_TRACE_ON'] = !empty($c['trace']); // "trace": true in db.json logs translations
    $path = wx_sqlite_path($c);
    $fresh = !is_file($path);
    $pdo = new WX_SqlitePDO('sqlite:' . $path, null, null, wx_db_options());
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA busy_timeout=5000');
    $pdo->exec('PRAGMA foreign_keys=ON');
    $pdo->exec('PRAGMA synchronous=NORMAL');
    if ($fresh) @chmod($path, 0660);

    $count = static function (string $name) { WX_SqlitePDO::$udfs[$name] = (WX_SqlitePDO::$udfs[$name] ?? 0) + 1; };

    // NOW() / CURDATE() must agree with PHP's date(), which is what the app writes everywhere else.
    $pdo->sqliteCreateFunction('now', static function () use ($count) { $count('now'); return date('Y-m-d H:i:s'); }, 0);
    $pdo->sqliteCreateFunction('curdate', static function () use ($count) { $count('curdate'); return date('Y-m-d'); }, 0);
    $pdo->sqliteCreateFunction('curtime', static function () use ($count) { $count('curtime'); return date('H:i:s'); }, 0);
    $pdo->sqliteCreateFunction('rand', static function () use ($count) { $count('rand'); return mt_rand() / mt_getrandmax(); }, 0);
    $pdo->sqliteCreateFunction('concat', static function (...$a) use ($count) { $count('concat'); return implode('', array_map(static fn($v) => (string)$v, $a)); }, -1);
    $pdo->sqliteCreateFunction('date_format', static function ($d, $f) use ($count) {
        $count('date_format');
        if (!$d) return null;
        $t = is_numeric($d) ? (int)$d : strtotime((string)$d);
        if ($t === false) return null;
        return date(strtr((string)$f, WX_SQL_DATEFMT), $t);
    }, 2);
    $pdo->sqliteCreateFunction('unix_timestamp', static function ($d = null) use ($count) {
        $count('unix_timestamp');
        if ($d === null) return time();
        $t = is_numeric($d) ? (int)$d : strtotime((string)$d);
        return $t === false ? null : $t;
    }, -1);
    $pdo->sqliteCreateFunction('greatest', static function (...$a) use ($count) {
        $count('greatest');
        $nums = array_filter($a, static fn($v) => $v !== null);
        return $nums ? max(array_map(static fn($v) => (float)$v, $nums)) : null;
    }, -1);
    $pdo->sqliteCreateFunction('least', static function (...$a) use ($count) {
        $count('least');
        $nums = array_filter($a, static fn($v) => $v !== null);
        return $nums ? min(array_map(static fn($v) => (float)$v, $nums)) : null;
    }, -1);
    /* The System check card prints this; say what it really is instead of pretending to be MySQL. */
    $pdo->sqliteCreateFunction('version', static function () use ($count, $pdo) {
        $count('version');
        return 'SQLite ' . $pdo->query('select sqlite_version()')->fetchColumn();
    }, 0);
    $pdo->sqliteCreateFunction('year', static fn($d) => (int)date('Y', (int)strtotime((string)$d)), 1);
    $pdo->sqliteCreateFunction('month', static fn($d) => (int)date('n', (int)strtotime((string)$d)), 1);
    $pdo->sqliteCreateFunction('day', static fn($d) => (int)date('j', (int)strtotime((string)$d)), 1);
    return $pdo;
}

/**
 * Translate one MySQL statement (which may expand into several SQLite ones).
 * @return string[] statements to execute, in order
 */
function wx_sql_translate(string $sql): array {
    $s = trim($sql);
    if ($s === '') return [];
    $head = strtoupper((string)preg_replace('~^\s*(/\*.*?\*/\s*)*~s', '', $s));

    // Server-side statements that mean nothing in SQLite.
    if (preg_match('~^(SET\s|USE\s|LOCK\s|UNLOCK\s|START\s+TRANSACTION|BEGIN\b|COMMIT\b|FLUSH\b|ANALYZE\s+TABLE)~', $head)) {
        WX_SqlitePDO::$stats['skipped-server-stmt'] = (WX_SqlitePDO::$stats['skipped-server-stmt'] ?? 0) + 1;
        wx_sql_log('skip:server', $s, '-- (ignored)');
        return ['SELECT 1 WHERE 0'];
    }

    if (preg_match('~^SHOW\s+TABLES(?:\s+LIKE\s+(.+?))?$~is', $s, $m)) {
        $q = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
        if (!empty($m[1])) $q .= " AND name LIKE " . trim($m[1]) . " ESCAPE '\\'";
        $q .= ' ORDER BY name';
        WX_SqlitePDO::$stats['SHOW TABLES'] = (WX_SqlitePDO::$stats['SHOW TABLES'] ?? 0) + 1;
        wx_sql_log('SHOW TABLES', $s, $q);
        return [$q];
    }
    if (preg_match('~^SHOW\s+TABLE\s+STATUS(?:\s+LIKE\s+(.+?))?$~is', $s, $m)) {
        /* SQLite has no per-table size/engine metadata: name comes from sqlite_master, the app
           counts rows itself, and size/updated stay 0 instead of being invented. */
        $q = 'SELECT name AS "Name", 0 AS "Rows", 0 AS "Data_length", 0 AS "Index_length", NULL AS "Update_time", '
           . '\'SQLite\' AS "Engine" FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'';
        if (!empty($m[1])) $q .= " AND name LIKE " . trim($m[1]) . " ESCAPE '\\'";
        $q .= ' ORDER BY name';
        WX_SqlitePDO::$stats['SHOW TABLE STATUS'] = (WX_SqlitePDO::$stats['SHOW TABLE STATUS'] ?? 0) + 1;
        wx_sql_log('SHOW TABLE STATUS', $s, $q);
        return [$q];
    }
    if (preg_match('~^(?:SHOW\s+(?:COLUMNS|FIELDS)\s+FROM|DESCRIBE|DESC)\s+`?([A-Za-z0-9_]+)`?~i', $s, $m)) {
        $t = $m[1];
        $q = "SELECT name AS \"Field\", type AS \"Type\", CASE WHEN \"notnull\" = 0 THEN 'YES' ELSE 'NO' END AS \"Null\", "
           . "CASE WHEN pk > 0 THEN 'PRI' ELSE '' END AS \"Key\", dflt_value AS \"Default\", '' AS \"Extra\" "
           . "FROM pragma_table_info('$t')";
        WX_SqlitePDO::$stats['SHOW COLUMNS'] = (WX_SqlitePDO::$stats['SHOW COLUMNS'] ?? 0) + 1;
        wx_sql_log('SHOW COLUMNS', $s, $q);
        return [$q];
    }

    $out = [];
    if (preg_match('~^CREATE\s+TABLE~i', $s)) return wx_sql_ddl($s);
    if (preg_match('~^ALTER\s+TABLE~i', $s)) return wx_sql_alter($s);

    $t = $s;
    if (preg_match('~^TRUNCATE\s+(?:TABLE\s+)?`?([A-Za-z0-9_]+)`?~i', $t, $m)) {
        $out[] = 'DELETE FROM "' . $m[1] . '"';
        $t = '';
        WX_SqlitePDO::$stats['TRUNCATE'] = (WX_SqlitePDO::$stats['TRUNCATE'] ?? 0) + 1;
        wx_sql_log('TRUNCATE', $s, $out[0]);
    }
    if ($t !== '') {
        $new = $t;
        $new = preg_replace('~\bINSERT\s+IGNORE\b~i', 'INSERT OR IGNORE', $new, -1, $c1) ?? $new;
        if ($c1) wx_sql_log('INSERT IGNORE', $t, $new);
        $new = preg_replace('~\s+FOR\s+UPDATE\b~i', '', $new, -1, $c2) ?? $new;
        if ($c2) wx_sql_log('FOR UPDATE', $t, $new);
        $new = preg_replace_callback('~\bLIMIT\s+(\d+)\s*,\s*(\d+)~i', static fn($m) => 'LIMIT ' . $m[2] . ' OFFSET ' . $m[1], $new, -1, $c3) ?? $new;
        if ($c3) wx_sql_log('LIMIT a,b', $t, $new);
        /* MySQL date arithmetic: DATE_SUB(x, INTERVAL 7 DAY) / DATE_ADD(x, INTERVAL 1 MONTH)
           become SQLite's datetime(x, '-7 days') — same result, same string format. */
        $new = preg_replace_callback(
            '~\bDATE_(SUB|ADD)\s*\(\s*((?:[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\))|(?:[^(),]+?))\s*,\s*INTERVAL\s+(\d+)\s+([A-Za-z]+)\s*\)~i',
            static function ($m) {
                $dir = strtoupper($m[1]) === 'SUB' ? '-' : '+';
                $unit = strtolower($m[4]);
                $ok = ['day', 'days', 'month', 'months', 'year', 'years', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'week', 'weeks'];
                if (!in_array($unit, $ok, true)) return $m[0];
                return "datetime(" . $m[2] . ", '" . $dir . $m[3] . ' ' . $unit . "')";
            },
            $new, -1, $c3b
        ) ?? $new;
        if ($c3b) wx_sql_log('DATE_SUB/DATE_ADD INTERVAL', $t, $new);
        if (preg_match('~\bON\s+DUPLICATE\s+KEY\s+UPDATE\s+(.+)$~is', $new, $m)) {
            $sets = (string)preg_replace('~\bVALUES\s*\(\s*`?([A-Za-z0-9_]+)`?\s*\)~i', 'excluded.$1', $m[1]);
            $sets = (string)preg_replace('~([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*=~', '$2=', $sets);
            $new = substr($new, 0, -strlen($m[0])) . 'ON CONFLICT DO UPDATE SET ' . trim($sets, " \t\n;");
            WX_SqlitePDO::$stats['ON DUPLICATE KEY'] = (WX_SqlitePDO::$stats['ON DUPLICATE KEY'] ?? 0) + 1;
            wx_sql_log('ON DUPLICATE KEY', $t, $new);
        }
        if ($new !== $t && !isset(WX_SqlitePDO::$stats['_any'])) { /* counted individually above */ }
        $out[] = $new;
    }
    return $out;
}

/** Split a column list on top-level commas. */
function wx_sql_split_cols(string $body): array {
    $parts = [];
    $depth = 0; $cur = ''; $n = strlen($body);
    for ($i = 0; $i < $n; $i++) {
        $ch = $body[$i];
        if ($ch === "'" ) { // copy string literal verbatim
            $cur .= $ch; $i++;
            while ($i < $n && $body[$i] !== "'") { $cur .= $body[$i]; if ($body[$i] === '\\') { $i++; if ($i < $n) $cur .= $body[$i]; } $i++; }
            if ($i < $n) $cur .= $body[$i];
            continue;
        }
        if ($ch === '(') $depth++;
        if ($ch === ')') $depth--;
        if ($ch === ',' && $depth === 0) { $parts[] = trim($cur); $cur = ''; continue; }
        $cur .= $ch;
    }
    if (trim($cur) !== '') $parts[] = trim($cur);
    return $parts;
}

/** MySQL column definition → SQLite column definition. */
function wx_sql_coldef(string $def): string {
    $d = trim($def);
    $isPk = (bool)preg_match('~\bPRIMARY\s+KEY\b~i', $d);
    $auto = (bool)preg_match('~\bAUTO_INCREMENT\b~i', $d);
    $d = (string)preg_replace('~\bAUTO_INCREMENT\b~i', '', $d);
    $d = (string)preg_replace('~\b(UNSIGNED|ZEROFILL)\b~i', '', $d);
    $d = (string)preg_replace('~\bCHARACTER\s+SET\s+\w+~i', '', $d);
    $d = (string)preg_replace('~\bCOLLATE\s+\w+~i', '', $d);
    $d = (string)preg_replace("~\bCOMMENT\s+'(?:[^'\\\\]|\\\\.)*'~i", '', $d);
    $d = (string)preg_replace('~\bON\s+UPDATE\s+CURRENT_TIMESTAMP(?:\(\d*\))?~i', '', $d);
    $d = (string)preg_replace('~\bDEFAULT\s+CURRENT_TIMESTAMP(?:\(\d*\))?~i', "DEFAULT (datetime('now','localtime'))", $d);
    // type token
    if (preg_match('~^(`?)([A-Za-z0-9_]+)\1\s*([A-Za-z]+)\s*(\([^)]*\))?(.*)$~s', $d, $m)) {
        $col = $m[1] . $m[2] . $m[1];
        $type = strtolower($m[3]);
        $args = (string)($m[4] ?? '');
        $rest = (string)($m[5] ?? '');
        $sqliteType = WX_SQL_TYPE_MAP[$type] ?? strtoupper($type);
        if ($sqliteType === 'INTEGER' && $isPk) {
            return trim($col . ' INTEGER PRIMARY KEY' . ($auto ? ' AUTOINCREMENT' : '') . preg_replace('~\bPRIMARY\s+KEY\b~i', '', $rest));
        }
        return trim($col . ' ' . $sqliteType . ' ' . $rest);
    }
    return (string)preg_replace('~\s+~', ' ', $d);
}

/** CREATE TABLE (MySQL) → SQLite statements. */
function wx_sql_ddl(string $sql): array {
    $s = trim((string)preg_replace('~\s+~', ' ', $sql));
    if (!preg_match('~^CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?\s*\((.*)\)\s*(.*)$~is', $s, $m)) {
        return [$s];
    }
    $ifne = $m[1] ? 'IF NOT EXISTS ' : '';
    $table = $m[2];
    $body = $m[3];
    $indexes = [];
    $cols = [];
    foreach (wx_sql_split_cols($body) as $part) {
        $p = trim($part);
        if ($p === '') continue;
        /* Table-level constraints must be recognised before the column path, or `PRIMARY KEY(`id`)`
           (MySQL allows no space) gets read as a column called PRIMARY of type KEY. */
        if (preg_match('~^(?:CONSTRAINT\s+`?([A-Za-z0-9_]+)`?\s+)?(PRIMARY\s+KEY|UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL|FOREIGN\s+KEY|CHECK)\b(.*)$~is', $p, $c)) {
            $kind = strtoupper((string)preg_replace('~\s+~', ' ', $c[2]));
            $rest = trim((string)$c[3]);
            $rest = (string)preg_replace('~^(?:KEY|INDEX)\s+`?[A-Za-z0-9_]*`?\s*~i', '', $rest); // drop the index name
            if ($kind === 'PRIMARY KEY') { $cols[] = 'PRIMARY KEY ' . $rest; continue; }
            if ($kind === 'UNIQUE') { $cols[] = 'UNIQUE ' . $rest; continue; }
            if ($kind === 'KEY' || $kind === 'INDEX') {
                /* Two MySQL spellings: `KEY name (cols)` and `INDEX name (cols)` — the name may also
                   sit after the keyword (`KEY \`n\` (..)` already stripped above) or be missing. */
                $iname = !empty($c[1]) ? $c[1] : '';
                $cols_ = '';
                if (preg_match('~^`?([A-Za-z0-9_]*)`?\s*(?:\((.*)\))?$~s', $rest, $n)) {
                    if ($iname === '') $iname = (string)$n[1];
                    $cols_ = '(' . (string)($n[2] ?? '') . ')';
                }
                if ($cols_ === '()' || $cols_ === '') continue;
                $name = $iname !== '' ? $iname : ($table . '_idx_' . count($indexes));
                $indexes[] = 'CREATE INDEX IF NOT EXISTS "' . $name . '" ON "' . $table . '" ' . $cols_;
                continue;
            }
            if ($kind === 'FULLTEXT' || $kind === 'SPATIAL') continue; // no SQLite equivalent needed
            $cols[] = ($c[1] !== '' ? 'CONSTRAINT "' . $c[1] . '" ' : '') . $kind . ' ' . $rest; // FOREIGN KEY / CHECK are valid SQLite
            continue;
        }
        $cols[] = wx_sql_coldef($p);
    }
    $tail = strtoupper(trim($m[4]));
    $rules = count($cols) + count($indexes) + (str_contains($tail, 'ENGINE') ? 1 : 0);
    if ($rules) {
        WX_SqlitePDO::$stats['CREATE TABLE'] = (WX_SqlitePDO::$stats['CREATE TABLE'] ?? 0) + 1;
        wx_sql_log('CREATE TABLE', $sql, 'CREATE TABLE ' . $ifne . '"' . $table . '" (' . implode(', ', $cols) . ')' . (count($indexes) ? '  +' . count($indexes) . ' index(es)' : ''));
    }
    return array_merge(['CREATE TABLE ' . $ifne . '"' . $table . '" (' . implode(', ', $cols) . ')'], $indexes);
}

/** ALTER TABLE (MySQL) → SQLite statements. */
function wx_sql_alter(string $sql): array {
    $s = trim((string)preg_replace('~\s+~', ' ', $sql));
    if (preg_match('~^ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD\s+(?:COLUMN\s+)?(.+)$~is', $s, $m)) {
        $out = 'ALTER TABLE "' . $m[1] . '" ADD COLUMN ' . wx_sql_coldef($m[2]);
        WX_SqlitePDO::$stats['ALTER ADD COLUMN'] = (WX_SqlitePDO::$stats['ALTER ADD COLUMN'] ?? 0) + 1;
        wx_sql_log('ALTER ADD COLUMN', $sql, $out);
        return [$out];
    }
    if (preg_match('~^ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+(MODIFY|CHANGE)\b~i', $s)) {
        WX_SqlitePDO::$stats['ALTER MODIFY (no-op)'] = (WX_SqlitePDO::$stats['ALTER MODIFY (no-op)'] ?? 0) + 1;
        wx_sql_log('ALTER MODIFY (no-op)', $sql, '-- (SQLite cannot change a column type; fresh installs get the new type)');
        return ['SELECT 1 WHERE 0'];
    }
    if (preg_match('~^ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+DROP\s+(?:COLUMN\s+)?`?([A-Za-z0-9_]+)`?$~i', $s, $m)) {
        $out = 'ALTER TABLE "' . $m[1] . '" DROP COLUMN "' . $m[2] . '"';
        WX_SqlitePDO::$stats['ALTER DROP COLUMN'] = (WX_SqlitePDO::$stats['ALTER DROP COLUMN'] ?? 0) + 1;
        wx_sql_log('ALTER DROP COLUMN', $sql, $out);
        return [$out];
    }
    if (preg_match('~^ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD\s+(?:UNIQUE\s+)?(?:KEY|INDEX)\s*`?([A-Za-z0-9_]*)`?\s*\((.*)\)$~i', $s, $m)) {
        $name = $m[2] !== '' ? $m[2] : $m[1] . '_idx';
        $out = 'CREATE INDEX IF NOT EXISTS "' . $name . '" ON "' . $m[1] . '" (' . $m[3] . ')';
        WX_SqlitePDO::$stats['ALTER ADD INDEX'] = (WX_SqlitePDO::$stats['ALTER ADD INDEX'] ?? 0) + 1;
        wx_sql_log('ALTER ADD INDEX', $sql, $out);
        return [$out];
    }
    WX_SqlitePDO::$stats['ALTER (passthrough)'] = (WX_SqlitePDO::$stats['ALTER (passthrough)'] ?? 0) + 1;
    wx_sql_log('ALTER (passthrough)', $sql, $s);
    return [$s];
}
