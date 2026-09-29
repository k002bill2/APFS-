/* 자펀드 보고 > 실물검증 > 조합별 실물검증 결과 보고 — S5_120 실물검증 조회(MOAF REPORT System).
   조회 전용 · 한 검색조건으로 표 3장 → 여러 표 세로 쌓기(apfs-multi-grid, 공용 골격 TablesPage).
   - 검색조건: 자펀드(select, 원문 옵션 1개 · 전체 없음) · 기준년월(month). 행에 대응 키가 없어 `· 데이터 연동 후 적용`.
     원문 `조회` 버튼은 두지 않는다(즉시 반영 — 툴바 새로고침이 조회).
   - 원문 목록바의 금액단위 seg(원/백만원/억원) → 툴바 단위 토글, 원문 `엑셀` 버튼 → 푸터 내보내기(표 3장 → 시트 3장).
   - 원문 목록바 캡션 `실물검증 결과 YYYY-MM 기준` → 푸터 `기준년월 YYYY-MM · 표별 건수`(TablesPage).
   - 데이터 SSOT: gp_verify_report_data.ts */
import { TablesPage } from './risk_tables_page';
import type { TablesPageConfig } from './risk_tables_page';
import { GP_VERIFY_TABLES, GP_VERIFY_FUND, GP_VERIFY_BASE_YM } from './gp_verify_report_data';

type P = { onNav?: (r: string) => void };

export const GP_VERIFY_ROUTE = '조합별 실물검증 결과 보고';

export const GP_VERIFY_CONFIG: TablesPageConfig = {
  system: '자펀드 보고', group: '실물검증', label: GP_VERIFY_ROUTE, route: GP_VERIFY_ROUTE,
  tables: GP_VERIFY_TABLES, unit: true,
  filters: [
    { label: '자펀드', kind: 'select', def: GP_VERIFY_FUND, options: [GP_VERIFY_FUND], allLabel: null },
    { label: '기준년월', kind: 'month', def: GP_VERIFY_BASE_YM },
  ],
};

/** 조합별 실물검증 결과 보고 — S5_120 */
export function GpVerifyReport({ onNav }: P) { return <TablesPage cfg={GP_VERIFY_CONFIG} onNav={onNav} />; }
