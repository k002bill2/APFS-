// @vitest-environment jsdom
/* 등록원부 팝업 회귀(2026-09-24 Codex P2 2건) — 수정 폼 초기값 · 팝업 안 표 선택 안정성.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initialLedger, MiniTable } from './registry_ledger_modals';

afterEach(() => cleanup());

describe('initialLedger — 수정 폼은 행 값을 쓴다', () => {
  it('저장 시 비운 칸(null)은 샘플값으로 되살리지 않는다', () => {
    const v = initialLedger(true, { id: 'n1', regno: '2026-01', nm: '신규', dur: null, amt: null, gp: null });
    expect([v.dur1, v.dur2, v.amt, v.gpname]).toEqual(['', '', '', '']);
  });
  it('값이 있는 행은 그 값을 쓴다', () => {
    const v = initialLedger(true, { id: 'n2', regno: 'x', nm: 'y', dur: '2026-01-01 ~ 2033-12-31', amt: 5000000000, gp: '(주)테스트' });
    expect([v.dur1, v.dur2, v.amt, v.gpname]).toEqual(['2026-01-01', '2033-12-31', '5,000,000,000', '(주)테스트']);
  });
});

describe('MiniTable — 행이 바뀌면 선택을 비운다', () => {
  const heads = ['내용', '등록일'];
  it('선두 삽입 후 [삭제]가 엉뚱한 행을 지우지 않는다', () => {
    const onDelete = vi.fn();
    const props = { heads, act: 'edit' as const, label: '이력', onDelete };
    const { rerender } = render(React.createElement(MiniTable, { ...props, rows: [['A', 'd'], ['B', 'd']] }));
    fireEvent.click(screen.getByRole('checkbox', { name: '이력 2번 행 선택' }));
    expect(screen.getByText('1건 선택됨')).toBeTruthy();
    rerender(React.createElement(MiniTable, { ...props, rows: [['NEW', 'd'], ['A', 'd'], ['B', 'd']] }));
    expect(screen.queryByText('1건 선택됨')).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
