-- db/migrations/005_settings_seed.sql — configuration, not code.
--
-- The dashboard's "needs attention" list and the UI defaults have to come from somewhere an operator
-- can change without a deploy. v2.1 answered this by putting values in JavaScript literals and in
-- settings.json; the plan's rule is that the attention thresholds live in wx_settings
-- (routes/dashboard.php reads attention.* with defaults that match the prototype).
--
-- Seeds are written as INSERT IGNORE so an operator's own value is never overwritten by a re-run. A
-- migration that resets a tuned threshold is worse than no migration at all.

/* Attention rule engine — the knobs the dashboard exposes. */
INSERT IGNORE INTO wx_settings (k, v) VALUES
  ('attention.stale_lead_days', '7'),
  ('attention.quote_expiry_days', '14'),
  ('attention.unpaid_days', '30'),
  ('attention.max_items', '8');

/* UI defaults from the v2.1 settings.json (SET_FILE / GEN_DEF / TRK_DEF), so the business identity
   survives the move into the database and the v2.5 UI can read it the same way the old one did. */
INSERT IGNORE INTO wx_settings (k, v) VALUES
  ('site.name', 'Woodex Interior'),
  ('site.logo', '/assets/img/img-f941b08b9510.png'),
  ('site.favicon', '/assets/img/favicon.svg'),
  ('site.share', '/assets/img/img-c7d3a3ebd62b.jpg'),
  ('tracking.ga4', ''),
  ('tracking.gtm', ''),
  ('tracking.pixel', ''),
  ('tracking.gsc', '');

/* The permission-group descriptions shown on the users screen. These were the PERM_GROUPS constant
   in roles-lib.php; in the database they can be re-worded without touching PHP. */
INSERT IGNORE INTO wx_settings (k, v) VALUES
  ('perm.sales', 'Leads, pipeline, clients, quotes, invoices, projects, bookings'),
  ('perm.conversations', 'Inbox (website chat + WhatsApp)'),
  ('perm.updates', 'Client updates (project messages)'),
  ('perm.broadcast', 'WhatsApp offers, broadcasts and automation'),
  ('perm.ai', 'Train AI and chat settings'),
  ('perm.website', 'Pages, builder, content, media, SEO, theme'),
  ('perm.settings', 'Business info, integrations, notifications, maintenance');

/* Platform markers, so a support call can establish what is installed in one query. */
INSERT IGNORE INTO wx_settings (k, v) VALUES
  ('platform.api_version', '2.5.0-p1'),
  ('platform.installed_at', '2026-10-13');
