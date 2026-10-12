# Woodex Admin — data model

**25 MySQL tables** (`woodex-database.sql`) plus **49 JSON stores** in `_private/` (89 constant references).
The database holds records (users, leads, quotes, invoices, projects…); `_private/` holds runtime state
and configuration that changes often and must survive a code update (tokens, caches, scans, settings).

## MySQL tables

| Table | Columns |
| --- | --- |
| `wx_activity` | `id`, `user_id`, `user_name`, `action`, `target`, `ip`, `created_at` |
| `wx_ai_events` | `id`, `t`, `chat_id`, `kind`, `reason` |
| `wx_ai_unans` | `id`, `t`, `last_t`, `chat_id`, `q`, `qkey`, `n`, `status` |
| `wx_arc_drawings` | `id`, `project_id`, `kind`, `title`, `data` |
| `wx_arc_feed` | `id`, `project_id`, `author_id`, `author_name`, `author_role`, `body`, `created_at` |
| `wx_arc_revisions` | `id`, `scope`, `scope_id`, `rev`, `by_user`, `created_at`, `note`, `prev_hash`, `hash`, `data` |
| `wx_bookings` | `id`, `created_at`, `lead_id`, `name`, `phone`, `email`, `type`, `city`, `address`, `d`, `tm`, `dur`, `status`, `staff_id`, `note`, `src`, `reminded` |
| `wx_bot_sessions` | `id`, `channel`, `sender_id`, `chat_id`, `flow`, `step`, `data`, `updated_at` |
| `wx_chat_msgs` | `id`, `chat_id`, `t`, `who`, `name`, `text`, `att` |
| `wx_chats` | `id`, `token`, `created_at`, `updated_at`, `name`, `phone`, `email`, `page`, `ip`, `status`, `mode`, `agent_name`, `unread`, `needs`, `last_text`, `lead_id`, `alerted`, `channel`, `vtype`, `atype` |
| `wx_clients` | `id`, `name`, `phone`, `email`, `company`, `city`, `address`, `notes`, `created_at`, `type`, `source`, `tags`, `line`, `designation`, `updated_at` |
| `wx_invoices` | `id`, `no`, `quote_id`, `data` |
| `wx_invoices_archive` | `id`, `src_id`, `no`, `quote_id`, `data`, `archived_at`, `archived_by`, `reason` |
| `wx_lead_notes` | `id`, `lead_id`, `t`, `user_name`, `text`, `sys`, `kind`, `outcome` |
| `wx_leads` | `id`, `created_at`, `source`, `page`, `name`, `phone`, `email`, `service`, `message`, `fields`, `stage`, `assigned_to`, `followup`, `value`, `lost_reason`, `client_id`, `tags`, `is_read`, `ip`, `company`, `designation`, `location`, `line`, `lead_type`, `project_type`, `budget`, `area`, `priority`, `quote_status`, `last_contact`, `next_at`, `next_type` |
| `wx_notify_log` | `id`, `t`, `event`, `ref`, `name`, `channel`, `dest`, `result` |
| `wx_projects` | `id`, `data` |
| `wx_quotes` | `id`, `no`, `status`, `data` |
| `wx_settings` | `k`, `v` |
| `wx_templates` | `id`, `name`, `data` |
| `wx_tg_map` | `msg_id`, `chat_id`, `t` |
| `wx_tg_seen` | `uid`, `t` |
| `wx_throttle` | `ip`, `n`, `t` |
| `wx_users` | `id`, `name`, `email`, `role`, `pass_hash`, `active`, `pw_ver`, `created_at`, `last_login` |
| `wx_wa_seen` | `mid`, `t` |

## `_private/` JSON stores

| Constant | File |
| --- | --- |
| — | `_private/.htaccess` |
| — | `_private/activity.jsonl` |
| — | `_private/backups` |
| — | `_private/blocks.json` |
| — | `_private/booking.json` |
| — | `_private/chat.json` |
| — | `_private/chrome.json` |
| — | `_private/company.json` |
| — | `_private/config.json` |
| — | `_private/connectors.json` |
| — | `_private/content.json` |
| — | `_private/crm.json` |
| — | `_private/dash.json` |
| — | `_private/db.json` |
| — | `_private/demo.json` |
| — | `_private/est-templates.json` |
| — | `_private/forms.json` |
| — | `_private/google-cache.json` |
| — | `_private/google-sa.json` |
| — | `_private/google.json` |
| — | `_private/health.json` |
| — | `_private/login-attempts.json` |
| — | `_private/mcp.json` |
| — | `_private/media-trash` |
| — | `_private/media.json` |
| — | `_private/notify.json` |
| — | `_private/offers.json` |
| — | `_private/pages.json` |
| — | `_private/profiles.json` |
| — | `_private/r404-ip.json` |
| — | `_private/r404.json` |
| — | `_private/redirect-cfg.json` |
| — | `_private/redirects.json` |
| — | `_private/s17.json` |
| — | `_private/security.json` |
| — | `_private/seo-agent.json` |
| — | `_private/seo.json` |
| — | `_private/settings.json` |
| — | `_private/sheets.json` |
| — | `_private/site-backups` |
| — | `_private/social.json` |
| — | `_private/system.json` |
| — | `_private/telegram.json` |
| — | `_private/theme.json` |
| — | `_private/trash` |
| — | `_private/wa-auto.json` |
| — | `_private/wa-auto.lock` |
| — | `_private/wa-health.json` |
| — | `_private/wa-stats.json` |