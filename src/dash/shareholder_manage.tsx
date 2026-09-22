/* 운용사 주주변동관리 — 관리형 리스트 페이지 (조기경보 > 조기경보 > 운용사 주주변동관리).
   출처: S2_55_주주변동관리.html(KRDS TO-BE) + 등록화면 S2_56(팝업으로 흡수) → APFS 디자인시스템으로 변형.
   형제 골드: `violation_manage.tsx`(S2_53 법률/규약위반사항 관리) — 같은 대분류·같은 골격의 **더 단순한 버전**이다
   (컬럼 8 vs 15 · 액션 2 vs 4). 규약 판단이 갈리면 그 파일을 따른다.

   ⚠ 메뉴 라벨과 목업 제목이 다르다 — 목업 h1 은 "주주변동관리" 지만 우리 메뉴 리프(data.ts)는
     **"운용사 주주변동관리"** 다. title·cardTitle·favRoute·crumbs 리프는 전부 **메뉴 라벨**을 쓴다
     (라우트 키 = 한글 라벨이라 한 글자만 어긋나도 즐겨찾기·딥링크가 조용히 빗나간다).

   구성(목업 → 우리 규약)
   - 검색박스 2항목(운용사·기간) → **상세필터 드로어**(Sheet). 툴바 FilterChip 세트는 만들지 않는다
     (주 필터로 삼을 열거형 축이 없다 — 운용사는 옵션이 1개뿐이다).
     검색어는 OFF(목업에 없음 — `SEARCHABLE` 게이트).
     ⚠ 기간 기본값 없음(사용자 확정) — 목업은 `2024-01-01 ~ 2025-03-31` 리터럴이지만 그 값은 목업 더미의
       시점이라 실화면에서 의미가 없다. 시작·종료 둘 다 빈 값으로 시작하고, 빈 쪽은 무제한 경계다.
   - 목업 [조회] 버튼 → 만들지 않는다(백엔드가 없어 필터가 즉시 반영된다 — 형제 골드 동일 판단).
   - 목업 [등록] → 툴바 독립 버튼 `주주변동 등록`(상세필터 오른쪽·새로고침 왼쪽) + `⌘⏎`.
   - 목업 [해제등록] → **행 선택 selbar**(GridFrame contextActions). ⚠ 목업 툴바에 [수정]·[삭제]가
     **없으므로 만들지 않는다**(형제 화면엔 있었지만 이 원문엔 없다).
   - 목업 [엑셀] → 툴바가 아니라 푸터 `FooterActions` 내보내기 + `⌥D`(apfs-grid 푸터 골드 양식).
   - 목록 그리드 → AG Grid **단일 헤더 8컬럼**(목업 thead 순서 그대로). **2단 그룹헤더 없음**,
     **합계행 없음**(전 컬럼이 문자/날짜라 가산 개념이 없다 → pinnedBottomRowData 자체를 두지 않는다).
   - `구분` 셀 → `StatusBadge size="lg" dot={false}`. 등록=info · 해제=success(형제 화면과 동일 매핑).
     목업 `변동구분`도 태그(`tag a`)로 칠하지만 배지 컬럼은 `구분` 하나뿐이다 — 평문 텍스트로 렌더한다.
   - KPI 배지 행 → **미포함**(사용자 결정) → `kpis` prop 을 아예 넘기지 않는다.
   - ⚠검토필요 마커 → **구현하지 않는다**(사용자 결정 · ReviewMarker 를 import 하지 않는다).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모([확인 필요] 2블록)·총 N건 표시는
   셸/푸터가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - 더미 3행은 목업 `DATA` **원문 그대로**다(값·빈칸 포함). 행을 새로 만들지 않는다.
   - `no` 는 **행에 고정된 값**이다(정렬 가능한 그리드에서 연번을 재계산하면 정렬과 싸운다 — 형제 골드 동일 결정).
   - 해제등록에 **`구분` 게이트를 두지 않는다** — 목업도 이미 '해제'인 행을 막지 않고, 원문에 그 도메인
     규칙이 없어 임의로 만들지 않는다. 단 목업이 토스트만 띄우는 것과 달리 우리는 상태를 들고 있으므로
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
import { ShareholderFormModal, ShareholderReleaseModal } from './shareholder_form_modal';
import type { ShareholderFormValues } from './shareholder_form_modal';
import { OPT_GP } from './shareholder_manage_schemas';

const { Button, IconBtn, StatusBadge } = UI;

/* 검색어 입력은 기본 OFF(opt-in) — 목업 검색박스에 없다(apfs-detail-filter "예약 라벨 검색어").
   상태(`fText`)·행 필터·칩 배선은 남겨 두고 **드로어 입력만** 이 플래그로 가린다(정본 asset_funding·permission_history).
   입력이 숨겨져 값이 ''로 고정되므로 필터는 자연 무발동이고, `true` 한 줄로 전 컬럼 부분일치 검색이 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   도메인 타입
────────────────────────────── */
/** 그리드 `구분` — 목업 `g`. 주주변동 등록 상태 ↔ 해제 상태. */
export type ShareholderKind = '등록' | '해제';
const KIND_TONE: Record<ShareholderKind, Tone> = { 등록: 'info', 해제: 'success' };

export interface ShareholderRow {
  id: string; no: number;
  ym: string;            // 기준년월 'YYYY-MM'(등록 폼의 `등록년월`)
  g: ShareholderKind;    // 구분(등록/해제)
  gp: string;            // 운용사
  vt: string;            // 변동구분
  cont: string;          // 변동내역
  cd: string;            // 주주변동일자(등록 폼의 `변동일자`)
  rd: string;            // 해제일자
  /* 등록 팝업의 `변동사유`. **그리드에 컬럼이 없다** — 목업 thead 8컬럼에 없어 화면에 보이지 않는다
     (엑셀 EXPORT_COLS 에도 넣지 않는다 · 화면=엑셀 불변식). 그래도 상태로는 보존한다 —
     성공 토스트를 띄우면서 입력값을 버리는 건 잘못된 신호다(형제 화면 releaseReason 과 동형). */
  reason: string;
}

/* 데모 데이터 — 목업 `DATA` 3행 원문 그대로(빈 값 포함). 행을 새로 만들지 않는다. */
const DEMO: ShareholderRow[] = [
  { id: 'sh-1', no: 1, ym: '2025-03', g: '등록', gp: '(주)아이비케이캐피탈', vt: '주주변동', cont: '아이디벤처스(주)의 대주주 변경 보고', cd: '2024-11-14', rd: '', reason: '' },
  { id: 'sh-2', no: 2, ym: '2025-01', g: '해제', gp: '(주)아이비케이캐피탈', vt: '주주변동', cont: '아이디벤처스(주) 지분 재편 보고', cd: '2024-09-02', rd: '2025-01-20', reason: '' },
  { id: 'sh-3', no: 3, ym: '2024-12', g: '등록', gp: '(주)아이비케이캐피탈', vt: '주주변동', cont: '2대주주 지분 변경 보고', cd: '2024-08-11', rd: '', reason: '' },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더 8컬럼):
     No · 기준년월 · 구분 · 운용사 · 변동구분 · 변동내역 · 주주변동일자 · 해제일자
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음). 8컬럼 내용 폭 합이 프레임보다 좁아
     내용 맞춤(`AUTO_SIZE_CONTENT`)을 쓰면 `해제일자` 오른쪽에 빈 거터가 남는다
     (apfs-aggrid "좁은 매트릭스/집계 그리드" 규약 · 선례 early_warning_manage.tsx 의 가중 flex).
     **형제 화면 violation_manage 를 그대로 베끼면 안 되는 지점**이다 — 그쪽은 15컬럼이라 넘쳐서
     가로 스크롤이 나므로 내용 맞춤이 맞다. 가중치는 내용 길이 비례: 문장인 `변동내역` 이 가장 크다.
     ✗ `autoSizeStrategy={fitGridWidth}` 는 쓰지 않는다 — domLayout="autoHeight" + 지연 레이아웃에서
       생성 시점 폭에 1회만 맞춰 빈 공간이 그대로 남는다(2026-09-11 asset_funding 실측 gap 455px).
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
const kindCell = (p: { value: ShareholderKind }) => <StatusBadge tone={KIND_TONE[p.value]} label={p.value} size="lg" dot={false} />;
/* 날짜 셀 — 행 데이터(축이 아니다)라 mn(). 빈 값은 '-' */
const dateFmt = (p: { value?: string }) => (p.value ? mn(p.value) : '-');

const txt = (field: keyof ShareholderRow, headerName: string, flex: number, minWidth: number, center?: boolean): ColDef<ShareholderRow> => ({
  field, headerName, flex, minWidth, cellStyle: center ? flexMid : flexCenter, cellRenderer: textCell,
});
const date = (field: keyof ShareholderRow, headerName: string, flex: number, minWidth: number): ColDef<ShareholderRow> => ({
  field, headerName, flex, minWidth, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: dateFmt,
});

/* 변동내역 툴팁 — 긴 문장이 잘렸을 때 전체를 보게 한다.
   ⚠ `tooltipField` 를 그대로 쓰지 않는다: 툴팁은 `<MT>` 를 우회해 **마스크 ON 에서 실값이 샌다**
     (이 저장소의 명시 규약 — apfs_contribution_manage·fund_member_manage·member_info_manage 등 7개 파일 주석).
     mask.tsx 가 `_on` 을 `documentElement.dataset.mask` 로 투영해 두므로(SSOT 투영) 그 값을 보고
     마스크 ON 이면 툴팁 자체를 비운다. 현재 마스크는 OFF 라 실동작은 tooltipField 와 동일하다. */
const contTooltip = (p: { value?: string }): string | null => (
  /* ⚠ 마스크 ON 은 `''` 가 아니라 **null** 을 돌려준다 — 빈 문자열은 AG Grid 버전에 따라
     '빈 툴팁 상자'로 렌더될 수 있고, null 만이 명확한 억제 신호다. */
  (typeof document !== 'undefined' && document.documentElement.dataset.mask === 'on') ? null : (p.value || null)
);

const COLUMNS: ColDef<ShareholderRow>[] = [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'ym', headerName: '기준년월', flex: 0.7, minWidth: 96, cellStyle: centerNum, valueFormatter: dateFmt },
  { field: 'g', headerName: '구분', width: 96, minWidth: 96, cellStyle: flexMid, cellRenderer: kindCell },
  txt('gp', '운용사', 1.6, 168),
  txt('vt', '변동구분', 0.9, 106, true),
  /* 변동내역 = 유일한 문장 컬럼 → 가장 큰 가중치로 잉여 폭을 흡수한다 */
  { ...txt('cont', '변동내역', 3.0, 220), tooltipValueGetter: contTooltip },
  date('cd', '주주변동일자', 0.85, 120),
  date('rd', '해제일자', 0.85, 120),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 단일 헤더라 병합 없음. */
type XCol = { header: string; get: (r: ShareholderRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '구분', get: (r) => r.g },
  { header: '운용사', get: (r) => r.gp },
  { header: '변동구분', get: (r) => r.vt },
  { header: '변동내역', get: (r) => r.cont },
  { header: '주주변동일자', get: (r) => r.cd },
  { header: '해제일자', get: (r) => r.rd },
];

/* 행 선택 — 해제등록이 N건에 그대로 적용되는 액션이라 multiRow(apfs-aggrid "체크박스" 절).
   multiRow 는 클릭 누적선택 2옵션이 한 벌이다: enableClickSelection 만 켜면 본문 클릭이 기존 선택을 버린다.
   헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그리므로 내장 SelectAllFeature 는 끄고(headerCheckbox:false)
   범위를 'filtered' 로 못 박아 DS 헤더와 일치시킨다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
const ROW_SELECTION = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
  enableClickSelection: true, enableSelectionWithoutKeys: true,
} as const;

/* ⚠ `overlayNoRowsTemplate` 은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 되면 AG Grid 가
   별도 오버레이(`noMatchingRows`)를 띄워 기본 영문 "No Matching Rows"가 노출된다(v35 실측).
   `noMatchingRowsToShow` 는 v35 가 읽지 않는 죽은 키다 — 넣지 않는다.
   객체 prop 이므로 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조회 조건에 해당하는 주주변동이 없습니다.',
  noMatchingRows: '조회 조건에 해당하는 주주변동이 없습니다.',
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
const EXPORT_BASENAME = '운용사 주주변동관리';
const EXPORT_SHEET = '주주변동관리';

/* 등록 모드는 등록년월을 이번 달로 미리 채운다 — 목업도 `<input id="rm-ym" value="2026-07">` 로 프리필한다.
   ⚠ 클릭 시점에 계산한다(모듈 상수로 두면 오래 열린 탭이 달을 넘겨도 낡은 값). toISOString 금지(KST off-by-one). */
const CREATE_INITIAL = (): Record<string, string> => ({ ym: format(new Date(), 'yyyy-MM') });

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState =
  | null
  | { kind: 'form' }
  | { kind: 'release'; ids: string[] };

export function ShareholderManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ShareholderRow> | null>(null);
  const [rows, setRows] = useState<ShareholderRow[]>(DEMO);
  const [selCount, setSelCount] = useState(0);   // 선택 행 수만 state — 행 자체는 그리드가 SSOT
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
  const [fGp, setFGp] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const clearFilters = () => { setFText(''); setFGp(''); setFFrom(''); setFTo(''); };

  /* 행 필터. 기간은 행의 `기준년월`(YYYY-MM) 범위다 — 경계(YYYY-MM-DD)를 월로 절단해 비교한다.
     ⚠ 빈 값은 '열린 경계'다. `m <= ''` 로 비교하면 모든 행이 탈락한다(apfs-datepicker 범위 함정). */
  const passes = useCallback((r: ShareholderRow) => {
    if (fText && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase()))) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFrom && r.ym < fFrom.slice(0, 7)) return false;
    if (fTo && r.ym > fTo.slice(0, 7)) return false;
    return true;
  }, [fText, fGp, fFrom, fTo]);
  const filterActive = Boolean(fText || fGp || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<ShareholderRow>) => (node.data ? passes(node.data) : true), [passes]);

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
  const onGridReady = useCallback((e: GridReadyEvent<ShareholderRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ShareholderRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<ShareholderRow> }) => {
    const id = pendingSelect.current;
    if (!id) return;
    pendingSelect.current = null;   // 1회성 — 남겨 두면 이후 모든 행 변경이 선택을 되돌린다
    /* ⚠ 필터로 **화면에 없는** 행은 선택하지 않는다. AG Grid 는 외부 필터에 걸린 행도 노드를 유지하므로
       무조건 setSelected 하면 그리드엔 보이지 않는데 selbar 만 "1건 선택됨"으로 떠서
       해제등록이 보이지 않는 행에 걸린다(등록년월 기본값=이번 달 vs 과거 기간 필터).
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

  /* ── 액션(목업 툴바 등록 · 해제등록). 수정·삭제는 목업에 없다 ── */
  const selectedRows = () => apiRef.current?.getSelectedRows() ?? [];
  const openCreate = () => setModal({ kind: 'form' });
  const openRelease = () => {
    const ids = selectedRows().map((r) => r.id);
    if (!ids.length) return;
    setModal({ kind: 'release', ids });
  };

  /* ── 저장/해제 커밋 ── */
  const saveForm = (v: ShareholderFormValues) => {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
    const row: ShareholderRow = {
      id: crypto.randomUUID(), no: nextNo, g: '등록', rd: '',
      ym: v.ym ?? '', cd: v.cd ?? '', gp: v.gp ?? '', vt: v.vt ?? '', cont: v.cont ?? '', reason: v.reason ?? '',
    };
    pendingSelect.current = row.id;
    setRows((prev) => [row, ...prev]);
    setModal(null);
  };
  /* 해제등록 — 목업은 토스트만 띄우지만 우리는 상태를 들고 있으므로 실제로 전이시킨다(파일 상단 '한계' 참조).
     불변 갱신(map + 스프레드) — 원본 배열·행 객체를 mutate 하지 않는다. */
  const commitRelease = ({ rd }: { rd: string }) => {
    if (modal?.kind !== 'release') return;
    const ids = new Set(modal.ids);
    setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, g: '해제' as ShareholderKind, rd } : r)));
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
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '변동내역' ? 36 : c.header === '운용사' ? 26 : c.header === 'No' ? 6 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET);
    /* 기간은 기본값이 없다 — **빈 쪽 조각을 생략**한다(`_2024-01-01~` · `_~2025-03-31`).
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
    { key: '운용사', on: !!fGp, value: <MT>{fGp}</MT>, clear: () => setFGp('') },
    { key: '기간', on: !!(fFrom || fTo), value: `${fFrom ? mn(fFrom) : ''} ~ ${fTo ? mn(fTo) : ''}`, clear: () => { setFFrom(''); setFTo(''); } },
  ] as { key: string; on: boolean; value: React.ReactNode; clear: () => void }[]).filter((c) => c.on);

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다.
     그래서 선택 시 toolbarLeft 는 비운다(둘 다 넘기면 탭 스톱이 2벌 된다).
     ⚠ selbar 에 대상명·취소 안내 캡션을 넣지 않는다(apfs-manage-page 5절).
     ⚠ 수정·삭제 액션을 만들지 않는다 — 목업 툴바에 없다. */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{mn(String(selCount))}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="check" onClick={openRelease}>해제등록</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '운용사 주주변동관리']}
      title="운용사 주주변동관리"
      cardTitle="운용사 주주변동관리"
      favRoute="운용사 주주변동관리"
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
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={openCreate}>주주변동 등록</Button>
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
        <AgGridReact<ShareholderRow>
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
          tooltipShowDelay={400}
          localeText={NO_ROWS_LOCALE}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 주주변동이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(운용사 · 기간) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">운용사 주주변동 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="운용사 · 변동구분 · 변동내역 등 전 컬럼 검색" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={OPT_GP} /></DrawerField>
            {/* 기간 — 목업 `<label for="f-from">기간</label>` 한 줄(시작 `~` 종료). **기본값 없음**(사용자 확정).
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

      {/* ── 팝업 2종 — 등록(목업 openReg) · 해제등록(openRelease). 삭제 확인은 목업에 없다 ── */}
      {modal?.kind === 'form' && (
        <ShareholderFormModal initial={CREATE_INITIAL()} onSave={saveForm} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'release' && (
        <ShareholderReleaseModal count={modal.ids.length} onSave={commitRelease} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
