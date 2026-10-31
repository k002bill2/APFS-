// @vitest-environment jsdom
/* 전표 등록 화면(JournalEntryScreen)을 열면 첫 초점은 화면 컨테이너다(2026-10-31).
   Radix 기본(첫 tabbable)이면 머리말 닫기 IconBtn 에 초점이 가며 툴팁이 뜨고, 그 툴팁 레이어가 첫 Esc 를 가져가
   Esc 를 두 번 눌러야 닫혔다(실측 — 신규·수정 모두). 삭제전표 상세에만 있던 컨테이너 초점을 모든 모드로 넓혔다.
   AG Grid 는 초점 판정과 무관하고 jsdom 에서 무거워 빈 컴포넌트로 바꾼다. globals:false → afterEach 에서 cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '../../ui/tooltip';
import { JournalEntryScreen } from './journal_entry_screen';
import type { EntryState } from './general_journal_model';

vi.mock('ag-grid-react', () => ({ AgGridReact: () => null }));
/* jsdom 에 없다 — Radix use-size(체크박스 등)가 마운트 때 부른다 */
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

afterEach(() => cleanup());

const h = React.createElement;
const openScreen = (entry: EntryState) =>
  render(h(TooltipProvider, null, h(JournalEntryScreen, { entry, onClose: () => {} })));

describe('전표 등록 화면 — 첫 초점은 화면 컨테이너', () => {
  it('신규 등록을 열면 닫기 버튼이 아니라 dialog 자체에 초점이 가고 툴팁이 뜨지 않는다', async () => {
    openScreen({ mode: 'new' });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
