/* 자펀드정보관리 통합 그리드(v1.4 자펀드관리 + S2_73 투자기준, 2026-09-28) 가드.
   - 추가 열은 S2_73 정본(FUND_INFO_TABLE.cols)에서 파생되고 v1.4 열과 겹치지 않는다
   - 수정 팝업 저장 → 재오픈 왕복이 폼을 보존한다(Codex P2 2차)
   - 일반 `수정`이 바꾼 행 값이 보관 폼보다 우선한다(Codex P2 3차)
   - 이름 빈 운용사 행은 공동GP 판정에서 제외된다(Codex P2 1차) */
import { describe, it, expect } from 'vitest';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { EXT, EXTRA_KEYS, formOf, patchFromForm } from './asset_fund_info_manage';
import { DEMO } from './subfund_manage';
import type { SubFundRow } from './subfund_manage';
import { FUND_INFO_TABLE, newGpRow } from './asset_fund_info_data';

type Def = ColDef<SubFundRow> | ColGroupDef<SubFundRow>;
const leafKeys = (defs: Def[]): string[] =>
  defs.flatMap((d) => ('children' in d && d.children ? leafKeys(d.children as Def[]) : [String((d as ColDef).field)]));

describe('자펀드정보관리 통합 그리드', () => {
  it('추가 열 = S2_73 원문 순서의 EXTRA_KEYS, v1.4 행 키와 겹치지 않음', () => {
    const keys = leafKeys(EXT.extraColumns);
    expect(keys).toEqual(FUND_INFO_TABLE.cols.map((c) => c.key).filter((k) => EXTRA_KEYS.includes(k)));
    for (const k of keys) expect(Object.keys(DEMO[0])).not.toContain(k);
  });
  it('2단 그룹(투자기간 2 · 투자비율(%) 4)이 원문 그룹 그대로', () => {
    const groups = EXT.extraColumns.filter((d): d is ColGroupDef<SubFundRow> => 'children' in d);
    expect(groups.map((g) => [g.headerName, g.children.length])).toEqual([['투자기간', 2], ['투자비율(%)', 4]]);
  });
  it('시드 = v1.4 DEMO + S2_73 원문 1행(결성)', () => {
    expect(EXT.seed.length).toBe(DEMO.length + 1);
    const last = EXT.seed[EXT.seed.length - 1];
    expect(last.stg).toBe('결성');
    expect(last.fn).toBe(FUND_INFO_TABLE.rows[0].fn);
    expect(last.must).toBe(Number(FUND_INFO_TABLE.rows[0].must));
  });

  const hd = DEMO.find((r) => r.gp2 !== '-')!;   // 공동GP 있는 결성 행(현대동양)
  it('처음 열면 업무집행조합원2 가 운용사 2행째로 채워진다', () => {
    expect(formOf(hd).gps.map((g) => g.name)).toEqual([hd.gp1, hd.gp2]);
  });
  it('저장 → 재오픈 왕복이 결산월·3번째 운용사를 보존한다', () => {
    const f0 = formOf(hd);
    const f1 = { ...f0, month: '3', gps: [...f0.gps, newGpRow({ name: '제3운용사', bizno: '123' })] };
    const row = { ...hd, ...patchFromForm(f1) };
    const back = formOf(row);
    expect(back.month).toBe('3');
    expect(back.gps.map((g) => g.name)).toEqual([hd.gp1, hd.gp2, '제3운용사']);
    expect(back.gps[2].bizno).toBe('123');
    expect(row.cogp).toBe('O');
  });
  it('일반 수정이 바꾼 자펀드명·대표 운용사가 보관 폼보다 우선한다', () => {
    const row = { ...hd, ...patchFromForm({ ...formOf(hd), month: '3' }) };
    const edited = { ...row, fn: '변경 자펀드', gp1: '변경 GP' };
    const back = formOf(edited);
    expect(back.fund).toBe('변경 자펀드');
    expect(back.gps[0].name).toBe('변경 GP');
    expect(back.month).toBe('3');
  });
  it('이름 빈 운용사 행은 공동GP 판정에서 제외', () => {
    const one = DEMO.find((r) => r.stg === '결성' && r.gp2 === '-')!;
    const f = formOf(one);
    const patch = patchFromForm({ ...f, gps: [...f.gps, newGpRow()] });
    expect(patch.cogp).toBe('X');
    expect(patch.gp2).toBe('-');
  });
});
