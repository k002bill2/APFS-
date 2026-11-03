// @vitest-environment jsdom
/* MultiSelect 접근성·식별 계약(2026-11-03 — SearchableSelect 와 같은 cmdk 결함 3건, searchable-select.test.ts 참조).
   ① listbox 접근名 = 필드명(cmdk List 가 aria-label 을 label 기본 'Suggestions' 로 덮어씀)
   ② cmdk 항목 식별자 = 옵션 값(라벨이면 같은 라벨·다른 값 옵션이 함께 하이라이트됨)
   ③ 검색창 접근名 = '<필드명> 검색'(Input 의 aria-labelledby 가 빈 루트 라벨을 가리키면 '')
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MultiSelect } from './multi-select';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const OPTS = [
  { value: 'a', label: '동일' },
  { value: 'b', label: '동일' },
  { value: 'c', label: '기타' },
];

function open(props: { searchable?: boolean } = {}) {
  const onChange = vi.fn();
  render(React.createElement(MultiSelect, { value: [], onChange, options: OPTS, ariaLabel: '계정구분', ...props }));
  fireEvent.click(screen.getByRole('combobox', { name: /^계정구분/ }));
  return onChange;
}

describe('MultiSelect — 접근名', () => {
  it('목록 이름이 필드명이다(cmdk 기본값 Suggestions 아님)', () => {
    open();
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe('계정구분');
  });
  it('검색창 이름이 "<필드명> 검색" 이다', () => {
    open({ searchable: true });
    expect(screen.getByRole('combobox', { name: '계정구분 검색' })).toBeTruthy();
  });
});

describe('MultiSelect — 같은 라벨·다른 값', () => {
  it('열 때 하이라이트는 한 항목뿐이다', () => {
    open();
    const highlighted = screen.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(highlighted).toHaveLength(1);
  });
  it('검색은 여전히 라벨로 걸린다', () => {
    open({ searchable: true });
    fireEvent.change(screen.getByRole('combobox', { name: '계정구분 검색' }), { target: { value: '기타' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['기타']);
  });
});
