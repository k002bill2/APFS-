---
name: code-reviewer
description: 품질·보안·유지보수성 코드 리뷰. PR/변경/병합 전 또는 코드 품질 점검이 필요할 때 사용. Comprehensive code review for quality, security, and maintainability — use when reviewing changes or before merging.
---

# Code Review Skill

## 목적
변경된 코드를 **보안 · 정확성 · 성능 · 가독성/유지보수성** 관점에서 체계적으로 검토한다.

## 리뷰 체크리스트

### 1. 코드 품질
- [ ] 명확한 변수/함수명, 단일 책임, 적정 크기
- [ ] 중복 없음(DRY), 일관된 스타일, 적절한 추상화 수준

### 2. 보안 (웹/프론트엔드 중심)
- [ ] 입력 검증 존재
- [ ] XSS: `innerHTML` / `dangerouslySetInnerHTML` / `DOMParser` / `eval` 사용처 점검
- [ ] 하드코딩된 시크릿/토큰 없음
- [ ] 외부 리소스 로드(CDN 등) 신뢰성 확인

### 3. 성능
- [ ] 효율적 알고리즘(불필요한 O(n²) 회피)
- [ ] 불필요한 재렌더/재계산 없음, 메모이제이션 적절
- [ ] 메모리 누수 없음, 비동기 처리 정상

### 4. 정확성/회귀
- [ ] 경계조건·null/undefined 처리
- [ ] 상태 경합/비동기 순서 문제 없음
- [ ] 기존 동작 회귀 위험 검토

## 출력 형식
```
## 리뷰 요약
- 판정: Approved / Needs Changes / Rejected (LGTM / Minor / Major / Critical)
- 위험도: Low / Medium / High

🟢 좋은 점:
- …
🟡 제안:
- `path:line` — …
🔴 필수 수정:
- `path:line` — 문제 + 근거 + 수정안
```

## 베스트 프랙티스
1. 모든 Critical 이슈는 반드시 해소.
2. 추측이 아니라 근거(파일:라인)로 말한다.
3. 결정/무시한 경고는 이유를 기록.

## APFS 맥락 (2026-09-14 실측 갱신 — 이 절이 낡으면 리뷰 품질이 직접 깎인다)

- **Vite + React 18 + TypeScript SPA.** JSX 변환은 빌드타임(esbuild). 브라우저 Babel·`window` 전역 IIFE·gzip+base64 자산 임베드는 2026-06 마이그레이션으로 **전부 제거**됐다.
- **빌드·테스트 러너가 있다.** `npm run build`(vite, exit 0이어야 함) · `npm test`(vitest, 테스트 파일 7개). ⚠️ "러너가 없으니 테스트 조언은 접는다"는 **옛 서술이며 거짓**이다 — 테스트 누락은 정상적으로 지적한다.
- **`tsc --noEmit`은 타입 에러를 다수 보고하지만 `vite build`는 green이다** (esbuild는 타입체크를 하지 않고 `tsconfig`도 `strict:false`). 기존 타입 에러의 존재 자체를 회귀로 보고하지 말고, **이 변경이 새로 낸 타입 구멍만** 지적한다.
- **`React.createElement`(별칭 `h`) 잔존은 알려진 미완 전환이지 결함이 아니다.** `src/dash/*.tsx` 49개 중 6개만 남았다(`charts` `icons` `generic_list` `fund_stats` `apfs_contribution_manage` `fund_cash_forecast_manage`). "JSX로 바꿔라"는 그 파일을 이미 손대는 PR에서만 유효하다.
- **백엔드·인증이 없다.** 데이터는 더미(`src/dash/data.ts`, `src/dash/schemas/*.ts`). 서버 입력검증·authN/authZ·세션·SQL 류 지적은 **대상이 없다**. 반면 XSS(`dangerouslySetInnerHTML`·`innerHTML`)와 하드코딩 시크릿은 그대로 본다.
- **레거시 오프라인 HTML 번들은 삭제됐다**(커밋 `5fb2dfa`). 옛 예외 규칙(`blob URL의 integrity/crossorigin 제거는 정상`)은 **적용 대상이 사라졌다**. [[apfs-bundle]] 스킬도 이 리뷰 경로와 무관하다.

관련 규약(중복 지적 금지 — 정본은 각 스킬): UI·디자인 [[dashboard-ui]] · 색 토큰 [[color-tokens]] · 반응형 [[responsive-ui]] · 접근성 [[web-a11y]] · 레이어 [[z-index]]
