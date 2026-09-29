<?php
/**
 * Copy to config.php (same folder) and fill with YOUR values from hPanel.
 * config.php is created by /install.php automatically if missing.
 * This folder is blocked from the web by .htaccess — values stay private.
 */
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'REPLACE_db_name',
        'user' => 'REPLACE_db_user',
        'pass' => 'REPLACE_db_password',
    ],
    'mail' => [
        // Hostinger mailbox, e.g. info@woodex.com.pk (hPanel → Emails)
        'from' => 'info@woodex.com.pk',
        'host' => 'smtp.hostinger.com',
        'port' => 465,
        'user' => 'info@woodex.com.pk',
        'pass' => 'REPLACE_mailbox_password',
    ],
    'session_name' => 'woodex_cms',
    'backup_keep_days' => 14,
];
