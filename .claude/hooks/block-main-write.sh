#!/usr/bin/env bash
# PreToolUse(Bash) 가드 — main/master 브랜치에서 git commit·push 직행을 차단한다.
#
# 위협 모델: 이것은 "정상 에이전트 작업 중 실수로 main에 쓰는 것"을 막는 best-effort
#            가드지, 의도적 우회에 대한 보안 경계가 아니다. 훅은 명령 문자열만 보므로
#            ECC_DISABLED_HOOKS·`gh api`·git alias·`command git` 등으로 한 줄이면
#            우회 가능하다(경계로 설계하지 말 것). 목표는 사고 방지, 강제가 아니다.
#
# 이유: 이 저장소는 main push 시 Vercel이 프로덕션을 자동 배포한다(CLAUDE.md).
#       리뷰 없는 직행 커밋/푸시를 원천 차단한다.
#
# ── 판정 구조: "정적으로 검증 가능한 모양"만 예외로 둔다 ──────────────────────
#   ① 복합 명령(셸 메타문자 하나라도 존재) → **훅 cwd 의 브랜치**로 판정한다.
#      공유 체크아웃을 main 에 고정해 두면 복합 명령은 전부 차단된다(fail-closed).
#      워크트리 작업은 세션이 그 워크트리에 들어가 있으면(EnterWorktree → Bash 도구의
#      기본 디렉터리가 워크트리) 훅 cwd 가 워크트리라 그대로 통과한다.
#   ② 단일 명령(메타문자 없음) + `git -C <리터럴 경로> (commit|push)` → 그 경로의
#      브랜치로 판정한다. 공유 체크아웃이 main 이어도 워크트리 쓰기를 막지 않기 위한
#      **유일한** 예외다. 상대경로는 훅 cwd 기준으로 푼다(단일 명령엔 cd 가 없으므로 모호함 없음).
#   그 외 모양은 전부 ①로 떨어진다 — 변수 확장 `-C "$X"`, `-C` 2회 이상(git 은 순차 적용하는데
#   정적으로는 마지막 대상을 알기 어렵다), `--git-dir`/`--work-tree` 등 미지 전역 옵션, 부재 경로.
#
#   왜 이 구조인가: 임의의 셸 텍스트에서 "각 git 쓰기의 실행 디렉터리"를 정적으로 복원하려는
#   시도는 끝이 없다. 실제로 Codex 리뷰 8라운드 동안 `-C` 중복 · 파이프 좌측 `cd` · 백그라운드
#   `&` · 서브셸 `( … )` · 인용된 `}` 로 계속 뚫렸다(패치할수록 새 우회가 나왔다).
#   좁은 허용목록 + 나머지는 cwd 폴백이 유일하게 검증 가능한 형태다.
#
# 예외: 보호 ref 삭제는 **가장 먼저, 무조건** 차단한다(대상 디렉터리와 무관).
#       그 외 `git push --delete <비보호 ref>` 는 통과 — git 은 나열된 모든 ref 를 삭제로
#       처리하며 콘텐츠 push 와 혼용이 불가능하므로("All listed refs are deleted")
#       커밋을 main 에 얹지 않아 Vercel 배포를 유발하지 않는다(머지된 브랜치 정리는 정상 작업).
#       단 정적으로 안전한 단일 명령에만 적용하고, 콜론 refspec(`:branch`)은 제외한다
#       (`HEAD :old` 처럼 콘텐츠 push 와 섞일 수 있다 — 필요하면 `--delete` 를 쓰라).
#
# 한계(설계상 수용): 훅은 명령 문자열을 **정적으로만** 읽는다. 아래는 막지 못한다 —
#         - eval, 명령 치환($(...)), 변수로 조립한 명령
#         - 스크립트 파일 실행(`bash x.sh` 안의 git 쓰기), git alias, `xargs git …`
#         - 셸 함수 / `command git` / 절대경로 바이너리 우회
#       반대 방향 오탐도 있다: 명령 문자열에 "git commit"/"git push" 가 설명 텍스트로
#       들어가도 main 위에서는 차단된다(이 파일이나 변경로그를 편집하는 명령이 실제로 그렇다).
#       오탐이면 이 훅을 일시 비활성화하라(.claude/settings.json 의 PreToolUse 항목 제거/주석).
#
# 회귀 스위트: bash scripts/block-main-write.test.sh (픽스처 자체 생성)
#       판정 규칙이 미묘해서 손으로 고치면 조용히 무력해진다. 이 파일을 만지면 반드시 돌려라.

# stdin 은 한 번만 읽을 수 있으므로 통째로 받아 두고 필드별로 파싱한다.
payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null)
hook_cwd=$(printf '%s' "$payload" | jq -r '.cwd // ""' 2>/dev/null)

# ── 값싼 선별 — git 토큰과 commit/push 토큰이 둘 다 없으면 볼 것도 없다 ────────
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_./-])git([[:space:]]|$)' || exit 0
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])(commit|push)([^[:alnum:]_-]|$)' || exit 0

blocked() {
  echo "BLOCKED: $1 — main/master 직행 commit/push 는 금지입니다(이 저장소는 main push 시 Vercel 프로덕션 자동배포). 워크트리에서 작업하세요:  bash scripts/wt.sh new <name>  — 공유 체크아웃에서 쏠 때는 메타문자 없는 단일 명령 \`git -C <리터럴 워크트리 경로> …\` 형태만 통과합니다(체이닝이 필요하면 세션을 그 워크트리로 옮기세요). 오탐이면 .claude/settings.json 의 PreToolUse 훅을 일시 비활성화하세요." >&2
  exit 2
}

# 경로를 정규화해 절대경로로 돌려준다. 상대경로는 $2(훅 cwd) 기준.
resolve_dir() {
  d=$1; base=${2:-}
  [ -n "$d" ] || return 1
  d=${d#\"}; d=${d%\"}; d=${d#\'}; d=${d%\'}
  case $d in ''|*'$'*|*'`'*|'~'*) return 1 ;; esac
  case $d in /*) ;; *) [ -n "$base" ] || return 1; d=$base/$d ;; esac
  [ -d "$d" ] || return 1
  (cd "$d" 2>/dev/null && pwd -P) || return 1
}

# ── 단일 명령인가(셸 메타문자 부재) ──────────────────────────────────────────
is_simple=1
printf '%s' "$cmd" | LC_ALL=C grep -q '[;&|(){}<>$`*?]' && is_simple=0
case $cmd in *\\*) is_simple=0 ;; esac
case $cmd in *"
"*) is_simple=0 ;; esac

# ── 대상 디렉터리와 무관하게 무조건 차단하는 두 가지 ────────────────────────
#
# (1) 저장소를 갈아치우는 전역 옵션 — 실행 디렉터리가 어디든 대상 저장소가 바뀌므로
#     로컬 브랜치 판정이 무의미하다(워크트리에서 `git --git-dir=<main>/.git commit` 은
#     main 의 인덱스에 커밋한다). 정적으로 확정할 수 없으니 그냥 막는다.
if printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])--(git-dir|work-tree|namespace|exec-path|super-prefix)([[:space:]]|=)'; then
  blocked "저장소를 갈아타는 전역 옵션(--git-dir/--work-tree 등)은 대상을 확정할 수 없습니다 — \`git -C <리터럴 경로>\` 를 쓰세요"
fi

# (2) 보호 ref(main/master)를 **목적지로 지목한 push** — 로컬 브랜치가 피처여도
#     `push origin main` · `HEAD:main` · `:main`(삭제) 은 원격 main 을 갱신/삭제해
#     Vercel 프로덕션 배포를 유발한다. 로컬 브랜치 판정으로는 절대 잡히지 않는다.
if printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])push([^[:alnum:]_-]|$)'; then
  stripped=${cmd//\"/}
  stripped=${stripped//\'/}
  if printf '%s' "$stripped" | grep -Eq '(^|[[:space:]:])((refs/)?heads/)?(main|master)([[:space:]]|$)'; then
    blocked "원격 보호 ref(main/master)를 목적지로 지목한 push 입니다"
  fi
fi

# ── 비보호 ref 삭제 push 예외 ────────────────────────────────────────────────
# git 은 나열된 모든 ref 를 삭제로 처리하며 콘텐츠 push 와 혼용이 불가능하므로
# ("All listed refs are deleted") 커밋을 main 에 얹지 않는다 — 머지된 브랜치 정리는 정상 작업.
# 정적으로 안전한 단일 명령에만, 콜론 refspec 이 없을 때만 적용한다.
if printf '%s' "$cmd" | grep -Eq '(--delete([[:space:]]|=)|[[:space:]]-d([[:space:]]|$))' \
   && ! printf '%s' "$cmd" | grep -q -- '--no-delete' \
   && [ "$is_simple" = 1 ] \
   && ! printf '%s' "$cmd" | grep -q ':'; then
  exit 0
fi

# ── 대상 디렉터리 결정 ───────────────────────────────────────────────────────
target=$(resolve_dir "$hook_cwd" "$PWD") || target=$(pwd -P)

if [ "$is_simple" != 1 ]; then
  # 복합 명령: 훅 cwd 뿐 아니라, 명령에 **정적으로 등장하는 모든 cd/-C 대상**도 본다.
  # 스코프(서브셸·파이프·백그라운드)를 모델링하지 않고 "언급만으로" 판단한다 — fail-closed.
  # 이게 없으면 워크트리 세션에서 `cd <main> && git commit` 이 피처 브랜치로 판정돼 통과한다.
  for cand in $(printf '%s' "$cmd" | awk '{ for (i = 1; i < NF; i++) if ($i == "cd" || $i == "-C") print $(i+1) }'); do
    # 해석 못 하는 대상은 **건너뛰지 않는다** — 변수 확장(`-C "$CLAUDE_PROJECT_DIR"`,
    # `cd "$X" && …`)이 main 을 가리킬 수 있으므로 통과시키면 가드가 무의미해진다.
    d=$(resolve_dir "$cand" "$target") \
      || blocked "복합 명령의 디렉터리 대상 '$cand' 을 정적으로 해석할 수 없습니다(변수 확장·부재 경로) — 리터럴 경로를 쓰세요"
    b=$(git -C "$d" branch --show-current 2>/dev/null)
    if [ "$b" = "main" ] || [ "$b" = "master" ]; then
      blocked "복합 명령에 '$d'($b 브랜치)가 등장합니다 — 실행 디렉터리를 정적으로 확정할 수 없습니다"
    fi
  done
fi

if [ "$is_simple" = 1 ]; then
  # 토큰을 걸어 git 의 subcommand 자리를 찾고 `-C` 값을 센다.
  # 출력: "<commit/push 인가>|<-C 개수>|<첫 -C 값>|<미지 전역 옵션>"
  scan=$(printf '%s' "$cmd" | awk '
    BEGIN { prot = 0; ccount = 0; cval = ""; bad = "" }
    {
      for (i = 1; i <= NF; i++) {
        t = $i; gsub(/"/, "", t)
        if (!seen) { if (t ~ /(^|\/)git$/) seen = 1; continue }
        if (want != "") { if (want == "-C") { ccount++; if (cval == "") cval = $i }; want = ""; continue }
        if (t == "commit" || t == "push") { prot = 1; break }
        if (t ~ /^-/) {
          if (t == "-C" || t == "-c") { want = t; continue }
          if (t == "--no-pager" || t == "-p" || t == "--paginate" ||
              t == "--literal-pathspecs" || t == "--no-replace-objects") continue
          if (bad == "") bad = t
          if (t !~ /=/) want = "?"
          continue
        }
        break
      }
    }
    END { printf "%d|%d|%s|%s", prot, ccount, cval, bad }')

  prot=${scan%%|*};  rest=${scan#*|}
  ccount=${rest%%|*}; rest=${rest#*|}
  cval=${rest%|*};    badopt=${rest##*|}

  # 단일 명령인데 git 의 commit/push 가 아니면(예: `git status`) 검사 대상이 아니다.
  [ "$prot" = 1 ] || exit 0

  # `-C` 가 정확히 한 번이고 미지 전역 옵션이 없을 때만 대상을 갈아탄다.
  # 해석 실패·중복·미지 옵션은 훅 cwd 기준 판정으로 떨어진다(fail-closed).
  if [ -z "$badopt" ] && [ "$ccount" = 1 ]; then
    target=$(resolve_dir "$cval" "$target") \
      || blocked "-C 대상 '$cval' 을 정적으로 해석할 수 없습니다(변수 확장·부재 경로)"
  fi
fi

branch=$(git -C "$target" branch --show-current 2>/dev/null)
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  blocked "'$target' 이(가) '$branch' 브랜치입니다"
fi
exit 0
