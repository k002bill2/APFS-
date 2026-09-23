/* 조기경보 > 가치평가 > IRR 3리프 — 목록(금액 단위 토글) + 셀 클릭 근거 팝업.
   - 투자기업별(계약별) IRR = S2_87 (합계행) + 근거 S2_88 (투자기업 셀)
   - 투자기업별 IRR         = S2_91 (합계행) + 근거 S2_92 (투자기업 셀)
   - 자펀드별 IRR           = S2_89          + 근거 S2_90 (자펀드 셀) · ⚠검토필요 헤더 2건(미투자자산·IRR)
   세 화면이 같은 골격(검색 → 단위 → 표 1장 → 셀 팝업)이라 한 컴포넌트를 설정으로 나눠 쓴다.
   데이터는 risk_irr_data.ts(원문 파싱 실측) SSOT.

   목업 → 우리 규약
   - 검색박스(자펀드[·투자기업]·평가년월) → 상세필터 드로어. 자펀드·투자기업은 행 컬럼으로 **실제로 거른다**.
     평가년월은 행에 대응 컬럼이 없어 `· 데이터 연동 후 적용`(조회 기준 컨텍스트 — 푸터 캡션·칩에만 싣는다).
     원문 자펀드 select 에 '전체' 가 없는 화면(S2_87·S2_89)은 빈 선택지 없이 옮긴다.
   - 트리거 셀 단일 클릭 + 셀 Enter/Space → 근거 팝업(골드 fund_early_warning 자펀드수익률 셀과 같은 계약: 링크 모양 +
     external 아이콘 · ARIA 는 gridcell 에). 원문도 `.lnk-trig` 버튼 단일 클릭이다.
   - 팝업이 열린 동안 ⌥D 는 끈다(팝업은 자체 엑셀 버튼 — 배경 목록을 내려받지 않게).
   - 조회 전용 — 행 선택·KPI 배지 행·카드뷰 없음. `조회` 버튼 없음(즉시 반영). */
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from './ui/sonner';
import { DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import { IrrBasisModal } from './irr_basis_modal';
import type { TableMeta } from './risk_table_meta';
import { EVAL_BASE_YM } from './risk_valuation_data';
import type { IrrBasis } from './risk_irr_data';
import {
  IRR_CONTRACT, IRR_CONTRACT_BASIS, IRR_CONTRACT_FUNDS,
  IRR_INVESTEE, IRR_INVESTEE_BASIS, IRR_INVESTEE_FUNDS, IRR_INVESTEE_DEFAULT_FUND, IRR_INVESTEE_COMPANIES,
  IRR_FUND, IRR_FUND_BASIS, IRR_FUND_FUNDS,
} from './risk_irr_data';

interface IrrConfig {
  label: string;
  route: string;
  table: TableMeta;
  basis: IrrBasis;
  funds: readonly string[];
  /** 원문 자펀드 select 에 '전체' 가 있는가 */
  fundAll: boolean;
  defaultFund: string;
  /** 투자기업 검색조건(S2_91 만) */
  companies?: readonly string[];
}

function IrrPage({ cfg, onNav }: { cfg: IrrConfig; onNav?: (r: string) => void }) {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [fund, setFund] = useState(cfg.defaultFund);
  const [co, setCo] = useState('');
  const [ym, setYm] = useState(EVAL_BASE_YM);
  const [open, setOpen] = useState(false);

  const reset = () => { setUnit(DEFAULT_UNIT); setFund(cfg.defaultFund); setCo(''); setYm(EVAL_BASE_YM); };
  const rows = useMemo(
    () => cfg.table.rows.filter((r) => (!fund || r.fund === fund) && (!co || r.co === co)),
    [cfg.table, fund, co],
  );
  const onLink = useCallback(() => setOpen(true), []);

  const filters: FilterSpec[] = [
    { label: '자펀드', kind: 'select', value: fund, onChange: setFund, options: cfg.funds, allLabel: cfg.fundAll ? '전체' : null },
    ...(cfg.companies ? [{ label: '투자기업', kind: 'select' as const, value: co, onChange: setCo, options: cfg.companies }] : []),
    { label: '평가년월', kind: 'month', value: ym, onChange: setYm, noop: true },
  ];

  const exportExcel = () => {
    exportTables(cfg.label, [{ name: cfg.label, table: cfg.table, rows }], unit);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage group="가치평가" label={cfg.label} route={cfg.route} onNav={onNav}
      filters={filters} onReset={reset} unit={unit} onUnit={setUnit}
      footerLeft={<span>{`${ym ? `평가년월 ${String(ym)} · ` : ''}총 ${String(rows.length)}건`}</span>}
      onExport={exportExcel} exportEnabled={!open}>
      <ReadGrid table={cfg.table} rows={rows} unit={unit} onLink={onLink} linkLabel={cfg.basis.title} ariaLabel={cfg.label} />
      {open && <IrrBasisModal basis={cfg.basis} onClose={() => setOpen(false)} />}
    </RiskPage>
  );
}

const CONTRACT: IrrConfig = {
  label: '투자기업별(계약별) IRR', route: '투자기업별(계약별) IRR', table: IRR_CONTRACT, basis: IRR_CONTRACT_BASIS,
  funds: IRR_CONTRACT_FUNDS, fundAll: false, defaultFund: IRR_CONTRACT_FUNDS[0],
};
const INVESTEE: IrrConfig = {
  label: '투자기업별 IRR', route: '투자기업별 IRR', table: IRR_INVESTEE, basis: IRR_INVESTEE_BASIS,
  funds: IRR_INVESTEE_FUNDS, fundAll: true, defaultFund: IRR_INVESTEE_DEFAULT_FUND, companies: IRR_INVESTEE_COMPANIES,
};
const FUND: IrrConfig = {
  label: '자펀드별 IRR', route: '자펀드별 IRR', table: IRR_FUND, basis: IRR_FUND_BASIS,
  funds: IRR_FUND_FUNDS, fundAll: false, defaultFund: IRR_FUND_FUNDS[0],
};

/** 투자기업별(계약별) IRR — S2_87 + 근거 S2_88 */
export function IrrByContract({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={CONTRACT} onNav={onNav} />; }
/** 투자기업별 IRR — S2_91 + 근거 S2_92 */
export function IrrByInvestee({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={INVESTEE} onNav={onNav} />; }
/** 자펀드별 IRR — S2_89 + 근거 S2_90 */
export function IrrBySubfund({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={FUND} onNav={onNav} />; }
