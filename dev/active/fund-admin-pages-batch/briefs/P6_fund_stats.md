# P6 — 종합통계  (S1_25)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_25_종합통계.html`
메뉴 리프 라벨 `종합통계` · path `fund-stats` · crumbs `['홈','투자자산관리','자펀드 관리','종합통계']`
산출 파일: `src/dash/fund_stats.tsx`(`export function FundStats`) — RAW 137행이 커서 데이터를 `src/dash/fund_stats_data.ts`(`export const RAW`, `SUBTOTALS`, `GRAND`)로 분리해도 좋다(둘 다 산출 파일).
트랙: typed 읽기전용 통계 — 2단 헤더 33열, **연도별 소계 행 인라인 + 총계 pinned**, 단위 토글(기본 억원), 검토필요 마커 4건. 등록·행 선택 없음.

## 데이터 (목업 RAW 137행·SUBTOTALS 16개·GRAND 값 그대로 — 한 자리도 바꾸지 말 것)
행 = `[no,y,field,fund,form,gov,af,naf,duty,under,afinv,nafinv,recPrin,recProf]`(억원). 파생(목업 calc): 민간=form−gov · 민간비율=민간/form×100 · 소계(건수)=af+naf · 투자금액 총계=afinv+nafinv · 농식품 투자금액대비=afinv/총계×100 · 결성액대비=afinv/form×100 · 비농식품 동일 · 결성액대비 총투자율=총계/form×100 · 회수총액=recPrin+recProf. 비율 표시 `pctN`: 소수 1자리 + ' %'(null/NaN='-'). 소계 행은 **SUBTOTALS 값 그대로**(재계산 아님) + 같은 파생, 총계는 GRAND.
표시행 = `useMemo`: 연도 오름차순으로 `[...그 해 행들(kind:'row'), 소계(kind:'subtotal', id 'sub-2011')]` 반복; 총계 = pinned. **정렬 금지**(모든 컬럼 `sortable:false` — 소계 순서 의미) . `getRowStyle` subtotal → `{ background:'var(--muted)', fontWeight:700 }`.

## 컬럼 (목업 순서, 2단) — `AUTO_SIZE_CONTENT`
NO(pinned) · **연도**(pinned; `headerValueGetter: (p) => p.context?.yearBasis === '선정' ? '선정연도' : '결성연도'` — 동적 headerName으로 컬럼 재생성하지 말 것; 연도기준 변경 시 `apiRef.current?.refreshHeader()`; 소계 행엔 `'2011 소계'`처럼 `${y} 소계` 표시, 총계 `'총 계'`) · 분야(center MT) · 조합(MT, maxWidth 320) · 결성액·정부·민간(money) · 민간비율(pct) · 그룹 **투자건수(개)**[농식품·비농식품·소계·의무투자·규모이하] · 그룹 **농식품**[투자금액·투자금액 대비·결성액 대비] · 그룹 **비농식품**[동일 3] · 그룹 **총계**[투자금액·결성액대비 총투자율] · 그룹 **회수실적**[회수원금·회수수익·회수총액·**감액금액**(헤더 마커)] · **출자사업연도**(헤더 마커) · 결성일 · 등록일 · 기준일 · 경과년(등록일~기준일) · 그룹 **투자승수**[농식품·비농식품·전체].
- 출자사업연도·결성일·등록일·기준일·경과년·투자승수 3·감액금액은 **전 행 '-'**(목업 rowHtml 그대로 — 1행 예시도 코드상 '-').
- 헤더 마커(모듈 스코프 `reviewInnerHeader` + `suppressHeaderKeyboardEvent` Tab): 출자사업연도 `{ rec:'원문 그대로 표시', dat:"사용자 제공 참고 화면 캡처가 이 열부터 오른쪽(출자사업연도~투자승수)은 화면 폭 밖이라 안 보임 — 1행(예시)만 있던 기존 값 유지, 나머지 136행은 확인 전까지 '-' 표시" }` · 감액금액 `{ rec:'원문 그대로 표시', dat:"참고 화면 캡처에서 감액금액 열도 화면 폭 밖이라 값 미확인 — 1행(예시) 제외 나머지는 '-' 표시" }`.
- 경과년 헤더의 `(등록일~기준일)` 보조 줄은 headerName `경과년(등록일~기준일)`로.

## 단위 (`Unit`, 기본 **억원**; 데이터는 억원 저장) — 목업 fmt: 억원=`n.toLocaleString(undefined,{maximumFractionDigits:2})`, 백만원=`fmt(n*100)`, 원=`fmt(n*1e8)`; `mn()`. 툴바 우측 `단위: {unit}` 캡션 + **`<ReviewMarker rec="원·백만원·억원 (표준 단위전환 토글)" dat="CDTP:BU · 실값 '억원' · 그 외 옵션 미확인" label="금액단위" />`**(캡션 바로 옆) + SegTabs. 그리드 `context={{ unit, yearBasis }}` + unit 변경 refreshCells.

## 검색박스 → 필터 (목업 순서)
모펀드(noop) · 계정구분(`DrawerSelect ['농식품','수산']` noop) · **연도기준 — 툴바 주 필터 FilterChip**(결성연도·선정연도, '전체' 없음, 기본 결성연도; 드로어 `DrawerSelect`와 state 공유, 드로어 라벨 마커 `{ rec:'결성연도·선정연도 (조회기준 → 연도 컬럼 의미 변경)', dat:"실값 '결성연도'만 확인 · '선정연도'는 §2.4 동적관계 근거 추론" }`) — 값 변경 시 헤더 라벨만 바뀐다(데이터 동일, 주석) · 데이터기준(`DrawerSelect ['운용사보고','월말확정']` noop) · 기준일자(`PeriodPicker day` noop, 기본 ''). 적용 칩 없음(전부 noop/헤더 전환).
푸터 좌: `총 {mn(137)}개 중 …`(소계 행은 건수에서 제외 — `rows.length`, 표시행 아님). 페이지네이션 PAGE_SIZE 20(표시행 기준이라 소계 포함 153행 → 8페이지 — 허용).
## 엑셀: 2단 헤더(`flattenForExcel`) + 표시행(행+소계) + 총계, 금액은 선택 단위 숫자 셀, 비율은 문자열 그대로, '-'는 ''. 파일명 `종합통계_${unit}.xlsx`. 마스크 게이트.
## ⚠검토필요 마커 4건 전수: 연도기준(드로어) · 금액단위(툴바) · 출자사업연도(헤더) · 감액금액(헤더)
## 한계 주석: 필터 4종 noop · 선정연도 전환은 라벨만 · 출자사업연도~투자승수·감액금액 미확인('-') · 소계는 원문 값(재계산 아님)
