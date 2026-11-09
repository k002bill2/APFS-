import { describe, expect, it } from 'vitest';
import { demoPartners, COUNTRIES, DOMESTIC_COUNTRY } from './partner_data';
import type { BankAccount, PartnerRow } from './partner_data';
import {
  filterPartners, sortByNo, nextPartnerNo, isBizNoFormat, formatBizNo, isBizNoTaken, checkBizNo, validatePartner, setMainAccount,
  appendHistory, localYmd, buildPartner, toForm, formSnapshot, deleteGate, logicalDelete, required, keepMainAccount,
  BIZNO_FORMAT_MSG, BIZNO_DUP_MSG, BIZNO_OK_MSG, MAIN_ACCOUNT_MSG, MAIN_ACCOUNT_REQUIRED_MSG, DELETE_BLOCKED_MSG,
} from './partner_model';
import type { PartnerForm } from './partner_model';

const rows = demoPartners();
const byNo = (no: string) => rows.find((r) => r.partnerNo === no)!;
const acc = (id: string, p: Partial<BankAccount> = {}): BankAccount => ({ id, main: false, kind: '수익', bank: 'KB국민은행', accountNo: '1-2-3', holder: '예금주', use: '여', ...p });
/** 통과하는 국내 등록 폼 */
const okForm = (p: Partial<PartnerForm> = {}): PartnerForm => ({ ...toForm(), name: '신규거래처', bizNo: '999-88-77777', accounts: [acc('n1', { main: true })], ...p });

describe('더미 데이터 무결성', () => {
  it('14~18건 · 거래처번호 고유 · P000NNN', () => {
    expect(rows.length).toBeGreaterThanOrEqual(14);
    expect(rows.length).toBeLessThanOrEqual(18);
    expect(new Set(rows.map((r) => r.partnerNo)).size).toBe(rows.length);
    for (const r of rows) expect(r.partnerNo).toMatch(/^P\d{6}$/);
  });
  it('국내 사업자번호 = 000-00-00000 형식·고유 / 해외 = "-" + 해외등록번호', () => {
    const dom = rows.filter((r) => r.region === '국내');
    for (const r of dom) { expect(r.bizNo).toMatch(/^\d{3}-\d{2}-\d{5}$/); expect(r.country).toBe(DOMESTIC_COUNTRY); expect(r.foreignRegNo).toBe('-'); }
    expect(new Set(dom.map((r) => r.bizNo)).size).toBe(dom.length);
    const ovs = rows.filter((r) => r.region === '해외');
    expect(ovs.map((r) => r.country).sort()).toEqual(['미국', '싱가포르', '일본']);
    for (const r of ovs) { expect(r.bizNo).toBe('-'); expect(r.foreignRegNo).not.toBe('-'); }
  });
  it('개인은 법인등록번호 "-"', () => {
    for (const r of rows.filter((x) => x.type === '개인')) expect(r.corpNo).toBe('-');
  });
  it('계좌 1~2개, 주계좌 정확히 1개, 계좌 id 고유', () => {
    const ids = rows.flatMap((r) => r.accounts.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of rows) {
      expect(r.accounts.length).toBeGreaterThanOrEqual(1);
      expect(r.accounts.length).toBeLessThanOrEqual(2);
      expect(r.accounts.filter((a) => a.main)).toHaveLength(1);
    }
  });
  it('전표 거래처 10건 = C000101~C000110 · 그중 일부만 연결 전표 있음', () => {
    const j = rows.filter((r) => /^C0001(0\d|10)$/.test(r.internalCode));
    expect(j).toHaveLength(10);
    const n = j.filter((r) => r.hasJournal).length;
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThan(10);
    expect(rows.filter((r) => !/^C0001(0\d|10)$/.test(r.internalCode)).every((r) => !r.hasJournal)).toBe(true);
  });
  it('국가 상수 = seed 국가 집합', () => {
    expect([...new Set(rows.map((r) => r.country))].sort()).toEqual([...COUNTRIES].sort());
  });
  it('변경이력이 있는 거래처가 1~2건', () => {
    const n = rows.filter((r) => r.history.length > 0).length;
    expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(2);
  });
  it('호출마다 새 객체(원본 오염 없음)', () => {
    const a = demoPartners(); a[0].accounts[0].bank = 'X'; a[0].attachments.push('x.pdf');
    const b = demoPartners();
    expect(b[0].accounts[0].bank).not.toBe('X');
    expect(b[0].attachments).not.toContain('x.pdf');
  });
});

describe('목록 필터·정렬', () => {
  it('E00 필터 없음 = 전체, 거래처번호 오름차순', () => {
    const out = filterPartners([...rows].reverse(), {});
    expect(out).toHaveLength(rows.length);
    expect(out.map((r) => r.partnerNo)).toEqual(sortByNo(rows).map((r) => r.partnerNo));
  });
  it('거래처유형·국내/해외·국가 정확일치', () => {
    expect(filterPartners(rows, { type: '개인' }).map((r) => r.name)).toEqual(['하늘찬', '서도윤']);
    expect(filterPartners(rows, { region: '해외' })).toHaveLength(3);
    expect(filterPartners(rows, { country: '일본' }).map((r) => r.name)).toEqual(['Hoshizora Foods K.K.']);
  });
  it('거래처명·대표자명 부분일치(대소문자 무시)', () => {
    expect(filterPartners(rows, { name: '수산' }).map((r) => r.name)).toEqual(['들빛수산(주)']);
    expect(filterPartners(rows, { name: 'lumora' })).toHaveLength(1);
    expect(filterPartners(rows, { ceo: '도담' }).map((r) => r.name)).toEqual(['도담회계법인']);
  });
  it('사업자등록번호 하이픈 무시 부분일치', () => {
    expect(filterPartners(rows, { bizNo: '2148130101' }).map((r) => r.partnerNo)).toEqual(['P000001']);
    expect(filterPartners(rows, { bizNo: '81-30101' }).map((r) => r.partnerNo)).toEqual(['P000001']);
    expect(filterPartners(rows, { bizNo: '-' })).toHaveLength(0);   // 숫자 없는 검색어는 전체로 풀리지 않는다
  });
  it('조건 AND', () => {
    expect(filterPartners(rows, { region: '국내', type: '개인', name: '서' }).map((r) => r.name)).toEqual(['서도윤']);
  });
});

describe('채번', () => {
  it('최댓값 + 1, 6자리', () => {
    expect(nextPartnerNo(rows.map((r) => r.partnerNo))).toBe('P' + String(rows.length + 1).padStart(6, '0'));
    expect(nextPartnerNo([])).toBe('P000001');
  });
  it('논리삭제된 최댓값도 점유 — 같은 번호를 다시 주지 않는다', () => {
    const sorted = sortByNo(rows); const last = sorted[sorted.length - 1].partnerNo;
    const next = logicalDelete(rows, [], [last]);
    expect(nextPartnerNo([...next.rows, ...next.deleted].map((r) => r.partnerNo))).toBe(nextPartnerNo(rows.map((r) => r.partnerNo)));
  });
});

describe('사업자등록번호 형식·정규화·중복', () => {
  it.each(['123-45-67890', '1234567890', '12345-67890'])('형식 OK %s', (s) => { expect(isBizNoFormat(s)).toBe(true); });
  it.each(['123-45-6789', '123-45-678901', '123-45-6789a', '', '-'])('형식 오류 %s', (s) => { expect(isBizNoFormat(s)).toBe(false); });
  it('000-00-00000 정규화', () => { expect(formatBizNo('1234567890')).toBe('123-45-67890'); expect(formatBizNo(' 123-4567890 ')).toBe('123-45-67890'); });
  it('중복 = 숫자 비교, 자기 제외', () => {
    expect(isBizNoTaken(rows, '2148130101')).toBe(true);
    expect(isBizNoTaken(rows, '214-81-30101', 'P000001')).toBe(false);
    expect(isBizNoTaken(rows, '-')).toBe(false);   // 해외 '-' 끼리는 중복 아님
  });
  it('[확인] 버튼 결과', () => {
    expect(checkBizNo(rows, '').msg).toBe(required('사업자등록번호'));
    expect(checkBizNo(rows, '12-3')).toEqual({ ok: false, msg: BIZNO_FORMAT_MSG });
    expect(checkBizNo(rows, '214-81-30101')).toEqual({ ok: false, msg: BIZNO_DUP_MSG });
    expect(checkBizNo(rows, '214-81-30101', 'P000001')).toEqual({ ok: true, msg: BIZNO_OK_MSG });
  });
});

describe('저장 검증 — 위→아래 첫 미충족 1건', () => {
  it('통과', () => { expect(validatePartner(okForm(), rows)).toEqual({ ok: true }); });
  it('필수 문구 = "[항목명]을(를) 입력해 주세요."', () => { expect(required('거래처명')).toBe('거래처명을(를) 입력해 주세요.'); });
  it('항목 순서: 거래처유형 → 사업자등록번호(국내) → 국가 → 거래처명', () => {
    expect(validatePartner(okForm({ type: '', bizNo: '', country: '' }), rows)).toMatchObject({ key: 'type', msg: required('거래처유형') });
    expect(validatePartner(okForm({ country: '', bizNo: '', name: '' }), rows)).toMatchObject({ key: 'bizNo', msg: required('사업자등록번호') });
    expect(validatePartner(okForm({ country: '', name: '' }), rows)).toMatchObject({ key: 'country' });
    expect(validatePartner(okForm({ name: '  ' }), rows)).toMatchObject({ key: 'name', msg: required('거래처명') });
  });
  it('조건부 필수 — 해외: 해외등록번호 필수·사업자번호 불요', () => {
    const ovs = okForm({ region: '해외', country: '미국', bizNo: '', foreignRegNo: '' });
    expect(validatePartner(ovs, rows)).toMatchObject({ key: 'foreignRegNo', msg: required('해외등록번호') });
    expect(validatePartner({ ...ovs, foreignRegNo: 'US-1' }, rows)).toEqual({ ok: true });
  });
  it('조건부 필수 — 국내: 해외등록번호 비어도 통과', () => {
    expect(validatePartner(okForm({ foreignRegNo: '' }), rows)).toEqual({ ok: true });
  });
  it('항목별 — 거래처명 빈 칸 + 사업자번호 "123"(국내)이면 사업자번호 형식 문구(사업자등록번호가 거래처명보다 위)', () => {
    expect(validatePartner(okForm({ name: '', bizNo: '123' }), rows)).toEqual({ ok: false, key: 'bizNo', msg: BIZNO_FORMAT_MSG });
  });
  it('항목별 — 사업자번호 중복이 국가·거래처명 필수보다 먼저', () => {
    expect(validatePartner(okForm({ name: '', country: '', bizNo: '214-81-30101' }), rows)).toMatchObject({ key: 'bizNo', msg: BIZNO_DUP_MSG });
  });
  it('해외면 사업자등록번호를 건너뛰고 국가 → 해외등록번호 → 거래처명', () => {
    const ovs = okForm({ region: '해외', bizNo: '123', country: '', foreignRegNo: '', name: '' });
    expect(validatePartner(ovs, rows)).toMatchObject({ key: 'country' });
    expect(validatePartner({ ...ovs, country: '미국' }, rows)).toMatchObject({ key: 'foreignRegNo' });
    expect(validatePartner({ ...ovs, country: '미국', foreignRegNo: 'US-1' }, rows)).toMatchObject({ key: 'name' });
  });
  it('2 형식 → 3 중복', () => {
    expect(validatePartner(okForm({ bizNo: '123-45' }), rows)).toMatchObject({ key: 'bizNo', msg: BIZNO_FORMAT_MSG });
    expect(validatePartner(okForm({ bizNo: '2148130101' }), rows)).toMatchObject({ key: 'bizNo', msg: BIZNO_DUP_MSG });
    expect(validatePartner(okForm({ bizNo: '214-81-30101' }), rows, 'P000001')).toEqual({ ok: true });
  });
  it('해외면 사업자번호 형식·중복을 보지 않는다', () => {
    expect(validatePartner(okForm({ region: '해외', country: '일본', foreignRegNo: 'JP-1', bizNo: '214-81-30101' }), rows)).toEqual({ ok: true });
  });
  it('중복 판정은 논리삭제분도 본다(pool)', () => {
    const del = logicalDelete(rows, [], ['P000004']);
    expect(validatePartner(okForm({ bizNo: byNo('P000004').bizNo }), [...del.rows, ...del.deleted])).toMatchObject({ msg: BIZNO_DUP_MSG });
  });
  it('4 계좌 행 필수 — 행 위→아래, 열 계좌구분·은행명·계좌번호·예금주', () => {
    const v = okForm({ accounts: [acc('a', { main: true }), acc('b', { bank: '', holder: '' })] });
    expect(validatePartner(v, rows)).toEqual({ ok: false, key: 'account', rowId: 'b', field: 'bank', msg: required('은행명') });
    expect(validatePartner(okForm({ accounts: [acc('a', { accountNo: ' ' })] }), rows)).toMatchObject({ rowId: 'a', field: 'accountNo', msg: required('계좌번호') });
  });
  it('필수 필드가 계좌 행보다 먼저', () => {
    expect(validatePartner(okForm({ name: '', accounts: [acc('a', { kind: '' })] }), rows)).toMatchObject({ key: 'name' });
  });
  it('5 주계좌 2개 이상', () => {
    const v = okForm({ accounts: [acc('a', { main: true }), acc('b', { main: true })] });
    expect(validatePartner(v, rows)).toEqual({ ok: false, key: 'account', rowId: 'b', field: 'main', msg: MAIN_ACCOUNT_MSG });
  });
  it('계좌 0건은 허용', () => {
    expect(validatePartner(okForm({ accounts: [] }), rows)).toEqual({ ok: true });
  });
  it('6 계좌 ≥1 인데 주계좌 0 → "주계좌를 지정해 주세요." (첫 행)', () => {
    expect(MAIN_ACCOUNT_REQUIRED_MSG).toBe('주계좌를 지정해 주세요.');
    expect(validatePartner(okForm({ accounts: [acc('a'), acc('b')] }), rows)).toEqual({ ok: false, key: 'account', rowId: 'a', field: 'main', msg: MAIN_ACCOUNT_REQUIRED_MSG });
  });
  it('계좌 행 필수가 주계좌 0 보다 먼저', () => {
    expect(validatePartner(okForm({ accounts: [acc('a', { holder: '' })] }), rows)).toMatchObject({ field: 'holder' });
  });
  it('keepMainAccount — 주계좌가 사라지면 첫 행 승격, 있으면 그대로, 빈 배열 그대로', () => {
    expect(keepMainAccount([acc('a'), acc('b')]).map((a) => a.main)).toEqual([true, false]);
    expect(keepMainAccount([acc('a'), acc('b', { main: true })]).map((a) => a.main)).toEqual([false, true]);
    expect(keepMainAccount([])).toEqual([]);
  });
  it('setMainAccount = 그 행만 주계좌', () => {
    const out = setMainAccount([acc('a', { main: true }), acc('b')], 'b');
    expect(out.map((a) => a.main)).toEqual([false, true]);
  });
});

describe('저장값 조립', () => {
  it('국내: 사업자번호 정규화 · 해외등록번호 "-" · 국가 대한민국 · 빈 텍스트 "-"', () => {
    const r = buildPartner(okForm({ bizNo: '9998877777', foreignRegNo: 'X', country: '미국', ceo: '', attachments: 'a.pdf, b.png' }));
    expect(r).toMatchObject({ bizNo: '999-88-77777', foreignRegNo: '-', country: '대한민국', ceo: '-', internalCode: '-', address: '-', attachments: ['a.pdf', 'b.png'] });
  });
  it('해외: 사업자번호 "-" · 개인: 법인등록번호 "-"', () => {
    const r = buildPartner(okForm({ region: '해외', country: '일본', foreignRegNo: 'JP-1', type: '개인', corpNo: '110111-1' }));
    expect(r).toMatchObject({ bizNo: '-', country: '일본', foreignRegNo: 'JP-1', corpNo: '-' });
  });
  it('toForm ↔ buildPartner 왕복(seed 행이 그대로)', () => {
    for (const row of rows) {
      const { partnerNo: _n, mgmtNo: _m, hasJournal: _h, history: _y, ...rest } = row;
      expect(buildPartner(toForm(row))).toEqual(rest);
    }
  });
  it('등록 기본값 = 법인·국내·대한민국', () => {
    expect(toForm()).toMatchObject({ type: '법인', region: '국내', country: '대한민국' });
  });
  it('formSnapshot — 첨부 CSV 공백 차이는 같은 값', () => {
    expect(formSnapshot(okForm({ attachments: 'a.pdf,b.pdf' }))).toBe(formSnapshot(okForm({ attachments: 'a.pdf, b.pdf' })));
    expect(formSnapshot(okForm({ name: 'x' }))).not.toBe(formSnapshot(okForm()));
  });
});

describe('변경 이력', () => {
  const prev: Pick<PartnerRow, 'name' | 'bizNo' | 'history'> = { name: 'A', bizNo: '111-11-11111', history: [] };
  it('거래처명 변경 → 오늘 일자로 1행', () => {
    expect(appendHistory(prev, { name: 'B', bizNo: '111-11-11111' }, '2026-11-06')).toEqual([{ date: '2026-11-06', oldName: 'A', newName: 'B', oldBizNo: '111-11-11111', newBizNo: '111-11-11111' }]);
  });
  it('사업자번호 변경 → 1행', () => {
    expect(appendHistory(prev, { name: 'A', bizNo: '222-22-22222' }, '2026-11-06')).toHaveLength(1);
  });
  it('변경 없음(공백·하이픈 차이만) → 추가 없음', () => {
    expect(appendHistory(prev, { name: ' A ', bizNo: '1111111111' }, '2026-11-06')).toEqual([]);
  });
  it('기존 이력 뒤에 붙는다', () => {
    const h = appendHistory({ ...prev, history: [{ date: '2026-01-01', oldName: 'Z', newName: 'A', oldBizNo: '-', newBizNo: '-' }] }, { name: 'C', bizNo: prev.bizNo }, '2026-11-06');
    expect(h.map((x) => x.date)).toEqual(['2026-01-01', '2026-11-06']);
  });
  it('localYmd = 로컬 날짜', () => { expect(localYmd(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05'); });
});

describe('삭제 게이트·논리삭제', () => {
  const withJ = rows.find((r) => r.hasJournal)!.partnerNo;
  const noJ = rows.filter((r) => !r.hasJournal).map((r) => r.partnerNo);
  it('연결 전표 없는 건만 → 통과', () => { expect(deleteGate(rows, noJ.slice(0, 3))).toEqual({ ok: true, blocked: 0 }); });
  it('1건이라도 연결 전표 → 전체 중단', () => { expect(deleteGate(rows, [...noJ.slice(0, 2), withJ])).toEqual({ ok: false, blocked: 1 }); });
  it('빈 선택은 통과 아님', () => { expect(deleteGate(rows, []).ok).toBe(false); });
  it('문구', () => { expect(DELETE_BLOCKED_MSG).toBe('연결된 전표가 있는 거래처는 삭제할 수 없습니다.'); });
  it('논리삭제 = 목록에서 빼서 삭제분으로', () => {
    const out = logicalDelete(rows, [], noJ.slice(0, 2));
    expect(out.rows).toHaveLength(rows.length - 2);
    expect(out.deleted.map((r) => r.partnerNo)).toEqual(noJ.slice(0, 2));
  });
});
