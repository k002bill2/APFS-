/* IR 상세보기 — 읽기전용 2탭 팝업(ACC-024 행 더블클릭 / Enter).
   출처: ACC-024 화면설계서 IR 상세 팝업 → APFS 디자인시스템(경영체 상세보기 entity_detail_modal 과 같은 골격).

   구성(설계서 → 우리 규약):
   - 팝업 → Radix `Dialog` max-w-[1020px](경영체 상세보기와 같은 폭), 46px 패밀리. 제목 'IR 상세보기' + 대상명(IR명).
   - 탭 2개(행사정보·참가경영체) → `UI.SegTabs`. 열 때 행사정보.
   - 행사정보 13항목 → kv 그리드. 참가 경영체수 = 참가 배열 길이('N 개사'). 첨부파일 = 파일명 텍스트 버튼(데모 다운로드 토스트).
   - 참가경영체 → 수제 표 7열, 상담일자 → 기업명 순(모델). 기업명 = 공용 LinkCell(button) → 경영체 상세보기를 이 모달 위에 중첩으로 연다.
     중첩은 apfs-spec-popup 규약 5(subfund_spec_modal) — 자식은 이 컴포넌트 안에서 조건부 마운트, 부모는 자식이 열린 동안
     바깥 클릭을 막는다(자식 스크림 클릭이 부모까지 닫지 않게). Esc 는 Radix 스택이라 한 겹씩 닫힌다.
   - 엑셀 = 푸터 [엑셀] · [닫기](apfs-spec-popup 규약 1). 참가경영체 탭에서만 보이고(`참가경영체_<IR명>.xlsx`) 행사정보 탭에선 숨긴다.
   결정·가정
   - 참가경영체 기업명 링크는 button 이라 Enter·Space 로도 열린다(키보드 동치는 네이티브 button).
   - 첨부파일이 없으면 '-'. 비고가 비면 '-'. */
import '../../aggrid_shared.css';
import React, { useState, useCallback } from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { LinkCell } from '../../link_cell';
import { apfsTheme } from '../../aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellKeyDownEvent, CellStyle, ICellRendererParams } from 'ag-grid-community';
import type { AgriEntity, IrEvent } from './bizorg_data';
import { participantCount, participantRows } from './bizorg_model';
import type { ParticipantRow } from './bizorg_model';
import { EntityDetailModal, KvGrid, TabBar, safeFileName, xlText, FIXED_ORDER_COL_DEF } from './entity_detail_modal';
import type { KvItem } from './entity_detail_modal';

const { Button } = UI;

const demoDownload = (file: string) => toast(`${file} 다운로드(데모)`);

/* 설계서 와이어프레임 배치(2단): IR명(full) / IR일자 | 상담구분 / 장소 | 주관기관 / 대상 자펀드 | 운용사 / 참가 경영체수 |
   담당자 / 등록일 | 사용여부 / 첨부파일(full) / 비고(full). 빈 값(첨부 없음·비고 없음)은 KvGrid 가 muted '-' */
const buildKv = (ir: IrEvent): KvItem[] => [
  { l: 'IR명', v: ir.name, full: true },
  { l: 'IR일자', v: <span className="tabular">{ir.date}</span> },
  { l: '상담구분', v: ir.consultType },
  { l: '장소', v: ir.place },
  { l: '주관기관', v: ir.host },
  { l: '대상 자펀드', v: `${ir.gp} > ${ir.fund}` },
  { l: '운용사', v: ir.gp },
  { l: '참가 경영체수', v: `${String(participantCount(ir))} 개사`, num: true },
  { l: '담당자', v: ir.manager },
  { l: '등록일', v: <span className="tabular">{ir.regAt}</span> },
  { l: '사용여부', v: ir.useYn },
  {
    l: '첨부파일',
    v: ir.attachment
      ? <LinkCell value={ir.attachment} hint="첨부파일 다운로드" onClick={() => demoDownload(ir.attachment!)} />
      : null,
    full: true,
  },
  { l: '비고', v: ir.note, full: true },
];

const PART_HEAD = ['기업명', '사업자번호', '대표자', '상담일자', '상담구분', '상담의견', '담당자'];

/* ── 참가경영체 그리드(조회 전용 — 선택·페이지네이션 없음). 전부 좌측(수량형 숫자 열 없음), 빈 값 '-' ── */
type PartGridRow = ParticipantRow & { id: string };
type GridCtx = { openEntity: (r: PartGridRow) => void };
const NAME_COL = 'name';
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const orDash = (v: unknown) => (v == null || v === '' ? '-' : String(v));
/* display:flex 셀은 기본 말줄임이 안 걸린다 → truncate span(삭제전표 textCell 동형) */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{orDash(p.value)}</span>;
/* 기업명 = 공용 LinkCell(button). 키보드 동치는 그리드 onCellKeyDown Enter */
function NameCell(p: ICellRendererParams<PartGridRow, string, GridCtx>) {
  const row = p.data;
  if (!row?.entity) return <span>-</span>;
  return <LinkCell value={row.name} hint="경영체 상세보기" onClick={() => p.context.openEntity(row)} />;
}
const PART_COLS: ColDef<PartGridRow>[] = [
  { field: 'name', colId: NAME_COL, headerName: '기업명', width: 190, minWidth: 170, cellStyle: flexCenter, cellRenderer: NameCell },
  { colId: 'bizNo', headerName: '사업자번호', valueGetter: (p) => p.data?.entity?.bizNo ?? null, valueFormatter: (p) => orDash(p.value), width: 128, minWidth: 124, cellStyle: codeStyle },
  { colId: 'ceo', headerName: '대표자', valueGetter: (p) => p.data?.entity?.ceo ?? null, valueFormatter: (p) => orDash(p.value), width: 82, minWidth: 80, cellStyle: flexCenter },
  { field: 'consultDate', headerName: '상담일자', width: 112, minWidth: 108, cellStyle: codeStyle },
  { field: 'consultKind', headerName: '상담구분', width: 92, minWidth: 92, cellStyle: flexCenter },
  { field: 'opinion', headerName: '상담의견', flex: 1, width: 200, minWidth: 200, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'manager', headerName: '담당자', width: 82, minWidth: 80, cellStyle: flexCenter, valueFormatter: (p) => orDash(p.value) },
];

type Tab = '행사정보' | '참가경영체';
const TABS: Tab[] = ['행사정보', '참가경영체'];

export function IrDetailModal({ ir, entities, onClose }: { ir: IrEvent; entities: readonly AgriEntity[]; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('행사정보');
  /* 중첩 경영체 상세 — 연 시점의 경영체 스냅샷 */
  const [entity, setEntity] = useState<AgriEntity | null>(null);
  const dlgRef = React.useRef<DialogHandle>(null);
  /* 상담일자 → 기업명 순(모델). id = entityId + 상담일자 + 순번(같은 경영체가 두 번 상담해도 유일) */
  const rows: PartGridRow[] = participantRows(ir, entities).map((r, i) => ({ ...r, id: `${r.entityId}-${r.consultDate}-${String(i)}` }));
  const openEntity = useCallback((r: PartGridRow) => { if (r.entity) setEntity(r.entity); }, []);
  /* 기업명 셀 Enter = 링크 클릭과 같은 동작 */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<PartGridRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || e.rowPinned || e.column.getColId() !== NAME_COL) return;
    ev.preventDefault();
    openEntity(e.data);
  }, [openEntity]);

  const exportParticipants = () => {
    const aoa: string[][] = [
      PART_HEAD,
      ...rows.map((r) => [xlText(r.name), xlText(r.entity?.bizNo), xlText(r.entity?.ceo), xlText(r.consultDate), xlText(r.consultKind), xlText(r.opinion), xlText(r.manager)]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = PART_HEAD.map((_, i) => ({ wch: i === 0 ? 24 : i === 5 ? 32 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '참가경영체');
    XLSX.writeFile(wb, `참가경영체_${safeFileName(ir.name)}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <>
      <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-[1020px] h-[720px] max-h-[88vh]" onInteractOutside={(e) => { if (entity) e.preventDefault(); }}>
          <DialogHeader className="px-[46px]">
            <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
              <DialogTitle className="shrink-0">IR 상세보기</DialogTitle>
              <DialogDescription className="m-0 text-caption truncate min-w-0">{ir.name}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-[46px]">
            <TabBar value={tab} onChange={(v) => setTab(v as Tab)} options={TABS} />
            {tab === '행사정보' && <KvGrid items={buildKv(ir)} />}
            {tab === '참가경영체' && (
              <div className="apfs-grid-min apfs-modal-grid" role="region" aria-label="참가경영체 — 상담일자·기업명 순. 기업명을 누르면 경영체 상세보기가 열린다">
                <AgGridReact<PartGridRow>
                  theme={apfsTheme}
                  rowData={rows}
                  columnDefs={PART_COLS}
                  getRowId={(p) => p.data.id}
                  domLayout="autoHeight"
                  defaultColDef={FIXED_ORDER_COL_DEF}
                  context={{ openEntity } satisfies GridCtx}
                  onCellKeyDown={onCellKeyDown}
                  overlayNoRowsTemplate={'<span style="padding:24px 0;color:var(--muted-foreground);font-size:13px">참가 경영체가 없습니다.</span>'}
                />
              </div>
            )}
          </div>
          <DialogFooter className="px-[46px]">
            <div />
            {/* 팝업 푸터 = [엑셀] · [닫기](apfs-spec-popup 푸터 규약) — 엑셀은 참가경영체 탭에서만 */}
            <div className="flex gap-2">
              {tab === '참가경영체' && rows.length > 0 && <Button variant="outline" size="sm" leadingIcon="download" onClick={exportParticipants}>엑셀</Button>}
              <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 중첩 — 부모 Dialog 의 형제로 마운트(골드 subfund_spec_modal FsDetailModal 과 같은 자리) */}
      {entity && <EntityDetailModal entity={entity} onClose={() => setEntity(null)} />}
    </>
  );
}
