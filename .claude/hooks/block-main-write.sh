#!/usr/bin/env bash
# PreToolUse(Bash) 가드 — main/master 브랜치에서 git commit·push 직행을 차단한다.
#
# 위협 모델: 이것은 "정상 에이전트 작업 중 실수로 main에 쓰는 것"을 막는 best-effort
#            가드지, 의도적 우회에 대한 보안 경계가 아니다. 훅은 명령 문자열만 보므로
#            ECC_DISABLED_HOOKS·`gh api`·git alias·`command git` 등으로 한 줄이면
#            우회 가능하다(경계로 설계하지 말 것). 목표는 사고 방지, 강제가 아니다.
#
# 이유: 이 저장소는 main push 시 Vercel이 프로덕션을 자동 배포한다(CLAUDE.md).
#       리뷰 없는 직행 커밋/푸시를 원천 차단한다. 정상 흐름(작업 브랜치 → PR →
#       GitHub에서 머지)에는 영향이 없다(로컬에서 main에 직접 commit/push 할 일이 없으므로).
#
# 동작: stdin JSON의 tool_input.command 가 git commit/push 이고 현재 브랜치가
#       main/master 이면 exit 2(차단 + 사유를 Claude에 전달). 그 외엔 exit 0(통과).
#
# 예외: `git push --delete`/`-d` 는 git이 나열된 모든 ref 를 "삭제"로 처리하며
#       콘텐츠 push 와 혼용이 불가능하다(git 문서: "All listed refs are deleted").
#       즉 커밋을 main 에 얹지 않아 Vercel 배포를 유발하지 않으므로 통과시킨다
#       (병합된 피처 브랜치 정리는 정상 작업). 단 삭제 대상이 main/master 면 계속 차단.
#
#       단, 임의의 셸 텍스트는 정적 분석으로 신뢰할 수 없으므로(정규식이 셸 연쇄·치환·
#       확장을 파싱 못 함) 예외는 "정적으로 안전한 단일 push --delete" 에만 적용한다:
#         - 복합/치환/확장/리다이렉트 메타문자(; & | 개행 $ ` ( ) { } < > * ?)가 있으면
#           예외를 포기하고 원래 차단 경로로 떨어뜨린다(fail-closed).
#           → `git push origin --delete old; git push origin HEAD`(복합),
#             `git push origin --delete "$b"`(동적 확장) 등 우회를 원천 차단.
#         - 콜론 refspec(`:branch`) 단독형도 제외 — `HEAD :old` 처럼 콘텐츠 push 와
#           섞일 수 있다. 콜론 삭제가 필요하면 `--delete` 를 쓰라.
#
# 한계: command 문자열에 "git commit"/"git push" 가 텍스트로 들어가도(예: 설명 출력)
#       main 위에서는 매칭될 수 있다. 의도된 main 작업이거나 오탐이면 이 훅을 일시
#       비활성화하라(.claude/settings.json 의 PreToolUse 항목 제거/주석).

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)

# git commit / git push 명령만 검사 (그 외 모든 명령은 통과)
if ! printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  exit 0
fi

# 삭제 push 예외 — 정적으로 안전한 단일 push --delete/-d 만 통과.
if printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+push([[:space:]]|$)'; then
  unsafe=0
  # (1) 개행 = 복합 명령 → 예외 포기
  case $cmd in *"
"*) unsafe=1 ;; esac
  # (2) 백슬래시 이스케이프(`m\ain`)는 텍스트 스캔을 속이므로 예외 포기
  case $cmd in *\\*) unsafe=1 ;; esac
  # (3) 삭제 부정 옵션(--no-delete)이 있으면 실제로는 삭제가 아닐 수 있음 → 예외 포기
  case $cmd in *--no-delete*) unsafe=1 ;; esac
  # (4) 셸 연쇄/치환/확장/리다이렉트 메타문자가 있으면 정적 분석 불가 → 예외 포기
  if printf '%s' "$cmd" | LC_ALL=C grep -q '[;&|`$(){}<>*?]'; then unsafe=1; fi
  if [ "$unsafe" = 0 ] \
     && printf '%s' "$cmd" | grep -Eq '(--delete([[:space:]]|=)|[[:space:]]-d([[:space:]]|$))'; then
    # 여기까지 왔으면 셸 확장이 없는 정적 텍스트. 따옴표만 벗겨 main/master 타깃 검사.
    stripped=${cmd//\"/}
    stripped=${stripped//\'/}
    if ! printf '%s' "$stripped" | grep -Eq '(^|[[:space:]:])((refs/)?heads/)?(main|master)([[:space:]]|$)'; then
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
