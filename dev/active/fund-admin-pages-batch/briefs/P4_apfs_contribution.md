# P4 — (농금원)출자배분관리  (S1_21)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_21__농금원_출자배분관리.html`
메뉴 리프 라벨 `(농금원)출자배분관리` · path `apfs-contribution` · crumbs `['홈','투자자산관리','자펀드 관리','(농금원)출자배분관리']`
산출 파일: `src/dash/apfs_contribution_manage.tsx`(`export function ApfsContributionManage`, 타입 export), `src/dash/apfs_contribution_tx_modal.tsx`(`export function DistTxModal`, `export function InvestTxModal`)
트랙: typed 조회형 — **그룹(자펀드 거래) 단위 소계 행 인라인 + 그랜드 합계 pinned + 금액 단위 토글 + 편집 팝업 3종**. 등록·행 선택 없음. 골드: fund_cash_forecast(단위 토글·엑셀 단위), subfund_manage(합계), subfund_form_modal(반복행 표), general_meeting(LinkCell).

## 데이터 (목업 GROUPS 2그룹 7멤버 + INVEST_GROUP — 값 그대로)
```ts
export interface TxGroup { gi:number; un:string; fn:string; acc:'농식품'|'수산'; rd:string; form:number; tx:'출자'|'배분'; dtx:string; td:string; members: TxMember[] }
export interface TxMember { mem:string; mg:'GP'|'LP'|'SP'; mc:number; pay:number|null; prin:number; prof:number; perf:number; etc:number; prio:number; wht:number; netin:number; bal:number|null; chk:''|'일치'|'확인'; red:string; memo:string }
```
그룹은 React state `groups`(편집 팝업 저장이 members를 불변 갱신). 그리드 표시행은 `useMemo`로 **평탄화**: 멤버 행(`kind:'row'`, 그룹 필드 반복 — rowspan 미재현) + 그룹마다 `kind:'subtotal'` 행(소계) — id 안정(`g${gi}-m${mi}` / `g${gi}-sub`). 그랜드 합계는 `pinnedBottomRowData`(useMemo). **정렬 금지**: 모든 컬럼 `sortable:false`(DEFAULT_COL_DEF는 그대로 두고 컬럼 팩토리에서 덮음 — 소계 행 순서가 의미이므로), 필터도 AG Grid External이 아니라 **React에서 그룹 단위로 걸러** 평탄화 전에 적용.

## 컬럼 (목업 28열 순서 그대로, 단일 헤더) — `AUTO_SIZE_CONTENT`
NO · 운용사(MT) · 자펀드(MT) · 계정구분 · 등록일(mn) · 결성액(money) · 조합원(MT) · 조합원구분(회색 칩 `.tag.n`) · 조합원 약정금액(money) · 조합원 약정총액(그룹 합, money) · 거래구분(StatusBadge 배분=`primary`/출자=회색 칩) · 상세구분 · 거래일자(**LinkCell**, mn → 팝업) · 납입금액(money, null='-') · 조합 납입총액(그룹 합) · 원금배분액 · 수익배분액(세전) · 성과보수액 · 조합 배분총액(그룹 prin+prof+perf) · 기타배분액(이자 등) · 우선손실충당액 · 원천징수세액 · 실 입금액 · 실 입금총액(그룹 netin 합) · 보유잔액(null='-') · 수탁데이터 확인검토(아래) · 감액여부('-') · 비고(MT, ''→'-').
- 소계 행: NO 셀 `'소 계'`, 운용사~거래일자 빈값, 납입금액·원금~실 입금액 = 합(목업 `groupTotalsRow`: pay·prin·prof·perf·disttot·etc·prio·wht·netin), 조합 납입총액·보유잔액 등 '-'. `getRowStyle`: `kind==='subtotal'` → `{ background:'var(--muted)', fontWeight:700 }`.
- 합계(pinned): NO `'합 계'`, 같은 열 합(전 그룹).
- 음수(prof -270,000,000 · wht -895,360 · netin -163,608,417)는 `var(--danger-text)`로 표시.
- **수탁데이터 확인검토 셀**: `'일치'` → `StatusBadge success`; `'확인'` → 그룹 tx==='배분'이면 `Button outline sm "확인"`(→ `DistTxModal mode='register'`), 아니면 `StatusBadge info '확인'`; `''` → muted '-'. 셀 Enter도 같은 동작.
- **거래일자 링크**: tx==='배분' → `DistTxModal mode='edit'`(배분거래수정), tx==='출자' → `InvestTxModal`(출자거래 수정 — 목업 INVEST_GROUP 별도 데이터, 주석 명시).

## 금액 단위 토글
`type Unit='원'|'백만원'|'억원'`, 기본 **원**. 툴바 우측 `단위: {unit}` 캡션 + `SegTabs size="sm"`. 그리드 `context={{ unit }}` + `useEffect(() => apiRef.current?.refreshCells({ force:true }), [unit])`. 포매터(목업 fmt): 원=`fmt(v)`, 백만원=`fmt(Math.round(v/1e6))`, 억원=`(v/1e8).toLocaleString(undefined,{maximumFractionDigits:2})`, `mn()` 감싸기, null='-'. 팝업 표는 항상 원 단위(목업 동일).

## 검색박스 → 필터 (목업 순서)
1. 모펀드 noop · 2. 운용사 `DrawerSelect`(그룹 파생) + 마커 `{ rec:'운용사 마스터 전체 목록 선택', dat:'실 옵션 목록 미확인 — 데이터 샘플값(미시간벤처캐피탈주식회사)만 표시' }` · 3. 자펀드(그룹 파생) + 마커 `{ rec:'선택 운용사의 자펀드 목록', dat:'실 옵션 목록 미확인 — 데이터 샘플값(미시간글로벌식품산업투자조합2호)만 표시' }` · 4. 계정구분 `DrawerSelect ['농식품','수산']`(그룹 acc 실제 필터) · 5. **조회기준 — 툴바 주 필터 FilterChip**(상세·요약·전체·출자·배분·기타, 기본 `상세`; 드로어 select 공유): 상세/전체=멤버행+소계, 요약=소계 행만(그룹당 1행, NO 셀엔 그룹 자펀드명 대신 `'소 계'` 유지), 출자/배분=tx 일치 그룹만(상세 형태), 기타=tx가 둘 다 아닌 그룹(현재 0건 → 빈 그리드 문구) · 6. 기준일자 시작/종료 `PeriodPicker day`(그룹 td 사전식; 목업 기본 2024-08-12 적용 금지).
적용 칩: 운용사·자펀드·계정구분(MT)·기준일자(mn). 툴바 우측: 단위 캡션 · SegTabs · 상세필터 · 새로고침 · kebab.

## 팝업 (파일 `apfs_contribution_tx_modal.tsx`)
### `DistTxModal({ group, mode:'register'|'edit', onSave:(members: TxMember[])=>void, onClose })` — 제목 `배분거래등록`/`배분거래수정`, Dialog `max-w-[1100px] max-h-[88vh]`
- 상단 kv 4항목(readonly 박스 또는 KvGrid): 운용사·자펀드·거래구분(`${tx} / ${dtx}`)·거래일자.
- Section `조합원별 배분내역` 표(`tableLayout:'fixed'`, overflow-x-auto, minWidth 1180): NO·조합원(MT)·조합원구분(칩)·조합원약정금액(읽기, fmt)·원금배분액·수익배분액·성과보수액·우선손실충당액·기타배분액(이자 등)·원천징수세액(이상 6개 **AmountInput**)·실 입금액(계산: 6개 합, 읽기)·수탁데이터 확인검토(register: 배지/‘-’ 표시 전용 — `일치`=success, `확인`=info '확인대상', ''=‘-’ ; edit: `<select>` 일치/확인/미확인, 기본 `chk||'미확인'`)·비고(text input, fill). tfoot 합계(6합+실입금 합, 나머지 '-').
- `AmountInput`: 로컬 `<input type="text" inputMode="numeric">` — SchemaField `base`와 같은 34px 인라인 스타일(복제), 입력 중 자유, blur 시 `toFmt(toNum(v))`(콤마·음수 허용), 상태는 숫자 배열로 보관. 각 input `aria-label="<조합원> <컬럼명>"`.
- 저장 → `onSave(newMembers)`(netin 재계산 포함) → 부모가 groups 불변 갱신 + toast `저장되었습니다 (목업)`. 닫기 outline.
### `InvestTxModal({ onClose })` — 제목 `출자거래 수정`, Dialog `max-w-[1100px]`, 데이터 = 목업 `INVEST_GROUP`(나이스투자파트너스 8명, 값 그대로, 모듈 상수) — kv 4항목 + 표(NO·조합원 `mem (id)`·조합원구분 칩·조합원유형·조합원약정금액·약정지분·납입금액 AmountInput·납입지분·수탁납입금액(null='-')·데이터확인(chk 있으면 select 일치/확인/미확인, 없으면 '-')·비고 input), tfoot 합계(약정·납입 합). 저장 → 로컬 state만 갱신 + toast `저장되었습니다 (목업)`(그리드와 무관 — 주석).

## 엑셀: 28열 단일 헤더, 현재 조회기준·필터 반영한 표시행(멤버+소계) + 합계, 금액은 선택 단위 숫자 셀(백만/억은 소수 z 서식), 마스크 게이트. 파일명 `(농금원)출자배분관리_${unit}.xlsx`.
## ⚠검토필요 마커 2건 전수: 운용사·자펀드(드로어)
## 한계 주석: rowspan 미재현 · 조회기준 동작은 추론(목업 미구현) · 출자거래 수정 데이터는 별 자펀드(INVEST_GROUP) · 수탁 확인검토 빈칸 기준 원문 미정의(설계메모)
