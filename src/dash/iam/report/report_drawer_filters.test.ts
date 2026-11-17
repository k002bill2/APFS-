/* 사후보고관리 상세필터 — 종전 `· 데이터 연동 후 적용`(no-op) 항목이 실제로 행을 거른다(2026-11-16 사용자 지시 "전부 동작").
   화면마다 (a) 기본 상태(전 조건 빈 값·원문 기본값) 행이 종전과 같다(R0) (b) 조건 값을 바꾸면 행이 실제로 바뀐다.
   typed 화면은 컴포넌트 passes 가 실제로 부르는 export 술어(passesDrawerKeys)를 그대로 검사한다(복사본 아님).
   투심보고 통계(TablesPage)는 공용 골격의 판정(키가 있으면 eq · dayRange 는 기간 안)을 그대로 따라 걸러 본다. */
import { describe, it, expect } from 'vitest';
import { readSrc, panelSrc, panelLabels } from '../../test_src';
import { splitRange } from '../../risk_page_kit';
import { buildColumnDefs } from '../../risk_grid';
import type { Row } from '../../risk_table_meta';
import { DEMO as OCC_ROWS, passesDrawerKeys as occPasses } from './occasional_report_manage';
import type { OccDrawerFilter } from './occasional_report_manage';
import { DEMO as REG_ROWS, passesDrawerKeys as regPasses } from './regular_report_manage';
import { DEMO as INV_ROWS, passesDrawerKeys as invPasses } from './investment_review_manage';
import { INV_REVIEW_ROWS } from './investment_review_data';
import { DEMO as GM_ROWS, passesDrawerKeys as gmPasses } from './general_meeting_manage';
import { DEMO as CF_ROWS, passesDrawerKeys as cfPasses } from './fund_cash_forecast_manage';
import { DEMO as RU_ROWS, passesDrawerKeys as ruPasses } from './report_update_info_manage';
import { REVIEW_STATS_PAGE, REVIEW_STATS_VIEW_TABLE } from './review_stats';
import { REVIEW_STATS_TABLE } from './review_stats_data';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const ids = (rows: readonly { id: string }[]) => rows.map((r) => r.id);

/** 화면 배선 공통 단언 — 술어 호출·외부필터 활성·적용 칩 라벨(= 인라인 패널 칸 label, 2026-11-17 드로어 폐기)·미연동 캡션 제거 */
function expectWired(file: string, call: string, active: string[], chips: string[]) {
  const src = strip(readSrc(file));
  expect(src, call).toContain(call);
  const fa = src.match(/const filterActive = Boolean\(([^)]*)\)/)?.[1] ?? '';
  for (const a of active) expect(fa.split(' || '), `filterActive ⊃ ${a}`).toContain(a);
  for (const l of chips) {
    expect(src, `적용 칩 ${l}`).toContain(`{ label: '${l}', value:`);
    expect(panelLabels(src), `패널 칸 ${l}`).toContain(l);
  }
  expect(src).not.toMatch(/데이터 연동 후|noop/);
}

/* ─────────────── 수시보고 확인 ─────────────── */
describe('수시보고 확인 — 모펀드·계정구분·심사담당자·리스크담당자·구분', () => {
  const NONE: OccDrawerFilter = { mf: '', acc: '', js: '', rs: '', kind: '' };
  const pick = (f: Partial<OccDrawerFilter>) => ids(OCC_ROWS.filter((r) => occPasses(r, { ...NONE, ...f })));

  it('기본(전 조건 빈 값) = 6행 전부', () => {
    expect(OCC_ROWS).toHaveLength(6);
    expect(pick({})).toEqual(['or-1', 'or-2', 'or-3', 'or-4', 'or-5', 'or-6']);
  });
  it('모펀드·계정구분 = 숨은 행 속성(유안타 수산투자조합만 MOAF·수산)', () => {
    expect(pick({ mf: 'MOAF' })).toEqual(['or-5']);
    expect(pick({ mf: '농식품모태펀드' })).toEqual(['or-1', 'or-2', 'or-3', 'or-4', 'or-6']);
    expect(pick({ acc: '수산' })).toEqual(['or-5']);
    expect(pick({ acc: '농식품' })).toHaveLength(5);
  });
  it('심사담당자·리스크담당자 = 확인자명(jsBy·rsBy) — 미확인 행은 걸러진다', () => {
    expect(pick({ js: '홍길동' })).toEqual(['or-3', 'or-5']);
    expect(pick({ rs: '홍길동' })).toEqual(['or-5']);
  });
  it('구분 = 체크리스트 대구분', () => {
    expect(pick({ kind: '투자기업관련' })).toEqual(['or-1', 'or-2', 'or-5']);
    expect(pick({ kind: '조합운영관련' })).toEqual(['or-3', 'or-4']);
    expect(pick({ kind: '기타' })).toEqual(['or-6']);
  });
  it('화면 배선', () => {
    expectWired('occasional_report_manage.tsx', 'passesDrawerKeys(r, { mf: fMf, acc: fAcc, js: fJs, rs: fRs, kind: fKind })',
      ['fMf', 'fAcc', 'fJs', 'fRs', 'fKind'], ['모펀드', '계정구분', '심사담당자', '리스크담당자', '구분']);
    expect(strip(readSrc('occasional_report_manage.tsx'))).toContain('options={kindOptions}');
  });
});

/* ─────────────── 정기보고 ─────────────── */
describe('정기보고 — 모펀드·계정구분·담당자(한 자펀드의 보고 → 값 하나)', () => {
  const pick = (f: Partial<{ mf: string; acc: string; mgr: string }>) =>
    ids(REG_ROWS.filter((r) => regPasses(r, { mf: '', acc: '', mgr: '', ...f })));

  it('기본 = 9행 전부', () => {
    expect(REG_ROWS).toHaveLength(9);
    expect(pick({})).toHaveLength(9);
  });
  it('같은 자펀드라 한 값이 전 행 — 다른 값은 0건', () => {
    expect(pick({ mf: '농식품모태펀드' })).toHaveLength(9);
    expect(pick({ mf: 'MOAF' })).toEqual([]);
    expect(pick({ acc: '농식품' })).toHaveLength(9);
    expect(pick({ acc: '수산' })).toEqual([]);
    expect(pick({ mgr: '양한솔' })).toHaveLength(9);
    expect(pick({ mgr: '이성훈' })).toEqual([]);
  });
  it('화면 배선 — 담당자 선택지는 행 값에서 파생', () => {
    expectWired('regular_report_manage.tsx', 'passesDrawerKeys(r, { mf: fMf, acc: fAcc, mgr: fMgr })',
      ['fMf', 'fAcc', 'fMgr'], ['모펀드', '계정구분', '담당자']);
    expect(strip(readSrc('regular_report_manage.tsx'))).toContain('options={mgrOptions}');
  });
});

/* ─────────────── 투심보고 확정 및 승인 ─────────────── */
describe('투심보고 확정 및 승인 — 모펀드·계정구분·담당자', () => {
  const pick = (f: Partial<{ mf: string; acct: string; mgr: string }>) =>
    ids(INV_ROWS.filter((r) => invPasses(r, { mf: '', acct: '', mgr: '', ...f })));

  it('기본 = 원문 3행 그대로(시드는 숨은 속성만 덧붙인다)', () => {
    expect(pick({})).toEqual(['ir-1', 'ir-2', 'ir-3']);
    INV_ROWS.forEach((r, i) => {
      const { mf: _mf, acct: _acct, mgr: _mgr, ...rest } = r;
      expect(rest).toEqual(INV_REVIEW_ROWS[i]);
    });
  });
  it('조건마다 행이 바뀐다', () => {
    expect(pick({ mf: 'MOAF' })).toEqual(['ir-2']);
    expect(pick({ mf: '농식품모태펀드' })).toEqual(['ir-1', 'ir-3']);
    expect(pick({ acct: '수산' })).toEqual([]);   // 조합명이 전부 농식품·애그테크 — 수산으로 둘 근거 없음
    expect(pick({ mgr: '양한솔' })).toEqual(['ir-1', 'ir-3']);
    expect(pick({ mgr: '이성훈' })).toEqual(['ir-2']);
  });
  it('화면 배선 — 새로고침도 시드된 배열로 되돌린다', () => {
    expectWired('investment_review_manage.tsx', 'passesDrawerKeys(r, { mf: fMf, acct: fAg, mgr: fMgr })',
      ['fMf', 'fAg', 'fMgr'], ['모펀드', '계정구분', '담당자']);
    expect(strip(readSrc('investment_review_manage.tsx'))).toContain('setRows([...DEMO])');
  });
});

/* ─────────────── 조합원총회 ─────────────── */
describe('조합원총회 — 모펀드·계정구분', () => {
  const pick = (f: Partial<{ mf: string; acc: string }>) => ids(GM_ROWS.filter((r) => gmPasses(r, { mf: '', acc: '', ...f })));

  it('기본 = 3행 전부', () => expect(pick({})).toEqual(['gm-1', 'gm-2', 'gm-3']));
  it('조건마다 행이 바뀐다', () => {
    expect(pick({ mf: 'MOAF' })).toEqual(['gm-1']);
    expect(pick({ mf: '농식품모태펀드' })).toEqual(['gm-2', 'gm-3']);
    expect(pick({ acc: '수산' })).toEqual([]);   // 조합명이 전부 농식품 — 수산으로 둘 근거 없음
    expect(pick({ acc: '농식품' })).toEqual(['gm-1', 'gm-2', 'gm-3']);
  });
  it('화면 배선', () => {
    expectWired('general_meeting_manage.tsx', 'passesDrawerKeys(r, { mf: fMf, acc: fAcc })', ['fMf', 'fAcc'], ['모펀드', '계정구분']);
  });
});

/* ─────────────── 조합예상자금요청보고 ─────────────── */
describe('조합예상자금요청보고 — 모펀드·담당자·기준년월(등록일시 ≤ 기준년월)', () => {
  const sel = (f: Partial<{ mf: string; mgr: string; ym: string }>) => CF_ROWS.filter((r) => cfPasses(r, { mf: '', mgr: '', ym: '', ...f }));
  const pick = (f: Partial<{ mf: string; mgr: string; ym: string }>) => ids(sel(f));
  const sumTotal = (rows: readonly { total: number }[]) => rows.reduce((a, r) => a + r.total, 0);

  it('기본 = 3행 전부 · 합계(약정총액) 그대로', () => {
    expect(pick({})).toEqual(['cf-1', 'cf-2', 'cf-3']);
    expect(sumTotal(sel({}))).toBe(42_000_000_000);
  });
  it('모펀드·담당자', () => {
    expect(pick({ mf: 'MOAF' })).toEqual(['cf-3']);
    expect(pick({ mgr: '이성훈' })).toEqual(['cf-2']);
    expect(pick({ mgr: '양한솔' })).toEqual(['cf-1', 'cf-3']);
  });
  it('기준년월 = 그 달까지 등록된 조합만(같은 달 포함) — 합계도 그 행으로', () => {
    expect(pick({ ym: '2023-02' })).toEqual(['cf-1', 'cf-2', 'cf-3']);
    expect(pick({ ym: '2023-01' })).toEqual(['cf-1', 'cf-2']);
    expect(pick({ ym: '2022-07' })).toEqual(['cf-2']);
    expect(pick({ ym: '2021-04' })).toEqual([]);
    expect(sumTotal(sel({ ym: '2023-01' }))).toBe(34_000_000_000);
  });
  it('화면 배선', () => {
    expectWired('fund_cash_forecast_manage.tsx', 'passesDrawerKeys(r, { mf: fMf, mgr: fMgr, ym: fYm })',
      ['fMf', 'fMgr', 'fYm'], ['모펀드', '담당자']);
    const src = strip(readSrc('fund_cash_forecast_manage.tsx'));
    expect(src).toContain("{ label: '기준년월', value: fYm,");
    expect(panelSrc(src)).toContain('<PanelPeriod label="기준년월" mode="month"');
    expect(src).toContain('options={mgrOptions}');
  });
});

/* ─────────────── 보고 업데이트정보 ─────────────── */
describe('보고 업데이트정보 — 보고구분(원문 선택지 1개 → 전 행 그 값)', () => {
  const pick = (rt: string) => ids(RU_ROWS.filter((r) => ruPasses(r, { rt })));
  it('기본·투자심의관리 = 4행 전부, 다른 값 = 0건', () => {
    expect(pick('')).toEqual(['ru-1', 'ru-2', 'ru-3', 'ru-4']);
    expect(pick('투자심의관리')).toHaveLength(4);
    expect(pick('정기보고')).toEqual([]);
  });
  it('화면 배선 — 첫 적용 칩(보고구분)', () => {
    expectWired('report_update_info_manage.tsx', 'passesDrawerKeys(r, { rt: fRt })', ['fStat', 'fRt'], ['보고구분']);
  });
});

/* ─────────────── 투심보고 통계(TablesPage) ─────────────── */
describe('투심보고 통계 — 모펀드(고정 기본·MOAF 더미)·계정구분·기준일자', () => {
  /* TablesPage 판정 그대로: 값이 비면 통과, dayRange = 기간 안(열린 경계), 그 외 같은 값 */
  const run = (over: Record<string, string> = {}) => {
    const vals: Record<string, string> = { ...Object.fromEntries(REVIEW_STATS_PAGE.filters.map((f) => [f.label, f.def])), ...over };
    return ids(REVIEW_STATS_VIEW_TABLE.rows.filter((r: Row) => REVIEW_STATS_PAGE.filters.every((f) => {
      const v = vals[f.label];
      if (!v || !f.key) return true;
      const cell = r[f.key];
      if (cell == null) return false;
      if (f.kind === 'dayRange') { const [a, b] = splitRange(v); return (!a || String(cell) >= a) && (!b || String(cell) <= b); }
      return String(cell) === v;
    })));
  };
  const ORIGINAL = ids(REVIEW_STATS_TABLE.rows);

  it('기본(농식품모태펀드 · 원문 기간) = 원문 27행 그대로, 순서도 같다', () => {
    expect(run()).toEqual(ORIGINAL);
    expect(ORIGINAL).toHaveLength(27);
  });
  it('화면 표는 원문 행에 숨은 키만 덧붙이고, 원문 칸은 바꾸지 않는다', () => {
    REVIEW_STATS_TABLE.rows.forEach((r, i) => {
      const { mf, acct, ...rest } = REVIEW_STATS_VIEW_TABLE.rows[i];
      expect(rest).toEqual(r);
      expect(mf).toBe('농식품모태펀드');
      expect(['농식품', '수산']).toContain(acct);
    });
    expect(REVIEW_STATS_VIEW_TABLE.cols).toBe(REVIEW_STATS_TABLE.cols);
  });
  it('컬럼 폭은 전체 행(더미 포함)으로 재는데, 더미 행이 폭을 바꾸지 않는다(기본 화면 R0)', () => {
    const widths = (t: typeof REVIEW_STATS_TABLE, u: '원' | '백만원' | '억원') =>
      (buildColumnDefs(t, t.rows, u) as { colId?: string; width?: number; minWidth?: number }[]).map((c) => [c.colId, c.width, c.minWidth]);
    for (const u of ['원', '백만원', '억원'] as const) expect(widths(REVIEW_STATS_VIEW_TABLE, u)).toEqual(widths(REVIEW_STATS_TABLE, u));
  });
  it('모든 행에 필터 키(mf·acct·payd)가 값으로 있다 — 없으면 TablesPage 가 그 행을 거른다', () => {
    for (const r of REVIEW_STATS_VIEW_TABLE.rows) for (const k of ['mf', 'acct', 'payd']) expect(r[k], `${r.id}.${k}`).not.toBeNull();
  });
  it('모펀드 MOAF = 더미 3행만(id·No 가 원문과 겹치지 않는다)', () => {
    expect(run({ 모펀드: 'MOAF' })).toEqual(['rs-moaf-1', 'rs-moaf-2', 'rs-moaf-3']);
    const nos = REVIEW_STATS_VIEW_TABLE.rows.map((r) => r.no);
    expect(new Set(nos).size).toBe(nos.length);
  });
  it('계정구분 = 자펀드명에 수산이 든 조합', () => {
    expect(run({ 계정구분: '수산' })).toEqual(['rs-10', 'rs-18', 'rs-22', 'rs-27']);
    expect(run({ 계정구분: '농식품' })).toHaveLength(23);
    expect(run({ 모펀드: 'MOAF', 계정구분: '수산' })).toEqual(['rs-moaf-1', 'rs-moaf-2']);
  });
  it('기준일자 = 납입 예정일 기간 — 좁히면 줄어든다', () => {
    expect(run({ 기준일자: '2026-08-01~2026-08-12' })).toEqual(['rs-1', 'rs-2', 'rs-3', 'rs-4', 'rs-5', 'rs-6', 'rs-7', 'rs-8', 'rs-9', 'rs-10']);
    expect(run({ 기준일자: '2026-07-13~2026-07-20' })).toEqual(['rs-22', 'rs-23', 'rs-24', 'rs-25', 'rs-26', 'rs-27']);
  });
  it('운용사·자펀드 선택지는 더미 행 값까지 담아 MOAF 행도 고를 수 있다', () => {
    const opts = (l: string) => REVIEW_STATS_PAGE.filters.find((f) => f.label === l)!.options!;
    for (const r of REVIEW_STATS_VIEW_TABLE.rows) {
      expect(opts('운용사')).toContain(r.gp);
      expect(opts('자펀드')).toContain(r.fund);
    }
  });
});
