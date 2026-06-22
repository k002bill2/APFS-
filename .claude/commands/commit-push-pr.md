---
description: 변경분을 surgical 커밋 → 푸시 → PR 생성 (브랜치 가드·하네스 트레일러). 커밋/푸시/PR은 사용자가 명시 호출할 때만.
argument-hint: "[커밋 제목] [--draft] [--no-verify]"
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm:*), Read, Grep, Glob
---

# Git Commit → Push → PR 자동화

변경분을 분석해 **surgical하게** 커밋하고 푸시한 뒤 PR을 생성합니다.

인자(`$ARGUMENTS`, 모두 선택):
- 첫 텍스트 인자 → 커밋 제목 힌트 (없으면 변경분을 보고 직접 작성)
- `--draft` → Draft PR로 생성
- `--no-verify` → 빌드 검증(`npm run build`) 스킵

## 0. Context 수집

```bash
git branch --show-current
git status --short
git diff --stat
git log --oneline -3
```

## 1. 브랜치 가드 (반드시 먼저)

**`main`에서 직접 커밋·푸시하지 마세요.** 이 저장소는 `main` push 시 Vercel이 **프로덕션을 자동 배포**합니다 — 리뷰 없이 곧장 운영에 나갑니다. 현재 브랜치가 `main`이면 작업 브랜치부터 만드세요:

```bash
git switch -c feat/<작업-요약>     # feat/ fix/ refactor/ chore/ 접두사
```

## 2. 빌드 검증

`--no-verify`가 없으면 커밋 전 빌드 green을 확인하세요:

```bash
npm run build
```

이 저장소는 esbuild 빌드라 `tsc` 타입에러는 빌드를 막지 않지만(Phase 0), 빌드 자체는 통과해야 합니다. 테스트가 있으면 `npm test`(vitest)도 권장.

## 3. 변경 분석 → 커밋 메시지

Conventional Commits 형식 + **한국어 제목**:
- `feat:` 새 기능 · `fix:` 버그 · `refactor:` 리팩토링 · `docs:` 문서 · `test:` 테스트 · `chore:` 빌드/설정 · `perf:` 성능
- 예: `refactor(ui): 정적 인라인 스타일을 Tailwind 토큰 유틸리티로 전환`
- 인자로 받은 제목이 있으면 그것을 우선 사용.

## 4. surgical 스테이징 · 커밋 · 푸시

> ⚠️ **`git add .` / `git add -A` 금지** — 다중 세션 환경에서 다른 작업의 변경/untracked
> 파일까지 빨려 들어가 surgical commit을 깨뜨립니다. 항상 변경한 파일만 명시적으로 add 하세요.

커밋 본문 끝에는 **하네스가 지정한 트레일러**(`Co-Authored-By:` + `Claude-Session:`)를 붙입니다:

```bash
git status --short            # 변경 파일 확인
git add <변경한_파일들>       # 명시적 스테이징 (git add . 금지)

git commit -F - <<'EOF'
feat(ui): 변경 요약 (한국어 제목)

- 구체적 변경 1
- 구체적 변경 2

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: <현재 세션 URL — 하네스가 지정>
EOF

git push -u origin HEAD       # 새 브랜치면 -u 로 업스트림까지 설정
```

## 5. PR 생성

현재 브랜치에 PR이 **이미 있으면 생성 스킵**(커밋만 반영). 먼저 확인:

```bash
gh pr list --head "$(git branch --show-current)" --json number,state
```

없으면 생성(`--draft` 인자가 있으면 `--draft` 추가):

```bash
gh pr create --title "PR 제목" --body "$(cat <<'EOF'
## Summary
- 변경사항 요약 (1-3개)

## Changes
- 구체적인 변경 내용

## Test Plan
- [ ] npm run build green

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)

<현재 세션 URL — 하네스가 지정>
EOF
)"
```

> `gh pr create`는 base를 기본 브랜치(`main`)로, head를 현재 브랜치로 자동 설정합니다 — 별도 `--base` 불필요.

## 주의사항

- 민감한 정보 (API 키, 비밀번호) 포함 여부 확인
- **`main` 직접 커밋 금지** — Vercel 프로덕션 자동배포(1단계 참조)
- 머지 후 ghost-merge 검증 필수 (GitHub가 권위 소스, 모든 머지 방식 안전):
  ```bash
  gh pr view <PR> --json state,baseRefName,mergedAt
  # state == "MERGED" && baseRefName == 대상브랜치 && mergedAt != null → 안착 확정
  ```
  ⚠️ `git cherry` / `git merge-base --is-ancestor` 는 **squash 머지에서 false negative**다
  (squash 커밋은 PR-head를 히스토리에 포함하지 않아 ancestor가 아님) → ghost-merge 검증에 사용 금지.
