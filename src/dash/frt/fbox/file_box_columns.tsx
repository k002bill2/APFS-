/* 파일BOX 그리드 컬럼·엑셀·다운로드 — 전체 화면(file_box)과 GNB 팝업(file_box_modal)이 같이 쓴다.
   - 다운로드: 1개 = '원본명.txt' 목업 파일, 여러 개 = ZIP 하나(file_box_model.downloadPlan · file_box_zip.zipStore). 백엔드가 없어 실제 원본은 아니다.
   - 파일명 = 확장자 아이콘(ui/attachment glyphFor — 첨부 칩과 같은 색) + LinkCell(누르면 다운로드, Enter 동치는 그리드 onCellKeyDown).
   - 정렬 규약: 크기(수량) = 우측, 나머지 좌측. 등록일 내림차순이 기본 정렬(새 파일이 위).
   - 컬럼·선택 옵션은 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다 — apfs-aggrid 계약 6). */
import type { ColDef, CellStyle, ICellRendererParams, RowSelectionOptions } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { format } from 'date-fns';
import { glyphFor } from '../../ui/attachment';
import { LinkCell } from '../../link_cell';
import { toast } from '../../ui/sonner';
import { fmtSize, downloadPlan } from './file_box_model';
import { zipStore } from './file_box_zip';
import type { MyFile, SubFile } from './file_box_data';

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // 브라우저가 내려받기를 시작한 뒤 해제
}

/** 다운로드 — 1개는 목업 텍스트 파일, 여러 개는 ZIP 으로 실제 내려받는다(원본 파일은 백엔드 연동 후) */
export function downloadFiles(rows: readonly (MyFile | SubFile)[]): void {
  if (!rows.length) return;
  const plan = downloadPlan(rows, format(new Date(), 'yyyyMMdd'));
  const enc = new TextEncoder();
  const blob = plan.kind === 'file'
    ? new Blob([plan.entries[0].text], { type: 'text/plain;charset=utf-8' })
    : new Blob([zipStore(plan.entries.map((e) => ({ name: e.path, data: enc.encode(e.text) })))], { type: 'application/zip' });
  saveBlob(blob, plan.fileName);
  toast.success(plan.kind === 'file'
    ? `다운로드: ${rows[0].name} (목업 파일)`
    : `${String(rows.length)}개 파일을 ZIP으로 내려받았습니다: ${plan.fileName} (목업 파일)`);
}

const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const sizeStyle: CellStyle = { fontVariantNumeric: 'tabular-nums', color: 'var(--muted-foreground)' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

function FileNameCell({ row }: { row: MyFile | SubFile }) {
  const { Icon: Glyph, cls } = glyphFor(row.name);
  return (
    <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
      <Glyph size={16} aria-hidden className={'shrink-0 ' + cls} />
      <LinkCell value={row.name} hint="다운로드" onClick={() => downloadFiles([row])} />
    </span>
  );
}

/** 파일명 열 id — 그리드 Enter(onCellKeyDown)가 이 열에서 다운로드한다 */
export const NAME_COL = 'name';
const nameCol = <T extends MyFile | SubFile>(): ColDef<T> => ({
  colId: NAME_COL, field: 'name' as never, headerName: '파일명', flex: 1, width: 280, minWidth: 280, cellStyle: flexCenter,
  cellRenderer: (p: ICellRendererParams<T>) => (p.data ? <FileNameCell row={p.data} /> : null),
});
const sizeCol = <T extends { size: number | null }>(): ColDef<T> => ({
  colId: 'size', headerName: '크기', width: 96, maxWidth: 96, type: 'rightAligned', cellStyle: sizeStyle,
  valueGetter: (p) => p.data?.size ?? null, valueFormatter: (p) => fmtSize(p.value ?? null),
});
const dateCol = <T extends { date: string }>(): ColDef<T> => ({
  field: 'date' as never, headerName: '등록일', width: 116, maxWidth: 116, cellStyle: tabNum, sort: 'desc',
});

export const MY_COLS: ColDef<MyFile>[] = [nameCol<MyFile>(), sizeCol<MyFile>(), dateCol<MyFile>()];
export const SUB_COLS: ColDef<SubFile>[] = [
  { field: 'org', headerName: '운용사', width: 150, minWidth: 130, maxWidth: 200 },
  { field: 'fund', headerName: '조합명', width: 230, minWidth: 180, maxWidth: 300 },
  { field: 'co', headerName: '투자기업', width: 130, minWidth: 110, maxWidth: 180 },
  nameCol<SubFile>(), sizeCol<SubFile>(), dateCol<SubFile>(),
];

/** 다중 선택 — 체크박스로만 on/off(2026-09-22), 선택이 다운로드·삭제·추가·교체를 만든다 */
export const ROW_SELECTION: RowSelectionOptions = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* ── 엑셀(화면에 보이는 필터 결과 그대로) ── */
function writeSheet(head: string[], body: (string | number)[][], sheet: string, widths: number[]): void {
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, `파일BOX_${sheet}.xlsx`);
  toast.success('Excel로 내보냈습니다');
}
export const exportMy = (rows: readonly MyFile[]) =>
  writeSheet(['파일명', '크기', '등록일'], rows.map((r) => [r.name, fmtSize(r.size), r.date]), '내 파일함', [44, 10, 12]);
export const exportSub = (rows: readonly SubFile[]) =>
  writeSheet(['운용사', '조합명', '투자기업', '파일명', '크기', '등록일'], rows.map((r) => [r.org, r.fund, r.co, r.name, fmtSize(r.size), r.date]), '운용사 제출 파일', [18, 30, 16, 40, 10, 12]);
