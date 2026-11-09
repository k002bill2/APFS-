/* 계좌관리(ACC-019) 모델 — 조사 · 저장/임시저장 검증 순서 · 만기일 N개월(월말 보정) · 상세필터 7조건 · 채번 · 논리삭제 · 폼 변환 */
import { describe, it, expect } from 'vitest';
import { demoBankAccounts, DEMO_TODAY } from './funds_data';
import { PERIOD_ERROR } from './funds_model';
import {
  EMPTY_FILTER, addMonthsClamp, amountDigits, amountDisplay, deleteAccounts, eulReul, emptyForm, filterBankAccounts, formFromAccount, formSnapshot,
  formToAccount, holderFromAccountType, maturityFromOpen, nextAccountCode, rateText, requiredMsg, validateAccount,
} from './bank_account_model';
import type { BankAccountFilter, BankAccountForm, BankAccountRow } from './bank_account_model';

const rows: BankAccountRow[] = demoBankAccounts();
const f = (p: Partial<BankAccountFilter>): BankAccountFilter => ({ ...EMPTY_FILTER, ...p });
const codes = (rs: readonly BankAccountRow[]) => rs.map((r) => r.code);

describe('조사 을/를', () => {
  it.each([
    ['계정구분', '을'], ['계정과목', '을'], ['거래처', '를'], ['금융기관', '을'], ['계좌번호', '를'], ['개설일', '을'], ['이자율', '을'],
  ])('%s → %s', (w, j) => { expect(eulReul(w)).toBe(j); });
  it('한글이 아니면 을(를)', () => { expect(eulReul('ID')).toBe('을(를)'); expect(eulReul('')).toBe('을(를)'); });
  it('문구', () => { expect(requiredMsg('거래처')).toBe('거래처를 입력하세요.'); expect(requiredMsg('개설일')).toBe('개설일을 입력하세요.'); });
});

describe('저장 검증(slide12 ③)', () => {
  it('빈 폼 저장 = 7개 필수, 화면 순서', () => {
    expect(validateAccount(emptyForm(), 'save').map((e) => e.msg)).toEqual([
      '계정구분을 입력하세요.', '계정과목을 입력하세요.', '거래처를 입력하세요.', '금융기관을 입력하세요.',
      '계좌번호를 입력하세요.', '개설일을 입력하세요.', '이자율을 입력하세요.',
    ]);
  });
  it('하나씩 채우면 첫 오류가 순서대로 넘어간다', () => {
    const steps: [keyof BankAccountForm, string][] = [
      ['accountType', '수산투자계정'], ['subject', '보통예금'], ['partner', '(주)가람팜텍'], ['bank', 'NH농협은행'],
      ['accountNo', '123-4567'], ['openDate', '2026-01-02'], ['rate', '0.4'],
    ];
    let form: BankAccountForm = emptyForm();
    for (const [k, val] of steps) {
      expect(validateAccount(form, 'save')[0].key).toBe(k);
      form = { ...form, [k]: val };
    }
    expect(validateAccount(form, 'save')).toEqual([]);
  });
  it('공백만 입력은 미입력', () => {
    expect(validateAccount({ ...emptyForm(), accountType: '수산투자계정', accountNo: '   ' }, 'draft')[0].key).toBe('accountNo');
  });
  it('임시 저장 = 계정구분·계좌번호만', () => {
    expect(validateAccount(emptyForm(), 'draft').map((e) => e.key)).toEqual(['accountType', 'accountNo']);
    expect(validateAccount({ ...emptyForm(), accountType: '수산투자계정', accountNo: '1' }, 'draft')).toEqual([]);
  });
});

describe('만기일 N개월 — 월말 보정', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'], ['2028-01-31', 1, '2028-02-29'], ['2026-11-30', 3, '2027-02-28'],
    ['2026-05-15', 12, '2027-05-15'], ['2026-08-31', 6, '2027-02-28'], ['2026-03-31', 6, '2026-09-30'], ['2026-01-10', 3, '2026-04-10'],
  ])('%s + %d개월 = %s', (d, n, want) => { expect(addMonthsClamp(d, n)).toBe(want); });
  it('개설일 없으면 개설일 필드 오류', () => {
    expect(maturityFromOpen('', 3)).toEqual({ ok: false, error: { key: 'openDate', msg: '개설일을 입력하세요.' } });
    expect(maturityFromOpen('2026-01-31', 6)).toEqual({ ok: true, value: '2026-07-31' });
  });
  it('[계정구분명상동] — 계정구분 없으면 계정구분 오류', () => {
    expect(holderFromAccountType({ accountType: '' })).toEqual({ ok: false, error: { key: 'accountType', msg: '계정구분을 입력하세요.' } });
    expect(holderFromAccountType({ accountType: '수산투자계정' })).toEqual({ ok: true, value: '수산투자계정' });
  });
});

describe('상세필터 7조건', () => {
  it('조건 없음 = 전체 16건, 계좌코드 오름차순', () => {
    const out = filterBankAccounts([...rows].reverse(), EMPTY_FILTER, DEMO_TODAY);
    expect(out).toHaveLength(16);
    expect(codes(out)).toEqual([...codes(out)].sort());
  });
  it('계정구분', () => {
    const out = filterBankAccounts(rows, f({ accountType: '수산투자계정' }), DEMO_TODAY);
    expect(out).toHaveLength(4);
    expect(out.every((r) => r.accountType === '수산투자계정')).toBe(true);
  });
  it('계정과목명(다중)', () => {
    const out = filterBankAccounts(rows, f({ subjects: ['MMDA', '정기적금'] }), DEMO_TODAY);
    expect(out.map((r) => r.subject).sort()).toEqual(['MMDA', 'MMDA', 'MMDA', '정기적금']);
  });
  it('거래기관(다중)', () => {
    const out = filterBankAccounts(rows, f({ banks: ['KDB산업은행', '한국은행'] }), DEMO_TODAY);
    expect(out).toHaveLength(3);
  });
  it('사용여부', () => {
    expect(filterBankAccounts(rows, f({ use: '부' }), DEMO_TODAY)).toHaveLength(2);
    expect(filterBankAccounts(rows, f({ use: '여' }), DEMO_TODAY)).toHaveLength(14);
  });
  it('개설일 ≥ 값(경계 포함)', () => {
    const out = filterBankAccounts(rows, f({ openFrom: '2025-06-02' }), DEMO_TODAY);
    expect(out.map((r) => r.openDate).sort()).toEqual(['2025-06-02', '2026-01-05']);
  });
  it('만기일 ≤ 값 — 만기일 없는 계좌 제외', () => {
    const out = filterBankAccounts(rows, f({ maturityTo: '2025-01-15' }), DEMO_TODAY);
    expect(out.map((r) => r.maturityDate).sort()).toEqual(['2024-02-01', '2025-01-15']);
  });
  it('만기여부 — 여 = 만기일 < 기준일, 부 = 나머지(만기일 없는 계좌 포함)', () => {
    const yes = filterBankAccounts(rows, f({ matured: '여' }), DEMO_TODAY);
    const no = filterBankAccounts(rows, f({ matured: '부' }), DEMO_TODAY);
    expect(yes.map((r) => r.maturityDate).sort()).toEqual(['2024-02-01', '2025-01-15', '2026-05-02', '2026-07-01']);
    expect(no).toHaveLength(12);
    expect(no.some((r) => r.maturityDate === '')).toBe(true);
  });
  it('개설일 > 만기일 = 기간 오류 · 0건', () => {
    expect(filterBankAccounts(rows, f({ openFrom: '2026-01-01', maturityTo: '2025-12-31' }), DEMO_TODAY)).toEqual([]);
    expect(PERIOD_ERROR).toBe('시작일은 종료일보다 늦을 수 없습니다.');
  });
  it('조건 조합(AND)', () => {
    const out = filterBankAccounts(rows, f({ accountType: '농식품투자계정(농특기금)', subjects: ['정기예금'], use: '여' }), DEMO_TODAY);
    expect(codes(out)).toEqual(['BA-0004']);
  });
});

describe('채번 · 삭제', () => {
  it('발급 최댓값 + 1', () => {
    expect(nextAccountCode(codes(rows))).toBe('BA-0017');
    expect(nextAccountCode([])).toBe('BA-0001');
  });
  it('논리삭제 — 목록에서 빠지고 코드는 재사용하지 않는다', () => {
    const issued = codes(rows);
    const last = rows.find((r) => r.code === 'BA-0016')!;
    const res = deleteAccounts(rows, [last.id, rows[0].id]);
    expect(res.rows).toHaveLength(14);
    expect(codes(res.removed)).toEqual(['BA-0001', 'BA-0016']);
    expect(nextAccountCode(issued)).toBe('BA-0017');   // 발급 이력 기준 — 남은 목록 최댓값(0015)+1 이 아니다
    expect(nextAccountCode(codes(res.rows))).toBe('BA-0016');   // 목록만 보면 재사용된다(그래서 이력을 쓴다)
  });
});

describe('폼 ↔ 행', () => {
  const base = rows[3];
  it('왕복 — 수정은 id·코드·최초등록 보존, 수정자 갱신', () => {
    const out = formToAccount(formFromAccount(base), base, { id: 'x', code: 'BA-9999', user: '데모사용자', now: '2026-11-05 10:00', draft: false });
    expect(out).toMatchObject({ id: base.id, code: base.code, createdBy: base.createdBy, createdAt: base.createdAt, updatedBy: '데모사용자', updatedAt: '2026-11-05 10:00', rate: base.rate, productAmount: base.productAmount });
    expect(out.draft).toBeUndefined();
  });
  it('임시 저장 = draft true · 빈 이자율 null · 정식 저장 = draft 해제', () => {
    const form = { ...emptyForm(), accountType: '수산투자계정' as const, accountNo: '1' };
    const d = formToAccount(form, null, { id: 'n', code: 'BA-0017', user: 'u', now: 't', draft: true });
    expect(d).toMatchObject({ draft: true, rate: null, productAmount: null, bank: '', code: 'BA-0017', createdBy: 'u' });
    expect(formToAccount(formFromAccount(d), d, { id: 'n', code: 'BA-0017', user: 'u', now: 't2', draft: false }).draft).toBeUndefined();
  });
  it('스냅샷 — 첨부 CSV 표기·연동정보 순서 차이는 변경 아님', () => {
    const a = formFromAccount(rows[12]);
    expect(formSnapshot({ ...a, attachments: a.attachments.replace(/, /g, ',') + ', ', links: [...a.links].reverse() })).toBe(formSnapshot(a));
    expect(formSnapshot({ ...a, alias: 'x' })).not.toBe(formSnapshot(a));
  });
  it('금액 입력·이자율 표시', () => {
    expect(amountDigits('1,500,000원')).toBe('1500000');
    expect(amountDigits('007')).toBe('7');
    expect(amountDisplay('1500000')).toBe('1,500,000');
    expect(amountDisplay('')).toBe('');
    expect(rateText(0.4)).toBe('0.40');
    expect(rateText(null)).toBe('-');
  });
});
