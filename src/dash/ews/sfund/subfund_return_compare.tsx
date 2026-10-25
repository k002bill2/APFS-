/* 조기경보 > 자펀드정보 > 자펀드 수익률정보 비교 조회(S2_77) — 공용 골격 TablesPage(risk_tables_page.tsx) 설정.
   표 1장 + 합계, 검색조건 기준년월(ym). 데이터는 risk_subfund_info_data.ts SSOT.
   가치평가 표 조회 5리프는 ews/valuation/valuation_table_pages.tsx. */
import React from 'react';
import { TablesPage } from '../../risk_tables_page';
import type { TablesPageConfig } from '../../risk_tables_page';
import { RETURN_TABLE, RETURN_BASE_YM } from './risk_subfund_info_data';

type P = { onNav?: (r: string) => void };

const RETURN: TablesPageConfig = {
  group: '자펀드정보', label: '자펀드 수익률정보 비교 조회', route: 'subfund-return-compare',
  tables: [RETURN_TABLE], unit: true,
  filters: [{ label: '기준년월', kind: 'month', def: RETURN_BASE_YM, key: 'ym' }],
};

/** 자펀드 수익률정보 비교 조회 — S2_77 */
export function SubfundReturnCompare({ onNav }: P) { return <TablesPage cfg={RETURN} onNav={onNav} />; }
