/* 수탁보고 > 자펀드 수탁 업로드 2리프.
   - 실물자료관리(업로드) = S3_98 실물자료 조회(월별): 검색 5항목 + 실물자료 업로드 박스 + 14열 목록(체크박스 선택 → 수정·삭제)
   - 유가증권관리(업로드) = 신규(현행 목업 없음): 위 형제 화면 구조를 그대로 준용한 빈 화면(모든 컬럼 ⚠검토필요)

   목업 → 우리 규약
   - 검색박스 → 상세필터 드로어(항목·순서·기본값 원문). 운용사·조합은 원문 옵션이 없어(검토필요 마커 원문 이식) 조회 조건으로만,
     기준월·대분류·중분류는 행 값으로 **실제로 거른다**(대분류·중분류 옵션 '[B] 채권' → 행의 원문 코드 B).
   - 업로드 박스 → 카드 본문 상단 섹션(제목·`파일명 = 파일 선택` 캡션·[업로드] + 드롭존). 파일 처리·전송은 하지 않는다(브리프 규칙 5):
     파일 선택 없이 업로드 → 원문 토스트, 선택 후 업로드 → 원문 완료 토스트 + 선택 비움.
   - 목록바 [수정]·[삭제] → 행 선택 selbar(GridFrame contextActions, trust_manage_kit SelBar). 수정은 1건일 때만 →
     행 수정 모달(원문은 토스트뿐이지만 2026-09-23 관리형 규약 — 항목 = 목록 컬럼, ⚠검토필요) · 행 더블클릭/Enter 도 같은 모달.
     삭제는 선택 N건 확인 다이얼로그(기본 포커스 = 취소, 원문과 같다) → 선택 행 제거.
     ⚠ 원문 삭제는 존재하지 않는 `r.no` 로 거르는 버그가 있어 실제로 지워지지 않는다 — 버그는 옮기지 않고 선택 행 id 로 지운다.
   - 목록 헤더 `선택` 칸 = AG Grid 선택 컬럼(DS Checkbox) + 헤더 텍스트 '선택'(LABELED_SELECTION_COL — 전체선택 체크박스 옆). 원문 [조회]·[엑셀] 은 즉시 반영·푸터 내보내기(⌥D)로 대체.
   - 원문 스캐폴딩·설계메모는 옮기지 않는다. KPI 배지 행·카드뷰 없음. */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { ReviewMarker } from './review_marker';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid, SectionHead } from './risk_grid';
import { LABELED_SELECTION_COL } from './aggrid_selection';
import { exportTables } from './risk_excel';
import type { TableMeta, Row, ReviewNoteMeta } from './risk_table_meta';
import { UploadDropzone } from './trust_upload';
import { NewScreenNotice } from './trust_table_pages';
import { useRowSelection, SelBar, DeleteDialog, RowEditModal, formFromRow, rowPatch } from './trust_manage_kit';
import { PHYSICAL_FORM, TRUST_FORM_NOTE, displayCode } from './trust_manage_schemas';
import {
  PHYSICAL_TABLE, SECURITIES_TABLE, SECURITIES_NOTE, BIG_OPTIONS, MID_OPTIONS, optionCode,
  GP_NOTE, UNION_NOTE, GP_PLACEHOLDER, PHYSICAL_BASE_YM,
} from './trust_sub_data';

const { Button } = UI;

interface UploadPageConfig {
  label: string;
  table: TableMeta;
  /** 업로드 박스 제목(원문 `.uploadhd .t`) */
  uploadTitle: string;
  /** 업로드 박스 제목 옆 검토필요(신규 화면의 추정 제목) */
  uploadNote?: ReviewNoteMeta;
  /** 드롭존 접근名 */
  fileLabel: string;
  /** 삭제 확인 제목(원문 `실물자료 삭제`) */
  deleteTitle: string;
  /** 엔티티명 — 수정 모달 제목(`실물자료 수정`) */
  entity: string;
  baseYm: string;
  /** 신규 화면 안내(원천 목업 없음) */
  isNew?: boolean;
}

/** 원문 드롭존 보조 문구 — 형식·용량 */
const HINT = 'PDF, HWP, DOCX, XLSX, ZIP · 최대 20MB';

function UploadListPage({ cfg, onNav }: { cfg: UploadPageConfig; onNav?: (r: string) => void }) {
  const [rows, setRows] = useState<Row[]>(cfg.table.rows);
  const [files, setFiles] = useState<string[]>([]);
  const [gp, setGp] = useState('');
  const [union, setUnion] = useState('');
  const [ym, setYm] = useState(cfg.baseYm);
  const [big, setBig] = useState('');
  const [mid, setMid] = useState('');
  const { apiRef, selIds, onSelect, clear } = useRowSelection();
  const [modal, setModal] = useState<null | { kind: 'edit'; id: string } | { kind: 'delete' }>(null);

  const reset = () => { setGp(''); setUnion(''); setYm(cfg.baseYm); setBig(''); setMid(''); };
  const shown = useMemo(() => rows.filter((r) =>
    (!ym || r.ym === ym) && (!big || r.bigCode === optionCode(big)) && (!mid || r.midCode === optionCode(mid))), [rows, ym, big, mid]);

  const filters: FilterSpec[] = [
    { label: '운용사', kind: 'select', value: gp, onChange: setGp, options: [], allLabel: GP_PLACEHOLDER, note: GP_NOTE, noop: true },
    { label: '조합', kind: 'select', value: union, onChange: setUnion, options: [], note: UNION_NOTE, noop: true },
    { label: '기준월', kind: 'month', value: ym, onChange: setYm },
    { label: '대분류', kind: 'select', value: big, onChange: setBig, options: BIG_OPTIONS },
    { label: '중분류', kind: 'select', value: mid, onChange: setMid, options: MID_OPTIONS },
  ];

  const upload = () => {
    if (!files.length) { toast('업로드할 파일을 먼저 선택하세요'); return; }
    toast.success(`업로드되었습니다 (목업): ${files[0]}`);
    setFiles([]);
  };
  /* 행 더블클릭·Enter·선택 바 [수정] — 같은 모달(참조 안정: ReadGrid onRowOpen 계약) */
  const openEdit = useCallback((r: Row) => setModal({ kind: 'edit', id: r.id }), []);
  const editRow = modal?.kind === 'edit' ? rows.find((r) => r.id === modal.id) : undefined;
  const saveEdit = (vals: Record<string, string>) => {
    if (!editRow) return;
    const patch = rowPatch(cfg.table, vals);
    setRows((prev) => prev.map((r) => (r.id === editRow.id
      ? { ...r, ...patch, bigCode: displayCode(String(patch.big ?? '')), midCode: displayCode(String(patch.mid ?? '')) } : r)));
  };
  const remove = () => {
    const ids = new Set(selIds);
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    clear();
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const exportExcel = () => {
    exportTables(cfg.label, [{ name: cfg.label, table: cfg.table, rows: shown }], null);
    toast.success('Excel로 내보냈습니다');
  };

  const single = selIds.length === 1 ? rows.find((r) => r.id === selIds[0]) : undefined;
  const selActions = SelBar({
    count: selIds.length, onClear: clear, onDelete: () => setModal({ kind: 'delete' }),
    single: single && (
      <span className="inline-flex items-center gap-1">
        <Button variant="primary" size="sm" leadingIcon="file" onClick={() => openEdit(single)}>수정</Button>
        <ReviewMarker rec={TRUST_FORM_NOTE.rec} dat={TRUST_FORM_NOTE.dat} label="수정" />
      </span>
    ),
  });

  return (
    <RiskPage system="수탁보고" group="자펀드 수탁" label={cfg.label} route={cfg.label} onNav={onNav}
      filters={filters} onReset={reset} contextActions={selActions}
      footerLeft={<span>{`${ym ? `기준월 ${String(ym)} · ` : ''}총 ${String(shown.length)}건`}</span>}
      onExport={exportExcel} exportEnabled={!modal}>
      {cfg.isNew && <NewScreenNotice sibling="실물자료 조회(월별)(S3_98)" />}
      {/* 원문 `.uploadbox` — 제목 · 캡션 · [업로드] + 드롭존 */}
      <SectionHead title={cfg.uploadTitle}
        cap={<>{cfg.uploadNote && <ReviewMarker rec={cfg.uploadNote.rec} dat={cfg.uploadNote.dat} label={cfg.uploadTitle} />}파일명 = 파일 선택</>}
        actions={<Button variant="outline" size="sm" leadingIcon="upload" onClick={upload}>업로드</Button>} />
      <div style={{ padding: '0 18px 16px' }}>
        <UploadDropzone files={files} onChange={setFiles} hint={HINT} maxSize="20MB" label={cfg.fileLabel} removedMsg="선택 파일 제거됨" />
      </div>
      <ReadGrid table={cfg.table} rows={shown} ariaLabel={cfg.label} selectable onSelect={onSelect} selectedIds={selIds} selectionCol={LABELED_SELECTION_COL} apiRef={apiRef} onRowOpen={openEdit} />
      {modal?.kind === 'delete' && <DeleteDialog title={cfg.deleteTitle} count={selIds.length} onConfirm={remove} onClose={() => setModal(null)} />}
      {editRow && (
        <RowEditModal schema={PHYSICAL_FORM} mode="edit" title={`${cfg.entity} 수정`} initial={formFromRow(PHYSICAL_FORM, editRow)}
          onSave={saveEdit} onClose={() => setModal(null)} />
      )}
    </RiskPage>
  );
}

const PHYSICAL: UploadPageConfig = {
  label: '실물자료관리(업로드)', table: PHYSICAL_TABLE, uploadTitle: '실물자료 업로드', fileLabel: '실물자료 파일',
  deleteTitle: '실물자료 삭제', entity: '실물자료', baseYm: PHYSICAL_BASE_YM,
};
/* 신규 — 형제 S3_98 준용. 제목·삭제 문구는 형제의 '실물자료' 를 '유가증권' 으로 바꾼 추정이라 제목에 검토필요를 단다.
   기준월 기본값은 형제 화면의 데이터 시점이라 가져오지 않는다(빈 값). */
const SECURITIES: UploadPageConfig = {
  label: '유가증권관리(업로드)', table: SECURITIES_TABLE, uploadTitle: '유가증권 업로드', uploadNote: SECURITIES_NOTE,
  fileLabel: '유가증권 파일', deleteTitle: '유가증권 삭제', entity: '유가증권', baseYm: '', isNew: true,
};

/** 실물자료관리(업로드) — S3_98 */
export function PhysicalDataManage({ onNav }: { onNav?: (r: string) => void }) { return <UploadListPage cfg={PHYSICAL} onNav={onNav} />; }
/** 유가증권관리(업로드) — 신규(현행 목업 없음) */
export function SecuritiesManage({ onNav }: { onNav?: (r: string) => void }) { return <UploadListPage cfg={SECURITIES} onNav={onNav} />; }
