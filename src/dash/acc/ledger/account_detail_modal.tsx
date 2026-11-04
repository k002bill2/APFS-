/* 「계정별 상세내역」 팝업(계정별보조부 팝업) — ACC-011 slide12 정의, ACC-011·012·013·014 공용(조회 전용).
   설계서 → 우리 규약
   - 헤더: 계정구분 · 계정과목(코드) · 기준일 — 읽기 전용 kv. 호출 화면의 조회조건을 그대로 받는다.
   - 그리드 12열(작성자·전표일·전표번호·분개번호·전표구분·적요·코드·계정과목·거래처·차변·대변·잔액). 첫 행 [전잔] = 기초잔액.
     정렬: 금액 3열만 우측, 나머지 좌측(설계서 '중앙' 은 프로젝트 정렬 규약으로 좌측). 헤더 정렬 끔(누적잔액 순서 보존).
   - 행 더블클릭 / Enter(E06) → 전표상세(JournalEntryScreen readOnly — [닫기]만). [전잔] 행 무반응.
   - [엑셀] = 팝업 푸터(apfs-spec-popup 푸터 규약 [엑셀]·[닫기]) + 우상단 ✕. 권한 기반 노출은 RBAC 미구현이라 항상 노출.
   - 결과 없음 → 빈 상태 문구 "조회된 내역이 없습니다."(E03 검증 문구).
   ⚠ 설계서는 "새 창" — 프로젝트 팝업 규약(Dialog)으로 연다. 중첩 전표상세가 열린 동안 바깥 클릭이 이 팝업을 닫지 않게 막는다.

   사용:
     <AccountDetailModal src={src} cond={cond} account={{ code, name }} from={fiscalStart(asOf)} to={asOf} onClose={() => setDetail(null)} />
     cond.fundAccount 는 헤더 계정구분 표시(''/[] = 전체)와 조회 범위를 함께 정한다. 작성자·거래처·적요 필터는 받지 않는다(원장 전체). */
import '../../aggrid_shared.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellStyle, ColDef, RowClassRules, RowDoubleClickedEvent } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import { JournalEntryScreen } from '../slip/journal_entry_screen';
import type { EntryState } from '../slip/general_journal_model';
import { subledger, flattenSubledger, fundLabel, MSG } from './ledger_model';
import type { LedgerCond, SubledgerRow } from './ledger_model';
import type { LedgerSource } from './ledger_data';
import { entryOf } from './ledger_journal_view';

const { Button } = UI;

export interface AccountDetailModalProps {
  src: LedgerSource;
  cond: LedgerCond;                       // 계정구분·미결재포함·결산전표포함(모든계정포함은 무관)
  account: { code: string; name: string };
  from: string; to: string;               // 기준일(기간) — 헤더 표시 + 조회 범위
  onClose: () => void;
}

const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 누적잔액 순서 — 헤더 정렬 끔
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const tabular: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const ROW_CLASS: RowClassRules<SubledgerRow> = { 'font-semibold': (p) => p.data?.kind === 'opening' };
const lv = (k: keyof NonNullable<SubledgerRow['line']>) => (p: { data?: SubledgerRow }) => (p.data?.line ? p.data.line[k] : '');

const COLUMNS: ColDef<SubledgerRow>[] = [
  { colId: 'writer', headerName: '작성자', valueGetter: lv('writer'), width: 88, cellStyle: flexCenter },
  { colId: 'slipDate', headerName: '전표일', valueGetter: lv('slipDate'), width: 106, cellStyle: tabular },
  { colId: 'slipNo', headerName: '전표번호', valueGetter: lv('slipNo'), width: 130, cellStyle: tabular },
  { colId: 'lineNo', headerName: '분개번호', valueGetter: lv('lineNo'), width: 84, cellStyle: tabular },
  { colId: 'slipType', headerName: '전표구분', valueGetter: lv('slipType'), width: 84, cellStyle: flexCenter },
  { colId: 'memo', headerName: '적요', valueGetter: lv('memo'), flex: 1, minWidth: 170, width: 170, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'code', headerName: '코드', width: 92, cellStyle: tabular },
  { field: 'accountName', headerName: '계정과목', width: 150, cellStyle: flexCenter, cellRenderer: textCell },
  { colId: 'partner', headerName: '거래처', valueGetter: lv('partner'), width: 150, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'debit', headerName: '차변금액', width: 132, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'credit', headerName: '대변금액', width: 132, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'balance', headerName: '잔액', width: 142, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
];

export function AccountDetailModal({ src, cond, account, from, to, onClose }: AccountDetailModalProps) {
  const dlgRef = useRef<DialogHandle>(null);
  const [view, setView] = useState<EntryState | null>(null);
  const fund = fundLabel(cond.fundAccount);

  /* 선택 계정 1개의 보조부 — 계정과목은 코드 정확 일치, 소계 행 없음(설계서 12장) */
  const rows = useMemo(() => {
    const g = subledger(src.lines, cond, { from, to, account: account.code }).filter((x) => x.code === account.code);
    return flattenSubledger(g, { subtotal: false });
  }, [src, cond, from, to, account.code]);
  const hasEntries = rows.some((r) => r.kind === 'entry');

  /* E06 — [전잔] 행은 무반응 */
  const open = useCallback((r: SubledgerRow | undefined) => {
    if (!r?.line) return;
    const e = entryOf(src, r.line.slipNo);
    if (e) setView(e); else toast.error('전표를 찾을 수 없습니다.');
  }, [src]);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<SubledgerRow>) => open(e.data), [open]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SubledgerRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter') open(e.data);
  }, [open]);

  const exportExcel = () => {
    const head = COLUMNS.map((c) => c.headerName as string);
    const body = rows.map((r) => [r.line?.writer ?? '', r.line?.slipDate ?? '', r.line?.slipNo ?? '', r.line ? String(r.line.lineNo) : '', r.line?.slipType ?? '',
      r.line?.memo ?? '', r.code, r.accountName, r.line?.partner ?? '', r.debit, r.credit, r.balance]);
    const ws = XLSX.utils.aoa_to_sheet([['계정구분', fund, '계정과목', `${account.name}(${account.code})`, '기준일', `${from} ~ ${to}`], [], head, ...body]);
    body.forEach((_, ri) => [9, 10, 11].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 3, c: ci })]; if (c) c.z = '#,##0'; }));
    ws['!cols'] = head.map((h) => ({ wch: h === '적요' || h === '계정과목' || h === '거래처' ? 22 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '계정별 상세내역');
    XLSX.writeFile(wb, `계정별 상세내역_${account.name}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const kv: [string, string][] = [['계정구분', fund], ['계정과목', `${account.name}(${account.code})`], ['기준일', `${from} ~ ${to}`]];
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-[1240px] max-h-[90vh]" onInteractOutside={(e) => { if (view) e.preventDefault(); }}>
        <DialogHeader className="px-[46px]">
          {/* 계정과목은 본문 kv 표에 이미 있어 제목 옆 표기는 두지 않는다(2026-11-03 사용자 지시 — 중복). 설명은 화면낭독기용만 */}
          <DialogTitle>계정별 상세내역</DialogTitle>
          <DialogDescription className="sr-only">{`${account.name}(${account.code}) 계정의 기간 내 명세`}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]" style={{ paddingTop: 24 }}>
          <dl className="grid gap-0 mb-4 rounded-card-sm border border-border overflow-hidden" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', margin: '0 0 16px' }}>
            {kv.map(([k, v]) => (
              /* 칸마다 오른쪽·아래 1px 선 + -1px 마진 — auto-fit 으로 몇 줄로 접혀도 줄 사이 가로선이 남고,
                 바깥 테두리와 겹치는 마지막 열·마지막 줄 선은 dl overflow-hidden 에 잘린다(2026-11-03 좁은 폭 가로선 누락 지적) */
              <div key={k} className="flex min-w-0" style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '0 -1px -1px 0' }}>
                <dt className="shrink-0 font-semibold text-muted-foreground bg-muted" style={{ width: 96, padding: '9px 12px', fontSize: 13, margin: 0 }}>{k}</dt>
                <dd className="min-w-0 truncate tabular-nums" title={v} style={{ padding: '9px 12px', fontSize: 14, margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>
          <div style={{ height: 'min(56vh, 520px)' }}>
            <AgGridReact<SubledgerRow>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={COLUMNS}
              defaultColDef={COL_DEF}
              getRowId={(p) => p.data.id}
              rowClassRules={ROW_CLASS}
              onRowDoubleClicked={onRowDoubleClicked}
              onCellKeyDown={onCellKeyDown}
              overlayNoRowsTemplate={MSG.empty}
            />
          </div>
        </div>
        <DialogFooter className="px-[46px]">
          <span className="text-caption" style={{ fontSize: 12.5 }}>{hasEntries ? `명세 ${String(rows.filter((r) => r.kind === 'entry').length)}건 · 행을 두 번 누르면 전표상세` : MSG.empty}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={exportExcel}>엑셀</Button>
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
        {/* E06 전표상세(조회 전용) — 중첩 다이얼로그. Esc 는 한 겹씩 닫힌다(Radix 스택) */}
        {view && <JournalEntryScreen entry={view} readOnly hideGridTools onSave={(j) => j} onClose={() => setView(null)} />}
      </DialogContent>
    </Dialog>
  );
}
