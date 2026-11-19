#!/usr/bin/env bash
# HG-008 — bump cache-bust ?v=<N+1> di semua HTML GajiCVKita + commit terpisah.
# Pemakaian: bash scripts/bump-cache.sh            # auto N+1 (max semua ?v= saat ini)
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=$(ls index.html compare.html offer-analyzer.html pay.html 2>/dev/null || true)
[ -n "$FILES" ] || { echo "tidak ada HTML"; exit 1; }

# versi tertinggi saat ini
MAXV=$(grep -hoE '\?v=[0-9]+' $FILES | grep -oE '[0-9]+' | sort -n | tail -1)
NEWV=$(( ${MAXV:-0} + 1 ))

for f in $FILES; do
  # hanya naikkan versi yang lama -> NEWV (CSS & JS refs)
  sed -i -E "s/(\.(css|js))\?v=[0-9]+/\1?v=${NEWV}/g" "$f"
done

git add $FILES
git commit -q -m "chore: bump cache-bust ?v=${NEWV} (HG-008 automation)"
echo "bumped ?v=${NEWV} di: $FILES"
