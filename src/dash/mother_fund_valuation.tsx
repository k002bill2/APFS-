/* 모태펀드 가치평가 결과조회 — 조기경보 > 가치평가 (원본 S2_80_모태펀드_가치평가_결과조회.html).
   데이터 SSOT = risk_valuation_data.ts(MF_SUMMARY · MF_DETAIL), 표 규약 = risk_grid.tsx.

   목업 → 우리 규약
   - 타이틀 = 메뉴 리프 라벨 "모태펀드 가치평가 결과조회"(원문은 2026-09-03 지시로 "…결과관리" 로 바꿔 그렸으나 메뉴 정본이 우선).
   - 표 2장을 섹션으로 쌓는다: ① 농식품모태펀드 가치평가 결과(1행) ② 가치평가 상세내역(농식품모태펀드 결성총액/납입총액 2단 헤더).
   - ①의 미투자자산·기타자산·기타부채는 원문이 **입력칸**이다 → 셀 클릭 편집(숫자). 값을 바꾸면
     모태펀드 총운영성과 = 투자자산평가 + 기분배내역 + 미투자자산 + 기타자산 − 기타부채 를 즉시 다시 계산한다(원문 recomputeTotal).
     `저장` = 이 3개 입력값 저장(원문 설계메모 확정) — 백엔드가 없어 토스트만 띄운다(값은 화면에 유지).
   - 평가년월(원문 기본 2025-12)은 ② 상세의 평가년월 컬럼으로 행을 거른다. ①은 평가년월 단위 요약 1행이라 그대로 둔다.
   - 금액 단위 토글(원/백만원/억원) · 엑셀 = 표 2장 → 시트 2장. 원문 `조회` 버튼은 두지 않는다(즉시 반영). */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid, SectionHead } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { MF_SUMMARY, MF_SUMMARY_ROW, MF_DETAIL, EVAL_BASE_YM, mfTotal } from './risk_valuation_data';

const { Button } = UI;
const LABEL = '모태펀드 가치평가 결과조회';
type Inputs = { uninv: number; oa: number; ol: number };
const INIT: Inputs = { uninv: Number(MF_SUMMARY_ROW.uninv), oa: Number(MF_SUMMARY_ROW.oa), ol: Number(MF_SUMMARY_ROW.ol) };

export function MotherFundValuation({ onNav }: { onNav?: (r: string) => void }) {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [ym, setYm] = useState(EVAL_BASE_YM);
  const [inputs, setInputs] = useState<Inputs>(INIT);
  const reset = () => { setUnit(DEFAULT_UNIT); setYm(EVAL_BASE_YM); setInputs(INIT); };

  const summaryRows = useMemo<Row[]>(() => [{
    ...MF_SUMMARY_ROW, ...inputs,
    total: mfTotal({ aval: Number(MF_SUMMARY_ROW.aval), dist: Number(MF_SUMMARY_ROW.dist), ...inputs }),
  }], [inputs]);
  const detailRows = useMemo(() => MF_DETAIL.rows.filter((r) => !ym || r.ym === ym), [ym]);
  const onEdit = useCallback((_r: Row, key: string, value: number) => setInputs((p) => ({ ...p, [key]: value })), []);

  const filters: FilterSpec[] = [{ label: '평가년월', kind: 'month', value: ym, onChange: setYm }];
  const save = () => toast.success('미투자자산·기타자산·기타부채를 저장했습니다');
  const exportExcel = () => {
    exportTables(LABEL, [
      { name: MF_SUMMARY.title!, table: MF_SUMMARY, rows: summaryRows },
      { name: MF_DETAIL.title!, table: MF_DETAIL, rows: detailRows },
    ], unit);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage group="가치평가" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset} unit={unit} onUnit={setUnit}
      actions={<Button variant="outline" size="sm" leadingIcon="check" onClick={save}>저장</Button>}
      footerLeft={<span>{`${ym ? `평가년월 ${String(ym)} · ` : ''}가치평가 상세내역 ${String(detailRows.length)}건`}</span>}
      onExport={exportExcel}>
      <SectionHead title={MF_SUMMARY.title!} cap="미투자자산·기타자산·기타부채는 셀을 눌러 입력" />
      <ReadGrid table={MF_SUMMARY} rows={summaryRows} unit={unit} onEdit={onEdit} ariaLabel={MF_SUMMARY.title} />
      <SectionHead title={MF_DETAIL.title!} cap={<>총 {String(detailRows.length)}건</>} />
      <ReadGrid table={MF_DETAIL} rows={detailRows} unit={unit} ariaLabel={MF_DETAIL.title} />
    </RiskPage>
  );
}
