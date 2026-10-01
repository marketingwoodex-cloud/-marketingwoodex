#!/usr/bin/env bash
# Runs ON THE SERVER, called by the GitHub Action:  APP_DIR=... PHP_BIN=... HEALTH_URL=... bash release.sh <release-id>
# Layout:  $APP_DIR/{incoming,releases/<id>,shared/{.env,storage},current -> releases/<id>}
# Rule: migrations must be additive-only, because rollback restores code, not data.
set -Eeuo pipefail
ID="${1:?release id}"; APP_DIR="${APP_DIR:?}"; PHP="${PHP_BIN:-php}"; HEALTH_URL="${HEALTH_URL:-}"
REL="$APP_DIR/releases/$ID"; ARCHIVE="$APP_DIR/incoming/release-$ID.tgz"; KEEP=5
[ -f "$APP_DIR/shared/.env" ] || { echo "Missing $APP_DIR/shared/.env (create it once by hand)"; exit 2; }
PREV="$(readlink "$APP_DIR/current" 2>/dev/null || true)"
DOWN=0
rollback() {
  echo "!! release $ID failed - rolling back"
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then ln -sfn "$PREV" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"; echo "current -> $PREV"; fi
  [ "$DOWN" = 1 ] && (cd "${PREV:-$REL}" && "$PHP" artisan up || true)
  exit 1
}
trap rollback ERR

mkdir -p "$REL" "$APP_DIR/shared/storage"/{app/public,framework/{cache,sessions,views},logs}
tar -xzf "$ARCHIVE" -C "$REL"
ln -sfn "$APP_DIR/shared/.env" "$REL/.env"
rm -rf "$REL/storage"; ln -sfn "$APP_DIR/shared/storage" "$REL/storage"
rm -rf "$REL/public/storage"; ln -sfn "$APP_DIR/shared/storage/app/public" "$REL/public/storage"
chmod -R u+rwX "$REL/bootstrap/cache" 2>/dev/null || true

cd "$REL"
"$PHP" artisan down --retry=30 --refresh=15 || true; DOWN=1
if "$PHP" artisan list --raw 2>/dev/null | grep -q '^app:backup-db'; then "$PHP" artisan app:backup-db; else echo "(no app:backup-db command yet - skipping pre-migration backup)"; fi
"$PHP" artisan migrate --force
"$PHP" artisan config:cache; "$PHP" artisan route:cache; "$PHP" artisan view:cache; "$PHP" artisan event:cache || true

ln -sfn "$REL" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
"$PHP" artisan queue:restart || true
"$PHP" artisan up; DOWN=0

if [ -n "$HEALTH_URL" ]; then
  sleep 2; curl -fsS --max-time 20 "$HEALTH_URL" >/dev/null || { echo "health check failed: $HEALTH_URL"; false; }
fi
trap - ERR
rm -f "$ARCHIVE"
ls -1dt "$APP_DIR"/releases/*/ | tail -n +$((KEEP+1)) | xargs -r rm -rf
echo "OK release $ID live (previous: ${PREV:-none})"
