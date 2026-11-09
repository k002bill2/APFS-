/* 출자금현황 정보관리(ACC-022) — 「엑셀 일괄등록」 모달(설계서 slide 14 · 이벤트 E06 = slide 22).
   공용 UploadModal(trust_upload)은 미리보기 그리드를 담지 못해 전용 모달로 만든다(정본 acc/slip/journal_upload_modal 골격).

   구성: ① 도구 [양식 다운로드][파일 선택] + 파일 드롭 영역 ② 미리보기 그리드(No. + 12열, 오류 행 --danger-soft + 끝 '오류 사유' 열)
         ③ 요약 '오류 N건 — 확인 후 재업로드' ④ [닫기] [반영]
   결정·가정
   - 파일 선택·드롭 = **데모** — 파일을 읽지 않고(xlsx 파서 CVE — XLSX.read 금지) 예시 6행(오류 2행)을 미리보기에 채운 뒤 자동 검증한다.
     [양식 다운로드]는 SheetJS 쓰기라 허용(12열).
   - 검증은 파일 순서대로 validateUpload(모델) — 앞서 통과한 행이 뒤 행의 출자원금잔액에 들어간다.
   - [반영] = **검증 통과분만** 등록(설계서 slide 14 ③-7). 전표 업로드(journal_upload_modal)는 오류가 있으면 전체 중단하는데 여기는 다르다.
     통과 0건이면 오류 토스트 후 모달 유지. */
import React, { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GetRowIdParams, RowClassParams, RowStyle } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(양식 다운로드) — 파일 읽기 미사용
import { UI } from '../../components';
import type { SubmitResult } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import '../../aggrid_shared.css';
import type { ContribRow } from './contribution_data';
import { UPLOAD_HEADERS, demoUploadRows, uploadDoneMsg, uploadErrorMsg, uploadTemplateAoa, validateUpload } from './contribution_model';
import type { UploadRow } from './contribution_model';

const { Button, SaveButton } = UI;

const TEMPLATE_FILE = '출자금현황_일괄등록양식.xlsx';
const EMPTY_MSG = '양식을 작성한 뒤 파일을 선택하거나 끌어다 놓으세요.';
const DEMO_LOADED_MSG = '예시 데이터를 불러왔습니다(데모 — 실제 파일 파싱은 백엔드 연동 후)';

/* 금액 셀은 파일 값(문자열) 그대로 — 우측 정렬. 일자·회차·코드·텍스트는 좌측 */
const amt = { type: 'rightAligned', cellStyle: { fontVariantNumeric: 'tabular-nums' } } as const;
const COLS: ColDef<UploadRow>[] = [
  { field: 'no', headerName: 'No.', width: 64, minWidth: 60 },
  { field: 'account', headerName: UPLOAD_HEADERS[0], width: 100 },
  { field: 'regKind', headerName: UPLOAD_HEADERS[1], width: 92 },
  { field: 'date', headerName: UPLOAD_HEADERS[2], width: 112 },
  { field: 'seq', headerName: UPLOAD_HEADERS[3], width: 72 },
  { field: 'pay', headerName: UPLOAD_HEADERS[4], width: 140, ...amt },
  { field: 'distKind', headerName: UPLOAD_HEADERS[5], width: 100 },
  { field: 'principal', headerName: UPLOAD_HEADERS[6], width: 140, ...amt },
  { field: 'income', headerName: UPLOAD_HEADERS[7], width: 130, ...amt },
  { field: 'perfFee', headerName: UPLOAD_HEADERS[8], width: 120, ...amt },
  { field: 'incentive', headerName: UPLOAD_HEADERS[9], width: 130, ...amt },
  { field: 'lac', headerName: UPLOAD_HEADERS[10], width: 100, ...amt },
  { field: 'memo', headerName: UPLOAD_HEADERS[11], width: 180 },
];
const ERROR_COL: ColDef<UploadRow> = {
  colId: 'errors', headerName: '오류 사유', width: 280, minWidth: 200,
  valueGetter: (p) => (p.data?.errors.length ? p.data.errors.join(', ') : ''),
  cellStyle: { color: 'var(--danger-text)' },
};
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const getRowId = (p: GetRowIdParams<UploadRow>) => String(p.data.no);
const getRowStyle = (p: RowClassParams<UploadRow>): RowStyle | undefined => (p.data?.errors.length ? { background: 'var(--danger-soft)' } : undefined);
const EMPTY_TEMPLATE = `<span>${EMPTY_MSG}</span>`;

export function ContributionUploadModal({ rows: existing, makeId, onApply, onClose }: {
  /** 활성 행 전체 — 잔액·회차 계산 원천 */
  rows: readonly ContribRow[];
  /** 등록 행 id 발급(페이지 소유) — i = 통과분 순번 */
  makeId: (i: number) => string;
  onApply: (rows: ContribRow[]) => void;
  onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<UploadRow[]>([]);
  const [over, setOver] = useState(false);
  const result = useMemo(() => validateUpload(raw, existing, makeId), [raw, existing, makeId]);
  const errorCount = result.errorCount;
  const columns = useMemo(() => (errorCount ? [...COLS, ERROR_COL] : COLS), [errorCount]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet(uploadTemplateAoa());
    ws['!cols'] = [10, 8, 12, 6, 16, 10, 16, 16, 14, 14, 12, 24].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '출자금현황');
    XLSX.writeFile(wb, TEMPLATE_FILE);
    toast.success('업로드 양식을 내려받았습니다');
  };

  /* 데모 — 파일 내용을 읽지 않고 예시 행으로 채운 뒤 자동 검증(실제 파싱은 백엔드 연동 후) */
  const loadDemo = () => {
    const next = demoUploadRows();
    setRaw(next);
    const n = validateUpload(next, existing, makeId).errorCount;
    if (n) toast.error(uploadErrorMsg(n)); else toast.success(DEMO_LOADED_MSG);
  };

  /* [반영] — 검증 통과분만 등록 */
  const apply = (): SubmitResult => {
    if (!raw.length) { toast.error('업로드할 파일을 선택해 주세요.'); return undefined; }
    if (!result.passed.length) { toast.error(uploadErrorMsg(errorCount)); return undefined; }
    const passed = result.passed;
    return () => { onApply(passed); toast.success(uploadDoneMsg(passed.length)); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-48px)] max-w-[1200px] max-h-[90vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>엑셀 일괄등록</DialogTitle>
          <DialogDescription className="sr-only">표준 양식(12열)으로 작성한 출자·분배 내역을 올려 검증 통과분을 일괄 등록합니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]" style={{ minWidth: 0 }}>
          {/* ① 업로드 영역 + 도구 */}
          <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) loadDemo(); }}
            className="flex items-center gap-2 flex-wrap rounded-card-sm mb-3"
            style={{ padding: '10px 12px', border: `1px dashed ${over ? 'var(--ring)' : 'var(--border-strong)'}`, background: over ? 'var(--muted)' : 'transparent' }}>
            <span className="text-caption mr-auto" style={{ fontSize: 12.5 }}>드래그&드롭 또는 파일 선택 · XLS/XLSX · 1행 = 출자 또는 분배 1건 · 잔액·합계는 자동 계산</span>
            <Button variant="outline" size="sm" leadingIcon="download" onClick={downloadTemplate}>양식 다운로드</Button>
            <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => fileRef.current?.click()}>파일 선택</Button>
            <input ref={fileRef} type="file" accept=".xls,.xlsx" className="sr-only" tabIndex={-1} aria-hidden
              onChange={(e) => { if (e.target.files?.length) loadDemo(); e.target.value = ''; }} />
          </div>

          {/* ③ 요약 */}
          <p className="m-0 mb-2" aria-live="polite" style={{ fontSize: 12.5 }}>
            {raw.length > 0 && (
              <>
                <span className="text-caption">{`${String(raw.length)}행 · 통과 ${String(result.passed.length)}건`}</span>
                {errorCount > 0 && <span className="text-danger font-semibold" style={{ marginLeft: 8 }}>{uploadErrorMsg(errorCount)}</span>}
              </>
            )}
          </p>

          {/* ② 미리보기 */}
          <div role="region" aria-label="업로드 미리보기" style={{ height: 340 }}>
            <AgGridReact<UploadRow>
              theme={apfsTheme}
              rowData={result.rows}
              columnDefs={columns}
              defaultColDef={COL_DEF}
              getRowId={getRowId}
              getRowStyle={getRowStyle}
              overlayNoRowsTemplate={EMPTY_TEMPLATE}
            />
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton size="md" leadingIcon="" busyLabel="반영 중" onSubmit={apply}>반영</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
