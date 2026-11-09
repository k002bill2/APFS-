// @vitest-environment jsdom
/* 자펀드정보관리 인라인 필터(2026-11-09 사용자 지시 — "상세필터 drawer 삭제하고 필터칩 라인 위에 필터를 구성").
   같은 SubFundManage 를 쓰는 자펀드 관리(route subfund)는 드로어를 그대로 둔다(ext.inlineFilters opt-in).
   - 인라인: 검색어 + select 8 + 사업연도·기준일자 PeriodPicker = 11칸, 항목명은 placeholder·접근名. [상세필터] 버튼·드로어·적용 칩 없음.
   - 값을 바꾸면 즉시 그리드 External Filter 가 거른다(apfs-detail-filter "즉시 반영").
   AG Grid 는 jsdom 에서 무거워 props 만 기록하는 빈 컴포넌트로 바꾼다(missing_evidence_screen.test 와 같은 방식). globals:false → afterEach cleanup. */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '../ui/tooltip';
import { AssetFundInfoManage, EXT } from './asct/asset_fund_info_manage';
import { SubFundManage } from './sfund/subfund_manage';
import type { SubFundRow } from './sfund/subfund_manage';

const grid = vi.hoisted(() => ({ props: null as null | { rowData: SubFundRow[]; doesExternalFilterPass: (n: { data: SubFundRow }) => boolean; isExternalFilterPresent: () => boolean } }));
vi.mock('ag-grid-react', () => ({ AgGridReact: (p: any) => { grid.props = p; return null; } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;

afterEach(() => { cleanup(); grid.props = null; });
/* jsdom 은 레이아웃이 없어 폭이 0 → FilterChipRow 가 칩을 전부 +N 메뉴로 접는다. 칩 줄 판정이 되게 폭만 고정한다(이 파일 한정) */
const widthProps = ['clientWidth', 'offsetWidth'] as const;
const savedWidth = widthProps.map((k) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, k));
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 2000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 60 });
});
afterAll(() => { widthProps.forEach((k, i) => { if (savedWidth[i]) Object.defineProperty(HTMLElement.prototype, k, savedWidth[i]!); }); });

const h = React.createElement;
const mount = (el: React.ReactElement) => render(h(TooltipProvider, null, el));
/* 현재 External Filter 를 통과하는 행 id — 필터가 없으면 전 행 */
const passingIds = () => {
  const p = grid.props!;
  return p.rowData.filter((r) => !p.isExternalFilterPresent() || p.doesExternalFilterPass({ data: r })).map((r) => r.id);
};

const SELECTS = ['모펀드', '자펀드', '계정구분', '자펀드구분', '정기/수시', '심사담당자', '리스크담당자', '조합상태'];

describe('자펀드정보관리 — 인라인 필터', () => {
  it('EXT 가 인라인 필터를 켠다', () => {
    expect(EXT.inlineFilters).toBe(true);
  });

  it('11칸이 접근名으로 보이고, [상세필터]·드로어는 없다', () => {
    mount(h(AssetFundInfoManage));
    expect(screen.getByRole('textbox', { name: '검색어' })).toBeTruthy();
    for (const name of SELECTS) expect(screen.getByRole('combobox', { name }), name).toBeTruthy();
    expect(screen.getByRole('button', { name: '사업연도' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '기준일자' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '상세필터' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('미선택 select 는 항목명을 보여 준다(이미지 placeholder)', () => {
    mount(h(AssetFundInfoManage));
    for (const name of SELECTS) {
      const sel = screen.getByRole('combobox', { name }) as HTMLSelectElement;
      expect(sel.value).toBe('');
      expect(sel.options[sel.selectedIndex].text).toBe(name);
    }
    expect((screen.getByRole('textbox', { name: '검색어' }) as HTMLInputElement).placeholder).toBe('검색어');
  });

  it('값을 바꾸면 즉시 그리드가 거른다 — 정기/수시·검색어', () => {
    mount(h(AssetFundInfoManage));
    const all = passingIds();
    expect(all.length).toBe(EXT.seed.length);
    fireEvent.change(screen.getByRole('combobox', { name: '정기/수시' }), { target: { value: '수시' } });
    expect(passingIds()).toEqual(['sf-5']);
    fireEvent.change(screen.getByRole('combobox', { name: '정기/수시' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: '검색어' }), { target: { value: '그린바이오' } });
    expect(passingIds()).toEqual(['sf-2']);
  });

  it('고른 값은 칸이 좁아 잘려도 title 로 전문을 회수한다(120px 고정폭 · 적용 칩 없음)', () => {
    mount(h(AssetFundInfoManage));
    const sel = screen.getByRole('combobox', { name: '계정구분' }) as HTMLSelectElement;
    expect(sel.title).toBe('');
    fireEvent.change(sel, { target: { value: '농식품투자계정(농안기금)' } });
    expect(sel.title).toBe('농식품투자계정(농안기금)');
  });

  /* 2026-11-09 사용자 "옵션 선택시 필터칩이 하단에 들어와야해" — 패널 아래 칩 줄에 적용 칩. 칩 본문 = 그 칸으로 이동, × = 해제 */
  it('값을 고르면 아래 칩 줄에 적용 칩이 뜨고, ×로 해제된다', () => {
    mount(h(AssetFundInfoManage));
    const sel = screen.getByRole('combobox', { name: '정기/수시' }) as HTMLSelectElement;
    expect(screen.queryByRole('button', { name: '정기/수시 필터 제거' })).toBeNull();
    fireEvent.change(sel, { target: { value: '수시' } });
    expect(screen.getByRole('button', { name: '정기/수시: 수시 — 필터에서 변경' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '정기/수시 필터 제거' }));
    expect(sel.value).toBe('');
    expect(passingIds().length).toBe(EXT.seed.length);
  });

  it('미연동 항목은 칩을 만들지 않는다', () => {
    mount(h(AssetFundInfoManage));
    fireEvent.change(screen.getByRole('combobox', { name: '모펀드' }), { target: { value: 'MOAF' } });
    expect(screen.queryByRole('button', { name: '모펀드 필터 제거' })).toBeNull();
  });

  it('미연동 항목(모펀드 등)은 행을 거르지 않는다(거짓 필터링 금지)', () => {
    mount(h(AssetFundInfoManage));
    fireEvent.change(screen.getByRole('combobox', { name: '모펀드' }), { target: { value: 'MOAF' } });
    expect(passingIds().length).toBe(EXT.seed.length);
  });
});

describe('자펀드 관리(ext 없음) — 드로어 유지(회귀)', () => {
  it('[상세필터] 버튼이 있고 인라인 칸은 없다', () => {
    mount(h(SubFundManage, {}));
    expect(screen.getByRole('button', { name: '상세필터' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '모펀드' })).toBeNull();
  });
});
