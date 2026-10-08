<?php
/* Woodex P22: demo logins for testing.
   Open https://woodex.com.pk/wx-demo.php → enter your DATABASE password (proves you own the site) → Create.
   Creates or resets 4 demo users (Owner, Admin, Sales, Editor) in your existing database. Your data is kept.
   Demo logins stop working automatically after 7 days. Remove them, and delete this file, when testing is done.
   Works on PHP 7.4+. */
error_reporting(E_ALL); ini_set('display_errors', '0');
header('Content-Type: text/html; charset=utf-8'); header('X-Robots-Tag: noindex'); header('Cache-Control: no-store');
$root = dirname(__FILE__); $priv = $root . '/_private';
const DEMO_PASS = 'Demo@Woodex2026';
$DEMO = array(
    array('owner',  'Demo Owner',  'owner@demo.woodex.pk'),
    array('admin',  'Demo Admin',  'admin@demo.woodex.pk'),
    array('sales',  'Demo Sales',  'sales@demo.woodex.pk'),
    array('editor', 'Demo Editor', 'editor@demo.woodex.pk'),
);
$msg = ''; $ok = false; $err = '';
$db = is_file($priv . '/db.json') ? json_decode((string)file_get_contents($priv . '/db.json'), true) : null;
// simple brute-force brake: 5 wrong passwords → 15 min lock
$lockf = $priv . '/demo-lock.json'; $lock = is_file($lockf) ? (json_decode((string)file_get_contents($lockf), true) ?: array()) : array();
$locked = !empty($lock['until']) && $lock['until'] > time();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && is_array($db) && !$locked) {
    $given = (string)(isset($_POST['dbpass']) ? $_POST['dbpass'] : '');
    if (!hash_equals((string)$db['pass'], $given)) {
        $lock['n'] = (isset($lock['n']) ? $lock['n'] : 0) + 1; if ($lock['n'] >= 5) { $lock = array('n' => 0, 'until' => time() + 900); }
        @file_put_contents($lockf, json_encode($lock)); usleep(600000); $err = 'Database password is wrong.';
    } else {
        @unlink($lockf);
        try {
            $pdo = new PDO('mysql:host=' . (!empty($db['host']) ? $db['host'] : 'localhost') . ';dbname=' . $db['name'] . ';charset=utf8mb4', $db['user'], $db['pass'], array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
            $has = $pdo->query("SHOW TABLES LIKE 'wx_users'")->fetchColumn();
            if (!$has) throw new Exception('The wx_users table does not exist yet. Open /admin/ and complete Setup first.');
            $act = isset($_POST['act']) ? $_POST['act'] : 'create';
            if ($act === 'remove') {
                $n = $pdo->exec("DELETE FROM wx_users WHERE email LIKE '%@demo.woodex.pk'");
                @unlink($priv . '/demo.json'); $ok = true; $msg = $n . ' demo account(s) removed.';
            } else {
                $h = password_hash(DEMO_PASS, PASSWORD_DEFAULT); $now = date('Y-m-d H:i:s');
                foreach ($DEMO as $d) {
                    $id = $pdo->prepare('SELECT id FROM wx_users WHERE email=?'); $id->execute(array($d[2])); $id = $id->fetchColumn();
                    if ($id) $pdo->prepare('UPDATE wx_users SET name=?, role=?, pass_hash=?, active=1, pw_ver=pw_ver+1 WHERE id=?')->execute(array($d[1], $d[0], $h, $id));
                    else $pdo->prepare('INSERT INTO wx_users (name,email,role,pass_hash,active,pw_ver,created_at) VALUES (?,?,?,?,1,1,?)')->execute(array($d[1], $d[2], $d[0], $h, $now));
                }
                @file_put_contents($priv . '/demo.json', json_encode(array('until' => time() + 7 * 86400, 'created' => $now)), LOCK_EX);
                $ok = true; $msg = 'Demo accounts are ready. They work until ' . date('j M Y, H:i', time() + 7 * 86400) . ' (server time).';
            }
        } catch (Exception $e) { $err = preg_replace('~\(using password: \w+\)~', '', $e->getMessage()); }
    }
}
$demoOn = is_file($priv . '/demo.json') ? json_decode((string)file_get_contents($priv . '/demo.json'), true) : null;
$e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Woodex demo logins</title>
<style>body{font:15px/1.55 system-ui,Segoe UI,sans-serif;background:#0c1628;color:#101828;margin:0;padding:24px}main{max-width:720px;margin:auto;background:#fff;border-radius:16px;padding:26px}
h1{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #e4e7ec;padding:9px 10px;text-align:left}th{background:#f4efe7}
input{font:inherit;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;width:100%;box-sizing:border-box}button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 16px;cursor:pointer}
.pri{background:#0c1628;color:#fff}.gold{background:#b8956a;color:#0c1628}.red{background:#fef3f2;color:#b42318}.ok{background:#ecfdf3;color:#067647;padding:12px;border-radius:10px;font-weight:600}.err{background:#fef3f2;color:#b42318;padding:12px;border-radius:10px;font-weight:600}
code{background:#f4efe7;padding:2px 7px;border-radius:6px}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.m{color:#667085;font-size:13px}</style></head><body><main>
<h1>Woodex demo logins (P22)</h1>
<p class="m">For testing only. Demo logins stop working after 7 days. Remove them and delete this file when you are done.</p>
<?php if (!is_array($db)): ?><div class="err">The site is not set up yet. Open <a href="/admin/">/admin/</a> and complete Setup first, then come back here.</div>
<?php else: ?>
<?php if ($msg) echo '<div class="ok">' . $e($msg) . '</div>'; if ($err) echo '<div class="err">' . $e($err) . '</div>'; if ($locked) echo '<div class="err">Too many wrong passwords. Try again in 15 minutes.</div>'; ?>
<table><tr><th>Role</th><th>Email (login)</th><th>Password</th></tr>
<?php foreach ($DEMO as $d) echo '<tr><td>' . ucfirst($d[0]) . '</td><td><code>' . $d[2] . '</code></td><td><code>' . DEMO_PASS . '</code></td></tr>'; ?>
</table>
<p class="m">Status: <?php echo $demoOn && !empty($demoOn['until']) && $demoOn['until'] > time() ? '<b style="color:#067647">active until ' . date('j M Y, H:i', $demoOn['until']) . '</b>' : '<b>not active</b>'; ?> · Sign in at <a href="/admin/">/admin/</a></p>
<form method="post" autocomplete="off"><label><b>Your database password</b> <span class="m">(hPanel → Databases → MySQL; proves you own this site)</span><br><input type="password" name="dbpass" required></label>
<div class="row"><button class="pri" name="act" value="create">Create / reset demo logins (7 days)</button><button class="red" name="act" value="remove" onclick="return confirm('Remove all demo accounts?')">Remove demo accounts</button></div></form>
<?php endif; ?>
<hr style="border:0;border-top:1px solid #e4e7ec;margin:22px 0"><p class="m"><b>After testing:</b> 1) press <i>Remove demo accounts</i> · 2) delete <code>wx-demo.php</code> and <code>wx-check.php</code> in File Manager · 3) sign in with your real Owner account (change its password in My security).</p>
</main></body></html>
