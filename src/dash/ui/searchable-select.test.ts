// @vitest-environment jsdom
/* SearchableSelect 접근성·식별 계약(2026-11-03 Codex 리뷰 — 다중 선택 샘플에서 찾은 같은 결함 2건).
   ① listbox 접근名 = 필드명. cmdk List 는 aria-label 을 자기 label prop(기본 'Suggestions')으로 덮어쓴다.
   ② cmdk 항목 식별자 = 옵션 값. 라벨을 식별자로 쓰면 라벨이 같고 값이 다른 옵션이 한 항목으로 묶여
      둘 다 하이라이트되고 Enter 가 늘 첫 번째를 고른다(두 번째는 키보드로 못 고름).
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchableSelect } from './searchable-select';

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
