---
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(git:*), Bash(node:*), Read, Edit, Grep, Glob
description: 자동 재검증 루프 (최대 3회 재시도, 실패 시 최소 수정) → Codex 게이트
argument-hint: [의도 설명] [--max-retries N] [--only build|test|types]
---

## Task

### 1단계: 환경 수집
- `git status --short` — `??`(untracked) 포함 전체 변경 목록
- 리뷰 대상 = 커밋분 `git diff origin/main...HEAD` + 미커밋 `git diff HEAD`(staged+unstaged) + untracked 파일 본문(Read)
- 현재 위치가 워크트리인지(`git rev-parse --show-toplevel`) — 공유 체크아웃은 `main` 고정이다

### 2단계: 검증 루프 (최대 N회, 기본 3)

각 시도마다:

1. **diff 리뷰** (think hard) — 1단계의 리뷰 대상 전체 (`git diff` 단독은 staged·untracked 를 놓친다)
   - 의도대로 구현됐는지, 로직 오류·엣지 케이스
   - 요청 범위 밖 변경(Surgical 위반)
   - 임계값: 함수 50줄 / 파일 800줄 / 네스팅 4단계 초과 → HIGH
   - 색 hex 하드코딩(토큰 `tokens.css` 사용), 삭제된 마스크 API(`mn`/`MT`/`useMask`) 재등장

2. **자동화 검증** (저장소 루트):
   - Build: `npm run build`
   - Test: `npx vitest run`
   - Types(보조): `npx tsc --noEmit` — 변경 파일의 **신규** 에러만 실패로 친다

3. **결과 출력**:
   ```
   ├── Build:  PASS/FAIL
   ├── Test:   PASS/FAIL (N failed)
   └── Types:  PASS/WARN (신규 N)
   ```

### 3단계: 실패 시 최소 수정
- import 누락·오타·단순 타입 오류만 자동 수정
- 가드 테스트 실패는 테스트가 아니라 코드를 규약에 맞춘다
- 같은 수정 2회 실패 → 루프 중단, 근본 원인 분석

### 4단계: 통과 시 — 완료 게이트
1. UI 변경이면 브라우저 실측: **ego-browser**(기본) 또는 aside repl. Playwright·claude-in-chrome 금지. 라이트/다크 둘 다.
2. Codex 리뷰 (자기 결과 자기 승인 금지):
   ```bash
   SCRIPT=$(ls ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)
   nohup node "$SCRIPT" review --scope working-tree > <scratchpad>/codex.log 2>&1 & disown
   node "$SCRIPT" status      # 폴링 → 끝나면 result 또는 로그 확인
   node "$SCRIPT" result
   ```
   - 포그라운드로 돌리지 않는다 — Bash 가 ~150초에 죽이고, verdict 단계 hang(로그 mtime 무변동)이면 cancel 후 재실행.
   - scope 는 매번 정한다: 커밋 전 = `working-tree`, 커밋된 브랜치 작업 = `branch --base origin/main`(미커밋은 못 봄).
   - 최대 3라운드. 반영 안 한 지적은 이유와 함께 PR 본문에.
3. `다음 단계: /commit-push-pr`

### 5단계: max_retries 도달 시
반복 실패 에러 상세 + 권장 조치를 보고하고 제어권을 사용자에게 넘긴다.
