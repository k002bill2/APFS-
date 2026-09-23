/* 법률/규약위반사항 관리 — 관리형 리스트 페이지 (조기경보 > 조기경보 > 법률/규약위반사항 관리).
   출처: S2_53_법률_규약위반사항_관리.html(KRDS TO-BE) + 등록화면 S2_54(팝업으로 흡수) → APFS 디자인시스템으로 변형.
   형제 골드: `early_warning_manage.tsx`(같은 대분류·단일헤더·드로어+적용칩) · `subfund_manage.tsx`(행선택→액션→모달).

   구성(목업 → 우리 규약)
   - 검색박스 3항목(구분·운용사/자펀드·기간) → **상세필터 드로어**(Sheet). 툴바 FilterChip 세트는 만들지 않는다
     (주 필터로 삼을 열거형 축이 없다 — 목업 `구분`은 등급 같은 상태축이 아니라 **검색 대상 종류**다).
     검색어는 OFF(목업에 없음 — `SEARCHABLE` 게이트).
     ⚠ 기간 기본값 없음(사용자 확정) — 시작·종료 둘 다 빈 값으로 시작하고, 빈 쪽은 무제한 경계다.
   - 목업 [조회] 버튼 → 만들지 않는다(백엔드가 없어 필터가 즉시 반영된다 — 형제 골드 동일 판단).
   - 목업 [등록] → 툴바 독립 버튼 `위반사항 등록`(상세필터 오른쪽·새로고침 왼쪽) + `⌘⏎`.
   - 목업 [수정]·[삭제]·[해제등록] → **행 선택 selbar**(GridFrame contextActions). 목업 캡션
     "행을 선택해 수정(1건)·삭제·해제등록·엑셀 처리"는 selbar 가 대신하므로 별도 캡션을 두지 않는다.
   - 목업 [엑셀] → 툴바가 아니라 푸터 `FooterActions` 내보내기 + `⌥D`(apfs-grid 푸터 골드 양식).
   - 목록 그리드 → AG Grid **단일 헤더 15컬럼**(목업 thead 순서 그대로). **2단 그룹헤더 없음**,
     **합계행 없음**(전 컬럼이 문자/날짜라 가산 개념이 없다 → pinnedBottomRowData 자체를 두지 않는다).
   - `구분` 셀 → `StatusBadge size="lg" dot={false}`. 등록=info · 해제=muted.
     (목업 `gbTag` 와 같은 중립 회색. 2026-09-22 사용자 결정 — 이전에는 "시정 완료로 해제됨"이라는
      종료 상태를 success 로 읽었으나, #228 이 중립 톤 `muted` 를 신설해 "더는 경보 아님"을
      중립으로 표현할 수 있게 됐다. dashboard-ui 규약 "중립은 muted" 와 정렬된다.)
   - KPI 배지 행 → **미포함**(사용자 결정) → `kpis` prop 을 아예 넘기지 않는다.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모·총 N건 표시는 셸/푸터가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - 더미 3행은 목업 `DATA` **원문 그대로**다(값·빈칸 포함). 행을 새로 만들지 않는다.
   - `no` 는 **행에 고정된 값**이다(정렬 가능한 그리드에서 연번을 재계산하면 정렬과 싸운다 — 형제 골드 동일 결정).
     삭제하면 번호에 구멍이 남는다.
   - 해제등록은 **`구분`='등록' 행에만** — 선택에 '해제' 행이 있으면 버튼 숨김 + openRelease 가드 +
     commitRelease 는 '등록' 행만 전이(2026-09-23 사용자 결정, 목업은 막지 않았음). 목업이 토스트만 띄우는 것과 달리 우리는 상태를 들고 있으므로
     선택 행의 `구분`→'해제', `해제일자`→입력값으로 실제 전이시킨다(화면이 결과를 보여주는 편이 자연스럽다).
   - `수정`은 목업 그대로 **1건이 아니면 토스트 경고**다(버튼을 숨기는 generic_list 규약 대신 목업 문구 보존).
     selbar 는 1건 이상 선택에서만 뜨므로 실제 도달 경로는 2건 이상이다. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유 · 이 화면은 합계행이 없지만 공유 규약 유지)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 34px 컨트롤·폭 하한 SSOT
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { ViolationFormModal, ViolationReleaseModal, ViolationDeleteDialog } from './violation_form_modal';
import type { ViolationFormValues } from './violation_form_modal';
import { OPT_GP, OPT_FUND, OPT_SEARCH_KIND } from './violation_manage_schemas';

const { Button, IconBtn, StatusBadge } = UI;

/* 검색어 입력은 기본 OFF(opt-in) — 목업 검색박스에 없다(apfs-detail-filter "예약 라벨 검색어").
   상태(`fText`)·행 필터·칩 배선은 남겨 두고 **드로어 입력만** 이 플래그로 가린다(정본 asset_funding·permission_history).
   입력이 숨겨져 값이 ''로 고정되므로 필터는 자연 무발동이고, `true` 한 줄로 전 컬럼 부분일치 검색이 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   도메인 타입
────────────────────────────── */
/** 그리드 `구분` — 목업 `gb`. 위반 등록 상태 ↔ 시정 후 해제 상태. */
export type ViolationKind = '등록' | '해제';
const KIND_TONE: Record<ViolationKind, Tone> = { 등록: 'info', 해제: 'muted' };

export interface ViolationRow {
  id: string; no: number;
  ym: string;          // 기준년월 'YYYY-MM'
  gb: ViolationKind;   // 구분(등록/해제)
  org: string;         // 적발기관
  gp: string;          // 운용사
  fund: string;        // 자펀드
  disc: string;        // 공시여부 O/X
  rep: string;         // 대표자
  vf: string;          // 위반형태
  law: string;         // 법률/규약
  act: string;         // 조치구분
  od: string;          // 시정명령일자
  pd: string;          // 완료예정일자
  cd: string;          // 시정완료일자
  rd: string;          // 해제일자
  /* 아래 3개는 등록 팝업에만 있고 목록 컬럼이 아니다(목업 동일) */
  chk: string;         // 점검구분
  vc: string;          // 위반내용
  ac: string;          // 조치내용
  /* 해제등록 팝업의 `해제사유`. **그리드에 컬럼이 없다** — 목업 thead 15컬럼에 해제사유가 없어
     화면에 보이지 않는다(엑셀 EXPORT_COLS 에도 넣지 않는다 · 화면=엑셀 불변식).
     그래도 상태로는 보존한다 — 성공 토스트를 띄우면서 입력값을 버리는 건 잘못된 신호다. */
  releaseReason: string;
}

/* 데모 데이터 — 목업 `DATA` 3행 원문 그대로(빈 값 포함). 행을 새로 만들지 않는다. */
const DEMO: ViolationRow[] = [
  { id: 'vi-1', no: 1, ym: '2022-08', gb: '등록', org: '중소기업청', gp: '주식회사 에쓰비인베스트먼트', fund: '', disc: 'O', rep: '', vf: '전문인력', law: '법령', act: '시정명령', od: '2022-03-18', pd: '', cd: '2022-09-20', rd: '', chk: '', vc: '', ac: '', releaseReason: '' },
  { id: 'vi-2', no: 2, ym: '2022-05', gb: '등록', org: '중소벤처기업부', gp: '주식회사 에쓰비인베스트먼트', fund: '에쓰비 농식품투자조합', disc: 'X', rep: '', vf: '보고의무', law: '규약', act: '경고', od: '2022-05-10', pd: '2022-08-31', cd: '', rd: '', chk: '', vc: '', ac: '', releaseReason: '' },
  { id: 'vi-3', no: 3, ym: '2021-11', gb: '해제', org: '중소기업청', gp: '주식회사 에쓰비인베스트먼트', fund: '', disc: 'O', rep: '', vf: '출자약정', law: '법령', act: '시정명령', od: '2021-10-01', pd: '2021-12-31', cd: '2021-12-20', rd: '2022-01-15', chk: '', vc: '', ac: '', releaseReason: '' },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더 15컬럼):
     No · 기준년월 · 구분 · 적발기관 · 운용사 · 자펀드 · 공시여부 · 대표자 · 위반형태 ·
     법률/규약 · 조치구분 · 시정명령일자 · 완료예정일자 · 시정완료일자 · 해제일자
   ⚠ 폭 전략 = `AUTO_SIZE_CONTENT`(내용 맞춤). 15컬럼 내용 폭 합이 프레임(1280)을 넘어 가로 스크롤이
     정상 상태다(목업도 `min-width:1720px` 스크롤러). 긴 텍스트 2컬럼만 maxWidth 로 상한.
   ⚠ 좌측 고정은 No 만 — 다른 컬럼에 pinned 를 주면 목업 순서가 깨진다.
   모듈 스코프 상수다(렌더마다 새 배열이면 AG Grid 가 헤더를 remount 하고 폭을 되돌린다 — apfs-aggrid ⑦).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 텍스트 N/A 는 '-'(숫자 N/A 의 null 규약과 다른 축 — 이 화면엔 숫자 컬럼이 없다).
   flex 셀은 AG Grid 기본 ellipsis 가 안 먹으므로 내부 span 에 truncate 를 준다. */
const textCell = (p: { value?: string }) => (p.value
  ? <span className="min-w-0 truncate">{p.value}</span>
  : <span className="text-muted-foreground">-</span>);
const kindCell = (p: { value: ViolationKind }) => <StatusBadge tone={KIND_TONE[p.value]} label={p.value} size="lg" dot={false} />;
/* 날짜 셀 — 빈 값은 '-' */
const dateFmt = (p: { value?: string }) => (p.value ? String(p.value) : '-');

const txt = (field: keyof ViolationRow, headerName: string, width: number, center?: boolean): ColDef<ViolationRow> => ({
  field, headerName, width, cellStyle: center ? flexMid : flexCenter, cellRenderer: textCell,
});
const date = (field: keyof ViolationRow, headerName: string, width = 118): ColDef<ViolationRow> => ({
  field, headerName, width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: dateFmt,
});

const COLUMNS: ColDef<ViolationRow>[] = [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'ym', headerName: '기준년월', width: 104, cellStyle: centerNum, valueFormatter: dateFmt },
  { field: 'gb', headerName: '구분', width: 92, cellStyle: flexMid, cellRenderer: kindCell },
  txt('org', '적발기관', 132, true),
  { ...txt('gp', '운용사', 200), maxWidth: 240 },
  { ...txt('fund', '자펀드', 180), maxWidth: 240 },
  txt('disc', '공시여부', 96, true),
  txt('rep', '대표자', 96, true),
  txt('vf', '위반형태', 110, true),
  txt('law', '법률/규약', 104, true),
  txt('act', '조치구분', 104, true),
  date('od', '시정명령일자'),
  date('pd', '완료예정일자'),
  date('cd', '시정완료일자'),
  date('rd', '해제일자', 104),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 단일 헤더라 병합 없음. */
type XCol = { header: string; get: (r: ViolationRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '구분', get: (r) => r.gb },
  { header: '적발기관', get: (r) => r.org },
  { header: '운용사', get: (r) => r.gp },
  { header: '자펀드', get: (r) => r.fund },
  { header: '공시여부', get: (r) => r.disc },
  { header: '대표자', get: (r) => r.rep },
  { header: '위반형태', get: (r) => r.vf },
  { header: '법률/규약', get: (r) => r.law },
  { header: '조치구분', get: (r) => r.act },
  { header: '시정명령일자', get: (r) => r.od },
  { header: '완료예정일자', get: (r) => r.pd },
  { header: '시정완료일자', get: (r) => r.cd },
  { header: '해제일자', get: (r) => r.rd },
];

/* 행 선택 — 삭제·해제등록이 N건에 그대로 적용되는 액션이라 multiRow(apfs-aggrid "체크박스" 절).
   선택은 체크박스로만 on/off 한다(행 본문 클릭 선택 없음 — 2026-09-22 사용자 결정, enableClickSelection:false 명시).
   헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그리므로 내장 SelectAllFeature 는 끄고(headerCheckbox:false)
   범위를 'filtered' 로 못 박아 DS 헤더와 일치시킨다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
const ROW_SELECTION = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
  enableClickSelection: false,
} as const;

/* ⚠ `overlayNoRowsTemplate` 은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 되면 AG Grid 가
   별도 오버레이(`noMatchingRows`)를 띄워 기본 영문 "No Matching Rows"가 노출된다(v35 실측).
   `noMatchingRowsToShow` 는 v35 가 읽지 않는 죽은 키다 — 넣지 않는다.
   객체 prop 이므로 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조회 조건에 해당하는 위반사항이 없습니다.',
  noMatchingRows: '조회 조건에 해당하는 위반사항이 없습니다.',
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

/* 엑셀 파일명 — 라우트에 `/` 가 있어 파일명으로 쓸 수 없다(경로 구분자). 시트명도 Excel 금칙문자다. */
const EXPORT_BASENAME = '법률_규약위반사항 관리';
const EXPORT_SHEET = '법률규약위반사항';

/* 행 → 등록/수정 폼 초기값. 폼 필드 키만 골라 넘긴다(id·no·gb 는 폼이 다루지 않는 행 메타).
   ⚠ 행을 통째로 캐스팅해 넘기지 않는다 — 스키마에 없는 키가 섞이면 저장 시 조용히 되돌아올 수 있다. */
const formInitial = (r: ViolationRow): Record<string, string> => ({
  ym: r.ym, org: r.org, law: r.law, gp: r.gp, fund: r.fund, disc: r.disc, rep: r.rep,
  chk: r.chk, vf: r.vf, vc: r.vc, act: r.act, ac: r.ac, od: r.od, pd: r.pd, cd: r.cd,
});
/* 등록 모드는 등록년월(필수)을 이번 달로 미리 채운다 — 빈 채 열리면 저장이 막힌다(subfund 동형).
   ⚠ 클릭 시점에 계산한다(모듈 상수로 두면 오래 열린 탭이 달을 넘겨도 낡은 값). toISOString 금지(KST off-by-one). */
const CREATE_INITIAL = (): Record<string, string> => ({ ym: format(new Date(), 'yyyy-MM') });

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState =
  | null
  | { kind: 'form'; mode: 'create' | 'edit'; row?: ViolationRow }
  | { kind: 'release'; ids: string[] }
  | { kind: 'delete'; ids: string[] };

export function ViolationManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ViolationRow> | null>(null);
  const [rows, setRows] = useState<ViolationRow[]>(DEMO);
  /* 선택은 **id 집합**만 state — 행 자체는 그리드가 SSOT. 파생값은 React `rows` 에서 읽는다:
     해제등록 직후 행이 '해제'로 바뀌어도 selectionChanged 는 발생하지 않으므로, 렌더 시 getSelectedRows() 는 낡는다. */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const selHasReleased = useMemo(() => rows.some((r) => r.gb === '해제' && selIds.includes(r.id)), [rows, selIds]);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);

  /* 앱-스코프 단축키. 모달이 떠 있는 동안에는 등록(이중 열림)·내보내기(모달 위 다운로드)를 막는다. */
  useHotkey(HOTKEYS.register.combo, () => openCreate(), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null });

  /* ── 필터 SSOT(빈 값 = 미적용) — 목업 검색박스 3항목 순서 그대로 ──
     fKind = **검색 대상 종류**(운용사/자펀드). 그리드의 `구분`(등록/해제) 컬럼과 무관하다.
     fTarget = 그 종류의 대상 이름. fFrom/fTo = 기간(기본값 없음). */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fText, setFText] = useState('');     // 검색어 — SEARCHABLE=false 면 입력이 숨겨져 ''로 고정(무발동)
  const [fKind, setFKind] = useState('');
  const [fTarget, setFTarget] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  /* 목업 `fillTarget()` 동형 — 구분 선택에 따라 대상 목록을 갈아끼운다.
     `전체`(미선택)면 두 목록의 합집합이라 어느 쪽 이름을 골라도 매칭된다. */
  const optionsFor = useCallback((kind: string) => (
    kind === '자펀드' ? OPT_FUND : kind === '운용사' ? OPT_GP : Array.from(new Set([...OPT_GP, ...OPT_FUND]))
  ), []);
  const targetOptions = useMemo(() => optionsFor(fKind), [optionsFor, fKind]);
  /* 구분을 바꾸면 새 목록에 없는 대상은 버린다 — 남겨 두면 어느 컬럼과도 안 맞아 표가 조용히 빈다 */
  const changeKind = (v: string) => {
    setFKind(v);
    setFTarget((t) => (t && optionsFor(v).includes(t) ? t : ''));
  };
  const clearFilters = () => { setFText(''); setFKind(''); setFTarget(''); setFFrom(''); setFTo(''); };

  /* 행 필터. 기간은 행의 `기준년월`(YYYY-MM) 범위다 — 경계(YYYY-MM-DD)를 월로 절단해 비교한다.
     ⚠ 빈 값은 '열린 경계'다. `m <= ''` 로 비교하면 모든 행이 탈락한다(apfs-datepicker 범위 함정). */
  const passes = useCallback((r: ViolationRow) => {
    if (fText && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase()))) return false;
    if (fTarget) {
      const hit = fKind === '운용사' ? r.gp === fTarget
        : fKind === '자펀드' ? r.fund === fTarget
          : (r.gp === fTarget || r.fund === fTarget);
      if (!hit) return false;
    }
    if (fFrom && r.ym < fFrom.slice(0, 7)) return false;
    if (fTo && r.ym > fTo.slice(0, 7)) return false;
    return true;
  }, [fText, fKind, fTarget, fFrom, fTo]);
  const filterActive = Boolean(fText || fTarget || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<ViolationRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 최신 `passes` 를 ref 로 들고 있는다 — onRowDataUpdated 의 deps 를 [] 로 고정하기 위해서다.
     AG Grid 콜백 identity 가 렌더마다 바뀌면 그리드가 리스너를 재바인딩한다(apfs-aggrid ⑦).
     ⚠ useEffect 가 아니라 **렌더 본문**에서 갱신한다 — 자식(AgGridReact)의 effect 가 부모보다 먼저
       돌아서, 필터와 행이 같은 커밋에서 바뀌면 effect 동기화 ref 는 낡은 술어를 보게 된다. */
  const passesRef = useRef(passes);
  passesRef.current = passes;

  /* 신규 등록 행은 선두 삽입 후 선택을 그 행으로 옮긴다 — 다음 액션(수정·해제등록)이 바로 보인다.
     그리드 체크박스는 rowData 반영 뒤에야 노드가 생기므로 onRowDataUpdated 에서 맞춘다. */
  const pendingSelect = useRef<string | null>(null);
  const onGridReady = useCallback((e: GridReadyEvent<ViolationRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ViolationRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<ViolationRow> }) => {
    const id = pendingSelect.current;
    if (!id) return;
    pendingSelect.current = null;   // 1회성 — 남겨 두면 이후 모든 행 변경이 선택을 되돌린다
    /* ⚠ 필터로 **화면에 없는** 행은 선택하지 않는다. AG Grid 는 외부 필터에 걸린 행도 노드를 유지하므로
       무조건 setSelected 하면 그리드엔 보이지 않는데 selbar 만 "1건 선택됨"으로 떠서
       수정·삭제·해제등록이 보이지 않는 행에 걸린다(등록년월 기본값=이번 달 vs 과거 기간 필터).
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
    if (sel.length !== 1) { toast('수정할 위반사항을 1건만 선택하세요'); return; }
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
    if (sel.some((r) => r.gb === '해제')) { toast('이미 해제된 행은 해제등록할 수 없습니다'); return; }
    const ids = sel.map((r) => r.id);
    setModal({ kind: 'release', ids });
  };

  /* ── 저장/삭제/해제 커밋 ── */
  const saveForm = (v: ViolationFormValues) => {
    if (modal?.kind !== 'form') return;
    const patch = {
      ym: v.ym, org: v.org, law: v.law, gp: v.gp, fund: v.fund, disc: v.disc, rep: v.rep,
      chk: v.chk, vf: v.vf, vc: v.vc, act: v.act, ac: v.ac, od: v.od, pd: v.pd, cd: v.cd,
    };
    if (modal.mode === 'edit' && modal.row) {
      const id = modal.row.id;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } else {
      const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
      const row: ViolationRow = { id: crypto.randomUUID(), no: nextNo, gb: '등록', rd: '', releaseReason: '', ...patch };
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
    toast.success(`${String(ids.size)}건 삭제되었습니다`);
  };
  /* 해제등록 — 목업은 토스트만 띄우지만 우리는 상태를 들고 있으므로 실제로 전이시킨다(파일 상단 '한계' 참조).
     ⚠ `reason`(해제사유)은 그리드 컬럼도 엑셀 컬럼도 아니라 **화면 어디에도 안 보인다**(목업 thead 15컬럼에
       없다 · ViolationRow.releaseReason 주석 참조). 그래도 행에 저장한다 — 성공 토스트를 띄우면서
       입력값을 버리면 잘못된 신호다. */
  const commitRelease = ({ rd, reason }: { rd: string; reason: string }) => {
    if (modal?.kind !== 'release') return;
    const ids = new Set(modal.ids);
    setRows((prev) => prev.map((r) => (ids.has(r.id) && r.gb === '등록' ? { ...r, gb: '해제' as ViolationKind, rd, releaseReason: reason } : r)));
    setModal(null);
  };

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더 15컬럼(병합 없음·합계행 없음) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return v;
      return v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '운용사' ? 26 : c.header === '자펀드' ? 24 : c.header === 'No' ? 6 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET);
    /* 기간은 기본값이 없다 — **빈 쪽 조각을 생략**한다(`_2022-01-01~` · `_~2022-12-31`).
       둘 다 비면 기간 조각 자체가 빠진다. 없는 경계에 '처음/끝' 같은 말을 지어내지 않는다. */
    const period = fFrom || fTo ? `_${fFrom}~${fTo}` : '';
    XLSX.writeFile(wb, `${EXPORT_BASENAME}${period}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  /* 적용 필터 칩 — 항목별 개별 칩, **값만 표시**(항목명 접두사 없음) + ×.
     기간은 한쪽만 채워도 칩이 뜬다(빈 쪽은 열린 경계로 표시). */
  const chips = ([
    { key: '검색어', on: !!fText, value: <>{fText}</>, clear: () => setFText('') },
    { key: '구분', on: !!fKind, value: <>{fKind}</>, clear: () => changeKind('') },
    { key: '운용사/자펀드', on: !!fTarget, value: <>{fTarget}</>, clear: () => setFTarget('') },
    { key: '기간', on: !!(fFrom || fTo), value: `${fFrom ? String(fFrom) : ''} ~ ${fTo ? String(fTo) : ''}`, clear: () => { setFFrom(''); setFTo(''); } },
  ] as { key: string; on: boolean; value: React.ReactNode; clear: () => void }[]).filter((c) => c.on);

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다.
     그래서 선택 시 toolbarLeft 는 비운다(둘 다 넘기면 탭 스톱이 2벌 된다).
     ⚠ selbar 에 대상명·취소 안내 캡션을 넣지 않는다(apfs-manage-page 5절). */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
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
      crumbs={['홈', '조기경보', '조기경보', '법률/규약위반사항 관리']}
      title="법률/규약위반사항 관리"
      cardTitle="법률/규약위반사항 관리"
      favRoute="법률/규약위반사항 관리"
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
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={openCreate}>위반사항 등록</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(filteredRows.length) + '개 중 ' + String(Math.min(shown, filteredRows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<ViolationRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
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
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 위반사항이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(구분 · 운용사/자펀드 · 기간) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">법률/규약위반사항 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="운용사 · 자펀드 · 위반형태 등 전 컬럼 검색" style={inputStyle('text')} />
              </DrawerField>
            )}
            {/* ⚠ 이 `구분`은 **검색 대상 종류**(운용사/자펀드)다 — 그리드의 `구분`(등록/해제) 컬럼이 아니다 */}
            <DrawerField label="구분"><DrawerSelect value={fKind} onChange={changeKind} options={[...OPT_SEARCH_KIND]} /></DrawerField>
            <DrawerField label="운용사/자펀드"><DrawerSelect value={fTarget} onChange={setFTarget} options={targetOptions} /></DrawerField>
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

      {/* ── 팝업 3종 — 등록/수정(목업 openReg) · 해제등록(openRelease) · 삭제 확인(openDelete) ── */}
      {modal?.kind === 'form' && (
        <ViolationFormModal
          mode={modal.mode}
          initial={modal.mode === 'edit' && modal.row ? formInitial(modal.row) : CREATE_INITIAL()}
          title={modal.mode === 'create' ? '법률/규약위반사항 등록' : '법률/규약위반사항 수정'}
          onSave={saveForm}
          onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'release' && (
        <ViolationReleaseModal count={modal.ids.length} onSave={commitRelease} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <ViolationDeleteDialog count={modal.ids.length} onConfirm={commitDelete} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
