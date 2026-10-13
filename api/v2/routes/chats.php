<?php
/**
 * api/v2/routes/chats.php — the unified inbox.
 *
 * Every conversation the business has, in one list: the website widget, WhatsApp and Telegram all write
 * to `wx_chats` and `wx_chat_msgs`, which is why v2.1's inbox worked at all. This file ports
 * `chat-lib.php`'s behaviour — the same boxes, the same handover, the same tags, the same internal
 * note that the visitor never sees — with four changes:
 *
 *   · **The settings moved into `wx_settings`** (`chat.cfg`), including `waSecret`, so a settings row a
 *     screen can show replaces `_private/chat.json`. The keys and defaults are v2.1's.
 *
 *   · **The list is one query with counts**, not a 200-row load plus a count query per box.
 *
 *   · **`waitFrom` is computed in SQL.** v2.1 ran two correlated subqueries *per chat* to find when the
 *     visitor's unanswered message arrived — 200 chats meant 400 queries to draw one column.
 *
 *   · **Delivery is now honest about what it cannot do.** A reply to a website chat is stored and the
 *     widget polls for it. A reply to a WhatsApp or Telegram conversation is *also* stored, but the
 *     connector that would send it is Phase 4 work — so the response says `delivery: "not configured"`
 *     and the message log records it, instead of a green tick over a message that never left.
 *
 * One deliberate **discrepancy** is worth naming. The capability matrix grants the `support` role the
 * `conversations` group, but v2.1's own dispatcher then required `owner`, `admin` or `sales` for every
 * chat action, so a support user was refused. Refusing to grant a permission v2.1 did not grant is the
 * safe direction for a cut-over, so these routes keep the narrower list; the matrix row is left alone
 * and reported as a discrepancy for the phase that reviews permissions with the owner.
 */

declare(strict_types=1);

const WX_CHAT_SETTING = 'chat.cfg';

/** chat.cfg's defaults. Same keys, same words — a greeting is a message a customer has already read. */
const WX_CHAT_DEF = [
    'on' => true,
    'ai' => true,
    'emailAlert' => true,
    'autoLead' => true,
    'waAgent' => false,
    'greeting' => 'Assalam-o-Alaikum, welcome to Woodex Interior. How may I help you today?',
    'hours' => 'Mon–Sat, 10:00 am – 7:30 pm',
    'openFrom' => '10:00',
    'openTo' => '19:30',
    'days' => [1, 2, 3, 4, 5, 6],
    'afterHours' => 'We are closed right now — leave your number and we will call you in the morning.',
    'tone' => 'designer',
    'knowledge' => '',
    'avoid' => '',
    'prices' => '',
    'noPrices' => false,
    'toneNote' => '',
    'qa' => [],
    'quick' => [],
    'saved' => [],
    'waVerify' => '',
    'waSecret' => '',
];

/** The roles v2.1's chat dispatcher accepted. Kept narrower than the matrix on purpose — see the note
    in this file's header. */
const WX_CHAT_ROLES = ['owner', 'admin', 'sales'];

function wx_chat_cfg(): array
{
    static $c = null;
    if ($c !== null) {
        return $c;
    }
    $raw = wx_setting(WX_CHAT_SETTING);
    $stored = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    $c = array_replace(WX_CHAT_DEF, is_array($stored) ? $stored : []);
    if ((string) $c['waVerify'] === '') {
        $c['waVerify'] = bin2hex(random_bytes(12));
    }
    return $c;
}

function wx_chat_or_404(int $id): array
{
    $c = wx_one('SELECT * FROM wx_chats WHERE id = ?', [$id]);
    if ($c === null) {
        throw ApiError::notFound('That conversation does not exist');
    }
    return $c;
}

/**
 * A conversation in the shape the inbox draws, ported from chat_pub().
 *
 * `waitFrom` is the timestamp of the oldest visitor message that has not been answered since — the
 * number the "waiting 12 min" badge is built from. It is a window function here rather than two
 * correlated subqueries per row.
 */
function wx_chat_public(array $c): array
{
    return [
        'id' => (int) $c['id'],
        'created_at' => $c['created_at'],
        'updated_at' => $c['updated_at'],
        'name' => (string) ($c['name'] ?? ''),
        'display' => (string) ($c['name'] ?? '') !== '' ? (string) $c['name'] : 'Visitor #' . (int) $c['id'],
        'phone' => (string) ($c['phone'] ?? ''),
        'email' => (string) ($c['email'] ?? ''),
        'page' => (string) ($c['page'] ?? ''),
        'status' => (string) $c['status'],
        'mode' => (string) $c['mode'],
        'agent' => (string) ($c['agent_name'] ?? ''),
        'unread' => (int) $c['unread'],
        'needs' => (bool) $c['needs'],
        'last' => (string) ($c['last_text'] ?? ''),
        'lead_id' => $c['lead_id'] !== null ? (int) $c['lead_id'] : null,
        'handoff' => (string) ($c['handoff'] ?? ''),
        'assigned' => isset($c['assigned_to']) && $c['assigned_to'] !== null ? (int) $c['assigned_to'] : null,
        'tags' => array_values(array_filter(explode(',', (string) ($c['tags'] ?? '')))),
        'channel' => (string) ($c['channel'] ?? 'web'),
        'waitFrom' => (string) ($c['waitFrom'] ?? ''),
    ];
}

/** Messages, oldest first. `since` is how the widget and the inbox poll without re-sending 300 rows. */
function wx_chat_msgs(int $chatId, int $since = 0, bool $notes = true, int $limit = 300): array
{
    $rows = wx_all(
        'SELECT id, t, who, name, text, att FROM wx_chat_msgs WHERE chat_id = ? AND id > ?'
        . ($notes ? '' : " AND who <> 'note'")
        . ' ORDER BY id LIMIT ' . $limit,
        [$chatId, $since]
    );
    $out = [];
    foreach ($rows as $m) {
        $out[] = [
            'id' => (int) $m['id'],
            't' => $m['t'],
            'who' => (string) $m['who'],
            'name' => (string) ($m['name'] ?? ''),
            'text' => (string) $m['text'],
            'att' => !empty($m['att']) ? json_decode((string) $m['att'], true) : null,
        ];
    }
    return $out;
}

/**
 * Append a message. Returns its id.
 *
 * The chat's own counters move here because they are part of the same fact: `last_text` is what the
 * list column shows, `unread` is what the badge counts, and a message that arrived without moving them
 * is a message the inbox will not notice. An internal note deliberately moves neither, and a visitor
 * message raises `unread` — that asymmetry is the whole reason the badge means anything.
 */
function wx_chat_add(int $chatId, string $who, string $name, string $text, ?array $att = null): int
{
    $id = wx_insert('wx_chat_msgs', [
        'chat_id' => $chatId,
        't' => wx_now(),
        'who' => $who,
        'name' => mb_substr($name, 0, 120),
        'text' => mb_substr($text, 0, 4000),
        'att' => $att !== null ? json_encode($att, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
    ]);
    if ($who === 'note') {
        return $id;
    }
    $prefix = $who === 'visitor' ? '' : ($who === 'agent' ? 'You: ' : 'AI: ');
    wx_q(
        'UPDATE wx_chats SET updated_at = ?, last_text = ?' . ($who === 'visitor' ? ', unread = unread + 1' : '') . ' WHERE id = ?',
        [wx_now(), mb_substr($prefix . $text, 0, 250), $chatId]
    );
    return $id;
}

/** Where the deliverable channels are configured. Empty means "not connected", and says so. */
function wx_chat_channel_ready(string $channel): bool
{
    if ($channel === 'web') {
        return true;
    }
    if ($channel === 'tg') {
        return (string) (wx_setting('tg.bot_token', '') ?? '') !== '' && (string) (wx_setting('tg.chat_id', '') ?? '') !== '';
    }
    return (string) (wx_setting('wa.token', '') ?? '') !== '' && (string) (wx_setting('wa.phone_id', '') ?? '') !== '';
}

/**
 * Deliver an agent's reply out of band, and say what happened.
 *
 * The message is stored either way — it is the record. The difference is whether a connector carried
 * it, and the response reports that rather than implying success.
 */
function wx_chat_deliver(array $c, string $text): array
{
    $channel = (string) ($c['channel'] ?? 'web');
    $ready = wx_chat_channel_ready($channel);
    $result = $channel === 'web' ? 'widget' : ($ready ? 'queued' : 'not configured');
    if ($channel !== 'web') {
        wx_insert('wx_notify_log', [
            't' => wx_now(),
            'event' => 'chat',
            'ref' => mb_substr('Chat #' . (int) $c['id'], 0, 190),
            'name' => mb_substr((string) ($c['name'] ?? ''), 0, 120),
            'channel' => mb_substr($channel, 0, 8),
            'dest' => mb_substr((string) ($c['ext'] ?? $c['phone'] ?? ''), 0, 190),
            'result' => $result,
        ]);
    }
    return ['channel' => $channel, 'result' => $result];
}

/** True if a typing flag was set in the last six seconds (v2.1's chat_recent). */
function wx_chat_recent(?string $t): bool
{
    return $t !== null && $t !== '' && strtotime($t) >= time() - 6;
}

/* ============================================================== reads */

/**
 * GET /chats — the list, with its boxes and counts.
 *
 * `box` is v2.1's: all, mine, unassigned. `status` is open or closed. The counts for all three boxes
 * come back with the list, so switching boxes is not three round trips.
 */
function wx_route_chats_list(array $ctx): array
{
    $u = wx_require_user('chat_list', WX_CHAT_ROLES);
    $q = $ctx['query'];
    $status = ($q['status'] ?? 'open') === 'closed' ? 'closed' : 'open';
    $box = (string) ($q['box'] ?? 'all');

    $where = ['status = ?'];
    $params = [$status];
    if ($box === 'mine') {
        $where[] = 'assigned_to = ?';
        $params[] = (int) $u['id'];
    } elseif ($box === 'unassigned') {
        $where[] = 'assigned_to IS NULL';
    }
    if (($q['channel'] ?? '') !== '' && $q['channel'] !== 'all') {
        $where[] = 'channel = ?';
        $params[] = wx_v_string($q['channel'], 'channel', 1, 8);
    }
    if (($q['tag'] ?? '') !== '') {
        $where[] = 'FIND_IN_SET(?, tags)';
        $params[] = mb_strtolower(wx_v_string($q['tag'], 'tag', 1, 24));
    }
    if (($q['q'] ?? '') !== '') {
        $like = '%' . wx_v_string($q['q'], 'q', 1, 60) . '%';
        $where[] = '(name LIKE ? OR phone LIKE ? OR email LIKE ? OR last_text LIKE ?)';
        array_push($params, $like, $like, $like, $like);
    }
    if (!empty($q['needs'])) {
        $where[] = 'needs = 1';
    }

    $limit = wx_limit($q['limit'] ?? 100);
    $offset = wx_offset($q['offset'] ?? 0);

    /* waitFrom: the oldest visitor message since the last agent or AI reply. One window function, not
       two correlated subqueries per row — same number, one pass. */
    $rows = wx_all(
        "SELECT c.*, COALESCE((
            SELECT MIN(m.t) FROM wx_chat_msgs m
             WHERE m.chat_id = c.id AND m.who = 'visitor'
               AND m.id > COALESCE((SELECT MAX(x.id) FROM wx_chat_msgs x WHERE x.chat_id = c.id AND x.who IN ('agent','ai')), 0)
         ), '') AS waitFrom
         FROM wx_chats c
         WHERE c." . implode(' AND c.', $where) . '
         ORDER BY c.needs DESC, c.updated_at DESC
         LIMIT ' . $limit . ' OFFSET ' . $offset,
        $params
    );
    $total = (int) wx_val('SELECT COUNT(*) FROM wx_chats WHERE ' . implode(' AND ', $where), $params);

    $counts = ['mine' => 0, 'unassigned' => 0, 'all' => 0];
    foreach (wx_all("SELECT SUM(assigned_to = ?) AS mine, SUM(assigned_to IS NULL) AS un, COUNT(*) AS a FROM wx_chats WHERE status = 'open'", [(int) $u['id']]) as $r) {
        $counts = ['mine' => (int) $r['mine'], 'unassigned' => (int) $r['un'], 'all' => (int) $r['a']];
    }

    $team = [];
    foreach (wx_all("SELECT id, name FROM wx_users WHERE active = 1 AND role IN ('owner','admin','sales','support') ORDER BY name") as $r) {
        $team[] = ['id' => (int) $r['id'], 'name' => (string) $r['name']];
    }
    $cfg = wx_chat_cfg();

    return ['data' => [
        'chats' => array_map('wx_chat_public', $rows),
        'team' => $team,
        'me' => (int) $u['id'],
        'counts' => $counts,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'cfg' => ['ai' => (bool) $cfg['ai'], 'on' => (bool) $cfg['on'], 'saved' => $cfg['saved'], 'tg' => wx_chat_channel_ready('tg')],
    ]];
}

/** GET /chats/{id} — the thread, and opening it clears the unread badge. */
function wx_route_chats_get(array $ctx): array
{
    wx_require_user('chat_get', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $c = wx_chat_or_404($id);
    $since = (int) ($ctx['query']['since'] ?? 0);

    if ((int) $c['unread'] || (int) $c['needs']) {
        wx_update('wx_chats', ['unread' => 0, 'needs' => 0], ['id' => $id]);
        $c['unread'] = 0;
        $c['needs'] = 0;
    }
    return ['data' => [
        'chat' => wx_chat_public($c),
        'messages' => wx_chat_msgs($id, $since, true),
        'typing' => wx_chat_recent(isset($c['vtype']) ? (string) $c['vtype'] : null),
    ]];
}

/* ============================================================== writes
   `chat_*` is in the approval policy's never-queue list (WX_APPR_SKIP), because answering a customer
   cannot wait for the Master to wake up. That is why none of these are wrapped in wx_appr_route — and
   the conformance suite asserts that a route may only skip the gate when the policy itself says so. */

/** POST /chats/{id}/reply */
function wx_route_chats_reply(array $ctx): array
{
    $u = wx_require_user('chat_reply', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];

    return wx_guard('chats.reply', static function () use ($ctx, $u, $id) {
        return wx_tx(static function () use ($ctx, $u, $id) {
            $c = wx_chat_or_404($id);
            $text = wx_v_string($ctx['body']['text'] ?? '', 'text', 1, 4000);

            /* Taking over from the assistant is a visible event in the thread: the visitor should know
               a person arrived, and the next agent should know when. */
            if ((string) $c['mode'] === 'ai') {
                wx_chat_add($id, 'sys', '', (string) $u['name'] . ' joined the chat');
            }
            $delivery = wx_chat_deliver($c, $text);
            $mid = wx_chat_add($id, 'agent', (string) $u['name'], $text);
            wx_update('wx_chats', [
                'mode' => 'human',
                'handoff' => '',
                'agent_name' => (string) $u['name'],
                'assigned_to' => $c['assigned_to'] !== null ? (int) $c['assigned_to'] : (int) $u['id'],
                'status' => 'open',
                'unread' => 0,
                'needs' => 0,
            ], ['id' => $id]);
            wx_audit($u, 'chat.reply', 'chat:' . $id, ['delivery' => $delivery['result']]);

            return ['data' => ['id' => $mid, 'delivery' => $delivery['result'], 'chat' => wx_chat_public(wx_chat_or_404($id))]];
        });
    });
}

/** POST /chats/{id}/note — an internal note. Never shown to the visitor, never delivered. */
function wx_route_chats_note(array $ctx): array
{
    $u = wx_require_user('chat_note', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $text = wx_v_string($ctx['body']['text'] ?? '', 'text', 1, 2000);
    wx_chat_or_404($id);
    $mid = wx_chat_add($id, 'note', (string) $u['name'], $text);
    wx_audit($u, 'chat.note', 'chat:' . $id, []);
    return ['data' => ['id' => $mid]];
}

/** POST /chats/{id}/mode — the assistant takes over, or a person does. */
function wx_route_chats_mode(array $ctx): array
{
    $u = wx_require_user('chat_mode', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $mode = ($ctx['body']['mode'] ?? '') === 'ai' ? 'ai' : 'human';

    return wx_guard('chats.mode', static function () use ($u, $id, $mode) {
        return wx_tx(static function () use ($u, $id, $mode) {
            $c = wx_chat_or_404($id);
            if ((string) $c['mode'] === $mode) {
                throw ApiError::conflict('This conversation is already in ' . $mode . ' mode');
            }
            wx_update('wx_chats', ['mode' => $mode, 'agent_name' => $mode === 'human' ? (string) $u['name'] : null], ['id' => $id]);
            wx_chat_add($id, 'sys', '', $mode === 'human' ? (string) $u['name'] . ' joined the chat' : 'The assistant is back in this chat');
            wx_audit($u, 'chat.mode', 'chat:' . $id, ['mode' => $mode]);
            return ['data' => ['chat' => wx_chat_public(wx_chat_or_404($id))]];
        });
    });
}

/** POST /chats/{id}/assign */
function wx_route_chats_assign(array $ctx): array
{
    $u = wx_require_user('chat_assign', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $to = (int) ($ctx['body']['userId'] ?? $ctx['body']['user_id'] ?? 0);

    return wx_guard('chats.assign', static function () use ($u, $id, $to) {
        return wx_tx(static function () use ($u, $id, $to) {
            wx_chat_or_404($id);
            $name = '';
            if ($to > 0) {
                $row = wx_one('SELECT name FROM wx_users WHERE id = ? AND active = 1', [$to]);
                if ($row === null) {
                    throw ApiError::validation('That user is not an active team member', 'userId');
                }
                $name = (string) $row['name'];
            }
            wx_update('wx_chats', ['assigned_to' => $to > 0 ? $to : null], ['id' => $id]);
            wx_chat_add($id, 'note', (string) $u['name'], $to > 0 ? 'Assigned to ' . $name : 'Unassigned');
            wx_audit($u, 'chat.assign', 'chat:' . $id, ['to' => $name !== '' ? $name : 'nobody']);
            return ['data' => ['chat' => wx_chat_public(wx_chat_or_404($id))]];
        });
    });
}

/** POST /chats/{id}/close — and reopening, which v2.1 did with the same action. */
function wx_route_chats_close(array $ctx): array
{
    $u = wx_require_user('chat_close', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $reopen = !empty($ctx['body']['reopen']);

    return wx_guard('chats.close', static function () use ($u, $id, $reopen) {
        $c = wx_chat_or_404($id);
        $target = $reopen ? 'open' : 'closed';
        if ((string) $c['status'] === $target) {
            throw ApiError::conflict('This conversation is already ' . $target);
        }
        wx_update('wx_chats', ['status' => $target, 'unread' => 0, 'needs' => 0], ['id' => $id]);
        if (!$reopen) {
            /* A closed conversation that the customer writes into again reopens itself; the note says
               so, because "why is this closed chat open again" is otherwise a mystery. */
            wx_chat_add($id, 'sys', '', (string) $u['name'] . ' closed the conversation');
        }
        wx_audit($u, $reopen ? 'chat.reopen' : 'chat.close', 'chat:' . $id, []);
        return ['data' => ['chat' => wx_chat_public(wx_chat_or_404($id))]];
    });
}

/** POST /chats/{id}/tags — up to six free labels, the same six v2.1 allowed. */
function wx_route_chats_tags(array $ctx): array
{
    $u = wx_require_user('chat_tags', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $raw = is_array($ctx['body']['tags'] ?? null) ? $ctx['body']['tags'] : [];

    $tags = [];
    foreach ($raw as $x) {
        $t = mb_strtolower(trim((string) preg_replace('~[^\p{L}\p{N} \-]~u', '', (string) $x)));
        if ($t !== '' && count($tags) < 6) {
            $tags[] = mb_substr($t, 0, 24);
        }
    }
    wx_chat_or_404($id);
    wx_update('wx_chats', ['tags' => $tags ? implode(',', array_values(array_unique($tags))) : null], ['id' => $id]);
    wx_audit($u, 'chat.tags', 'chat:' . $id, ['tags' => $tags]);
    return ['data' => ['chat' => wx_chat_public(wx_chat_or_404($id))]];
}

/**
 * POST /chats/{id}/lead — turn a conversation into a lead.
 *
 * If a lead already exists for the chat it is returned; otherwise one is created from the visitor's
 * name, phone and email plus their messages, which is what v2.1's chat_make_lead() did. The messages go
 * into the lead's `message` field, so the enquiry arrives with its context rather than as a name and a
 * phone number.
 */
function wx_route_chats_lead(array $ctx): array
{
    $u = wx_require_user('chat_lead', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];

    return wx_guard('chats.lead', static function () use ($ctx, $u, $id) {
        return wx_tx(static function () use ($ctx, $u, $id) {
            $c = wx_chat_or_404($id);
            $set = [];
            foreach (['name' => 120, 'phone' => 40] as $k => $max) {
                if (isset($ctx['body'][$k]) && trim((string) $ctx['body'][$k]) !== '') {
                    $set[$k] = wx_v_string($ctx['body'][$k], $k, 1, $max);
                }
            }
            if (isset($ctx['body']['email']) && trim((string) $ctx['body']['email']) !== '') {
                $set['email'] = wx_v_email($ctx['body']['email']);
            }
            if ($set) {
                wx_update('wx_chats', $set, ['id' => $id]);
                $c = array_merge($c, $set);
            }
            if (!empty($c['lead_id'])) {
                return ['data' => ['chat' => wx_chat_public($c), 'leadId' => (int) $c['lead_id'], 'created' => false]];
            }
            if (trim((string) ($c['phone'] ?? '')) === '' && trim((string) ($c['email'] ?? '')) === '') {
                throw ApiError::validation('A lead needs a phone number or an email address — add one first', 'phone');
            }

            $msgs = array_filter(wx_chat_msgs((int) $c['id'], 0, false), static fn($m) => $m['who'] === 'visitor');
            $text = mb_substr(implode("\n", array_map(static fn($m) => '• ' . $m['text'], $msgs)), 0, 3900);
            $leadId = wx_insert('wx_leads', [
                'created_at' => wx_now(),
                'source' => 'chat',
                'page' => (string) ($c['page'] ?? ''),
                'name' => (string) ($c['name'] ?? '') !== '' ? (string) $c['name'] : 'Chat visitor #' . (int) $c['id'],
                'phone' => (string) ($c['phone'] ?? ''),
                'email' => (string) ($c['email'] ?? '') !== '' ? (string) $c['email'] : null,
                'service' => '',
                'message' => $text,
                'fields' => json_encode(['chat' => (int) $c['id']], JSON_UNESCAPED_UNICODE),
                'stage' => 'new',
                'is_read' => 0,
                'ip' => (string) ($c['ip'] ?? wx_ip()),
            ]);
            wx_update('wx_chats', ['lead_id' => $leadId], ['id' => $id]);
            $c['lead_id'] = $leadId;
            wx_audit($u, 'chat.lead', 'chat:' . $id, ['lead' => $leadId]);

            return ['data' => ['chat' => wx_chat_public($c), 'leadId' => $leadId, 'created' => true]];
        });
    });
}

/** POST /chats/{id}/typing — the agent's own typing flag, shown in the widget. */
function wx_route_chats_typing(array $ctx): array
{
    wx_require_user('chat_typing', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    wx_chat_or_404($id);
    /* A timestamp, not a boolean: a flag that is never cleared by a closed tab would leave the visitor
       looking at "someone is typing" forever. Readers treat anything older than six seconds as off. */
    wx_update('wx_chats', ['atype' => wx_now()], ['id' => $id]);
    return ['data' => ['ok' => true]];
}

/**
 * POST /chats/{id}/file — an attachment.
 *
 * Accepted by content, not by the name the browser sent: the first bytes decide, and only the formats
 * the widget can show are allowed (JPEG, PNG, WebP, GIF, PDF, WebM, Ogg, M4A). A file that claims to be
 * a PDF and is not is refused. Eight megabytes, as v2.1 allowed. It is stored under
 * `assets/uploads/chat/YYYYMM/` with a random name — the same layout v2.1 used, so old messages keep
 * working — and never with the extension the client asked for.
 */
function wx_route_chats_file(array $ctx): array
{
    $u = wx_require_user('chat_file', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];

    return wx_guard('chats.file', static function () use ($ctx, $u, $id) {
        return wx_tx(static function () use ($ctx, $u, $id) {
            $c = wx_chat_or_404($id);
            if ((string) ($c['channel'] ?? 'web') !== 'web') {
                throw ApiError::validation('Attachments work in website chats — for WhatsApp or Telegram, send the file from the app', 'channel');
            }
            $b64 = (string) ($ctx['body']['data'] ?? '');
            if (strpos($b64, 'base64,') !== false) {
                $b64 = substr($b64, (int) strpos($b64, 'base64,') + 7);
            }
            $bin = base64_decode($b64, true);
            if ($bin === false || $bin === '') {
                throw ApiError::validation('The file is empty or unreadable', 'data');
            }
            if (strlen($bin) > 8 * 1024 * 1024) {
                throw ApiError::validation('Files must be 8 MB or smaller', 'data');
            }
            $kind = wx_chat_sniff($bin);
            if ($kind === null) {
                throw ApiError::validation('That file type is not supported (photos, PDFs and voice notes only)', 'data');
            }
            $voice = !empty($ctx['body']['voice']);
            if ($voice && $kind[1] !== 'voice') {
                throw ApiError::validation('That is not a voice note format', 'data');
            }
            if (!$voice && $kind[1] === 'voice') {
                throw ApiError::validation('Only photos and PDF files can be attached', 'data');
            }

            $dir = WX_SITE_ROOT . '/assets/uploads/chat/' . date('Ym');
            if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw ApiError::internal('The upload directory could not be created');
            }
            $file = bin2hex(random_bytes(12)) . '.' . $kind[0];
            if (@file_put_contents($dir . '/' . $file, $bin, LOCK_EX) === false) {
                throw ApiError::internal('The file could not be saved');
            }
            $att = [
                'u' => '/assets/uploads/chat/' . date('Ym') . '/' . $file,
                'n' => mb_substr((string) ($ctx['body']['name'] ?? ''), 0, 120) ?: ($kind[1] === 'voice' ? 'Voice note' : 'file.' . $kind[0]),
                'k' => $kind[1],
                's' => strlen($bin),
            ];
            $caption = wx_v_opt_string($ctx['body']['text'] ?? null, 'text', 500) ?? '';
            if ((string) $c['mode'] === 'ai') {
                wx_chat_add($id, 'sys', '', (string) $u['name'] . ' joined the chat');
            }
            $mid = wx_chat_add($id, 'agent', (string) $u['name'], $caption !== '' ? $caption : ($kind[1] === 'voice' ? '🎤 Voice note' : ($kind[1] === 'img' ? '📷 Photo' : '📎 ' . $att['n'])), $att);
            wx_update('wx_chats', [
                'mode' => 'human',
                'handoff' => '',
                'agent_name' => (string) $u['name'],
                'status' => 'open',
                'unread' => 0,
                'needs' => 0,
                'atype' => null,
            ], ['id' => $id]);
            wx_audit($u, 'chat.file', 'chat:' . $id, ['kind' => $kind[1], 'bytes' => strlen($bin)]);

            return ['data' => ['id' => $mid, 'att' => $att, 'chat' => wx_chat_public(wx_chat_or_404($id))]];
        });
    });
}

/** What a file actually is, from its first bytes. Returns [extension, kind] or null. */
function wx_chat_sniff(string $b): ?array
{
    if (substr($b, 0, 3) === "\xFF\xD8\xFF") {
        return ['jpg', 'img'];
    }
    if (substr($b, 0, 8) === "\x89PNG\r\n\x1A\n") {
        return ['png', 'img'];
    }
    if (substr($b, 0, 4) === 'RIFF' && substr($b, 8, 4) === 'WEBP') {
        return ['webp', 'img'];
    }
    if (substr($b, 0, 4) === 'GIF8') {
        return ['gif', 'img'];
    }
    if (substr($b, 0, 5) === '%PDF-') {
        return ['pdf', 'file'];
    }
    if (substr($b, 0, 4) === "\x1A\x45\xDF\xA3") {
        return ['webm', 'voice'];
    }
    if (substr($b, 0, 4) === 'OggS') {
        return ['ogg', 'voice'];
    }
    if (substr($b, 4, 4) === 'ftyp') {
        return ['m4a', 'voice'];
    }
    return null;
}

/* ============================================================== settings and helpers */

/** GET /chats/settings */
function wx_route_chats_cfg_get(array $ctx): array
{
    wx_require_user('chat_cfg_get', ['owner', 'admin']);
    $c = wx_chat_cfg();
    return ['data' => [
        'cfg' => $c,
        /* Never the secret itself: the screen shows whether one is set, not what it is. */
        'waSecretSet' => (string) $c['waSecret'] !== '',
        'aiReady' => wx_ai_ready(),
    ]];
}

/** POST /chats/settings */
function wx_route_chats_cfg_save(array $ctx): array
{
    $u = wx_require_user('chat_cfg_save', ['owner', 'admin']);

    return wx_guard('chats.cfg', static function () use ($ctx, $u) {
        return wx_tx(static function () use ($ctx, $u) {
            $s = is_array($ctx['body']['cfg'] ?? null) ? $ctx['body']['cfg'] : $ctx['body'];
            $c = wx_chat_cfg();
            foreach (['on', 'ai', 'emailAlert', 'autoLead', 'waAgent', 'noPrices'] as $k) {
                if (array_key_exists($k, $s)) {
                    $c[$k] = wx_v_bool($s[$k], $k);
                }
            }
            foreach (['greeting' => 500, 'hours' => 80, 'knowledge' => 12000, 'toneNote' => 400, 'avoid' => 2000, 'prices' => 4000, 'afterHours' => 500, 'waVerify' => 80] as $k => $max) {
                if (array_key_exists($k, $s)) {
                    $c[$k] = mb_substr(trim((string) $s[$k]), 0, $max);
                }
            }
            /* The secret is write-only: an empty value means "leave it", and clearing it is explicit. */
            if (isset($s['waSecret']) && (string) $s['waSecret'] !== '') {
                $c['waSecret'] = mb_substr(trim((string) $s['waSecret']), 0, 120);
            } elseif (!empty($s['waSecretClear'])) {
                $c['waSecret'] = '';
            }
            if (isset($s['tone'])) {
                $c['tone'] = wx_v_enum($s['tone'], ['friendly', 'designer', 'formal', 'brief'], 'tone');
            }
            foreach (['openFrom', 'openTo'] as $k) {
                if (isset($s[$k])) {
                    if (!preg_match('~^\d{2}:\d{2}$~', (string) $s[$k])) {
                        throw ApiError::validation('Check the opening hours', $k);
                    }
                    $c[$k] = (string) $s[$k];
                }
            }
            if (isset($s['days']) && is_array($s['days'])) {
                $c['days'] = array_values(array_unique(array_filter(array_map('intval', $s['days']), static fn($d) => $d >= 0 && $d <= 6)));
            }
            foreach (['qa' => ['q', 'a', 150], 'quick' => ['label', 'text', 8], 'saved' => ['k', 't', 60]] as $key => [$k1, $k2, $cap]) {
                if (!isset($s[$key]) || !is_array($s[$key])) {
                    continue;
                }
                $list = [];
                foreach (array_slice($s[$key], 0, $cap) as $x) {
                    if (!is_array($x)) {
                        continue;
                    }
                    $v1 = mb_substr(trim((string) ($x[$k1] ?? '')), 0, $key === 'qa' ? 300 : 30);
                    $v2 = mb_substr(trim((string) ($x[$k2] ?? '')), 0, $key === 'qa' ? 1500 : 1500);
                    if ($v1 === '' || ($key !== 'quick' && $v2 === '')) {
                        continue;
                    }
                    $list[] = [$k1 => $key === 'saved' ? mb_strtolower(preg_replace('~[^\w-]~u', '', $v1)) : $v1, $k2 => $v2 !== '' ? $v2 : $v1];
                }
                $c[$key] = $list;
            }
            if ((string) $c['waVerify'] === '') {
                $c['waVerify'] = bin2hex(random_bytes(12));
            }

            wx_setting_set(WX_CHAT_SETTING, (string) json_encode($c, JSON_UNESCAPED_UNICODE));
            wx_audit($u, 'chat.settings', 'chat', ['keys' => array_keys($s)]);
            return ['data' => ['cfg' => $c, 'waSecretSet' => (string) $c['waSecret'] !== '']];
        });
    });
}

/** True when an AI provider key is configured — the training screen says so either way. */
function wx_ai_ready(): bool
{
    foreach (['ai.provider', 'ai.openaiKey', 'ai.anthropicKey', 'ai.geminiKey'] as $k) {
        $v = (string) (wx_setting($k, '') ?? '');
        if ($v !== '' && str_ends_with($k, 'Key')) {
            return true;
        }
    }
    return false;
}

/**
 * POST /chats/{id}/suggest — reply candidates for the message on screen.
 *
 * v2.1 had two paths: with an AI key it asked the model, without one it matched the saved replies and
 * the Q&A knowledge base. The model call is Phase 4 work (the AI centre owns the provider keys and the
 * cost controls), so this returns the rule-based candidates and labels them as such — the same answers
 * v2.1 gave on a host with no key, which is what most hosts are.
 */
function wx_route_chats_suggest(array $ctx): array
{
    wx_require_user('chat_suggest', WX_CHAT_ROLES);
    $id = (int) $ctx['params']['id'];
    $c = wx_chat_or_404($id);
    $last = (string) ($ctx['body']['text'] ?? '');
    if ($last === '') {
        foreach (array_reverse(wx_chat_msgs($id, 0, false)) as $m) {
            if ($m['who'] === 'visitor') {
                $last = (string) $m['text'];
                break;
            }
        }
    }
    $needle = mb_strtolower(trim($last));
    $cfg = wx_chat_cfg();

    $out = [];
    if ($needle !== '') {
        foreach ((array) $cfg['qa'] as $qa) {
            $q = mb_strtolower((string) ($qa['q'] ?? ''));
            if ($q !== '' && (mb_strpos($needle, mb_substr($q, 0, 40)) !== false || mb_strpos($q, mb_substr($needle, 0, 40)) !== false)) {
                $out[] = ['kind' => 'qa', 'label' => (string) $qa['q'], 'text' => (string) $qa['a']];
            }
            if (count($out) >= 5) {
                break;
            }
        }
        foreach ((array) $cfg['saved'] as $sv) {
            $k = mb_strtolower((string) ($sv['k'] ?? ''));
            if ($k !== '' && mb_strpos($needle, $k) !== false) {
                $out[] = ['kind' => 'saved', 'label' => (string) $sv['k'], 'text' => (string) $sv['t']];
            }
            if (count($out) >= 6) {
                break;
            }
        }
    }
    foreach (array_slice((array) $cfg['quick'], 0, 8) as $q) {
        $out[] = ['kind' => 'quick', 'label' => (string) ($q['label'] ?? ''), 'text' => (string) ($q['text'] ?? '')];
    }
    return ['data' => ['suggestions' => $out, 'ai' => wx_ai_ready(), 'channel' => (string) ($c['channel'] ?? 'web')]];
}

/**
 * POST /chats/test — the training screen's test box. Nothing is saved; nothing is sent.
 *
 * With no AI key the answer is what the rules would say, and the response says `rules: true` — the
 * screen then shows "an AI key would answer this; without one the question is logged under Unanswered",
 * which is exactly what v2.1 told the operator.
 */
function wx_route_chats_test(array $ctx): array
{
    wx_require_user('chat_test', ['owner', 'admin']);
    $turns = [];
    foreach (array_slice((array) ($ctx['body']['turns'] ?? []), -16) as $x) {
        if (!is_array($x)) {
            continue;
        }
        $t = mb_substr(trim((string) ($x['text'] ?? '')), 0, 2000);
        if ($t !== '') {
            $turns[] = ['role' => ($x['who'] ?? '') === 'user' ? 'user' : 'assistant', 'content' => $t];
        }
    }
    if (!$turns) {
        throw ApiError::validation('Type a test message', 'turns');
    }
    $cfg = wx_chat_cfg();
    if (!wx_ai_ready()) {
        $last = '';
        foreach ($turns as $x) {
            if ($x['role'] === 'user') {
                $last = $x['content'];
            }
        }
        $needle = mb_strtolower($last);
        $reply = '';
        foreach ((array) $cfg['qa'] as $qa) {
            $q = mb_strtolower((string) ($qa['q'] ?? ''));
            if ($q !== '' && (mb_strpos($needle, mb_substr($q, 0, 40)) !== false || mb_strpos($q, mb_substr($needle, 0, 40)) !== false)) {
                $reply = (string) $qa['a'];
                break;
            }
        }
        return ['data' => [
            'reply' => $reply !== '' ? $reply : 'No saved answer matched. With an AI key the assistant would answer; without one, this question is logged under Unanswered.',
            'human' => false,
            'rules' => true,
        ]];
    }
    throw new ApiError('UPSTREAM', 'The assistant needs the AI centre, which arrives in the automation phase — the keys and cost controls live there', 502, null, ['rules' => false]);
}
