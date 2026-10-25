import { describe, it, expect } from 'vitest';
import { demoGroups, demoDetails, detailId, groupDeleteBlocker } from './code_manage_data';
import { groupSchema, detailSchema, upOption, upCodeOf, UP_NONE } from './code_manage_schemas';

const groups = demoGroups();
const details = demoDetails();

describe('공통코드 데모 데이터 불변식', () => {
  it('코드구분은 유일하고 id=code', () => {
    expect(new Set(groups.map((g) => g.code)).size).toBe(groups.length);
    for (const g of groups) expect(g.id).toBe(g.code);
  });
  it('상위코드구분은 존재하는 코드구분만 가리킨다', () => {
    for (const g of groups) if (g.up) expect(groups.some((x) => x.code === g.up), `${g.code} up=${g.up}`).toBe(true);
  });
  it('모든 코드상세는 존재하는 코드구분에 속하고, 그룹 안 코드는 유일·정렬 1..n', () => {
    for (const [g, list] of Object.entries(details)) {
      expect(groups.some((x) => x.code === g)).toBe(true);
      expect(new Set(list.map((d) => d.code)).size).toBe(list.length);
      expect(list.map((d) => d.ord)).toEqual(list.map((_, i) => i + 1));
      for (const d of list) { expect(d.gcode).toBe(g); expect(d.id).toBe(detailId(g, d.code)); }
    }
  });
  it('코드구분마다 코드상세가 1건 이상(우측 empty state 는 미선택 상태 전용)', () => {
    for (const g of groups) expect((details[g.code] ?? []).length, g.code).toBeGreaterThan(0);
  });
  it('호출마다 새 객체', () => {
    expect(demoGroups()).not.toBe(groups);
    expect(demoDetails().AC).not.toBe(details.AC);
  });
});

describe('모달 스키마 팩토리(zod 통과 + 모드별 잠금)', () => {
  it('코드구분: 등록은 code text·필수, 수정은 readonly·비필수', () => {
    const c = groupSchema('create', groups);
    const e = groupSchema('edit', groups, 'AC');
    expect(c.fields.find((f) => f.key === 'code')).toMatchObject({ control: 'text', required: true });
    expect(e.fields.find((f) => f.key === 'code')).toMatchObject({ control: 'readonly' });
    expect(e.fields.find((f) => f.key === 'code')!.required).toBeFalsy();
  });
  it('상위코드구분 옵션은 없음 + 자기 자신 제외', () => {
    const opts = groupSchema('edit', groups, 'AC').fields.find((f) => f.key === 'up')!.options!;
    expect(opts[0]).toBe(UP_NONE);
    expect(opts.some((o) => o.startsWith('AC '))).toBe(false);
    expect(opts.length).toBe(groups.length);   // 없음 1 + (전체 - 자기 자신)
  });
  it('upOption ↔ upCodeOf 왕복', () => {
    const g = groups.find((x) => x.code === 'ADMGBN')!;
    expect(upCodeOf(upOption(g))).toBe('ADMGBN');
    expect(upCodeOf(UP_NONE)).toBe('');
    expect(upCodeOf('')).toBe('');
  });
  it('코드상세: 7필드(2단 wide), 코드구분 readonly, 수정 시 코드 잠금', () => {
    expect(detailSchema('create').fields.length).toBe(7);
    expect(detailSchema('create').fields[0]).toMatchObject({ key: 'gcode', control: 'readonly' });
    expect(detailSchema('edit').fields.find((f) => f.key === 'code')!.control).toBe('readonly');
  });
});

describe('groupDeleteBlocker — 코드구분 삭제 게이트(코드상세 · 하위 코드구분)', () => {
  it('코드상세가 있으면 코드상세가 막는다', () => {
    expect(groupDeleteBlocker(groups, details, 'ADMGBN')).toBe('코드상세');
  });
  it('코드상세가 없어도 상위로 참조하는 코드구분이 있으면 막는다(PAYGBN.up = ADMGBN)', () => {
    expect(groupDeleteBlocker(groups, { ...details, ADMGBN: [] }, 'ADMGBN')).toBe('하위 코드구분');
  });
  it('둘 다 없으면 삭제 가능(null)', () => {
    expect(groupDeleteBlocker(groups, { ...details, PAYGBN: [] }, 'PAYGBN')).toBeNull();
  });
});
