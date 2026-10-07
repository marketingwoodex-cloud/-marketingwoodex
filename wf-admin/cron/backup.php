<?php
/**
 * WOODEX nightly backup (H5) — Hostinger Cron Job:
 *   Command:  /usr/bin/php /home/USER/htdocs/DOMAIN/cron/backup.php
 * (or wget URL: /cron/backup.php?key=YOUR_CRON_KEY from config.php)
 * Produces: backups/backup-YYYYMMDD-HHMMSS.zip (DB JSON dump + content + pages)
 * Keeps: backup_keep_days from config (default 14), oldest pruned first.
 */
declare(strict_types=1);

$isCli = php_sapi_name() === 'cli';
if (!$isCli) {
    $key = (string)($_GET['key'] ?? '');
    $cfgFile = dirname(__DIR__) . '/config/config.php';
    $cfg = is_file($cfgFile) ? include $cfgFile : [];
    $want = (string)($cfg['cron_key'] ?? '');
    if ($want === '' || !hash_equals($want, $key)) {
        http_response_code(403);
        exit("forbidden\n");
    }
    header('Content-Type: text/plain');
}

require dirname(__DIR__) . '/api/lib.php';

$root = wx_root();
$keep = (int)(wx_config()['backup_keep_days'] ?? 14);
@date_default_timezone_set('Asia/Karachi');

try {
    $pdo = wx_pdo();

    // 1) DB dump (all tables → one JSON file)
    $dump = ['exported_at' => date('c'), 'tables' => []];
    foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
        $dump['tables'][$t] = $pdo->query('SELECT * FROM `' . str_replace('`', '', $t) . '`')->fetchAll();
    }
    $dumpJson = json_encode($dump, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($dumpJson === false) throw new RuntimeException('DB dump encode failed.');

    // 2) zip: DB dump + content/ + index.html + admin views (tiny) 
    if (!is_dir($root . '/backups')) mkdir($root . '/backups', 0755, true);
    $name = 'backup-' . date('Ymd-His') . '.zip';
    $zipPath = $root . '/backups/' . $name;
    if (!class_exists('ZipArchive')) throw new RuntimeException('ZipArchive missing.');
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Cannot create zip.');
    }
    $zip->addFromString('database.json', $dumpJson);
    if (is_dir($root . '/content')) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root . '/content', FilesystemIterator::SKIP_DOTS)
        );
        foreach ($it as $f) {
            if ($f->isFile()) {
                $zip->addFile($f->getPathname(), 'content/' . substr($f->getPathname(), strlen($root . '/content/') + 1));
            }
        }
    }
    foreach (['index.html', '.htaccess'] as $top) {
        if (is_file($root . '/' . $top)) $zip->addFile($root . '/' . $top, $top);
    }
    $zip->close();
    $size = (int)@filesize($zipPath);

    $st = $pdo->prepare('INSERT INTO backups (id, filename, size_bytes, kind) VALUES (?, ?, ?, "nightly")');
    $st->execute([wx_uuid(), $name, $size]);
    wx_audit('backup', 'Nightly backup ' . $name . ' (' . round($size / 1024) . ' KB)');

    // 3) prune old backups (keep $keep days)
    $cut = time() - $keep * 86400;
    $pruned = 0;
    foreach (glob($root . '/backups/backup-*.zip') ?: [] as $z) {
        if (@filemtime($z) < $cut) { @unlink($z); $pruned++; }
    }
    $pdo->prepare('DELETE FROM backups WHERE created_at < ?')->execute([date('Y-m-d H:i:s', $cut)]);

    $msg = sprintf("backup OK: %s (%.0f KB), pruned %d old, keep %dd\n", $name, $size / 1024, $pruned, $keep);
    echo $msg;
    exit(0);
} catch (Throwable $e) {
    $line = 'backup FAILED: ' . $e->getMessage() . "\n";
    echo $line;
    exit(1);
}
