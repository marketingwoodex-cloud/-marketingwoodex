# Bootstrap kit — new repo + Hostinger Business staging

Files in this folder
| File | What it is | Status |
|---|---|---|
| `probe-hostinger.sh` | Checks your Hostinger server (PHP 8.3, `pdo_pgsql`, symlinks, outbound to Supabase). Run first. | syntax-checked; run locally with no PHP (reports it correctly) |
| `release.sh` | Server script: unpack → migrate → cache → switch → health check → auto-rollback | **tested here with a stub PHP**: good release, failed migration (rolled back), next release |
| `deploy-hostinger.yml` | GitHub Actions workflow (test → build → deploy) | YAML valid; **not yet run** on real GitHub/Hostinger |

> No secrets in chat, in git, or in these files. Passwords go only into GitHub *Secrets* and into `shared/.env` on the server.

## Step 0 — Create the new repo (you)
1. GitHub → org `marketingwoodex-cloud` → **New repository** → name `woodex-platform` → **Private** → add README. 
2. Branches: `main` (production, protect it) and `develop` (staging). Default branch = `develop`.
3. Keep the old repo (`-marketingwoodex`) **unchanged**. It is the live static site and the reference for migration.

## Step 1 — SSH key for deploys (you, 5 min)
On your own computer:
```
ssh-keygen -t ed25519 -f woodex_deploy -C "github-actions-woodex" -N ""
```
- hPanel → **Advanced → SSH Access** → note **IP, port (65002), username** → **SSH Keys → add** the **public** key (`woodex_deploy.pub`).
- Test: `ssh -i woodex_deploy -p 65002 USER@IP "echo ok"`.
- Get the host key line for pinning: `ssh-keyscan -p 65002 IP` → this text becomes the secret `SSH_KNOWN_HOSTS`.
- The **private** key file goes into GitHub Secrets (`SSH_KEY`) and then delete it from your computer.

## Step 2 — Run the probe (you, 5 min)
```
scp -P 65002 probe-hostinger.sh USER@IP:~
ssh -p 65002 USER@IP "bash ~/probe-hostinger.sh <supabase-pooler-host> 5432"
```
Paste the **SUMMARY** block to me. It tells us: PHP 8.3 path (`PHP_BIN`), `pdo_pgsql` yes/no, Supabase reachable yes/no, latency.
If `pdo_pgsql` is missing: hPanel → **Advanced → PHP Configuration → Extensions** → enable `pgsql`/`pdo_pgsql` (if not listed, Hostinger support can tell you; otherwise → VPS, see master plan §4.2).

## Step 3 — Server folders (you or me, 5 min) — replace `uXXXX` and the domain
```
APP=~/apps/staging
mkdir -p $APP/{incoming,releases,shared/storage}
nano $APP/shared/.env          # create ONCE (names below), never commit
```
`.env` keys (values are yours): `APP_NAME APP_ENV=staging APP_KEY APP_DEBUG=false APP_URL=https://staging.woodex.com.pk` · `DB_CONNECTION=pgsql DB_HOST DB_PORT=5432 DB_DATABASE DB_USERNAME DB_PASSWORD DB_SSLMODE=require` (Supabase **Session pooler**) · `SESSION_DRIVER=database CACHE_STORE=database QUEUE_CONNECTION=database` · R2: `AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto AWS_BUCKET AWS_ENDPOINT AWS_USE_PATH_STYLE_ENDPOINT=true`.
`APP_KEY`: run `php artisan key:generate --show` on your computer and paste the value.

## Step 4 — Staging subdomain (you, 5 min)
1. hPanel → **Domains → Subdomains** → create `staging` for `woodex.com.pk`. Note its folder (usually `~/domains/woodex.com.pk/public_html/staging`).
2. **After the first successful deploy** (Step 6), replace that folder by a link (only the subdomain folder; never touch the main `public_html` while the live site runs there):
```
rmdir ~/domains/woodex.com.pk/public_html/staging      # must be empty
ln -s ~/apps/staging/current/public ~/domains/woodex.com.pk/public_html/staging
```
3. Open `https://staging.woodex.com.pk/up` → must show OK. If you get 403/500, tell me: fallback is "copy `public/`" (master plan §4.2, step 2).
4. Cloudflare/hPanel: enable SSL for the subdomain. Add a **password or IP allow-list** (staging must not be public/indexable: `X-Robots-Tag: noindex` is added by the app).

## Step 5 — Cron (you, 2 min) — hPanel → Advanced → **Cron Jobs**, every minute
```
/opt/alt/php83/usr/bin/php /home/uXXXX/apps/staging/current/artisan schedule:run >/dev/null 2>&1
```
(use the `PHP_BIN` path the probe printed). The app schedules `queue:work --stop-when-empty --max-time=50` itself.

## Step 6 — GitHub secrets/variables and first deploy (you)
Repo → Settings → **Environments** → create `staging` (and later `production`):
- Secrets: `SSH_KEY` `SSH_HOST` `SSH_PORT` `SSH_USER` `SSH_KNOWN_HOSTS` `PHP_BIN`
- Variables: `APP_DIR=/home/uXXXX/apps/staging` · `HEALTH_URL=https://staging.woodex.com.pk/up`
Then in the repo: put the Laravel app at the root, add `deploy/release.sh` and `.github/workflows/deploy.yml`, push to `develop`. Watch **Actions**.

## Rollback / troubleshooting
- Auto: `release.sh` switches back if migrate or the health check fails.
- Manual: `ln -sfn ~/apps/staging/releases/<old-id> ~/apps/staging/current.new && mv -Tf ~/apps/staging/current.new ~/apps/staging/current`.
- Old code still served after a switch? PHP OPcache path cache: hPanel → PHP Configuration → **Clear OPcache** (or wait ~2 min).
- Migrations are **additive only** (add columns/tables; drop in a later release) because rollback restores code, not data.
