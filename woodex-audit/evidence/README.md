# Evidence Folder

Access-controlled. Everything here is sanitised: no credential values, no hash values, no bank details, no personal data.

- `sanitized-command-output/` — command results with dates and revisions. See `../23-evidence-index.md` for what each file shows.
- `scripts/` — read-only checks. None makes a network call. None writes outside its stdout.

## Re-running
```
cd <repo root>
python3 woodex-audit/evidence/scripts/reverify_findings.py .
python3 woodex-audit/evidence/scripts/regression_static.py .
python3 woodex-audit/evidence/scripts/bcrypt_literal_check.py woodex-live-p29-v2.1-pro
for f in woodex-live-p29-v2.1-pro/admin/*.js; do node --check "$f" || echo FAIL "$f"; done
```
The jsdom probes need `jsdom` installed. Copy `tools/qa-p29/*.js` to a folder that has `node_modules`, then run them there.

## Rules for new evidence
- Never paste a credential value, a hash, an IBAN, or an email address. Use file, line, key name, or a short fingerprint.
- Name each output with the date and the revision it was produced from.
- Mark anything not run as NOT RUN or BLOCKED. Do not leave it out.
