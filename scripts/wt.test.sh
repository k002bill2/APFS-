#!/usr/bin/env bash
# wt.sh prune 회귀 스위트 — 픽스처(저장소 + 워크트리 3개 + 포트 배정표)를 스스로 만든다.
#
#   bash scripts/wt.test.sh
#
# prune 의 계약(wt.sh port_prune 주석 참조):
#   - 디렉터리가 살아 있는 워크트리의 브랜치 배정만 남긴다
#   - 워크트리가 없는 브랜치·디렉터리가 사라진 워크트리(prunable)의 배정은 지우고 출력한다
#   - 두 번 돌려도 결과가 같다 / 배정표가 없어도 실패하지 않는다 / 잠금·임시 파일을 남기지 않는다
#   - 워크트리 안에서 실행해도 같은 배정표(메인 체크아웃 기준)를 정리한다
# wt.sh prune 은 구현 전에도 도움말을 찍고 exit 0 이라, 종료 코드가 아니라 배정표·출력으로 판정한다.
set -uo pipefail

SCRIPT=$(pwd)/scripts/wt.sh
[ -f "$SCRIPT" ] || { echo "wt.sh 를 찾을 수 없습니다: $SCRIPT (저장소 루트에서 실행하세요)" >&2; exit 1; }

FIX=$(mktemp -d)
trap 'rm -rf "$FIX" 2>/dev/null || true' EXIT

R=$FIX/repo                 # 메인 체크아웃 역할
WT=$R/.claude/worktrees     # wt.sh 의 $WTROOT
P=$WT/.ports
g() { git -C "$R" -c user.email=t@example.invalid -c user.name=t "$@"; }
git init -q -b main "$R"
: > "$R/a.txt"
g add a.txt
g "$(printf 'commit')" -q -m init
mkdir -p "$WT"
g worktree add -q "$WT/a" -b a
g worktree add -q "$WT/b" -b b
g worktree add -q "$WT/d" -b d
rm -rf "$WT/d"              # git 메타데이터는 남고 디렉터리만 사라진 워크트리(prunable)
[ -d "$WT/a" ] && [ -d "$WT/b" ] && [ ! -e "$WT/d" ] || { echo "픽스처 실패: $WT" >&2; exit 1; }

pass=0; fail=0
t() { # $1=설명, 나머지=판정 명령(성공이면 통과)
  local d=$1; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); printf 'ok   %s\n' "$d"
  else fail=$((fail+1)); printf 'FAIL %s\n' "$d"; fi
}
has()   { printf '%s\n' "$out" | grep -qF -- "$1"; }
hasnt() { ! has "$1"; }
eq()    { [ "$1" = "$2" ]; }
no_leftovers() { [ -z "$(ls -A "$WT" | grep '^\.ports\.')" ]; }

echo "== 죽은 배정 정리 =="
printf 'a\t5301\nb\t5302\nc\t5303\nd\t5304\n' > "$P"
out=$(cd "$R" && bash "$SCRIPT" prune 2>&1)
t "살아 있는 a·b 만 남음"                 eq "$(cat "$P")" "$(printf 'a\t5301\nb\t5302')"
t "워크트리 없는 c 를 정리했다고 출력"     has 'c (포트 5303)'
t "디렉터리 사라진 d 를 정리했다고 출력"   has 'd (포트 5304)'
t "살아 있는 a 는 출력하지 않음"           hasnt 'a (포트 5301)'
t "잠금·임시 파일을 남기지 않음"           no_leftovers

echo "== 멱등 =="
before=$(cat "$P")
out=$(cd "$R" && bash "$SCRIPT" prune 2>&1)
t "두 번째 실행은 배정표를 바꾸지 않음"    eq "$(cat "$P")" "$before"
t "정리할 것 없다고 안내"                 has '정리할 배정 없음'

echo "== 워크트리 안에서 실행 =="
printf 'a\t5301\nb\t5302\ngone\t5309\n' > "$P"
out=$(cd "$WT/a" && bash "$SCRIPT" prune 2>&1)
t "메인 체크아웃의 배정표를 정리"          eq "$(cat "$P")" "$(printf 'a\t5301\nb\t5302')"
t "정리한 gone 을 출력"                    has 'gone (포트 5309)'

echo "== 배정표 없음 =="
rm -f "$P"
out=$(cd "$R" && bash "$SCRIPT" prune 2>&1); rc=$?
t "종료 코드 0"                            eq "$rc" 0
t "정리할 것 없다고 안내"                 has '정리할 배정 없음'
t "배정표를 새로 만들지 않음"              eq "$(ls -A "$WT" | grep -c '^\.ports$')" 0
t "잠금·임시 파일을 남기지 않음"           no_leftovers

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" = 0 ]
