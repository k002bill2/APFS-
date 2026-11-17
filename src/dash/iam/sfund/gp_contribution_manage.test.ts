// @vitest-environment jsdom
/* 출자/분배조회(자펀드) 상세필터 — 2026-11-16 사용자 지시(미연동 필터 전부 동작).
   종전엔 모펀드·계정구분·담당자가 미연동 캡션만 달고 행을 거르지 않았다(담당자는 선택지도 없었다).
   지금은 숨은 행 속성(mf·acc·mgr — 그리드 컬럼 없음)으로 거르고 적용 칩을 단다.
   12행이 한 자펀드(현대동양)의 거래라 세 값이 전 행 같다 → 같은 값이면 12행, 다른 값이면 0건이 정상(행 단위로 나누지 않는다).
   2026-11-17 상세필터 드로어 폐기 — 칸은 칩 줄 위 인라인 패널(group '출자/분배조회(자펀드) 조건')에 늘 펼쳐져 있고, 고르는 즉시 칩이 뜬다.
   AG Grid 는 props 만 기록하는 빈 컴포넌트로 바꾼다(asset_fund_info_filter_panel.test 와 같은 방식). */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TooltipProvider } from '../../ui/tooltip';
import { GpContributionManage } from './gp_contribution_manage';
import type { GpContribRow } from './gp_contribution_manage';

const grid = vi.hoisted(() => ({ props: null as null | { rowData: GpContribRow[]; pinnedBottomRowData: GpContribRow[]; doesExternalFilterPass: (n: { data: GpContribRow }) => boolean; isExternalFilterPresent: () => boolean } }));
vi.mock('ag-grid-react', () => ({ AgGridReact: (p: any) => { grid.props = p; return null; } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;

afterEach(() => { cleanup(); grid.props = null; });
const widthProps = ['clientWidth', 'offsetWidth'] as const;
const savedWidth = widthProps.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 2000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 60 });
});
afterAll(() => { widthProps.forEach((k, i) => { if (savedWidth[i]) Object.defineProperty(HTMLElement.prototype, k, savedWidth[i]!); }); });

const h = React.createElement;
const mount = () => render(h(TooltipProvider, null, h(GpContributionManage, {})));
const passingCount = () => {
  const p = grid.props!;
  return p.rowData.filter((r) => !p.isExternalFilterPresent() || p.doesExternalFilterPass({ data: r })).length;
};
const panel = () => screen.getByRole('group', { name: '출자/분배조회(자펀드) 조건' });

describe('출자/분배조회(자펀드) — 모펀드·계정구분·담당자가 행을 거른다', () => {
  it('기본 상태는 12행 그대로, 합계(배분합계)도 그대로(R0)', () => {
    mount();
    expect(grid.props!.isExternalFilterPresent()).toBe(false);
    expect(passingCount()).toBe(12);
    const tot = grid.props!.pinnedBottomRowData.find((r) => r.id === '__tot')!;
    expect(tot.dist).toBe(5_600_000_000 + 1_920_000_000 + 1_200_000_000 + 2_562_000_000 + 16_640_000_000 + 190_625_010 + 2_159_868_927);
  });

  it('다른 모펀드·계정구분을 고르면 0건, 같은 값이면 12행 · 칩이 바로 보인다', () => {
    mount();
    const dlg = panel();
    fireEvent.change(within(dlg).getByRole('combobox', { name: '모펀드' }), { target: { value: 'MOAF' } });
    expect(passingCount()).toBe(0);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '모펀드' }), { target: { value: '농식품모태펀드' } });
    expect(passingCount()).toBe(12);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '계정구분' }), { target: { value: '수산' } });
    expect(passingCount()).toBe(0);
    fireEvent.change(within(dlg).getByRole('combobox', { name: '계정구분' }), { target: { value: '농식품' } });
    expect(passingCount()).toBe(12);
    expect(screen.getByRole('button', { name: '모펀드: 농식품모태펀드 — 필터에서 변경' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '계정구분: 농식품 — 필터에서 변경' })).toBeTruthy();
  });

  it('담당자 선택지 = 행 실제 값(종전 빈 목록) · 고르면 칩이 생기고 ×로 해제된다', () => {
    mount();
    const dlg = panel();
    const sel = within(dlg).getByRole('combobox', { name: '담당자' }) as HTMLSelectElement;
    const opts = [...sel.options].map((o) => o.value).filter(Boolean);
    expect(opts).toEqual(['이성훈']);
    fireEvent.change(sel, { target: { value: '이성훈' } });
    expect(grid.props!.isExternalFilterPresent()).toBe(true);
    expect(passingCount()).toBe(12);
    fireEvent.click(screen.getByRole('button', { name: '담당자 필터 제거' }));
    expect(grid.props!.isExternalFilterPresent()).toBe(false);
  });

  it('패널에 미연동 칸(noop — 툴팁 \'데이터 연동 후 적용\')이 없다', () => {
    mount();
    expect(panel().textContent).not.toMatch(/연동 후 적용/);
    /* noop 칸은 PanelCell 이 칸 div 를 DS TooltipTrigger(asChild)로 감싸 data-state 가 붙는다 — 그런 칸이 없어야 한다 */
    expect(panel().querySelectorAll('div[data-state]')).toHaveLength(0);
  });
});
