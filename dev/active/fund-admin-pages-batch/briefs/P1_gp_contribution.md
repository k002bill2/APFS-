# P1 — (운용사)출자배분관리  (S1_14)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_14__운용사_출자배분관리.html`
메뉴 리프 라벨 `(운용사)출자배분관리` · path `gp-contribution` · crumbs `['홈','투자자산관리','자펀드 관리','(운용사)출자배분관리']`
산출 파일: `src/dash/gp_contribution_manage.tsx`(`export function GpContributionManage`), `src/dash/gp_contribution_detail_modal.tsx`(`export function GpContributionDetailModal`)
트랙: typed 조회형(2단 헤더 + pinned 합계 2행 + 상세 팝업). 등록·행선택·워크플로우 **없음**. 골드: regular_report_manage(드로어·kebab) + subfund_manage(2단 헤더·flattenForExcel) + general_meeting(LinkCell+Enter→상세 모달, KvGrid).

## 데이터 (목업 DATA 12행 값 그대로 — 콤마 문자열은 number로)
```ts
export interface GpContribRow { id:string; no:number; gp:string; fn:string; cmt:number; cmtM:number; gb:'출자'|'배분'; bd:string;
  pay:number; payM:number; o:[number,number,number,number,number]; m:[number,number,number,number,number]; dist:number; bal:number; match:'일치'|'불일치'; }
```
GP='KB증권(주)', FN='현대동양농식품사모투자전문회사', cmt=32_000_000_000, cmtM=15_700_000_000 — 목업은 rowspan으로 1회 표시하지만 AG Grid엔 rowspan을 쓰지 않으므로 **12행 모두 같은 값을 싣는다**(주석으로 명시). 원문 정렬(출자 5행 → 배분 7행, 기준일자 비시간순) 유지 — 재정렬 금지. 행 필드는 목업 `o`(기타조합원 배분 5)·`m`(모태펀드 배분 5) 배열을 그대로 개별 키(o0..o4, m0..m4)로 펼쳐도 된다(엑셀 flatten이 field 키를 쓰므로 개별 키 권장).

## 컬럼 (목업 헤더 순서·집합 그대로, 22 리프)
No(pinned left, 68) · 운용사(MT, maxWidth 200) · 자펀드(MT, maxWidth 260) · 약정총액(amt) · 모태펀드 약정액(amt) · 구분(StatusBadge: 출자=`info`, 배분=`primary`, `lg dot={false}`) · 기준일자(**LinkCell** → 상세 모달, `mn()`) · 납입총액(amt) · 모태펀드 납입액(amt) · **그룹 `기타조합원 배분`**[원금배분·수익배분(세후)·성과보수액·원천징수세액·합계(strong)] · **그룹 `모태펀드 배분`**[동일 5] · 배분합계(amt strong) · 출자잔액(amt) · 수탁일치여부(StatusBadge 일치=`success`/불일치=`warning`).
폭 전략 `AUTO_SIZE_CONTENT`. 정렬 기본 허용(DEFAULT_COL_DEF).

## 합계 — pinned 2행 (목업 tfoot 소계+합계 둘 다)
`pinnedBottomRowData = useMemo(() => [subtotal(filtered), total(filtered)], [filtered])`.
- 소계: No 셀 `'소 계'`, 운용사~기준일자(7칸) 빈값, 납입총액·모태펀드 납입액·배분 10칸·배분합계 = 합, 출자잔액·수탁일치 `'-'`(null).
- 합계: No 셀 `'합 계'`, 약정총액·모태펀드 약정액 = **자펀드별 distinct 합**(`fn` 기준 dedupe — 현재 1건이라 32,000,000,000 / 15,700,000,000), 구분·기준일자 '-', 나머지는 소계와 동일.
- 배지 셀·텍스트 셀은 `rowPinned`면 null 또는 '-'. `aggrid_shared.css`가 합계행 톤을 준다.

## 검색박스 → 필터 (목업 순서)
1. 모펀드 — `DrawerSelect ['농식품모태펀드','MOAF']` **noop**
2. 운용사 — `DrawerSelect`(행에서 파생: KB증권(주)) — `passes`(gp)
3. 자펀드 — `DrawerSelect`(행 파생) — `passes`(fn)
4. 계정구분 — `DrawerSelect ['농식품','수산']` **noop**
5. 담당자 — `DrawerSelect options={[]}` **noop** + 마커 `note={{ rec:'담당자 목록(사용자 마스터 연동)', dat:'실 담당자 옵션 데이터 미확인' }}`
6. 출자/배분 — **툴바 주 필터 `FilterChip`**(전체·출자·배분, 드로어 select와 같은 state `fGb`) — `passes`(gb)
7. 기준일자 시작/종료 — `PeriodPicker mode="day"` 2개(plain, ariaLabel '기준일자 시작일'/'기준일자 종료일', fit-content 래퍼) — `passes`(bd 사전식, 빈 값=열린 경계). **목업 기본값 2000-01-01~2026-08-12 적용 금지.**
적용 칩: 운용사·자펀드(MT), 기준일자 시작/종료(mn). 툴바 우측: `단위: 원` 캡션 · 상세필터 · 새로고침 · kebab(MoreMenu).

## 상세 팝업 `일자별출자배분관리` (기준일자 링크 클릭 / 그 셀 Enter) — 파일 `gp_contribution_detail_modal.tsx`
Dialog `max-w-[720px]`, 헤더 제목 `일자별출자배분관리` + 대상명 `<MT>{fn}</MT> · {mn(bd)}`. 본문 `p-[46px]` 세 Section:
1. **기본정보** KvGrid: 운용사(MT) · 자펀드(MT, full) · 납입일자(mn bd) · 농식품부 등록일 `-` · 납입금액 `mn(fmt(pay)) + ' 원'`.
2. **상세정보** 표(No·조합원·납입금액·모태수탁 납입금액·비고): 1행 `농식품모태펀드 / payM / payM / -`, tfoot `합계 / pay / - / -` — **행 값에서 파생**(목업은 1행 값이 고정 템플릿이지만 우리는 선택 행의 pay/payM을 쓴다 — 주석). 배분 행(pay=0)은 0으로 표시.
3. **첨부파일** KvGrid 1항목: 라벨 `업로드 여부` + `<ReviewMarker rec="Y/N(업로드 상태)" dat="원문 데이터값 없음 — 상태 미확정, 임의 값 생성 안 함" label="업로드 여부" />`, 값 `-`.
푸터: `닫기` 하나(목업 동일 — 업로드 UI·저장·엑셀 없음, 단위 토글 없음). 표 헬퍼(TH/TD/CELL)는 general_meeting_detail_modal 복사.

## 엑셀
`flattenForExcel(columnDefs)` 2단 헤더 + 본문(filtered) + 소계 + 합계 행. 배지 컬럼은 문자열('출자'/'일치'). 마스크 게이트.

## ⚠검토필요 마커 2건 전수: 담당자(드로어) · 업로드 여부(상세 모달)
## 한계 주석: rowspan 미재현(값 반복) · 상세정보 표 파생 · 담당자 의미(LP측/GP측) 원문 미확정(설계메모) · 단위 토글 미적용(목업 [확인 필요])
