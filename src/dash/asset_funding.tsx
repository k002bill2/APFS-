/* 모태펀드 조성 및 출자현황 — 투자자산관리 > 모태펀드관리
   조성출자현황_목업.html(KRDS TO-BE) 기준: 연도별 조성현황(기금 소스별) + 출자현황 집계 매트릭스.
   2단 중첩 헤더 + pinned 합계행. AG Grid Community + 공통 양식 GridFrame(apfs-grid 스킬).

   기능: 정렬 · 행 선택→선택삭제 · 상세필터(Sheet→External Filter, L12 Community)
        · 페이지네이션 · Excel(.xlsx, SheetJS) 내보내기 · 리스트/카드 뷰 토글.
     → 드로어 UI는 ui/sheet 프리미티브 재사용.

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 + 합계행 강조(공유)
import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { GridFrame, KpiBadge } from './grid_frame';
import { apfsTheme, fmt, numFmt, numStyle, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마(회색 선택)·포매터 SSOT. 그리드폭 채움은 컬럼 flex(numCol)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, CellContextMenuEvent, ValueFormatterParams } from 'ag-grid-community';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';   // 앱-스코프 단축키(⌘P 인쇄)
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

const { Button, IconBtn, SegTabs } = UI;

/* ── 데이터 — FFMS 캡처(image10) 실측 ── */
type FundingRow = { y: string; c0: number; c1: number; c2: number; c3: number; c4: number; c5: number; u0: number; u1: number };
const RAW: { y: string; c: number[]; u: number[] }[] = [
  // c = [합계, 농특회계, 농안기금, FTA, 수산발전기금, 농금원] · u = [조합수, 출자금액]
  { y: '2010', c: [597.3, 507, 90, 0, 0, 0.3], u: [5, 547] },
  { y: '2011', c: [900, 780, 120, 0, 0, 0], u: [8, 820] },
  { y: '2012', c: [1100, 900, 150, 30, 20, 0], u: [11, 1010] },
  { y: '2013', c: [1200, 950, 150, 50, 50, 0], u: [13, 1120] },
  { y: '2014', c: [1190, 900, 140, 60, 90, 0], u: [12, 1100] },
];
const flat = (r: { y: string; c: number[]; u: number[] }): FundingRow =>
  ({ y: r.y, c0: r.c[0], c1: r.c[1], c2: r.c[2], c3: r.c[3], c4: r.c[4], c5: r.c[5], u0: r.u[0], u1: r.u[1] });
const ROWS: FundingRow[] = RAW.map(flat);
const TOTAL_ROW: FundingRow = { y: '합 계', c0: 4987.3, c1: 4037, c2: 650, c3: 140, c4: 160, c5: 0.3, u0: 49, u1: 4597 };
// 매 렌더 새 배열을 넘기면 AG Grid가 pinned 행을 재생성(=행 애니메이션 재발) → 모듈 상수로 고정
const PINNED_BOTTOM: FundingRow[] = [TOTAL_ROW];
const PAGE_SIZE = 20;   // 5행 → 1페이지

const CO = ['합계', '농특회계', '농안기금', 'FTA', '수산발전기금', '농금원'];

/* ── 금액 단위 전환 (원/백만원/억원) ── 데이터는 억원 저장. 조합수(개)는 금액이 아니라 변환 제외. */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
// 억원 저장값 → 선택 단위 숫자. ≤1소수 억원이라 원(×1e8)·백만원(×100) 모두 정수 → 기존 fmt() 규칙 그대로 재사용.
const toUnit = (eok: number, unit: Unit): number => unit === '원' ? eok * 1e8 : unit === '백만원' ? eok * 100 : eok;
// 금액 셀 포매터 — grid context.unit로 변환 후 마스킹·서식(numFmt 동형, 단위만 반영). 단위 바뀌면 refreshCells로 재적용.
const moneyFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '';
  const unit = (p.context as { unit?: Unit } | undefined)?.unit ?? '억원';
  return mn(fmt(toUnit(p.value as number, unit)));
};

const numCol = (field: string, header: string, opts?: { strong?: boolean; count?: boolean }): ColDef<FundingRow> => ({
  // flex:1 — 컬럼을 그리드(프레임) 폭에 맞춰 균등 분배(우측 빈 공간 제거), 리사이즈에도 자동 재분배. minWidth는 하한(좁으면 가로 스크롤).
  field: field as keyof FundingRow, headerName: header, flex: 1, minWidth: 92,
  // 금액=단위 반영(moneyFmt), 조합수=개수(numFmt, 단위 무관)
  valueFormatter: opts?.count ? numFmt : moneyFmt, cellStyle: numStyle(opts?.strong) as any, type: 'rightAligned',
});

const columnDefs: (ColDef<FundingRow> | ColGroupDef<FundingRow>)[] = [
  { field: 'y', headerName: '구분', pinned: 'left', width: 120, cellStyle: { fontWeight: 600 } },
  {
    headerName: '조성현황', headerClass: 'apfs-grp-co', marryChildren: true,
    children: [numCol('c0', '합계', { strong: true }), ...CO.slice(1).map((h, i) => numCol('c' + (i + 1), h))],
  },
  {
    headerName: '출자현황', headerClass: 'apfs-grp-in', marryChildren: true,
    children: [numCol('u0', '조합수', { count: true }), numCol('u1', '출자금액')],
  },
];

/* 드로어/모달 입력 — 폭은 fit-content(내용 맞춤, 2026-09-09), 하한은 타입별 controlMinWidth SSOT. 색은 토큰.
   ⚠️ font(단축) 먼저 → fontSize(명시) 뒤: 키 순서로 fontSize가 이김(패밀리만 상속). kind는 controlMinWidth 계약(text/select/number/date). */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
});

/* ── kebab(···) 더보기 메뉴 — generic_list MoreMenu와 동형(Radix DropdownMenu) ── */
function PoCMoreMenu({ onExport }: { onExport: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="apfs-menu-trigger inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary focus-visible:bg-card focus-visible:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
        style={{ width: 34, height: 34 }}>
        <Icon name="more" size={20} stroke={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
          <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* 페이지 번호 버튼 — generic_list 푸터 페이저 외관 재현(토큰 기반) */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={`${n} 페이지`} aria-current={active ? 'page' : undefined} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid',
      borderColor: active ? 'var(--primary)' : 'var(--border)',
      background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--foreground)',
      font: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .12s',
    }}>{n}</button>
  );
}

export function AssetFunding({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<FundingRow> | null>(null);
  const [rows, setRows] = useState<FundingRow[]>(ROWS);   // 삭제/등록/새로고침 위해 가변
  const [selCount, setSelCount] = useState(0);
  const [showAll, setShowAll] = useState(false);          // 전체보기 — 페이지 크기를 전체 행 수로 키워 한 페이지에 모두 표시
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: ROWS.length });
  const [unit, setUnit] = useState<Unit>('억원');           // 금액 단위(원/백만원/억원) — 조합수(개)는 불변

  // 상세필터(External Filter) 상태 — L12 실증
  const [filterOpen, setFilterOpen] = useState(false);
  const [fText, setFText] = useState('');                 // 검색어 (전 컬럼 부분일치)
  const [fYear, setFYear] = useState('');                 // 사업연도 (정확일치)
  const [fMin, setFMin] = useState('');                   // 출자금액 최소 (이상)
  // 검색어 입력 opt-in — 기본 OFF(GenericListPage의 schema.searchable와 동일 규약, apfs-detail-filter 스킬). 필요 시 true.
  const SEARCHABLE = false;

  // 앱-스코프 단축키: ⌘P=인쇄. (등록 기능 제거로 ⌘⏎ 등록 단축키도 함께 제거)
  useHotkey(HOTKEYS.print.combo, () => window.print());
  const [ctx, setCtx] = useState<CtxMenuState>(null);   // 우클릭 컨텍스트 메뉴 좌표·항목(null=닫힘)

  const masked = useMask();   // 마스크 ON이면 Excel 숫자 셀 값을 0으로(실값 비노출) — 표시 모양은 z 서식이 담당

  const onGridReady = useCallback((e: GridReadyEvent<FundingRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<FundingRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    setPage({ current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() });
  }, []);

  // 외부 필터: 값 바뀌면 그리드에 재적용 통지(L12 — Community external filter)
  // 검색어 = 행 전 컬럼 부분일치(OR), 다른 조건과는 AND
  const matchText = useCallback((r: FundingRow) =>
    !fText || Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(fText.toLowerCase())), [fText]);
  const filterActive = fText !== '' || fYear !== '' || fMin !== '';
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [fText, fYear, fMin]);
  // 단위 변경 → 금액 셀(context.unit 참조) 재포맷. 본문 + pinned 합계행 모두. (KPI·카드는 React state로 자동 갱신)
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<FundingRow>) => {
    const r = node.data; if (!r) return true;
    if (!matchText(r)) return false;
    if (fYear && r.y !== fYear) return false;
    if (fMin && Number(r.u1) < Number(fMin)) return false;
    return true;
  }, [matchText, fYear, fMin]);

  const refresh = () => { setRows([...ROWS]); apiRef.current?.deselectAll(); toast.success('새로고침했습니다'); };
  const clearSel = () => apiRef.current?.deselectAll();
  const deleteSelected = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (!sel.length) return;
    const ys = new Set(sel.map((r) => r.y));
    setRows((prev) => prev.filter((r) => !ys.has(r.y)));
    apiRef.current?.deselectAll();
    toast.success(`${sel.length}개 항목을 삭제했습니다`);
  };
  // 단일 행 삭제 — 우클릭 컨텍스트 메뉴용(y가 행 식별자). 합계행은 호출부에서 제외.
  const deleteOne = (y: string) => {
    setRows((prev) => prev.filter((r) => r.y !== y));
    apiRef.current?.deselectAll();
    toast.success('항목을 삭제했습니다');
  };
  // 행 복사 — 구분(축)은 실값 유지, 숫자 값만 mn(fmt())로 마스킹(엑셀 내보내기와 동일 계약). TSV로 클립보드에.
  const copyRow = (row: FundingRow) => {
    const nums = (['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'u0', 'u1'] as const).map((k) => mn(fmt(row[k])));
    navigator.clipboard?.writeText([row.y, ...nums].join('\t')).then(
      () => toast.success('행을 복사했습니다'),
      () => toast.error('복사에 실패했습니다'));
  };
  // 우클릭 컨텍스트 메뉴 — Community엔 내장 메뉴가 없어 onCellContextMenu로 직접 띄운다.
  // pinned 합계행(rowPinned)·데이터 없는 셀은 제외(삭제 무의미 + 합계는 stale). 등록 전용이라 행 수정 항목은 없음.
  const handleCellContextMenu = (e: CellContextMenuEvent<FundingRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '행 복사', icon: 'layers', onSelect: () => copyRow(row) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '행 삭제', icon: 'trash', danger: true, onSelect: () => deleteOne(row.y) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };
  // Excel(.xlsx) 내보내기 — SheetJS. 화면의 2단 그룹헤더(병합)·합계행을 재현하고, 현재 필터를 반영한다.
  // 숫자 컬럼은 실제 숫자(t:'n')+숫자서식(z)으로 기록 → Excel이 화면 그리드(type:'rightAligned')와 동일하게 자동 우측 정렬,
  // 실데이터 연동 시(_on=false) 합계 계산도 가능. (커뮤니티 xlsx는 셀 정렬 '스타일'을 쓰지 못하므로 숫자 셀로 정렬을 얻는다.)
  // 마스크 ON이면 값을 0으로 써서 실값을 파일에 남기지 않는다(비노출). 서식의 정수/소수 판단은 '원값'을 따른다(소수 컬럼은 0.0로 표시).
  const exportExcel = () => {
    const zFmt = (v: number) => (Number.isInteger(v) ? '#,##0' : '#,##0.0');   // 화면 fmt()와 동일한 콤마/소수 규칙
    const numKeys = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'u0', 'u1'] as const;   // 헤더 순: 합계·농특회계·농안기금·FTA·수산발전기금·농금원 / 조합수·출자금액
    const isMoney = (k: string) => k !== 'u0';   // u0=조합수(개)만 단위 변환 제외, 나머지는 금액
    const cellVal = (r: FundingRow, k: (typeof numKeys)[number]) =>
      masked ? 0 : isMoney(k) ? toUnit(r[k] as number, unit) : (r[k] as number);   // 화면과 동일: 금액은 선택 단위로, 조합수는 개수 그대로
    const head1 = ['구분', `조성현황(${unit})`, '', '', '', '', '', '출자현황', ''];   // 단위를 헤더에 명시(스타일 불가 → 텍스트로)
    const head2 = ['', ...CO, '조합수(개)', `출자금액(${unit})`];   // CO = ['합계','농특회계','농안기금','FTA','수산발전기금','농금원']
    const dataSrc = [...filteredRows, TOTAL_ROW];      // 본문 + pinned 합계행(화면과 동일)
    const dataRows = dataSrc.map((r) => [r.y, ...numKeys.map((k) => cellVal(r, k))]);
    const aoa = [head1, head2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // 숫자 컬럼(열 1~8, 데이터는 행 2부터)에 화면 포맷과 일치하는 숫자서식 부여(변환값 기준)
    dataSrc.forEach((r, i) =>
      numKeys.forEach((k, j) => {
        const addr = XLSX.utils.encode_cell({ r: i + 2, c: j + 1 });
        if (ws[addr]) ws[addr].z = zFmt(cellVal(r, k));
      }));
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },   // 구분 (A1:A2)
      { s: { r: 0, c: 1 }, e: { r: 0, c: 6 } },   // 조성현황 (B1:G1, 6열)
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },   // 출자현황 (H1:I1, 2열)
    ];
    ws['!cols'] = [{ wch: 8 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '조성출자현황');
    XLSX.writeFile(wb, `모태펀드_조성출자현황_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  // Excel 내보내기 본문 — 화면 그리드와 같은 필터 술어를 공유(단일 데이터 소스)
  const filteredRows = rows.filter((r) => matchText(r) && (!fYear || r.y === fYear) && (!fMin || r.u1 >= Number(fMin)));
  // 전체보기 시 페이지 크기 = 전체 행 수 → total pages가 1이 되어 푸터 페이지네이션이 자동으로 숨는다
  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const totalForCount = page.rowCount;

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황']}
      title="모태펀드 조성 및 출자현황"
      cardTitle="모태펀드 조성 및 출자현황"
      favRoute="asset-funding"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      kpis={<>
        <KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(toUnit(TOTAL_ROW.c0, unit))) + ' ' + unit} valueSize={14} />
        <KpiBadge icon="wallet" color="var(--accent)" label="누적 출자금액" value={mn(fmt(toUnit(TOTAL_ROW.u1, unit))) + ' ' + unit} valueSize={14} />
        <KpiBadge icon="layers" color="var(--chart-1)" label="누적 조합수" value={mn(fmt(TOTAL_ROW.u0)) + ' 개'} valueSize={14} />
      </>}
      toolbarLeft={selCount > 0 ? (
        <>
          <span className="font-semibold" style={{ fontSize: 13 }}>{selCount}건 선택됨</span>
          <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={deleteSelected}>선택 삭제</Button>
          <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {filterActive ? (
            /* 값만 표시 개별 칩(2026-09-09 통일) — 항목명은 title(호버)·aria-label로 회수, ×는 해당 필터만 해제.
               "값만"은 항목명 제거지 연산자 제거가 아니라 출자금액은 `≥ 값` 유지. 값은 mask 규약(검색어=텍스트 MT, 연도·금액=mn). */
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {([
                fText && { key: 'q', label: '검색어', node: <MT>{fText}</MT>, clear: () => setFText('') },
                fYear && { key: 'y', label: '연도', node: <>{mn(fYear)}</>, clear: () => setFYear('') },
                fMin && { key: 'm', label: '출자금액', node: <>{'≥ '}{mn(fMin)}</>, clear: () => setFMin('') },
              ].filter(Boolean) as { key: string; label: string; node: ReactNode; clear: () => void }[]).map((c) => (
                <span key={c.key} title={c.label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
                  {c.node}
                  <button onClick={c.clear} aria-label={c.label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                    <Icon name="x" size={13} stroke={2.4} />
                  </button>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-caption" style={{ fontSize: 12.5 }}>행 선택→삭제 · 헤더=정렬 · 상세필터 · kebab=내보내기/인쇄</span>
          )}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환 — 캡션 + 세그먼트(원/백만원/억원). 조합수는 항상 개(변환 제외)라 캡션에 명시. */}
        <span className="text-caption" style={{ fontSize: 12.5 }}>{'단위: ' + unit + ' · 조합수(개)'}</span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <PoCMoreMenu onExport={exportExcel} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(totalForCount)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => i).map((i) => (
            <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />
          ))}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
      </>}>

      {/* AG Grid 본체 — autoHeight + pagination + external filter(L12, Community) */}
      <div>
        <AgGridReact<FundingRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          context={{ unit }}   // 금액 셀 포매터(moneyFmt)가 참조. 단위 변경 시 useEffect가 refreshCells로 재적용
          pinnedBottomRowData={PINNED_BOTTOM}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={{ mode: 'multiRow', checkboxes: false, headerCheckbox: false }}   // 체크박스 열 제거(행 클릭으로 선택 유지→선택삭제 보존)
          pagination
          paginationPageSize={pageSize}
          suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onPaginationChanged={onPaginationChanged}
          preventDefaultOnContextMenu
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 항목이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어(Sheet) — AG Grid External Filter 구동(L12) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">External Filter로 행을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 검색어 — opt-in(SEARCHABLE, 기본 OFF). 최상단 고정, 행 전 컬럼 부분일치 */}
            {SEARCHABLE && (
              <label className="block mb-4">
                <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>검색어</span>
                {/* Enter = 필터 적용과 동일(값은 즉시 반영형이라 드로어 닫기). IME 조합 확정 Enter는 제외 */}
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="검색어 입력" style={inputStyle('text')} />
              </label>
            )}
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>사업연도</span>
              {/* Safari menulist는 세로 padding을 무시해 select가 input보다 낮게 렌더됨(WebKit 측정 22 vs 37px).
                  appearance:none으로 padding을 살려 높이를 맞추고, 사라진 네이티브 화살표는 chevron 아이콘으로 보강. */}
              {/* 래퍼도 fit-content — 아니면 block 100% 래퍼에 절대배치 chevron이 드로어 오른쪽 끝으로 떨어진다 */}
              <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
                <select value={fYear} onChange={(e) => setFYear(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
                  <option value="">전체</option>
                  {ROWS.map((r) => <option key={r.y} value={r.y}>{r.y}</option>)}
                </select>
                <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
              </div>
            </label>
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>출자금액 최소(억원 이상)</span>
              <input type="number" value={fMin} onChange={(e) => setFMin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="예: 800" style={inputStyle('number')} />
            </label>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => { setFText(''); setFYear(''); setFMin(''); }}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
    </GridFrame>
  );
}
