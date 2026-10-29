/* 회계 전표 업로드 모달 — ACC-003 목록 등록 콤보 ▾ [전표 업로드] (slide 15 · 이벤트 E03 = slide 20).
   공용 UploadModal(trust_upload)은 계정구분 + 미리보기 그리드를 담지 못해 전용 모달로 만든다.

   구성: ① 계정구분*(select) + 거래처코드 안내 ② 그리드 도구 [양식다운로드][엑셀업로드][초기화] ③ 업로드 그리드(No. + 14컬럼, Σ 차변·대변)
         ④ [닫기] [저장]
   결정·가정(보고서에도 기재)
   - [엑셀업로드] = **데모** — 파일 선택 없이 예시 행(demoUploadRows, 전표 2건)을 미리보기에 채운다(2026-10-28 사용자 결정:
     업로드 파일 읽기(SheetJS read) 미도입 — xlsx@0.18.5 파서 CVE. 실제 파일 파싱은 백엔드 연동 후). [양식다운로드]는 SheetJS 쓰기라 유지.
   - 계정과목명·거래처명은 코드 기준 자동(파일 값 무시). 손익부서명·손익사원명은 코드 대응표가 없어 파일 값 그대로.
   - 오류 행 = 행 배경 --danger-soft + 맨 끝 '오류 사유' 컬럼(오류가 있을 때만 보임). 저장은 중단.
   - 계정구분 미선택 저장 = 설계서 '툴팁' 대신 프로젝트 필드 에러 패턴(빨간 테두리 + 인라인 "필수 항목입니다." + 토스트) + 포커스.
   - 빈 상태 문구는 업로드 맥락에 맞춰 EMPTY_MSG(설계서 원문 "조회 버튼을 클릭하면 데이터를 불러옵니다."로 바꾸려면 상수만). */
import React, { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GetRowIdParams, RowClassParams, RowStyle, ValueFormatterParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(양식다운로드) — 파일 읽기 미사용
import { UI } from '../../components';
import type { SubmitResult } from '../../components';
import { Icon } from '../../icons';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { SearchableSelect } from '../../ui/searchable-select';
import { CONTROL_BOX } from '../../schemas/renderers';
import { toast } from '../../ui/sonner';
import { apfsTheme, DEFAULT_COL_DEF, fmt } from '../../aggrid_theme';
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { FUND_ACCOUNTS, todayStr } from './general_journal_data';
import type { FundAccount, JournalRow, Partner } from './general_journal_data';
import { UPLOAD_MSG, demoUploadRows, uploadTemplateAoa, uploadTotals, uploadsToJournals, validateUpload } from './general_journal_model';
import type { UploadCheck, UploadRow } from './general_journal_model';

const { Button, SaveButton } = UI;

/** 업로드 전 빈 상태 문구 — 설계서 원문은 "조회 버튼을 클릭하면 데이터를 불러옵니다."(업로드 맥락에 맞춰 바꿈) */
export const EMPTY_MSG = '엑셀업로드로 파일을 불러오세요.';
const NOTICE = '거래처코드의 경우에는 설정 > 초기설정 > 고객원장에 표시되는 고객번호를 입력해 주세요.';
const TEMPLATE_FILE = '회계전표_업로드양식.xlsx';
const DEMO_LOADED_MSG = '예시 데이터를 불러왔습니다(데모 — 실제 파일 파싱은 백엔드 연동 후)';

/* ── 그리드 — No. + slide 15 14컬럼 순서. 금액만 우측(수량형), 나머지(일자·순번·코드·텍스트) 좌측 ── */
type GridRow = UploadRow | (Partial<UploadRow> & { pinned: true });
const amount = (p: ValueFormatterParams<GridRow>) => (p.value == null ? '' : fmt(p.value as number));
const COLS: ColDef<GridRow>[] = [
  { field: 'no', headerName: 'No.', width: 70, minWidth: 70, valueFormatter: (p) => (p.node?.rowPinned ? 'Σ' : String(p.value ?? '')) },
  { field: 'slipDate', headerName: '전표일', width: 120, minWidth: 110 },
  { field: 'seq', headerName: '순번', width: 80, minWidth: 70 },
  { field: 'accountCode', headerName: '계정과목', width: 110, minWidth: 100 },
  { field: 'accountName', headerName: '계정과목명', width: 150, minWidth: 120 },
  { field: 'debit', headerName: '차변', type: 'rightAligned', width: 130, minWidth: 110, valueFormatter: amount },
  { field: 'credit', headerName: '대변', type: 'rightAligned', width: 130, minWidth: 110, valueFormatter: amount },
  { field: 'partnerCode', headerName: '거래처코드', width: 110, minWidth: 100 },
  { field: 'partnerName', headerName: '거래처명', width: 170, minWidth: 130 },
  { field: 'memo', headerName: '적요', width: 220, minWidth: 160 },
  { field: 'plDept', headerName: '손익부서', width: 100, minWidth: 90 },
  { field: 'plDeptName', headerName: '손익부서명', width: 120, minWidth: 100 },
  { field: 'plEmployee', headerName: '손익사원', width: 100, minWidth: 90 },
  { field: 'plEmployeeName', headerName: '손익사원명', width: 120, minWidth: 100 },
  { field: 'bankCode', headerName: '계좌코드', width: 140, minWidth: 110 },
];
const ERROR_COL: ColDef<GridRow> = {
  colId: 'errors', headerName: '오류 사유', width: 260, minWidth: 200,
  valueGetter: (p) => (p.data && 'errors' in p.data && p.data.errors ? p.data.errors.join(', ') : ''),
  cellStyle: { color: 'var(--danger-text)' },
};
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const getRowId = (p: GetRowIdParams<GridRow>) => (p.data && 'pinned' in p.data ? 'sum' : String(p.data.no));
/* 오류 행 = 위험 배경 토큰. 합계 행은 제외 */
const getRowStyle = (p: RowClassParams<GridRow>): RowStyle | undefined =>
  !p.node.rowPinned && p.data && 'errors' in p.data && p.data.errors?.length ? { background: 'var(--danger-soft)' } : undefined;
const EMPTY_TEMPLATE = `<span>${EMPTY_MSG}</span>`;

const selectTrigger: React.CSSProperties = {
  ...CONTROL_BOX, width: '100%', minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
};

export function JournalUploadModal({ partners, onSave, onClose }: {
  /** 거래처 원장 — 거래처코드 → 거래처명 해석(간편추가분 포함) */
  partners: readonly Partner[];
  /** 검증 통과 전표(그룹마다 1건, 미채번) — 페이지가 rows 에 반영 */
  onSave: (journals: JournalRow[]) => void;
  /** 닫힌 뒤(exit 애니메이션 종료 후) */
  onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const fundRef = useRef<HTMLDivElement>(null);
  const [fund, setFund] = useState<FundAccount | ''>('');
  const [fundErr, setFundErr] = useState(false);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const totals = useMemo(() => uploadTotals(rows), [rows]);
  const pinned = useMemo<GridRow[]>(() => [{ pinned: true, debit: totals.debit, credit: totals.credit }], [totals]);
  const errorCount = rows.filter((r) => r.errors.length).length;
  const columns = useMemo(() => (errorCount ? [...COLS, ERROR_COL] : COLS), [errorCount]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet(uploadTemplateAoa(todayStr(), partners));
    ws['!cols'] = [12, 6, 10, 14, 12, 12, 10, 18, 24, 10, 12, 10, 12, 14].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '회계전표');
    XLSX.writeFile(wb, TEMPLATE_FILE);
    toast.success('업로드 양식을 내려받았습니다');
  };

  /* 데모 — 파일 선택 없이 예시 행을 채운다(실제 파싱은 백엔드 연동 후) */
  const loadDemo = () => {
    setRows(demoUploadRows(todayStr(), partners));
    setLoaded(true);
    toast.success(DEMO_LOADED_MSG);
  };

  const reset = () => { setRows([]); setLoaded(false); };

  const save = (): SubmitResult => {
    const check = validateUpload(fund, rows);
    if (!check.ok) {
      const v = check as Exclude<UploadCheck, { ok: true }>;   // strict:false 라 판별 유니온이 좁혀지지 않는다
      if (v.field === 'fundAccount') {
        setFundErr(true);
        toast.error(v.message);
        (fundRef.current?.querySelector('button, input') as HTMLElement | null)?.focus();
      } else if (v.field === 'rows') {
        toast.error(v.message, { description: `오류 행 No. ${v.errorRows.join(', ')}` });
      } else if (v.field === 'balance') {
        toast.error(v.message, { description: v.groups.map((g) => `${g.slipDate} 순번 ${g.seq}`).join(' · ') });
      } else {
        toast.error(v.message);
      }
      return undefined;
    }
    const journals = uploadsToJournals(rows, fund as FundAccount, todayStr(), partners);
    return () => {
      onSave(journals);
      toast.success(UPLOAD_MSG.saved, { description: `전표 ${String(journals.length)}건` });
      dlgRef.current?.close();
    };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-48px)] max-w-[1200px] max-h-[90vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>회계 전표 업로드</DialogTitle>
          <DialogDescription className="sr-only">계정구분을 고르고 엑셀 양식 파일을 올려 전표를 일괄 생성합니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]" style={{ minWidth: 0 }}>
          {/* ① 계정구분 */}
          <div className="mb-3" ref={fundRef}>
            <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>계정구분 *</span>
            <div style={{ width: '100%', maxWidth: 320 }}>
              <SearchableSelect value={fund} onChange={(v) => { setFund(v as FundAccount | ''); if (v) setFundErr(false); }} options={FUND_ACCOUNTS}
                placeholder="선택해 주세요" ariaLabel="계정구분" required invalid={fundErr} fill
                /* 필수 미선택이면 처음부터 빨간 테두리(SchemaField requiredEmpty 규약과 동일 — 고르면 즉시 풀린다) */
                triggerStyle={{ ...selectTrigger, border: `1px solid ${fundErr || !fund ? 'var(--danger)' : 'var(--border-strong)'}` }} />
            </div>
            {fundErr && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{UPLOAD_MSG.fundAccount}</span>}
          </div>
          <p className="m-0 mb-4 flex items-start gap-1.5 text-caption" style={{ fontSize: 12.5 }}>
            <Icon name="info" size={14} />{NOTICE}
          </p>

          {/* ② 그리드 도구 */}
          <div className="flex items-center gap-2 flex-wrap mb-2" role="toolbar" aria-label="업로드 그리드 도구">
            {/* 상태 문구는 좌측, 도구 버튼은 우측 정렬(mr-auto 가 남는 폭을 먹는다) */}
            <span className="text-caption mr-auto" aria-live="polite" style={{ fontSize: 12.5 }}>
              {loaded ? `예시 데이터 · ${String(rows.length)}행${errorCount ? ` · 오류 ${String(errorCount)}행` : ''}` : ''}
            </span>
            <Button variant="outline" size="sm" leadingIcon="download" onClick={downloadTemplate}>양식다운로드</Button>
            <Button variant="outline" size="sm" leadingIcon="upload" onClick={loadDemo}>엑셀업로드</Button>
            <Button variant="outline" size="sm" leadingIcon="refresh" onClick={reset} disabled={!rows.length}>초기화</Button>
          </div>

          {/* ③ 업로드 그리드 — 가로 스크롤(컬럼 폭 합 > 모달 폭) */}
          <div role="region" aria-label="업로드 미리보기" style={{ height: 380 }}>
            <AgGridReact<GridRow>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columns}
              defaultColDef={COL_DEF}
              getRowId={getRowId}
              getRowStyle={getRowStyle}
              pinnedBottomRowData={pinned}
              overlayNoRowsTemplate={EMPTY_TEMPLATE}
            />
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton size="md" onSubmit={save}>저장</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
