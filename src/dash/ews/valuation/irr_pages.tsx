/* 조기경보 > 가치평가 > IRR 3리프 — 목록(금액 단위 토글) + 셀 클릭 근거 팝업.
   - 투자기업별(계약별) IRR = S2_87 (합계행) + 근거 S2_88 (투자기업 셀)
   - 투자기업별 IRR         = S2_91 (합계행) + 근거 S2_92 (투자기업 셀)
   - 자펀드별 IRR           = S2_89          + 근거 S2_90 (자펀드 셀)
   세 화면이 같은 골격(검색 → 단위 → 표 1장 → 셀 팝업)이라 한 컴포넌트를 설정으로 나눠 쓴다.
   데이터는 risk_irr_data.ts(원문 파싱 실측) SSOT.

   목업 → 우리 규약
   - 검색박스(자펀드[·투자기업]·평가년월) → 상세필터 드로어. 자펀드·투자기업은 행 컬럼으로 **실제로 거른다**.
     평가년월은 평가 시점 스냅샷이라 숨은 행 속성 ym 의 **같은 값**으로 거른다(2026-11-16 사용자 지시 "미연동 필터
     전부 동작" — 종전엔 미연동). 원문 행은 평가년월 기본값(EVAL_BASE_YM), 직전 분기(PREV_YM) 평가분은 화면이 더미 행으로 덧붙인다
     (같은 자펀드·투자기업 — 평가년월만 바꿔도 행이 바뀌게). 기본 상태에선 더미 행이 걸러져 행 수·합계가 종전과 같다.
     그리드 컬럼은 늘리지 않는다. 원문 자펀드 select 에 '전체' 가 없는 화면(S2_87·S2_89)은 빈 선택지 없이 옮긴다.
   - 트리거 셀 단일 클릭 + 셀 Enter/Space → 근거 팝업(골드 fund_early_warning 자펀드수익률 셀과 같은 계약: 링크 모양 +
     external 아이콘 · ARIA 는 gridcell 에). 원문도 `.lnk-trig` 버튼 단일 클릭이다.
   - 팝업이 열린 동안 ⌥D 는 끈다(팝업은 자체 엑셀 버튼 — 배경 목록을 내려받지 않게).
   - 조회 전용 — 행 선택·KPI 배지 행·카드뷰 없음. `조회` 버튼 없음(즉시 반영). */
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from '../../ui/sonner';
import { DEFAULT_UNIT } from '../../schemas/unit';
import type { Unit } from '../../schemas/unit';
import { RiskPage } from '../../risk_page_kit';
import type { FilterSpec } from '../../risk_page_kit';
import { ReadGrid } from '../../risk_grid';
import { exportTables } from '../../risk_excel';
import { IrrBasisModal } from './irr_basis_modal';
import type { TableMeta, Row } from '../../risk_table_meta';
import { EVAL_BASE_YM } from './risk_valuation_data';
import type { IrrBasis } from './risk_irr_data';
import {
  IRR_CONTRACT, IRR_CONTRACT_BASIS, IRR_CONTRACT_FUNDS,
  IRR_INVESTEE, IRR_INVESTEE_BASIS, IRR_INVESTEE_FUNDS, IRR_INVESTEE_DEFAULT_FUND, IRR_INVESTEE_COMPANIES,
  IRR_FUND, IRR_FUND_BASIS, IRR_FUND_FUNDS,
} from './risk_irr_data';

/** 직전 분기 평가년월 — 더미 평가분의 시점 */
export const PREV_YM = '2025-09';

/** 평가년월 시드 — 원문 행 = 기본 평가년월, 더미 행 = 직전 분기. 데이터 모듈(risk_irr_data)은 근거 팝업도 써서 화면이 파생한다 */
const withYm = (t: TableMeta, prev: Row[]): Row[] =>
  [...t.rows.map((r) => ({ ...r, ym: EVAL_BASE_YM })), ...prev.map((r) => ({ ...r, ym: PREV_YM }))];

/** 검색조건 술어 — 자펀드·투자기업·평가년월(스냅샷 = 같은 값). 빈 값은 통과 */
export function irrRows(rows: readonly Row[], f: { fund: string; co: string; ym: string }): Row[] {
  return rows.filter((r) => (!f.fund || r.fund === f.fund) && (!f.co || r.co === f.co) && (!f.ym || r.ym === f.ym));
}

export interface IrrConfig {
  label: string;
  route: string;
  table: TableMeta;
  /** 화면 행 전체(원문 행 + 직전 분기 더미 행, 숨은 ym 시드) — table.rows 는 원문 그대로(열 폭 산정용) */
  rows: Row[];
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
  const rows = useMemo(() => irrRows(cfg.rows, { fund, co, ym }), [cfg.rows, fund, co, ym]);
  const onLink = useCallback(() => setOpen(true), []);

  const filters: FilterSpec[] = [
    { label: '자펀드', kind: 'select', value: fund, def: cfg.defaultFund, onChange: setFund, options: cfg.funds, allLabel: cfg.fundAll ? '전체' : null },
    ...(cfg.companies ? [{ label: '투자기업', kind: 'select' as const, value: co, onChange: setCo, options: cfg.companies }] : []),
    { label: '평가년월', kind: 'month', value: ym, def: EVAL_BASE_YM, onChange: setYm, allLabel: null },   // 스냅샷 — 비우면 두 분기가 섞인다
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

/* 직전 분기 더미 평가분 — 원문 행과 같은 운용사·자펀드·투자기업, 평가금액·IRR 만 그 시점 값. 표시 길이는 원문 이하(열 폭 불변) */
export const CONTRACT: IrrConfig = {
  label: '투자기업별(계약별) IRR', route: 'irr-by-contract', table: IRR_CONTRACT, basis: IRR_CONTRACT_BASIS,
  rows: withYm(IRR_CONTRACT, [{ ...IRR_CONTRACT.rows[0], id: 'irrc-prev-1', eval: 980044884, irr: '-1.12' }]),
  funds: IRR_CONTRACT_FUNDS, fundAll: false, defaultFund: IRR_CONTRACT_FUNDS[0],
};
export const INVESTEE: IrrConfig = {
  label: '투자기업별 IRR', route: 'irr-by-investee', table: IRR_INVESTEE, basis: IRR_INVESTEE_BASIS,
  rows: withYm(IRR_INVESTEE, [{ ...IRR_INVESTEE.rows[0], id: 'irri-prev-1', ev: 980044884, irr: -1.12 }]),
  funds: IRR_INVESTEE_FUNDS, fundAll: true, defaultFund: IRR_INVESTEE_DEFAULT_FUND, companies: IRR_INVESTEE_COMPANIES,
};
export const FUND: IrrConfig = {
  label: '자펀드별 IRR', route: 'irr-by-fund', table: IRR_FUND, basis: IRR_FUND_BASIS,
  rows: withYm(IRR_FUND, [{ ...IRR_FUND.rows[0], id: 'irrf-prev-1', recover: 5547282719, balance: 15312427939, nav: 14910548039, irr: '0.47' }]),
  funds: IRR_FUND_FUNDS, fundAll: false, defaultFund: IRR_FUND_FUNDS[0],
};

/** 투자기업별(계약별) IRR — S2_87 + 근거 S2_88 */
export function IrrByContract({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={CONTRACT} onNav={onNav} />; }
/** 투자기업별 IRR — S2_91 + 근거 S2_92 */
export function IrrByInvestee({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={INVESTEE} onNav={onNav} />; }
/** 자펀드별 IRR — S2_89 + 근거 S2_90 */
export function IrrBySubfund({ onNav }: { onNav?: (r: string) => void }) { return <IrrPage cfg={FUND} onNav={onNav} />; }
