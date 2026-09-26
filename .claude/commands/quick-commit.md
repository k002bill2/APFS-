---
allowed-tools: Bash(git:*), Read, Write, Grep, Glob
description: 문서·설정·오타 같은 단순 수정용 빠른 커밋 (검증 스킵, 워크트리 전용)
argument-hint: [커밋 메시지]
disable-model-invocation: true
---

# Quick Commit

검증 없이 빠르게 커밋합니다. 문서, 설정, 단순 수정에만 사용.

## 전제: 워크트리에서만

공유 체크아웃(`main`)에서는 `block-main-write.sh` 가드가 커밋을 차단한다. 먼저 `bash scripts/wt.sh new <branch>` → 세션을 그 워크트리로 옮긴다.

## 절차

1. `git branch --show-current` — `main`/`master` 이면 중단
2. `git status --short` — 변경 없으면 중단
3. **명시 경로만 staging** — `git add -A` 금지(다른 작업 산출물 혼입 방지)
   - 영문 경로: `git add <path>...`
   - 한글 경로: 훅 오탐 회피로 명령에 한글이 안 나오게 디렉터리 단위로 add 한다. **먼저 `git status --short -- <dir>` 로 그 디렉터리에 이번 작업 파일만 있는지 확인** — 섞여 있으면 중단하고 사용자에게 알린다
     - 수정·삭제만: `git add -u <dir>` (untracked 는 **안 잡힌다**)
     - 신규 파일 포함: `git add -- <dir>/`
   - staging 후 `git status --short` 로 누락(`??` 잔존) 없는지 확인
4. 메시지: `$ARGUMENTS` 있으면 그대로, 없으면 Conventional Commits(`docs:`·`chore:` 등)로 작성
5. 메시지를 **저장소 밖**(세션 scratchpad) 파일로 써서 `git commit -F <file>` (한글·여러 줄 안전 — 저장소 안에 두면 `??` 로 잡혀 4번 디렉터리 add 에 섞인다)
6. `git log -1 --format=%B` — co-author 푸터 없으면 `--amend` 로 추가(푸시 전이라 허용)

## 사용 시점

- 문서(`docs/`, README, CLAUDE.md), `.claude/` 설정, 주석·오타, 포맷팅

## 주의

- `src/` 로직 변경에는 사용 금지 → `/verify-loop` 후 `/commit-push-pr`
- 하네스(`.claude/`) 변경이면 `docs/HARNESS_CHANGELOG.md` 항목도 같은 커밋에
