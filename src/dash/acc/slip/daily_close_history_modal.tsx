/* 일마감 처리이력 팝업(ACC-007 16p · E12, SFR-018-01 관리이력) — 조회 전용.
   - 조건: 기간(처리일시 기준, 기본 당월) · 계정구분(기본 툴바 선택값, 전체 가능) · 처리구분(전체/마감/마감 취소/비고 수정) — 열리면 자동 조회.
   - 조회 줄 [조회] = 조건 바로 뒤(조기경보 시계열 차트 모달 동형 — 설계서는 줄 오른쪽 끝) · 조건 재조회(시작 > 종료면 "시작일은 종료일보다 늦을 수 없습니다.") · 푸터 = [엑셀](조회 결과 다운로드 "Excel로 내보냈습니다") · [닫기](apfs-spec-popup 푸터 규약).
   - 그리드 10컬럼, 행 선택 없음(조회 전용 — apfs-aggrid). 0건 = "처리 이력이 없습니다."(전역 빈 상태 오버레이 문구).
   - 정렬: 설계서의 가운데 정렬 대신 프로젝트 표 정렬 규약(전부 좌측 — 수량형 숫자 칸 없음).
   크롬: 46px 패밀리 · max-w 1120. 권한("인쇄·다운로드")은 RBAC 미구현이라 [엑셀] 항상 노출. */
import '../../aggrid_shared.css';
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT } from '../../aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { toast } from '../../ui/sonner';
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS } from './general_journal_data';
import { HISTORY_KINDS } from './daily_close_data';
import type { HistoryEntry } from './daily_close_data';
import { HISTORY_EMPTY, defaultHistoryFilter, filterHistory, validateRange } from './daily_close_model';
import type { HistoryFilter } from './daily_close_model';
import { SuspenseField as Field, dayWrap } from './suspense_clear_modal';

const { Button, SaveButton, StatusBadge } = UI;

const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const KIND_TONE = { 마감: 'success', '마감 취소': 'danger', '비고 수정': 'info' } as const;
const kindCell = (p: { value: HistoryEntry['kind'] }) => (p.value ? <StatusBadge tone={KIND_TONE[p.value]} label={p.value} size="lg" /> : null);

const COLUMNS: ColDef<HistoryEntry>[] = [
  { field: 'at', headerName: '처리일시', cellStyle: tabNum },
  { field: 'kind', headerName: '처리구분', cellStyle: flexCenter, cellRenderer: kindCell },
  { field: 'account', headerName: '계정구분', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'term', headerName: '회기' },
  { field: 'date', headerName: '마감일자', cellStyle: tabNum },
  { field: 'user', headerName: '처리자(성명/아이디)' },
  { field: 'ip', headerName: 'IP', cellStyle: tabNum },
  { field: 'before', headerName: '변경 전', maxWidth: 200, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'after', headerName: '변경 후', maxWidth: 200, cellStyle: flexCenter, cellRenderer: textCell },
  /* 사유/비고 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362) */
  { field: 'reason', headerName: '사유 / 비고', flex: 1, minWidth: 160, width: 160, suppressAutoSize: true, cellStyle: flexCenter, cellRenderer: textCell },
];
const EXPORT_COLS: { header: string; get: (h: HistoryEntry) => string }[] = [
  { header: '처리일시', get: (h) => h.at }, { header: '처리구분', get: (h) => h.kind }, { header: '계정구분', get: (h) => h.account },
  { header: '회기', get: (h) => h.term }, { header: '마감일자', get: (h) => h.date }, { header: '처리자(성명/아이디)', get: (h) => h.user },
  { header: 'IP', get: (h) => h.ip }, { header: '변경 전', get: (h) => h.before }, { header: '변경 후', get: (h) => h.after }, { header: '사유 / 비고', get: (h) => h.reason },
];

export function DailyCloseHistoryModal({ log, account, today, onClose }: {
  log: readonly HistoryEntry[];
  account: string;
  today: string;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const [draft, setDraft] = React.useState<HistoryFilter>(() => defaultHistoryFilter(today, account));
  const [applied, setApplied] = React.useState<HistoryFilter>(draft);
  const [rangeErr, setRangeErr] = React.useState(false);
  const rows = React.useMemo(() => filterHistory(log, applied), [log, applied]);
  const setD = <K extends keyof HistoryFilter>(k: K, v: HistoryFilter[K]) => { setDraft((d) => ({ ...d, [k]: v })); setRangeErr(false); };

  const query = () => {
    const e = validateRange(draft.from, draft.to);
    if (e) { setRangeErr(true); toast.error(e); return undefined; }
    return () => { setApplied(draft); if (!filterHistory(log, draft).length) toast.info(HISTORY_EMPTY); };
  };
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_COLS.map((c) => c.header), ...rows.map((h) => EXPORT_COLS.map((c) => c.get(h)))]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '사유 / 비고' || c.header === '계정구분' ? 28 : 18 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '일마감 처리이력');
    XLSX.writeFile(wb, '일마감 처리이력.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1120px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>일마감 처리이력</DialogTitle>
          <DialogDescription className="sr-only">일마감 마감·마감 취소·비고 수정 이력을 조회합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]" style={{ paddingTop: 24 }}>
          {/* items-start — 기간 오류 문구가 흐름 안에 붙어도 라벨·컨트롤 줄이 어긋나지 않게(items-end 면 기간 칸만 위로 밀림) */}
          <div className="flex items-start gap-x-5 gap-y-1 flex-wrap">
            <Field label="기간" plain errMsg={rangeErr ? '시작일은 종료일보다 늦을 수 없습니다.' : undefined}>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.from} onChange={(v) => setD('from', v || '')} ariaLabel="기간 시작일" invalid={rangeErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.to} onChange={(v) => setD('to', v || '')} ariaLabel="기간 종료일" invalid={rangeErr} /></div>
              </div>
            </Field>
            <Field label="계정구분" plain><DrawerSelect value={draft.account} onChange={(v) => setD('account', v)} options={FUND_ACCOUNTS} ariaLabel="계정구분" /></Field>
            <Field label="처리구분" plain><DrawerSelect value={draft.kind} onChange={(v) => setD('kind', v)} options={HISTORY_KINDS} ariaLabel="처리구분" /></Field>
            {/* [조회] — 라벨 줄 높이만큼 장식 스페이서(SuspenseField 라벨과 같은 글꼴·간격) + 컨트롤 높이 34 안에서 세로 가운데 */}
            <div className="mb-3.5">
              <span aria-hidden="true" className="font-semibold text-caption flex items-center gap-1" style={{ fontSize: 12, marginBottom: 5 }}>{'\u00a0'}</span>
              <div className="flex items-center gap-2" style={{ height: 34 }}>
                <SaveButton leadingIcon="" busyLabel="조회 중" onSubmit={query}>조회</SaveButton>
              </div>
            </div>
          </div>
          <div style={{ height: 380 }}>
            <AgGridReact<HistoryEntry>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={COLUMNS}
              getRowId={(p) => p.data.id}
              defaultColDef={DEFAULT_COL_DEF}
              autoSizeStrategy={AUTO_SIZE_CONTENT}
              overlayNoRowsTemplate={HISTORY_EMPTY}
            />
          </div>
          <p className="m-0 mt-2 text-caption tabular-nums" style={{ fontSize: 12.5 }} aria-live="polite">{`총 ${String(rows.length)}건`}</p>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          {/* 팝업 푸터 = [엑셀] · [닫기](apfs-spec-popup 푸터 규약, account_delete_history_modal 동형) */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={exportExcel}>엑셀</Button>
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
