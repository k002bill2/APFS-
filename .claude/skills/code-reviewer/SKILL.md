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

## APFS 맥락
- 주 산출물은 자가완결 HTML 번들. 앱 로직은 React(dev)+Babel JSX, 자산은 gzip+base64 임베드.
- blob URL의 `integrity`/`crossorigin` 제거는 **의도된 정상 동작**(file:// null origin) — 보안 결함으로 오판하지 말 것.
- 빌드/테스트 러너가 없으므로 "테스트 추가" 류 일반 조언은 프로젝트 현실에 맞게 조정.
- 관련: 번들 편집 절차는 [[apfs-bundle]], UI/디자인 규약은 [[dashboard-ui]] 스킬 참조.
