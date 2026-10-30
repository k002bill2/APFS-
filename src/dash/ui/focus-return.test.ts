// @vitest-environment jsdom
/* 트리거 없이 연 대화상자 3종(Dialog·Sheet·AlertDialog)이 닫히면 연 자리로 초점이 돌아온다(2026-10-30, ui/focus-return.ts).
   Radix 모달은 닫힐 때 초점을 triggerRef 로 보내는데, 앱은 Trigger 없이 open 상태로만 연다
   → triggerRef 가 null 이라 초점이 body 로 사라졌다. Content 래퍼가 열릴 때의 activeElement 를 기억했다가 돌려준다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from './alert-dialog';

afterEach(() => cleanup());

const h = React.createElement;
type Comp = React.ComponentType<any>;
type Kit = { name: string; role: 'dialog' | 'alertdialog'; Root: Comp; Content: Comp; Title: Comp; Desc: Comp; Inner: Comp | 'button'; takesRef: boolean };

/* 래퍼별 차이 — 역할, Root 가 ref 를 받는지(지연 닫힘 래퍼 Dialog·AlertDialog 만 forwardRef), 안쪽 버튼.
   AlertDialog [취소] 에 autoFocus 를 붙이지 않는다 — 붙이면 연 자리를 못 잡는 알려진 한계(focus-return.ts)를 시험하게 된다 */
const KITS: Kit[] = [
  { name: 'Dialog', role: 'dialog', Root: Dialog, Content: DialogContent, Title: DialogTitle, Desc: DialogDescription, Inner: 'button', takesRef: true },
  { name: 'Sheet', role: 'dialog', Root: Sheet, Content: SheetContent, Title: SheetTitle, Desc: SheetDescription, Inner: 'button', takesRef: false },
  { name: 'AlertDialog', role: 'alertdialog', Root: AlertDialog, Content: AlertDialogContent, Title: AlertDialogTitle, Desc: AlertDialogDescription, Inner: AlertDialogCancel, takesRef: true },
];

const body = (k: Kit) => [
  h(k.Title, { key: 't' }, '제목'), h(k.Desc, { key: 'd' }, '설명'),
  h(k.Inner, k.Inner === 'button' ? { key: 'b', type: 'button' } : { key: 'b' }, '안쪽'),
];

/* 조건부 마운트형 — `{open && <Modal/>}`(irr_basis_modal·report_guide_history_modal) */
function Conditional({ kit, onCloseAutoFocus }: { kit: Kit; onCloseAutoFocus?: (e: Event) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  return h(React.Fragment, null,
    h('button', { type: 'button', onClick: () => setOpen(true) }, '열기'),
    open && h(kit.Root, { ...(kit.takesRef ? { ref } : {}), open: true, onOpenChange: (o: boolean) => { if (!o) setOpen(false); } },
      h(kit.Content, { onCloseAutoFocus }, ...body(kit))));
}

/* 상시 마운트형 — `<Dialog open={open}>`. Content 래퍼가 닫힌 채로도 렌더돼 있어 첫 렌더에서 잡으면 틀린 요소가 잡힌다 */
function AlwaysMounted({ kit }: { kit: Kit }) {
  const [open, setOpen] = React.useState(false);
  return h(React.Fragment, null,
    h('button', { type: 'button', onClick: () => setOpen(true) }, 'A'),
    h('button', { type: 'button', onClick: () => setOpen(true) }, 'B'),
    h('output', { 'data-testid': 'open' }, String(open)),
    h(kit.Root, { open, onOpenChange: setOpen }, h(kit.Content, null, ...body(kit))));
}

/* 메뉴 항목에서 연 팝업 — 메뉴 항목은 메뉴 exit 동안 DOM 에 남아 있다가 곧 사라진다.
   거기로 돌려주면 초점이 메뉴와 함께 body 로 사라진다(2026-10-30 실측: 계좌정보 관리 ▾ → 업로드).
   메뉴는 자기 트리거로 초점을 돌려주므로 대화상자는 손대지 않는다 */
function FromMenu({ kit }: { kit: Kit }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  return h(React.Fragment, null,
    h('div', { role: 'menu' }, h('button', { type: 'button', role: 'menuitem', onClick: () => setOpen(true) }, '업로드')),
    open && h(kit.Root, { ...(kit.takesRef ? { ref } : {}), open: true, onOpenChange: (o: boolean) => { if (!o) setOpen(false); } },
      h(kit.Content, null, ...body(kit))));
}

describe.each(KITS)('$name — 닫으면 연 자리로 초점 복귀', (kit) => {
  /* 키보드로 버튼에 와서 누른 것과 같은 순서: 초점 → 클릭 */
  async function openFrom(name: string, role: 'button' | 'menuitem' = 'button') {
    const btn = screen.getByRole(role, { name });
    btn.focus();
    fireEvent.click(btn);
    await screen.findByRole(kit.role);
    return btn;
  }
  async function escape() {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole(kit.role)).toBeNull(), { timeout: 2000 });
  }

  it('조건부 마운트: 연 버튼으로 돌아온다', async () => {
    render(h(Conditional, { kit }));
    const btn = await openFrom('열기');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });

  it('상시 마운트: 열 때마다 그때의 연 자리로 돌아온다(A 로 열면 A, B 로 열면 B)', async () => {
    render(h(AlwaysMounted, { kit }));
    const a = await openFrom('A');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(a));
    /* jsdom 엔 애니메이션이 없어 콘텐츠는 즉시 빠지지만 지연 닫힘 래퍼(Dialog·AlertDialog)의 부모 onOpenChange(false) 는
       exit 폴백(450ms) 뒤에 온다 → 확정을 기다린 뒤 다시 연다(Sheet 는 즉시) */
    await waitFor(() => expect(screen.getByTestId('open').textContent).toBe('false'), { timeout: 2000 });
    const b = await openFrom('B');
    await escape();
    await waitFor(() => expect(document.activeElement).toBe(b));
  });

  it('메뉴 안에서 연 팝업은 연 자리(메뉴 항목)로 돌려주지 않는다 — 메뉴가 자기 트리거로 돌려준다', async () => {
    render(h(FromMenu, { kit }));
    const item = await openFrom('업로드', 'menuitem');
    await escape();
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement).not.toBe(item);
  });

  it('소비처 onCloseAutoFocus 가 preventDefault 하면 기본 복귀는 하지 않는다(소비처가 이긴다)', async () => {
    const own = vi.fn((e: Event) => e.preventDefault());
    render(h(Conditional, { kit, onCloseAutoFocus: own }));
    const btn = await openFrom('열기');
    await escape();
    await waitFor(() => expect(own).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement).not.toBe(btn);
  });
});
