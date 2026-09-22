/* 운용인력 변동관리 — 관리형 리스트 페이지 (조기경보 > 조기경보 > 운용인력 변동관리).
   출처: S2_59_운용인력변동관리.html(KRDS TO-BE) + 등록화면 S2_60(목업 하단 `openReg()` 로 이미 흡수됨
   — 항목 7개 일치 실측 확인) → APFS 디자인시스템으로 변형. 형제 `*_spec.json` 은 없다(HTML 이 유일한 정본).
   골격 골드는 형제 2개다:
   - `litigation_manage.tsx`(S2_57 운용사 소송관리) — **골격 골드**. 바로 직전 같은 계열로 만든 형제다.
   - `shareholder_manage.tsx`(S2_55 운용사 주주변동관리) — **8컬럼 flex 폭 전략** 골드(자펀드 컬럼 포함).
   규약 판단이 갈리면 위 두 파일의 실제 코드가 진실이다.

   ⚠ 메뉴 라벨과 목업 제목이 다르다 — 목업 h1 은 "운용인력변동관리"(공백 없음)지만 우리 메뉴 리프
     (data.ts)는 **"운용인력 변동관리"**(운용인력과 변동관리 사이 공백)다. title·cardTitle·favRoute·
     crumbs 리프·EXPORT_BASENAME 은 전부 **메뉴 라벨**(NFC)을 쓴다 — 라우트 키가 한글 라벨이라
     한 글자만 어긋나도 즐겨찾기·딥링크가 조용히 빗나간다.

   구성(목업 → 우리 규약)
   - 검색박스 3항목(구분 · 운용사/자펀드 · 기간) → **상세필터 드로어**(Sheet). 툴바 FilterChip 세트는
     만들지 않는다. 검색어는 OFF(목업에 없음 — `SEARCHABLE` 게이트).
     ⚠ **이 화면의 유일한 신규 패턴 = 종속 select**. `구분`(운용사/자펀드)이 `운용사/자펀드` select 의
       옵션 목록을 바꾼다(목업 `LISTS` + `fillTarget()`). 상세는 `fScope` 선언부 주석 참조.
     ⚠ 기간 기본값 없음 — 목업은 `2026-01-01 ~ 2026-04-30` 리터럴이지만 그 값은 목업 더미의 시점이라
       실화면에서 의미가 없다. 시작·종료 둘 다 빈 값으로 시작하고, 빈 쪽은 무제한 경계다(형제 3화면 동일).
   - 목업 [조회] 버튼 → 만들지 않는다(백엔드가 없어 필터가 즉시 반영된다 — 형제 골드 동일 판단).
   - 목업 [등록] → 툴바 독립 버튼 `운용인력변동 등록`(상세필터 오른쪽·새로고침 왼쪽) + `⌘⏎`.
   - 목업 [해제등록] → **행 선택 selbar**(GridFrame contextActions). selbar 의 도메인 액션은 이것 하나다
     (`선택 해제`는 도메인 액션이 아니라 전 화면 공통 어포던스라 함께 둔다 — 형제 8화면 동일).
   - **수정·삭제는 없다**(2026-09-22 사용자 결정 — 목업 리스트바 액션이 등록/해제등록/엑셀 3개뿐이다).
     edit 모드·DeleteDialog·onRowDoubleClicked 배선을 만들지 않는다. 형제 litigation 에서 딸려오지 않게 주의.
   - 목업 [엑셀] → 툴바가 아니라 푸터 `FooterActions` 내보내기 + `⌥D`(apfs-grid 푸터 골드 양식).
   - 목록 그리드 → AG Grid **단일 헤더 8컬럼**(목업 thead 순서 그대로). **2단 그룹헤더 없음**,
     **합계행 없음**(전 컬럼이 문자/날짜라 가산 개념이 없다 → pinnedBottomRowData 자체를 두지 않는다).
   - `구분` 셀 → `StatusBadge size="lg" dot={false}`. **등록=info · 해제=muted**.
     ⚠ `해제` 톤은 3단 경위를 거쳤다 — 목업 `gTag()` 원문은 danger(`.tag r`) → 형제 3화면
       (S2_53 위반사항 · S2_55 주주변동 · S2_57 소송) 일관성으로 success → **2026-09-22 사용자 지시로
       muted(중립)**. 해제는 경보가 아니라 정상 종료라 중립 톤이 맞다는 판단이다.
       **목업 대조·형제 화면 대조만으로 danger·success 로 되돌리지 말 것** — 사용자가 직접 뒤집은 결정이고,
       조기경보 관리 계열 전체가 muted 로 정렬돼 가는 중이다(이 화면만의 이탈이 아니다).
       형제 각 화면의 전환 시점은 PR 별로 달라 여기서 현황을 단정하지 않는다.
   - `인력구분` 은 배지가 아니라 **평문**이다(목업 `esc(r.hr)` — `gTag()` 를 거치지 않는다).
   - **문장(장문) 컬럼이 없다** → 형제 litigation 의 `소송내역`(wrapText·autoHeight·wrapCell) 배선을
     이식하지 않는다. 전 컬럼이 짧은 명사/날짜라 평범한 truncate 셀로 충분하다.
   - KPI 배지 행 → **미포함**(2026-09-22 사용자 HITL 결정) → `kpis` prop 을 아예 넘기지 않는다
     (GridFrame 이 `{kpis && …}` 라 영역째 사라진다). 이 화면은 **금액 개념 자체가 없어** 제네릭 금액 KPI 가
     붙을 자리도 없다. 재질문 방지용으로 여기 기록해 둔다.
   - ⚠검토필요 마커 → **구현하지 않는다**(형제 3화면과 동일한 사용자 결정 + 목업 설계메모도 "검토필요
     마커 제거"라고 적고 있다 · ReviewMarker 를 import 하지 않는다).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모 `.note`·리스트바 `총 N건`·
   목업 자체 월픽커/토스트/스크롤락 JS 는 셸·푸터·우리 컴포넌트가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - 더미 3행은 목업 `DATA` **원문 그대로**다(값 포함). 행을 새로 만들지 않는다.
     ⚠ 2행은 `ym:'2026-03'` 인데 `cdate:'2022-09-01'` 이다 — 목업 원문 그대로이며 정규화하지 않는다.
       기간 필터를 2026년부터로 걸면 2행이 빠지는데 **버그가 아니다**(변동일자 기준이라 그렇다).
   - `rdate`(해제일자) 는 미해제 행이 목업에서 `''` 인데 우리는 **null 로 정규화**했다 — 형제 3화면의
     `rdate: string | null` 계약에 맞추기 위해서다. 화면 표시는 둘 다 '-' 로 같다.
   - `backdate`(복귀일자) · `detail`(운용인력변동내용) 은 **등록 폼에만 있고 그리드 컬럼이 없다**
     (목업 thead 에 없다). 원문 그대로 보존하되 저장은 한다 — 폼에 입력한 값이 조용히 증발하지 않도록
     행에 실어 둔다(→ workforce_manage_schemas.ts 헤더의 '복귀일자 ≠ 해제일자').
   - `no` 는 **행에 고정된 값**이다(정렬 가능한 그리드에서 연번을 재계산하면 정렬과 싸운다 — 형제 골드 동일 결정).
   - 해제등록 팝업은 **원문에 정의가 있다**(role="alertdialog" · 해제일자는 오늘 날짜). 형제 litigation 이
     차용했던 `RELEASE_SCHEMA`(해제일자 입력 폼)를 여기 이식하면 원문을 덮어쓰는 셈이라 만들지 않는다.
     목업이 토스트만 띄우는 것과 달리 우리는 상태를 들고 있으므로 선택 행의 `구분`→'해제',
     `해제일자`→오늘 로 실제 전이시킨다(불변 갱신 — 원본 배열·행 객체를 mutate 하지 않는다). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유 · 이 화면은 합계행이 없지만 공유 규약 유지)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 34px 컨트롤·폭 하한 SSOT
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { WorkforceFormModal, WorkforceReleaseDialog } from './workforce_form_modal';
import type { WorkforceFormValues } from './workforce_form_modal';
import { OPT_GP, OPT_FUND } from './workforce_manage_schemas';

const { Button, IconBtn, StatusBadge } = UI;

/* 검색어 입력은 기본 OFF(opt-in) — 목업 검색박스에 없다(apfs-detail-filter "예약 라벨 검색어").
   상태(`fText`)·행 필터·칩 배선은 남겨 두고 **드로어 입력만** 이 플래그로 가린다(정본 asset_funding·permission_history).
   입력이 숨겨져 값이 ''로 고정되므로 필터는 자연 무발동이고, `true` 한 줄로 전 컬럼 부분일치 검색이 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   도메인 타입
────────────────────────────── */
/** 그리드 `구분` — 목업 `g`. 운용인력 등록 상태 ↔ 해제 상태. */
export type WorkforceKind = '등록' | '해제';
/* 톤 매핑 — 파일 헤더 참조. `해제` 톤은 3단 경위를 거쳤다: 목업 원문 `gTag()` 는 danger(`.tag r`) →
   형제 3화면(S2_53·S2_55·S2_57) 일관성으로 success → **2026-09-22 사용자 지시로 muted(중립)**.
   해제는 경보가 아니라 정상 종료라 중립 톤이 맞다는 판단이고, 조기경보 관리 계열 전체가 muted 로
   정렬돼 가는 방향이다. **목업 대조나 형제 화면 대조만으로 danger·success 로 되돌리지 말 것**
   — 사용자가 직접 뒤집은 결정이다. `등록` 은 info 그대로다. */
const KIND_TONE: Record<WorkforceKind, Tone> = { 등록: 'info', 해제: 'muted' };

export interface WorkforceRow {
  id: string; no: number;
  ym: string;            // 기준년월 'YYYY-MM'(등록 폼의 `등록년월`)
  gubun: WorkforceKind;  // 구분(등록/해제)
  hr: string;            // 인력구분(운용인력/대표펀드매니저) — 평문 텍스트다(배지 아님, 목업 esc(r.hr))
  mgr: string;           // 운용사
  fund: string;          // 자펀드
  cdate: string;         // 변동일자 'YYYY-MM-DD'(등록 폼의 `운용인력변동일자`)
  /* 해제일자 — 미해제 행은 **null**(목업 원문 `''` 를 null 로 정규화 · 형제 3화면 계약). 화면에선 '-'.
     ⚠ 텍스트/날짜 N/A 표시는 `'-'`, 숫자 N/A 만 `null` 이 규약인데 여기 null 은 **저장값**이고
       표시값이 아니다 — `dateFmt` 가 falsy 를 '-' 로 바꾼다. */
  rdate: string | null;
  /* 아래 2개는 **등록 폼에만 있고 그리드 컬럼이 없다**(목업 thead 에 없다). 값이 증발하지 않게 행에 싣는다. */
  backdate?: string;     // 복귀일자 — 해제일자와 별개 축이다(→ 스키마 헤더)
  detail?: string;       // 운용인력변동내용
}

/* 데모 데이터 — 목업 `DATA` 3행 원문 그대로(rdate '' → null 정규화만). 행을 새로 만들지 않는다. */
const DEMO: WorkforceRow[] = [
  { id: 'wf-1', no: 1, ym: '2026-04', gubun: '등록', hr: '운용인력', mgr: '트리거투자운용', fund: '트리거-글로벌PEX투자조합', cdate: '2026-04-10', rdate: null },
  { id: 'wf-2', no: 2, ym: '2026-03', gubun: '해제', hr: '대표펀드매니저', mgr: '한국투자파트너스', fund: '한투 청년농식품투자조합', cdate: '2022-09-01', rdate: '2026-03-20' },
  { id: 'wf-3', no: 3, ym: '2026-02', gubun: '등록', hr: '운용인력', mgr: 'IMM인베스트먼트', fund: 'IMM 농식품 스마트투자조합', cdate: '2026-02-14', rdate: null },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더 8컬럼):
     No · 기준년월 · 구분 · 인력구분 · 운용사 · 자펀드 · 변동일자 · 해제일자
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음). 8컬럼 내용 폭 합이 프레임보다 좁아
     내용 맞춤(`AUTO_SIZE_CONTENT`)을 쓰면 `해제일자` 오른쪽에 빈 거터가 남는다
     (apfs-aggrid "좁은 매트릭스/집계 그리드" 규약 · 골드 shareholder_manage 와 같은 8컬럼 상황).
     가중치는 내용 길이 비례: 가장 긴 문자열이 `자펀드`(조합명)라 가중치가 가장 크다.
     고정폭 유지: `No`(연번) · `구분`(배지 1종 폭) — flex 없이 width 로 둔다.
   ⚠ 좌측 고정은 No 만 — 다른 컬럼에 pinned 를 주면 목업 순서가 깨진다.
   모듈 스코프 상수다(렌더마다 새 배열이면 AG Grid 가 헤더를 remount 하고 폭을 되돌린다 — apfs-aggrid ⑦).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 텍스트 N/A 는 '-'(숫자 N/A 의 null 규약과 다른 축 — 이 화면엔 숫자 컬럼이 없다).
   flex 셀은 AG Grid 기본 ellipsis 가 안 먹으므로 내부 span 에 truncate 를 준다. */
const textCell = (p: { value?: string }) => (p.value
  ? <span className="min-w-0 truncate"><MT>{p.value}</MT></span>
  : <span className="text-muted-foreground">-</span>);
const kindCell = (p: { value: WorkforceKind }) => <StatusBadge tone={KIND_TONE[p.value]} label={p.value} size="lg" dot={false} />;
/* 날짜 셀 — 행 데이터(축이 아니다)라 mn(). 빈 값·null 은 '-' */
const dateFmt = (p: { value?: string | null }) => (p.value ? mn(p.value) : '-');

const txt = (field: keyof WorkforceRow, headerName: string, flex: number, minWidth: number, center?: boolean): ColDef<WorkforceRow> => ({
  field, headerName, flex, minWidth, cellStyle: center ? flexMid : flexCenter, cellRenderer: textCell,
});
const date = (field: keyof WorkforceRow, headerName: string, flex: number, minWidth: number): ColDef<WorkforceRow> => ({
  field, headerName, flex, minWidth, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: dateFmt,
});

const COLUMNS: ColDef<WorkforceRow>[] = [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'ym', headerName: '기준년월', flex: 0.7, minWidth: 96, cellStyle: centerNum, valueFormatter: dateFmt },
  { field: 'gubun', headerName: '구분', width: 96, minWidth: 96, cellStyle: flexMid, cellRenderer: kindCell },
  txt('hr', '인력구분', 0.9, 118, true),
  txt('mgr', '운용사', 1.4, 150),
  /* 자펀드(조합명) = 가장 긴 문자열 → 가장 큰 가중치로 잉여 폭을 흡수한다 */
  txt('fund', '자펀드', 2.0, 200),
  date('cdate', '변동일자', 0.85, 120),
  date('rdate', '해제일자', 0.85, 120),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 단일 헤더라 병합 없음.
   ⚠ `rdate` 는 null 가능 → `?? ''`(엑셀 빈 셀). XCol 계약이 string|number 다.
   ⚠ backdate/detail 은 그리드 컬럼이 아니라 엑셀에도 넣지 않는다(화면=엑셀 불변식). */
type XCol = { header: string; get: (r: WorkforceRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '구분', get: (r) => r.gubun },
  { header: '인력구분', get: (r) => r.hr },
  { header: '운용사', get: (r) => r.mgr },
  { header: '자펀드', get: (r) => r.fund },
  { header: '변동일자', get: (r) => r.cdate },
  { header: '해제일자', get: (r) => r.rdate ?? '' },
];

/* 행 선택 — 해제등록이 N건에 그대로 적용되는 액션이라 multiRow(apfs-aggrid "체크박스" 절 · 목업 `chk-all`).
   선택은 **체크박스로만** on/off 한다(2026-09-22 사용자 결정, #230 — 09-17 의 "행 본문 클릭 누적선택" 을 뒤집음).
   행 본문 클릭은 선택을 만들지도 풀지도 않는다(`enableClickSelection:false` 명시 — AG Grid 기본값과 같지만
   과거 이 키 누락이 "선택 수단 0" 사고로 오독된 이력이 있어 의도를 적어 둔다). 더블클릭=수정 모달, 우클릭=컨텍스트 메뉴는 그대로.
   `enableSelectionWithoutKeys` 는 클릭 선택 전용 옵션이라 같이 뺀다(체크박스 클릭은 원래 누적 토글).
   헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그리므로 내장 SelectAllFeature 는 끄고(headerCheckbox:false)
   범위를 'filtered' 로 못 박아 DS 헤더와 일치시킨다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
const ROW_SELECTION = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
  enableClickSelection: false,       // 행 본문 클릭 선택 없음 — 체크박스로만 (2026-09-22)
} as const;

/* ⚠ `overlayNoRowsTemplate` 은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 되면 AG Grid 가
   별도 오버레이(`noMatchingRows`)를 띄워 기본 영문 "No Matching Rows"가 노출된다(v35 실측).
   `noMatchingRowsToShow` 는 v35 가 읽지 않는 죽은 키다 — 넣지 않는다.
   객체 prop 이므로 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조회 조건에 해당하는 운용인력 변동이 없습니다.',
  noMatchingRows: '조회 조건에 해당하는 운용인력 변동이 없습니다.',
};

/* ── 로컬 UI 조각(공유 export 아님 — 골드에서 복사하는 것이 규약) ── */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
/* ⚠ 이 화면의 `구분`(운용사/자펀드) select 는 목업에 전체 옵션이 **없고** 비면 안 되는 스코프 스위치라
   전체 옵션을 억제할 수단이 필요하다. 억제 관용구는 새로 만들지 않고 **패밀리 다수파**
   (`audit_log.tsx` · `menu_manage.tsx` · `user_manage.tsx`)의 `all?: string | null` 을 그대로 따른다
   — 기본값 '전체', `all={null}` 이면 전체 옵션을 그리지 않는다. */
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string | null }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all != null && <option value="">{all}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* 기간 PeriodPicker 래퍼 — 트리거가 `w-full` 이라 감싸지 않으면 드로어 전 폭으로 늘어난다(apfs-datepicker) */
const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 엑셀 파일명 — 라우트에 경로 구분자·Excel 금칙문자가 없어 라벨을 그대로 쓴다(메뉴 라벨 = 공백 있는 형태).
   시트명은 31자 제한이 있어 짧은 형태로 둔다. */
const EXPORT_BASENAME = '운용인력 변동관리';
const EXPORT_SHEET = '운용인력변동관리';

/* 등록 모드는 등록년월(필수)을 이번 달로 미리 채운다 — 목업도 `<input id="rg-ym" value="2026-07">` 로 프리필한다.
   ⚠ 클릭 시점에 계산한다(모듈 상수로 두면 오래 열린 탭이 달을 넘겨도 낡은 값). toISOString 금지(KST off-by-one). */
const CREATE_INITIAL = (): Record<string, string> => ({ ym: format(new Date(), 'yyyy-MM') });
const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일 — toISOString 은 KST 00~09시에 전날

/* 상세필터 `구분` 의 값 도메인. **그리드 컬럼 `구분`(등록/해제)과 라벨만 같고 값 도메인이 전혀 다르다.** */
type WorkforceScope = '운용사' | '자펀드';
/* 목업 `LISTS` 그대로 — `전체` 는 DrawerSelect 가 value='' 로 그리므로 여기엔 넣지 않는다.
   옵션 배열 자체는 등록 폼과 공유한다(workforce_manage_schemas.ts 의 OPT_GP/OPT_FUND). */
const SCOPE_OPTIONS: Record<WorkforceScope, string[]> = { 운용사: OPT_GP, 자펀드: OPT_FUND };
const SCOPE_VALUES: WorkforceScope[] = ['운용사', '자펀드'];

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState =
  | null
  | { kind: 'form' }
  | { kind: 'release'; ids: string[] };

export function WorkforceManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<WorkforceRow> | null>(null);
  const [rows, setRows] = useState<WorkforceRow[]>(DEMO);
  const [selCount, setSelCount] = useState(0);   // 선택 행 수만 state — 행 자체는 그리드가 SSOT
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);
  const masked = useMask();

  /* 앱-스코프 단축키. 모달이 떠 있는 동안에는 등록(이중 열림)·내보내기(모달 위 다운로드)를 막는다.
     `print` 는 UI 표면이 없는 골격 단축키다(형제 전 화면 공통). */
  useHotkey(HOTKEYS.register.combo, () => openCreate(), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null });

  /* ── 필터 SSOT(빈 값 = 미적용) — 목업 검색박스 3항목 순서 그대로(구분 · 운용사/자펀드 · 기간) ──
     ⚠⚠ **라벨 충돌 경고**: 여기 `fScope`(필터 라벨 "구분")의 값 도메인은 **운용사/자펀드**이고,
       그리드 컬럼 `구분`(`WorkforceRow.gubun`)의 값 도메인은 **등록/해제**다. 목업이 같은 라벨을
       두 곳에 쓴 것일 뿐 **서로 아무 관계가 없다**. 나중에 "라벨이 같으니 연결해서 고치자"는 변경을
       하지 말 것 — `fScope` 는 행을 거르는 필터가 아니라 `fTarget` 이 어느 컬럼(mgr/fund)과
       비교될지 고르는 **스코프 스위치**다.
     ⚠ `fTarget` 의 '전체' 는 저장값이 **`''`** 다(DrawerSelect 의 all 옵션 계약). 리터럴 '전체' 를
       저장하면 select 가 매칭 실패로 빈칸이 되고 유령 칩이 뜬다. */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fText, setFText] = useState('');     // 검색어 — SEARCHABLE=false 면 입력이 숨겨져 ''로 고정(무발동)
  const [fScope, setFScope] = useState<WorkforceScope>('운용사');   // 목업에 '전체' 옵션이 없다 → 기본 '운용사'
  const [fTarget, setFTarget] = useState('');  // '' = 전체(미적용)
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  /* ⚠ 스코프를 바꾸면 대상을 **반드시 리셋**한다(목업 `fillTarget()` 이 옵션을 통째로 갈아끼우는 것과 동형).
     리셋하지 않으면 자펀드명이 남은 채 스코프만 '운용사'로 바뀌어 `mgr` 컬럼과 비교돼
     **0행이 조용히** 나온다(select 는 매칭 옵션이 없어 빈칸으로 보인다). */
  const changeScope = (v: string) => { setFScope(v as WorkforceScope); setFTarget(''); };
  /* `fScope` 는 필터가 아니라 스코프라 초기화에서도 '전체'가 아닌 기본 스코프('운용사')로 되돌린다. */
  const clearFilters = () => { setFText(''); setFScope('운용사'); setFTarget(''); setFFrom(''); setFTo(''); };

  /* 행 필터. 기간은 행의 **`변동일자`**(YYYY-MM-DD) 범위다 — 경계도 같은 일 단위라 그대로 비교한다
     (기준년월로 걸며 쓰던 `.slice(0,7)` 절단을 여기 옮기면 안 된다:
      `'2026-02' < '2026-02-01'` 이 참이라 같은 달 행이 조용히 탈락한다).
     ⚠ 빈 값은 '열린 경계'다. `d <= ''` 로 비교하면 모든 행이 탈락한다(apfs-datepicker 범위 함정). */
  const passes = useCallback((r: WorkforceRow) => {
    if (fText && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase()))) return false;
    if (fTarget && (fScope === '운용사' ? r.mgr : r.fund) !== fTarget) return false;
    if (fFrom && r.cdate < fFrom) return false;
    if (fTo && r.cdate > fTo) return false;
    return true;
  }, [fText, fScope, fTarget, fFrom, fTo]);
  /* ⚠ `fScope` 는 **여기 넣지 않는다** — 항상 값이 있어(''가 될 수 없다) 넣는 순간 외부 필터가
     영구 ON 이 되고, 지울 수 없는 칩이 생긴다. `fTarget` 이 비면 스코프는 아무 일도 하지 않는다. */
  const filterActive = Boolean(fText || fTarget || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<WorkforceRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 최신 `passes` 를 ref 로 들고 있는다 — onRowDataUpdated 의 deps 를 [] 로 고정하기 위해서다.
     AG Grid 콜백 identity 가 렌더마다 바뀌면 그리드가 리스너를 재바인딩한다(apfs-aggrid ⑦).
     ⚠ useEffect 가 아니라 **렌더 본문**에서 갱신한다 — 자식(AgGridReact)의 effect 가 부모보다 먼저
       돌아서, 필터와 행이 같은 커밋에서 바뀌면 effect 동기화 ref 는 낡은 술어를 보게 된다. */
  const passesRef = useRef(passes);
  passesRef.current = passes;

  /* 신규 등록 행은 선두 삽입 후 선택을 그 행으로 옮긴다 — 다음 액션(해제등록)이 바로 보인다.
     그리드 체크박스는 rowData 반영 뒤에야 노드가 생기므로 onRowDataUpdated 에서 맞춘다. */
  const pendingSelect = useRef<string | null>(null);
  const onGridReady = useCallback((e: GridReadyEvent<WorkforceRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<WorkforceRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<WorkforceRow> }) => {
    const id = pendingSelect.current;
    if (!id) return;
    pendingSelect.current = null;   // 1회성 — 남겨 두면 이후 모든 행 변경이 선택을 되돌린다
    /* ⚠ 필터로 **화면에 없는** 행은 선택하지 않는다. AG Grid 는 외부 필터에 걸린 행도 노드를 유지하므로
       무조건 setSelected 하면 그리드엔 보이지 않는데 selbar 만 "1건 선택됨"으로 떠서
       해제등록이 보이지 않는 행에 걸린다(등록 변동일자 vs 과거 기간 필터).
       대신 필터를 풀어 주지도 않는다 — 사용자가 건 필터를 뺏는 쪽이 더 놀랍다. */
    const node = e.api.getRowNode(id);
    if (!node?.data || !passesRef.current(node.data)) return;
    e.api.deselectAll();
    node.setSelected(true, true);
  }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState 는 렌더 루프 유발(aggrid-onpaginationchanged-render-loop) */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* ── 액션(목업 툴바 등록 · 해제등록) — 수정·삭제는 없다 ── */
  const selectedRows = () => apiRef.current?.getSelectedRows() ?? [];
  const openCreate = () => setModal({ kind: 'form' });
  const openRelease = () => {
    const ids = selectedRows().map((r) => r.id);
    if (!ids.length) return;
    setModal({ kind: 'release', ids });
  };

  /* ── 저장/해제 커밋 ── */
  const saveForm = (v: WorkforceFormValues) => {
    if (modal?.kind !== 'form') return;
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
    /* backdate/detail 은 그리드 컬럼이 없지만 행에 싣는다 — 입력값이 조용히 증발하지 않도록(파일 헤더). */
    const row: WorkforceRow = {
      id: crypto.randomUUID(), no: nextNo, gubun: '등록', rdate: null,
      ym: v.ym ?? '', hr: v.hr ?? '', mgr: v.mgr ?? '', fund: v.fund ?? '',
      cdate: v.cdate ?? '', backdate: v.backdate ?? '', detail: v.detail ?? '',
    };
    pendingSelect.current = row.id;
    setRows((prev) => [row, ...prev]);
    setModal(null);
  };
  /* 해제등록 — 목업은 토스트만 띄우지만 우리는 상태를 들고 있으므로 실제로 전이시킨다.
     해제일자는 **오늘**이다(목업 원문 "해제일자는 오늘 날짜로 기록됩니다" — 입력받지 않는다).
     불변 갱신(map + 스프레드) — 원본 배열·행 객체를 mutate 하지 않는다.
     ⚠ 토스트를 여기서 띄운다 — AlertDialog 에는 SaveButton 의 submit 계약이 없다(commitDelete 와 동형). */
  const commitRelease = () => {
    if (modal?.kind !== 'release') return;
    const ids = new Set(modal.ids);
    const rdate = today();
    setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, gubun: '해제' as WorkforceKind, rdate } : r)));
    setModal(null);
    toast.success(`${mn(String(ids.size))}건 해제등록 되었습니다`);
  };

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더 8컬럼(병합 없음·합계행 없음). 마스크 ON 이면 숫자 0·텍스트 '' ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '자펀드' ? 30 : c.header === '운용사' ? 22 : c.header === 'No' ? 6 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET);
    /* 기간은 기본값이 없다 — **빈 쪽 조각을 생략**한다(`_2026-01-01~` · `_~2026-04-30`).
       둘 다 비면 기간 조각 자체가 빠진다. 없는 경계에 '처음/끝' 같은 말을 지어내지 않는다. */
    const period = fFrom || fTo ? `_${fFrom}~${fTo}` : '';
    XLSX.writeFile(wb, `${EXPORT_BASENAME}${period}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  /* 적용 필터 칩 — 항목별 개별 칩, **값만 표시**(항목명 접두사 없음) + ×. 값은 <MT>·날짜는 mn().
     기간은 한쪽만 채워도 칩이 뜬다(빈 쪽은 열린 경계로 표시).
     ⚠ `구분`(스코프)은 칩이 없다 — 행을 거르지 않는 modifier 라 끌 것이 없다(위 filterActive 주석 참조).
       대상 칩의 aria-label 은 드로어 라벨과 같은 `운용사/자펀드` 로 고정한다(스코프가 바뀌어도 안정적). */
  const chips = ([
    { key: '검색어', on: !!fText, value: <MT>{fText}</MT>, clear: () => setFText('') },
    { key: '운용사/자펀드', on: !!fTarget, value: <MT>{fTarget}</MT>, clear: () => setFTarget('') },
    { key: '기간', on: !!(fFrom || fTo), value: `${fFrom ? mn(fFrom) : ''} ~ ${fTo ? mn(fTo) : ''}`, clear: () => { setFFrom(''); setFTo(''); } },
  ] as { key: string; on: boolean; value: React.ReactNode; clear: () => void }[]).filter((c) => c.on);

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다.
     그래서 선택 시 toolbarLeft 는 비운다(둘 다 넘기면 탭 스톱이 2벌 된다).
     ⚠ selbar 에 대상명·취소 안내 캡션을 넣지 않는다(apfs-manage-page 5절).
     ⚠ 도메인 액션은 `해제등록` 하나뿐 — 수정·삭제 버튼을 만들지 않는다(목업에 없다). */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{mn(String(selCount))}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="check" onClick={openRelease}>해제등록</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '운용인력 변동관리']}
      title="운용인력 변동관리"
      cardTitle="운용인력 변동관리"
      favRoute="운용인력 변동관리"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selCount > 0 || chips.length === 0 ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {c.value}
              <button type="button" onClick={c.clear} aria-label={c.key + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={openCreate}>운용인력변동 등록</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<WorkforceRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          localeText={NO_ROWS_LOCALE}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 운용인력 변동이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(구분 · 운용사/자펀드 · 기간) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">운용인력 변동 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="운용사 · 자펀드 · 인력구분 등 전 컬럼 검색" style={inputStyle('text')} />
              </DrawerField>
            )}
            {/* 구분 — **스코프 스위치**(운용사/자펀드). 전체 옵션 없음(목업 원문) → `all={null}` 로 명시 억제.
                그리드 컬럼 `구분`(등록/해제)과는 라벨만 같고 무관하다(위 상태 선언부 경고 참조). */}
            <DrawerField label="구분">
              <DrawerSelect value={fScope} onChange={changeScope} options={SCOPE_VALUES} all={null} />
            </DrawerField>
            {/* 운용사/자펀드 — 옵션이 구분에 따라 통째로 바뀐다(목업 `LISTS` + `fillTarget()`).
                전체 옵션은 DrawerSelect 기본값('전체', value='')이라 `all` 을 넘기지 않는다(패밀리 관용구).
                구분을 바꾸면 값이 '전체'('')로 리셋된다(changeScope) — 안 하면 0행이 조용히 나온다. */}
            <DrawerField label="운용사/자펀드">
              <DrawerSelect value={fTarget} onChange={setFTarget} options={SCOPE_OPTIONS[fScope]} />
            </DrawerField>
            {/* 기간 — 목업 `<label for="f-from">기간</label>` 한 줄(시작 `~` 종료). **기본값 없음**.
                PeriodPicker 는 <label>로 명명되지 않으므로 plain + ariaLabel, 트리거가 w-full 이라 fit-content 래퍼 필수. */}
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기간 시작" /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기간 종료" /></div>
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 팝업 2종 — 등록(목업 openReg) · 해제등록 확인(목업 openRelease · alertdialog) ── */}
      {modal?.kind === 'form' && (
        <WorkforceFormModal initial={CREATE_INITIAL()} onSave={saveForm} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'release' && (
        <WorkforceReleaseDialog count={modal.ids.length} onConfirm={commitRelease} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
