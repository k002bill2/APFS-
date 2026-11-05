/* 결산전표 관리(ACC-015) — 업무 규칙(closing_journal_model)·더미(closing_journal_data)·완화 검증(validateEntry closing) */
import { describe, it, expect } from 'vitest';
import { APPROVAL_STATUSES, lineTotals } from '../slip/general_journal_data';
import type { JournalLine, JournalRow } from '../slip/general_journal_data';
import { CLOSING_ORIGIN_MSG, CLOSING_WDATE_MSG, ENTRY_MSG, EMPTY_DETAIL, defaultPeriod, emptyLine, filterJournals, validateEntry } from '../slip/general_journal_model';
import type { EntryLine } from '../slip/general_journal_model';
import {
  CLOSING_ORIGINS, REVERSAL_PREFIX, closingDeleteGate, closingVisibleIds, commitClosing, deleteClosing, expandPairs, nextDay, pairOf, reversalOf, submitClosing,
} from './closing_journal_model';
import type { ClosingRow } from './closing_journal_model';
import { demoClosingJournals } from './closing_journal_data';

const TODAY = '2026-11-04';
const ln = (code: string, debit: number | null, credit: number | null): JournalLine => ({
  accountCode: code, accountName: '-', memo: '테스트', mgmtNo: '-', partner: '-', accountNo: '-', debit, credit,
});
const draft = (over: Partial<JournalRow> = {}): JournalRow => ({
  id: '', fundAccount: '농림수산식품모태펀드(기금)', slipDate: '2026-09-30', seq: '', memo: '미수이자 가결산', amount: 1000000, partner: '-',
  approval: '미상신', attachments: ['a.pdf'], writer: '김민준', origin: '가결산', slipNo: '', fundDueDate: '2026-10-10', createdBy: '김민준', updatedBy: '김민준',
  writtenDate: '2026-09-30', slipKind: '정상', evidenceType: '', storage: '-', noEvidence: false, currency: '대한민국(원)', exchangeRate: null, foreignAmount: null,
  plDept: '-', plEmployee: '-', lines: [ln('1100300', 1000000, null), ln('4100100', null, 1000000)], ...over,
});

describe('nextDay — 환원전표 전표일 = 원전표 다음날', () => {
  it.each([
    ['2026-09-30', '2026-10-01'], ['2026-12-31', '2027-01-01'], ['2026-02-28', '2026-03-01'], ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01'],
  ])('%s → %s', (a, b) => expect(nextDay(a)).toBe(b));
  it.each(['', '2026-13-01', '2026-02-30', 'abc'])('무효 입력 %j → 빈 값(throw 없음)', (a) => expect(nextDay(a)).toBe(''));
});

describe('reversalOf — 차대 반대 분개', () => {
  const orig = { ...draft(), id: 'cj-001', seq: '001', slipNo: '20260930-001' };
  const rev = reversalOf(orig, { id: 'cj-002', seq: '001', createdBy: '김민준' });
  it('차변↔대변 교환 · 합계 같음 · 금액 = 원전표 금액', () => {
    expect(rev.lines.map((l) => [l.debit, l.credit])).toEqual([[null, 1000000], [1000000, null]]);
    const t = lineTotals(rev.lines);
    expect(t.debit).toBe(t.credit);
    expect(rev.amount).toBe(orig.amount);
  });
  it('발생구분·전표일·전표번호·연결·적요 접두·첨부/자금집행 미복사', () => {
    expect(rev.origin).toBe('가결산(환원)');
    expect(rev.slipDate).toBe('2026-10-01');
    expect(rev.slipNo).toBe('20260930-001-R');
    expect(rev.pairId).toBe('cj-001');
    expect(rev.memo.startsWith(REVERSAL_PREFIX)).toBe(true);
    expect(rev.attachments).toEqual([]);
    expect(rev.fundDueDate).toBe('-');
  });
});

describe('commitClosing — 저장 결과', () => {
  it('가결산 신규 = 원전표 + 환원전표 2건(원전표 바로 뒤), 저장 결과 = 원전표', () => {
    const { rows, saved } = commitClosing([], draft());
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(saved);
    expect(saved.origin).toBe('가결산');
    expect(saved.pairId).toBeNull();
    expect(rows[1].origin).toBe('가결산(환원)');
    expect(rows[1].pairId).toBe(saved.id);
    expect(rows[1].slipNo).toBe(saved.slipNo + '-R');
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });
  it('결산 신규 = 1건', () => {
    const { rows } = commitClosing([], draft({ origin: '결산' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].origin).toBe('결산');
  });
  it('저장 후 상신 = 쌍 모두 상신', () => {
    const { rows } = commitClosing([], draft(), { submit: true });
    expect(rows.map((r) => r.approval)).toEqual(['상신', '상신']);
  });
  it('순번 — 같은 전표일 기존 건 뒤로 채번', () => {
    const a = commitClosing([], draft({ origin: '결산', slipDate: '2026-10-01' })).rows;
    const b = commitClosing(a, draft()).rows;
    const rev = b.find((r) => r.origin === '가결산(환원)')!;
    expect(rev.slipDate).toBe('2026-10-01');
    expect(rev.seq).toBe('002');
  });

  describe('원전표 수정 저장 — 환원전표 동기화', () => {
    const first = commitClosing([], draft());
    const origId = first.saved.id;
    const revId = first.rows[1].id;
    it('가결산 → 가결산: 금액·분개 재생성, 환원 id 유지', () => {
      const edited = { ...first.saved, lines: [ln('1100300', 2500000, null), ln('4100100', null, 2500000)], amount: 2500000 };
      const { rows } = commitClosing(first.rows, edited);
      expect(rows).toHaveLength(2);
      const rev = rows.find((r) => r.id === revId)!;
      expect(rev.amount).toBe(2500000);
      expect(rev.lines.map((l) => [l.debit, l.credit])).toEqual([[null, 2500000], [2500000, null]]);
    });
    it('전표일 변경 시 환원 전표일 재계산', () => {
      const { rows } = commitClosing(first.rows, { ...first.saved, slipDate: '2026-12-31' });
      expect(rows.find((r) => r.id === revId)!.slipDate).toBe('2027-01-01');
    });
    it('가결산 → 결산: 환원전표 제거', () => {
      const { rows } = commitClosing(first.rows, { ...first.saved, origin: '결산' });
      expect(rows.map((r) => r.id)).toEqual([origId]);
    });
    it('결산 → 가결산: 환원전표 생성', () => {
      const one = commitClosing([], draft({ origin: '결산' }));
      const { rows } = commitClosing(one.rows, { ...one.saved, origin: '가결산' });
      expect(rows).toHaveLength(2);
      expect(rows[1].pairId).toBe(one.saved.id);
    });
  });
});

/* 쌍 1개(미상신) + 결산(승인) + 결산(반려) */
const fixture = (): ClosingRow[] => {
  let rows = commitClosing([], draft()).rows;
  rows = commitClosing(rows, draft({ origin: '결산', approval: '승인', slipDate: '2026-10-05' })).rows;
  rows = commitClosing(rows, draft({ origin: '결산', approval: '반려', slipDate: '2026-10-06' })).rows;
  return rows;
};

describe('쌍 처리 — 결재상신·삭제', () => {
  const rows = fixture();
  const orig = rows.find((r) => r.origin === '가결산')!;
  const rev = rows.find((r) => r.origin === '가결산(환원)')!;
  const approved = rows.find((r) => r.approval === '승인')!;
  const rejected = rows.find((r) => r.approval === '반려')!;

  it('pairOf — 양방향', () => {
    expect(pairOf(rows, orig)?.id).toBe(rev.id);
    expect(pairOf(rows, rev)?.id).toBe(orig.id);
    expect(pairOf(rows, approved)).toBeNull();
  });
  it.each([['원전표만', () => orig.id], ['환원전표만', () => rev.id]])('%s 골라도 쌍으로 상신', (_n, pick) => {
    const res = submitClosing(rows, [pick()]);
    expect(res.submitted).toBe(2);
    expect(res.rows.filter((r) => r.approval === '상신').map((r) => r.id).sort()).toEqual([orig.id, rev.id].sort());
  });
  it('상신 불가(승인) 건은 skip · 반려는 상신', () => {
    const res = submitClosing(rows, [approved.id, rejected.id]);
    expect(res.submitted).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.rows.find((r) => r.id === rejected.id)!.approval).toBe('상신');
    expect(res.rows.find((r) => r.id === approved.id)!.approval).toBe('승인');
  });
  it.each([['원전표만', () => orig.id], ['환원전표만', () => rev.id]])('%s 골라도 쌍으로 삭제(고아 환원전표 없음)', (_n, pick) => {
    const g = closingDeleteGate(rows, [pick()]);
    expect(g.ok).toBe(true);
    expect(g.ids.sort()).toEqual([orig.id, rev.id].sort());
    const left = deleteClosing(rows, [pick()]);
    expect(left.some((r) => r.id === orig.id || r.id === rev.id)).toBe(false);
    expect(left).toHaveLength(rows.length - 2);
  });
  it('반려는 삭제 가능(당일자 조건 없음)', () => expect(closingDeleteGate(rows, [rejected.id]).ok).toBe(true));
  it('상신·승인 건이 섞이면 전체 중단', () => {
    const g = closingDeleteGate(rows, [orig.id, approved.id]);
    expect(g.ok).toBe(false);
    expect(g.locked).toBe(1);
  });
  it('짝이 상신이면 다른 쪽만 골라도 중단', () => {
    const mixed = rows.map((r) => (r.id === rev.id ? { ...r, approval: '상신' as const } : r));
    expect(closingDeleteGate(mixed, [orig.id]).ok).toBe(false);
  });
  it('expandPairs — 목록 순서, 없는 id 무시', () => {
    expect(expandPairs(rows, ['nope'])).toEqual([]);
    expect(expandPairs(rows, [rev.id])).toEqual([orig.id, rev.id]);
  });
  it('closingVisibleIds — 쌍 중 하나만 통과해도 둘 다 보인다(환원전표가 다음날이라 기간 밖)', () => {
    const until = (r: ClosingRow) => r.slipDate <= orig.slipDate && (r.id === orig.id || r.id === rev.id);
    expect(rev.slipDate > orig.slipDate).toBe(true);
    expect([...closingVisibleIds(rows, until)].sort()).toEqual([orig.id, rev.id].sort());
    expect([...closingVisibleIds(rows, (r) => r.id === rev.id)].sort()).toEqual([orig.id, rev.id].sort());
  });
  it('closingVisibleIds — 결산(짝 없음)은 단건 · 아무것도 통과 안 하면 빈 집합', () => {
    expect([...closingVisibleIds(rows, (r) => r.id === approved.id)]).toEqual([approved.id]);
    expect(closingVisibleIds(rows, () => false).size).toBe(0);
  });
});

describe('validateEntry closing — 완화 검증(차대·계정·헤더 필수만)', () => {
  const line = (code: string, d: number | null, c: number | null): EntryLine => ({ ...emptyLine(), accountCode: code, debit: d, credit: c });
  const ok = { fundAccount: '농림수산식품모태펀드(기금)' as const, writtenDate: '2026-09-30', origin: '가결산', memo: '', lines: [line('1100300', 1000, null), line('4100100', null, 1000)] };
  it('적요가 비어도 통과', () => expect(validateEntry(ok, { closing: true }).ok).toBe(true));
  it('전표발생구분 미선택 → 안내', () => expect(validateEntry({ ...ok, origin: '' }, { closing: true })).toMatchObject({ ok: false, field: 'origin', message: CLOSING_ORIGIN_MSG }));
  it('작성일 빈 값·무효 → 안내(전표발생구분보다 먼저)', () => {
    expect(validateEntry({ ...ok, writtenDate: '', origin: '' }, { closing: true })).toMatchObject({ ok: false, field: 'writtenDate', message: CLOSING_WDATE_MSG });
    expect(validateEntry({ ...ok, writtenDate: '2026-02-30' }, { closing: true })).toMatchObject({ ok: false, field: 'writtenDate' });
  });
  it('회귀 — 옵션 없으면 작성일 검사 안 함', () => expect(validateEntry({ ...ok, memo: '적요', writtenDate: '' }).ok).toBe(true));
  it('계정구분 미선택이 먼저', () => expect(validateEntry({ ...ok, fundAccount: '', origin: '' }, { closing: true })).toMatchObject({ field: 'fundAccount' }));
  it('계정코드 미입력·미등록 → accountCode', () => {
    expect(validateEntry({ ...ok, lines: [line('', 1000, null), line('4100100', null, 1000)] }, { closing: true })).toMatchObject({ field: 'accountCode' });
    expect(validateEntry({ ...ok, lines: [line('9999999', 1000, null), line('4100100', null, 1000)] }, { closing: true })).toMatchObject({ field: 'accountCode' });
  });
  it('차액≠0 → balance 문구', () => expect(validateEntry({ ...ok, lines: [line('1100300', 1000, null), line('4100100', null, 900)] }, { closing: true })).toMatchObject({ field: 'balance', message: ENTRY_MSG.balance }));
  it('금액 없는 계정 행은 검사 생략(계정과목별 필수 예외)', () => {
    expect(validateEntry({ ...ok, lines: [...ok.lines, line('5100200', null, null)] }, { closing: true }).ok).toBe(true);
  });
  it('회귀 — 옵션 없으면 기존대로 적요 필수·금액 없는 행 차단', () => {
    expect(validateEntry(ok)).toMatchObject({ field: 'memo' });
    expect(validateEntry({ ...ok, memo: '적요', lines: [...ok.lines, line('5100200', null, null)] })).toMatchObject({ field: 'amount' });
  });
});

describe('더미 결산전표', () => {
  const rows = demoClosingJournals(TODAY);
  it('20~40행 · id 유일', () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(rows.length).toBeLessThanOrEqual(40);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
  it('발생구분은 결산 3종만, 3종 모두 존재', () => {
    for (const r of rows) expect(CLOSING_ORIGINS).toContain(r.origin);
    for (const o of CLOSING_ORIGINS) expect(rows.some((r) => r.origin === o)).toBe(true);
  });
  it('가결산마다 환원전표 정확히 1건 · 결재 상태 같음 · 다음날 · 고아 환원 없음', () => {
    const origs = rows.filter((r) => r.origin === '가결산');
    for (const o of origs) {
      const revs = rows.filter((r) => r.origin === '가결산(환원)' && r.pairId === o.id);
      expect(revs).toHaveLength(1);
      expect(revs[0].approval).toBe(o.approval);
      expect(revs[0].slipDate).toBe(nextDay(o.slipDate));
    }
    expect(rows.filter((r) => r.origin === '가결산(환원)')).toHaveLength(origs.length);
  });
  it('결재 4종이 가결산·결산 양쪽에 있다', () => {
    for (const s of APPROVAL_STATUSES) {
      expect(rows.some((r) => r.origin === '가결산' && r.approval === s)).toBe(true);
      expect(rows.some((r) => r.origin === '결산' && r.approval === s)).toBe(true);
    }
  });
  it('전월 말일 → 당월 1일 쌍(slide 10 9/30 → 10/1 예시)', () => {
    expect(rows.some((r) => r.origin === '가결산' && r.slipDate === '2026-10-31' && pairOf(rows, r)?.slipDate === '2026-11-01')).toBe(true);
  });
  it('차변 합 = 대변 합 = 금액', () => {
    for (const r of rows) { const t = lineTotals(r.lines); expect(t.debit).toBe(t.credit); expect(r.amount).toBe(t.debit); }
  });
  it.each(['2026-11-04', '2026-03-01', '2027-01-01'])('기본 기간(%s) 안에 전부 든다(환원전표 포함)', (t) => {
    const all = demoClosingJournals(t);
    const [from, to] = defaultPeriod(t);
    expect(filterJournals(all, { ...EMPTY_DETAIL, from, to })).toHaveLength(all.length);
  });
});
