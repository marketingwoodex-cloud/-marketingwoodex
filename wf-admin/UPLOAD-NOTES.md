# wf-admin — Complete Woodex Project (Ready-to-Upload Copy)

Clean duplicate of the full project (branch `arena/01a0e87c-marketingwoodex`).
Originals untouched. ~13 MB · 391 files · no passwords/keys inside.

## Inside
- Root folders (about, contact, services…) = 87 public website pages
- `admin/` = dashboard · `assets/` = site CSS/JS/images
- `content/` = editable page blocks (publish source of truth)
- `api/` + `netlify/functions/` = backend (runs on Vercel)
- `supabase/COMPLETE-MIGRATION.sql` = database setup (run once)
- `MASTER-PLAN.*`, `BACKEND-MASTER-PLAN.*` = plans
- `vercel.json` = Vercel routing

## Upload to Hostinger (6 steps)
1. hPanel → **Files → File Manager** → open `public_html`
2. Remove the placeholder `index.html` (keep `.htaccess` if shown)
3. On your computer: zip ALL files inside this folder
4. Upload the zip → right-click → **Extract** here
5. Open woodex.com.pk — site is live
6. Dashboard/CMS publishing needs Vercel (plan D1): see
   `BACKEND-MASTER-PLAN.md` → *Deployment readiness* (env vars + DNS table)
