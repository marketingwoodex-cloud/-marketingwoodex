<?php
/**
 * WOODEX — one-time installer (H2, Hostinger).
 *
 *   1. Upload the whole folder to public_html
 *   2. Create MySQL DB + user in hPanel → Databases
 *   3. Open https://your-domain/install.php  → fill the form → Install
 *   4. Sign in at /admin/  (this file deletes itself)
 *
 * Everything it does: connects to MySQL, runs sql/install.sql (all tables),
 * seeds your admin login, writes config/config.php.
 */
declare(strict_types=1);

$configFile = __DIR__ . '/config/config.php';
$sqlFile    = __DIR__ . '/sql/install.sql';
$errors     = [];
$done       = false;
$installed  = false;

/** @return array<string,mixed>|null */
function wx_load_config(string $file): ?array
{
    if (!is_file($file)) return null;
    $c = include $file;
    return is_array($c) ? $c : null;
}

/** Check an existing install (config + DB + tables). */
function wx_check_installed(?array $cfg): bool
{
    if (!$cfg || !isset($cfg['db']['name'])) return false;
    try {
        $pdo = new PDO(
            'mysql:host=' . $cfg['db']['host'] . ';dbname=' . $cfg['db']['name'] . ';charset=utf8mb4',
            (string)$cfg['db']['user'],
            (string)$cfg['db']['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 10]
        );
        $n = $pdo->query('SELECT COUNT(*) FROM cms_users')->fetchColumn();
        return (int)$n >= 1;
    } catch (Throwable $e) {
        return false;
    }
}

$existing = wx_load_config($configFile);
if ($existing && wx_check_installed($installed ? null : $existing) && ($_GET['force'] ?? '') !== '1') {
    $installed = true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$installed) {
    $dbHost   = trim($_POST['db_host'] ?? 'localhost');
    $dbName   = trim($_POST['db_name'] ?? '');
    $dbUser   = trim($_POST['db_user'] ?? '');
    $dbPass   = (string)($_POST['db_pass'] ?? '');
    $adminUser = trim($_POST['admin_user'] ?? 'woodexadmin');
    $adminPass = (string)($_POST['admin_pass'] ?? '');
    $adminPass2 = (string)($_POST['admin_pass2'] ?? '');
    $mailFrom = trim($_POST['mail_from'] ?? '');
    $mailUser = trim($_POST['mail_user'] ?? '');
    $mailPass = (string)($_POST['mail_pass'] ?? '');
    $selfDelete = isset($_POST['self_delete']);

    if ($dbName === '' || $dbUser === '')  $errors[] = 'Database name and username are required (from hPanel → Databases).';
    if (!preg_match('/^[A-Za-z0-9_.-]{3,64}$/', $adminUser)) $errors[] = 'Admin username: letters, numbers, dot, dash, underscore (3–64 chars).';
    if (strlen($adminPass) < 8)  $errors[] = 'Admin password must be at least 8 characters.';
    if ($adminPass !== $adminPass2) $errors[] = 'The two admin passwords do not match.';

    $pdo = null;
    if (!$errors) {
        try {
            $pdo = new PDO(
                'mysql:host=' . $dbHost . ';dbname=' . $dbName . ';charset=utf8mb4',
                $dbUser,
                $dbPass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 15]
            );
        } catch (Throwable $e) {
            $errors[] = 'Could not connect to MySQL — check the database name, user and password from hPanel. (' . $e->getMessage() . ')';
        }
    }

    if ($pdo && !$errors) {
        $sql = is_file($sqlFile) ? (string)file_get_contents($sqlFile) : '';
        if ($sql === '') {
            $errors[] = 'sql/install.sql is missing from the upload.';
        } else {
            try {
                // strip -- comments, then split statements on ';'
                $lines = array_filter(
                    explode("\n", $sql),
                    fn($l) => strpos(ltrim($l), '--') !== 0
                );
                $sqlClean = implode("\n", $lines);
                $stmts = array_filter(array_map('trim', explode(';', $sqlClean)), fn($s) => $s !== '');
                foreach ($stmts as $stmt) {
                    $pdo->exec($stmt);
                }

                // seed / reset the admin login
                $hash = hash('sha256', $adminPass);
                $st = $pdo->prepare(
                    'INSERT INTO cms_users (id, username, pass_sha256, role, active)
                     VALUES (UUID(), ?, ?, "admin", 1)
                     ON DUPLICATE KEY UPDATE pass_sha256 = VALUES(pass_sha256), role = "admin", active = 1'
                );
                $st->execute([$adminUser, $hash]);

                // write config/config.php (protected folder)
                $cfg = [
                    'db' => ['host' => $dbHost, 'name' => $dbName, 'user' => $dbUser, 'pass' => $dbPass],
                    'mail' => [
                        'from' => $mailFrom !== '' ? $mailFrom : $mailUser,
                        'host' => 'smtp.hostinger.com',
                        'port' => 465,
                        'user' => $mailUser,
                        'pass' => $mailPass,
                    ],
                    'session_name' => 'woodex_cms',
                    'session_secret' => bin2hex(random_bytes(32)),
                    'cron_key' => bin2hex(random_bytes(16)),
                    'backup_keep_days' => 14,
                    'installed_at' => date('c'),
                ];
                $php = "<?php\n// generated by install.php — do not commit\nreturn "
                     . var_export($cfg, true) . ";\n";
                if (file_put_contents($configFile, $php) === false) {
                    $errors[] = 'Could not write config/config.php — check folder permissions (should be writable).';
                } else {
                    $done = true;
                }
            } catch (Throwable $e) {
                $errors[] = 'Database setup failed: ' . $e->getMessage();
            }
        }
    }
}

function wx_h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Woodex setup</title>
<style>
  :root { --navy:#0a0f1e; --gold:#e9c97b; --line:#e6e9f2; --mut:#5b6478; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#f4f6fa; color:#1a2233; }
  .wrap { max-width:640px; margin:40px auto; padding:0 16px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:28px; box-shadow:0 1px 3px rgba(10,15,30,.05); }
  h1 { margin:0 0 4px; font-size:22px; letter-spacing:.14em; text-transform:uppercase; }
  .sub { color:var(--mut); font-size:14px; margin:0 0 22px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 5px; }
  input { width:100%; padding:10px 12px; border:1px solid #d7dbe8; border-radius:8px; font-size:14px; }
  input:focus { outline:none; border-color:#2563eb; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .hint { font-size:12px; color:var(--mut); margin-top:4px; }
  button { margin-top:22px; width:100%; padding:13px; background:#2563eb; color:#fff; border:0; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; }
  button:hover { background:#1d4fd8; }
  .err { background:#fdecec; color:#a12622; border-radius:10px; padding:12px 14px; font-size:13.5px; margin-bottom:16px; }
  .ok { background:#e7f8ee; color:#14532d; border-radius:10px; padding:14px 16px; font-size:14px; margin-bottom:16px; }
  .ok b { display:block; margin-bottom:6px; font-size:16px; }
  .step { font-size:13.5px; color:#333c55; line-height:1.7; }
  .step code { background:#f1f4fa; padding:2px 6px; border-radius:6px; font-size:12.5px; }
  .chk { margin-top:16px; font-size:13.5px; display:flex; gap:8px; align-items:flex-start; }
  .foot { text-align:center; color:var(--mut); font-size:12px; margin-top:16px; }
  .sect { border-top:1px solid var(--line); margin-top:20px; padding-top:6px; }
</style>
</head>
<body>
<div class="wrap"><div class="card">
  <h1>Woodex</h1>
  <p class="sub">One-time setup — creates the database tables and your admin login.</p>

<?php if ($installed): ?>
  <div class="ok"><b>✓ Already installed</b>The database and admin login are ready.</div>
  <p class="step">→ <a href="/admin/">Go to the dashboard sign-in</a><br>
     → Optional: open with <code>?force=1</code> only if you must reinstall.</p>

<?php elseif ($done): ?>
  <div class="ok"><b>✓ Installation complete</b>All tables created and your admin login is set.</div>
  <p class="step">
    <b>1.</b> <a href="/admin/">Sign in to the dashboard</a><br>
    <b>2.</b> Delete this file (<code>install.php</code>) from public_html —<?= $selfDelete ? 'done automatically' : 'recommended' ?><br>
    <b>3.</b> Tell your guide: <i>H2 done</i> — API activation is next.
  </p>
  <?php if ($selfDelete): @unlink(__FILE__); endif; ?>

<?php else: ?>
  <?php foreach ($errors as $e): ?>
    <div class="err"><?= wx_h($e) ?></div>
  <?php endforeach; ?>
  <form method="post" autocomplete="off">
    <label>Database (hPanel → Databases → Management)</label>
    <div class="row">
      <div><input name="db_host" value="<?= wx_h($_POST['db_host'] ?? 'localhost') ?>" placeholder="localhost"></div>
      <div><input name="db_name" value="<?= wx_h($_POST['db_name'] ?? '') ?>" placeholder="db name" required></div>
    </div>
    <div class="row">
      <div><input name="db_user" value="<?= wx_h($_POST['db_user'] ?? '') ?>" placeholder="db username" required></div>
      <div><input name="db_pass" type="password" value="" placeholder="db password"></div>
    </div>
    <div class="hint">Create these in hPanel first: <b>Databases → MySQL → Create</b>.</div>

    <div class="sect"></div>
    <label>Your dashboard login</label>
    <div class="row">
      <div><input name="admin_user" value="<?= wx_h($_POST['admin_user'] ?? 'woodexadmin') ?>" required></div>
      <div><input name="admin_pass" type="password" placeholder="password (min 8)" required></div>
    </div>
    <input name="admin_pass2" type="password" placeholder="repeat password" style="margin-top:12px" required>

    <div class="sect"></div>
    <label>Outgoing email <span style="font-weight:400;color:var(--mut)">(optional — quotation/invoice PDFs)</span></label>
    <div class="row">
      <div><input name="mail_from" value="<?= wx_h($_POST['mail_from'] ?? '') ?>" placeholder="info@woodex.com.pk"></div>
      <div><input name="mail_user" value="<?= wx_h($_POST['mail_user'] ?? '') ?>" placeholder="mailbox user"></div>
    </div>
    <input name="mail_pass" type="password" placeholder="mailbox password" style="margin-top:12px">

    <label class="chk"><input type="checkbox" name="self_delete" <?= isset($_POST['self_delete']) || !isset($_POST['db_name']) ? 'checked' : '' ?> style="width:auto;margin-top:2px">
      Delete install.php automatically after success (recommended)</label>

    <button type="submit">Install</button>
  </form>
<?php endif; ?>
</div>
<p class="foot">Woodex · Hostinger setup · nothing leaves your server</p>
</div>
</body>
</html>
