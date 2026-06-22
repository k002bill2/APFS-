# IBSheet 도입 타당성 리포트 — APFS 대시보드

> 작성: 멀티에이전트 워크플로우(14 agents · 공식문서 적대적 검증) | 독자: 프론트엔드 결정권자
> 근거: 기능 매트릭스 47건 + IBSheet 공식문서 적대적 검증 8건 | 작성일 2026-06-22

---

## 1. 한 줄 결론

**현행 기능 46건 중 41건(약 89%)은 IBSheet로 구현 가능하다(parity 28 + gain 6 + workaround 7).**
진짜 마찰점은 "표 자체"가 아니라 표를 감싼 우리 앱의 정체성 — 즉
1. 다크 + CSS변수토큰 + Tweaks 런타임 테마,
2. `mask.tsx` 단일 전역 마스킹 토글,
3. 선언형 React ↔ 명령형 인스턴스 임피던스 불일치,
4. Vercel preview 도메인 회전 환경의 URL 단위 라이선스

— 이 네 가지다. **그리드 본체(매트릭스·합계·다단헤더·정렬·대용량)는 오히려 IBSheet가 더 잘한다.** 잃는 것은 그리드 밖 영역과 "셀 안에 React를 넣어둔" 커스텀 시각화다.

---

## 2. 기능별 구현가능성 매트릭스

평가 척도: **gain**(현행보다 개선) / **parity**(동등) / **workaround**(우회로 구현, 우아함 손실) / **loss**(동등 불가) / **blocker**(도입 차단). 검증결과 컬럼은 적대적 검증의 confirmed/refuted/partial/unverified.

### 2-1. 프레임(GridFrame 외곽 — IBSheet 범위 밖, React 유지)

| 기능 | IBSheet지원 | 평가 | 공수 | 리스크 | 검증결과 | 비고 |
|---|---|---|---|---|---|---|
| F1 브레드크럼/PageHeader | 해당없음 | parity | low | low | — | 프레임 영역, 변경 없음 |
| F2 카드헤더 title+sub | 해당없음 | parity | low | low | — | 프레임 영역 |
| F3 KPI 요약뱃지(필터집합 파생 sum/avg) | config | parity | medium | medium | confirmed(추출 API) | 합계는 FormulaRow/getShownRows로 추출 가능하나 **카드형 KPI는 React가 그리고 필터집합 동기화에 instance 폴링 필요** — 임피던스 비용의 구체적 발현 |
| F4 툴바슬롯 | 해당없음 | parity | low | low | confirmed(getCheckedRows) | UI는 React, 액션만 instance 메서드로 연결 |
| F5 푸터슬롯(건수·페이지네이션·뷰토글·내보내기) | config | parity | medium | medium | confirmed | 건수가 **필터된 행 파생** → F3과 동일하게 instance 동기화 필요 |
| F6 maxWidth1280+dashFade | config | parity | low | low | confirmed | 컨테이너 CSS 유지 |

### 2-2. 리스트(L*) — 그리드 본체

| 기능 | IBSheet지원 | 평가 | 공수 | 리스크 | 검증결과 | 비고 |
|---|---|---|---|---|---|---|
| L1 행 체크박스+전체선택 | native | **gain** | low | low | confirmed(Type:Bool + HeaderCheck:1) | 수동 Set 관리보다 견고 |
| L2 일괄삭제 | native | parity | low | low | confirmed(deleteRow+Deleted=1) | 서버 연동 시 오히려 유리 |
| L3 모달 CRUD+2단확인 | native | **workaround** | medium | medium | confirmed(인셀편집 native) | 인셀편집 채택 시 모달 UX 상실, 모달 유지 시 그리드 표시전용+React폼 이중관리. 2단확인은 Radix 유지 |
| L4 행 클릭/더블클릭/hover | native | parity | low | low | confirmed | hover 톤은 CSS변수 의존 → X2 위험 상속 |
| L5 클라이언트 페이지네이션 | native | parity | low | low | confirmed(SearchMode/PageLength) | 페이지버튼 UI 모양 다를 수 있어 커스텀 푸터+instance 제어 권장 |
| L6 뷰토글(테이블↔카드) | unverified | **loss** | high | high | **unverified(카드뷰)** | 카드뷰 문서 근거 없음 → React 카드 렌더러 병행+토글 스왑. "데이터 소스 이원화"는 과장 — 단일 APFS_DATA 공유하면 데이터는 하나, **"렌더러 이원화"가 정확** |
| L7 스키마주도 컬럼(9 cell types) | config | workaround | medium | medium | confirmed(Cols 매핑) | text/code/amount/date/number는 직매핑, pii/status/gp/rate는 Button:'Html' 재구현. SSOT가 React→IBSheet 옵션으로 이동 |
| L8 타입별 셀렌더러(숫자우측·tabular·단위) | native | **gain** | low | low | confirmed(Align+Format) | 숫자/날짜 포맷은 IBSheet 강점 |
| L9 StatusBadge(tone 색칩) | custom-render | **workaround** | medium | medium | **partial** | Button:'Html'로 배지 재현 confirmed. 색이 var(--success) 의존 → 자동 추종 안 됨, X2 브리징 필요 |
| L10 MiniBars 스파크라인 셀 | custom-render | **loss** | high | high | **partial/unverified** | 인셀 차트 native unverified(IB Chart는 별도 제품). Button:'Html'+SVG 우회만 — React 선언성/반응성 상실 confirmed, Row.Height 수동, 렌더 성능 동등성 unverified |
| L11 상세필터 드로어 | config | parity | medium | medium | confirmed(ShowFilterRow) | UX 다름 → React 드로어 유지, 값만 instance로 적용 권장 |
| L12 복합 행필터(값AND+태그OR+부분/정확) | native | parity | medium | medium | **partial** | 열간 AND·열내 다중선택 OR·Text 부분일치 confirmed. **복합식 단일 선언 동등표현 + 사용자 필터콜백은 unverified** — 앱레벨 getShownRows 자체 술어 필터 필요 가능 |
| L13 제거가능 필터칩 | 해당없음 | parity | low | low | — | 칩 UI는 React, 단방향 배선만 |
| L14 빈상태 EmptyState | config | parity | low | low | confirmed(NoDataMessage) | 커스텀 디자인은 HTML 커스터마이즈 또는 React 오버레이 |
| L15 토스트(sonner) | 해당없음 | parity | low | low | — | 앱 레벨, 이벤트 연결만 |
| L16 kebab 드롭다운 | 해당없음 | parity | low | low | confirmed(export)/unverified(print) | 내보내기 위임은 gain, 인쇄는 unverified |

### 2-3. 매트릭스(M*) — IBSheet의 최적 적용 영역

| 기능 | IBSheet지원 | 평가 | 공수 | 리스크 | 검증결과 | 비고 |
|---|---|---|---|---|---|---|
| M1 2단 중첩헤더 | config | **gain** | low | low | confirmed(Header 배열+HeaderMerge) | 수동 colSpan/rowSpan보다 선언적 |
| M2 계산된 합계행 | config | **gain** | low | low | confirmed(FormulaRow+setMergeRange) | 하드코딩 TOTAL을 자동계산으로 대체 |
| M3 조건부 셀스타일 | config | parity | medium | medium | confirmed(Formula/AddClassFormula) | muted/강조 색이 CSS변수 의존 → X2 위험 상속 |
| M4 조회전용 매트릭스 | native | **gain** | low | low | confirmed(CanEdit:0) | **IBSheet가 가장 자연스러운 적용 영역** |

### 2-4. 횡단 관심사(X*) — 마찰점 집중 구역

| 기능 | IBSheet지원 | 평가 | 공수 | 리스크 | 검증결과 | 비고 |
|---|---|---|---|---|---|---|
| X1 마스킹 mn()/MT 전역 토글 | custom-render | **workaround** | high | high | **REFUTED** | 전역 마스킹/토글 native 없음(반증 확정). 마스킹은 per-column 모델. 동등효과는 전 컬럼 순회 CustomFormat 주입 또는 렌더 이벤트 일괄변환을 `_on`에 직접 배선 — 단일토글의 우아함 상실 |
| X2 테마: CSS변수+다크+Tweaks 런타임 | (정정됨) | **친화성 마찰**(loss 아님) | high | high | **PARTIAL** | 매트릭스의 "loss/전부 unverified"는 틀림. 런타임 테마전환 confirmed(`Def.setCurrentStyle`/`getCurrentStyle`/`clearCurrentStyle`, 8.3.0.18+, localStorage, 설정팝업). 다크그레이 프리셋 실재(OS 자동토글만 미문서). **진짜 미확인은 "앱 var(--token) 자동 추종"뿐** → 토큰을 setCurrentStyle로 주입+열린 시트 새로고침 브리지 필요 |
| X3 반응형(모바일 카드 재배치) | config | **loss** | high | high | confirmed/한계 | 컨테이너 리사이즈는 되나 본질이 표 → 모바일 카드 재배치 불가, 예제에 min-width 제약. 좁은 화면은 가로스크롤 표로 고정 (responsive-ui 규약과 충돌) |
| X4 RBAC editable 게이팅 | config | parity | low | low | confirmed(CanEdit) | 메뉴 가시성은 Shell 책임, 무관 |
| X5 내보내기/인쇄 | native | **gain**(조건부) | low | medium | **partial** | Excel/PDF export confirmed이나 **Down2Pdf.jsp+POI 서버모듈 의존 → 백엔드 없는 본 프로토타입엔 인프라 필요**. 인쇄 전용 API unverified. 현행 stub 대비론 개선 |
| X6 접근성(Radix focus trap/aria) | unverified | parity | medium | medium | verified(SA인증)/unverified(aria세부) | 오버레이는 Radix 유지. 그리드 SA 품질인증 보유, WAI-ARIA 세부 마크업 unverified |

### 2-5. 커스텀 셀 / 비표 위젯 / 아키텍처

| 기능 | IBSheet지원 | 평가 | 공수 | 리스크 | 검증결과 | 비고 |
|---|---|---|---|---|---|---|
| 커스텀셀: ColorChip(gp) | custom-render | workaround | medium | medium | partial | Button:'Html' 주입 confirmed, 토큰 연동 X2 위험 상속 |
| 커스텀셀: ExecBar/HBars 진행바 | custom-render | workaround | medium | medium | partial | Button:'Html'+AddClassFormula 우회, 테마토큰 X2 위험 |
| **아키텍처: 선언형 frame+children vs 명령형 instance** | config | **workaround** | high | medium | **PARTIAL(프레이밍 REFUTED)** | "큰 마찰 없이 통합"은 반증. @ibsheet/react는 **마운트 시 1회만 생성, props 변경에 반응 안 함**("does NOT react to prop changes after initial mount"). 동적 갱신은 ref instance 메서드 또는 key 강제 리마운트. 이 배선 자체가 마찰의 실체 |
| 비표: Calendar/Timeline/Card Grid/Steppers/Notif/KPI카드/AuditTimeline/탭/슬라이더/상세모달 | 해당없음 | parity | low | low | — | 표 아님 → React 유지, IBSheet 무관(탭은 인스턴스 라이프사이클 주의) |
| 조건부 행 하이라이트 | config | parity | low | medium | confirmed | Color/Formula로 native, danger tint 토큰 의존은 X2 위험 |
| **라이선스 비용/도메인 바인딩** | native | **loss** | medium | high | **PARTIAL(운영가능성 REFUTED)** | 바인딩·도메인별 라이선스·비공개 가격 전부 confirmed. 그러나 **"Vercel preview 회전 환경 운영 관리 가능"은 반증** — 모든 URL 개별 발급 필요, 와일드카드 미지원. localhost만 무검증 |

---

## 3. IBSheet 도입으로 '얻는 것' (gain) — 모두 공식문서 confirmed

그리드 본체에 집중된다.

- **다단/병합 헤더(M1)** — `Header` 배열 + `Cfg.HeaderMerge`로 선언적. 현행 수동 colSpan/rowSpan보다 우월.
- **계산 합계행/소계(M2)** — `FormulaRow`(sum/avg/count) + `makeSubTotal` + `setMergeRange`. 하드코딩 TOTAL 배열을 자동계산으로 대체. **실데이터 연동 시 특히 가치.**
- **숫자/날짜 포맷(L8)** — `Align:'Right'` + `Format:'#,##0 억원'`로 천단위·단위접미·소수 native.
- **인셀 편집 + dirty 추적** — Added/Changed/Deleted 자동 추적, `getSaveJson`. **서버 연동 시 CRUD가 오히려 유리.**
- **고정 열(LeftCols) · 정렬 · 엑셀형 필터** — 가로 넓은 매트릭스에 native 고정열.
- **전체선택 체크박스(L1)** — `HeaderCheck:1` 내장이 수동 Set 관리보다 견고.
- **대용량(≤5만행 비페이징 / ScrollAppend / ServerPaging)** — 단, "가상 스크롤/100만행 고효율"은 마케팅 문구로 메커니즘 미문서(unverified). 대용량=페이징 전략으로 한정 이해.
- **내보내기(X5)** — Excel/PDF/CSV/Image. 단 PDF/Excel은 **서버모듈 의존**(4 참조).
- **조회전용 매트릭스(M4)** — 다단헤더+합계+고정열+정렬을 한 번에. **IBSheet가 가장 빛나는 영역.**

---

## 4. '잃는 것 / 마찰점' (적대적 검증 반영, 과장 없이)

### 4-1. [최대 마찰] 테마 — PARTIAL, "loss" 아님
런타임 테마 전환은 **confirmed**(`Def.setCurrentStyle`/`getCurrentStyle`/`clearCurrentStyle`, 8.3.0.18+, localStorage 영속, 설정팝업 UI). 다크그레이 프리셋도 실재. **유일하게 unverified인 것은 "앱의 `var(--token)`을 그리드가 자동 추종"하는 메커니즘.** 따라서 리스크는 "리테마 불가"가 아니라 **"앱 토큰 자동추종 불가 → Tweaks/다크 토글 시 토큰을 `setCurrentStyle`로 주입하고 이미 열린 시트를 새로고침하는 브리지 코드 필요."** 그리드만 테마 이탈할 위험은 실재하나 해결 경로가 있는 마찰이다.

### 4-2. [REFUTED] 전역 마스킹 토글의 우아함 상실
`mask.tsx`의 단일 `_on` 한 줄로 전 화면을 마스킹/해제하는 native 기능은 **IBSheet에 없음(반증 확정).** 마스킹은 per-column(`Format`/`CustomFormat`/`setAttribute`)이 기본. 동등효과는 만들 수 있으나 **전 컬럼 순회 CustomFormat 주입 또는 렌더 이벤트 일괄변환을 직접 구현해 `_on`에 배선**해야 한다.

### 4-3. [REFUTED 프레이밍] 선언형 ↔ 명령형 임피던스 불일치
@ibsheet/react는 **마운트 시 1회만 그리드 생성, props 변경에 반응하지 않는다**(공식: "does NOT react to prop changes after initial mount", `useEffect([])`). 동적 갱신은 (1) ref instance 명령형 메서드 또는 (2) `key` 강제 리마운트. 구체적 대가: **F3 KPI 배지·F5 푸터 건수가 "필터된 행" 파생** → IBSheet 본체로 바꾸면 props가 아니라 instance 폴링으로 동기화해야 함. frame↔children 경계가 무거워진다.

### 4-4. [loss] 커스텀 시각화 셀 — PARTIAL
Button:'Html'로 HTML/SVG 재현은 confirmed. 그러나 (a) React 선언성/반응성 상실 confirmed, (b) 테마토큰 반응성은 부분적(그리드 크롬은 별도 브리징), (c) 렌더 성능 동등성 unverified(행 높이 변동 시 `Row.Height` 수동).

### 4-5. [loss] 반응형/모바일
컨테이너 리사이즈는 되나 본질이 표. **모바일 카드형 재배치 불가**, 예제에 min-width 제약. responsive-ui 규약과 충돌.

### 4-6. [loss] 카드 뷰토글 — unverified ≠ unsupported
IBSheet 카드뷰는 unverified(문서 근거 없음, custom cell/CSS로 구현 여지). React 카드 렌더러 병행+토글 스왑이 현실적. **"데이터 소스 이원화"는 과장 — 단일 APFS_DATA를 공유하는 "렌더러 이원화"가 정확.**

### 4-7. [loss] 라이선스 — 운영성 REFUTED
도메인/IP/포트 단위 바인딩, URL마다 라이선스 필요, 공개 가격표 없음 — **전부 confirmed.** 그러나 **"Vercel preview URL 회전 환경 운영 관리 가능"은 반증**: 모든 URL 개별 발급 필요 + 와일드카드/동적 도메인 미지원. localhost만 무검증.

### 4-8. [partial] 복합 필터 / 내보내기·인쇄
- L12: 열간 AND·열내 OR·Text 부분일치 confirmed, **복합식 단일선언+사용자 필터콜백 unverified** → 앱레벨 자체 필터 필요 가능.
- X5: Excel/PDF confirmed이나 **서버모듈(POI) 의존**, 인쇄 전용 API unverified.

---

## 5. 권고

### 결론: **부분 도입 — 조회전용 매트릭스·대용량 조회 페이지에 한정**

**전면 도입 거부 이유:** 손실 4건(반응형/모바일, 카드 뷰토글, 커스텀 시각화 셀, 라이선스 운영성)과 마찰 3건(테마 토큰 브리징, 전역 마스킹 재구현, 선언형↔명령형 배선)이 **CRUD 리스트 페이지에 집중**된다. 이들은 무료 OSS 스택으로 이미 동작 중이며, IBSheet로 바꿔 얻는 것이 잃는 것보다 작다.

**미도입 거부 이유:** M1/M2/M4(다단헤더·자동합계·조회전용 매트릭스)와 대용량 조회는 IBSheet가 명백히 우월(전부 confirmed).

**부분 도입 범위(gain 클러스터):**
- 조회전용 매트릭스(M4) — 다단헤더·합계행·고정열·정렬·내보내기를 native로.
- 대용량 조회전용 페이지 — 페이징 전략 활용.
- **CRUD·커스텀시각화·마스킹·카드토글이 있는 리스트는 React 유지.**

**전제 조건:**
1. IBSheet는 **고정 운영/스테이징 도메인에만** 노출, 회전 preview에는 미발급.
2. PDF/Excel export는 **서버모듈 인프라 확보** 후에만 gain으로 계상.
3. 테마는 `setCurrentStyle` **브리지 코드 + 시트 새로고침**을 PoC에서 먼저 검증.

### frame+children 점진 전략 — **가능하며 권장**

GridFrame은 PageHeader·카드헤더+KPI·툴바·푸터를 프레임으로 소유하고 테이블 본체만 `children`으로 주입한다(코드 확인). 따라서 **GridFrame은 React로 유지하고 children만 IBSheet로 교체하는 점진 전략이 아키텍처적으로 깨끗하다.** IBSheet 범위는 정확히 children에 국한되고, 프레임 영역(F1·F2·F4·L13·L15 등)은 모두 parity로 무변경.

**단, 점진 전략이 숨기는 비용:** F3 KPI 배지·F5 푸터 건수가 "필터된 행"에서 파생되므로, children이 IBSheet가 되는 순간 이 값들은 props가 아니라 **instance 폴링/이벤트로 동기화**해야 한다. **M4 같은 조회전용·KPI 없는 매트릭스부터 children 스왑을 시작하면 이 비용을 최소화하며 안전하게 검증할 수 있다.**

---

## 부록 A. 적대적 검증 출처 (8건)

| # | 주장 | 판정 | 핵심 출처 |
|---|---|---|---|
| 1 | 다크+토큰+Tweaks 런타임 테마 동기 | **partial** | portal.ibsheet.com 8.3.0.18 릴리스노트 (setCurrentStyle 신설) |
| 2 | 커스텀 셀(스파크라인/배지) 반응성+성능 유지 | **partial** | portal 72000529987 (Button:'Html'), React 연동 매뉴얼 |
| 3 | 전역 마스킹 토글 동등 전역 재현 | **refuted** | portal 72000595307 (per-column 모델) |
| 4 | 선언형 React ↔ 명령형 "큰 마찰 없이 통합" | **partial(프레이밍 refuted)** | github.com/ibsheet/ibsheet-react-component README |
| 5 | 카드 뷰토글 유지(데이터 소스 이원화) | **partial** | ibsheet.com/ibsheet (카드뷰 미문서) |
| 6 | Vercel preview 회전 환경 라이선스 운영 가능 | **partial(운영성 refuted)** | portal 72000601965 라이선스 정책 |
| 7 | 내보내기/인쇄 순수 gain | **partial** | portal 72000529994 (서버모듈 의존), 인쇄 API 미문서 |
| 8 | L12 복합필터 native 동등 표현 | **partial** | portal 72000530038 (Filter 행 검색유형) |

## 부록 B. 코드 정독 추가 발견 기능 (baseline 32건 외)

매트릭스에는 합산했으나, 전수조사에서 baseline에 없던 그리드/비표 기능들 — IBSheet로 옮기지 않고 React로 유지할 항목들이다:

- **Calendar View** (accounting/schedule) — 월간 캘린더 + 이벤트 도트
- **Timeline View** (schedule) — 날짜 그룹 수직 타임라인 + D-day
- **Audit Timeline** (accounting) — 수직 감사 로그
- **Steppers** (risk 5단계, report 4단계) — 진행 단계 인디케이터
- **Notification Panel** (schedule) — 읽음/안읽음 알림 사이드바
- **Range Slider** (performance) — 리스크 노출 필터 슬라이더
- **In-cell Search Input** (subfund) — 실시간 행 필터 입력
- **Detail Expansion Modal/Card** (subfund/performance) — 행 상세 패널
- **Tab-based Content Switching** (accounting/report/schedule) — SegTabs 콘텐츠 전환
- 조건부 행 하이라이트(연체/불일치 danger tint), 진행바 셀(ExecBar/HBars), code 컬럼 monospace, count pill 등

> 이들 대부분은 "표가 아닌" 위젯이라 IBSheet 범위 밖이며, frame+children 전략에서 **그대로 React로 유지**된다.
