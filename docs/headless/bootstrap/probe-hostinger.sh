#!/usr/bin/env bash
# Hostinger capability probe for the Woodex platform (Laravel 12 / PHP 8.3 / Supabase Postgres).
# Run ON THE SERVER over SSH.  Read-only except for a temp folder it removes again.
# Usage:  bash probe-hostinger.sh [supabase_pooler_host] [port]
#   e.g.  bash probe-hostinger.sh aws-0-ap-southeast-1.pooler.supabase.com 5432
# The host name is NOT a secret. Never pass passwords. Paste the final SUMMARY block back to the planner.
set -u
HOST="${1:-}"; PORT="${2:-5432}"
declare -a RES
ok()   { RES+=("PASS  $1"); echo "  [PASS] $1"; }
bad()  { RES+=("FAIL  $1"); echo "  [FAIL] $1"; }
info() { echo "  [info] $1"; }
hr()   { echo; echo "== $1"; }

hr "Account / system"
info "user=$(whoami) home=$HOME"
info "os=$(uname -sr)"
info "disk: $(df -h "$HOME" 2>/dev/null | tail -1 | awk '{print $2" total, "$3" used, "$5" used%"}')"
info "inodes: $(df -i "$HOME" 2>/dev/null | tail -1 | awk '{print $3" used of "$2}')"

hr "PHP versions available"
CANDS=""
for p in /opt/alt/php83/usr/bin/php /opt/alt/php84/usr/bin/php /opt/alt/php82/usr/bin/php "$(command -v php 2>/dev/null)"; do
  [ -n "$p" ] && [ -x "$p" ] && CANDS="$CANDS $p"
done
BEST=""
for p in $CANDS; do
  v=$("$p" -r 'echo PHP_VERSION;' 2>/dev/null); info "$p -> $v"
  case "$v" in 8.3.*|8.4.*) [ -z "$BEST" ] && BEST="$p";; esac
done
if [ -n "$BEST" ]; then ok "PHP >= 8.3 CLI found: $BEST  (use as PHP_BIN secret)"; else bad "No PHP 8.3+ CLI found (TailAdmin Laravel / Laravel 12 need 8.3)"; fi

if [ -n "$BEST" ]; then
  hr "PHP extensions needed ($BEST)"
  for e in pdo_pgsql pgsql mbstring intl gd curl zip xml bcmath openssl fileinfo sodium ctype tokenizer; do
    if "$BEST" -m 2>/dev/null | grep -qix "$e"; then ok "ext $e"; else
      case "$e" in
        pdo_pgsql|pgsql) bad "ext $e MISSING -> cannot talk to Supabase/Postgres (try hPanel > PHP Configuration > Extensions)";;
        *) bad "ext $e missing";;
      esac
    fi
  done
  "$BEST" -m 2>/dev/null | grep -qix opcache && ok "ext opcache" || info "opcache not listed (CLI may differ from FPM)"
  info "memory_limit=$("$BEST" -r 'echo ini_get("memory_limit");') max_execution_time=$("$BEST" -r 'echo ini_get("max_execution_time");')"
fi

hr "Tools"
for t in git tar curl rsync composer node; do
  if command -v $t >/dev/null 2>&1; then ok "$t: $($t --version 2>&1 | head -1 | cut -c1-50)"; else
    case $t in composer|node|rsync) info "$t not found (fine: CI builds; scp+tar is used)";; *) bad "$t missing";; esac
  fi
done

hr "Symlink + atomic swap (needed for release folders)"
T="$HOME/.probe-$$"; mkdir -p "$T/a" "$T/b" && echo A >"$T/a/f" && echo B >"$T/b/f"
if ln -sfn "$T/a" "$T/current" 2>/dev/null && [ "$(cat "$T/current/f")" = A ]; then ok "symlink create/read"; else bad "symlink create"; fi
ln -sfn "$T/b" "$T/current.new" 2>/dev/null && mv -Tf "$T/current.new" "$T/current" 2>/dev/null && [ "$(cat "$T/current/f")" = B ] \
  && ok "atomic swap (ln -sfn + mv -Tf)" || bad "atomic swap"
rm -rf "$T"

hr "Cron"
if command -v crontab >/dev/null 2>&1; then ok "crontab command present (hPanel > Advanced > Cron Jobs also works)"; else info "no crontab binary: use hPanel Cron Jobs UI"; fi

hr "Outbound network"
tcp() { # host port -> ms or fail
  local s e; s=$(date +%s%N); if timeout 6 bash -c "exec 3<>/dev/tcp/$1/$2" 2>/dev/null; then e=$(date +%s%N); echo $(( (e-s)/1000000 )); else echo FAIL; fi; }
for hp in github.com:443 api.cloudflare.com:443; do r=$(tcp "${hp%%:*}" "${hp##*:}"); [ "$r" = FAIL ] && bad "tcp $hp" || ok "tcp $hp ${r}ms"; done
if [ -n "$HOST" ]; then
  r=$(tcp "$HOST" "$PORT")
  if [ "$r" = FAIL ]; then bad "tcp $HOST:$PORT (Supabase pooler) BLOCKED -> shared hosting cannot reach it; use VPS or other DB"; 
  else ok "tcp $HOST:$PORT ${r}ms"; [ "$r" -gt 120 ] && info "latency ${r}ms is high: every query pays this; pick a closer Supabase region or use a VPS with local Postgres"; fi
else info "no Supabase host given -> DB reachability NOT tested (re-run with host)"; fi

echo; echo "================ SUMMARY (paste this back) ================"
printf '%s\n' "${RES[@]}"
echo "PHP_BIN=${BEST:-none}"
echo "Host=${HOST:-n/a}:${PORT}  Date=$(date -u +%FT%TZ)"
