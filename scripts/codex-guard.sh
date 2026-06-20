#!/usr/bin/env sh
set -eu

payload="$(cat)"

case "$payload" in
  *"농식품모태펀드 대시보드"*.html*|*"농식품모태펀드 대시보드"*".html"*)
    if printf '%s' "$payload" | grep -Eiq 'apply_patch|sed -i|perl -pi|python.+write|node.+write|truncate|>|>>'; then
      cat >&2 <<'MSG'
APFS Codex guard: legacy offline HTML bundle edit detected.

Canonical source is Vite/React under src/. Edit src/ and run npm run build
unless the user explicitly requested legacy bundle work.
MSG
      exit 2
    fi
    ;;
esac

if printf '%s' "$payload" | grep -Eiq 'npm run build|vite build'; then
  exit 0
fi

exit 0
