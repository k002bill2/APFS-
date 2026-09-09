/* shadcn/ui Tooltip — Radix 기반. 포커스+호버 모두 노출(키보드/SR 접근).
   APFS 규약: 반전 표면(bg-foreground/text-bg)으로 라이트·다크 양쪽 고대비, z-tooltip(90). */
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // overflow-hidden 금지: Arrow가 콘텐츠 박스 밖으로 삐져나오므로 클리핑되면 화살표가 사라진다.
        'z-tooltip rounded-card-sm bg-foreground px-2.5 py-1.5 text-[11.5px] font-semibold text-bg shadow-md',
        // Animate UI(animate-ui.com) 툴팁 팝: opacity 0→1, scale 0→1, side별 15px 슬라이드.
        // 원본 spring(300/35)은 임계감쇠(ζ≈1.01, 오버슈트 0) → dialog와 동일하게 ease 커브로 등가 재현.
        // Motion 미도입=Radix 오버레이 exit 트랩 회피(정본 규약). enter/exit는 별도 --tw 변수라 slide는 side만 게이팅.
        'data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:animate-out',
        'data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:fade-in-0 data-[state=closed]:fade-out-0',
        'data-[state=delayed-open]:zoom-in-0 data-[state=instant-open]:zoom-in-0 data-[state=closed]:zoom-out-0',
        'data-[side=top]:slide-in-from-bottom-[15px] data-[side=bottom]:slide-in-from-top-[15px] data-[side=left]:slide-in-from-right-[15px] data-[side=right]:slide-in-from-left-[15px]',
        'data-[side=top]:slide-out-to-bottom-[15px] data-[side=bottom]:slide-out-to-top-[15px] data-[side=left]:slide-out-to-right-[15px] data-[side=right]:slide-out-to-left-[15px]',
        // 열림=차분한 감속(--dur-slow), 닫힘=빠르게(--dur). var(--dur*)라 저모션 규칙 그대로 적용.
        '[animation-duration:var(--dur-slow)] [animation-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=closed]:[animation-duration:var(--dur)] data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]',
        className,
      )}
      {...props}
    >
      {children}
      {/* 화살표: 툴팁 배경(bg-foreground)과 동일한 fill. Content가 overflow-visible라야 안 잘린다. */}
      <TooltipPrimitive.Arrow className="fill-foreground" width={12} height={6} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
