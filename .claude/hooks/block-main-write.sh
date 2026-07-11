#!/usr/bin/env bash
# PreToolUse(Bash) 가드 — main/master 브랜치에서 git commit·push 직행을 차단한다.
#
# 이유: 이 저장소는 main push 시 Vercel이 프로덕션을 자동 배포한다(CLAUDE.md).
#       리뷰 없는 직행 커밋/푸시를 원천 차단한다. 정상 흐름(작업 브랜치 → PR →
#       GitHub에서 머지)에는 영향이 없다(로컬에서 main에 직접 commit/push 할 일이 없으므로).
#
# 동작: stdin JSON의 tool_input.command 가 git commit/push 이고 현재 브랜치가
#       main/master 이면 exit 2(차단 + 사유를 Claude에 전달). 그 외엔 exit 0(통과).
#
# 예외: 브랜치를 "삭제"하는 push(--delete/-d/`:refspec`)는 커밋을 main에 얹지 않아
#       Vercel 배포를 유발하지 않으므로 통과시킨다(피처 브랜치 정리는 정상 작업).
#       단, 삭제 대상이 main/master 이면 별개 위험이므로 계속 차단한다.
#
# 한계: command 문자열에 "git commit"/"git push" 가 텍스트로 들어가도(예: 설명 출력)
#       main 위에서는 매칭될 수 있다. 의도된 main 작업이거나 오탐이면 이 훅을 일시
#       비활성화하라(.claude/settings.json 의 PreToolUse 항목 제거/주석).

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)

# git commit / git push 명령만 검사 (그 외 모든 명령은 통과)
if ! printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  exit 0
fi

# 삭제 push 예외: --delete / -d / `:refspec`(콜론 선행) 은 브랜치 삭제라 배포와 무관.
# 단 삭제 대상이 main/master 면 통과시키지 않는다(아래 브랜치 검사로 차단 유지).
if printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+push([[:space:]]|$)'; then
  if printf '%s' "$cmd" | grep -Eq '(--delete([[:space:]]|=)|[[:space:]]-d([[:space:]]|$)|[[:space:]]:[^[:space:]])'; then
    if ! printf '%s' "$cmd" | grep -Eq '(:|[[:space:]])(refs/heads/)?(main|master)([[:space:]]|$)'; then
      exit 0
    fi
  fi
fi

branch=$(git branch --show-current 2>/dev/null)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "BLOCKED: '$branch' 브랜치에서 git commit/push 직행은 금지입니다 — 이 저장소는 main push 시 Vercel 프로덕션 자동배포가 걸립니다. 먼저 작업 브랜치를 만드세요:  git switch -c feat/<요약>  (의도된 main 작업/오탐이면 .claude/settings.json 의 PreToolUse 훅을 일시 비활성화)." >&2
  exit 2
fi
exit 0
