// @vitest-environment jsdom
/* SearchableSelect 접근성·식별 계약(2026-11-03 Codex 리뷰 — 다중 선택 샘플에서 찾은 같은 결함 2건).
   ① listbox 접근名 = 필드명. cmdk List 는 aria-label 을 자기 label prop(기본 'Suggestions')으로 덮어쓴다.
   ② cmdk 항목 식별자 = 옵션 값. 라벨을 식별자로 쓰면 라벨이 같고 값이 다른 옵션이 한 항목으로 묶여
      둘 다 하이라이트되고 Enter 가 늘 첫 번째를 고른다(두 번째는 키보드로 못 고름).
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchableSelect, OPTION_POPOVER_STYLE } from './searchable-select';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const OPTS = [
  { value: 'a', label: '동일' },
  { value: 'b', label: '동일' },
  { value: 'c', label: '기타' },
];

// 검색창은 접근名으로 찾는다 — 이름이 비면(cmdk 가 aria-labelledby 로 빈 <label cmdk-label> 을 가리킴) 여기서 바로 실패한다.
const searchInput = () => screen.getByRole('combobox', { name: '운용사 검색' }) as HTMLInputElement;

function openWith(value: string) {
  const onChange = vi.fn();
  render(React.createElement(SearchableSelect, { value, onChange, options: OPTS, ariaLabel: '운용사' }));
  fireEvent.click(screen.getByRole('combobox', { name: '운용사' }));
  return onChange;
}

describe('SearchableSelect — 접근名', () => {
  it('목록 이름이 필드명이다(cmdk 기본값 Suggestions 아님)', () => {
    openWith('');
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe('운용사');
  });
  it('검색창 이름이 "<필드명> 검색" 이다(aria-label 을 가리는 빈 cmdk-label 아님)', () => {
    openWith('');
    expect(searchInput()).toBeTruthy();
  });
});

describe('SearchableSelect — 같은 라벨·다른 값', () => {
  it('열 때 현재 값 항목 하나만 하이라이트된다', () => {
    openWith('b');
    const opts = screen.getAllByRole('option');
    const highlighted = opts.filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toBe(opts[1]);
  });

  it('Enter 는 하이라이트된 두 번째 항목의 값을 고른다', () => {
    const onChange = openWith('b');
    fireEvent.keyDown(searchInput(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('검색은 여전히 라벨로 걸린다', () => {
    openWith('');
    fireEvent.change(searchInput(), { target: { value: '기타' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['기타']);
  });
});

/* 옵션 라벨 잘림 없음(2026-11-17 사용자 지시 "옵션리스트가 안잘리게") — 팝오버 폭이 220px·트리거 폭에 묶이고 라벨이 truncate 라
   긴 자펀드명이 '웰투시-NBH 전북애그리푸…' 로 잘렸다. 폭 = 가장 긴 라벨 한 줄(숨은 사이저), 상한을 넘으면 말줄임 대신 줄바꿈.
   jsdom 은 레이아웃이 없어 실제 폭은 브라우저에서 잰다 — 여기서는 계약(말줄임 클래스 없음 · 사이저가 전 라벨 유지)만 고정한다. */
describe('SearchableSelect — 옵션 라벨 잘림 없음', () => {
  const LONG = [
    { value: 'x', label: '엔비에이치(NBH)-케이프 2023 K-Farm 투자조합' },
    { value: 'y', label: '롯데농식품테크펀드2호' },
  ];
  const openLong = () => {
    render(React.createElement(SearchableSelect, { value: '', onChange: vi.fn(), options: LONG, ariaLabel: '자펀드', allLabel: '전체' }));
    fireEvent.click(screen.getByRole('combobox', { name: '자펀드' }));
  };
  const sizerTexts = () => [...document.querySelectorAll('[data-option-sizer] > *')].map((n) => n.textContent);

  it('옵션 라벨은 말줄임 대신 줄바꿈된다', () => {
    openLong();
    const labels = screen.getAllByRole('option').map((o) => o.querySelector('span') as HTMLElement);
    expect(labels).toHaveLength(3);
    for (const s of labels) {
      expect(s.className).not.toMatch(/\btruncate\b/);
      expect(s.className).toMatch(/\bwhitespace-normal\b/);
    }
  });

  it('폭 사이저가 전 라벨을 갖고, 검색으로 항목이 줄어도 그대로다(타이핑 중 폭 출렁임 방지)', () => {
    openLong();
    const all = ['전체', ...LONG.map((o) => o.label)];
    expect(sizerTexts()).toEqual(all);
    fireEvent.change(screen.getByRole('combobox', { name: '자펀드 검색' }), { target: { value: '없는값' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(sizerTexts()).toEqual(all);
  });

  it('사이저는 보조기술에 숨는다', () => {
    openLong();
    expect(document.querySelector('[data-option-sizer]')?.getAttribute('aria-hidden')).toBe('true');
  });
});

/* 스크롤바 자리 고정은 긴 목록에만 — 걸러져 스크롤이 사라질 때 폭 출렁임(334→323px 실측)을 막는 용도라,
   처음부터 스크롤이 없는 짧은 목록(전표 손익부서 4개 등 직접 사용처)에 주면 클래식 스크롤바 환경에서 빈 띠만 남는다. */
describe('SearchableSelect — 스크롤바 자리 고정 범위', () => {
  const listClass = (n: number) => {
    const options = Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `옵션${i}` }));
    render(React.createElement(SearchableSelect, { value: '', onChange: vi.fn(), options, ariaLabel: '항목' }));
    fireEvent.click(screen.getByRole('combobox', { name: '항목' }));
    return screen.getByRole('listbox').className;
  };
  it('짧은 목록(10행 미만)은 자리를 비워 두지 않는다', () => {
    expect(listClass(4)).not.toContain('scrollbar-gutter');
  });
  it('긴 목록(10행 이상)은 자리를 비워 둔다', () => {
    expect(listClass(12)).toContain('[scrollbar-gutter:stable]');
  });
});

/* 하한도 상한으로 묶는다 — CSS 는 min-width 가 max-width 를 이겨, 420px 보다 넓은 트리거면 뷰포트 상한이 깨진다(Codex P2, 2026-11-17).
   jsdom 은 CSS 수식을 계산하지 않아 식의 모양만 고정한다(브라우저 실측: 트리거 600px → 팝오버 420px). */
describe('SearchableSelect — 팝오버 폭 상한', () => {
  it('min-width 식이 max-width 상한을 품는다', () => {
    expect(String(OPTION_POPOVER_STYLE.minWidth)).toContain(String(OPTION_POPOVER_STYLE.maxWidth));
  });
});
