# APFS Node 22 Readiness Remediation

## 목적
APFS를 Node.js 22 기준으로 재현 가능하게 만들고, 기존 정합성 검사에서 확인된 타입 오류와 의존성 보안 이슈를 최소 범위로 처리한다.

## 대상
- Worktree: `/Users/younghwankang/Work/APFS-node22-readiness`
- Base: `main` at `77d4643`
- Branch: `chore/apfs-node22-readiness`

## 범위
1. `npx tsc --noEmit`의 기존 오류 원인 조사 및 최소 수정
   - `src/dash/generic_list.tsx`
   - `src/dash/ui/select-editor.tsx`
2. Node 22 실행 기준 고정
   - `.nvmrc` 또는 `.node-version`
   - `package.json.engines.node`
   - `packageManager`는 현재 npm 기준을 명시할지 검토
3. `npm audit fix --dry-run`으로 비강제(non-breaking) 보안 업데이트 가능성을 확인
   - `--force` 금지
   - `xlsx`처럼 자동 수정 불가한 항목은 코드 사용 범위와 잔여 위험을 보고
4. 기존 build 경고는 원인과 수정 비용을 평가하되, 동작 변경·대규모 번들 최적화는 범위 밖

## 제외
- `git commit`, `git merge`, `git push`, Vercel 배포
- `.env`, credential, token 등 비밀 파일 접근
- 레거시 HTML 번들 직접 수정
- 보안 취약점 해결을 위한 major 업그레이드 또는 `npm audit fix --force`
- shared infrastructure 변경

## 수용 기준
- `npm ci --ignore-scripts` 성공
- installed tree에서 missing/extraneous 0건
- `npx tsc --noEmit` 성공하거나, 기존/신규 오류를 정확히 분리해 보고
- `npm test` 전체 통과
- `npm run build` 성공
- Node 22 selector/engine/package manager 설정이 서로 충돌하지 않음
- `npm audit` 결과와 자동 수정 가능 여부를 기록
- worktree 변경 파일과 사전 존재 변경을 구분

## 검증 명령
```bash
node --version
npm --version
npm ci --ignore-scripts
npm ls --depth=0 --json
npx tsc --noEmit
npm test
npm run build
npm audit --omit=dev --json
npm audit fix --dry-run --ignore-scripts

git diff --check
git status --short --branch
```

## 위험 및 확인 필요
- 현재 `package.json`은 `engines`, `.nvmrc`, `.node-version`이 없다.
- `tsc` 오류는 APFS 문서가 Phase 0의 알려진 타입 오류로 언급하지만, 이번 작업에서는 실제 오류를 최소 수정한다.
- `npm ci` 출력상 전체 취약점과 production 취약점을 분리한다. 자동 수정 불가 항목은 사용자 확인 없이 major 교체하지 않는다.
- build 경고는 성공을 막지 않으므로, 별도 변경이 필요하면 잔여 경고로 보고한다.

## 완료 조건
Developer 구현 결과를 Jarvis가 독립적으로 현재 worktree에서 재검증하고, 독립 보안/코드 리뷰 결과와 함께 PASS·PARTIAL·BLOCKED를 분리 보고한다.
