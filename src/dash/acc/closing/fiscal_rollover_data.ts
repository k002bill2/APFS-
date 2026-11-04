/* 회기생성/전기이월(ACC-016) — 더미 회기 이력. 계정구분은 일반전표와 같은 목록(FUND_ACCOUNTS)을 쓴다.
   연도는 오늘 기준 상대값(해가 바뀌어도 기본 기준년도 = 당해년도 화면이 비지 않게 — demoJournals(today) 관용구).
   - 기금 계정: 1기·2기 마감('여') + 당해 3기 진행 중('부', 미결재 0건 → [연마감] 가능)
   - 투자조합 계정: 1기(전년 3월 결성) 마감 + 당해 2기 진행 중(미결재 전표 3건 → [연마감] 막힘, [연마감(미결재포함)] 가능)
   - 수산 모태계정: 회기 없음 → [회기 생성] 데모 */
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { fiscalId } from './fiscal_rollover_model';
import type { FiscalRow } from './fiscal_rollover_model';

export { FUND_ACCOUNTS };

type Seed = [account: string, term: number, closeStart: string, closed: '부' | '여', unapproved: number];

export function demoFiscalRows(today: string): FiscalRow[] {
  const y = Number(today.slice(0, 4));
  const [fund, invest] = FUND_ACCOUNTS;
  const seeds: Seed[] = [
    [fund, 1, `${String(y - 2)}-01-01`, '여', 0],
    [fund, 2, `${String(y - 1)}-01-01`, '여', 0],
    [fund, 3, `${String(y)}-01-01`, '부', 0],
    [invest, 1, `${String(y - 1)}-03-15`, '여', 0],
    [invest, 2, `${String(y)}-01-01`, '부', 3],
  ];
  return seeds.map(([account, term, closeStart, closed, unapprovedCount]) => {
    const yy = Number(closeStart.slice(0, 4));
    return {
      id: fiscalId(account, term), account, term,
      closeStart, closeEnd: `${String(yy)}-12-31`, closed,
      carryTerm: term + 1, carryStart: `${String(yy + 1)}-01-01`, carryEnd: `${String(yy + 1)}-12-31`,
      unapprovedCount, status: '',
    };
  });
}
