// @vitest-environment jsdom
/* SplitButton — 본체 클릭 = 주 동작, ▾ = 보조 동작 메뉴(2026-09-24 등록원부관리 입력|업로드).
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SplitButton } from './split-button';
import { TooltipProvider } from './tooltip';

afterEach(() => cleanup());

const setup = () => {
  const onClick = vi.fn();
  const onUpload = vi.fn();
  render(React.createElement(SplitButton, {
    label: '등록원부입력', leadingIcon: 'plus', onClick, menuLabel: '등록원부 추가 동작',
    items: [{ label: '등록원부업로드', icon: 'upload', onSelect: onUpload }],
  }));
  return { onClick, onUpload };
};

describe('SplitButton', () => {
  it('본체 클릭은 주 동작만 실행한다(메뉴를 열지 않는다)', () => {
    const { onClick, onUpload } = setup();
    fireEvent.click(screen.getByRole('button', { name: '등록원부입력' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });
  it('▾ 트리거는 접근名을 갖고, 메뉴 항목 선택이 보조 동작을 실행한다', () => {
    const { onClick, onUpload } = setup();
    const trigger = screen.getByRole('button', { name: '등록원부 추가 동작' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: /등록원부업로드/ }));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SplitButton iconOnly(푸터 인쇄 combo)', () => {
  it('본체는 아이콘만이고 label 이 접근名이다 — 클릭 = 주 동작, ▾ 메뉴 = 보조 동작', () => {
    const onClick = vi.fn();
    const onPick = vi.fn();
    render(React.createElement(TooltipProvider, null, React.createElement(SplitButton, {
      label: '인쇄', leadingIcon: 'printer', iconOnly: true, onClick, menuLabel: '출력 메뉴',
      items: [{ label: '등록원부 출력', onSelect: onPick }],
    })));
    const main = screen.getByRole('button', { name: '인쇄' });
    expect(main.textContent).toBe('');
    fireEvent.click(main);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('button', { name: '출력 메뉴' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: '등록원부 출력' }));
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
