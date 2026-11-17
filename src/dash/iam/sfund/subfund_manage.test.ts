// @vitest-environment jsdom
/* 자펀드 관리(route subfund) 상세필터 — 2026-11-16 사용자 지시(미연동 필터 전부 동작).
   종전엔 모펀드·계정구분·심사담당자·리스크담당자·기준일자가 미연동 캡션만 달고 행을 거르지 않았다.
   지금은 숨은 행 속성(mf·ag·manager·risk — 그리드 컬럼 없음)과 등록일시(rd ≤ 기준일자)로 거르고 적용 칩을 단다.
   - 기본 상태(전부 빈 값)는 5행 그대로(R0).
   - 2026-11-17 상세필터 드로어 폐기 — 자펀드 관리도 칩 줄 위 인라인 패널(subfund_filter_panel, group '자펀드 검색 조건')이다.
     칸은 늘 펼쳐져 있고 고르는 즉시 칩이 뜬다([필터 적용] 없음). 패널 칸 모양 회귀는 asset_fund_info_filter_panel.test.ts 가 덮는다.
   AG Grid 는 props 만 기록하는 빈 컴포넌트로 바꾼다(asset_fund_info_filter_panel.test 와 같은 방식). */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TooltipProvider } from '../../ui/tooltip';
import { DEMO, SubFundManage, hiddenPasses, withHidden } from './subfund_manage';
import type { HiddenFilters, SubFundRow } from './subfund_manage';
import { OPT_MANAGER, OPT_MF } from './subfund_manage_schemas';

const grid = vi.hoisted(() => ({ props: null as null | { rowData: SubFundRow[]; doesExternalFilterPass: (n: { data: SubFundRow }) => boolean; isExternalFilterPresent: () => boolean } }));
vi.mock('ag-grid-react', () => ({ AgGridReact: (p: any) => { grid.props = p; return null; } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;

afterEach(() => { cleanup(); grid.props = null; });
/* jsdom 은 폭이 0 → 칩 줄이 칩을 전부 +N 메뉴로 접는다. 칩 판정이 되게 폭만 고정한다(이 파일 한정) */
const widthProps = ['clientWidth', 'offsetWidth'] as const;
const savedWidth = widthProps.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 2000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 60 });
});
afterAll(() => { widthProps.forEach((k, i) => { if (savedWidth[i]) Object.defineProperty(HTMLElement.prototype, k, savedWidth[i]!); }); });

const h = React.createElement;
const mount = () => render(h(TooltipProvider, null, h(SubFundManage, {})));
const passingIds = () => {
  const p = grid.props!;
  return p.rowData.filter((r) => !p.isExternalFilterPresent() || p.doesExternalFilterPass({ data: r })).map((r) => r.id);
};
const ALL = DEMO.map((r) => r.id);
const NONE: HiddenFilters = { mf: '', ag: '', manager: '', risk: '', asOf: '' };
const ids = (f: Partial<HiddenFilters>) => DEMO.filter((r) => hiddenPasses(r, { ...NONE, ...f })).map((r) => r.id);

describe('숨은 속성 판정(hiddenPasses) — 순수 함수', () => {
  it('기본(전부 빈 값)은 5행 그대로 통과한다(R0)', () => {
    expect(ids({})).toEqual(ALL);
  });

  it('조건마다 값을 바꾸면 행이 실제로 줄어든다', () => {
    expect(ids({ mf: 'MOAF' })).toEqual(['sf-5']);
    expect(ids({ mf: '농식품모태펀드' })).toEqual(['sf-1', 'sf-2', 'sf-3', 'sf-4']);
    expect(ids({ ag: '수산투자계정' })).toEqual(['sf-5']);
    expect(ids({ ag: '농식품투자계정(농안기금)' })).toEqual(['sf-2']);
    expect(ids({ manager: '이성훈' })).toEqual(['sf-2', 'sf-4']);
    expect(ids({ risk: '양한솔' })).toEqual(['sf-2', 'sf-3']);
    /* 기준일자 = 그날까지 등록된 자펀드(등록일시 rd ≤ 값) — 하루 차이로 sf-1(2026-05-20)이 빠진다 */
    expect(ids({ asOf: '2026-05-20' })).toEqual(ALL);
    expect(ids({ asOf: '2026-05-19' })).toEqual(['sf-2', 'sf-3', 'sf-4', 'sf-5']);
    expect(ids({ asOf: '2018-12-31' })).toEqual(['sf-3', 'sf-4']);
  });

  it('모펀드·담당자 선택지마다 1행 이상이 있다(모펀드는 농식품 다수·MOAF 소수)', () => {
    for (const v of OPT_MF) expect(ids({ mf: v }).length, v).toBeGreaterThan(0);
    for (const v of OPT_MANAGER) {
      expect(ids({ manager: v }).length, v).toBeGreaterThan(0);
      expect(ids({ risk: v }).length, v).toBeGreaterThan(0);
    }
    expect(ids({ mf: '농식품모태펀드' }).length).toBeGreaterThan(ids({ mf: 'MOAF' }).length);
  });

  it('withHidden — 있는 값은 그대로, 빈 행(확장 시드)은 결정적으로 채운다', () => {
    expect(withHidden(DEMO)).toEqual(DEMO);
    const bare = { ...DEMO[2], id: 'x', mf: undefined, ag: undefined, manager: undefined, risk: undefined };
    const a = withHidden([DEMO[0], bare]);
    expect(a[1]).toMatchObject({ mf: '농식품모태펀드', ag: '농식품투자계정', manager: '이성훈', risk: '양한솔' });
    expect(withHidden([DEMO[0], bare])).toEqual(a);   // 같은 입력 = 같은 결과(난수 없음)
  });
});

describe('자펀드 관리 인라인 패널 — 종전 미연동 5항목이 행을 거른다', () => {
  const panel = () => screen.getByRole('group', { name: '자펀드 검색 조건' });

  it('기본 상태는 5행 그대로이고 미연동 칸이 없다', () => {
    mount();
    expect(passingIds()).toEqual(ALL);
    const dlg = panel();
    expect(dlg.textContent).not.toMatch(/연동 후 적용/);
    /* noop 칸은 PanelCell 이 칸 div 를 DS TooltipTrigger(asChild)로 감싸 data-state 가 붙는다 — 그런 칸이 없어야 한다 */
    expect(dlg.querySelectorAll('div[data-state]')).toHaveLength(0);
  });

  it('모펀드·계정구분·심사담당자·리스크담당자를 고르면 행이 줄고, 칩이 바로 보인다 · 전체 해제하면 5행', () => {
    mount();
    const dlg = panel();
    fireEvent.change(within(dlg).getByRole('combobox', { name: '모펀드' }), { target: { value: '농식품모태펀드' } });
    expect(passingIds()).toEqual(['sf-1', 'sf-2', 'sf-3', 'sf-4']);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '계정구분' }), { target: { value: '농식품투자계정' } });
    expect(passingIds()).toEqual(['sf-1', 'sf-3', 'sf-4']);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '심사담당자' }), { target: { value: '양한솔' } });
    expect(passingIds()).toEqual(['sf-1', 'sf-3']);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '리스크담당자' }), { target: { value: '이성훈' } });
    expect(passingIds()).toEqual(['sf-1']);
    for (const [label, value] of [['모펀드', '농식품모태펀드'], ['계정구분', '농식품투자계정'], ['심사담당자', '양한솔'], ['리스크담당자', '이성훈']]) {
      expect(screen.getByRole('button', { name: `${label}: ${value} — 필터에서 변경` }), label).toBeTruthy();
    }
    /* 기본값이 전부 빈 값인 화면이라 패널 [초기화]는 없다(apfs-detail-filter) — 칩 줄 '전체 해제'가 같은 일을 한다 */
    expect(within(dlg).queryByRole('button', { name: '초기화' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '전체 해제' }));
    expect(passingIds()).toEqual(ALL);
  });

  it('기준일자를 고르면 그날까지 등록된 자펀드만 남고 칩이 생긴다', async () => {
    mount();
    const dlg = panel();
    fireEvent.click(within(dlg).getByRole('button', { name: '기준일자' }));
    const cal = await screen.findByRole('grid');
    const pop = cal.closest('[role="dialog"]') as HTMLElement;
    const selects = within(pop).getAllByRole('combobox') as HTMLSelectElement[];
    const yearSel = selects.find((s) => [...s.options].some((o) => o.value === '2026'))!;
    fireEvent.change(yearSel, { target: { value: '2026' } });
    fireEvent.change(selects.find((s) => s !== yearSel)!, { target: { value: '4' } });   // 0-기준 월 = 5월
    fireEvent.click(within(screen.getByRole('grid')).getAllByRole('button').find((b) => b.textContent === '19')!);
    expect(passingIds()).toEqual(['sf-2', 'sf-3', 'sf-4', 'sf-5']);
    expect(screen.getByRole('button', { name: '기준일자: 2026-05-19 — 필터에서 변경' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '기준일자 필터 제거' }));
    expect(passingIds()).toEqual(ALL);
  });

  it('검색어는 숨은 속성에 걸리지 않는다(화면에 안 보이는 값으로 행이 남지 않게)', () => {
    mount();
    const dlg = panel();
    fireEvent.change(within(dlg).getByRole('textbox', { name: '검색어' }), { target: { value: '농식품투자계정' } });
    expect(passingIds()).toEqual([]);
    fireEvent.change(within(dlg).getByRole('textbox', { name: '검색어' }), { target: { value: '양한솔' } });
    expect(passingIds()).toEqual([]);
  });
});
