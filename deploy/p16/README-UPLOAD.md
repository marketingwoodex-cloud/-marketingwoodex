# P16 step 1 — upload
1. Hostinger → File Manager → `public_html` → Upload `woodex-live-p16-step1.zip`.
2. Right-click → Extract → tick **Overwrite** → Extract. Delete the zip.
3. Open `/admin/`, press **Ctrl+F5**, sign out and sign in again.
4. Menu → **System check**. Every item should be ✓. Send a screenshot of any ✗.

Fixes: page-builder "Not signed in" (header/footer, section library, service pages, city copy, blog import),
SSL error 20 (AI, PageSpeed, Google, WhatsApp) via bundled `api/cacert.pem`, and clear error messages instead of endless "Loading…".
