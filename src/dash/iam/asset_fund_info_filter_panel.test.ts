// @vitest-environment jsdom
/* 자펀드정보관리 인라인 필터(2026-11-09 사용자 지시 — "상세필터 drawer 삭제하고 필터칩 라인 위에 필터를 구성").
   같은 SubFundManage 를 쓰는 자펀드 관리(route subfund)는 드로어를 그대로 둔다(ext.inlineFilters opt-in).
   - 인라인: 검색어 + select 8 + 사업연도·기준일자 PeriodPicker = 11칸, 항목명은 placeholder·접근名. [상세필터] 버튼·드로어·적용 칩 없음.
   - 값을 바꾸면 즉시 그리드 External Filter 가 거른다(apfs-detail-filter "즉시 반영").
   AG Grid 는 jsdom 에서 무거워 props 만 기록하는 빈 컴포넌트로 바꾼다(missing_evidence_screen.test 와 같은 방식). globals:false → afterEach cleanup. */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '../ui/tooltip';
import { AssetFundInfoManage, EXT } from './asct/asset_fund_info_manage';
import { SubFundManage } from './sfund/subfund_manage';
import type { SubFundRow } from './sfund/subfund_manage';
import { SubFundFilterPanel, type SubFundFilterValues } from './sfund/subfund_filter_panel';

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

  /* 2026-11-10 사용자 "공통 컴포넌트는 수정하지 말고 여기 있는 애들 선택 후에도 placeholder 가 고정으로 보이게" — 미연동 칸 포함 */
  it('미연동 칸(칩 없음)도 고른 뒤 칸이 항목명으로 돌아간다', () => {
    mount(h(AssetFundInfoManage));
    const sel = screen.getByRole('combobox', { name: '계정구분' }) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: '농식품투자계정(농안기금)' } });
    expect(sel.value).toBe('');
    expect(sel.options[sel.selectedIndex].text).toBe('계정구분');
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

  /* 2026-11-09 사용자 "항목을 선택해도 placeholder 가 다시 보이게 — 선택항목은 아래 필터칩에 들어가기 때문" */
  it('칩이 생기는 항목은 고른 뒤에도 칸이 항목명으로 돌아가고, 값은 칩에만 보인다', () => {
    mount(h(AssetFundInfoManage));
    const sel = screen.getByRole('combobox', { name: '정기/수시' }) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: '수시' } });
    expect(passingIds()).toEqual(['sf-5']);
    expect(screen.getByRole('button', { name: '정기/수시: 수시 — 필터에서 변경' })).toBeTruthy();
    expect(sel.value).toBe('');
    expect(sel.options[sel.selectedIndex].text).toBe('정기/수시');
  });

  /* 2026-11-10 사용자 "기본필터인데 공간을 너무 많이 잡아먹는다" → 드롭다운 칩 1개(이 화면만 먼저 — 310px → ~115px) */
  it('심사단계는 드롭다운 칩 하나 — 값 칩(신청·선정·결성·취소)은 툴바에 없다', () => {
    mount(h(AssetFundInfoManage));
    expect(screen.getByRole('button', { name: '심사단계: 전체' })).toBeTruthy();
    for (const s of ['신청', '선정', '결성', '취소']) expect(screen.queryByRole('button', { name: s }), s).toBeNull();
  });

  it('드롭다운에서 값을 고르면 바로 거르고 칩 글자가 바뀐다', async () => {
    mount(h(AssetFundInfoManage));
    fireEvent.keyDown(screen.getByRole('button', { name: '심사단계: 전체' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitemradio', { name: '결성' }));
    const formed = EXT.seed.filter((r) => r.stg === '결성').map((r) => r.id);
    expect(formed.length).toBeGreaterThan(0);
    expect(passingIds()).toEqual(formed);
    expect(screen.getByRole('button', { name: '심사단계: 결성' })).toBeTruthy();
  });

  it('미연동 항목은 칩을 만들지 않는다', () => {
    mount(h(AssetFundInfoManage));
    fireEvent.change(screen.getByRole('combobox', { name: '모펀드' }), { target: { value: 'MOAF' } });
    expect(screen.queryByRole('button', { name: '모펀드 필터 제거' })).toBeNull();
  });

  /* 2026-11-10 사용자 "이 칩들은 툴팁이 안보이네" — 미연동 안내는 DS Tooltip. 네이티브 title 은 select 의 title(고른 값)에
     덮이거나 환경에 따라 안 뜬다(적용 칩 ChipTip 과 같은 부품). jsdom 은 .focus() 가 focusin 을 내 React onFocus 로 연다 */
  it('미연동 칸 5개는 초점이 가면 DS 툴팁 "데이터 연동 후 적용" 을 보이고, 네이티브 title 은 없다', () => {
    const cells = [['모펀드', 'combobox'], ['계정구분', 'combobox'], ['심사담당자', 'combobox'], ['리스크담당자', 'combobox'], ['기준일자', 'button']] as const;
    for (const [name, role] of cells) {
      mount(h(AssetFundInfoManage));
      const el = screen.getByRole(role, { name });
      expect(el.closest('[title]'), name).toBeNull();
      act(() => el.focus());
      expect(screen.getByRole('tooltip').textContent, name).toBe('데이터 연동 후 적용');
      cleanup();
    }
  });

  /* 달력은 포털이지만 React 이벤트는 컴포넌트 트리로 올라온다 → 달력 안 초점이 칸의 TooltipTrigger 에 닿아 툴팁이 달력 뒤에
     새로 열리면 그 레이어가 최상위가 돼 Esc 를 먼저 먹는다(2026-11-10 ego 실측: Esc 1번에 툴팁만 닫히고 달력은 남음) */
  it('기준일자 달력 안으로 초점이 가도 툴팁이 열리지 않고, Esc 1번에 달력이 닫힌다', async () => {
    mount(h(AssetFundInfoManage));
    fireEvent.click(screen.getByRole('button', { name: '기준일자' }));
    const grid = await screen.findByRole('grid');
    act(() => (grid.querySelector('button') as HTMLElement).focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull());
  });

  it('칩이 생기는 칸은 툴팁이 없다 — 항목명이 칸에 이미 보인다', () => {
    mount(h(AssetFundInfoManage));
    act(() => screen.getByRole('combobox', { name: '자펀드구분' }).focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('미연동 항목(모펀드 등)은 행을 거르지 않는다(거짓 필터링 금지)', () => {
    mount(h(AssetFundInfoManage));
    fireEvent.change(screen.getByRole('combobox', { name: '모펀드' }), { target: { value: 'MOAF' } });
    expect(passingIds().length).toBe(EXT.seed.length);
  });
});

/* 패널 단독 — 전 칸에 값이 들어 있을 때 칸에 무엇이 보이는가. 자펀드 옵션 12개 = 검색형(SearchableSelect) 경로까지 덮는다 */
describe('인라인 필터 패널 — 칸 표시값', () => {
  const FUNDS = Array.from({ length: 12 }, (_, i) => `테스트펀드${i + 1}`);
  const FULL: SubFundFilterValues = {
    text: '그린', mf: '농식품모태펀드', fund: '테스트펀드3', ag: '수산투자계정', type: '벤처투자조합', year: '2017',
    rt: '수시', manager: '이성훈', risk: '양한솔', st: '운영중', asOf: '2026-11-19',
  };
  const panel = () => mount(h(SubFundFilterPanel, { values: FULL, onChange: () => {}, fundOptions: FUNDS }));

  it('선택 칸 10개는 값이 있어도 항목명을 보인다 — 칩 연동·미연동 모두', () => {
    panel();
    for (const name of ['모펀드', '계정구분', '자펀드구분', '정기/수시', '심사담당자', '리스크담당자', '조합상태']) {
      const sel = screen.getByRole('combobox', { name }) as HTMLSelectElement;
      expect(sel.value, name).toBe('');
      expect(sel.options[sel.selectedIndex].text, name).toBe(name);
    }
    /* 검색형 트리거는 폭 사이저(aria-hidden, 모든 라벨)를 함께 품는다 → 보이는 라벨 span 만 본다 */
    const fundShown = screen.getByRole('combobox', { name: '자펀드' }).querySelector('span > span:not([aria-hidden])');
    expect(fundShown?.textContent).toBe('자펀드');
    expect(screen.getByRole('button', { name: '사업연도' }).textContent).not.toContain('2017');
    expect(screen.getByRole('button', { name: '기준일자' }).textContent).not.toContain('2026');
  });

  /* Codex P2(2026-11-10) — Windows·Linux Chromium 은 닫힌 select 의 방향키가 목록을 열지 않고 값을 바로 바꾼다.
     칸엔 늘 '' 를 넘기므로 값이 되돌아가 ↓ 를 반복해도 첫 옵션만 걸린다 → 그 키는 막고 목록(showPicker)을 연다 */
  it('닫힌 선택 칸의 방향키는 값을 바꾸지 않고 목록을 연다(Alt+↓ 는 브라우저 기본 그대로)', () => {
    const proto = HTMLSelectElement.prototype as unknown as { showPicker?: () => void };
    const saved = proto.showPicker;
    const showPicker = vi.fn();
    proto.showPicker = showPicker;
    try {
      panel();
      const sel = screen.getByRole('combobox', { name: '정기/수시' });
      for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']) {
        expect(fireEvent.keyDown(sel, { key }), key).toBe(false);   // false = preventDefault 됨
      }
      expect(showPicker).toHaveBeenCalledTimes(6);
      expect(fireEvent.keyDown(sel, { key: 'ArrowDown', altKey: true })).toBe(true);
    } finally {
      if (saved) proto.showPicker = saved; else delete proto.showPicker;
    }
  });

  /* Codex P2(2026-11-10 2차) — 목록을 못 열면(showPicker 미지원·사용자 활성화 없음) 키를 삼키지 않는다: 브라우저 기본 동작 그대로 */
  it('showPicker 가 없거나 실패하면 방향키를 막지 않는다', () => {
    const proto = HTMLSelectElement.prototype as unknown as { showPicker?: () => void };
    const saved = proto.showPicker;
    try {
      delete proto.showPicker;
      panel();
      const sel = screen.getByRole('combobox', { name: '정기/수시' });
      expect(fireEvent.keyDown(sel, { key: 'ArrowDown' }), '미지원').toBe(true);
      proto.showPicker = () => { throw new DOMException('no activation', 'NotAllowedError'); };
      expect(fireEvent.keyDown(sel, { key: 'ArrowDown' }), '실패').toBe(true);
    } finally {
      if (saved) proto.showPicker = saved; else delete proto.showPicker;
    }
  });

  it('검색어는 입력칸이라 친 글자를 그대로 둔다', () => {
    panel();
    expect((screen.getByRole('textbox', { name: '검색어' }) as HTMLInputElement).value).toBe('그린');
  });
});

describe('자펀드 관리(ext 없음) — 드로어 유지(회귀)', () => {
  it('[상세필터] 버튼이 있고 인라인 칸은 없다', () => {
    mount(h(SubFundManage, {}));
    expect(screen.getByRole('button', { name: '상세필터' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '모펀드' })).toBeNull();
  });

  /* 2026-11-13 사용자 "모두" — '전체' 있는 기본 필터 칩은 전 화면 드롭다운 칩(가드 filter_chip_menu_rule.test.ts).
     11-10 엔 자펀드정보관리만이라 여기서 칩 무리 유지를 고정했었다 */
  it('심사단계 기본 칩도 드롭다운 칩 하나다 — 값 칩(신청…)은 툴바에 없다', () => {
    mount(h(SubFundManage, {}));
    expect(screen.getByRole('button', { name: '심사단계: 전체' }).getAttribute('aria-haspopup')).toBe('menu');
    expect(screen.queryByRole('button', { name: '신청' })).toBeNull();
  });
});
