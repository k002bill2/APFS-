/* 「계좌거래상세」 팝업 — ACC-020 계좌잔액 E04(slide 16). 조회 전용.
   설계서 → 우리 규약
   - 헤더 kv: 금융기관 · 지점명 · 계좌번호 · 기준일(= 계좌잔액 화면 기준기간). 계좌는 호출부 스냅샷(행이 바뀌어도 exit 애니메이션 유지).
   - 그리드 7열: 거래일 · 예금 · 인출 · 잔액 · 거래처 · 적요 · 전표번호. 첫 행 = 전일잔액(이월). 하단 고정 합계행
     (예금·인출 = 기간 거래 합, 잔액 = 마지막 잔액). 금액만 우측, 나머지 좌측. 헤더 정렬 끔(누적 잔액 순서 보존).
   - 본문 도구 [인쇄] [엑셀](설계서 위치 그대로 — 그리드 위 우측) · 푸터 [닫기] + 우상단 ✕.
     [인쇄] = 예금명세서(상세) 리포트 뷰어(LedgerReportViewer — 중첩 Dialog) 열: 거래일·예금·인출·잔액·거래처·적요 + 합 계.
     [엑셀] = '계좌거래상세_<계좌번호>.xlsx'(금액 숫자 셀). 권한 기반 노출(인쇄·다운로드)은 RBAC 미구현이라 항상 노출.
   ⚠ 설계서 "출력 API(계좌·기준기간 기준)"는 백엔드가 없어 화면 데이터로 양식을 그린다. */
import '../../aggrid_shared.css';
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellStyle, ColDef, RowClassRules } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { apfsTheme, DEFAULT_COL_DEF, fmt, numFmt, numStyle } from '../../aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import { LedgerReportViewer, paginate } from '../ledger_report_viewer';
import type { BankAccount, CashTxn } from './funds_data';
import type { AccountTxnRow } from './funds_model';
import { txnDetail, periodLabel } from './account_balance_model';

const { Button } = UI;

const REPORT_TITLE = '예금명세서(상세)';
const PER_PAGE = 38;

export interface AccountTxnDetailModalProps {
  account: BankAccount;               // 행 스냅샷
  txns: readonly CashTxn[];
  from: string; to: string;           // 기준기간('' = 열린 범위)
  onClose: () => void;
}

type GridRow = AccountTxnRow & { total?: boolean };

const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const tabular: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const ROW_CLASS: RowClassRules<GridRow> = { 'font-semibold': (p) => !!p.data?.carry };
const amount = (field: 'deposit' | 'withdraw' | 'balance', headerName: string): ColDef<GridRow> => ({
  field, headerName, width: 150, minWidth: 130, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any,
});
const COLUMNS: ColDef<GridRow>[] = [
  { field: 'date', headerName: '거래일', width: 112, cellDataType: 'text', cellStyle: tabular },
  amount('deposit', '예금'), amount('withdraw', '인출'), amount('balance', '잔액'),
  { field: 'partner', headerName: '거래처', width: 170, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'memo', headerName: '적요', flex: 1, minWidth: 160, width: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'slipNo', headerName: '전표번호', width: 136, cellStyle: tabular },
];

/* ── 예금명세서(상세) 한 쪽 ── */
const pnum: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const pleft: CSSProperties = { textAlign: 'left' };
function DetailPrintPage({ account, period, rows, total, page, pages }: {
  account: BankAccount; period: string; rows: AccountTxnRow[]; total: { deposit: number; withdraw: number; balance: number } | null; page: number; pages: number;
}) {
  return (
    <>
      <header style={{ marginBottom: 12 }}>
        <div className="font-bold" style={{ fontSize: 20, textAlign: 'center', marginBottom: 10 }}>{REPORT_TITLE}</div>
        <div className="flex justify-between" style={{ fontSize: 12.5 }}>
          <span>{`금융기관 : ${account.bank} ${account.branch}`}</span>
          <span className="tabular-nums">{`PAGE : ${String(page)}/${String(pages)}`}</span>
        </div>
        <div style={{ fontSize: 12.5 }}>{`계좌번호 : ${account.accountNo}`}</div>
        <div style={{ fontSize: 12.5 }}>{`기준일 : ${period}`}</div>
      </header>
      <table>
        <thead>
          <tr><th style={pleft}>거래일</th><th style={{ textAlign: 'right' }}>예금</th><th style={{ textAlign: 'right' }}>인출</th><th style={{ textAlign: 'right' }}>잔액</th><th style={pleft}>거래처</th><th style={pleft}>적요</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td className="tabular-nums">{r.date}</td><td style={pnum}>{fmt(r.deposit)}</td><td style={pnum}>{fmt(r.withdraw)}</td><td style={pnum}>{fmt(r.balance)}</td><td>{r.partner}</td><td>{r.memo}</td></tr>
          ))}
          {total && (
            <tr style={{ fontWeight: 700 }}><td>합 계</td><td style={pnum}>{fmt(total.deposit)}</td><td style={pnum}>{fmt(total.withdraw)}</td><td style={pnum}>{fmt(total.balance)}</td><td /><td /></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export function AccountTxnDetailModal({ account, txns, from, to, onClose }: AccountTxnDetailModalProps) {
  const dlgRef = useRef<DialogHandle>(null);
  const [viewer, setViewer] = useState(false);
  const detail = useMemo(() => txnDetail(txns, account.id, from, to), [txns, account.id, from, to]);
  const period = periodLabel(from, to);
  const pinned = useMemo<GridRow[]>(() => [{
    id: '__total', date: '합계', deposit: detail.deposit, withdraw: detail.withdraw, balance: detail.balance, partner: '', memo: '', slipNo: '', total: true,
  }], [detail]);
  const count = detail.rows.length - 1;

  const exportExcel = () => {
    const head = ['거래일', '예금', '인출', '잔액', '거래처', '적요', '전표번호'];
    const body: (string | number)[][] = detail.rows.map((r) => [r.date, r.deposit, r.withdraw, r.balance, r.partner, r.memo, r.slipNo]);
    body.push(['합계', detail.deposit, detail.withdraw, detail.balance, '', '', '']);
    const ws = XLSX.utils.aoa_to_sheet([['금융기관', account.bank, '지점명', account.branch], ['계좌번호', account.accountNo, '기준일', period], [], head, ...body]);
    body.forEach((_, ri) => [1, 2, 3].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 4, c: ci })]; if (c && c.t === 'n') c.z = '#,##0'; }));
    ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 16 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '계좌거래상세');
    XLSX.writeFile(wb, `계좌거래상세_${account.accountNo}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* 인쇄 — 예금명세서(상세). 합 계는 마지막 쪽 */
  const chunks = paginate(detail.rows, PER_PAGE);
  const pages = chunks.map((rows, i) => (
    <DetailPrintPage key={i} account={account} period={periodLabel(from, to, ' - ')} rows={rows} page={i + 1} pages={chunks.length}
      total={i === chunks.length - 1 ? detail : null} />
  ));
  const saveReport = (fileName: string) => {
    const aoa: (string | number)[][] = [[REPORT_TITLE], [`금융기관 : ${account.bank} ${account.branch}`], [`계좌번호 : ${account.accountNo}`], [`기준일 : ${period}`], [],
      ['거래일', '예금', '인출', '잔액', '거래처', '적요'],
      ...detail.rows.map((r) => [r.date, r.deposit, r.withdraw, r.balance, r.partner, r.memo]),
      ['합 계', detail.deposit, detail.withdraw, detail.balance, '', '']];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), REPORT_TITLE);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success('저장했습니다');
  };

  const kv: [string, string][] = [['금융기관', account.bank], ['지점명', account.branch], ['계좌번호', account.accountNo], ['기준일', period]];
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-[1100px] max-h-[90vh]" onInteractOutside={(e) => { if (viewer) e.preventDefault(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>계좌거래상세</DialogTitle>
          <DialogDescription className="sr-only">{`${account.bank} ${account.accountNo} 계좌의 기준기간 거래내역`}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]" style={{ paddingTop: 24 }}>
          <dl className="grid gap-0 rounded-card-sm border border-border overflow-hidden" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', margin: '0 0 12px' }}>
            {kv.map(([k, v]) => (
              <div key={k} className="flex min-w-0" style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '0 -1px -1px 0' }}>
                <dt className="shrink-0 font-semibold text-muted-foreground bg-muted" style={{ width: 96, padding: '9px 12px', fontSize: 13, margin: 0 }}>{k}</dt>
                <dd className="min-w-0 truncate tabular-nums" title={v} style={{ padding: '9px 12px', fontSize: 14, margin: 0 }}>{v || '-'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end gap-2" style={{ marginBottom: 8 }}>
            <Button variant="outline" size="sm" leadingIcon="printer" onClick={() => setViewer(true)}>인쇄</Button>
            <Button variant="outline" size="sm" leadingIcon="download" onClick={exportExcel}>엑셀</Button>
          </div>
          <div style={{ height: 'min(52vh, 480px)' }}>
            <AgGridReact<GridRow>
              theme={apfsTheme}
              rowData={detail.rows}
              columnDefs={COLUMNS}
              defaultColDef={COL_DEF}
              getRowId={(p) => p.data.id}
              rowClassRules={ROW_CLASS}
              pinnedBottomRowData={pinned}
            />
          </div>
        </div>
        <DialogFooter className="px-[46px]">
          <span className="text-caption" style={{ fontSize: 12.5 }}>{count > 0 ? `거래 ${String(count)}건` : '기준기간 거래가 없습니다.'}</span>
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
        {viewer && (
          <LedgerReportViewer title={REPORT_TITLE} pages={pages} fileName={`${REPORT_TITLE}_${account.accountNo}_${periodLabel(from, to, '_')}`}
            info={[['금융기관', `${account.bank} ${account.branch}`], ['계좌번호', account.accountNo], ['기준일', period]]}
            onSave={saveReport} onClose={() => setViewer(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
