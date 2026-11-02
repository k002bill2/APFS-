/* 전표증빙 미첨부 관리(ACC-006) 순수 모델 + 더미 불변식 + 전표 화면 evidence 모드 진입 계약. */
import { describe, it, expect } from 'vitest';
import { demoMissingEvidence } from './missing_evidence_data';
import type { JournalRow } from './general_journal_data';
import { FUND_ACCOUNTS, FUND_BANK_ACCOUNTS, JOURNAL_ORIGINS, lineTotals } from './general_journal_data';
import { formFromEntry, formFromRow, formSnapshot, isReadOnlyEntry } from './general_journal_model';
import {
  EVIDENCE_EXTS, EVIDENCE_MSG, MAX_EVIDENCE_BYTES, addFileNames, applyEvidence, checkEvidenceFile, currentMonth, defaultFilter,
  filterMissing, isMissingEvidence, missingPasses, parseCsv, removeFileName, sortMissing, validateEvidence,
} from './missing_evidence_model';
import type { MissingFilter } from './missing_evidence_model';
import { ACCOUNTS } from '../account_data';

const row = (p: Partial<JournalRow>): JournalRow => ({
  id: 'X', fundAccount: '농림수산식품모태펀드(기금)', slipDate: '2026-10-10', seq: '001', memo: '적요', amount: 0, partner: '-', approval: '승인',
  attachments: [], writer: '김민준', origin: '일반', slipNo: '20261010-001', fundDueDate: '-', createdBy: '김민준', updatedBy: '김민준',
  writtenDate: '2026-10-10', slipKind: '정상', evidenceType: '', storage: '-', noEvidence: false, currency: '대한민국(원)',
  exchangeRate: null, foreignAmount: null, plDept: '-', plEmployee: '-', lines: [], ...p,
});
const ALL: MissingFilter = { fundAccount: '', from: '', to: '', includeUnapproved: true, origin: '', writer: '', partner: '', memo: '' };
const ids = (rs: readonly JournalRow[]) => rs.map((r) => r.id);

describe('isMissingEvidence — 증빙구분 미선택 또는 (첨부 없음 + 증빙미첨부 미체크)', () => {
  it('세 가지 미첨부 사유', () => {
    expect(isMissingEvidence(row({}))).toBe(true);
    expect(isMissingEvidence(row({ attachments: ['a.pdf'] }))).toBe(true);           // 첨부는 있으나 증빙구분 없음
    expect(isMissingEvidence(row({ noEvidence: true }))).toBe(true);                 // 증빙미첨부 체크했으나 증빙구분 없음
    expect(isMissingEvidence(row({ evidenceType: '세금계산서' }))).toBe(true);        // 증빙구분은 있으나 첨부·미첨부체크 없음
  });
  it('증빙구분 + (첨부 또는 증빙미첨부) = 미첨부 아님', () => {
    expect(isMissingEvidence(row({ evidenceType: '세금계산서', attachments: ['a.pdf'] }))).toBe(false);
    expect(isMissingEvidence(row({ evidenceType: '해당없음', noEvidence: true }))).toBe(false);
  });
  it('저장 검증 통과 ⇔ 미첨부 아님(저장 성공 행은 목록에서 빠진다)', () => {
    const cases = [
      { evidenceType: '' as const, attachments: [], noEvidence: false }, { evidenceType: '기타' as const, attachments: [], noEvidence: false },
      { evidenceType: '기타' as const, attachments: ['a.pdf'], noEvidence: false }, { evidenceType: '기타' as const, attachments: [], noEvidence: true },
      { evidenceType: '' as const, attachments: ['a.pdf'], noEvidence: true },
    ];
    for (const c of cases) expect(validateEvidence({ ...c, attachments: c.attachments.join(', ') }).ok).toBe(!isMissingEvidence(c));
  });
});

describe('기간 기본값 · 상세필터', () => {
  it('당월 1일 ~ 말일(윤년·12월 포함)', () => {
    expect(currentMonth('2026-10-27')).toEqual(['2026-10-01', '2026-10-31']);
    expect(currentMonth('2028-02-10')).toEqual(['2028-02-01', '2028-02-29']);
    expect(currentMonth('2026-12-31')).toEqual(['2026-12-01', '2026-12-31']);
    expect(defaultFilter('2026-11-02')).toEqual({ fundAccount: '', from: '2026-11-01', to: '2026-11-30', includeUnapproved: false, origin: '', writer: '', partner: '', memo: '' });
  });
  const FIX = [
    row({ id: 'A', slipDate: '2026-10-05', seq: '002', memo: '관리보수 지급', partner: '한빛자산운용', writer: '김민준' }),
    row({ id: 'B', slipDate: '2026-10-05', seq: '001', memo: 'Audit Fee', partner: '가온회계법인', writer: '이서연', origin: '결산', fundAccount: '수산 모태계정' }),
    row({ id: 'C', slipDate: '2026-09-30', memo: '배당금 수령', approval: '미상신', origin: '미결' }),
    row({ id: 'D', slipDate: '2026-10-10', approval: '반려', origin: '유무형자산', fundAccount: '농식품 투자조합 계정' }),
    row({ id: 'E', slipDate: '2026-10-11', evidenceType: '이체내역', attachments: ['a.pdf'] }),   // 증빙 완비 — 항상 제외
  ];
  it('전표일 내림차순, 같은 날은 순번 오름차순 · 증빙 완비 행 제외', () => {
    expect(ids(sortMissing(FIX))).toEqual(['E', 'D', 'B', 'A', 'C']);
    expect(ids(filterMissing(FIX, ALL))).toEqual(['D', 'B', 'A', 'C']);
  });
  it('미결재포함 미체크 = 승인만, 체크 = 전부', () => {
    expect(ids(filterMissing(FIX, { ...ALL, includeUnapproved: false }))).toEqual(['B', 'A']);
    expect(missingPasses(FIX[2], { ...ALL, includeUnapproved: true })).toBe(true);
  });
  it('기간(포함)·계정구분·전표발생구분 정확일치', () => {
    expect(ids(filterMissing(FIX, { ...ALL, from: '2026-10-01', to: '2026-10-05' }))).toEqual(['B', 'A']);
    expect(ids(filterMissing(FIX, { ...ALL, to: '2026-09-30' }))).toEqual(['C']);
    expect(ids(filterMissing(FIX, { ...ALL, fundAccount: '수산 모태계정' }))).toEqual(['B']);
    expect(ids(filterMissing(FIX, { ...ALL, origin: '미결' }))).toEqual(['C']);
    expect(ids(filterMissing(FIX, { ...ALL, origin: '미' }))).toEqual([]);
  });
  it('작성자·거래처·적요 부분일치(trim·대소문자 무시) · 조건끼리 AND', () => {
    expect(ids(filterMissing(FIX, { ...ALL, writer: ' 서연 ' }))).toEqual(['B']);
    expect(ids(filterMissing(FIX, { ...ALL, partner: '자산' }))).toEqual(['A']);
    expect(ids(filterMissing(FIX, { ...ALL, memo: 'audit' }))).toEqual(['B']);
    expect(ids(filterMissing(FIX, { ...ALL, memo: 'audit', writer: '김' }))).toEqual([]);
  });
});

describe('증빙 저장 검증(slide 12 표)', () => {
  it('증빙구분 미선택 → 파일 없음·미첨부 미체크 순서, 문구 원문', () => {
    expect(validateEvidence({ evidenceType: '', attachments: '', noEvidence: false })).toEqual({ ok: false, field: 'evidenceType', message: '증빙구분을(를) 선택하세요.' });
    expect(validateEvidence({ evidenceType: '기타', attachments: '  ', noEvidence: false })).toEqual({ ok: false, field: 'attachments', message: '증빙 파일을 첨부하거나 증빙미첨부를 체크하세요.' });
    expect(validateEvidence({ evidenceType: '기타', attachments: 'a.pdf', noEvidence: false }).ok).toBe(true);
    expect(validateEvidence({ evidenceType: '해당없음', attachments: '', noEvidence: true }).ok).toBe(true);
    expect(EVIDENCE_MSG.saved).toBe('저장되었습니다');
  });
  it('파일 검사 — 13종 확장자(대소문자 무시)·20MB 경계', () => {
    expect(EVIDENCE_EXTS).toHaveLength(13);
    for (const e of EVIDENCE_EXTS) expect(checkEvidenceFile('증빙.' + e.toUpperCase(), 10)).toBeNull();
    expect(checkEvidenceFile('slides.pptx', 10)).toBe('업로드할 수 없는 파일 형식입니다.');
    expect(checkEvidenceFile('noext', 10)).toBe(EVIDENCE_MSG.ext);
    expect(checkEvidenceFile('.pdf', 10)).toBe(EVIDENCE_MSG.ext);
    expect(checkEvidenceFile('big.pdf', MAX_EVIDENCE_BYTES)).toBeNull();
    expect(checkEvidenceFile('big.pdf', MAX_EVIDENCE_BYTES + 1)).toBe('파일 크기는 20MB를 넘을 수 없습니다.');
    expect(checkEvidenceFile('big.exe', MAX_EVIDENCE_BYTES + 1)).toBe(EVIDENCE_MSG.ext);   // 형식이 먼저
  });
  it('파일명 CSV 추가(중복 무시)·삭제', () => {
    expect(addFileNames('', ['a.pdf', 'b.png'])).toBe('a.pdf, b.png');
    expect(addFileNames('a.pdf', ['a.pdf', 'c.hwp'])).toBe('a.pdf, c.hwp');
    expect(removeFileName('a.pdf, c.hwp', 'a.pdf')).toBe('c.hwp');
    expect(parseCsv(' a.pdf ,, b.png ')).toEqual(['a.pdf', 'b.png']);
  });
});

describe('applyEvidence — 증빙 4항목만 반영', () => {
  it('대상 행만, 헤더·분개 불변, 원본 불변', () => {
    const src = [row({ id: 'A', memo: '원래 적요' }), row({ id: 'B' })];
    const next = applyEvidence(src, 'A', { evidenceType: '세금계산서', storage: '회계팀 문서함', noEvidence: false, attachments: ['a.pdf'] }, '이서연');
    expect(next[0]).toMatchObject({ evidenceType: '세금계산서', storage: '회계팀 문서함', attachments: ['a.pdf'], memo: '원래 적요', updatedBy: '이서연' });
    expect(isMissingEvidence(next[0])).toBe(false);
    expect(next[1]).toBe(src[1]);
    expect(src[0].evidenceType).toBe('');
  });
});

describe('전표 화면 evidence 모드 진입', () => {
  const src = row({ id: 'A', approval: '승인', attachments: ['a.pdf', 'b.png'] });
  it('저장값 그대로 바인딩 · 승인 전표도 조회 전용 아님(③ 입력 가능)', () => {
    const f = formFromEntry({ mode: 'evidence', source: src }, '2026-11-02');
    expect(formSnapshot(f)).toBe(formSnapshot({ ...formFromRow(src), lines: f.lines }));
    expect(f.attachments).toBe('a.pdf, b.png');
    expect(isReadOnlyEntry('evidence', '승인')).toBe(false);
    expect(isReadOnlyEntry('evidence', '상신')).toBe(false);
  });
});

describe('더미 불변식', () => {
  it.each(['2026-11-02', '2026-11-01', '2026-10-31', '2028-02-29'])('오늘 %s — 당월 행은 1일~오늘, 전월 2건, 기본 조건으로 8건 이상', (today) => {
    const rows = demoMissingEvidence(today);
    const [from] = currentMonth(today);
    expect(new Set(ids(rows)).size).toBe(rows.length);
    const inMonth = rows.filter((r) => r.slipDate >= from && r.slipDate <= today);
    expect(inMonth.length).toBe(rows.length - 2);
    expect(rows.filter((r) => r.slipDate < from)).toHaveLength(2);
    expect(filterMissing(rows, defaultFilter(today)).length).toBeGreaterThanOrEqual(8);
    expect(filterMissing(rows, { ...defaultFilter(today), includeUnapproved: true }).length).toBe(inMonth.length);
  });
  const rows = demoMissingEvidence('2026-11-02');
  it('전부 미첨부 · 미첨부 사유 3종 · 결재 4종 · 발생구분 4종이 모두 등장', () => {
    expect(rows.every(isMissingEvidence)).toBe(true);
    expect(rows.some((r) => r.attachments.length > 0)).toBe(true);
    expect(rows.some((r) => r.noEvidence)).toBe(true);
    expect(rows.some((r) => r.attachments.length === 0 && !r.noEvidence)).toBe(true);
    for (const a of ['미상신', '상신', '승인', '반려']) expect(rows.some((r) => r.approval === a)).toBe(true);
    for (const o of JOURNAL_ORIGINS) expect(rows.some((r) => r.origin === o)).toBe(true);
  });
  it('차변 = 대변 · 금액 = 차변 합 · 입력여부 Y 계정 · 코드값 도메인 · 전표번호 형식', () => {
    for (const r of rows) {
      const t = lineTotals(r.lines);
      expect(t.debit).toBe(t.credit);
      expect(r.amount).toBe(t.debit);
      for (const l of r.lines) expect(ACCOUNTS.some((a) => a.inputYn === 'Y' && a.code === l.accountCode && a.name === l.accountName)).toBe(true);
      expect(FUND_ACCOUNTS).toContain(r.fundAccount);
      expect(FUND_BANK_ACCOUNTS[r.fundAccount]).toContain(r.partnerAccountNo);
      expect(r.slipNo).toBe(r.slipDate.replace(/-/g, '') + '-' + r.seq);
    }
  });
});
