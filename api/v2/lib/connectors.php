<?php
/**
 * api/v2/lib/connectors.php — the studio's connectors and their keys (Integrations screen).
 *
 * v2.1 kept these in `_private/connectors.json` (frontend-v1/api/conn-lib.php): one list of connected services
 * — GitHub, Google Drive, Gmail, Facebook, Instagram and anything the studio adds by hand — each with an account,
 * an address, a note, and a secret that is write-only. That file is still read by the old admin while the
 * strangler runs, so the record shape and the file name are kept exactly.
 *
 * The contract, and what v2.5 decides on top of it:
 *
 *   · **A secret never leaves the server.** `wx_conn_pub()` is the only serialiser, and it reports `hasSecret`
 *     plus the last four characters, which is what v2.1 showed. The tests assert the whole secret appears
 *     nowhere in an answer.
 *   · **Absent means keep, empty means keep, and only `secretClear` deletes.** v2.1 let an empty field erase a
 *     key; a form that wipes a key when somebody fixes a typo in the name is a form that loses the studio's keys.
 *   · **Refused by field, not clipped.** A value too long for its field is a validation error naming the field.
 *   · **Validation is pure.** `wx_conn_clean()` takes the request, the stored record and an id, and returns the
 *     record it would store and the names of the fields that changed. No disk, no clock, no network.
 *
 * What this file does not do: test a connector against its provider, push a backup, or send mail. Those need
 * the network and live credentials, and they stay in v2.1 until the host run. The console says so.
 */

declare(strict_types=1);

/** v2.1's file, in `_private/`. Denied by .htaccess and by a PHP guard, like every store there. */
const WX_CONN_FILE = 'connectors.json';
const WX_CONN_ROLES = ['owner', 'admin'];
const WX_CONN_NAME_MAX = 60;
const WX_CONN_CAT_MAX = 40;
const WX_CONN_ACCOUNT_MAX = 160;
const WX_CONN_URL_MAX = 300;
const WX_CONN_NOTES_MAX = 400;
const WX_CONN_SECRET_MAX = 2000;
const WX_CONN_KEY_MAX = 40;

/** The statuses a connector can carry. v2.1 wrote these strings; the console maps them to tones. */
const WX_CONN_STATUSES = ['connected', 'setup', 'error'];

/** A new connector's id: `c` and ten hex digits, as v2.1 minted them. Not a number, so the route takes `{conn}`. */
function wx_conn_new_id(): string
{
    return 'c' . bin2hex(random_bytes(5));
}

/** The store. `WX_CONN_TEST_FILE` is the one seam here: the real file holds the studio's keys, so tests use a scratch file. */
function wx_conn_store(): JsonStore
{
    $file = defined('WX_CONN_TEST_FILE') ? WX_CONN_TEST_FILE : WX_PRIVATE_DIR . '/' . WX_CONN_FILE;
    return new JsonStore($file, true, 0600);
}

/** The items in the stored file, as records. A file that is missing reads as none, which is not an error. */
function wx_conn_items(array $raw): array
{
    $items = is_array($raw['items'] ?? null) ? $raw['items'] : [];
    return array_values(array_filter($items, static fn($c) => is_array($c) && isset($c['id'])));
}

/**
 * The public shape of one connector. The only serialiser: nothing else may return a record to a browser.
 *
 * @return array<string,mixed>
 */
function wx_conn_pub(array $c): array
{
    $secret = (string) ($c['secret'] ?? '');
    return [
        'id' => (string) ($c['id'] ?? ''),
        'key' => (string) ($c['key'] ?? 'custom'),
        'name' => (string) ($c['name'] ?? ''),
        'cat' => (string) ($c['cat'] ?? 'Custom'),
        'account' => (string) ($c['account'] ?? ''),
        'url' => (string) ($c['url'] ?? ''),
        'notes' => (string) ($c['notes'] ?? ''),
        'on' => !array_key_exists('on', $c) || (bool) $c['on'],
        'status' => in_array($c['status'] ?? '', WX_CONN_STATUSES, true) ? (string) $c['status'] : 'setup',
        'note' => (string) ($c['note'] ?? ''),
        'hasSecret' => $secret !== '',
        /* The last four characters, and only those: what v2.1 showed, so a studio can tell which key is in place. */
        'hint' => $secret !== '' ? mb_substr($secret, -4) : '',
        'added' => (int) ($c['added'] ?? 0),
        'updated' => (int) ($c['updated'] ?? 0),
        'checked' => (int) ($c['checked'] ?? 0),
        'lastPush' => (int) ($c['lastPush'] ?? 0),
        'pushOk' => array_key_exists('pushOk', $c) ? (bool) $c['pushOk'] : null,
    ];
}

/**
 * Validate one save and build the record it would store. Pure.
 *
 * `$prev` is the stored record for `$in['id']`, or null for a new connector. `$id` is the id to store it under
 * (the caller mints a new one). `$now` is the clock, passed in so the function has no hidden inputs.
 *
 * @param array<string,mixed>      $in
 * @param array<string,mixed>|null $prev
 * @return array{0: array<string,mixed>, 1: array<int,string>} the record, and the names of the fields that changed
 */
function wx_conn_clean(array $in, ?array $prev, string $id, int $now): array
{
    /* A field the request does not carry keeps what is stored: a save that changes only the notes must not need the name again. */
    $nameIn = array_key_exists('name', $in) ? (string) $in['name'] : (string) ($prev['name'] ?? '');
    $name = wx_v_string(strip_tags($nameIn), 'name', 1, WX_CONN_NAME_MAX);

    $keyRaw = strtolower(trim((string) ($in['key'] ?? ($prev['key'] ?? 'custom'))));
    $key = preg_replace('~[^a-z0-9_-]~', '', $keyRaw) ?? '';
    if ($key === '') {
        $key = 'custom';
    }
    if (strlen($key) > WX_CONN_KEY_MAX) {
        throw ApiError::validation('The key is too long', 'key');
    }

    $cat = wx_conn_opt($in, 'cat', WX_CONN_CAT_MAX, (string) ($prev['cat'] ?? 'Custom'));
    $account = wx_conn_opt($in, 'account', WX_CONN_ACCOUNT_MAX, (string) ($prev['account'] ?? ''));
    $notes = wx_conn_opt($in, 'notes', WX_CONN_NOTES_MAX, (string) ($prev['notes'] ?? ''));

    $url = array_key_exists('url', $in) ? trim((string) $in['url']) : (string) ($prev['url'] ?? '');
    if ($url !== '') {
        if (strlen($url) > WX_CONN_URL_MAX) {
            throw ApiError::validation('The address is too long', 'url');
        }
        if (!preg_match('~^https?://[^\s<>"]+$~i', $url)) {
            throw ApiError::validation('The address must start with https://', 'url');
        }
    }

    /* `on` absent means keep; a new connector starts on. */
    $on = array_key_exists('on', $in) ? (bool) $in['on'] : (!array_key_exists('on', $prev ?? []) || (bool) $prev['on']);

    /* The secret: absent, empty or spaces means keep; `secretClear` is the only way to erase it. */
    $secret = (string) ($prev['secret'] ?? '');
    $changed = [];
    if (!empty($in['secretClear'])) {
        if ($secret !== '') {
            $changed[] = 'secret';
        }
        $secret = '';
    } elseif (array_key_exists('secret', $in) && trim((string) $in['secret']) !== '') {
        $incoming = trim((string) $in['secret']);
        if (mb_strlen($incoming) > WX_CONN_SECRET_MAX) {
            throw ApiError::validation('The key is too long — check you pasted only the key', 'secret');
        }
        if ($incoming !== $secret) {
            $changed[] = 'secret';
        }
        $secret = $incoming;
    }

    $record = [
        'id' => $id,
        'key' => $key,
        'name' => $name,
        'cat' => $cat,
        'account' => $account,
        'url' => $url,
        'notes' => $notes,
        'on' => $on,
        'added' => (int) ($prev['added'] ?? $now),
        'updated' => $now,
    ];
    if ($secret !== '') {
        $record['secret'] = $secret;
    }
    /* Carry what a previous check or push left behind, so a save does not erase the last result. */
    foreach (['note', 'checked', 'lastPush', 'pushOk', 'status'] as $k) {
        if (array_key_exists($k, $prev ?? [])) {
            $record[$k] = $prev[$k];
        }
    }
    /* The status is derived from what is stored, as v2.1 derived it: a key or an account makes it connected. */
    $record['status'] = ($secret !== '' || $account !== '') ? 'connected' : 'setup';

    foreach (['name', 'key', 'cat', 'account', 'url', 'notes', 'on'] as $f) {
        $before = $prev[$f] ?? null;
        if ($prev === null || $before !== $record[$f]) {
            $changed[] = $f;
        }
    }
    return [$record, array_values(array_unique($changed))];
}

/** An optional text field: absent keeps the stored value, present (even empty) replaces it. Pure. */
function wx_conn_opt(array $in, string $field, int $max, string $keep): string
{
    if (!array_key_exists($field, $in)) {
        return $keep;
    }
    $s = trim(strip_tags((string) $in[$field]));
    if (mb_strlen($s) > $max) {
        throw ApiError::validation("The {$field} is too long (maximum {$max} characters)", $field);
    }
    return $s;
}

/**
 * The Integrations screen's read: every connector, masked, with the counts the screen states. The counts are
 * computed here, once, so the screen never adds them up.
 *
 * @return array<string,mixed>
 */
function wx_conn_state(): array
{
    $store = wx_conn_store();
    $items = array_map('wx_conn_pub', wx_conn_items($store->read()));
    $counts = ['total' => count($items), 'connected' => 0, 'setup' => 0, 'error' => 0, 'off' => 0];
    foreach ($items as $c) {
        $counts[$c['status']]++;
        if (!$c['on']) {
            $counts['off']++;
        }
    }
    return [
        'items' => $items,
        'counts' => $counts,
        'file' => WX_CONN_FILE,
        'exists' => is_file($store->path()),
        /* What this server can and cannot do from here. A connector test or a backup push is not run on this
           side yet, and the screen must say so rather than show a green tick nobody earned. */
        'server' => ['curl' => function_exists('curl_init'), 'live' => false],
    ];
}

/**
 * Save one connector. Returns the public record and the fields that changed (for the audit row). Writes
 * through the atomic store, so a save cannot leave the file half written.
 *
 * @param array<string,mixed> $in
 * @return array{0: array<string,mixed>, 1: array<int,string>}
 */
function wx_conn_save(array $in): array
{
    $saved = null;
    $changed = [];
    $id = trim((string) ($in['id'] ?? ''));
    $now = time();
    wx_conn_store()->update(static function (array $raw) use ($in, $id, $now, &$saved, &$changed): array {
        $items = wx_conn_items($raw);
        $at = -1;
        $prev = null;
        if ($id !== '') {
            foreach ($items as $i => $c) {
                if ((string) $c['id'] === $id) {
                    $at = $i;
                    $prev = $c;
                    break;
                }
            }
            if ($at < 0) {
                throw ApiError::notFound('That connector is not on the list any more');
            }
        }
        [$record, $changed] = wx_conn_clean($in, $prev, $id !== '' ? $id : wx_conn_new_id(), $now);
        if ($at >= 0) {
            $items[$at] = $record;
        } else {
            $items[] = $record;
        }
        $saved = $record;
        $raw['items'] = array_values($items);
        return $raw;
    });
    return [wx_conn_pub($saved ?? []), $changed];
}

/**
 * Remove one connector. The record is returned as the public shape so the audit row can name it. Idempotence is
 * not offered: deleting a connector twice says it is not on the list, because a second click is a different fact.
 *
 * @return array{0: array<string,mixed>}
 */
function wx_conn_delete(string $id): array
{
    $gone = null;
    wx_conn_store()->update(static function (array $raw) use ($id, &$gone): array {
        $items = wx_conn_items($raw);
        $kept = [];
        foreach ($items as $c) {
            if ((string) $c['id'] === $id && $gone === null) {
                $gone = $c;
                continue;
            }
            $kept[] = $c;
        }
        if ($gone === null) {
            throw ApiError::notFound('That connector is not on the list any more');
        }
        $raw['items'] = $kept;
        return $raw;
    });
    return [wx_conn_pub($gone)];
}
