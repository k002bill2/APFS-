---
name: check-health
description: APFS 프로젝트 헬스 체크 — 빌드·테스트·타입·의존성 audit·구조 점검 후 점수 리포트.
disable-model-invocation: true
---

# Project Health Check

APFS 대시보드의 품질 게이트를 한 번에 돌리고 결과를 점수로 보고합니다. 모든 명령은 **저장소 루트**에서 실행합니다(모노레포 아님).

> 이 프로젝트에는 ESLint·`lint`/`type-check`/`test:coverage` 스크립트·CI 워크플로우가 **없다**. 없는 게이트를 지어내지 않는다.

## Steps

### 1. Build (게이트)
```bash
npm run build
```
Vercel 배포 경로와 같다. 실패 = 배포 불가.

### 2. Test (게이트)
```bash
npx vitest run
```
대상: `src/dash/**/*.test.ts` (environment `node`, `vitest.config.ts`). 가드 테스트(예: `no_demo_mask.test.ts`, `applied_filters.test.ts`)가 규약 위반을 잡는다 — 실패 시 규약을 먼저 확인하고 테스트를 고치지 않는다.

### 3. TypeScript (보조)
```bash
npx tsc --noEmit
```
`strict:false`·esbuild 빌드라 게이트가 아니다. **기준선 대비 증가 여부**만 본다(에러 수를 리포트에 적는다).

### 4. Dependency Audit
```bash
npm audit --omit=dev
```
`npm audit fix --force` 는 메이저 업그레이드를 일으키므로 사용자 확인 없이 돌리지 않는다.

### 5. Project Structure
- 필수 파일: `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/skill-rules.json`, `vercel.json`
- 스킬 디렉터리명 ↔ `skill-rules.json` 트리거 대응
- `git status --short` — `.env`·민감 파일 미커밋
- 워크트리 현황: `bash scripts/wt.sh ls` (방치된 dirty 워크트리)
- 가드 스크립트 변경이 있었다면: `bash scripts/block-main-write.test.sh`

## Output Format

```markdown
# APFS Health Check  (<실행 시각 — `date` 로 얻는다>)

1. ✅ Build: vite build exit 0
2. ✅ Tests: N/N passed
3. ⚠️ TypeScript: M errors (기준선 K → 신규 M-K)
4. ⚠️ Dependencies: high 0 / moderate 2
5. ✅ Structure: OK

**Health**: 🟡 Good (4/5)

## Action Items
1. <가장 급한 것 하나>
```

## Health Score

`(통과 항목 / 5) × 100` — 100 🟢 · 80 🟡 · 60 🟠 · <60 🔴.
Build·Test 둘 중 하나라도 실패면 점수와 무관하게 🔴(배포 차단).
