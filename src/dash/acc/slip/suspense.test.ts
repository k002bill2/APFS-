/* 미결계정 관리(ACC-005) — 순수 로직 테스트: 데이터 파생·게이트 4종·필터 기본값·부분정리·상계(마감월·검증 순서)·정리취소(상계 짝)·계좌변경 */
import { describe, expect, it } from 'vitest';
import { demoAccounts } from '../baseinfo/account_code_data';
import { lineTotals } from './general_journal_data';
import { PARTNER_ACCOUNTS, SUSPENSE_ACCOUNTS, demoSuspense, kindOf } from './suspense_data';
import type { SuspenseRow } from './suspense_data';
import {
  ACCOUNT_MSG, CLEAR_MSG, OFFSET_MSG, canCancel, canChangeAccount, canClear, canOffset, cancelTargets, clearAccountFor, clearView, clearedAmount,
  closedMonths, commitAccountChange, commitCancel, commitClear, commitOffset, defaultFilter, filterSuspense, isCleared, remainingOf,
  validateAccountChange, validateClear, validateOffset,
} from './suspense_model';
import type { ClearInput } from './suspense_model';

const TODAY = '2026-10-29';
const fresh = () => demoSuspense();
const byMemo = (rows: SuspenseRow[], memo: string) => {
  const r = rows.find((x) => x.memo === memo);
  if (!r) throw new Error('행 없음: ' + memo);
  return r;
};
const input = (over: Partial<ClearInput> = {}): ClearInput => ({
  date: TODAY, amount: null, reason: '', clearer: '김민준', bankAccount: '기금 운용계좌 301-0101-0001-01', clearAccountCode: clearAccountFor('x'), memo: '', ...over,
});

describe('데이터', () => {
  it('미결 계정과목 = 계정과목 관리의 계정성격 미결(사용 Y) — 채권/채무는 계정분류에서 파생', () => {
    const expected = demoAccounts().filter((a) => a.nature === '미결' && a.use === 'Y' && a.input === 'Y').map((a) => a.code);
    expect(SUSPENSE_ACCOUNTS.map((a) => a.code)).toEqual(expected);
    expect(kindOf('1110500')).toBe('채권');
    expect(kindOf('2100100')).toBe('채무');
    expect(SUSPENSE_ACCOUNTS.some((a) => a.name === '가지급금')).toBe(false);   // 삭제(사용 N) 계정 제외
  });
  it('15~25행 · 모든 발생/정리 전표번호가 전표 fixture 맵에 있다(전표번호 링크 클릭이 무음 no-op 되지 않게)', () => {
    const { rows, slips } = fresh();
    expect(rows.length).toBeGreaterThanOrEqual(15);
    expect(rows.length).toBeLessThanOrEqual(25);
    const refs = rows.flatMap((r) => [r.occurSlipNo, ...r.clearings.map((c) => c.slipNo)]);
    expect(refs.filter((n) => !slips[n])).toEqual([]);
  });
  it('전표 fixture 는 차변 합 = 대변 합, 분개 과목명이 비지 않는다', () => {
    const { slips } = fresh();
    for (const j of Object.values(slips)) {
      const t = lineTotals(j.lines);
      expect(t.debit).toBe(t.credit);
      expect(j.lines.every((l) => l.accountName && l.accountName !== '-')).toBe(true);
    }
  });
  it('계좌 2개 이상 거래처가 있다', () => {
    expect(Object.values(PARTNER_ACCOUNTS).some((a) => a.length >= 2)).toBe(true);
  });
  it('계좌정보·예금주는 채무 건만(채권 = "-")', () => {
    const { rows } = fresh();
    for (const r of rows.filter((x) => kindOf(x.accountCode) === '채권')) expect(r.bankAccount).toBe('-');
  });
});

describe('필터 기본값', () => {
  it('정리여부 = 부, 발생기간 = 2022-01-01 ~ 오늘', () => {
    const f = defaultFilter(TODAY);
    expect(f.clearedYn).toBe('부');
    expect([f.occurFrom, f.occurTo]).toEqual(['2022-01-01', TODAY]);
  });
  it('기본 필터는 정리완료·2022 이전 건을 숨긴다', () => {
    const { rows } = fresh();
    const shown = filterSuspense(rows, defaultFilter(TODAY));
    expect(shown.some(isCleared)).toBe(false);
    expect(shown.some((r) => r.occurDate < '2022-01-01')).toBe(false);
    expect(shown.length).toBeLessThan(rows.length);
    expect(shown.length).toBeGreaterThan(0);
  });
  it('정리기간 조건이 걸리면 정리 이력 없는 건은 제외', () => {
    const { rows } = fresh();
    const res = filterSuspense(rows, { ...defaultFilter(TODAY), clearedYn: '', clearFrom: '2020-01-01', clearTo: TODAY });
    expect(res.every((r) => r.clearings.length > 0)).toBe(true);
  });
});

describe('버튼 게이트', () => {
  const { rows } = fresh();
  const audit = byMemo(rows, '회계감사 수수료 미지급');
  const service = byMemo(rows, '용역대금 미지급');
  const advice = byMemo(rows, '자문료 미지급');
  const claim = byMemo(rows, '출자 반환금 미수');
  const debt = byMemo(rows, '수산물 구매대금 미지급');
  const unsubmitted = byMemo(rows, '자문위원 수당 미지급');
  const otherAcc = byMemo(rows, '분기 감사비용 미지급');
  const done = byMemo(rows, '정기예금 이자 미수');
  const partial = byMemo(rows, '조합 관리보수 미지급');

  it('[정리] — 승인·미정리, 계정구분·계정과목 동일(거래처 무관) 다건 가능', () => {
    expect(canClear(rows, [audit.id, service.id, advice.id])).toBe(true);
    expect(canClear(rows, [partial.id])).toBe(true);   // 부분정리 건은 잔액이 남아 있어 정리 가능
    expect(canClear(rows, [])).toBe(false);
    expect(canClear(rows, [audit.id, unsubmitted.id])).toBe(false);   // 미상신 섞임
    expect(canClear(rows, [audit.id, otherAcc.id])).toBe(false);      // 계정구분·과목 다름
    expect(canClear(rows, [done.id])).toBe(false);                    // 정리완료
  });
  it('[정리취소] — 정확히 1건, 승인 + 정리전표 있음', () => {
    expect(canCancel(rows, [done.id])).toBe(true);
    expect(canCancel(rows, [partial.id])).toBe(true);
    expect(canCancel(rows, [audit.id])).toBe(false);
    expect(canCancel(rows, [done.id, partial.id])).toBe(false);
  });
  it('[채권채무상계] — 채권 1 + 채무 1, 거래처·계정구분·잔액 동일, 승인·미정리', () => {
    expect(canOffset(rows, [claim.id, debt.id])).toBe(true);
    expect(canOffset(rows, [claim.id])).toBe(false);
    expect(canOffset(rows, [claim.id, debt.id, audit.id])).toBe(false);
    expect(canOffset(rows, [audit.id, service.id])).toBe(false);   // 같은 성격 2건
    expect(canOffset(rows, [claim.id, audit.id])).toBe(false);     // 거래처·계정구분·금액 불일치
  });
  it('[거래처 계좌 변경] — 정확히 1건(결재상태 무관)', () => {
    expect(canChangeAccount(rows, [unsubmitted.id])).toBe(true);
    expect(canChangeAccount(rows, [audit.id, service.id])).toBe(false);
  });
});

describe('정리(부분정리 · 행마다 전표 1장)', () => {
  it('저장 검증 순서 — 첫 미충족 1건만', () => {
    expect(validateClear(input({ amount: 9_000_000, bankAccount: '' }), 7_500_000)).toEqual({ ok: false, field: 'amount', message: CLEAR_MSG.amountOver });
    expect(validateClear(input({ amount: 1, bankAccount: '' }), 7_500_000)).toEqual({ ok: false, field: 'bankAccount', message: CLEAR_MSG.bankAccount });
    expect(validateClear(input({ amount: 1, clearAccountCode: '' }), 7_500_000)).toEqual({ ok: false, field: 'clearAccount', message: CLEAR_MSG.clearAccount });
    expect(validateClear(input({ amount: 0 }), 7_500_000)).toMatchObject({ ok: false, field: 'amount', message: CLEAR_MSG.amountEmpty });
    expect(validateClear(input({ amount: 7_500_000 }), 7_500_000)).toEqual({ ok: true });
  });
  it('단건 부분정리 — 누적 증가·잔액 감소·정리여부 부 유지, 미상신 전표 1장', () => {
    const { rows, slips } = fresh();
    const r = byMemo(rows, '조합 관리보수 미지급');
    const res = commitClear(rows, slips, [r.id], input({ amount: 2_500_000 }));
    const n = res.rows.find((x) => x.id === r.id)!;
    expect(clearedAmount(n)).toBe(7_500_000);
    expect(remainingOf(n)).toBe(5_000_000);
    expect(isCleared(n)).toBe(false);
    expect(res.created).toHaveLength(1);
    const j = res.slips[res.created[0]];
    expect(j.approval).toBe('미상신');
    expect(j.origin).toBe('미결');
    /* 채무 정리 — 차) 미결과목 / 대) 예금 */
    expect(j.lines[0]).toMatchObject({ accountCode: r.accountCode, debit: 2_500_000 });
    expect(j.lines[1]).toMatchObject({ accountName: '보통예금', credit: 2_500_000 });
    expect(clearView(n)).toMatchObject({ date: TODAY, slipNo: res.created[0], approval: '미상신', amount: 7_500_000 });
  });
  it('다건 정리 — 각 행 잔액 전액, 행마다 서로 다른 전표번호', () => {
    const { rows, slips } = fresh();
    const ids = ['회계감사 수수료 미지급', '용역대금 미지급', '자문료 미지급'].map((m) => byMemo(rows, m).id);
    const res = commitClear(rows, slips, ids, input({ amount: 1 }));   // 다건은 입력 금액을 쓰지 않는다
    expect(new Set(res.created).size).toBe(3);
    for (const id of ids) expect(isCleared(res.rows.find((x) => x.id === id)!)).toBe(true);
    expect(res.created.every((no) => !slips[no])).toBe(true);   // fixture 번호와 충돌 없음
  });
  it('채권 정리 분개 — 차) 예금 / 대) 미결과목', () => {
    const { rows, slips } = fresh();
    const r = byMemo(rows, '예치금 이자 미수');
    const res = commitClear(rows, slips, [r.id], input({ amount: 312000, bankAccount: '수산 운용계좌 303-0303-0001-01' }));
    const j = res.slips[res.created[0]];
    expect(j.lines[0]).toMatchObject({ accountName: '보통예금', debit: 312000 });
    expect(j.lines[1]).toMatchObject({ accountCode: r.accountCode, credit: 312000 });
  });
});

describe('채권채무상계', () => {
  const ids = (rows: SuspenseRow[]) => [byMemo(rows, '출자 반환금 미수').id, byMemo(rows, '수산물 구매대금 미지급').id];
  it('마감월 = 직전 N개월(당월 제외)', () => {
    expect(closedMonths(TODAY)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(closedMonths(TODAY)).not.toContain('2026-10');
  });
  it('검증 순서 — 마감월 → 상태 변경(stale) → 불일치', () => {
    const { rows, slips } = fresh();
    expect(validateOffset(rows, ids(rows), '2026-09-15', TODAY)).toMatchObject({ ok: false, code: 'closed', message: OFFSET_MSG.closed });
    expect(validateOffset(rows, ids(rows), TODAY, TODAY)).toMatchObject({ ok: true });
    /* 한쪽이 먼저 정리됨 → stale */
    const cleared = commitClear(rows, slips, [ids(rows)[1]], input({ amount: 8_000_000, bankAccount: '조합 운용계좌 302-0202-0001-01' })).rows;
    expect(validateOffset(cleared, ids(rows), TODAY, TODAY)).toMatchObject({ ok: false, code: 'stale', message: OFFSET_MSG.stale });
    /* 같은 성격 2건 → 불일치 */
    const two = ['회계감사 수수료 미지급', '용역대금 미지급'].map((m) => byMemo(rows, m).id);
    expect(validateOffset(rows, two, TODAY, TODAY)).toMatchObject({ ok: false, code: 'mismatch', message: OFFSET_MSG.mismatch });
  });
  it('상계전표 1장 — 차) 채무과목 / 대) 채권과목, 두 행에 같은 정리전표번호', () => {
    const { rows, slips } = fresh();
    const res = commitOffset(rows, slips, ids(rows), { date: TODAY, clearer: '김민준', reason: '채권채무 상계', memo: '' })!;
    const [c, d] = ids(rows).map((id) => res.rows.find((x) => x.id === id)!);
    expect(clearView(c).slipNo).toBe(res.slipNo);
    expect(clearView(d).slipNo).toBe(res.slipNo);
    expect(isCleared(c) && isCleared(d)).toBe(true);
    const j = res.slips[res.slipNo];
    expect(j.approval).toBe('미상신');
    expect(j.lines[0]).toMatchObject({ accountCode: d.accountCode, debit: 8_000_000 });
    expect(j.lines[1]).toMatchObject({ accountCode: c.accountCode, credit: 8_000_000 });
  });
});

describe('정리취소', () => {
  it('상계 건 — 짝 건·상계전표 함께 취소', () => {
    const { rows, slips } = fresh();
    const a = byMemo(rows, '종자 판매대금 미수');
    const b = byMemo(rows, '방제 용역비 미지급');
    const t = cancelTargets(rows, a.id)!;
    expect(t.offset).toBe(true);
    expect(t.ids.sort()).toEqual([a.id, b.id].sort());
    const res = commitCancel(rows, slips, a.id)!;
    for (const id of [a.id, b.id]) {
      const n = res.rows.find((x) => x.id === id)!;
      expect(n.clearings).toEqual([]);
      expect(clearView(n)).toEqual({ date: '-', amount: null, slipNo: '-', approval: '-' });
    }
    expect(res.slips[t.slipNo]).toBeUndefined();
  });
  it('부분정리 건 — 최근 전표분만 차감(이전 정리는 유지)', () => {
    const { rows, slips } = fresh();
    const r = byMemo(rows, '시설 선급금 지급');
    expect(clearedAmount(r)).toBe(15_000_000);
    const res = commitCancel(rows, slips, r.id)!;
    const n = res.rows.find((x) => x.id === r.id)!;
    expect(clearedAmount(n)).toBe(10_000_000);
    expect(clearView(n).date).toBe('2024-06-30');
    expect(res.ids).toEqual([r.id]);
  });
});

describe('계좌번호 변경', () => {
  it('미선택 안내 · 같은 거래처 등록 계좌로 계좌정보·예금주 갱신', () => {
    expect(validateAccountChange('')).toEqual({ ok: false, field: 'accountNo', message: ACCOUNT_MSG.required });
    const { rows } = fresh();
    const r = byMemo(rows, '회계감사 수수료 미지급');
    const alt = PARTNER_ACCOUNTS[r.custNo].find((a) => a.accountNo !== r.bankAccount)!;
    const n = commitAccountChange(rows, r.id, alt.accountNo).find((x) => x.id === r.id)!;
    expect(n.bankAccount).toBe(alt.accountNo);
    expect(n.holder).toBe(alt.holder);
    /* 등록 계좌가 아니면 그대로 */
    expect(commitAccountChange(rows, r.id, '999-999').find((x) => x.id === r.id)!.bankAccount).toBe(r.bankAccount);
  });
});

describe('commit 방어 — 게이트 불통과면 원장 그대로', () => {
  it('정리 — 미승인·정리완료 건은 전표를 만들지 않는다', () => {
    const { rows, slips } = fresh();
    const bad = [byMemo(rows, '자문위원 수당 미지급').id];   // 미상신
    const res = commitClear(rows, slips, bad, input({ amount: 900000 }));
    expect(res.created).toEqual([]);
    expect(res.rows).toEqual(rows);
    expect(res.slips).toBe(slips);
    expect(commitClear(rows, slips, [byMemo(rows, '정기예금 이자 미수').id], input({ amount: 1 })).created).toEqual([]);
  });
  it('상계·정리취소 — 불일치 짝·정리 이력 없는 건은 null', () => {
    const { rows, slips } = fresh();
    const two = ['출자 반환금 미수', '회계감사 수수료 미지급'].map((m) => byMemo(rows, m).id);
    expect(commitOffset(rows, slips, two, { date: TODAY, clearer: '김민준', reason: '', memo: '' })).toBeNull();
    expect(commitCancel(rows, slips, byMemo(rows, '회계감사 수수료 미지급').id)).toBeNull();
  });
});
