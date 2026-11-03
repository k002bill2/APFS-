// @vitest-environment jsdom
/* CommandDialog(⌘K 명령 팔레트) 검색창 접근名 계약(2026-11-03).
   cmdk Input 은 aria-labelledby 로 루트가 그리는 sr-only <label cmdk-label> 을 가리킨다 — 루트에 label 이 없으면
   그 라벨이 비어 검색창 접근名이 '' 가 된다(aria-label·placeholder 보다 labelledby 가 우선). 그래서 루트 label 을 넘긴다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CommandDialog, CommandInput } from './command';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const renderPalette = (label?: string) =>
  render(React.createElement(CommandDialog, { open: true, onOpenChange: () => {}, label }, React.createElement(CommandInput, { placeholder: '메뉴·운용사·자펀드 검색…' })));

describe('CommandDialog — 검색창 접근名', () => {
  it('label 을 넘기면 그 이름', () => {
    renderPalette('메뉴·운용사·자펀드 검색');
    expect(screen.getByRole('combobox', { name: '메뉴·운용사·자펀드 검색' })).toBeTruthy();
  });
  it('label 을 안 넘겨도 이름이 비지 않는다(기본 "검색")', () => {
    renderPalette();
    expect(screen.getByRole('combobox', { name: '검색' })).toBeTruthy();
  });
});
