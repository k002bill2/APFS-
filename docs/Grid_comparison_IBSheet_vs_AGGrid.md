# 그리드 라이브러리 비교 — 현행(React) vs IBSheet vs AG Grid

> APFS 대시보드 그리드 전략 의사결정용 요약. 상세는 [`IBSheet_feasibility_report.md`](./IBSheet_feasibility_report.md) · [`AGGrid_feasibility_report.md`](./AGGrid_feasibility_report.md) 참조.
> 작성일 2026-06-22 | 근거: 양 라이브러리 공식문서 1차 출처 + 현행 코드 전수조사(기능 47건)

---

## 0. 한 줄 결론

**APFS의 기술 정체성(React 선언형 · CSS변수 토큰테마 · 다크모드 · Vercel 무백엔드 배포)과의 정합성은 AG Grid > 현행 ≫ IBSheet 순이다.** AG Grid Community(무료)가 현행 기능 대부분을 덮으면서 IBSheet의 4대 마찰점 중 3개를 구조적으로 해소한다. IBSheet는 "표 자체"는 강하나 우리 앱 정체성과 정면충돌한다.

---

## 1. 3자 한눈 비교

| 축 | 현행(직접 구현 React) | IBSheet | AG Grid |
|---|---|---|---|
| **비용** | $0 | 💰 유료(비공개 견적, 도메인 바인딩) | **$0 (Community/MIT)** · Enterprise $999/개발자(도메인 무관) |
| **React 통합** | 네이티브(우리 코드) | ❌ 명령형, props 무반응, instance 폴링 | ✅ **완전 선언형, 셀=실제 React 컴포넌트** |
| **테마(CSS변수+다크+Tweaks)** | ✅ 네이티브 토큰 | 🟡 런타임전환 O, 토큰 자동추종 X(브리지) | ✅ **Theming API=CSS변수+다크 1급** |
| **배포(Vercel preview 회전)** | ✅ 무관 | ❌ URL마다 라이선스, 와일드카드 X → 사실상 불가 | ✅ **무관(키 불요)** |
| **다단헤더/매트릭스** | 🟡 수동 colSpan/rowSpan | ✅ native(선언적) | ✅ native(컬럼그룹+colSpan, 무료) |
| **합계행** | 🟡 하드코딩 | ✅ `FormulaRow` 자동집계 native | 🟡 pinned 수동=무료 / 자동집계=Enterprise |
| **인셀편집+변경추적** | ❌ 모달만 | ✅ native + `getSaveJson` 턴키 | 🟡 인셀편집 무료, dirty는 이벤트 기반(턴키 X) |
| **정렬/필터/페이지네이션** | 🟡 직접 구현 | ✅ native | ✅ native(무료, Set Filter만 Enterprise) |
| **스파크라인 셀** | ✅ React `MiniBars` | ❌ React 반응성 상실(Html우회) | ✅ **React 컴포넌트 그대로(무료)** / native는 Enterprise |
| **커스텀 셀(배지·칩·진행바)** | ✅ React | 🟡 Html문자열+토큰 브리징 | ✅ **기존 React 컴포넌트 재사용** |
| **Excel 내보내기** | ❌ stub | 🟡 native지만 서버모듈(POI) 의존 | 🟡 Enterprise지만 **클라이언트 단독(서버 불요)** · CSV는 무료 |
| **대용량/가상화** | ❌ 전체 렌더 | ✅ 페이징 전략 | ✅ **행/열 가상화+Infinite 무료** |
| **반응형/모바일 카드 재배치** | 🟡 부분(반응형 규약 보유) | ❌ 불가 | ❌ 불가(동일 한계) |
| **번들 크기** | ✅ 가벼움 | 🟡 로더 | 🟡 큼(트리쉐이킹 완화, 미측정) |
| **한국 공공 SI 친숙도** | — | ✅ 업계 표준 레퍼런스 | 🔵 상대적 생소 |

범례: ✅ 강점/native · 🟡 가능하나 제약/우회 · ❌ 불가/심각마찰 · 🔵 맥락의존

---

## 2. IBSheet 4대 마찰점 — AG Grid는 푸는가

| 마찰점 | IBSheet 판정 | AG Grid | 승자 |
|---|---|---|---|
| ① 테마(CSS변수+다크+Tweaks 런타임) | PARTIAL(브리지 필요) | **confirmed**: `withParams`가 var() 리터럴 주입 → Tweaks 런타임 편집 **자동추종**(theme 재생성 불요), 다크 1급. 전제 v33+ | 🟢 **AG Grid** |
| ② 전역 마스킹(`mask.tsx _on`) | REFUTED(per-column) | 역시 native 없음, formatter+refreshCells로 근소 우위 | 🟡 AG Grid(근소) |
| ③ 선언형 React 통합 | PARTIAL/REFUTED(명령형 폴링) | 완전 선언형, 반응적 props, React 셀 | 🟢 **AG Grid(결정적)** |
| ④ 라이선스(배포 환경) | REFUTED(도메인 바인딩→Vercel 불가) | Community 무료/키불요, Enterprise도 도메인 무관 | 🟢 **AG Grid(결정적)** |
| (참고) 반응형/모바일 | loss | loss | ⚪ 무승부(둘 다 못함) |
| (참고) 합계행 자동집계 | 🟢 native | pinned수동=무료 / 자동=Enterprise | 🔵 IBSheet(근소) |

**요지: AG Grid가 4개 중 3개(테마·React통합·라이선스)를 구조적으로 해소. IBSheet가 앞서는 건 자동집계 합계행 native와 한국 SI 친숙도뿐.**

---

## 3. 비용 비교

| | 현행 | IBSheet | AG Grid Community | AG Grid Enterprise |
|---|---|---|---|---|
| 라이선스 비용 | $0 | 비공개(영업견적) | **$0** | $999/개발자(영구·1년업뎃), Bundle $1,498 |
| 과금 단위 | — | 도메인/IP/포트 | — | 개발자당 + 배포(deployment) |
| 도메인 바인딩 | 없음 | **있음(URL마다)** | 없음 | **없음** |
| Vercel preview | OK | ❌ 사실상 불가 | OK | OK |
| 무엇이 유료벽인가 | — | (전 기능 유료) | — | 자동집계·행그룹핑·트리·마스터디테일·Set Filter·native 스파크라인·Excel·Server-Side |

**현행 기능 기준 AG Grid에서 Enterprise를 강제하는 건 사실상 native 스파크라인 + native Excel 둘뿐 — 둘 다 Community 우회로 존재(커스텀 React 스파크라인 / CSV·클라이언트 xlsx).**

---

## 4. 언제 무엇을 선택하나

- **현행 유지** — 그리드가 지금 규모(수십~수백 행, 화면완결 프로토타입)에 충분하고, 외부 의존성/번들을 늘리고 싶지 않을 때. 단 정렬·필터·대용량·Excel·인셀편집을 손수 키우는 비용은 계속 우리 몫.
- **AG Grid (권고 1순위)** — React 선언형·토큰테마·다크·Vercel 무백엔드라는 우리 정체성을 지키면서 그리드 역량(정렬/필터/가상화/다단헤더/인셀편집)을 native로 얻고 싶을 때. **Community($0)로 대부분 가능, 기존 React 셀 재사용**으로 이전 비용도 낮음.
- **IBSheet** — (a)팀이 IBSheet에 숙련됐고 한국 공공 SI 납품 관행상 레퍼런스가 요구되거나, (b)서버집계 기반 대용량 자동합계 매트릭스가 핵심이고 React 통합·Vercel 제약이 없을 때. **본 프로토타입엔 해당 없음.**

---

## 5. 권고

1. **1순위: AG Grid Community($0) 전면 검토.** 정합성·비용·마이그레이션 비용 모두 우위.
2. **Enterprise는 "필요해지면"** — 자동집계·행그룹핑·트리·native 스파크라인이 실제로 필요할 때만 개발자당 $999.
3. **공통 미해결(모바일)** — 어느 그리드를 택하든 모바일 카드 재배치는 못 한다. 모바일 1급 요구 시 **React 카드뷰를 별도 유지**(그리드 선택과 무관).
4. **점진 전략(frame+children)** — GridFrame(React)은 유지하고 `children`만 교체. **AG Grid가 IBSheet보다 깨끗**(선언형이라 KPI·건수 동기화가 이벤트→React state로 자연스러움). 첫 PoC: `asset_funding`(위험 최소·조회전용) 또는 `generic_list`(가치 최대·React 셀 재사용 검증).

---

## 6. 신뢰도 고지 (방법론) — 양쪽 검증 완료(대칭)

| 리포트 | Research(1차출처) | 적대적 재검증(반증 시도) | 결과 |
|---|---|---|---|
| IBSheet | ✅ 완료 | ✅ **완료(8건)** | partial 6 / refuted 2(전역마스킹·preview운영) |
| AG Grid | ✅ 완료 | ✅ **완료(8건, resume로 완주)** | **confirmed 4 / partial 4 / refuted 0** |

**두 리포트의 신뢰도는 이제 대칭**이다 — 양쪽 모두 공식문서 1차 출처 + "회의적 검토관 8명 반증 시도"를 거쳤다. 핵심 결과:
- **AG Grid 자체엔 refuted 0건.** confirmed 4건이 도입의 핵심 이득을 굳혔다 — **X2 테마(var() 런타임 자동추종, 원안의 risk:high가 gain으로 반전)**, L10 스파크라인(Community 무료), L11/L12 외부필터(Community), 멀티컬럼 정렬(Community).
- partial 4건은 "되지만 전제가 있다"는 정직한 단서 — M2 합계행(앱 사전계산 전제), 라이선스(도입 PR에서 Enterprise import 감사), X1 마스킹(`mask.tsx _on` const→가변 리팩터+force refresh), X3 반응형(우회는 카드 측 UI 재구현, IBSheet도 불가라 tie).
- IBSheet의 'REFUTED' 2건(전역 마스킹 native 부재, Vercel preview 도메인 운영 불가)은 그대로 확정.

> 상세 검증 8건은 [`AGGrid_feasibility_report.md` 부록 D](./AGGrid_feasibility_report.md) 및 [`IBSheet_feasibility_report.md` 부록 A](./IBSheet_feasibility_report.md) 참조.

---

## 7. 웹표준성 · 웹접근성 · 웹취약점 비교 (공공 관점)

> ⚠️ **전제: "웹접근성 품질인증"은 웹사이트 단위 인증**이라 그리드 라이브러리(컴포넌트/모듈)는 받을 수 없다([wa.or.kr 약관](http://wa.or.kr/m4/provision.asp) — "웹 페이지로 구현된 모듈·웹 애플리케이션 등 웹 솔루션 접수 불가"). **APFS 최종 사이트의 KWCAG 인증은 어느 라이브러리를 쓰든 통합 단계에서 직접 확보**해야 한다. 라이브러리는 "그 인증을 깨지 않을 역량"만 제공한다.

| 축 | AG Grid (오픈소스, v35.3.1) | IBSheet (상용, 폐쇄소스) |
|---|---|---|
| **웹표준성** | div 그리드 + `role="grid"` ARIA(네이티브 `<table>` 아님), W3C 표준 접근. **오픈소스라 생성 마크업 직접 검증 가능** | "순수 스크립트·HTML5·웹표준·크로스브라우저"(벤더 명시). 폐쇄소스라 **구매 전 마크업 독립 검증 불가** |
| **웹접근성** | WCAG/ARIA·키보드·스크린리더 **문서화** + ARIA 라벨 커스터마이즈. **명시된 한계: 고정행/열 스크린리더 탐색 불가**(DOM 분리) | **SA(소프트웨어접근성) 인증** 주장 + 웹표준 JS. **웹용 KWCAG 레벨·스크린리더 세부는 비공개(불투명)**. 국내 공공 납품 실적 = 실무 심사 통과 경험 |
| **웹취약점** | **CVE 공개 추적**(예: CVE-2024-38996 prototype pollution ≤31.3.4, 패치됨·EPSS 0.05%). `npm audit`/Snyk 감사 가능. React 셀렌더러=**자동 이스케이프(XSS 안전)**. ↔ 공개 공격면·npm 공급망 노출 | **공개 CVE 추적 없음**(폐쇄 바이너리 → "CVE 없음 ≠ 안전", 독립 감사 불가). 벤더 관리 + 국내 보안성 검토 경험. 라이선스 배포=공급망 통제. `Type:'Html'` 셀=**원시 주입 → 수동 sanitize 필요** |

### 7-1. 웹표준성 — 사실상 동등 ("표 흉내" + ARIA)
둘 다 네이티브 시맨틱 `<table>`이 아니라 JS로 div 그리드를 그리고 `role="grid"`로 표 의미를 부여한다. "순수 HTML 시맨틱"을 엄격히 보면 둘 다 100%는 아니고 ARIA로 보완하는 **동일 접근**. 차이는 **검증 가능성** — AG Grid는 오픈소스라 DOM을 즉시 검사 가능, IBSheet는 폐쇄라 벤더 주장 의존.

### 7-2. 웹접근성 — AG Grid 투명 / IBSheet 공공 친화
- **AG Grid**: WCAG 정렬 ARIA·키보드·스크린리더를 문서화하고 **자기 한계(고정행/열 스크린리더 불가)까지 공개** — 검토에 유리.
- **IBSheet**: **SA(소프트웨어접근성) 인증**은 웹 KWCAG 품질인증과 **다른 제도**. 웹 세부는 비공개지만 **국내 공공 다수 납품 = 실제 웹접근성 심사 통과 트랙레코드**라는 실무 신호가 강함.
- **공통**: 최종 사이트 KWCAG 인증 자동 보장 없음 → 통합 시 NVDA·키보드 직접 테스트 필수.

### 7-3. 웹취약점 — "투명/감사가능" vs "불투명/벤더관리"
- **AG Grid**: 취약점이 공개 CVE로 추적·`npm audit` 자체 감사 가능, **현 v35.3.1은 알려진 CVE 이후 버전**. React 셀렌더러 자동 이스케이프로 셀 XSS 기본 안전.
- **IBSheet**: 공개 CVE 트레일 없음 → **"알려진 취약점 없음 ≠ 안전"**, 독립 감사 불가·벤더 의존. 단 npm 공급망 공격면 없음. `Type:'Html'` 셀에 외부 데이터 시 **수동 sanitize 안 하면 XSS**.

### 7-4. 공공(APFS) 권고
- **KWCAG 인증이 계약 요건**이면: 어느 쪽도 자동 보장 안 됨 → **PoC에서 NVDA·키보드 검사 필수**. AG Grid는 한계가 공개돼 회피 설계 가능, IBSheet는 벤더에 **KWCAG 적합성 확인서** 요청.
- **보안성 검토(행안부 SW개발보안) 대비**: AG Grid는 `npm audit`+버전핀으로 근거 제출 용이, IBSheet는 **벤더 보안성 확인서/취약점 점검 결과** 필요(폐쇄소스라 자체 점검 불가).
- 셀에 외부/사용자 데이터를 HTML로 넣을 땐 **둘 다 sanitize**, 단 AG Grid React 렌더러가 기본 안전판.

**한 줄 요약: 세 축 모두 진짜 변수는 "투명성(AG Grid, 자체 검증·감사 가능) vs 벤더 의존(IBSheet, 국산 인증·납품실적 보증)"이다.** 공공 보안성 검토엔 감사가능성이, 형식 요건·관행엔 국산 인증·실적이 강점.

> **검증 한계**: IBSheet 웹접근성/보안 세부는 폐쇄소스라 공식 문서 확인 범위가 제한적(불투명 자체가 비교 포인트). 공식 결정 문서로 승격 시 벤더 확인서(KWCAG 적합성·보안 점검) 수령 + 적대적 재검증 권장.
> **출처**: [AG Grid Accessibility](https://www.ag-grid.com/react-data-grid/accessibility/) · [AG Grid CVE(CVEdetails)](https://www.cvedetails.com/product/46941/Ag-grid-Ag-grid.html) · [CVE-2024-38996(Snyk)](https://security.snyk.io/package/npm/ag-grid-community) · [IBSheet 주요기능](http://www.ibleaders.co.kr/solution/ibsheet?t=2) · [웹접근성 품질인증 약관](http://wa.or.kr/m4/provision.asp) · [KWCAG 2.2](https://a11ykr.github.io/kwcag22/)
