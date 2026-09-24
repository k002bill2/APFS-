/* 자펀드정보관리 — 투자자산관리 > 조합관리 (원본 S2_73_자펀드_정보_관리.html + 등록 S2_74 · 수정 S2_75 팝업).
   데이터 SSOT = asset_fund_info_data.ts, 표 규약 = risk_grid.tsx(ReadGrid), 바깥 양식 = risk_page_kit.tsx(RiskPage).

   목업 → 우리 규약
   - 목록 = 원문 2단 헤더 17열(투자기간 시작/종료 · 투자비율(%) 1~4년차) + 원문 DATA 1행 그대로. 공동GP여부 = 원문 `.tag` 배지.
   - 검색박스 `구분`(운용사/자펀드, 기본 운용사, '전체' 없음) + `운용사/자펀드`(원문 LISTS[구분], 전체 +) → 상세필터 드로어.
     구분을 바꾸면 대상 선택지가 바뀌고 선택이 풀린다(원문 fillTarget). 대상은 운용사=gp · 자펀드=fn 컬럼으로 실제로 거른다.
     원문 `조회` 버튼 없음(즉시 반영).
   - 원문 `등록` 버튼 → 툴바 독립 버튼 `자펀드 정보 등록`(apfs-manage-page: 도메인 액션명, 상세필터 오른쪽·새로고침 왼쪽).
   - 원문 "행 클릭 → 수정 팝업" → **행 더블클릭 · 행에서 Enter**(apfs-aggrid 수정 진입 규약). 행 선택(체크박스)은 두지 않는다 —
     선택으로 실행할 다건 액션이 원문에 없다.
   - 엑셀 = 공통 푸터 내보내기(원문 `엑셀` 버튼 → apfs-grid 푸터 골드). KPI 배지 행 없음(apfs-manage-page HITL 기본 '미포함'). */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { FUND_INFO_TABLE, FUND_INFO_KINDS, FUND_INFO_LISTS, FUND_INFO_KEY } from './asset_fund_info_data';
import type { FundInfoKind } from './asset_fund_info_data';
import { AssetFundInfoModal } from './asset_fund_info_modal';
import type { FundInfoModalMode } from './asset_fund_info_modal';

const { Button } = UI;
const LABEL = '자펀드정보관리';
const DEFAULT_KIND: FundInfoKind = '운용사';
type Modal = null | { mode: FundInfoModalMode; row?: Row };

export function AssetFundInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  const [kind, setKind] = useState<FundInfoKind>(DEFAULT_KIND);
  const [target, setTarget] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const rows = useMemo(() => FUND_INFO_TABLE.rows.filter((r) => !target || r[FUND_INFO_KEY[kind]] === target), [kind, target]);
  const onRowOpen = useCallback((r: Row) => setModal({ mode: 'edit', row: r }), []);
  useHotkey(HOTKEYS.register.combo, () => setModal({ mode: 'create' }), { enabled: modal === null });

  const reset = () => { setKind(DEFAULT_KIND); setTarget(''); };
  const filters: FilterSpec[] = [
    /* 원문 구분 select — 빈 선택지('전체') 없음 */
    { label: '구분', kind: 'select', value: kind, options: FUND_INFO_KINDS, allLabel: null,
      onChange: (v) => { setKind(v as FundInfoKind); setTarget(''); } },
    { label: '운용사/자펀드', kind: 'select', value: target, onChange: setTarget, options: FUND_INFO_LISTS[kind] },
  ];
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: FUND_INFO_TABLE, rows }], null);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="투자자산관리" group="조합관리" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      actions={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ mode: 'create' })}>자펀드 정보 등록</Button>}
      footerLeft={<span>{`총 ${String(rows.length)}건 · 행을 더블클릭(또는 Enter)하면 자펀드 정보를 수정합니다`}</span>}
      onExport={exportExcel} exportEnabled={modal === null}>
      <ReadGrid table={FUND_INFO_TABLE} rows={rows} onRowOpen={onRowOpen} ariaLabel={LABEL} />
      {modal && <AssetFundInfoModal mode={modal.mode} row={modal.row} onClose={() => setModal(null)} />}
    </RiskPage>
  );
}
