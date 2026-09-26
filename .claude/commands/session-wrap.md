---
name: session-wrap
description: 세션 종료 전 문서·패턴·학습·후속작업을 정리하고 다음 세션 인계를 준비
---

# Session Wrap

세션 종료 전에 작업 결과를 정리해 다음 세션이 이어받을 수 있게 합니다.

## 트리거

- `/session-wrap` 또는 "세션 정리" 요청
- 컨텍스트 예산 경고 후 새 세션 전환 전

## Phase 1: 컨텍스트 수집 (메인 직접)

1. `git status --short`, `git diff --stat`
2. `git log --oneline -10` (워크트리면 `git log origin/main..HEAD`)
3. `bash scripts/wt.sh ls` — 이 세션이 만든 워크트리·dirty 상태
4. 열린 PR: `gh pr list --author @me`

## Phase 2: 정리 (기본 = 메인 직접 처리)

메인이 이미 컨텍스트에 가진 내용이라 서브에이전트에 넘기면 재적재 비용·요약 유실만 생긴다. 네 관점을 메인이 순서대로 점검한다.

1. **문서** — 변경에 따라 갱신이 필요한 곳
   - `CLAUDE.md`(구조·규약 변화), 해당 스킬 `SKILL.md`, 하네스 변경이면 `docs/HARNESS_CHANGELOG.md`
   - 진행 중 대규모 작업이면 `/update-dev-docs` 호출(dev-docs 3-파일 갱신은 그 커맨드가 정본)
2. **패턴** — 새로 확정된 프로젝트 관례 → 스킬 규약에 반영할지 제안
3. **학습** — 재현 가능한 함정·결정만 memory 에 기록
   - 경로: `~/.claude/projects/-Users-younghwankang-Work-APFS/memory/`
   - 파일 1개 = 사실 1개, frontmatter(name/description/metadata.type) 필수, `MEMORY.md` 에 한 줄 포인터
   - 기존 파일이 같은 내용을 다루면 새로 만들지 말고 갱신
4. **후속 작업** — 미완료·리스크·다음 첫 행동

## Phase 3: 인계 저장

전역 CLAUDE.md "컨텍스트 예산" 절의 분기를 따른다:
- `.planning/phases/` 에 SUMMARY 없는 PLAN 존재 → `/gsd:pause-work`
- 그 외 `.planning/STATE.md` 존재 → STATE.md 갱신
- 둘 다 없음 → `dev/active/<task>/` dev-docs 또는 HANDOFF.md

## 출력 형식

```markdown
# Session Wrap

## 이번 세션
- 브랜치/워크트리: <branch> (:<port>) · 커밋 N · PR #N(<상태>)
- 주요 작업: …

## 문서 갱신
- [x]/[ ] <파일>: <내용>

## 기록한 memory
- <name> — <한 줄>

## 다음 세션 첫 행동
1. …

## 리스크
- …
```

## 주의

- 미커밋 변경이 있으면 커밋 여부를 먼저 묻는다(커밋은 사용자 요청 시에만)
- memory 에 코드 구조·git 이력처럼 저장소가 이미 기록하는 것은 쓰지 않는다
