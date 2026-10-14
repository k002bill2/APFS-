import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
import { schema as sAnnualInvestStatus } from '../brief/mfund/annual_invest_status';
import { schema as sGpMonthlyReportStatus } from '../sfund/fxtmrpt/gp_monthly_report_status';
import { schema as sSubfundNoticeManage } from '../ffms/mfund/subfund_notice_manage';
import { schema as sInvesteeProfileSchema } from '../ffms/ent/investee_profile_schema';
import { schema as sPostMgmtRecord } from '../ffms/gp/post_mgmt_record';
import { schema as sPortfolioPerformance } from '../dashboard/portfolio_performance';
import { schema as sInvesteeEmployment } from '../ffms/ent/investee_employment';
import { schema as sInvestPerformanceAll } from '../ffms/ent/invest_performance_all';
import { schema as sInvesteeInvestStatsSchema } from '../ffms/ent/investee_invest_stats_schema';
import { schema as sInvestRecoveryDetailSchema } from '../ffms/ent/invest_recovery_detail_schema';
import { schema as sGpFinancial } from '../ffms/gp/gp_financial';
import { schema as sInvestDueDiligence } from '../ffms/gp/invest_due_diligence';
import { schema as sMgmtFee } from '../ffms/gp/mgmt_fee';
import { schema as sAllReportStatusSchema } from '../ffms/gp/all_report_status_schema';
// 2026-09-15 결선: DEFAULT_SCHEMA(영문 제네릭 5컬럼)로 떨어지던 3개 공백
import { schema as sInvesteeSpec } from '../ffms/ent/investee_spec';
import { schema as sTopInvesteeManage } from '../ffms/ent/top_investee_manage';
import { schema as sGpSpec } from '../ffms/gp/gp_spec';
// 2026-09-23 조기경보 17리프 목업 이식 중 단일 헤더·flat 2리프(나머지 15리프는 typed 페이지 — app.tsx 분기)
import { schema as sGpFinancialCompare } from '../risk/sfund/gp_financial_compare';
import { schema as sValuationDataCheck } from '../risk/valuation/valuation_data_check';
// 2026-09-24 사후보고관리 신규(현행 없음) 2리프 — 원천 목업 없음, provenance NEW · 행 0건
import { schema as sReviewCommitteeManage } from '../ffms/report/review_committee_manage';
import { schema as sChecklistManage } from '../ffms/report/checklist_manage';
// 2026-09-29 자펀드 보고 개편 — S5_119(조합별 반기보고 현황). S5_117(조합 수시보고 내역)은 2026-10-14 메뉴·화면 삭제
import { schema as sGpHalfyearReportStatus } from '../sfund/fxtmrpt/gp_halfyear_report_status';

const ALL: PageSchema[] = [
  sAnnualInvestStatus, sGpMonthlyReportStatus, sSubfundNoticeManage, sInvesteeProfileSchema, sPostMgmtRecord, sPortfolioPerformance,
  sInvesteeEmployment,
  sInvestPerformanceAll, sInvesteeInvestStatsSchema, sInvestRecoveryDetailSchema,
  sGpFinancial, sInvestDueDiligence, sMgmtFee, sAllReportStatusSchema,
  sInvesteeSpec, sTopInvesteeManage, sGpSpec,
  sGpFinancialCompare, sValuationDataCheck,
  sReviewCommitteeManage, sChecklistManage,
  sGpHalfyearReportStatus,
];

export function buildRegistry(list: PageSchema[]): Record<string, PageSchema> {
  const m: Record<string, PageSchema> = {};
  for (const s of list) {
    if (m[s.route]) throw new Error(`Duplicate schema route: ${s.route}`);
    m[s.route] = s;
  }
  return m;
}

// 레지스트리 전수 불변식 테스트용 노출(런타임 소비처 없음 — resolveSchema가 정상 경로다)
export const ALL_SCHEMAS: readonly PageSchema[] = ALL;

const REGISTRY = buildRegistry(ALL);

export function resolveSchema(route: string): PageSchema {
  return REGISTRY[route] ?? DEFAULT_SCHEMA(route);
}
