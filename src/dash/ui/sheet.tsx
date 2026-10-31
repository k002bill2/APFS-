/* shadcn/ui Sheet — Radix Dialog 기반 측면 슬라이드 패널(필터 드로어용).
   APFS 규약: bg-card 표면, z-overlay/z-modal, ring 제거, tailwindcss-animate(slide). */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusReturn } from './focus-return';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-overlay bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'right' | 'left'; hideClose?: boolean }
>(({ side = 'right', className, children, hideClose, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  /* 닫으면 연 자리(상세필터 버튼 등)로 초점 복귀 — 근거·한계는 focus-return.ts.
     첫 초점 = 드로어 자체(2026-10-31). 드로어는 전부 머리말 닫기가 IconBtn 이라 Radix 기본(첫 tabbable)이면
     닫기 버튼에 초점이 가며 툴팁이 뜨고, 그 툴팁 레이어가 사라질 때까지 Esc 를 가져가 3~6번 눌러야 닫혔다(실측).
     소비처가 onOpenAutoFocus 에서 preventDefault 하면 소비처가 이긴다. 연 자리 기억은 훅이 이 핸들러보다 먼저 한다. */
  const focusReturn = useFocusReturn((e) => {
    onOpenAutoFocus?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement | null)?.focus();
  }, onCloseAutoFocus);
  return (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 z-modal flex h-full w-[400px] max-w-[calc(100vw-40px)] flex-col bg-card shadow-lg focus:outline-none transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
        side === 'right' && 'right-0 border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        side === 'left' && 'left-0 border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        className,
      )}
      {...focusReturn}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close aria-label="닫기" className="absolute right-3.5 top-3.5 inline-flex rounded-card-sm p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100">
          <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-3 border-b border-border px-[18px] py-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-2 border-t border-border px-[18px] py-3.5', className)} {...props} />;
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('my-0 text-base font-bold text-foreground', className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-[13px] text-muted-foreground', className)} {...props} />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
