-- db/migrations/001_roles.sql — GENERATED FILE, DO NOT EDIT BY HAND.
--
--   regenerate:  node tools/gen-caps.mjs
--   verify:      node tools/gen-caps.mjs --check
--
-- Authorisation stops being code. v2.1's matrix lived in frontend-v1/api/roles-lib.php as a switch, a
-- list of regexes and two consts — unreadable outside a deploy, unauditable, and (as the analysis
-- report found) mistaken for database tables by the first read of the codebase. These tables hold the
-- same rules, extracted from that file so the behaviour cannot differ, and seeded in the same order
-- because rule order decides which group wins when an action matches two patterns.
--
-- The five role codes are unchanged so existing users keep working: owner, admin, editor, sales, support.
--
-- Applied by db/migrate.php. Idempotent: CREATE TABLE IF NOT EXISTS, and the seed inserts use
-- INSERT ... ON DUPLICATE KEY UPDATE so a re-run converges instead of duplicating.

/* ---------------------------------------------------------------- roles */
CREATE TABLE IF NOT EXISTS wx_roles (
  code VARCHAR(20) NOT NULL PRIMARY KEY,
  label VARCHAR(40) NOT NULL,
  rank_ INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_roles (code, label, rank_) VALUES
  ('owner', 'Master', 1),
  ('admin', 'Manager', 2),
  ('editor', 'Developer', 3),
  ('sales', 'Sales', 4),
  ('support', 'Support', 5)
ON DUPLICATE KEY UPDATE label = VALUES(label), rank_ = VALUES(rank_);

/* ---------------------------------------------- role => permission group
   expand = 1 marks the groups EXPAND opened to a role on purpose, even where an older action-level
   role list was narrower. Keeping the flag means the decision stays identical to v2.1's. */
CREATE TABLE IF NOT EXISTS wx_role_groups (
  role VARCHAR(20) NOT NULL,
  grp VARCHAR(30) NOT NULL,
  expand TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (role, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_role_groups (role, grp, expand) VALUES
  ('owner', 'self', 0),
  ('owner', 'sales', 0),
  ('owner', 'conversations', 0),
  ('owner', 'updates', 0),
  ('owner', 'broadcast', 0),
  ('owner', 'ai', 0),
  ('owner', 'website', 0),
  ('owner', 'settings', 0),
  ('owner', 'master', 0),
  ('admin', 'self', 0),
  ('admin', 'sales', 0),
  ('admin', 'conversations', 0),
  ('admin', 'updates', 0),
  ('admin', 'broadcast', 0),
  ('admin', 'ai', 0),
  ('admin', 'website', 0),
  ('admin', 'settings', 0),
  ('editor', 'self', 0),
  ('editor', 'website', 1),
  ('editor', 'settings', 1),
  ('sales', 'self', 0),
  ('sales', 'sales', 0),
  ('sales', 'conversations', 1),
  ('support', 'self', 0),
  ('support', 'conversations', 1),
  ('support', 'updates', 1),
  ('support', 'support_view', 1)
ON DUPLICATE KEY UPDATE expand = VALUES(expand);

/* ------------------------------------------------- action => group rules
   ord preserves the evaluation order of the v2.1 $map: the first matching pattern wins, and
   several actions match more than one pattern, so order is behaviour, not cosmetics. */
CREATE TABLE IF NOT EXISTS wx_action_groups (
  pattern VARCHAR(190) NOT NULL PRIMARY KEY,
  grp VARCHAR(30) NOT NULL,
  is_regex TINYINT(1) NOT NULL DEFAULT 1,
  ord INT NOT NULL DEFAULT 0,
  INDEX (ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_groups (pattern, grp, is_regex, ord) VALUES
  ('~^(tg_link_code|tg_unlink|me|me_get|me_save|me_avatar|me_avatars|profile|password|logout|ping|poll|notif_poll|typing|dashboard|dash_data|site_stats|leads_count|mt_get|sec_(get|alerts|2fa_begin|2fa_enable|2fa_disable|recovery_new|revoke)|google_(me|link|unlink))$~', 'self', 1, 1),
  ('~^(user_save|sec_2fa_reset|backup_(run|delete|restore)|restore|dbx_row|db_reconnect|google_save|mcp_token_(new|regen|revoke|toggle))$~', 'master', 1, 2),
  ('~^(client_360|get_lead|projs_list)$~', 'support_view', 1, 3),
  ('~^(proj_update|notify_proj_send)$~', 'updates', 1, 4),
  ('~^(chat_(list|get|reply|close|file|mode|lead|typing|assign|note|tags|suggest)|wa_stats|whatsapp_stats|crm_wa_status)$~', 'conversations', 1, 5),
  ('~^(chat_cfg_get|chat_cfg_save|chat_test|ai_test|ai_report|ai_unans_[a-z]+|aic_[a-z]+)$~', 'ai', 1, 6),
  ('~^(crm_offers|crm_offer_(save|send|delete)|wag_[a-z_]+|wah_[a-z_]+)$~', 'broadcast', 1, 7),
  ('~^(leads?_[a-z0-9_]+|add_lead_note|lead_note|get_lead|list_leads|clients?_[a-z0-9_]+|list_clients|quotes?_[a-z_]+|get_quote|list_quotes|create_quote_draft|invs?_[a-z_]+|pay_(add|delete)|projs?_[a-z_]+|bk_[a-z_]+|est_[a-z_]+|s17_meta|dash_target_save|monthly_report|tpl_(list|save|delete|import)|company_get)$~', 'sales', 1, 8),
  ('~^(tg_(get|save|connect|disconnect|test)|set_[a-z_]+|crm_settings|crm_settings_save|crm_test|crm_wa_connect|crm_wa_disconnect|notify_(get|save|test)|company_save|cms_biz_[a-z_]+|cms_ai_[a-z_]+|cms_announce_[a-z_]+|mt_set|sys_check|activity|google_cfg|health_settings|sheets_[a-z_]+|gdata_(save|clear))$~', 'settings', 1, 9),
  ('~^(cms_[a-z_]+|page_[a-z_]+|pages|pages_list|list_pages|seo_[a-z_]+|blocks_[a-z_]+|global_[a-z_]+|chrome_[a-z_]+|theme|theme_get|media|media_[a-z_]+|fm_[a-z_]+|redirects|redirects_[a-z_]+|r404_[a-z_]+|health_(get|psi|scan|speed)|forms_(get|save)|gdata_(status|report)|backups|backup_(list|get)|users|dbx_(browse|export|tables)|mcp_(tokens|log))$~', 'website', 1, 10)
ON DUPLICATE KEY UPDATE grp = VALUES(grp), is_regex = VALUES(is_regex), ord = VALUES(ord);

/* ------------------------------------------- actions shared across groups
   A screen used by two teams: allowed when the user holds ANY of the listed groups. */
CREATE TABLE IF NOT EXISTS wx_action_shared (
  action VARCHAR(60) NOT NULL,
  grp VARCHAR(30) NOT NULL,
  PRIMARY KEY (action, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_shared (action, grp) VALUES
  ('est_tpls', 'sales'),
  ('est_tpls', 'website'),
  ('est_tpl_save', 'sales'),
  ('est_tpl_save', 'website'),
  ('est_save', 'sales'),
  ('est_save', 'website'),
  ('crm_wa_status', 'conversations'),
  ('crm_wa_status', 'settings'),
  ('crm_wa_status', 'broadcast'),
  ('gdata_report', 'sales'),
  ('gdata_report', 'website'),
  ('s17_meta', 'sales'),
  ('s17_meta', 'support_view'),
  ('projs_table', 'sales'),
  ('projs_table', 'support_view'),
  ('notify_get', 'settings'),
  ('notify_get', 'updates')
ON DUPLICATE KEY UPDATE grp = VALUES(grp);

/* --------------------------------------------- action => explicit role list
   The screens that stay owner+admin even though a broader group would otherwise match them. */
CREATE TABLE IF NOT EXISTS wx_action_roles (
  action VARCHAR(60) NOT NULL,
  role VARCHAR(20) NOT NULL,
  PRIMARY KEY (action, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_roles (action, role) VALUES
  ('users', 'owner'),
  ('users', 'admin'),
  ('backups', 'owner'),
  ('backups', 'admin'),
  ('backup_list', 'owner'),
  ('backup_list', 'admin'),
  ('backup_get', 'owner'),
  ('backup_get', 'admin'),
  ('dbx_browse', 'owner'),
  ('dbx_browse', 'admin'),
  ('dbx_export', 'owner'),
  ('dbx_export', 'admin'),
  ('dbx_tables', 'owner'),
  ('dbx_tables', 'admin'),
  ('mcp_tokens', 'owner'),
  ('mcp_tokens', 'admin'),
  ('mcp_log', 'owner'),
  ('mcp_log', 'admin')
ON DUPLICATE KEY UPDATE role = VALUES(role);

/* ------------------------------------------------ per-user extra grants
   Replaces the "perms" array that v2.1 kept in _private/security.json, which needed a lock file and
   could not be queried. A row here grants one group to one user, on top of their role. */
CREATE TABLE IF NOT EXISTS wx_user_perms (
  user_id INT NOT NULL,
  grp VARCHAR(30) NOT NULL,
  granted_at DATETIME NULL,
  granted_by INT NULL,
  PRIMARY KEY (user_id, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
