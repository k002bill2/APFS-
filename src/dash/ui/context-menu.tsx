/* shadcn/ui ContextMenu — Radix 기반. dropdown-menu.tsx와 동일 토큰/규약.
   - 우클릭(onContextMenu)으로 커서 위치에 열림(Radix가 위치·레이어 관리)
   - Portal = Radix 관리 레이어 → z-popover(85)가 DialogContent z-modal(80) 위 + interact-outside로 모달 안 닫힘
   - 표면 bg-popover / border-border, 항목 hover=bg-accent-surface, danger=text-danger */
import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { cn } from '@/lib/utils';
import { usePortalContainer } from './portal-container';
import { MenuHighlightProvider, useMenuHighlight, ItemHighlight } from './menu-highlight';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  // 슬라이드 하이라이트 Provider는 Content 안 → 닫힘 시 unmount로 active 리셋(dropdown-menu와 동일 규약).
  <ContextMenuPrimitive.Portal container={usePortalContainer()}>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        'z-popover min-w-[11rem] overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      <MenuHighlightProvider>{children}</MenuHighlightProvider>
    </ContextMenuPrimitive.Content>
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { inset?: boolean; danger?: boolean }
>(({ className, inset, danger, children, onFocus, ...props }, ref) => {
  const { id, setActive, active } = useMenuHighlight();
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      onFocus={(e) => {
        onFocus?.(e);
        setActive(); // Radix가 포인터 이동에도 item.focus() 호출 → onFocus 하나로 hover·keyboard 모두 커버.
      }}
      className={cn(
        // isolate: -z-10 하이라이트가 텍스트 뒤·팝오버 배경 앞에 갇히도록 자체 쌓임맥락 생성.
        'relative isolate flex cursor-pointer select-none items-center gap-2.5 rounded-card-sm px-2.5 py-2 text-[13.5px] font-semibold outline-none',
        !active && 'z-[1]', // 비활성 항목을 양수 레이어로: 슬라이드 span이 형제 텍스트를 덮는 방향성 깜박임 방지(menu-highlight 규약)
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        danger ? 'text-danger' : 'text-foreground',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      <ItemHighlight id={id} danger={danger} />
      {children}
    </ContextMenuPrimitive.Item>
  );
});
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  // relative z-10: 슬라이드 하이라이트가 non-positioned 구분선을 덮어 깜빡이는 것을 방지(dropdown-menu.tsx와 동일 사유).
  <ContextMenuPrimitive.Separator ref={ref} className={cn('relative z-10 -mx-1 my-1.5 h-px bg-border', className)} {...props} />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Label ref={ref} className={cn('px-2.5 pb-1 pt-1.5 text-[11.5px] font-medium text-caption', className)} {...props} />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuGroup,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
};
