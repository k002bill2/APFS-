/* shadcn/ui Accordion — Radix 기반. shadcn 원본 룩에 정렬(APFS 토큰 유지):
   - 트리거: text-sm(14px)·font-medium·hover:underline·items-start·py-4·rounded-md(shadcn 원본과 동일).
   - 셰브런: translate-y-0.5로 첫 줄 baseline 정렬(items-start와 짝).
   - 구분선: border-border 토큰 + last:border-b-0(마지막 항목 하단선 제거, shadcn 원본).
   - 포커스: shadcn의 `ring-ring/50 ring-[3px]`는 이 프로젝트에서 opacity 모디파이어 무음실패 →
     대신 tokens.css 전역 :focus-visible outline(3px, color-mix ring 45%)이 동일 룩을 이미 제공.
     그래서 outline-none/ring 유틸은 붙이지 않는다(붙이면 오히려 링이 사라짐). */
import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn('border-b border-border last:border-b-0', className)} {...props} />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium text-foreground transition-all hover:underline disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
