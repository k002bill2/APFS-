/* 자금일보(ACC-021) 모델 테스트 — slide 17 규칙 1~4 · slide 18 · slide 12 상신 규칙 · slide 14 결재라인조회 규칙 */
import { describe, it, expect } from 'vitest';
import { DEMO_TODAY, FUNDS_ACCOUNT_TYPES, demoBankAccounts, demoCashTxns } from './funds_data';
import type { BankAccount } from './funds_data';
import { APPROVAL_USERS, DEFAULT_LINE_SEED } from './daily_cash_data';
import {
  MSG, NONGAN, TOTAL_TITLE, accountTypeOptions, buildGridRows, assignSlot, changeDate, dailyCashReport, defaultFilter, emptyLine, isListed,
  searchUsers, slotTaken, validateBaseDate, validateSubmit, visibleTypes, draftTitle, pdfName, xlsxName,
} from './daily_cash_model';

const accounts = demoBankAccounts();
const txns = demoCashTxns(accounts);
const sumRows = (rows: { opening: number; increase: number; decrease: number; closing: number }[]) => rows.reduce(
  (s, r) => ({ opening: s.opening + r.opening, increase: s.increase + r.increase, decrease: s.decrease + r.decrease, closing: s.closing + r.closing }),
  { opening: 0, increase: 0, decrease: 0, closing: 0 });

describe('기준일자', () => {
  it('기본 = 데모 오늘 · 계정구분 전체', () => {
    expect(defaultFilter()).toEqual({ date: DEMO_TODAY, accountType: '' });
  });
  it('미래 일자 = 오류 문구, 오늘·과거 = 정상, 미입력 = 필수', () => {
    expect(validateBaseDate('2026-11-06')).toBe(MSG.future);
    expect(MSG.future).toBe('기준일자는 오늘 이후로 선택할 수 없습니다.');
    expect(validateBaseDate(DEMO_TODAY)).toBeNull();
    expect(validateBaseDate('2024-06-30')).toBeNull();
    expect(validateBaseDate('')).toBe(MSG.required);
  });
  it('미래 일자는 0건', () => {
    const r = dailyCashReport(accounts, txns, { date: '2027-01-01', accountType: '' });
    expect(r.sections).toEqual([]);
    expect(r.rowCount).toBe(0);
  });
});

describe('농안기금 2024년까지만', () => {
  it('계정구분 옵션 — 2024 = 4종, 2025 = 농안기금 제외', () => {
    expect(accountTypeOptions('2024-12-31')).toEqual([...FUNDS_ACCOUNT_TYPES]);
    expect(accountTypeOptions('2025-01-01')).not.toContain(NONGAN);
    expect(accountTypeOptions('2025-01-01')).toHaveLength(3);
  });
  it('농안기금 선택 중 2025년 이후로 바꾸면 전체로 되돌린다', () => {
    expect(changeDate({ date: '2024-05-01', accountType: NONGAN }, '2025-03-01')).toEqual({ date: '2025-03-01', accountType: '' });
    expect(changeDate({ date: '2024-05-01', accountType: NONGAN }, '2024-07-01').accountType).toBe(NONGAN);
    expect(changeDate({ date: '2024-05-01', accountType: '수산투자계정' }, '2026-01-01').accountType).toBe('수산투자계정');
  });
  it('2024 기준일 = 4섹션 · 합계에 농안기금 포함', () => {
    const r = dailyCashReport(accounts, txns, { date: '2024-06-28', accountType: '' });
    expect(r.sections.map((s) => s.type)).toEqual([...FUNDS_ACCOUNT_TYPES]);
    const nongan = r.sections.find((s) => s.type === NONGAN)!;
    expect(nongan.rows.length).toBeGreaterThan(0);
    expect(r.total).toEqual(sumRows(r.sections.map((s) => s.subtotal)));
  });
  it('2025년 이후 기준일 = 3섹션 · 농안기금 집계 제외', () => {
    const r = dailyCashReport(accounts, txns, { date: DEMO_TODAY, accountType: '' });
    expect(r.sections.map((s) => s.type)).not.toContain(NONGAN);
    expect(r.sections).toHaveLength(3);
    expect(r.total).toEqual(sumRows(r.sections.map((s) => s.subtotal)));
  });
  it('계정구분 필터 = 그 섹션 하나, 2025+ 농안기금 필터 = 0섹션', () => {
    expect(visibleTypes({ date: DEMO_TODAY, accountType: '수산투자계정' })).toEqual(['수산투자계정']);
    expect(visibleTypes({ date: DEMO_TODAY, accountType: NONGAN })).toEqual([]);
  });
});

describe('자금시재표 행·금액', () => {
  it('마감시재 = 기초시재 + 입금 − 출금 (행·소계·합계)', () => {
    for (const date of ['2024-06-28', '2026-11-04', DEMO_TODAY]) {
      const r = dailyCashReport(accounts, txns, { date, accountType: '' });
      for (const s of r.sections) {
        for (const row of s.rows) expect(row.closing).toBe(row.opening + row.increase - row.decrease);
        expect(s.subtotal).toEqual(sumRows(s.rows));
        expect(s.subtotal.closing).toBe(s.subtotal.opening + s.subtotal.increase - s.subtotal.decrease);
      }
      expect(r.total.closing).toBe(r.total.opening + r.total.increase - r.total.decrease);
    }
  });
  it('데모 오늘 = 운영 보통예금에 당일 입금·출금이 있다', () => {
    const r = dailyCashReport(accounts, txns, { date: DEMO_TODAY, accountType: '' });
    const row = r.sections[0].rows.find((x) => x.subject === '보통예금')!;
    expect(row.increase).toBeGreaterThan(0);
    expect(row.decrease).toBeGreaterThan(0);
  });
  it('개설 전 계좌는 빠진다(2024 기준일에 2025·2026 개설 정기예금 없음)', () => {
    const r = dailyCashReport(accounts, txns, { date: '2024-06-28', accountType: '' });
    const ids = r.sections.flatMap((s) => s.rows.map((x) => x.id));
    const later = accounts.filter((a) => a.openDate > '2024-06-28').map((a) => a.id);
    expect(later.length).toBeGreaterThan(0);
    for (const id of later) expect(ids).not.toContain(id);
  });
  it('만기 해지 후 잔액 0 계좌는 빠지고, 만기 없는 사용 계좌는 잔액 0 이어도 남는다', () => {
    const acc = (p: Partial<BankAccount>) => ({ ...accounts[0], ...p });
    const zero = { opening: 0, increase: 0, decrease: 0, closing: 0 };
    expect(isListed(acc({ active: true, maturityDate: '2026-07-01' }), zero, DEMO_TODAY)).toBe(false);
    expect(isListed(acc({ active: true, maturityDate: '' }), zero, DEMO_TODAY)).toBe(true);
    expect(isListed(acc({ active: false, maturityDate: '' }), zero, DEMO_TODAY)).toBe(false);
    expect(isListed(acc({ active: false, maturityDate: '' }), { ...zero, opening: 5, closing: 5 }, DEMO_TODAY)).toBe(true);
    expect(isListed(acc({ openDate: '2027-01-01' }), zero, DEMO_TODAY)).toBe(false);
  });
  it('만기일 없음 = null(표시 -)', () => {
    const r = dailyCashReport(accounts, txns, { date: DEMO_TODAY, accountType: '' });
    expect(r.sections[0].rows.find((x) => x.subject === '보통예금')!.maturityDate).toBeNull();
  });
  it('거래·계좌가 없는 기준일 = 0건', () => {
    const r = dailyCashReport([], [], { date: DEMO_TODAY, accountType: '' });
    expect(r.rowCount).toBe(0);
    expect(r.sections.every((s) => s.rows.length === 0)).toBe(true);
    expect(MSG.empty).toBe('조회된 데이터가 없습니다');
  });
});

describe('결재라인', () => {
  const [u1, u2] = APPROVAL_USERS;
  it('합의선만 있으면 상신 불가 · 결재선 1명 이상이면 가능', () => {
    expect(validateSubmit(emptyLine())).toBe('결재선을 지정해 주세요.');
    expect(validateSubmit(assignSlot(emptyLine(), 'agreement', 1, u1))).toBe(MSG.noLine);
    expect(validateSubmit(assignSlot(emptyLine(), 'approval', 2, u1))).toBeNull();
    expect(validateSubmit(DEFAULT_LINE_SEED)).toBeNull();
  });
  it('지정 단계가 다른 사용자로 차 있으면 확인 대상, 같은 사용자·빈 칸은 아님', () => {
    const l = assignSlot(emptyLine(), 'approval', 1, u1);
    expect(slotTaken(l, 'approval', 1, u2)).toBe(true);
    expect(slotTaken(l, 'approval', 1, u1)).toBe(false);
    expect(slotTaken(l, 'approval', 2, u2)).toBe(false);
    expect(slotTaken(l, 'agreement', 1, u2)).toBe(false);
  });
  it('assignSlot 은 원본을 바꾸지 않고 교체한다', () => {
    const l = assignSlot(emptyLine(), 'approval', 1, u1);
    const n = assignSlot(l, 'approval', 1, u2);
    expect(l.approval[0]).toBe(u1);
    expect(n.approval[0]).toBe(u2);
    expect(assignSlot(n, 'approval', 1, null).approval[0]).toBeNull();
  });
  it('사용자 검색 — 부서 + 성명/아이디 부분 일치', () => {
    expect(searchUsers(APPROVAL_USERS, '자금관리팀', '').every((u) => u.dept === '자금관리팀')).toBe(true);
    expect(searchUsers(APPROVAL_USERS, '', '김결').map((u) => u.id)).toEqual(['2015001']);
    expect(searchUsers(APPROVAL_USERS, '', '2012004').map((u) => u.name)).toEqual(['최협조']);
    expect(searchUsers(APPROVAL_USERS, '회계팀', '김결')).toEqual([]);
    expect(searchUsers(APPROVAL_USERS, '', '  ')).toHaveLength(APPROVAL_USERS.length);
  });
});

describe('문구·파일명', () => {
  it('제목·첨부·엑셀 파일명', () => {
    expect(draftTitle('2026-11-05')).toBe('자금일보 (2026-11-05)');
    expect(pdfName('2026-11-05')).toBe('자금일보_2026-11-05.pdf');
    expect(xlsxName('2026-11-05')).toBe('자금일보_2026-11-05.xlsx');
  });
});

describe('화면 그리드 행(한 표)', () => {
  const pick = (rows: ReturnType<typeof buildGridRows>['rows'], kind: string) => rows.filter((r) => r.kind === kind);
  it('제목 행 순서 = 표시 계정구분 순서, 각 계정구분 = 제목 → 계좌(또는 빈 안내) → 소계', () => {
    const f = { date: '2024-06-30', accountType: '' as const };
    const report = dailyCashReport(accounts, txns, f);
    const { rows } = buildGridRows(report, true);
    expect(pick(rows, 'title').map((r) => r.subject)).toEqual(visibleTypes(f));
    expect(pick(rows, 'title').map((r) => r.subject)).toContain(NONGAN);
    let i = 0;
    for (const s of report.sections) {
      expect(rows[i]).toMatchObject({ kind: 'title', subject: s.type });
      i++;
      const n = Math.max(1, s.rows.length);
      const body = rows.slice(i, i + n);
      if (s.rows.length) expect(body.map((r) => r.id)).toEqual(s.rows.map((r) => r.id));
      else expect(body).toEqual([expect.objectContaining({ kind: 'empty', subject: MSG.empty })]);
      i += n;
      expect(rows[i]).toMatchObject({ kind: 'subtotal', subject: '소계', ...s.subtotal });
      i++;
    }
    expect(i).toBe(rows.length);
  });
  it('계좌 행 수 = rowCount, 소계 = 섹션 계좌 합', () => {
    const report = dailyCashReport(accounts, txns, defaultFilter());
    const { rows } = buildGridRows(report, true);
    expect(pick(rows, 'account')).toHaveLength(report.rowCount);
    for (const s of report.sections) {
      const sub = rows.find((r) => r.id === `subtotal-${s.type}`);
      expect(sub).toMatchObject(sumRows(s.rows));
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);   // getRowId 충돌 없음
  });
  it('2025년 이후 = 농안기금 제목·행 없음', () => {
    const { rows } = buildGridRows(dailyCashReport(accounts, txns, { date: '2025-03-31', accountType: '' }), true);
    expect(pick(rows, 'title').map((r) => r.subject)).not.toContain(NONGAN);
    expect(rows.some((r) => r.id.includes(NONGAN))).toBe(false);
  });
  it('고정 하단 합계 = 계정구분 전체일 때만, 값 = report.total', () => {
    const all = dailyCashReport(accounts, txns, defaultFilter());
    expect(buildGridRows(all, true).pinned).toEqual([expect.objectContaining({ kind: 'total', subject: TOTAL_TITLE, ...all.total })]);
    const one = dailyCashReport(accounts, txns, { date: DEMO_TODAY, accountType: FUNDS_ACCOUNT_TYPES[0] });
    expect(buildGridRows(one, false).pinned).toEqual([]);
    expect(pick(buildGridRows(one, false).rows, 'title')).toHaveLength(1);
  });
  it('0건(미래 일자 포함) = 행·고정 행 없음 → 빈 상태 오버레이', () => {
    expect(buildGridRows(dailyCashReport(accounts, txns, { date: '2027-01-01', accountType: '' }), true)).toEqual({ rows: [], pinned: [] });
  });
});
