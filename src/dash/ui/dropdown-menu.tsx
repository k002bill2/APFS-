/* shadcn/ui DropdownMenu — Radix 기반. APFS 규약:
   - 표면: bg-popover(=card-raised) / border-border
   - z-index: z-popover(85) — 셸 chrome 위
   - 항목 hover/highlight: bg-accent-surface(=muted, 브랜드 navy 아님·무드 비종속)
   - 포커스: shadcn ring 미사용 → 전역 outline + 슬라이드 하이라이트 배경으로 표시
   - 키보드 내비/aria-haspopup/menuitem 시맨틱: Radix 제공
   - 열림/닫힘 애니: animate-ui(animate-ui.com) Radix DropdownMenu 방식 — fade + scale 0.95.
     origin은 Radix가 주입하는 트리거 기준점(--radix-...-transform-origin)이라 메뉴가
     트리거에서 자라나듯 확대. Motion 미도입=Radix exit 트랩 회피(tailwindcss-animate로 열림/닫힘).
   - 항목 하이라이트 슬라이드(animate-ui MotionHighlight): 활성 항목에만 layoutId 공유 motion.span을
     렌더 → 포커스가 옮겨가면 배경이 미끄러진다(SegTabs 인디케이터와 동일 패턴). 활성 신호는
     Radix Menu의 onFocus(포인터 이동도 item.focus() 호출 → data-highlighted 파생). blur에선 지우지
     않는다(blur가 다음 focus보다 먼저라 지우면 unmount→remount로 슬라이드가 스냅됨). 재열림 시
     Content 언마운트로 자동 리셋. 오버레이 exit가 아닌 내부 레이아웃 애니라 Motion 트랩 무관. */
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalContainer } from './portal-container';
import { MenuHighlightProvider, useMenuHighlight, ItemHighlight } from './menu-highlight';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, align = 'end', children, ...props }, ref) => (
  // 슬라이드 하이라이트 Provider는 Content 안 → 닫힘 시 Content unmount로 active가 리셋된다(menu-highlight 규약).
  <DropdownMenuPrimitive.Portal container={usePortalContainer()}>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-popover min-w-[11rem] overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg',
        'origin-[var(--radix-dropdown-menu-content-transform-origin)] !duration-tok data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      <MenuHighlightProvider>{children}</MenuHighlightProvider>
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; danger?: boolean }
>(({ className, inset, danger, children, onFocus, ...props }, ref) => {
  const { id, setActive } = useMenuHighlight();
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      onFocus={(e) => {
        onFocus?.(e);
        setActive(); // 포커스=하이라이트(포인터 이동도 item.focus() 경유). blur에선 미해제(잔류=animate-ui 원본).
      }}
      className={cn(
        // isolate: -z-10 하이라이트가 항목 텍스트 뒤·팝오버 배경 앞에 갇히도록 자체 쌓임맥락 생성.
        'relative isolate flex cursor-pointer select-none items-center gap-2.5 rounded-card-sm px-2.5 py-2 text-[13.5px] font-semibold outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        danger ? 'text-danger' : 'text-foreground',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      <ItemHighlight id={id} danger={danger} />
      {children}
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, onFocus, ...props }, ref) => {
  const { id, setActive } = useMenuHighlight();
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      onFocus={(e) => {
        onFocus?.(e);
        setActive();
      }}
      className={cn(
        // pl-8: 좌측 체크 지표 자리 확보. 선택 상태는 배경색(색)만이 아니라 체크 아이콘(비색)으로도 구분(WCAG 1.4.1).
        // isolate: -z-10 하이라이트가 텍스트 뒤·팝오버 배경 앞에 갇히도록. 체크 tint는 유지(비활성 항목의 선택 표시).
        'relative isolate flex cursor-pointer select-none flex-col rounded-card-sm py-2 pl-8 pr-2.5 outline-none',
        'data-[state=checked]:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <ItemHighlight id={id} />
      <span className="absolute left-2.5 top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn('px-2.5 pb-1 pt-1.5 text-[11.5px] font-medium text-caption', className)} {...props} />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  // relative z-10: 슬라이드 하이라이트(-z-10 span)는 positioned 항목(isolate, 페인트 step 6) 안이라
  // non-positioned 구분선(step 3)보다 위에 그려진다 → 항목 간 이동 시 하이라이트가 1px 선을 덮었다 벗겨 깜빡임.
  // 구분선을 positioned+양수 z(step 7)로 올려 하이라이트가 선 아래로 지나가게 한다.
  <DropdownMenuPrimitive.Separator ref={ref} className={cn('relative z-10 -mx-1 my-1.5 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

/* 우측 정렬 단축키 힌트(⌘K 등) — shadcn DropdownMenuShortcut. 항목 내 ml-auto로 우측 배치,
   caption 색·넓은 자간(kbd 룩). 정상 흐름이라 슬라이드 하이라이트(-z-10) 위에 렌더된다.
   접근성: 단축키는 시각 힌트라 aria-hidden(실제 키 바인딩은 소비처가 별도 등록). */
function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span aria-hidden className={cn('ml-auto pl-6 text-[11px] font-medium tracking-widest text-caption', className)} {...props} />;
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
};
