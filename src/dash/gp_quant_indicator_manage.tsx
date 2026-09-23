/* 운용사 정량지표 관리 — 조기경보 > 자펀드정보 (원본 S2_70_운용사_정량지표_관리.html + 등록 S2_71 · 수정 S2_72 팝업).
   데이터 SSOT = risk_subfund_info_data.ts(QUANT_LIST · EDIT_DATA · MGR_TYPES · INDICATORS), 표 규약 = risk_grid.tsx.

   목업 → 우리 규약
   - 목록 = 운용사구분별 "사용중" 지표 평탄화 5행(원문 DATA 그대로) · 정상/주의/경고 칸은 칸별 고정 톤 배지(원문 `.tag ok/warn/bad`).
   - 검색박스 `운용사 유형`(전체 + 6종) → 상세필터 드로어, 운용사구분 컬럼으로 실제로 거른다. 원문 `조회` 버튼 없음(즉시 반영).
   - 원문 `등록` 버튼 → 툴바 독립 버튼 `운용사 정량지표 등록`(apfs-manage-page: 도메인 액션명 그대로, 상세필터 오른쪽·새로고침 왼쪽).
   - 원문 "행 클릭 → 그 운용사구분의 수정 팝업" → **행 더블클릭 · 행에서 Enter**(apfs-aggrid 수정 진입 규약). 행 선택(체크박스)은 두지 않는다 —
     선택으로 실행할 다건 액션이 원문에 없다(apfs-aggrid "선택이 액션을 만들 때만").
   - 등록/수정 팝업 = gp_quant_indicator_modal.tsx(원문 편집 그리드·행추가/행삭제).
   - 엑셀은 원문에 없지만 전 화면 공통 푸터 내보내기(apfs-grid 푸터 골드)로 목록을 내보낸다. KPI 배지 행 없음. */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { QUANT_LIST, MGR_TYPES } from './risk_subfund_info_data';
import { GpQuantIndicatorModal } from './gp_quant_indicator_modal';
import type { QuantModalMode } from './gp_quant_indicator_modal';

const { Button } = UI;
const LABEL = '운용사 정량지표 관리';
type Modal = null | { mode: QuantModalMode; type?: string };

export function GpQuantIndicatorManage({ onNav }: { onNav?: (r: string) => void }) {
  const [type, setType] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const rows = useMemo(() => QUANT_LIST.rows.filter((r) => !type || r.type === type), [type]);
  const onRowOpen = useCallback((r: Row) => setModal({ mode: 'edit', type: String(r.type) }), []);
  useHotkey(HOTKEYS.register.combo, () => setModal({ mode: 'create' }), { enabled: modal === null });

  const filters: FilterSpec[] = [{ label: '운용사 유형', kind: 'select', value: type, onChange: setType, options: MGR_TYPES }];
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: QUANT_LIST, rows }], null);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage group="자펀드정보" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={() => setType('')}
      actions={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ mode: 'create' })}>운용사 정량지표 등록</Button>}
      footerLeft={<span>{`총 ${String(rows.length)}건 · 행을 더블클릭(또는 Enter)하면 그 운용사구분의 정량지표를 수정합니다`}</span>}
      onExport={exportExcel} exportEnabled={modal === null}>
      <ReadGrid table={QUANT_LIST} rows={rows} onRowOpen={onRowOpen} ariaLabel={LABEL} />
      {modal && <GpQuantIndicatorModal mode={modal.mode} preType={modal.type} onClose={() => setModal(null)} />}
    </RiskPage>
  );
}
