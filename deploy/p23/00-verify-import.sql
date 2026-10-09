-- WOODEX — run this in phpMyAdmin (SQL tab) straight after the import.
-- Expected answer on the first line: 20 tables. Any 0 below means a feature
-- (leads, quotes, invoices, chats, bookings…) will fail until it is created.

SELECT COUNT(*) AS wx_tables_expected_20
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name LIKE 'wx\_%';

SELECT 'wx_users'      t, COUNT(*) rows_found FROM wx_users
UNION ALL SELECT 'wx_settings',   COUNT(*) FROM wx_settings
UNION ALL SELECT 'wx_templates',  COUNT(*) FROM wx_templates
UNION ALL SELECT 'wx_clients',    COUNT(*) FROM wx_clients
UNION ALL SELECT 'wx_leads',      COUNT(*) FROM wx_leads
UNION ALL SELECT 'wx_quotes',     COUNT(*) FROM wx_quotes
UNION ALL SELECT 'wx_invoices',   COUNT(*) FROM wx_invoices
UNION ALL SELECT 'wx_projects',   COUNT(*) FROM wx_projects
UNION ALL SELECT 'wx_chats',      COUNT(*) FROM wx_chats
UNION ALL SELECT 'wx_chat_msgs',  COUNT(*) FROM wx_chat_msgs
UNION ALL SELECT 'wx_bookings',   COUNT(*) FROM wx_bookings
UNION ALL SELECT 'wx_activity',   COUNT(*) FROM wx_activity;

-- The 20 tables the app expects:
-- wx_users wx_activity wx_settings wx_throttle wx_leads wx_lead_notes wx_clients
-- wx_notify_log wx_wa_seen wx_templates wx_quotes wx_invoices wx_projects wx_chats
-- wx_chat_msgs wx_bookings wx_ai_events wx_ai_unans wx_tg_seen wx_tg_map
-- (8 extra chat columns - handoff, assigned_to, tags, ext, channel, vtype, atype,
--  att - are added by the app itself on first use, so their absence here is normal.)
