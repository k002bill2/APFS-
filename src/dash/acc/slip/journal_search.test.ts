/* 전표검색(ACC-008) 순수 모델 + 더미 불변식. */
import { describe, it, expect } from 'vitest';
import { demoSearchLines, SEARCH_SLIP_KINDS } from './journal_search_data';
import type { SearchLine } from './journal_search_data';
import { AMOUNT_RANGE_ERROR, FX_AMOUNT_RANGE_ERROR, validateForeignAmountRange, EMPTY_SEARCH_FILTER, currentMonthRange, defaultSearchFilter, filterLines, sortLines, validateAmountRange } from './journal_search_model';
import type { SearchFilter } from './journal_search_model';
import { BASE_CURRENCY, CURRENCIES, FUND_ACCOUNTS, JOURNAL_ORIGINS, PARTNERS, PL_DEPTS, demoJournals, lineTotals } from './general_journal_data';
import { validateRange, RANGE_ERROR } from './general_journal_model';

const EMPTY: SearchFilter = EMPTY_SEARCH_FILTER;

const line = (p: Partial<SearchLine>): SearchLine => ({
  id: 'X', fundAccount: '농림수산식품모태펀드(기금)', writtenDate: '2026-10-01', seq: '001', journalNo: '20261001-001-01', memo: '적요',
  accountCode: '1100100', accountName: '보통예금', subItem: '-', debit: null, credit: null, partner: '-', partnerBizNo: '', noEvidenceReason: '', dept: '회계팀', writer: '김민준',
  slipKind: '정상', origin: '일반', slipNo: '20261001-001', plDept: '-', plEmployee: '-', createdBy: '김민준', updatedBy: '김민준',
  journal: demoJournals('2026-10-29')[0], ...p,
});

const FIX: SearchLine[] = [
  line({ id: 'A1', writtenDate: '2026-10-05', journalNo: '20261005-002-01', memo: '관리보수 지급', partner: '(주)가람팜텍', accountCode: '5100100', accountName: '관리보수' }),
  line({ id: 'A2', writtenDate: '2026-10-05', journalNo: '20261005-001-02', memo: 'Audit Fee', partner: '도담회계법인', writer: '이서연', fundAccount: '수산 모태계정' }),
  line({ id: 'B1', writtenDate: '2026-10-01', journalNo: '20261001-001-01', memo: '배당금 수령', partner: '해솔영농조합법인', writer: '박지훈', accountCode: '4100200', accountName: '배당금수익' }),
  line({ id: 'C1', writtenDate: '2026-11-03', journalNo: '20261103-001-01', memo: '비품 구입', partner: '(주)다온유통', writer: '최유나', fundAccount: '농식품 투자조합 계정' }),
];
const ids = (rs: readonly SearchLine[]) => rs.map((r) => r.id);

describe('currentMonthRange / defaultSearchFilter', () => {
  it('당월 1일 ~ 말일', () => {
    expect(currentMonthRange('2026-11-02')).toEqual(['2026-11-01', '2026-11-30']);
    expect(currentMonthRange('2026-10-31')).toEqual(['2026-10-01', '2026-10-31']);
    expect(currentMonthRange('2026-12-15')).toEqual(['2026-12-01', '2026-12-31']);
    expect(currentMonthRange('2028-02-10')).toEqual(['2028-02-01', '2028-02-29']);   // 윤년
    expect(currentMonthRange('2027-02-28')).toEqual(['2027-02-01', '2027-02-28']);
  });
  it('기본 필터 = 기간만 당월', () => {
    expect(defaultSearchFilter('2026-11-02')).toEqual({ ...EMPTY, from: '2026-11-01', to: '2026-11-30' });
  });
});

describe('sortLines / filterLines', () => {
  it('작성일 내림차순, 같은 날은 분개번호 오름차순', () => {
    expect(ids(sortLines(FIX))).toEqual(['C1', 'A2', 'A1', 'B1']);
    expect(ids(filterLines(FIX, EMPTY))).toEqual(['C1', 'A2', 'A1', 'B1']);
  });
  it('계정구분 정확일치', () => {
    expect(ids(filterLines(FIX, { ...EMPTY, fundAccount: '수산 모태계정' }))).toEqual(['A2']);
    expect(ids(filterLines(FIX, { ...EMPTY, fundAccount: '수산' }))).toEqual([]);
  });
  it('기간(작성일)은 시작·종료 포함, 빈 값은 무제한', () => {
    expect(ids(filterLines(FIX, { ...EMPTY, from: '2026-10-05', to: '2026-10-05' }))).toEqual(['A2', 'A1']);
    expect(ids(filterLines(FIX, { ...EMPTY, from: '2026-10-05' }))).toEqual(['C1', 'A2', 'A1']);
    expect(ids(filterLines(FIX, { ...EMPTY, to: '2026-10-04' }))).toEqual(['B1']);
    expect(ids(filterLines(FIX, defaultSearchFilter('2026-11-02')))).toEqual(['C1']);
  });
  it('작성자·거래처·적요 부분일치(trim·대소문자 무시)', () => {
    expect(ids(filterLines(FIX, { ...EMPTY, writer: ' 서연 ' }))).toEqual(['A2']);
    expect(ids(filterLines(FIX, { ...EMPTY, partner: '회계' }))).toEqual(['A2']);
    expect(ids(filterLines(FIX, { ...EMPTY, memo: 'audit' }))).toEqual(['A2']);
    expect(ids(filterLines(FIX, { ...EMPTY, memo: '   ' }))).toHaveLength(4);
  });
  it('계정과목은 이름 또는 코드 부분일치', () => {
    expect(ids(filterLines(FIX, { ...EMPTY, account: '배당' }))).toEqual(['B1']);
    expect(ids(filterLines(FIX, { ...EMPTY, account: '5100' }))).toEqual(['A1']);
    expect(ids(filterLines(FIX, { ...EMPTY, account: '보통예금' }))).toEqual(['C1', 'A2']);
  });
  it('조건끼리 AND', () => {
    expect(ids(filterLines(FIX, { ...EMPTY, writer: '김민준', account: '보통' }))).toEqual([]);
    expect(ids(filterLines(FIX, { ...EMPTY, writer: '김민준', account: '관리' }))).toEqual(['A1']);
  });
  it('기간 검증은 일반전표 validateRange 재사용 — 시작 > 종료 차단', () => {
    expect(validateRange('2026-11-10', '2026-11-01')).toBe(RANGE_ERROR);
    expect(RANGE_ERROR).toBe('시작일은 종료일보다 늦을 수 없습니다.');
    expect(validateRange('2026-11-01', '2026-11-30')).toBeNull();
  });
});

describe('상세필터 No.7~18', () => {
  const J = demoJournals('2026-10-29')[0];
  const R: SearchLine[] = [
    line({ id: 'P1', slipNo: '20261005-001', dept: '회계팀', slipKind: '정상', origin: '일반', debit: 3300000, plDept: '경영지원팀', plEmployee: '김민준',
      journal: { ...J, memo: '10월 회계감사 수수료 지급', evidenceType: '세금계산서', attachments: ['감사계약서.pdf'] } }),
    line({ id: 'P2', slipNo: '20261005-002', dept: '투자운용팀', slipKind: '취소', origin: '미결', credit: 845000,
      journal: { ...J, memo: '정기예금 이자 미수 계상', evidenceType: '해당없음', attachments: [] } }),
    line({ id: 'P3', slipNo: '20261006-001', dept: '회계팀', slipKind: '정정', origin: '결산', debit: null, credit: null,
      journal: { ...J, memo: '결산 정리', evidenceType: '이체내역', attachments: ['이체확인증.png', '분배통지서.pdf'], currency: '미국(달러)' } }),
  ];
  it('전표번호·상단적요·증빙파일명 부분일치', () => {
    expect(ids(filterLines(R, { ...EMPTY, slipNo: '1005' }))).toEqual(['P1', 'P2']);
    expect(ids(filterLines(R, { ...EMPTY, headMemo: '이자' }))).toEqual(['P2']);
    expect(ids(filterLines(R, { ...EMPTY, memo: '이자' }))).toEqual([]);   // 적요 = 라인 적요, 상단적요와 별개
    expect(ids(filterLines(R, { ...EMPTY, evidenceFile: 'PDF' }))).toEqual(['P1', 'P3']);
    expect(ids(filterLines(R, { ...EMPTY, evidenceFile: '이체' }))).toEqual(['P3']);
  });
  it('셀렉트 조건은 정확일치, 빈 값 = 미적용', () => {
    expect(ids(filterLines(R, { ...EMPTY, dept: '회계팀' }))).toEqual(['P1', 'P3']);
    expect(ids(filterLines(R, { ...EMPTY, slipKind: '취소' }))).toEqual(['P2']);
    expect(ids(filterLines(R, { ...EMPTY, origin: '결산' }))).toEqual(['P3']);
    expect(ids(filterLines(R, { ...EMPTY, plDept: '경영지원팀' }))).toEqual(['P1']);
    expect(ids(filterLines(R, { ...EMPTY, plEmployee: '김민준' }))).toEqual(['P1']);
    expect(ids(filterLines(R, { ...EMPTY, evidenceType: '해당없음' }))).toEqual(['P2']);
    expect(ids(filterLines(R, { ...EMPTY, currency: '미국(달러)' }))).toEqual(['P3']);
    expect(ids(filterLines(R, EMPTY))).toHaveLength(3);
  });
  it('금액 = 라인 금액(차변 또는 대변) 최소~최대 포함, 금액 없는 라인은 조건 시 제외, 콤마 허용', () => {
    expect(ids(filterLines(R, { ...EMPTY, amountMin: '1,000,000' }))).toEqual(['P1']);
    expect(ids(filterLines(R, { ...EMPTY, amountMax: '845000' }))).toEqual(['P2']);
    expect(ids(filterLines(R, { ...EMPTY, amountMin: '845000', amountMax: '3300000' }))).toEqual(['P1', 'P2']);
    expect(ids(filterLines(R, { ...EMPTY, amountMin: 'abc' }))).toHaveLength(3);   // 숫자 아님 = 그 끝 무시
  });
  it('금액 범위 검증 — 최소 > 최대만 차단, 한쪽만은 허용', () => {
    expect(validateAmountRange('5,000', '1000')).toBe(AMOUNT_RANGE_ERROR);
    expect(validateAmountRange('1000', '1000')).toBeNull();
    expect(validateAmountRange('1000', '')).toBeNull();
    expect(validateAmountRange('', '')).toBeNull();
  });
});

describe('상세필터 No.14·19·20', () => {
  const J = demoJournals('2026-10-29')[0];
  const R: SearchLine[] = [
    line({ id: 'F1', journal: { ...J, currency: '미국(달러)', exchangeRate: 1385.5, foreignAmount: 2381.81 }, partnerBizNo: '1068265432', noEvidenceReason: '추후 제출 예정' }),
    line({ id: 'F2', journal: { ...J, currency: '일본(엔)', exchangeRate: 9.15, foreignAmount: 2404371.58 }, partnerBizNo: '1018112345' }),
    line({ id: 'K1', journal: { ...J, currency: BASE_CURRENCY, exchangeRate: null, foreignAmount: null }, debit: 5000, noEvidenceReason: '간이영수증 분실' }),
  ];
  it('금액(외화) = 전표 외화금액 최소~최대 포함, 원화 전표는 조건 시 제외, 콤마·소수 허용', () => {
    expect(ids(filterLines(R, { ...EMPTY, foreignAmountMin: '1,000' }))).toEqual(['F1', 'F2']);
    expect(ids(filterLines(R, { ...EMPTY, foreignAmountMax: '2381.81' }))).toEqual(['F1']);
    expect(ids(filterLines(R, { ...EMPTY, foreignAmountMin: '2,381.82' }))).toEqual(['F2']);
    expect(ids(filterLines(R, { ...EMPTY, foreignAmountMin: '0' }))).toEqual(['F1', 'F2']);   // 원화(외화금액 없음)는 빠진다
    expect(ids(filterLines(R, { ...EMPTY, foreignAmountMin: 'abc' }))).toHaveLength(3);         // 숫자 아님 = 그 끝 무시
    expect(ids(filterLines(R, { ...EMPTY, amountMin: '1' }))).toEqual(['K1']);                  // 원화 금액 조건과 독립
  });
  it('금액(외화) 범위 검증 — 최소 > 최대만 차단, 문구는 외화 명시(원화 문구와 구분)', () => {
    expect(validateForeignAmountRange('1,234.56', '1234.5')).toBe(FX_AMOUNT_RANGE_ERROR);
    expect(validateForeignAmountRange('1234.56', '1,234.56')).toBeNull();
    expect(validateForeignAmountRange('', '10')).toBeNull();
    expect(FX_AMOUNT_RANGE_ERROR).toContain('외화');
    expect(FX_AMOUNT_RANGE_ERROR).not.toBe(AMOUNT_RANGE_ERROR);
  });
  it('증빙미첨부사유 부분일치(trim·대소문자 무시), 사유 없는 전표는 조건 시 제외', () => {
    expect(ids(filterLines(R, { ...EMPTY, noEvidenceReason: ' 제출 ' }))).toEqual(['F1']);
    expect(ids(filterLines(R, { ...EMPTY, noEvidenceReason: '영수증' }))).toEqual(['K1']);
    expect(ids(filterLines(R, { ...EMPTY, noEvidenceReason: '   ' }))).toHaveLength(3);
  });
  it('거래처 사업자등록번호 — 숫자만 부분일치(하이픈 무시), 번호 없는 라인은 조건 시 제외', () => {
    expect(ids(filterLines(R, { ...EMPTY, partnerBizNo: '106-82-65432' }))).toEqual(['F1']);
    expect(ids(filterLines(R, { ...EMPTY, partnerBizNo: '101-81' }))).toEqual(['F2']);
    expect(ids(filterLines(R, { ...EMPTY, partnerBizNo: '1' }))).toEqual(['F1', 'F2']);
    expect(ids(filterLines(R, { ...EMPTY, partnerBizNo: '-' }))).toHaveLength(3);   // 숫자 없는 입력 = 무시
  });
});

describe('더미 불변식', () => {
  const today = '2026-10-29';
  const rows = demoSearchLines(today);
  const journals = demoJournals(today);
  it('라인 수 = 원장 분개 라인 합, id·분개번호 고유', () => {
    expect(rows).toHaveLength(journals.reduce((n, j) => n + j.lines.length, 0));
    expect(new Set(ids(rows)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.journalNo)).size).toBe(rows.length);
  });
  it('분개번호 = 전표번호-라인번호, 원 전표와 필드 일치', () => {
    for (const r of rows) {
      expect(r.journalNo.startsWith(r.slipNo + '-')).toBe(true);
      expect(r.journal.slipNo).toBe(r.slipNo);
      expect(r.journal.slipKind).toBe(r.slipKind);   // 목록·상세 전표구분 일치
      expect(r.writtenDate).toBe(r.journal.writtenDate);
    }
  });
  it('전표별 차변 합 = 대변 합', () => {
    for (const j of journals) {
      const ls = rows.filter((r) => r.slipNo === j.slipNo);
      const t = lineTotals(ls.map((r) => ({ ...j.lines[0], debit: r.debit, credit: r.credit })));
      expect(t.debit).toBe(t.credit);
    }
  });
  it('외화 전표 — 통화·환율·외화금액 일관(원화 ≈ 외화 × 환율), 원화 전표는 외화 필드 null, 당월에 1건 이상', () => {
    const fx = rows.filter((r) => r.journal.currency !== BASE_CURRENCY);
    expect(new Set(fx.map((r) => r.slipNo)).size).toBeGreaterThanOrEqual(3);
    for (const r of rows) {
      const j = r.journal;
      expect(CURRENCIES).toContain(j.currency);
      if (j.currency === BASE_CURRENCY) {
        expect(j.exchangeRate).toBeNull(); expect(j.foreignAmount).toBeNull();
      } else {
        expect(j.exchangeRate).not.toBeNull(); expect(j.foreignAmount).not.toBeNull();
        expect(Math.abs(j.foreignAmount! * j.exchangeRate! - j.amount)).toBeLessThanOrEqual(j.exchangeRate! * 0.01);
      }
    }
    const month = filterLines(rows, defaultSearchFilter(today));
    expect(month.some((r) => r.journal.foreignAmount != null)).toBe(true);
    expect(filterLines(rows, { ...defaultSearchFilter(today), foreignAmountMin: '1000' }).length).toBeGreaterThan(0);
  });
  it('증빙미첨부사유 — 증빙미첨부 전표 일부에만, 당월에 1건 이상', () => {
    for (const r of rows) if (r.noEvidenceReason) expect(r.journal.noEvidence).toBe(true);
    expect(rows.some((r) => r.journal.noEvidence && !r.noEvidenceReason)).toBe(true);   // 일부만
    expect(filterLines(rows, defaultSearchFilter(today)).some((r) => r.noEvidenceReason)).toBe(true);
  });
  it('거래처 사업자등록번호 — 숫자 10자리, 거래처 없거나 개인이면 빈 값, 당월에 1건 이상', () => {
    for (const r of rows) {
      const p = PARTNERS.find((x) => x.name === r.partner);
      if (!p || p.kind === '개인') expect(r.partnerBizNo).toBe('');
      else expect(r.partnerBizNo).toMatch(/^\d{10}$/);
    }
    expect(filterLines(rows, defaultSearchFilter(today)).some((r) => r.partnerBizNo)).toBe(true);
  });
  it('코드값 도메인', () => {
    for (const r of rows) {
      expect(FUND_ACCOUNTS).toContain(r.fundAccount);
      expect(JOURNAL_ORIGINS).toContain(r.origin);
      expect(SEARCH_SLIP_KINDS).toContain(r.slipKind);
      expect(PL_DEPTS).toContain(r.dept);
    }
    for (const k of SEARCH_SLIP_KINDS) expect(rows.some((r) => r.slipKind === k)).toBe(true);
  });
});
