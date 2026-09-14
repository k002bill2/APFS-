# P7 — 자펀드수탁관리(실물검증)  (S1_26)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_26_자펀드수탁관리_실물검증_.html`
메뉴 리프 라벨 `자펀드수탁관리(실물검증)` · path `custody-verify` · crumbs `['홈','투자자산관리','자펀드 관리','자펀드수탁관리(실물검증)']`
산출 파일: `src/dash/custody_verify_manage.tsx`(`export function CustodyVerifyManage`), `src/dash/custody_verify_memo_modal.tsx`(`export function CustodyMemoModal`)
트랙: typed — **GridFrame 하나 안에 섹션 3개(각 2단 헤더 AG Grid)** + 메모 등록 팝업. 등록·행 선택·페이지네이션 없음(푸터는 건수 요약 + download/external만, `footerCenter` 없음, `showAll` 없음).

## 데이터 (목업 값 그대로)
```ts
export interface VerifyMemo { date:string; content:string }   // 작성이력
export interface InvestAssetRow { id:string; no:number; fn:string; gpCorp:string; gpShares:number|null; gpPrin:number; gpImpair:number; gpBal:number; cuCorp:string; cuShares:number|null; cuBal:number; matchShares:'일치'|'불일치'|'-'; matchBal:'일치'|'불일치'|'-'; memos:VerifyMemo[] }
// 1행: fn '유니 수산식품 투자조합1호', gpCorp '(주)남양 f&b', gpShares null('-'), gpPrin 2_500_000_000, gpImpair 2_500_000_000, gpBal 0, cuCorp '주식회사남양에프앤비무보증사모전환사채', cuShares null, cuBal 2_500_000_000, matchShares '-', matchBal '불일치', memos []
export interface NonInvestTradeRow { id; no; fn; gpItem; gpShares; gpBal; cuItem; cuShares; cuBal; matchShares; matchBal; memos }   // 0행
export interface NonInvestRow { id; no; fn; gpAcct; gpBal; cuAcct; cuBal; matchBal; memos }                                          // 0행
```
메모 컬럼(날짜·내용)은 `memos[0]`(최신) 표시, 없으면 '-'. 메모 저장 시 해당 행 `memos` 선두에 추가(불변).

## 섹션 골격 (children 안에 세로 3개)
각 섹션: 헤더 행 `<div className="flex items-center gap-2 flex-wrap" style={{ padding:'12px 18px', borderTop:'1px solid var(--border)' }}>` + 번호 칩(`ColorChip` 대신 `<span>`에 primary soft 배경 12px bold `1`/`2`/`3`) + `<h4 className="font-bold m-0" style={{fontSize:15}}>투자자산</h4>` + 캡션 `운용사 장부 ↔ 수탁기관 보관내역 대사`(12.5px caption; 2: `종목·보유주수·잔액 대사`, 3: `계좌번호·잔액 대사`). 그 아래 `<AgGridReact>`(domLayout autoHeight, **행 0개 섹션은 `overlayNoRowsTemplate` '조회된 데이터가 없습니다.'** — 그리드가 높이 0으로 접히면 래퍼 `style={{ minHeight: 120 }}` 또는 `UI.EmptyState`로 대체, 판단 근거를 주석).
### 섹션1 투자자산 컬럼(2단): No · 자펀드(MT) · 그룹 **운용사**[투자기업(MT)·보유주수(num, null='-')·원금(A)·감액금액(B)·잔액(A-B)] · 그룹 **수탁기관**[투자기업(MT)·보유주수·잔액] · 그룹 **일치여부**[보유주수·잔액](StatusBadge: 일치=`success`, 불일치=`danger`, '-'=muted 텍스트) · 그룹 **메모**[날짜(mn)·내용(MT)·등록(`Button outline sm "메모"` → 팝업)]. `AUTO_SIZE_CONTENT`.
### 섹션2 미투자자산 거래: No · 자펀드 · 운용사[종목·보유주수·잔액] · 수탁기관[종목·보유주수·잔액] · 일치여부[보유주수·잔액] · 메모[날짜·내용·등록].
### 섹션3 미투자자산: No · 자펀드 · 운용사[계좌번호·잔액] · 수탁기관[계좌번호·잔액] · `일치여부 잔액`(단일 컬럼, headerName `일치여부(잔액)`) · 메모[날짜·내용·등록].
그리드 3개는 각각 `apiRef` 없이도 됨(필터는 React 쪽: `fFund`로 세 배열을 각각 filter). 컬럼 정의는 모듈 상수 3개(콜백은 `useMemo`로 openMemo 주입).

## 검색박스 → 드로어 (목업 2항목 + 엑셀은 kebab)
1. 자펀드 — `DrawerSelect`(세 섹션 행 파생) + 마커 `{ rec:'조회 UX상 자펀드·기준일 필터 제공', dat:'원문에 [검색] 영역 없음 — 섹션 그리드만 정의됨(조회조건은 추론)' }` — 실제 필터(fn)
2. 기준일 — `PeriodPicker day`(plain, ariaLabel '기준일') **noop**, 기본 `'2026-04-30'`(목업 실데이터 기준일 — 메모 팝업 기준일자 시드로 쓰이므로 예외적으로 유지, 주석).
툴바 좌: `Icon filter` + 적용 칩(자펀드 MT). 툴바 우: `단위: 원` · 상세필터 · 새로고침 · kebab. 푸터 좌: `투자자산 {mn(n1)}건 · 미투자자산 거래 {mn(n2)}건 · 미투자자산 {mn(n3)}건`.

## 메모 등록 팝업 (`custody_verify_memo_modal.tsx`) — `CustodyMemoModal({ ctx:{ fund, gubun, corp }, history: VerifyMemo[], baseDate: string, onSave:(m:VerifyMemo)=>void, onClose })`
Dialog `max-w-[640px]`, 제목 `자펀드실물검증 메모 등록`. 본문 `p-[46px]`: Section **검증 대상** KvGrid(조합명 MT·구분·투자기업 MT — 섹션2는 종목, 섹션3은 계좌번호를 `corp`로 넘김) · Section **작성이력** 표(기준일자·메모; 비면 `작성 이력이 없습니다.` 1행) · Section **메모 입력**: `SchemaField` date `기준일자 *`(초기값 baseDate) + textarea `내용 *`(placeholder 없이 라벨로 명명). 필수 미입력 → errMsg + 저장 차단. 푸터 `닫기`·`저장` → `onSave({date, content})` + toast `저장되었습니다 (목업)`. 저장 후 그리드 메모 날짜/내용 갱신 확인.

## 엑셀: 워크북 시트 3개(`투자자산`·`미투자자산 거래`·`미투자자산`), 각 2단 헤더 `flattenForExcel` + 행(메모 등록 액션 컬럼 제외), 마스크 게이트, 파일명 `자펀드수탁관리(실물검증).xlsx`.
## ⚠검토필요 마커 1건: 자펀드(드로어)
## 한계 주석: 섹션2·3 원문 샘플 없음(빈 상태) · 조회조건 추론 · 단위 토글 미적용(편집 팝업 있는 관리화면) · 메모는 로컬 state
