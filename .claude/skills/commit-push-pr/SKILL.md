---
name: commit-push-pr
description: 커밋, 푸시, PR 생성 자동화 워크플로우 (Boris Cherny 스타일)
disable-model-invocation: true
---

# Git Commit → Push → PR 자동화

이 커맨드는 변경사항을 분석하고 커밋, 푸시, PR 생성을 자동으로 수행합니다.

## 워크플로우

### 1. 현재 상태 확인
먼저 git status와 git diff를 실행하여 변경사항을 파악하세요:

```bash
git status
git diff --stat
```

### 2. 변경사항 분석
변경된 파일들을 분석하여:
- 변경 유형 파악 (기능 추가, 버그 수정, 리팩토링, 문서 등)
- 영향 범위 확인 (컴포넌트, 서비스, 훅 등)
- 브레이킹 체인지 여부 확인

### 3. 커밋 메시지 생성
Conventional Commits 형식으로 커밋 메시지를 생성하세요:
- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링
- `docs:` 문서 변경
- `test:` 테스트 추가/수정
- `chore:` 빌드, 설정 변경

> 이 저장소는 커밋 **제목을 한국어**로 씁니다(예: `refactor(ui): 정적 인라인 스타일을 Tailwind 토큰 유틸리티로 전환`). 본문 끝 하네스 트레일러는 4단계 커밋 예시를 따르세요.

### 4. 스테이징 · 커밋 · 푸시

#### 4-0. 브랜치 가드 (반드시 먼저)
**`main`에서 직접 커밋·푸시하지 마세요.** 이 저장소는 `main` push 시 Vercel이 **프로덕션을 자동 배포**합니다 — 리뷰 없이 곧장 운영에 나갑니다. 현재 브랜치가 `main`이면 작업 브랜치부터 만드세요:

```bash
git branch --show-current                 # 현재 브랜치 확인
# main 이면 ↓ (feat/ fix/ refactor/ chore/ 접두사)
git switch -c feat/<작업-요약>
```

#### 4-1. 스테이징 · 커밋 · 푸시
`git status`로 변경 파일을 확인하고 **명시적으로** 스테이징한 뒤, 커밋 본문 끝에 **하네스가 지정한 트레일러**(`Co-Authored-By:` + `Claude-Session:`)를 붙입니다:

```bash
git status                    # 변경 파일 확인
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

> ⚠️ **`git add .` 금지** — 다중 세션 환경에서 다른 작업의 변경/untracked 파일까지
> 스테이징해 surgical commit을 깨뜨립니다. 항상 변경한 파일만 명시적으로 add 하세요.

### 5. PR 생성
GitHub CLI를 사용하여 PR을 생성하세요:

```bash
gh pr create --title "PR 제목" --body "$(cat <<'EOF'
## Summary
- 변경사항 요약 (1-3개 bullet points)

## Changes
- 구체적인 변경 내용

## Test Plan
- [ ] 테스트 계획 항목

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)

<현재 세션 URL — 하네스가 지정>
EOF
)"
```

> `gh pr create`는 base를 기본 브랜치(`main`)로, head를 현재 브랜치로 자동 설정합니다 — 별도 `--base` 불필요.

## 주의사항
- 커밋 전 **빌드 green 확인**: `npm run build`. 이 저장소는 esbuild 빌드라 `tsc` 타입에러가 빌드를 막진 않지만(Phase 0), 빌드 자체는 통과해야 합니다. 테스트가 있으면 `npm test`(vitest)도.
- 민감한 정보 (API 키, 비밀번호) 포함 여부 확인
- **`main` 직접 커밋 금지** — Vercel 프로덕션 자동배포(4-0 참조). 브랜치 접두사: `feat/` `fix/` `refactor/` `chore/`
- 머지 후 ghost-merge 검증 필수 (GitHub가 권위 소스, 모든 머지 방식 안전):
  ```bash
  gh pr view <PR> --json state,baseRefName,mergedAt
  # state == "MERGED" && baseRefName == 대상브랜치 && mergedAt != null → 안착 확정
  ```
  ⚠️ `git cherry` / `git merge-base --is-ancestor` 는 **squash 머지에서 false negative**다
  (squash 커밋은 PR-head를 히스토리에 포함하지 않아 ancestor가 아님) → ghost-merge 검증에 사용 금지.

## 예시 실행
```
사용자: /commit-push-pr

Claude:
1. git status 확인... 5개 파일 변경됨
2. 변경 분석: src/dash/shell.tsx - 상단 네비 메모 아이콘 교체
3. 커밋 메시지: "feat(ui): 상단 네비게이션 메모 아이콘 추가"
4. 커밋 및 푸시 완료
5. PR 생성: https://github.com/user/repo/pull/123
```
