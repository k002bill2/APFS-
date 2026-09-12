/* 자펀드관리 — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 자펀드관리).
   출처: 통합_화면_구조도_v1.4 · 자펀드관리_목업.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(11필터)      → 심사단계 FilterChip(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter)
   - 2단 헤더 그리드+합계  → AG Grid ColGroupDef + pinned 합계행(useMemo 재계산, apfs-aggrid)
   - 심사단계 워크플로우   → 행(라디오) 선택 시 툴바 좌에 단계별 컨텍스트 액션 → 단계 전이(공고관리 패턴)
   - 편집 팝업 3종         → 제안서접수/선정조합 = RowFormModal(스키마), 결성조합 수정 = 섹션형 전용 모달
   - 엑셀                  → SheetJS(2단 헤더 병합 자동 산출, 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **이식한다**(2026-09-12 사용자 지시) — 목업이 남긴 두 건(심사담당자·리스크담당자 옵션)을
   상세필터 라벨 옆에 그대로 싣는다. 공용 `review_marker.tsx`, 규약은 apfs-grid 스킬.

   apfs-manage-page · apfs-stage-workflow 스킬의 골드 레퍼런스. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { CSSProperties } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, fmt, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마(회색 선택)·포매터 SSOT
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝) — 형제 드로어(asset_funding·generic_list)와 동일
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, ValueFormatterParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';   // kebab 더보기(asset_funding 동형)
import { useHotkey, HOTKEYS } from './use-hotkey';   // 앱-스코프 단축키(⌘⏎ 제안서접수 등록·⌘P 인쇄)
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';   // kebab 트리거 툴팁(Provider는 app.tsx 루트)
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { RowFormModal } from './generic_list_modal';
import { SubFundFormEditModal } from './subfund_form_modal';   // 결성조합 수정 — 섹션형 전용 모달
import { APPLY_SCHEMA, SELECT_SCHEMA, OPT_AG, OPT_FG, OPT_FS, OPT_MANAGER, OPT_MF, CUR_YEAR } from './subfund_manage_schemas';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';   // 연도/일자 선택 표준(apfs-datepicker)

const { Button, IconBtn, StatusBadge, FilterChip, ColorChip } = UI;

/* ──────────────────────────────
   도메인 타입 · 심사단계
────────────────────────────── */
export type Stage = '신청' | '선정' | '결성' | '취소';
export const STAGES: Stage[] = ['신청', '선정', '결성', '취소'];
/* 심사단계 셀은 상태 표시 전용(직접 클릭 금지) — 전이는 선택 후 컨텍스트 액션으로만 */
const STAGE_TONE: Record<Stage, Tone> = { 신청: 'info', 선정: 'primary', 결성: 'success', 취소: 'warning' };

export interface SubFundRow {
  id: string; no: number; y: string; rt: string; ch: string; stg: Stage;
  ctype: string; cg: string; cs: string; gp1: string; gp2: string; fn: string;
  fd: string; rd: string; yrs: number | null; dur: number | null; mat: string; rate: number | null;
  lgp: number | null; lmo: string;
  c1: number | null; c2: number | null; c3: number | null;      // 약정액 총액·모태·민간
  v1: number | null; v2: number | null; v3: number | null;      // 변동약정액
  p1: number | null; p2: number | null;                         // 납입액 총액·모태
  rec: number | null; ti: number | null; tir: number | null; mi: number | null; mir: number | null; dist: number | null; mul: number | null;
  st: string; liq: string;
  attach?: string;   // 첨부파일명 CSV(백엔드 없음 — 이름만 보관). 제안서접수 등록 시 DocumentsField(filepond)가 공급, saveApply가 행에 영속.
}

/* 데모 데이터 — 4개 심사단계(신청·선정·결성·취소) 전부 포함. 금액 N/A=null(문자 '-' 아님), 텍스트 N/A='-'.
   도메인 정합: 납입(p1) 전제 없으면 회수·투자·배분=0. 금액 단위=원. */
const N = null;
const DEMO: SubFundRow[] = [
  { id: 'sf-1', no: 1, y: '2026', rt: '정기', ch: '1', stg: '신청', ctype: '-', cg: '-', cs: '-', gp1: '대성창업투자', gp2: '-', fn: '대성 스마트농업 스케일업 투자조합(가칭)', fd: '-', rd: '2026-05-20', yrs: N, dur: N, mat: '-', rate: N, lgp: N, lmo: '-', c1: N, c2: N, c3: N, v1: N, v2: N, v3: N, p1: 0, p2: 0, rec: 0, ti: 0, tir: N, mi: 0, mir: N, dist: 0, mul: N, st: '-', liq: '-' },
  { id: 'sf-2', no: 2, y: '2026', rt: '정기', ch: '1', stg: '선정', ctype: '벤처투자조합', cg: '일반', cs: '그린바이오', gp1: '한국투자파트너스', gp2: '-', fn: '한투 그린바이오 투자조합', fd: '-', rd: '2026-03-10', yrs: N, dur: 8, mat: '-', rate: 8, lgp: 10, lmo: 'N', c1: 25e9, c2: 12e9, c3: 13e9, v1: 25e9, v2: 12e9, v3: 13e9, p1: 0, p2: 0, rec: 0, ti: 0, tir: N, mi: 0, mir: N, dist: 0, mul: N, st: '-', liq: '-' },
  { id: 'sf-3', no: 3, y: '2018', rt: '정기', ch: '1', stg: '결성', ctype: '벤처투자조합', cg: '일반', cs: '스마트농업', gp1: 'IMM인베스트먼트', gp2: '-', fn: 'IMM 농식품 스마트투자조합', fd: '2018-06-15', rd: '2018-06-15', yrs: 8, dur: 8, mat: '2026-06-14', rate: 8, lgp: 10, lmo: 'N', c1: 30e9, c2: 15e9, c3: 15e9, v1: 30e9, v2: 15e9, v3: 15e9, p1: 28e9, p2: 14e9, rec: 5e9, ti: 22e9, tir: 73.3, mi: 15e9, mir: 50, dist: 3e9, mul: 0.96, st: '운영중', liq: '-' },
  { id: 'sf-4', no: 4, y: '2010', rt: '정기', ch: '1', stg: '결성', ctype: '사모투자전문회사', cg: '특수목적', cs: '8대사업', gp1: 'KB증권', gp2: '유안타인베스트먼트', fn: '현대동양농식품사모투자전문회사', fd: '2011-04-04', rd: '2011-04-04', yrs: 15.2, dur: 7, mat: '2018-04-03', rate: 8, lgp: 10, lmo: 'N', c1: 32e9, c2: 15.7e9, c3: 16.3e9, v1: 32e9, v2: 15.7e9, v3: 16.3e9, p1: 26_642_000_000, p2: 13_071_000_000, rec: 32_713_473_321, ti: 24_999_990_000, tir: 78.1, mi: 19_531_240_000, mir: 61, dist: 30_272_493_937, mul: 1.14, st: '청산완료', liq: '2018-06-28' },
  { id: 'sf-5', no: 5, y: '2025', rt: '수시', ch: '2', stg: '취소', ctype: '-', cg: '-', cs: '-', gp1: '○○인베스트먼트', gp2: '-', fn: '○○ 수산벤처 투자조합(신청취소)', fd: '-', rd: '2025-09-01', yrs: N, dur: N, mat: '-', rate: N, lgp: N, lmo: '-', c1: N, c2: N, c3: N, v1: N, v2: N, v3: N, p1: 0, p2: 0, rec: 0, ti: 0, tir: N, mi: 0, mir: N, dist: 0, mul: N, st: '-', liq: '-' },
];

/* 합계 대상(가산 가능한 금액만). 비율·배수·연수는 합계 없음(null → '-') */
const SUM_KEYS = ['c1', 'c2', 'c3', 'v1', 'v2', 'v3', 'p1', 'p2', 'rec', 'ti', 'mi', 'dist'] as const;
const NUM_KEYS = new Set<string>(['yrs', 'dur', 'rate', 'lgp', ...SUM_KEYS, 'tir', 'mir', 'mul']);
function computeTotal(rows: SubFundRow[]): SubFundRow {
  const t: any = { id: '__total', no: 0, y: '', rt: '', ch: '', stg: '결성', ctype: '', cg: '', cs: '', gp1: '', gp2: '', fn: '', fd: '', rd: '', mat: '', lmo: '', st: '', liq: '',
    yrs: N, dur: N, rate: N, lgp: N, tir: N, mir: N, mul: N };
  for (const k of SUM_KEYS) t[k] = rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return t as SubFundRow;
}
const PAGE_SIZE = 20;
const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일 — toISOString은 KST 00~09시에 전날(apfs-datepicker 계약)

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로. 2단 그룹 4개(우선손실충당률·약정액·변동약정액·납입액)
────────────────────────────── */
/* 숫자 N/A(null)는 '-'로 — 공유 numFmt(콤마·소수·마스킹)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
/* AG Grid cellStyle은 CellStyle(문자열 인덱스 시그니처) — React CSSProperties와 타입이 다르다 */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const txt = (field: keyof SubFundRow, header: string, width: number, center?: boolean): ColDef<SubFundRow> => ({
  field, headerName: header, width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : <MT>{p.value}</MT>),
});
const date = (field: keyof SubFundRow, header: string, width = 112): ColDef<SubFundRow> => ({
  field, headerName: header, width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
  valueFormatter: (p) => (p.node?.rowPinned ? '' : mn(p.value)),
});
const amt = (field: keyof SubFundRow, header: string, strong?: boolean, width = 150): ColDef<SubFundRow> => ({
  field, headerName: header, width, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle(strong) as any,
});
const num = (field: keyof SubFundRow, header: string, width = 96): ColDef<SubFundRow> => ({
  field, headerName: header, width, valueFormatter: nullFmt, cellStyle: centerNum,
});

const columnDefs: (ColDef<SubFundRow> | ColGroupDef<SubFundRow>)[] = [
  { field: 'no', headerName: 'No', width: 68, pinned: 'left', cellStyle: centerNum,
    valueFormatter: (p) => (p.node?.rowPinned ? '합 계' : String(p.value)) },
  { field: 'stg', headerName: '심사단계', width: 96, pinned: 'left', cellStyle: flexMid, sortable: true,
    cellRenderer: (p: any) => (p.node.rowPinned ? null : <StatusBadge tone={STAGE_TONE[p.value as Stage]} label={p.value} size="lg" dot={false} />) },
  { ...txt('fn', '자펀드', 240), maxWidth: 360, pinned: 'left', cellRenderer: (p: any) => (p.node.rowPinned ? null : <span className="font-semibold"><MT>{p.value}</MT></span>) },
  num('y', '사업연도', 92), txt('rt', '정기/수시', 88, true), num('ch', '차수', 70),
  txt('ctype', '조합유형', 150, true), txt('cg', '조합구분', 96, true), txt('cs', '조합성격', 120, true),
  { ...txt('gp1', '업무집행조합원1', 150), maxWidth: 240 }, { ...txt('gp2', '업무집행조합원2', 150), maxWidth: 240 },
  date('fd', '결성일'), date('rd', '등록일시'), num('yrs', '결과년수', 88), num('dur', '최초존속기간', 112), date('mat', '만기일'),
  num('rate', '기준수익률', 100),
  { headerName: '우선손실충당률', marryChildren: true, headerClass: 'apfs-grp-a', children: [num('lgp', 'GP', 80), txt('lmo', '농모태', 80, true)] },
  { headerName: '약정액', marryChildren: true, headerClass: 'apfs-grp-b', children: [amt('c1', '총액', true), amt('c2', '모태펀드'), amt('c3', '민간')] },
  { headerName: '변동약정액', marryChildren: true, headerClass: 'apfs-grp-a', children: [amt('v1', '총액', true), amt('v2', '모태펀드'), amt('v3', '민간')] },
  { headerName: '납입액', marryChildren: true, headerClass: 'apfs-grp-b', children: [amt('p1', '총액', true), amt('p2', '모태펀드')] },
  amt('rec', '회수금액'), amt('ti', '전체 투자금액'), num('tir', '전체 투자비율', 108), amt('mi', '주목적 투자금액'), num('mir', '주목적 투자비율', 116),
  amt('dist', '배분총액'), num('mul', '투자배수', 88), txt('st', '조합상태', 96, true), date('liq', '청산(예정)일', 116),
];

/* Excel 헤더 병합·리프 컬럼을 columnDefs에서 자동 산출(35컬럼 수작업 오프바이원 방지) */
function flattenForExcel(defs: (ColDef<SubFundRow> | ColGroupDef<SubFundRow>)[]) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = d.children as ColDef<SubFundRow>[];
      head1.push(d.headerName ?? '', ...Array(kids.length - 1).fill(''));
      kids.forEach((k) => { head2.push(k.headerName ?? ''); keys.push(String(k.field)); });
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
    } else {
      const col = d as ColDef<SubFundRow>;
      head1.push(col.headerName ?? ''); head2.push(''); keys.push(String(col.field));
      merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { head1, head2, keys, merges };
}

/* 드로어 입력 — 폭은 fit-content(내용 맞춤), 하한은 타입별 controlMinWidth SSOT(형제 드로어 asset_funding·generic_list와 동일). 색은 토큰.
   ⚠️ font(단축) 먼저 → fontSize(명시) 뒤: 키 순서로 fontSize가 이김(패밀리만 상속). kind는 controlMinWidth 계약(text/select/number/date). */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* 드로어 필드 래퍼 — 라벨 + 컨트롤. noop=컬럼 미연동 필터(캡션으로 no-op 신호, apfs-detail-filter 규약) */
/* plain=true → <label> 대신 <div>: PeriodPicker/DatePicker 트리거는 <button>이라 <label> 암묵 연결이 안 되고(ariaLabel로 명명),
   <label> 안 버튼 클릭이 라벨 활성화와 겹쳐 2회 토글되는 것을 막는다 */
/* 상세필터 ⚠검토필요 메모 — 목업(`자펀드관리_목업.html` 258·259행) `data-rec`/`data-dat` 원문 그대로.
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const NOTE_JS: ReviewNote = { rec: '양한솔·이성훈 (구조도 엑셀 예시)', dat: '자펀드관리 팝업 예시값 — 전체 담당자 마스터 연동 필요' };
const NOTE_RS: ReviewNote = { rec: '리스크담당자 목록(공통코드/사용자)', dat: '실 담당자 옵션값 미확인 — 없는 값 생성 안 함' };

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
  // 래퍼도 fit-content — block 100% 래퍼면 절대배치 chevron이 드로어 오른쪽 끝으로 떨어진다(형제 드로어와 동일)
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

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 독립 '엑셀' 버튼은 두지 않는다(내보내기 항목으로 흡수).
   ⚠️ 이 화면의 툴바에는 이 kebab이 뜨지 않는다 — 등록이 있는 리스트는 RegisterCombo의 ⌄로 같은 항목을
   제공하는 것이 규약(2026-09-11 사용자 결정, apfs-grid). 여기 MoreMenu는 **푸터 폴백 전용**이다.
   트리거는 Tooltip으로 감싼다(TooltipProvider는 app.tsx 루트). */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      {/* Tooltip/Dropdown 트리거를 같은 노드에 합성하면 Radix가 data-state를 서로 덮어써(Codex P2),
          kebab의 data-[state=open] 열림 스타일이 죽는다 → span을 끼워 data-state 노드를 분리한다.
          onFocus가 버블링하므로 span을 TooltipTrigger로 써도 안쪽 버튼 포커스에 툴팁이 정상 노출된다. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger
              aria-label="더보기"
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

/* 보조 액션 항목(내보내기·인쇄) — 푸터 폴백 kebab과 툴바 combo가 **같은 조각**을 공유한다.
   양쪽에 복제하면 라벨·단축키 힌트가 갈라지므로 여기 한 곳만 고친다. */
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

/* ===== 등록 combo(split) 버튼 — 등록이 있는 관리형 리스트의 툴바 기본 형태(apfs-grid 규약) =====
   좌: 1차 액션(등록) 즉시 실행 · 우: ⌄ 보조 액션 메뉴(내보내기·인쇄) — 툴바 독립 kebab을 흡수한다.
   generic_list.tsx의 로컬 복사본(MoreMenu·PageBtn과 동일한 복사 규약 — 공유 export 아님).
   외관은 Button variant="outline" size="sm"을 손수 재현한다. UI.Button을 쓸 수 없는 이유 2가지:
   ① forwardRef/…rest가 없어 Radix asChild 트리거가 되지 않는다(무음으로 안 열림),
   ② motion whileHover scale이 좌·우 절반에 따로 걸려 hover 시 이음매가 어긋난다.
   ⚠️ 컨테이너에 overflow-hidden 금지(전역 :focus-visible 링이 잘림), 트리거에 .apfs-menu-trigger 금지
   (그 클래스는 링을 끄고 bg-card로 초점을 대신 표시하는데 combo는 이미 카드 배경이라 단서가 사라진다). */
function RegisterCombo({ label, onRegister, onExport }: { label: string; onRegister: () => void; onExport: () => void }) {
  return (
    <span className="inline-flex items-stretch rounded-[9px] border border-border-strong bg-card">
      <button
        type="button"
        onClick={onRegister}
        className="inline-flex items-center gap-[7px] rounded-l-[9px] border-0 bg-transparent px-[11px] py-1.5 font-[inherit] text-[12.5px] font-semibold text-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary">
        <Icon name="plus" size={14} stroke={2.2} />{label}
      </button>
      {/* 두 절반의 경계선 — 컨테이너 테두리와 같은 토큰(장식이라 aria-hidden) */}
      <span aria-hidden className="w-px self-stretch bg-border-strong" />
      <DropdownMenu>
        {/* Tooltip/Dropdown 트리거를 같은 노드에 합성하면 Radix가 data-state를 서로 덮어쓴다 → span으로 분리 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger
                aria-label="더보기"
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
type ModalState = null | { kind: 'apply' } | { kind: 'select'; target: Stage } | { kind: 'formEdit' };

export function SubFundManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<SubFundRow> | null>(null);
  const [rows, setRows] = useState<SubFundRow[]>(DEMO);
  const [selId, setSelId] = useState<string | null>(null);
  // 카드뷰 미사용(2026-09-11 사용자 결정) — 푸터 SegTabs를 제거하고 리스트 뷰로 고정.
  // 되살리려면 이 줄을 useState('list')로 되돌리고 footerRight에 SegTabs를 복원하면 된다(카드 렌더 분기는 그대로 남아 있다).
  const view = 'list';
  const [showAll, setShowAll] = useState(false);          // 전체보기 — 페이지 크기를 전체 행 수로 키워 한 페이지에 모두 표시
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  /* 상단 kebab이 스크롤로 화면 밖에 나가면 푸터 kebab을 대신 노출(IntersectionObserver, root=뷰포트).
     툴바는 sticky가 아니라 스크롤로 사라지고 푸터는 sticky bottom이라 항상 보이므로 성립(grid_frame 구조) */
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  // 앱-스코프 단축키: ⌘⏎=제안서접수 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄.
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'apply' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  const masked = useMask();

  /* 필터 — 심사단계는 툴바 칩, 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fStage, setFStage] = useState<'' | Stage>('');
  const [fText, setFText] = useState('');
  const [fFund, setFFund] = useState('');
  const [fType, setFType] = useState('');
  const [fYear, setFYear] = useState('');
  const [fRt, setFRt] = useState('');
  const [fSt, setFSt] = useState('');
  const [fMf, setFMf] = useState('');          // 모펀드 — 그리드 컬럼 아님(no-op)
  const [fManager, setFManager] = useState(''); // 심사담당자 — 동적 사용자 데이터(no-op)
  const [fAsOf, setFAsOf] = useState('');       // 기준일자(no-op)
  const [fAg, setFAg] = useState('');           // 계정구분 — 행에 컬럼 없음(no-op)
  const [fRisk, setFRisk] = useState('');       // 리스크담당자 — 동적 사용자 데이터(no-op)
  const clearFilters = () => { setFStage(''); setFText(''); setFFund(''); setFType(''); setFYear(''); setFRt(''); setFSt(''); setFMf(''); setFManager(''); setFAsOf(''); setFAg(''); setFRisk(''); };

  const passes = useCallback((r: SubFundRow) => {
    if (fStage && r.stg !== fStage) return false;
    if (fText && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase()))) return false;
    if (fFund && r.fn !== fFund) return false;
    if (fType && r.ctype !== fType) return false;
    if (fYear && r.y !== fYear) return false;
    if (fRt && r.rt !== fRt) return false;
    if (fSt && r.st !== fSt) return false;
    return true;
  }, [fStage, fText, fFund, fType, fYear, fRt, fSt]);
  const filterActive = Boolean(fStage || fText || fFund || fType || fYear || fRt || fSt);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  /* 상단 kebab 가시성 관찰 — 뷰포트에서 벗어나면(스크롤로 위로 사라짐) 푸터 kebab 노출 */
  useEffect(() => {
    const el = topMoreRef.current;
    // 미지원 환경에선 관찰이 불가능하므로 폴백을 상시 노출(true로 두면 푸터 kebab이 영원히 안 떠 내보내기·인쇄 접근이 끊긴다)
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<SubFundRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  /* pinned 합계행 — 행이 단계 전이·등록으로 바뀌므로 useMemo 재계산(참조 안정 + stale 방지, apfs-aggrid 계약4) */
  const pinnedBottom = useMemo(() => [computeTotal(filteredRows)], [filteredRows]);
  const formedFunds = useMemo(() => rows.filter((r) => r.stg === '결성').map((r) => r.fn), [rows]);   // 자펀드 필터=결성 행만(결성돼야 자펀드 등재)

  // 카드뷰→리스트 뷰 복귀 시 그리드가 재마운트되므로, 카드에서 고른 선택(selId)을 그리드 선택으로 되돌려 심사단계 액션이 이어지게 한다
  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<SubFundRow>) => {
    apiRef.current = e.api;
    const id = selIdRef.current; if (id) e.api.getRowNode(id)?.setSelected(true);
  }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<SubFundRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  // 신규 등록(선두 삽입)처럼 React 쪽에서 selId를 먼저 정한 경우, 행이 그리드에 반영된 뒤 라디오 선택을 맞춘다(툴바-라디오 불일치 방지)
  const onRowDataUpdated = useCallback((e: { api: GridApi<SubFundRow> }) => {
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState는 렌더 루프 유발(aggrid-onpaginationchanged-render-loop) */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const patchRow = (id: string, patch: Partial<SubFundRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ── 심사단계 워크플로우: 단계 전이는 오직 컨텍스트 액션으로 ── */
  const toStage = (ns: Stage, msg: string) => {
    if (!selected) return;
    patchRow(selected.id, { stg: ns, ...(ns === '취소' ? { st: '-', liq: '-' } : {}) });
    toast.success(msg);
  };
  const confirmFormation = () => {
    if (!selected) return;
    patchRow(selected.id, { stg: '결성', fd: today(), st: '운영중' });
    toast.success('결성 확정 — 운용중으로 전환되었습니다');
  };
  type Act = { label: string; primary?: boolean; run: () => void };
  const stageActs: Act[] = !selected ? [] : ({
    신청: [{ label: '선정조합 등록', primary: true, run: () => setModal({ kind: 'select', target: '선정' }) }, { label: '신청취소', run: () => toStage('취소', '신청이 취소되었습니다') }],
    선정: [{ label: '결성 확정', primary: true, run: confirmFormation }, { label: '수정', run: () => setModal({ kind: 'select', target: '선정' }) }, { label: '선정취소', run: () => toStage('취소', '선정이 취소되었습니다') }],
    결성: [{ label: '수정', run: () => setModal({ kind: 'formEdit' }) }],
    취소: [],
  } as Record<Stage, Act[]>)[selected.stg];

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 2단 헤더 병합·합계행 재현, 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const { head1, head2, keys, merges } = flattenForExcel(columnDefs);
    const src = [...filteredRows, pinnedBottom[0]];
    const body = src.map((r, i) => keys.map((k) => {
      const v = (r as any)[k];
      if (k === 'no') return i === src.length - 1 ? '합 계' : v;
      if (NUM_KEYS.has(k)) return v == null ? '' : masked ? 0 : v;
      return masked ? '' : (v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
    src.forEach((r, i) => keys.forEach((k, j) => {
      if (!NUM_KEYS.has(k) || (r as any)[k] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 2, c: j });
      if (ws[a]) ws[a].z = Number.isInteger((r as any)[k]) ? '#,##0' : '#,##0.0';
    }));
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' ? 34 : NUM_KEYS.has(k) ? 16 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '자펀드관리');
    XLSX.writeFile(wb, '자펀드관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  /* ── 모달 저장 핸들러 ── */
  const numOr = (v: unknown, d: number | null = null) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) && String(v ?? '') !== '' ? n : d; };
  const saveApply = (f: any) => {   // 제안서접수 등록 → 심사단계 '신청' 신규 행(선두 삽입)
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
    const row: SubFundRow = { ...DEMO[0], id: crypto.randomUUID(), no: nextNo, y: String(f.y || today().slice(0, 4)), rt: String(f.rt || '정기'), ch: String(f.ch || '1'), stg: '신청',
      ctype: f.ctype || '-', cg: '-', cs: f.cs || '-', gp1: f.gp1 || '(미입력)', gp2: '-', fn: f.fn || '(신규 접수 조합)', rd: String(f.applyDate || today()),
      dur: numOr(f.dur), rate: numOr(f.rate), c1: numOr(f.c1), c2: numOr(f.c2), c3: N, v1: numOr(f.c1), v2: numOr(f.c2), v3: N,
      attach: f.attach || '' };   // 첨부파일명 보존(Codex P2) — DocumentsField가 vals.attach로 직렬화한 이름을 행에 실음
    setRows((prev) => [row, ...prev]);
    setModal(null);
    setSelId(row.id);
    toast.success('제안서접수 등록되었습니다 — 심사단계 신청');
  };
  const saveSelect = (f: any, target: Stage) => {   // 선정조합 등록/수정 → 선택 행 갱신 + 단계 전이
    if (!selected) return;
    const was = selected.stg;
    const c1 = numOr(f.c1, selected.c1), c2 = numOr(f.c2, selected.c2);
    patchRow(selected.id, { stg: target, gp1: f.gp1 || selected.gp1, fn: f.fn || selected.fn, ctype: f.ctype || selected.ctype, cs: f.cs || selected.cs,
      dur: numOr(f.dur, selected.dur), rate: numOr(f.rate, selected.rate), c1, c2, c3: c1 != null && c2 != null ? c1 - c2 : selected.c3, v1: c1, v2: c2, v3: c1 != null && c2 != null ? c1 - c2 : selected.v3 });
    setModal(null);
    toast.success(was === '신청' ? '선정조합으로 등록되었습니다 — 심사단계 선정' : '수정되었습니다');
  };
  const selectInitial = selected ? { id: selected.id, y: selected.y, gp1: selected.gp1 === '-' ? '' : selected.gp1, fn: selected.fn, c1: selected.c1 ?? '', c2: selected.c2 ?? '', dur: selected.dur ?? '', rate: selected.rate ?? '', ctype: selected.ctype === '-' ? '' : selected.ctype, cs: selected.cs === '-' ? '' : selected.cs, my: selected.stg === '결성' ? '결성' : selected.stg === '취소' ? '취소' : '미결성', selDate: today() } : undefined;

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '자펀드 관리']}
      title="자펀드 관리"
      cardTitle="자펀드 관리"
      favRoute="subfund"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? (
        /* 선택 행의 심사단계에 맞는 작업만 노출(공고관리 컨텍스트 액션 패턴). 취소 단계는 작업 없음 */
        <>
          {/* 단계 배지만 표시 — 자펀드명은 선택 행에서 이미 보이므로 생략(2026-09-08 결정) */}
          <StatusBadge tone={STAGE_TONE[selected.stg]} label={selected.stg} size="lg" dot={false} />
          {stageActs.map((a) => (
            <Button key={a.label} variant={a.primary ? 'primary' : 'outline'} size="sm" onClick={a.run}>{a.label}</Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['' as const, ...STAGES] as ('' | Stage)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fStage === s} onClick={() => setFStage(s)}>{s || '전체'}</FilterChip>
          ))}
          {/* 적용 중인 상세필터 — 항목별 개별 칩(각각 ×로 해제). 라벨=드로어 항목명, 값은 MT 마스킹(apfs-detail-filter) */}
          {([
            ['검색어', fText, () => setFText('')],
            ['자펀드', fFund, () => setFFund('')],
            ['자펀드구분', fType, () => setFType('')],
            ['사업연도', fYear && fYear + '년', () => setFYear('')],
            ['정기/수시', fRt, () => setFRt('')],
            ['조합상태', fSt, () => setFSt('')],
          ] as [string, string, () => void][]).filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {/* 값만 표시(항목명 접두사 없음 — 2026-09-08 결정). 항목명은 × 버튼 aria-label에만 남긴다 */}
              <MT>{value}</MT>
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 표기 — 캡션(비마스킹). 카드헤더 sub 캡션을 없애면서 여기로 이동 */}
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* 등록이 있는 리스트라 combo(split) 버튼 — 좌: 제안서접수 등록 · 우: ⌄ 내보내기·인쇄(apfs-grid 규약).
            툴바 독립 kebab은 두지 않는다(항목이 combo 안으로 들어가 중복이 된다). 단축키 ⌘⏎는 그대로.
            ⚠️ topMoreRef는 combo 래퍼가 들고 있어야 한다 — ref가 비면 관찰 effect가 early return해
            topMoreVisible이 true로 굳고 푸터 폴백이 영원히 안 뜬다(내보내기·인쇄 접근 단절). */}
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="제안서접수 등록" onRegister={() => setModal({ kind: 'apply' })} onExport={exportExcel} />
        </span>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={view === 'list' && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        {view === 'list' && (
          <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        )}
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {/* 상단 kebab이 화면 밖일 때만 노출(스크롤 시 내보내기/인쇄 접근 유지). 등록은 툴바 버튼 + ⌘⏎로 접근 */}
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      {view === 'list' ? (
      /* AG Grid 본체 — 2단 그룹헤더 + pinned 합계 + 라디오 단일선택 + External Filter. 가로는 AG Grid 내부 스크롤 */
      <div>
        <AgGridReact<SubFundRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          pinnedBottomRowData={pinnedBottom}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(잘림 방지). 긴 텍스트 컬럼은 maxWidth 캡
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }}
          selectionColumnDef={{ pinned: 'left', width: 44 }}   // 라디오 선택 열을 맨 앞 고정(목업 1열 '선택(라디오)')
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 자펀드가 없습니다.</span>'}
        />
      </div>
      ) : (
        /* 카드뷰 — 같은 filteredRows 공유. 카드 클릭=행 선택(툴바 단계 액션은 리스트와 동일하게 selId로 파생) */
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', padding: 18 }}>
          {filteredRows.length === 0 && <span className="text-muted-foreground" style={{ fontSize: 13, padding: '24px 0' }}>조건에 맞는 자펀드가 없습니다.</span>}
          {filteredRows.map((r) => (
            <button key={r.id} type="button" onClick={() => setSelId(r.id)} aria-pressed={selId === r.id}
              className="border bg-card flex flex-col gap-3 p-3.5 text-left cursor-pointer motion-safe:active:scale-[.98]"
              style={{ borderRadius: 12, borderColor: selId === r.id ? 'var(--primary)' : 'var(--border)', fontFamily: 'inherit', color: 'inherit' }}>
              <div className="flex items-center gap-2.5">
                <ColorChip icon="layers" color="var(--primary)" size={34} iconSize={16} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ fontSize: 14 }}><MT>{r.fn}</MT></div>
                  <div className="text-muted-foreground truncate" style={{ fontSize: 12 }}><MT>{r.gp1}</MT> · {r.y}년</div>
                </div>
                <StatusBadge tone={STAGE_TONE[r.stg]} label={r.stg} size="lg" dot={false} />
              </div>
              <div className="flex flex-col gap-1.5">
                {([['약정총액', r.c1], ['납입총액', r.p1], ['분배액', r.dist]] as [string, number | null][]).map(([label, v]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-caption shrink-0" style={{ fontSize: 12 }}>{label}</span>
                    <span className="tabular" style={{ fontSize: 13, fontWeight: 500, color: v == null || v === 0 ? 'var(--muted-foreground)' : 'var(--foreground)' }}>{v == null ? '-' : mn(fmt(v))}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 상세필터 드로어 — 검색어 최상단 고정(apfs-detail-filter), 컬럼 미연동 필터는 캡션으로 no-op 신호 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자펀드 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="검색어">
              <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="조합명·GP·단계 등 전 컬럼 검색" style={inputStyle('text')} />
            </DrawerField>
            {/* 원본(목업) 검색박스 11항목·순서 그대로: 모펀드·자펀드·계정구분·자펀드구분·사업연도·정기/수시·심사담당자·리스크담당자·심사단계·조합상태·기준일자.
                그리드 컬럼과 미연동인 항목(모펀드·계정구분·담당자 2종·기준일자)은 noop 캡션(apfs-detail-filter). 연도/일자는 PeriodPicker 표준(apfs-datepicker) */}
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={OPT_MF} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={formedFunds} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAg} onChange={setFAg} options={OPT_AG} /></DrawerField>
            <DrawerField label="자펀드구분"><DrawerSelect value={fType} onChange={setFType} options={OPT_FG} /></DrawerField>
            {/* PeriodPicker 트리거는 w-full이라 fit-content 래퍼로 감싸 폭 규칙(minW) 적용 — 형제 DatePicker 소비처(renderers·generic_list)와 동일 */}
            <DrawerField label="사업연도" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('year'), maxWidth: '100%' }}><PeriodPicker mode="year" value={fYear} onChange={setFYear} ariaLabel="사업연도" yearRange={[2000, CUR_YEAR + 1]} /></div></DrawerField>
            <DrawerField label="정기/수시"><DrawerSelect value={fRt} onChange={setFRt} options={['정기', '수시']} /></DrawerField>
            <DrawerField label="심사담당자" noop note={NOTE_JS}><DrawerSelect value={fManager} onChange={setFManager} options={OPT_MANAGER} /></DrawerField>
            <DrawerField label="리스크담당자" noop note={NOTE_RS}><DrawerSelect value={fRisk} onChange={setFRisk} options={OPT_MANAGER} /></DrawerField>
            <DrawerField label="심사단계"><DrawerSelect value={fStage} onChange={(v) => setFStage(v as '' | Stage)} options={STAGES} /></DrawerField>
            <DrawerField label="조합상태"><DrawerSelect value={fSt} onChange={setFSt} options={OPT_FS} /></DrawerField>
            <DrawerField label="기준일자" noop plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fAsOf} onChange={setFAsOf} ariaLabel="기준일자" /></div></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 편집 팝업: 스키마 주도(apfs-form-modal). 제목은 단계별로 title 오버라이드 ── */}
      {modal?.kind === 'apply' && (
        /* create지만 initial로 기본값 시드 — 필수 날짜(신청일자)가 빈 채 열리면 저장이 막히므로 오늘/올해를 미리 채운다 */
        <RowFormModal mode="create" schema={APPLY_SCHEMA} title="제안서접수 등록"
          initial={{ applyDate: today(), y: String(new Date().getFullYear()) } as any}
          onSave={saveApply} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'select' && selected && (
        <RowFormModal mode="edit" schema={SELECT_SCHEMA} initial={selectInitial as any}
          title={selected.stg === '신청' ? '선정조합 등록' : '선정조합 정보 수정'}
          onSave={(f) => saveSelect(f, modal.target)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'formEdit' && selected && (
        /* 결성조합 수정 — 섹션·반복행·첨부표가 있어 flat RowFormModal 대신 섹션형 전용 모달 */
        <SubFundFormEditModal row={selected}
          onSave={(patch) => { patchRow(selected.id, patch); setModal(null); toast.success('수정되었습니다'); }}
          onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
