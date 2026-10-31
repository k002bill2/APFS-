// @vitest-environment jsdom
/* 드로어(SheetContent)를 열면 첫 초점은 드로어 자체다(2026-10-31, ui/sheet.tsx).
   드로어는 전부 머리말 닫기가 IconBtn 이라 Radix 기본(첫 tabbable)이면 닫기 버튼에 초점이 가며 툴팁이 뜨고,
   그 툴팁 레이어가 사라질 때까지 Esc 를 가져가 3~6번 눌러야 닫혔다(실측).
   ① 은 Red-Green 판별 테스트(종전 sheet.tsx 에선 안쪽 버튼으로 간다), ② 는 소비처가 첫 초점을 직접 정하는 경로를
   깨지 않는지 지키는 가드다(종전에도 통과). globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

afterEach(() => cleanup());

const h = React.createElement;

function Drawer({ onOpenAutoFocus, inputRef }: { onOpenAutoFocus?: (e: Event) => void; inputRef?: React.Ref<HTMLInputElement> }) {
  const [open, setOpen] = React.useState(false);
  return h(React.Fragment, null,
    h('button', { type: 'button', onClick: () => setOpen(true) }, '상세필터'),
    h(Sheet, { open, onOpenChange: setOpen },
      h(SheetContent, { onOpenAutoFocus },
        h(SheetTitle, null, '상세 필터'), h(SheetDescription, null, '설명'),
        h('button', { type: 'button' }, '안쪽'),
        h('input', { ref: inputRef, 'aria-label': '검색어' }))));
}

async function openDrawer() {
  const btn = screen.getByRole('button', { name: '상세필터' });
  btn.focus();
  fireEvent.click(btn);
  return screen.findByRole('dialog');
}

describe('SheetContent — 첫 초점', () => {
  it('열면 첫 초점은 드로어 자체(role=dialog)다 — 안쪽 버튼으로 가지 않는다', async () => {
    render(h(Drawer));
    const dialog = await openDrawer();
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: '안쪽' }));
  });

  it('소비처 onOpenAutoFocus 가 preventDefault 하고 직접 옮기면 드로어로 되돌리지 않는다(소비처가 이긴다)', async () => {
    const inputRef = React.createRef<HTMLInputElement>();
    const own = (e: Event) => { e.preventDefault(); inputRef.current?.focus(); };
    render(h(Drawer, { onOpenAutoFocus: own, inputRef }));
    await openDrawer();
    await waitFor(() => expect(document.activeElement).toBe(inputRef.current));
  });
});
