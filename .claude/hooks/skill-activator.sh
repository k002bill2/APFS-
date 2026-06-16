#!/bin/bash
# Skills Auto-Activator (UserPromptSubmit hook)
# 사용: skill-activator.sh "$PROMPT"
#
# 동작:
#   1. 프롬프트 텍스트를 확보한다 ($1 인자 우선, 비어 있으면 stdin JSON의 .prompt).
#      - Claude Code 는 UserPromptSubmit hook 으로 JSON 객체를 stdin 으로 전달한다.
#      - settings.json 의 "$PROMPT" 치환이 비어 있는 환경에서도 동작하도록 stdin 을 폴백으로 읽는다.
#   2. skill-rules.json 의 키워드/intentPatterns 와 매칭한다.
#   3. 매칭된 스킬을 priority(critical>high>medium>low) 순으로 정렬해 stdout 으로 출력한다.
#      - UserPromptSubmit hook 의 stdout 은 해당 턴의 추가 컨텍스트로 모델에 주입된다.
#
# 방어: jq 미설치 환경에서도 grep 폴백으로 에러 없이 종료(exit 0)한다.

# 방어적 hook: 매칭 실패(grep/test 가 1 반환)로 스크립트가 죽지 않도록 -e 는 쓰지 않는다.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_FILE="$SCRIPT_DIR/skill-rules.json"

# --- 1. 프롬프트 확보 ---
PROMPT="${1:-}"
if [ -z "$PROMPT" ] && [ ! -t 0 ]; then
  # stdin 에 데이터가 있으면 읽는다 (Claude Code 가 JSON 을 전달).
  STDIN_DATA="$(cat 2>/dev/null || true)"
  if [ -n "$STDIN_DATA" ]; then
    if command -v jq >/dev/null 2>&1; then
      # JSON 이면 .prompt 추출, 아니면 원문 그대로 사용
      EXTRACTED="$(printf '%s' "$STDIN_DATA" | jq -r '.prompt // empty' 2>/dev/null || true)"
      PROMPT="${EXTRACTED:-$STDIN_DATA}"
    else
      # jq 없으면 단일라인 JSON 의 .prompt 만 best-effort 추출, 실패 시 원문 사용
      EXTRACTED="$(printf '%s' "$STDIN_DATA" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)"
      PROMPT="${EXTRACTED:-$STDIN_DATA}"
    fi
  fi
fi

# 프롬프트도 규칙 파일도 없으면 조용히 종료
[ -z "$PROMPT" ] && exit 0
[ ! -f "$RULES_FILE" ] && exit 0

MATCHED=""

# --- 2. 매칭 (jq 경로) ---
if command -v jq >/dev/null 2>&1; then
  MATCHED="$(jq -r --arg prompt "$PROMPT" '
    def prio_rank:
      if . == "critical" then 0
      elif . == "high" then 1
      elif . == "medium" then 2
      else 3 end;
    ($prompt | ascii_downcase) as $p
    | [ .rules[]
        | select(
            any(.keywords[];
              (ascii_downcase) as $k
              # ASCII 단어경계 매칭: 영어 키워드가 더 긴 단어 안에 박혀 오탐("pr"⊂"improve")나는 것을 막는다.
              # 한글 등 비-ASCII 키워드는 [^a-z0-9] 경계가 항상 성립하므로 부분문자열 매칭으로 동작(정규식 metachar 없는 키워드 가정).
              | $p | test("(^|[^a-z0-9])" + $k + "([^a-z0-9]|$)")
            )
          )
        | { rank: (.priority | prio_rank), line: "\(.priority | ascii_upcase): \(.skillName)\( if .enforcement == "block" then "  [BLOCK]" else "" end)" }
      ]
    | sort_by(.rank)
    | .[].line
  ' "$RULES_FILE" 2>/dev/null || true)"
else
  # --- 2b. 매칭 (grep 폴백): skillName + keywords 라인을 단순 추출 ---
  LOWER_PROMPT="$(printf '%s' "$PROMPT" | tr '[:upper:]' '[:lower:]')"
  # skillName 과 keywords 를 줄 단위로 모아 단순 포함 검사
  while IFS= read -r skill; do
    [ -z "$skill" ] && continue
    # 해당 skillName 블록의 keywords 중 하나라도 프롬프트에 있으면 출력
    kws="$(grep -A6 "\"skillName\": \"$skill\"" "$RULES_FILE" 2>/dev/null | grep '"keywords"' | head -1 || true)"
    hit=0
    for kw in $(printf '%s' "$kws" | grep -oE '"[^"]+"' | tr -d '"' | grep -v keywords || true); do
      lkw="$(printf '%s' "$kw" | tr '[:upper:]' '[:lower:]')"
      if printf '%s' "$lkw" | grep -qE '^[a-z0-9 ]+$'; then
        # ASCII 키워드: 단어경계 매칭(임베딩 오탐 방지). 가드 덕에 metachar 없음이 보장됨.
        pat='(^|[^a-z0-9])'"$lkw"'([^a-z0-9]|$)'
        printf '%s' "$LOWER_PROMPT" | grep -qE "$pat" && { hit=1; break; }
      else
        # 비-ASCII(한글 등): 부분문자열 매칭
        case "$LOWER_PROMPT" in *"$lkw"*) hit=1; break;; esac
      fi
    done
    [ "$hit" = "1" ] && MATCHED="${MATCHED}MATCH: ${skill}\n"
  done < <(grep -oE '"skillName": "[^"]+"' "$RULES_FILE" 2>/dev/null | sed -E 's/.*"skillName": "([^"]+)".*/\1/' || true)
  MATCHED="$(printf '%b' "$MATCHED")"
fi

# --- 3. 출력 ---
if [ -n "$MATCHED" ]; then
  echo "[SKILLS ACTIVATED]"
  echo "$MATCHED"
fi

exit 0
