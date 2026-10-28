/* 계정과목 관리(ACC-001) — 「삭제이력보기」 팝업(설계서 slide14, E11).
   논리삭제된 계정과목을 조회 전용으로 표시(행 선택 없음). 최종수정자 = 삭제 처리자. [엑셀] 다운로드 · [닫기].
   ⚠ 설계서 '확인 필요' 2건(삭제일시·삭제자 컬럼 추가, 삭제 계정 복원)은 미결이라 구현하지 않았다. */
import React from 'react';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import type { AccountRow } from './account_code_data';

const { Button } = UI;

const COLS: { header: string; get: (r: AccountRow) => string; width?: number }[] = [
  { header: '계정코드', get: (r) => r.code, width: 96 },
  { header: '계정과목명', get: (r) => r.name },
  { header: '계정분류', get: (r) => r.cls, width: 80 },
  { header: '차대구분', get: (r) => r.dc, width: 80 },
  { header: '차감구분', get: (r) => r.contra, width: 80 },
  { header: '입력여부', get: (r) => r.input, width: 76 },
  { header: '최초등록자', get: (r) => r.createdBy, width: 96 },
  { header: '최종수정자', get: (r) => r.updatedBy, width: 96 },
];

export function AccountDeleteHistoryModal({ rows, onClose }: { rows: readonly AccountRow[]; onClose: () => void }) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([COLS.map((c) => c.header), ...rows.map((r) => COLS.map((c) => c.get(r)))]);
    ws['!cols'] = COLS.map((c) => ({ wch: c.header === '계정과목명' ? 28 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '삭제이력');
    XLSX.writeFile(wb, '계정과목 삭제이력.xlsx');
    toast.success('Excel로 내보냈습니다');
  };
  const th: React.CSSProperties = { position: 'sticky', top: 0, background: 'var(--grid-header)', color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700, textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[84vh]">
        <DialogHeader className="px-[46px]">
          <DialogTitle>삭제이력보기</DialogTitle>
          <DialogDescription className="sr-only">삭제(논리삭제)된 계정과목 목록 — 조회 전용</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-caption" style={{ fontSize: 12.5 }}>{'총 ' + String(rows.length) + '건'}</span>
          </div>
          <div className="rounded-[9px] border border-border overflow-auto" style={{ maxHeight: 420 }}>
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: 720 }}>
              <colgroup>{COLS.map((c) => <col key={c.header} style={c.width ? { width: c.width } : undefined} />)}</colgroup>
              <thead><tr>{COLS.map((c) => <th key={c.header} style={th}>{c.header}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0
                  ? <UI.EmptyRow span={COLS.length} msg="삭제된 계정과목이 없습니다." style={{ ...td, padding: '26px 10px' }} />
                  : rows.map((r) => (
                    <tr key={r.code}>
                      {COLS.map((c) => <td key={c.header} title={c.get(r)} style={c.header === '계정코드' ? { ...td, fontVariantNumeric: 'tabular-nums' } : td}>{c.get(r)}</td>)}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          {/* 팝업 푸터 = [엑셀] · [닫기](apfs-spec-popup 푸터 규약, subfund_spec_modal 동형) */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={exportExcel}>엑셀</Button>
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
