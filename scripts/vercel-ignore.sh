#!/bin/bash
# Vercel "Ignored Build Step": exit 0 = lewati build, exit 1 = build.

if [ "$VERCEL_ENV" != "production" ]; then
  case "$VERCEL_GIT_COMMIT_MESSAGE" in
    *"[preview]"*) echo "Preview diminta lewat [preview] → build" ; exit 1 ;;
    *) echo "Preview ($VERCEL_GIT_COMMIT_REF) dilewati; tambahkan [preview] di pesan commit kalau perlu" ; exit 0 ;;
  esac
fi

case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[skip deploy]"*) echo "[skip deploy] → lewati" ; exit 0 ;;
esac

BASE="$VERCEL_GIT_PREVIOUS_SHA"
if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  BASE="HEAD^"
fi

if git diff --quiet "$BASE" HEAD -- . ../../packages/shared ../../package-lock.json \
  ':(exclude,glob)**/*.test.js' ':(exclude,glob)**/*.test.jsx' ':(exclude,glob)**/*.md' \
  ':(exclude,glob)**/test/**'; then
  echo "Tidak ada perubahan yang mempengaruhi app ini sejak $BASE → lewati"
  exit 0
fi
echo "Ada perubahan sejak $BASE → build"
exit 1
