#!/bin/bash
# Pre-Compaction Reminder (PreCompact hook)
# 컨텍스트 압축 *직전* 실행. 사용 가능한 스킬과 활성 Dev Docs 상태를 stdout 으로 출력하여
# 압축 후 새 컨텍스트에도 보존되도록 한다. (※ PostCompact 이벤트는 현행 스키마에 없으므로 PreCompact 사용)

# 방어적 hook: 탐색 실패로 죽지 않도록 -e 는 쓰지 않는다.
set -uo pipefail

# Claude Code 는 hook 을 프로젝트 루트(cwd)에서 실행한다. 안전하게 루트 기준으로 탐색.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[PRE-COMPACT REMINDER]"

# 사용 가능한 스킬 목록
if [ -d "$ROOT/.claude/skills" ]; then
  SKILLS="$(ls -d "$ROOT"/.claude/skills/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null | paste -sd ',' - | sed 's/,/, /g' || true)"
  if [ -n "$SKILLS" ]; then
    echo "Available skills: $SKILLS"
  fi
fi

# 활성 Dev Docs 확인
if [ -d "$ROOT/dev/active" ]; then
  ACTIVE="$(ls "$ROOT/dev/active" 2>/dev/null | grep -v '^\.gitkeep$' | paste -sd ',' - | sed 's/,/, /g' || true)"
  if [ -n "$ACTIVE" ]; then
    echo "Active dev docs: $ACTIVE"
    echo "Run /resume to restore context from dev docs."
  fi
fi

exit 0
