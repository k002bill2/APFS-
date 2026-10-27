// @vitest-environment jsdom
/* 수식 편집 다이얼로그(2026-10-27 사용자 요청: 수식 입력 2종 — 블록 수식 아래 입력칸·인라인 수식 팝오버 —
   도 URL 입력처럼 모달로). 입력하며 결과를 보던 장점은 다이얼로그 안 미리보기로 유지한다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EquationDialog } from './RichTextEquationDialog';

afterEach(() => cleanup());

const base = {
  open: true, title: '수식 편집', value: 'E = mc^2', onChange: () => {},
  preview: (tex: string) => `<b data-testid="pv">${tex}</b>`, onSubmit: () => {}, onCancel: () => {},
};
const show = (p: Record<string, unknown> = {}) => render(React.createElement(EquationDialog, { ...base, ...p } as any));

describe('EquationDialog', () => {
  it('제목 · LaTeX 입력 · 렌더 미리보기 · 취소/적용', () => {
    show();
    expect(screen.getByRole('dialog', { name: '수식 편집' })).toBeTruthy();
    expect((screen.getByLabelText('LaTeX') as HTMLInputElement).value).toBe('E = mc^2');
    expect(screen.getByTestId('pv').textContent).toBe('E = mc^2');
    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '적용' })).toBeTruthy();
  });

  it('미리보기는 값을 따라간다', () => {
    const { rerender } = show();
    rerender(React.createElement(EquationDialog, { ...base, value: 'x^2' } as any));
    expect(screen.getByTestId('pv').textContent).toBe('x^2');
  });

  it('값이 비면 미리보기 대신 안내 문구', () => {
    show({ value: '' });
    expect(screen.queryByTestId('pv')).toBeNull();
    expect(screen.getByText(/미리보기/)).toBeTruthy();
  });

  it('입력은 onChange, Enter·적용은 onSubmit, 취소는 onCancel', () => {
    const onChange = vi.fn(); const onSubmit = vi.fn(); const onCancel = vi.fn();
    show({ onChange, onSubmit, onCancel });
    const input = screen.getByLabelText('LaTeX');
    fireEvent.change(input, { target: { value: 'a+b' } });
    expect(onChange).toHaveBeenCalledWith('a+b');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('우클릭이 React 트리 조상(에디터 우클릭 메뉴)으로 새지 않는다', () => {
    const parent = vi.fn();
    render(React.createElement('div', { onContextMenu: parent }, React.createElement(EquationDialog, base as any)));
    fireEvent.contextMenu(screen.getByLabelText('LaTeX'));
    expect(parent).not.toHaveBeenCalled();
  });
});
