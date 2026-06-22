# AG Grid 도입 타당성 리포트 — APFS 대시보드 (+ IBSheet 헤드투헤드)

> 작성: 멀티에이전트 워크플로우(13 agents) — Research/Map 완료, **적대적 Verify 단계는 세션 한도로 미완**
> 근거: AG Grid 공식문서 1차 출처(ag-grid.com·license-pricing·npm) 직접 판독 + 직전 IBSheet 리포트 비교
> 독자: APFS 프론트엔드 결정권자 | 작성일 2026-06-22 | 기준 버전: v33+(최신 v35.3.1)

> ⚠️ **방법론 한계(정직 고지):** 본 리포트의 AG Grid 능력 판정은 Research 에이전트 3종이 공식문서를 브라우저로 직접 읽어 확보한 **1차 출처**에 근거한다(에디션은 문서의 `(e)` 마커·license-pricing Feature Breakdown·npm `license` 필드로 교차확인). 그러나 **독립 적대적 재검증(verify) 8건과 자동 리포트 합성은 세션 사용량 한도로 실행되지 못했다.** 따라서 IBSheet 리포트에 있던 "회의적 검토관이 반증 시도" 레이어가 AG Grid에는 아직 없다. 표기 `[1차출처]`는 공식문서 직접 확인, `[추론]`은 출처 종합 추정, `[미검증]`은 확인 불가를 뜻한다. 적대적 검증은 9:20pm(KST) 이후 워크플로우 resume로 캐시(Research/Map)를 재사용해 저비용으로 보강 가능.

---

## 1. 한 줄 결론

**현행 기능의 대부분이 AG Grid로 구현 가능하며, 그중 핵심은 거의 전부 무료 Community(MIT)로 커버된다. 결정적으로 AG Grid는 IBSheet의 4대 마찰점 중 3개(테마·React통합·라이선스)를 구조적으로 해소한다.** 남는 진짜 약점은 단 두 가지 — ① **반응형/모바일 카드 재배치 불가(IBSheet와 동일한 한계)**, ② **번들 크기.** 그리고 Enterprise(유료) 강제는 사실상 **native 스파크라인과 native Excel export 두 기능뿐**인데, 둘 다 Community 우회로(커스텀 React 셀 + CSV/클라이언트 xlsx)가 있다.

> **IBSheet vs AG Grid 한 줄 비교:** IBSheet는 "표 자체"는 강하나 우리 앱 정체성(토큰테마·React선언성·Vercel배포)과 충돌. **AG Grid는 그 충돌을 대부분 없앤다** — 명령형→선언형, 도메인라이선스→무료/개발자단위, 테마격리→CSS변수 네이티브. 대신 IBSheet가 native로 주던 것(합계행·Excel)이 AG Grid에선 Community 우회 또는 Enterprise.

---

## 2. 기능별 구현가능성 매트릭스

척도: **gain**(현행 개선) / **parity**(동등) / **workaround**(우회) / **loss**(동등 불가) / **blocker**(차단). 에디션: **무료**=Community(MIT) / **유료**=Enterprise. `vs IB`: AG Grid가 IBSheet보다 나음(▲) / 동등(=) / IBSheet가 나음(▼).

### 2-1. 프레임(GridFrame 외곽 — React 유지, 그리드 무관)

| 기능 | AG Grid지원 | 에디션 | 평가 | 공수 | 리스크 | vs IB | 비고 |
|---|---|---|---|---|---|---|---|
| F1 브레드크럼 / F2 카드헤더 | 해당없음 | — | parity | low | low | = | 프레임 영역, 무변경 |
| F3 KPI 요약뱃지(필터집합 파생) | config | 무료 | **parity** | low | medium | **▲** | **선언형이라 `onModelUpdated`/`onFilterChanged` → React state → KPI 재렌더.** IBSheet의 instance 폴링 불필요 [1차출처] |
| F4 툴바 / F5 푸터 / L13 필터칩 / L15 토스트 | 해당없음 | — | parity | low | low | = | UI는 React, 그리드 API 이벤트만 연결 |
| F6 maxWidth+dashFade | config | 무료 | parity | low | low | = | 컨테이너 CSS 유지 |

### 2-2. 리스트(L*) — 그리드 본체

| 기능 | AG Grid지원 | 에디션 | 평가 | 공수 | 리스크 | vs IB | 비고 |
|---|---|---|---|---|---|---|---|
| L1 행 체크박스+전체선택 | native | 무료 | **gain** | low | low | = | `rowSelection` 객체(multiRow·checkboxes·headerCheckbox). 단 **구 `checkboxSelection` colDef는 v32.2부터 폐기**, 신 API 사용 [1차출처] |
| L2 일괄삭제 | native | 무료 | parity | low | low | = | `applyTransaction({remove})` |
| L3 모달 CRUD+2단확인 | native | 무료 | parity | medium | low | **▲** | 인셀편집(Text/Number/Date/Select/Checkbox 에디터) 무료. **모달 유지 시에도 선언형이라 React폼↔rowData state 동기 자연스러움.** 단 **native "dirty cell" API 없음** → `cellValueChanged`/`cellEditRequest`+`getRowId`로 변경추적 [1차출처] |
| L4 행 클릭/더블클릭/hover | native | 무료 | parity | low | low | = | hover/선택 스타일은 Theming 토큰으로(X2 참조) |
| L5 클라이언트 페이지네이션 | native | 무료 | parity | low | low | = | `pagination=true`+`paginationPageSize` [1차출처] |
| L6 뷰토글(테이블↔카드) | (카드는 grid밖) | 무료 | **loss** | medium | medium | = | 카드뷰는 native 아님 → React 카드 렌더러 병행. 단일 rowData 공유(렌더러 이원화). IBSheet와 동일 |
| L7 스키마주도 컬럼(9 cell types) | config | 무료 | **gain** | medium | low | **▲** | colDefs로 매핑. **pii/status/gp/rate도 React 셀 렌더러로 깔끔** (IBSheet는 Html문자열) |
| L8 타입별 셀렌더러(숫자우측·단위) | native | 무료 | parity | low | low | = | `type`/`valueFormatter`/`cellClass` |
| L9 StatusBadge(tone 색칩) | custom-render | 무료 | **gain** | low | low | **▲** | **기존 React `StatusBadge` 컴포넌트를 셀 렌더러로 그대로 투입.** 토큰 색 자동추종(IBSheet는 Html+브리징 필요) [1차출처] |
| **L10 MiniBars 스파크라인 셀** | native(유료) **또는** custom-render(무료) | **유료 or 무료** | **gain** | low~med | low | **▲** | **두 경로:** ⓐ native `agSparklineCellRenderer`=**Enterprise**(AG Charts 기반), ⓑ **기존 React `MiniBars`를 셀 렌더러로 투입=Community 무료**. **IBSheet에선 React 반응성 상실(loss)이었으나 AG Grid는 진짜 React 컴포넌트로 보존** [1차출처] |
| L11 상세필터 드로어 | config | 무료 | parity | medium | low | = | Text/Number/Date 필터+floating filter 무료. **Set Filter(엑셀형 체크)=Enterprise**지만 우리 드로어는 커스텀이라 불요 [1차출처] |
| L12 복합 행필터(값AND·태그OR·부분/정확) | config | 무료 | parity | medium | medium | = | external filter(`isExternalFilterPresent`/`doesExternalFilterPass`)로 임의 술어 구현=무료. 복합식을 우리가 직접 정의 [1차출처] |
| L14 빈상태 | config | 무료 | parity | low | low | = | `overlayNoRowsTemplate` 또는 React 오버레이 |
| L16 kebab 드롭다운 | 해당없음 | — | parity | low | low | = | 앱 레벨 |

### 2-3. 매트릭스(M*) — 에디션 경계 주의 구역

| 기능 | AG Grid지원 | 에디션 | 평가 | 공수 | 리스크 | vs IB | 비고 |
|---|---|---|---|---|---|---|---|
| M1 2단 중첩헤더 | native | 무료 | **gain** | low | low | = | **Column Groups + `colSpan`=Community 무료** [1차출처] |
| M2 계산 합계행 | config | **무료(주의)** | parity | low | medium | ▼(약간) | **`pinnedBottomRowData`로 수동계산 합계행=Community 무료.** 단 **`aggFunc`/`grandTotalRow` 자동집계는 Enterprise(RowGrouping).** 우리 합계는 단일 총계라 무료 pinned row로 충분. IBSheet는 `FormulaRow` 자동집계가 native라 약간 우위 [1차출처] |
| M3 조건부 셀스타일 | config | 무료 | parity | low | low | = | `cellClassRules`/`cellStyle`/`rowClassRules`=무료 [1차출처] |
| M4 조회전용 매트릭스 | native | 무료 | **gain** | low | low | = | `editable=false`. 다단헤더+고정열+정렬+pinned합계 모두 무료 |

### 2-4. 횡단 관심사(X*) — 마찰점 집중 구역

| 기능 | AG Grid지원 | 에디션 | 평가 | 공수 | 리스크 | vs IB | 비고 |
|---|---|---|---|---|---|---|---|
| **X1 마스킹 mn()/MT 전역 토글** | custom | 무료 | **workaround** | medium | medium | **▲(약간)** | native 전역토글 없음(IBSheet와 동일). 단 **공유 `valueFormatter` 팩토리가 `_on` 읽고, 토글 시 `api.refreshCells()` 1회** — 선언형이라 IBSheet per-column 순회보다 깔끔 [1차출처] |
| **X2 테마: CSS변수+다크+Tweaks 런타임** | native | 무료 | **gain** | medium | medium | **▲▲** | **Theming API(v33 기본)=CSS변수+JS theme객체. 다크모드 1급(`data-ag-theme-mode` 런타임 토글, `colorSchemeDark`). `backgroundColor`/`foregroundColor`/`accentColor` 파라미터에 우리 `var(--token)` 주입 가능 → Tweaks 런타임 변경이 CSS캐스케이드로 추종.** IBSheet의 "자동추종 불가+브리지" 문제를 구조적으로 해소 [1차출처] |
| **X3 반응형(모바일 카드 재배치)** | config | 무료 | **loss** | high | high | **=** | column flex/autoSize/hide·resize/터치=무료. **그러나 좁은화면 행→카드 재배치는 native 미지원** — IBSheet와 동일한 한계. AG Grid가 해소 못하는 유일한 마찰 [1차출처] |
| X4 RBAC editable | config | 무료 | parity | low | low | = | `editable` 콜백. 메뉴 가시성은 Shell |
| **X5 내보내기/인쇄** | native | **CSV무료 / Excel유료** | **gain**(조건부) | low~med | low | **▲** | **CSV=Community 클라이언트 단독. Excel=Enterprise(단 클라이언트 단독, 서드파티/서버 불필요).** IBSheet는 PDF/Excel이 **서버모듈(POI) 의존**이었으나 AG Grid Excel은 서버 불요 → 백엔드 없는 본 프로토타입에 유리 [1차출처] |
| X6 접근성 | native | 무료 | parity | medium | low | = | WCAG 2.0 AA/Section508 지향, ARIA+`setGridAriaProperty`. 단 **pinned 행/열 스크린리더 탐색 한계** [1차출처] |

### 2-5. 커스텀 셀 / 아키텍처 / 비표 위젯

| 기능 | AG Grid지원 | 에디션 | 평가 | 공수 | 리스크 | vs IB | 비고 |
|---|---|---|---|---|---|---|---|
| 커스텀셀: ColorChip·ExecBar·HBars 진행바 | custom-render | 무료 | **gain** | low | low | **▲** | **기존 React 컴포넌트 그대로 셀 렌더러 투입, 토큰 자동추종.** IBSheet는 Html+클래스 브리징 |
| **아키텍처: 선언형 frame+children** | native | 무료 | **gain** | medium | low | **▲▲** | **`AgGridReact`는 선언형 — `rowData`/`columnDefs`를 props/state로, 변경 시 그리드 반응적 갱신. 셀 렌더러=실제 React 컴포넌트.** IBSheet의 "마운트1회·props무반응·instance폴링" 문제 없음 [1차출처] |
| 비표: Calendar/Timeline/Stepper/Notif/Slider/Tab/Detail모달 | 해당없음 | — | parity | low | low | = | 표 아님 → React 유지, 그리드 무관 |
| 행 그룹핑/트리/마스터디테일 | native | **유료** | (현재 미사용) | — | — | — | **Enterprise.** 현행 미사용(타임라인 날짜그룹은 React 뷰). 향후 필요 시 유료벽 [1차출처] |
| 대용량/가상화 | native | 무료 | **gain** | low | low | ▲ | **행+열 가상화 기본=무료. Infinite Row Model도 무료**("Enterprise not required for infinite scrolling"). Server-Side Row Model만 Enterprise [1차출처] |
| **라이선스/비용** | — | **무료/개발자단위** | **gain** | — | low | **▲▲** | **Community=MIT, 키 불요, 프로덕션 무료. Enterprise=개발자당 $999(영구,1년업뎃)·Bundle $1,498, per-developer & per-deployment, 도메인 바인딩 없음.** IBSheet의 "도메인/URL 바인딩→Vercel preview 불가" 문제가 **원천적으로 없음** [1차출처] |

---

## 3. AG Grid로 '얻는 것' (특히 IBSheet 대비)

1. **선언형 React 통합 [1차출처]** — `AgGridReact`는 `rowData`/`columnDefs`를 props로 받아 state 변경에 반응. 셀 렌더러가 실제 React 컴포넌트. → **기존 `StatusBadge`·`ColorChip`·`MiniBars`·`ExecBar`를 거의 그대로 셀에 투입.** IBSheet의 명령형 임피던스(instance 폴링)가 사라진다. **가장 큰 가치.**
2. **CSS변수 Theming + 다크모드 1급 [1차출처]** — Theming API(v33 기본)에 우리 `var(--token)`을 파라미터로 주입 → Tweaks 런타임 변경/다크토글이 캐스케이드로 추종. IBSheet의 테마격리·브리지 문제 해소.
3. **라이선스 [1차출처]** — Community MIT 무료(키 불요). Enterprise도 개발자단위·도메인 바인딩 없음 → **Vercel preview 회전 도메인 문제 원천 부재.** (IBSheet의 운영성 REFUTED 항목이 AG Grid엔 없음)
4. **스파크라인(L10)이 loss→gain** — IBSheet에선 React 반응성 상실이었으나, AG Grid는 ⓐEnterprisenativeⓑCommunity 커스텀 React 셀 둘 다 가능. **기존 `MiniBars`를 무료로 보존.**
5. **클라이언트 Excel/CSV [1차출처]** — CSV 무료·클라이언트 단독, Excel은 Enterprise지만 **서버 불요**. IBSheet의 POI 서버모듈 의존이 없다.
6. **대용량·가상화 무료 [1차출처]** — 행/열 가상화 기본, Infinite Row Model까지 Community.

---

## 4. AG Grid가 '잃는 것 / 마찰점' (과장 없이)

1. **[loss·미해소] 반응형/모바일 카드 재배치 [1차출처]** — 좁은 화면 행→카드 reflow는 native 미지원. **IBSheet와 동일한 한계로, AG Grid도 이건 못 푼다.** responsive-ui 규약 충돌은 그대로. 카드뷰(L6)는 React 병행으로 우회.
2. **[비용] Enterprise 유료벽** — 우리 현행 기능 기준으론 **native 스파크라인·native Excel** 정도만 Enterprise 강제. 단 향후 **행그룹핑·자동집계(aggFunc)·트리·마스터디테일·Set Filter·Server-Side Model**을 쓰면 개발자당 $999. **M2 자동합계를 native로 원하면 Enterprise**(우회: pinned row 수동계산=무료).
3. **[주의] 번들 크기** — AG Grid는 큰 의존성(모듈 트리쉐이킹으로 완화 가능하나 IBSheet 로더 대비 무겁다). `[미검증·정량 미측정]`
4. **[tie] 전역 마스킹** — native 단일토글은 AG Grid도 없음(IBSheet와 동일). 단 valueFormatter 팩토리+refreshCells로 약간 더 깔끔.
5. **[주의] API 세대 차이 [1차출처]** — v32.2~v33에서 API가 크게 바뀜(`checkboxSelection`→`rowSelection` 객체, CSS테마→Theming API, 모듈 등록 `AllCommunityModule`). 예제/블로그가 구·신 혼재 → 최신 기준으로 작성 필요.
6. **[미검증] native dirty-cell 부재** — 변경추적은 이벤트 기반(`cellValueChanged`+`getRowId`). IBSheet의 `getSaveJson`류 턴키 저장 JSON은 없음 → 트랜잭션/이벤트로 직접 구성.

---

## 5. AG Grid vs IBSheet 헤드투헤드

### 5-1. IBSheet 4대 마찰점 — 누가 이기나

| 마찰점 | IBSheet | AG Grid | 승자 |
|---|---|---|---|
| **① 테마(CSS변수+다크+Tweaks 런타임)** | PARTIAL — 런타임전환 되나 토큰 자동추종 불가, 브리지 필요 | **Theming API가 CSS변수 네이티브 + 다크 1급, 토큰 주입 가능** | **🟢 AG Grid** |
| **② 전역 마스킹** | REFUTED — per-column, 전역토글 없음 | 역시 native 없음, 단 formatter+refreshCells로 약간 깔끔 | 🟡 AG Grid(근소) |
| **③ 선언형 React 통합** | PARTIAL/REFUTED — 명령형, props무반응, 폴링 | **완전 선언형, 셀=React컴포넌트, 반응적 props** | **🟢 AG Grid(결정적)** |
| **④ 라이선스(배포환경)** | REFUTED — 도메인바인딩, Vercel preview 불가 | **Community 무료/키불요, Enterprise도 도메인무관** | **🟢 AG Grid(결정적)** |
| (참고) 반응형/모바일 | loss | loss | ⚪ 무승부(둘 다 못함) |
| (참고) native 합계행 자동집계 | 🟢 `FormulaRow` native | pinned수동=무료 / 자동집계=Enterprise | 🔵 IBSheet(근소) |
| (참고) Excel export | 서버모듈(POI) 의존 | Enterprise지만 클라이언트 단독 | 🟢 AG Grid |
| (참고) 도메인 친화(한국 공공 SI 표준) | 🟢 익숙함·레퍼런스 | 상대적으로 생소 | 🔵 IBSheet |

### 5-2. 종합 권고

**APFS의 기술 정체성(React 선언형 · CSS변수 토큰테마 · 다크모드 · Vercel 무백엔드 배포)과의 정합성은 AG Grid가 IBSheet보다 명백히 높다.** IBSheet의 4대 마찰점 중 3개가 AG Grid에서 구조적으로 사라지고, 비용은 **Community($0)** 로 현행 기능 대부분을 덮는다.

- **1순위 권고 — AG Grid Community(무료) 전면 검토.** 현행 리스트·매트릭스·KPI·커스텀셀·테마·CRUD가 거의 전부 Community로 가능. 기존 React 셀 컴포넌트 재사용이라 마이그레이션 비용도 낮다.
- **Enterprise는 "필요해지면"** — native 스파크라인을 원하거나, 자동집계(aggFunc)·행그룹핑·트리·마스터디테일·Set Filter가 실제로 필요해질 때만 개발자당 $999. 그 전까지 우회로(커스텀 React 스파크라인, pinned 수동합계, external filter)로 충분.
- **IBSheet가 더 나은 유일한 시나리오** — (a)팀이 IBSheet에 강하게 숙련됐고 한국 공공 SI 납품 관행상 IBSheet 레퍼런스가 요구되거나, (b)서버집계 기반 대용량 자동합계 매트릭스가 핵심이고 React 통합·Vercel 제약이 없을 때. **본 프로토타입엔 해당 없음.**
- **공통 미해결** — 둘 다 모바일 카드 재배치는 못 한다. 모바일이 1급 요구면 그리드 라이브러리 교체와 무관하게 **카드뷰(React)** 를 따로 유지해야 한다.

### 5-3. frame+children 점진 전략 — AG Grid에서 더 깨끗하다

GridFrame(React 프레임)은 유지하고 `children`만 그리드로 교체하는 전략은 **AG Grid에서 IBSheet보다 매끄럽다.** 이유: AG Grid는 선언형이라 F3 KPI·F5 건수의 "필터된 행 파생"을 `onModelUpdated`/`onFilterChanged` 이벤트 → React state로 받아 프레임이 자연 재렌더한다(IBSheet는 instance 폴링 필요). **첫 PoC 후보:** ⓐ위험 최소 = `asset_funding`(조회전용 매트릭스 M4, KPI 연동 적음), ⓑ가치 최대 = `generic_list`(CRUD+커스텀셀+필터를 한 번에 검증, 기존 React 셀 재사용 효과 확인). AG Grid는 ⓑ도 무리 없다.

---

## 부록 A. Community(무료) vs Enterprise(유료) 경계 — 1차출처 요약

**Community (MIT, 무료, 키 불요):** colDefs/rowData 바인딩, 셀편집(Text/Number/Date/Select/Checkbox 에디터), 단일+**다중 컬럼 정렬**, Text/Number/BigInt/Date 필터·floating filter·Quick Filter·external filter, 클라이언트+**Infinite** Row Model, 페이지네이션, 행선택(rowSelection 객체·checkboxes·headerCheckbox), CRUD(applyTransaction+getRowId+valueSetter), **완전 React 통합·React 셀 렌더러**, 다단 컬럼그룹, pinned 열/상하단행, colSpan+rowSpan(클래식), 행/열 가상화, **Theming API+다크모드**, cellClassRules/cellStyle, valueFormatter, CSV export, 접근성(ARIA).

**Enterprise (유료, 개발자당 $999 / Bundle $1,498, 도메인 바인딩 없음):** Set Filter·Multi Filter·Advanced Filter, Rich Select·Formula 에디터, Server-Side·Viewport Row Model, Cell/Range Selection, **aggFunc 집계·grandTotalRow·행그룹핑(RowGrouping)**, 트리데이터, 마스터/디테일, **자동 셀병합(enableCellSpan/spanRows, v33.1)**, **native 스파크라인(agSparklineCellRenderer)**, **Excel export**(클라이언트 단독·서버불요).

## 부록 B. 버전 의존성 주의 [1차출처]
- Theming API: v32.2 opt-in → **v33.0 기본**(이전엔 CSS 테마파일 import). 최신 v35.3.1.
- `enableCellSpan`/`spanRows`(자동 셀병합): v33.1+. `enableRowPinning`(사용자 행고정): v33.3+.
- 행선택 신 API(`rowSelection` 객체): v32.2+ (구 `checkboxSelection`/`rowSelection:'multiple'` 폐기 경로).
- 모듈 등록: `AllCommunityModule` + `AgGridProvider`(신 모듈 시스템).

## 부록 C. 미검증/잔여 리스크 (적대적 검증 미완 항목)
세션 한도로 아래는 **독립 반증을 거치지 못함** — Research 1차출처엔 부합하나 재확인 권장:
- 번들 크기 정량(트리쉐이킹 후 실측) — `[미검증]`
- 우리 `var(--token)` ↔ AG Grid theme 파라미터 **전 항목 매핑 완전성**(헤더·교차행·필터행 크롬까지 토큰 추종되는지) — `[추론]`
- external filter로 L12 복합식(값AND+태그OR+부분/정확 혼합) 1:1 재현의 실제 코드량 — `[추론]`
- pinned row 스크린리더 한계가 우리 접근성 기준 충족 여부 — `[1차출처·영향 미평가]`
- Excel(Enterprise) 클라이언트 export의 한글/서식 충실도 — `[미검증]`

> 보강 방법: `Workflow({scriptPath: ".../aggrid-feasibility-wf_6fecda14-2b5.js", resumeFromRunId: "wf_6fecda14-2b5"})` — Research/Map은 캐시 재사용, verify 8건+report만 재실행(9:20pm KST 한도 리셋 후).
