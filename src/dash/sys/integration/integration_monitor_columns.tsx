/* 연동 모니터링(ADM-005) — 두 탭 그리드의 컬럼 정의 + 탭별 엑셀 내보내기. 페이지(integration_monitor.tsx)는 배선만 한다.
   - 송수신이력: 목업 헤더 13열 순서 그대로 + 앞에 No. 전체·성공·실패 3열은 '건수' 2단 그룹 헤더(ColGroupDef, 조언자 지시 —
     목업 thead 는 단일 행). 건수 3열만 우측(수량형), 일련번호·전송ID·일시·배지는 좌측(표 정렬 규약). 실패 > 0 은 목업 `.fail` 처럼 빨강 굵게.
   - 연계처리이력: 목업 헤더 10열 순서 그대로 + 앞에 No. 연계일련번호 = 셀 링크(LinkCell → 그 송수신 건 상세).
     재처리는 횟수(수량)라 우측 + 'N회'. 변경전→후는 정렬·엑셀용 문자열(valueGetter)과 배지 2개(cellRenderer)를 따로 둔다.
   - 폭: 넓은 다열 표라 AUTO_SIZE_CONTENT + 잔여폭 흡수 컬럼 1개(연계기관·오류메시지 — flex·minWidth·width·suppressAutoSize 4종).
   - 엑셀: 화면 컬럼 그대로(No 제외). 송수신은 2단 헤더 병합을 columnDefs 에서 자동 산출(`flattenForExcel` — 공유 export 아님, 골드 로컬 사본). */
import type { ColDef, ColGroupDef, CellStyle, CellClassParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { UI } from '../../components';
import { NO_COL_ID, numFmt, numStyle } from '../../aggrid_theme';
import { LinkCell } from '../../link_cell';
import { cdText, transitionText, retryText, TRRC_TONE } from './integration_monitor_model';
import type { TrsmRow, PrcsRow } from './integration_monitor_data';
import { CdBadge, TransitionBadges } from './integration_badges';

const { StatusBadge } = UI;

/** 그리드 context — 셀 링크가 페이지 핸들러를 부른다(인라인 colDef 재생성 없이) */
export interface PrcsGridCtx { openLinked: (sn: number) => void }

const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const NONE = <span className="text-caption">-</span>;
/* 잔여폭 흡수 컬럼 — fitCellContents 가 덮어쓰지 않게 suppressAutoSize(apfs-aggrid "잔여폭 흡수 컬럼") */
const stretch = (minWidth: number) => ({ flex: 1, minWidth, width: minWidth, suppressAutoSize: true });

const noCol = { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: tabNum, sortable: false, valueGetter: (p: { node: { rowIndex: number | null } | null }) => (p.node?.rowIndex ?? 0) + 1 };

/* ── 송수신이력 ── */
const failStyle = (p: CellClassParams<TrsmRow>): CellStyle => ({
  ...numStyle()(p as any),
  ...(Number(p.value) > 0 ? { color: 'var(--danger-text)', fontWeight: 700 } : {}),
});
const countCol = (field: 'whol' | 'scs' | 'fail', headerName: string): ColDef<TrsmRow> => ({
  field, headerName, type: 'rightAligned', minWidth: 72, valueFormatter: numFmt,
  cellStyle: (field === 'fail' ? failStyle : numStyle()) as any,
});

export const TRSM_COLS: (ColDef<TrsmRow> | ColGroupDef<TrsmRow>)[] = [
  noCol as ColDef<TrsmRow>,
  { field: 'sn', headerName: '연계일련번호', cellStyle: tabNum },
  { field: 'trsmId', headerName: '전송ID', cellStyle: tabNum },
  { field: 'inst', headerName: '연계기관', ...stretch(220) },
  { field: 'ifId', headerName: '인터페이스ID' },
  { field: 'trrc', headerName: '송수신', cellStyle: flexCenter, cellRenderer: (p: any) => <StatusBadge tone={TRRC_TONE[p.value as TrsmRow['trrc']]} label={p.value} size="lg" /> },
  { field: 'mth', headerName: '방식' },
  { field: 'rsn', headerName: '사유' },
  { field: 'req', headerName: '요청일시', cellStyle: tabNum },
  { field: 'rsp', headerName: '응답일시', cellStyle: tabNum },
  { headerName: '건수', marryChildren: true, children: [countCol('whol', '전체'), countCol('scs', '성공'), countCol('fail', '실패')] },
  { field: 'cd', headerName: '응답코드', cellStyle: flexCenter, cellRenderer: (p: any) => <CdBadge cd={p.value} /> },
];

/* ── 연계처리이력 ── */
export const PRCS_COLS: ColDef<PrcsRow>[] = [
  noCol as ColDef<PrcsRow>,
  { field: 'sn', headerName: '이력일련번호', cellStyle: tabNum },
  {
    field: 'linkSn', headerName: '연계일련번호', cellStyle: flexCenter,
    cellRenderer: (p: any) => <LinkCell value={p.value} tabular hint="송수신이력 상세 보기" onClick={() => (p.context as PrcsGridCtx).openLinked(p.value)} />,
  },
  { field: 'tbl', headerName: '대상테이블명' },
  { field: 'key', headerName: '거래고유번호', cellStyle: tabNum },
  {
    colId: 'trans', headerName: '변경전→후', cellStyle: flexCenter,
    valueGetter: (p) => (p.data ? transitionText(p.data) : ''),
    cellRenderer: (p: any) => (p.data ? <TransitionBadges bef={p.data.bef} aft={p.data.aft} /> : null),
  },
  { field: 'err', headerName: '오류코드', cellStyle: { ...flexCenter, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => p.value || NONE },
  { field: 'msg', headerName: '오류메시지', ...stretch(220), cellStyle: flexCenter, cellRenderer: (p: any) => p.value || NONE },
  { field: 'retry', headerName: '재처리', type: 'rightAligned', minWidth: 72, valueFormatter: (p) => retryText(Number(p.value)), cellStyle: numStyle() as any },
  { field: 'actor', headerName: '행위자' },
  { field: 'dt', headerName: '발생일시', cellStyle: tabNum },
];

/* ──────────────────────────────
   엑셀(SheetJS) — 탭별 화면 행·컬럼 그대로. 수량형(건수·재처리)만 숫자 셀(t:'n' + 서식)로 써서 Excel 이 우측 정렬한다.
────────────────────────────── */
type AnyDef<T> = ColDef<T> | ColGroupDef<T>;

/** columnDefs → 2단 헤더(head1 그룹 · head2 리프) + 리프 키 + 병합. No 컬럼은 내보내지 않는다 */
export function flattenForExcel<T>(defs: AnyDef<T>[]) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = d.children as ColDef<T>[];
      head1.push(d.headerName ?? '', ...Array<string>(kids.length - 1).fill(''));
      kids.forEach((k) => { head2.push(k.headerName ?? ''); keys.push(String(k.colId ?? k.field)); });
      if (kids.length > 1) merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
      continue;
    }
    const col = d as ColDef<T>;
    if (col.colId === NO_COL_ID) continue;
    head1.push(col.headerName ?? '');
    head2.push('');
    keys.push(String(col.colId ?? col.field));
    merges.push({ s: { r: 0, c }, e: { r: 1, c } });
    c += 1;
  }
  return { head1, head2, keys, merges };
}

/** 숫자 셀 서식 — headRows 아래 본문 행의 지정 열에 z 를 건다 */
function formatNumCols(ws: XLSX.WorkSheet, cols: { c: number; z: string }[], headRows: number, rowCount: number) {
  for (const { c, z } of cols) {
    for (let i = 0; i < rowCount; i++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headRows + i, c })];
      if (cell) cell.z = z;
    }
  }
}

function writeBook(ws: XLSX.WorkSheet, sheet: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, `연동 모니터링_${sheet}.xlsx`);
}

const TRSM_NUM = new Set(['whol', 'scs', 'fail']);
const trsmCell = (r: TrsmRow, key: string): string | number => {
  if (key === 'cd') return cdText(r.cd);
  const v = r[key as keyof TrsmRow];
  return TRSM_NUM.has(key) ? Number(v) : String(v ?? '');
};

/** 송수신이력 — 2단 헤더(건수 그룹 병합) */
export function exportTrsm(rows: readonly TrsmRow[]) {
  const { head1, head2, keys, merges } = flattenForExcel(TRSM_COLS);
  const body = rows.map((r) => keys.map((k) => trsmCell(r, k)));
  const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
  ws['!merges'] = merges;
  ws['!cols'] = keys.map((k) => ({ wch: k === 'inst' ? 30 : k === 'req' || k === 'rsp' ? 20 : TRSM_NUM.has(k) ? 8 : 16 }));
  formatNumCols(ws, keys.flatMap((k, c) => (TRSM_NUM.has(k) ? [{ c, z: '#,##0' }] : [])), 2, body.length);
  writeBook(ws, '송수신이력');
}

type XCol = { header: string; get: (r: PrcsRow) => string | number; wch: number };
export const PRCS_X: readonly XCol[] = [
  { header: '이력일련번호', get: (r) => String(r.sn), wch: 12 },
  { header: '연계일련번호', get: (r) => String(r.linkSn), wch: 12 },
  { header: '대상테이블명', get: (r) => r.tbl, wch: 14 },
  { header: '거래고유번호', get: (r) => r.key, wch: 22 },
  { header: '변경전→후', get: transitionText, wch: 22 },
  { header: '오류코드', get: (r) => r.err || '-', wch: 12 },
  { header: '오류메시지', get: (r) => r.msg || '-', wch: 30 },
  { header: '재처리', get: (r) => r.retry || 0, wch: 8 },
  { header: '행위자', get: (r) => r.actor, wch: 18 },
  { header: '발생일시', get: (r) => r.dt, wch: 20 },
];
const RETRY_C = PRCS_X.findIndex((x) => x.header === '재처리');

/** 연계처리이력 — 단일 헤더. 재처리는 숫자 셀 + '0"회"' 서식(화면 'N회' 와 같게 보이고 합산 가능) */
export function exportPrcs(rows: readonly PrcsRow[]) {
  const body = rows.map((r) => PRCS_X.map((x) => x.get(r)));
  const ws = XLSX.utils.aoa_to_sheet([PRCS_X.map((x) => x.header), ...body]);
  ws['!cols'] = PRCS_X.map((x) => ({ wch: x.wch }));
  formatNumCols(ws, [{ c: RETRY_C, z: '0"회"' }], 1, body.length);
  writeBook(ws, '연계처리이력');
}
