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

/** 메뉴 항목 — 'sep'은 구분선. 그 외는 라벨+아이콘+동작(danger는 삭제류 강조). */
export type CtxItem =
  | 'sep'
  | { label: string; icon?: string; danger?: boolean; onSelect: () => void };

/** 소비처가 onCellContextMenu에서 만들어 넘기는 상태(null=닫힘). */
export type CtxMenuState = { x: number; y: number; items: CtxItem[] } | null;

const MENU_W = 190;   // 고정 폭(가장자리 flip 계산에 사용)

export function RowContextMenu({ state, onClose }: { state: CtxMenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // 모든 닫힘 경로 소유. capture 단계로 등록해 메뉴 항목 클릭보다 먼저 바깥클릭을 판정하지 않도록
  // mousedown(바깥만)·keydown(Esc)·scroll/resize/blur는 즉시 닫는다.
  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
      {state.items.map((it, i) =>
        it === 'sep' ? (
          <div key={i} className="-mx-1 my-1.5 h-px bg-border" />
        ) : (
          <button
            key={i}
            role="menuitem"
            onClick={() => { it.onSelect(); onClose(); }}
            className={
              'flex items-center gap-2.5 w-full rounded-card-sm px-2.5 py-2 text-[14px] text-left cursor-pointer select-none border-0 bg-transparent transition-colors ' +
              (it.danger
                ? 'hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]'
                : 'hover:bg-accent-surface')
            }
            style={{ font: 'inherit', color: it.danger ? 'var(--danger)' : undefined }}
          >
            {it.icon && (
              <Icon name={it.icon} size={16} className={'shrink-0 ' + (it.danger ? '' : 'text-muted-foreground')} />
            )}
            {it.label}
          </button>
        )
      )}
    </div>,
    document.body,
  );
}
