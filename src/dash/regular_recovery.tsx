/* 정기보고회수내역(S1_29) — 정기보고(regular-report) 리프의 두 번째 탭 화면.
   출처: docs/mockups/01_투자자산관리/S1_29_정기보고회수내역.html · 표 선언 = regular_recovery_model.ts

   목업 → 우리 규약
   - 검색박스(모펀드·운용사·자펀드·계정구분·기준년월) → 상세필터 드로어. 모펀드·계정구분·기준년월은 행에 대응 칸이 없어
     조회 조건(`· 데이터 연동 후 적용`). 기준년월 기본값 = 원문 input value(2026-01). 원문 [조회] 는 즉시 반영이라 두지 않는다.
   - 금액 단위 토글(원/백만원/억원) — 원문 UNITS 자릿수(백만원 1 · 억원 2)를 표 unitDigits 로 싣는다.
   - 본문 인라인 소계(투자기업 단위) + pinned 합계 — ReadGrid opt-in `isSubtotal`·`sortable={false}`(정렬하면 소계가 흩어진다).
   - 운용사·자펀드 필터는 소계를 **그룹째** 거른다(그룹 안 거래가 하나도 안 남으면 소계도 뺀다). 원문 데이터는 전 행이
     한 운용사·자펀드라 부분 그룹이 생기지 않는다 — 소계를 재계산하지 않는 이유.
   - 엑셀 = 푸터 내보내기(⌥D) — 화면 표 그대로(소계·합계 포함). KPI·카드뷰·행 선택 없음(조회 전용). */
import { useMemo, useState } from 'react';
import { toast } from './ui/sonner';
import type { Unit } from './schemas/unit';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { LeafTabBody } from './leaf_tabs';
import type { LeafTabsSlot } from './leaf_tabs';
import { RECOVERY_TABLE, RECOVERY_GP, RECOVERY_FUND, isRecoverySubtotal, recoveryTxCount } from './regular_recovery_model';

export const RECOVERY_LABEL = '정기보고회수내역';
/** 원문 기준년월 input 기본값 */
const BASE_YM = '2026-01';

/** 운용사·자펀드 필터 — 거래 행만 판정하고, 소계는 앞선 거래가 하나라도 남은 그룹만 남긴다 */
function filterRows(rows: readonly Row[], gp: string, fund: string): Row[] {
  const out: Row[] = [];
  let pending: Row[] = [];
  for (const r of rows) {
    if (isRecoverySubtotal(r)) {
      if (pending.length) out.push(...pending, r);
      pending = [];
    } else if ((!gp || r.gp === gp) && (!fund || r.fund === fund)) {
      pending.push(r);
    }
  }
  return out;
}

export function RegularRecovery({ onNav, tabs }: { onNav?: (r: string) => void; tabs?: LeafTabsSlot }) {
  const [mf, setMf] = useState('');
  const [gp, setGp] = useState('');
  const [fund, setFund] = useState('');
  const [acc, setAcc] = useState('');
  const [ym, setYm] = useState(BASE_YM);
  const [unit, setUnit] = useState<Unit>('원');
  const reset = () => { setMf(''); setGp(''); setFund(''); setAcc(''); setYm(BASE_YM); setUnit('원'); };

  const rows = useMemo(() => filterRows(RECOVERY_TABLE.rows, gp, fund), [gp, fund]);

  const filters: FilterSpec[] = [
    { label: '모펀드', kind: 'select', value: mf, onChange: setMf, options: ['농식품모태펀드', 'MOAF'], noop: true },
    { label: '운용사', kind: 'select', value: gp, onChange: setGp, options: [RECOVERY_GP] },
    { label: '자펀드', kind: 'select', value: fund, onChange: setFund, options: [RECOVERY_FUND] },
    { label: '계정구분', kind: 'select', value: acc, onChange: setAcc, options: ['농식품', '수산'], noop: true },
    { label: '기준년월', kind: 'month', value: ym, onChange: setYm, noop: true, chip: ym !== BASE_YM },
  ];

  const exportExcel = () => {
    exportTables(`${tabs?.label ?? '정기보고'}_${RECOVERY_LABEL}`, [{ name: RECOVERY_LABEL, table: RECOVERY_TABLE, rows }], unit);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="투자자산관리" group="사후보고관리" label={tabs?.label ?? RECOVERY_LABEL} route={tabs?.route ?? 'regular-report'} onNav={onNav}
      filters={filters} onReset={reset} unit={unit} onUnit={setUnit}
      footerLeft={<span>기준년월 {String(ym || '-')} · 회수거래 총 {String(recoveryTxCount(rows))}건</span>}
      onExport={exportExcel}>
      <LeafTabBody slot={tabs}>
        <ReadGrid table={RECOVERY_TABLE} rows={rows} unit={unit} ariaLabel={RECOVERY_LABEL}
          isSubtotal={isRecoverySubtotal} sortable={false} />
      </LeafTabBody>
    </RiskPage>
  );
}
