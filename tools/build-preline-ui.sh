#!/usr/bin/env bash
# =============================================================================
# Woodex Admin v2.7 — rebuild the Preline "Ocean Pure" stylesheet
# -----------------------------------------------------------------------------
#   bash tools/build-preline-ui.sh
#
# Compiles woodex-live-p23/admin/assets/preline-theme.src.css (Tailwind CSS v4 +
# Preline 5 theme/variants/Ocean/Moon presets, sources declared inside the CSS)
# into woodex-live-p23/admin/assets/preline-theme.css, and re-pins the runtime
# bundle at admin/vendor/preline.js so the sheet and the JS never drift apart.
#
# No CDN: the compiled sheet is committed, exactly like admin.css and the
# ARC.STUDIO kit. Node + npm are needed only on the machine doing the rebuild.
# Override the scratch dir with WX_UI_BUILD_DIR=/path when /tmp is not writable.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TREE="$ROOT/woodex-live-p23"
BUILD="${WX_UI_BUILD_DIR:-${TMPDIR:-/tmp}/woodex-ui-build}"

TW="tailwindcss@4"
CLI="@tailwindcss/cli@4"
PRELINE="preline@5"

echo "→ build dir : $BUILD"
mkdir -p "$BUILD"
cd "$BUILD"
[ -f package.json ] || npm init -y >/dev/null 2>&1
npm install --silent --no-audit --no-fund "$TW" "$CLI" "$PRELINE"

# Tailwind resolves bare @import specifiers ("tailwindcss", "preline/theme.css")
# by walking up from the CSS file, so the repository needs a node_modules link
# while the build runs; it is removed again on exit.
LINK="$ROOT/node_modules"
created=0
if [ ! -e "$LINK" ]; then ln -s "$BUILD/node_modules" "$LINK"; created=1; fi
cleanup() { [ "$created" = 1 ] && rm -f "$LINK" || true; }
trap cleanup EXIT

echo "→ compiling admin/assets/preline-theme.css"
npx --prefix "$BUILD" "@tailwindcss/cli" \
  -i "$TREE/admin/assets/preline-theme.src.css" \
  -o "$TREE/admin/assets/preline-theme.css"

echo "→ vendoring the runtime the sheet was compiled against"
cp "$BUILD/node_modules/preline/dist/preline.js" "$TREE/admin/vendor/preline.js"
cp "$BUILD/node_modules/preline/LICENSE"        "$TREE/admin/vendor/PRELINE-LICENSE.txt"

echo "→ result"
wc -c "$TREE/admin/assets/preline-theme.css" "$TREE/admin/vendor/preline.js"
echo "done — commit admin/assets/preline-theme.css + admin/vendor/preline* if they changed"
