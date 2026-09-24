/* 투자자산관리 — 원문 화면 2개를 가진 메뉴 리프의 탭 묶음(leaf_tabs.tsx 부품 사용). app.tsx 가 이 컴포넌트로 분기한다.

   | 리프(route)                    | 탭 1(원문)                          | 탭 2(원문)                                   |
   |--------------------------------|-------------------------------------|----------------------------------------------|
   | 수시보고 확인(occasional-report) | 수시보고 S1_04(OccasionalReportManage) | 일일보고 조회 S5_117(DailyReportView)        |
   | 자펀드 수탁관리(custody-verify)  | 실물검증 S1_26(CustodyVerifyManage)   | 확정 S1_27(CustodyConfirmManage)             |

   탭 라벨 = 원문 h1(선례 report_bucheo). 자펀드 수탁관리만 브리프 지정 라벨(실물검증 | 확정) — 원문도 서브탭으로 오간다.
   딥링크: 옛 route `custody-confirm`(별칭 '자펀드수탁관리(확정)')은 같은 리프를 **두 번째 탭으로** 연다(app.tsx).
   정기보고(regular-report)는 회수내역(S1_29) 탭을 삭제해(2026-09-24 사용자 결정) 탭 없는 단일 화면이다 — app.tsx 가 직접 분기. */
import { useLeafTabs } from './leaf_tabs';
import type { LeafTab } from './leaf_tabs';
import { OccasionalReportManage } from './occasional_report_manage';
import { DailyReportView } from './daily_report_view';
import { CustodyVerifyManage } from './custody_verify_manage';
import { CustodyConfirmManage } from './custody_confirm_manage';

type Nav = { onNav?: (r: string) => void };

const OCC_TABS: readonly LeafTab<'occ' | 'daily'>[] = [{ id: 'occ', label: '수시보고' }, { id: 'daily', label: '일일보고 조회' }];
const OCC_CRUMBS = ['홈', '투자자산관리', '사후보고관리', '수시보고 확인'];

export function OccasionalReportLeaf({ onNav, initial = 'occ' }: Nav & { initial?: 'occ' | 'daily' }) {
  const { tab, slot } = useLeafTabs({ tabs: OCC_TABS, initial, idBase: 'occasional-report', label: '수시보고 확인', crumbs: OCC_CRUMBS, route: 'occasional-report' });
  return tab === 'occ' ? <OccasionalReportManage onNav={onNav} tabs={slot} /> : <DailyReportView onNav={onNav} tabs={slot} />;
}

const CUSTODY_TABS: readonly LeafTab<'verify' | 'confirm'>[] = [{ id: 'verify', label: '실물검증' }, { id: 'confirm', label: '확정' }];
const CUSTODY_CRUMBS = ['홈', '투자자산관리', '자펀드 관리', '자펀드 수탁관리'];

export function CustodyLeaf({ onNav, initial = 'verify' }: Nav & { initial?: 'verify' | 'confirm' }) {
  const { tab, slot } = useLeafTabs({ tabs: CUSTODY_TABS, initial, idBase: 'custody', label: '자펀드 수탁관리', crumbs: CUSTODY_CRUMBS, route: 'custody-verify' });
  return tab === 'verify' ? <CustodyVerifyManage onNav={onNav} tabs={slot} /> : <CustodyConfirmManage onNav={onNav} tabs={slot} />;
}
