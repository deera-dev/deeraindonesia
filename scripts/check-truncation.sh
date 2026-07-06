#!/usr/bin/env bash
# scripts/check-truncation.sh
#
# Scan semua file JS/JSX di apps/ dan packages/ menggunakan esbuild.
# Jika esbuild menemukan syntax error (biasanya akibat truncation), file
# tersebut dilaporkan sebagai rusak.
#
# Usage:
#   ./scripts/check-truncation.sh           # scan semua file
#   ./scripts/check-truncation.sh --staged  # hanya file yang di-git-add

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESBUILD="$ROOT/node_modules/.bin/esbuild"
ERRORS=0

if [[ "${1:-}" == "--staged" ]]; then
  # Hanya file yang masuk staging area (untuk pre-commit hook)
  FILES=$(git -C "$ROOT" diff --cached --name-only --diff-filter=ACM \
    | grep -E '\.(js|jsx|ts|tsx)$' \
    | sed "s|^|$ROOT/|" || true)
else
  # Semua file JS/JSX di apps/ dan packages/
  FILES=$(find "$ROOT/apps" "$ROOT/packages" \
    -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    | sort)
fi

if [[ -z "$FILES" ]]; then
  echo "✅  Tidak ada file JS/JSX untuk diperiksa."
  exit 0
fi

CHECKED=0
while IFS= read -r FILE; do
  [[ -z "$FILE" ]] && continue
  CHECKED=$((CHECKED + 1))

  # esbuild --bundle=false hanya parse + transform, tidak resolve import
  RESULT=$("$ESBUILD" \
    --bundle=false \
    --loader="${FILE##*.}":jsx \
    --target=es2020 \
    "$FILE" 2>&1 > /dev/null) || true

  if echo "$RESULT" | grep -qE "^.*(error|ERROR):"; then
    echo "❌  TRUNCATED/BROKEN: ${FILE#$ROOT/}"
    echo "$RESULT" | grep -E "error:" | head -3 | sed 's/^/    /'
    ERRORS=$((ERRORS + 1))
  fi
done <<< "$FILES"

echo ""
echo "Diperiksa: $CHECKED file"
if [[ $ERRORS -gt 0 ]]; then
  echo "❌  $ERRORS file bermasalah ditemukan."
  exit 1
else
  echo "✅  Semua file OK."
  exit 0
fi
