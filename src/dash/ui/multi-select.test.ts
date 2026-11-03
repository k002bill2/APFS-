// @vitest-environment jsdom
/* MultiSelect 접근성·식별 계약(2026-11-03 — SearchableSelect 와 같은 cmdk 결함 3건, searchable-select.test.ts 참조).
   ① listbox 접근名 = 필드명(cmdk List 가 aria-label 을 label 기본 'Suggestions' 로 덮어씀)
   ② cmdk 항목 식별자 = 옵션 값(라벨이면 같은 라벨·다른 값 옵션이 함께 하이라이트됨)
   ③ 검색창 접근名 = '<필드명> 검색'(Input 의 aria-labelledby 가 빈 루트 라벨을 가리키면 '')
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MultiSelect, multiSelectSummary, multiSelectSummaryParts } from './multi-select';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const OPTS = [
  { value: 'a', label: '동일' },
  { value: 'b', label: '동일' },
  { value: 'c', label: '기타' },
];

function open(props: { searchable?: boolean; value?: string[] } = {}) {
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

/* 2026-11-03 다중 선택 샘플(디자인시스템 3-5) 동작 이식 — 일계표 계정구분이 쓰는 컴포넌트.
   맨 위 '전체 선택'(3상태) · 하단 'N개 선택 · 선택 해제' · 검색창 없으면 열자마자 listbox 초점 + Space 토글. */
const allRow = () => screen.getAllByRole('option')[0];
const itemRows = () => screen.getAllByRole('option').slice(1);

describe('MultiSelect — 전체 선택', () => {
  it('맨 위 항목이 "전체 선택"이고 없음/일부/전부를 aria-checked 로 알린다', () => {
    open();
    expect(allRow().textContent).toBe('전체 선택');
    expect(allRow().getAttribute('aria-checked')).toBe('false');
    cleanup(); document.body.replaceChildren();
    open({ value: ['a'] });
    expect(allRow().getAttribute('aria-checked')).toBe('mixed');
    cleanup(); document.body.replaceChildren();
    open({ value: ['a', 'b', 'c'] });
    expect(allRow().getAttribute('aria-checked')).toBe('true');
  });
  it('없음·일부에서 누르면 전부(옵션 순서), 전부에서 누르면 해제', () => {
    let onChange = open({ value: ['c'] });
    fireEvent.click(allRow());
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    cleanup(); document.body.replaceChildren();
    onChange = open({ value: ['a', 'b', 'c'] });
    fireEvent.click(allRow());
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
  it('항목 체크 상태는 aria-checked, 표시용 체크는 버튼이 아니다(중첩 인터랙티브 없음)', () => {
    open({ value: ['b'] });
    expect(itemRows().map((o) => o.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(screen.getByRole('listbox').querySelectorAll('button')).toHaveLength(0);
  });
});

describe('MultiSelect — 하단 개수·선택 해제', () => {
  it('선택 개수를 보여 주고 [선택 해제]는 전부 비운다', () => {
    const onChange = open({ value: ['a', 'c'] });
    expect(screen.getByText('2개 선택')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
  it('하나도 없으면 [선택 해제]는 비활성', () => {
    open();
    expect((screen.getByRole('button', { name: '선택 해제' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('MultiSelect — 키보드(검색창 없음)', () => {
  it('열자마자 초점이 listbox 에 있다', () => {
    open();
    expect(document.activeElement).toBe(screen.getByRole('listbox'));
  });
  it('Space 는 하이라이트 항목을 토글한다(첫 하이라이트 = 전체 선택)', () => {
    const onChange = open();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith(['a']);
  });
});

/* 2026-11-03 트리거 폭 · 모바일 — 일계표 계정구분 실측: 3개 선택 시 '…(기금) 외 2' 가 가장 긴 라벨보다 길어
   칸이 196→223px 로 출렁였고, 좁은 드로어(240px)에선 말줄임이 '외 2' 를 먼저 먹어 개수가 안 보였다.
   ① 요약 = head(라벨, 말줄임) + rest(' 외 N', 줄지 않음) ② 폭 사이저 = 가장 넓은 요약 후보(처음부터 그 폭). */
const trigger = () => screen.getByRole('combobox', { name: /^계정구분/ });
const renderTrigger = (value: string[]) =>
  render(React.createElement(MultiSelect, { value, onChange: vi.fn(), options: OPTS, ariaLabel: '계정구분' }));

describe('MultiSelect — 트리거 요약', () => {
  it('요약을 라벨(head)과 "외 N"(rest)으로 나눈다 — 합치면 기존 문구와 같다', () => {
    expect(multiSelectSummaryParts([], '전체')).toEqual({ head: '전체', rest: '' });
    expect(multiSelectSummaryParts(['A'], '전체')).toEqual({ head: 'A', rest: '' });
    expect(multiSelectSummaryParts(['A', 'B', 'C'], '전체')).toEqual({ head: 'A', rest: ' 외 2' });
    expect(multiSelectSummary(['A', 'B', 'C'], '전체')).toBe('A 외 2');
  });
  it('"외 N" 은 줄어들지 않는 별도 요소이고 말줄임은 라벨에만 걸린다', () => {
    renderTrigger(['a', 'b', 'c']);
    const visible = [...trigger().querySelectorAll('span')].filter((s) => !s.closest('[aria-hidden]'));
    const rest = visible.find((s) => s.textContent === ' 외 2');
    const head = visible.find((s) => s.textContent === '동일');
    expect(rest?.style.flexShrink).toBe('0');
    expect(head?.style.textOverflow).toBe('ellipsis');
  });
  it('폭 사이저 = 가장 넓은 요약 후보 — 아무것도 안 골라도 선택 후와 같은 폭', () => {
    renderTrigger([]);
    const sizers = [...trigger().querySelectorAll('[aria-hidden]')].map((s) => s.textContent).filter(Boolean);
    // 반환이 options 순서라 첫 라벨이 i번째면 '외 N' 의 최댓값은 뒤에 남은 옵션 수
    expect(sizers).toEqual(['전체', '동일 외 2', '동일 외 1', '기타']);
  });
});
