# woodex-live-p29-v2.1-pro QA probes

Read-only probes used for the master QA report (`QA-MASTER-REPORT-P29-V2.1-PRO.md`).

    cd tools/qa-p29 && npm install
    node phplint.js ../../woodex-live-p29-v2.1-pro          # PHP parse lint (php-parser, PHP 8.2 grammar)
    node harness.js ../../woodex-live-p29-v2.1-pro "#/settings/integrations" 2000
    THEME=light node theme-probe.js ../../woodex-live-p29-v2.1-pro "#/security"
    THEME=dark  node theme-probe.js ../../woodex-live-p29-v2.1-pro "#/security"
    THEME=dark  node sidebar-probe.js ../../woodex-live-p29-v2.1-pro "#/security"

Notes:
- jsdom does not resolve `var()` or run layout. Judge canvas colour from the CSS source, not from computed style.
- `harness-db.js` is a copy that returns `dbError:true` from `status` and tags navigation errors.
- `bad.php` is a deliberate syntax error used as a negative control for `phplint.js`.
