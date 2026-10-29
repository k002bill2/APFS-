/* 삭제전표 관리(ACC-004) 순수 모델 + 더미 불변식. */
import { describe, it, expect } from 'vitest';
import { demoDeletedJournals } from './deleted_journal_data';
import type { DeletedJournal } from './deleted_journal_data';
import { FUND_ACCOUNTS, FUND_BANK_ACCOUNTS, JOURNAL_ORIGINS, CURRENCIES, BASE_CURRENCY, lineTotals } from './general_journal_data';
import { filterDeleted, validatePeriod, restoreJournal, sortDeleted, EMPTY_FILTER, PERIOD_ERROR } from './deleted_journal_model';
import { ACCOUNTS } from '../account_data';

const row = (p: Partial<DeletedJournal>): DeletedJournal => ({
  id: 'X', fundAccount: '농림수산식품모태펀드(기금)', slipDate: '2026-10-01', seq: '001', memo: '적요', amount: 0, partner: '-', approval: '미상신',
  attachments: [], writer: '김민준', origin: '일반', slipNo: '20261001-001', fundDueDate: '-', createdBy: '김민준', updatedBy: '김민준',
  writtenDate: '2026-10-01', slipKind: '정상', evidenceType: '해당없음', storage: '-', noEvidence: false, currency: '대한민국(원)',
  exchangeRate: null, foreignAmount: null, plDept: '-', plEmployee: '-', lines: [], deletedAt: '2026-10-02 10:00', deletedBy: '이서연', ...p,
});

const FIX: DeletedJournal[] = [
  row({ id: 'A', slipDate: '2026-10-05', seq: '002', memo: '관리보수 지급', partner: '한빛자산운용', writer: '김민준' }),
  row({ id: 'B', slipDate: '2026-10-05', seq: '001', memo: 'Audit Fee', partner: '가온회계법인', writer: '이서연', origin: '결산', fundAccount: '수산 모태계정' }),
  row({ id: 'C', slipDate: '2026-10-01', seq: '001', memo: '배당금 수령', partner: '바다솔수산', writer: '박지훈', origin: '미결' }),
  row({ id: 'D', slipDate: '2026-10-10', seq: '001', memo: '비품 구입', partner: '다온오피스', writer: '최유나', origin: '유무형자산', fundAccount: '농식품 투자조합 계정' }),
];
const ids = (rs: readonly DeletedJournal[]) => rs.map((r) => r.id);

describe('sortDeleted / filterDeleted', () => {
  it('전표일 내림차순, 같은 날은 순번 오름차순', () => {
    expect(ids(sortDeleted(FIX))).toEqual(['D', 'B', 'A', 'C']);
    expect(ids(filterDeleted(FIX, EMPTY_FILTER))).toEqual(['D', 'B', 'A', 'C']);
  });
  it('계정구분·전표발생구분 정확일치', () => {
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, fundAccount: '수산 모태계정' }))).toEqual(['B']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, origin: '미결' }))).toEqual(['C']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, origin: '미' }))).toEqual([]);
  });
  it('기간은 시작·종료 포함, 빈 값은 무제한', () => {
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, from: '2026-10-05', to: '2026-10-05' }))).toEqual(['B', 'A']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, from: '2026-10-05' }))).toEqual(['D', 'B', 'A']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, to: '2026-10-04' }))).toEqual(['C']);
  });
  it('작성자·거래처·적요 부분일치(trim·대소문자 무시)', () => {
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, writer: ' 서연 ' }))).toEqual(['B']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, partner: '자산' }))).toEqual(['A']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, memo: 'audit' }))).toEqual(['B']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, memo: '   ' }))).toHaveLength(4);
  });
  it('조건끼리 AND', () => {
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, fundAccount: '농림수산식품모태펀드(기금)', memo: '배당' }))).toEqual(['C']);
    expect(ids(filterDeleted(FIX, { ...EMPTY_FILTER, fundAccount: '수산 모태계정', memo: '배당' }))).toEqual([]);
  });
});

describe('validatePeriod', () => {
  it('시작 > 종료면 메시지, 그 외 null', () => {
    expect(validatePeriod('2026-10-10', '2026-10-01')).toBe(PERIOD_ERROR);
    expect(PERIOD_ERROR).toBe('시작일은 종료일보다 늦을 수 없습니다.');
    expect(validatePeriod('2026-10-01', '2026-10-01')).toBeNull();
    expect(validatePeriod('2026-10-01', '2026-10-10')).toBeNull();
    expect(validatePeriod('', '2026-10-01')).toBeNull();
    expect(validatePeriod('2026-10-10', '')).toBeNull();
  });
});

describe('restoreJournal', () => {
  it('복원 = 해당 행만 제외, 원본 불변', () => {
    const next = restoreJournal(FIX, 'B');
    expect(ids(next)).toEqual(['A', 'C', 'D']);
    expect(FIX).toHaveLength(4);
    expect(restoreJournal(FIX, 'ZZ')).toHaveLength(4);
  });
});

describe('더미 불변식', () => {
  const today = new Date(2026, 9, 29);
  const rows = demoDeletedJournals(today);
  it('12~16건, id 고유, 오늘−0~27일 범위', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.length).toBeLessThanOrEqual(16);
    expect(new Set(ids(rows)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.slipDate >= '2026-10-02' && r.slipDate <= '2026-10-29').toBe(true);
      expect(r.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    }
  });
  it('각 전표 차변 = 대변, 금액 = 차변 합', () => {
    for (const r of rows) {
      const t = lineTotals(r.lines);
      expect(t.debit).toBe(t.credit);
      expect(r.amount).toBe(t.debit);
      expect(r.lines.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('라인 계정은 입력여부 Y 계정의 코드·이름', () => {
    for (const l of rows.flatMap((r) => r.lines)) {
      expect(ACCOUNTS.some((a) => a.inputYn === 'Y' && a.code === l.accountCode && a.name === l.accountName)).toBe(true);
    }
  });
  it('코드값 도메인과 첨부 유무가 모두 등장한다', () => {
    for (const r of rows) {
      expect(FUND_ACCOUNTS).toContain(r.fundAccount);
      expect(JOURNAL_ORIGINS).toContain(r.origin);
      expect(CURRENCIES).toContain(r.currency);
      if (r.currency === BASE_CURRENCY) { expect(r.exchangeRate).toBeNull(); expect(r.foreignAmount).toBeNull(); }
      else { expect(r.exchangeRate).not.toBeNull(); expect(r.foreignAmount).not.toBeNull(); }
      expect(FUND_BANK_ACCOUNTS[r.fundAccount]).toContain(r.partnerAccountNo);   // 거래처계좌번호 = 그 계정구분 옵션
      expect(['미상신', '반려']).toContain(r.approval);   // 일반전표 삭제 게이트상 삭제 가능한 결재만
      expect(r.slipNo).toBe(r.slipDate.replace(/-/g, '') + '-' + r.seq);
      expect(r.fundDueDate > r.slipDate).toBe(true);   // 자금집행예정일 = 전표일 이후
    }
    for (const o of JOURNAL_ORIGINS) expect(rows.some((r) => r.origin === o)).toBe(true);
    expect(rows.some((r) => r.attachments.length > 0)).toBe(true);
    expect(rows.some((r) => r.attachments.length === 0)).toBe(true);
  });
});
