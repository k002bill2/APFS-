/* 행 우클릭 컨텍스트 메뉴 — AG Grid Community 대체 구현.
   AG Grid의 내장 context menu(getContextMenuItems)는 Enterprise 전용이라, Community에서는
   onCellContextMenu(이벤트만 Community 제공) + 이 컴포넌트로 직접 메뉴를 띄운다.

   ▸ 쌓임맥락: body로 Portal + z-popover 토큰 → sticky/transform 조상 트랩 회피(→ z-index 스킬).
   ▸ 좌표: 우클릭 지점(clientX/clientY)에 position:fixed. 뷰포트 우/하단을 넘치면 좌표를 당긴다.
   ▸ 닫힘: 바깥 클릭·Esc·스크롤·리사이즈·창 blur를 전부 소유(하나라도 빠지면 메뉴가 열린 채 고착).
   ▸ 스타일: 기존 ui/dropdown-menu와 동일 토큰(bg-popover/border-border/bg-accent-surface). */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { MenuHighlightProvider, useMenuHighlight, ItemHighlight } from './ui/menu-highlight';

/** 메뉴 항목 — 'sep'은 구분선. 그 외는 라벨+아이콘+동작(danger는 삭제류 강조). */
export type CtxItem =
  | 'sep'
  | { label: string; icon?: string; danger?: boolean; onSelect: () => void };

/** 소비처가 onCellContextMenu에서 만들어 넘기는 상태(null=닫힘). */
export type CtxMenuState = { x: number; y: number; items: CtxItem[] } | null;

const MENU_W = 190;   // 고정 폭(가장자리 flip 계산에 사용)

/* 메뉴 항목 버튼 — 훅(useMenuHighlight)을 쓰려면 map 콜백이 아니라 별도 컴포넌트여야 한다.
   활성 신호는 hover(onMouseEnter)·keyboard focus(onFocus) 둘 다. 배경은 슬라이드 span이 담당하므로
   기존 hover/focus-visible 배경 클래스는 제거(남기면 즉시배경+슬라이드 이중). `relative isolate`로
   -z-10 span을 텍스트 뒤·팝오버 앞에 가둔다. danger는 span을 danger tint로. */
function CtxMenuButton({ item, onClose }: { item: Exclude<CtxItem, 'sep'>; onClose: () => void }) {
  const { id, setActive } = useMenuHighlight();
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => { item.onSelect(); onClose(); }}
      onMouseEnter={setActive}
      onFocus={setActive}
      className="relative isolate flex items-center gap-2.5 w-full rounded-card-sm px-2.5 py-2 text-[14px] text-left cursor-pointer select-none border-0 bg-transparent"
      style={{ font: 'inherit', color: item.danger ? 'var(--danger)' : undefined }}
    >
      <ItemHighlight id={id} danger={item.danger} />
      {item.icon && (
        <Icon name={item.icon} size={16} className={'shrink-0 ' + (item.danger ? '' : 'text-muted-foreground')} />
      )}
      {item.label}
    </button>
  );
}

export function RowContextMenu({ state, onClose }: { state: CtxMenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // 키보드 접근: 열릴 때 여는 요소를 기억했다가 닫힘 시 복귀. 단, 항목 액션이 모달 등으로 포커스를
  // 옮겼으면 건드리지 않는다 — 닫힘 직후 activeElement가 body인지(=아무도 안 가져감) 관찰해 판정.
  const openerRef = useRef<HTMLElement | null>(null);
  const isOpen = state != null;

  // 포커스 관리는 열림/닫힘 "전환"에서만(isOpen 의존) — state 객체는 부모(그리드) 재렌더마다 새로
  // 만들어질 수 있어, [state]에 걸면 화살표 내비 도중 재렌더가 이 effect를 재실행해 첫 항목으로
  // 포커스가 스냅백된다. 열리면 여는 요소 기억 + 첫 항목 포커스, 닫히면 여는 요소로 복귀.
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    // rAF로 포털 DOM 배치 후 첫 항목 포커스. preventScroll: 아래 scroll capture가 self-close 오인 방지.
    const raf = requestAnimationFrame(() => {
      ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      // 닫힘 후 다음 프레임에 포커스 복귀 — 그 사이 다른 UI(모달 등)가 포커스를 가져갔으면 건드리지 않는다.
      // 비모달 액션(복사·엑셀·삭제)은 포커스가 body로 떨어지므로 여는 요소로 되돌린다(포커스 유실 방지).
      const opener = openerRef.current;
      requestAnimationFrame(() => {
        const ae = document.activeElement;
        if (!ae || ae === document.body) opener?.focus?.({ preventScroll: true });
      });
    };
  }, [isOpen]);

  // 모든 닫힘 경로 + 키보드 내비 소유. capture 단계로 등록해 메뉴 항목 클릭보다 먼저 바깥클릭을 판정하지
  // 않도록 mousedown(바깥만)·keydown(Esc/화살표)·scroll/resize/blur를 처리한다.
  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    // 키보드는 네이티브 document 리스너에서 일괄 처리(포털-to-body는 React synthetic onKeyDown이
    // 루트 컨테이너 밖이라 안 잡히는 경우가 있어 확실한 경로로 통일). Esc=닫기, 화살표/Home/End=roving.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (!items.length) return;
      const cur = items.indexOf(document.activeElement as HTMLElement);
      // preventDefault(스크롤) + stopImmediatePropagation: 우리가 처리한 화살표를 다른 리스너(AG Grid
      // 그리드 내비 등)가 재처리해 포커스를 되돌리는 것을 차단(커스텀 메뉴가 키 이벤트를 독점).
      const go = (i: number) => { e.preventDefault(); e.stopImmediatePropagation(); items[(i + items.length) % items.length].focus({ preventScroll: true }); };
      if (e.key === 'ArrowDown') go(cur + 1);
      else if (e.key === 'ArrowUp') go(cur - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(items.length - 1);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  // 뷰포트 밖 넘침 방지 — 대략적 높이로 우/하단 가장자리에서 좌표를 당긴다(항목34px+구분선9px+패딩12).
  const rows = state.items.filter((it) => it !== 'sep').length;
  const seps = state.items.length - rows;
  const estH = rows * 34 + seps * 9 + 12;
  const left = Math.max(8, Math.min(state.x, window.innerWidth - MENU_W - 8));
  const top = Math.max(8, Math.min(state.y, window.innerHeight - estH - 8));

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="z-popover overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
      style={{ position: 'fixed', top, left, width: MENU_W, font: 'inherit' }}
    >
      {/* Provider는 createPortal JSX 안 → state가 null이 되어 언마운트될 때 active가 리셋된다
          (RowContextMenu 인스턴스 자체는 state null↔값으로 살아있으므로 여기 두지 않으면 stale). */}
      <MenuHighlightProvider>
        {state.items.map((it, i) =>
          it === 'sep' ? (
            <div key={i} className="relative z-10 -mx-1 my-1.5 h-px bg-border" /* z-10: 슬라이드 하이라이트가 선을 덮어 깜빡이는 것 방지(dropdown-menu.tsx 사유) */ />
          ) : (
            <CtxMenuButton key={i} item={it} onClose={onClose} />
          )
        )}
      </MenuHighlightProvider>
    </div>,
    document.body,
  );
}
