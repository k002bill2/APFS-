/* 일반전표 관리(ACC-003) 목록 로직 — 기본 기간·필터·결재상신 전이·삭제 당일자 게이트·더미 불변식 */
import { describe, it, expect } from 'vitest';
import { ACCOUNTS } from '../account_data';
import { demoJournals, lineTotals, EVIDENCE_TYPES, PARTNERS, APPROVAL_STATUSES, JOURNAL_ORIGINS } from './general_journal_data';
import type { JournalRow } from './general_journal_data';
import { defaultPeriod, validateRange, filterJournals, submitForApproval, deleteGate, deleteGateMessage, DELETE_GATE_MSG, DELETE_LOCKED_MSG, EMPTY_DETAIL, RANGE_ERROR } from './general_journal_model';
import type { JournalFilter } from './general_journal_model';
import {
  emptyLine, isBlankLine, missingCode, entryTotals, lineDiff, withAutoRow, syncMemo, applyRepMemo,
  moveChecked, deleteChecked, deleteBlank, duplicateChecked, copyLastAppend, copyPrevMemo,
  resolveCode, applyAccountTo, applyPartnerTo, parseAmount, formatAmount, times1000,
  formNew, formFromRow, formCopy, formReverse, formFromEntry, isReadOnlyEntry, formSnapshot,
  validateEntry, formToJournal, commitJournal, nextSeq, ENTRY_MSG, REVERSE_PREFIX,
} from './general_journal_model';
import type { EntryLine } from './general_journal_model';
import {
  searchPartners, validatePartnerDraft, emptyPartnerDraft, draftToPartner, nextCustNo, nextMgmtNo, isValidBizNo, PARTNER_MSG,
  UPLOAD_COLUMNS, UPLOAD_MSG, uploadTemplateAoa, parseUploadAoa, normalizeSlipDate, uploadTotals, groupUploads, validateUpload,
  uploadsToJournals, commitJournals, demoUploadRows, findAccount as findAcc,
} from './general_journal_model';
import type { UploadRow } from './general_journal_model';

const TODAY = '2026-10-28';
const rows = demoJournals(TODAY);
const [from, to] = defaultPeriod(TODAY);
const base: JournalFilter = { ...EMPTY_DETAIL, from, to };
const ids = (rs: JournalRow[]) => rs.map((r) => r.id);

describe('기본 기간 = 전월 1일 ~ 오늘', () => {
  it('월중', () => expect(defaultPeriod('2026-10-28')).toEqual(['2026-09-01', '2026-10-28']));
  it('1일', () => expect(defaultPeriod('2026-10-01')).toEqual(['2026-09-01', '2026-10-01']));
  it('1월 → 전년 12월', () => expect(defaultPeriod('2026-01-15')).toEqual(['2025-12-01', '2026-01-15']));
  it('3월 말(2월 일수와 무관)', () => expect(defaultPeriod('2026-03-31')).toEqual(['2026-02-01', '2026-03-31']));
});

describe('범위 검증', () => {
  it('시작 > 종료면 오류 문구', () => expect(validateRange('2026-10-02', '2026-10-01')).toBe(RANGE_ERROR));
  it('같은 날·한쪽만·빈 값은 통과', () => {
    expect(validateRange('2026-10-01', '2026-10-01')).toBeNull();
    expect(validateRange('2026-10-01', '')).toBeNull();
    expect(validateRange('', '')).toBeNull();
  });
});

describe('더미 데이터 불변식', () => {
  it('12~20행 · 전부 기본 기간 안', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.length).toBeLessThanOrEqual(20);
    expect(filterJournals(rows, base)).toHaveLength(rows.length);
  });
  it('월초(1일)에도 전부 기본 기간 안', () => {
    const t = '2026-03-01';
    const [f, e] = defaultPeriod(t);
    expect(filterJournals(demoJournals(t), { ...base, from: f, to: e })).toHaveLength(rows.length);
  });
  it('작성일 = 오늘 최소 2행', () => expect(rows.filter((r) => r.writtenDate === TODAY).length).toBeGreaterThanOrEqual(2));
  it('결재 4종·발생구분 4종·첨부 유무 모두 포함', () => {
    for (const s of APPROVAL_STATUSES) expect(rows.some((r) => r.approval === s)).toBe(true);
    for (const o of JOURNAL_ORIGINS) expect(rows.some((r) => r.origin === o)).toBe(true);
    expect(rows.some((r) => r.attachments.length > 0)).toBe(true);
    expect(rows.some((r) => r.attachments.length === 0)).toBe(true);
  });
  it('차변 합 = 대변 합 = 금액', () => {
    for (const r of rows) {
      const t = lineTotals(r.lines);
      expect(t.debit).toBe(t.credit);
      expect(r.amount).toBe(t.debit);
    }
  });
  it('id 고유 · 분개 계정코드는 입력 가능(Y) 계정', () => {
    expect(new Set(ids(rows)).size).toBe(rows.length);
    const inputable = new Set(ACCOUNTS.filter((a) => a.inputYn === 'Y').map((a) => a.code));
    for (const r of rows) for (const l of r.lines) expect(inputable.has(l.accountCode)).toBe(true);
  });
  it('코드 옵션 — 증빙구분 17종 · 거래처 8~10개', () => {
    expect(EVIDENCE_TYPES).toHaveLength(17);
    expect(PARTNERS.length).toBeGreaterThanOrEqual(8);
    expect(PARTNERS.length).toBeLessThanOrEqual(10);
  });
});

describe('목록 필터', () => {
  it('텍스트 부분일치(대소문자·앞뒤 공백 무시)', () => {
    const got = filterJournals(rows, { ...base, memo: '  수수료 ' });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((r) => r.memo.includes('수수료'))).toBe(true);
    expect(filterJournals(rows, { ...base, slipNo: rows[0].slipNo.slice(0, 6) }).length).toBeGreaterThan(0);
  });
  it('기간 범위(양끝 포함)', () => {
    const d = rows[3].slipDate;
    const got = filterJournals(rows, { ...base, from: d, to: d });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((r) => r.slipDate === d)).toBe(true);
  });
  it('자금집행예정기간 — 값이 없는(-) 전표는 범위가 걸리면 제외', () => {
    const got = filterJournals(rows, { ...base, dueFrom: '2000-01-01' });
    expect(got.every((r) => r.fundDueDate !== '-')).toBe(true);
    expect(got.length).toBe(rows.filter((r) => r.fundDueDate !== '-').length);
  });
  it('승인여부 여 = 승인 / 부 = 그 외', () => {
    expect(filterJournals(rows, { ...base, approvedYn: '여' }).every((r) => r.approval === '승인')).toBe(true);
    expect(filterJournals(rows, { ...base, approvedYn: '부' }).every((r) => r.approval !== '승인')).toBe(true);
    const yes = filterJournals(rows, { ...base, approvedYn: '여' }).length;
    const no = filterJournals(rows, { ...base, approvedYn: '부' }).length;
    expect(yes).toBeGreaterThan(0);
    expect(yes + no).toBe(filterJournals(rows, base).length);   // 여·부는 모집단을 겹침 없이 나눈다
  });
  it('승인여부·발생구분 AND', () => {
    const got = filterJournals(rows, { ...base, approvedYn: '여', origin: '결산' });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((r) => r.approval === '승인' && r.origin === '결산')).toBe(true);
  });
});

describe('결재상신 전이', () => {
  it('미상신·반려만 상신으로, 상신·승인은 제외 건수로', () => {
    const pick = ['미상신', '반려', '상신', '승인'].map((s) => rows.find((r) => r.approval === s)!.id);
    const res = submitForApproval(rows, pick, '김민준');
    expect(res.submitted).toBe(2);
    expect(res.skipped).toBe(2);
    const byId = new Map(res.rows.map((r) => [r.id, r]));
    expect(pick.map((id) => byId.get(id)!.approval)).toEqual(['상신', '상신', '상신', '승인']);
    expect(byId.get(pick[0])!.updatedBy).toBe('김민준');
  });
  it('선택 밖 행·원본 배열은 바뀌지 않는다', () => {
    const target = rows.find((r) => r.approval === '미상신')!;
    const res = submitForApproval(rows, [target.id]);
    expect(rows.find((r) => r.id === target.id)!.approval).toBe('미상신');
    res.rows.forEach((r, i) => { if (r.id !== target.id) expect(r).toBe(rows[i]); });
  });
});

describe('삭제 당일자 게이트', () => {
  const todays = rows.filter((r) => r.writtenDate === TODAY);
  const past = rows.find((r) => r.writtenDate !== TODAY)!;
  it('당일자·미상신/반려만이면 통과', () => {
    expect(todays.every((r) => r.approval === '미상신' || r.approval === '반려')).toBe(true);
    expect(deleteGate(rows, ids(todays), TODAY)).toEqual({ ok: true, blocked: 0, locked: 0 });
  });
  it('당일자 아닌 건이 하나라도 섞이면 전체 중단', () => {
    const pastOpen = rows.find((r) => r.writtenDate !== TODAY && (r.approval === '미상신' || r.approval === '반려'))!;
    const g = deleteGate(rows, [...ids(todays), pastOpen.id], TODAY);
    expect(g).toEqual({ ok: false, blocked: 1, locked: 0 });
    expect(deleteGateMessage(g)).toBe(DELETE_GATE_MSG);
    expect(deleteGate(rows, [past.id], TODAY).ok).toBe(false);
  });
  it('상신·승인 건이 섞이면 전체 중단(당일자여도) — 역분개 안내 문구 우선', () => {
    const t = todays[0];
    const submitted = rows.map((r) => (r.id === t.id ? { ...r, approval: '상신' as const } : r));
    const g = deleteGate(submitted, ids(todays), TODAY);
    expect(g).toEqual({ ok: false, blocked: 0, locked: 1 });
    expect(deleteGateMessage(g)).toBe(DELETE_LOCKED_MSG);
    const approvedPast = rows.find((r) => r.writtenDate !== TODAY && r.approval === '승인')!;
    expect(deleteGateMessage(deleteGate(rows, [approvedPast.id], TODAY))).toBe(DELETE_LOCKED_MSG);
    expect(deleteGateMessage(deleteGate(rows, ids(todays), TODAY))).toBeNull();
  });
  it('선택 0건은 통과하지 않는다', () => expect(deleteGate(rows, [], TODAY).ok).toBe(false));
});

/* ══ 전표등록(청크 B) 순수 로직 ══ */

const L = (p: Partial<EntryLine> = {}): EntryLine => ({ ...emptyLine(), ...p });
const keys = (ls: EntryLine[]) => ls.map((l) => l.key);

describe('전표등록 — 빈 행·차액·합계', () => {
  it('빈 행 = 코드·금액 없음(적요는 무시)', () => {
    expect(isBlankLine(L())).toBe(true);
    expect(isBlankLine(L({ memo: '대표적요' }))).toBe(true);
    expect(isBlankLine(L({ debit: 0 }))).toBe(false);
    expect(isBlankLine(L({ accountCode: '1100100' }))).toBe(false);
  });
  it('계정코드 미입력 ⚠ = 금액 있고 코드 없음', () => {
    expect(missingCode(L({ debit: 100 }))).toBe(true);
    expect(missingCode(L())).toBe(false);
    expect(missingCode(L({ accountCode: '1100100', debit: 100 }))).toBe(false);
  });
  it('행 차액·Σ 합계', () => {
    expect(lineDiff(L({ debit: 300, credit: 100 }))).toBe(200);
    expect(entryTotals([L({ debit: 300 }), L({ credit: 100 }), L()])).toEqual({ debit: 300, credit: 100, diff: 200 });
  });
  it('차액 자동 1행 — 차액≠0 + 빈 행 없음일 때만 1행, 반복 호출해도 증가 안 함', () => {
    const a = [L({ accountCode: '5100200', debit: 1000 })];
    const b = withAutoRow(a);
    expect(b).toHaveLength(2);
    expect(isBlankLine(b[1])).toBe(true);
    expect(withAutoRow(b)).toBe(b);
    const balanced = [L({ debit: 1000 }), L({ credit: 1000 })];
    expect(withAutoRow(balanced)).toBe(balanced);
  });
});

describe('전표등록 — 적요 반영', () => {
  it('타이핑 추종: 빈 적요·직전 대표적요와 같은 행만 갱신', () => {
    let ls = [L(), L({ memo: '직접입력' })];
    ls = syncMemo(ls, '', 'a');
    ls = syncMemo(ls, 'a', 'ab');
    expect(ls.map((l) => l.memo)).toEqual(['ab', '직접입력']);
  });
  it('대표적요반영 = 전 행 덮어쓰기', () => {
    expect(applyRepMemo([L({ memo: 'x' }), L()], 'R').map((l) => l.memo)).toEqual(['R', 'R']);
  });
});

describe('전표등록 — 그리드 도구', () => {
  const a = L({ accountCode: 'A' }), b = L({ accountCode: 'B' }), c = L({ accountCode: 'C' }), blank = L();
  const ls = [a, b, c];
  it('위로/아래로 이동 — 경계에서 멈춤', () => {
    expect(keys(moveChecked(ls, new Set([b.key]), -1))).toEqual(keys([b, a, c]));
    expect(keys(moveChecked(ls, new Set([a.key]), -1))).toEqual(keys(ls));
    expect(keys(moveChecked(ls, new Set([a.key, b.key]), 1))).toEqual(keys([c, a, b]));
    expect(keys(moveChecked(ls, new Set([c.key]), 1))).toEqual(keys(ls));
  });
  it('행삭제·빈행삭제 — 0행이면 빈 행 1개', () => {
    expect(keys(deleteChecked(ls, new Set([b.key])))).toEqual(keys([a, c]));
    const all = deleteChecked(ls, new Set(keys(ls)));
    expect(all).toHaveLength(1);
    expect(isBlankLine(all[0])).toBe(true);
    expect(keys(deleteBlank([a, blank, c]))).toEqual(keys([a, c]));
  });
  it('행복사 — 체크 행 바로 아래 복제(새 key)', () => {
    const d = duplicateChecked(ls, new Set([a.key]));
    expect(d.map((l) => l.accountCode)).toEqual(['A', 'A', 'B', 'C']);
    expect(new Set(keys(d)).size).toBe(4);
  });
  it('Alt+K — 마지막 비어있지 않은 행을 끝에 복제', () => {
    expect(copyLastAppend([a, b, blank]).map((l) => l.accountCode)).toEqual(['A', 'B', '', 'B']);
  });
  it('Alt+C — 대상 행(없으면 마지막)에 바로 위 행 적요', () => {
    const m = [L({ memo: 'm1' }), L({ memo: 'm2' }), L()];
    expect(copyPrevMemo(m).map((l) => l.memo)).toEqual(['m1', 'm2', 'm2']);
    expect(copyPrevMemo(m, m[1].key).map((l) => l.memo)).toEqual(['m1', 'm1', '']);
    expect(copyPrevMemo(m, m[0].key)).toBe(m);
  });
});

describe('전표등록 — 계정코드·거래처·금액 입력', () => {
  it('코드 일치 → 과목 자동, 집계(N) 계정 → 비우고 rejected', () => {
    expect(resolveCode(L({ accountCode: ' 1100100 ' })).line).toMatchObject({ accountCode: '1100100', accountName: '보통예금' });
    const r = resolveCode(L({ accountCode: '1100000' }));
    expect(r.rejected).toBe(true);
    expect(r.line).toMatchObject({ accountCode: '', accountName: '' });
    expect(resolveCode(L({ accountCode: '9999999', accountName: '옛값' })).line.accountName).toBe('');
  });
  it('검색 반영 함수', () => {
    const agg = ACCOUNTS.find((x) => x.inputYn === 'N')!;
    expect(applyAccountTo(L(), agg).rejected).toBe(true);
    expect(applyPartnerTo(L(), PARTNERS[0])).toMatchObject({ partner: PARTNERS[0].name, mgmtNo: PARTNERS[0].mgmtNo, accountNo: PARTNERS[0].accountNo });
  });
  it('금액 파싱·표시·+키 ×1000', () => {
    expect(parseAmount('1,234,000')).toBe(1234000);
    expect(parseAmount('-500')).toBe(-500);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(formatAmount(1234000)).toBe('1,234,000');
    expect(formatAmount(null)).toBe('');
    expect(times1000(12)).toBe(12000);
    expect(times1000(null)).toBeNull();
  });
});

describe('전표등록 — 진입 모드 변환', () => {
  const src = rows.find((r) => r.attachments.length > 0 && r.approval === '승인')!;
  it('신규 — 빈 2행·기본값', () => {
    const f = formNew(TODAY);
    expect(f.lines).toHaveLength(2);
    expect(f).toMatchObject({ id: '', writtenDate: TODAY, slipKind: '정상', origin: '일반', fundAccount: '', approval: '미상신' });
  });
  it('수정 — 저장값·첨부 바인딩, 텍스트 "-" → ""', () => {
    const f = formFromRow(src);
    expect(f.id).toBe(src.id);
    expect(f.attachments).toBe(src.attachments.join(', '));
    expect(f.lines).toHaveLength(src.lines.length);
    expect(f.lines.every((l) => l.mgmtNo !== '-')).toBe(true);
  });
  it('복사 — 작성일 오늘·번호 미채번·첨부 미복사·미상신', () => {
    const f = formCopy(src, TODAY);
    expect(f).toMatchObject({ id: '', slipNo: '', seq: '', writtenDate: TODAY, attachments: '', approval: '미상신', memo: src.memo, fundAccount: src.fundAccount });
    expect(entryTotals(f.lines).debit).toBe(src.amount);
  });
  it('역분개 마이너스 — 같은 변 음수, 전표일=모달, 접두 1회', () => {
    const f = formReverse(src, '마이너스전표', '2026-10-20', TODAY);
    const t = entryTotals(f.lines);
    expect(t.debit).toBe(-src.amount);
    expect(t.diff).toBe(0);
    expect(f.memo).toBe(REVERSE_PREFIX + src.memo);
    expect(formToJournal(f).slipDate).toBe('2026-10-20');
    expect(formReverse({ ...src, memo: f.memo }, '마이너스전표', TODAY, TODAY).memo).toBe(f.memo);
  });
  it('역분개 마이너스 — 외화금액 부호 반전 · 0 은 −0 이 아닌 0', () => {
    const fx = { ...src, currency: '미국(달러)' as const, exchangeRate: 1350, foreignAmount: 2500 };
    expect(formReverse(fx, '마이너스전표', TODAY, TODAY).foreignAmount).toBe('-2500');
    expect(formReverse(fx, '상계전표', TODAY, TODAY).foreignAmount).toBe('2500');
    const zero = { ...src, lines: src.lines.map((l, i) => (i === 0 ? { ...l, debit: 0 } : l)) };
    expect(Object.is(formReverse(zero, '마이너스전표', TODAY, TODAY).lines[0].debit, -0)).toBe(false);
  });
  it('역분개 상계 — 차변↔대변 교환', () => {
    const f = formReverse(src, '상계전표', TODAY, TODAY);
    expect(f.lines[0].credit).toBe(src.lines[0].debit);
    expect(f.lines[0].debit).toBe(src.lines[0].credit);
    expect(entryTotals(f.lines).credit).toBe(src.amount);
  });
  it('formFromEntry 분기·조회 전용 판정', () => {
    expect(formFromEntry({ mode: 'new' }, TODAY).id).toBe('');
    expect(formFromEntry({ mode: 'edit', source: src }, TODAY).id).toBe(src.id);
    expect(isReadOnlyEntry('edit', '상신')).toBe(true);
    expect(isReadOnlyEntry('edit', '승인')).toBe(true);
    expect(isReadOnlyEntry('edit', '반려')).toBe(false);
    expect(isReadOnlyEntry('copy', '승인')).toBe(false);
  });
  it('스냅샷은 행 key 를 무시한다', () => {
    const f = formFromRow(src);
    expect(formSnapshot(f)).toBe(formSnapshot({ ...f, lines: f.lines.map((l) => ({ ...l, key: 'x' + l.key })) }));
  });
});

describe('전표등록 — 저장 검증 순서', () => {
  const ok = { fundAccount: '수산 모태계정' as const, memo: '적요', lines: [L({ accountCode: '5100200', debit: 100 }), L({ accountCode: '1100100', credit: 100 }), L()] };
  it('통과(빈 행 무시)', () => expect(validateEntry(ok)).toEqual({ ok: true }));
  it('1 계정구분 → 2 적요 → 3 계정코드 → 4 차액 → 유효행 0', () => {
    expect(validateEntry({ ...ok, fundAccount: '', memo: '' })).toMatchObject({ field: 'fundAccount', message: ENTRY_MSG.fundAccount });
    expect(validateEntry({ ...ok, memo: '  ' })).toMatchObject({ field: 'memo', message: ENTRY_MSG.memo });
    const miss = L({ debit: 5 });
    expect(validateEntry({ ...ok, lines: [...ok.lines, miss] })).toMatchObject({ field: 'accountCode', rowKey: miss.key });
    expect(validateEntry({ ...ok, lines: [L({ accountCode: '5100200', debit: 100 })] })).toMatchObject({ field: 'balance', message: ENTRY_MSG.balance });
    expect(validateEntry({ ...ok, lines: [L(), L()] })).toMatchObject({ field: 'empty' });
  });
  it('계정코드 미존재·집계(N) → 해당 행, 금액 없는 행 → 해당 행', () => {
    const ghost = L({ accountCode: '9999999', debit: 10 });
    expect(validateEntry({ ...ok, lines: [...ok.lines, ghost] })).toEqual({ ok: false, field: 'accountCode', message: ENTRY_MSG.badCode, rowKey: ghost.key });
    const agg = L({ accountCode: '1100000', credit: 10 });
    expect(validateEntry({ ...ok, lines: [...ok.lines, agg] })).toMatchObject({ field: 'accountCode', message: ENTRY_MSG.badCode, rowKey: agg.key });
    const noAmt = L({ accountCode: '5100300' });
    expect(validateEntry({ ...ok, lines: [...ok.lines, noAmt] })).toEqual({ ok: false, field: 'amount', message: ENTRY_MSG.amount, rowKey: noAmt.key });
  });
});

describe('전표등록 — 저장 반영(채번·upsert)', () => {
  it('신규 — id·순번·전표번호 채번, 맨 앞 추가, 빈 행 제외', () => {
    const f = { ...formNew(TODAY), fundAccount: '수산 모태계정' as const, memo: '신규',
      lines: [L({ accountCode: '5100200', accountName: '지급수수료', debit: 100 }), L({ accountCode: '1100100', credit: 100 }), L()] };
    const j = formToJournal(f);
    expect(j.lines).toHaveLength(2);
    expect(j.amount).toBe(100);
    expect(j.lines[1].partner).toBe('-');
    const res = commitJournal(rows, j);
    expect(res.rows).toHaveLength(rows.length + 1);
    expect(res.rows[0]).toBe(res.saved);
    expect(res.saved.seq).toBe(nextSeq(rows, TODAY));
    expect(res.saved.slipNo).toBe('20261028-' + res.saved.seq);
    expect(rows.some((r) => r.id === res.saved.id)).toBe(false);
    expect(res.saved.approval).toBe('미상신');
  });
  it('수정 + 상신 — 같은 id 교체, 결재 상신', () => {
    const src = rows.find((r) => r.approval === '반려')!;
    const res = commitJournal(rows, formToJournal({ ...formFromRow(src), memo: '고침' }), { submit: true });
    expect(res.rows).toHaveLength(rows.length);
    expect(res.rows.find((r) => r.id === src.id)).toMatchObject({ memo: '고침', approval: '상신', slipNo: src.slipNo });
  });
  it('nextSeq — 같은 전표일 최대 순번 + 1', () => {
    const d = rows[0].slipDate;
    const max = Math.max(...rows.filter((r) => r.slipDate === d).map((r) => Number(r.seq)));
    expect(nextSeq(rows, d)).toBe(String(max + 1).padStart(3, '0'));
    expect(nextSeq(rows, '1999-01-01')).toBe('001');
  });
});

/* ══ 청크 C — 증빙 미선택 보존 · 거래처 검색/간편추가 · 회계 전표 업로드 ══ */

describe('전표등록 — 증빙구분 미선택은 미선택으로 저장', () => {
  it("고르지 않고 저장 → '' · 다시 열면 '' (선택해 주세요)", () => {
    const f = { ...formNew(TODAY), fundAccount: '수산 모태계정' as const, memo: '증빙 없음',
      lines: [L({ accountCode: '5100200', debit: 100 }), L({ accountCode: '1100100', credit: 100 })] };
    const j = formToJournal(f);
    expect(j.evidenceType).toBe('');
    expect(formFromRow(j).evidenceType).toBe('');
    expect(formToJournal({ ...f, evidenceType: '해당없음' }).evidenceType).toBe('해당없음');
  });
});

describe('거래처 검색', () => {
  it('법인·개인 체크 + 거래처명 부분일치, 둘 다 해제면 0건', () => {
    expect(searchPartners(PARTNERS, '', { corp: true, indiv: true })).toHaveLength(PARTNERS.length);
    expect(searchPartners(PARTNERS, '', { corp: false, indiv: true }).every((p) => p.kind === '개인')).toBe(true);
    expect(searchPartners(PARTNERS, '', { corp: true, indiv: false }).every((p) => p.kind === '법인')).toBe(true);
    expect(searchPartners(PARTNERS, '', { corp: false, indiv: false })).toEqual([]);
    expect(searchPartners(PARTNERS, ' 수산 ', { corp: true, indiv: true }).map((p) => p.name)).toEqual(['들빛수산(주)']);
    expect(searchPartners(PARTNERS, '수산', { corp: false, indiv: true })).toEqual([]);
  });
  it('간편추가 검증 — 거래처명 필수 → 사업자등록번호 숫자 10자리', () => {
    const d = emptyPartnerDraft();
    expect(d).toMatchObject({ kind: '법인', region: '국내' });
    expect(validatePartnerDraft(d)).toEqual({ ok: false, field: 'name', message: PARTNER_MSG.required });
    expect(validatePartnerDraft({ ...d, name: '새거래처', bizNo: '12345' })).toMatchObject({ field: 'bizNo' });
    expect(validatePartnerDraft({ ...d, name: '새거래처', bizNo: '123-45-6789a' })).toMatchObject({ field: 'bizNo' });
    expect(validatePartnerDraft({ ...d, name: '새거래처', bizNo: '123-45-67890' })).toEqual({ ok: true });
    expect(isValidBizNo('')).toBe(true);
  });
  it('채번·변환 — 고객번호 최대+1, 개인이면 법인등록번호 버림, 텍스트 N/A "-"', () => {
    expect(nextCustNo(PARTNERS)).toBe('C000111');
    expect(nextMgmtNo(PARTNERS, TODAY)).toBe('M-2026-011');
    expect(nextMgmtNo(PARTNERS, '2027-01-02')).toBe('M-2027-001');
    const p = draftToPartner({ ...emptyPartnerDraft(), kind: '개인', name: ' 김새솔 ', corpNo: '110111-1234567', bizNo: '1234567890' }, PARTNERS, TODAY);
    expect(p).toMatchObject({ custNo: 'C000111', name: '김새솔', kind: '개인', ceo: '김새솔', corpNo: '-', bizNo: '1234567890', accountNo: '-', region: '국내' });
    /* 계좌번호 없는 거래처를 분개 행에 반영해도 '-' 를 입력칸에 붙이지 않는다 */
    expect(applyPartnerTo(L(), p)).toMatchObject({ partner: '김새솔', accountNo: '' });
  });
});

describe('회계 전표 업로드 — 파싱', () => {
  const tpl = uploadTemplateAoa(TODAY, PARTNERS);
  it('양식 = 14컬럼 헤더(slide 15 순서) + 예시 2행(한 전표, 차변 = 대변)', () => {
    expect(tpl[0]).toEqual([...UPLOAD_COLUMNS]);
    expect(UPLOAD_COLUMNS).toHaveLength(14);
    const r = parseUploadAoa(tpl, PARTNERS);
    expect(r.ok).toBe(true);
    const rows = (r as { rows: UploadRow[] }).rows;
    expect(rows).toHaveLength(2);
    expect(rows.every((x) => x.errors.length === 0)).toBe(true);
    expect(uploadTotals(rows)).toEqual({ debit: 550000, credit: 550000 });
    expect(rows[0]).toMatchObject({ slipDate: TODAY, accountName: '지급수수료', partnerName: '도담회계법인' });
    expect(validateUpload('수산 모태계정', rows)).toEqual({ ok: true });
  });
  it('[엑셀업로드] 데모 행 — 5행·전표 2건(그룹별 차변 = 대변)·오류 없음·그대로 저장 가능', () => {
    const demo = demoUploadRows(TODAY, PARTNERS);
    expect(demo).toHaveLength(5);
    expect(demo.every((r) => r.errors.length === 0)).toBe(true);
    expect(demo.every((r) => findAcc(r.accountCode)?.inputYn === 'Y')).toBe(true);
    const groups = groupUploads(demo);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.slipDate)).toEqual([TODAY, '2026-10-27']);
    groups.forEach((g) => { const t = uploadTotals(g.rows); expect(t.debit).toBe(t.credit); });
    expect(demo[0]).toMatchObject({ accountName: '지급수수료', partnerName: '도담회계법인' });
    expect(validateUpload('수산 모태계정', demo)).toEqual({ ok: true });
    const res = commitJournals(rows, uploadsToJournals(demo, '수산 모태계정', TODAY, PARTNERS));
    expect(res.rows).toHaveLength(rows.length + 2);
  });
  it('헤더는 이름으로 매칭(순서 무관·* 접미), 필수 헤더 없으면 거부', () => {
    const shuffled = [['순번', '계정과목 *', '전표일', '차변'], ['1', '5100200', TODAY, 100]];
    const r = parseUploadAoa(shuffled, PARTNERS);
    expect(r.ok && r.rows[0]).toMatchObject({ seq: '1', accountCode: '5100200', slipDate: TODAY, debit: 100, credit: null });
    expect(parseUploadAoa([['전표일', '차변'], [TODAY, 1]], PARTNERS)).toEqual({ ok: false, missing: ['순번', '계정과목'] });
  });
  it('전표일 정규화 — 텍스트 여러 형식·엑셀 일련번호·잘못된 날짜', () => {
    expect(normalizeSlipDate('2026.10.5')).toBe('2026-10-05');
    expect(normalizeSlipDate('20261028')).toBe('2026-10-28');
    expect(normalizeSlipDate(46323)).toBe('2026-10-28');
    expect(normalizeSlipDate('2026-02-30')).toBeNull();
    /* 8자리 숫자 셀 = YYYYMMDD(일련번호보다 먼저) */
    expect(normalizeSlipDate(20260901)).toBe('2026-09-01');
    expect(normalizeSlipDate(20260230)).toBeNull();
    /* 일련번호는 1 ~ 2958465(9999-12-31)만 */
    expect(normalizeSlipDate(2958465)).toBe('9999-12-31');
    expect(normalizeSlipDate(2958466)).toBeNull();
    expect(normalizeSlipDate(0)).toBeNull();
    /* 소수부 = 시각(날짜+시각 셀) — 버리고 날짜만 */
    expect(normalizeSlipDate(46323.5)).toBe('2026-10-28');
    expect(normalizeSlipDate(2958465.9)).toBe('9999-12-31');
    expect(normalizeSlipDate('어제')).toBeNull();
  });
  it('오류 행 — 필수 누락·계정코드 미존재·집계 계정·금액 형식·거래처코드 미존재, 빈 행은 버림', () => {
    const aoa = [
      [...UPLOAD_COLUMNS],
      ['', '1', '5100200', '', 100, '', '', '', '', '', '', '', '', ''],
      [TODAY, '1', '9999999', '', '', 100, '', '', '', '', '', '', '', ''],
      [TODAY, '2', '1100000', '', '1만', '', 'C999999', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const r = parseUploadAoa(aoa, PARTNERS);
    const rows = (r as { rows: UploadRow[] }).rows;
    expect(rows).toHaveLength(3);
    expect(rows[0].errors).toEqual(['전표일 누락']);
    expect(rows[1].errors).toEqual(['계정코드 미존재']);
    expect(rows[2].errors).toEqual(['집계 계정(입력여부 N)', '차변 금액 형식 오류', '거래처코드 미존재']);
  });
  it('금액 = 정수 원 단위(소수는 형식 오류) · 계정코드만 있고 금액 없음 = 오류', () => {
    const aoa = [
      [...UPLOAD_COLUMNS],
      [TODAY, '1', '5100200', '', 100.5, '', '', '', '', '', '', '', '', ''],
      [TODAY, '1', '1100100', '', '', '1,000.25', '', '', '', '', '', '', '', ''],
      [TODAY, '2', '1100100', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const rows = (parseUploadAoa(aoa, PARTNERS) as { rows: UploadRow[] }).rows;
    expect(rows[0].errors).toEqual(['차변 금액 형식 오류']);
    expect(rows[1].errors).toEqual(['대변 금액 형식 오류']);
    expect(rows[2].errors).toEqual(['금액 없음']);
  });
});

describe('회계 전표 업로드 — 저장 검증·전표 변환', () => {
  const R = (p: Partial<UploadRow>): UploadRow => ({
    no: 1, slipDate: TODAY, seq: '1', accountCode: '5100200', accountName: '지급수수료', debit: null, credit: null,
    partnerCode: '', partnerName: '', memo: '', plDept: '', plDeptName: '', plEmployee: '', plEmployeeName: '', bankCode: '', errors: [], ...p,
  });
  const good = [
    R({ no: 1, debit: 300, memo: '수수료', partnerCode: 'C000106' }), R({ no: 2, accountCode: '1100100', accountName: '보통예금', credit: 300 }),
    R({ no: 3, seq: '002', debit: 50 }), R({ no: 4, seq: '2', accountCode: '1100100', accountName: '보통예금', credit: 50, bankCode: 'BK-01' }),
  ];
  it('순서: 계정구분 → 데이터 없음 → 오류 행 → 전표별 차변≠대변', () => {
    expect(validateUpload('', [])).toMatchObject({ field: 'fundAccount', message: UPLOAD_MSG.fundAccount });
    expect(validateUpload('수산 모태계정', [])).toMatchObject({ field: 'empty', message: UPLOAD_MSG.empty });
    const withErr = [...good, R({ no: 5, errors: ['계정코드 미존재'], debit: 1 })];
    expect(validateUpload('수산 모태계정', withErr)).toMatchObject({ field: 'rows', errorRows: [5] });
    /* 전체 합은 맞아도 전표별로 어긋나면 막는다 */
    const off = [R({ no: 1, debit: 100 }), R({ no: 2, seq: '2', credit: 100 })];
    expect(uploadTotals(off)).toEqual({ debit: 100, credit: 100 });
    expect(validateUpload('수산 모태계정', off)).toMatchObject({ field: 'balance', message: UPLOAD_MSG.balance, groups: [{ slipDate: TODAY, seq: '1' }, { slipDate: TODAY, seq: '2' }] });
    expect(validateUpload('수산 모태계정', good)).toEqual({ ok: true });
  });
  it('그룹 = 전표일 + 순번(선행 0 무시) · 그룹마다 전표 1건 · 기본값', () => {
    expect(groupUploads(good).map((g) => g.rows.length)).toEqual([2, 2]);
    const js = uploadsToJournals(good, '수산 모태계정', TODAY, PARTNERS);
    expect(js).toHaveLength(2);
    expect(js[0]).toMatchObject({ approval: '미상신', origin: '일반', writtenDate: TODAY, fundAccount: '수산 모태계정', evidenceType: '', amount: 300, memo: '수수료', partner: '도담회계법인', id: '', seq: '' });
    expect(js[0].lines[0]).toMatchObject({ partner: '도담회계법인', mgmtNo: 'M-2026-006' });
    expect(js[1].lines[1].accountNo).toBe('BK-01');
    expect(js[1].memo).toBe('-');
  });
  it('일괄 반영 — 건수 증가 · 같은 전표일 순번이 겹치지 않게 채번', () => {
    const js = uploadsToJournals(good, '수산 모태계정', TODAY, PARTNERS);
    const res = commitJournals(rows, js);
    expect(res.rows).toHaveLength(rows.length + 2);
    expect(new Set(res.rows.map((r) => r.id)).size).toBe(res.rows.length);
    const seqs = res.saved.map((s) => s.seq);
    expect(new Set(seqs).size).toBe(2);
    expect(res.saved[0].slipNo).toBe('20261028-' + res.saved[0].seq);
  });
});
