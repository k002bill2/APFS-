/* 수시보고 — 관리형 리스트 페이지 (투자자산관리 > 사후보고관리 > 수시보고).
   출처: S1_04_수시보고.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·심사담당자·리스크담당자·구분·기간)
       → 확인상태 FilterChip(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter)
       ⚠ 목업이 `data-dat="실 옵션값 미확인 — 없는 값 생성 안 함"`으로 표시한 항목(구분·심사담당자·
         리스크담당자)은 옵션을 지어내지 않는다. 담당자는 행에 실제로 기록된 확인자명에서만 파생하고,
         구분은 옵션 없이 noop 캡션만 남긴다.
   - 목록 그리드                → AG Grid 단일 헤더(apfs-aggrid). **합계행 없음** — 금액 컬럼이 없는 엔티티다.
   - 확인 워크플로우            → **셀 안 [확인] 버튼**(심사담당·리스크담당) → 확인 모달 → 확인자명 배지.
       ⚠ 2026-09-12 사용자 지시로 목업 S1_04 원본 구조를 채택했다: 행 선택(체크박스)을 없애고 전이를
         셀로 되돌렸다. 따라서 이 화면엔 **행 선택도 툴바 selbar도 없다** — `apfs-stage-workflow`의
         "전이는 오직 컨텍스트 액션으로"(규약 1)와 selbar 규약(4)은 이 화면에 적용되지 않는다.
         선택이 없으니 `selId`·`onSelectionChanged`·`rowSelection`도 두지 않으며, 확인 모달은
         대상 행 id를 모달 상태에 직접 싣는다.
       ⚠ **확인은 비가역**이다(목업 검토메모: "확인 후 확인자명만 표시(취소 불가)") — 확인 해제 액션을 만들지 않는다.
         확인된 셀은 버튼이 사라지고 배지만 남는다.
       파생 확인상태(미확인/일부확인/확인완료)는 컬럼이 아니라 **툴바 필터 칩**에만 쓰인다(stageOf).
   - 명세/보고서 팝업(opt-in)   → 사용자 결정(2026-09-12)으로 3종 전부 포함:
         보고서(OccasionalReportModal) · 운용사 명세(GpSpecModal) · 자펀드 명세(SubFundSpecModal 재사용)
       ⚠ 진입은 **그리드 셀 링크**다(운용사·자펀드·제목) — 목업 S1_04 원본 동작.
         2026-09-12 사용자 지시로 툴바 selbar 조회 버튼 3종과 행 더블클릭 진입을 삭제하고 링크로 일원화했다
         (apfs-spec-popup의 "툴바 버튼 + 더블클릭" 기본 진입 규약을 이 화면에서만 대체).
         더블클릭도 함께 뺀 이유: 링크가 진입점이면 운용사 링크를 두 번 눌렀을 때 행 더블클릭이 보고서를
         띄워 엉뚱한 팝업으로 바뀐다. 셀 링크는 **조회 전용**이며 단계 전이는 여전히 툴바에만 있다.
   - KPI 배지 행                → 미포함(2026-09-12 HITL 결정). 금액 개념이 없어 건수 지표뿐이었다.
   - 엑셀                       → SheetJS(단일 헤더, 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭은 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **이식한다**(2026-09-12 사용자 지시) — 원문 미정의 지점을 화면에서 바로 보여주는
     설계 메모라 스캐폴딩이 아니다. 목업 원문 5건 전부 옮겼다: 검색 3건(심사담당자·리스크담당자·구분) +
     확인 컬럼 2건(심사담당·리스크담당). 공용 `review_marker.tsx`, 규약은 apfs-grid 스킬. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker, reviewInnerHeader } from './review_marker';
import type { ReviewNote } from './review_marker';
import { OccasionalReportModal } from './occasional_report_modal';
import { GpSpecModal } from './gp_spec_modal';
import { SubFundSpecModal } from './subfund_spec_modal';
import type { SubFundRow } from './subfund_manage';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 · 상태 도메인
────────────────────────────── */
export interface OccReportRow {
  id: string; no: number;
  ind: string;          // 보고일자
  occ: string;          // 상황 발생일자
  gp: string; fn: string; title: string;
  jsBy: string | null;  // 심사담당 확인자명(null=미확인). 확인 후 취소 불가
  rsBy: string | null;  // 리스크담당 확인자명(null=미확인). 확인 후 취소 불가
}

/* 확인상태 — jsBy·rsBy 조합에서 파생(SSOT). 필터 칩·툴바 액션 맵의 키 */
type Stage = '미확인' | '일부확인' | '확인완료';
const STAGE_TONE: Record<Stage, Tone> = { 미확인: 'info', 일부확인: 'warning', 확인완료: 'success' };
const stageOf = (r: OccReportRow): Stage =>
  r.jsBy && r.rsBy ? '확인완료' : r.jsBy || r.rsBy ? '일부확인' : '미확인';

/* 확인자명 — 목업 하드코딩('홍길동').
   ⚠ 목업 검토메모: "확인자명이 확인버튼을 누른 로그인 사용자인지, 별도 지정된 심사담당인지 원문 미정의(추론)".
      백엔드/인증이 없는 프로토타입이므로 세션 조회로 키우지 않는다. */
const CONFIRMER = '홍길동';

/* 데모 데이터 — 파생 단계 전부 포함(미확인·일부확인·확인완료). 텍스트 N/A='-' */
const DEMO: OccReportRow[] = [
  { id: 'or-1', no: 1, ind: '2026-08-11', occ: '2026-08-03', gp: '마그나인베스트먼트(주)', fn: '마그나 GREEN 펀드', title: '쿠엔즈버킷 조건부 합의서 및 주주간계약 체결 보고', jsBy: null, rsBy: null },
  { id: 'or-2', no: 2, ind: '2026-04-02', occ: '2026-03-28', gp: 'KB인베스트먼트', fn: 'KB농식품1호투자조합', title: '투자기업 회생절차 개시 관련 수시보고', jsBy: null, rsBy: null },
  { id: 'or-3', no: 3, ind: '2026-04-15', occ: '2026-04-10', gp: 'IMM인베스트먼트', fn: 'IMM 농식품 스마트투자조합', title: '핵심운용인력(대표펀드매니저) 변경 통지', jsBy: CONFIRMER, rsBy: null },
  { id: 'or-4', no: 4, ind: '2026-05-06', occ: '2026-05-02', gp: '한국투자파트너스', fn: '한투 청년농식품투자조합', title: '출자자 지분 양수도 승인 요청', jsBy: null, rsBy: null },
  { id: 'or-5', no: 5, ind: '2026-05-20', occ: '2026-05-18', gp: '유안타인베스트먼트', fn: '유안타 수산투자조합', title: '투자기업 소송 발생 보고', jsBy: CONFIRMER, rsBy: CONFIRMER },
  { id: 'or-6', no: 6, ind: '2026-05-27', occ: '2026-05-25', gp: '대성창업투자', fn: '대성 농식품벤처투자조합', title: '조합 결산 일정 지연 관련 보고', jsBy: null, rsBy: null },
];

/* 자펀드 명세 팝업(SubFundSpecModal) 재사용용 행.
   ⚠ 목업 원문 한계 그대로: S1_03 실데이터가 1건뿐이라 어느 행의 자펀드를 눌러도 이 조합이 표시된다.
   ⚠ `stg: '결성'`은 load-bearing — SubFundSpecModal의 buildOverview가 `formed = stg === '결성'`으로
      조합고유번호·1좌당출자금액·결산월·수탁기관·납입방식·보수·담당자를 게이팅하고 재무표를 0으로 만든다.
      값은 목업 FUND_OV에서 그대로 옮겼다(우선손실충당률은 목업에 없어 null/'-' → '-'로 렌더). */
const SPEC_SUBFUND: SubFundRow = {
  id: 'spec-fund', no: 1, y: '2025', rt: '정기', ch: '1', stg: '결성',
  ctype: '농림수산식품투자조합', cg: '사업화(Step-up)', cs: '-',
  gp1: '인라이트벤처스', gp2: '-', fn: '인라이트 농식품 청년기업 성장펀드',
  fd: '2025-10-24', rd: '2025-11-07', yrs: null, dur: 8, mat: '2033-11-06', rate: 2,
  lgp: null, lmo: '-',
  c1: 12_100_000_000, c2: 7_000_000_000, c3: 5_100_000_000,
  v1: 12_100_000_000, v2: 7_000_000_000, v3: 5_100_000_000,
  p1: 3_630_000_000, p2: 2_100_000_000,
  rec: 0, ti: 0, tir: null, mi: 0, mir: null, dist: 0, mul: null,
  st: '운영중', liq: '-',
};

const PAGE_SIZE = 20;

/* 읽기전용 팝업 3종 — 셀 링크가 여는 대상 */
type SpecKind = 'report' | 'gpSpec' | 'fundSpec';
/* 컬럼 → 팝업 매핑. 마우스는 셀 안 <button>이, 키보드는 셀 포커스 + Enter가 같은 팝업을 연다.
   ⚠ AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button에 초점이 닿지 않는다(2026-09-12 실측).
      이 매핑 없이 링크만 두면 링크가 마우스 전용이 되어 키보드 조작 불가(WCAG 2.1.1). */
const SPEC_BY_COL: Record<string, SpecKind> = { gp: 'gpSpec', fn: 'fundSpec', title: 'report' };

/* 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 `aggrid_theme.ts`의 공용 상수를 쓴다 —
   인라인 리터럴 금지 이유(렌더마다 새 객체 → 폭이 선언값으로 되돌아감)는 그 파일 주석이 정본. */

/* 확인 주체. 컬럼 → 주체 매핑은 키보드(Enter) 진입에서도 쓴다 */
type Role = 'js' | 'rs';
const ROLE_LABEL: Record<Role, string> = { js: '심사담당', rs: '리스크담당' };
const ROLE_BY_COL: Record<string, Role> = { jsBy: 'js', rsBy: 'rs' };

/* ──────────────────────────────
   컬럼 정의 — 목업 원본 배열 그대로(단일 헤더):
     No · 보고일자 · 상황 발생일자 · 운용사 · 자펀드 · 제목 · 심사담당 · 리스크담당
   ⚠ 운용사·자펀드에 `pinned:'left'`를 주지 않는다 — pinned는 컬럼을 좌측 영역으로 끌어와
     목업 순서(보고일자·상황발생일자보다 뒤)를 깨뜨린다(2026-09-12 사용자 지시 "원본대로").
     좌측 고정은 No만(체크박스 컬럼은 2026-09-12 사용자 지시로 삭제 — 행 선택 자체가 없다).
   ⚠ 파생 '확인상태' 컬럼은 두지 않는다(2026-09-12 사용자 지시) — 목업에 없는 컬럼이다.
     파생값 자체는 남아 툴바 필터 칩이 계속 쓴다(stageOf).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const txt = (field: keyof OccReportRow, header: string, width: number, center?: boolean): ColDef<OccReportRow> => ({
  field, headerName: header, width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => <MT>{p.value}</MT>,
});
/* maxWidth = width — `fitGridWidth`가 남는 폭을 이 컬럼에 주지 못하게 막아, 잉여가 제목으로만 흘러가게 한다 */
const date = (field: keyof OccReportRow, header: string, width = 128): ColDef<OccReportRow> => ({
  field, headerName: header, width, maxWidth: width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
  valueFormatter: (p) => mn(p.value),
});
/* ⚠검토필요 메모 — 목업 `S1_04_수시보고.html`의 `data-rec`/`data-dat` 원문 그대로(5건).
   확인 컬럼 2건은 담당 명칭만 다르다(심사담당 / 리스크담당) — 원문이 그렇게 갈라져 있으므로 합치지 않는다.
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const CONFIRM_NOTE = (role: Role): ReviewNote => ({
  rec: '확인 후 확인자명만 표시(취소 불가)',
  dat: `확인자명이 확인버튼을 누른 로그인 사용자인지, 별도 지정된 ${ROLE_LABEL[role]}인지 원문 미정의(추론)`,
});
/* 모듈 스코프에 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid가 헤더를 통째로 remount한다 */
const CONFIRM_HEADER: Record<Role, ReturnType<typeof reviewInnerHeader>> = {
  js: reviewInnerHeader(CONFIRM_NOTE('js')),
  rs: reviewInnerHeader(CONFIRM_NOTE('rs')),
};
/* 검색(상세필터) 메모 3건 — 원문 라벨: 심사담당자 · 리스크담당자 · 구분 */
const FILTER_NOTES: Record<'js' | 'rs' | 'kind', ReviewNote> = {
  js:   { rec: '심사담당자 목록(공통코드/사용자)', dat: '실 담당자 옵션값 미확인 — 없는 값 생성 안 함' },
  rs:   { rec: '리스크담당자 목록(공통코드/사용자)', dat: '실 담당자 옵션값 미확인 — 없는 값 생성 안 함' },
  kind: { rec: '보고구분 등 (공통코드)', dat: '실 옵션값 미확인 — 없는 값 생성 안 함' },
};

/* 확인 컬럼 — 미확인이면 셀 안 [확인] 버튼, 확인되면 확인자명 배지(목업 S1_04 `cell()` 그대로).
   2026-09-12 사용자 지시로 툴바 컨텍스트 액션을 대체한다 — 행 선택(체크박스)이 없어졌으므로
   전이를 실을 곳이 셀뿐이다(apfs-stage-workflow 규약 1의 이 화면 한정 예외).
   확인자명은 인명 데이터라 <MT> 마스킹, '확인' 라벨은 액션이라 비마스킹. */
const confirmCol = (field: 'jsBy' | 'rsBy', header: string, role: Role,
                    onConfirm: (role: Role, id: string) => void): ColDef<OccReportRow> => ({
  field, headerName: header, width: 146, maxWidth: 146, cellStyle: flexMid, sortable: true,
  headerComponentParams: { innerHeaderComponent: CONFIRM_HEADER[role] },
  /* Tab을 AG Grid 헤더 내비게이션에서 빼 브라우저 기본 순서로 넘긴다 — 안 하면 헤더 안의
     ⚠마커 버튼에 키보드로 도달할 수 없다(AG Grid가 Tab을 가로채 다음 헤더 셀로 이동, 2026-09-12 실측). */
  suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab',
  cellRenderer: (p: any) => (p.value
    ? <StatusBadge tone="success" label={<MT>{p.value}</MT>} size="lg" dot={false} />
    : <Button variant="outline" size="sm" onClick={() => onConfirm(role, p.data.id)}>확인</Button>),
});

/* 셀 내 링크 — 클릭 시 해당 명세/보고서 팝업(목업 S1_04의 셀 링크 동작 그대로).
   2026-09-12 사용자 지시로 툴바 조회 버튼 3종을 대체한다.
   ⚠ `title`엔 동작 힌트만 담는다 — 값을 넣으면 마스크 ON일 때 툴팁으로 실데이터가 샌다
     (마스크 경계는 툴팁·엑셀까지). 같은 이유로 제목 컬럼의 `tooltipField`도 두지 않는다.
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다.
   외관은 목업 `.linktxt` 그대로: primary 색 + font-weight 600, **평상시 밑줄 없음 / hover에만 밑줄**
   (2026-09-12 사용자 지시 "밑줄 삭제" = 목업 원본 `text-decoration:none`과 일치). */
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

const makeColumns = (openSpec: (k: SpecKind) => void, onConfirm: (role: Role, id: string) => void): ColDef<OccReportRow>[] => [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  date('ind', '보고일자'),
  date('occ', '상황 발생일자', 136),
  { ...txt('gp', '운용사', 180), maxWidth: 240,
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="운용사 명세 보기" onClick={() => openSpec('gpSpec')} /> },
  { ...txt('fn', '자펀드', 210), maxWidth: 300,
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="자펀드 명세 보기" onClick={() => openSpec('fundSpec')} /> },
  /* 제목이 남는 폭을 흡수한다 — 목업 표가 `width:100%`라 우측에 빈 여백이 없다(2026-09-12 사용자 지시).
     방식은 **`maxWidth` 없는 유일한 컬럼 + 그리드 `autoSizeStrategy: fitGridWidth`**다:
     다른 컬럼은 전부 maxWidth에서 성장이 멈추므로 잉여가 제목으로만 흘러간다.
     ⚠ `flex: 1`은 이 그리드에서 동작하지 않았다(2026-09-12 실측) — `width`와 함께 두면 width가 이기고,
       width를 빼면 minWidth(300)에 묶인 채 우측 여백 256px가 그대로 남았다. flex로 재시도하지 말 것.
     ⚠ 공용 `AUTO_SIZE_CONTENT`(fitCellContents)도 쓸 수 없다 — 전 컬럼에 내용 맞춤 고정 폭을 덮어써
       남는 폭을 아무도 흡수하지 못한다. */
  { field: 'title', headerName: '제목', width: 330, minWidth: 300, cellStyle: flexCenter,
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="수시보고서 보기" onClick={() => openSpec('report')} /> },
  confirmCol('jsBy', '심사담당', 'js', onConfirm),
  confirmCol('rsBy', '리스크담당', 'rs', onConfirm),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 순서·집합이 목업 원본 헤더와 같다.
   cellRenderer와 분리해 값 추출을 명시한다(미확인 fallback 포함) */
type XCol = { header: string; get: (r: OccReportRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '보고일자', get: (r) => r.ind }, { header: '상황 발생일자', get: (r) => r.occ },
  { header: '운용사', get: (r) => r.gp }, { header: '자펀드', get: (r) => r.fn }, { header: '제목', get: (r) => r.title },
  { header: '심사담당', get: (r) => r.jsBy ?? '미확인' }, { header: '리스크담당', get: (r) => r.rsBy ?? '미확인' },
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
/* 확인 모달은 **대상 행 id를 직접 싣는다** — 행 선택(체크박스)이 없어 `selected`가 존재하지 않는다 */
type ModalState = null | { kind: 'confirm'; role: Role; id: string } | { kind: 'report' } | { kind: 'gpSpec' } | { kind: 'fundSpec' };

export function OccasionalReportManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<OccReportRow> | null>(null);
  const [rows, setRows] = useState<OccReportRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  /* setModal은 useState 세터라 안정 — deps []로 컬럼 정의를 고정한다(매 렌더 새 배열이면 그리드가 컬럼을 재생성) */
  const columnDefs = useMemo(() => makeColumns(
    (k: SpecKind) => setModal({ kind: k }),
    (role: Role, id: string) => setModal({ kind: 'confirm', role, id }),
  ), []);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  const masked = useMask();

  /* 필터 — 확인상태는 툴바 칩, 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fStage, setFStage] = useState<'' | Stage>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fMf, setFMf] = useState('');        // 모펀드 — 행 컬럼 아님(no-op)
  const [fAcc, setFAcc] = useState('');      // 계정구분 — 행 컬럼 아님(no-op)
  const [fJs, setFJs] = useState('');        // 심사담당자 — 지정 담당자 필드가 원문 미정의(no-op)
  const [fRs, setFRs] = useState('');        // 리스크담당자 — 동상(no-op)
  const [fKind, setFKind] = useState('');    // 구분 — 공통코드 옵션값 미확인(no-op, 옵션 없음)
  const clearFilters = () => { setFStage(''); setFGp(''); setFFund(''); setFFrom(''); setFTo(''); setFMf(''); setFAcc(''); setFJs(''); setFRs(''); setFKind(''); };

  /* 기간은 **보고일자(ind)** 기준 — 목업 라벨이 '기간'뿐이라 목록의 주 일자에 건다(보고일자/상황발생일자 중) */
  const passes = useCallback((r: OccReportRow) => {
    if (fStage && stageOf(r) !== fStage) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    if (fFrom && r.ind < fFrom) return false;
    if (fTo && r.ind > fTo) return false;
    return true;
  }, [fStage, fGp, fFund, fFrom, fTo]);
  const filterActive = Boolean(fStage || fGp || fFund || fFrom || fTo);
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
  const doesExternalFilterPass = useCallback((node: IRowNode<OccReportRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);
  /* 담당자 옵션 — 목업이 "없는 값 생성 안 함"으로 못 박아, 행에 실제로 기록된 확인자명에서만 파생한다 */
  const jsNames = useMemo(() => Array.from(new Set(rows.map((r) => r.jsBy).filter((v): v is string => Boolean(v)))), [rows]);
  const rsNames = useMemo(() => Array.from(new Set(rows.map((r) => r.rsBy).filter((v): v is string => Boolean(v)))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<OccReportRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — 셀에 초점을 둔 채 Enter. AG Grid Tab이 셀 안 button에 닿지 않는 문제를 메운다.
     링크 컬럼(운용사·자펀드·제목)은 팝업, 확인 컬럼(심사담당·리스크담당)은 확인 모달.
     ⚠ 확인 컬럼은 **아직 미확인인 행**에서만 연다 — 확인된 셀은 배지뿐이라 누를 버튼이 없다(비가역). */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<OccReportRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter') return;
    const colId = e.column.getColId();
    const kind = SPEC_BY_COL[colId];
    if (kind) { setModal({ kind }); return; }
    const role = ROLE_BY_COL[colId];
    if (role && e.data && !e.data[colId as 'jsBy' | 'rsBy']) setModal({ kind: 'confirm', role, id: e.data.id });
  }, []);

  const patchRow = (id: string, patch: Partial<OccReportRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ── 확인 워크플로우 — 전이는 셀 [확인] 버튼(또는 셀 Enter) → 확인 모달. 비가역: 해제 액션 없음 ── */
  const confirmTarget = modal?.kind === 'confirm' ? rows.find((r) => r.id === modal.id) ?? null : null;
  const doConfirm = (role: Role, id: string) => {
    patchRow(id, role === 'js' ? { jsBy: CONFIRMER } : { rsBy: CONFIRMER });
    setModal(null);
    toast.success(`${ROLE_LABEL[role]} 확인 처리되었습니다`);
  };

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
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '제목' ? 42 : c.header === '자펀드' ? 28 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '수시보고');
    XLSX.writeFile(wb, '수시보고.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '수시보고']}
      title="수시보고"
      favRoute="occasional-report"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌는 항상 필터칩이다 — 행 선택(체크박스)을 없앤 2026-09-12 이후 selbar가 존재하지 않는다.
         확인 전이는 셀 [확인] 버튼, 조회 팝업은 셀 링크가 각각 가져갔다(목업 S1_04 원본 구조). */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '미확인', '일부확인', '확인완료'] as ('' | Stage)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fStage === s} onClick={() => setFStage(s)}>{s || '전체'}</FilterChip>
          ))}
          {([
            ['운용사', fGp, () => setFGp('')],
            ['자펀드', fFund, () => setFFund('')],
            ['시작일', fFrom, () => setFFrom('')],
            ['종료일', fTo, () => setFTo('')],
          ] as [string, string, () => void][]).filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <MT>{value}</MT>
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
        <AgGridReact<OccReportRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={FIT_GRID_WIDTH}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 수시보고 건이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 검색어는 미사용(OFF). 컬럼 미연동 필터는 caption으로 no-op(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">수시보고 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 목업 검색박스 항목 순서: 모펀드·운용사·자펀드·계정구분·심사담당자·리스크담당자·구분·기간.
                그리드 컬럼과 미연동인 항목은 noop 캡션. 담당자 옵션은 행의 확인자명에서만 파생(값 생성 금지),
                구분은 공통코드 옵션값이 원문 미확인이라 옵션 없이 둔다. 기간은 PeriodPicker day 2개(apfs-datepicker) */}
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            <DrawerField label="심사담당자" noop note={FILTER_NOTES.js}><DrawerSelect value={fJs} onChange={setFJs} options={jsNames} /></DrawerField>
            <DrawerField label="리스크담당자" noop note={FILTER_NOTES.rs}><DrawerSelect value={fRs} onChange={setFRs} options={rsNames} /></DrawerField>
            <DrawerField label="구분" noop note={FILTER_NOTES.kind}><DrawerSelect value={fKind} onChange={setFKind} options={[]} /></DrawerField>
            <DrawerField label="확인상태"><DrawerSelect value={fStage} onChange={(v) => setFStage(v as '' | Stage)} options={['미확인', '일부확인', '확인완료']} /></DrawerField>
            <DrawerField label="기간 시작 (보고일자)" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="조회기간 시작일" /></div></DrawerField>
            <DrawerField label="기간 종료 (보고일자)" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="조회기간 종료일" /></div></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 확인 처리 확인(목업 클라이언트 회신 명시 UX — toast로 격하 금지). 비가역이라 설명에 명시 ── */}
      {modal?.kind === 'confirm' && confirmTarget && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ROLE_LABEL[modal.role]} 확인</AlertDialogTitle>
              <AlertDialogDescription>
                아래 수시보고 건을 {ROLE_LABEL[modal.role]}이 확인 처리합니다.
                {' '}확인 후에는 <b className="text-foreground">취소할 수 없습니다.</b>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* 대상 요약 4행 — 목업 원본과 동일(상황 발생일자·운용사·자펀드·제목).
                제목을 설명 문장에 묻지 않는다(2026-09-12 사용자 지적) — 목록의 한 행이다. */}
            <dl className="m-0 grid gap-y-1.5" style={{ gridTemplateColumns: 'max-content minmax(0,1fr)', columnGap: 14, fontSize: 13.5 }}>
              {([['상황 발생일자', mn(confirmTarget.occ)], ['운용사', <MT key="gp">{confirmTarget.gp}</MT>], ['자펀드', <MT key="fn">{confirmTarget.fn}</MT>], ['제목', <MT key="ti">{confirmTarget.title}</MT>]] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="m-0 font-semibold text-muted-foreground">{k}</dt>
                  <dd className="m-0 min-w-0" style={{ overflowWrap: 'anywhere' }}>{v}</dd>
                </div>
              ))}
            </dl>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doConfirm(modal.role, modal.id)}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── 읽기전용 팝업 3종 — 셀 링크가 연다. 행 선택과 무관하므로 `selected` 게이트 없음 ── */}
      {modal?.kind === 'report' && <OccasionalReportModal onClose={() => setModal(null)} />}
      {modal?.kind === 'gpSpec' && <GpSpecModal onClose={() => setModal(null)} />}
      {modal?.kind === 'fundSpec' && <SubFundSpecModal row={SPEC_SUBFUND} onClose={() => setModal(null)} />}

    </GridFrame>
  );
}
