#!/usr/bin/env bash
# 워크트리 헬퍼 — 브랜치 작업을 공유 체크아웃에서 떼어낸다.
#
# 왜: 이 저장소는 멀티세션 동시 작업 환경이라, 한 세션이 공유 체크아웃에서 브랜치를
#     갈아타면 다른 세션의 dev 서버가 조용히 "다른 커밋의 소스"를 서빙한다
#     (실사례 2026-09-15: #170 이전 브랜치 체크아웃 → 제거한 행선택이 되살아난 것처럼 보임).
#     워크트리는 인덱스·HEAD 를 따로 갖고 .git 만 공유하므로 이 경합에 면역이다.
#
# 위치: .claude/worktrees/<branch>  — EnterWorktree 도구와 같은 규약(.gitignore 처리됨).
# node_modules: APFS clonefile(cp -c) 복제 — 811M 기준 ~15초, 실디스크 증가 ~14MB.
#               심볼릭 링크(.bin/*)도 보존된다. 심볼릭 링크로 공유하지 않는 이유는
#               node_modules/.vite 의존성 캐시가 브랜치 간에 섞이기 때문.
# 포트: 브랜치명 해시로 고정 배정(5300~5389) → 재생성해도 같은 포트, 북마크가 안 깨진다.
#       점유 중이면 다음 빈 포트로 밀어낸다. vite 는 strictPort 라 충돌 시 조용히 옮겨가지 않는다.
#       배정표는 .claude/worktrees/.ports (워크트리 *밖*) 에 둔다 — 워크트리 안에 파일을 만들면
#       추적되지 않은 파일로 잡혀 status 가 늘 dirty 가 되고 rm 가드가 오작동한다.
#       정지한 워크트리의 포트도 예약으로 유지하고, 배정표 갱신은 잠금으로 직렬화한다.
#
# 사용:
#   bash scripts/wt.sh new <branch> [base-ref]   생성(기본 base = origin/main)
#   bash scripts/wt.sh setup [dir]               기존 워크트리에 node_modules+포트만 배선
#   bash scripts/wt.sh dev <branch>              배정된 포트로 dev 서버 실행
#   bash scripts/wt.sh ls                        목록(브랜치·포트·상태)
#   bash scripts/wt.sh rm <branch>               제거(미커밋 변경 있으면 거부)
set -euo pipefail

# 메인 체크아웃 루트 — 워크트리 안에서 실행해도 항상 같은 값을 준다.
common=$(git rev-parse --git-common-dir)
case $common in /*) ;; *) common=$PWD/$common ;; esac
MAIN=$(cd "$(dirname "$common")" && pwd)
WTROOT=$MAIN/.claude/worktrees

die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

# <branch> 인자가 관리 디렉터리 밖을 가리키지 못하게 한다.
# `wt.sh rm ../../other` 는 $WTROOT 밖의 **무관한 워크트리를 지울 수 있다**(Codex 리뷰 3R P1).
wt_path() {
  case $1 in
    /*)    die "브랜치 이름에 절대경로를 쓸 수 없습니다: $1" ;;
    *..*)  die "브랜치 이름에 '..' 를 쓸 수 없습니다: $1" ;;
    '')    die "브랜치 이름이 비어 있습니다" ;;
  esac
  printf '%s' "$WTROOT/$1"
}

# setup 대상이 **이 저장소의** 체크아웃인지 확인한다. 아무 git 저장소나 받으면 이 프로젝트의
# node_modules 를 거기 복제하고 그 브랜치 이름으로 우리 포트를 예약해 버린다(Codex 리뷰 6R P2).
assert_same_repo() {
  c=$(git -C "$1" rev-parse --git-common-dir 2>/dev/null) || die "git 저장소가 아닙니다: $1"
  case $c in /*) ;; *) c=$1/$c ;; esac
  other=$(cd "$(dirname "$c")" && pwd -P) || die "공유 .git 을 읽을 수 없습니다: $c"
  mine=$(cd "$MAIN" && pwd -P)
  [ "$other" = "$mine" ] || die "이 저장소의 워크트리가 아닙니다: $1 (공유 .git 소유자=$other, 기대=$mine)"
}

# 제거 직전 최종 확인 — 정규화한 실제 경로가 $WTROOT 의 자손인가.
assert_managed() {
  real=$(cd "$1" && pwd -P) || die "경로를 읽을 수 없습니다: $1"
  root=$(cd "$WTROOT" && pwd -P) || die "워크트리 루트가 없습니다: $WTROOT"
  case $real in "$root"/*) ;; *) die "관리 대상 워크트리가 아닙니다(제거 거부): $real" ;; esac
}

PORTS=$WTROOT/.ports
LOCK=$WTROOT/.ports.lock

port_of() { [ -f "$PORTS" ] && awk -F'\t' -v b="$1" '$1==b{print $2}' "$PORTS" | tail -1 || true; }
port_free() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# 다른 브랜치에 이미 배정된 포트인가 — dev 서버가 꺼져 있어도 "예약"으로 취급한다.
# lsof 만 보면 두 워크트리가 모두 정지 상태일 때 같은 포트를 양쪽에 배정하고,
# 나중에 둘 다 띄우는 순간 strictPort 로 두 번째가 터진다(Codex 리뷰 P2).
port_reserved() {
  [ -f "$PORTS" ] || return 1
  awk -F'\t' -v b="$1" -v p="$2" '$1!=b && $2==p {f=1} END {exit !f}' "$PORTS"
}

# 배정표는 동시 세션이 함께 쓰므로 선택+기록을 잠금으로 묶는다(Codex 리뷰 P2).
lock_ports() {
  mkdir -p "$WTROOT"
  i=0
  until mkdir "$LOCK" 2>/dev/null; do
    i=$((i + 1))
    [ "$i" -lt 100 ] || die "포트 배정표 잠금 대기 초과 — 남은 잠금이면 지우세요: rmdir $LOCK"
    sleep 0.1
  done
  trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM
}
unlock_ports() { trap - EXIT INT TERM; rmdir "$LOCK" 2>/dev/null || true; }

# 브랜치명 → 고정 포트(5300~5389). 이미 배정된 포트가 비어 있으면 그대로 재사용.
# 충돌 시 **풀 안에서 순환**한다 — 단순 증가는 5389 에서 5390 으로 넘어가 격리 풀 밖의
# 포트를 잡는다(Codex 리뷰 4R P2).
pick_port() {
  prev=$(port_of "$1")
  if [ -n "$prev" ] && port_free "$prev"; then printf '%s' "$prev"; return; fi
  base=$(( $(printf '%s' "$1" | cksum | cut -d' ' -f1) % 90 ))
  i=0
  while [ "$i" -lt 90 ]; do
    p=$(( 5300 + (base + i) % 90 ))
    if ! port_reserved "$1" "$p" && port_free "$p"; then printf '%s' "$p"; return; fi
    i=$(( i + 1 ))
  done
  die "5300~5389 90개 포트가 모두 사용/예약 중입니다 — 쓰지 않는 워크트리를 정리하세요: bash scripts/wt.sh ls"
}

# 배정 해제 — rm 에서 부르지 않으면 port_reserved 가 죽은 브랜치의 포트를 영구 예약한다.
port_drop() {
  lock_ports
  if [ -f "$PORTS" ]; then
    tmp=$(mktemp "$WTROOT/.ports.XXXXXX")
    grep -v -F "$1$(printf '\t')" "$PORTS" > "$tmp" || true
    mv "$tmp" "$PORTS"
  fi
  unlock_ports
}

# 선택 + 기록을 한 잠금 구간에서 수행한다. 임시 파일은 호출마다 고유(mktemp).
assign_port() {
  lock_ports
  port=$(pick_port "$1")
  tmp=$(mktemp "$WTROOT/.ports.XXXXXX")
  { [ -f "$PORTS" ] && grep -v -F "$1$(printf '\t')" "$PORTS" || true; printf '%s\t%s\n' "$1" "$port"; } > "$tmp"
  mv "$tmp" "$PORTS"
  unlock_ports
  printf '%s' "$port"
}

# node_modules CoW 복제 + 포트 파일. 이미 있으면 건너뛴다.
provision() {
  wt=$1; branch=$2
  if [ -d "$wt/node_modules" ]; then
    printf '  node_modules: 이미 있음 (건너뜀)\n'
  elif [ -d "$MAIN/node_modules" ]; then
    printf '  node_modules: clonefile 복제 중…\n'
    cp -c -R "$MAIN/node_modules" "$wt/node_modules"
    if ! cmp -s "$MAIN/package-lock.json" "$wt/package-lock.json"; then
      printf '  ⚠ package-lock.json 이 메인과 다릅니다 — 이 워크트리에서 `npm ci` 를 돌리세요.\n'
    fi
  else
    printf '  ⚠ 메인에 node_modules 가 없습니다 — 이 워크트리에서 `npm ci` 를 돌리세요.\n'
  fi
  port=$(assign_port "$branch")
  printf '  포트: %s\n' "$port"
}

cmd=${1:-help}
case $cmd in
  new)
    branch=${2:?"사용법: wt.sh new <branch> [base-ref]"}
    base=${3:-origin/main}
    wt=$(wt_path "$branch")
    [ -e "$wt" ] && die "이미 있습니다: $wt"
    git -C "$MAIN" fetch origin --quiet || printf '  ⚠ fetch 실패 — 로컬 ref 로 진행합니다\n'
    mkdir -p "$(dirname "$wt")"
    if git -C "$MAIN" show-ref --verify --quiet "refs/heads/$branch"; then
      git -C "$MAIN" worktree add "$wt" "$branch"
    else
      git -C "$MAIN" worktree add -b "$branch" "$wt" "$base"
    fi
    provision "$wt" "$branch"
    printf '\n준비됨: %s\n  dev 서버:  bash scripts/wt.sh dev %s\n' "$wt" "$branch"
    ;;
  setup)
    wt=${2:-$PWD}
    wt=$(cd "$wt" && pwd -P) || die "경로를 읽을 수 없습니다: ${2:-$PWD}"
    assert_same_repo "$wt"
    branch=$(git -C "$wt" branch --show-current)
    [ -n "$branch" ] || die "브랜치를 찾을 수 없습니다: $wt"
    printf '%s (%s)\n' "$wt" "$branch"
    provision "$wt" "$branch"
    ;;
  dev)
    branch=${2:?"사용법: wt.sh dev <branch>"}
    wt=$(wt_path "$branch")
    [ -d "$wt" ] || die "워크트리가 없습니다: $wt"
    port=$(port_of "$branch")
    [ -n "$port" ] || die "포트 미배정 — 먼저: bash scripts/wt.sh setup $wt"
    printf 'http://localhost:%s  (%s)\n' "$port" "$branch"
    cd "$wt" && exec npm run dev -- --port "$port"
    ;;
  ls)
    printf '%-38s %-34s %-6s %s\n' BRANCH PATH PORT STATE
    git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{p=$2} /^branch /{b=$2; print p"\t"b}' \
    | while IFS=$'\t' read -r p b; do
        short=${b#refs/heads/}
        port=$(port_of "$short"); [ -n "$port" ] || port='-'
        state=$( [ -n "$(git -C "$p" status --porcelain 2>/dev/null)" ] && printf 'dirty' || printf 'clean' )
        if [ "$p" = "$MAIN" ]; then rel='. (공유 체크아웃)'; else rel=${p#"$MAIN"/}; fi
        printf '%-38s %-34s %-6s %s\n' "$short" "$rel" "$port" "$state"
      done
    ;;
  rm)
    branch=${2:?"사용법: wt.sh rm <branch>"}
    wt=$(wt_path "$branch")
    [ -d "$wt" ] || die "워크트리가 없습니다: $wt"
    assert_managed "$wt"
    [ -z "$(git -C "$wt" status --porcelain)" ] || die "미커밋 변경이 있습니다 — 먼저 정리하세요: git -C $wt status"
    git -C "$MAIN" worktree remove "$wt"
    port_drop "$branch"
    printf '제거됨: %s (브랜치 %s 는 남아 있습니다)\n' "$wt" "$branch"
    ;;
  *)
    sed -n '2,26p' "$0"
    ;;
esac
