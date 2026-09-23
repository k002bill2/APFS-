/* 운용사 소송관리 — 관리형 리스트 페이지 (조기경보 > 조기경보 > 운용사 소송관리).
   출처: S2_57_소송관리.html(KRDS TO-BE) + 등록화면 S2_58(목업 하단 `openReg()` 로 이미 흡수됨)
   → APFS 디자인시스템으로 변형. 형제 `*_spec.json` 은 없다(HTML 이 유일한 정본).
   형제 골드 2개의 합성이다:
   - `shareholder_manage.tsx`(S2_55 주주변동관리) — **골격 골드**. 해제등록 의미론·월픽커·8컬럼 flex 폭 전략이 동형.
   - `violation_manage.tsx`(S2_53 법률/규약위반사항 관리) — **수정/삭제 selbar 배선 골드**.
   규약 판단이 갈리면 위 두 파일의 실제 코드가 진실이다.

   ⚠ 메뉴 라벨과 목업 제목이 다르다 — 목업 h1 은 "소송관리" 지만 우리 메뉴 리프(data.ts)는
     **"운용사 소송관리"** 다. title·cardTitle·favRoute·crumbs 리프는 전부 **메뉴 라벨**을 쓴다
     (라우트 키 = 한글 라벨이라 한 글자만 어긋나도 즐겨찾기·딥링크가 조용히 빗나간다).

   구성(목업 → 우리 규약)
   - 검색박스 2항목(운용사·기간) → **상세필터 드로어**(Sheet). 툴바 FilterChip 세트는 만들지 않는다
     (주 필터로 삼을 열거형 축이 없다 — 운용사는 옵션이 1개뿐이다).
     검색어는 OFF(목업에 없음 — `SEARCHABLE` 게이트).
     ⚠ 기간 기본값 없음 — 목업은 `2023-01-01 ~ 2023-12-31` 리터럴이지만 그 값은 목업 더미의 시점이라
       실화면에서 의미가 없다. 시작·종료 둘 다 빈 값으로 시작하고, 빈 쪽은 무제한 경계다(형제 2화면 동일).
   - 목업 [조회] 버튼 → 만들지 않는다(백엔드가 없어 필터가 즉시 반영된다 — 형제 골드 동일 판단).
   - 목업 [등록] → 툴바 독립 버튼 `소송 등록`(상세필터 오른쪽·새로고침 왼쪽) + `⌘⏎`.
   - 목업 [수정]·[삭제]·[해제등록] → **행 선택 selbar**(GridFrame contextActions · violation 배선 그대로).
     `수정`은 목업이 명시적으로 1건 전용(`'수정할 소송을 1건만 선택하세요'`)이라 multiRow 여도 1건 게이트를 둔다.
   - 목업 [엑셀] → 툴바가 아니라 푸터 `FooterActions` 내보내기 + `⌥D`(apfs-grid 푸터 골드 양식).
   - 목록 그리드 → AG Grid **단일 헤더 8컬럼**(목업 thead 순서 그대로). **2단 그룹헤더 없음**,
     **합계행 없음**(전 컬럼이 문자/날짜라 가산 개념이 없다 → pinnedBottomRowData 자체를 두지 않는다).
   - `구분` 셀 → `StatusBadge size="lg" dot={false}`. 등록=info · 해제=muted(형제 2화면과 동일 매핑,
     2026-09-22 사용자 결정 — #228 이 신설한 중립 톤. 이전 success 를 대체한다).
     `확정구분` 셀도 같은 배지 — 확정=success · 미확정=warning(목업 `.tag g` / `.tag a` 대응).
     ⚠ 이 화면만 배지 컬럼이 2개다. 해제가 success 이던 동안 `구분:해제` 와 `확정구분:확정` 이 같은
     민트로 겹쳐 보였는데, 해제가 muted 로 바뀌며 해소됐다(형제 2화면은 배지 컬럼이 1개라 무관).
   - `소송내역` 은 장문 좌측정렬 컬럼이다(목업 `td.l` + doc-sub "소송내역은 장문 표시로 셀 줄바꿈")
     → `wrapText` + `autoHeight`. 그래서 `truncate` 렌더러를 쓰지 않는다(잘라 버리면 autoHeight 가 늘 근거를 잃는다).
   - KPI 배지 행 → **미포함**(2026-09-22 사용자 HITL 결정) → `kpis` prop 을 아예 넘기지 않는다
     (GridFrame 이 `{kpis && …}` 라 영역째 사라진다). 이 화면은 **금액 개념 자체가 없어** 제네릭 금액 KPI 가
     붙을 자리도 없다 — 스키마 트랙의 `hideMetrics` 에 해당하는 추가 배선은 typed 트랙엔 존재하지 않는다
     (형제 2화면과 동일하게 아무것도 쓰지 않는 것이 정답이다). 재질문 방지용으로 여기 기록해 둔다.
   - ⚠검토필요 마커 → **구현하지 않는다**(형제 2화면과 동일한 사용자 결정 · ReviewMarker 를 import 하지 않는다).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모([확인 필요] 3블록)·리스트바 `총 N건`·
   목업 자체 월픽커/토스트/스크롤락 JS 는 셸·푸터·우리 컴포넌트가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - 더미 3행은 목업 `DATA` **원문 그대로**다(값·null 포함). 행을 새로 만들지 않는다.
   - `no` 는 **행에 고정된 값**이다(정렬 가능한 그리드에서 연번을 재계산하면 정렬과 싸운다 — 형제 골드 동일 결정).
     삭제하면 번호에 구멍이 남는다.
   - **해제등록 팝업은 원문에 정의가 없다** — 목업 `$('release')` 는 토스트만 띄운다. 그런데 그리드에
     `해제일자` 컬럼이 있어 값이 와야 하므로 형제 S2_55 의 `RELEASE_SCHEMA` 규격(선택 대상 readonly +
     해제일자 required)을 **차용**했다(→ litigation_manage_schemas.ts 헤더의 '가정'). 창작이 아니다.
   - 해제등록은 **`구분`='등록' 행에만** — 선택에 '해제' 행이 있으면 버튼 숨김 + openRelease 가드 +
     commitRelease 는 '등록' 행만 전이(2026-09-23 사용자 결정, 목업은 막지 않았음). 목업이 토스트만 띄우는 것과 달리 우리는 상태를 들고 있으므로
     선택 행의 `구분`→'해제', `해제일자`→입력값으로 실제 전이시킨다(불변 갱신 — 원본 배열을 건드리지 않는다). */
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
import { LitigationFormModal, LitigationReleaseModal, LitigationDeleteDialog } from './litigation_form_modal';
import type { LitigationFormValues } from './litigation_form_modal';
import { OPT_GP } from './litigation_manage_schemas';

const { Button, IconBtn, StatusBadge } = UI;

/* 검색어 입력은 기본 OFF(opt-in) — 목업 검색박스에 없다(apfs-detail-filter "예약 라벨 검색어").
   상태(`fText`)·행 필터·칩 배선은 남겨 두고 **드로어 입력만** 이 플래그로 가린다(정본 asset_funding·permission_history).
   입력이 숨겨져 값이 ''로 고정되므로 필터는 자연 무발동이고, `true` 한 줄로 전 컬럼 부분일치 검색이 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   도메인 타입
────────────────────────────── */
/** 그리드 `구분` — 목업 `gubun`. 소송 등록 상태 ↔ 해제 상태. */
export type LitigationKind = '등록' | '해제';
/** 그리드 `확정구분` — 목업 `conf`(등록 팝업 radio 와 같은 값 도메인). */
export type LitigationConf = '확정' | '미확정';
const KIND_TONE: Record<LitigationKind, Tone> = { 등록: 'info', 해제: 'muted' };
const CONF_TONE: Record<LitigationConf, Tone> = { 확정: 'success', 미확정: 'warning' };

export interface LitigationRow {
  id: string; no: number;
  ym: string;             // 기준년월 'YYYY-MM'(등록 폼의 `등록년월`)
  gubun: LitigationKind;  // 구분(등록/해제)
  mgr: string;            // 운용사
  detail: string;         // 소송내역(등록 폼의 `소송내용`) — 장문·좌측정렬
  conf: LitigationConf;   // 확정구분(확정/미확정)
  sdate: string;          // 소송일자 'YYYY-MM-DD'
  /* 해제일자 — 미해제 행은 **null**(목업 DATA 원문 그대로). 화면에선 '-' 로 렌더한다.
     ⚠ 텍스트/날짜 N/A 표시는 `'-'`, 숫자 N/A 만 `null` 이 규약인데 여기 null 은 **저장값**이고
       표시값이 아니다 — `dateFmt` 가 falsy 를 '-' 로 바꾼다. */
  rdate: string | null;
}

/* 데모 데이터 — 목업 `DATA` 3행 원문 그대로(null 포함). 행을 새로 만들지 않는다. */
const DEMO: LitigationRow[] = [
  { id: 'lg-1', no: 1, ym: '2023-01', gubun: '등록', mgr: '캐피탈원(주)', detail: '1. 소송 원고: [캐피탈원농림수산식품투자조합] 청산인 정동회계법인', conf: '확정', sdate: '2023-01-04', rdate: null },
  { id: 'lg-2', no: 2, ym: '2023-03', gubun: '등록', mgr: '캐피탈원(주)', detail: '2. 소송 원고: [캐피탈원농림수산식품투자조합] · 피고: 투자기업 A — 대여금 반환 청구', conf: '확정', sdate: '2023-03-15', rdate: null },
  { id: 'lg-3', no: 3, ym: '2023-06', gubun: '해제', mgr: '캐피탈원(주)', detail: '3. 소송 원고: [캐피탈원농림수산식품투자조합] · 피고: 투자기업 A — 조정 성립에 따른 소송 종결', conf: '확정', sdate: '2023-03-15', rdate: '2023-06-30' },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더 8컬럼):
     No · 기준년월 · 구분 · 운용사 · 소송내역 · 확정구분 · 소송일자 · 해제일자
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음). 8컬럼 내용 폭 합이 프레임보다 좁아
     내용 맞춤(`AUTO_SIZE_CONTENT`)을 쓰면 `해제일자` 오른쪽에 빈 거터가 남는다
     (apfs-aggrid "좁은 매트릭스/집계 그리드" 규약 · 형제 골드 shareholder_manage 와 같은 8컬럼 상황).
     **형제 violation_manage 를 그대로 베끼면 안 되는 지점**이다 — 그쪽은 15컬럼이라 넘쳐서 내용 맞춤이 맞다.
     여기엔 두 번째 이유도 있다: `소송내역` 이 `wrapText`(줄바꿈) 컬럼이라 `fitCellContents` 는
     **줄바꿈 안 한 한 줄 폭**을 재서 표를 옆으로 터뜨린다.
     가중치는 내용 길이 비례: 문장인 `소송내역` 이 가장 크다.
     고정폭 유지: `No`(연번) · `구분`/`확정구분`(배지 1종 폭) — flex 없이 width 로 둔다.
   ⚠ 좌측 고정은 No 만 — 다른 컬럼에 pinned 를 주면 목업 순서가 깨진다.
   모듈 스코프 상수다(렌더마다 새 배열이면 AG Grid 가 헤더를 remount 하고 폭을 되돌린다 — apfs-aggrid ⑦).
   ⚠ flex 컬럼에도 `width: minWidth` 를 **반드시** 준다(2026-09-22 실측, apfs-aggrid ⑨) — flex 가 적용되기 전 첫
     레이아웃에서 AG Grid 는 flex 컬럼을 기본폭 200px 로 깔고, 초기폭 합이 뷰포트에 가깝거나 넘으면 마운트 중
     가로 스크롤 띠가 잠깐 켜진다. 곧 flex 가 폭을 맞춰 띠는 꺼져야 하는데, AG Grid 35.3.1 에서 넘침 0
     (scrollWidth === clientWidth)인데도 11px 스크롤 띠(그리드 하단 회색 라인)가 남는 일이 리로드 10회 중 3회
     (1280 프레임)·1회(1500 프레임) 있었다 — 내부 원인은 미확정(캐시 가설은 소스 대조로 기각됨). 초기폭을 minWidth 로
     낮추면 두 레이아웃 합계 0/20. width 는 flex 적용 뒤 무시된다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
/* 줄바꿈 셀(소송내역) — 위 정렬 + 사용자 줄바꿈 보존(pre-line). autoHeight 가 늘릴 수 있도록
   세로 패딩을 직접 준다(정본 패턴: generic_list.tsx 의 `multiline` 컬럼). */
const wrapLeft: CellStyle = { display: 'flex', alignItems: 'flex-start', whiteSpace: 'pre-line', lineHeight: 1.5, paddingTop: 8, paddingBottom: 8 };

/* 텍스트 N/A 는 '-'(숫자 N/A 의 null 규약과 다른 축 — 이 화면엔 숫자 컬럼이 없다).
   flex 셀은 AG Grid 기본 ellipsis 가 안 먹으므로 내부 span 에 truncate 를 준다. */
const textCell = (p: { value?: string }) => (p.value
  ? <span className="min-w-0 truncate"><MT>{p.value}</MT></span>
  : <span className="text-muted-foreground">-</span>);
/* ⚠ 줄바꿈 컬럼 전용 렌더러 — `truncate`(ellipsis 1줄)를 **주지 않는다**. 주면 wrapText/autoHeight 가
   늘어날 근거를 잃어 장문이 한 줄로 잘린다(목업 `td.l { white-space: normal }` 과 어긋남). */
const wrapCell = (p: { value?: string }) => (p.value
  ? <span className="min-w-0"><MT>{p.value}</MT></span>
  : <span className="text-muted-foreground">-</span>);
const kindCell = (p: { value: LitigationKind }) => <StatusBadge tone={KIND_TONE[p.value]} label={p.value} size="lg" dot={false} />;
const confCell = (p: { value: LitigationConf }) => <StatusBadge tone={CONF_TONE[p.value]} label={p.value} size="lg" dot={false} />;
/* 날짜 셀 — 행 데이터(축이 아니다)라 mn(). 빈 값·null 은 '-' */
const dateFmt = (p: { value?: string | null }) => (p.value ? mn(p.value) : '-');

const txt = (field: keyof LitigationRow, headerName: string, flex: number, minWidth: number, center?: boolean): ColDef<LitigationRow> => ({
  field, headerName, flex, minWidth, width: minWidth, cellStyle: center ? flexMid : flexCenter, cellRenderer: textCell,
});
const date = (field: keyof LitigationRow, headerName: string, flex: number, minWidth: number): ColDef<LitigationRow> => ({
  field, headerName, flex, minWidth, width: minWidth, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: dateFmt,
});

const COLUMNS: ColDef<LitigationRow>[] = [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'ym', headerName: '기준년월', flex: 0.7, minWidth: 96, width: 96, cellStyle: centerNum, valueFormatter: dateFmt },
  { field: 'gubun', headerName: '구분', width: 96, minWidth: 96, cellStyle: flexMid, cellRenderer: kindCell },
  txt('mgr', '운용사', 1.2, 150),
  /* 소송내역 = 유일한 문장 컬럼 → 가장 큰 가중치로 잉여 폭을 흡수 + 줄바꿈(목업 td.l · 설계메모 "셀 줄바꿈").
     maxWidth 상한을 둬 좁은 창에서 다른 컬럼을 밀어내지 않게 한다. */
  { field: 'detail', headerName: '소송내역', flex: 3.2, minWidth: 260, width: 260, maxWidth: 560, autoHeight: true, wrapText: true, cellStyle: wrapLeft, cellRenderer: wrapCell },
  { field: 'conf', headerName: '확정구분', width: 104, minWidth: 104, cellStyle: flexMid, cellRenderer: confCell },
  date('sdate', '소송일자', 0.85, 120),
  date('rdate', '해제일자', 0.85, 120),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 단일 헤더라 병합 없음.
   ⚠ `rdate` 는 null 가능 → `?? ''`(엑셀 빈 셀). XCol 계약이 string|number 다. */
type XCol = { header: string; get: (r: LitigationRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '구분', get: (r) => r.gubun },
  { header: '운용사', get: (r) => r.mgr },
  { header: '소송내역', get: (r) => r.detail },
  { header: '확정구분', get: (r) => r.conf },
  { header: '소송일자', get: (r) => r.sdate },
  { header: '해제일자', get: (r) => r.rdate ?? '' },
];

/* 행 선택 — 삭제·해제등록이 N건에 그대로 적용되는 액션이라 multiRow(apfs-aggrid "체크박스" 절).
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
  noRowsToShow: '조회 조건에 해당하는 소송이 없습니다.',
  noMatchingRows: '조회 조건에 해당하는 소송이 없습니다.',
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
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* 기간 PeriodPicker 래퍼 — 트리거가 `w-full` 이라 감싸지 않으면 드로어 전 폭으로 늘어난다(apfs-datepicker) */
const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 엑셀 파일명 — 라우트에 경로 구분자·Excel 금칙문자가 없어 라벨을 그대로 쓴다.
   시트명은 31자 제한이 있어 짧은 형태로 둔다. */
const EXPORT_BASENAME = '운용사 소송관리';
const EXPORT_SHEET = '소송관리';

/* 행 → 등록/수정 폼 초기값. 폼 필드 키만 골라 넘긴다(id·no·gubun·rdate 는 폼이 다루지 않는 행 메타).
   ⚠ 행을 통째로 캐스팅해 넘기지 않는다 — 스키마에 없는 키가 섞이면 저장 시 조용히 되돌아올 수 있다. */
const formInitial = (r: LitigationRow): Record<string, string> => ({
  ym: r.ym, mgr: r.mgr, sdate: r.sdate, conf: r.conf, detail: r.detail,
});
/* 등록 모드는 등록년월(필수)을 이번 달로 미리 채운다 — 목업도 `<input id="rm-ym" value="2026-07">` 로 프리필한다.
   ⚠ 클릭 시점에 계산한다(모듈 상수로 두면 오래 열린 탭이 달을 넘겨도 낡은 값). toISOString 금지(KST off-by-one). */
const CREATE_INITIAL = (): Record<string, string> => ({ ym: format(new Date(), 'yyyy-MM') });

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState =
  | null
  | { kind: 'form'; mode: 'create' | 'edit'; row?: LitigationRow }
  | { kind: 'release'; ids: string[] }
  | { kind: 'delete'; ids: string[] };

export function LitigationManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<LitigationRow> | null>(null);
  const [rows, setRows] = useState<LitigationRow[]>(DEMO);
  /* 선택은 **id 집합**만 state — 행 자체는 그리드가 SSOT. 파생값은 React `rows` 에서 읽는다:
     해제등록 직후 행이 '해제'로 바뀌어도 selectionChanged 는 발생하지 않으므로, 렌더 시 getSelectedRows() 는 낡는다. */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const selHasReleased = useMemo(() => rows.some((r) => r.gubun === '해제' && selIds.includes(r.id)), [rows, selIds]);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);
  const masked = useMask();

  /* 앱-스코프 단축키. 모달이 떠 있는 동안에는 등록(이중 열림)·내보내기(모달 위 다운로드)를 막는다. */
  useHotkey(HOTKEYS.register.combo, () => openCreate(), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null });

  /* ── 필터 SSOT(빈 값 = 미적용) — 목업 검색박스 2항목 순서 그대로(운용사 · 기간) ── */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fText, setFText] = useState('');     // 검색어 — SEARCHABLE=false 면 입력이 숨겨져 ''로 고정(무발동)
  const [fMgr, setFMgr] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const clearFilters = () => { setFText(''); setFMgr(''); setFFrom(''); setFTo(''); };

  /* 행 필터. 기간은 행의 **`소송일자`**(YYYY-MM-DD) 범위다 — 경계도 같은 일 단위라 그대로 비교한다
     (형제 화면이 기준년월로 걸며 쓰던 `.slice(0,7)` 절단을 여기 옮기면 안 된다:
      `'2023-01' < '2023-01-01'` 이 참이라 같은 달 행이 조용히 탈락한다).
     ⚠ 빈 값은 '열린 경계'다. `d <= ''` 로 비교하면 모든 행이 탈락한다(apfs-datepicker 범위 함정). */
  const passes = useCallback((r: LitigationRow) => {
    if (fText && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase()))) return false;
    if (fMgr && r.mgr !== fMgr) return false;
    if (fFrom && r.sdate < fFrom) return false;
    if (fTo && r.sdate > fTo) return false;
    return true;
  }, [fText, fMgr, fFrom, fTo]);
  const filterActive = Boolean(fText || fMgr || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<LitigationRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 최신 `passes` 를 ref 로 들고 있는다 — onRowDataUpdated 의 deps 를 [] 로 고정하기 위해서다.
     AG Grid 콜백 identity 가 렌더마다 바뀌면 그리드가 리스너를 재바인딩한다(apfs-aggrid ⑦).
     ⚠ useEffect 가 아니라 **렌더 본문**에서 갱신한다 — 자식(AgGridReact)의 effect 가 부모보다 먼저
       돌아서, 필터와 행이 같은 커밋에서 바뀌면 effect 동기화 ref 는 낡은 술어를 보게 된다. */
  const passesRef = useRef(passes);
  passesRef.current = passes;

  /* 신규 등록 행은 선두 삽입 후 선택을 그 행으로 옮긴다 — 다음 액션(수정·삭제·해제등록)이 바로 보인다.
     그리드 체크박스는 rowData 반영 뒤에야 노드가 생기므로 onRowDataUpdated 에서 맞춘다. */
  const pendingSelect = useRef<string | null>(null);
  const onGridReady = useCallback((e: GridReadyEvent<LitigationRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<LitigationRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<LitigationRow> }) => {
    const id = pendingSelect.current;
    if (!id) return;
    pendingSelect.current = null;   // 1회성 — 남겨 두면 이후 모든 행 변경이 선택을 되돌린다
    /* ⚠ 필터로 **화면에 없는** 행은 선택하지 않는다. AG Grid 는 외부 필터에 걸린 행도 노드를 유지하므로
       무조건 setSelected 하면 그리드엔 보이지 않는데 selbar 만 "1건 선택됨"으로 떠서
       수정·삭제·해제등록이 보이지 않는 행에 걸린다(등록 소송일자 vs 과거 기간 필터).
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

  /* ── 선택 액션(목업 툴바 수정·삭제·해제등록) ── */
  const selectedRows = () => apiRef.current?.getSelectedRows() ?? [];
  const openCreate = () => setModal({ kind: 'form', mode: 'create' });
  const openEdit = () => {
    const sel = selectedRows();
    /* 목업 그대로 — 1건이 아니면 토스트로 되돌린다(버튼을 숨기지 않는다) */
    if (sel.length !== 1) { toast('수정할 소송을 1건만 선택하세요'); return; }
    setModal({ kind: 'form', mode: 'edit', row: sel[0] });
  };
  const openDelete = () => {
    const ids = selectedRows().map((r) => r.id);
    if (!ids.length) return;
    setModal({ kind: 'delete', ids });
  };
  const openRelease = () => {
    const sel = selectedRows();
    if (!sel.length) return;
    /* 방어 가드 — 버튼은 숨기지만 우클릭·단축키 등 다른 진입 경로 대비(openEdit 1건 가드와 동형) */
    if (sel.some((r) => r.gubun === '해제')) { toast('이미 해제된 행은 해제등록할 수 없습니다'); return; }
    const ids = sel.map((r) => r.id);
    setModal({ kind: 'release', ids });
  };

  /* ── 저장/삭제/해제 커밋 ── */
  const saveForm = (v: LitigationFormValues) => {
    if (modal?.kind !== 'form') return;
    const patch = {
      ym: v.ym ?? '', mgr: v.mgr ?? '', sdate: v.sdate ?? '',
      conf: (v.conf ?? '') as LitigationConf, detail: v.detail ?? '',
    };
    if (modal.mode === 'edit' && modal.row) {
      const id = modal.row.id;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } else {
      const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
      const row: LitigationRow = { id: crypto.randomUUID(), no: nextNo, gubun: '등록', rdate: null, ...patch };
      pendingSelect.current = row.id;
      setRows((prev) => [row, ...prev]);
    }
    setModal(null);
  };
  const commitDelete = () => {
    if (modal?.kind !== 'delete') return;
    const ids = new Set(modal.ids);
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    apiRef.current?.deselectAll();
    setModal(null);
    toast.success(`${mn(String(ids.size))}건 삭제되었습니다`);
  };
  /* 해제등록 — 목업은 토스트만 띄우지만 우리는 상태를 들고 있으므로 실제로 전이시킨다(파일 상단 '한계' 참조).
     불변 갱신(map + 스프레드) — 원본 배열·행 객체를 mutate 하지 않는다. */
  const commitRelease = ({ rdate }: { rdate: string }) => {
    if (modal?.kind !== 'release') return;
    const ids = new Set(modal.ids);
    setRows((prev) => prev.map((r) => (ids.has(r.id) && r.gubun === '등록' ? { ...r, gubun: '해제' as LitigationKind, rdate } : r)));
    setModal(null);
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
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '소송내역' ? 48 : c.header === '운용사' ? 22 : c.header === 'No' ? 6 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET);
    /* 기간은 기본값이 없다 — **빈 쪽 조각을 생략**한다(`_2023-01-01~` · `_~2023-12-31`).
       둘 다 비면 기간 조각 자체가 빠진다. 없는 경계에 '처음/끝' 같은 말을 지어내지 않는다. */
    const period = fFrom || fTo ? `_${fFrom}~${fTo}` : '';
    XLSX.writeFile(wb, `${EXPORT_BASENAME}${period}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  /* 적용 필터 칩 — 항목별 개별 칩, **값만 표시**(항목명 접두사 없음) + ×. 값은 <MT>·날짜는 mn().
     기간은 한쪽만 채워도 칩이 뜬다(빈 쪽은 열린 경계로 표시). */
  const chips = ([
    { key: '검색어', on: !!fText, value: <MT>{fText}</MT>, clear: () => setFText('') },
    { key: '운용사', on: !!fMgr, value: <MT>{fMgr}</MT>, clear: () => setFMgr('') },
    { key: '기간', on: !!(fFrom || fTo), value: `${fFrom ? mn(fFrom) : ''} ~ ${fTo ? mn(fTo) : ''}`, clear: () => { setFFrom(''); setFTo(''); } },
  ] as { key: string; on: boolean; value: React.ReactNode; clear: () => void }[]).filter((c) => c.on);

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다.
     그래서 선택 시 toolbarLeft 는 비운다(둘 다 넘기면 탭 스톱이 2벌 된다).
     ⚠ selbar 에 대상명·취소 안내 캡션을 넣지 않는다(apfs-manage-page 5절). */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{mn(String(selCount))}건 선택됨</span>
      {/* 수정은 **단건 체크일 때만** — 다건 선택에 수정 모달은 의미가 없다(2026-09-23 사용자 결정, 전 리스트 공통).
          openEdit 안의 1건 가드는 방어로 남긴다(우클릭·단축키 등 다른 진입 경로). */}
      {selCount === 1 && <Button variant="primary" size="sm" leadingIcon="file" onClick={openEdit}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={openDelete}>삭제</Button>
      {/* 이미 해제된 행은 다시 해제등록할 수 없다 — 2026-09-23 사용자 결정 */}
      {!selHasReleased && <Button variant="outline" size="sm" leadingIcon="check" onClick={openRelease}>해제등록</Button>}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '운용사 소송관리']}
      title="운용사 소송관리"
      cardTitle="운용사 소송관리"
      favRoute="운용사 소송관리"
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
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={openCreate}>소송 등록</Button>
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
        <AgGridReact<LitigationRow>
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
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 소송이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(운용사 · 기간) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">운용사 소송 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="운용사 · 소송내역 · 확정구분 등 전 컬럼 검색" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="운용사"><DrawerSelect value={fMgr} onChange={setFMgr} options={OPT_GP} /></DrawerField>
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

      {/* ── 팝업 3종 — 등록/수정(목업 openReg) · 해제등록(원문 미정의·S2_55 차용) · 삭제 확인(openDelete) ── */}
      {modal?.kind === 'form' && (
        <LitigationFormModal
          mode={modal.mode}
          initial={modal.mode === 'edit' && modal.row ? formInitial(modal.row) : CREATE_INITIAL()}
          title={modal.mode === 'create' ? '소송 등록' : '소송 수정'}
          onSave={saveForm}
          onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'release' && (
        <LitigationReleaseModal count={modal.ids.length} onSave={commitRelease} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <LitigationDeleteDialog count={modal.ids.length} onConfirm={commitDelete} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
