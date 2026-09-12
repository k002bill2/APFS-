/* 조합원총회 — 관리형 리스트 페이지 (투자자산관리 > 사후보고관리 > 조합원총회).
   출처: S1_07_조합원총회.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·담당자·총회구분·총회기간)
       → 보고상태 FilterChip(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter)
       ⚠ 목업 기본 총회기간(2025-08-28~2026-08-28)은 데모값이라 이식하지 않는다(초기값 '' = 미적용).
       ⚠ 담당자는 행 컬럼이 아니라 상세(`detail.gen.mgr`)에 있다 — 그 값으로 실제 필터링하되
         ⚠검토필요 마커를 붙여 "실 담당자 목록 미확인"을 화면에 남긴다(목업 원문 1건).
   - 목록 그리드                → AG Grid 단일 헤더(apfs-aggrid). **합계행 없음·행 선택 없음** — 금액 컬럼이
       없는 조회 화면이고 목업에도 체크박스/라디오가 없다.
   - 확정여부 2열              → **셀 안 네이티브 `<select>`**(목업 `selCell`/`resultCell` 그대로).
       결과는 일정이 '확정'일 때만 선택 가능(그 외 '-'), 일정이 '확정'에서 풀리면 결과도 ''로 리셋한다(도메인 정합).
   - 상세 팝업(읽기전용)       → 제목 링크(+ 셀 Enter) → `GeneralMeetingDetailModal`.
       ⚠ **행 더블클릭으로는 열지 않는다** — 링크가 진입점인데 더블클릭까지 걸면 링크를 두 번 누른 순간
         엉뚱한 팝업이 뜬다(골드 `occasional_report_manage.tsx`와 동일 결정). 진입은 링크 + Enter 단일.
   - KPI 배지 행                → 미포함(브리프 확정). 금액 개념이 없어 건수 지표뿐이다.
   - 엑셀                       → SheetJS(단일 헤더, 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **이식한다**(apfs-grid 규약) — 목업 원문 1건(검색 '담당자')을 그대로 옮겼다. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle, SuppressKeyboardEventParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';
import { GeneralMeetingDetailModal } from './general_meeting_detail_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 DATA/detail 구조 그대로
────────────────────────────── */
export type MeetingStatus = '일정' | '결과';

export interface MeetingDetail {
  gen: { fund: string; gtype: string; gdt: string; mgr: string; place: string; title: string; resolform: string; shorten: string; resolway: string };
  report: { ord: string; content: string }[];
  motion: { ord: string; content: string; way: string; moaf: string; result: string }[];
  files: { name: string; reg: string; mod: string; up: string }[];
}

export interface MeetingRow {
  id: string; no: number; gp: string; fund: string;
  rst: MeetingStatus;           // 보고상태
  gt: string;                   // 총회구분
  gdate: string;                // 총회일자 'YYYY-MM-DD'
  title: string; agenda: string;
  sch: '' | '확정' | '미확정';  // 일정 확정여부('' = 미선택, 목업의 빈 option)
  res: '' | '확정' | '미확정';  // 결과 확정여부(sch==='확정'일 때만 의미)
  detail: MeetingDetail;
}

/* 보고상태 배지 톤 — 목업 `statusTag`의 `.tag.b`(일정)/`.tag.g`(결과) */
const STATUS_TONE: Record<MeetingStatus, Tone> = { 일정: 'info', 결과: 'success' };

/* 확정여부 옵션 — 목업 `selCell`의 ['확정','미확정'] */
const CONFIRM_OPTIONS = ['확정', '미확정'] as const;

/* 총회구분 옵션 — 목업 검색박스 8종 그대로 */
const GT_OPTIONS = ['정기총회', '임시총회', '간담회', '보고회', '결성총회', '해산총회', '청산총회', '기타'];

/* 데모 데이터 — 목업 DATA 3행(실데이터 1건 + 도메인 정합 샘플 2건)을 값까지 그대로 옮겼다. 텍스트 N/A='-' */
const DEMO: MeetingRow[] = [
  {
    id: 'gm-1', no: 1, gp: '(주)넥스트지인베스트먼트', fund: '넥스트지 지방활성화 농식품 투자조합',
    rst: '일정', gt: '임시총회', gdate: '2026-06-02', title: '2026년 제5회 임시조합원총회',
    agenda: '규약 변경 승인의 건', sch: '미확정', res: '',
    detail: {
      gen: { fund: '넥스트지 지방활성화 농식품 투자조합', gtype: '임시총회', gdt: '2026-06-02 10:00', mgr: '이승재', place: '주식회사 넥스트지인베스트먼트 대회의실', title: '2026년 제5회 임시조합원총회', resolform: '서면결의', shorten: 'N', resolway: '서면결의' },
      report: [],
      motion: [{ ord: '1', content: '규약 변경 승인의 건', way: '특별결의', moaf: '', result: '' }],
      files: [{ name: '[공문][공문] 넥스트지 지방활성화 농식품 투자조합 임시조합원총회 소집 통보의 건_260519.PDF', reg: '2026-05-19 오후 1:53:58', mod: '2026-05-22 오전 9:34:55', up: 'O' }],
    },
  },
  {
    id: 'gm-2', no: 2, gp: '아이엠엠인베스트먼트(주)', fund: 'IMM 농식품 스마트투자조합',
    rst: '결과', gt: '정기총회', gdate: '2026-03-14', title: '2026년 제1기 정기조합원총회',
    agenda: '결산보고 승인의 건', sch: '확정', res: '확정',
    detail: {
      gen: { fund: 'IMM 농식품 스마트투자조합', gtype: '정기총회', gdt: '2026-03-14 14:00', mgr: '이승재', place: '아이엠엠인베스트먼트 본사 회의실', title: '2026년 제1기 정기조합원총회', resolform: '현장결의', shorten: 'N', resolway: '보통결의' },
      report: [{ ord: '1', content: '2025년 결산 및 운용현황 보고' }],
      motion: [{ ord: '1', content: '결산보고 승인의 건', way: '보통결의', moaf: '', result: '가결' }],
      files: [],
    },
  },
  {
    id: 'gm-3', no: 3, gp: '한국투자파트너스(주)', fund: '한투 청년농식품투자조합',
    rst: '일정', gt: '임시총회', gdate: '2026-07-21', title: '2026년 제2회 임시조합원총회',
    agenda: '업무집행조합원 변경 승인의 건', sch: '미확정', res: '',
    detail: {
      gen: { fund: '한투 청년농식품투자조합', gtype: '임시총회', gdt: '2026-07-21 11:00', mgr: '이승재', place: '서면결의(현장 미개최)', title: '2026년 제2회 임시조합원총회', resolform: '서면결의', shorten: 'Y', resolway: '서면결의' },
      report: [],
      motion: [{ ord: '1', content: '업무집행조합원 변경 승인의 건', way: '특별결의', moaf: '', result: '' }],
      files: [],
    },
  },
];

const PAGE_SIZE = 20;

/* ⚠검토필요 메모 — 목업 `S1_07_조합원총회.html`의 `data-rec`/`data-dat` 원문 그대로(전수 1건: 검색 '담당자').
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const FILTER_NOTES: Record<'mgr', ReviewNote> = {
  mgr: { rec: '담당심사역 목록(예: 이승재)', dat: '실 담당자 목록 미확인 — 코드/명단 확인 필요' },
};

/* 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 `aggrid_theme.ts`의 공용 상수를 쓴다 —
   인라인 리터럴 금지 이유(렌더마다 새 객체 → 폭이 선언값으로 되돌아감)는 그 파일 주석이 정본. */

/* ──────────────────────────────
   컬럼 정의 — 목업 원본 헤더 배열 그대로(단일 헤더):
     No · 운용사 · 자펀드 · 보고상태 · 총회구분 · 총회일자 · 제목 · 안건 · 일정 확정여부 · 결과 확정여부
   ⚠ 좌측 고정은 No만 — 다른 컬럼에 `pinned`를 주면 좌측 영역으로 끌려와 목업 순서가 깨진다.
   ⚠ 폭 전략은 `AUTO_SIZE_CONTENT`(내용 맞춤)다 — 10컬럼 내용 폭 합이 프레임(1280)을 넘는 넓은 표라 `fitGridWidth`를 쓰면
     텍스트 컬럼(운용사·자펀드·안건)이 선언 폭 아래로 눌려 7셀이 잘렸다(2026-09-12 코디네이터 런타임 실측). 내용 맞춤이면
     그리드가 프레임보다 넓어져 AG Grid 내부 가로 스크롤이 생기고 잘림은 0이다(apfs-aggrid "넓은 다열 테이블" 규약).
     긴 텍스트 컬럼(운용사·자펀드·제목·안건)만 maxWidth 상한, 고정폭 컬럼(No·보고상태·총회구분·총회일자·확정여부 2열)은
     `minWidth===width===maxWidth`로 묶어 헤더 라벨 폭을 보장한다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const txt = (field: keyof MeetingRow, header: string, width: number, maxWidth: number, minWidth: number, center?: boolean): ColDef<MeetingRow> => ({
  field, headerName: header, width, maxWidth, minWidth, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => <MT>{p.value}</MT>,
});

/* 고정폭(내용 맞춤 불필요·헤더 라벨 폭이 하한) */
const fixed = (width: number) => ({ width, maxWidth: width, minWidth: width });

/* 셀 내 링크 — 클릭 시 상세 팝업(목업은 행 전체 클릭이지만, 우리 규약은 셀 링크가 진입점이다).
   ⚠ `title`엔 동작 힌트만 담는다 — 값을 넣으면 마스크 ON일 때 툴팁으로 실데이터가 샌다.
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다.
   외관은 목업 `.linktxt` 그대로: primary 색 + font-weight 600, 평상시 밑줄 없음 / hover에만 밑줄. */
function LinkCell({ value, hint, onClick }: { value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate text-left text-primary font-semibold no-underline hover:underline cursor-pointer"
      style={{ font: 'inherit', fontWeight: 600, background: 'transparent', border: 0, padding: 0 }}>
      <MT>{value}</MT>
    </button>
  );
}

/* 확정여부 셀 — 목업 `selCell()` 그대로(빈 option + 확정/미확정).
   ⚠ 값이 ''인데 `<option value="">`가 없으면 브라우저가 첫 option을 그려 state와 표시가 엇갈린다 → 항상 둔다.
     목업은 미선택일 때만 빈 option을 넣어(`if(!val)`) 한 번 고르면 되돌릴 수 없었는데, 제어형 select에서
     그 방식은 값을 다시 ''로 만들 경로(일정 해제 → 결과 리셋)에서 표시가 엇갈리므로 상시 노출로 바꿨다.
   ⚠ 폰트는 `fontFamily:'inherit'` + 14px — preflight:false라 select가 UA 기본(13.3px Arial)으로 튄다.
     `font` 단축속성을 쓰면 뒤 키의 fontSize를 리셋할 수 있어 분리해 쓴다(키 순서 함정).
   ⚠ React의 stopPropagation은 AG Grid를 막지 못한다 — AG Grid 리스너가 셀 조상에 달려 있어
     React 루트(#root) 위임보다 먼저 실행된다. 방향키가 "값 변경 + 셀 이동"으로 겹치는 것은
     colDef `suppressKeyboardEvent`(아래 `suppressFromSelect`)가 막는다. 여기 stopPropagation은
     React 레벨 핸들러(행 클릭 등)용 보호다. */
function SelectCell({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={stop} onMouseDown={stop} onDoubleClick={stop} onKeyDown={stop}
      style={{
        fontFamily: 'inherit', fontSize: 14, lineHeight: '18px', height: 30, padding: '0 4px',
        boxSizing: 'border-box', maxWidth: '100%', cursor: 'pointer',
        border: '1px solid var(--input)', borderRadius: 7, background: 'var(--card)', color: 'var(--foreground)',
      }}>
      <option value="" />
      {CONFIRM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* 셀 안 select가 포커스를 가진 동안은 AG Grid 키보드 처리를 끈다(방향키 이중 동작 방지).
   Tab은 AG Grid에 남겨 셀↔셀 이동을 그리드 기본과 같게 유지한다.
   ⚠ 이 suppress는 그리드 내부 처리만 끄고 `cellKeyDown` 이벤트 발행은 막지 않는다
     (v35 소스 `processCellKeyboardEvent`: dispatch가 gridProcessingAllowed 블록 밖) → 아래 Enter 핸들러는 그대로 동작. */
const suppressFromSelect = (p: SuppressKeyboardEventParams<MeetingRow>): boolean =>
  p.event.key !== 'Tab' && (p.event.target as HTMLElement | null)?.tagName === 'SELECT';

/* 키보드(Enter) 진입 — AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button/select에 초점이 닿지 않는다.
   제목 셀은 상세 팝업, 확정여부 셀은 셀 내부 select로 포커스를 넘긴다. */
const SELECT_COL_IDS = ['sch', 'res'];

const makeColumns = (
  openDetail: (id: string) => void,
  patchRow: (id: string, patch: Partial<MeetingRow>) => void,
): ColDef<MeetingRow>[] => [
  /* No는 축(순번)이라 마스킹하지 않는다(골드 동형) */
  { field: 'no', headerName: 'No', ...fixed(68), pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  /* 운용사·자펀드는 명세 팝업이 없어 링크가 아니다(브리프) — 텍스트 + maxWidth 캡 */
  txt('gp', '운용사', 160, 240, 120),
  txt('fund', '자펀드', 180, 300, 140),
  { field: 'rst', headerName: '보고상태', ...fixed(100), cellStyle: flexMid,
    cellRenderer: (p: any) => <StatusBadge tone={STATUS_TONE[p.value as MeetingStatus]} label={p.value} size="lg" dot={false} /> },
  txt('gt', '총회구분', 100, 100, 100, true),
  { field: 'gdate', headerName: '총회일자', ...fixed(112), cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
    valueFormatter: (p) => mn(p.value) },
  /* 제목 — 링크 셀. 내용 맞춤(AUTO_SIZE_CONTENT)이라 흡수 컬럼 장치는 없고, 긴 총회명은 420 상한에서 truncate. */
  { field: 'title', headerName: '제목', width: 210, minWidth: 180, maxWidth: 420, cellStyle: flexCenter,
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="총회 상세 보기" onClick={() => p.data && openDetail(p.data.id)} /> },
  txt('agenda', '안건', 170, 300, 130),
  /* 일정 확정여부 — 변경 시 sch가 '확정'이 아니게 되면 res도 ''로 리셋(목업 resultCell 게이팅과 정합) */
  { field: 'sch', headerName: '일정 확정여부', ...fixed(124), cellStyle: flexMid, suppressKeyboardEvent: suppressFromSelect,
    cellRenderer: (p: any) => (
      <SelectCell
        value={p.value ?? ''} label={`일정 확정여부 ${p.data?.no}행`}
        onChange={(v) => p.data && patchRow(p.data.id, v === '확정' ? { sch: v } : { sch: v as MeetingRow['sch'], res: '' })} />
    ) },
  /* 결과 확정여부 — 일정이 '확정'일 때만 선택 가능, 그 외 muted '-'(목업 `resultCell`).
     ⚠ `field:'res'`만 두면 **일정만 바뀐 행에서 이 셀이 갱신되지 않는다** — rowData 교체 경로는
        rowNode.updateData(update:true) → refreshRow(newData:false)라 "값이 달라졌을 때만" 셀을 다시 그린다
        (ag-grid-community v35 소스 rowCtrl.refreshRow/cellCtrl.refreshCell 확인). 게이팅 결과를 값에 엮어
        (비활성=null) 전이마다 값이 달라지게 만든다. colId는 valueGetter를 쓰면 field에서 파생되지 않으므로 명시. */
  { colId: 'res', field: 'res', headerName: '결과 확정여부', ...fixed(124), cellStyle: flexMid, suppressKeyboardEvent: suppressFromSelect,
    valueGetter: (p) => (p.data && p.data.sch === '확정' ? p.data.res : null),
    cellRenderer: (p: any) => (p.value == null
      ? <span style={{ color: 'var(--muted-foreground)' }}>-</span>
      : <SelectCell value={p.value} label={`결과 확정여부 ${p.data?.no}행`} onChange={(v) => p.data && patchRow(p.data.id, { res: v as MeetingRow['res'] })} />) },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 순서·집합이 목업 원본 헤더와 같다.
   확정여부 미선택은 목업 빈 option과 같게 ''로 둔다(임의 '미선택' 문자열 생성 금지) */
type XCol = { header: string; get: (r: MeetingRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '운용사', get: (r) => r.gp },
  { header: '자펀드', get: (r) => r.fund },
  { header: '보고상태', get: (r) => r.rst },
  { header: '총회구분', get: (r) => r.gt },
  { header: '총회일자', get: (r) => r.gdate },
  { header: '제목', get: (r) => r.title },
  { header: '안건', get: (r) => r.agenda },
  { header: '일정 확정여부', get: (r) => r.sch },
  { header: '결과 확정여부', get: (r) => (r.sch === '확정' ? r.res : '') },
];

const inputStyle = (kind?: string): React.CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, noop, plain, note, children }: { label: string; noop?: boolean; plain?: boolean; note?: ReviewNote; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{note && <ReviewMarker {...note} label={label} />}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
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

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 목업엔 전역 신규 등록이 없어 kebab 단독(apfs-grid 툴바 규약) */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
          <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
          <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
/* 상세 팝업은 **대상 행 id를 직접 싣는다** — 행 선택(체크박스)이 없어 `selected`가 존재하지 않는다 */
type ModalState = null | { kind: 'detail'; id: string };

export function GeneralMeetingManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<MeetingRow> | null>(null);
  const [rows, setRows] = useState<MeetingRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const masked = useMask();

  /* 행 패치 — 항상 새 객체를 만들어 DEMO 원본을 건드리지 않는다(immutability) */
  const patchRow = useCallback((id: string, patch: Partial<MeetingRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  /* setModal(useState 세터)·patchRow(useCallback []) 둘 다 안정 참조라 deps []로 컬럼 정의를 고정한다
     (매 렌더 새 배열이면 AG Grid가 컬럼을 재생성하며 폭을 선언값으로 되돌린다) */
  const columnDefs = useMemo(() => makeColumns((id: string) => setModal({ kind: 'detail', id }), patchRow), [patchRow]);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 보고상태는 툴바 칩, 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fRst, setFRst] = useState<'' | MeetingStatus>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fMgr, setFMgr] = useState('');      // 담당자 — 상세(detail.gen.mgr)로 실제 필터링
  const [fGt, setFGt] = useState('');        // 총회구분
  const [fFrom, setFFrom] = useState('');    // 총회기간 시작(총회일자 기준)
  const [fTo, setFTo] = useState('');        // 총회기간 종료(동상)
  const [fMf, setFMf] = useState('');        // 모펀드 — 행 컬럼 아님(no-op)
  const [fAcc, setFAcc] = useState('');      // 계정구분 — 행 컬럼 아님(no-op)
  const clearFilters = () => { setFRst(''); setFGp(''); setFFund(''); setFMgr(''); setFGt(''); setFFrom(''); setFTo(''); setFMf(''); setFAcc(''); };

  const passes = useCallback((r: MeetingRow) => {
    if (fRst && r.rst !== fRst) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fund !== fFund) return false;
    if (fMgr && r.detail.gen.mgr !== fMgr) return false;
    if (fGt && r.gt !== fGt) return false;
    if (fFrom && r.gdate < fFrom) return false;
    if (fTo && r.gdate > fTo) return false;
    return true;
  }, [fRst, fGp, fFund, fMgr, fGt, fFrom, fTo]);
  const filterActive = Boolean(fRst || fGp || fFund || fMgr || fGt || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리한다 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영
    // 안 뜨고 내보내기·인쇄 접근이 끊긴다(apfs-grid 푸터 골드 양식).
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<MeetingRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fund))), [rows]);
  /* 담당자 옵션 — 목업이 "실 담당자 목록 미확인"으로 못 박아, 행 상세에 실제로 기록된 담당심사역에서만 파생한다 */
  const mgrOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.detail.gen.mgr).filter(Boolean))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<MeetingRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — 셀에 초점을 둔 채 Enter. 제목 셀=상세 팝업, 확정여부 셀=셀 안 select로 포커스.
     (select가 없는 '-' 상태의 결과 셀은 querySelector가 비어 no-op) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<MeetingRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter') return;
    const colId = e.column.getColId();
    if (colId === 'title') { if (e.data) setModal({ kind: 'detail', id: e.data.id }); return; }
    if (!SELECT_COL_IDS.includes(colId)) return;
    const cell = (e.event?.target as HTMLElement | null)?.closest?.('.ag-cell') as HTMLElement | null;
    cell?.querySelector('select')?.focus();
  }, []);

  const target = modal?.kind === 'detail' ? rows.find((r) => r.id === modal.id) ?? null : null;

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음). 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '제목' || c.header === '안건' ? 32 : c.header === '자펀드' || c.header === '운용사' ? 26 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '조합원총회');
    XLSX.writeFile(wb, '조합원총회.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '조합원총회']}
      title="조합원총회"
      favRoute="general-meeting"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌는 항상 필터칩이다 — 행 선택이 없어 selbar가 존재하지 않는다(조회 전용 화면) */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '일정', '결과'] as ('' | MeetingStatus)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fRst === s} onClick={() => setFRst(s)}>{s || '전체'}</FilterChip>
          ))}
          {([
            ['운용사', fGp, () => setFGp(''), false],
            ['자펀드', fFund, () => setFFund(''), false],
            ['담당자', fMgr, () => setFMgr(''), false],
            ['총회구분', fGt, () => setFGt(''), false],
            ['총회기간 시작', fFrom, () => setFFrom(''), true],
            ['총회기간 종료', fTo, () => setFTo(''), true],
          ] as [string, string, () => void, boolean][]).filter(([, v]) => v).map(([label, value, clear, isDate]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {isDate ? mn(value) : <MT>{value}</MT>}
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<MeetingRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(넓은 10컬럼 표) — fitGridWidth는 셀 잘림 7건(실측)
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 조합원총회 건이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 검색어는 미사용(OFF). 컬럼 미연동 필터는 caption으로 no-op(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조합원총회 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 목업 검색박스 항목 순서: 모펀드·운용사·자펀드·계정구분·담당자·총회구분·총회기간.
                그리드 컬럼과 미연동인 항목(모펀드·계정구분)은 noop 캡션. 담당자는 행 상세값으로 실제 필터링하되
                원문 미정의라 ⚠마커. 보고상태는 툴바 칩과 state를 공유한다. 기간은 PeriodPicker day 2개 */}
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            <DrawerField label="담당자" note={FILTER_NOTES.mgr}><DrawerSelect value={fMgr} onChange={setFMgr} options={mgrOptions} /></DrawerField>
            <DrawerField label="총회구분"><DrawerSelect value={fGt} onChange={setFGt} options={GT_OPTIONS} /></DrawerField>
            <DrawerField label="보고상태"><DrawerSelect value={fRst} onChange={(v) => setFRst(v as '' | MeetingStatus)} options={['일정', '결과']} /></DrawerField>
            {/* PeriodPicker 트리거는 w-full이라 fit-content 래퍼로 감싼다(apfs-datepicker "폭" 규칙) */}
            <DrawerField label="총회기간 시작" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="총회기간 시작일" /></div></DrawerField>
            <DrawerField label="총회기간 종료" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="총회기간 종료일" /></div></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 읽기전용 상세 팝업 — 제목 링크(또는 제목 셀 Enter)가 연다. 행 선택과 무관 ── */}
      {modal?.kind === 'detail' && target && <GeneralMeetingDetailModal row={target} onClose={() => setModal(null)} />}

    </GridFrame>
  );
}
