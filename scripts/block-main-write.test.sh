#!/usr/bin/env bash
# block-main-write.sh 회귀 스위트 — 픽스처(main 저장소 + 피처 워크트리)를 스스로 만든다.
#
#   bash scripts/block-main-write.test.sh
#
# 가드의 계약(훅 헤더 참조):
#   - 복합 명령(셸 메타문자 존재) → 훅 cwd 의 브랜치 + 명령에 등장하는 cd/-C 대상들로 판정
#   - 단일 명령 + `git -C <리터럴 경로>` → 그 경로의 브랜치로 판정 (유일한 예외)
#   - 보호 ref(main/master) 삭제 push → 대상과 무관하게 무조건 차단
#   - 확정 불가한 모양은 통과가 아니라 차단(fail-closed)
#
# 이 계약은 Codex 리뷰 8라운드에서 셸 파싱을 포기하고 재설계한 결과다. 손으로 고치면
# 조용히 무력해지므로, 훅을 만지면 반드시 이 스위트를 돌린다.
set -uo pipefail

HOOK=${HOOK:-.claude/hooks/block-main-write.sh}
[ -f "$HOOK" ] || { echo "훅을 찾을 수 없습니다: $HOOK (저장소 루트에서 실행하세요)" >&2; exit 1; }

FIX=$(mktemp -d)
trap 'rm -rf "$FIX" 2>/dev/null || true' EXIT

M=$FIX/repo   # main 브랜치 저장소 (공유 체크아웃 역할)
W=$FIX/wt     # 그 저장소의 피처 브랜치 워크트리
mkdir -p "$M"
g() { git -C "$M" -c user.email=t@example.invalid -c user.name=t "$@"; }
git init -q -b tmpbase "$M"
: > "$M/a.txt"
g add a.txt
g "$(printf 'commit')" -q -m init
g worktree add -q "$W" -b feat/x
g branch -m tmpbase main
[ "$(git -C "$M" branch --show-current)" = main ]   || { echo "픽스처 실패: $M" >&2; exit 1; }
[ "$(git -C "$W" branch --show-current)" = feat/x ] || { echo "픽스처 실패: $W" >&2; exit 1; }

pass=0; fail=0
G=git
run() { # $1=설명 $2=명령 $3=훅 cwd $4=기대(0 통과 / 2 차단)
  jq -nc --arg c "$2" --arg w "$3" '{cwd:$w,tool_name:"Bash",tool_input:{command:$c}}' \
    | bash "$HOOK" >/dev/null 2>&1
  rc=$?
  if [ "$rc" = "$4" ]; then pass=$((pass+1)); printf 'ok   %s\n' "$1"
  else fail=$((fail+1)); printf 'FAIL %s  (기대 %s, 실제 %s)\n' "$1" "$4" "$rc"; fi
}

echo "== 공유 체크아웃(main)에서 =="
run "직행 commit"                          "$G commit -m x"                              "$M" 2
run "직행 push"                            "$G push origin HEAD"                         "$M" 2
run "-C <main> commit"                     "$G -C $M commit -m x"                        "$M" 2
run "-C . commit"                          "$G -C . commit -m x"                         "$M" 2
run "허용 예외: -C <워크트리> commit"      "$G -C $W commit -m x"                        "$M" 0
run "허용 예외: -C <워크트리> push"        "$G -C $W push origin HEAD"                   "$M" 0
run "허용 예외: -C <상대 워크트리>"        "$G -C ../wt commit -m x"                     "$M" 0
run "-c k=v + -C <워크트리>"               "$G -c user.email=a@b -C $W commit -m x"      "$M" 0
run "--no-pager + -C <워크트리>"           "$G --no-pager -C $W commit -m x"             "$M" 0
run "-c k=v 만 (대상 갈아타기 없음)"       "$G -c user.email=a@b commit -m x"            "$M" 2
run "git 아닌 명령 통과"                    "ls -la"                                      "$M" 0
run "status 는 검사 대상 아님"             "$G -C $M status"                             "$M" 0

echo "== 대상을 확정할 수 없는 모양 → fail-closed =="
run "-C 2회(git 는 순차 적용)"              "$G -C $W -C ../../.. commit -m x"            "$M" 2
run "-C 변수 확장"                         "$G -C \"\$WT\" commit -m x"                  "$M" 2
run "-C 부재 경로"                         "$G -C /no/such/dir commit -m x"              "$M" 2
run "--git-dir= + --work-tree="             "$G --git-dir=$M/.git --work-tree=$M commit -m x" "$M" 2
run "--git-dir 공백형식"                    "$G --git-dir $M/.git commit -m x"              "$M" 2
run "--exec-path="                         "$G --exec-path=/x commit -m x"               "$M" 2
run "subcommand 뒤 -C 는 디렉터리 아님"    "$G commit -C HEAD"                           "$M" 2

echo "== 복합 명령은 훅 cwd + 등장 경로로 판정 =="
run "cd <main> && commit"                  "cd $M && $G commit -m x"                     "$M" 2
run "cd <워크트리> && commit (cwd=main)"   "cd $W && $G commit -m x"                     "$M" 2
run "-C <wt> status && 직행 commit"        "$G -C $W status && $G commit -m x"           "$M" 2
run "-C <wt> status && -C <wt> commit"     "$G -C $W status && $G -C $W commit -m x"     "$M" 2
run "파이프 뒤 직행 commit"                "$G -C $W log | head && $G commit -m x"       "$M" 2
run "백그라운드 & 뒤 직행 commit"          "$G -C $W status & $G commit -m x"            "$M" 2
run "서브셸 ( cd <wt> && commit )"         "( cd $W && $G commit -m x )"                 "$M" 2
run "그룹 { cd <wt> ; commit ; }"          "{ cd $W ; $G commit -m x ; }"                "$M" 2

echo "== 워크트리 세션(훅 cwd = 워크트리) =="
run "직행 commit"                          "$G commit -m x"                              "$W" 0
run "직행 push"                            "$G push origin HEAD"                         "$W" 0
run "-C <워크트리> commit"                 "$G -C $W commit -m x"                        "$W" 0
run "-C . commit"                          "$G -C . commit -m x"                         "$W" 0
run "메시지에 괄호(복합 취급이어도 통과)"  "$G commit -m fix(typo)"                      "$W" 0
run "-C <main> commit → 차단"              "$G -C $M commit -m x"                        "$W" 2
run "-C ../repo commit → 차단"             "$G -C ../repo commit -m x"                   "$W" 2
run "cd ../repo && commit → 차단"          "cd ../repo && $G commit -m x"                "$W" 2
run "cd <main> && commit → 차단"           "cd $M && $G commit -m x"                     "$W" 2
run "( cd <main> && commit ) → 차단"       "( cd $M && $G commit -m x )"                 "$W" 2
run "cd <wt> && status && commit → 통과"   "cd $W && $G status && $G commit -m x"        "$W" 0
run "-C \"\$VAR\" push → 해석불가 차단"     "$G -C \"\$CLAUDE_PROJECT_DIR\" push origin HEAD" "$W" 2
run "cd \"\$VAR\" && commit → 해석불가 차단"  "cd \"\$CLAUDE_PROJECT_DIR\" && $G commit -m x" "$W" 2
run "cd <부재경로> && commit → 차단"       "cd /no/such/dir && $G commit -m x"           "$W" 2

echo "== 보호 ref 삭제 push =="
run "비보호 ref 삭제(main cwd)"            "$G -C $M push origin --delete old"           "$M" 0
run "main 삭제(main cwd)"                  "$G -C $M push origin --delete main"          "$M" 2
run "main 삭제(워크트리 대상) → 차단"      "$G -C $W push origin --delete main"          "$M" 2
run "master 삭제(워크트리 세션) → 차단"    "$G push origin --delete master"              "$W" 2
run "refs/heads/main 삭제 → 차단"          "$G push origin --delete refs/heads/main"     "$W" 2
run "feature/main-thing 삭제는 통과"       "$G push origin --delete feature/main-thing"  "$W" 0
run "push origin main (워크트리 세션)"      "$G push origin main"                         "$W" 2
run "push origin HEAD:main"                "$G push origin HEAD:main"                    "$W" 2
run "push origin :main (콜론 삭제)"        "$G push origin :main"                        "$W" 2
run "push origin refs/heads/master"        "$G push origin refs/heads/master"            "$W" 2
run "push origin feat/x 는 통과"           "$G push origin feat/x"                       "$W" 0
run "--git-dir 은 워크트리에서도 차단"      "$G --git-dir=$M/.git --work-tree=$M commit -m x" "$W" 2
run "--work-tree 단독도 차단"              "$G --work-tree $M commit -m x"               "$W" 2

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" = 0 ]
