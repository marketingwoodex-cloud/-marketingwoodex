<?php
/**
 * api/v2/routes/users.php — people and their permissions.
 *
 * Ported from `admin.php`'s `users` and `user_save`, including the rules that protect the account doing
 * the editing: only an owner may create another owner, the last active owner cannot be demoted or
 * deactivated, and nobody may deactivate themselves. Those rules are not decoration — each one is a way
 * a company locks itself out of its own admin.
 *
 * The decision is a **pure function**, `wx_user_plan()`, which takes the request, the requester, the
 * row being edited and the number of other active owners, and returns either the change to apply or the
 * reason it is refused. That is a deliberate shape: the rules can then be tested without a database, and
 * the route below is only the part that reads and writes rows. A rule that lives in the middle of an
 * UPDATE is a rule nobody can test.
 *
 * Two things v2.1 did that this does not:
 *
 *   · **A password change signs the person out everywhere.** v2.1 sometimes cleared the security file's
 *     session list — which, after the move to real sessions in `wx_sessions`, would have been theatre.
 *     Here the password version is raised, and every session for that user is revoked for real.
 *
 *   · **A permission grant is audited with what changed.** v2.1 wrote `user.update` and nothing else; a
 *     per-user group grant is exactly the kind of change a review needs to see.
 */

declare(strict_types=1);

const WX_USER_COLUMNS = ['id', 'name', 'email', 'role', 'active', 'created_at', 'last_login'];

/** The list shape: never the password hash, always whether two-factor is on. */
function wx_user_row(array $u, bool $twofa = false, int $sessions = 0): array
{
    return [
        'id' => (int) $u['id'],
        'name' => (string) $u['name'],
        'email' => (string) $u['email'],
        'role' => (string) $u['role'],
        'roleLabel' => WX_ROLE_LABELS[(string) $u['role']] ?? (string) $u['role'],
        'active' => (bool) $u['active'],
        'twofa' => $twofa,
        'sessions' => $sessions,
        'perms' => wx_user_perms((int) $u['id']),
        'createdAt' => $u['created_at'] ?? null,
        'lastLogin' => $u['last_login'] ?? null,
    ];
}

/**
 * The rules, as a decision rather than a side effect.
 *
 * @param array      $in          the request body
 * @param array      $me          the requester
 * @param array|null $before      the user being edited, or null when creating
 * @param int        $otherOwners how many *other* active owners exist (ignored when creating)
 *
 * @return array{set?: array, password?: string, perms?: array, signOut?: bool, error?: string, field?: string}
 */
function wx_user_plan(array $in, array $me, ?array $before, int $otherOwners): array
{
    $name = trim((string) ($in['name'] ?? ''));
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $role = (string) ($in['role'] ?? 'editor');
    $active = array_key_exists('active', $in) ? !empty($in['active']) : ($before === null ? true : (bool) $before['active']);
    $password = (string) ($in['password'] ?? '');

    if ($name === '') {
        return ['error' => 'Enter a name', 'field' => 'name'];
    }
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['error' => 'Enter a valid email address', 'field' => 'email'];
    }
    if (!isset(WX_ROLE_LABELS[$role])) {
        return ['error' => 'Unknown role', 'field' => 'role'];
    }
    /* Only an owner makes an owner. The alternative — an admin promoting themselves — is the shortest
       path from "a manager account" to "the whole company" that exists. */
    if ($role === 'owner' && (string) $me['role'] !== 'owner') {
        return ['error' => 'Only the owner can create another owner', 'field' => 'role'];
    }
    if ($before !== null && (string) $before['role'] === 'owner' && (string) $me['role'] !== 'owner') {
        return ['error' => 'Only the owner can edit the owner account', 'field' => 'role'];
    }
    /* The lock-out guards, in order of how easily they are triggered by accident. */
    if ($before !== null && (string) $before['role'] === 'owner' && ($role !== 'owner' || !$active) && $otherOwners < 1) {
        return ['error' => 'There must be at least one active owner — add another owner first', 'field' => 'role'];
    }
    if ($before !== null && (int) $before['id'] === (int) $me['id'] && !$active) {
        return ['error' => 'You cannot deactivate your own account', 'field' => 'active'];
    }
    if ($password !== '') {
        try {
            wx_v_password($password);
        } catch (ApiError $e) {
            return ['error' => $e->getMessage() === '' ? 'Choose a stronger password' : (string) $e->getMessage(), 'field' => 'password'];
        }
    }

    $perms = null;
    if (array_key_exists('perms', $in) && is_array($in['perms'])) {
        $perms = array_values(array_intersect(array_map('strval', $in['perms']), array_keys(WX_PERM_GROUPS)));
    }

    return [
        'set' => ['name' => mb_substr($name, 0, 120), 'email' => $email, 'role' => $role, 'active' => $active ? 1 : 0],
        'password' => $password !== '' ? $password : '',
        /* Sessions end when the password changes, when the account is switched off, or when the role
           changes — the three moments where a live session is standing on a permission that just moved. */
        'signOut' => $password !== '' || !$active || ($before !== null && (string) $before['role'] !== $role),
        'perms' => $perms,
    ];
}

/** GET /users — the team list, with the role labels and groups the editor needs. */
function wx_route_users_list(array $ctx): array
{
    wx_require_user('users');
    $rows = wx_all('SELECT id, name, email, role, active, created_at, last_login, totp_on FROM wx_users ORDER BY id');
    $sessions = [];
    foreach (wx_all('SELECT user_id, COUNT(*) AS n FROM wx_sessions WHERE revoked_at IS NULL AND expires_at > ? GROUP BY user_id', [wx_now()]) as $r) {
        $sessions[(int) $r['user_id']] = (int) $r['n'];
    }
    $users = [];
    foreach ($rows as $r) {
        $users[] = wx_user_row($r, !empty($r['totp_on']), $sessions[(int) $r['id']] ?? 0);
    }
    return ['data' => [
        'users' => $users,
        'roles' => WX_ROLE_LABELS,
        'groups' => WX_PERM_GROUPS,
        'me' => (int) wx_current_user()['id'],
    ]];
}

/**
 * POST /users and PATCH /users/{id} — create or change one person.
 *
 * The whole change happens in one transaction: the row, the password, the per-user grants and the
 * session revocation. A half-applied user edit is a support call at best and a lock-out at worst.
 */
function wx_route_users_save(array $ctx): array
{
    return wx_appr_route('user_save', $ctx, 'users', 'wx_route_users_save_do', static fn() => wx_route_users_save_do($ctx));
}

function wx_route_users_save_do(array $ctx): array
{
    $me = wx_require_user('user_save');
    $id = isset($ctx['params']['id']) ? (int) $ctx['params']['id'] : (int) ($ctx['body']['id'] ?? 0);

    return wx_guard('users.save', static function () use ($ctx, $me, $id) {
        return wx_tx(static function () use ($ctx, $me, $id) {
            $before = null;
            $otherOwners = (int) wx_val("SELECT COUNT(*) FROM wx_users WHERE role = 'owner' AND active = 1 AND id <> ?", [$id]);
            if ($id > 0) {
                $before = wx_one('SELECT * FROM wx_users WHERE id = ?', [$id]);
                if ($before === null) {
                    throw ApiError::notFound('That user does not exist');
                }
                // A duplicate email is a refusal for a reason: two accounts, one inbox, no idea which
                // one the password reset is for.
                $clash = wx_val('SELECT id FROM wx_users WHERE email = ? AND id <> ?', [strtolower(trim((string) ($ctx['body']['email'] ?? ''))), $id]);
                if ($clash !== null) {
                    throw ApiError::validation('That email address is already used by another account', 'email');
                }
            } elseif (wx_val('SELECT id FROM wx_users WHERE email = ?', [strtolower(trim((string) ($ctx['body']['email'] ?? '')))]) !== null) {
                throw ApiError::validation('That email address is already used by another account', 'email');
            }

            /* The plan is pure, so the reason for a refusal is decided before anything is written. */
            $plan = wx_user_plan($ctx['body'], $me, $before, $otherOwners);
            if (isset($plan['error'])) {
                throw ApiError::validation((string) $plan['error'], $plan['field'] ?? null);
            }

            $set = $plan['set'];

            if ($id > 0) {
                wx_update('wx_users', $set, ['id' => $id]);
                if (($plan['password'] ?? '') !== '') {
                    /* A password change raises the version, which is what makes every existing session
                       invalid the moment it next checks in. */
                    wx_q('UPDATE wx_users SET pass_hash = ?, pw_ver = pw_ver + 1 WHERE id = ?', [password_hash((string) $plan['password'], PASSWORD_DEFAULT), $id]);
                } elseif (!empty($plan['signOut'])) {
                    wx_q('UPDATE wx_users SET pw_ver = pw_ver + 1 WHERE id = ?', [$id]);
                }
                wx_audit($me, 'user.update', 'user:' . $id, [
                    'email' => (string) $set['email'],
                    'role' => (string) $set['role'],
                    'wasRole' => (string) $before['role'],
                    'active' => (bool) $set['active'],
                    'passwordReset' => ($plan['password'] ?? '') !== '',
                ]);
            } else {
                $set['pass_hash'] = password_hash((string) $plan['password'], PASSWORD_DEFAULT);
                $set['pw_ver'] = 1;
                $set['created_at'] = wx_now();
                $id = wx_insert('wx_users', $set);
                wx_audit($me, 'user.create', 'user:' . $id, ['email' => (string) $set['email'], 'role' => (string) $set['role']]);
            }

            if ((array_key_exists('perms', $ctx['body']) && is_array($ctx['body']['perms'])) || array_key_exists('perms', $plan)) {
                $grants = is_array($plan['perms']) ? $plan['perms'] : [];
                wx_user_perms_set($id, $grants);
                wx_audit($me, 'user.perms', 'user:' . $id, ['groups' => $grants]);
            }

            if (!empty($plan['signOut'])) {
                $ended = wx_session_revoke_user($id);
                if ($ended > 0) {
                    wx_audit($me, 'security.sessions_revoked', 'user:' . $id, ['count' => $ended, 'reason' => 'user change']);
                }
            }

            $fresh = wx_one('SELECT id, name, email, role, active, created_at, last_login, totp_on FROM wx_users WHERE id = ?', [$id]);
            return ['data' => [
                'user' => wx_user_row($fresh, !empty($fresh['totp_on']), 0),
                'created' => $before === null,
                'signedOut' => !empty($plan['signOut']),
            ]];
        });
    });
}

/**
 * POST /users/{id}/2fa-reset — an owner unlocks a phone that was lost.
 *
 * Ported from `sec_2fa_reset`, with the same rule that an owner's own two-factor is only reset by an
 * owner. It clears the secret and the recovery codes and ends every session, because a reset is what you
 * do when you believe a phone — or an account — is in someone else's hands.
 */
function wx_route_users_2fa_reset(array $ctx): array
{
    return wx_appr_route('sec_2fa_reset', $ctx, 'users', 'wx_route_users_2fa_reset_do', static fn() => wx_route_users_2fa_reset_do($ctx));
}

function wx_route_users_2fa_reset_do(array $ctx): array
{
    $me = wx_require_user('sec_2fa_reset', ['owner', 'admin']);
    $id = (int) $ctx['params']['id'];

    return wx_guard('users.2fa_reset', static function () use ($me, $id) {
        return wx_tx(static function () use ($me, $id) {
            $target = wx_one('SELECT * FROM wx_users WHERE id = ?', [$id]);
            if ($target === null) {
                throw ApiError::notFound('That user does not exist');
            }
            if ((string) $target['role'] === 'owner' && (string) $me['role'] !== 'owner') {
                throw ApiError::forbidden('Only the owner can do this');
            }
            wx_security_state_put($id, ['secret' => '', 'on' => false, 'recovery' => [], 'last' => 0, 'alerts' => true]);
            $ended = wx_session_revoke_user($id);
            wx_audit($me, '2fa.reset', 'user:' . $id, ['email' => (string) $target['email'], 'sessionsEnded' => $ended]);
            return ['data' => ['id' => $id, 'twofa' => false, 'sessionsEnded' => $ended]];
        });
    });
}

/** DELETE /users/{id}/sessions — sign someone out of every device. */
function wx_route_users_sessions_revoke(array $ctx): array
{
    $me = wx_require_user('sec_revoke', ['owner', 'admin']);
    $id = (int) $ctx['params']['id'];
    $target = wx_one('SELECT id, email, role FROM wx_users WHERE id = ?', [$id]);
    if ($target === null) {
        throw ApiError::notFound('That user does not exist');
    }
    if ((string) $target['role'] === 'owner' && (string) $me['role'] !== 'owner') {
        throw ApiError::forbidden('Only the owner can do this');
    }
    $n = wx_session_revoke_user($id);
    wx_audit($me, 'security.sessions_revoked', 'user:' . $id, ['count' => $n, 'by' => 'admin']);
    return ['data' => ['ended' => $n]];
}
