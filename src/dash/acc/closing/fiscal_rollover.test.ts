/* 회기생성/전기이월(ACC-016) 순수 모델 — 날짜 계산·회기 생성·연마감 게이트·셀 편집 연동·저장 검증·필터. */
import { describe, it, expect } from 'vitest';
import {
  addDays, addYears, oneYearEnd, isValidDate, createFirstFiscal, accountsWithoutFiscal, DUP_FISCAL_MSG,
  yearEndClose, closeGate, closeConfirmText, closeBlockedMessage, applyCloseEndEdit, applyCarryEndEdit, editRow,
  validateEdits, commitEdits, reloadRows, changedCount, passesFilter, overlapsYear, fiscalId,
} from './fiscal_rollover_model';
import type { FiscalRow } from './fiscal_rollover_model';
import { demoFiscalRows, FUND_ACCOUNTS } from './fiscal_rollover_data';

const TODAY = '2026-11-04';
const rows = () => demoFiscalRows(TODAY);
const [FUND, INVEST, SEA] = FUND_ACCOUNTS;
const byId = (rs: readonly FiscalRow[], id: string) => rs.find((r) => r.id === id)!;
const open3 = fiscalId(FUND, 3), open2 = fiscalId(INVEST, 2);

describe('날짜 계산(문자열 · 타임존 무관)', () => {
  it.each([
    ['2026-01-31', '2026-02-01'], ['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-01'], ['2027-02-28', '2027-03-01'], ['2026-04-30', '2026-05-01'],
  ])('%s + 1일 = %s', (a, b) => { expect(addDays(a, 1)).toBe(b); });
  it('음수 일수·연도 경계', () => { expect(addDays('2027-01-01', -1)).toBe('2026-12-31'); expect(addDays('2028-03-01', -1)).toBe('2028-02-29'); });
  it('n년 뒤 — 2-29 는 평년이면 2-28', () => { expect(addYears('2028-02-29', 1)).toBe('2029-02-28'); expect(addYears('2026-03-15', 1)).toBe('2027-03-15'); });
  it('1년 기간 끝 = 시작 + 1년 - 1일', () => { expect(oneYearEnd('2027-01-01')).toBe('2027-12-31'); expect(oneYearEnd('2027-03-16')).toBe('2028-03-15'); });
  it('1년 기간 끝 — 윤일 시작(2028-02-29)은 2029-02-28 · 평년 2-28 시작은 다음 해 2-27 · 무효는 빈 값', () => {
    expect(oneYearEnd('2028-02-29')).toBe('2029-02-28');
    expect(oneYearEnd('2027-02-28')).toBe('2028-02-27');
    expect(oneYearEnd('2027-03-01')).toBe('2028-02-29');
    expect(oneYearEnd('')).toBe('');
  });
  it('없는 날짜·빈 값 거부(NaN 을 만들지 않는다)', () => {
    expect(isValidDate('2027-02-29')).toBe(false); expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false); expect(isValidDate('')).toBe(false);
    expect(addDays('', 1)).toBe(''); expect(addDays('2027-02-30', 1)).toBe('');
  });
});

describe('더미 데이터', () => {
  it('계정구분 3개 중 1개는 회기가 없다(회기 생성 데모)', () => {
    expect(accountsWithoutFiscal(rows(), FUND_ACCOUNTS)).toEqual([SEA]);
  });
  it('마감 여·부 행이 모두 있고 진행 중 행이 당해년도에 걸친다', () => {
    const rs = rows();
    expect(rs.some((r) => r.closed === '여')).toBe(true);
    expect(rs.filter((r) => r.closed === '부').every((r) => overlapsYear(r, '2026'))).toBe(true);
    expect(byId(rs, open2).unapprovedCount).toBeGreaterThan(0);
  });
});

describe('E11 회기 생성(최초 1기)', () => {
  it('1기 — 종료일 = 시작 연도 12-31, 이월 2기 = 다음해 1년', () => {
    const { rows: out, row } = createFirstFiscal(rows(), SEA, '2026-03-15');
    expect(out).toHaveLength(6);
    expect(row).toMatchObject({ account: SEA, term: 1, closeStart: '2026-03-15', closeEnd: '2026-12-31', closed: '부', carryTerm: 2, carryStart: '2027-01-01', carryEnd: '2027-12-31', fresh: true });
  });
  it('이미 회기가 있는 계정구분은 거부', () => {
    expect(() => createFirstFiscal(rows(), FUND, '2026-01-01')).toThrow(DUP_FISCAL_MSG);
  });
  it('계정구분·시작일 필수', () => {
    expect(() => createFirstFiscal(rows(), '', '2026-01-01')).toThrow();
    expect(() => createFirstFiscal(rows(), SEA, '')).toThrow();
  });
});

describe('E03 연마감', () => {
  it('마감 \'여\' + 바로 아래 다음 회기 자동 생성', () => {
    const { rows: out, gate } = yearEndClose(rows(), [open3], { includeUnapproved: false });
    expect(gate.ok).toEqual([open3]);
    expect(byId(out, open3).closed).toBe('여');
    const i = out.findIndex((r) => r.id === open3);
    expect(out[i + 1]).toMatchObject({ account: FUND, term: 4, closeStart: '2027-01-01', closeEnd: '2027-12-31', closed: '부', carryTerm: 5, carryStart: '2028-01-01', carryEnd: '2028-12-31', fresh: true });
  });
  it('이월기간종료일이 편집(저장)된 경우 — 다음 이월기간 = 그 다음날부터 1년', () => {
    const rs = rows().map((r) => (r.id === open3 ? { ...r, carryEnd: '2027-06-30' } : r));
    const { rows: out } = yearEndClose(rs, [open3], { includeUnapproved: false });
    expect(byId(out, fiscalId(FUND, 4))).toMatchObject({ closeStart: '2027-01-01', closeEnd: '2027-06-30', carryStart: '2027-07-01', carryEnd: '2028-06-30' });
  });
  it('[연마감]은 미결재 행을 건너뛰고, [연마감(미결재포함)]은 통과', () => {
    const a = yearEndClose(rows(), [open3, open2], { includeUnapproved: false });
    expect(a.gate).toMatchObject({ ok: [open3], unapproved: 1, closed: 0, dirty: 0 });
    expect(byId(a.rows, open2).closed).toBe('부');
    const b = yearEndClose(rows(), [open3, open2], { includeUnapproved: true });
    expect(b.gate.ok).toEqual([open3, open2]);
    expect(byId(b.rows, fiscalId(INVEST, 3))).toBeTruthy();
  });
  it('이미 마감된 행은 건너뛴다(게이트 필터형)', () => {
    const g = closeGate(rows(), [fiscalId(FUND, 1), open3], { includeUnapproved: false });
    expect(g).toMatchObject({ ok: [open3], closed: 1 });
  });
  it('저장 안 한 편집(U) 행은 건너뛴다', () => {
    const rs = editRow(rows(), open3, 'carryEnd', '2027-11-30');
    const g = closeGate(rs, [open3], { includeUnapproved: true });
    expect(g).toMatchObject({ ok: [], dirty: 1 });
    expect(closeBlockedMessage(g)).toMatch(/\[저장\] 후 연마감/);
  });
  it('처리 0건 안내 — 사유별', () => {
    expect(closeBlockedMessage(closeGate(rows(), [open2], { includeUnapproved: false }))).toBe('미결재 전표가 있어 연마감할 수 없습니다. 연마감(미결재포함)을 사용하세요.');
    expect(closeBlockedMessage(closeGate(rows(), [fiscalId(FUND, 1)], { includeUnapproved: false }))).toBe('이미 마감된 회기입니다.');
  });
  it('입력 배열을 바꾸지 않는다', () => {
    const rs = rows();
    yearEndClose(rs, [open3], { includeUnapproved: false });
    expect(byId(rs, open3).closed).toBe('부');
    expect(rs).toHaveLength(5);
  });
  it('확인 문구 — 설계서 원문 / N건 중 K건', () => {
    expect(closeConfirmText(2, 2, false)).toBe('선택한 2건을 연마감하시겠습니까?');
    expect(closeConfirmText(2, 2, true)).toBe('선택한 2건을 미결재 건을 포함하여 연마감하시겠습니까?');
    expect(closeConfirmText(3, 1, false)).toBe('선택한 3건 중 연마감 가능한 1건을 연마감하시겠습니까?');
  });
});

describe('셀 편집', () => {
  it('마감기간종료일 수정 → 이월기간시작일 = +1일, U 표시', () => {
    const r = applyCloseEndEdit(byId(rows(), open3), '2026-06-30');
    expect(r).toMatchObject({ closeEnd: '2026-06-30', carryStart: '2026-07-01', status: 'U', edited: ['closeEnd'] });
  });
  it('월말·윤년 경계', () => {
    expect(applyCloseEndEdit(byId(rows(), open3), '2028-02-28').carryStart).toBe('2028-02-29');
    expect(applyCloseEndEdit(byId(rows(), open3), '2026-12-31').carryStart).toBe('2027-01-01');
  });
  it('해제(빈 값) → 이월기간시작일도 빈 값', () => {
    expect(applyCloseEndEdit(byId(rows(), open3), '').carryStart).toBe('');
  });
  it('이월기간종료일은 입력값 그대로', () => {
    expect(applyCarryEndEdit(byId(rows(), open3), '2027-11-30')).toMatchObject({ carryEnd: '2027-11-30', status: 'U', edited: ['carryEnd'] });
  });
  it('마감(\'여\') 행은 편집 불가', () => {
    const closed = byId(rows(), fiscalId(FUND, 1));
    expect(applyCloseEndEdit(closed, '2024-06-30')).toBe(closed);
    expect(applyCarryEndEdit(closed, '2025-06-30')).toBe(closed);
  });
});

describe('E02 저장 검증', () => {
  it('변경 없음 = 0건', () => { expect(changedCount(rows())).toBe(0); });
  it('정상 편집은 통과', () => {
    const v = validateEdits(editRow(rows(), open3, 'closeEnd', '2026-06-30'));
    expect(v.invalid).toBe(0);
  });
  it('마감기간종료일 < 시작일 · 이월기간종료일 < 이월기간시작일 → 위반 셀', () => {
    let rs = editRow(rows(), open3, 'closeEnd', '2025-12-31');          // 시작 2026-01-01 보다 앞
    rs = editRow(rs, open2, 'carryEnd', '2026-12-31');                   // 이월시작 2027-01-01 보다 앞
    const v = validateEdits(rs);
    expect(v.invalid).toBe(2);
    expect(v.cells).toEqual([{ id: open3, field: 'closeEnd' }, { id: open2, field: 'carryEnd' }]);
    expect(byId(v.rows, open3).err).toEqual(['closeEnd']);
  });
  it('마감기간종료일을 늦추면 이월기간종료일이 이월기간시작일보다 앞설 수 있다 → 이월기간종료일 위반', () => {
    const v = validateEdits(editRow(rows(), open3, 'closeEnd', '2028-01-15'));   // 이월시작 2028-01-16 > 이월종료 2027-12-31
    expect(v.cells).toEqual([{ id: open3, field: 'carryEnd' }]);
  });
  it('빈 값은 위반', () => {
    const v = validateEdits(editRow(rows(), open3, 'closeEnd', ''));
    expect(v.cells.map((c) => c.field)).toEqual(['closeEnd', 'carryEnd']);
  });
  it('위반 셀을 고치면 그 칸 오류 표시가 지워진다', () => {
    const v = validateEdits(editRow(rows(), open3, 'carryEnd', '2026-01-01'));
    expect(byId(v.rows, open3).err).toEqual(['carryEnd']);
    expect(byId(editRow(v.rows, open3, 'carryEnd', '2027-12-31'), open3).err).toBeUndefined();
  });
  it('저장 반영 = 상태·편집 표시 초기화', () => {
    const c = commitEdits(editRow(rows(), open3, 'closeEnd', '2026-06-30'));
    expect(byId(c, open3)).toMatchObject({ status: '', closeEnd: '2026-06-30', carryStart: '2026-07-01' });
    expect(byId(c, open3).edited).toBeUndefined();
  });
  it('조회 = 저장본 재로딩(방금 생긴 행 표시 해제)', () => {
    const { rows: out } = createFirstFiscal(rows(), SEA, '2026-01-01');
    expect(reloadRows(out).every((r) => !r.fresh && r.status === '')).toBe(true);
  });
});

describe('E01 상세필터', () => {
  it('기준년도 = 마감기간이 그 연도에 걸친 행', () => {
    const shown = rows().filter(passesFilter({ year: '2026', account: '' }));
    expect(shown.map((r) => r.id)).toEqual([open3, open2]);
    expect(rows().filter(passesFilter({ year: '2025', account: '' })).map((r) => r.term)).toEqual([2, 1]);
  });
  it('계정구분 일치 · 빈 조건 = 전체', () => {
    expect(rows().filter(passesFilter({ year: '', account: INVEST })).every((r) => r.account === INVEST)).toBe(true);
    expect(rows().filter(passesFilter({ year: '', account: '' }))).toHaveLength(5);
  });
  it('연마감으로 생긴 다음 회기(다음 해)·편집 중인 행은 조건과 무관하게 보인다', () => {
    const { rows: out } = yearEndClose(rows(), [open3], { includeUnapproved: false });
    const next = byId(out, fiscalId(FUND, 4));
    expect(passesFilter({ year: '2026', account: INVEST })(next)).toBe(true);
    const edited = byId(editRow(rows(), open3, 'closeEnd', '2026-06-30'), open3);
    expect(passesFilter({ year: '2020', account: '' })(edited)).toBe(true);
  });
});
