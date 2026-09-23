/* 투자자산관리 — 원문 화면 2개를 가진 메뉴 리프 3개의 탭 묶음(leaf_tabs.tsx 부품 사용). app.tsx 가 이 컴포넌트로 분기한다.

   | 리프(route)                    | 탭 1(원문)                          | 탭 2(원문)                                   |
   |--------------------------------|-------------------------------------|----------------------------------------------|
   | 수시보고 확인(occasional-report) | 수시보고 S1_04(OccasionalReportManage) | 일일보고 조회 S5_117(DailyReportView)        |
   | 정기보고(regular-report)        | 정기보고 S1_06(RegularReportManage)   | 정기보고회수내역 S1_29(RegularRecovery)      |
   | 자펀드 수탁관리(custody-verify)  | 실물검증 S1_26(CustodyVerifyManage)   | 확정 S1_27(CustodyConfirmManage)             |

   탭 라벨 = 원문 h1(선례 report_bucheo). 자펀드 수탁관리만 브리프 지정 라벨(실물검증 | 확정) — 원문도 서브탭으로 오간다.
   딥링크: 옛 route `custody-confirm`(별칭 '자펀드수탁관리(확정)')·`정기보고회수내역` 은 같은 리프를 **두 번째 탭으로** 연다(app.tsx). */
import { useLeafTabs } from './leaf_tabs';
import type { LeafTab } from './leaf_tabs';
import { OccasionalReportManage } from './occasional_report_manage';
import { DailyReportView } from './daily_report_view';
import { RegularReportManage } from './regular_report_manage';
import { RegularRecovery } from './regular_recovery';
import { CustodyVerifyManage } from './custody_verify_manage';
import { CustodyConfirmManage } from './custody_confirm_manage';

type Nav = { onNav?: (r: string) => void };

const OCC_TABS: readonly LeafTab<'occ' | 'daily'>[] = [{ id: 'occ', label: '수시보고' }, { id: 'daily', label: '일일보고 조회' }];
const OCC_CRUMBS = ['홈', '투자자산관리', '사후보고관리', '수시보고 확인'];

export function OccasionalReportLeaf({ onNav, initial = 'occ' }: Nav & { initial?: 'occ' | 'daily' }) {
  const { tab, slot } = useLeafTabs({ tabs: OCC_TABS, initial, idBase: 'occasional-report', label: '수시보고 확인', crumbs: OCC_CRUMBS, route: 'occasional-report' });
  return tab === 'occ' ? <OccasionalReportManage onNav={onNav} tabs={slot} /> : <DailyReportView onNav={onNav} tabs={slot} />;
}

const REG_TABS: readonly LeafTab<'regular' | 'recovery'>[] = [{ id: 'regular', label: '정기보고' }, { id: 'recovery', label: '정기보고회수내역' }];
const REG_CRUMBS = ['홈', '투자자산관리', '사후보고관리', '정기보고'];

export function RegularReportLeaf({ onNav, initial = 'regular' }: Nav & { initial?: 'regular' | 'recovery' }) {
  const { tab, slot } = useLeafTabs({ tabs: REG_TABS, initial, idBase: 'regular-report', label: '정기보고', crumbs: REG_CRUMBS, route: 'regular-report' });
  return tab === 'regular' ? <RegularReportManage onNav={onNav} tabs={slot} /> : <RegularRecovery onNav={onNav} tabs={slot} />;
}

const CUSTODY_TABS: readonly LeafTab<'verify' | 'confirm'>[] = [{ id: 'verify', label: '실물검증' }, { id: 'confirm', label: '확정' }];
const CUSTODY_CRUMBS = ['홈', '투자자산관리', '자펀드 관리', '자펀드 수탁관리'];

export function CustodyLeaf({ onNav, initial = 'verify' }: Nav & { initial?: 'verify' | 'confirm' }) {
  const { tab, slot } = useLeafTabs({ tabs: CUSTODY_TABS, initial, idBase: 'custody', label: '자펀드 수탁관리', crumbs: CUSTODY_CRUMBS, route: 'custody-verify' });
  return tab === 'verify' ? <CustodyVerifyManage onNav={onNav} tabs={slot} /> : <CustodyConfirmManage onNav={onNav} tabs={slot} />;
}
