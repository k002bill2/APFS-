// @vitest-environment jsdom
/* 결성조합 수정 — 상세필터가 거르는 숨은 속성(계정구분 ag · 심사담당자 manager · 리스크담당자 risk)을 열 때 싣고 저장 때 되돌린다
   (Codex P2 2026-11-16: 저장값을 행에 안 실으면 저장한 담당자로 걸러도 그 자펀드가 안 나온다). */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '../../ui/tooltip';
import { SubFundFormEditModal } from './subfund_form_modal';
import { DEMO } from './subfund_manage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
afterEach(() => { cleanup(); });

describe('결성조합 수정 — 숨은 필터 속성 왕복', () => {
  it('열면 행의 담당자를 싣고, 저장하면 ag·manager·risk 를 그대로 돌려준다', async () => {
    const row = { ...DEMO[3], ag: '수산투자계정', manager: '이성훈', risk: '양한솔' };
    const onSave = vi.fn();
    render(React.createElement(TooltipProvider, null, React.createElement(SubFundFormEditModal, { row, onSave, onClose: vi.fn() })));
    const names = screen.getAllByRole('textbox').map((e) => (e as HTMLInputElement).value);
    expect(names).toContain('이성훈');
    expect(names).toContain('양한솔');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ ag: '수산투자계정', manager: '이성훈', risk: '양한솔' });
  });
});

describe('결성조합 수정 — 담당자를 지우면 미배정으로 저장', () => {
  it('성명을 비우면 manager 는 빈 값 — 옛 담당자로 되돌리지 않는다', async () => {
    const row = { ...DEMO[3], manager: '이성훈', risk: '양한솔' };
    const onSave = vi.fn();
    render(React.createElement(TooltipProvider, null, React.createElement(SubFundFormEditModal, { row, onSave, onClose: vi.fn() })));
    const input = screen.getAllByRole('textbox').find((e) => (e as HTMLInputElement).value === '이성훈')!;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ manager: '', risk: '양한솔' });
  });
});
