// @vitest-environment jsdom
/* 트리거 없는 Dialog 가 닫히면 연 자리로 초점이 돌아온다(2026-10-30).
   Radix 모달은 닫힐 때 초점을 triggerRef 로 보내는데, 앱의 Dialog 는 거의 전부 DialogTrigger 없이 open 상태로 연다
   → triggerRef 가 null 이라 초점이 body 로 사라졌다. DialogContent 가 열릴 때의 activeElement 를 기억했다가 돌려준다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

afterEach(() => cleanup());

const h = React.createElement;
const body = () => [h(DialogTitle, { key: 't' }, '제목'), h(DialogDescription, { key: 'd' }, '설명'), h('button', { key: 'b', type: 'button' }, '안쪽')];

/* 조건부 마운트형 — `{open && <Modal/>}`(irr_basis_modal·report_guide_history_modal) */
function Conditional({ onCloseAutoFocus }: { onCloseAutoFocus?: (e: Event) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  return h(React.Fragment, null,
    h('button', { type: 'button', onClick: () => setOpen(true) }, '열기'),
    open && h(Dialog, { ref, open: true, onOpenChange: (o: boolean) => { if (!o) setOpen(false); } },
      h(DialogContent, { onCloseAutoFocus }, ...body())));
}

/* 상시 마운트형 — `<Dialog open={open}>`. DialogContent 가 닫힌 채로도 렌더돼 있어 첫 렌더에서 잡으면 틀린 요소가 잡힌다 */
function AlwaysMounted() {
  const [open, setOpen] = React.useState(false);
  return h(React.Fragment, null,
    h('button', { type: 'button', onClick: () => setOpen(true) }, 'A'),
    h('button', { type: 'button', onClick: () => setOpen(true) }, 'B'),
    h('output', { 'data-testid': 'open' }, String(open)),
    h(Dialog, { open, onOpenChange: setOpen }, h(DialogContent, null, ...body())));
}

/* 메뉴 항목에서 연 팝업 — 메뉴 항목은 메뉴 exit 동안 DOM 에 남아 있다가 곧 사라진다.
   거기로 돌려주면 초점이 메뉴와 함께 body 로 사라진다(2026-10-30 실측: 계좌정보 관리 ▾ → 업로드).
   메뉴는 자기 트리거로 초점을 돌려주므로 대화상자는 손대지 않는다 */
function FromMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  return h(React.Fragment, null,
    h('div', { role: 'menu' }, h('button', { type: 'button', role: 'menuitem', onClick: () => setOpen(true) }, '업로드')),
    open && h(Dialog, { ref, open: true, onOpenChange: (o: boolean) => { if (!o) setOpen(false); } },
      h(DialogContent, null, ...body())));
}

/* 키보드로 버튼에 와서 누른 것과 같은 순서: 초점 → 클릭 */
async function openFrom(name: string) {
  const btn = screen.getByRole('button', { name });
  btn.focus();
  fireEvent.click(btn);
  await screen.findByRole('dialog');
  return btn;
}

async function escape() {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2000 });
}

describe('Dialog — 닫으면 연 자리로 초점 복귀', () => {
  it('조건부 마운트: 연 버튼으로 돌아온다', async () => {
    render(h(Conditional));
    const btn = await openFrom('열기');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });

  it('상시 마운트: 열 때마다 그때의 연 자리로 돌아온다(A 로 열면 A, B 로 열면 B)', async () => {
    render(h(AlwaysMounted));
    const a = await openFrom('A');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(a));
    /* jsdom 엔 애니메이션이 없어 콘텐츠는 즉시 빠지지만 부모 onOpenChange(false) 는 exit 폴백(450ms) 뒤에 온다 → 확정을 기다린 뒤 다시 연다 */
    await waitFor(() => expect(screen.getByTestId('open').textContent).toBe('false'), { timeout: 2000 });
    const b = await openFrom('B');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(b));
  });

  it('메뉴 안에서 연 팝업은 연 자리(메뉴 항목)로 돌려주지 않는다 — 메뉴가 자기 트리거로 돌려준다', async () => {
    render(h(FromMenu));
    const item = screen.getByRole('menuitem', { name: '업로드' });
    item.focus();
    fireEvent.click(item);
    await screen.findByRole('dialog');
    await escape();
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement).not.toBe(item);
  });

  it('소비처 onCloseAutoFocus 가 preventDefault 하면 기본 복귀는 하지 않는다(소비처가 이긴다)', async () => {
    const own = vi.fn((e: Event) => e.preventDefault());
    render(h(Conditional, { onCloseAutoFocus: own }));
    const btn = await openFrom('열기');
    await escape();
    await waitFor(() => expect(own).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement).not.toBe(btn);
  });
});
