# P5 — 투자실적 현황(자펀드)  (S1_24)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_24_투자실적_현황_자펀드_.html`
메뉴 리프 라벨 `투자실적 현황(자펀드)` · path `fund-invest-status` · crumbs `['홈','투자자산관리','자펀드 관리','투자실적 현황(자펀드)']`
산출 파일: `src/dash/fund_invest_status.tsx`(`export function FundInvestStatus`)
트랙: typed **읽기전용 통계**(매트릭스). 등록·행 선택·페이지네이션 필요 없음(행 ≤ 17이지만 골드 푸터/페이저 골격은 유지: PAGE_SIZE 20). 골드: asset_funding(좁은 매트릭스 flex 컬럼·단위 토글·KpiBadge **제외**), subfund_manage(ColGroupDef), fund_cash_forecast(단위 엑셀).

## 뷰 전환 — 투자실적구분 (`type View = '경영형태별'|'분야별'|'산업별'|'연도별'`, 기본 경영형태별)
그리드 구성이 뷰마다 다르다 → `columnDefs`·`rowData`·`pinnedBottomRowData`를 `useMemo([view, …])`로 만들고 **`<AgGridReact key={view} …/>`로 뷰 전환 시 리마운트**(autoSizeStrategy는 최초 렌더 1회만 적용되는 함정 회피). 툴바 좌 = **FilterChip 4개**(경영형태별·분야별·산업별·연도별, 단일 선택 = view) + 적용 칩. 목록바 캡션 `투자실적 현황 · {view}`는 카드 제목이 이미 있으므로 툴바 좌 chips 앞 `Icon layers` 정도로 대체(캡션 문구는 넣지 않음).

### 크로스탭 3뷰 (목업 VIEWS·crossTable 로직 그대로)
- 컬럼: `구분`(pinned left, 120, 값 `투자건수`/`투자금액`, 첫 행뿐 아니라 **행마다 표시** — rowspan 미재현, 주석) · `연도`(center) · 그룹들(`ColGroupDef` marryChildren; `solo` 그룹은 그룹 없이 리프 1개; `total` 그룹 `합계`는 strong) — 경영형태별: 조합법인[영농조합·영어조합]·회사법인[농업회사·어업회사]·일반기업·개인 및 기타·미입력·합계 / 분야별: 의무투자분야(60%)[농림축산·수산·식품·비농업]·기타(40%)·미입력·합계 / 산업별: 농림업[농업·관련산업]·축산업[축산업·관련산업]·수산업[수산업·관련산업]·식품산업[식품산업·관련산업]·비농업·미입력·합계. ⚠ 동명 리프(`관련산업` ×4)는 `field` 키를 `c0..cN` 인덱스로 부여(headerName만 중복).
- 행: metric(투자건수→투자금액) × years [2011,2012,2013]; counts = `Math.round(cfg.c11[i] * mult[y])`(mult 2011:1, 2012:1.08, 2013:1.15); 투자금액 = counts × 320,000,000(원, AMTU); 합계 = 행 합. 투자건수 행은 `fmt` 정수(단위 무관), 투자금액 행은 단위 환산. → 셀 포매터는 `p.data.metric`으로 분기. 구분 셀 라벨에 `(건)`/`(단위)` 보조 표기는 캡션으로 `투자건수 (건)` 처럼 붙여도 됨.
- 폭: 컬럼 합 < 프레임 → autoSizeStrategy **없이** 리프 컬럼 `flex:1, minWidth:92`(asset_funding numCol 동형). 합계행(tfoot) 없음(목업 없음) → pinned 없음.
### 연도별 뷰 (목업 YEARDATA 17행 + YEARTOTAL 값 그대로, 3단 헤더)
- 컬럼: `구분`(pinned, `${y}년`, pinned 합계행엔 `'합 계'`) · 그룹 **자펀드 결성현황**[ 하위그룹 투자분야별[합계·농림축산업·식품산업·농림축산식품산업·수산업·특수목적] · 펀드형태별[합계·농식품펀드·사모펀드(PEF)] · 연도별[펀드수·결성금액] · 누적[펀드수·결성금액] ] · 그룹 **투자실적**[ 연도별[투자건수·투자금액] · 누적[투자건수·투자금액] ] · 그룹 **자펀드 조성금액**[ 조성금액[합계·모태펀드·민간] · 운용사(GP)별 조성현황[합계·창투사·신기사·기타] ]. `ColGroupDef.children`에 다시 `ColGroupDef`(3단, 모두 marryChildren). 건수 컬럼은 `fmt`, 금액 컬럼(fAmt·fCumAmt·iAmt·iCumAmt·rTot·rMo·rMi·gTot·gCh·gSg·gEt)은 단위 환산.
- pinned 합계행: YEARTOTAL 값(누적 4칸은 null → '-').
- 폭: 24열 → `AUTO_SIZE_CONTENT`.
### 단위 (`Unit`, 기본 **억원**) — 툴바 우측 `단위: {unit}` + SegTabs. 환산(목업 fmtAmt): 원=`fmt(Math.round(v))`, 백만원=`fmt(Math.round(v/1e6))`, 억원=`(v/1e8).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})`, `mn()`. 그리드 `context={{unit}}` + refreshCells.

## 검색박스 → 드로어 (목업 순서; 전부 noop — 표시값을 바꾸는 항목은 투자실적구분뿐)
모펀드(select noop) · 계정구분(`DrawerSelect ['농식품','수산']` noop) · 연도기준(`DrawerSelect ['출자사업연도','결성연도','등록연도']` noop) · 투자실적구분(`DrawerSelect` 4뷰 — 툴바 chips와 state 공유, '전체' 옵션 없이 항상 하나) · 데이터기준(`DrawerSelect ['운용사보고','월말확정']` noop) · 기준일자(`PeriodPicker day` noop, 기본 '' — 목업 2026-07-31 미적용). 초기화 버튼은 뷰를 경영형태별로. 적용 칩 없음(noop 항목은 칩 생성 안 함).
## 엑셀: 현재 뷰 기준. 다단 헤더는 `flattenForExcel`을 **재귀**로 일반화(깊이 N → 헤더 N행 + 세로/가로 병합) — 연도별 3단, 크로스탭 2단. 금액은 선택 단위 숫자 셀. 파일명 `투자실적 현황(자펀드)_${view}_${unit}.xlsx`. 마스크 게이트.
## ⚠검토필요 마커 0건(목업 없음).
## 한계 주석: 필터 5종 noop(원문 조회 동작 미정의) · 크로스탭 수치는 목업 도메인 정합 샘플(2011 실값 기반 배수) · 연도별 원문 불일치(2019 8건 vs 6건, ±1 반올림)는 그대로 · rowspan 미재현
