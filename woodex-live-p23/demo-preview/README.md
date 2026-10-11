# demo-preview/ — the Woodex admin with no PHP

A copy of `../admin/` that runs on any static file server. Regenerate it after changing the admin:

```bash
node tools/build-demo-copy.mjs          # rebuild
node tools/build-demo-copy.mjs --check  # report drift, write nothing
node tools/verify-demo-copy.mjs         # sign in and walk all 60 routes over HTTP
```

* every other file here is a byte-for-byte copy of `../admin/`
* `demo-api.js` is hand-written and is never overwritten by the generator: it wraps `window.fetch` so
  POSTs to `/api/admin.php` and `/api/builder.php` are answered from `demo-data.js`
* `demo-data.js` is generated from `tools/demo-data.mjs` — the same fixture set the Node demo server uses
* the copied `index.html` differs in exactly two ways: `<base href="/demo-preview/">` (the original
  points at `/admin/`, which would make the copy load the original's files) and the two `<script>`
  tags before `admin.js`
* the original `../admin/` is never written to
