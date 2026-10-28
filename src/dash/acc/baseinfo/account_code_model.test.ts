import { describe, expect, it } from 'vitest';
import { demoAccounts, demoDeletedAccounts, DEMO_USER } from './account_code_data';
import type { AccountFormValues } from './account_code_model';
import { filterAccounts, validateAccount, parentCandidates, logicalDelete, sortByCode, descendantCodes, parentLabel, parentFits, hasChildren, blockedDeletes, DUP_CODE_MSG, PARENT_CLS_MSG, PARENT_LEVEL_MSG } from './account_code_model';

const rows = demoAccounts();
const deleted = demoDeletedAccounts();
const byCode = new Map(rows.map((r) => [r.code, r]));

describe('더미 데이터 무결성', () => {
  it('25~40행', () => { expect(rows.length).toBeGreaterThanOrEqual(25); expect(rows.length).toBeLessThanOrEqual(40); });
  it('계정코드 고유(활성 + 삭제 포함)', () => {
    const all = [...rows, ...deleted].map((r) => r.code);
    expect(new Set(all).size).toBe(all.length);
  });
  it('레벨1은 상위 없음, 레벨≥2는 상위가 존재하고 집계계정(N)이며 레벨 = 상위 레벨 + 1', () => {
    for (const r of rows) {
      if (r.level === 1) { expect(r.parent).toBeNull(); continue; }
      const p = byCode.get(r.parent!);
      expect(p, r.code).toBeDefined();
      expect(p!.input).toBe('N');
      expect(r.level).toBe(p!.level + 1);
      expect(r.cls).toBe(p!.cls);
    }
  });
  it('삭제 시드의 상위도 활성 집계계정', () => {
    for (const r of deleted) expect(byCode.get(r.parent!)?.input).toBe('N');
  });
  it('최초등록자·최종수정자 이름이 채워져 있다', () => {
    for (const r of rows) { expect(r.createdBy).not.toBe(''); expect(r.updatedBy).not.toBe(''); }
  });
  it('호출마다 새 배열(원본 오염 없음)', () => {
    const a = demoAccounts(); a[4].required.push('통화코드');
    expect(demoAccounts()[4].required).not.toContain('통화코드');
  });
});

describe('목록 필터·정렬', () => {
  it('계정코드 오름차순', () => {
    const shuffled = [...rows].reverse();
    expect(sortByCode(shuffled).map((r) => r.code)).toEqual([...rows].map((r) => r.code).sort());
    expect(filterAccounts(shuffled, {}).map((r) => r.code)).toEqual(sortByCode(rows).map((r) => r.code));
  });
  it('계정과목명 부분일치', () => {
    const out = filterAccounts(rows, { name: '예금' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.name.includes('예금'))).toBe(true);
  });
  it.each([
    ['cls', '부채'], ['dc', '대변'], ['contra', '차감'], ['input', 'N'], ['use', 'Y'],
  ] as const)('%s = %s', (k, v) => {
    const out = filterAccounts(rows, { [k]: v });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => (r as any)[k] === v)).toBe(true);
  });
  it('빈 값 = 전체', () => {
    expect(filterAccounts(rows, { name: '', cls: '', dc: '', contra: '', input: '', use: '' })).toHaveLength(rows.length);
  });
});

describe('저장 검증 순서(위→아래 첫 미충족)', () => {
  const full: AccountFormValues = { code: '1110950', name: '테스트', cls: '자산', dc: '차변', level: '4', parentCode: '1110000' };
  const P = byCode.get('1110000')!;   // 레벨3 자산 집계계정
  it('빈 폼은 계정코드부터', () => {
    expect(validateAccount({ code: '', name: '', cls: '', dc: '', level: '', parentCode: '' })).toEqual({ ok: false, key: 'code', msg: '계정코드를 입력해 주세요.' });
  });
  it.each([
    [{ name: ' ' }, 'name', '계정과목명을 입력해 주세요.'],
    [{ cls: '' }, 'cls', '계정분류를 선택해 주세요.'],
    [{ dc: '' }, 'dc', '차대구분을 선택해 주세요.'],
    [{ level: '' }, 'level', '계정레벨을 선택해 주세요.'],
    [{ parentCode: '' }, 'parent', '상위계정과목을 선택해 주세요.'],
  ] as const)('%o → %s', (patch, key, msg) => {
    expect(validateAccount({ ...full, ...patch }, new Set(), P)).toEqual({ ok: false, key, msg });
  });
  it('여러 개가 비면 가장 위 항목만', () => {
    expect(validateAccount({ ...full, cls: '', dc: '', parentCode: '' }, new Set(), P)).toMatchObject({ key: 'cls' });
  });
  it('레벨1이면 상위계정과목 검증 제외', () => {
    expect(validateAccount({ ...full, level: '1', parentCode: '' })).toEqual({ ok: true });
  });
  it('레벨2~6은 상위 필수', () => {
    for (const level of ['2', '3', '4', '5', '6']) expect(validateAccount({ ...full, level, parentCode: '' })).toMatchObject({ key: 'parent' });
  });
  it('등록 시 중복 계정코드(활성·삭제 모두)', () => {
    const taken = new Set([...rows, ...deleted].map((r) => r.code));
    expect(validateAccount({ ...full, code: '1110200' }, taken)).toEqual({ ok: false, key: 'code', msg: DUP_CODE_MSG });
    expect(validateAccount({ ...full, code: '1110900' }, taken)).toMatchObject({ msg: DUP_CODE_MSG });
    expect(validateAccount(full, taken, P)).toEqual({ ok: true });
  });
});

describe('계층 무결성 검증(P1)', () => {
  const full: AccountFormValues = { code: '1110950', name: '테스트', cls: '자산', dc: '차변', level: '4', parentCode: '1110000' };
  it('상위 행이 없으면(parentCode 만 있고 해석 불가) 상위 미선택으로 본다', () => {
    expect(validateAccount(full, new Set(), null)).toMatchObject({ key: 'parent', msg: '상위계정과목을 선택해 주세요.' });
  });
  it('레벨 ≠ 상위 레벨 + 1 → 상위 [검색] 포커스', () => {
    expect(validateAccount({ ...full, level: '3' }, new Set(), byCode.get('1110000'))).toEqual({ ok: false, key: 'parent', msg: PARENT_LEVEL_MSG });
    expect(validateAccount({ ...full, level: '5' }, new Set(), byCode.get('1110000'))).toMatchObject({ msg: PARENT_LEVEL_MSG });
  });
  it('상위와 계정분류 불일치 → 계정분류 포커스(레벨 불일치보다 먼저 — 필드 순서)', () => {
    expect(validateAccount({ ...full, cls: '부채' }, new Set(), byCode.get('1110000'))).toEqual({ ok: false, key: 'cls', msg: PARENT_CLS_MSG });
    expect(validateAccount({ ...full, cls: '부채', level: '2' }, new Set(), byCode.get('1110000'))).toMatchObject({ msg: PARENT_CLS_MSG });
  });
  it('parentFits — 분류·레벨이 바뀌어 기존 상위와 어긋나면 false', () => {
    const p = byCode.get('1110000')!;
    expect(parentFits(p, '자산', '4')).toBe(true);
    expect(parentFits(p, '부채', '4')).toBe(false);
    expect(parentFits(p, '자산', '3')).toBe(false);
    expect(parentFits(p, '자산', '1')).toBe(false);
    expect(parentFits(p, '', '')).toBe(true);
  });
});

describe('하위 계정 삭제 차단·수정 잠금(P1)', () => {
  it('hasChildren', () => {
    expect(hasChildren(rows, '1110000')).toBe(true);
    expect(hasChildren(rows, '1110200')).toBe(false);
  });
  it('자손이 선택에 없으면 차단', () => {
    expect(blockedDeletes(rows, ['1210000'])).toEqual(['1210000']);
    expect(blockedDeletes(rows, ['1110200', '1210000'])).toEqual(['1210000']);
  });
  it('자손 일부만 선택해도 차단', () => {
    expect(blockedDeletes(rows, ['1210000', '1210100'])).toEqual(['1210000']);
  });
  it('자손까지 모두 선택하면 허용', () => {
    expect(blockedDeletes(rows, ['1210000', '1210100', '1210200'])).toEqual([]);
  });
  it('입력계정만 선택하면 허용', () => {
    expect(blockedDeletes(rows, ['1110200', '1110300'])).toEqual([]);
  });
});

describe('상위계정과목 후보', () => {
  it('레벨 = level-1 만', () => {
    const out = parentCandidates(rows, { level: 4 });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.level === 3)).toBe(true);
    expect(parentCandidates(rows, { level: 2 }).map((r) => r.code)).toEqual(['1000000', '2000000', '3000000', '4000000']);
  });
  it('레벨 + 분류 동시 제한', () => {
    expect(parentCandidates(rows, { level: 3, cls: '자본' }).map((r) => r.code)).toEqual(['3100000', '3200000']);
  });
  it('사용여부 N 제외', () => {
    const withUnused = rows.map((r) => (r.code === '3200000' ? { ...r, use: 'N' as const } : r));
    expect(parentCandidates(withUnused, { level: 3, cls: '자본' }).map((r) => r.code)).toEqual(['3100000']);
  });
  it('입력여부 N 만', () => {
    const out = parentCandidates(rows, {});
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.input === 'N')).toBe(true);
  });
  it('자기 자신과 자손 제외', () => {
    const out = parentCandidates(rows, { selfCode: '1100000' }).map((r) => r.code);
    expect(out).not.toContain('1100000');
    expect(out).not.toContain('1110000');
    expect(out).toContain('1000000');
    expect(descendantCodes(rows, '1100000').has('1110200')).toBe(true);
  });
  it('계정분류 필터', () => {
    expect(parentCandidates(rows, { cls: '자본' }).every((r) => r.cls === '자본')).toBe(true);
  });
  it('검색어 = 계정코드 또는 계정과목명 부분일치', () => {
    expect(parentCandidates(rows, { keyword: '3100' }).map((r) => r.code)).toEqual(['3100000']);
    expect(parentCandidates(rows, { keyword: '자본잉여' }).map((r) => r.code)).toEqual(['3200000']);
  });
  it('표시 문자열 "코드 계정명"', () => {
    expect(parentLabel(byCode.get('1110000')!)).toBe('1110000 당좌자산');
  });
});

describe('논리삭제', () => {
  it('목록에서 빠지고 삭제이력으로 이동, 최종수정자 = 처리자', () => {
    const { rows: next, deleted: hist } = logicalDelete(rows, deleted, ['1110200', '1110300'], DEMO_USER);
    expect(next).toHaveLength(rows.length - 2);
    expect(next.some((r) => r.code === '1110200')).toBe(false);
    const moved = hist.filter((r) => r.code === '1110200' || r.code === '1110300');
    expect(moved).toHaveLength(2);
    expect(moved.every((r) => r.updatedBy === DEMO_USER)).toBe(true);
    expect(hist).toHaveLength(deleted.length + 2);
    expect(hist.map((r) => r.code)).toEqual([...hist.map((r) => r.code)].sort());
  });
  it('입력 배열은 변경하지 않는다', () => {
    const before = rows.find((r) => r.code === '1110200')!.updatedBy;
    logicalDelete(rows, deleted, ['1110200'], DEMO_USER);
    expect(rows.find((r) => r.code === '1110200')!.updatedBy).toBe(before);
  });
});
