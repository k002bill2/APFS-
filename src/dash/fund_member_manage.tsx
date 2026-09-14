/* 자펀드별조합원조회 — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 자펀드별조합원조회).
   출처: S1_18_자펀드별조합원관리.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분 4항목 + [조회] 버튼)
       → **계정구분 FilterChip**(툴바 좌, 목업 chipGroup 그대로 전체·농식품·수산) + 상세필터 드로어(Sheet).
         드로어 항목 순서는 목업 검색박스 순서 그대로(모펀드·운용사·자펀드·계정구분). 검색어는 OFF(미요청).
         목업 [조회] 버튼은 즉시 반영형이라 없다.
       ⚠ 목업 기본 선택값(계정구분 '농식품' · 운용사 'KB증권(주)' · 자펀드 selected)은 **적용하지 않는다** —
         6행 전부가 같은 값이라 첫 화면이 "필터가 걸린 상태"로 보인다(열린 경계 = 전체).
       ⚠ 모펀드는 행 컬럼이 아니라 no-op(`· 데이터 연동 후 적용` 캡션)이다.
       ⚠ 운용사 옵션은 **행에서 파생**한다(관측값 KB증권(주) 1건). 목업의 IMM인베스트먼트·한국투자파트너스는
         원문 주석이 "그 외 옵션 예시"라고 밝힌 예시값이라 옮기지 않는다(옵션 창작 금지) — 그 판단을 ⚠마커로 남긴다.
   - 목록 그리드(13컬럼 단일 헤더) → AG Grid(apfs-aggrid) + **pinned 합계행**(목업 tfoot).
       목업 tfoot은 colspan 9 '합계' + 최초/최종 출자약정액 2합 + colspan 2 '-'인데 AG Grid는 셀 병합이 없다 →
       No 셀만 '합 계', 두 약정액은 합, 나머지 텍스트 셀은 빈 값, 합계 없는 금액(결성액)은 '-'(apfs-aggrid 규약).
   - 행 선택 후 [등록][수정][삭제](목업) → **선택 UI 없이** APFS 단건 CRUD 관례로 치환(report_form_manage 골드):
       등록 = 툴바 RegisterCombo(⌘⏎) · 수정 = 행 더블클릭·셀 Enter·우클릭 메뉴 ·
       삭제 = 우클릭 메뉴(→ AlertDialog) 또는 수정 모달 안 2단계 삭제.
   - 등록/수정 단일 폼 2모드 팝업 → RowFormModal + `fund_member_manage_schemas.ts`(CREATE/EDIT 2스키마,
       6필드라 460px 1단). 제목은 `title` prop으로 '조합원 등록'/'조합원 수정'(목업 h2 그대로).
   - 엑셀(목업 [엑셀] 버튼) → SheetJS 단일 헤더 + 합계행. 마스크 ON이면 숫자 0·텍스트 ''.
   - KPI 배지 행 미포함 · 카드뷰 없음 · 명세 팝업 없음 · 금액 단위 토글 없음(목업 설계메모: 편집 있는 관리화면이라 미적용).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **전수 이식**했다 — 목업 원문 2건: 검색 1건(운용사) + 등록 팝업 라벨 1건(조합원, FieldSpec.note).
     공용 `review_marker.tsx`, 규약은 apfs-grid 스킬.

   한계·가정(결정 기록)
   - **조합원 마스터 미연동** — 목업 등록 팝업의 조합원 select는 옵션이 0개(`선택`뿐)다. 빈 select 금지 +
     옵션 창작 금지가 동시에 걸려 `text` 입력으로 격하하고 근거를 ⚠마커로 남겼다(schemas 파일 주석 참조).
   - **최종 출자약정액·출자배분 거래유무는 팝업 입력 항목이 아니다**(목업 설계메모: 실 캡처에 해당 필드 없음).
     등록 시 최종=최초로 시드하고 거래유무는 미배분 상태 'N'으로 둔다 — 목업 save 핸들러는 toast만 띄우고
     행을 추가하지 않아 이 두 값의 원문 근거가 없다(창작이 아니라 공백 메움임을 명시).
   - 계정구분 기본 '농식품'(목업 chipGroup 초기값)은 위 사유로 적용하지 않았다.
   - 마스크 경계 때문에 `tooltipField`를 두지 않는다(툴팁으로 실값이 샌다). 긴 명칭은 컬럼 리사이즈로 본다. */
import './aggrid_shared.css';   // 합계(floating)행 opacity:0 stuck 버그 보정 + 마스크 헤더 바(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF, numFmt, numStyle } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, ValueFormatterParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowFormModal } from './generic_list_modal';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';
import { CREATE_SCHEMA, EDIT_SCHEMA, CLS_OPTS, TYPE_OPTS } from './fund_member_manage_schemas';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터 — 목업 하단 `<script>`의 FUND·DATA 값 그대로(창작 없음)
────────────────────────────── */
/* 자펀드 컨텍스트 — 목업에서 6행 모두가 공유하는 상위 고정값(운용사·자펀드·계정구분·등록일·결성액).
   `as const`로 acc를 리터럴 타입에 고정해 행 스프레드가 유니온과 맞는다. */
const FUND = {
  gp: 'KB증권(주)',
  fn: '현대동양농식품사모투자전문회사',
  acc: '농식품',
  rd: '2011-04-04',
  formed: 32_000_000_000,
} as const;

export interface FundMemberRow {
  id: string; no: number;
  gp: string;                  // 운용사
  fn: string;                  // 자펀드
  acc: '농식품' | '수산';       // 계정구분(목업 설계메모: '자펀드계정' → 표준어 '계정구분')
  rd: string;                  // 등록일 'YYYY-MM-DD'
  formed: number;              // 결성액(원)
  mem: string;                 // 조합원
  cls: 'GP' | 'LP' | 'SP';      // 조합원구분 — CDTP:BKIND
  mtype: string;               // 조합원유형 — CDTP:JKIND
  c1: number;                  // 최초 출자약정액(원)
  c2: number;                  // 최종 출자약정액(원)
  memo: string;                // 비고('-' = 없음)
  deal: 'Y' | 'N';              // 출자배분 거래유무
}

/* 목업 DATA 6행(2026-08-31 실 화면 캡처 기준 전량 교체분) — 열별 합이 결성액 32,000,000,000과 일치한다 */
const DEMO: FundMemberRow[] = [
  { id: 'fm-1', no: 1, ...FUND, mem: '농식품모태펀드', cls: 'SP', mtype: '모태펀드', c1: 15_700_000_000, c2: 15_700_000_000, memo: '-', deal: 'Y' },
  { id: 'fm-2', no: 2, ...FUND, mem: 'KB증권(주)', cls: 'GP', mtype: '증권사', c1: 8_150_000_000, c2: 8_150_000_000, memo: '구.현대증권', deal: 'Y' },
  { id: 'fm-3', no: 3, ...FUND, mem: '유안타인베스트먼트', cls: 'GP', mtype: '창투사', c1: 3_150_000_000, c2: 3_150_000_000, memo: '구.동양인베스트먼트', deal: 'Y' },
  { id: 'fm-4', no: 4, ...FUND, mem: '농협은행', cls: 'LP', mtype: '은행', c1: 0, c2: 2_000_000_000, memo: '-', deal: 'Y' },
  { id: 'fm-5', no: 5, ...FUND, mem: '농협중앙회', cls: 'LP', mtype: '은행', c1: 2_000_000_000, c2: 0, memo: '-', deal: 'Y' },
  { id: 'fm-6', no: 6, ...FUND, mem: '동양생명보험', cls: 'LP', mtype: '보험사', c1: 3_000_000_000, c2: 3_000_000_000, memo: '-', deal: 'Y' },
];

/* 합계 대상 = 목업 tfoot이 실제로 합산하는 2열뿐. 결성액은 자펀드 단일 값이라 행 합산 대상이 아니다(→ '-'). */
const SUM_KEYS = ['c1', 'c2'] as const;
const NUM_KEYS = new Set<string>(['formed', ...SUM_KEYS]);
/* pinned 합계행 — 텍스트 컬럼은 빈 값, 결성액은 null('-'). `any` 경유는 합계행만 formed=null을 쓰기 때문
   (행 타입은 실데이터 계약을 유지한다 — subfund_manage computeTotal 동형). */
function computeTotal(rows: FundMemberRow[]): FundMemberRow {
  const t: any = { id: '__total', no: 0, gp: '', fn: '', acc: '', rd: '', formed: null, mem: '', cls: '', mtype: '', memo: '', deal: '' };
  for (const k of SUM_KEYS) t[k] = rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return t as FundMemberRow;
}

const PAGE_SIZE = 20;

/* ⚠검토필요 메모 — 목업 `data-rec`/`data-dat` 원문 그대로(1건, 검색 영역). 설계 메모라 마스킹·엑셀 대상이 아니다.
   등록 팝업 조합원 라벨의 나머지 1건은 `fund_member_manage_schemas.ts`의 FieldSpec.note가 소유한다. */
const FILTER_NOTES: Record<'gp', ReviewNote> = {
  gp: { rec: '실 운용사(GP) 목록 연동', dat: "실데이터 'KB증권' 1건만 관측 · 그 외 옵션 예시" },
};

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서 그대로(단일 헤더 13컬럼):
     No · 운용사 · 자펀드 · 계정구분 · 등록일 · 결성액 · 조합원 · 조합원구분 · 조합원유형 ·
     최초 출자약정액 · 최종 출자약정액 · 비고 · 출자배분 거래유무
   ⚠ 좌측 고정은 No만 — 다른 컬럼에 pinned를 주면 좌측 영역으로 끌려와 목업 순서가 깨진다.
   ⚠ 폭 관련 그리드 prop(autoSizeStrategy·defaultColDef)은 aggrid_theme.ts 공용 상수만 쓴다(인라인 금지).
────────────────────────────── */
/* AG Grid cellStyle은 CellStyle(문자열 인덱스 시그니처) — React CSSProperties와 타입이 다르다 */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 숫자 N/A(null)는 '-'로 — 공유 numFmt(콤마·소수·마스킹)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));

/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다.
   합계행은 값이 없으므로 null(목업 tfoot의 병합 셀 자리). */
const txt = (field: keyof FundMemberRow, header: string, width: number, center?: boolean): ColDef<FundMemberRow> => ({
  field, headerName: header, width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : <span className="min-w-0 truncate"><MT>{p.value}</MT></span>),
});
const date = (field: keyof FundMemberRow, header: string, width = 112): ColDef<FundMemberRow> => ({
  field, headerName: header, width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
  valueFormatter: (p) => (p.node?.rowPinned ? '' : mn(p.value)),
});
const amt = (field: keyof FundMemberRow, header: string, strong?: boolean, width = 158): ColDef<FundMemberRow> => ({
  field, headerName: header, width, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle(strong) as any,
});

/* 조합원유형 칩 — 목업 `typeTag()`: 모태펀드만 강조 톤(.tag.b), 나머지는 무채색(.tag.n).
   무채색은 StatusBadge tone 집합에 없어(primary/success/warning/danger/info/cyan) 인라인 칩으로 그리되,
   치수·라운드는 StatusBadge size="lg"와 동일 클래스를 써서 같은 열에서 두 칩이 어긋나지 않게 한다. */
function TypeChip({ value }: { value: string }) {
  if (value === '모태펀드') return <StatusBadge tone="primary" label={value} size="lg" dot={false} />;
  return (
    <span className="inline-flex items-center rounded-[7px] px-[10px] py-[4px] text-[13px] font-bold leading-tight whitespace-nowrap bg-muted text-muted-foreground">{value}</span>
  );
}

const columnDefs: ColDef<FundMemberRow>[] = [
  /* No는 축(순번)이라 비마스킹. 합계행은 목업 tfoot 라벨 '합계' → 골드 표기 '합 계' */
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum,
    valueFormatter: (p) => (p.node?.rowPinned ? '합 계' : String(p.value)) },
  { ...txt('gp', '운용사', 190), maxWidth: 240 },
  { ...txt('fn', '자펀드', 240), maxWidth: 300 },
  txt('acc', '계정구분', 96, true),
  date('rd', '등록일'),
  amt('formed', '결성액'),
  /* 조합원 = 이 화면의 주 엔티티라 굵게(목업도 좌측정렬 본문 열) */
  { ...txt('mem', '조합원', 180),
    cellRenderer: (p: any) => (p.node.rowPinned ? null : <span className="min-w-0 truncate font-semibold"><MT>{p.value}</MT></span>) },
  txt('cls', '조합원구분', 110, true),
  { field: 'mtype', headerName: '조합원유형', width: 120, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.node.rowPinned ? null : <TypeChip value={p.value} />) },
  amt('c1', '최초 출자약정액', true),
  amt('c2', '최종 출자약정액', true),
  /* 비고 — 목업의 '-'(값 없음)는 muted로 낮춘다(마스킹 대상 아님: 값이 아니라 공백 표식) */
  { ...txt('memo', '비고', 170),
    cellRenderer: (p: any) => (p.node.rowPinned ? null
      : p.value === '-' ? <span style={{ color: 'var(--muted-foreground)' }}>-</span>
      : <span className="min-w-0 truncate"><MT>{p.value}</MT></span>) },
  txt('deal', '출자배분 거래유무', 140, true),
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 액션 컬럼이 없어 13열 전부 직렬화한다. */
type XCol = { header: string; key: keyof FundMemberRow; num?: boolean; wch: number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', key: 'no', wch: 6 },
  { header: '운용사', key: 'gp', wch: 20 },
  { header: '자펀드', key: 'fn', wch: 30 },
  { header: '계정구분', key: 'acc', wch: 10 },
  { header: '등록일', key: 'rd', wch: 12 },
  { header: '결성액', key: 'formed', num: true, wch: 18 },
  { header: '조합원', key: 'mem', wch: 20 },
  { header: '조합원구분', key: 'cls', wch: 12 },
  { header: '조합원유형', key: 'mtype', wch: 14 },
  { header: '최초 출자약정액', key: 'c1', num: true, wch: 18 },
  { header: '최종 출자약정액', key: 'c2', num: true, wch: 18 },
  { header: '비고', key: 'memo', wch: 20 },
  { header: '출자배분 거래유무', key: 'deal', wch: 16 },
];

/* 드로어 입력 — 폭은 fit-content(내용 맞춤), 하한은 타입별 controlMinWidth SSOT. 색은 토큰.
   ⚠ 패밀리는 fontFamily(longhand)로만 상속 — `font:'inherit'`(단축)를 fontSize 뒤에 두면 14px이 리셋된다. */
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

/* 드로어 필드 래퍼 — noop=컬럼 미연동 필터(캡션으로 no-op 신호), note=⚠검토필요 마커(apfs-detail-filter) */
function DrawerField({ label, noop, note, children }: { label: string; noop?: boolean; note?: ReviewNote; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{note && <ReviewMarker {...note} label={label} />}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </label>
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

/* 보조 액션 항목(내보내기·인쇄) — 푸터 폴백 kebab과 툴바 combo가 **같은 조각**을 공유한다(복제하면 힌트가 갈라짐) */
function MoreMenuItems({ onExport }: { onExport: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onExport}>
        <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => window.print()}>
        <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}

/* kebab(···) — **푸터 폴백 전용**. 등록이 있는 리스트의 툴바에는 RegisterCombo ⌄가 같은 항목을 제공한다 */
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
      <DropdownMenuContent><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
    </DropdownMenu>
  );
}

/* 등록 combo(split) 버튼 — 좌: 1차 액션 즉시 실행 · 우: ⌄ 보조 메뉴. 골드 로컬 복사본(공유 export 아님).
   UI.Button을 못 쓰는 이유(forwardRef 없음·motion scale 이음매)와 overflow-hidden/.apfs-menu-trigger 금지 근거는 apfs-grid 스킬. */
function RegisterCombo({ label, onRegister, onExport }: { label: string; onRegister: () => void; onExport: () => void }) {
  return (
    <span className="inline-flex items-stretch rounded-[9px] border border-border-strong bg-card">
      <button type="button" onClick={onRegister}
        className="inline-flex items-center gap-[7px] rounded-l-[9px] border-0 bg-transparent px-[11px] py-1.5 font-[inherit] text-[12.5px] font-semibold text-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary">
        <Icon name="plus" size={14} stroke={2.2} />{label}
      </button>
      <span aria-hidden className="w-px self-stretch bg-border-strong" />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger aria-label="더보기"
                className="inline-flex h-full items-center justify-center rounded-r-[9px] border-0 bg-transparent px-2 text-muted-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary data-[state=open]:text-primary">
                <Icon name="chevron-down" size={14} stroke={2.2} />
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>더보기</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end"><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string };
type Acc = FundMemberRow['acc'];

/* 계정구분 칩 — 목업 chipGroup(['전체','농식품','수산']) 그대로. 초기값 '농식품'은 적용하지 않는다(파일 상단 '한계') */
const ACC_OPTS: Acc[] = ['농식품', '수산'];

export function FundMemberManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<FundMemberRow> | null>(null);
  const [rows, setRows] = useState<FundMemberRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  // 앱-스코프 단축키: ⌘⏎=조합원 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 계정구분은 툴바 칩 + 드로어가 **같은 state를 공유**한다(표시가 갈라지지 않게).
     SSOT=개별 state(빈 값=미적용, 열린 경계) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fAcc, setFAcc] = useState<'' | Acc>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fMf, setFMf] = useState('');       // 모펀드 — 행 컬럼 아님(no-op)
  const clearFilters = () => { setFAcc(''); setFGp(''); setFFund(''); setFMf(''); };

  const passes = useCallback((r: FundMemberRow) => {
    if (fAcc && r.acc !== fAcc) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    return true;
  }, [fAcc, fGp, fFund]);
  const filterActive = Boolean(fAcc || fGp || fFund);
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
  const doesExternalFilterPass = useCallback((node: IRowNode<FundMemberRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  /* pinned 합계행 — 등록·삭제로 행이 바뀌므로 useMemo 재계산(참조 안정 + stale 방지, apfs-aggrid 계약4) */
  const pinnedBottom = useMemo(() => [computeTotal(filteredRows)], [filteredRows]);
  /* 운용사·자펀드 옵션은 행에서 파생(옵션 창작 금지 — 파일 상단 '구성' 참조) */
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<FundMemberRow>) => { apiRef.current = e.api; }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState는 렌더 루프 유발(aggrid-onpaginationchanged-render-loop) */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 수정 진입 3경로 — 행 더블클릭 · 셀 Enter · 우클릭 메뉴(합계행 제외) */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<FundMemberRow>) => {
    if (e.data && !e.rowPinned) setModal({ kind: 'edit', id: e.data.id });
  }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<FundMemberRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned) return;
    setModal({ kind: 'edit', id: e.data.id });
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<FundMemberRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;   // pinned 합계행 제외(수정·삭제가 무의미 + 합계 stale)
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', id: row.id }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const target = modal && modal.kind !== 'create' ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* ── CRUD — 불변 갱신 + toast(목업 클라이언트 회신 문구 유지) ── */
  const str = (v: unknown) => String(v ?? '').trim();
  const numOr = (v: unknown) => { const n = Number(str(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const saveCreate = (f: any) => {
    /* 목업 no는 렌더 순번(i+1)이라 삭제 후 재번호가 없다 → 최대값+1을 부여하고 **말미**에 추가(목업 no 순) */
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
    const c1 = numOr(f.c1);
    setRows((prev) => [...prev, {
      id: crypto.randomUUID(), no: nextNo, ...FUND,
      mem: str(f.mem), cls: (str(f.cls) || CLS_OPTS[0]) as FundMemberRow['cls'], mtype: str(f.mtype) || TYPE_OPTS[0],
      c1,
      c2: c1,              // 최종=최초로 시드 — 목업 팝업에 최종출자약정액 입력이 없다(파일 상단 '한계')
      memo: str(f.memo) || '-',
      deal: 'N',           // 출자배분 거래유무도 팝업 입력 항목이 아니다 → 미배분 상태로 등록(동상)
    }]);
    setModal(null);
    toast.success('등록되었습니다 (목업)');
  };
  const saveEdit = (f: any) => {
    if (!target) return;
    /* 목업 수정 팝업이 바꿀 수 있는 값만 갱신한다(조합원=readonly · 최종출자약정액·거래유무는 입력 항목 없음) */
    setRows((prev) => prev.map((r) => (r.id === target.id ? {
      ...r,
      mtype: str(f.mtype) || r.mtype,
      cls: (str(f.cls) || r.cls) as FundMemberRow['cls'],
      c1: numOr(f.c1),
      memo: str(f.memo) || '-',
    } : r)));
    setModal(null);
    toast.success('수정되었습니다 (목업)');
  };
  const doDelete = () => {
    if (!target) return;
    setRows((prev) => prev.filter((r) => r.id !== target.id));   // no 재번호 없음(목업 동일), 합계는 useMemo가 재계산
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더 13열 + 합계행(화면=엑셀 불변식). 마스크 ON이면 숫자 0·텍스트 '' ──
     No는 축(순번)이라 화면과 동일하게 비마스킹(subfund_manage 동형). */
  const exportExcel = () => {
    const src = [...filteredRows, pinnedBottom[0]];
    const head = EXPORT_COLS.map((c) => c.header);
    const body = src.map((r, i) => EXPORT_COLS.map((c) => {
      const v = (r as any)[c.key];
      if (c.key === 'no') return i === src.length - 1 ? '합 계' : v;
      if (c.num) return v == null ? '' : masked ? 0 : v;
      return masked ? '' : (v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    src.forEach((r, i) => EXPORT_COLS.forEach((c, j) => {
      if (!c.num || (r as any)[c.key] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 1, c: j });   // +1 = 헤더 1행
      if (ws[a]) ws[a].z = '#,##0';
    }));
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '자펀드별조합원조회');
    XLSX.writeFile(wb, '자펀드별조합원조회.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(filteredRows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '자펀드별조합원조회']}
      title="자펀드별조합원조회"
      favRoute="fund-member"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(계정구분) + 적용 중인 드로어 값 칩. 행 선택이 없어 selbar는 존재하지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', ...ACC_OPTS] as ('' | Acc)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fAcc === s} onClick={() => setFAcc(s)}>{s || '전체'}</FilterChip>
          ))}
          {/* 값만 표시(접두사 없음) + × — 운용사·자펀드는 텍스트라 <MT> */}
          {([
            ['운용사', fGp, () => setFGp('')],
            ['자펀드', fFund, () => setFFund('')],
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
        {/* 금액 단위 표기 — 캡션(비마스킹). 목업 설계메모대로 단위 전환 토글은 두지 않는다(편집 있는 관리화면) */}
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* 등록이 있는 리스트라 combo(split) 버튼 — 좌: 조합원 등록 · 우: ⌄ 내보내기·인쇄(apfs-grid 규약).
            ⚠️ topMoreRef는 combo 래퍼가 들고 있어야 한다 — ref가 비면 푸터 폴백이 영원히 안 뜬다 */}
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="조합원 등록" onRegister={() => setModal({ kind: 'create' })} onExport={exportExcel} />
        </span>
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
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<FundMemberRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          pinnedBottomRowData={pinnedBottom}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(13컬럼 · 긴 조합명/자펀드명)
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 조합원이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(모펀드·운용사·자펀드·계정구분). 검색어는 미사용(OFF) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자펀드별 조합원 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            {/* 운용사 — 옵션은 행 파생(관측 1건). 목업의 예시 옵션은 옮기지 않고 ⚠마커로 근거를 남긴다 */}
            <DrawerField label="운용사" note={FILTER_NOTES.gp}><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            {/* 계정구분 — 툴바 FilterChip과 같은 state 공유(목업은 칩 그룹, 드로어에선 select로 표현) */}
            <DrawerField label="계정구분"><DrawerSelect value={fAcc} onChange={(v) => setFAcc(v as '' | Acc)} options={ACC_OPTS} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 — 목업 openForm(mode) 2모드. 수정 모달 안 2단계 삭제는 RowFormModal 내장(onDelete) ──
             ⚠ create에 initial을 넘기면 RowFormModal의 "select 첫 옵션 시드"가 통째로 꺼진다(initial 분기).
               → 자펀드(readonly)뿐 아니라 select 2개의 초기값도 여기서 직접 시드한다.
               cls 'SP'는 목업 openForm의 add 기본값 그대로, mtype은 목업 기본값 '민간'이 옵션 집합에 없어
               브라우저가 실제로 첫 옵션을 그리던 동작을 그대로 재현한다(TYPE_OPTS[0]). */}
      {modal?.kind === 'create' && (
        <RowFormModal mode="create" schema={CREATE_SCHEMA} title="조합원 등록"
          initial={{ fn: FUND.fn, cls: 'SP', mtype: TYPE_OPTS[0] } as any}
          onSave={saveCreate} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && target && (
        <RowFormModal mode="edit" schema={EDIT_SCHEMA} title="조합원 수정"
          /* 비고의 '-'는 "값 없음" 표식이라 입력창엔 빈 값으로 넣는다(목업 openForm과 동일) */
          initial={{ id: target.id, fn: target.fn, mem: target.mem, mtype: target.mtype, cls: target.cls, c1: target.c1, memo: target.memo === '-' ? '' : target.memo } as any}
          onSave={saveEdit} onClose={() => setModal(null)}
          onDelete={() => setModal({ kind: 'delete', id: target.id })} />
      )}

      {/* ── 삭제 확인(목업 alertdialog — 기본 포커스 취소·위험 버튼). Radix AlertDialog는 Cancel 기본 포커스 내장 ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>조합원 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <b className="text-foreground"><MT>{target.mem}</MT></b> 조합원을 삭제하시겠습니까?
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
