# P8 — 자펀드수탁관리(확정)  (S1_27)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_27_자펀드수탁관리_확정_.html`
메뉴 리프 라벨 `자펀드수탁관리(확정)` · path `custody-confirm` · crumbs `['홈','투자자산관리','자펀드 관리','자펀드수탁관리(확정)']`
산출 파일: `src/dash/custody_confirm_manage.tsx`(`export function CustodyConfirmManage`, `export interface CustodyConfirmRow`), `src/dash/custody_confirm_detail_modal.tsx`(`export function CustodyConfirmDetailModal`)
트랙: typed 조회+확정 — **3단 헤더**(일치여부 → 투자자산/미투자자산 거래/미투자자산 → 리프) + 셀 안 확정여부 select + 상세보기 링크 → 읽기전용 상세 팝업. 등록·행 선택 없음. 골드: general_meeting(SelectCell·LinkCell·상세 모달), subfund_manage(ColGroupDef).

## 데이터 (목업 DATA 24행 값 그대로)
```ts
export interface CustodyConfirmRow { id:string; no:number; gp:string; fn:string; invShares:Mark; invBal:Mark; ntShares:Mark; ntBal:Mark; niBal:Mark; status:'일치'|'불일치'; confirm:'확정'|'미확정' }
type Mark = 'O'|'X'|'-';
```
## 컬럼 — autoSizeStrategy **없이** 고정폭 + 텍스트 2열 `flex:1,minWidth`(11 리프가 프레임에 들어가는 좁은 표: 우측 빈 공간 제거)
No(pinned 68) · 운용사(MT, `flex:1, minWidth:170`) · 자펀드(MT, `flex:1, minWidth:220`) · 그룹 **일치여부**[ 하위그룹 **투자자산**[보유주수·잔액] · **미투자자산 거래**[보유주수·잔액] · **미투자자산**[잔액] ](마크 배지: O=`StatusBadge success 'O'`, X=`danger 'X'`, '-'=회색 칩 `bg-muted text-muted-foreground` 13px bold, 전부 `dot={false}`, center 100~110) · **상세보기**(`LinkCell` 텍스트 = status; 불일치는 `var(--danger-text)` 색, 일치는 primary — 클릭/Enter → 상세 팝업, 120) · **확정여부**(`SelectCell` 확정/미확정, `aria-label="${no}행 확정여부"`, `suppressKeyboardEvent`, Enter → select focus, 120). 정렬 허용.
행 상태 `rows`(confirm 변경은 `patchRow` 불변).

## 검색박스 → 필터
목업 검색조건은 **기준일자 단일**(필수) → 드로어 1항목 `기준일자`(`PeriodPicker day`, plain, ariaLabel '기준일자') — 행 필터가 아니라 **조회 기준 컨텍스트**라 noop 캡션 대신 값 유지: 기본 `'2026-07-31'`(실 캡처 기준일 — 상세 팝업 부제에 표시되므로 유지, 주석). 툴바 좌 **주 필터 FilterChip `확정여부`**(전체·확정·미확정 — 행 `confirm` 파생, 드로어 select 공유; 목업엔 없는 파생 칩임을 주석: 수시보고 '확인상태' 파생 칩 관례). 툴바 우: 상세필터 · 새로고침 · kebab(단위 캡션 없음 — 금액 컬럼 없음).
`passes`: confirm만. 적용 칩: 기준일자(mn — 기본값이 있어 항상 표시되면 시끄러우니 **기본값과 같으면 칩 생략**).

## 상세 팝업 (`custody_confirm_detail_modal.tsx`) — `CustodyConfirmDetailModal({ row, baseDate, onClose })`
Dialog `max-w-[1000px] max-h-[88vh]`. 헤더: 제목 `자펀드수탁관리(확정) 상세` + 부제(`DialogDescription`) `<MT>{gp}</MT> · <MT>{fn}</MT> · 기준일자 {mn(baseDate)}` + 바로 옆 `<ReviewMarker rec="선택 자펀드별 대사 상세(투자기업·보유주수·원금·감액금액 등)" dat="화면 캡처엔 요약 그리드까지만 있고 상세 팝업 데이터는 없음 — 아래 3개 섹션은 원 구조도(엑셀) 상세 예시 1건을 그대로 표시, 이 자펀드 고유 값 아님" label="대사 상세" />`. 본문 `p-[46px]` Section 3개(general_meeting_detail_modal TH/TD/CELL 헬퍼, `overflow-x-auto` + minWidth, 2단 `<thead>` 2행 colSpan):
1. **투자자산** — 헤더 운용사[투자기업·보유주수·원금(A)·감액금액(B)·잔액(A-B)] · 수탁기관[투자기업·보유주수·잔액] · 일치여부[보유주수·잔액]; 행 1: `(주)요즘주방 / 7,142 / 499,940,000 / 499,939,000 / 1,000 / (주)지에프케이 우선주 / 7,142 / 1,000 / 일치 / 일치`(배지 success); tfoot `합계 / 96,783 / -(colSpan 8)`(목업 값 그대로 — 행 합과 다름을 주석).
2. **미투자자산 거래** — 운용사[종목·보유주수·잔액] · 수탁기관[종목·보유주수·잔액] · 일치여부[보유주수·잔액]; 본문 `조회된 내역이 없습니다.`(colSpan 8).
3. **미투자자산** — 운용사[계좌번호·잔액] · 수탁기관[계좌번호·잔액] · 일치여부[잔액]; 행: `00211252481(신한금융투자) / 1 / 00211252481(신한금투 AJ-ISU경기도애그리푸드투자조합) / 1 / 일치`; tfoot `합계 / 132,681,103 / -(colSpan 3)`.
텍스트 `<MT>`, 숫자 `mn(fmt())`. 푸터 `닫기`만(엑셀 없음 — 렌더 소스 3개, 목업 푸터도 닫기 하나).

## 엑셀(목록): 3단 헤더 → `flattenForExcel` **재귀 일반화**(깊이 3: 헤더 3행 + 세로 병합 rowspan 3·가로 병합) + 마크 문자·상세보기(status)·확정여부. 파일명 `자펀드수탁관리(확정).xlsx`. 마스크 게이트.
## ⚠검토필요 마커 1건: 상세 팝업 헤더
## 한계 주석: 24건 발췌(전체 ~152건) · 상세 팝업은 예시 1건 고정 · 확정여부 변경은 로컬 state · 확정여부 칩은 파생(목업 없음)
