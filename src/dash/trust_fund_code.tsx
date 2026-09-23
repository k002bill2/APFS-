/* 수탁보고 > 자펀드 수탁 > 자펀드코드 조회 — 원문 S3_99 조합코드 관리(편집형 목록).
   카드 제목·브레드크럼은 메뉴 리프 라벨(자펀드코드 조회)이다 — 원문 h1(조합코드 관리)이 아니다(apfs-grid 타이틀 규약).

   목업 → 우리 규약
   - 검색박스 수탁기관(옵션 1개 농협중앙회, '전체' 없음) → 상세필터 드로어. 행에 수탁기관 칸이 없어 조회 조건으로만.
   - 목록 5열: NO · 조합이름 · 수탁기관조합코드 · 자조합수탁/모태수탁(Y/N 배지). 원문 DATA 4행 그대로
     (원문 주석 "1행은 원본 실데이터, 이하 데모 행" — 원문에 있는 행이라 개수를 바꾸지 않는다).
   - 원문은 **셀 안 입력칸·체크박스 + 목록바 [저장]** 인 편집형 표다. 그 배치는 옮기지 않는다(2026-09-23 사용자 결정 —
     관리형 선택 바 규약): 체크박스 선택 → 선택 바 [수정](1건) → 수정 모달(원문 편집 칸 4개 그대로) · [삭제] · [선택 해제].
     행 더블클릭/Enter 도 같은 모달. 셀은 표시 전용이다. 원문 [저장]은 모달 저장이 대신해 두지 않는다.
   - 원문 [조회] 는 즉시 반영이라 두지 않는다. 엑셀은 푸터 내보내기(⌥D). */
import React, { useCallback, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { FUND_CODE_TABLE, FUND_CODE_ORGS } from './trust_sub_data';
import { useRowSelection, SelBar, DeleteDialog, RowEditModal, formFromRow, rowPatch } from './trust_manage_kit';
import { FUND_CODE_FORM } from './trust_manage_schemas';

const { Button } = UI;
const LABEL = '자펀드코드 조회';

export function TrustFundCode({ onNav }: { onNav?: (r: string) => void }) {
  const [rows, setRows] = useState<Row[]>(FUND_CODE_TABLE.rows);
  const [org, setOrg] = useState<string>(FUND_CODE_ORGS[0]);
  const { apiRef, selIds, onSelect, clear } = useRowSelection();
  const [modal, setModal] = useState<null | { kind: 'edit'; id: string } | { kind: 'delete' }>(null);

  const filters: FilterSpec[] = [
    { label: '수탁기관', kind: 'select', value: org, onChange: setOrg, options: FUND_CODE_ORGS, allLabel: null, noop: true },
  ];
  const reset = () => setOrg(FUND_CODE_ORGS[0]);

  const openEdit = useCallback((r: Row) => setModal({ kind: 'edit', id: r.id }), []);
  const editRow = modal?.kind === 'edit' ? rows.find((r) => r.id === modal.id) : undefined;
  /* 불변 갱신 — 원문 DATA 배열을 건드리지 않는다 */
  const saveEdit = (vals: Record<string, string>) => {
    if (!editRow) return;
    const patch = rowPatch(FUND_CODE_TABLE, vals);
    setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r)));
  };
  const remove = () => {
    const ids = new Set(selIds);
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    clear();
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: FUND_CODE_TABLE, rows }], null);
    toast.success('Excel로 내보냈습니다');
  };

  const single = selIds.length === 1 ? rows.find((r) => r.id === selIds[0]) : undefined;
  const selActions = SelBar({
    count: selIds.length, onClear: clear, onDelete: () => setModal({ kind: 'delete' }),
    single: single && (
      <span className="inline-flex items-center gap-1">
        <Button variant="primary" size="sm" leadingIcon="file" onClick={() => openEdit(single)}>수정</Button>
      </span>
    ),
  });

  return (
    <RiskPage system="수탁보고" group="자펀드 수탁" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset} contextActions={selActions}
      footerLeft={<span>수탁기관 {org} · 총 {String(rows.length)}건</span>}
      onExport={exportExcel} exportEnabled={!modal}>
      <ReadGrid table={FUND_CODE_TABLE} rows={rows} ariaLabel={LABEL} selectable onSelect={onSelect} selectedIds={selIds} apiRef={apiRef} onRowOpen={openEdit} />
      {modal?.kind === 'delete' && <DeleteDialog title="자펀드코드 삭제" count={selIds.length} onConfirm={remove} onClose={() => setModal(null)} />}
      {editRow && (
        <RowEditModal schema={FUND_CODE_FORM} mode="edit" title="자펀드코드 수정" initial={formFromRow(FUND_CODE_FORM, editRow)}
          onSave={saveEdit} onClose={() => setModal(null)} />
      )}
    </RiskPage>
  );
}
