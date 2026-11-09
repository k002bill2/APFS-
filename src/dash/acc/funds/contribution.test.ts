import { describe, it, expect } from 'vitest';
import { demoContributions } from './contribution_data';
import type { ContribRow } from './contribution_data';
import {
  totalDist, netAfterTax, payWithPerf, payWithoutPerf, withBalances, balanceBefore, nextSeq, filterViews, EMPTY_FILTER, PERIOD_ERROR,
  toUnit, sumTotals, logicalDelete, deleteConfirmMsg, validateInvest, validateDistribute, applyDistKind, CONTRIB_MSG,
  checkAttachment, ATTACH_MAX_BYTES, negativeBalanceAfter, validateUploadRow, validateUpload, demoUploadRows, uploadTemplateAoa, UPLOAD_HEADERS, uploadErrorMsg, uploadDoneMsg,
} from './contribution_model';
import type { UploadRow } from './contribution_model';

const base: ContribRow = { id: 'X', account: '수산(투자계정)', date: '2026-01-01', seq: 1, kind: '분배', distKind: '원금+수익', invest: 0,
  principal: 1000, income: 500, withholding: 77, perfFee: 30, incentive: 20, lac: 5, memo: '', attachments: [] };
const row = (p: Partial<ContribRow>): ContribRow => ({ ...base, ...p });

describe('계산 컬럼', () => {
  it('총분배·실지급액 3종', () => {
    expect(totalDist(base)).toBe(1500);
    expect(netAfterTax(base)).toBe(1423);
    expect(payWithPerf(base)).toBe(1473);
    expect(payWithoutPerf(base)).toBe(1443);
  });
});

describe('출자잔액 누계', () => {
  it('계정별 Σ출자 − ΣA, 계정구분 → 시간 순', () => {
    const v = withBalances(demoContributions());
    const agri = v.filter((r) => r.account === '농식품(투자계정)');
    expect(agri.map((r) => r.balance)).toEqual([5e9, 8e9, 7e9, 9e9, 7.5e9, 7.5e9, 12.5e9, 10.5e9]);
    expect(v[0].account).toBe('농식품(투자계정)');
    expect(v[v.length - 1].account).toBe('비용(비용정산)');
  });
  it('같은 날은 출자가 분배보다 먼저', () => {
    const rows = [row({ id: 'a', kind: '분배', distKind: '원금', principal: 100, income: 0, date: '2026-02-01' }), row({ id: 'b', kind: '출자', distKind: '', invest: 300, principal: 0, income: 0, date: '2026-02-01' })];
    const v = withBalances(rows);
    expect(v.map((r) => r.id)).toEqual(['b', 'a']);
    expect(v.map((r) => r.balance)).toEqual([300, 200]);
  });
  it('필터해도 잔액은 전체 이력 기준', () => {
    const v = withBalances(demoContributions());
    const late = filterViews(v, { ...EMPTY_FILTER, account: '농식품', from: '2026-01-01' });
    expect(late[0].date).toBe('2026-05-20');
    const all = demoContributions().filter((r) => r.account === '농식품(투자계정)' && r.date <= '2026-05-20');
    expect(late[0].balance).toBe(all.reduce((s, r) => s + r.invest - r.principal, 0));
  });
  it('삭제 후 재계산', () => {
    const rows = demoContributions();
    const target = rows.find((r) => r.account === '농식품(투자계정)' && r.date === '2025-02-14')!;
    const res = logicalDelete(rows, [], [target.id]);
    expect(res.rows).toHaveLength(rows.length - 1);
    expect(res.deleted.map((r) => r.id)).toEqual([target.id]);
    const agri = withBalances(res.rows).filter((r) => r.account === '농식품(투자계정)');
    expect(agri[agri.length - 1].balance).toBe(11.5e9);
    expect(deleteConfirmMsg(3)).toBe('선택한 3건을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.');
  });
  it('수정 후 재계산', () => {
    const rows = demoContributions().map((r) => (r.account === '비용(비용정산)' && r.seq === 1 && r.kind === '출자' ? { ...r, invest: 500_000_000 } : r));
    const cost = withBalances(rows).filter((r) => r.account === '비용(비용정산)');
    expect(cost.map((r) => r.balance)).toEqual([5e8, 8e8, 6.8e8, 9.8e8]);
  });
  it('balanceBefore — 자기 행 제외, 같은 날 출자 포함, 날짜 없으면 현재 잔액', () => {
    const rows = demoContributions();
    expect(balanceBefore(rows, '농식품(투자계정)', '2026-08-12', '분배')).toBe(10.5e9);   // 같은 날 분배(기존)까지 포함
    const d = rows.find((r) => r.date === '2026-08-12')!;
    expect(balanceBefore(rows, '농식품(투자계정)', '2026-08-12', '분배', d.id)).toBe(12.5e9);
    expect(balanceBefore(rows, '수산(투자계정)', '', '분배')).toBe(1.99e9);
    expect(balanceBefore(rows, '수산(투자계정)', '2024-05-10', '출자')).toBe(1.5e9);
    expect(balanceBefore(rows, '수산(투자계정)', '2024-05-09', '출자')).toBe(0);
  });
  it('balanceBefore — 같은 날 분배 2건은 회차 순(그리드 직전 잔액과 일치)', () => {
    const rows = [
      row({ id: 'I1', kind: '출자', distKind: '', date: '2026-01-01', seq: 1, invest: 1000, principal: 0 }),
      row({ id: 'Z', date: '2026-02-01', seq: 1, principal: 100 }),   // id 는 회차와 반대 순서 — 회차가 우선해야 한다
      row({ id: 'A', date: '2026-02-01', seq: 2, principal: 200 }),
    ];
    const grid = new Map(withBalances(rows).map((v) => [v.id, v.balance + v.principal - v.invest]));
    expect(balanceBefore(rows, '수산(투자계정)', '2026-02-01', '분배', 'Z', 1)).toBe(grid.get('Z'));
    expect(balanceBefore(rows, '수산(투자계정)', '2026-02-01', '분배', 'A', 2)).toBe(grid.get('A'));
    expect(grid.get('Z')).toBe(1000);
    expect(grid.get('A')).toBe(900);
  });
  it('nextSeq — 계정·구분별 최대 + 1', () => {
    const rows = demoContributions();
    expect(nextSeq(rows, '농식품(투자계정)', '출자')).toBe(5);
    expect(nextSeq(rows, '농식품(투자계정)', '분배')).toBe(5);
    expect(nextSeq([], '수산(투자계정)', '출자')).toBe(1);
  });
});

describe('필터·단위·합계', () => {
  const v = withBalances(demoContributions());
  it('계정구분·구분·기간', () => {
    expect(filterViews(v, { ...EMPTY_FILTER, account: '수산' })).toHaveLength(4);
    expect(filterViews(v, { ...EMPTY_FILTER, kind: '분배' }).every((r) => r.kind === '분배')).toBe(true);
    expect(filterViews(v, { ...EMPTY_FILTER, from: '2026-01-01', to: '2026-03-31' }).map((r) => r.date)).toEqual(['2026-03-27', '2026-01-30', '2026-02-02']);
  });
  it('기간 시작 > 종료 = 0건', () => {
    expect(filterViews(v, { ...EMPTY_FILTER, from: '2026-02-01', to: '2026-01-01' })).toEqual([]);
    expect(PERIOD_ERROR).toBe('시작일은 종료일보다 늦을 수 없습니다.');
  });
  it('단위 환산 — 반올림 정수', () => {
    expect(toUnit(1_234_567, '원')).toBe(1_234_567);
    expect(toUnit(1_234_567, '천원')).toBe(1_235);
    expect(toUnit(1_234_567, '백만원')).toBe(1);
    expect(toUnit(-400, '천원')).toBe(0);
  });
  it('합계 — 원으로 합산(환산 전)', () => {
    const t = sumTotals(filterViews(v, { ...EMPTY_FILTER, account: '수산' }));
    expect(t.invest).toBe(2e9);
    expect(t.principal).toBe(1e7);
    expect(t.income).toBe(85e6);
    expect(t.withholding).toBe(Math.floor(85e6 * 0.154));
    expect(t.payWithoutPerf).toBe(1e7 + 85e6 - Math.floor(85e6 * 0.154) + 4_250_000);
  });
});

describe('출자등록 검증 순서', () => {
  it('계정구분 → 출자일 → 납입금액(0도 미입력)', () => {
    expect(validateInvest({ account: '', date: '', pay: null })).toMatchObject({ ok: false, field: 'account', message: CONTRIB_MSG.account });
    expect(validateInvest({ account: '수산(투자계정)', date: '', pay: null })).toMatchObject({ field: 'date', message: '출자일을 입력해 주세요.' });
    expect(validateInvest({ account: '수산(투자계정)', date: '2026-01-01', pay: 0 })).toMatchObject({ field: 'pay', message: '납입금액을 입력해 주세요.' });
    expect(validateInvest({ account: '수산(투자계정)', date: '2026-01-01', pay: 10 })).toEqual({ ok: true });
  });
});

describe('분배등록 검증·구분 규칙', () => {
  const ok = { account: '수산(투자계정)' as const, date: '2026-01-01', distKind: '원금' as const, principal: 100, income: 0 };
  it('필수 순서', () => {
    expect(validateDistribute({ ...ok, account: '' }, 1000)).toMatchObject({ field: 'account' });
    expect(validateDistribute({ ...ok, date: '' }, 1000)).toMatchObject({ field: 'date', message: '분배일을 입력해 주세요.' });
    expect(validateDistribute({ ...ok, distKind: '' }, 1000)).toMatchObject({ field: 'distKind', message: '구분을 선택해 주세요.' });
  });
  it('원금 — A 필수', () => {
    expect(validateDistribute({ ...ok, principal: 0 }, 1000)).toMatchObject({ field: 'principal', message: CONTRIB_MSG.principal });
    expect(validateDistribute(ok, 1000)).toEqual({ ok: true });
  });
  it('수익 — B 필수, A 무관', () => {
    expect(validateDistribute({ ...ok, distKind: '수익', principal: 0, income: 0 }, 0)).toMatchObject({ field: 'income', message: CONTRIB_MSG.income });
    expect(validateDistribute({ ...ok, distKind: '수익', principal: 0, income: 50 }, 0)).toEqual({ ok: true });
  });
  it('원금+수익 — 둘 다 필수', () => {
    expect(validateDistribute({ ...ok, distKind: '원금+수익', principal: 0, income: 50 }, 1000)).toMatchObject({ field: 'principal' });
    expect(validateDistribute({ ...ok, distKind: '원금+수익', principal: 10, income: null }, 1000)).toMatchObject({ field: 'income' });
  });
  it('A > 분배전 잔액 — 초과 메시지·A 포커스', () => {
    expect(validateDistribute({ ...ok, principal: 1001 }, 1000)).toEqual({ ok: false, field: 'principal', message: '분배원금이 출자원금잔액을 초과합니다.' });
    expect(validateDistribute({ ...ok, principal: 1000 }, 1000)).toEqual({ ok: true });
  });
  it('구분 변경 — 비활성 항목 0, 실제로 지웠을 때만 cleared', () => {
    expect(applyDistKind('원금', { principal: 10, income: 20 })).toEqual({ principal: 10, income: 0, cleared: true });
    expect(applyDistKind('수익', { principal: 10, income: 20 })).toEqual({ principal: 0, income: 20, cleared: true });
    expect(applyDistKind('원금+수익', { principal: 10, income: 20 })).toEqual({ principal: 10, income: 20, cleared: false });
    expect(applyDistKind('수익', { principal: 0, income: 20 })).toEqual({ principal: 0, income: 20, cleared: false });
    expect(applyDistKind('원금', { principal: 5, income: null })).toEqual({ principal: 5, income: 0, cleared: false });
  });
});

describe('첨부', () => {
  it('20MB·허용 형식', () => {
    expect(checkAttachment({ name: '보고서.PDF', size: 1000 })).toBe(true);
    expect(checkAttachment({ name: 'a.hwp', size: ATTACH_MAX_BYTES })).toBe(true);
    expect(checkAttachment({ name: 'a.hwp', size: ATTACH_MAX_BYTES + 1 })).toBe(false);
    expect(checkAttachment({ name: 'a.zip', size: 10 })).toBe(false);
    expect(checkAttachment({ name: 'noext', size: 10 })).toBe(false);
  });
});

describe('엑셀 일괄등록', () => {
  const u = (p: Partial<UploadRow>): UploadRow => ({ no: 1, account: '수산', regKind: '분배', date: '2026-09-01', seq: '', pay: '', distKind: '원금', principal: '100', income: '', perfFee: '', incentive: '', lac: '', memo: '', errors: [], ...p });
  it('양식 12열', () => {
    expect(UPLOAD_HEADERS).toHaveLength(12);
    expect(uploadTemplateAoa()[0]).toEqual([...UPLOAD_HEADERS]);
  });
  it('공통 필수·형식', () => {
    expect(validateUploadRow(u({ account: '' }), 1e9)).toContain('계정구분 누락');
    expect(validateUploadRow(u({ account: '축산' }), 1e9)).toContain('계정구분 형식 오류');
    expect(validateUploadRow(u({ regKind: '환급' }), 1e9)).toContain('등록구분 형식 오류');
    expect(validateUploadRow(u({ date: '2026-02-30' }), 1e9)).toContain('일자 형식 오류');
    expect(validateUploadRow(u({ seq: '1차' }), 1e9)).toContain('회차 형식 오류');
  });
  it('출자 — 납입금액 필수, 분배 컬럼 무시', () => {
    expect(validateUploadRow(u({ regKind: '출자', pay: '' }), 0)).toEqual(['납입금액 누락']);
    expect(validateUploadRow(u({ regKind: '출자', pay: '1,000', distKind: '엉터리', principal: 'abc' }), 0)).toEqual([]);
    expect(validateUploadRow(u({ regKind: '출자', pay: '12억' }), 0)).toEqual(['납입금액 형식 오류']);
  });
  it('분배 — 분배구분 필수, 구분별 A/B 필수, 형식 오류', () => {
    expect(validateUploadRow(u({ distKind: '' }), 1e9)).toEqual(['분배구분 누락']);
    expect(validateUploadRow(u({ distKind: '수익', income: '' }), 1e9)).toEqual(['분배수익(B) 누락']);
    expect(validateUploadRow(u({ distKind: '원금+수익', principal: '', income: '5' }), 1e9)).toEqual(['분배원금(A) 누락']);
    expect(validateUploadRow(u({ perfFee: 'x' }), 1e9)).toEqual(['성과보수(D) 형식 오류']);
  });
  it('분배원금 > 잔액', () => {
    expect(validateUploadRow(u({ principal: '1,000' }), 999)).toEqual(['분배원금이 출자원금잔액을 초과합니다.']);
    expect(validateUploadRow(u({ principal: '1,000' }), 1000)).toEqual([]);
  });
  it('전체 — 데모 6행 중 오류 2행, 통과분만 등록·앞 행 잔액 반영', () => {
    const existing = demoContributions();
    const res = validateUpload(demoUploadRows(), existing, (i) => `UP-${String(i)}`);
    expect(res.errorCount).toBe(2);
    expect(res.rows.filter((r) => r.errors.length).map((r) => r.no)).toEqual([3, 4]);
    expect(res.rows[3].errors).toEqual([CONTRIB_MSG.overflow]);
    expect(res.passed).toHaveLength(4);
    expect(res.passed[0]).toMatchObject({ account: '농식품(투자계정)', kind: '출자', invest: 1e9, seq: 5 });
    expect(res.passed[1]).toMatchObject({ account: '수산(투자계정)', kind: '분배', principal: 3e8, seq: 3 });
    const after = withBalances([...existing, ...res.passed]).filter((r) => r.account === '수산(투자계정)');
    expect(after[after.length - 1].balance).toBe(1.99e9 - 3e8);
    expect(uploadErrorMsg(2)).toBe('오류 2건 — 확인 후 재업로드');
    expect(uploadDoneMsg(4)).toBe('4건 등록되었습니다.');
  });
  it('앞서 통과한 출자 행이 뒤 분배 행 잔액에 포함된다', () => {
    const rows = [u({ no: 1, regKind: '출자', pay: '500', distKind: '' }), u({ no: 2, principal: '500', date: '2026-09-02' })];
    const res = validateUpload(rows, [], (i) => `U${String(i)}`);
    expect(res.errorCount).toBe(0);
    expect(res.passed).toHaveLength(2);
  });
});

describe('출자잔액 음수 게이트', () => {
  const inv = (id: string, date: string, invest: number, seq: number) => row({ id, kind: '출자', distKind: '', date, seq, invest, principal: 0, income: 0 });
  const dist = (id: string, date: string, principal: number, seq: number) => row({ id, date, seq, distKind: '원금', principal, income: 0 });
  it('데모 데이터는 음수 잔액이 없다', () => {
    expect(negativeBalanceAfter(demoContributions())).toEqual([]);
  });
  it('뒤에 분배가 있는 출자 삭제 — 차단', () => {
    const rows = [inv('I1', '2026-01-01', 1000, 1), inv('I2', '2026-01-02', 500, 2), dist('D1', '2026-01-03', 1200, 1)];
    expect(negativeBalanceAfter(rows)).toEqual([]);
    const bad = negativeBalanceAfter(logicalDelete(rows, [], ['I2']).rows);
    expect(bad.map((r) => r.id)).toEqual(['D1']);
    expect(negativeBalanceAfter(logicalDelete(rows, [], ['D1']).rows)).toEqual([]);   // 분배 삭제는 통과
    expect(CONTRIB_MSG.deleteNegative).toBe('삭제 후 출자원금잔액이 음수가 되는 분배가 있어 삭제할 수 없습니다.');
  });
  it('출자 감액 — 차단', () => {
    const rows = [inv('I1', '2026-01-01', 1000, 1), dist('D1', '2026-01-03', 800, 1)];
    const lowered = rows.map((r) => (r.id === 'I1' ? { ...r, invest: 600 } : r));
    expect(negativeBalanceAfter(lowered).map((r) => r.id)).toEqual(['D1']);
  });
  it('소급 분배 — 분배전 잔액 검증은 통과해도 뒤 분배가 음수면 차단', () => {
    const rows = [inv('I1', '2026-01-01', 10, 1), dist('D1', '2026-01-10', 8, 1), inv('I2', '2026-01-15', 5, 2), dist('D2', '2026-01-20', 5, 2)];
    expect(negativeBalanceAfter(rows)).toEqual([]);
    const moved = rows.map((r) => (r.id === 'D2' ? { ...r, date: '2026-01-05' } : r));
    const before = balanceBefore(rows, '수산(투자계정)', '2026-01-05', '분배', 'D2', 2);
    expect(before).toBe(10);
    expect(validateDistribute({ account: '수산(투자계정)', date: '2026-01-05', distKind: '원금', principal: 5, income: 0 }, before)).toEqual({ ok: true });
    expect(negativeBalanceAfter(moved).map((r) => r.id)).toEqual(['D1']);
  });
  it('업로드 — 뒤 분배를 음수로 만드는 소급 분배 행은 오류로 빠진다', () => {
    const existing = [inv('I1', '2026-01-01', 10, 1), dist('D1', '2026-01-10', 8, 1)];
    const up: UploadRow = { no: 1, account: '수산', regKind: '분배', date: '2026-01-05', seq: '', pay: '', distKind: '원금', principal: '5', income: '', perfFee: '', incentive: '', lac: '', memo: '', errors: [] };
    const res = validateUpload([up], existing, (i) => `U${String(i)}`);
    expect(res.rows[0].errors).toEqual([CONTRIB_MSG.overflow]);
    expect(res.passed).toEqual([]);
    expect(res.errorCount).toBe(1);
  });
});
