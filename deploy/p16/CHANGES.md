# P16 Phase 2 changes (baseline: p15 full zip)
- System check screen (PHP, DB, files, SSL, sign-in, Google/OpenAI/Meta/PageSpeed reachability)
- Page builder / header-footer / library / services / cities: sign-in fixed (admin-token fallback, reason shown) + Retry buttons
- SSL error 20 fixed for AI, Google, WhatsApp, PageSpeed (bundled api/cacert.pem)
- Test-AI chat readable (light + dark)
- FAQ groups: purpose explained
- Builder: 50 v26 templates in the Sections tab (filter, search, drag/click)
- AI: model list loaded from the provider, best model auto-selected; new Custom/local endpoint provider
- Speed test + health check: clear errors (quota, unreachable), more time
- WhatsApp: connect / change number / disconnect; discount offers to leads
- Google Analytics 4 + Search Console via free service account
New files: api/cacert.pem, api/google-data-lib.php, admin/admin-system.js, admin/admin-offers.js, admin/admin-google.js
