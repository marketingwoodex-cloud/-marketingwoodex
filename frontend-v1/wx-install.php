<?php
/* WOODEX P22 one-page installer (PHP 7.4+).
   https://woodex.com.pk/wx-install.php → enter the database password → Install.
   Writes _private/db.json, creates all 20 tables from _database/woodex-p22.sql and YOUR owner login (no default admin/admin).
   Nothing is ever deleted. Delete this file after installing. */
error_reporting(E_ALL); ini_set('display_errors', '0');
header('Content-Type: text/html; charset=utf-8'); header('X-Robots-Tag: noindex'); header('Cache-Control: no-store');
$root = __DIR__; $priv = $root . '/_private'; $dbf = $priv . '/db.json'; $sqlf = $root . '/_database/woodex-p22.sql';
$cur = is_file($dbf) ? (json_decode((string)file_get_contents($dbf), true) ?: array()) : array();
$v = array('host' => 'localhost', 'name' => 'u128159657_woodex', 'user' => 'u128159657_woodex');
foreach ($v as $k => $d) if (!empty($cur[$k])) $v[$k] = $cur[$k];
$log = array(); $err = ''; $done = false;
$lockf = $priv . '/install-lock.json'; $lock = is_file($lockf) ? (json_decode((string)file_get_contents($lockf), true) ?: array()) : array();
$locked = !empty($lock['until']) && $lock['until'] > time();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$locked) {
    $in = array('host' => trim((string)($_POST['host'] ?? 'localhost')), 'name' => trim((string)($_POST['name'] ?? '')), 'user' => trim((string)($_POST['user'] ?? '')), 'pass' => (string)($_POST['pass'] ?? ''));
    $v = $in;
    $own = array('name' => trim((string)($_POST['oname'] ?? '')), 'email' => strtolower(trim((string)($_POST['oemail'] ?? ''))), 'pass' => (string)($_POST['opass'] ?? ''));
    $ownSet = $own['email'] !== '' || $own['pass'] !== '';
    // If the site is already connected, only the SAME database password may re-run the installer.
    if (!empty($cur['pass']) && !hash_equals((string)$cur['pass'], $in['pass'])) {
        $lock['n'] = ($lock['n'] ?? 0) + 1; if ($lock['n'] >= 5) $lock = array('n' => 0, 'until' => time() + 900);
        @file_put_contents($lockf, json_encode($lock)); usleep(600000);
        $err = 'This site is already installed and that is not its database password.';
    } elseif ($ownSet && ($own['name'] === '' || !filter_var($own['email'], FILTER_VALIDATE_EMAIL) || strlen($own['pass']) < 8)) {
        $err = 'Owner account: enter your name, a valid email and a password of 8+ characters (or leave all 3 empty).';
    } elseif (!is_file($sqlf)) {
        $err = 'Missing file _database/woodex-p22.sql. Upload the full P22 zip again (Extract + Overwrite).';
    } else {
        try {
            $pdo = new PDO('mysql:host=' . ($in['host'] ?: 'localhost') . ';dbname=' . $in['name'] . ';charset=utf8mb4', $in['user'], $in['pass'], array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
            $log[] = 'Connected to database ' . $in['name'];
            $sql = preg_replace('~^--.*$~m', '', (string)file_get_contents($sqlf));
            $n = 0; $seed = '';
            foreach (preg_split('~;\s*\n~', $sql) as $st) { $st = trim($st); if ($st === '') continue; if (stripos($st, 'INSERT INTO wx_users') === 0) continue; $pdo->exec($st); $n++; }
            /* P22: never reset existing passwords; a new site MUST get the owner's own login (no default admin/admin). */
            $users = (int)$pdo->query('SELECT COUNT(*) FROM wx_users')->fetchColumn();
            if ($ownSet) {
                $hash = password_hash($own['pass'], PASSWORD_DEFAULT);
                $ex = $pdo->prepare('SELECT id FROM wx_users WHERE email=?'); $ex->execute(array($own['email']));
                if ($id = $ex->fetchColumn()) { $pdo->prepare("UPDATE wx_users SET name=?, pass_hash=?, role='owner', active=1, pw_ver=pw_ver+1 WHERE id=?")->execute(array($own['name'], $hash, $id)); $log[] = 'Owner login updated: ' . $own['email']; }
                else { $pdo->prepare("INSERT INTO wx_users (name,email,role,pass_hash,active,pw_ver,created_at) VALUES (?,?,'owner',?,1,1,NOW())")->execute(array($own['name'], $own['email'], $hash)); $log[] = 'Owner login created: ' . $own['email']; }
                $login = $own['email'];
            } elseif ($users === 0) { throw new Exception('New site: fill in the Owner account (name, email, password 8+) so you have a login. Tables are ready; press Install again.');
            } else { $log[] = 'Existing logins kept (' . $users . ' users, passwords unchanged)'; $login = ''; }
            $tables = $pdo->query("SHOW TABLES LIKE 'wx\\_%'")->fetchAll(PDO::FETCH_COLUMN);
            $log[] = $n . ' SQL statements run · ' . count($tables) . ' tables ready';
            if (!is_dir($priv)) @mkdir($priv, 0755, true);
            if (!is_file($priv . '/.htaccess')) @file_put_contents($priv . '/.htaccess', "Require all denied\nDeny from all\n");
            if (@file_put_contents($dbf, json_encode($in, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) throw new Exception('Could not write _private/db.json. In File Manager set the _private folder permission to 755.');
            @unlink($lockf);
            $log[] = 'Saved _private/db.json';
            $done = true;
        } catch (Throwable $e) {
            $m = $e->getMessage();
            $err = (stripos($m, 'Unknown database') !== false) ? 'This database does not exist. hPanel → Databases → create it: name woodex, user woodex, any password → then come back.' : ((stripos($m, 'Access denied') !== false) ? 'Database name, user or password is wrong. Check hPanel → Databases → MySQL (you can reset the password there).' : preg_replace('~\(using password: \w+\)~', '', $m));
        }
    }
}
$h = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Woodex P22 installer</title>
<style>body{font:15px/1.55 system-ui,Segoe UI,sans-serif;background:#0c1628;margin:0;padding:24px;color:#101828}main{max-width:620px;margin:auto;background:#fff;border-radius:16px;padding:28px}
h1{margin:0 0 4px}label{display:block;margin:12px 0 0;font-weight:600}input{font:inherit;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;margin-top:4px}
button,.btn{display:inline-block;font:inherit;font-weight:700;border:0;border-radius:10px;padding:12px 18px;margin-top:18px;background:#b8956a;color:#0c1628;cursor:pointer;text-decoration:none}
.ok{background:#ecfdf3;color:#067647;padding:14px;border-radius:10px}.err{background:#fef3f2;color:#b42318;padding:12px;border-radius:10px;font-weight:600;margin-top:10px}.m{color:#667085;font-size:13px}code{background:#f4efe7;padding:2px 7px;border-radius:6px}</style></head><body><main>
<h1>Woodex P22 installer</h1><p class="m">Connects the website to your database, creates all tables and the admin login. Your existing data is kept.</p>
<?php if ($done): ?>
<div class="ok"><b>Installed.</b><br><?php echo implode('<br>', array_map($h, $log)); ?></div>
<p><b>Sign in:</b> <?php echo $login === 'admin' ? 'email <code>admin</code> · password <code>admin</code> (change it at once)' : ($login !== '' ? 'email <code>' . $h($login) . '</code> with the password you just chose' : 'with your existing login'); ?></p>
<a class="btn" href="/admin/">Open admin →</a><script>setTimeout(function(){location.href="/admin/"},4000)</script>
<p class="m">Next: change the password in <b>My security</b>, then delete <code>wx-install.php</code> in File Manager.</p>
<?php else: ?>
<?php if ($err) echo '<div class="err">' . $h($err) . '</div>'; if ($locked) echo '<div class="err">Too many wrong tries. Wait 15 minutes.</div>'; ?>
<form method="post" autocomplete="off">
<label>Database host<input name="host" value="<?php echo $h($v['host']); ?>"></label>
<label>Database name<input name="name" value="<?php echo $h($v['name']); ?>" required></label>
<label>Database user<input name="user" value="<?php echo $h($v['user']); ?>" required></label>
<label>Database password <span class="m">(hPanel → Databases → MySQL)</span><input type="password" name="pass" required autofocus></label>
<h3 style="margin:22px 0 0">Owner account <span class="m">(your admin login)</span></h3>
<p class="m" style="margin:4px 0 0">Fill in to create your own login. Required on a new site. On an existing site leave empty to keep current logins.</p>
<label>Your name<input name="oname" value="<?php echo $h($_POST['oname'] ?? ''); ?>"></label>
<label>Email<input type="email" name="oemail" value="<?php echo $h($_POST['oemail'] ?? ''); ?>"></label>
<label>Password <span class="m">(8+ characters)</span><input type="password" name="opass" minlength="8" autocomplete="new-password"></label>
<button>Install</button></form>
<?php endif; ?>
</main></body></html>
