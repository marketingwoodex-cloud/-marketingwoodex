# Woodex Admin — API reference

Every action the admin and builder can send, and the file that answers it.

**366 actions** across **35 PHP files**. Generated from the code on the branch;
regenerate after adding actions.

Legend: **Roles** = the `need([...])` roles where the code names them; `signed-in` = any active session;
`group` = gated by the permission-group engine (`api/roles-lib.php`);
the screen may be visible to more roles than the action allows.
**Used by** lists the front-end files that call the action.

---

## `api/ai-agent-lib.php`

AI agent

| Action | Roles | Used by |
| --- | --- | --- |
| `ai_report` | owner,admin | admin-aia.js |
| `ai_unans_add` | owner,admin | admin-aia.js |
| `ai_unans_ignore` | owner,admin | admin-aia.js |
| `ai_unans_list` | owner,admin | admin-aia.js |
| `chat_suggest` | owner,admin,sales | admin-chat.js, admin-chat2.js |

## `api/ai-center-lib.php`

AI centre (training, unanswered questions, reports)

| Action | Roles | Used by |
| --- | --- | --- |
| `aic_get` | owner,admin | admin-aicenter.js |
| `aic_health` | owner,admin | admin-aicenter.js |
| `aic_save` | owner,admin | admin-aicenter.js |

## `api/booking-lib.php`

Bookings & visits

| Action | Roles | Used by |
| --- | --- | --- |
| `bk_cfg` | owner,admin,sales | — |
| `bk_cfg_save` | owner,admin | admin-booking.js |
| `bk_list` | owner,admin,sales | admin-booking.js |
| `bk_save` | owner,admin,sales | admin-booking.js |
| `bk_slots` | owner,admin,sales | admin-booking.js |
| `bk_status` | owner,admin,sales | admin-booking.js |

## `api/logos-lib.php`

Client logos

| Action | Roles | Used by |
| --- | --- | --- |
| `logos_get` | group | admin-logos.js |
| `logos_save` | group | admin-logos.js |

## `api/p19c-lib.php`

Client page: conversations & linked accounts

| Action | Roles | Used by |
| --- | --- | --- |
| `client_comms` | group | admin-p19c.js |
| `clients_link` | group | — |

## `api/notify-lib.php`

Client updates / notifications

| Action | Roles | Used by |
| --- | --- | --- |
| `notify_get` | owner,admin | admin-notify.js |
| `notify_proj_send` | owner,admin,sales,support | admin-sales.js |
| `notify_save` | owner,admin | admin-notify.js |
| `notify_test` | owner,admin | admin-notify.js |

## `api/admin.php`

Core — boot, auth, session, users, activity, settings, publish, backups, database, files, maintenance

| Action | Roles | Used by |
| --- | --- | --- |
| `activity` | owner,admin | admin.js |
| `appr_cancel` | group | admin-appr.js |
| `appr_cfg_get` | group | admin-appr.js |
| `appr_cfg_save` | signed-in | admin-appr.js |
| `appr_count` | group | admin-appr.js, admin.js |
| `appr_get` | group | admin-appr.js |
| `appr_list` | group | admin-appr.js |
| `appr_reject` | group | admin-appr.js |
| `auth_info` | group | admin.js |
| `backup_get` | owner,admin,editor | admin-media.js, admin-pages.js |
| `backup_up` | group | — |
| `chrome_save` | owner,admin | admin-chrome.js |
| `chrome_versions` | owner,admin | admin-chrome.js |
| `dashboard` | signed-in | admin.js |
| `db_dl` | group | — |
| `db_reconnect` | group | admin.js |
| `db_up` | group | — |
| `global_chrome` | owner,admin | admin-chrome.js |
| `global_menu` | owner,admin | admin-chrome.js, admin-pages.js |
| `global_replace` | owner,admin | admin-pages.js |
| `google_login` | group | admin-p8.js, admin.js |
| `login` | group | admin.js |
| `logout` | group | admin.js |
| `me` | signed-in | admin-hero.js, admin.js |
| `page_delete` | owner,admin | admin-pages.js |
| `page_meta_save` | owner,admin,editor | admin-pages.js, admin-seo.js, admin-seo38.js |
| `pages_list` | owner,admin,editor | admin-appr.js, admin-p36.js, admin-pages.js, admin-seo.js, admin-seo38.js |
| `password` | signed-in | admin-p18j.js, admin-security.js, admin.js |
| `profile` | signed-in | admin.js |
| `pw_forgot` | group | — |
| `pw_reset` | group | — |
| `setup` | group | admin.js |
| `status` | group | admin.js |
| `sys_check` | owner,admin | — |
| `user_save` | owner,admin | admin.js |
| `users` | owner,admin | admin.js |

## `api/roles-lib.php`

Core — role/permission engine

| Action | Roles | Used by |
| --- | --- | --- |
| `admin` | group | — |
| `backup_get` | owner,admin,editor | admin-media.js, admin-pages.js |
| `backup_list` | group | admin-media.js, admin-p18h.js |
| `backups` | group | admin-hero.js, admin-media.js, admin-pages.js |
| `dbx_browse` | group | admin-p18h.js |
| `dbx_export` | group | admin-p18h.js, admin-sheets.js |
| `dbx_tables` | group | admin-p18h.js |
| `editor` | group | — |
| `mcp_log` | group | admin-p8.js |
| `mcp_tokens` | group | admin-integ.js, admin-p8.js |
| `owner` | group | — |
| `sales` | group | — |
| `support` | signed-in | — |
| `users` | owner,admin | admin.js |

## `api/dash-lib.php`

Dashboard

| Action | Roles | Used by |
| --- | --- | --- |
| `dash_data` | signed-in | admin-dash.js |
| `dash_target_save` | owner,admin | admin-dash.js |

## `api/p18g-lib.php`

Database inspector / cron / system

| Action | Roles | Used by |
| --- | --- | --- |
| `wag_audience` | group | admin-p18g.js |
| `wag_camp_action` | group | admin-p18g.js |
| `wag_camp_get` | group | admin-p18g.js |
| `wag_camp_save` | group | admin-p18g.js |
| `wag_flows_save` | group | admin-p18g.js |
| `wag_get` | group | admin-p18g.js |
| `wag_optout` | group | admin-p18g.js |
| `wag_optout_list` | group | admin-p18g.js |
| `wag_seg_delete` | group | admin-p18g.js |
| `wag_seg_save` | group | admin-p18g.js |
| `wag_test` | group | admin-p18g.js |
| `wag_tick` | group | admin-p18g.js |
| `wag_tpl_delete` | group | admin-p18g.js |
| `wag_tpl_save` | group | admin-p18g.js |

## `api/p18j-lib.php`

Files manager

| Action | Roles | Used by |
| --- | --- | --- |
| `me_avatar` | signed-in | admin-p18j.js |
| `me_avatars` | signed-in | admin-p18j.js |
| `me_get` | signed-in | admin-p18j.js |
| `me_save` | signed-in | admin-p18j.js |

## `api/google-data-lib.php`

Google Analytics / Search data

| Action | Roles | Used by |
| --- | --- | --- |
| `gdata_clear` | owner,admin | admin-google.js |
| `gdata_report` | owner,admin,sales,editor | admin-dash.js, admin-google.js |
| `gdata_save` | owner,admin | admin-google.js |
| `gdata_status` | owner,admin,sales,editor | admin-google.js, admin-p36.js |

## `api/conn-lib.php`

Integrations (connectors, OAuth)

| Action | Roles | Used by |
| --- | --- | --- |
| `conn_delete` | group | — |
| `conn_gmail_send` | group | — |
| `conn_gmail_use` | group | — |
| `conn_list` | group | admin-p36.js |
| `conn_push` | group | — |
| `conn_save` | group | — |
| `conn_test` | group | — |

## `api/sales17-lib.php`

Invoice tracking, payments, projects, clients (V17)

| Action | Roles | Used by |
| --- | --- | --- |
| `client_360` | group | admin-sales17.js |
| `clients_master` | group | admin-p18.js, admin-sales17.js |
| `clients_merge` | owner,admin | admin-sales17.js |
| `inv_new` | group | admin-p18.js, admin-sales17.js |
| `inv_track` | group | admin-sales17.js |
| `invs_import` | owner,admin | admin-sales17.js |
| `invs_tracker` | group | admin-sales17.js |
| `lead_activity` | group | admin-sales17.js |
| `leads_followups` | group | admin-appr.js |
| `leads_import2` | owner,admin | admin-sales17.js |
| `leads_stats` | group | — |
| `proj_bill` | group | admin-sales17.js |
| `proj_meta` | group | admin-sales17.js |
| `proj_milestones` | group | admin-sales17.js |
| `projs_table` | owner,admin,sales,editor | admin-sales17.js |
| `s17_meta` | group | admin-p19f.js, admin-sales17.js |

## `api/crm-lib.php`

Leads & CRM

| Action | Roles | Used by |
| --- | --- | --- |
| `client_delete` | owner,admin | admin-crm.js |
| `client_save` | group | admin-crm.js, admin-reports.js, admin-sales17.js |
| `clients_list` | group | admin-crm.js, admin-reports.js, admin-sales.js |
| `crm_offer_delete` | owner,admin | admin-offers.js |
| `crm_offer_save` | owner,admin | admin-offers.js |
| `crm_offer_send` | group | admin-offers.js |
| `crm_offers` | group | admin-offers.js |
| `crm_settings` | owner,admin | admin-crm.js |
| `crm_settings_save` | owner,admin | admin-crm.js |
| `crm_test` | owner,admin | admin-crm.js |
| `crm_wa_connect` | owner,admin | admin-offers.js |
| `crm_wa_disconnect` | owner,admin | admin-offers.js |
| `crm_wa_status` | owner,admin | admin-offers.js, admin-p36.js, admin-p38wa.js |
| `lead_convert` | group | admin-crm.js, admin-sales17.js |
| `lead_delete` | owner,admin | admin-crm.js, admin-sales17.js |
| `lead_note` | group | admin-crm.js |
| `lead_save` | group | admin-crm.js, admin-p19f.js, admin-sales17.js |
| `leads_count` | signed-in | admin-crm.js, admin.js |
| `leads_import` | owner,admin | admin-crm.js |
| `leads_list` | group | admin-appr.js, admin-crm.js, admin-offers.js, admin-p19f.js, admin-reports.js, admin-sales.js, admin-sales17.js |

## `api/mcp.php`

MCP server (AI tool access)

| Action | Roles | Used by |
| --- | --- | --- |
| `add_lead_note` | group | — |
| `create_blog_draft` | group | — |
| `create_city_draft` | group | — |
| `create_quote_draft` | group | — |
| `get_content` | group | — |
| `get_lead` | group | — |
| `get_quote` | group | — |
| `initialize` | group | — |
| `list_clients` | group | — |
| `list_content` | group | — |
| `list_leads` | group | — |
| `list_pages` | owner,admin,editor | — |
| `list_quotes` | group | — |
| `list_templates` | group | — |
| `monthly_report` | owner,admin,sales | — |
| `ping` | group | — |
| `save_content_draft` | group | — |
| `site_stats` | signed-in | — |
| `whatsapp_stats` | group | — |

## `api/media-lib.php`

Media library, SEO, Site health, PageSpeed, backups (A7)

| Action | Roles | Used by |
| --- | --- | --- |
| `backup_delete` | owner | admin-media.js |
| `backup_list` | group | admin-media.js, admin-p18h.js |
| `backup_restore` | owner | admin-media.js, admin-p18h.js |
| `backup_run` | owner | admin-media.js, admin-p18h.js |
| `health_get` | group | admin-appr.js, admin-media.js |
| `health_psi` | group | admin-media.js, admin-speed.js |
| `health_scan` | group | admin-media.js |
| `health_settings` | group | admin-media.js |
| `health_speed` | group | admin-speed.js |
| `media_alt` | group | admin-media.js |
| `media_folder` | group | admin-media.js |
| `media_list` | group | admin-media.js |
| `media_move` | group | admin-media.js |
| `media_purge` | group | admin-media.js |
| `media_replace` | group | admin-media.js |
| `media_restore` | group | — |
| `media_sizes` | group | admin-media.js |
| `media_trash` | group | admin-media.js |
| `media_trash_list` | group | admin-media.js |
| `media_upload` | group | admin-logos.js, admin-media.js |

## `api/builder.php`

Page builder endpoint

| Action | Roles | Used by |
| --- | --- | --- |
| `backup_get` | owner,admin,editor | admin-media.js, admin-pages.js |
| `backups` | group | admin-hero.js, admin-media.js, admin-pages.js |
| `blocks_delete` | group | admin-library.js |
| `blocks_import` | group | admin-library.js |
| `blocks_list` | group | admin-library.js |
| `blocks_save` | group | admin-lib26.js, admin-library.js |
| `blocks_sync` | group | admin-library.js |
| `blocks_usage` | group | admin-library.js |
| `fetch_page` | group | — |
| `import_url` | group | — |
| `load` | group | admin-chrome.js, admin-content.js, admin-fields.js, admin-hero.js, admin-library.js, admin-pages.js, admin-templates.js |
| `login` | group | admin.js |
| `logout` | group | admin.js |
| `media` | group | admin-content.js, admin-pages.js |
| `media_delete` | group | — |
| `media_usage` | group | — |
| `page_new` | group | admin-content.js, admin-fields.js, admin-pages.js |
| `pages` | group | admin-content.js, admin-fields.js, admin-hero.js, admin-media.js, admin-pages.js, admin-redirects.js, admin-speed.js, admin-templates.js, admin.js |
| `password` | signed-in | admin-p18j.js, admin-security.js, admin.js |
| `restore` | group | admin-hero.js, admin-media.js, admin-pages.js |
| `save` | group | admin-content.js, admin-fields.js, admin-hero.js, admin-library.js, admin-templates.js |
| `setup` | group | admin.js |
| `status` | group | admin.js |
| `theme` | group | admin-theme.js |
| `theme_get` | group | admin-theme.js |
| `upload` | group | — |

## `api/phase8-lib.php`

Phase 8 features

| Action | Roles | Used by |
| --- | --- | --- |
| `google_cfg` | group | admin-p8.js |
| `google_link` | signed-in | admin-p8.js |
| `google_login` | group | admin-p8.js, admin.js |
| `google_me` | signed-in | admin-p8.js |
| `google_save` | owner | admin-p8.js |
| `google_unlink` | signed-in | admin-p8.js |
| `mcp_log` | group | admin-p8.js |
| `mcp_token_new` | group | admin-integ.js, admin-p8.js |
| `mcp_token_regen` | group | admin-integ.js |
| `mcp_token_revoke` | group | admin-integ.js, admin-p8.js |
| `mcp_token_toggle` | group | admin-integ.js |
| `mcp_tokens` | group | admin-integ.js, admin-p8.js |
| `wa_stats` | signed-in | admin-p8.js |

## `api/p18e-lib.php`

Projects, billing, photos (P18 series)

| Action | Roles | Used by |
| --- | --- | --- |
| `est_save` | group | admin-p18e.js |
| `est_tpl_save` | group | admin-p18e.js |
| `est_tpls` | group | admin-p18e.js |
| `forms_get` | group | admin-p18e.js |
| `forms_save` | group | admin-p18e.js |

## `api/chat.php`

Public chat endpoint

| Action | Roles | Used by |
| --- | --- | --- |
| `file` | group | — |
| `poll` | group | — |
| `send` | group | — |
| `tglink` | group | — |
| `typing` | group | — |

## `api/sales-lib.php`

Quotations, templates, invoices (classic)

| Action | Roles | Used by |
| --- | --- | --- |
| `company_get` | group | admin-p18.js, admin-sales.js |
| `company_save` | group | admin-sales.js |
| `inv_get` | group | admin-p18.js, admin-sales.js |
| `inv_save` | group | admin-sales.js |
| `invs_list` | group | admin-p18.js, admin-reports.js, admin-sales.js |
| `pay_add` | group | admin-sales.js, admin-sales17.js |
| `pay_delete` | group | admin-sales.js |
| `proj_delete` | group | admin-sales.js |
| `proj_photo` | group | admin-sales.js |
| `proj_photo_delete` | group | admin-sales.js |
| `proj_save` | group | admin-sales.js, admin-sales17.js |
| `proj_update` | group | admin-sales.js |
| `projs_list` | group | admin-appr.js, admin-feed.js, admin-gantt.js, admin-sales.js |
| `quote_copy` | group | admin-sales.js |
| `quote_delete` | group | admin-sales.js |
| `quote_get` | group | admin-sales.js |
| `quote_invoice` | group | admin-sales.js |
| `quote_link` | group | admin-sales.js |
| `quote_save` | group | admin-sales.js |
| `quote_send` | group | admin-sales.js |
| `quote_status` | group | admin-sales.js |
| `quotes_list` | group | admin-reports.js, admin-sales.js |
| `tpl_delete` | group | admin-sales.js |
| `tpl_import` | group | admin-sales.js |
| `tpl_list` | group | admin-sales.js |
| `tpl_save` | group | admin-sales.js |
| `tpl_starters` | group | admin-sales.js |

## `api/redirects-lib.php`

Redirects & 404 monitor

| Action | Roles | Used by |
| --- | --- | --- |
| `r404_clear` | owner,admin | admin-redirects.js |
| `r404_list` | owner,admin | admin-appr.js, admin-redirects.js |
| `redirects` | owner,admin | admin-pages.js, admin-redirects.js |
| `redirects_plan` | owner,admin | admin-redirects.js |
| `redirects_save` | owner,admin | admin-pages.js, admin-redirects.js |

## `api/p18h-lib.php`

SEO agent, sheets sync

| Action | Roles | Used by |
| --- | --- | --- |
| `dbx_browse` | group | admin-p18h.js |
| `dbx_export` | group | admin-p18h.js, admin-sheets.js |
| `dbx_row` | group | admin-p18h.js |
| `dbx_tables` | group | admin-p18h.js |
| `fm_delete` | owner,admin,editor | admin-p18h.js |
| `fm_list` | group | admin-p18h.js |
| `fm_mkdir` | owner,admin,editor | admin-p18h.js |
| `fm_rename` | owner,admin,editor | admin-p18h.js |
| `fm_restore` | owner,admin,editor | admin-p18h.js |
| `fm_trash` | group | admin-p18h.js |
| `fm_upload` | owner,admin,editor | admin-p18h.js |
| `fm_zip` | group | — |
| `mt_get` | signed-in | admin-p18h.js |
| `mt_set` | group | admin-p18h.js |

## `api/security-lib.php`

Security — 2FA, sessions, login hardening

| Action | Roles | Used by |
| --- | --- | --- |
| `login_2fa` | group | admin.js |
| `sec_2fa_begin` | signed-in | — |
| `sec_2fa_disable` | group | — |
| `sec_2fa_enable` | signed-in | — |
| `sec_2fa_reset` | group | — |
| `sec_alerts` | signed-in | — |
| `sec_get` | signed-in | — |
| `sec_recovery_new` | signed-in | — |
| `sec_revoke` | signed-in | — |
| `set_general_save` | group | — |
| `set_get` | group | — |
| `set_tracking_save` | group | — |
| `set_ts_test` | group | — |

## `api/arc-feed-lib.php`

Team feed

| Action | Roles | Used by |
| --- | --- | --- |
| `arc_feed_list` | group | admin-feed.js |
| `arc_feed_post` | group | admin-feed.js |

## `api/tg-lib.php`

Telegram channel

| Action | Roles | Used by |
| --- | --- | --- |
| `tg_connect` | owner,admin,editor | admin-tg.js |
| `tg_disconnect` | owner,admin | admin-tg.js |
| `tg_dm_set` | signed-in | admin-tg.js |
| `tg_get` | owner,admin,editor | admin-p36.js, admin-tg.js |
| `tg_link_code` | signed-in | admin-tg.js |
| `tg_save` | owner,admin,editor | admin-tg.js |
| `tg_test` | owner,admin,editor | admin-tg.js |
| `tg_test_me` | signed-in | admin-tg.js |
| `tg_unlink` | signed-in | — |

## `api/content-lib.php`

Website content (pages, blog, portfolio, services, cities, FAQs, testimonials, team, forms, estimator)

| Action | Roles | Used by |
| --- | --- | --- |
| `ai_run` | group | admin-content.js, admin-fields.js, admin-media.js |
| `ai_test` | group | admin-content.js |
| `alt` | group | — |
| `article` | group | — |
| `city` | group | — |
| `cms_ai_get` | group | admin-content.js |
| `cms_ai_models` | group | admin-content.js |
| `cms_ai_save` | group | admin-content.js |
| `cms_announce_get` | group | admin-p3.js |
| `cms_announce_save` | group | admin-p3.js |
| `cms_biz_assets` | group | admin-fields.js |
| `cms_biz_get` | group | admin-fields.js |
| `cms_biz_save` | group | admin-fields.js |
| `cms_delete` | group | admin-content.js, admin-fields.js |
| `cms_get` | group | admin-content.js, admin-fields.js, admin-templates.js |
| `cms_list` | group | admin-content.js, admin-fields.js, admin-media.js, admin-starters.js, admin-templates.js |
| `cms_page_kinds` | group | admin-fields.js, admin-templates.js |
| `cms_placements` | group | admin-content.js |
| `cms_placements_save` | group | admin-content.js |
| `cms_published` | group | admin-content.js, admin-fields.js |
| `cms_reorder` | group | admin-content.js |
| `cms_save` | group | admin-content.js, admin-fields.js, admin-starters.js, admin-templates.js |
| `cms_sitemap_add` | group | — |
| `cms_status` | group | admin-content.js |
| `cms_tpl_delete` | group | admin-templates.js |
| `cms_tpl_list` | group | admin-templates.js |
| `cms_tpl_save` | group | admin-templates.js |
| `excerpt` | group | — |
| `faqs` | group | — |
| `fix` | group | — |
| `improve` | group | — |
| `meta` | group | — |
| `outline` | group | — |

## `api/chat-lib.php`

Website live chat + AI answers

| Action | Roles | Used by |
| --- | --- | --- |
| `chat_assign` | group | — |
| `chat_cfg_get` | owner,admin | admin-p38wa.js |
| `chat_cfg_save` | owner,admin | — |
| `chat_close` | group | — |
| `chat_file` | group | admin-chat2.js |
| `chat_get` | group | admin-chat.js, admin-chat2.js |
| `chat_lead` | group | — |
| `chat_list` | group | admin-appr.js, admin-chat.js, admin-chat2.js, admin.js |
| `chat_mode` | group | admin-chat.js |
| `chat_note` | group | — |
| `chat_reply` | group | admin-chat.js, admin-chat2.js |
| `chat_tags` | group | — |
| `chat_test` | owner,admin | admin-aicenter.js |
| `chat_typing` | group | admin-chat2.js |
| `notif_poll` | signed-in | — |

## `api/whatsapp.php`

WhatsApp webhook

| Action | Roles | Used by |
| --- | --- | --- |
| `button` | group | — |
| `interactive` | group | — |
| `location` | group | — |
| `text` | group | — |

## `api/seo-agent-lib.php`

—

| Action | Roles | Used by |
| --- | --- | --- |
| `sag_cfg_save` | owner,admin | admin-seoagent.js |
| `sag_fix_save` | group | admin-seoagent.js |
| `sag_get` | group | admin-seoagent.js |
| `sag_propose` | group | admin-seoagent.js |
| `sag_scan` | group | admin-seoagent.js |

## `api/seo-lib.php`

—

| Action | Roles | Used by |
| --- | --- | --- |
| `seo_ai` | group | admin-seo.js |
| `seo_list` | group | admin-p36.js, admin-seo.js, admin-seo38.js |
| `seo_page` | group | admin-seo.js |
| `seo_robots_save` | owner,admin | admin-seo.js |
| `seo_save` | group | admin-seo.js |
| `seo_scores` | group | admin-seo.js |
| `seo_sitemap` | group | admin-seo.js |

## `api/sheets-lib.php`

—

| Action | Roles | Used by |
| --- | --- | --- |
| `sheets_get` | group | admin-sheets.js |
| `sheets_save` | group | admin-sheets.js |
| `sheets_sync` | group | admin-sheets.js |
| `sheets_test` | group | admin-sheets.js |

## `api/social-lib.php`

—

| Action | Roles | Used by |
| --- | --- | --- |
| `soc_ai_caption` | group | — |
| `soc_ai_reply` | group | — |
| `soc_cfg_save` | group | — |
| `soc_comment_read` | group | — |
| `soc_comment_reply` | group | — |
| `soc_comments_sync` | group | — |
| `soc_get` | group | — |
| `soc_post_delete` | group | — |
| `soc_post_save` | group | — |
| `soc_post_send` | group | — |

## `api/wahub-lib.php`

—

| Action | Roles | Used by |
| --- | --- | --- |
| `wah_cfg_save` | group | admin-wahub.js |
| `wah_insights` | group | admin-wains.js |
| `wah_overview` | group | admin-wahub.js |
| `wah_rule_delete` | group | admin-wahub.js |
| `wah_rule_save` | group | admin-wahub.js |
| `wah_tpl_submit` | group | admin-p18g.js |
| `wah_tpl_sync` | group | admin-p18g.js |
