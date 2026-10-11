#!/usr/bin/env bash
# Browser evidence run (QA only, headless Chromium, stub API, no production).
# Needs the QA-only install in tools/qa-p29 (@sparticuz/chromium, puppeteer-core).
# Trees: WT = working tree (default: repo copy). Controls are extracts outside the repo:
#   PREFIX = git archive of b8083f1 (pre-fix), HEADT = git archive of HEAD before this pass.
# Example:
#   mkdir -p /tmp/prefix && git archive b8083f1 | tar -x -C /tmp/prefix
#   mkdir -p /tmp/headtree && git archive 24157f6 | tar -x -C /tmp/headtree
set -u
D="$(cd "$(dirname "$0")" && pwd)"
WT="${WT:-$D/../../woodex-live-p29-v2.1-pro}"
PREFIX="${PREFIX:-/tmp/prefix/woodex-live-p29-v2.1-pro}"
HEADT="${HEADT:-/tmp/headtree/woodex-live-p29-v2.1-pro}"
run() { node "$D/browser-regression.mjs" "$@" 2>&1 | tr -d '\n' | sed 's/  */ /g'; echo; }
echo "## T-16 Settings honesty (AD-05/06/07): Test Ping + Save"
echo "working tree: $(run "$WT" t16 owner)"
echo "HEAD control: $(run "$HEADT" t16 owner)"
echo "## T-18 Editor dashboard (OV-01/OV-03)"
echo "working tree: $(run "$WT" editor-dash editor)"
echo "HEAD control: $(run "$HEADT" editor-dash editor)"
echo "## AD-10 in-app navigation (sidebar link from /admin/)"
echo "pre-fix: $(run "$PREFIX" approvals owner)"
echo "working tree: $(run "$WT" approvals owner)"
echo "## AD-10 Security page still renders"
echo "working tree: $(run "$WT" security owner)"
echo "## AD-10 fresh load on #/approvals, no jitter"
echo "pre-fix: $(JITTER= run "$PREFIX" approvals-initial owner)"
echo "working tree: $(JITTER= run "$WT" approvals-initial owner)"
echo "## AD-10 fresh load on #/approvals, seeded script jitter 1-8"
for seed in 1 2 3 4 5 6 7 8; do
  echo "seed $seed pre-fix: $(JITTER=$seed run "$PREFIX" approvals-initial owner)"
  echo "seed $seed working tree: $(JITTER=$seed run "$WT" approvals-initial owner)"
done
