// @vitest-environment jsdom
/* 반복행 모달의 행삭제 동작 계약(2026-11-09 사용자 "행삭제는 체크박스 체크시 나타나게해 이건 룰로 모두 적용하게 해").
   정적 가드(row_delete_on_check.test.ts)는 '게이트 문법'만 본다 — 여기선 실제 DOM 으로 "0건이면 없음 → 체크하면 등장 → 삭제 → 다시 없음"을 본다.
   대상: 자펀드 정보 수정(운용사 표) · 결성조합 수정(업무집행조합원·담당자 표). globals:false → afterEach cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '../ui/tooltip';
import { AssetFundInfoModal } from './asct/asset_fund_info_modal';
import { FUND_INFO_TABLE } from './asct/asset_fund_info_data';
import { SubFundFormEditModal } from './sfund/subfund_form_modal';
import { DEMO } from './sfund/subfund_manage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
afterEach(() => { cleanup(); });

const h = React.createElement;
const mount = (el: React.ReactElement) => render(h(TooltipProvider, null, el));
const deleteBtn = () => screen.queryByRole('button', { name: '행삭제' });

describe('자펀드 정보 수정 — 운용사 표', () => {
  const open = () => mount(h(AssetFundInfoModal, { mode: 'edit', row: FUND_INFO_TABLE.rows[0], onClose: vi.fn() }));

  it('체크 0건이면 [행삭제]가 없고, 체크하면 나타나 그 행만 지운다', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: '행추가' }));
    expect(deleteBtn()).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: '신규 운용사 선택' }));
    expect(screen.getByText('1건 선택됨')).toBeTruthy();
    fireEvent.click(deleteBtn()!);
    expect(screen.queryByRole('checkbox', { name: '신규 운용사 선택' })).toBeNull();
    expect(screen.getAllByRole('checkbox', { name: /선택$/ }).filter((c) => c.getAttribute('aria-label') !== '운용사 전체 선택')).toHaveLength(1);
    expect(deleteBtn()).toBeNull();
  });

  it('대표 체크는 선택이 아니다 — [행삭제]가 뜨지 않는다', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: '행추가' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '신규 운용사 대표여부' }));
    expect(deleteBtn()).toBeNull();
  });

  it('헤더 전체 선택 → 모든 행 선택', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: '행추가' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '운용사 전체 선택' }));
    expect(screen.getByText('2건 선택됨')).toBeTruthy();
  });
});

describe('결성조합 수정 — 업무집행조합원·담당자 표', () => {
  const open = () => mount(h(SubFundFormEditModal, { row: DEMO[3], onSave: vi.fn(), onClose: vi.fn() }));   // GP 2행(KB증권·유안타) · 담당자 3행

  it('행마다 붙은 휴지통이 없고, 체크 0건이면 [행삭제]도 없다', () => {
    open();
    expect(screen.queryByRole('button', { name: '행 삭제' })).toBeNull();
    expect(deleteBtn()).toBeNull();
  });

  it('업무집행조합원 2행을 체크하면 그 표에만 [행삭제]가 뜨고, 지우면 1행이 남는다', () => {
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: '업무집행조합원 2행 선택' }));
    expect(screen.getAllByRole('button', { name: '행삭제' })).toHaveLength(1);
    fireEvent.click(deleteBtn()!);
    expect(screen.queryByRole('checkbox', { name: '업무집행조합원 2행 선택' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: '업무집행조합원 1행 선택' })).toBeTruthy();
    expect(deleteBtn()).toBeNull();
  });

  it('담당자 전체 선택 → 3건 선택됨, 삭제 후 빈 상태 문구', () => {
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: '담당자 전체 선택' }));
    expect(screen.getByText('3건 선택됨')).toBeTruthy();
    fireEvent.click(deleteBtn()!);
    expect(screen.getByText('등록된 담당자가 없습니다.')).toBeTruthy();
    expect(deleteBtn()).toBeNull();
  });
});
