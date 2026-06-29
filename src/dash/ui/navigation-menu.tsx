/* shadcn/ui NavigationMenu — Radix 기반. APFS 규약(세로 레일 + 측면 플라이아웃):
   - 접힘 LNB / RailNav 의 손짠 hover-전용 플라이아웃을 대체해 **키보드 진입 경로**를 공급한다.
   - Radix가 hover + 포커스/키보드 동시 오픈, ↑↓ 트리거 이동, Escape 닫기+트리거 포커스 복귀,
     Content 내 포커스 스코프를 제공(기존 마우스 전용 갭 해소).
   - orientation="vertical" 세로 레일. Viewport 미사용 → Content가 각 Item 안에 인라인 렌더되며,
     소비처가 position:fixed + left/top 으로 배치해 레일 overflow 클리핑을 탈출한다(plan §2.6: ancestor transform 없음).
   - 표면 bg-card/border-border, z-popover(85, 셸 chrome 위), 포커스는 전역 outline 통일(shadcn ring 미사용).
   - opacity 모디파이어 금지 규약 준수(애니메이션 유틸만 사용). */
import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cn } from '@/lib/utils';

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root ref={ref} className={cn('relative', className)} {...props}>
    {children}
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List ref={ref} className={cn('flex flex-col', className)} {...props} />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

/* Trigger — 레일의 아이콘 버튼. 스타일/내용은 소비처가 className/children으로 지정.
   기본 onPointerMove/Leave(호버 오픈)는 Radix 기본 유지. */
const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn('cursor-pointer outline-none', className)}
    {...props}
  >
    {children}
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

/* Content — 플라이아웃 패널. 소비처가 style(left/top/maxHeight)로 위치 지정.
   position:fixed 로 레일 overflow 탈출. 표면/테두리/그림자/애니메이션 테마. */
const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      'fixed z-popover flex flex-col overflow-hidden rounded-card-lg border border-border bg-card text-foreground shadow-lg',
      'data-[motion=from-start]:animate-in data-[motion=to-start]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion^=from-]:zoom-in-95 data-[motion^=to-]:zoom-out-95',
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
};
